# PA Study

Interactive study notes for the course **02242 Program Analysis** (DTU Compute, Fall 2026).

Every concept is explained in three layers: first **in plain words** (an everyday analogy, no jargon), then **how it works** (the intuitive technical explanation with examples and code), then **formally** (all definitions, theorems and proofs, each formula read aloud in words). Along the way there are interactive labs, many of them running real JVM bytecode in the browser, and multiple-choice questions where every answer option explains why it is right or wrong. Each page ends with a cheat sheet and the lecture's exam questions with model answers.

| Week | Page | Lecture |
|------|------|---------|
| 1 | [`introduction.html`](site/introduction.html) | Introduction: Decidability |
| 2 | [`syntactic-analysis.html`](site/syntactic-analysis.html) | Syntactic Analysis |
| 3 | [`semantics.html`](site/semantics.html) | Semantics |
| 4 | [`dynamic-analysis.html`](site/dynamic-analysis.html) | Dynamic Analysis |
| 5 | [`bounded-static-analysis.html`](site/bounded-static-analysis.html) | Bounded Static Analysis |
| 6 | [`unbounded-static-analysis.html`](site/unbounded-static-analysis.html) | Unbounded Static Analysis |
| | [`course-guide.html`](site/course-guide.html) | Course guide: schedule, project, technical contributions, writing the paper |

## Running it

The site is plain HTML, CSS and JavaScript with no build step. Open `site/index.html` in a browser, or serve the `site/` folder from any static host (the included GitHub Actions workflow deploys it to GitHub Pages). All libraries are vendored, so it also works offline and from `file://`. Quiz progress is stored in the browser's `localStorage` only.

## Layout

```
site/
  index.html                  home page with one card per lecture
  <lecture>.html              one page per lecture
  course-guide.html           how the course and the project work
  assets/css/style.css        shared styles (light and dark theme, the three explanation layers)
  assets/css/<page>.css       page-specific styles, where needed
  assets/js/core.js           shared runtime: navigation, theme, quiz engine, lab helpers, math and code rendering
  assets/js/jvm.js            a tiny JVM shared by the labs: bytecode programs, a small-step interpreter that
                              names the semantic rule it applies, and the sign lattice with the notes' addition table
  assets/js/<page>.js         the page's question bank and interactive labs
  assets/vendor/katex/        KaTeX 0.16 (math rendering), MIT licence
  assets/vendor/highlight/    highlight.js 11.11 and its colour theme, as used on the course site, BSD-3-Clause
  img/<lecture>/              figures from the course notes
```

The mini JVM in `jvm.js` uses the same simplified bytecode as the course's `jvm2json` / `jpamb inspect` output (instruction indices as offsets), and its programs mirror JPAMB-style cases (`assertPositive`, `divideByN`, `arraySpellsHello`, ...). The same programs come back in the semantics, dynamic analysis and static analysis labs.

## Scope

The site is for studying the lectures. It deliberately contains no course activities or assignments and nothing that solves them beyond what the course notes already show: no sign-based abstract interpreter or sign transfer functions other than the notes' addition table, and no Python interpreter code beyond the snippets in the notes.

## Credits

### Lecture material

All lecture content this site is based on comes from the course notes of **02242 Program Analysis** at the Technical University of Denmark (DTU), DTU Compute, written by **Christian Gram Kalhauge**: the topics Introduction, Syntactic Analysis, Semantics, Dynamic Analysis, Bounded Static Analysis and Unbounded Static Analysis, the notes Trace Terminology and Project, the topic How to Write a Good Paper, and the course page itself (courses.compute.dtu.dk/02242). The JPAMB rules and scoring formulas come from the [JPAMB repository](https://github.com/kalhauge/jpamb).

The notes and their figures remain the property of their authors. This site is an unofficial study aid; it is not affiliated with or endorsed by DTU or the teachers. Where the notes contain typos or small mistakes, the site uses the corrected version and points the difference out.

### Figures

- Course notes (C. G. Kalhauge): program-based and trace-based soundness and completeness, the three phases of dynamic analysis, the levels of syntax, the Chomsky hierarchy with production rules, the Galois connection diagram, the control-flow graph of a loop.
- Robert W. Floyd, *Assigning Meanings to Programs* (1967): the annotated flowchart, as reproduced in the Semantics notes.
- Hasse diagram of the sign powerset: by KSmrq, CC BY-SA 3.0, via Wikimedia Commons, with edits from the course notes.
- xkcd 1171 "Perl Problems" by Randall Munroe, CC BY-NC 2.5, as shown in the Syntactic Analysis notes.
- "Sorted binary tree ALL RGB" (pre-, in- and post-order traversal) by Nomen4Omen, public domain, via Wikimedia Commons, as shown in the Syntactic Analysis notes.

All trademarks and product names belong to their respective owners.

### Removal requests

If you are a rights holder and would like a figure or page removed, please open an issue and it will be taken down.
