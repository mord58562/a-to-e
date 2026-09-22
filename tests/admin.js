/* Admin panel test.
 *
 * The smoke test enters as a guest, so it never touches the admin
 * surfaces. This one stands up a fake worker, signs in as an admin
 * against it, and drives every tab and every destructive control.
 *
 *   python3 -m http.server 8765 --bind 127.0.0.1 &
 *   npm i --no-save jsdom
 *   REPO=$PWD node tests/admin.js
 *
 * It asserts the things that were broken: the panel opens on Users,
 * the table renders real rows with a last-seen column, the admin's own
 * row offers no destructive action, delete opens a type-to-confirm
 * dialog that names the person and how many answers go with them
 * rather than window.confirm, promote acts immediately and reports
 * with an Undo, and every tab renders without a console error.
 */
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = require('jsdom')); }
catch (_) { ({ JSDOM, VirtualConsole } = require('/tmp/node_modules/jsdom')); }
const fs=require('fs'), path=require('path');
const errs=[]; const vc=new VirtualConsole();
// jsdom implements no layout and not every form method; neither is a
// bug in the page.
const JSDOM_GAPS = /Not implemented|Could not parse CSS/i;
vc.on('jsdomError',e=>{const m=e.stack||e.message; if(!JSDOM_GAPS.test(m)) errs.push('jsdomError: '+m);});
vc.on('error',(...a)=>errs.push('console.error: '+a.join(' ')));

