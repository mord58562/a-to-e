/* Home setup and the dialogs around it.
 * Leaving the gate puts focus on the home heading, not <body>. Each
 * setup row is a group named by its label. Learning areas: untouched
 * chips are not reported pressed; Find matches a question's specific
 * topic ("asthma" finds Respiratory) and says when nothing matches;
 * discipline groups are named; a discipline switched back on while
 * areas are narrowed brings all its areas; All areas sits outside the
 * collapsed section and hands focus to its summary. The report dialog
 * keeps a draft across a close, and a press that starts inside the card
 * and ends on the backdrop does not close it. Single-key shortcuts can
 * be switched off from the Keyboard legend, and the choice persists. */
const { boot, key, runner, main, wait, waitFor } = require("./harness");
main(async () => {
  const T = runner("home");
  const t = await boot();
  await T.booted(t);
  const { $, $$ } = t;

  $("#gateGuestBtn").focus();
  $("#gateGuestBtn").click();
  await waitFor(() => t.screen() === "home" && $("#startBtn") && $$("#subtopicChips .opt").length, 30000, "home with areas").catch(() => {});
  const f = t.document.activeElement;
  T.ok(f && f.tagName === "H1", `focus goes to the home heading after the gate (${f && f.tagName})`);

  const rows = $$(".setup-options[data-name]:not(#subtopicChips)");
  T.ok(rows.length >= 6 && rows.every(r => r.getAttribute("role") === "group" && $("#" + r.getAttribute("aria-labelledby"))),
    "every setup row is a group labelled by its row label");
  T.ok(/minutes/.test($("#lblTimer").textContent), "the Timer group names its unit");

  const chips = () => $$("#subtopicChips .opt");
  T.ok(chips().length > 50 && chips().every(c => c.getAttribute("aria-pressed") === "false"),
    "untouched areas are not reported pressed");
  T.eq($("#subtopicChips").getAttribute("aria-describedby"), "tagHint", "untouched areas describe the first-tap rule");
  const groups = $$("#subtopicChips .tag-group");
  T.ok(groups.length === 4 && groups.every(g => g.getAttribute("role") === "group" && $("#" + g.getAttribute("aria-labelledby"))),
    "each discipline's areas are a named group");

  const find = async text => {
    $("#tagFilter").value = text;
    $("#tagFilter").dispatchEvent(new t.window.Event("input"));
    await wait(200);
    return chips().filter(c => !c.hidden).map(c => c.textContent);
  };
  const asthma = await find("asthma");
  T.ok(asthma.some(n => /^Respiratory/.test(n)), `"asthma" finds Respiratory (${asthma.slice(0, 4).join(", ")})`);
  T.eq($("#tagNone").textContent, "", "no no-match line while something matches");
  T.eq((await find("qqqqzz")).length, 0, "nonsense matches nothing");
  T.eq($("#tagNone").textContent, 'No learning area matches "qqqqzz".', "a no-match line is shown");
  T.eq($("#tagNone").getAttribute("role"), "status", "the no-match line is a status");
  await find("");

  // Narrow to one Paediatrics area, then switch Medicine off and on.
  const paedsArea = chips().find(c => c.dataset.value.startsWith("Paediatrics::"));
  paedsArea.click(); await wait(50);
  T.eq(paedsArea.getAttribute("aria-pressed"), "true", "the chosen area reads pressed");
  T.ok(chips().filter(c => c !== paedsArea).every(c => c.getAttribute("aria-pressed") === "false"), "the rest read not pressed");
  const allBtn = $("#tagsAll");
  T.ok(!allBtn.hidden && !allBtn.closest("details"), "All areas shows outside the collapsed section");
  const med = $('.setup-options[data-name="disciplines"] .opt[data-value="Medicine"]');
  med.click(); await wait(50);
  const medOff = chips().filter(c => c.dataset.value.startsWith("Medicine::")).length;
  T.eq(medOff, 0, "Medicine off hides its areas");
  med.click(); await wait(50);
  const medChips = chips().filter(c => c.dataset.value.startsWith("Medicine::"));
  T.ok(medChips.length > 10 && medChips.every(c => c.classList.contains("selected")),
    `Medicine switched back on comes with all its areas (${medChips.filter(c => c.classList.contains("selected")).length} of ${medChips.length})`);
  T.ok(/of/.test($("#tagCountLabel").textContent), `still narrowed elsewhere (${$("#tagCountLabel").textContent})`);
  allBtn.focus(); allBtn.click(); await wait(50);
  T.ok(allBtn.hidden, "All areas hides once every area is back");
  T.eq(t.document.activeElement, $("#tagSection > summary"), "focus moves to the Learning areas summary");

  // Report draft and backdrop.
  const { startSession } = require("./harness");
  await startSession(t, { mode: "study" });
  $("#reportBtn").click(); await wait(80);
  T.ok(/published publicly, without your name or account/.test($("#reportModal").textContent), "the dialog says reports are public");
  $("#reportText").value = "Draft about the key";
  const dlg = $("#reportModal");
  $("#reportText").dispatchEvent(new t.window.MouseEvent("pointerdown", { bubbles: true }));
  dlg.dispatchEvent(new t.window.MouseEvent("click", { bubbles: true }));
  await wait(50);
  T.ok(!dlg.hidden, "a drag from the text ending on the backdrop does not close the dialog");
  dlg.dispatchEvent(new t.window.MouseEvent("pointerdown", { bubbles: true }));
  dlg.dispatchEvent(new t.window.MouseEvent("click", { bubbles: true }));
  await wait(50);
  T.ok(dlg.hidden, "a press and release on the backdrop closes it");
  $("#reportBtn").click(); await wait(80);
  T.eq($("#reportText").value, "Draft about the key", "the draft is still there on reopen");
  $("#reportCancel").click(); await wait(50);

  // Single-key shortcuts off.
  const sw = $("#navRail [data-keys-switch]");
  if (T.ok(!!sw && sw.checked, "the Keyboard legend has a shortcuts switch, on by default")) {
    sw.checked = false;
    sw.dispatchEvent(new t.window.Event("change", { bubbles: true }));
    await wait(50);
    const sel = () => (t.$("#qOptions li.selected") || { dataset: {} }).dataset.letter || null;
    key(t, "b"); await wait(30);
    T.eq(sel(), null, "with shortcuts off, a letter selects nothing");
    key(t, "3"); await wait(30);
    T.eq(sel(), null, "with shortcuts off, a number selects nothing");
    const flagged = $("#flagBtn").classList.contains("active");
    key(t, "f"); await wait(30);
    T.eq($("#flagBtn").classList.contains("active"), flagged, "with shortcuts off, F does not flag");
    const stored = Object.keys(t.window.localStorage).filter(k => /settings/.test(k))
      .map(k => { try { return JSON.parse(t.window.localStorage.getItem(k)); } catch (_) { return null; } });
    T.ok(stored.some(s => s && s.shortcuts === false), "the switch is saved in settings");
    const again = $("#navRail [data-keys-switch]");
    T.ok(again && !again.checked, "the rebuilt legend shows it off");
    T.ok(!/choose an option/.test($("#navRail .nav-keys").textContent), "the legend drops the keys that are off");
  }
  T.done(t);
});
