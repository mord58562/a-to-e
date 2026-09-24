# Changelog

User-visible changes to A to E, newest first.

## 1.7.5

- After you reveal an answer, Next sits in the bar at the bottom of the screen, so it is always one tap away on a phone.
- Results and the home screen open at the top.
- Getting a missed question right on a retry keeps it on your "Previously incorrect" list on every device, not just this one.
- Two tabs open at once no longer double-count a test or delete each other's saved session, and a guest's answers from both tabs are kept.
- A study session resumed the next day counts only the time you spent, and a session that expires tells you so.
- Switching a discipline back on brings its learning areas with it, and finding an area also searches what each question covers.
- Single-key shortcuts can be turned off from the Keyboard list.
- Selections stay visible in Windows High Contrast mode, and the setup rows name their groups for screen readers.
- Reports are published without your name or account. Making someone an admin or deleting an account asks for your password.

## 1.7.4

- The first visit starts about twice as fast on a slow connection. Questions load first and the explanations follow in the background; if one hasn't arrived when you reveal an answer, it fills in as soon as it does.
- Tapping Sign in and then a gate tab before the page has finished loading no longer loses the sign-in.

## 1.7.3

- A finished test reaches the server whole, even if the tab closes straight away. A test left unfinished for a day is recorded when it expires, not dropped.
- The test clock and the masthead stay on screen as you scroll.
- In a test you can skip a question and come back, or finish from one you haven't answered.
- Retry incorrect shuffles the options again, and getting a missed question right on the retry doesn't take it off your "Previously incorrect" list.
- After a wrong answer the page shows your pick and the correct option together. Your pick is marked "Your answer."; the other rationales speak for themselves.
- The question card is one reading width, with every line ending at the same edge.
- Learning areas are grouped by discipline, with near-duplicate names merged and a box to find one.
- Stats, Report and Admin are proper dialogs: Tab stays inside them and focus returns where it was.
- On a slow connection the whole bank loads before you start, or the app says which discipline is still coming and keeps fetching it.
- Two tabs open at once no longer double-count answers or undo each other's settings.
- An invite link works when pasted into a tab that already has the site open.
- Deleting your account asks for your password.

## 1.7.2

- Study mode shows the questions you have reached, not a numbered grid of the whole bank. The counter reads "Question 12", and the results count only what you answered.
- A to E on the keyboard pick an option, the same as 1 to 5. Right arrow moves on without committing; Enter commits.
- After a wrong answer the page lands on the correct option.
- A test uses one set of words from start to finish: Next, Finish test, Results.
- The explanation opens with the subtopic as its heading, sits at a comfortable reading width, and names its main source once, under Sources; an option's caption shows only a source that option adds. Reference panels the question depends on are a line of links that open the panel.
- Stats reads as a couple of sentences and a table, weakest areas first, with bars that show accuracy.
- If the server is slow or down, a signed-in student goes straight to the questions and syncs later.
- Error messages say what happened and what to do, in the same voice everywhere.
- Counts and dates are written the Australian way: 7,053 questions, 23 Sept.
- Abbreviation definitions open on tap as well as hover.

## 1.7.1

- A test records each answer once, when it is scored or left. Going back to check a question used to log it again every time, and an answer you moved on from with Next, a navigator number or the clock never reached your history at all.
- In study mode an answer counts when you reveal it. Picking an option and moving away no longer turns its navigator number green or red.
- Keys meant for the question stay out of dialogs. Enter on Cancel cancels; it used to answer the question behind it. Space on an option selects it, and a second press submits.
- Pausing a timed test and leaving no longer freezes the clock of the next one.
- Opening a question from the results steps through the list you were looking at, and "Back to results" goes straight there.
- Answers, flags and settings that fail to reach the server wait and retry, instead of being lost and then overwritten by the older copy. Unflagging on your phone unflags on your laptop.
- If the worker refuses something, you see its reason, not "HTTP 405".
- Readings with commas inside brackets stay on one line, Hb and Na keep their capitals, and a reference range in brackets is no longer shown as the value.
- On a phone, reference values wrap instead of running off the panel, lab values keep a column wide enough to read, and the header buttons no longer sit on the title.
- Screen readers hear whether a revealed answer was right, and no longer hear the clock every second.
- An invite is now a link. Opening it goes straight to Create account with the code, and the email if one was given, already filled in. From the admin panel it can be copied, or sent from your own mail app.