// A fake worker, so the admin surfaces run against real-shaped data.
const API = {
  '/api/me': { ok:true, user:{id:'u1',email:'rob@example.com',display_name:'the maintainer',is_admin:1} },
  '/api/state': { ok:true, answers:[], flags:[], settings:null },
  '/api/admin/users': { ok:true, users:[
    {id:'u1',email:'rob@example.com',display_name:'the maintainer',is_admin:1,answers:312,created_at:1747000000,last_seen_at:Math.floor(Date.now()/1000)},
    {id:'u2',email:'carter@example.com',display_name:'Carter',is_admin:0,answers:20,created_at:1755000000,last_seen_at:1758000000},
    {id:'u3',email:'ming@example.com',display_name:'Ming',is_admin:0,answers:6,created_at:1757000000,last_seen_at:null},
  ]},
  '/api/admin/invites': { ok:true, invites:[
    {code_hash:'a'.repeat(64),code_hint:'QK4M',label:'Rachel',created_at:1757000000,expires_at:1790000000,used_at:null,revoked_at:null,used_by_name:null},
    {code_hash:'b'.repeat(64),code_hint:'TP9X',label:'Carter',created_at:1755000000,expires_at:1780000000,used_at:1755500000,revoked_at:null,used_by_name:'Carter'},
  ]},
  '/api/admin/quality': { ok:true, worst:[{question_id:'paeds-001',n:12,c:3}], top:[{question_id:'psych-004',n:40,c:31}], totals:{users:3,answers:338,qs:210} },
};
(async()=>{
  const html = await (await fetch('http://127.0.0.1:8765/')).text();
  const dom = new JSDOM(html,{url:'http://127.0.0.1:8765/',runScripts:'outside-only',
    resources:'usable',pretendToBeVisual:true,virtualConsole:vc});
  const {window}=dom;
  window.fetch = async (u,o)=>{
    const href = new URL(typeof u==='string'?u:u.url, 'http://127.0.0.1:8765/').href;
    for (const [p,body] of Object.entries(API)) {
      if (href.includes(p)) return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
    }
    if (href.includes('/api/')) return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}});
    return fetch(href,o);
  };
  window.scrollTo=()=>{}; window.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  if(!window.crypto.subtle) window.crypto.subtle=require('crypto').webcrypto.subtle;
  if(!window.HTMLDialogElement.prototype.showModal){
    window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
    window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
  }
  window.localStorage.setItem('y4mcq.auth.token','f'.repeat(64));
  for(const s of ['assets/preauth.js','assets/app.js'])
    window.eval(fs.readFileSync(path.join(process.env.REPO,s),'utf8'));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const $=s=>window.document.querySelector(s);
  await wait(4500);

  const r={};
  r.screen = window.document.body.dataset.screen;
  r.isAdminClass = window.document.body.classList.contains('is-admin');
  const btn = window.document.getElementById('adminMastheadBtn');
  r.adminBtnVisible = !!btn && !btn.hidden;
  if (!r.adminBtnVisible) { console.log(JSON.stringify(r,null,2)); console.log('errors',errs.length); errs.slice(0,8).forEach(e=>console.log(e.slice(0,200))); process.exit(1); }
  btn.click(); await wait(1400);
  r.modalOpen = !$('#adminModal').hidden;
  r.tabs = [...window.document.querySelectorAll('.admin-tab')].map(b=>b.textContent.trim());
  r.activeTab = ($('.admin-tab.active')||{}).textContent;

  const txt = () => (($('#adminNative')||{}).textContent||'').replace(/\s+/g,' ').trim();
  r.usersRows = window.document.querySelectorAll('.admin-users tbody tr').length;
  r.usersFact = txt().slice(0,60);
  r.hasLastSeen = /days ago|today|never/.test(txt());
  r.selfRowProtected = /Use the Account tab/.test(txt());
  r.inviteRows = window.document.querySelectorAll('#inviteList tbody tr').length;
  r.hasInviteForm = !!$('#inviteNew');

  // Delete must open the type-to-confirm dialog, not window.confirm.
  const del = [...window.document.querySelectorAll('.row-act.danger')].find(b=>b.dataset.act==='delete');
  r.foundDeleteAction = !!del;
  if (del) {
    del.click(); await wait(200);
    r.dialogOpened = $('#confirmDialog').open;
    r.dialogNamesUser = /carter@example\.com/.test($('#confirmBody').textContent);
    r.dialogStatesCount = /\d+ saved answers?/.test($('#confirmBody').textContent);
    r.confirmDisabled = $('#confirmGo').disabled;
    r.confirmLabel = $('#confirmGo').textContent;
    $('#confirmTypeInput').value='carter@example.com';
    $('#confirmTypeInput').dispatchEvent(new window.Event('input'));
    await wait(50);
    r.confirmEnabledAfterTyping = !$('#confirmGo').disabled;
    $('#confirmCancel').click(); $('#confirmDialog').close(); await wait(150);
  }
  // Promote acts immediately and reports with an Undo.
  const prom = [...window.document.querySelectorAll('.row-act')].find(b=>b.dataset.act==='promote');
  if (prom) { prom.click(); await wait(900);
    r.statusShown = !$('#adminStatus').hidden;
    r.statusText = ($('#adminStatus').textContent||'').replace(/\s+/g,' ').trim().slice(0,70);
    r.offersUndo = !!$('.admin-status-undo');
  }
  for (const t of ['Bank','Content','Account']) {
    const tb=[...window.document.querySelectorAll('.admin-tab')].find(b=>b.textContent.trim()===t);
    tb.click(); await wait(1000);
    r['tab_'+t] = t==='Content'
      ? $('#adminAddAuditPane').textContent.replace(/\s+/g,' ').trim().slice(0,40)
      : txt().slice(0,55);
  }
  r.pwForm = !!$('#pwForm'); r.revokeBtn = !!$('#revokeSessions'); r.selfDelete = !!$('#acctSelfDeleteOpen');
  const bankTab=[...window.document.querySelectorAll('.admin-tab')].find(b=>b.textContent.trim()==='Bank');
  bankTab.click(); await wait(1200);
  r.bankTableRows = window.document.querySelectorAll('.admin-table-num tbody tr').length;
  r.bankHasGap = /Gap/.test(txt());

  const must = ['modalOpen','adminBtnVisible','hasLastSeen','selfRowProtected',
    'hasInviteForm','foundDeleteAction','dialogOpened','dialogNamesUser',
    'dialogStatesCount','confirmDisabled','confirmEnabledAfterTyping',
    'statusShown','offersUndo','pwForm','revokeBtn','selfDelete','bankHasGap'];
  const missing = must.filter(k => !r[k]);
  if (r.activeTab !== 'Users') missing.push('opens on Users');
  if (r.usersRows !== 3) missing.push('renders every user row');
  if (r.inviteRows !== 2) missing.push('renders every invite row');
  console.log(JSON.stringify(r,null,2));
  if (missing.length) console.log('\nFAILED assertions: ' + missing.join(', '));
  console.log('\nerrors: '+errs.length);
  errs.slice(0,12).forEach(e=>console.log('  '+e.slice(0,260)));
  process.exit(missing.length ? 1 : (errs.length ? 2 : 0));
})().catch(e=>{console.log('HARNESS:',e.stack);process.exit(1)});
