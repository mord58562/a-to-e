/* Navigator rail semantics.
 * Study: the rail shows only the questions reached so far (one chip at
 * the start, one more per question moved on to, none lost going back),
 * a picked but unrevealed answer is a "selected, not submitted" chip and
 * not counted, the tally reads "N answered" with no "of N", and there is
 * no Go to form.
 * Test: every question is a chip from the start, and the tally reads
 * "N of M answered". */
const { boot, startSession, key, runner, main, wait } = require("./harness");
main(async () => {
  const T = runner("navigator");
  const pages = [];

  const s = await boot();
  pages.push(s);
  await startSession(s, { mode: "study" });
  await T.booted(s, "study: ");
  const chips = t => t.$$("#navRail .nav-chip");
  const tally = t => (t.$("#navRail .nav-stats") || {}).textContent || "";
  const current = t => (t.$("#navRail .nav-chip.current") || {}).textContent;

  T.ok(s.$("#navRail") && !s.$("#navRail").hidden, "study: rail shown");
  T.eq(chips(s).length, 1, "study: one chip at the start");
  T.eq(tally(s), "0 answered, 0 right and 0 wrong.", "study: tally has no \"of N\"");
  T.ok(!s.$("#navJumpInput") && !s.$("#navRail .nav-jump"), "study: no Go to form");

  // Pick without revealing, then move on: question 1 is pending.
  key(s, "a"); await wait(50);
  key(s, "ArrowRight"); await wait(150);
  T.eq(chips(s).length, 2, "study: moving on adds one chip");
  const pending = chips(s)[0];
  T.ok(pending && pending.classList.contains("answered") && /selected, not submitted/.test(pending.getAttribute("aria-label")),
    "study: a pick before the reveal is a pending chip");
  T.eq(tally(s), "0 answered, 0 right and 0 wrong.", "study: a pending pick is not counted");
  key(s, "ArrowLeft"); await wait(150);
  key(s, "Enter"); await wait(150);
  T.ok(/^1 answered, (1 right and 0|0 right and 1) wrong\.$/.test(tally(s)), `study: revealed answer counted and graded (${tally(s)})`);
  T.ok(/\b(correct|incorrect)\b/.test(chips(s)[0].className), "study: revealed chip is graded");
  T.eq(chips(s).length, 2, "study: going back and revealing keeps the reached chips");
  s.$("#nextBtn").click(); await wait(150);

  for (let n = 3; n <= 4; n++) {
    key(s, "ArrowRight"); await wait(150);
    T.eq(chips(s).length, n, `study: ${n} chips after moving on to question ${n}`);
    T.eq(current(s), String(n), `study: chip ${n} is current`);
  }
  key(s, "ArrowLeft"); await wait(100); key(s, "ArrowLeft"); await wait(100);
  T.eq(current(s), "2", "study: Left goes back");
  T.eq(chips(s).length, 4, "study: going back keeps every reached chip");
  T.ok(!/ of /.test(tally(s)), "study: still no \"of N\"");

  const t = await boot();
  pages.push(t);
  await startSession(t, { mode: "test", count: 10 });
  T.eq(chips(t).length, 10, "test: every question is a chip from the start");
  T.eq(tally(t), "0 of 10 answered.", "test: tally reads \"of N\"");
  T.eq(t.$("#submitBtn").textContent, "Skip", "test: the button reads Skip before a pick");
  key(t, "b"); await wait(50);
  T.eq(t.$("#submitBtn").textContent, "Next", "test: and Next after one");
  t.$("#submitBtn").click(); await wait(150);
  T.eq(current(t), "2", "test: Next moves on");
  T.eq(tally(t), "1 of 10 answered.", "test: the pick is counted");
  T.ok(chips(t)[0].classList.contains("answered") && !/\b(correct|incorrect)\b/.test(chips(t)[0].className),
    "test: an answered chip is not graded mid-test");
  T.done(...pages);
});
