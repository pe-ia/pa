/* Week 4, Dynamic Analysis: quiz bank and interactive labs.
   All executions use the shared mini JVM (assets/js/jvm.js). */
(function () {
  "use strict";
  const h = PA.h;
  const J = PA.jvm;

  /* =====================================================================
     QUIZ BANK.  Each option: [text (HTML, $math$ allowed), isCorrect, explanation]
     ===================================================================== */
  const QUIZ = {
    what: [
      {
        q: "Which of these is a dynamic analysis?",
        options: [
          ["A linter that warns about comparing strings with <code>==</code>", false, "A linter only looks at the code's structure; it never runs the program. That is a syntactic (static) analysis."],
          ["A unit test that calls a method with an input and checks the result", true, "A test executes the program and examines what happened, which is exactly dynamic analysis. You have been doing it for years."],
          ["The Java type checker", false, "Type checking reasons about all executions without running any: a static analysis."],
          ["A colleague reading your pull request", false, "Code review is a manual analysis of the source; nothing is executed."],
        ],
      },
      {
        q: "A dynamic analysis observed the set of traces $T$. Which relation always holds?",
        options: [
          ["$\\Sem(p) \\subseteq T$", false, "That would mean we observed every run. It only holds in the rare case where the analysis is exhaustive."],
          ["$T = \\Sem(p)$", false, "Equality needs exhaustive exploration, which is impossible for most programs (often infinitely many traces)."],
          ["$T \\subseteq \\Sem(p)$", true, "Every observed run is a genuine run of the program, so $T$ is a (finite) subset of the semantics. That is why what we find is real."],
          ["$T \\cap \\Sem(p) = \\emptyset$", false, "The observed traces are real traces, so they are all in $\\Sem(p)$."],
        ],
      },
      {
        q: "Your 1000 test runs all finished without a crash. What do you know for certain?",
        options: [
          ["The program never crashes", false, "Unobserved inputs may still crash. Not seeing a behaviour proves nothing about the runs you did not make."],
          ["Those 1000 runs did not crash; other inputs may still crash", true, "Exactly the asymmetry of dynamic analysis: found means real, not found means unknown."],
          ["The program crashes for less than 0.1% of all inputs", false, "That would only follow under assumptions about how the inputs were sampled and how big the crash classes are; a single input out of $2^{32}$ can crash and your 1000 runs would almost surely miss it."],
        ],
      },
    ],

    "may-must": [
      {
        q: "What does $p \\models^{\\may} Q$ mean?",
        options: [
          ["$Q$ holds for every trace of $p$", false, "That is the must property, $p \\models^{\\must} Q$."],
          ["$Q$ holds for at least one trace of $p$", true, "May is existential: $\\exists \\tau \\in \\Sem(p).\\ Q(\\tau)$. One witness trace suffices."],
          ["Our analysis found $Q$", false, "$\\models$ is about what is actually true, not about what an analysis claims; claims are written with $\\vdash$."],
          ["$Q$ holds for the first state of $p$", false, "$Q$ is a property of whole traces, not of a single state."],
        ],
      },
      {
        q: "Which statement is equivalent to $\\neg\\big(p \\models^{\\must} \\ok\\big)$?",
        options: [
          ["$p \\models^{\\must} \\neg\\ok$", false, "That says every run fails, which is much stronger than \"not every run succeeds\"."],
          ["$\\neg\\big(p \\models^{\\may} \\ok\\big)$", false, "That says no run succeeds, again much stronger."],
          ["$p \\models^{\\may} \\ok$", false, "That is a different statement: some run succeeds. It can be true together with the negated must."],
          ["$p \\models^{\\may} \\neg\\ok$", true, "Duality: \"not all runs end in ok\" is the same as \"some run does not end in ok\" ($\\neg\\forall \\equiv \\exists\\neg$)."],
        ],
      },
      {
        q: "For <code>assertPositive(int num)</code> (<code>assert num &gt; 0</code>) and $Q$ = \"ends in an assertion error\", which is true?",
        options: [
          ["$p \\models^{\\may} Q$ is true and $p \\models^{\\must} Q$ is false", true, "Input 0 fails the assertion (so may holds), while input 1 returns normally (so must fails)."],
          ["$p \\models^{\\must} Q$ is true", false, "Input 1 ends in ok, so not every trace ends in an assertion error."],
          ["$p \\models^{\\may} Q$ is false", false, "Input 0 (or any $num \\leq 0$) ends in an assertion error."],
          ["Both are false", false, "May is true because of the input 0."],
        ],
      },
    ],

    terminology: [
      {
        q: "A fuzzer reports a crash only when it actually produced a crashing run. Which property does this give it?",
        options: [
          ["Sound for the may property \"can crash\"", true, "Its claims imply the truth: $p \\vdash^{\\may} \\mathit{crash} \\Rightarrow p \\models^{\\may} \\mathit{crash}$. No false warnings."],
          ["Complete for the may property \"can crash\"", false, "Completeness would mean it never misses a possible crash, which a fuzzer cannot promise."],
          ["Sound for the must property \"never crashes\"", false, "If it finds no crash it says nothing certain, so it does not prove the must property."],
          ["Both sound and complete", false, "For a non-trivial property of Java programs that is impossible (Rice's theorem)."],
        ],
      },
      {
        q: "A <em>complete</em> may analysis (a not-may analysis) for \"divide by zero\" reports that it found no possible division by zero. What follows?",
        options: [
          ["Nothing, it may have missed one", false, "A complete analysis never misses: if a division by zero were possible, it would have reported it."],
          ["$p \\models^{\\must} \\neg\\,\\text{divide by zero}$: no run divides by zero", true, "Duality of analyses: $\\neg(p \\vdash^{\\notmay} Q) \\Rightarrow p \\models^{\\must} \\neg Q$. Silence of a complete may analysis is a sound proof of safety."],
          ["Some run divides by zero", false, "Its silence implies the opposite."],
          ["The program terminates", false, "Division by zero says nothing about termination."],
        ],
      },
      {
        q: "Why can no always-terminating analysis be both sound and complete for \"may throw an assertion error\" on Java?",
        options: [
          ["Because Java assertions can be disabled", false, "That only changes which programs have the property, not the decidability question."],
          ["Because it would be too slow in practice", false, "The obstacle is not speed but impossibility in principle."],
          ["Because it would decide a non-trivial semantic property, contradicting Rice's theorem", true, "Sound and complete means $p \\vdash Q \\iff p \\models^{\\may} Q$; a terminating such procedure is a decider, and Rice's theorem says none exists."],
          ["Because Java is not Turing complete", false, "Java is Turing complete; that is exactly why the problem is undecidable."],
        ],
      },
      {
        q: "Which kind of analysis can be sound and still produce <em>false warnings</em> (reported bug traces that are not real)?",
        options: [
          ["A sound dynamic analysis", false, "A sound dynamic analysis only reports traces it executed, so every warning is real."],
          ["A sound static analysis", true, "A must-sound static analysis is sound about programs (when it says \"safe\", the program is safe) but may warn about traces that cannot happen. Warnings are classification over traces."],
          ["Neither can", false, "Sound static analyses routinely produce false warnings; that is the price of over-approximation."],
        ],
      },
    ],

    phases: [
      {
        q: "In the figure's order, what are the three phases of a dynamic analysis?",
        options: [
          ["Select a trace, predict its class, analyse", true, "1.1 selection ($\\tau \\in \\Select(P, \\sigma)$), 1.2 prediction ($[\\tau]_X$), 1.3 analysis ($\\TA_X([\\tau]_X) \\Rightarrow \\DA_X(P)$)."],
          ["Parse, type check, compile", false, "Those are compiler phases."],
          ["Analyse, select, abstract", false, "You cannot analyse a trace before selecting it."],
          ["Abstract the program, compute a fixpoint, report", false, "That describes a static analysis (abstract interpretation)."],
        ],
      },
      {
        q: "What happens in step 2.1 of the figure?",
        options: [
          ["The analysis stops and reports \"no bug\"", false, "Not finding anything is not a proof; the loop continues while there is budget."],
          ["A new initial state $\\sigma'$ is chosen and the process repeats", true, "If nothing was found, start again from another $\\sigma'$, ideally one whose trace falls in a class not covered yet."],
          ["The trace is shortened", false, "Nothing is shortened; a new trace is selected."],
        ],
      },
    ],

    selection: [
      {
        q: "Our JPAMB interpreter is deterministic. How many traces are in $\\Select(\\texttt{assertPositive}, \\sigma)$ for a fixed $\\sigma$?",
        options: [
          ["Exactly one", true, "Determinism gives one successor per state, so one maximal trace per initial state (Proposition 4.18)."],
          ["Two, one per branch", false, "A single run takes only one branch; the other branch needs a different input."],
          ["$2^{32}$", false, "That is the number of traces over all inputs, not from one $\\sigma$."],
          ["It depends on the scheduler", false, "There are no threads here; the run is fully determined by $\\sigma$."],
        ],
      },
      {
        q: "Why can the same multi-threaded test pass on one run and fail on the next?",
        options: [
          ["Because $\\Select(P, \\sigma)$ contains several traces and the scheduler picks one", true, "With non-determinism one initial state has many traces; which one you observe depends on the thread interleaving."],
          ["Because the inputs change between runs", false, "The test uses the same inputs; the difference is the interleaving."],
          ["Because Java threads are not deterministic in their results, ever", false, "Many concurrent programs always give the same result; flakiness appears when some interleavings lead to different outcomes."],
        ],
      },
      {
        q: "Which set equals $\\Sem(P)$?",
        options: [
          ["$\\Select(P, \\sigma)$ for the most common input $\\sigma$", false, "One start gives only the traces from that start."],
          ["$\\bigcup_{\\sigma \\in I_P} \\Select(P, \\sigma)$", true, "Every trace starts in some initial state, and every selected trace is a trace (Proposition 4.16)."],
          ["$\\bigcap_{\\sigma \\in I_P} \\Select(P, \\sigma)$", false, "Different starts give disjoint sets of traces, so the intersection is usually empty."],
          ["$I_P$", false, "$I_P$ is a set of states, not traces."],
        ],
      },
    ],

    "trace-analysis": [
      {
        q: "$\\TA_{\\mathtt{cover}(4)}(\\tau)$ is true exactly when...",
        options: [
          ["the trace has at least 4 states", false, "Coverage is about which instruction is executed, not about length."],
          ["some state of $\\tau$ has program counter 4", true, "$4 \\in \\{e.\\iota \\mid e \\in \\tau\\}$: instruction 4 was executed at least once."],
          ["the 4th state of $\\tau$ is ok", false, "That mixes up positions and program counters."],
          ["every state has program counter 4", false, "Coverage needs only one occurrence."],
        ],
      },
      {
        q: "Events of a run: <code>open(a) open(b) close(a) work</code>. Is $\\TA_{\\mathtt{res}}$ true?",
        options: [
          ["No, because <code>a</code> was closed", false, "One resource being closed is not enough; the property asks whether <em>some</em> resource leaks."],
          ["Yes: <code>b</code> is opened and never closed afterwards", true, "There exist $f = b$ and $i$ with $\\mathbf{O}(\\tau_i, b)$ and no $\\mathbf{C}(\\tau_j, b)$ for $j \\geq i$."],
          ["It cannot be decided from one trace", false, "It is a property of a single (finite) trace; just read it."],
        ],
      },
      {
        q: "<code>countdown(-1)</code> loops forever. What is $\\TA_{\\ok}$ of its (infinite) trace?",
        options: [
          ["True, because it never crashes", false, "$\\TA_{\\ok}$ asks whether the last state is ok, not whether it crashed."],
          ["False: an infinite trace has no last state, so it never ends in ok", true, "$\\tau_{-1}$ does not exist; in LTL terms, $\\Diamond\\,\\ok$ never becomes true. In practice we only see a prefix and report <code>*</code>."],
          ["Undefined, so the analysis must crash", false, "The predicate is simply false; an interpreter reports a timeout."],
        ],
      },
    ],

    "not-must": [
      {
        q: "10,000 random inputs all ended in <code>ok</code>. What does this establish?",
        options: [
          ["$p \\models^{\\must} \\ok$", false, "Passing tests is complete for must but not sound: unobserved inputs may still fail."],
          ["$p \\models^{\\may} \\ok$, and nothing about the other inputs", true, "We have real witnesses that ok is possible; whether something else is also possible stays open."],
          ["$p \\models^{\\must} \\neg\\ok$", false, "We observed ok, which refutes this."],
          ["That $\\neg\\ok$ is impossible", false, "That would be a must claim, which observations cannot prove."],
        ],
      },
      {
        q: "One run ended in <code>divide by zero</code>. Which statement is now proven?",
        options: [
          ["The program always divides by zero", false, "One run says nothing about the others."],
          ["The program does not always succeed: $\\neg(p \\models^{\\must} \\ok)$", true, "A single counterexample refutes the must property; equivalently $p \\models^{\\may} \\neg\\ok$."],
          ["Nothing, dynamic analyses are unsound", false, "Dynamic analyses are sound for may properties: what they find is real."],
        ],
      },
      {
        q: "When is the check \"$X$ held on every observed run\" exactly equal to $p \\models^{\\must} X$?",
        options: [
          ["When we ran at least 1000 inputs", false, "No fixed number is enough in general."],
          ["When the observed traces include every trace, e.g. a deterministic method without inputs", true, "In the limit (Proposition 4.24) the dynamic analysis is exact; for a method with one initial state, one run is the limit."],
          ["Never", false, "It is exact when all traces are observed."],
          ["When the program has no loops", false, "Loop-free programs can still have $2^{32}$ inputs."],
        ],
      },
    ],

    story: [
      {
        q: "In the memory sanitizer story, what were the warnings about the initial allocation?",
        options: [
          ["Bugs in the sanitizer", false, "The sanitizer was right: the memory really was never freed."],
          ["Real traces violating the checked property, but not violating the company's convention", true, "Sound with respect to \"every allocation is freed\", irrelevant with respect to what the team considers a bug."],
          ["Unreal traces produced by the fuzzer", false, "Every warning came with a real trace."],
        ],
      },
      {
        q: "What is the lesson of the story?",
        options: [
          ["Never use sanitizers on embedded code", false, "Sanitizers are very useful; they need the right property."],
          ["No analysis is fire-and-forget: the checked property must match the code's conventions", true, "Soundness is relative to the formal property; usefulness needs that property to match the developers' specification."],
          ["Fuzzing cannot find memory leaks", false, "It found them; they just were not considered bugs."],
        ],
      },
    ],

    prediction: [
      {
        q: "Why is trace prediction especially valuable for concurrent programs?",
        options: [
          ["Because concurrent programs have fewer traces", false, "They typically have far more traces, one per interleaving."],
          ["Because races and deadlocks depend on rare interleavings, and prediction can infer them from one observed run", true, "From one schedule we can reason about feasible reorderings in the same class and report a race the run did not hit (sound deadlock prediction)."],
          ["Because threads make programs deterministic", false, "Threads are a main source of non-determinism."],
        ],
      },
      {
        q: "A prediction on trace classes is <em>sound</em> when...",
        options: [
          ["it predicts something for every class", false, "Coverage of classes is a different question."],
          ["whatever it claims about a class is witnessed by some real trace in that class", true, "$\\TA_X([\\tau]) \\Rightarrow \\exists \\tau' \\in [\\tau].\\ \\TA_X(\\tau')$: predicted behaviour really exists."],
          ["every class contains exactly one trace", false, "Then prediction would be pointless; classes are useful because they are big."],
        ],
      },
    ],

    paths: [
      {
        q: "How many path-equivalence classes does <code>checkTheWrongThing(int a)</code> have?",
        options: [
          ["$2^{32}$, one per input", false, "That is the number of traces; many traces share a path."],
          ["2", true, "Every $a \\neq 0$ follows 0 1 2 3 4 into divide by zero; $a = 0$ follows 0 1 6 7 to ok."],
          ["1", false, "The branch on <code>a != 0</code> splits the runs into two paths."],
          ["3", false, "There is only one branch, giving two paths."],
        ],
      },
      {
        q: "Are the runs of <code>divideByN</code> with $n = 1$ and $n = 0$ path-equivalent?",
        options: [
          ["Yes, there is no branch in the method", false, "The path also records where the run stops."],
          ["No: the $n = 0$ run stops with an error at the division, so its sequence of program counters is shorter", true, "Path-equivalence compares the program counter at every step; the error run has no state after the division."],
          ["Only if the results are equal", false, "Paths ignore values; they only look at program counters."],
        ],
      },
      {
        q: "Restricted to inputs $n \\geq 0$, how many path classes does <code>countdown(n)</code> (<code>while (n != 0) n--;</code>) have?",
        options: [
          ["2: loop or no loop", false, "Different numbers of iterations give different sequences of program counters."],
          ["One per value of $n$", true, "With $n$ iterations the path is 0 1, then $n$ times 2 3 0 1, then 4. Loops make the number of paths unbounded."],
          ["1", false, "Only if the loop never ran."],
        ],
      },
    ],

    coverage: [
      {
        q: "Why does one trace per path class give the full instruction coverage of that class?",
        options: [
          ["Because all traces in the class visit the same program counters", true, "Proposition 4.32: $\\#_\\iota([\\tau]_\\pi) = \\#_\\iota(\\{\\tau\\})$."],
          ["Because coverage only counts the first instruction", false, "Coverage counts every program counter visited."],
          ["Because the class contains only one trace", false, "Classes can be huge; they just share the path."],
        ],
      },
      {
        q: "An instruction is never covered after a million random runs. What can you conclude?",
        options: [
          ["It is dead code", false, "Maybe, but its class might just be tiny (one input out of $2^{32}$)."],
          ["Either no run hit the class that reaches it yet, or it is dead code", true, "Coverage alone cannot tell the two apart (Corollary 4.33)."],
          ["The program has a bug there", false, "Uncovered code says nothing about whether it is buggy."],
        ],
      },
      {
        q: "<code>return 100 / (x - 7);</code> is fully covered by the single input $x = 1$. Did we test it well?",
        options: [
          ["Yes, 100% coverage means no bugs remain", false, "Coverage does not look at values."],
          ["No: $x = 7$ divides by zero, a value-dependent bug that full instruction coverage missed", true, "Full coverage is necessary for confidence, not sufficient."],
          ["No, because coverage is only 50%", false, "Every instruction was executed with $x = 1$."],
        ],
      },
    ],

    "trace-abstraction": [
      {
        q: "To compute $\\TA_{\\mathtt{cover}(i)}$, what is the least you need to record per step?",
        options: [
          ["The full heap", false, "Coverage does not depend on the heap."],
          ["The program counter", true, "$h_{\\mathtt{cover}}(s) = s.\\iota$ is enough: check whether $i$ occurs."],
          ["The operand stack", false, "The stack contents are irrelevant for coverage."],
          ["Nothing, coverage can be computed without running", false, "Instruction coverage is a property of the observed runs."],
        ],
      },
      {
        q: "What is runtime verification (runtime monitoring)?",
        options: [
          ["Checking the program's types before running it", false, "That is static type checking."],
          ["Checking a property while the program runs, possibly reacting to violations", true, "It sits at the online end of the spectrum: the trace analysis happens during execution."],
          ["Replaying a crash from a core dump", false, "That is post-mortem analysis, the other end of the spectrum."],
        ],
      },
    ],

    "run-or-not": [
      {
        q: "Which is a genuine <em>advantage</em> of running the program?",
        options: [
          ["It proves that the program terminates", false, "Running can never prove termination for all inputs, nor show that something cannot happen."],
          ["It produces a concrete trace that reproduces the error", true, "A witness input and trace make the bug real and easy to debug."],
          ["It needs no environment at all", false, "Setting up the environment is one of the main difficulties."],
        ],
      },
      {
        q: "An interpreter stops <code>countdown(5000)</code> after 2000 steps and reports <code>*</code>. What has been proven?",
        options: [
          ["That <code>countdown</code> loops forever on 5000", false, "It would stop after about 20,000 steps; the budget was just too small."],
          ["Nothing definite: a run that stops later looks identical to one that never stops", true, "Non-termination is not observable in finite time (Proposition 4.37)."],
          ["That the program is buggy", false, "Slowness is not a bug here."],
        ],
      },
      {
        q: "Why are side effects a problem for dynamic analysis?",
        options: [
          ["Because the analysis cannot observe them", false, "It can; the problem is that they actually happen."],
          ["Because warning that something bad can happen by doing it may cause real damage", true, "Running a program that deletes the database or fires the missiles to see whether it does so is a bad idea; you need sandboxes or mocks."],
          ["Because side effects make programs non-deterministic", false, "Not necessarily; the danger is the effect itself."],
        ],
      },
    ],

    testing: [
      {
        q: "<code>assertFalse()</code> takes no arguments and an interpreter run ends in <code>assertion error</code>. Which predictions are justified?",
        options: [
          ["<code>assertion error;yes</code> and <code>no</code> for every other outcome", true, "One initial state and a deterministic machine: the one run is all of $\\Sem(p)$ (Proposition 4.39)."],
          ["<code>assertion error;yes</code> and <code>maybe</code> for the others", false, "Correct but timid: with no inputs there are no other runs that could do something else."],
          ["<code>assertion error;maybe</code>", false, "We observed it, so it certainly can happen."],
        ],
      },
      {
        q: "For <code>assertPositive</code> your single run with <code>num = 1</code> ended in ok. What should you predict for <code>assertion error</code>?",
        options: [
          ["<code>no</code>, because the run succeeded", false, "Other inputs (any $num \\leq 0$) fail the assertion."],
          ["<code>maybe</code> (not found)", true, "The method has inputs, so one run cannot rule anything out."],
          ["<code>yes</code>", false, "We have not observed it; saying yes would be a guess."],
        ],
      },
      {
        q: "What is a test, formally?",
        options: [
          ["An initial state plus an oracle that judges the resulting traces", true, "$(\\sigma, O)$: run from $\\sigma$ and check $O$ on the selected traces; the default oracle is $\\TA_{\\ok}$."],
          ["A proof that the program is correct", false, "A test checks one run, not all of them."],
          ["A set of all traces of the program", false, "That is the semantics."],
        ],
      },
    ],

    snapshot: [
      {
        q: "What does a characterization (snapshot) test check?",
        options: [
          ["That the program's output is correct", false, "It never states what is correct; it compares with what was recorded."],
          ["That the behaviour has not changed since the snapshot was recorded", true, "It documents what the code does, which is perfect for catching regressions."],
          ["That all branches are covered", false, "That is coverage, a separate measure."],
        ],
      },
      {
        q: "The snapshot stores only the final outcome. A mutant changes the path taken but still ends in ok on every recorded input. Is the change detected?",
        options: [
          ["Yes, any change is detected", false, "Only changes visible through the recorded abstraction are detected."],
          ["No: outcome-only snapshots cannot see changes in the path", true, "Finer snapshots catch more regressions (Proposition 4.41), at the price of being brittle."],
          ["Only if the mutant is slower", false, "Timing is not part of the snapshot."],
        ],
      },
      {
        q: "When is snapshot testing <em>least</em> useful?",
        options: [
          ["Before refactoring legacy code nobody understands", false, "That is its best use case."],
          ["For finding bugs that were already present when the snapshot was taken", true, "The snapshot freezes the buggy behaviour as the reference."],
          ["When outputs are hard to check by hand", false, "That is exactly where golden masters shine."],
        ],
      },
    ],

    assertions: [
      {
        q: "In Tiger Style, what is the \"negative space\" of a function?",
        options: [
          ["The code that is never executed", false, "That is dead code."],
          ["What you do <em>not</em> expect to happen, which you also assert against", true, "Assertions check both positive space (what you expect) and negative space (what must never happen)."],
          ["Negative numbers in the input", false, "It is a general idea, not about the sign of numbers."],
        ],
      },
      {
        q: "Why do Java programs rely less on sanitizers than C programs?",
        options: [
          ["Java programs have no bugs", false, "They have plenty."],
          ["The JVM already checks array bounds, null references and division by zero at runtime", true, "These automatic checks act like inserted assertions, and they are exactly JPAMB's outcomes."],
          ["Java cannot be fuzzed", false, "It can, e.g. with Jazzer."],
        ],
      },
      {
        q: "In our JVM semantics, why does <code>get</code> of <code>$assertionsDisabled</code> push 0?",
        options: [
          ["Because the field does not exist", false, "javac generates it to support <code>-ea</code> / <code>-da</code>."],
          ["Because we treat assertions as enabled, so the check runs", true, "0 is false: assertions are not disabled, the <code>ifz ne</code> falls through to the actual test."],
          ["Because every static field is 0", false, "It is a deliberate simplification for this one field."],
        ],
      },
    ],

    fuzzing: [
      {
        q: "Which phase of dynamic analysis does fuzzing mostly improve?",
        options: [
          ["Trace selection", true, "Fuzzing automatically generates inputs, i.e. it chooses which traces to run."],
          ["Trace abstraction", false, "Fuzzers use simple abstractions (coverage); their main job is choosing inputs."],
          ["Writing the specification", false, "The oracle is usually just crash or assertion failure."],
        ],
      },
      {
        q: "Which kind of fuzzer uses feedback from earlier runs to choose the next input?",
        options: [
          ["A purely random fuzzer", false, "It ignores what happened in earlier runs (black-box)."],
          ["A coverage-guided fuzzer", true, "It keeps inputs that reach new code and mutates them further (grey-box)."],
          ["A small-scope enumerator", false, "It follows a fixed enumeration order."],
        ],
      },
    ],

    random: [
      {
        q: "What is the probability that a uniformly random <code>int</code> satisfies <code>i == 1000000</code>?",
        options: [
          ["$1/1000000$", false, "The range of int is much larger than a million."],
          ["$2^{-32}$", true, "One value out of $2^{32}$ possible ints."],
          ["$1/2$", false, "That would be a branch like <code>i &gt; 0</code>."],
          ["$2^{-31}$", false, "There are $2^{32}$ ints, half negative and half non-negative."],
        ],
      },
      {
        q: "A path class has hit probability $p = 1/4$. How many random tries do you expect until the first hit?",
        options: [
          ["1", false, "That would need $p = 1$."],
          ["4", true, "Geometric distribution: $\\mathbb{E}[\\text{tries}] = 1/p = 4$."],
          ["16", false, "That is $1/p^2$."],
          ["2", false, "That would be $p = 1/2$."],
        ],
      },
      {
        q: "Why does random testing work well on <code>split(int i)</code> (<code>if (i &gt; 0) ... else ...</code>)?",
        options: [
          ["Because the method has no bugs", false, "The question is about exploring paths."],
          ["Because both path classes cover about half of all inputs, so the input space matches the path space", true, "Each try hits each class with probability about 1/2."],
          ["Because random numbers are always positive", false, "Random ints are positive and negative with about equal probability."],
        ],
      },
    ],

    dictionary: [
      {
        q: "What does the dictionary of <code>isNotAMillion</code> (<code>assert i != 1000000</code>) contain?",
        options: [
          ["All ints", false, "A dictionary is a small set of interesting values."],
          ["The constant 1000000 found in the code (optionally with 999999 and 1000001)", true, "A syntactic scan of the bytecode finds <code>push:I 1000000</code>."],
          ["The values 0, 1 and -1", false, "Those are small-scope values, not constants from this code."],
        ],
      },
      {
        q: "Why is the dictionary approach called a <em>hybrid</em> analysis?",
        options: [
          ["Because it runs on two machines", false, "Hybrid refers to combining kinds of analysis."],
          ["Because a syntactic analysis (finding constants) feeds a dynamic analysis (running inputs)", true, "Static or syntactic information guides the dynamic trace selection."],
          ["Because it uses both ints and strings", false, "The data type does not matter."],
        ],
      },
      {
        q: "Which bug still defeats a dictionary fuzzer?",
        options: [
          ["<code>if (x == 42) crash();</code>", false, "42 is in the code, so it is in the dictionary."],
          ["<code>if (x * 7 == 1001) crash();</code>", true, "The needed input is 143, which appears nowhere in the code; the dictionary only contains 7 and 1001."],
          ["<code>if (x &lt; 0) crash();</code>", false, "Random inputs hit this half of the time anyway."],
        ],
      },
    ],

    "coverage-guided": [
      {
        q: "When does a coverage-guided fuzzer add a mutated input to its corpus?",
        options: [
          ["When it crashes", false, "Crashes are reported, but the corpus criterion is new coverage."],
          ["When it executes at least one instruction that no earlier input executed", true, "$\\mathit{cov}(b') \\not\\subseteq K$: it taught us something new about the program."],
          ["Always", false, "Then the corpus would grow without bound and lose its focus."],
          ["When it is shorter than its parent", false, "Length is not the criterion."],
        ],
      },
      {
        q: "Why does coverage guidance find \"hello\" when random testing does not?",
        options: [
          ["Because it tries all strings in order", false, "That would take $256^5$ tries too."],
          ["Because each correct character reaches new instructions, so progress is kept and built upon", true, "The search splits into five small searches (about 256 tries each) instead of one huge one."],
          ["Because it reads the string \"hello\" from the code", false, "That would be a dictionary; coverage guidance needs no constants."],
        ],
      },
      {
        q: "On which program does instruction-coverage guidance give <em>no</em> help?",
        options: [
          ["<code>isNotAMillion</code>: a single comparison with no partial progress", true, "Either the input equals 1000000 or it does not; there is no intermediate new coverage to reward. (Real fuzzers split such comparisons into byte-wise checks to recover a gradient.)"],
          ["<code>arraySpellsHello</code>", false, "That is its showcase."],
          ["A parser with many nested checks", false, "Nested checks are exactly where coverage guidance shines."],
        ],
      },
    ],

    pbt: [
      {
        q: "Why do random inputs go together with property-based oracles?",
        options: [
          ["Because random inputs are always valid", false, "Validity is a generator concern."],
          ["Because nobody can write the expected output for each generated input, so we check properties every output must satisfy", true, "Instead of <code>f(x) == expected</code> we test e.g. <code>my_sort(x) == sorted(x)</code> for every generated <code>x</code>."],
          ["Because properties are faster to compute", false, "Speed is not the point."],
        ],
      },
      {
        q: "What does shrinking produce?",
        options: [
          ["A smaller input that still makes the property fail", true, "It simplifies the counterexample step by step until no simpler candidate fails."],
          ["A smaller program", false, "That would be program reduction, a different technique."],
          ["A passing input", false, "The point is to keep the failure."],
        ],
      },
      {
        q: "A buggy sort drops duplicates. Which property alone does <em>not</em> catch it?",
        options: [
          ["\"The output has the same length as the input\"", false, "Dropping duplicates shortens the list, so this property fails on <code>[0, 0]</code>."],
          ["\"The output is ordered\"", true, "The deduplicated list is still in order, so this property always passes. Good properties compare with the input, not just inspect the output."],
          ["\"The output equals <code>sorted(input)</code>\"", false, "It differs on any list with duplicates."],
        ],
      },
    ],

    "small-scope": [
      {
        q: "How many values does <code>gen_int(3)</code> yield?",
        options: [
          ["3", false, "It yields 0 and both signs."],
          ["6", false, "Do not forget the 0."],
          ["7", true, "0, 1, -1, 2, -2, 3, -3: that is $2 \\cdot 3 + 1$."],
          ["8", false, "There are $2d + 1 = 7$ values at depth 3."],
        ],
      },
      {
        q: "A method has 3 int parameters. How many inputs are there at depth 2?",
        options: [
          ["$5^3 = 125$", true, "$(2d+1)^k = 5^3$."],
          ["$3 \\cdot 5 = 15$", false, "All combinations are needed, not one parameter at a time."],
          ["$2^3 = 8$", false, "Each parameter has 5 values at depth 2."],
        ],
      },
      {
        q: "Which bug favours random sampling over small-scope enumeration?",
        options: [
          ["<code>if (x == 0) crash();</code>", false, "Small-scope finds this at depth 0."],
          ["<code>if (x &gt; 1000) crash();</code>", true, "Half of all random ints trigger it, but enumeration needs depth 1001."],
          ["<code>if (list.isEmpty()) crash();</code>", false, "The empty list is the very first small input."],
        ],
      },
    ],

    showdown: [
      {
        q: "Which strategy finds the bug in <code>isNotAMillion</code> quickly?",
        options: [
          ["Random inputs", false, "Probability $2^{-32}$ per try."],
          ["Small-scope enumeration", false, "Needs depth one million."],
          ["A dictionary of constants from the code", true, "1000000 is right there in the bytecode."],
          ["Coverage guidance", false, "There is no partial progress to reward."],
        ],
      },
      {
        q: "Why do practical fuzzers mix several strategies?",
        options: [
          ["Because a mixture is never much worse than any of its components on any bug", true, "$\\mu_{\\mathit{mix}}(C) \\geq w_j \\mu_j(C)$ (Proposition 4.58): with four equal parts you lose at most a factor four against the best."],
          ["Because mixing makes every strategy faster", false, "Each part gets a share of the budget; the gain is robustness."],
          ["Because one strategy alone is unsound", false, "All of them are sound for what they find."],
        ],
      },
    ],

    predictions: [
      {
        q: "Your fuzzer found a <code>divide by zero</code>. Which prediction category should you use?",
        options: [
          ["<code>yes</code>, because the observed trace is real", true, "Observed outcomes (other than timeouts) are sound may facts."],
          ["<code>maybe</code>, to be careful", false, "There is no uncertainty left; a confident category earns more points."],
          ["<code>no</code>", false, "You saw it happen."],
        ],
      },
      {
        q: "With JPAMB's scoring, how many points does a <em>correct</em> prediction with wager 1 earn?",
        options: [
          ["1", false, "That is the limit for an infinite wager."],
          ["0.5", true, "$1 - \\frac{1}{|w|+1} = 1 - \\frac12 = 0.5$."],
          ["-1", false, "That is what a wrong prediction with wager 1 costs."],
          ["2", false, "A single prediction never earns more than 1."],
        ],
      },
      {
        q: "Why put timeout-based <code>*</code> predictions in their own category?",
        options: [
          ["Because JPAMB requires it", false, "You can use any letters; it is a strategy choice."],
          ["Because they are guesses (a long run may still terminate), and a separate category lets JPAMB calibrate their percentage without dragging down the sure <code>yes</code> answers", true, "If they shared the <code>yes</code> category, its frequency would drop below 1 and every sure prediction would get a smaller wager."],
          ["Because <code>*</code> never happens", false, "Infinite loops are real outcomes in JPAMB."],
        ],
      },
    ],
  };

  /* Spread the correct answers over the option positions (deterministic, so saved progress stays valid). */
  (function spreadAnswers() {
    const count = {};
    Object.values(QUIZ).forEach((qs) => qs.forEach((q) => {
      const len = q.options.length, c = q.options.findIndex((o) => o[1]);
      count[len] = (count[len] || 0) + 1;
      const target = (count[len] * (len === 4 ? 3 : 2) + 1) % len;
      const rest = q.options.filter((o, i) => i !== c);
      rest.splice(target, 0, q.options[c]);
      q.options = rest;
    }));
  })();

  /* =====================================================================
     Shared helpers
     ===================================================================== */
  const INT_MIN = -2147483648, INT_MAX = 2147483647, TWO32 = 4294967296;
  const fmtN = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : n > 0 ? "∞" : "-∞");
  function fmtP(p) {
    if (p === 0) return "0";
    if (p === 1) return "100%";
    if (p > 0.999) return "≈ 100%";
    if (p >= 0.001) return +(p * 100).toFixed(p >= 0.1 ? 1 : 3) + "%";
    return p.toExponential(2);
  }
  const fmtTries = (p) => (p > 0 ? fmtN(1 / p) : "never");
  const randInt = (rng) => (Math.floor(rng() * TWO32) + INT_MIN) | 0;
  const pillCls = (o) => (o === "ok" ? "ok" : o === "*" ? "maybe" : "err");
  const pill = (o, extra) => '<span class="pill ' + pillCls(o) + '">' + PA.esc(o) + (extra != null ? " " + extra : "") + "</span>";
  const truthOf = (prog) => new Set(prog.cases.map((c) => c[1]));
  const exec = (prog, args, max) => J.run(prog, args, { maxSteps: max || 1000 });
  function constantsOf(prog) {
    const s = new Set();
    prog.code.forEach((i) => { if (i.op === "push") s.add(i.value); });
    return [...s];
  }
  function fmtArg(p, a) {
    if (p.type === "boolean") return String(!!a);
    if (p.type === "char[]") {
      const codes = typeof a === "string" ? a.split("").map((c) => c.charCodeAt(0)) : a || [];
      return "[C: " + codes.map((c) => (c >= 32 && c < 127 ? "'" + String.fromCharCode(c) + "'" : "\\x" + c.toString(16).padStart(2, "0"))).join(",") + "]";
    }
    return String(a);
  }
  const fmtArgs = (prog, args) => "(" + prog.params.map((p, i) => fmtArg(p, args[i])).join(", ") + ")";
  function shortPath(path, max) {
    max = max || 14;
    return path.length <= max ? path.join(" ") : path.slice(0, max).join(" ") + " … (" + path.length + " steps)";
  }
  const progOpts = (ids) => ids.map((id) => [id, id + " " + J.get(id).desc]);
  function setVerdict(el, tone, html) { el.className = "verdict" + (tone ? " " + tone : ""); el.innerHTML = html; }
  const texEl = (src) => h("span", { html: PA.tex(src) });
  const sleep0 = () => new Promise((r) => setTimeout(r, 0));

  /* Exact path classes of a one-int method, by splitting the int range at the constants in the code.
     Valid for the loop-free programs used here, whose branches compare the input with constants. */
  const classCache = new Map();
  function intClasses(prog) {
    if (classCache.has(prog.id)) return classCache.get(prog.id);
    const pts = new Set([INT_MIN, INT_MAX]);
    [0].concat(constantsOf(prog)).forEach((c) => [c - 1, c, c + 1].forEach((v) => { if (v >= INT_MIN && v <= INT_MAX) pts.add(v); }));
    const sorted = [...pts].sort((a, b) => a - b);
    const segs = [];
    sorted.forEach((v, i) => {
      segs.push({ lo: v, hi: v, rep: v });
      const nx = sorted[i + 1];
      if (nx != null && nx - v > 1) segs.push({ lo: v + 1, hi: nx - 1, rep: Math.floor((v + 1 + nx - 1) / 2) });
    });
    const map = new Map();
    segs.forEach((s) => {
      const r = exec(prog, [s.rep], 3000);
      const key = r.path.join(",") + "|" + r.outcome;
      let c = map.get(key);
      if (!c) { c = { key, path: r.path, outcome: r.outcome, size: 0, rep: s.rep, idx: map.size }; map.set(key, c); }
      c.size += s.hi - s.lo + 1;
    });
    const res = [...map.values()];
    classCache.set(prog.id, res);
    return res;
  }
  const keyOf = (r) => r.path.join(",") + "|" + r.outcome;

  /* =====================================================================
     LAB: may or must over a tiny world of inputs
     ===================================================================== */
  function labMustMay(el) {
    const { controls, view } = PA.lab(el, {
      title: "May or must? Check every trace of a tiny world",
      hint: "To make $\\Sem(p)$ small enough to list, pretend the only inputs are the ones shown. Pick a program and a property $Q$; every input is run and the may and must statements are evaluated over all of these traces.",
    });
    const ids = ["assertPositive", "checkBeforeDivideByN", "checkTheWrongThing", "divideAfterCheck", "countdown", "assertBoolean"];
    const sel = PA.select(controls, { label: "Program", options: progOpts(ids), value: "assertPositive" });
    const prop = PA.select(controls, {
      label: "Property $Q(\\tau)$",
      options: [["ok", "ends in ok"], ["err", "ends in an error"], ["star", "does not terminate (*)"], ["cover", "visits instruction k"]],
      value: "err",
    });
    const k = PA.slider(controls, { label: "Instruction k", min: 0, max: 8, value: 4 });
    const code = h("div");
    const table = h("table", { class: "dt" });
    const stats = PA.stats(view, [
      { key: "may", label: PA.tex("p \\models^{\\may} Q") },
      { key: "must", label: PA.tex("p \\models^{\\must} Q") },
      { key: "mustn", label: PA.tex("p \\models^{\\must} \\neg Q") },
      { key: "nmay", label: PA.tex("\\neg(p \\models^{\\may} Q)") },
    ]);
    view.prepend(code, h("div", { class: "scroll-x" }, [table]));
    const verdict = h("div", { class: "verdict" });
    view.append(verdict);

    function update() {
      const prog = J.get(sel.value);
      k.input.max = prog.code.length - 1;
      if (k.value > prog.code.length - 1) k.set(prog.code.length - 1);
      k.wrap.style.display = prop.value === "cover" ? "" : "none";
      code.innerHTML = "";
      code.append(PA.codeBlock(prog.java, "java"));
      const inputs = prog.params.length === 0 ? [[]] : prog.params[0].type === "boolean" ? [[false], [true]] : [-3, -2, -1, 0, 1, 2, 3].map((v) => [v]);
      const Q = (r) => (prop.value === "ok" ? r.outcome === "ok" : prop.value === "err" ? r.outcome !== "ok" && r.outcome !== "*" : prop.value === "star" ? r.outcome === "*" : r.path.indexOf(k.value) >= 0);
      const rows = inputs.map((a) => { const r = exec(prog, a, 200); return { a, r, q: Q(r) }; });
      table.innerHTML = "<thead><tr><th>input</th><th>path (program counters)</th><th>outcome</th><th>Q(&tau;)</th></tr></thead>";
      const tb = h("tbody");
      rows.forEach(({ a, r, q }) => {
        tb.append(h("tr", { class: q ? "good" : "" , html: '<td class="mono">' + PA.esc(fmtArgs(prog, a)) + '</td><td class="mono">' + PA.esc(shortPath(r.path)) + "</td><td>" + pill(r.outcome) + '</td><td class="mono">' + (q ? '<span class="okmark">true</span>' : '<span class="badmark">false</span>') + "</td>" }));
      });
      table.append(tb);
      const may = rows.some((x) => x.q), must = rows.every((x) => x.q), mustn = rows.every((x) => !x.q);
      const show = (b) => (b ? "true" : "false");
      stats.set("may", show(may), may ? "good" : "bad");
      stats.set("must", show(must), must ? "good" : "bad");
      stats.set("mustn", show(mustn), mustn ? "good" : "bad");
      stats.set("nmay", show(!may), !may ? "good" : "bad");
      const nq = rows.filter((x) => x.q).length;
      setVerdict(verdict, "", "<b>" + nq + " of " + rows.length + " traces satisfy Q.</b> May needs one witness (" + (may ? "found one" : "there is none") + "); must needs all of them (" + (must ? "they all do" : "some do not") + "). Notice that the last two boxes always agree: that is the duality $\\neg(p \\models^{\\may} Q) \\equiv p \\models^{\\must} \\neg Q$." + (prog.id === "countdown" ? " (Negative inputs never reach 0, so <code>countdown</code> runs until the 200-step budget: reported as <code>*</code>.)" : ""));
      PA.math(verdict);
    }
    sel.onchange = prop.onchange = k.onchange = update;
    update();
  }

  /* =====================================================================
     LAB: trace analysis on one recorded run
     ===================================================================== */
  function labTA(el) {
    const { controls, view } = PA.lab(el, {
      title: "Ask a recorded run some questions",
      hint: "Run a program on one input, then evaluate trace analyses on the recorded trace. The verdict spells out what this single trace lets us conclude about the whole program.",
    });
    const ids = ["assertPositive", "checkBeforeDivideByN", "checkTheWrongThing", "divideByN", "sumTo", "countdown", "arraySpellsHello", "assertFalse"];
    const sel = PA.select(controls, { label: "Program", options: progOpts(ids), value: "assertPositive" });
    const inp = PA.textInput(controls, { label: "Input (JPAMB syntax)", value: "(0)" });
    const ki = PA.slider(controls, { label: "Instruction i for TA<sub>cover(i)</sub>", min: 0, max: 8, value: 3 });
    const seed = PA.slider(controls, { label: "Resource trace (seed)", min: 1, max: 40, value: 3 });

    const lst = h("div");
    const strip = h("div", { class: "trace-strip no-math" });
    const stats = PA.stats(view, [
      { key: "ok", label: "TA<sub>ok</sub>(&tau;)" },
      { key: "cov", label: "TA<sub>cover(i)</sub>(&tau;)" },
      { key: "len", label: "steps" },
    ]);
    const verdict = h("div", { class: "verdict" });
    const evPanel = h("div", { class: "panel" });
    view.prepend(h("div", { class: "split" }, [lst, h("div", { style: "display:grid;gap:8px;align-content:start" }, [h("div", { class: "panel" }, [h("div", { class: "panel-title", text: "The trace, as program counters" }), strip])])]));
    view.append(verdict, evPanel);
    let listing = null;

    function loadProg() {
      const prog = J.get(sel.value);
      inp.input.value = prog.cases[prog.cases.length > 1 ? 1 : 0][0];
      ki.input.max = prog.code.length - 1;
      ki.set(Math.min(ki.value, prog.code.length - 1));
      lst.innerHTML = "";
      listing = J.listing(prog);
      lst.append(listing.el);
      update();
    }
    function update() {
      const prog = J.get(sel.value);
      let args;
      try { args = J.parseInput(prog, inp.value); inp.bad(false); } catch (e) {
        inp.bad(true); setVerdict(verdict, "warn", "Cannot read the input: " + PA.esc(e.message) + ". Example: <code>" + PA.esc(prog.cases[0][0]) + "</code>"); return;
      }
      const r = exec(prog, args, 400);
      const i = ki.value;
      const okv = r.outcome === "ok", cov = r.path.indexOf(i) >= 0;
      listing.mark({ cov: new Set(r.path), hot: new Set([i]), err: r.outcome !== "ok" && r.outcome !== "*" ? r.path[r.path.length - 1] : null });
      strip.innerHTML = "";
      const shown = r.path.slice(0, 48);
      shown.forEach((pc, n) => {
        if (n) strip.append(h("span", { class: "arrow", text: "→" }));
        strip.append(h("span", { class: "ts" + (pc === i ? " on" : ""), text: String(pc) }));
      });
      if (r.path.length > shown.length) strip.append(h("span", { class: "arrow", text: "… +" + (r.path.length - shown.length) + " more" }));
      strip.append(h("span", { class: "arrow", text: "→" }), h("span", { class: "ts " + (okv ? "end-ok" : "end-err"), text: r.outcome }));
      stats.set("ok", okv ? "true" : "false", okv ? "good" : "bad");
      stats.set("cov", cov ? "true" : "false", cov ? "good" : "warn");
      stats.set("len", fmtN(r.steps));
      let msg = "<b>This trace " + (okv ? "ends in ok" : r.outcome === "*" ? "ran out of the 400-step budget (*)" : "ends in " + PA.esc(r.outcome)) + ".</b> ";
      if (okv) msg += "That proves $p \\models^{\\may} \\ok$ (success is possible) but says nothing about other inputs. ";
      else if (r.outcome === "*") msg += "A timeout is a guess: it proves nothing, the run might stop later. ";
      else msg += "So $\\neg\\TA_{\\ok}(\\tau)$, hence $\\neg(p \\models^{\\must} \\ok)$: the program does not always succeed. Equivalently $p \\models^{\\may} \\neg\\ok$: a real, reproducible bug. ";
      msg += cov ? "Instruction " + i + " was executed, so it is reachable." : "Instruction " + i + " was not executed by this run; another input might reach it, or it is dead code.";
      setVerdict(verdict, okv ? "good" : r.outcome === "*" ? "warn" : "bad", msg);
      PA.math(verdict);
      renderEvents();
    }
    function renderEvents() {
      const rng = PA.rng(seed.value * 7919);
      const files = ["a", "b", "c"];
      const open = new Set();
      const ev = [];
      for (let n = 0; n < 9; n++) {
        const x = rng();
        if (open.size && x < 0.42) { const f = [...open][Math.floor(rng() * open.size)]; open.delete(f); ev.push(["close", f]); }
        else if (x < 0.82 && open.size < files.length) { const free = files.filter((f) => !open.has(f)); const f = free[Math.floor(rng() * free.length)]; open.add(f); ev.push(["open", f]); }
        else ev.push(["work", ""]);
      }
      const leakAt = new Set();
      ev.forEach((e, i) => {
        if (e[0] !== "open") return;
        if (!ev.slice(i).some((e2) => e2[0] === "close" && e2[1] === e[1])) leakAt.add(i);
      });
      evPanel.innerHTML = "";
      evPanel.append(h("div", { class: "panel-title", text: "A toy event trace for TA_res (O = open, C = close)" }));
      const chips = h("div", { class: "events" });
      ev.forEach((e, i) => chips.append(h("span", { class: "ev " + (leakAt.has(i) ? "leak" : e[0] === "work" ? "" : e[0]), text: e[0] === "work" ? "work" : e[0] + "(" + e[1] + ")" })));
      evPanel.append(chips);
      const leaked = [...leakAt].map((i) => ev[i][1]);
      evPanel.append(h("p", {
        class: "tiny", style: "margin-top:8px",
        html: leakAt.size ? "<b>TA<sub>res</sub>(&tau;) = true:</b> " + leaked.map((f) => "<code>" + f + "</code>").join(", ") + " is opened at a step after which it is never closed (red). So this program may leak a resource." : "<b>TA<sub>res</sub>(&tau;) = false:</b> every opened resource is closed later in this trace. That says nothing about other runs.",
      }));
    }
    sel.onchange = loadProg;
    inp.onchange = ki.onchange = update;
    seed.onchange = renderEvents;
    loadProg();
  }

  /* =====================================================================
     LAB: path-equivalence classes on a number line
     ===================================================================== */
  function labPaths(el) {
    const { controls, view } = PA.lab(el, {
      title: "Inputs, coloured by their path class",
      hint: "Every input from -12 to 12 is run and coloured by the path it takes. The table gives each class's exact size over all 2<sup>32</sup> ints and how many random tries you would expect to need to hit it. Then sample some random inputs and compare.",
    });
    const ids = ["checkTheWrongThing", "assertPositive", "divideByN", "isNotAMillion", "divideAfterCheck", "plusOneDivide", "checkBeforeDivideByN"];
    const sel = PA.select(controls, { label: "Program (one int argument)", options: progOpts(ids), value: "checkTheWrongThing" });
    const n = PA.slider(controls, { label: "Samples per click", min: 1, max: 200, value: 20 });
    const btns = PA.btnRow(controls);
    const svgWrap = h("div", { class: "panel" });
    const table = h("table", { class: "dt" });
    const verdict = h("div", { class: "verdict" });
    view.append(svgWrap, h("div", { class: "scroll-x" }, [table]), verdict);
    const LO = -12, HI = 12;
    let classes = [], hits = new Map(), visible = [], total = 0, rng = PA.rng(11);

    function load() {
      const prog = J.get(sel.value);
      classes = intClasses(prog);
      hits = new Map(); visible = []; total = 0;
      render();
    }
    function classIdx(prog, x) {
      const r = exec(prog, [x], 3000);
      const c = classes.find((c) => c.key === keyOf(r));
      return c ? c.idx : -1;
    }
    function sample(full) {
      const prog = J.get(sel.value);
      for (let i = 0; i < n.value; i++) {
        const x = full ? randInt(rng) : LO + Math.floor(rng() * (HI - LO + 1));
        const ci = classIdx(prog, x);
        hits.set(ci, (hits.get(ci) || 0) + 1);
        total++;
        if (x >= LO && x <= HI) visible.push(x);
      }
      render();
    }
    function render() {
      const prog = J.get(sel.value);
      const W = 380, cw = (W - 20) / (HI - LO + 1);
      const cells = [];
      for (let x = LO; x <= HI; x++) {
        const ci = classIdx(prog, x);
        const X = 10 + (x - LO) * cw;
        cells.push('<rect class="nlc cls-' + (ci % 6) + '" x="' + X.toFixed(1) + '" y="26" width="' + cw.toFixed(1) + '" height="26" rx="2"><title>' + x + "</title></rect>");
        if (x % 3 === 0) cells.push('<text x="' + (X + cw / 2).toFixed(1) + '" y="66" text-anchor="middle">' + x + "</text>");
      }
      const counts = new Map();
      const dots = visible.slice(-120).map((x) => {
        const c = (counts.get(x) || 0) + 1; counts.set(x, c);
        return '<circle class="hit" cx="' + (10 + (x - LO) * cw + cw / 2).toFixed(1) + '" cy="' + (20 - Math.min(c, 4) * 4).toFixed(1) + '" r="2.2"/>';
      });
      svgWrap.innerHTML = '<div class="panel-title">inputs ' + LO + " to " + HI + " (dots: random samples that landed here)</div>" +
        '<svg class="nl" viewBox="0 0 ' + W + ' 72" role="img" aria-label="Number line of inputs coloured by path class">' + cells.join("") + dots.join("") + "</svg>";
      table.innerHTML = "<thead><tr><th>class</th><th>path</th><th>outcome</th><th>ints in class</th><th>hit probability</th><th>expected tries</th><th>sample hits</th></tr></thead>";
      const tb = h("tbody");
      classes.forEach((c) => {
        const p = c.size / TWO32;
        tb.append(h("tr", { html: '<td><span class="swatch cls-' + (c.idx % 6) + '"></span>' + (c.idx + 1) + '</td><td class="mono" style="white-space:nowrap">' + PA.esc(shortPath(c.path, 12)) + "</td><td>" + pill(c.outcome) + '</td><td class="num">' + fmtN(c.size) + '</td><td class="num">' + fmtP(p) + '</td><td class="num">' + fmtTries(p) + '</td><td class="num">' + (hits.get(c.idx) || 0) + "</td>" }));
      });
      table.append(tb);
      const smallest = classes.reduce((a, b) => (b.size < a.size ? b : a));
      setVerdict(verdict, classes.length > 1 && smallest.size < 1000 ? "warn" : "good",
        "<b>" + classes.length + " path class" + (classes.length === 1 ? "" : "es") + " for 2<sup>32</sup> inputs.</b> " +
        (classes.length > 1 ? "The smallest class has " + fmtN(smallest.size) + " input" + (smallest.size === 1 ? "" : "s") + " (e.g. " + smallest.rep + "), so blind random testing needs about " + fmtTries(smallest.size / TWO32) + " tries to see it. " : "") +
        (total ? "Your " + fmtN(total) + " samples hit " + hits.size + " of " + classes.length + " classes." : "Click a sample button to try random testing."));
    }
    PA.button(btns, "Sample (all ints)", () => sample(true), "primary");
    PA.button(btns, "Sample (-12 to 12)", () => sample(false));
    PA.button(btns, "Clear", () => { hits = new Map(); visible = []; total = 0; render(); });
    sel.onchange = load;
    load();
  }

  /* =====================================================================
     LAB: coverage of a test set
     ===================================================================== */
  function labCoverage(el) {
    const { controls, view } = PA.lab(el, {
      title: "Measure the coverage of your tests",
      hint: "Type some inputs separated by semicolons. Covered instructions are shaded green. For each uncovered instruction the lab probes many other inputs to tell an unexplored class apart from dead code.",
    });
    const ids = ["assertFalse", "assertPositive", "checkBeforeDivideByN", "divideAfterCheck", "sumTo", "collatz", "arraySpellsHello"];
    const presets = {
      assertFalse: ["()", "()"], assertPositive: ["(1)", "(1); (0)"], checkBeforeDivideByN: ["(1)", "(1); (0)"],
      divideAfterCheck: ["(5)", "(5); (0)"], sumTo: ["(0)", "(0); (3)"], collatz: ["(1)", "(1); (6)"],
      arraySpellsHello: ["([C: 'h','e','l','l','o'])", "([C: 'h','e','l','l','o']); ([C: 'x']); ([C: ])"],
    };
    const sel = PA.select(controls, { label: "Program", options: progOpts(ids), value: "assertPositive" });
    const inp = PA.textInput(controls, { label: "Inputs (separate with ;)", value: "(1)", rows: 2 });
    const btns = PA.btnRow(controls);
    const lst = h("div");
    const stats = PA.stats(view, [{ key: "cov", label: "instructions covered" }, { key: "pct", label: "coverage" }, { key: "paths", label: "distinct paths" }]);
    const runs = h("table", { class: "dt" });
    const why = h("div", { class: "panel" });
    view.prepend(h("div", { class: "split" }, [lst, h("div", { style: "display:grid;gap:8px;align-content:start" }, [h("div", { class: "scroll-x" }, [runs]), why])]));
    let listing;

    function probes(prog) {
      const p = prog.params[0];
      if (!p) return [[]];
      if (p.type === "boolean") return [[false], [true]];
      if (p.type === "char[]") return ["", "x", "h", "he", "hel", "hell", "hello", "hellx"].map((s) => [s]);
      const out = [];
      for (let v = -60; v <= 60; v++) out.push([v]);
      constantsOf(prog).forEach((c) => out.push([c]));
      return out.concat([[INT_MIN], [INT_MAX], [1000000]]);
    }
    function guardTargets(prog) {
      const s = new Set();
      prog.code.forEach((ins, i) => { if (ins.op === "get" && prog.code[i + 1] && prog.code[i + 1].op === "ifz") s.add(prog.code[i + 1].target); });
      return s;
    }
    function update() {
      const prog = J.get(sel.value);
      const parts = inp.value.split(";").map((s) => s.trim()).filter(Boolean);
      const cov = new Set(), paths = new Set();
      runs.innerHTML = "<thead><tr><th>input</th><th>outcome</th><th>steps</th></tr></thead>";
      const tb = h("tbody");
      let bad = false;
      parts.forEach((s) => {
        let args;
        try { args = J.parseInput(prog, s.startsWith("(") ? s : "(" + s + ")"); } catch (e) { bad = true; tb.append(h("tr", { class: "bad", html: '<td class="mono">' + PA.esc(s) + '</td><td colspan="2">' + PA.esc(e.message) + "</td>" })); return; }
        const r = exec(prog, args, 2000);
        r.path.forEach((pc) => cov.add(pc));
        paths.add(keyOf(r));
        tb.append(h("tr", { html: '<td class="mono">' + PA.esc(fmtArgs(prog, args)) + "</td><td>" + pill(r.outcome) + '</td><td class="num">' + fmtN(r.steps) + "</td>" }));
      });
      runs.append(tb);
      inp.bad(bad);
      listing.mark({ cov });
      const n = prog.code.length;
      stats.set("cov", cov.size + " / " + n, cov.size === n ? "good" : "warn");
      stats.set("pct", Math.round((100 * cov.size) / n) + "%", cov.size === n ? "good" : "warn");
      stats.set("paths", String(paths.size));
      const unc = [];
      for (let i = 0; i < n; i++) if (!cov.has(i)) unc.push(i);
      why.innerHTML = "";
      why.append(h("div", { class: "panel-title", text: unc.length ? "Why is it uncovered?" : "Everything covered" }));
      if (!unc.length) { why.append(h("p", { class: "tiny", text: "Every instruction ran at least once. That is good, but it does not mean every behaviour was seen (think of 100 / (x - 7))." })); return; }
      const pr = probes(prog), guards = guardTargets(prog);
      const reach = new Map();
      pr.forEach((a) => { const r = exec(prog, a, 3000); r.path.forEach((pc) => { if (!reach.has(pc)) reach.set(pc, a); }); });
      const ul = h("ul", { class: "tiny", style: "margin:0;padding-left:18px" });
      unc.forEach((i) => {
        let txt;
        if (reach.has(i)) txt = "reachable: an unexplored class, e.g. input " + fmtArgs(prog, reach.get(i));
        else if (guards.has(i)) txt = "dead in our semantics: only reached when assertions are disabled ($assertionsDisabled = true, java -da)";
        else txt = "no probe reaches it: probably dead code";
        ul.append(h("li", { class: "no-math", html: "<b>" + i + "</b> <code>" + PA.esc(J.fmtIns(prog.code[i])) + "</code>: " + PA.esc(txt) }));
      });
      why.append(ul);
    }
    function load() {
      const prog = J.get(sel.value);
      lst.innerHTML = "";
      listing = J.listing(prog);
      lst.append(listing.el);
      inp.input.value = presets[prog.id][0];
      update();
    }
    PA.button(btns, "Happy path only", () => { inp.set(presets[sel.value][0]); });
    PA.button(btns, "One input per class", () => { inp.set(presets[sel.value][1]); });
    sel.onchange = load;
    inp.onchange = update;
    load();
  }

  /* =====================================================================
     LAB: golden master / snapshot testing against mutants
     ===================================================================== */
  const MUTANTS = {
    assertPositive: [
      ["m1", "offset 3: ifz gt 8 → ifz ge 8 (assert num >= 0)", (c) => { c[3] = Object.assign({}, c[3], { condition: "ge" }); }],
      ["m2", "offset 3: ifz gt 8 → ifz ne 8 (assert num != 0)", (c) => { c[3] = Object.assign({}, c[3], { condition: "ne" }); }],
    ],
    divideAfterCheck: [
      ["m1", "offset 1: ifz le 6 → ifz lt 6 (if x >= 0)", (c) => { c[1] = Object.assign({}, c[1], { condition: "lt" }); }],
      ["m2", "offset 2: push 100 → push 10 (different result)", (c) => { c[2] = Object.assign({}, c[2], { value: 10 }); }],
    ],
    sumTo: [
      ["m1", "offset 6: if ge 13 → if gt 13 (i <= n, off by one)", (c) => { c[6] = Object.assign({}, c[6], { condition: "gt" }); }],
      ["m2", "offset 11: incr 2 by 1 → incr 2 by 2", (c) => { c[11] = Object.assign({}, c[11], { amount: 2 }); }],
    ],
    checkBeforeDivideByN: [
      ["m1", "offset 3: ifz ne 8 → ifz eq 8 (assert n == 0)", (c) => { c[3] = Object.assign({}, c[3], { condition: "eq" }); }],
      ["m2", "offset 8: push 1 → push 2 (returns 2 / n)", (c) => { c[8] = Object.assign({}, c[8], { value: 2 }); }],
    ],
  };
  function mutantOf(prog, mid) {
    if (mid === "orig") return prog;
    const id = prog.id + "__" + mid;
    if (!J.byId[id]) {
      const code = prog.code.map((i) => Object.assign({}, i));
      MUTANTS[prog.id].find((m) => m[0] === mid)[2](code);
      J.byId[id] = Object.assign({}, prog, { id, code });
    }
    return J.byId[id];
  }

  function labGolden(el) {
    const { controls, view } = PA.lab(el, {
      title: "Golden master: does a change slip through?",
      hint: "Record a snapshot of the original program on some inputs. Then pick a mutant (a small change someone might make) and run the snapshot tests. Try the three snapshot granularities: some regressions are only visible in the finer ones.",
    });
    const ids = Object.keys(MUTANTS);
    const sel = PA.select(controls, { label: "Program", options: progOpts(ids), value: "divideAfterCheck" });
    const inp = PA.textInput(controls, { label: "Inputs (separate with ;)", value: "(-2); (0); (1); (5)" });
    const gran = PA.seg(controls, { label: "Snapshot stores", options: [["out", "outcome"], ["path", "+ path"], ["full", "full states"]], value: "out" });
    const mut = PA.select(controls, { label: "Program under test", options: [["orig", "original"]], value: "orig" });
    const btns = PA.btnRow(controls);
    const table = h("table", { class: "dt" });
    const verdict = h("div", { class: "verdict" });
    view.append(h("div", { class: "scroll-x" }, [table]), verdict);
    let golden = null;

    function snap(prog, args) {
      const r = J.run(prog, args, { maxSteps: 2000, keep: true });
      const states = r.states.slice(0, -1).map((s) => s.frames.map((f) => f.pc.off + "|" + f.locals.map(J.fmtVal).join(" ") + "|" + J.fmtStack(f.stack)).join(" / "));
      return { outcome: r.outcome, path: r.path.join(" "), full: states, steps: r.steps };
    }
    function view1(s, g) {
      if (g === "out") return s.outcome;
      if (g === "path") return s.outcome + " via " + s.path;
      return s.outcome + " after " + s.full.length + " states";
    }
    function diff(a, b, g) {
      if (a.outcome !== b.outcome) return "outcome " + a.outcome + " → " + b.outcome;
      if (g !== "out" && a.path !== b.path) {
        const pa = a.path.split(" "), pb = b.path.split(" ");
        let i = 0; while (i < pa.length && pa[i] === pb[i]) i++;
        return "path differs at step " + i + " (" + (pa[i] || "end") + " vs " + (pb[i] || "end") + ")";
      }
      if (g === "full") {
        let i = 0; while (i < a.full.length && a.full[i] === b.full[i]) i++;
        if (i < a.full.length || i < b.full.length) return "state " + i + " differs: " + (a.full[i] || "end") + "  vs  " + (b.full[i] || "end");
      }
      return null;
    }
    function parseInputs(prog) {
      return inp.value.split(";").map((s) => s.trim()).filter(Boolean).map((s) => J.parseInput(prog, s.startsWith("(") ? s : "(" + s + ")"));
    }
    function loadProg() {
      const prog = J.get(sel.value);
      mut.select.innerHTML = "";
      [["orig", "original (unchanged)"]].concat(MUTANTS[prog.id].map((m) => [m[0], "mutant " + m[0] + ": " + m[1]])).forEach(([v, l]) => mut.select.append(h("option", { value: v, text: l })));
      mut.set("m1", true);
      golden = null;
      record();
    }
    function record() {
      const prog = J.get(sel.value);
      try { golden = parseInputs(prog).map((a) => ({ a, s: snap(prog, a) })); inp.bad(false); } catch (e) { inp.bad(true); golden = null; setVerdict(verdict, "warn", "Cannot read the inputs: " + PA.esc(e.message)); table.innerHTML = ""; return; }
      test();
    }
    function test() {
      const prog = J.get(sel.value);
      if (!golden) return;
      const p2 = mutantOf(prog, mut.value);
      const g = gran.value;
      table.innerHTML = "<thead><tr><th>input</th><th>golden master</th><th>program under test</th><th>result</th></tr></thead>";
      const tb = h("tbody");
      let fails = 0;
      golden.forEach(({ a, s }) => {
        const s2 = snap(p2, a);
        const d = diff(s, s2, g);
        if (d) fails++;
        tb.append(h("tr", { class: d ? "bad" : "good", html: '<td class="mono">' + PA.esc(fmtArgs(prog, a)) + '</td><td class="mono">' + PA.esc(view1(s, g)) + '</td><td class="mono">' + PA.esc(view1(s2, g)) + "</td><td>" + (d ? '<span class="badmark">FAIL</span> <span class="tiny">' + PA.esc(d) + "</span>" : '<span class="okmark">pass</span>') + "</td>" }));
      });
      table.append(tb);
      const isMut = mut.value !== "orig";
      // would a finer snapshot have caught it?
      let finer = null;
      if (isMut && !fails) {
        for (const g2 of ["path", "full"]) {
          if (g2 === g || (g === "path" && g2 === "path")) continue;
          if (g === "full") break;
          if (golden.some(({ a, s }) => diff(s, snap(p2, a), g2))) { finer = g2; break; }
        }
      }
      if (!isMut) setVerdict(verdict, "good", "<b>The unchanged program passes every snapshot test</b>, as it must. Now pick a mutant.");
      else if (fails) setVerdict(verdict, "good", "<b>Regression caught:</b> " + fails + " of " + golden.length + " snapshot tests fail. The golden master never said what is correct, only what the code did before.");
      else setVerdict(verdict, "bad", "<b>Regression missed.</b> The change is invisible at this granularity and on these inputs." + (finer ? " A snapshot that stores " + (finer === "path" ? "the path" : "the full states") + " would catch it (finer snapshots catch more, Proposition 4.41)." : " Try other inputs: the mutant behaves differently only on some of them."));
    }
    PA.button(btns, "Record golden master", record, "primary");
    PA.button(btns, "Run snapshot tests", test);
    sel.onchange = loadProg;
    gran.onchange = mut.onchange = test;
    inp.onchange = record;
    loadProg();
  }

  /* =====================================================================
     Input strategies (shared by random, dictionary, smallcheck, cgf, showdown, analysis)
     ===================================================================== */
  function randomChars(rng, alphabet) {
    const n = Math.floor(rng() * 7);
    const out = [];
    for (let i = 0; i < n; i++) out.push(alphabet ? alphabet[Math.floor(rng() * alphabet.length)] : Math.floor(rng() * 256));
    return out;
  }
  function dictOf(prog, neighbours) {
    const d = new Set();
    constantsOf(prog).forEach((c) => { d.add(c); if (neighbours) { d.add(c - 1); d.add(c + 1); } });
    return [...d].filter((v) => v >= INT_MIN && v <= INT_MAX).sort((a, b) => a - b);
  }
  function* genInt(d) { yield 0; for (let i = 0; i < d; i++) { yield i + 1; yield -(i + 1); } }
  function* genChars(d) {
    const alpha = [];
    for (let i = 0; i < d; i++) alpha.push(97 + i);
    function* rec(len) { if (len === 0) { yield []; return; } for (const rest of rec(len - 1)) for (const c of alpha) yield rest.concat([c]); }
    for (let l = 0; l <= d; l++) yield* rec(l);
  }
  function bytesToArgs(prog, b) {
    const p = prog.params[0];
    if (!p) return [];
    if (p.type === "int") { let v = 0; for (let i = 0; i < 4; i++) v |= (b[i] || 0) << (8 * i); return [v | 0]; }
    if (p.type === "boolean") return [((b[0] || 0) & 1) === 1];
    return [b.slice(0, 16)];
  }

  /* makeGen(kind, prog, rng, opts) -> { next() -> args, feedback(args, result) } */
  function makeGen(kind, prog, rng, opts) {
    opts = opts || {};
    const p = prog.params[0];
    const type = p ? p.type : "none";
    if (kind === "random") {
      return { next: () => (type === "int" ? [randInt(rng)] : type === "boolean" ? [rng() < 0.5] : type === "char[]" ? [randomChars(rng)] : []), feedback() {} };
    }
    if (kind === "dictionary") {
      const q = opts.q == null ? 0.5 : opts.q;
      const D = dictOf(prog, opts.neighbours !== false);
      const chars = D.filter((v) => v >= 32 && v < 127);
      return {
        dict: D,
        next() {
          if (type === "int") return [D.length && rng() < q ? D[Math.floor(rng() * D.length)] : randInt(rng)];
          if (type === "boolean") return [rng() < 0.5];
          if (type === "char[]") { const n = Math.floor(rng() * 7), a = []; for (let i = 0; i < n; i++) a.push(chars.length && rng() < q ? chars[Math.floor(rng() * chars.length)] : Math.floor(rng() * 256)); return [a]; }
          return [];
        },
        feedback() {},
      };
    }
    if (kind === "smallcheck") {
      let d = 0, it = null;
      const fresh = () => (type === "int" ? genInt(d) : type === "boolean" ? [false, true][Symbol.iterator]() : type === "char[]" ? genChars(d) : [[]][Symbol.iterator]());
      return {
        get depth() { return d; },
        next() {
          for (;;) {
            if (!it) it = fresh();
            const n = it.next();
            if (!n.done) return type === "none" ? [] : [n.value];
            d++; it = null;
            if (d > 2000) d = 0;
          }
        },
        feedback() {},
      };
    }
    if (kind === "cgf") {
      const alpha = opts.alphabet || null;
      const corpus = [{ bytes: [], why: "seed: empty" }];
      const K = new Set();
      let last = null, seeded = false;
      const rb = () => (alpha ? alpha[Math.floor(rng() * alpha.length)] : Math.floor(rng() * 256));
      const api = {
        corpus, K, get last() { return last; },
        next() {
          if (!seeded) { seeded = true; last = { bytes: [], parent: -1, desc: "seed: the empty byte string" }; return bytesToArgs(prog, []); }
          const pi = Math.floor(rng() * corpus.length);
          const b = corpus[pi].bytes.slice();
          const ops = b.length ? ["change", "remove", "append"] : ["append"];
          const op = ops[Math.floor(rng() * ops.length)];
          let desc;
          if (op === "append") { const v = rb(); b.push(v); desc = "append " + byteStr(v); }
          else { const i = Math.floor(rng() * b.length); if (op === "remove") { desc = "remove byte " + i; b.splice(i, 1); } else { const v = rb(); desc = "change byte " + i + " to " + byteStr(v); b[i] = v; } }
          last = { bytes: b, parent: pi, desc };
          return bytesToArgs(prog, b);
        },
        feedback(args, res) {
          const cov = [...res.coverage].filter((k) => k.startsWith(prog.id + ":")).map((k) => +k.split(":")[1]);
          const fresh = cov.filter((c) => !K.has(c));
          last.newCov = fresh.length;
          last.outcome = res.outcome;
          if (fresh.length) {
            fresh.forEach((c) => K.add(c));
            if (last.parent === -1) corpus[0].cov = cov.length;
            else corpus.push({ bytes: last.bytes, why: last.desc, cov: cov.length, fresh: fresh.length });
          }
        },
      };
      return api;
    }
    if (kind === "mix") {
      const parts = ["random", "dictionary", "smallcheck", "cgf"].map((k) => makeGen(k, prog, rng, opts));
      let cur = 0;
      return { next() { cur = Math.floor(rng() * parts.length); return parts[cur].next(); }, feedback(a, r) { parts[cur].feedback(a, r); } };
    }
    throw new Error("unknown strategy " + kind);
  }
  function byteStr(v) { return v >= 32 && v < 127 ? "'" + String.fromCharCode(v) + "'" : "\\x" + v.toString(16).padStart(2, "0"); }

  /* Run a strategy for n tries (async, in chunks). Returns { first: Map(outcome -> try#), hits: Map, tries } */
  async function fuzz(prog, gen, n, maxSteps, onProgress, isCancelled) {
    const first = new Map(), hits = new Map(), witness = new Map();
    const noInputs = prog.params.length === 0;
    const N = noInputs ? 1 : n;
    for (let t = 1; t <= N; t++) {
      const args = gen.next();
      const r = J.run(prog, args, { maxSteps: maxSteps || 1000 });
      gen.feedback(args, r);
      hits.set(r.outcome, (hits.get(r.outcome) || 0) + 1);
      if (!first.has(r.outcome)) { first.set(r.outcome, t); witness.set(r.outcome, args); }
      if (t % 2000 === 0) { if (onProgress) onProgress(t); await sleep0(); if (isCancelled && isCancelled()) break; }
    }
    return { first, hits, witness, tries: N };
  }

  /* Exact outcome probabilities for a one-int method: over all ints, or over an explicit small range */
  function outcomeProbs(prog, small) {
    const m = new Map();
    if (prog.params.length === 0) { m.set(exec(prog, [], 3000).outcome, 1); return m; }
    if (small) {
      for (let v = -100; v <= 100; v++) { const o = exec(prog, [v], 3000).outcome; m.set(o, (m.get(o) || 0) + 1 / 201); }
      return m;
    }
    intClasses(prog).forEach((c) => m.set(c.outcome, (m.get(c.outcome) || 0) + c.size / TWO32));
    return m;
  }
  const triesSlider = (parent, label, value) => PA.slider(parent, { label, min: 1, max: 5, step: 1, value, map: (v) => Math.pow(10, v), unmap: (v) => Math.round(Math.log10(v)), fmt: fmtN });

  /* =====================================================================
     LAB: random testing
     ===================================================================== */
  function labRandom(el) {
    const { controls, view } = PA.lab(el, {
      title: "Random testing: how long until each outcome shows up?",
      hint: "Run N uniformly random inputs and record when each outcome is seen first. The exact columns come from the size of each outcome's class, so you can compare luck with expectation.",
    });
    const ids = ["assertPositive", "checkTheWrongThing", "divideByN", "isNotAMillion", "checkBeforeDivideByN", "divideAfterCheck"];
    const sel = PA.select(controls, { label: "Program", options: progOpts(ids), value: "assertPositive" });
    const dom = PA.seg(controls, { label: "Domain", options: [["all", "all ints"], ["small", "-100 to 100"]], value: "all" });
    const n = triesSlider(controls, "Random tries N", 3);
    const btns = PA.btnRow(controls);
    const stats = PA.stats(view, [{ key: "tries", label: "tries run" }, { key: "found", label: "outcomes found" }]);
    const table = h("table", { class: "dt" });
    const verdict = h("div", { class: "verdict" });
    view.append(h("div", { class: "scroll-x" }, [table]), verdict);
    let seed = 1, run = 0;

    function exact() {
      const prog = J.get(sel.value);
      const probs = outcomeProbs(prog, dom.value === "small");
      return { prog, probs, truth: truthOf(prog) };
    }
    function render(res) {
      const { prog, probs, truth } = exact();
      const N = n.value;
      const outs = J.OUTCOMES.filter((o) => truth.has(o) || probs.has(o) || (res && res.first.has(o)));
      table.innerHTML = "<thead><tr><th>outcome</th><th>probability per try</th><th>expected tries</th><th>P(found within N)</th><th>first seen at try</th><th>hits</th></tr></thead>";
      const tb = h("tbody");
      outs.forEach((o) => {
        const p = probs.get(o) || 0;
        const f = res && res.first.get(o);
        tb.append(h("tr", { class: res ? (f ? "good" : p > 0 ? "bad" : "") : "", html: "<td>" + pill(o) + '</td><td class="num">' + fmtP(p) + '</td><td class="num">' + fmtTries(p) + '</td><td class="num">' + fmtP(p > 0 ? 1 - Math.pow(1 - p, N) : 0) + '</td><td class="num">' + (res ? (f ? fmtN(f) : "not found") : "-") + '</td><td class="num">' + (res ? fmtN(res.hits.get(o) || 0) : "-") + "</td>" }));
      });
      table.append(tb);
      if (!res) { stats.set("tries", "0"); stats.set("found", "-"); setVerdict(verdict, "", "Press <b>Run</b> to try " + fmtN(N) + " random inputs" + (dom.value === "small" ? " from -100 to 100." : " from all 2<sup>32</sup> ints.")); return; }
      const missed = outs.filter((o) => (probs.get(o) || 0) > 0 && !res.first.has(o));
      stats.set("tries", fmtN(res.tries));
      stats.set("found", res.first.size + " / " + outs.filter((o) => (probs.get(o) || 0) > 0).length, missed.length ? "warn" : "good");
      setVerdict(verdict, missed.length ? "bad" : "good", missed.length
        ? "<b>Missed:</b> " + missed.map((o) => pill(o)).join(" ") + ". Its class is so small that " + fmtN(N) + " tries had only a " + fmtP(1 - Math.pow(1 - (probs.get(missed[0]) || 0), N)) + " chance. Random testing finds big classes, not needles." + (dom.value === "all" ? " Try the small domain to see how much the input distribution matters." : "")
        : "<b>Every possible outcome was found.</b> Random testing works when each outcome's class is a decent fraction of the inputs.");
    }
    async function go() {
      const my = ++run;
      const prog = J.get(sel.value);
      const rng = PA.rng(seed * 104729);
      const gen = dom.value === "small" ? { next: () => [-100 + Math.floor(rng() * 201)], feedback() {} } : makeGen("random", prog, rng);
      stats.set("tries", "running…");
      const res = await fuzz(prog, gen, n.value, 3000, (t) => { if (my === run) stats.set("tries", fmtN(t) + "…"); }, () => my !== run);
      if (my === run) render(res);
    }
    PA.button(btns, "Run", go, "primary");
    PA.button(btns, "New seed", () => { seed++; go(); });
    sel.onchange = dom.onchange = n.onchange = () => { run++; render(null); };
    render(null);
  }

  /* =====================================================================
     LAB: dictionary fuzzing vs random
     ===================================================================== */
  function labDictionary(el) {
    const { controls, view } = PA.lab(el, {
      title: "Steal the constants: dictionary vs random",
      hint: "The dictionary is built by scanning the bytecode for <code>push</code> constants. Each try picks a dictionary value with probability q, otherwise a random int. Both strategies get the same number of tries.",
    });
    const ids = ["isNotAMillion", "divideByN", "checkTheWrongThing", "checkBeforeDivideByN", "plusOneDivide", "assertPositive"];
    const sel = PA.select(controls, { label: "Program", options: progOpts(ids), value: "isNotAMillion" });
    const q = PA.slider(controls, { label: "q (probability to use the dictionary)", min: 0, max: 1, step: 0.1, value: 0.5, fmt: (v) => v.toFixed(1) });
    const nb = PA.toggle(controls, { label: "add neighbours c - 1 and c + 1", value: true });
    const n = PA.slider(controls, { label: "Tries per strategy", min: 10, max: 2000, step: 10, value: 200 });
    const btns = PA.btnRow(controls);
    const dictEl = h("div", { class: "panel" });
    const table = h("table", { class: "dt" });
    const verdict = h("div", { class: "verdict" });
    view.append(dictEl, h("div", { class: "scroll-x" }, [table]), verdict);
    let seed = 1;

    async function go() {
      const prog = J.get(sel.value);
      const D = dictOf(prog, nb.value);
      dictEl.innerHTML = '<div class="panel-title">Dictionary D<sub>p</sub> from the bytecode (' + D.length + " values)</div>";
      const vals = h("div", { class: "vals" });
      D.forEach((v) => vals.append(h("span", { class: "val dict", text: String(v) })));
      dictEl.append(vals, h("p", { class: "tiny", style: "margin-top:6px", html: "Each value is drawn with probability at least q / |D| = " + (D.length ? (q.value / D.length).toFixed(3) : "0") + " per try (Proposition 4.49)." }));
      const r1 = await fuzz(prog, makeGen("random", prog, PA.rng(seed * 31)), n.value, 3000);
      const r2 = await fuzz(prog, makeGen("dictionary", prog, PA.rng(seed * 31), { q: q.value, neighbours: nb.value }), n.value, 3000);
      const truth = truthOf(prog);
      const outs = J.OUTCOMES.filter((o) => truth.has(o) || r1.first.has(o) || r2.first.has(o));
      table.innerHTML = "<thead><tr><th>outcome</th><th>possible?</th><th>random: first try</th><th>dictionary: first try</th><th>dictionary witness</th></tr></thead>";
      const tb = h("tbody");
      outs.forEach((o) => {
        const f1 = r1.first.get(o), f2 = r2.first.get(o);
        tb.append(h("tr", { html: "<td>" + pill(o) + "</td><td>" + (truth.has(o) ? "yes" : "no") + '</td><td class="num">' + (f1 ? fmtN(f1) : '<span class="badmark">not found</span>') + '</td><td class="num">' + (f2 ? fmtN(f2) : '<span class="badmark">not found</span>') + '</td><td class="mono">' + (f2 ? PA.esc(fmtArgs(prog, r2.witness.get(o))) : "") + "</td>" }));
      });
      table.append(tb);
      const gain = [...truth].filter((o) => r2.first.has(o) && !r1.first.has(o));
      const lost = [...truth].filter((o) => !r2.first.has(o));
      setVerdict(verdict, lost.length ? "warn" : "good",
        gain.length ? "<b>The dictionary found " + gain.map((o) => pill(o)).join(" ") + " that random testing missed</b>, because the triggering value is a constant in the code." :
        lost.length ? "<b>Still missing " + lost.map((o) => pill(o)).join(" ") + ".</b> " + (prog.id === "plusOneDivide" ? "" : "The trigger is not a constant of the code (or its neighbour), so the dictionary does not help here.") :
        "<b>Both strategies found everything.</b> When classes are big, the dictionary neither helps nor hurts much." + (prog.id === "plusOneDivide" ? "" : ""));
      if (prog.id === "plusOneDivide") verdict.innerHTML += " Note: <code>plusOneDivide</code> can never divide by zero (x &gt; -1 means x + 1 &ge; 1), so no strategy can find it, and none should.";
    }
    PA.button(btns, "Run both", go, "primary");
    PA.button(btns, "New seed", () => { seed++; go(); });
    sel.onchange = q.onchange = nb.onchange = n.onchange = go;
    go();
  }

  /* =====================================================================
     LAB: coverage-guided fuzzing of arraySpellsHello (centerpiece)
     ===================================================================== */
  function labCGF(el) {
    const { controls, view } = PA.lab(el, {
      title: "Coverage-guided fuzzing spells \"hello\"",
      hint: "The fuzzer keeps a corpus of byte strings, mutates a random one (change, remove or append a byte), runs <code>arraySpellsHello</code> on it and keeps it only if it covers a new instruction. A blind random fuzzer runs the same number of inputs for comparison.",
    });
    const prog = J.get("arraySpellsHello");
    const alpha = PA.seg(controls, { label: "Bytes", options: [["az", "a to z"], ["all", "0 to 255"]], value: "az" });
    const speed = PA.slider(controls, { label: "Executions per frame", min: 1, max: 400, value: 5 });
    const btns = PA.btnRow(controls);
    const stats = PA.stats(view, [{ key: "ex", label: "executions" }, { key: "corp", label: "corpus size" }, { key: "cov", label: "coverage (cgf)" }, { key: "rcov", label: "coverage (random)" }]);
    const outsEl = h("div", { class: "panel" });
    const mutEl = h("div", { class: "panel" });
    const corpEl = h("div", { class: "corpus no-math" });
    const canvas = h("canvas", { class: "chart", "aria-label": "Coverage over executions for coverage-guided and random fuzzing" });
    const lst = J.listing(prog);
    const verdict = h("div", { class: "verdict" });
    view.append(
      h("div", { class: "split" }, [h("div", { class: "panel" }, [h("div", { class: "panel-title", text: "Corpus (interesting inputs)" }), corpEl]), h("div", { style: "display:grid;gap:10px;align-content:start" }, [mutEl, outsEl])]),
      h("div", { class: "panel" }, [h("div", { class: "panel-title", text: "Covered instructions over executions" }), canvas]),
      verdict,
      h("details", { class: "proof" }, [h("summary", { text: "Show the bytecode with coverage" }), lst.el])
    );
    let st, timer = null, resume = false;
    const BUDGET = 300000;

    function reset() {
      stop();
      const A = alpha.value === "az" ? Array.from({ length: 26 }, (_, i) => 97 + i) : null;
      const rng = PA.rng(20251);
      st = {
        gen: makeGen("cgf", prog, rng, { alphabet: A }), rngR: PA.rng(777), A,
        ex: 0, found: new Map(), rK: new Set(), rFound: new Map(), pts: [[0, 0]], rpts: [[0, 0]], last: null,
      };
      render();
    }
    function one() {
      const args = st.gen.next();
      const r = J.run(prog, args, { maxSteps: 80 });
      st.gen.feedback(args, r);
      st.ex++;
      st.last = st.gen.last;
      if (!st.found.has(r.outcome)) st.found.set(r.outcome, { at: st.ex, args });
      if (st.last.newCov) st.pts.push([st.ex, st.gen.K.size]);
      // random baseline, same budget
      const ra = [randomChars(st.rngR, st.A)];
      const rr = J.run(prog, ra, { maxSteps: 80 });
      let grew = false;
      rr.coverage.forEach((k) => { const c = +k.split(":")[1]; if (!st.rK.has(c)) { st.rK.add(c); grew = true; } });
      if (grew) st.rpts.push([st.ex, st.rK.size]);
      if (!st.rFound.has(rr.outcome)) st.rFound.set(rr.outcome, st.ex);
    }
    function tick() {
      timer = null;
      for (let i = 0; i < speed.value; i++) {
        one();
        if (st.found.has("ok") || st.ex >= BUDGET) break;
      }
      render();
      if (st.found.has("ok") || st.ex >= BUDGET) { stop(); return; }
      timer = requestAnimationFrame(tick);
    }
    function start() { if (!timer && !(st.found.has("ok") || st.ex >= BUDGET)) { runBtn.textContent = "Pause"; timer = requestAnimationFrame(tick); } }
    function stop() { if (timer) cancelAnimationFrame(timer); timer = null; if (runBtn) runBtn.textContent = "Run"; }
    const show = (b) => '"' + b.map((v) => (v >= 32 && v < 127 ? String.fromCharCode(v) : "\\x" + v.toString(16).padStart(2, "0"))).join("") + '"';

    function render() {
      const g = st.gen;
      stats.set("ex", fmtN(st.ex));
      stats.set("corp", String(g.corpus.length));
      stats.set("cov", g.K.size + " / " + prog.code.length, g.K.size === prog.code.length ? "good" : "");
      stats.set("rcov", st.rK.size + " / " + prog.code.length);
      corpEl.innerHTML = "";
      g.corpus.forEach((c, i) => corpEl.append(h("div", { class: "corpus-row" + (i === g.corpus.length - 1 && st.last && st.last.newCov && i > 0 ? " new" : "") }, [h("span", { class: "ix", text: "#" + i }), h("span", { class: "bytes", text: show(c.bytes) }), h("span", { class: "cwhy", text: i ? "+" + c.fresh + " instr. (" + c.why + ")" : "seed" })])));
      corpEl.scrollTop = corpEl.scrollHeight;
      mutEl.innerHTML = '<div class="panel-title">Last execution</div>';
      if (st.last) {
        const l = st.last;
        mutEl.append(h("div", { class: "mut", html: (l.parent >= 0 ? "#" + l.parent + " " + PA.esc(show(g.corpus[l.parent] ? g.corpus[l.parent].bytes : [])) + " → <b>" + PA.esc(l.desc) + "</b> → " : "") + PA.esc(show(l.bytes)) + "<br>" + pill(l.outcome || "?") + " " + (l.newCov ? '<span class="okmark">+' + l.newCov + " new instructions: kept</span>" : '<span class="tiny">no new coverage: discarded</span>') }));
      } else mutEl.append(h("p", { class: "tiny", text: "Nothing run yet." }));
      outsEl.innerHTML = '<div class="panel-title">Outcomes found (execution #)</div>';
      const ow = h("div", { class: "vals" });
      ["out of bounds", "assertion error", "ok"].forEach((o) => {
        const f = st.found.get(o), rf = st.rFound.get(o);
        ow.append(h("span", { html: pill(o, f ? "@" + fmtN(f.at) : "not yet") }));
        ow.append(h("span", { class: "tiny", style: "align-self:center;margin-right:8px", text: "random: " + (rf ? "@" + fmtN(rf) : "not yet") }));
      });
      outsEl.append(ow);
      lst.mark({ cov: g.K });
      drawChart();
      if (st.found.has("ok")) setVerdict(verdict, "good", "<b>Found " + PA.esc(show(st.found.get("ok").args[0])) + " after " + fmtN(st.found.get("ok").at) + " executions</b> with a corpus of only " + g.corpus.length + " inputs. Each correct letter unlocked new instructions, so the fuzzer kept it and built on it. The random fuzzer, with the same budget, reached " + st.rK.size + " of " + prog.code.length + " instructions.");
      else if (st.ex >= BUDGET) setVerdict(verdict, "warn", "<b>Budget of " + fmtN(BUDGET) + " executions used up.</b> With all 256 byte values each letter is 10 times harder to guess; it usually still gets there, try again with a reset.");
      else setVerdict(verdict, "", "Press <b>Run</b>. Watch the corpus: every kept input is one letter further than its parent, while the random fuzzer's coverage stays flat.");
    }
    function drawChart() { if (canvas._draw) canvas._draw(); }
    canvas._draw = PA.canvas(canvas, (ctx, w, hh) => {
      if (!st) return;
      const pad = 30, maxX = Math.max(100, st.ex), maxY = prog.code.length;
      ctx.strokeStyle = PA.css("--line-2"); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, 8); ctx.lineTo(pad, hh - 20); ctx.lineTo(w - 8, hh - 20); ctx.stroke();
      ctx.fillStyle = PA.css("--muted"); ctx.font = "11px " + PA.css("--mono");
      ctx.fillText(String(maxY), 4, 14); ctx.fillText("0", 14, hh - 22); ctx.fillText(fmtN(maxX) + " executions", w - 120, hh - 6);
      const X = (x) => pad + (x / maxX) * (w - pad - 10), Y = (y) => hh - 20 - (y / maxY) * (hh - 32);
      function line(pts, color, dash) {
        ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.setLineDash(dash ? [5, 4] : []);
        ctx.beginPath();
        pts.forEach(([x, y], i) => { if (i) ctx.lineTo(X(x), Y(pts[i - 1][1])); ctx[i ? "lineTo" : "moveTo"](X(x), Y(y)); });
        ctx.lineTo(X(st.ex), Y(pts[pts.length - 1][1]));
        ctx.stroke(); ctx.setLineDash([]);
      }
      line(st.rpts, PA.css("--muted"), true);
      line(st.pts, PA.css("--accent"), false);
      ctx.fillStyle = PA.css("--accent"); ctx.fillText("coverage-guided", pad + 8, 20);
      ctx.fillStyle = PA.css("--muted"); ctx.fillText("random (dashed)", pad + 8, 34);
    });
    const runBtn = PA.button(btns, "Run", () => { resume = false; if (timer) stop(); else start(); }, "primary");
    PA.button(btns, "Step", () => { stop(); if (!st.found.has("ok")) { one(); render(); } });
    PA.button(btns, "Reset", reset);
    alpha.onchange = reset;
    // Pause while scrolled out of view; resume when it comes back.
    PA.whenVisible(el, () => { if (resume) { resume = false; start(); } }, () => { if (timer) { stop(); resume = true; } });
    reset();
  }

  /* =====================================================================
     LAB: property-based testing with shrinking
     ===================================================================== */
  function labPBT(el) {
    const { controls, view } = PA.lab(el, {
      title: "Property-based testing: find a failure, then shrink it",
      hint: "Random lists (length 0 to 8, numbers -20 to 20) are fed to <code>my_sort</code> and the chosen property is checked. When it fails, shrink the counterexample: drop an element, or move a number (or all copies of a repeated number) towards 0, as long as it still fails.",
    });
    const bug = PA.select(controls, { label: "my_sort is...", options: [["dedup", "buggy: drops duplicates"], ["long", "buggy: loses the last element if length > 4"], ["ok", "a correct sort"]], value: "dedup" });
    const prop = PA.select(controls, { label: "Property", options: [["eq", "my_sort(xs) == sorted(xs)"], ["ordered", "output is ordered"], ["len", "len(output) == len(xs)"], ["perm", "output is a permutation of xs"]], value: "eq" });
    const btns = PA.btnRow(controls);
    const stats = PA.stats(view, [{ key: "tests", label: "tests run" }, { key: "status", label: "status" }, { key: "steps", label: "shrink steps" }]);
    const logEl = h("table", { class: "dt" });
    const cexEl = h("div", { class: "panel" });
    const verdict = h("div", { class: "verdict" });
    view.append(h("div", { class: "split" }, [h("div", { class: "scroll-x" }, [logEl]), cexEl]), verdict);
    let seed = 1, rng, tests, log, cex, history;

    const sorted = (xs) => xs.slice().sort((a, b) => a - b);
    function mySort(xs) {
      if (bug.value === "dedup") return [...new Set(xs)].sort((a, b) => a - b);
      if (bug.value === "long") return xs.length > 4 ? sorted(xs).slice(0, -1) : sorted(xs);
      return sorted(xs);
    }
    const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
    function holds(xs) {
      const out = mySort(xs);
      if (prop.value === "eq") return eq(out, sorted(xs));
      if (prop.value === "ordered") return out.every((v, i) => !i || out[i - 1] <= v);
      if (prop.value === "len") return out.length === xs.length;
      return eq(sorted(out), sorted(xs));
    }
    const fmtL = (xs) => "[" + xs.join(", ") + "]";
    function reset() { rng = PA.rng(seed * 4099); tests = 0; log = []; cex = null; history = []; render(); }
    function find() {
      if (cex) return;
      for (let i = 0; i < 500; i++) {
        const n = Math.floor(rng() * 9), xs = [];
        for (let j = 0; j < n; j++) xs.push(Math.floor(rng() * 41) - 20);
        tests++;
        const ok = holds(xs);
        log.push([xs, ok]);
        if (!ok) { cex = xs; history = [xs]; break; }
      }
      render();
    }
    function candidates(xs) {
      const out = [];
      for (let i = 0; i < xs.length; i++) out.push(xs.slice(0, i).concat(xs.slice(i + 1)));
      for (let i = 0; i < xs.length; i++) {
        const v = xs[i];
        [0, Math.trunc(v / 2), v - Math.sign(v)].forEach((w) => { if (w !== v) { const c = xs.slice(); c[i] = w; out.push(c); } });
      }
      // like Hypothesis, also shrink all copies of a repeated value together
      [...new Set(xs)].filter((v) => v !== 0 && xs.indexOf(v) !== xs.lastIndexOf(v)).forEach((v) => {
        [0, Math.trunc(v / 2), v - Math.sign(v)].forEach((w) => { if (w !== v) out.push(xs.map((x) => (x === v ? w : x))); });
      });
      return out;
    }
    function shrinkOnce() {
      if (!cex) return false;
      const c = candidates(cex).find((x) => !holds(x));
      if (!c) return false;
      cex = c; history.push(c);
      return true;
    }
    function render() {
      stats.set("tests", fmtN(tests));
      stats.set("status", cex ? "failed" : tests ? "passing" : "-", cex ? "bad" : tests ? "good" : "");
      stats.set("steps", String(Math.max(0, history.length - 1)));
      logEl.innerHTML = "<thead><tr><th>last inputs xs</th><th>my_sort(xs)</th><th>property</th></tr></thead>";
      const tb = h("tbody");
      log.slice(-7).forEach(([xs, ok]) => tb.append(h("tr", { class: ok ? "" : "bad", html: '<td class="mono">' + fmtL(xs) + '</td><td class="mono">' + fmtL(mySort(xs)) + "</td><td>" + (ok ? '<span class="okmark">holds</span>' : '<span class="badmark">fails</span>') + "</td>" })));
      logEl.append(tb);
      cexEl.innerHTML = '<div class="panel-title">Counterexample</div>';
      if (!cex) { cexEl.append(h("p", { class: "tiny", text: tests ? "No failure in " + tests + " tests so far." : "Run the tests to look for one." })); }
      else {
        cexEl.append(h("div", { class: "mono", style: "font-size:15px;font-weight:700;margin:4px 0", text: "xs = " + fmtL(cex) }));
        cexEl.append(h("div", { class: "mono tiny", text: "my_sort(xs) = " + fmtL(mySort(cex)) + ",  sorted(xs) = " + fmtL(sorted(cex)) }));
        const hist = h("div", { class: "vals", style: "margin-top:8px" });
        history.forEach((x, i) => { if (i) hist.append(h("span", { class: "tiny", text: "→" })); hist.append(h("span", { class: "val" + (i === history.length - 1 ? " err" : ""), text: fmtL(x) })); });
        cexEl.append(hist);
      }
      if (!tests) setVerdict(verdict, "", "Press <b>Run tests</b>.");
      else if (!cex) setVerdict(verdict, bug.value === "ok" ? "good" : "warn", bug.value === "ok" ? "<b>The property holds on every generated list</b>, as it should for a correct sort. (Passing is evidence, not proof.)" : "<b>The property never failed, yet the implementation is buggy.</b> This property is too weak to notice the bug: \"the output is ordered\" is also true of a list that lost elements. Good properties relate the output to the input.");
      else {
        const minimal = !candidates(cex).some((x) => !holds(x));
        setVerdict(verdict, minimal ? "good" : "bad", minimal ? "<b>Minimal counterexample " + fmtL(cex) + "</b>: removing any element or moving any number towards 0 makes the property pass. Compare it with the first failure, " + fmtL(history[0]) + ": the shrunk one shows the bug at a glance." : "<b>The property fails on " + fmtL(cex) + ".</b> Shrink it to see the essence of the bug.");
      }
    }
    PA.button(btns, "Run tests", find, "primary");
    PA.button(btns, "Shrink one step", () => { shrinkOnce(); render(); });
    PA.button(btns, "Shrink fully", () => { let n = 0; while (shrinkOnce() && n++ < 300); render(); });
    PA.button(btns, "New seed", () => { seed++; reset(); });
    bug.onchange = prop.onchange = reset;
    reset();
  }

  /* =====================================================================
     LAB: small-scope enumeration with iterative deepening
     ===================================================================== */
  function labSmallCheck(el) {
    const { controls, view } = PA.lab(el, {
      title: "SmallCheck: enumerate small inputs, deepening step by step",
      hint: "Each depth d runs <code>gen_int(d)</code> = 0, 1, -1, ..., d, -d (re-running the smaller values, as iterative deepening does). The first input that shows an outcome is the smallest such input.",
    });
    const ids = ["divideByN", "assertPositive", "checkTheWrongThing", "checkBeforeDivideByN", "isNotAMillion", "divideAfterCheck"];
    const sel = PA.select(controls, { label: "Program", options: progOpts(ids), value: "divideByN" });
    const D = PA.slider(controls, { label: "Max depth D", min: 1, max: 25, value: 6 });
    const k = PA.slider(controls, { label: "Parameters k (for the count table)", min: 1, max: 4, value: 1 });
    const btns = PA.btnRow(controls);
    const stats = PA.stats(view, [{ key: "d", label: "depth reached" }, { key: "ex", label: "executions" }, { key: "found", label: "outcomes found" }]);
    const chips = h("div", { class: "panel" });
    const foundT = h("table", { class: "dt" });
    const countT = h("table", { class: "dt" });
    const verdict = h("div", { class: "verdict" });
    view.append(chips, h("div", { class: "split" }, [h("div", { class: "scroll-x" }, [foundT]), h("div", { class: "scroll-x" }, [countT])]), verdict);
    let d, ex, found, lastVals;

    function reset() { d = -1; ex = 0; found = new Map(); lastVals = []; render(); }
    function deepen() {
      if (d >= D.value) return;
      d++;
      const prog = J.get(sel.value);
      lastVals = [];
      for (const v of genInt(d)) {
        const r = exec(prog, [v], 3000);
        ex++;
        lastVals.push([v, r.outcome]);
        if (!found.has(r.outcome)) found.set(r.outcome, { v, d, ex });
      }
      render();
    }
    function render() {
      const prog = J.get(sel.value);
      const truth = truthOf(prog);
      stats.set("d", d < 0 ? "-" : String(d));
      stats.set("ex", fmtN(ex));
      stats.set("found", [...truth].filter((o) => found.has(o)).length + " / " + truth.size, [...truth].every((o) => found.has(o)) ? "good" : "warn");
      chips.innerHTML = '<div class="panel-title">' + (d < 0 ? "Nothing enumerated yet" : "Inputs at depth " + d + " (coloured by outcome)") + "</div>";
      const vs = h("div", { class: "vals" });
      lastVals.slice(0, 51).forEach(([v, o]) => vs.append(h("span", { class: "val " + (o === "ok" ? "ok" : o === "*" ? "star" : "err"), title: o, text: String(v) })));
      if (lastVals.length > 51) vs.append(h("span", { class: "tiny", text: "+" + (lastVals.length - 51) + " more" }));
      chips.append(vs);
      foundT.innerHTML = "<thead><tr><th>outcome</th><th>smallest input</th><th>at depth</th><th>after # runs</th></tr></thead>";
      const tb = h("tbody");
      J.OUTCOMES.filter((o) => truth.has(o) || found.has(o)).forEach((o) => {
        const f = found.get(o);
        tb.append(h("tr", { class: f ? "good" : "", html: "<td>" + pill(o) + '</td><td class="mono">' + (f ? f.v : "not yet") + '</td><td class="num">' + (f ? f.d : "") + '</td><td class="num">' + (f ? fmtN(f.ex) : "") + "</td>" }));
      });
      foundT.append(tb);
      countT.innerHTML = "<thead><tr><th>d</th><th>(2d+1)<sup>k</sup> at depth d</th><th>cumulative</th></tr></thead>";
      const tc = h("tbody");
      let cum = 0;
      for (let dd = 0; dd <= D.value; dd++) {
        const c = Math.pow(2 * dd + 1, k.value);
        cum += c;
        tc.append(h("tr", { class: dd === d ? "on" : "", html: '<td class="num">' + dd + '</td><td class="num">' + fmtN(c) + '</td><td class="num">' + fmtN(cum) + "</td>" }));
      }
      countT.append(tc);
      const missing = [...truth].filter((o) => !found.has(o));
      if (d < 0) setVerdict(verdict, "", "Press <b>Deepen</b> to run depth 0, then 1, 2, ...");
      else if (!missing.length) setVerdict(verdict, "good", "<b>All outcomes found by depth " + Math.max(...[...truth].map((o) => found.get(o).d)) + ".</b> Each witness is the smallest input with that outcome, because every smaller input was tried at an earlier depth (Proposition 4.57). No shrinking needed, and the run is fully reproducible.");
      else if (prog.id === "isNotAMillion") setVerdict(verdict, "bad", "<b>The assertion error hides at 1,000,000.</b> Small-scope enumeration reaches it only at depth 1,000,000: 2,000,001 inputs at that depth alone and about 10<sup>12</sup> runs with iterative deepening. A dictionary finds it in about 2 tries.");
      else setVerdict(verdict, "warn", "Still missing " + missing.map((o) => pill(o)).join(" ") + " at depth " + d + ". Deepen further.");
    }
    PA.button(btns, "Deepen", deepen, "primary");
    PA.button(btns, "Run to D", () => { while (d < D.value) deepen(); });
    PA.button(btns, "Reset", reset);
    sel.onchange = reset;
    D.onchange = k.onchange = render;
    reset();
  }

  /* =====================================================================
     LAB: strategy showdown
     ===================================================================== */
  function labShowdown(el) {
    const { controls, view } = PA.lab(el, {
      title: "Strategy showdown: who finds what?",
      hint: "Every strategy gets the same budget of runs on every program (runs stop after 1000 steps and report *). Green: every possible outcome found; amber: only some; red: none. The number after @ is the try that first produced the outcome.",
    });
    el.classList.add("wide");
    const progs = ["divideByN", "checkTheWrongThing", "assertPositive", "isNotAMillion", "arraySpellsHello", "countdown"];
    const strats = [["random", "random"], ["dictionary", "dictionary"], ["smallcheck", "small-scope"], ["cgf", "coverage-guided"]];
    const BUD = [100, 1000, 3000, 10000, 30000];
    const budget = PA.slider(controls, { label: "Budget (runs per cell)", min: 1, max: 5, step: 1, value: 3, map: (v) => BUD[v - 1], unmap: (v) => BUD.indexOf(v) + 1, fmt: fmtN });
    const btns = PA.btnRow(controls);
    const table = h("table", { class: "dt" });
    const verdict = h("div", { class: "verdict" });
    const lessons = h("ul", { class: "tiny", style: "margin:0;padding-left:18px" });
    view.append(h("div", { class: "scroll-x" }, [table]), verdict, h("div", { class: "panel" }, [h("div", { class: "panel-title", text: "What to take away" }), lessons]));
    let seed = 1, run = 0;
    const LESSON = {
      divideByN: "divideByN: the bug is the single value 0. Small-scope tries it first; coverage-guided starts from the empty byte string, which parses to 0; random almost never hits it; the dictionary only if 0 is a neighbour of a constant (1 - 1 = 0).",
      checkTheWrongThing: "checkTheWrongThing: every non-zero input fails, so every strategy finds it immediately; the only hard part is the ok case at 0.",
      assertPositive: "assertPositive: both classes are half of all ints, so random finds both in a few tries.",
      isNotAMillion: "isNotAMillion: only the dictionary finds the assertion error; there is no partial progress for coverage guidance and the value is far from small.",
      arraySpellsHello: "arraySpellsHello: only coverage guidance reaches ok, one letter at a time (with all 256 byte values it needs roughly 10^4 to 10^5 runs).",
      countdown: "countdown: * is only ever guessed from timeouts. Random reports * for huge positive n that would terminate after billions of steps, so it is right for the wrong reason; small-scope finds ok at 0 and * at -1.",
    };

    function header() {
      table.innerHTML = "<thead><tr><th>program</th><th>possible</th>" + strats.map((s) => "<th>" + s[1] + "</th>").join("") + "</tr></thead>";
      const tb = h("tbody");
      progs.forEach((id) => {
        const tr = h("tr", { "data-p": id, html: '<td class="mono">' + id + "</td><td>" + [...truthOf(J.get(id))].map((o) => pill(o)).join(" ") + "</td>" + strats.map(() => '<td class="cellres"><span class="tiny">-</span></td>').join("") + "</tr>" });
        tb.append(tr);
      });
      table.append(tb);
    }
    async function go() {
      const my = ++run;
      header();
      lessons.innerHTML = "";
      let n = 0, full = 0;
      const colFull = strats.map(() => 0);
      for (const id of progs) {
        const prog = J.get(id), truth = truthOf(prog);
        const tr = table.querySelector('tr[data-p="' + id + '"]');
        for (let s = 0; s < strats.length; s++) {
          if (my !== run) return;
          setVerdict(verdict, "", "Running " + id + " with " + strats[s][1] + " (" + ++n + " / " + progs.length * strats.length + ")…");
          const res = await fuzz(prog, makeGen(strats[s][0], prog, PA.rng(seed * 7 + s * 1000 + id.length)), budget.value, 1000, null, () => my !== run);
          if (my !== run) return;
          const got = [...truth].filter((o) => res.first.has(o));
          const bugs = [...truth].filter((o) => o !== "ok");
          const cls = got.length === truth.size ? "full" : bugs.some((o) => res.first.has(o)) || got.length ? "part" : "none";
          if (cls === "full") { full++; colFull[s]++; }
          const td = tr.children[2 + s];
          td.className = "cellres " + cls;
          td.innerHTML = [...res.first.entries()].map(([o, t]) => pill(o, "@" + fmtN(t))).join("") || '<span class="tiny">nothing</span>';
          await sleep0();
        }
        lessons.append(h("li", { text: LESSON[id] }));
      }
      const allGreen = strats.filter((s, i) => colFull[i] === progs.length).map((s) => s[1]);
      setVerdict(verdict, "good", "<b>Done: " + full + " of " + progs.length * strats.length + " cells found every possible outcome.</b> " + (allGreen.length ? "With this budget " + allGreen.join(" and ") + " found everything; lower the budget to see which one gives out first." : "No column is all green: each strategy has a blind spot, which is why practical fuzzers mix them (Proposition 4.58)."));
    }
    PA.button(btns, "Run showdown", go, "primary");
    PA.button(btns, "New seed", () => { seed++; go(); });
    budget.onchange = () => { run++; header(); setVerdict(verdict, "", "Budget changed. Press <b>Run showdown</b>."); };
    header();
    setVerdict(verdict, "", "Press <b>Run showdown</b> to fuzz 6 programs with 4 strategies.");
  }

  /* =====================================================================
     LAB: your dynamic analysis, scored like JPAMB
     ===================================================================== */
  function wagerOf(p) {
    let sign = 1;
    if (p < 0.5) { p = 1 - p; sign = -1; }
    if (p === 1) return sign * Infinity;
    const w = (sign * (1 - 2 * p)) / (-1 + p) / 2;
    return w === 0 ? 0 : w;
  }
  function pointsOf(w, happened) {
    if (w === 0) return 0;
    const win = (w > 0 && happened) || (w < 0 && !happened);
    if (win) return Number.isFinite(w) ? 1 - 1 / (Math.abs(w) + 1) : 1;
    return -Math.abs(w);
  }
  const fmtW = (w) => (w === Infinity ? "+inf" : w === -Infinity ? "-inf" : (w > 0 ? "+" : "") + w.toFixed(2));

  function labAnalysis(el) {
    const { controls, view } = PA.lab(el, {
      title: "A dynamic analysis on a mini benchmark, scored like JPAMB",
      hint: "The analysis fuzzes every method of a 15-method mini suite, turns what it saw into categories (yes / no / maybe, plus timeout), and JPAMB's rules turn each category's real frequency into a wager and points.",
    });
    const suite = ["assertFalse", "assertBoolean", "assertPositive", "divideByZero", "divideByN", "checkBeforeDivideByN", "checkTheWrongThing", "isNotAMillion", "arraySpellsHello", "countdown", "sumTo", "divideAfterCheck", "copyThenDivide", "plusOneDivide", "infiniteLoop"];
    const strat = PA.select(controls, { label: "Input strategy", options: [["random", "random"], ["dictionary", "dictionary"], ["smallcheck", "small-scope"], ["cgf", "coverage-guided"], ["mix", "mix of all four"]], value: "mix" });
    const BUD = [10, 30, 100, 300, 1000];
    const budget = PA.slider(controls, { label: "Runs per method", min: 1, max: 5, step: 1, value: 3, map: (v) => BUD[v - 1], unmap: (v) => BUD.indexOf(v) + 1, fmt: fmtN });
    const tcat = PA.toggle(controls, { label: "separate <code>timeout</code> category for *", value: true });
    const show = PA.select(controls, { label: "Show output for", options: suite.map((id) => [id, id]), value: "arraySpellsHello" });
    const btns = PA.btnRow(controls);
    const stats = PA.stats(view, [{ key: "score", label: "total points" }, { key: "preds", label: "predictions" }, { key: "wrong", label: "lost bets" }]);
    const catT = h("table", { class: "dt" });
    const out = h("div");
    const verdict = h("div", { class: "verdict" });
    view.append(h("div", { class: "scroll-x" }, [catT]), out, verdict);
    let results = null, seed = 1, run = 0;

    async function go() {
      const my = ++run;
      results = [];
      setVerdict(verdict, "", "Analysing…");
      for (const id of suite) {
        const prog = J.get(id);
        const res = await fuzz(prog, makeGen(strat.value, prog, PA.rng(seed * 13 + id.length * 101)), budget.value, 300, null, () => my !== run);
        if (my !== run) return;
        results.push({ id, prog, found: res.first, truth: truthOf(prog) });
      }
      score();
    }
    function catOf(r, o) {
      if (r.found.has(o)) return o === "*" && tcat.value ? "timeout" : "yes";
      return r.prog.params.length === 0 ? "no" : "maybe";
    }
    function score() {
      if (!results) return;
      const preds = [];
      results.forEach((r) => J.OUTCOMES.forEach((o) => preds.push({ r, o, cat: catOf(r, o), happens: r.truth.has(o) })));
      const cats = new Map();
      preds.forEach((p) => { const c = cats.get(p.cat) || { n: 0, k: 0 }; c.n++; if (p.happens) c.k++; cats.set(p.cat, c); });
      let total = 0, wrong = 0;
      cats.forEach((c) => { c.p = c.k / c.n; c.w = wagerOf(c.p); c.pts = 0; });
      preds.forEach((p) => { const c = cats.get(p.cat); const pts = pointsOf(c.w, p.happens); c.pts += pts; total += pts; p.pts = pts; if (pts < 0) wrong++; });
      catT.innerHTML = "<thead><tr><th>category</th><th>predictions</th><th>actually happen</th><th>frequency p</th><th>wager w(p)</th><th>points</th></tr></thead>";
      const tb = h("tbody");
      ["yes", "timeout", "maybe", "no"].filter((c) => cats.has(c)).forEach((name) => {
        const c = cats.get(name);
        tb.append(h("tr", { html: '<td class="mono">' + name + '</td><td class="num">' + c.n + '</td><td class="num">' + c.k + '</td><td class="num">' + fmtP(c.p) + '</td><td class="num">' + fmtW(c.w) + '</td><td class="num">' + c.pts.toFixed(2) + "</td>" }));
      });
      catT.append(tb);
      stats.set("score", total.toFixed(2), total > 0 ? "good" : "bad");
      stats.set("preds", String(preds.length));
      stats.set("wrong", String(wrong), wrong ? "warn" : "good");
      renderOut(preds);
      const yes = cats.get("yes");
      const lost = preds.filter((p) => p.pts < 0);
      setVerdict(verdict, yes && yes.p === 1 ? "good" : "warn",
        (yes && yes.p === 1 ? "<b>Every yes is right</b> (observed outcomes are real), so JPAMB bets +inf on them and each earns a full point. " : "<b>The yes category contains wrong predictions</b>" + (!tcat.value ? ": timeout guesses for * were mixed in, so even the certain answers get a finite wager. Switch the timeout category back on." : ".") + " ") +
        "The maybe category is where the score is won or lost: its frequency says how often an outcome you did not observe still happens. A stronger strategy or a bigger budget moves outcomes from maybe to yes." +
        (lost.length ? " <b>Lost bets:</b> " + lost.map((p) => PA.esc(p.r.id + ": " + p.o) + " (" + p.cat + ", " + p.pts.toFixed(2) + ")").join("; ") + ". A confident category punishes its rare exceptions hard." : ""));
    }
    function renderOut(preds) {
      const r = results.find((x) => x.id === show.value);
      out.innerHTML = "";
      if (!r) return;
      const lines = preds.filter((p) => p.r === r).map((p) =>
        (p.o + ";" + p.cat).padEnd(24) + " # " + (p.happens ? "happens" : "never happens") + ", " + (p.pts >= 0 ? "+" : "") + p.pts.toFixed(2) + " points" + (p.pts < 0 ? " (lost bet)" : ""));
      out.append(h("div", { class: "panel" }, [h("div", { class: "panel-title", text: "jpamb output" }), h("div", { class: "mono tiny", style: "margin-bottom:6px", text: r.prog.methodId }), h("div", { class: "predout no-math", text: lines.join("\n") })]));
    }
    PA.button(btns, "Analyse the suite", go, "primary");
    PA.button(btns, "New seed", () => { seed++; go(); });
    tcat.onchange = score;
    show.onchange = score;
    strat.onchange = budget.onchange = () => { run++; results = null; catT.innerHTML = ""; out.innerHTML = ""; setVerdict(verdict, "", "Settings changed. Press <b>Analyse the suite</b>."); };
    setVerdict(verdict, "", "Press <b>Analyse the suite</b>.");
  }

  /* =====================================================================
     Boot
     ===================================================================== */
  const LABS = {
    mustmay: labMustMay,
    ta: labTA,
    paths: labPaths,
    coverage: labCoverage,
    golden: labGolden,
    random: labRandom,
    dictionary: labDictionary,
    cgf: labCGF,
    pbt: labPBT,
    smallcheck: labSmallCheck,
    showdown: labShowdown,
    analysis: labAnalysis,
  };

  PA.boot("dynamic-analysis", LABS, QUIZ);
})();