## 1.7.0

- **A session survives a reload.** Close the tab forty minutes into a test, or let a phone evict it, and the home screen offers to resume: same questions in the same order, same position, same rule-outs, same clock. Sessions older than a day are dropped.
- "Retry incorrect" retries the ones you got wrong, not everything you never reached, and says how many.
- The session report loads instantly instead of building a row for every question in the bank, and the score strip is four disciplines rather than 700-odd subtopics.
- Escape while the reference panel is open closes the panel and leaves your answer alone. It used to do both at once.
- The flag button says "Flagged" when the question is flagged.
- The rule-out control and ruled-out option text were too faint to read against their backgrounds; both now clear the contrast bar in either theme.
- The reference panel no longer covers the question it was opened from at laptop widths.
- Readings in a data block stay in their columns when one of them cannot be split into a name and a value.

## 1.6.16

- Reference values now appear on perinatal questions in psychiatry and medicine, and on paediatric questions that were pointing at the adult panel. Where the library genuinely has no paediatric values for a panel, the question says so instead of showing an empty space.
- A failure while the gate is on screen no longer leaves the page stuck behind it.

## 1.6.12

- Pressing the number of the option you already picked takes it back off, so the key that chose it undoes it.
- Choosing an option with the keyboard looks the same as clicking it: one tinted row with a filled marker, and nothing left behind when you take the choice back off.

## 1.6.11

- A revoked invite code disappears from the admin panel instead of sitting there as a row that cannot do anything.
- The name pill and the Admin button are painted with the rest of the masthead instead of arriving a few hundred milliseconds later and shoving the row sideways.

## 1.6.10

- The reference panel no longer drags the masthead sideways when it opens, and the reading column can no longer be pushed off the left edge of the window on a laptop. The navigator moves with the column instead of being left behind under the panel.
- The admin panel's section tabs, the question-list dropdown, the admin count pills and the "Copy prompt" button all work again.
- Signing up as a guest no longer loses the answers you gave as a guest.
- Seventeen questions were rendering no explanation at all.
- A new session starts the navigator at question 1 rather than wherever the last session left it.
- Every question card starts at the stem; an empty header band above it has gone.
- Ending or leaving a session asks in the app's own dialog, and says how many questions are still unanswered.
- Reference values: five rows that shared a label with a different threshold now say which is which.

## 1.6.9

- Navigator chips are sized to the highest question number in the session, so a four-digit number sits inside its cell instead of spilling out of it.

## 1.6.8

- The admin overlay no longer flashes for a frame when the page loads. The rule that revealed the app for a signed-in user forced a display value onto every top-level element, including the ones meant to stay hidden.
- The navigator scrolls with the page instead of hanging in the same spot, and pages a round hundred at a time.
- Readings in a data block are laid out as a two-column chart, so names line up, values line up, and a long reading wraps inside its own cell instead of breaking a pair in half. A panel of laboratory results renders the same way as a set of vital signs rather than falling back to a paragraph.

## 1.6.7

- The question navigator draws as many chips as fit the rail, so it no longer has a scrollbar of its own. The page has one scroll.
- The keyboard number on an option row lines up with the rule-out control beside it.
- Invite codes can be read back. A live code is shown in full in the admin panel with a copy control, and the code shown when you create one stays on screen until you dismiss it instead of being wiped by the refresh a moment later. Needs the worker deployed with `schema_005_invite_reveal.sql`; codes issued before that can only be replaced, which the panel offers as Reissue.

## 1.6.6

- The admin panel's section tabs switch panes again. The Content pane was pinned open by a stylesheet rule that outranked the `hidden` attribute, so selecting another section rendered it underneath. Seven other elements carried the same latent bug.
- The question navigator is anchored to the reading column instead of the window edge, so it no longer drifts into the margin as the window widens, and it starts level with the topbar.
- The topbar is the width of the card it seams into, rather than the width of the window.
- Readings in a data block sit on a grid and all split into name and value, including ones whose value is a word rather than a number.
