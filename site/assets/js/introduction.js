/* Week 1, Introduction: Decidability. Quiz bank and interactive labs. */
(function () {
  "use strict";
  const h = PA.h;

  /* =====================================================================
     QUIZ BANK
     Each option: [text, isCorrect, explanation]
     ===================================================================== */
  const QUIZ = {
    history: [
      {
        q: "Russell's paradox considers $R = \\{x \\mid x \\notin x\\}$. Why is it a problem?",
        options: [
          ["It shows that sets can never contain themselves", false, "Nothing forbids self-membership in naive set theory; the problem is that this particular set leads to a contradiction."],
          ["It shows that the halting problem is undecidable", false, "Same flavour of self-reference, but Russell's paradox is about set theory (1901); the halting problem is Turing's (1936)."],
          ["$R$ is simply the empty set", false, "The empty set contains nothing, in particular not itself, so it would be an element of $R$; $R$ is not empty."],
          ["Both $R \\in R$ and $R \\notin R$ lead to the opposite, so a theory allowing $R$ proves a contradiction", true, "If $R \\in R$, then $R$ fails its own membership condition, so $R \\notin R$, and vice versa. A theory that can build $R$ is inconsistent."],
        ],
      },
      {
        q: "What did Hilbert's program hope for?",
        options: [
          ["A faster computer to check proofs", false, "There were no computers. Hilbert wanted a mechanical procedure, a recipe, not a machine."],
          ["A finite, consistent axiom system plus a mechanical procedure deciding every mathematical statement", true, "That is the Entscheidungsproblem: decide truth mechanically. Gödel, Church and Turing showed it cannot be done."],
          ["A proof that mathematics is inconsistent", false, "The opposite: Hilbert wanted to secure mathematics against paradoxes like Russell's."],
        ],
      },
      {
        q: "A procedure lists every true statement, one after another. Why does that not let you decide whether a given $\\varphi$ is true?",
        options: [
          ["Because the list may contain false statements", false, "We assumed it lists true statements only. The problem is about waiting."],
          ["Because lists of statements are always finite", false, "The list of truths is infinite, which is exactly why you might wait forever."],
          ["Because if $\\varphi$ never shows up, you cannot know when to stop waiting", true, "Enumerating gives recognition (a yes when it appears), not a decision. To decide you would also need to know when it will never appear: that is a termination question."],
        ],
      },
    ],

    program: [
      {
        q: "What does the step function $\\mathtt{step} : L \\times \\State \\to \\State$ take as input?",
        options: [
          ["A program and a state", true, "The program says what to do, the state says where we are and what the data is."],
          ["Only a state", false, "Without the program the machine would not know which instruction to execute."],
          ["A trace", false, "A trace is what you get by applying step repeatedly; it is an output of running, not the input of one step."],
          ["A program and its inputs, returning the final result", false, "That would be a whole run (big-step). step does one small step from one state to the next."],
        ],
      },
      {
        q: "When has a program run to completion in this model?",
        options: [
          ["When the trace has more than 1000 states", false, "Length says nothing: a long trace may still finish, and a short program may loop forever."],
          ["When it reaches a fixpoint: a state $s$ with $\\mathtt{step}(p, s) = s$", true, "Once stepping no longer changes the state, nothing will ever change again; the trace ends there."],
          ["When the program counter is 0 again", false, "Loops return to earlier program counters all the time; that is not termination."],
        ],
      },
      {
        q: "Which of these must be part of a machine state for JVM-like programs?",
        options: [
          ["Only the values of the local variables", false, "You also need to know which instruction comes next (and the stack, heap, call stack). Two states with the same variables but different program counters behave differently."],
          ["The source code comments", false, "Comments are not even in the bytecode; they never influence execution."],
          ["Everything needed to continue: locals, operand stack, heap, call stack and program counter", true, "A state must be enough to compute the next state; leave anything out and step would not be a function of the state."],
        ],
      },
      {
        q: "Why does each initial state of $p$ have exactly one trace in this model?",
        options: [
          ["Because step is a function: each state has exactly one successor", true, "By induction, $s_{i+1} = \\mathtt{step}(p, s_i)$ is uniquely determined. Week 3 generalises step to a relation to allow several successors."],
          ["Because programs always terminate", false, "They do not; the single trace may be infinite."],
          ["Because the trace is defined as the shortest path to a fixpoint", false, "There is no choice of path: with a function there is only one way to continue."],
        ],
      },
    ],

    analysis: [
      {
        q: "Which is the course's definition of program analysis?",
        options: [
          ["Manually reading code to find bugs", false, "Manual inspection is useful, but the course's definition stresses automatic techniques."],
          ["Using automatic techniques to figure out facts about a computer program", true, "Facts about structure (formatting, use of division) or about possible behaviour (halting, crashes)."],
          ["Running the program's test suite", false, "Testing is one (dynamic) analysis technique, not the definition."],
        ],
      },
      {
        q: "Which fact is about a program's <em>structure</em> rather than its behaviour?",
        options: [
          ["The method may divide by zero for some input", false, "That depends on what happens at run time: behaviour."],
          ["The method always returns a positive number", false, "Return values are behaviour."],
          ["The method terminates on every input", false, "Termination is the classic behavioural property."],
          ["The method's text contains the character <code>/</code>", true, "This is decided by looking at the text alone, without running anything."],
        ],
      },
      {
        q: "An ideal analysis $A$ for property $P$ satisfies $A(p) = \\mathit{yes} \\iff p \\in P$. Why can it exist for $P_{/}$ (contains <code>/</code>) but not for $P_{\\mathit{halt}}$?",
        options: [
          ["$P_{/}$ is syntactic and decidable by a scan; $P_{\\mathit{halt}}$ is the halting problem, which is undecidable", true, "Structural properties of finite text are easy; behavioural ones run into Turing and Rice."],
          ["$P_{/}$ has fewer programs in it", false, "Both sets are infinite. Decidability is not about size."],
          ["$P_{\\mathit{halt}}$ is not a set of programs", false, "It is: the programs that terminate on every input."],
        ],
      },
    ],

    turing: [
      {
        q: "What does it mean that a language is Turing complete?",
        options: [
          ["Every program in it terminates", false, "Quite the opposite: Turing-complete languages can express non-terminating programs."],
          ["It can simulate any Turing machine, so it can express any computation", true, "Including every possible non-termination, which is what makes analysis hard."],
          ["It was designed by Alan Turing", false, "Java, Brainfuck and PowerPoint were not designed by Turing, yet all are Turing complete."],
          ["It has a type system", false, "Types are unrelated; untyped Brainfuck is Turing complete."],
        ],
      },
      {
        q: "Why is Turing completeness a double-edged sword for program analysis?",
        options: [
          ["Turing-complete languages are slow", false, "Speed is not the issue."],
          ["They cannot be compiled", false, "Java and C are compiled all the time."],
          ["Power to express everything includes power to loop forever and to hide behaviour, which makes behaviour undecidable", true, "The same expressiveness that lets you write anything lets you write programs whose behaviour no analysis can always predict."],
        ],
      },
      {
        q: "Real computers have finite memory. Why do we still treat Java as Turing complete?",
        options: [
          ["Because the number of states is so huge that the finite bound gives no practical help, and the language itself puts no bound on memory", true, "Deciding by enumerating all states of a machine with gigabytes of memory is as hopeless as undecidability, and the language semantics allow unbounded heaps and recursion."],
          ["Because the JVM has infinite memory", false, "It does not; but the state space is astronomically large."],
          ["Because finite-state programs are always undecidable", false, "Finite-state systems are decidable in principle (try all states), just hopelessly expensive."],
        ],
      },
    ],

    halting: [
      {
        q: "What does it mean that the halting problem is <em>undecidable</em>?",
        options: [
          ["No program ever halts", false, "Plenty of programs halt; we just cannot always tell which."],
          ["No procedure answers correctly, in finite time, for every program and input", true, "Some programs are easy to judge; the impossibility is about one procedure that works on all of them."],
          ["We have not yet found a fast enough algorithm", false, "It is not about speed. Turing proved no algorithm exists at all."],
        ],
      },
      {
        q: "The procedure \"run the program and answer yes when it stops\" is...",
        options: [
          ["a decider for halting", false, "On a non-terminating program it never answers no; it runs forever. A decider must always answer."],
          ["useless, since it can give wrong answers", false, "It never gives a wrong answer; when it says yes, the program did halt."],
          ["a recogniser for halting: correct yes-answers, but it may never answer", true, "Halting is recognisable (semi-decidable): you can confirm halting by watching it happen, not refute it."],
        ],
      },
      {
        q: "Using Proposition 1.3 (decidable iff both the set and its complement are r.e.), what follows about the set of programs that run forever?",
        options: [
          ["It is not even recognisable", true, "Halting is r.e. but not decidable, so its complement cannot be r.e. There is no procedure that confirms non-termination for every looping program."],
          ["It is decidable", false, "If it were, halting would be decidable too."],
          ["It is recognisable", false, "Then halting would be both r.e. and co-r.e., hence decidable, contradicting Turing."],
        ],
      },
      {
        q: "<code>countdown(n)</code> decrements <code>n</code> until it is 0. Which statement is right?",
        options: [
          ["It halts for every input, since it always counts down", false, "For negative $n$ it counts down away from 0. In 32-bit arithmetic it eventually wraps around, after about 4 billion steps, which JPAMB treats as <code>*</code>."],
          ["It halts for $n \\geq 0$ and runs (practically) forever for $n \\lt 0$; for this specific program we can tell", true, "Undecidability does not stop us from analysing particular programs; it stops one procedure from handling all programs."],
          ["Nobody can know, because halting is undecidable", false, "Undecidable means no general procedure, not that every individual case is mysterious."],
        ],
      },
    ],

    diagonal: [
      {
        q: "In <code>def main(): while does_halt(main): print(\"Running\")</code>, what happens if <code>does_halt(main)</code> returns <code>True</code>?",
        options: [
          ["main halts, confirming the answer", false, "The loop condition is True every time, so the loop never ends."],
          ["main crashes", false, "Nothing crashes; it prints forever."],
          ["main loops forever, so the answer True was wrong", true, "That is half of the contradiction; the other half is the False case."],
        ],
      },
      {
        q: "What exactly does the diagonal argument prove?",
        options: [
          ["Every halting heuristic is wrong on most programs", false, "Heuristics can be right on most programs. The proof only needs one counterexample per candidate."],
          ["For every candidate decider $h$ there is a program on which $h$ is wrong, so no correct total decider exists", true, "Build $D$ from $h$; $h$ is wrong about $D(D)$. Applies to every $h$."],
          ["Halting cannot even be recognised", false, "Halting is recognisable: run and wait."],
          ["Programs cannot refer to themselves", false, "They can; the proof relies on it (or on passing the program as its own input)."],
        ],
      },
      {
        q: "In the proof, $D(q) := \\textbf{if } h(q, q) \\textbf{ then loop else return}$. Why do we need $L$ to be Turing complete?",
        options: [
          ["To make $h$ run faster", false, "Speed plays no role."],
          ["To guarantee that $D$ can be written as a program in $L$, given that $h$ is computable", true, "The contradiction comes from $D$ being a program in the very language $h$ claims to decide."],
          ["Because only Turing-complete languages have loops", false, "Loops exist in weaker languages too; the point is that $L$ can express the computable $h$ plus a loop."],
        ],
      },
    ],

    rice: [
      {
        q: "Which property does Rice's theorem say is undecidable (for Java)?",
        options: [
          ["The method contains more than 10 lines", false, "That is syntactic: count the lines."],
          ["Every method either halts or not", false, "True of every program: a trivial property, decided by always answering yes."],
          ["The method's name starts with <code>assert</code>", false, "Syntactic again: look at the name."],
          ["The method may throw a division by zero for some input", true, "A non-trivial semantic property: some methods have it, some do not, and it depends only on behaviour."],
        ],
      },
      {
        q: "In the reduction <code>something_that_might_go_forever(); fire_the_nukes()</code>, why does deciding \"fires the nukes\" decide halting?",
        options: [
          ["Because the nukes fire exactly when the first call returns, i.e. exactly when it halts", true, "So a nuke-detector would answer the halting question for the first call."],
          ["Because firing the nukes takes forever", false, "Firing is instant; it is the first call that may take forever."],
          ["Because the program has no loops", false, "<code>something_that_might_go_forever</code> can contain any loops; that is the point."],
        ],
      },
      {
        q: "What does <em>semantic</em> mean in Rice's theorem?",
        options: [
          ["The property is about variable names", false, "Names are syntax."],
          ["If $\\Sem(p) = \\Sem(q)$, then $p$ and $q$ either both have the property or both lack it", true, "Only behaviour matters; that is what makes the reduction work, since the constructed program behaves exactly like $y$ or like $\\bot$."],
          ["The property can be checked by a parser", false, "That would make it syntactic and usually decidable."],
        ],
      },
      {
        q: "Why does the proof first assume that the never-halting program $\\bot$ is <em>not</em> in $P$?",
        options: [
          ["Because $\\bot$ is never in any property", false, "It can be: \"never divides by zero\" contains $\\bot$."],
          ["Because programs that never halt are not programs", false, "They are perfectly good programs."],
          ["So that the constructed $p'$ lands outside $P$ when $q$ loops; if $\\bot \\in P$, apply the argument to the complement instead", true, "The construction maps \"q loops\" to behaving like $\\bot$. For the reduction to separate the cases, $\\bot$ and $y$ must be on different sides of $P$."],
        ],
      },
    ],

    "may-must": [
      {
        q: "<code>divideByN(int n) { return 1 / n; }</code>. Which statement is true?",
        options: [
          ["It may divide by zero, and it may also end in ok", true, "$n = 0$ gives the error trace, $n = 1$ the ok trace."],
          ["It must divide by zero", false, "For $n = 1$ it returns normally, so not every trace divides by zero."],
          ["It must not divide by zero", false, "$n = 0$ is a counterexample."],
        ],
      },
      {
        q: "Which formula defines $p \\models^{\\must} Q$?",
        options: [
          ["$\\exists \\tau \\in \\Sem(p).\\ Q(\\tau)$", false, "That is the may property: some trace."],
          ["$\\forall \\tau \\in \\Sem(p).\\ \\neg Q(\\tau)$", false, "That is \"must not Q\", equivalently \"not may Q\"."],
          ["$\\forall \\tau \\in \\Sem(p).\\ Q(\\tau)$", true, "Must: every trace satisfies $Q$."],
          ["$Q(\\Sem(p))$", false, "$Q$ is a property of one trace, not of a set of traces."],
        ],
      },
      {
        q: "By duality, \"it is not the case that $p$ may crash\" is the same as...",
        options: [
          ["$p$ must crash", false, "Negating may does not give must of the same property; it gives must of the negated property."],
          ["$p$ may not crash", false, "\"May not crash\" (some trace does not crash) is the negation of \"must crash\", a different statement."],
          ["$p$ must not crash", true, "$\\neg \\exists \\tau.\\ \\mathit{crash}(\\tau) \\equiv \\forall \\tau.\\ \\neg\\mathit{crash}(\\tau)$."],
        ],
      },
      {
        q: "You want to prove a program is safe (never crashes). Which kind of property are you establishing?",
        options: [
          ["A must property: every trace satisfies \"does not crash\"", true, "Safety is a statement about all traces. Demonstrating a bug, in contrast, is a may property with one witness trace."],
          ["A may property: some trace does not crash", false, "One good run says nothing about the others."],
          ["Neither, safety is syntactic", false, "Crashing is behaviour, so it is a semantic, trace-based property."],
        ],
      },
    ],

    turnstiles: [
      {
        q: "What is the difference between $\\Sigma \\vdash \\Phi$ and $\\Sigma \\models \\Phi$?",
        options: [
          ["They are two notations for the same thing", false, "The whole point is that they can differ; soundness and completeness compare them."],
          ["$\\vdash$: there is a proof of $\\Phi$ from $\\Sigma$; $\\models$: $\\Phi$ is true whenever $\\Sigma$ is", true, "Provability is about rules and derivations, truth about meaning."],
          ["$\\vdash$ is for programs, $\\models$ for traces", false, "Both are used for programs and traces; one is proof, the other truth."],
        ],
      },
      {
        q: "An analysis reports \"may divide by zero\" for <code>return 1 / 2;</code>. In turnstile terms this is...",
        options: [
          ["$p \\models Q$ but $p \\nvdash Q$", false, "That would be a true fact the analysis failed to prove."],
          ["$p \\vdash Q$ and $p \\models Q$", false, "$1 / 2$ never divides by zero, so $Q$ is not true."],
          ["$p \\vdash Q$ but $p \\not\\models Q$: it proves something false", true, "It claims a division by zero that can never happen. That is a false positive."],
        ],
      },
      {
        q: "In program analysis, what plays the role of $\\vdash$?",
        options: [
          ["What the analysis reports", true, "The analysis is the proof system; its reports are the provable statements."],
          ["The program's actual behaviour", false, "Behaviour is the truth, $\\models$."],
          ["The compiler's error messages", false, "Those are one possible analysis, but in general $\\vdash$ is whatever the analysis derives."],
        ],
      },
    ],

    "sound-complete": [
      {
        q: "An analysis is sound when...",
        options: [
          ["every fact it reports is true", true, "$\\Sigma \\vdash \\Phi \\implies \\Sigma \\models \\Phi$: no false positives."],
          ["it finds every true fact", false, "That is completeness."],
          ["it terminates quickly", false, "Soundness is about correctness of reports, not speed."],
          ["it is both precise and fast", false, "Soundness alone says nothing about precision; the trivial analysis that reports nothing is sound."],
        ],
      },
      {
        q: "Which analysis is trivially complete for any property?",
        options: [
          ["The one that answers no to every program", false, "That one is trivially sound (it never claims anything false)."],
          ["The one that runs the program once", false, "Running once misses behaviours on other inputs, so it is not complete."],
          ["The one that answers yes to every program", true, "It claims everything, so it never misses a true fact. Worthless, but complete."],
        ],
      },
      {
        q: "Why can no always-terminating analysis be both sound and complete for an undecidable property?",
        options: [
          ["Because sound + complete means yes exactly on $P$, and if it always terminates it would decide $P$", true, "That contradicts undecidability. The proof is three lines once you see it."],
          ["Because sound analyses are always slow", false, "Speed is irrelevant to the argument."],
          ["Because completeness requires infinite memory", false, "The obstacle is logical (undecidability), not memory."],
        ],
      },
    ],

    "confusion-matrix": [
      {
        q: "The analysis claims $\\Phi$, but $\\Phi$ is false. This is a...",
        options: [
          ["true positive", false, "A true positive is a claim that is true."],
          ["false positive", true, "Claimed (positive) but wrong (false)."],
          ["false negative", false, "A false negative is a true fact that was not claimed."],
          ["true negative", false, "A true negative is a false fact that was correctly not claimed."],
        ],
      },
      {
        q: "A sound analysis has...",
        options: [
          ["no false negatives", false, "That is completeness."],
          ["no true negatives", false, "True negatives are fine; they are correct non-claims."],
          ["no false positives", true, "Every claim is true, so the FP box is empty; precision is 1."],
        ],
      },
      {
        q: "An analysis made 40 claims, 30 of them true, and there were 60 true facts in total. What are its precision and recall?",
        options: [
          ["precision 0.75, recall 0.5", true, "Precision = TP/(TP+FP) = 30/40. Recall = TP/(TP+FN) = 30/60."],
          ["precision 0.5, recall 0.75", false, "Swapped: precision is about the claims made, recall about the truths that exist."],
          ["precision 0.3, recall 0.6", false, "These are not ratios of the right counts."],
        ],
      },
    ],

    "soundness-confusion": [
      {
        q: "A type checker accepts only programs that cannot have a type error at run time. In the program-based view it is...",
        options: [
          ["complete", false, "Complete would mean it accepts every correct program, which type checkers typically do not."],
          ["sound", true, "It only accepts correct programs; it may reject some correct ones (incomplete)."],
          ["neither", false, "\"Only accepts correct programs\" is the definition of program-based soundness."],
        ],
      },
      {
        q: "A sound checker $A_G$ (\"bug-free?\") is turned into a bug finder $A_B = \\neg A_G$. Then $A_B$ is...",
        options: [
          ["sound for bugs: every reported bug is real", false, "A sound checker may reject good programs, and those become reported \"bugs\" that are not real."],
          ["neither sound nor complete", false, "Proposition 1.26: the soundness of $A_G$ is exactly the completeness of $A_B$."],
          ["complete for bugs: every buggy program is reported", true, "Contrapositive of soundness: if $p$ is buggy, $A_G$ cannot accept it, so $A_B$ flags it."],
        ],
      },
      {
        q: "A static analysis vendor says \"our sound analysis has no false negatives\". Which view are they using?",
        options: [
          ["The trace (bug-warning) view: a missed bug is a false negative", true, "Bug-finder users count warnings. In that view a missed bug is an FN, so \"sound = no FN\", inconsistent with the theory's naming. Always ask what is being reported."],
          ["The program view of the theory", false, "In the program view, soundness rules out false positives."],
          ["The definition of completeness", false, "They do call it soundness; the confusion is in what counts as positive."],
        ],
      },
    ],

    "may-must-analysis": [
      {
        q: "A may analysis over-approximates the traces. If none of its traces divides by zero, what do you know?",
        options: [
          ["The program may divide by zero", false, "The opposite: it has excluded division by zero."],
          ["The program must not divide by zero", true, "Every real trace is among its traces (Proposition 1.30a), so no real trace divides by zero."],
          ["Nothing, it may have missed traces", false, "An over-approximation cannot miss real traces; that is its defining guarantee."],
        ],
      },
      {
        q: "A must analysis (under-approximation) contains a trace that throws an assertion error. Conclusion?",
        options: [
          ["The program must throw on every input", false, "One trace shows possibility, not necessity."],
          ["It could be a false warning", false, "Under-approximations contain only real traces; no false warnings."],
          ["The program may throw an assertion error: the trace is real", true, "Every trace of a must analysis is real (Proposition 1.30b), so you even have a witness."],
        ],
      },
      {
        q: "Which statement is the duality of analyses?",
        options: [
          ["$\\neg(p \\vdash^{\\neg\\mathsf{may}}_{\\mathbf{A}} Q) \\equiv p \\vdash^{\\mathsf{must}}_{\\mathbf{A}} \\neg Q$", true, "A complete not-may analysis that does not report $Q$ gives a sound must-claim that $Q$ never happens."],
          ["$p \\vdash^{\\mathsf{may}}_{\\mathbf{A}} Q \\equiv p \\vdash^{\\mathsf{must}}_{\\mathbf{A}} Q$", false, "May and must claims are different questions."],
          ["$p \\models^{\\mathsf{may}} Q \\implies p \\models^{\\mathsf{must}} Q$", false, "Some trace does not imply all traces."],
        ],
      },
      {
        q: "According to the course, what is a <em>warning</em>?",
        options: [
          ["A program-level verdict \"this program is buggy\"", false, "Warnings classify traces: a reported (possible) buggy execution."],
          ["A specific bug reported in the program, i.e. a classification over traces", true, "Using \"warning\" avoids the positive/negative confusion. A sound static analysis may give false warnings; a sound dynamic analysis never does."],
          ["A compiler message about style", false, "Not in this course's terminology."],
        ],
      },
    ],

    soundiness: [
      {
        q: "What is a <em>soundy</em> analysis?",
        options: [
          ["An analysis that is accidentally sound", false, "Soundiness is a deliberate, documented trade-off."],
          ["An analysis that only makes sounds when it finds bugs", false, "A pun, not a definition."],
          ["An analysis that is sound except for a documented set of hard language features", true, "E.g. sound for Java without reflection. The manifesto asks authors to be explicit about these exceptions."],
        ],
      },
      {
        q: "How does this course relax the goal of sound or complete analyses?",
        options: [
          ["It treats analyses as classifiers that report facts with confidence, aiming for the best result in the shortest time", true, "JPAMB scores calibrated bets rather than demanding soundness."],
          ["It allows unbounded running time", false, "The opposite: it rewards speed."],
          ["It only considers decidable languages", false, "JPAMB is Java, Turing complete."],
        ],
      },
      {
        q: "An analysis is calibrated if...",
        options: [
          ["it is always right", false, "Then it would be sound and complete."],
          ["among predictions made with confidence $c$, a fraction $c$ is true", true, "\"80% sure\" should be right 80% of the time; JPAMB's categories compute these fractions."],
          ["it gives 50% for everything", false, "That is calibrated only if exactly half of everything is true, and it earns nothing (wager 0)."],
        ],
      },
    ],

    "manual-automatic": [
      {
        q: "What distinguishes manual from automatic analysis?",
        options: [
          ["Whether the program is run", false, "That is dynamic vs static."],
          ["Whether it looks at text or meaning", false, "That is syntactic vs semantic."],
          ["Whether we have a well-defined procedure for analysing the code", true, "Automatic = a fixed procedure; manual = human judgement."],
        ],
      },
      {
        q: "In program verification, the user writes a proof and a tool checks it. Why does this not contradict Rice's theorem?",
        options: [
          ["Checking a given proof is decidable; the undecidable part (finding the proof or invariant) is done by the human", true, "Proposition 1.34: checking is mechanical, searching is not."],
          ["Verification tools only work on terminating programs", false, "Verifiers can even prove non-termination or handle loops with invariants."],
          ["Rice's theorem does not apply to Java", false, "It does."],
        ],
      },
      {
        q: "Why is manual inspection still called a crucial companion to automatic analysis?",
        options: [
          ["Humans are faster than tools", false, "Usually not."],
          ["Humans know intent, conventions and specifications that tools cannot see", true, "Tools find facts; deciding which facts are bugs often needs a human (see the memory-leak story in Week 4)."],
          ["Tools cannot read Java", false, "They can."],
        ],
      },
    ],

    "syntactic-semantic": [
      {
        q: "<code>return 1 + 2;</code> and <code>return 2 + 1;</code>: which statement is right?",
        options: [
          ["They have the same syntax and different semantics", false, "Reversed: the text differs, the behaviour is the same."],
          ["They differ in both", false, "Both return 3 on every run: same set of traces up to that value."],
          ["They have different syntax trees but the same semantics", true, "A semantic property cannot tell them apart; a syntactic one (\"left operand is 1\") can."],
        ],
      },
      {
        q: "In this course, the meaning of a program is represented as...",
        options: [
          ["the set of all its possible traces", true, "Sequences of states and operations the program can go through: $\\Sem(p)$."],
          ["its abstract syntax tree", false, "That is its structure (syntax)."],
          ["its source code with comments", false, "Comments carry intent, not meaning in this formal sense."],
        ],
      },
      {
        q: "Why are syntactic properties usually decidable?",
        options: [
          ["Because syntactic properties are trivial", false, "\"Contains a division\" is non-trivial and decidable; Rice only talks about semantic properties."],
          ["Because a program's text is finite, so a traversal of its syntax tree terminates", true, "No running, no loops to follow: just walk the finite tree."],
          ["Because parsers are Turing complete", false, "That would make things harder, not easier."],
        ],
      },
    ],

    "dynamic-static": [
      {
        q: "Which analysis naturally provides a concrete input that triggers a bug?",
        options: [
          ["Static analysis", false, "Static analyses reason about all traces at once and often cannot exhibit a concrete one."],
          ["Syntactic analysis", false, "It never runs anything, so it has no inputs to report."],
          ["Dynamic analysis", true, "It ran the program on some input and saw the bug: the input is the witness."],
        ],
      },
      {
        q: "A static analysis says \"this method can never throw an assertion error\". If it is a good (sound) static analysis...",
        options: [
          ["you can trust the claim; its typical mistake is false warnings in the other direction", true, "Static analyses over-approximate, so absence claims are reliable; possible-bug reports may be false alarms."],
          ["you should run tests to double-check, because static analyses miss behaviours", false, "Missing behaviours is the typical mistake of dynamic analyses (under-approximation)."],
          ["the claim is probably false", false, "Sound static analyses do not claim absence falsely."],
        ],
      },
      {
        q: "What is a hybrid analysis?",
        options: [
          ["An analysis that is both sound and complete", false, "Impossible for undecidable properties."],
          ["A combination of dynamic and static analysis", true, "E.g. a static scan for constants feeding a fuzzer, or running the program to confirm static warnings."],
          ["An analysis written in two programming languages", false, "Not what the term means."],
        ],
      },
    ],

    jpamb: [
      {
        q: "In JPAMB, the <code>@Case</code> annotations of a method are exhaustive. What does that mean?",
        options: [
          ["Every possible input is listed", false, "Only one example input per outcome is listed."],
          ["The analyser may read the annotations", false, "Reading them is cheating; the analyser must predict without them."],
          ["Every outcome that some input can cause is listed; unlisted outcomes cannot happen", true, "So the set of outcomes in the cases is exactly $B(m)$."],
        ],
      },
      {
        q: "What does the method id <code>jpamb.cases.Simple.assertPositive:(I)V</code> tell you?",
        options: [
          ["Class <code>jpamb.cases.Simple</code>, method <code>assertPositive</code>, one <code>int</code> argument, returns <code>void</code>", true, "<code>I</code> = int, <code>V</code> = void. <code>Z</code> would be boolean, <code>[C</code> a char array."],
          ["The method takes no arguments and returns an int", false, "<code>(I)</code> lists the arguments: one int. <code>V</code> after the parentheses is the return type, void."],
          ["Input value 1 and the outcome V for valid", false, "These are JVM type descriptors, not values."],
        ],
      },
      {
        q: "A JPAMB query \"can <code>divide by zero</code> happen in $m$?\" is which kind of question?",
        options: [
          ["A must question: does every input divide by zero?", false, "One input is enough for the outcome to be in $B(m)$."],
          ["A may question: does some trace end in divide by zero?", true, "$o \\in B(m) \\iff m \\models^{\\may}$ (ends in $o$). Answering \"no\" is the must-claim that no trace ends in $o$."],
          ["A syntactic question", false, "It is about behaviour, though syntactic analyses can try to guess it."],
        ],
      },
      {
        q: "What does the outcome <code>*</code> mean?",
        options: [
          ["Any outcome is possible", false, "<code>*</code> is one specific outcome."],
          ["The analyser crashed", false, "That would simply give no valid predictions."],
          ["The method runs forever (infinite loop)", true, "In practice the interpreter gives up after a step budget, as in the lab of topic 02."],
        ],
      },
    ],

    scoring: [
      {
        q: "You wager $w = 4$ that an outcome happens. How many points if you are right, and if you are wrong?",
        options: [
          ["$+0.8$ and $-4$", true, "Right: $1 - \\frac{1}{|w|+1} = 0.8$. Wrong: $-|w| = -4$. Big bets are only worth it when you are very sure."],
          ["$+4$ and $-4$", false, "Wins are capped below 1 point: $1 - \\frac{1}{4+1} = 0.8$."],
          ["$+0.2$ and $-0.8$", false, "Losing costs the whole stake, $-4$."],
        ],
      },
      {
        q: "What wager does JPAMB place for a percentage of 75%?",
        options: [
          ["$0.75$", false, "Percentages are converted by $w(p) = \\frac{2p - 1}{2(1 - p)}$."],
          ["$3$", false, "$3$ is the odds ratio $0.75 / 0.25$, not JPAMB's wager."],
          ["$1$", true, "$\\frac{2 \\cdot 0.75 - 1}{2 \\cdot 0.25} = \\frac{0.5}{0.5} = 1$."],
          ["$-1$", false, "Negative wagers are for percentages below 50%."],
        ],
      },
      {
        q: "Why do categories (like <code>yes</code>/<code>no</code>) never lose infinitely many points?",
        options: [
          ["JPAMB caps every wager at 10", false, "There is no cap; percentages of exactly 0% or 100% give infinite wagers."],
          ["Categories are ignored in the score", false, "They are the preferred way to predict."],
          ["A category gets $p_c = 1$ (infinite bet) only if all its predictions were true, so that bet never loses", true, "The percentage is measured on the very predictions it is used for. Likewise $p_c = 0$ only if all were false."],
        ],
      },
      {
        q: "For assertFalse, assertTrue and doNothing, predicting 50% when <code>assert</code> appears and 0% otherwise scores...",
        options: [
          ["$1$", true, "50% gives wager 0 (0 points either way) on the two methods with <code>assert</code>; 0% gives $-\\infty$ on doNothing, which is right and earns 1."],
          ["$-\\infty$", false, "That is the result of betting infinitely on \"contains assert\"."],
          ["$0$", false, "That is the result of betting 1 point."],
        ],
      },
    ],

    "first-analysis": [
      {
        q: "A text-search analysis prints <code>divide by zero;found-div</code> when it sees <code>/</code>. What is <code>found-div</code>?",
        options: [
          ["A wager of size zero", false, "It is not a number."],
          ["A category: JPAMB groups all <code>found-div</code> predictions and uses the fraction that were true as the percentage", true, "You never pick the percentage yourself; the benchmark calibrates it."],
          ["An error message", false, "It is a valid prediction."],
        ],
      },
      {
        q: "Why does a text search for <code>/</code> earn points even though it is neither sound nor complete?",
        options: [
          ["Because every method with <code>/</code> divides by zero", false, "<code>1 / 2</code> never does."],
          ["Because JPAMB gives points for every answer", false, "Wrong bets lose points."],
          ["Because methods containing <code>/</code> divide by zero more often than methods without, and categories turn that correlation into calibrated bets", true, "The score depends on how well the match separates the two groups across the benchmark."],
        ],
      },
      {
        q: "Which method fools the <code>/</code> search into a false positive?",
        options: [
          ["<code>return 1 / 2;</code>", true, "There is a <code>/</code> but the divisor is never zero."],
          ["<code>return 1 / n;</code>", false, "For $n = 0$ it really divides by zero: a true positive."],
          ["<code>return 1 / 0;</code>", false, "Always divides by zero: a true positive."],
        ],
      },
    ],
  };

  /* =====================================================================
     Shared helpers
     ===================================================================== */
  const J = PA.jvm;
  const svgNS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, kids) {
    const el = document.createElementNS(svgNS, tag);
    for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
    (kids || []).forEach((c) => c != null && el.append(c));
    return el;
  }
  function svgText(x, y, str, cls, anchor) {
    const t = svg("text", { x, y, class: cls || "", "text-anchor": anchor || "start" });
    t.textContent = str;
    return t;
  }
  const fmtNum = (x, d) => (x === Infinity ? "∞" : x === -Infinity ? "−∞" : Number.isInteger(x) ? String(x).replace("-", "−") : x.toFixed(d == null ? 2 : d).replace("-", "−"));
  const pill = (txt, cls) => '<span class="pill ' + (cls || "") + '">' + PA.esc(txt) + "</span>";
  const outcomeCls = (o) => (o === "ok" ? "ok" : o === "*" ? "maybe" : "err");

  /* JPAMB scoring (docs/rules.md) */
  function wagerOf(p) {
    let sign = 1;
    if (p < 0.5) { p = 1 - p; sign = -1; }
    if (p >= 1) return sign * Infinity;
    return (sign * (1 - 2 * p)) / (-1 + p) / 2;
  }
  function scoreOf(w, happens) {
    if (w === 0) return 0;
    const right = (w > 0) === happens;
    const a = Math.abs(w);
    if (right) return a === Infinity ? 1 : 1 - 1 / (a + 1);
    return -a;
  }

  /* =====================================================================
     Lab 1: step machine
     ===================================================================== */
  function labStepMachine(el) {
    const { controls, view } = PA.lab(el, {
      title: "Run a program to its fixpoint (or not)",
      hint: "Pick a program and an input, then Step or Run. Every step applies the step function once. Watch for the fixpoint, and notice what you learn when the budget runs out.",
    });
    const progSel = PA.select(controls, {
      label: "Program",
      options: [["countdown", "countdown(n)"], ["collatz", "collatz(n)"], ["sumTo", "sumTo(n)"], ["infiniteLoop", "infiniteLoop()"]],
      value: "countdown",
    });
    const nSl = PA.slider(controls, { label: "Input <code>n</code>", min: -3, max: 27, value: 3 });
    const budget = PA.slider(controls, { label: "Step budget", min: 10, max: 2000, step: 10, value: 60 });
    const btns = PA.btnRow(controls);
    const javaBox = h("div");
    const listWrap = h("div", { style: "display:grid;gap:10px;align-content:start;min-width:0" });
    const stateEl = h("div", { class: "state" });
    const stats = PA.stats(h("div"), [{ key: "steps", label: "Steps taken" }, { key: "status", label: "Status" }]);
    const strip = h("div", { class: "trace-strip", "aria-label": "Trace" });
    const verdict = h("div", { class: "verdict" });
    view.append(
      h("div", { class: "split" }, [listWrap, h("div", { style: "display:grid;gap:10px;align-content:start" }, [stateEl, stats.wrap])]),
      h("div", { class: "panel" }, [h("div", { class: "panel-title", text: "Trace: one box per state (pc : locals)" }), strip]),
      verdict
    );

    let prog, lst, st, steps, done, trace;
    function load() {
      prog = J.get(progSel.value);
      const hasArg = prog.params.length > 0;
      nSl.input.disabled = !hasArg;
      nSl.wrap.style.opacity = hasArg ? "" : "0.45";
      lst = J.listing(prog);
      listWrap.innerHTML = "";
      javaBox.innerHTML = "";
      javaBox.append(PA.codeBlock(prog.java, "java"));
      listWrap.append(javaBox, lst.el);
      reset();
    }
    function reset() {
      st = J.initState(prog, prog.params.length ? [nSl.value] : []);
      steps = 0; done = null;
      trace = [snap(st)];
      render();
    }
    function snap(s) {
      const f = s.frames[s.frames.length - 1];
      return { off: f.pc.off, locals: f.locals.map((v) => (v ? v.v : "·")) };
    }
    function stepOnce() {
      if (done || steps >= budget.value) return false;
      const r = J.step(st);
      steps++;
      if (r.outcome) { done = r.outcome; trace.push({ end: r.outcome }); }
      else { st = r.state; trace.push(snap(st)); }
      return true;
    }
    function runAll() { while (stepOnce()); render(); }
    function render() {
      const f = st.frames[st.frames.length - 1];
      lst.mark({ cur: done ? null : f.pc.off, err: done && done !== "ok" ? f.pc.off : null });
      stateEl.innerHTML = "";
      [["locals λ", f.locals.map(J.fmtVal).join(" ") || "[ ]"], ["stack σ", J.fmtStack(f.stack)], ["pc ι", done ? "(finished)" : String(f.pc.off)]].forEach(([k, v]) =>
        stateEl.append(h("div", { class: "state-row" }, [h("span", { class: "state-k", text: k }), h("span", { class: "state-v", text: v })])));
      stats.set("steps", steps + " / " + budget.value);
      stats.set("status", done ? (done === "ok" ? "fixpoint: ok" : done) : steps >= budget.value ? "budget used" : "running", done ? (done === "ok" ? "good" : "bad") : steps >= budget.value ? "warn" : "");
      // trace strip, last 60 entries
      strip.innerHTML = "";
      const show = trace.slice(-60);
      if (trace.length > 60) strip.append(h("span", { class: "arrow", text: "… " + (trace.length - 60) + " earlier …" }));
      show.forEach((s, i) => {
        if (i > 0) strip.append(h("span", { class: "arrow", text: "→" }));
        if (s.end) strip.append(h("span", { class: "ts " + (s.end === "ok" ? "end-ok" : "end-err"), text: s.end === "ok" ? "ok ↺" : s.end }));
        else strip.append(h("span", { class: "ts" + (i === show.length - 1 && !done ? " on" : ""), text: s.off + " : " + s.locals.join(",") }));
      });
      const n = nSl.value, id = prog.id;
      let extra = "";
      if (id === "collatz" && n > 0) extra = " For Collatz this is exactly the open problem: every positive n anyone has tried reaches 1, but nobody can prove it for all n.";
      if (id === "collatz" && n <= 0) extra = " Here it really never halts: 0 stays 0 forever, and negative numbers fall into cycles such as −1, −2, −1.";
      if (id === "countdown" && n < 0) extra = " countdown(" + n + ") moves away from 0. With 32-bit integers it would wrap around after about 4 billion steps, which JPAMB treats as running forever (*).";
      if (id === "infiniteLoop") extra = " goto 0 jumps back to itself: the state repeats, but it is not a fixpoint, since the step function is applied forever without reaching a final state.";
      if (id === "sumTo" && n > 40) extra = " sumTo does halt for every n, but needs about 9n steps: a too-small budget makes a halting program look like a looping one.";
      if (done === "ok") {
        verdict.className = "verdict good";
        verdict.innerHTML = "<b>Fixpoint reached after " + steps + " steps.</b> The program halted with <code>ok</code>; stepping the final state changes nothing (↺). We now <em>know</em> it halts on this input." + PA.esc(extra);
      } else if (done) {
        verdict.className = "verdict bad";
        verdict.innerHTML = "<b>Halted with an error:</b> " + PA.esc(done) + ".";
      } else if (steps >= budget.value) {
        verdict.className = "verdict warn";
        verdict.innerHTML = "<b>Budget of " + budget.value + " steps used up, still running.</b> It might halt at the next step, or never. Running can confirm halting, but can never confirm non-termination." + PA.esc(extra);
      } else {
        verdict.className = "verdict";
        verdict.innerHTML = "Running. Next instruction: <code>" + PA.esc(J.fmtIns(prog.code[f.pc.off])) + "</code>";
      }
    }
    PA.button(btns, "Step", () => { stepOnce(); render(); }, "primary");
    PA.button(btns, "Run", runAll);
    PA.button(btns, "Reset", reset);
    progSel.onchange = load;
    nSl.onchange = reset;
    budget.onchange = render;
    load();
  }

  /* =====================================================================
     Lab 2: the paradox
     ===================================================================== */
  function labParadox(el) {
    const { controls, view } = PA.lab(el, {
      title: "Every halting decider is wrong somewhere",
      hint: "First play both possible answers of does_halt(main). Then pick a plausible-looking decider: the lab builds the diagonal program D against it and shows where it fails.",
    });
    const ans = PA.seg(controls, { label: "Suppose <code>does_halt(main)</code> returns", options: [["T", "True"], ["F", "False"]], value: "T" });
    const cand = PA.select(controls, {
      label: "Candidate decider <code>h</code>",
      options: [["true", "always True"], ["false", "always False"], ["sim", "simulate 1000 steps"], ["while", "True iff no while loop"]],
      value: "sim",
    });

    const walk = h("div", { class: "panel" });
    const beat = h("div", { class: "panel" });
    view.append(walk, beat);

    const mainSrc = 'def main():\n    while does_halt(main):\n        print("Running")';
    function renderWalk() {
      const T = ans.value === "T";
      const steps = T
        ? ["The oracle predicts: <b>main halts</b>.", "The loop condition <code>does_halt(main)</code> is True, so the body runs; then it is checked again: still True.", "main prints <code>Running</code> forever: it <b>does not halt</b>."]
        : ["The oracle predicts: <b>main runs forever</b>.", "The loop condition is False on the very first check, so the body never runs.", "main returns immediately: it <b>halts</b>."];
      walk.innerHTML = '<div class="panel-title">Part 1: the notes\' argument</div>';
      walk.append(PA.codeBlock(mainSrc, "python"));
      const ol = h("ol", { class: "chain" });
      steps.forEach((s) => ol.append(h("li", { html: s })));
      ol.append(h("li", { class: "chain-bad", html: "<b>Contradiction:</b> the oracle answered " + (T ? "True" : "False") + ", but main " + (T ? "does not halt" : "halts") + ". " + (T ? "Now try False." : "And True failed too.") }));
      walk.append(ol);
    }

    const ORD = [["countdown", 3], ["countdown", -1], ["collatz", 6], ["sumTo", 200], ["infiniteLoop", null]];
    function truthOf(id, n) { return J.run(id, n == null ? [] : [n], { maxSteps: 20000 }).outcome !== "*"; }
    const TRUTH = ORD.map(([id, n]) => truthOf(id, n));
    function decide(kind, id, n) {
      if (kind === "true") return true;
      if (kind === "false") return false;
      if (kind === "sim") return J.run(id, n == null ? [] : [n], { maxSteps: 1000 }).outcome !== "*";
      return !/\bwhile\b/.test(J.get(id).java.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n"));
    }
    const INFO = {
      true: { says: "True", why: "it says True to every program.", d: "D enters <code>while True</code> and never halts." },
      false: { says: "False", why: "it says False to every program.", d: "D skips the loop and returns: it halts." },
      sim: { says: "False", why: "to simulate D it must simulate D's first action, which is calling h(D), which simulates D again, and so on. Each level costs more than 1000 steps of the level above, so the simulation never finishes within its budget.", d: "D skips the loop and returns: it halts." },
      while: { says: "False", why: "D's code contains <code>while True</code>.", d: "D skips the loop and returns: it halts. Having a loop is not the same as running it forever." },
    };
    function renderBeat() {
      const k = cand.value, info = INFO[k];
      beat.innerHTML = '<div class="panel-title">Part 2: the diagonal program against <code>h</code></div>';
      beat.append(PA.codeBlock("def D():\n    if h(D):              # h = " + cand.select.options[cand.select.selectedIndex].text + "\n        while True: pass\n    return", "python"));
      const tbl = h("table", { class: "dt" });
      tbl.innerHTML = "<thead><tr><th>Program</th><th>Really</th><th>h says</th><th></th></tr></thead>";
      const tb = h("tbody");
      let right = 0;
      ORD.forEach(([id, n], i) => {
        const says = decide(k, id, n), truth = TRUTH[i], ok = says === truth;
        if (ok) right++;
        tb.append(h("tr", { class: ok ? "" : "bad" }, [
          h("td", { class: "mono", text: id + (n == null ? "()" : "(" + n + ")") }),
          h("td", { text: truth ? "halts" : "loops" }),
          h("td", { text: says ? "halts" : "loops" }),
          h("td", { html: ok ? '<span class="pill ok">right</span>' : '<span class="pill err">wrong</span>' }),
        ]));
      });
      tb.append(h("tr", { class: "bad" }, [h("td", { class: "mono", html: "<b>D()</b>" }), h("td", { text: info.says === "True" ? "loops" : "halts" }), h("td", { text: info.says === "True" ? "halts" : "loops" }), h("td", { html: '<span class="pill err">wrong</span>' })]));
      tbl.append(tb);
      beat.append(h("div", { class: "table-wrap" }, [tbl]));
      beat.append(h("div", { class: "verdict bad", html: "<b>h(D) = " + info.says + "</b> because " + info.why + " Then " + info.d + " So h is wrong on D. It was right on " + right + " of " + ORD.length + " ordinary programs, which is the point: heuristics can be useful, but none is a decider." }));
    }
    ans.onchange = renderWalk;
    cand.onchange = renderBeat;
    renderWalk();
    renderBeat();
  }

  /* =====================================================================
     Lab 3: Rice reduction
     ===================================================================== */
  function labReduction(el) {
    const { controls, view } = PA.lab(el, {
      title: "Hide a halting question inside any property",
      hint: "Choose a behavioural property and a program p whose halting is in question. The lab builds p′ = \"run p, then do the thing\". p′ has the property exactly when p halts.",
    });
    const prop = PA.select(controls, { label: "Property P", options: [["nukes", "fires the nukes"], ["div", "may divide by zero"], ["ret", "returns 42"]], value: "nukes" });
    const pSel = PA.select(controls, { label: "Program p", options: [["countdown", "countdown(n)"], ["collatz", "collatz(n)"], ["infiniteLoop", "infiniteLoop()"]], value: "collatz" });
    const nSl = PA.slider(controls, { label: "Input <code>n</code>", min: -3, max: 30, value: 7 });
    const budget = PA.slider(controls, { label: "How long we are willing to watch p", min: 50, max: 3000, step: 50, value: 500, fmt: (v) => v + " steps" });
    const codeBox = h("div");
    const stats = PA.stats(h("div"), [{ key: "halt", label: "p halted?" }, { key: "prop", label: "p′ has P?" }, { key: "steps", label: "Steps of p" }]);
    const verdict = h("div", { class: "verdict" });
    const explain = h("div", { class: "callout key" });
    view.append(codeBox, stats.wrap, verdict, explain);
    const THING = { nukes: ["fire_the_nukes()", "the nukes are fired"], div: ["return 1 / 0", "it divides by zero"], ret: ["return 42", "it returns 42"] };
    function update() {
      const prog = J.get(pSel.value);
      const hasArg = prog.params.length > 0;
      nSl.input.disabled = !hasArg;
      nSl.wrap.style.opacity = hasArg ? "" : "0.45";
      const call = prog.id + (hasArg ? "(" + nSl.value + ")" : "()");
      const [stmt, desc] = THING[prop.value];
      codeBox.innerHTML = "";
      codeBox.append(PA.codeBlock("def p_prime():\n    " + call + (" ".repeat(Math.max(1, 22 - call.length))) + "# run p: may never return\n    " + stmt + (" ".repeat(Math.max(1, 22 - stmt.length))) + "# only reached if p halts", "python"));
      const r = J.run(prog, hasArg ? [nSl.value] : [], { maxSteps: budget.value });
      const halted = r.outcome !== "*";
      stats.set("halt", halted ? "yes" : "unknown", halted ? "good" : "warn");
      stats.set("prop", halted ? "yes" : "not yet", halted ? "bad" : "warn");
      stats.set("steps", halted ? String(r.steps) : "> " + budget.value);
      if (halted) {
        verdict.className = "verdict bad";
        verdict.innerHTML = "<b>p halted after " + r.steps + " steps,</b> so p′ gets past its first line and " + desc + ": p′ ∈ P.";
      } else {
        verdict.className = "verdict warn";
        verdict.innerHTML = "<b>After " + budget.value + " steps p is still running.</b> If it never halts, p′ never reaches the second line, and p′ ∉ P. Watching longer can turn this into a yes, never into a no.";
      }
      explain.innerHTML = '<span class="co-tag">Why this kills every decider for P</span>For every p we get: p′ has the property ⇔ p halts. A decider for "' + PA.esc(prop.select.options[prop.select.selectedIndex].text) + '" applied to p′ would therefore decide halting for p. Halting is undecidable, so no such decider exists. Only behaviour mattered, never how p′ is written: that is why the argument works for <em>every</em> non-trivial semantic property.';
    }
    [prop, pSel, nSl, budget].forEach((c) => (c.onchange = update));
    update();
  }

  /* =====================================================================
     Lab 4: may and must over a set of traces
     ===================================================================== */
  function labTraces(el) {
    const { controls, view } = PA.lab(el, {
      title: "May, must and duality on real traces",
      hint: "The table lists the traces of the program for every input in the range (each row is one trace: the program counters visited). Choose a property Q; the rows where Q holds light up.",
    });
    const progSel = PA.select(controls, {
      label: "Program",
      options: [["divideByN", "divideByN(n)"], ["assertPositive", "assertPositive(num)"], ["checkTheWrongThing", "checkTheWrongThing(a)"], ["checkBeforeDivideByN", "checkBeforeDivideByN(n)"], ["divideAfterCheck", "divideAfterCheck(x)"]],
      value: "divideByN",
    });
    const kSl = PA.slider(controls, { label: "Inputs from −k to k", min: 1, max: 4, value: 2, fmt: (v) => "k = " + v });
    const qSel = PA.select(controls, {
      label: "Property Q(τ)",
      options: [["ok", "τ ends in ok"], ["err", "τ ends in an error"], ["div", "τ ends in divide by zero"], ["assert", "τ ends in assertion error"], ["pc", "τ executes instruction j"]],
      value: "div",
    });
    const jSl = PA.slider(controls, { label: "Instruction j", min: 0, max: 3, value: 2 });
    const codeBox = h("div");
    controls.append(codeBox);
    const tableBox = h("div", { class: "table-wrap" });
    const res = h("div", { class: "panel" });
    view.append(tableBox, res);

    function Q(kind, r) {
      if (kind === "ok") return r.outcome === "ok";
      if (kind === "err") return r.outcome !== "ok" && r.outcome !== "*";
      if (kind === "div") return r.outcome === "divide by zero";
      if (kind === "assert") return r.outcome === "assertion error";
      return r.path.indexOf(jSl.value) !== -1;
    }
    function update() {
      const prog = J.get(progSel.value);
      jSl.input.max = prog.code.length - 1;
      if (jSl.value > prog.code.length - 1) jSl.set(prog.code.length - 1);
      const pcMode = qSel.value === "pc";
      jSl.input.disabled = !pcMode;
      jSl.wrap.style.opacity = pcMode ? "" : "0.45";
      codeBox.innerHTML = "";
      codeBox.append(J.listing(prog, { title: prog.methodId }).el);
      const k = kSl.value;
      const rows = [];
      for (let x = -k; x <= k; x++) {
        const r = J.run(prog, [x], { maxSteps: 500 });
        rows.push({ x, r, q: Q(qSel.value, r) });
      }
      const t = h("table", { class: "dt" });
      t.innerHTML = "<thead><tr><th>input</th><th>trace (program counters)</th><th>ends in</th><th>Q(τ)</th></tr></thead>";
      const tb = h("tbody");
      rows.forEach(({ x, r, q }) => {
        const strip = h("div", { class: "trace-strip" });
        r.path.forEach((o, i) => {
          if (i) strip.append(h("span", { class: "arrow", text: "→" }));
          strip.append(h("span", { class: "ts" + (pcMode && o === jSl.value ? " on" : ""), text: String(o) }));
        });
        tb.append(h("tr", { class: q ? "good" : "" }, [
          h("td", { class: "mono", text: String(x) }), h("td", null, [strip]),
          h("td", { html: pill(r.outcome, outcomeCls(r.outcome)) }),
          h("td", { html: q ? '<span class="pill ok">true</span>' : '<span class="pill mute">false</span>' }),
        ]));
      });
      t.append(tb);
      tableBox.innerHTML = "";
      tableBox.append(t);

      const may = rows.some((r) => r.q), must = rows.every((r) => r.q), mustNot = rows.every((r) => !r.q);
      const wit = rows.find((r) => r.q), ce = rows.find((r) => !r.q);
      res.innerHTML = '<div class="panel-title">Evaluated on these ' + rows.length + " traces</div>";
      const lines = [
        ["p \\models^{\\may} Q \\;\\equiv\\; \\exists \\tau.\\ Q(\\tau)", may, may ? "witness: input " + wit.x : "no trace satisfies Q"],
        ["p \\models^{\\must} Q \\;\\equiv\\; \\forall \\tau.\\ Q(\\tau)", must, must ? "every trace satisfies Q" : "counterexample: input " + ce.x],
        ["p \\models^{\\must} \\neg Q \\;\\equiv\\; \\forall \\tau.\\ \\neg Q(\\tau)", mustNot, mustNot ? "no trace satisfies Q" : "counterexample: input " + wit.x],
      ];
      lines.forEach(([tex, v, why]) => res.append(h("div", { class: "qline" }, [h("span", { class: "qtex", html: PA.tex(tex) }), h("span", { html: v ? '<span class="pill ok">true</span>' : '<span class="pill err">false</span>' }), h("span", { class: "qwhy", text: why })])));
      res.append(h("div", { class: "verdict good", html: "<b>Duality check:</b> ¬(may Q) is " + !may + " and must ¬Q is " + mustNot + ": " + (!may === mustNot ? "equal, as Proposition 1.17 promises." : "different (this cannot happen).") }));
      res.append(h("p", { class: "lab-hint", style: "margin:8px 0 0", html: "Careful: the real $\\Sem(p)$ has a trace for each of the $2^{32}$ ints. Over this sample, a true <em>may</em> is reliable (the witness is real); a true <em>must</em> is only a hint, since an input outside the range might break it." }));
      PA.math(res);
    }
    [progSel, kSl, qSel, jSl].forEach((c) => (c.onchange = update));
    update();
  }

  /* =====================================================================
     Lab 5: classifier (confusion matrix)
     ===================================================================== */
  function labClassifier(el) {
    const { controls, view } = PA.lab(el, {
      title: "Tune an analysis: where do the mistakes go?",
      hint: "Each dot is a program. The analysis computes a suspicion score (x axis) and accepts a program as good when the score is below the threshold. Good programs are green, bad ones red.",
    });
    const t = PA.slider(controls, { label: "Threshold", min: 0, max: 1, step: 0.01, value: 0.5, fmt: (v) => v.toFixed(2) });
    const g = PA.group(controls, "Presets");
    const pr = PA.btnRow(g);
    const rand = PA.rng(7);
    const progs = [];
    for (let i = 0; i < 18; i++) progs.push({ good: true, s: PA.clamp(0.33 + 0.15 * PA.gauss(rand), 0.02, 0.97), j: rand() });
    for (let i = 0; i < 18; i++) progs.push({ good: false, s: PA.clamp(0.67 + 0.15 * PA.gauss(rand), 0.02, 0.97), j: rand() });
    const minBad = Math.min(...progs.filter((p) => !p.good).map((p) => p.s));
    const maxGood = Math.max(...progs.filter((p) => p.good).map((p) => p.s));
    PA.button(pr, "Accept nothing", () => t.set(0), "sm");
    PA.button(pr, "Accept everything", () => t.set(1), "sm");
    PA.button(pr, "Most precise sound", () => t.set(Math.floor(minBad * 100) / 100), "sm");
    PA.button(pr, "Most precise complete", () => t.set(Math.ceil(maxGood * 100 + 0.001) / 100), "sm");

    const W = 640, H = 170;
    const sv = svg("svg", { viewBox: "0 0 " + W + " " + H, class: "clf", role: "img", "aria-label": "Programs plotted by score with a threshold" });
    const stage = h("div", { class: "stage" });
    stage.append(sv);
    const stats = PA.stats(h("div"), [{ key: "tp", label: "TP (good, accepted)" }, { key: "fp", label: "FP (bad, accepted)" }, { key: "fn", label: "FN (good, rejected)" }, { key: "tn", label: "TN (bad, rejected)" }, { key: "prec", label: "Precision" }, { key: "rec", label: "Recall" }]);
    const verdict = h("div", { class: "verdict" });
    view.append(stage, stats.wrap, verdict);
    const X = (s) => 30 + s * (W - 60);
    function draw() {
      const th = t.value;
      sv.innerHTML = "";
      sv.append(svg("rect", { x: 30, y: 12, width: Math.max(0, X(th) - 30), height: H - 42, class: "clf-acc" }));
      sv.append(svgText(36, 26, "accepted as good", "clf-lbl"));
      sv.append(svgText(W - 36, 26, "rejected", "clf-lbl", "end"));
      sv.append(svg("line", { x1: 30, y1: H - 30, x2: W - 30, y2: H - 30, class: "clf-axis" }));
      sv.append(svgText(30, H - 12, "0", "clf-lbl"), svgText(W - 30, H - 12, "1", "clf-lbl", "end"), svgText(W / 2, H - 12, "suspicion score", "clf-lbl", "middle"));
      sv.append(svgText(8, 64, "good", "clf-lbl"), svgText(8, 118, "bad", "clf-lbl"));
      let tp = 0, fp = 0, fn = 0, tn = 0;
      progs.forEach((p) => {
        const acc = p.s < th;
        if (p.good && acc) tp++; else if (!p.good && acc) fp++; else if (p.good) fn++; else tn++;
        const y = (p.good ? 46 : 100) + p.j * 26;
        const wrong = p.good !== acc;
        sv.append(svg("circle", { cx: X(p.s), cy: y, r: 7, class: "clf-dot " + (p.good ? "g" : "b") + (wrong ? " wrong" : "") }));
      });
      sv.append(svg("line", { x1: X(th), y1: 8, x2: X(th), y2: H - 30, class: "clf-th" }));
      stats.set("tp", tp, "good"); stats.set("fp", fp, fp ? "bad" : "good"); stats.set("fn", fn, fn ? "bad" : "good"); stats.set("tn", tn, "good");
      stats.set("prec", tp + fp ? (tp / (tp + fp)).toFixed(2) : "n/a");
      stats.set("rec", tp + fn ? (tp / (tp + fn)).toFixed(2) : "n/a");
      const sound = fp === 0, complete = fn === 0;
      verdict.className = "verdict " + (sound && complete ? "good" : sound || complete ? "warn" : "bad");
      verdict.innerHTML = "<b>" + (sound ? "Sound" : "Not sound") + " and " + (complete ? "complete" : "not complete") + ".</b> " +
        (sound && !complete ? "Every accepted program is good, but " + fn + (fn === 1 ? " good program is" : " good programs are") + " rejected." : "") +
        (!sound && complete ? "Every good program is accepted, but so " + (fp === 1 ? "is 1 bad one." : "are " + fp + " bad ones.") : "") +
        (!sound && !complete ? fp + (fp === 1 ? " bad program slips" : " bad programs slip") + " through and " + fn + (fn === 1 ? " good one is" : " good ones are") + " rejected." : "") +
        (sound && complete ? "Only possible because the scores happen to separate the groups here." : " The two groups overlap between " + minBad.toFixed(2) + " and " + maxGood.toFixed(2) + ", so no threshold gives both: that overlap is what undecidability looks like from the outside.");
    }
    t.onchange = draw;
    draw();
  }

  /* =====================================================================
     Lab 6: over- and under-approximation
     ===================================================================== */
  function labApprox(el) {
    const { controls, view } = PA.lab(el, {
      title: "Big net, small bucket: what can each analysis prove?",
      hint: "Each square is a conceivable trace. Blue squares are the real traces R = Sem(p). The may analysis M covers R plus extra (orange); the must analysis U keeps only real traces it has seen (dots). ✗ marks traces that end in an error.",
    });
    const real = PA.seg(controls, { label: "Can the program really fail?", options: [["y", "yes"], ["n", "no"]], value: "n" });
    const slack = PA.slider(controls, { label: "May analysis: extra slack", min: 0, max: 60, step: 5, value: 25, fmt: (v) => v + "%" });
    const cov = PA.slider(controls, { label: "Must analysis: traces seen", min: 0, max: 100, step: 5, value: 40, fmt: (v) => v + "% of R" });
    const C = 16, Rw = 9;
    const cells = [];
    const rnd = PA.rng(11);
    for (let y = 0; y < Rw; y++) for (let x = 0; x < C; x++) {
      const dx = (x + 0.5 - C / 2) / 5.2, dy = (y + 0.5 - Rw / 2) / 3.1;
      cells.push({ x, y, d: Math.sqrt(dx * dx + dy * dy), rank: rnd() });
    }
    const realErr = new Set(["12,3", "11,5"]), fakeErr = new Set(["13,6", "14,2", "2,1"]); // real ones lie inside R, fake ones outside
    const W = C * 34 + 8, H = Rw * 34 + 8;
    const sv = svg("svg", { viewBox: "0 0 " + W + " " + H, class: "apx", role: "img", "aria-label": "Grid of traces" });
    const stage = h("div", { class: "stage" }, [sv]);
    const legend = h("div", { class: "legend", html: '<span><i class="sw r"></i>real trace (R)</span><span><i class="sw m"></i>only in M (imaginary)</span><span><i class="sw u"></i>seen by U</span><span><b class="x">✗</b>error trace</span>' });
    const stats = PA.stats(h("div"), [{ key: "r", label: "|R| real" }, { key: "m", label: "|M| may" }, { key: "u", label: "|U| must" }, { key: "em", label: "errors in M" }, { key: "eu", label: "errors in U" }]);
    const vMay = h("div", { class: "verdict" }), vMust = h("div", { class: "verdict" });
    view.append(stage, legend, stats.wrap, vMay, vMust);
    function draw() {
      const s = slack.value / 100;
      const R = cells.filter((c) => c.d <= 1);
      const rank = R.slice().sort((a, b) => a.rank - b.rank);
      const Uset = new Set(rank.slice(0, Math.round((cov.value / 100) * R.length)));
      sv.innerHTML = "";
      let nM = 0, eM = 0, eMreal = 0, eU = 0;
      cells.forEach((c) => {
        const k = c.x + "," + c.y;
        const inR = c.d <= 1, inM = c.d <= 1 + s, inU = Uset.has(c);
        const err = (real.value === "y" && realErr.has(k)) || fakeErr.has(k);
        if (inM) nM++;
        if (inM && err) { eM++; if (inR) eMreal++; }
        if (inU && err) eU++;
        const g = svg("g");
        g.append(svg("rect", { x: 4 + c.x * 34, y: 4 + c.y * 34, width: 30, height: 30, rx: 5, class: "apx-c " + (inR ? "r" : inM ? "m" : "o") }));
        if (inU) g.append(svg("circle", { cx: 19 + c.x * 34, cy: 19 + c.y * 34, r: 6, class: "apx-u" }));
        if (err) g.append(svgText(19 + c.x * 34, 25 + c.y * 34, "✗", "apx-x" + (inR ? "" : " fake"), "middle"));
        sv.append(g);
      });
      stats.set("r", R.length); stats.set("m", nM); stats.set("u", Uset.size);
      stats.set("em", eM, eM ? "bad" : "good"); stats.set("eu", eU, eU ? "bad" : "");
      const realFail = real.value === "y";
      if (eM === 0) { vMay.className = "verdict good"; vMay.innerHTML = "<b>May analysis (M ⊇ R):</b> no error trace anywhere in M. Since every real trace is in M, this <b>proves the program must not fail</b>: $p \\models^{\\must} \\neg \\mathit{err}$."; }
      else if (eMreal === 0) { vMay.className = "verdict warn"; vMay.innerHTML = "<b>May analysis:</b> M contains " + eM + " error trace(s), but all are imaginary (outside R): a <b>false warning</b>. Its answer is \"may fail\", which is safe but imprecise. Reduce the slack to see the warning disappear."; }
      else { vMay.className = "verdict bad"; vMay.innerHTML = "<b>May analysis:</b> M contains " + eM + " error trace(s), " + eMreal + " of them real. It reports \"may fail\" but cannot tell which warnings are real ones."; }
      if (eU > 0) { vMust.className = "verdict bad"; vMust.innerHTML = "<b>Must analysis (U ⊆ R):</b> U holds a real error trace, so it <b>proves the program may fail</b>, with a concrete witness: $p \\models^{\\may} \\mathit{err}$."; }
      else if (realFail) { vMust.className = "verdict warn"; vMust.innerHTML = "<b>Must analysis:</b> no error in U, although the program can fail: a <b>missed bug</b>. Absence in an under-approximation proves nothing. Increase the coverage."; }
      else { vMust.className = "verdict"; vMust.innerHTML = "<b>Must analysis:</b> no error in U. Correct this time, but only luck: an under-approximation can never prove absence."; }
      PA.math(vMay); PA.math(vMust);
    }
    [real, slack, cov].forEach((c) => (c.onchange = draw));
    draw();
  }

  /* =====================================================================
     Lab 7: kinds of analysis
     ===================================================================== */
  function labKinds(el) {
    const { controls, view } = PA.lab(el, {
      title: "Classify the tools",
      hint: "For each tool choose one side of each axis. Feedback appears once a row is complete. Some tools honestly sit on both sides of an axis; then either answer counts and the explanation says why.",
    });
    el.classList.add("wide");
    controls.remove();
    const TOOLS = [
      ["Unit test suite run by JUnit", { m: "A", s: "Sem", d: "Dyn" }, "The tests were written by hand, but running them is a fixed procedure: automatic. They execute the program (dynamic) and check behaviour (semantic)."],
      ["Linter warning about <code>==</code> versus <code>.equals</code>", { m: "A", s: "Syn", d: "Sta" }, "A pattern match on the syntax tree, without running anything."],
      ["The Java type checker in <code>javac</code>", { m: "A", s: "*", d: "Sta" }, "Typing rules follow the syntax tree (syntactic flavour), but the guarantee, no type errors at run time, is about behaviour; it is usually called a static semantic analysis. Either answer counts."],
      ["A fuzzer feeding random inputs and watching for crashes", { m: "A", s: "Sem", d: "Dyn" }, "Runs the program on generated inputs and observes its behaviour (Week 4)."],
      ["A colleague's code review", { m: "M", s: "*", d: "Sta" }, "A human reads the code without running it; they reason about both structure and meaning."],
      ["A model checker exploring every state of a protocol", { m: "A", s: "Sem", d: "Sta" }, "Explores all behaviours without executing the real system: static and semantic."],
      ["<code>grep '/'</code> to guess divide by zero", { m: "A", s: "Syn", d: "Sta" }, "Pure text matching: the regex baseline of topic 20."],
      ["AddressSanitizer catching an out-of-bounds write", { m: "A", s: "Sem", d: "Dyn" }, "Checks inserted by the compiler fire while the program runs (dynamic) on actual memory accesses (semantic)."],
      ["A Dafny proof that a sort function is correct", { m: "*", s: "Sem", d: "Sta" }, "You write the invariants and proof by hand (manual), the verifier checks them mechanically (automatic): program verification sits in between. It reasons about all executions: semantic and static."],
      ["Reading a production log to find out why a server crashed", { m: "M", s: "Sem", d: "Dyn" }, "A human (manual) inspects a recorded trace (dynamic) to understand behaviour (semantic)."],
    ];
    const AX = [["m", [["M", "Manual"], ["A", "Automatic"]]], ["s", [["Syn", "Syntactic"], ["Sem", "Semantic"]]], ["d", [["Dyn", "Dynamic"], ["Sta", "Static"]]]];
    const score = h("div", { class: "verdict" });
    const list = h("div", { class: "kinds" });
    view.append(list, score);
    const answers = TOOLS.map(() => ({}));
    function refresh() {
      let done = 0, right = 0;
      TOOLS.forEach((t, i) => {
        const a = answers[i];
        const row = list.children[i];
        const fb = row.querySelector(".kfb");
        const complete = AX.every(([k]) => a[k]);
        if (!complete) { fb.hidden = true; row.className = "kind-row"; return; }
        done++;
        const ok = AX.every(([k]) => t[1][k] === "*" || t[1][k] === a[k]);
        if (ok) right++;
        row.className = "kind-row " + (ok ? "good" : "bad");
        const parts = AX.map(([k, opts]) => {
          const want = t[1][k];
          const good = want === "*" || want === a[k];
          return (good ? "✓ " : "✗ ") + (want === "*" ? "either" : opts.find((o) => o[0] === want)[1]);
        });
        fb.hidden = false;
        fb.innerHTML = "<b>" + parts.join(" · ") + ".</b> " + t[2];
      });
      score.className = "verdict" + (done === TOOLS.length ? (right === done ? " good" : " warn") : "");
      score.innerHTML = "<b>" + right + " of " + done + "</b> completed rows fully right" + (done < TOOLS.length ? " (" + (TOOLS.length - done) + " to go)." : ".");
    }
    TOOLS.forEach((t, i) => {
      const segs = h("div", { class: "kind-segs" });
      AX.forEach(([k, opts]) => {
        const g = h("div", { class: "seg", role: "group" });
        opts.forEach(([v, lbl]) => {
          const b = h("button", { type: "button", text: lbl, "aria-pressed": "false" });
          b.addEventListener("click", () => {
            answers[i][k] = v;
            g.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
            refresh();
          });
          g.append(b);
        });
        segs.append(g);
      });
      list.append(h("div", { class: "kind-row" }, [h("div", { class: "kind-name", html: t[0] }), segs, h("div", { class: "kfb", hidden: true })]));
    });
    refresh();
  }

  /* =====================================================================
     Lab 8: wagers
     ===================================================================== */
  function labWager(el) {
    const { controls, view } = PA.lab(el, {
      title: "Place a bet the JPAMB way",
      hint: "Set how sure you are that an outcome happens. JPAMB turns it into a wager; see what you win if right and lose if wrong. Below, the same idea on the three-method example from the rules.",
    });
    const p = PA.slider(controls, { label: "Your confidence p", min: 0, max: 100, value: 75, fmt: (v) => v + "%" });
    const truth = PA.seg(controls, { label: "What really happens", options: [["y", "it happens"], ["n", "it does not"]], value: "y" });
    const stats = PA.stats(h("div"), [{ key: "w", label: "Wager w(p)" }, { key: "win", label: "If it happens" }, { key: "lose", label: "If it does not" }, { key: "ev", label: "Expected, if p is right" }, { key: "now", label: "Your points now" }]);
    const W = 560, H = 190;
    const sv = svg("svg", { viewBox: "0 0 " + W + " " + H, class: "wg", role: "img", "aria-label": "Wager as a function of confidence" });
    const tableBox = h("div", { class: "table-wrap" });
    view.append(stats.wrap, h("div", { class: "stage" }, [sv]), tableBox);
    const X = (q) => 40 + q * (W - 60), Y = (w) => 90 - Math.max(-8, Math.min(8, w)) * 9.5;
    function drawCurve(cur) {
      sv.innerHTML = "";
      sv.append(svg("line", { x1: 40, y1: Y(0), x2: W - 20, y2: Y(0), class: "wg-axis" }), svg("line", { x1: 40, y1: 10, x2: 40, y2: 170, class: "wg-axis" }));
      [-8, -4, 4, 8].forEach((w) => sv.append(svgText(34, Y(w) + 4, String(w).replace("-", "−"), "wg-lbl", "end")));
      sv.append(svgText(34, Y(0) + 4, "0", "wg-lbl", "end"));
      [0, 0.25, 0.5, 0.75, 1].forEach((q) => sv.append(svgText(X(q), 186, Math.round(q * 100) + "%", "wg-lbl", "middle")));
      let d = "";
      for (let i = 1; i < 200; i++) { const q = i / 200; d += (i === 1 ? "M" : "L") + X(q).toFixed(1) + " " + Y(wagerOf(q)).toFixed(1); }
      sv.append(svg("path", { d, class: "wg-curve" }));
      const w = wagerOf(cur);
      sv.append(svg("circle", { cx: X(cur), cy: Y(w), r: 6, class: "wg-pt" }));
      sv.append(svgText(48, 14, "wager w(p), clipped at ±8", "wg-lbl"));
    }
    const METHODS = [["assertFalse", true, true], ["assertTrue", true, false], ["doNothing", false, false]]; // name, has assert, error happens
    function table(cur) {
      const strat = [
        ["Bet ±∞ on \"contains assert\"", (a) => (a ? Infinity : -Infinity)],
        ["Bet ±1 on \"contains assert\"", (a) => (a ? 1 : -1)],
        ["Percentages: 50% with assert, 0% without", (a) => wagerOf(a ? 0.5 : 0)],
        ["Categories yes / no (JPAMB computes 1/2 and 0/1)", (a) => wagerOf(a ? 1 / 2 : 0)],
        ["Your p with assert, 0% without", (a) => wagerOf(a ? cur : 0)],
      ];
      const t = h("table", { class: "dt" });
      t.innerHTML = "<thead><tr><th>Strategy for \"assertion error\"</th><th class='mono'>assertFalse</th><th class='mono'>assertTrue</th><th class='mono'>doNothing</th><th>Total</th></tr></thead>";
      const tb = h("tbody");
      const totals = strat.map(([, f]) => METHODS.reduce((s, [, a, happ]) => s + scoreOf(f(a), happ), 0));
      const best = Math.max(...totals);
      strat.forEach(([name, f], i) => {
        const cellsHtml = METHODS.map(([, a, happ]) => { const w = f(a), s = scoreOf(w, happ); return "<td class='num'>" + fmtNum(s) + "<br><span class='wsub'>w = " + fmtNum(w) + "</span></td>"; }).join("");
        const tr = h("tr", { class: totals[i] === best ? "good" : totals[i] === -Infinity ? "bad" : "" });
        tr.innerHTML = "<td>" + PA.esc(name) + "</td>" + cellsHtml + "<td class='num'><b>" + fmtNum(totals[i]) + "</b></td>";
        tb.append(tr);
      });
      t.append(tb);
      tableBox.innerHTML = "";
      tableBox.append(t);
    }
    function update() {
      const q = p.value / 100;
      const w = wagerOf(q);
      const sy = scoreOf(w, true), sn = scoreOf(w, false);
      const ev = q === 0 ? sn : q === 1 ? sy : q * sy + (1 - q) * sn;
      stats.set("w", fmtNum(w));
      stats.set("win", fmtNum(sy), sy > 0 ? "good" : sy < 0 ? "bad" : "");
      stats.set("lose", fmtNum(sn), sn > 0 ? "good" : sn < 0 ? "bad" : "");
      stats.set("ev", fmtNum(ev));
      const now = truth.value === "y" ? sy : sn;
      stats.set("now", fmtNum(now), now > 0 ? "good" : now < 0 ? "bad" : "warn");
      drawCurve(q);
      table(q);
    }
    p.onchange = update;
    truth.onchange = update;
    update();
  }

  /* =====================================================================
     Lab 9: the regex analysis on a mini benchmark
     ===================================================================== */
  function labRegexAnalysis(el) {
    const { controls, view } = PA.lab(el, {
      title: "A regex analysis on a mini benchmark",
      hint: "Each rule is a text search on the method body (annotations stripped, no cheating). Its predictions become categories; JPAMB-style scoring computes each category's percentage over the whole benchmark and turns it into bets.",
    });
    const OUTS = ["ok", "divide by zero", "assertion error", "out of bounds", "null pointer", "*"];
    const SHORT = { ok: "ok", "divide by zero": "div0", "assertion error": "assert", "out of bounds": "oob", "null pointer": "null", "*": "*" };
    const ids = ["assertFalse", "assertBoolean", "assertPositive", "divideByZero", "divideByN", "checkBeforeDivideByN", "checkTheWrongThing", "isNotAMillion", "arraySpellsHello", "countdown", "collatz", "sumTo", "divideAfterCheck", "copyThenDivide", "plusOneDivide", "infiniteLoop"];
    const METHODS = ids.map((id) => { const p = J.get(id); return { name: id, java: p.java, truth: new Set(p.cases.map((c) => c[1])) }; });
    METHODS.push({ name: "assertTrue", java: '@Case("() -> ok")\npublic static void assertTrue() {\n  assert true;\n}', truth: new Set(["ok"]) });
    METHODS.push({ name: "doNothing", java: '@Case("() -> ok")\npublic static void doNothing() {\n}', truth: new Set(["ok"]) });
    METHODS.forEach((m) => { m.body = m.java.split("\n").filter((l) => !/^\s*(@Case|\/\/)/.test(l)).join("\n"); });

    const g = PA.group(controls, "Rules");
    const rDiv = PA.toggle(g, { label: "<code>/</code> → divide by zero", value: true });
    const rDiv0 = PA.toggle(g, { label: "separate <code>/ 0</code> (literal zero)", value: false });
    const rAssert = PA.toggle(g, { label: "<code>assert</code> → assertion error", value: true });
    const rArr = PA.toggle(g, { label: "<code>[</code> → out of bounds", value: false });
    const rLoop = PA.toggle(g, { label: "<code>while</code> → * (loops)", value: false });
    const rNull = PA.toggle(g, { label: "null pointer: always <code>no</code>", value: false });
    const rOk = PA.toggle(g, { label: "ok: always <code>yes</code>", value: false });
    const inspect = PA.select(controls, { label: "Inspect a method (shown below the tables)", options: METHODS.map((m) => [m.name, m.name]), value: "divideByN" });
    const codeBox = h("div", { class: "panel" });

    const total = PA.stats(h("div"), [{ key: "score", label: "Total score" }, { key: "max", label: "Perfect score" }, { key: "cats", label: "Categories" }]);
    const predBox = h("div", { class: "table-wrap" });
    const catBox = h("div", { class: "table-wrap" });
    view.append(total.wrap, predBox, catBox, codeBox);

    function predict(m, o) {
      const b = m.body;
      if (o === "divide by zero" && rDiv.value) {
        if (rDiv0.value && /\/\s*0\b/.test(b)) return "div-literal-0";
        return /\//.test(b) ? "found-div" : "not-found-div";
      }
      if (o === "assertion error" && rAssert.value) return /\bassert\b/.test(b) ? "found-assert" : "no-assert";
      if (o === "out of bounds" && rArr.value) return /\[/.test(b) ? "found-array" : "no-array";
      if (o === "*" && rLoop.value) return /\bwhile\b/.test(b) ? "found-while" : "no-while";
      if (o === "null pointer" && rNull.value) return "no-null";
      if (o === "ok" && rOk.value) return "ok-yes";
      return "skip";
    }
    function update() {
      const preds = [];
      METHODS.forEach((m) => OUTS.forEach((o) => preds.push({ m, o, c: predict(m, o), t: m.truth.has(o) })));
      const cats = new Map();
      preds.forEach((p) => { if (!cats.has(p.c)) cats.set(p.c, { n: 0, t: 0 }); const c = cats.get(p.c); c.n++; if (p.t) c.t++; });
      cats.forEach((c) => { c.p = c.t / c.n; c.w = wagerOf(c.p); c.pts = 0; });
      let sum = 0;
      preds.forEach((p) => { const c = cats.get(p.c); p.s = scoreOf(c.w, p.t); c.pts += p.s; sum += p.s; });
      total.set("score", fmtNum(sum, 1), sum > 0 ? "good" : "bad");
      total.set("max", String(preds.length));
      total.set("cats", String(cats.size));
      // prediction grid
      const t = h("table", { class: "dt rx" });
      t.innerHTML = "<thead><tr><th>method</th>" + OUTS.map((o) => "<th class='mono'>" + PA.esc(SHORT[o]) + "</th>").join("") + "</tr></thead>";
      const tb = h("tbody");
      METHODS.forEach((m) => {
        const tr = h("tr");
        tr.append(h("td", { class: "mono", text: m.name }));
        OUTS.forEach((o) => {
          const pr = preds.find((x) => x.m === m && x.o === o);
          const c = cats.get(pr.c);
          const cls = c.w === 0 ? "rx-z" : pr.s > 0 ? "rx-ok" : "rx-bad";
          tr.append(h("td", { class: "rx-cell " + cls, title: (pr.t ? "happens" : "cannot happen") + ", category " + pr.c + ", points " + fmtNum(pr.s), html: "<span class='rx-c'>" + PA.esc(pr.c) + "</span><span class='rx-t'>" + (pr.t ? "●" : "○") + "</span>" }));
        });
        tb.append(tr);
      });
      t.append(tb);
      predBox.innerHTML = "<div class='panel-title' style='margin-top:4px'>Predictions (● = really happens, ○ = cannot happen; green = points won, red = points lost, grey = wager 0)</div>";
      predBox.append(t);
      // categories
      const ct = h("table", { class: "dt" });
      ct.innerHTML = "<thead><tr><th>category</th><th class='num'>predictions</th><th class='num'>true</th><th class='num'>p<sub>c</sub></th><th class='num'>wager</th><th class='num'>points</th></tr></thead>";
      const cb = h("tbody");
      [...cats.entries()].sort((a, b) => b[1].pts - a[1].pts).forEach(([name, c]) => {
        const tr = h("tr");
        tr.innerHTML = "<td class='mono'>" + PA.esc(name) + "</td><td class='num'>" + c.n + "</td><td class='num'>" + c.t + "</td><td class='num'>" + Math.round(c.p * 100) + "%</td><td class='num'>" + fmtNum(c.w) + "</td><td class='num'>" + fmtNum(c.pts, 1) + "</td>";
        cb.append(tr);
      });
      ct.append(cb);
      catBox.innerHTML = "<div class='panel-title' style='margin-top:4px'>Categories, calibrated over the whole benchmark</div>";
      catBox.append(ct);
      // inspect
      const m = METHODS.find((x) => x.name === inspect.value);
      codeBox.innerHTML = "<div class='panel-title'>Method body seen by the rules: " + PA.esc(m.name) + "</div>";
      codeBox.append(PA.codeBlock(m.body, "java"));
      codeBox.append(h("p", { class: "lab-hint", style: "margin:4px 0 0", text: "Really possible: " + [...m.truth].join(", ") }));
    }
    [rDiv, rDiv0, rAssert, rArr, rLoop, rNull, rOk, inspect].forEach((c) => (c.onchange = update));
    update();
  }

  /* =====================================================================
     Boot
     ===================================================================== */
  const LABS = {
    stepmachine: labStepMachine,
    paradox: labParadox,
    reduction: labReduction,
    traces: labTraces,
    classifier: labClassifier,
    approx: labApprox,
    kinds: labKinds,
    wager: labWager,
    regexanalysis: labRegexAnalysis,
  };

  PA.boot("introduction", LABS, QUIZ);
})();
