"""What counts as a servable question, for the Python tools.

The same rule as isServable() in assets/app.js and servableProblem() in
cloudflare-worker/src/worker.js. The site drops any question that fails
it, so a tool that writes or counts one would disagree with what students
see. server.py and sync_routine_counts.py import it from here.
"""

SERVABLE_TOPICS = ("Paediatrics", "Obstetrics & Gynaecology", "Psychiatry", "Medicine")


def servable_problem(q):
    """The first rule `q` fails, worded as the worker words it, or None."""
    if not isinstance(q, dict) or not q.get("id"):
        return "no id"
    if not isinstance(q.get("stem"), str):
        return "no stem"
    if q.get("topic") not in SERVABLE_TOPICS:
        return "topic not one of " + ", ".join(SERVABLE_TOPICS)
    d = q.get("difficulty")
    # JSON 3.0 is an integer to Number.isInteger; a bool is not.
    if (isinstance(d, bool) or not isinstance(d, (int, float))
            or (isinstance(d, float) and not d.is_integer()) or not 1 <= d <= 5):
        return "difficulty not an integer 1-5"
    opts = q.get("options")
    if not isinstance(opts, list) or len(opts) < 2:
        return "fewer than 2 options"
    # JavaScript's typeof calls an array an object, so the client lets one through.
    if not all(isinstance(o, (dict, list)) for o in opts):
        return "an option is not an object"
    if sum(1 for o in opts if isinstance(o, dict) and o.get("correct") is True) != 1:
        return "not exactly one correct option"
    return None


def is_servable(q):
    return servable_problem(q) is None


def unservable_message(questions):
    """The worker's 400 text naming the first few unservable questions, or None."""
    bad = []
    for i, q in enumerate(questions):
        why = servable_problem(q)
        if why:
            qid = q.get("id") if isinstance(q, dict) and q.get("id") else f"#{i + 1}"
            bad.append(f"{qid}: {why}")
    if not bad:
        return None
    more = f"; +{len(bad) - 5} more" if len(bad) > 5 else ""
    return (f"{len(bad)} question(s) would not be served. Nothing was written: "
            + "; ".join(bad[:5]) + more + ".")
