/* Report dialog: before the answer is shown it names the position, never
 * the id (ids can name the answer); a test says "of N", study does not;
 * after the reveal it adds the subtopic, never the id. Too-short text is
 * refused locally with no request; a worker refusal is worded from its
 * code and re-enables Send; success says so, sends the id under an
 * opaque guest profile, closes the dialog and marks the question. */
const { boot, startSession, key, runner, main, wait, waitFor } = require("./harness");
main(async () => {
  const T = runner("report");
  let reply = { body: { ok: true, id: "report-1" } };
  const pages = [];
  for (const mode of ["test", "study"]) {
    const t = await boot({ routes: { "POST /report": () => reply }, warnOk: /^\[backend\] POST \S+\/report 429 report_rate/ });
    pages.push(t);
    await startSession(t, { mode });
    await T.booted(t, `${mode}: `);
    const label = () => t.$("#reportQId").textContent;
    const reports = () => t.callsTo("POST", "/report");
    t.$("#reportBtn").click(); await wait(80);
    T.ok(!t.$("#reportModal").hidden, `${mode}: report dialog opens`);
    const pre = label();
    T.ok(mode === "test" ? /^Question 1 of \d[\d,]*$/.test(pre) : pre === "Question 1", `${mode}: pre-reveal label is the position (${pre})`);
    T.ok(!/[a-z]+-[a-z0-9-]{3,}/.test(pre), `${mode}: pre-reveal label carries no id`);

    t.$("#reportText").value = "no";
    t.$("#reportSubmit").click(); await wait(80);
    T.eq(t.$("#reportStatus").textContent, "Add a few words about what's wrong.", `${mode}: short report refused with the report_short line`);
    T.eq(reports().length, 0, `${mode}: no request for a short report`);

    reply = { status: 429, body: { ok: false, code: "report_rate", error: "RAW" } };
    t.$("#reportText").value = "The answer key is wrong here.";
    t.$("#reportSubmit").click();
    await waitFor(() => !/Sending/.test(t.$("#reportStatus").textContent), 3000, "the refusal").catch(() => {});
    T.eq(t.$("#reportStatus").textContent, "Not sent. You've sent a lot of reports this hour. Try again later.", `${mode}: report_rate worded`);
    T.ok(!t.$("#reportSubmit").disabled, `${mode}: Send re-enabled after a refusal`);

    reply = { body: { ok: true, id: "report-1" } };
    t.$("#reportSubmit").click();
    await waitFor(() => !/Sending/.test(t.$("#reportStatus").textContent), 3000, "the reply").catch(() => {});
    T.eq(t.$("#reportStatus").textContent, "Sent. Thank you.", `${mode}: success line`);
    T.eq(reports().length, 2, `${mode}: one POST per send`);
    const sent = reports().pop().body;
    T.ok(typeof sent.question_id === "string" && sent.question_id.length > 3, `${mode}: the id still goes in the report`);
    T.eq(sent.issue, "The answer key is wrong here.", `${mode}: the text goes in the report`);
    T.ok(/^guest-/.test(sent.profile), `${mode}: filed under an opaque guest id (${sent.profile})`);
    await waitFor(() => t.$("#reportModal").hidden, 3000, "the dialog to close").catch(() => {});
    T.ok(t.$("#reportModal").hidden, `${mode}: dialog closes after success`);
    T.ok(t.$("#reportBtn").classList.contains("has-report"), `${mode}: Report button marks the question as reported`);

    if (mode === "study") {
      key(t, "a"); await wait(30); key(t, "Enter"); await wait(200);
      t.$("#reportBtn").click(); await wait(80);
      T.ok(/^Question 1: \S/.test(label()) && !label().includes(sent.question_id),
        `study: after the reveal the label names the position and subtopic, not the id (${label()})`);
    }
  }
  T.done(...pages);
});
