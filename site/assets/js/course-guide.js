/* Course guide: quiz bank, technical contributions data and the planning tools. */
(function () {
  "use strict";
  const h = PA.h;

  /* =====================================================================
     Technical contributions (Project note, version of 2026-08-21)
     unit: what n counts; per: points per unit; after: units that do not count; max: cap.
     No `per` means the group simply claims 0 to max points.
     ===================================================================== */
  const CONTRIB = [
    ["Implementation", "ISY", "Implement Syntactic Analysis", { unit: "analyses", per: 5, max: 10 }, "e.g. scan the bytecode for values to use in a fuzzer, or quickly detect assertions"],
    ["Implementation", "ICF", "Implement Coverage-based Fuzzing", { max: 10 }],
    ["Implementation", "IAB", "Implement Novel Abstractions", { unit: "abstractions", per: 5, max: 10 }, "not covered in class, e.g. machine word abstractions or polyhedra"],
    ["Implementation", "ISE", "Implement Symbolic Execution", { max: 10 }],
    ["Implementation", "IBA", "Implement Unbounded Static Analysis", { max: 7 }, "run your static analysis until a fixed point"],
    ["Engineering", "NAB", "Integrate Abstractions", { unit: "abstractions", per: 5, after: 1, max: 10 }, "run two or more abstractions at once, informing each other"],
    ["Engineering", "NAN", "Integrate Analyses", { unit: "analyses", per: 5, after: 1, max: 15 }, "use one analysis to improve another; running them in parallel does not count"],
    ["Engineering", "NIN", "Use Bytecode Instrumentation", { max: 10 }, "instrument the bytecode so the JVM runs the dynamic analysis"],
    ["Engineering", "NCR", "Analysis informed code-rewriting", { max: 10 }],
    ["Engineering", "NTS", "Analysis informed test synthesis", { max: 10 }, "programs more complex than a single call"],
    ["Engineering", "NDT", "Handle Novel Datatype", { unit: "datatypes", per: 5, max: 10 }, "e.g. strings or doubles"],
    ["Evaluation", "EXB", "Extend Benchmark Suite", { unit: "methods", per: 0.5, max: 5 }],
    ["Evaluation", "ERC", "Make Analysis run on Real Code", { unit: "10k lines", per: 1, max: 10 }],
    ["Evaluation", "EOP", "Optimize the code", { unit: "orders of magnitude", per: 5, max: 10 }],
    ["Evaluation", "ERW", "Compare with existing tools", { unit: "tools", per: 2.5, max: 10 }],
    ["Evaluation", "EST", "Do Statistical Analysis of Results", { max: 5 }],
    ["Theory", "TAB", "Prove abstractions correct", { unit: "abstractions", per: 5, max: 10 }],
    ["Theory", "TWI", "Prove termination for widening operators", { unit: "abstractions", per: 5, max: 10 }],
    ["Presentation", "PWP", "Write Paper", { unit: "pages", per: 1, max: 10 }],
    ["Presentation", "PEX", "Find Illustrating Examples", { unit: "examples", per: 2, max: 4 }],
    ["Presentation", "PDI", "Create a Process Diagram", { max: 3 }],
    ["Presentation", "PRW", "Read and relate to recent papers", { unit: "papers", per: 1, max: 10 }],
    ["Presentation", "PMG", "Project Management", { unit: "persons", per: 3, after: 3, max: 9 }, "3 per person over 3"],
  ];
  const BY_CODE = {};
  CONTRIB.forEach((c) => (BY_CODE[c[1]] = c));
  const GRADES = [[12, 20, 5], [10, 15, 4], [7, 10, 3], [4, 7, 3], ["02", 5, 3]];

  function formulaText(f) {
    if (!f.per) return "up to the maximum";
    const ONE = { analyses: "analysis", abstractions: "abstraction", datatypes: "datatype", methods: "method", "10k lines": "10k lines", "orders of magnitude": "order of magnitude", tools: "tool", pages: "page", examples: "example", papers: "paper", persons: "person" };
    return f.per + " per " + (ONE[f.unit] || f.unit) + (f.after === 1 ? " after the first" : f.after ? " over " + f.after : "");
  }
  function points(code, n) {
    const f = BY_CODE[code][3];
    if (!f.per) return Math.max(0, Math.min(f.max, n));
    return Math.max(0, Math.min(f.max, f.per * Math.max(0, n - (f.after || 0))));
  }
  function grade(P, D) {
    for (const [g, p, d] of GRADES) if (P >= p && D >= d) return String(g);
    return null;
  }

  /* =====================================================================
     QUIZ BANK
     ===================================================================== */
  const QUIZ = {
    course: [
      { q: "Why does the course give you a problem <em>before</em> explaining the material?", options: [
        ["To save lecture time", false, "Time is not the argument. The argument is about how learning works."],
        ["Because material only sticks when it fills a gap you discovered by failing at a task", true, "That is the teaching philosophy: \"You only learn from your mistakes.\" The lecture is then relevant to a problem you already care about."],
        ["Because the theory is optional", false, "The theory is examined at the oral exam. It is taught when you need it, not skipped."],
        ["Because attendance is mandatory", false, "Attendance is not mandatory, although the lectures are the primary way the material is conveyed."],
      ] },
      { q: "How many hours a week does the didactic contract expect you to spend on the course?", options: [
        ["4 hours, the lecture time", false, "Only 4 of the hours are in class."],
        ["About 14 hours, of which 4 are in class", true, "7.5 ECTS at 28 hours each is 210 hours; the course states this as about 14 hours a week, only 4 of them in class."],
        ["About 28 hours", false, "28 hours is the workload of one ECTS point, spread over the whole semester."],
        ["It depends only on your group", false, "The expectation is set by the ECTS points, not by the group."],
      ] },
    ],
    week: [
      { q: "What happens in the first 30 minutes of a lecture day?", options: [
        ["A quiz that counts toward the grade", false, "There is no graded quiz; the start is for feedback."],
        ["Peer feedback in your feedback group, then communal feedback with the whole class", true, "13:00 peer feedback on progress and last week's questions, 13:20 communal summary, 13:30 the lecture starts."],
        ["Lab work with the TAs", false, "Lab work is from 15:00."],
        ["Project group meetings", false, "The start is with your feedback group, which is a different group."],
      ] },
      { q: "Can your project group overlap with your feedback group?", options: [
        ["Yes, it is encouraged", false, "The note says the groups cannot overlap."],
        ["No, the project group may not overlap with the feedback group", true, "The feedback group exists to hear alternative solutions from other people, so it should not be your own project team."],
        ["Only if both groups agree", false, "There is no such exception in the note."],
      ] },
      { q: "Why should you take the end-of-lecture questions seriously?", options: [
        ["They are graded homework", false, "They are not graded; they are discussion questions for your feedback group."],
        ["They are discussed in your feedback group and may be asked at the oral exam", true, "Each lecture page on this site lists them under \"Exam questions\" with model answers."],
        ["They decide your project group", false, "They have nothing to do with group formation."],
      ] },
    ],
    schedule: [
      { q: "Which deliverable is listed as due at lecture 13 (11-30)?", options: [
        ["The proposal", false, "The proposal is due around the 10-19 lab day."],
        ["The paper", true, "The paper is due at 11-30; the video and the contribution table follow on 12-07."],
        ["The project group sign-up", false, "Groups are fixed when the proposal is handed in, around 10-19."],
        ["The video", false, "The video and contribution table are due 12-07."],
      ] },
    ],
    proposal: [
      { q: "A proposal scores Context 4, Gap 3, Innovation 3, Evaluation 1, Plan 3, Presentation 4. Is it accepted?", options: [
        ["Yes, 18 points is above 12", false, "The total is fine, but no criterion may be 1, and Evaluation is 1."],
        ["No, because one criterion is 1", true, "Both conditions must hold: at least 12 points and no criterion at 1. It must be resubmitted."],
        ["Yes, presentation compensates", false, "There is no compensation for a 1."],
      ] },
      { q: "What does CGIE stand for?", options: [
        ["Code, Graph, Interpreter, Evaluation", false, "It is a writing model, not a list of artefacts."],
        ["Context, Gap, Innovation, Evaluation", true, "The proposal adds Plan and Presentation to these four criteria."],
        ["Correctness, Generality, Implementation, Efficiency", false, "Those are qualities of a tool, not the structure of a proposal."],
      ] },
    ],
    assessment: [
      { q: "What does the assessment put special weight on?", options: [
        ["Lines of code written", false, "Size is not a criterion."],
        ["Using the course content, a well-done project with claims supported by evaluation, and (for extra) an interesting, innovative problem and solution", true, "These three are listed in the Project note, in that order."],
        ["The number of lectures attended", false, "Attendance is not mandatory, and it is not graded."],
      ] },
      { q: "Which parts make up the final grade?", options: [
        ["Only the oral exam", false, "The paper and overview sheet count too."],
        ["Paper, individualised project overview sheet, video presentation and oral defence, as one overall assessment", true, "It is a joint evaluation of the paper and the oral exam performance."],
        ["The quizzes on this site", false, "This site is an unofficial study aid; nothing on it is graded."],
      ] },
    ],
    contributions: [
      { q: "A group implements three novel abstractions (IAB, 5 per abstraction, max 10). How many points can it claim?", options: [
        ["15", false, "The maximum caps it at 10."],
        ["10", true, "min(10, 5 x 3) = 10."],
        ["5", false, "Each abstraction is worth 5 until the cap."],
      ] },
      { q: "Integrate Analyses (NAN) gives 5 points per analysis <em>after the first</em>. A group combines three analyses. Points?", options: [
        ["15", false, "The first analysis does not count."],
        ["10", true, "5 x (3 - 1) = 10, below the cap of 15."],
        ["5", false, "Two analyses count, not one."],
      ] },
      { q: "A student has 22 points spread over 4 contributions. Suggested maximal grade?", options: [
        ["12", false, "12 needs 5 different contributions."],
        ["10", true, "At least 15 points across 4 contributions. Diversity, not points, is the limit here."],
        ["7", false, "They meet the stricter requirements for 10."],
      ] },
    ],
    "paper-requirements": [
      { q: "What must the evaluation section contain?", options: [
        ["Only a table of JPAMB scores", false, "Results need analysis and a comparison."],
        ["An empirical evaluation compared against at least one other technique (or variations of yours), an analysis of the results, and threats to validity", true, "All four items are listed in the Project note."],
        ["A proof of soundness", false, "Proofs belong in the approach and theory section."],
      ] },
      { q: "What goes in the appendix (which does not count toward the 10 pages)?", options: [
        ["The introduction", false, "The introduction is part of the main paper."],
        ["A data availability statement, an AI-use statement and the references", true, "These are required in the appendix."],
        ["The evaluation", false, "The evaluation is a main section."],
      ] },
    ],
    defence: [
      { q: "Why should your video slides be numbered?", options: [
        ["It is required by ACM", false, "The reason is practical."],
        ["So the examiners can navigate the video during the oral exam", true, "The video guides the exam; numbered slides make it easy to jump to a diagram or example."],
        ["To make the video longer", false, "The video is at most 5 minutes."],
      ] },
    ],
    writing: [
      { q: "Which sentence is in active voice?", options: [
        ["A thorough investigation of the inaccuracies was done.", false, "Who did it? Nobody: passive voice."],
        ["We investigated the inaccuracies thoroughly.", true, "The subject (we) does the action. Use \"we\" for what you did."],
        ["Contained in this paper are many truths.", false, "Inverted passive construction; write \"This paper contains many truths\"."],
      ] },
      { q: "What does \"old to new\" mean for a sentence?", options: [
        ["Cite old papers before new ones", false, "It is about information within a paragraph, not citations."],
        ["Begin with information the reader already has and end with the new information", true, "That keeps the paragraph flowing; flow breaks when a sentence starts with something new and unrelated."],
        ["Put the history of the field first", false, "That is about structure, not sentence flow."],
      ] },
      { q: "Where should the main point of a paragraph go?", options: [
        ["In the last sentence, as a surprise", false, "Readers who skim would miss it."],
        ["In the first sentence; the rest supports it", true, "One point per paragraph, stated up front."],
        ["In a footnote", false, "Never hide the point."],
      ] },
    ],
    structure: [
      { q: "Which is the best title?", options: [
        ["Group 10", false, "Your group is already in the author list; the title is wasted."],
        ["Program Analysis", false, "It says nothing about your work."],
        ["Confirming Static Analysis Results using Directed Dynamic Analysis", true, "Recognisable keywords and a clear method."],
        ["Testcase Prediction", false, "Ambiguous, and the method is unclear."],
      ] },
      { q: "Which part of the paper has the fewest readers?", options: [
        ["The abstract", false, "About 1,000 readers in the funnel."],
        ["The technical meat", true, "About 10 readers. That is why the earlier, widely read parts must carry your message."],
        ["Related work", false, "About 100, as many as the introduction."],
      ] },
    ],
    cgie: [
      { q: "In the CGIE model, where do references to prior work mostly go in the introduction?", options: [
        ["In the context", false, "The context motivates the problem."],
        ["In the gap", true, "The gap explains why current approaches fall short, which is where some prior work is cited; the full discussion is in related work."],
        ["In the evaluation", false, "Evaluation is about your evidence."],
      ] },
      { q: "How should the introduction end?", options: [
        ["With the conclusion", false, "The conclusion is its own short section."],
        ["With a bullet list of contributions, each with a forward reference to the section that delivers it", true, "\"Don't let your reader guess what you did.\""],
        ["With the threats to validity", false, "Those belong in the evaluation."],
      ] },
    ],
    technical: [
      { q: "\"We ran all experiments on one laptop, which is noisy\" is a threat to...", options: [
        ["external validity", false, "External validity is about generalising beyond your scope."],
        ["internal validity", true, "It is a measurement problem inside the experiment, mitigated by repeated measurements."],
        ["construct validity only", false, "The note distinguishes internal and external validity; this is internal."],
      ] },
      { q: "How much space should the implementation description take?", options: [
        ["Most of the paper", false, "The note calls implementation often uninteresting to the reader."],
        ["A paragraph or two, focusing on how it differs from the theory", true, "Spend the space on the idea, the theory and the evaluation."],
        ["None at all", false, "Briefly explain how the theory became a tool, especially the differences."],
      ] },
    ],
    related: [
      { q: "What makes related work good?", options: [
        ["A long list of citations", false, "Listing is exactly what the note warns against."],
        ["For each alternative, an explanation of why it does not solve your problem as well", true, "Compare, don't list."],
        ["Only citing papers from this year", false, "Relevance matters, not age."],
      ] },
    ],
  };

  /* =====================================================================
     LABS
     ===================================================================== */

  /* --- Timeline of the semester --- */
  function labTimeline(el) {
    const { controls, view } = PA.lab(el, {
      title: "Where are we in the semester?",
      hint: "Lectures, deadlines and the exam on one line, with today marked. Hover or tap a marker for details.",
    });
    el.classList.add("wide");
    controls.classList.add("tl-controls");
    const EVENTS = [
      ["2026-08-31", "lecture", "01 Introduction"], ["2026-09-07", "lecture", "02 Syntactic Analysis"],
      ["2026-09-14", "lecture", "03 Semantics"],
      ["2026-09-21", "lecture", "04 Dynamic Analysis"],
      ["2026-09-28", "lecture", "05 Bounded Static Analysis"], ["2026-10-05", "lecture", "06 Unbounded Static Analysis (listed 10-04)"],
      ["2026-10-12", "break", "Autumn holiday"],
      ["2026-10-19", "lab", "Lab day; proposal due (+1 day)"], ["2026-10-26", "lecture", "07 Concolic Execution"],
      ["2026-11-02", "lecture", "09 Context Sensitive Analysis"], ["2026-11-09", "lab", "Lab day"],
      ["2026-11-16", "lecture", "11 How to Write a Good Paper"], ["2026-11-23", "lab", "Lab day"],
      ["2026-11-30", "due", "13 Q/A; paper due"], ["2026-12-07", "due", "Video and contribution table due"],
      ["2026-12-09", "exam", "Exam (tentative, 12-09 to 12-11)"],
    ].map(([d, kind, label]) => ({ date: new Date(d + "T12:00:00"), kind, label, d }));
    const mode = PA.seg(controls, { label: "Today", options: [["real", "Real date"], ["pick", "Pick a date"]], value: "real" });
    const pick = PA.slider(controls, { label: "Day of the semester", min: 0, max: 102, value: 33, fmt: (v) => fmtDate(addDays(EVENTS[0].date, v)) });
    const legend = h("div", { class: "legend" });
    [["lecture", "Lecture"], ["due", "Deadline"], ["lab", "Lab day"], ["break", "Holiday"], ["exam", "Exam"]].forEach(([k, t]) => legend.append(h("span", null, [h("i", { class: "tl-dot k-" + k }), document.createTextNode(t)])));
    controls.append(legend);
    const svgWrap = h("div", { class: "stage tl-stage" });
    const next = h("div", { class: "tl-next" });
    view.append(svgWrap, next);

    function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
    function fmtDate(d) { return d.toISOString().slice(0, 10); }
    const start = addDays(EVENTS[0].date, -3), end = addDays(EVENTS[EVENTS.length - 1].date, 4);
    const span = end - start;

    function render() {
      pick.wrap.style.display = mode.value === "pick" ? "" : "none";
      const today = mode.value === "real" ? new Date() : addDays(EVENTS[0].date, pick.value);
      const W = 1000, H = 120, x = (d) => 20 + ((d - start) / span) * (W - 40);
      let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Semester timeline">';
      s += '<line x1="20" y1="60" x2="' + (W - 20) + '" y2="60" class="tl-axis"/>';
      ["2026-09-01", "2026-10-01", "2026-11-01", "2026-12-01"].forEach((m) => {
        const xm = x(new Date(m + "T00:00:00"));
        s += '<line x1="' + xm + '" y1="52" x2="' + xm + '" y2="68" class="tl-tick"/><text x="' + xm + '" y="88" class="tl-month" text-anchor="middle">' + new Date(m).toLocaleString("en", { month: "short" }) + "</text>";
      });
      EVENTS.forEach((e, i) => {
        const xe = x(e.date), up = i % 2 === 0;
        s += '<g class="tl-ev k-' + e.kind + (e.date < today ? " past" : "") + '"><title>' + e.d + ": " + PA.esc(e.label) + "</title>";
        s += '<line x1="' + xe + '" y1="60" x2="' + xe + '" y2="' + (up ? 44 : 76) + '" class="tl-stem"/>';
        s += '<circle cx="' + xe + '" cy="' + (up ? 40 : 80) + '" r="6"/></g>';
      });
      if (today >= start && today <= end) {
        const xt = x(today);
        s += '<line x1="' + xt + '" y1="14" x2="' + xt + '" y2="106" class="tl-today"/><text x="' + Math.min(W - 60, Math.max(40, xt)) + '" y="12" text-anchor="middle" class="tl-today-t">today</text>';
      }
      s += "</svg>";
      svgWrap.innerHTML = s;
      const upcoming = EVENTS.filter((e) => e.date >= addDays(today, -0.5)).slice(0, 4);
      const days = (d) => Math.round((d - today) / 86400000);
      next.innerHTML = "";
      if (!upcoming.length) { next.append(h("div", { class: "verdict", html: "<b>The semester is over.</b> Good luck with the exam results!" })); return; }
      if (today < start) next.append(h("div", { class: "verdict", html: "<b>The semester has not started yet.</b> First lecture: " + EVENTS[0].d + "." }));
      const t = h("table", { class: "dt" });
      t.innerHTML = "<thead><tr><th>Date</th><th>What</th><th class=\"num\">In</th></tr></thead>";
      const tb = h("tbody");
      upcoming.forEach((e) => {
        const n = days(e.date);
        tb.append(h("tr", { class: e.kind === "due" ? "bad" : "" }, [h("td", { class: "mono", text: e.d }), h("td", { text: e.label }), h("td", { class: "num", text: n <= 0 ? "today" : n === 1 ? "1 day" : n + " days" })]));
      });
      t.append(tb);
      next.append(h("div", { class: "panel-title", text: "Coming up" }), t);
    }
    mode.onchange = render;
    pick.onchange = render;
    render();
  }

  /* --- Proposal scorer --- */
  function labProposal(el) {
    const { controls, view } = PA.lab(el, {
      title: "Would this proposal be accepted?",
      hint: "Score each criterion from 1 to 4 as a grader would. The verdict applies the rule: at least 12 points and no 1s.",
    });
    const CRIT = [["Context", "What is the problem?"], ["Gap", "Why do current techniques not work?"], ["Innovation", "What is your proposed solution?"], ["Evaluation", "When have you solved the problem?"], ["Plan", "What is the plan?"], ["Presentation", "Formatted correctly and presented nicely?"]];
    const segs = CRIT.map(([name, q], i) => PA.seg(controls, { label: name + ' <span class="muted-q">' + q + "</span>", options: [[1, "1"], [2, "2"], [3, "3"], [4, "4"]], value: [3, 2, 3, 2, 2, 3][i] }));
    const stats = PA.stats(view, [{ key: "sum", label: "Total (of 24)" }, { key: "min", label: "Lowest criterion" }, { key: "res", label: "Result" }]);
    const bars = h("div", { class: "meter" });
    const verdict = h("div", { class: "verdict" });
    view.append(bars, verdict);
    function update() {
      const v = segs.map((s) => Number(s.value));
      const sum = v.reduce((a, b) => a + b, 0), min = Math.min(...v);
      const ok = sum >= 12 && min > 1;
      stats.set("sum", String(sum), sum >= 12 ? "good" : "bad");
      stats.set("min", String(min), min > 1 ? "good" : "bad");
      stats.set("res", ok ? "accepted" : "resubmit", ok ? "good" : "bad");
      bars.innerHTML = v.map((x, i) => '<div class="meter-row"><span class="m-label">' + CRIT[i][0] + '</span><div class="meter-track"><div class="meter-fill" style="width:' + (x / 4) * 100 + "%;background:" + (x === 1 ? "var(--bad)" : x === 4 ? "var(--ok)" : "var(--tech)") + '"></div></div><span class="m-val">' + x + " / 4</span></div>").join("");
      verdict.className = "verdict " + (ok ? "good" : "bad");
      const weakest = CRIT[v.indexOf(min)][0];
      verdict.innerHTML = ok
        ? "<b>Accepted.</b> " + sum + " points and no criterion at 1." + (sum < 15 ? " It passes, but the low scores (lowest: " + weakest + ") suggest the idea needs sharpening before you build it." : "")
        : "<b>Not accepted.</b> " + (min === 1 ? weakest + " scored 1, which rejects the proposal regardless of the total. " : "") + (sum < 12 ? "The total " + sum + " is below 12. " : "") + "A rejected proposal must be resubmitted, even after the deadline.";
    }
    segs.forEach((s) => (s.onchange = update));
    update();
  }

  /* --- Technical contribution calculator --- */
  function labCalculator(el) {
    const { controls, view } = PA.lab(el, {
      title: "Technical contribution calculator",
      hint: "Add the contributions your group plans, say how many units each covers (or how many points you claim), and split the points between the students. The suggested maximal grade per student updates live.",
    });
    el.classList.add("wide");
    const top = h("div", { class: "calc-top" });
    controls.append(top);
    const nStud = PA.slider(top, { label: "Students in the group", min: 3, max: 5, value: 3 });
    const add = PA.select(top, { label: "Add a contribution", options: CONTRIB.map((c) => [c[1], c[1] + " " + c[2]]), value: "ISY" });
    const btns = PA.btnRow(top);
    PA.button(btns, "Add", () => { rows.push({ code: add.value, n: BY_CODE[add.value][3].per ? 1 : BY_CODE[add.value][3].max, split: [] }); autoSplit(rows[rows.length - 1]); render(); }, "primary");
    PA.button(btns, "Load example", () => { loadExample(); render(); });
    PA.button(btns, "Clear", () => { rows = []; render(); });
    const tableWrap = h("div", { class: "table-wrap" });
    const summary = h("div", { class: "calc-summary" });
    const verdict = h("div", { class: "verdict" });
    view.append(tableWrap, summary, verdict);
    const names = ["A", "B", "C", "D", "E"];
    let rows = [];

    function autoSplit(r) {
      const p = points(r.code, r.n), k = nStud.value;
      const each = Math.floor((p / k) * 2) / 2;
      r.split = Array.from({ length: 5 }, (_, i) => (i < k ? each : 0));
      const rest = p - each * k;
      r.split[0] += rest;
    }
    function loadExample() {
      rows = [
        { code: "ISY", n: 1, split: [3, 2, 0, 0, 0] },
        { code: "ICF", n: 10, split: [5, 5, 0, 0, 0] },
        { code: "IAB", n: 2, split: [0, 2, 8, 0, 0] },
        { code: "NAN", n: 3, split: [4, 3, 3, 0, 0] },
        { code: "EST", n: 5, split: [1, 2, 2, 0, 0] },
        { code: "PWP", n: 10, split: [4, 3, 3, 0, 0] },
        { code: "PDI", n: 3, split: [0, 3, 0, 0, 0] },
        { code: "TAB", n: 1, split: [0, 0, 5, 0, 0] },
      ];
      nStud.set(3);
    }
    function render() {
      const k = nStud.value;
      const t = h("table", { class: "dt calc" });
      const hr = h("tr", null, [h("th", { text: "Contribution" }), h("th", { text: "Units / claim" }), h("th", { class: "num", text: "Points" })]);
      for (let i = 0; i < k; i++) hr.append(h("th", { class: "num", text: "Student " + names[i] }));
      hr.append(h("th", { text: "" }));
      t.append(h("thead", null, [hr]));
      const tb = h("tbody");
      const totals = Array(k).fill(0), div = Array(k).fill(0);
      let anyBad = false;
      rows.forEach((r, ri) => {
        const c = BY_CODE[r.code], f = c[3];
        const p = points(r.code, r.n);
        const nIn = h("input", { type: "number", class: "text-in num-in", min: 0, step: f.per === 0.5 || !f.per ? 0.5 : 1, value: r.n, "aria-label": "Units for " + c[1] });
        nIn.addEventListener("change", () => { r.n = Math.max(0, Number(nIn.value) || 0); render(); });
        const sum = r.split.slice(0, k).reduce((a, b) => a + b, 0);
        const bad = sum > p + 1e-9;
        if (bad) anyBad = true;
        const tr = h("tr", { class: bad ? "bad" : "" }, [
          h("td", { html: "<b>" + c[1] + "</b> " + PA.esc(c[2]) + '<div class="calc-f">' + PA.esc(formulaText(f)) + ", max " + f.max + "</div>" }),
          h("td", null, [nIn, h("span", { class: "calc-unit", text: f.per ? " " + f.unit : " points" })]),
          h("td", { class: "num", html: "<b>" + p + "</b>" + (bad ? '<div class="calc-warn">split ' + sum + " &gt; " + p + "</div>" : "") }),
        ]);
        for (let i = 0; i < k; i++) {
          const v = r.split[i] || 0;
          totals[i] += v; if (v > 0) div[i]++;
          const si = h("input", { type: "number", class: "text-in num-in", min: 0, step: 0.5, value: v, "aria-label": c[1] + " points for student " + names[i] });
          si.addEventListener("change", () => { r.split[i] = Math.max(0, Number(si.value) || 0); render(); });
          tr.append(h("td", { class: "num" }, [si]));
        }
        tr.append(h("td", null, [h("button", { type: "button", class: "btn sm", text: "Remove", "aria-label": "Remove " + c[1], onclick: () => { rows.splice(ri, 1); render(); } })]));
        tb.append(tr);
      });
      if (!rows.length) tb.append(h("tr", null, [h("td", { colspan: 4 + k, html: "<em>No contributions yet. Add some, or load the example.</em>" })]));
      t.append(tb);
      tableWrap.innerHTML = "";
      tableWrap.append(t);
      summary.innerHTML = "";
      const grid = h("div", { class: "stats" });
      for (let i = 0; i < k; i++) {
        const g = grade(totals[i], div[i]);
        grid.append(h("div", { class: "stat " + (g ? (g === "12" || g === "10" ? "good" : "warn") : "bad") }, [
          h("div", { class: "stat-k", text: "Student " + names[i] }),
          h("div", { class: "stat-v", text: g ? "max " + g : "below 02" }),
          h("div", { class: "calc-sub", text: totals[i] + " pts, " + div[i] + " contributions" }),
        ]));
      }
      summary.append(grid);
      const lim = [];
      for (let i = 0; i < k; i++) {
        const g = grade(totals[i], div[i]);
        const better = GRADES.find(([gg]) => String(gg) === g);
        const idx = better ? GRADES.indexOf(better) : GRADES.length;
        if (idx > 0) {
          const [ng, np, nd] = GRADES[idx - 1];
          const needP = Math.max(0, np - totals[i]), needD = Math.max(0, nd - div[i]);
          lim.push("Student " + names[i] + " needs " + [needP ? needP + " more points" : "", needD ? needD + " more different contribution" + (needD > 1 ? "s" : "") : ""].filter(Boolean).join(" and ") + " for " + ng + ".");
        }
      }
      verdict.className = "verdict" + (anyBad ? " bad" : "");
      verdict.innerHTML = (anyBad ? "<b>Some rows hand out more points than the contribution is worth.</b> " : "") + (lim.length ? lim.join(" ") : rows.length ? "<b>Everyone is at the top of the table.</b>" : "") + " Remember: this is advisory; the exam decides.";
    }
    nStud.onchange = () => { rows.forEach(autoSplit); render(); };
    loadExample();
    render();
  }

  /* --- Passive voice spotter --- */
  function labPassive(el) {
    const { controls, view } = PA.lab(el, {
      title: "Passive voice and long-sentence spotter",
      hint: "Paste a paragraph of your paper. The tool highlights likely passive constructions (a form of \"to be\" followed by a past participle) and long sentences. It is a heuristic: read every hit and decide yourself.",
    });
    el.classList.add("wide");
    const SAMPLE = "A thorough investigation of the causes of the inaccuracies in the analysis was done, and no clear cause were found. Contained in this paper, are many truths! The results are shown in Table 2. We implemented the analysis in Python and evaluated it on all JPAMB cases, and it was observed that the performance of the abstract interpreter was significantly improved by the widening operator that was introduced in the previous section of this paper.";
    const txt = PA.textInput(controls, { label: "Your text", value: SAMPLE, rows: 9 });
    const btns = PA.btnRow(controls);
    PA.button(btns, "Use the example", () => txt.set(SAMPLE));
    PA.button(btns, "Clear", () => txt.set(""));
    const out = h("div", { class: "panel passive-out" });
    const stats = PA.stats(view, [{ key: "sent", label: "Sentences" }, { key: "pass", label: "Passive hits" }, { key: "long", label: "Sentences over 30 words" }, { key: "we", label: "Uses of \"we\"" }]);
    const verdict = h("div", { class: "verdict" });
    view.append(out, verdict);
    const IRR = "done|found|made|given|shown|seen|known|written|run|built|chosen|taken|held|kept|left|put|set|told|thought|brought|caught|taught|sent|spent|lost|meant|paid|said|sold|felt|heard|read|begun|drawn|driven|eaten|fallen|forgotten|gotten|hidden|proven|ridden|risen|spoken|stolen|thrown|worn|won";
    const RX = new RegExp("\\b(am|is|are|was|were|be|been|being)\\s+(?:\\w+ly\\s+)?(\\w+ed|" + IRR + ")\\b", "gi");
    const INV = /\b(contained|shown|found|given|presented|described|listed)\s+in\b[^.!?]*,\s*(is|are)\b/gi;
    function update() {
      const t = txt.value;
      const sentences = t.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
      let passive = 0, long = 0;
      const html = sentences.map((s) => {
        const words = s.trim().split(/\s+/).length;
        let e = PA.esc(s);
        let hits = 0;
        e = e.replace(RX, (m) => { hits++; return '<mark class="pv">' + m + "</mark>"; });
        e = e.replace(INV, (m) => { hits++; return '<mark class="pv">' + m + "</mark>"; });
        passive += hits;
        const isLong = words > 30;
        if (isLong) long++;
        return '<span class="sent' + (isLong ? " long" : "") + '" title="' + words + ' words">' + e + "</span>";
      }).join(" ");
      out.innerHTML = html || "<em>Nothing to check yet.</em>";
      const we = (t.match(/\bwe\b/gi) || []).length;
      stats.set("sent", String(sentences.length));
      stats.set("pass", String(passive), passive ? "warn" : "good");
      stats.set("long", String(long), long ? "warn" : "good");
      stats.set("we", String(we), we ? "good" : "");
      verdict.className = "verdict " + (passive || long ? "warn" : "good");
      verdict.innerHTML = passive || long
        ? "<b>Try rewriting the highlighted parts.</b> Ask \"who did this?\" and make that the subject; split long sentences so each carries one idea, old information first and new information last."
        : "<b>No obvious passive constructions or very long sentences.</b> Now read it aloud.";
    }
    txt.onchange = update;
    update();
  }

  /* --- CGIE abstract builder --- */
  function labCgie(el) {
    const { controls, view } = PA.lab(el, {
      title: "Build an abstract with CGIE",
      hint: "Write one or two sentences for each part. The preview assembles the abstract and the checklist points out common gaps.",
    });
    el.classList.add("wide");
    const EX = {
      c: "The regression test-suites of big software projects can contain thousands of tests. Running all of these tests can take multiple days, so selecting which tests to run is crucial to maintain developer productivity.",
      g: "Currently, developers manually select which tests to run after a change. This is inefficient and error-prone.",
      i: "In this paper, we use syntactic static analysis and information logged in an initial run of the test-suite to predict which tests might have changed.",
      e: "In a case study on Maven, which has 8323 tests, we correctly predicted 98% of the changed tests over the last 300 commits and saved on average 23.2 minutes of test time per commit.",
    };
    const parts = [["c", "Context", "What does the reader need to know to care?"], ["g", "Gap", "Why do current approaches not solve it?"], ["i", "Innovation", "What is your key idea? (start with \"In this paper, we ...\")"], ["e", "Evaluation", "How did you show that it works? Use numbers."]];
    const inputs = {};
    parts.forEach(([k, name, ph]) => { inputs[k] = PA.textInput(controls, { label: name, value: "", rows: 3, placeholder: ph }); });
    const btns = PA.btnRow(controls);
    PA.button(btns, "Load the course example", () => { parts.forEach(([k]) => inputs[k].set(EX[k])); });
    PA.button(btns, "Clear", () => { parts.forEach(([k]) => inputs[k].set("")); });
    const preview = h("div", { class: "panel cgie-preview" });
    const checks = h("ul", { class: "cgie-checks" });
    view.append(h("div", { class: "panel-title", text: "Abstract preview" }), preview, h("div", { class: "panel-title", text: "Checklist" }), checks);
    function update() {
      const v = {};
      parts.forEach(([k]) => (v[k] = inputs[k].value.trim()));
      preview.innerHTML = parts.map(([k, name]) => v[k] ? '<span class="cg cg-' + k + '" title="' + name + '">' + PA.esc(v[k]) + "</span>" : '<span class="cg-missing">[' + name + " missing]</span>").join(" ");
      const all = parts.map(([k]) => v[k]).filter(Boolean).join(" ");
      const words = all ? all.split(/\s+/).length : 0;
      const items = [
        [parts.every(([k]) => v[k]), "All four parts are present."],
        [/\bwe\b/i.test(v.i), "The innovation says what <em>we</em> did."],
        [/\d/.test(v.e), "The evaluation contains concrete numbers."],
        [/(however|but|currently|manual|cannot|can't|fail|inefficient|slow|expensive|limited|imprecise|error)/i.test(v.g), "The gap names a shortcoming of the current state."],
        [words >= 60 && words <= 250, "Length is between 60 and 250 words (now " + words + ")."],
      ];
      checks.innerHTML = items.map(([ok, t]) => '<li class="' + (ok ? "ok" : "no") + '">' + (ok ? "&#10003; " : "&#9675; ") + t + "</li>").join("");
    }
    parts.forEach(([k]) => { inputs[k].input.value = EX[k]; inputs[k].onchange = update; });
    update();
  }

  /* =====================================================================
     Boot
     ===================================================================== */
  function fillContribTable() {
    const tb = document.getElementById("contrib-list");
    if (!tb) return;
    let group = null;
    CONTRIB.forEach(([g, code, name, f, note]) => {
      if (g !== group) { group = g; tb.append(h("tr", { class: "contrib-group" }, [h("td", { colspan: 4, text: g })])); }
      tb.append(h("tr", null, [h("td", { class: "mono", text: code }), h("td", { html: PA.esc(name) + (note ? '<div class="calc-f">' + PA.esc(note) + "</div>" : "") }), h("td", { text: formulaText(f) }), h("td", { class: "num", text: String(f.max) })]));
    });
  }
  fillContribTable();
  const qn = Object.values(QUIZ).reduce((a, b) => a + b.length, 0);
  document.querySelectorAll("[data-qcount]").forEach((e) => (e.textContent = qn + " questions"));

  PA.boot("course-guide", { timeline: labTimeline, proposal: labProposal, calculator: labCalculator, passive: labPassive, cgie: labCgie }, QUIZ);
})();
