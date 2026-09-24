/* Keyboard model (1.7.2): A to E select like 1 to 5 and never commit;
 * the selected option's own key takes it off; shift+N rules out; Right
 * never commits; Enter commits and the reveal marks one correct row;
 * letters are inert once revealed. */
const { boot, startSession, key, runner, main, wait } = require("./harness");
main(async () => {
  const T = runner("keyboard");
  const t = await boot();
  await startSession(t, { mode: "study" });
  await T.booted(t);
  const sel = () => (t.$("#qOptions li.selected") || { dataset: {} }).dataset.letter || null;
  const revealed = () => !!t.$("#qOptions li.revealed");
  const stem = () => t.$("#qStem").textContent.slice(0, 200);

  key(t, "b"); await wait(30);
  T.eq(sel(), "B", "letter b selects option B");
  T.ok(!revealed(), "letter b does not commit");
  key(t, "d"); await wait(30);
  T.eq(sel(), "D", "letter d selects option D");
  T.ok(!revealed(), "letter d does not commit");
  key(t, "4"); await wait(30);
  T.eq(sel(), null, "the selected option's own number takes it off");
  key(t, "2"); await wait(30);
  T.eq(sel(), "B", "number 2 selects option B");
  key(t, "1", { shift: true }); await wait(30);
  T.ok(t.$('#qOptions li[data-letter="A"]').classList.contains("struck"), "shift+1 rules out option A");

  const before = stem();
  key(t, "ArrowRight"); await wait(80);
  // Wherever Right went, it must not have committed question 1.
  if (stem() !== before) { key(t, "ArrowLeft"); await wait(80); }
  T.eq(stem(), before, "back on question 1");
  T.ok(!revealed(), "Right does not commit a selection");

  key(t, "Enter"); await wait(150);
  T.ok(revealed(), "Enter commits");
  T.eq(t.$$("#qOptions li.correct").length, 1, "exactly one row marked correct on reveal");
  key(t, "c"); await wait(30);
  T.ok(t.$$("#qOptions li.selected").length <= 1 && revealed(), "letters are inert once revealed");
  T.done(t);
});
