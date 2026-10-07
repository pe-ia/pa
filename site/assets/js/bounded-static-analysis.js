/* Week 5, Bounded Static Analysis: quiz bank and interactive labs. */
(function () {
  "use strict";
  const h = PA.h;
  const S = PA.sign;
  const J = PA.jvm;

  /* =====================================================================
     QUIZ BANK.  Each option: [text (HTML, $math$ allowed), isCorrect, explanation]
     ===================================================================== */
  const QUIZ = {
    what: [
      {
        q: "Which search order describes bounded static analysis?",
        options: [
          ["Depth-first: run one input to the end, then the next", false, "That is dynamic analysis: each run goes all the way down before another input is tried."],
          ["Breadth-first: advance all initial states together, one step per round", true, "We start from the whole set $I_p$ and apply the semantics to every state at once, so after $n$ rounds we know everything reachable in at most $n$ steps."],
          ["Random: sample inputs and keep the interesting ones", false, "That is fuzzing, a trace-selection strategy for dynamic analysis."],
          ["Purely syntactic: match patterns in the bytecode", false, "Bounded static analysis uses the semantics (the step function), not just the syntax."],
        ],
      },
      {
        q: "Why can't we simply compute the exact set of states reachable within $n$ steps for <code>assertPositive(int num)</code>?",
        options: [
          ["Because the step function is not defined on sets", false, "Lifting a step function to sets is easy (that is $\\Delta$). The problem is the size of the sets."],
          ["Because the method might not terminate", false, "A bounded analysis stops after $n$ rounds anyway, so termination of the program is not the obstacle."],
          ["Because there are $2^{32}$ initial states already, and in general infinitely many", true, "One <code>int</code> parameter gives $2^{32}$ initial states; arrays or objects make the sets infinite. We need finite abstractions."],
          ["Because Java bytecode is non-deterministic", false, "Our JVM semantics is deterministic. Non-determinism would make it worse, but it is not the reason here."],
        ],
      },
      {
        q: "What can a bounded static analysis establish that no finite set of test runs can?",
        options: [
          ["That no input at all leads to a division by zero within $n$ steps", true, "It reasons about all initial states at once, so a negative answer covers every input. Tests only cover the inputs they ran."],
          ["That a specific input crashes the method", false, "A single test run shows that (and gives a concrete witness). That is dynamic analysis' strength."],
          ["That the method terminates for every input", false, "A bounded analysis only looks $n$ steps deep; it cannot prove termination."],
          ["The exact return value for input 5", false, "Running the method on 5 gives that directly; an abstraction would only give its sign."],
        ],
      },
    ],

    goal: [
      {
        q: "A <em>complete</em> not-may analysis for <code>divide by zero</code> reports \"not possible\" for method <code>m</code> at depth $n$. What do you know?",
        options: [
          ["<code>m</code> divides by zero for some input", false, "That would follow from a sound may analysis saying \"possible\". Here the analysis said \"not possible\"."],
          ["Nothing: complete analyses can be wrong in both directions", false, "Completeness means it never misses a real case, so its \"not possible\" cannot be wrong."],
          ["No trace of <code>m</code> up to depth $n$ divides by zero", true, "If such a trace existed, completeness would force the analysis to report it. So its silence is a sound must claim: $p, n \\vdash^{\\must}_{\\BSA} \\neg Q$."],
          ["<code>m</code> terminates within $n$ steps", false, "The analysis said nothing about termination, only about division by zero up to depth $n$."],
        ],
      },
      {
        q: "Which formula states that the not-may analysis is complete?",
        options: [
          ["$p, n \\vdash^{\\notmay}_{\\BSA} Q \\implies p, n \\models^{\\may} Q$", false, "That is soundness (whatever it reports is true). Completeness goes the other way."],
          ["$p, n \\models^{\\may} Q \\implies p, n \\vdash^{\\notmay}_{\\BSA} Q$", true, "Whenever $Q$ really may happen within the bound, the analysis reports it. It may also report spurious cases."],
          ["$p, n \\models^{\\must} Q \\implies p, n \\vdash^{\\must}_{\\BSA} Q$", false, "That is completeness of a must analysis, not of the not-may analysis we use."],
          ["$\\neg(p, n \\models^{\\may} Q) \\equiv p, n \\models^{\\must} \\neg Q$", false, "That is the duality of the real properties, true for all $Q$, not a statement about any analysis."],
        ],
      },
      {
        q: "The not-may analysis reports \"assertion error may happen\". The method's true cases list no assertion error. What happened?",
        options: [
          ["A false alarm: the over-approximation contains a trace that does not exist", true, "Complete not-may analyses are allowed to over-report. This is exactly the price of soundness for the derived must claims."],
          ["The analysis is unsound", false, "Reporting too much does not break completeness of the may search, nor soundness of the must answers derived from silence."],
          ["The method's cases must be wrong", false, "JPAMB cases are exhaustive; the analysis is the one that over-approximated."],
        ],
      },
    ],

    "example-ae": [
      {
        q: "$\\mathit{ae}(\\tau) \\equiv \\tau_{|\\tau|-1} = \\err(\\text{`assertion error'})$ inspects which part of the trace?",
        options: [
          ["The first state $\\tau_0$", false, "$\\tau_0$ is the initial state. Errors show up at the end."],
          ["Every state of the trace", false, "Only one index is inspected: $|\\tau| - 1$."],
          ["Only the last state", true, "With traces indexed from $\\tau_0$, the last element is $\\tau_{|\\tau|-1}$. That is why the state abstraction (topic 17) is enough for this property."],
          ["The length of the trace", false, "The length is used only to find the last index."],
        ],
      },
      {
        q: "Your over-approximating analysis finds no trace ending in an assertion error up to depth 20. Which JPAMB line is justified?",
        options: [
          ["<code>assertion error;yes</code>", false, "Nothing was found, so there is no reason to bet on the error."],
          ["<code>assertion error;no</code>, with the fine print \"within 20 steps\"", true, "A complete search came back empty, which proves absence up to the bound. Beyond the bound it is only a good guess."],
          ["<code>assertion error;maybe</code>, because over-approximations can never prove absence", false, "Proving absence is exactly what over-approximations are good at."],
        ],
      },
      {
        q: "For <code>assertPositive</code>, the failing trace (input 0) has 9 elements. What does a bounded analysis with bound $k = 5$ conclude about assertion errors?",
        options: [
          ["It reports the error anyway, since it over-approximates", false, "Over-approximation is per step; it still only explores 5 states deep, before the <code>throw</code> is reached."],
          ["It finds none, and $p, 5 \\models^{\\must} \\neg\\mathit{ae}$ is even true, but says nothing about longer traces", true, "Every trace is cut before the <code>throw</code>. The bounded claim is correct, but useless for the real question if the bound is too small."],
          ["It crashes because the trace is longer than the bound", false, "Traces are simply cut off; nothing crashes."],
        ],
      },
    ],

    bounded: [
      {
        q: "Which implication holds for every program $p$, bound $k$ and property $Q$?",
        options: [
          ["$p, k \\models^{\\must} Q \\implies p \\models^{\\must} Q$", false, "Counterexample: an assertion that fails only after 300 steps. All traces of length $\\le 50$ are fine, but not all traces."],
          ["$p \\models^{\\may} Q \\implies p, k \\models^{\\may} Q$", false, "The witness trace may be longer than $k$."],
          ["$p, k \\models^{\\may} Q \\implies p \\models^{\\may} Q$", true, "$\\Sem^k(p) \\subseteq \\Sem(p)$, so a witness among short traces is a witness overall."],
          ["None of them", false, "The third one always holds."],
        ],
      },
      {
        q: "<code>countdown(n)</code> loops (practically) forever for $n \\lt 0$. What can a bounded analysis with $k = 100$ say about the outcome <code>*</code>?",
        options: [
          ["It proves non-termination for $n \\lt 0$", false, "Non-termination is a property of infinite traces; a bounded analysis never sees one."],
          ["It proves termination for all $n$", false, "It does not even see the end of the runs for large positive $n$."],
          ["Only that some traces are still running at depth 100, which also happens for large positive $n$", true, "Long and infinite runs look the same up to the bound. Treat \"still running\" as weak evidence for <code>*</code>."],
        ],
      },
      {
        q: "Why is a bounded not-may analysis not a (complete) not-may analysis?",
        options: [
          ["Because it can raise false alarms", false, "False alarms are allowed for a complete not-may analysis."],
          ["Because a real bug may appear only on traces longer than the bound, so the analysis can miss it", true, "Completeness is only guaranteed for traces within the bound: $p \\models^{\\may} Q \\not\\Rightarrow p, k \\vdash^{\\notmay} Q$."],
          ["Because it uses abstractions", false, "Abstractions over-approximate, which preserves completeness. The bound is the problem."],
        ],
      },
    ],

    "many-step": [
      {
        q: "What is $\\Delta^0$?",
        options: [
          ["The empty set of traces", false, "We start from something: the initial states."],
          ["$I_p$: every initial state as a one-state trace", true, "Before any step, the only traces are the initial states themselves."],
          ["All states of the program", false, "Only initial states; other states must be reached by stepping."],
          ["$\\Delta(I_p)$", false, "That is one round of stepping, without the initial traces."],
        ],
      },
      {
        q: "Why is $\\Delta^{n-1}$ unioned into $\\Delta^n = \\Delta(\\Delta^{n-1}) \\cup \\Delta^{n-1}$?",
        options: [
          ["To make the set smaller", false, "A union only adds traces."],
          ["Because $\\Delta$ alone would drop traces that already ended (no successors) and all shorter prefixes", true, "A trace ending in $\\ok$ or an error has no successor, so $\\Delta$ would lose it. Keeping $\\Delta^{n-1}$ makes the result exactly $\\Sem^{n+1}(p)$."],
          ["To remove duplicate traces", false, "Sets have no duplicates anyway."],
        ],
      },
      {
        q: "$\\Delta(T_1 \\cup T_2)$ equals",
        options: [
          ["$\\Delta(T_1) \\cap \\Delta(T_2)$", false, "Each trace is extended independently, so the results are unioned, not intersected."],
          ["$\\Delta(T_1) \\cup \\Delta(T_2)$", true, "$\\Delta$ is defined trace by trace, so it is additive (Proposition 5.10), and therefore monotone."],
          ["$\\Delta(\\Delta(T_1 \\cup T_2))$", false, "That would take two steps."],
        ],
      },
      {
        q: "For <code>checkTheWrongThing(int a)</code> restricted to $a \\in \\{-1, 0, 1\\}$, how many traces are in $\\Delta^1$?",
        options: [
          ["3", false, "That is $\\Delta^0$. One round adds the extensions."],
          ["6", true, "3 one-state traces, plus one two-state extension each (the JVM is deterministic): $3 + 3 = 6$."],
          ["9", false, "Each state has exactly one successor here, not three."],
          ["4", false, "Every initial state has a successor, giving 3 new traces."],
        ],
      },
    ],

    approx: [
      {
        q: "Which inclusion does Theorem 5.13 state?",
        options: [
          ["$\\Delta^{\\may,n} \\subseteq \\Delta^n \\subseteq \\Delta^{\\must,n}$", false, "The may side is the bigger one; the inclusions are the other way round."],
          ["$\\Delta^{\\must,n} \\subseteq \\Delta^n \\subseteq \\Delta^{\\may,n}$", true, "Under-approximations stay under and over-approximations stay over, round after round."],
          ["$\\Delta^{\\must,n} = \\Delta^{\\may,n}$", false, "They differ in general; they coincide with $\\Delta^n$ only for an exact analysis."],
        ],
      },
      {
        q: "The induction step of Theorem 5.13 needs which property?",
        options: [
          ["Monotonicity of the exact $\\Delta$", true, "$\\Delta(\\Delta^n) \\subseteq \\Delta(\\Delta^{\\may,n})$ needs $\\Delta$ monotone, which holds because it is additive. The approximations need not be monotone."],
          ["Determinism of the program", false, "Non-deterministic programs work the same way."],
          ["That $\\Delta^{\\may}$ is a Galois connection", false, "No abstraction is involved yet; these are sets of traces."],
          ["Termination of the program", false, "The bound $n$ handles that."],
        ],
      },
      {
        q: "A dynamic analysis that runs the inputs 0, 1 and 2 behaves like which approximation?",
        options: [
          ["$\\Delta^{\\may}$, an over-approximation", false, "It only produces real traces, and only some of them."],
          ["$\\Delta^{\\must}$, an under-approximation", true, "It follows a subset of the real traces. Good for showing that something <em>can</em> happen, useless for showing that it cannot."],
          ["The exact $\\Delta$", false, "Only if those three inputs were the whole input space."],
        ],
      },
    ],

    sign: [
      {
        q: "What is $\\alpha(\\{-1, 0, 3\\})$ in the sign abstraction?",
        options: [
          ["$\\{-, +\\}$", false, "The set contains 0, so the sign 0 must be included."],
          ["$\\{-, 0, +\\}$", true, "All three signs occur: $-1$ is negative, $0$ is zero, $3$ is positive."],
          ["$\\{0\\}$", false, "Only one of the three numbers is zero."],
          ["$\\{+\\}$", false, "That would be the abstraction of a set of positive numbers only."],
        ],
      },
      {
        q: "How many abstract values does the sign domain $\\pset{\\Sign}$ have?",
        options: [
          ["3", false, "$\\Sign$ itself has 3 elements; the abstract values are its subsets."],
          ["6", false, "$3! = 6$ is the factorial, but the notes' \"3!\" is just an exclamation mark."],
          ["8", true, "$2^3 = 8$ subsets: from $\\emptyset$ up to $\\{-,0,+\\}$."],
          ["$2^{32}$", false, "That is the number of 32-bit integers, the concrete side."],
        ],
      },
      {
        q: "Which question can you <em>no longer</em> answer once a variable is abstracted to its signs?",
        options: [
          ["Can the variable be zero?", false, "That is exactly what the sign 0 tells you."],
          ["Can the variable be negative?", false, "The sign $-$ answers that."],
          ["Is the variable even?", true, "Parity, magnitudes and exact values are lost. You would need another abstraction (e.g. parity) for that."],
        ],
      },
    ],

    poset: [
      {
        q: "Why is $(\\Z, \\lt)$ not a partial order?",
        options: [
          ["It is not transitive", false, "$a \\lt b \\lt c$ does give $a \\lt c$."],
          ["It is not reflexive: $a \\lt a$ is false", true, "Partial orders must be reflexive. $\\lt$ is a <em>strict</em> order; $\\le$ is the partial order."],
          ["It is not antisymmetric", false, "It is (vacuously) antisymmetric: $a \\lt b$ and $b \\lt a$ never both hold."],
          ["Integers cannot be ordered", false, "They can: $(\\Z, \\le)$ is even a total order."],
        ],
      },
      {
        q: "In $(\\pset{\\Sign}, \\subseteq)$, how are $\\{+\\}$ and $\\{0\\}$ related?",
        options: [
          ["$\\{+\\} \\subseteq \\{0\\}$", false, "$+ \\notin \\{0\\}$."],
          ["$\\{0\\} \\subseteq \\{+\\}$", false, "$0 \\notin \\{+\\}$."],
          ["They are incomparable", true, "Neither contains the other. That is what makes the order <em>partial</em>."],
          ["They are equal", false, "They contain different signs."],
        ],
      },
      {
        q: "In the poset $(\\{\\mathtt{tt}, \\mathtt{ff}\\}, \\Rightarrow)$, which element is the bottom?",
        options: [
          ["$\\mathtt{ff}$, because $\\mathtt{ff} \\Rightarrow \\mathtt{tt}$", true, "False implies anything, so $\\mathtt{ff}$ is below $\\mathtt{tt}$."],
          ["$\\mathtt{tt}$, because $\\mathtt{tt} \\Rightarrow \\mathtt{ff}$", false, "$\\mathtt{tt} \\Rightarrow \\mathtt{ff}$ is false."],
          ["There is none, they are incomparable", false, "They are comparable: it is a total order with two elements."],
        ],
      },
    ],

    lattice: [
      {
        q: "What is $\\{+\\} \\join \\{0\\}$ in the sign lattice?",
        options: [
          ["$\\emptyset$", false, "That is the meet (intersection)."],
          ["$\\{0, +\\}$", true, "The least set containing both: their union."],
          ["$\\{-, 0, +\\}$", false, "That is an upper bound, but not the least one."],
          ["It does not exist", false, "Powersets are lattices; every pair has a join."],
        ],
      },
      {
        q: "Which statement about $(\\Z, \\le)$ is true?",
        options: [
          ["It is a lattice with $\\top$ and $\\bot$", false, "There is no largest or smallest integer."],
          ["It is a lattice (join $\\max$, meet $\\min$) without $\\top$ and $\\bot$", true, "Every pair has a max and a min, but the whole set has no bounds. Only complete (e.g. finite) lattices are guaranteed $\\top$ and $\\bot$."],
          ["It is not a lattice", false, "Every pair of integers has a max and a min."],
        ],
      },
      {
        q: "Which law holds in every lattice?",
        options: [
          ["$a \\sqsubseteq b \\iff a \\join b = b$", true, "If $a \\sqsubseteq b$, then $b$ is the least upper bound of the two (Proposition 5.23)."],
          ["$a \\join b = a \\meet b$", false, "Only when $a = b$."],
          ["$a \\join (b \\meet c) = (a \\join b) \\meet (a \\join c)$", false, "That is distributivity, which fails in some lattices, e.g. the diamond $M_3$."],
        ],
      },
    ],

    hasse: [
      {
        q: "Why is there no edge from $\\{+\\}$ to $\\{-, 0, +\\}$ in the Hasse diagram, although $\\{+\\} \\subseteq \\{-,0,+\\}$?",
        options: [
          ["Because the diagram is wrong", false, "The diagram is right; it only draws covers."],
          ["Because $\\{0, +\\}$ lies strictly in between, so $\\{-,0,+\\}$ does not cover $\\{+\\}$", true, "Hasse diagrams draw only covers; the order follows by walking upward along edges."],
          ["Because $\\{+\\}$ and $\\{-,0,+\\}$ are incomparable", false, "They are comparable; the relation is just implied by a path."],
        ],
      },
      {
        q: "In the animals order, $\\mathrm{Ant}$ and $\\mathrm{Worm}$ are both below $\\mathrm{Cat}$ and $\\mathrm{Rabbit}$, which are incomparable, and nothing else in between. What is $\\mathrm{Ant} \\join \\mathrm{Worm}$?",
        options: [
          ["$\\mathrm{Cat}$", false, "$\\mathrm{Cat}$ is an upper bound, but not below $\\mathrm{Rabbit}$, so it is not the least one."],
          ["$\\mathrm{Rabbit}$", false, "Same problem: $\\mathrm{Rabbit}$ is not below $\\mathrm{Cat}$."],
          ["It does not exist: there are two minimal upper bounds", true, "A join must be below every upper bound. With two incomparable minimal ones there is no least, so this order is not a lattice."],
        ],
      },
      {
        q: "How do you read $a \\meet b$ off a Hasse diagram?",
        options: [
          ["Walk downward from both; the meet is the unique highest element both can reach", true, "If two different highest common elements exist, the meet does not exist."],
          ["Walk upward from both; take the lowest common element", false, "That is the join."],
          ["Take the element exactly halfway between them", false, "Diagram geometry has no meaning beyond up and down."],
        ],
      },
    ],

    "sign-lattice": [
      {
        q: "What does $\\bot = \\emptyset$ mean for a variable at some instruction in an analysis?",
        options: [
          ["The variable can be anything", false, "That is $\\top = \\{-,0,+\\}$."],
          ["No value at all: no execution reaches this point with that variable (unreachable)", true, "The empty set of possible values means no state is possible, e.g. after $\\{+\\} \\meet \\{-\\}$."],
          ["The variable is zero", false, "That is $\\{0\\}$."],
        ],
      },
      {
        q: "$\\{-, 0\\} \\meet \\{0, +\\} = $",
        options: [
          ["$\\{-, 0, +\\}$", false, "That is the join (union)."],
          ["$\\{0\\}$", true, "The meet is the intersection: only 0 satisfies both."],
          ["$\\emptyset$", false, "They share the sign 0."],
        ],
      },
      {
        q: "The sign lattice has height 3. What does that guarantee?",
        options: [
          ["A variable's abstract value can grow strictly at most 3 times", true, "The longest strictly increasing chain is $\\emptyset \\subset \\{s\\} \\subset \\{s, t\\} \\subset \\Sign$. This bounds how often iteration can change anything."],
          ["Every program has at most 3 variables", false, "Height is about chains of abstract values, not about programs."],
          ["Every analysis finishes in 3 steps", false, "Each variable at each instruction can change up to 3 times, so the total is larger."],
        ],
      },
    ],

    galois: [
      {
        q: "Which is the defining law of a Galois connection?",
        options: [
          ["$\\gamma(\\alpha(c)) = c$", false, "Abstraction is lossy; in general $\\gamma(\\alpha(c))$ is larger than $c$."],
          ["$\\alpha(c) \\sqsubseteq_A a \\iff c \\sqsubseteq_C \\gamma(a)$", true, "This one equivalence implies all the other laws."],
          ["$\\alpha(\\gamma(a)) \\sqsupseteq a$", false, "The real law (L2) is $\\alpha(\\gamma(a)) \\sqsubseteq a$."],
          ["$\\alpha$ and $\\gamma$ are inverse bijections", false, "That is an isomorphism, a very special Galois connection that loses nothing."],
        ],
      },
      {
        q: "How do you derive (L1) $c \\sqsubseteq \\gamma(\\alpha(c))$ from the defining law?",
        options: [
          ["Take $a = \\alpha(c)$; the left side $\\alpha(c) \\sqsubseteq \\alpha(c)$ holds by reflexivity", true, "The law then gives $c \\sqsubseteq \\gamma(\\alpha(c))$ immediately."],
          ["Take $c = \\gamma(a)$", false, "That substitution gives (L2) instead."],
          ["It needs monotonicity of $\\alpha$ first", false, "(L1) comes directly from the law; monotonicity is derived afterwards using (L1)."],
        ],
      },
      {
        q: "Which preservation law holds in every Galois connection?",
        options: [
          ["$\\alpha$ preserves meets", false, "Counterexample: $\\alpha(\\{1\\} \\cap \\{2\\}) = \\emptyset$ but $\\alpha(\\{1\\}) \\cap \\alpha(\\{2\\}) = \\{+\\}$."],
          ["$\\alpha$ preserves joins", true, "$\\alpha(c_1 \\join c_2) = \\alpha(c_1) \\join \\alpha(c_2)$ (L6): merging then describing equals describing then merging."],
          ["$\\gamma$ preserves joins", false, "In general only $\\gamma(a_1) \\join \\gamma(a_2) \\sqsubseteq \\gamma(a_1 \\join a_2)$; it is equality for signs but not for intervals."],
        ],
      },
      {
        q: "What does $\\alpha(\\gamma(\\alpha(c))) = \\alpha(c)$ (L4) say in words?",
        options: [
          ["Information is lost at most once: abstracting again after a round trip changes nothing", true, "A second round trip loses nothing more. This is the law the parse/pretty story tests."],
          ["Abstraction loses no information", false, "It does lose information: $\\gamma(\\alpha(c))$ can be much bigger than $c$."],
          ["$\\gamma$ is the inverse of $\\alpha$", false, "Only an isomorphism has that."],
        ],
      },
    ],

    adjunctions: [
      {
        q: "<code>parse(pretty(a)) == a</code> fails for some value. Which law should still always hold?",
        options: [
          ["<code>pretty(parse(pretty(a))) == pretty(a)</code>", true, "Printing a parsed printout reproduces the printout: information is lost at most once, like $\\gamma \\alpha \\gamma = \\gamma$."],
          ["<code>parse(s) == s</code>", false, "Strings and syntax trees are different kinds of things."],
          ["<code>pretty(a) == a</code>", false, "Same issue: a string is not a tree."],
        ],
      },
      {
        q: "Why are these round-trip laws good test properties?",
        options: [
          ["They hold for every input, so you can check them on thousands of random values", true, "That is exactly what property-based testing (Hypothesis) does: generate inputs, check the equation."],
          ["They prove the parser is correct", false, "They catch many bugs but do not prove full correctness."],
          ["They only need one hand-written example", false, "Their strength is that they are universal, so they are checked on many generated inputs."],
        ],
      },
    ],

    "sign-galois": [
      {
        q: "What is $\\gamma(\\{0, +\\})$?",
        options: [
          ["$\\{0, 1\\}$", false, "$\\gamma$ gives every integer with an allowed sign, not just some."],
          ["All integers $n \\ge 0$", true, "Zero and every positive integer."],
          ["All positive integers", false, "0 is allowed too."],
          ["$\\Z$", false, "Negative numbers are not allowed by $\\{0,+\\}$."],
        ],
      },
      {
        q: "Why is the sign connection a Galois <em>insertion</em>, i.e. $\\alpha(\\gamma(S)) = S$?",
        options: [
          ["Because every sign class contains at least one integer", true, "So every sign in $S$ occurs in $\\gamma(S)$ and is recovered by $\\alpha$; no two abstract values mean the same set."],
          ["Because $\\gamma$ is finite", false, "$\\gamma(\\{+\\})$ is infinite."],
          ["Because $\\alpha$ is injective", false, "$\\alpha$ is far from injective: $\\{1\\}$ and $\\{2\\}$ both map to $\\{+\\}$. Surjectivity is what matters."],
        ],
      },
      {
        q: "In code we never build $\\gamma(S)$. How do we test $X \\subseteq \\gamma(\\alpha(X))$ instead?",
        options: [
          ["Check that every $x \\in X$ is contained in <code>SignSet.abstract(X)</code> using <code>__contains__</code>", true, "Membership $x \\in \\gamma(S)$ is just $\\mathit{sign}(x) \\in S$, which is cheap. Hypothesis generates many random $X$."],
          ["Enumerate all $2^{32}$ integers", false, "Possible in principle, far too slow, and unnecessary."],
          ["Compare <code>len(X)</code> with <code>len(S)</code>", false, "Sizes say nothing about inclusion."],
        ],
      },
    ],

    "abstract-ops": [
      {
        q: "What is $\\{+\\} +_{\\Sign} \\{-\\}$?",
        options: [
          ["$\\{-\\}$", false, "$5 + (-2) = 3$ is positive."],
          ["$\\{0\\}$", false, "Only sometimes, e.g. $2 + (-2)$."],
          ["$\\{-, 0, +\\}$", true, "All three results are possible ($2 + (-5)$, $2 + (-2)$, $5 + (-2)$), so the honest answer is $\\top$."],
          ["$\\emptyset$", false, "That would claim no result is possible."],
        ],
      },
      {
        q: "Which condition, checkable inside the 8-element sign lattice, is equivalent to soundness of $\\oplus^{\\#}$?",
        options: [
          ["$\\alpha(A \\oplus B) \\sqsubseteq \\alpha(A) \\oplus^{\\#} \\alpha(B)$ for all $A, B$", true, "By the Galois law it is equivalent to $A \\oplus B \\subseteq \\gamma(\\alpha(A) \\oplus^{\\#} \\alpha(B))$ (Proposition 5.34)."],
          ["$\\alpha(A) \\oplus^{\\#} \\alpha(B) \\sqsubseteq \\alpha(A \\oplus B)$", false, "That would demand the abstract result be <em>more</em> precise than the truth: an under-approximation."],
          ["$\\oplus^{\\#} = \\oplus$", false, "They work on different domains."],
        ],
      },
      {
        q: "With Java's 32-bit wrap-around, what is the sound value of $\\{+\\} + \\{+\\}$?",
        options: [
          ["$\\{+\\}$, as in the course table", false, "$2147483647 + 1 = -2147483648$ in Java: two positives can produce a negative."],
          ["$\\{-, +\\}$", true, "The sum of two positive i32 values is at most $2^{32} - 2$, which wraps to a negative number but never to exactly 0."],
          ["$\\{0\\}$", false, "0 is not even possible."],
        ],
      },
    ],

    "abstract-step": [
      {
        q: "What is $\\Delta_A^0$ in bounded abstract interpretation?",
        options: [
          ["$\\alpha(I_p)$", true, "We abstract the set of initial states and start iterating from there."],
          ["$\\bot$", false, "Starting from nothing would never reach anything."],
          ["$\\top$", false, "That would be sound but hopelessly imprecise."],
          ["$\\gamma(I_p)$", false, "$\\gamma$ goes from abstract to concrete; $I_p$ is concrete."],
        ],
      },
      {
        q: "Which local condition on $\\Delta_A$ makes Theorem 5.38 work?",
        options: [
          ["$\\Delta(\\gamma(a)) \\subseteq \\gamma(\\Delta_A(a))$ for every abstract $a$", true, "One abstract step covers the concrete step from everything $a$ means. Induction then gives $\\Delta^n \\subseteq \\gamma(\\Delta_A^n)$ for all $n$."],
          ["$\\Delta_A = \\Delta$", false, "They live on different domains; and exactness is not required."],
          ["$\\gamma(\\Delta_A(a)) \\subseteq \\Delta(\\gamma(a))$", false, "That is an under-approximation condition, unsound for proving absence."],
        ],
      },
      {
        q: "In the induction step, which fact turns $\\gamma(x) \\cup \\gamma(y)$ into something below $\\gamma(x \\join y)$?",
        options: [
          ["$\\gamma$ preserves meets", false, "Meets are not involved; this is the slip in the notes."],
          ["$\\gamma$ is monotone, so $\\gamma(x \\join y)$ is an upper bound of $\\gamma(x)$ and $\\gamma(y)$", true, "Proposition 5.28: $\\gamma(x) \\cup \\gamma(y) \\subseteq \\gamma(x \\join y)$ in every Galois connection."],
          ["$\\alpha$ is injective", false, "It usually is not, and it is not needed."],
        ],
      },
    ],

    "state-abs": [
      {
        q: "What does $\\gamma(S)$ contain in the state abstraction?",
        options: [
          ["Only the real traces that end in $S$", false, "$\\gamma$ knows nothing about which histories are real; it allows any trace."],
          ["Every trace (real or not) whose last state is in $S$", true, "That is the information thrown away: the history before the last state."],
          ["Only one-state traces", false, "Traces of any length qualify, as long as they end in $S$."],
        ],
      },
      {
        q: "How precise is $\\Delta_{\\State}$ for one step, compared with $\\Delta$?",
        options: [
          ["Exact: $\\alpha(\\Delta(T)) = \\Delta_{\\State}(\\alpha(T))$", true, "The successors of a trace depend only on its last state, so forgetting the history loses nothing for the next step (Proposition 5.43)."],
          ["It over-approximates by adding spurious successor states", false, "No spurious successor appears: every state in $\\Delta_{\\State}(\\alpha(T))$ is a real successor of a real last state."],
          ["It under-approximates", false, "It never drops a real successor."],
        ],
      },
      {
        q: "$\\err(\\text{`assertion error'}) \\notin \\Delta_{\\State}^{n}$. What follows?",
        options: [
          ["No trace with at most $n$ steps ends in an assertion error", true, "Corollary 5.44: every trace in $\\Delta^n$ ends in a state of $\\Delta_{\\State}^n$."],
          ["The method never fails an assertion", false, "Only up to depth $n$."],
          ["The method fails an assertion after more than $n$ steps", false, "Nothing is known about longer traces."],
        ],
      },
    ],

    "pc-abs": [
      {
        q: "What does the per-instruction abstraction $\\Pc = \\iota \\to \\pset{\\State}$ lose?",
        options: [
          ["The values of the locals", false, "Each state is kept whole; it is only filed under its program counter."],
          ["Nothing: it only regroups the states by program counter", true, "On well-formed maps $\\alpha$ and $\\gamma$ are inverse. The benefit is that one instruction steps a whole group."],
          ["The relations between variables", false, "That loss comes with the next abstraction, $\\Pv$."],
        ],
      },
      {
        q: "In $\\Delta_{\\Pc}$, what happens to a successor state whose program counter is $\\iota'$?",
        options: [
          ["It replaces the set stored at $\\iota'$", false, "Replacing would lose states that arrived from other paths."],
          ["It is joined ($\\cup$) into the set stored at $\\iota'$", true, "States arriving at the same instruction from different paths are merged."],
          ["It is discarded if $\\iota'$ was already visited", false, "That would be unsound: new states may lead to new behaviour."],
        ],
      },
    ],

    "pv-abs": [
      {
        q: "States $\\{(x{=}1, y{=}{-1}), (x{=}{-1}, y{=}1)\\}$ are abstracted per variable. How many states does $\\gamma$ of the result contain?",
        options: [
          ["2", false, "Per-variable $\\gamma$ is the Cartesian product of the value sets."],
          ["4", true, "$\\{1, -1\\} \\times \\{-1, 1\\}$: the two real states plus the spurious $(1, 1)$ and $(-1, -1)$."],
          ["1", false, "Abstraction never loses real states."],
          ["Infinitely many", false, "The value sets are finite here; only signs would make them infinite."],
        ],
      },
      {
        q: "Why does the sign analysis raise a divide-by-zero alarm for <code>int y = x; if (x &gt; 0) return 10 / y;</code>?",
        options: [
          ["Because $y$ really can be 0 there", false, "Inside the branch $y = x \\gt 0$, so it cannot."],
          ["Because the per-variable abstraction forgets $y = x$: knowing $x \\gt 0$ says nothing about $y$", true, "A relational fact is needed. No transfer function on $\\Pv[\\Sign]$ can recover it."],
          ["Because division is not supported", false, "Division is supported; the alarm comes from 0 being possible in $y$'s set."],
        ],
      },
      {
        q: "Which kind of abstract domain would avoid this false alarm?",
        options: [
          ["A relational domain such as octagons or polyhedra", true, "They track constraints between variables like $y - x = 0$."],
          ["A smaller value domain, e.g. just $\\{\\bot, \\top\\}$", false, "Less precise per variable makes it worse, not better."],
          ["A bigger bound $n$", false, "The loss is in the domain, not in the depth."],
        ],
      },
    ],

    "pv-sign": [
      {
        q: "What is an element of $\\Pv[\\Sign]$?",
        options: [
          ["A map from program counter to (sign set per local, stack of sign sets)", true, "$\\Pv[A] = \\iota \\to (\\N \\to A) \\times A^*$ with $A = \\pset{\\Sign}$."],
          ["A set of concrete states", false, "That is $\\pset{\\State}$."],
          ["A single sign set for the whole program", false, "That would be far coarser: one value per variable per instruction is kept."],
        ],
      },
      {
        q: "Why does a Galois connection for single values give one for whole frames?",
        options: [
          ["Because $\\alpha$ and $\\gamma$ can be applied slot by slot and the orders are pointwise", true, "The Galois law holds in every slot, hence for the whole map (Theorem 5.50)."],
          ["Because frames have a fixed size of one value", false, "Frames have many slots; the pointwise construction handles any number."],
          ["It does not; frames need a separate proof", false, "Pointwise lifting is exactly the general proof."],
        ],
      },
    ],

    chain: [
      {
        q: "If $\\alpha_1, \\gamma_1$ connect $C$ to $B$ and $\\alpha_2, \\gamma_2$ connect $B$ to $A$, which pair connects $C$ to $A$?",
        options: [
          ["$\\alpha_2 \\circ \\alpha_1$ and $\\gamma_1 \\circ \\gamma_2$", true, "Abstract in order ($C \\to B \\to A$) and concretise in reverse ($A \\to B \\to C$)."],
          ["$\\alpha_1 \\circ \\alpha_2$ and $\\gamma_2 \\circ \\gamma_1$", false, "Wrong order: $\\alpha_2$ expects an element of $B$."],
          ["$\\alpha_2 \\circ \\gamma_1$ and $\\alpha_1 \\circ \\gamma_2$", false, "That mixes directions."],
        ],
      },
      {
        q: "Which step of the chain loses the relations between variables?",
        options: [
          ["$\\pset{\\Trace} \\to \\pset{\\State}$", false, "That step forgets history, not relations between variables of a state."],
          ["$\\pset{\\State} \\to \\Pc$", false, "That step only regroups."],
          ["$\\Pc \\to \\Pv$", true, "Each slot gets its own set of values; $\\gamma$ is a Cartesian product."],
          ["$\\Pv \\to \\Pv[\\Sign]$", false, "That step loses exact values, but relations were already gone."],
        ],
      },
      {
        q: "What is the practical benefit of composing Galois connections?",
        options: [
          ["You can swap one layer (e.g. signs for intervals) and keep the proofs of the others", true, "Each layer is proven once; the composition is automatically a Galois connection."],
          ["The analysis runs faster", false, "Composition is about proofs and modular design, not speed."],
          ["It removes false alarms", false, "Precision depends on the layers chosen, not on composing them."],
        ],
      },
    ],


    limits: [
      {
        q: "Which method can the sign analysis prove free of division by zero for all inputs?",
        options: [
          ["<code>divideAfterCheck</code>: <code>if (x &gt; 0) return 100 / x;</code>", true, "Inside the branch the divisor is always positive, a fact signs can express exactly. No finite test suite can establish this for all $2^{32}$ inputs."],
          ["<code>copyThenDivide</code>", false, "It is safe, but the analysis raises a false alarm (relation $y = x$ lost)."],
          ["<code>divideByN</code>: <code>return 1 / n;</code>", false, "That one really can divide by zero (n = 0)."],
        ],
      },
      {
        q: "When is a dynamic analysis the better tool?",
        options: [
          ["When you need a concrete witness and no false alarms, e.g. for <code>arraySpellsHello</code>", true, "Dynamic analysis only reports real traces, each with an input that reproduces it."],
          ["When you need to prove that no input fails", false, "That is where static analysis shines."],
          ["Never", false, "Each has strengths; the best analyses combine them."],
        ],
      },
    ],
  };

  /* =====================================================================
     SHARED HELPERS
     ===================================================================== */
  const OUT_SHORT = { ok: "ok", "assertion error": "AE", "divide by zero": "÷0", "out of bounds": "OOB", "null pointer": "NPE", "*": "∞", error: "err" };
  const OUT_PILL = (o) => (o === "ok" ? "ok" : o === "*" ? "maybe" : "err");
  const pill = (text, cls) => '<span class="pill ' + (cls || "") + '">' + PA.esc(text) + "</span>";
  const SIGN_ORDER = [0, 1, 2, 4, 3, 5, 6, 7];
  const signShort = (m) => (m === 0 ? "∅" : m === 7 ? "⊤" : S.each(m).map((s) => (s === S.NEG ? "−" : s === S.ZERO ? "0" : "+")).join(""));
  const GAMMA_TEX = {
    0: "\\emptyset", 1: "\\{n \\mid n < 0\\}", 2: "\\{0\\}", 3: "\\{n \\mid n \\leq 0\\}",
    4: "\\{n \\mid n > 0\\}", 5: "\\{n \\mid n \\neq 0\\}", 6: "\\{n \\mid n \\geq 0\\}", 7: "\\mathbb{Z}",
  };
  const setTex = (xs) => "\\{" + [...xs].sort((a, b) => a - b).join(", ") + "\\}";
  const signOf = S.of;
  const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };

  function verdictEl() { return h("div", { class: "verdict" }); }
  function setVerdict(v, tone, html) { v.className = "verdict" + (tone ? " " + tone : ""); v.innerHTML = html; PA.math(v); }

  /* A small SVG poset drawer, used for the sign lattice and for the Hasse lab.
     nodes: [{id, label, x, y}], covers: [[lowId, highId]], onPick(id) or null. */
  function posetSvg(nodes, covers, onPick, opts) {
    opts = opts || {};
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    const W = nodes.map((n) => Math.max(38, n.label.length * 8.2 + 18));
    const xs = nodes.map((n, i) => [n.x - W[i] / 2, n.x + W[i] / 2]);
    const minX = Math.min(...xs.map((a) => a[0])) - 8, maxX = Math.max(...xs.map((a) => a[1])) + 8;
    const minY = Math.min(...nodes.map((n) => n.y)) - 20, maxY = Math.max(...nodes.map((n) => n.y)) + 20;
    const svg = mk("svg", { viewBox: [minX, minY, maxX - minX, maxY - minY].join(" "), role: "group", "aria-label": opts.label || "Hasse diagram" });
    const byId = {};
    nodes.forEach((n, i) => (byId[n.id] = { n, w: W[i] }));
    const edges = covers.map(([lo, hi]) => {
      const a = byId[lo].n, b = byId[hi].n;
      const e = mk("line", { x1: a.x, y1: a.y - 13, x2: b.x, y2: b.y + 13, class: "hs-edge" });
      svg.append(e);
      return { lo, hi, e };
    });
    const nodeEls = {};
    nodes.forEach((n) => {
      const w = byId[n.id].w;
      const g = mk("g", { class: "hs-node", tabindex: onPick ? "0" : "-1", role: onPick ? "button" : "img", "aria-label": n.aria || n.label });
      g.append(mk("rect", { x: n.x - w / 2, y: n.y - 14, width: w, height: 28, rx: 14 }));
      const t = mk("text", { x: n.x, y: n.y + 4.5, "text-anchor": "middle" });
      t.textContent = n.label;
      g.append(t);
      if (onPick) {
        g.addEventListener("click", () => onPick(n.id));
        g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(n.id); } });
      } else g.style.cursor = "default";
      svg.append(g);
      nodeEls[n.id] = g;
    });
    const wrap = h("div", { class: "hasse" }, [svg]);
    return {
      el: wrap,
      set(classes, hotEdges) {
        for (const id in nodeEls) nodeEls[id].setAttribute("class", "hs-node" + (classes && classes[id] ? " " + classes[id] : ""));
        edges.forEach((ed) => ed.e.setAttribute("class", "hs-edge" + (hotEdges && hotEdges.has(ed.lo + ">" + ed.hi) ? " hot" : "")));
      },
    };
  }

  const SIGN_POS = { 0: [200, 250], 1: [80, 175], 2: [200, 175], 4: [320, 175], 3: [80, 100], 5: [200, 100], 6: [320, 100], 7: [200, 25] };
  function signNodes() {
    return SIGN_ORDER.map((m) => ({ id: m, label: S.fmt(m), x: SIGN_POS[m][0], y: SIGN_POS[m][1], aria: "sign set " + S.fmt(m) }));
  }
  function signCovers() {
    const c = [];
    SIGN_ORDER.forEach((m) => S.SIGNS.forEach((b) => { if (!(m & b)) c.push([m, m | b]); }));
    return c;
  }

  /* Number line of toggle buttons. */
  function numberLine(parent, lo, hi, onToggle) {
    const left = h("span", { class: "inf", text: "…" });
    const right = h("span", { class: "inf", text: "…" });
    const btns = {};
    const row = h("div", { class: "nl", role: "group", "aria-label": "Integers" }, [left]);
    range(lo, hi).forEach((n) => {
      const b = h("button", { type: "button", text: String(n), "aria-pressed": "false", "aria-label": "integer " + n, onclick: () => onToggle(n) });
      btns[n] = b;
      row.append(b);
    });
    row.append(right);
    parent.append(row);
    return {
      el: row,
      paint(isX, isG, infL, infR) {
        for (const n in btns) {
          const v = Number(n);
          btns[n].className = (isG(v) ? "g " : "") + (isX(v) ? "x" : "");
          btns[n].setAttribute("aria-pressed", String(!!isX(v)));
        }
        left.className = "inf" + (infL ? " g" : "");
        right.className = "inf" + (infR ? " g" : "");
        left.textContent = infL ? "← …" : "…";
        right.textContent = infR ? "… →" : "…";
      },
    };
  }

  /* Concrete state key and short format (single-method programs). */
  function topFrame(s) { return s.frames[s.frames.length - 1]; }
  function valShort(v) { return v == null ? "·" : v.t === "int" ? String(v.v) : v.v == null ? "null" : "ref"; }
  function stateKey(s) {
    if (typeof s === "string") return "out:" + s;
    return s.frames.map((f) => f.pc.off + "|" + f.locals.map(valShort).join(",") + "|" + f.stack.map(valShort).join(",")).join("/");
  }
  function stateShort(s) {
    if (typeof s === "string") return s;
    const f = topFrame(s);
    return "⟨[" + f.locals.map(valShort).join(", ") + "], ε" + f.stack.map((v) => "(" + valShort(v) + ")").join("") + ", " + f.pc.off + "⟩";
  }

  /* Successors of a concrete state. mode "may" also takes every branch both ways (a crude over-approximation). */
  function successors(state, mode) {
    const f = topFrame(state);
    const ins = J.get(f.pc.prog).code[f.pc.off];
    if (mode === "may" && (ins.op === "ifz" || ins.op === "if")) {
      const out = [];
      [ins.target, f.pc.off + 1].forEach((to, i) => {
        if (i === 1 && to === ins.target) return;
        const s = J.clone(state);
        const g = topFrame(s);
        g.stack.pop();
        if (ins.op === "if") g.stack.pop();
        g.pc.off = to;
        out.push({ state: s, outcome: null });
      });
      return out;
    }
    return [J.step(state)];
  }

  /* Delta^n over concrete traces. Returns { all, maximal, outcomes:Map(outcome -> [inputs]) } */
  function deltaN(prog, inputs, n, mode) {
    const init = inputs.map((x) => ({ input: x, seq: [J.initState(prog, prog.params.length ? [x] : [])], end: null }));
    const all = init.slice();
    let frontier = init;
    for (let i = 0; i < n; i++) {
      const next = [];
      frontier.forEach((t) => {
        if (t.end) return;
        successors(t.seq[t.seq.length - 1], mode).forEach((r) => {
          next.push({ input: t.input, seq: t.seq.concat([r.outcome || r.state]), end: r.outcome || null });
        });
      });
      next.forEach((t) => all.push(t));
      frontier = next;
      if (all.length > 6000) break;
    }
    const maximal = all.filter((t) => t.end || t.seq.length === n + 1);
    const outcomes = new Map();
    all.forEach((t) => { if (t.end) { if (!outcomes.has(t.end)) outcomes.set(t.end, new Set()); outcomes.get(t.end).add(t.input); } });
    const states = new Map();
    all.forEach((t) => { const last = t.seq[t.seq.length - 1]; states.set(stateKey(last), last); });
    return { all, maximal, outcomes, states };
  }
  const pcsOf = (t) => t.seq.map((s) => (typeof s === "string" ? OUT_SHORT[s] || s : String(topFrame(s).pc.off)));

  /* =====================================================================
     LAB 1: depth-first vs breadth-first
     ===================================================================== */
  function labBfs(el) {
    const { controls, view } = PA.lab(el, {
      title: "Depth-first (dynamic) vs breadth-first (static)",
      hint: "Each press of Step applies the step function once in each search. The top grid finishes one input before starting the next; the bottom grid advances every input by one step per column. Cells show the program counter; the last cell of a row is the outcome.",
    });
    const progSel = PA.select(controls, {
      label: "Program (inputs −3 to 3)",
      options: [["checkTheWrongThing", "checkTheWrongThing(int a)"], ["divideByN", "divideByN(int n)"], ["assertPositive", "assertPositive(int num)"], ["checkBeforeDivideByN", "checkBeforeDivideByN(int n)"]],
      value: "divideByN",
    });
    const btns = PA.btnRow(controls);
    const stepB = PA.button(btns, "Step", () => { step(); render(); }, "primary");
    const autoB = PA.button(btns, "Play", toggleAuto);
    PA.button(btns, "Reset", () => { reset(); render(); });
    const src = h("div", { class: "mini-java" });
    controls.append(src);

    const stats = PA.stats(view, [{ key: "steps", label: "Steps used (each search)" }, { key: "dyn", label: "Dynamic: inputs finished" }, { key: "stat", label: "Static: depth covered" }]);
    const gDyn = h("div", { class: "bg-wrap" });
    const gStat = h("div", { class: "bg-wrap" });
    const verdict = verdictEl();
    view.append(h("div", { class: "panel" }, [h("div", { class: "bg-title" }, [h("span", { text: "Dynamic analysis: depth-first" }), h("b", { text: "one trace at a time" })]), gDyn]),
      h("div", { class: "panel" }, [h("div", { class: "bg-title" }, [h("span", { text: "Bounded static analysis: breadth-first" }), h("b", { text: "Δⁿ, all inputs at once" })]), gStat]), verdict);

    const inputs = range(-3, 3);
    let rows, maxLen, ordDyn, ordStat, nDyn, nStat, firstErr, timer = null;
    function reset() {
      const prog = J.get(progSel.value);
      src.innerHTML = "";
      src.append(PA.codeBlock(prog.java.split("\n").filter((l) => !l.startsWith("@Case")).join("\n"), "java"));
      rows = inputs.map((x) => {
        const r = J.run(prog, [x], { keep: true, maxSteps: 40 });
        return r.states.map((s) => (typeof s === "string" ? { t: OUT_SHORT[s], end: s } : { t: String(topFrame(s).pc.off) }));
      });
      maxLen = Math.max(...rows.map((r) => r.length));
      ordDyn = []; ordStat = [];
      rows.forEach((r, i) => r.forEach((_, c) => ordDyn.push([i, c])));
      for (let c = 0; c < maxLen; c++) rows.forEach((r, i) => { if (c < r.length) ordStat.push([i, c]); });
      nDyn = 0; nStat = 0; firstErr = { dyn: null, stat: null };
      stopAuto();
    }
    function step() {
      if (nDyn < ordDyn.length) nDyn++;
      if (nStat < ordStat.length) nStat++;
      [["dyn", ordDyn, nDyn], ["stat", ordStat, nStat]].forEach(([k, ord, n]) => {
        const [i, c] = ord[n - 1] || [];
        if (i != null && rows[i][c].end && rows[i][c].end !== "ok" && !firstErr[k]) firstErr[k] = { step: n, input: inputs[i], out: rows[i][c].end, depth: c };
      });
      if (nDyn >= ordDyn.length && nStat >= ordStat.length) stopAuto();
    }
    function grid(container, ord, n) {
      const shown = new Set(ord.slice(0, n).map(([i, c]) => i + "," + c));
      const last = n ? ord[n - 1].join(",") : "";
      const cols = "56px repeat(" + maxLen + ", minmax(22px, 1fr))";
      const g = h("div", { class: "bg-grid" });
      const hdr = h("div", { class: "bg-row", style: "grid-template-columns:" + cols }, [h("span", { class: "bg-lab", text: "depth" })]);
      for (let c = 0; c < maxLen; c++) hdr.append(h("span", { class: "bg-c hdr", text: String(c) }));
      g.append(hdr);
      rows.forEach((r, i) => {
        const row = h("div", { class: "bg-row", style: "grid-template-columns:" + cols }, [h("span", { class: "bg-lab", text: "x = " + inputs[i] })]);
        for (let c = 0; c < maxLen; c++) {
          if (c >= r.length) { row.append(h("span", { class: "bg-c none" })); continue; }
          const on = shown.has(i + "," + c);
          const cell = r[c];
          const cls = "bg-c" + (on ? " on" : "") + (on && cell.end ? (cell.end === "ok" ? " ok" : " err") : "") + (last === i + "," + c ? " new" : "");
          row.append(h("span", { class: cls, text: on ? cell.t : "", title: on ? (cell.end ? "outcome " + cell.end : "pc " + cell.t) : "" }));
        }
        g.append(row);
      });
      container.innerHTML = "";
      container.append(g);
    }
    function render() {
      grid(gDyn, ordDyn, nDyn);
      grid(gStat, ordStat, nStat);
      const done = rows.filter((r, i) => ordDyn.slice(0, nDyn).some(([a, c]) => a === i && c === r.length - 1)).length;
      let depth = -1;
      for (let c = 0; c < maxLen; c++) { if (ordStat.slice(0, nStat).filter(([, cc]) => cc === c).length === rows.filter((r) => r.length > c).length) depth = c; else break; }
      stats.set("steps", String(nDyn));
      stats.set("dyn", done + " / " + rows.length, done === rows.length ? "good" : "");
      stats.set("stat", depth < 0 ? "none" : "depth " + depth + (depth === maxLen - 1 ? " (all)" : ""), depth === maxLen - 1 ? "good" : "");
      const fe = (k) => (firstErr[k] ? "found <b>" + PA.esc(firstErr[k].out) + "</b> (input " + firstErr[k].input + ", depth " + firstErr[k].depth + ") after " + firstErr[k].step + " steps" : "no error found yet");
      const allDone = nDyn >= ordDyn.length && nStat >= ordStat.length;
      setVerdict(verdict, allDone ? "good" : "", "<b>Dynamic</b> " + fe("dyn") + ". <b>Static</b> " + fe("stat") + "." +
        (allDone ? " Both searches explored the same " + ordStat.length + " states, in a different order. With $2^{32}$ inputs instead of 7, the static search cannot list states one by one: that is why it needs abstractions." : " Static always knows every input up to some depth; dynamic always knows some inputs completely."));
      stepB.disabled = allDone;
    }
    function toggleAuto() { if (timer) stopAuto(); else { timer = setInterval(() => { step(); render(); }, 160); autoB.textContent = "Pause"; } }
    function stopAuto() { if (timer) clearInterval(timer); timer = null; autoB.textContent = "Play"; }
    PA.whenVisible(el, () => {}, stopAuto);
    progSel.onchange = () => { reset(); render(); };
    reset();
    render();
  }

  /* =====================================================================
     LAB 2: growing Delta^n, exact / under / over
     ===================================================================== */
  function labManystep(el) {
    const { controls, view } = PA.lab(el, {
      title: "Grow $\\Delta^n$ and approximate it",
      hint: "$\\Delta^n$ holds every trace with at most $n$ steps from every input in the range. Switch to <b>under</b> (a must-style approximation that only follows inputs $\\geq 0$, like a test suite) or <b>over</b> (a may-style approximation that takes every branch both ways, ignoring the condition).",
    });
    const progSel = PA.select(controls, {
      label: "Program",
      options: [["checkBeforeDivideByN", "checkBeforeDivideByN(int n)"], ["divideByN", "divideByN(int n)"], ["checkTheWrongThing", "checkTheWrongThing(int a)"], ["assertPositive", "assertPositive(int num)"], ["countdown", "countdown(int n)"]],
      value: "checkBeforeDivideByN",
    });
    const rad = PA.slider(controls, { label: "Inputs from −r to r", min: 1, max: 3, value: 2, fmt: (v) => "r = " + v });
    const nS = PA.slider(controls, { label: "Rounds n", min: 0, max: 14, value: 10, fmt: (v) => "n = " + v });
    const mode = PA.seg(controls, { label: "Step function", options: [["exact", "exact Δ"], ["must", "under"], ["may", "over"]], value: "exact" });
    const stats = PA.stats(view, [{ key: "tr", label: "Traces in the set" }, { key: "st", label: "Distinct last states" }, { key: "out", label: "Outcomes reached" }]);
    const sandwich = h("div", { class: "panel" });
    const list = h("div", { class: "panel", style: "overflow-x:auto" });
    const verdict = verdictEl();
    view.append(sandwich, list, verdict);

    function update() {
      const prog = J.get(progSel.value);
      const all = range(-rad.value, rad.value);
      const n = nS.value;
      const res = {
        exact: deltaN(prog, all, n, "exact"),
        must: deltaN(prog, all.filter((x) => x >= 0), n, "exact"),
        may: deltaN(prog, all, n, "may"),
      };
      const R = res[mode.value];
      stats.set("tr", String(R.all.length));
      stats.set("st", String(R.states.size));
      const outs = [...R.outcomes.keys()];
      stats.set("out", outs.length ? outs.map((o) => OUT_SHORT[o]).join(" ") : "none", outs.some((o) => o !== "ok") ? "warn" : "");
      const exOut = new Set(res.exact.outcomes.keys());
      sandwich.innerHTML = '<div class="panel-title">The sandwich for this n</div>' +
        PA.tex("|\\Delta^{\\mathsf{must}," + n + "}| = " + res.must.all.length + " \\;\\leq\\; |\\Delta^{" + n + "}| = " + res.exact.all.length + " \\;\\leq\\; |\\Delta^{\\mathsf{may}," + n + "}| = " + res.may.all.length, true) +
        '<div class="btn-row" style="justify-content:center">' +
        ["must", "exact", "may"].map((k) => '<span class="pill ' + (k === mode.value ? "formal" : "mute") + '">' + (k === "must" ? "under" : k) + ": " + ([...res[k].outcomes.keys()].map((o) => OUT_SHORT[o]).join(" ") || "no outcome") + "</span>").join("") + "</div>";
      const lines = R.maximal.slice(0, 14).map((t) => {
        const end = t.end ? ' <span class="pill ' + (t.end === "ok" ? "ok" : "err") + '">' + PA.esc(t.end) + "</span>" + (mode.value === "may" && !exOut.has(t.end) ? ' <span class="pill maybe">spurious</span>' : "") : ' <span class="pill mute">still running</span>';
        return '<div class="trace-line">x = ' + t.input + ": " + pcsOf(t).filter((p, i, a) => !(t.end && i === a.length - 1)).join(" → ") + end + "</div>";
      });
      list.innerHTML = '<div class="panel-title">Longest traces (' + R.maximal.length + ")</div>" + lines.join("") + (R.maximal.length > 14 ? '<div class="trace-line">… and ' + (R.maximal.length - 14) + " more</div>" : "");
      PA.math(list);
      if (mode.value === "exact") {
        setVerdict(verdict, "", "Exactly $\\Delta^{" + n + "} = \\Sem^{" + (n + 1) + "}(p)$: " + R.all.length + " traces, including all shorter prefixes and the traces that already ended. Outcomes reached: " + (outs.length ? outs.map((o) => "<b>" + PA.esc(o) + "</b>").join(", ") : "none yet, increase n") + ".");
      } else if (mode.value === "must") {
        const missed = [...exOut].filter((o) => !R.outcomes.has(o));
        setVerdict(verdict, missed.length ? "warn" : "good", "Under-approximation: only inputs $\\geq 0$ are followed, so every trace shown is real. " +
          (missed.length ? "It <b>misses</b> " + missed.map((o) => "<b>" + PA.esc(o) + "</b>").join(", ") + ": a not-must analysis claiming \"no trace " + PA.esc(missed[0]) + "s\" would be fooled. Good for showing presence, never absence." : "Here it happens to find every outcome the exact set has."));
      } else {
        const spurious = [...R.outcomes.keys()].filter((o) => !exOut.has(o));
        setVerdict(verdict, spurious.length ? "warn" : "good", "Over-approximation: every real trace is still here (complete), plus traces that ignore branch conditions. " +
          (spurious.length ? "Spurious outcome " + spurious.map((o) => "<b>" + PA.esc(o) + "</b>").join(", ") + ": a <b>false alarm</b> of the not-may analysis." : "No spurious outcome this time: the over-approximation's \"not found\" answers are sound proofs of absence (within n)."));
      }
    }
    [progSel, rad, nS, mode].forEach((c) => (c.onchange = update));
    update();
  }

  /* =====================================================================
     LAB 3: alpha on a number line and the sign Hasse diagram
     ===================================================================== */
  function labAlpha(el) {
    const { controls, view } = PA.lab(el, {
      title: "Abstract a set of integers",
      hint: "Click integers to build a concrete set $X$. The diagram shows $\\alpha(X)$; the shaded integers (and arrows) show $\\gamma(\\alpha(X))$, everything the abstract value stands for.",
    });
    let X = new Set([1, 2, 3]);
    const pres = PA.btnRow(controls);
    [["{1,2,3}", [1, 2, 3]], ["{0}", [0]], ["{−1,3}", [-1, 3]], ["{−1,0,3}", [-1, 0, 3]], ["{0,1}", [0, 1]], ["∅", []]].forEach(([l, xs]) =>
      PA.button(pres, l, () => { X = new Set(xs); update(); }, "sm"));
    const info = h("div", { class: "laws" });
    controls.append(info);
    const lineBox = h("div", { class: "panel" }, [h("div", { class: "panel-title", text: "Concrete side: integers" })]);
    const line = numberLine(lineBox, -6, 6, (n) => { if (X.has(n)) X.delete(n); else X.add(n); update(); });
    lineBox.append(h("div", { class: "nl-legend" }, [h("span", { class: "lx", text: "in X" }), h("span", { class: "lg", text: "in γ(α(X))" })]));
    const hd = posetSvg(signNodes(), signCovers(), null, { label: "Hasse diagram of sign sets" });
    const hBox = h("div", { class: "panel" }, [h("div", { class: "panel-title", text: "Abstract side: sign sets" }), hd.el, h("div", { class: "hs-legend" }, [h("span", { class: "k-abs", text: "α(X)" })])]);
    view.append(lineBox, hBox);
    function update() {
      const a = S.abstract(X);
      line.paint((n) => X.has(n), (n) => S.contains(a, n), !!(a & S.NEG), !!(a & S.POS));
      const cls = {}; cls[a] = "abs";
      hd.set(cls);
      const visible = range(-6, 6).filter((n) => S.contains(a, n) && !X.has(n)).length;
      const infinite = !!(a & (S.NEG | S.POS));
      info.innerHTML = "";
      [["X", setTex(X)], ["\\alpha(X)", S.tex(a)], ["\\gamma(\\alpha(X))", GAMMA_TEX[a]]].forEach(([k, v]) =>
        info.append(h("div", { class: "law" }, [h("span", { class: "mk", text: "" }), h("span", { class: "lt", html: PA.tex(k + " = " + v) }), h("span", { class: "lv" })])));
      info.append(h("div", { class: "law good" }, [h("span", { class: "mk", text: "✓" }), h("span", { class: "lt", html: PA.tex("X \\subseteq \\gamma(\\alpha(X))") }), h("span", { class: "lv", text: "always (L1)" })]));
      info.append(h("div", { class: "law" }, [h("span", { class: "mk", text: "+" }), h("span", { class: "lt", html: PA.tex("|\gamma(\alpha(X)) \setminus X|") }), h("span", { class: "lv", text: infinite ? "∞ (the price)" : String(visible) })]));
    }
    update();
  }

  /* =====================================================================
     LAB 4: posets, joins, meets, lattices
     ===================================================================== */
  const POSETS = {
    sign: {
      name: "Sign sets (2^Sign, ⊆)",
      nodes: signNodes().map((n) => ({ id: String(n.id), label: n.label, x: n.x, y: n.y })),
      covers: signCovers().map(([a, b]) => [String(a), String(b)]),
    },
    chain: {
      name: "A chain",
      nodes: [["0", 200, 250], ["1", 200, 175], ["2", 200, 100], ["3", 200, 25]].map(([id, x, y]) => ({ id, label: id, x, y })),
      covers: [["0", "1"], ["1", "2"], ["2", "3"]],
    },
    m3: {
      name: "Diamond M3",
      nodes: [["⊥", 200, 240], ["a", 90, 135], ["b", 200, 135], ["c", 310, 135], ["⊤", 200, 30]].map(([id, x, y]) => ({ id, label: id, x, y })),
      covers: [["⊥", "a"], ["⊥", "b"], ["⊥", "c"], ["a", "⊤"], ["b", "⊤"], ["c", "⊤"]],
    },
    n5: {
      name: "Pentagon N5",
      nodes: [["⊥", 200, 245], ["a", 110, 175], ["c", 110, 95], ["b", 290, 135], ["⊤", 200, 25]].map(([id, x, y]) => ({ id, label: id, x, y })),
      covers: [["⊥", "a"], ["a", "c"], ["c", "⊤"], ["⊥", "b"], ["b", "⊤"]],
    },
    bowtie: {
      name: "Bowtie (not a lattice)",
      nodes: [["a", 110, 210], ["b", 290, 210], ["c", 110, 50], ["d", 290, 50]].map(([id, x, y]) => ({ id, label: id, x, y })),
      covers: [["a", "c"], ["a", "d"], ["b", "c"], ["b", "d"]],
    },
    split: {
      name: "Two separate chains",
      nodes: [["a", 120, 210], ["b", 120, 70], ["c", 280, 210], ["d", 280, 70]].map(([id, x, y]) => ({ id, label: id, x, y })),
      covers: [["a", "b"], ["c", "d"]],
    },
    animals: {
      name: "Animals, by \"is worse than\"",
      nodes: [["Spider", 200, 265], ["Ant", 120, 200], ["Worm", 285, 200], ["Cat", 105, 135], ["Rabbit", 300, 135], ["Dog", 105, 70], ["Horse", 215, 10]].map(([id, x, y]) => ({ id, label: id, x, y })),
      covers: [["Spider", "Ant"], ["Spider", "Worm"], ["Ant", "Cat"], ["Ant", "Rabbit"], ["Worm", "Cat"], ["Worm", "Rabbit"], ["Cat", "Dog"], ["Dog", "Horse"], ["Rabbit", "Horse"]],
    },
  };
  function posetOrder(P) {
    const ids = P.nodes.map((n) => n.id);
    const le = {};
    ids.forEach((a) => { le[a] = new Set([a]); });
    let changed = true;
    while (changed) {
      changed = false;
      P.covers.forEach(([lo, hi]) => { ids.forEach((x) => { if (le[x].has(lo) && !le[x].has(hi)) { le[x].add(hi); changed = true; } }); });
    }
    const leq = (a, b) => le[a].has(b);
    function bound(a, b, up) {
      const B = ids.filter((u) => (up ? leq(a, u) && leq(b, u) : leq(u, a) && leq(u, b)));
      const extreme = B.filter((u) => !B.some((v) => v !== u && (up ? leq(v, u) : leq(u, v))));
      return { B, extreme, best: extreme.length === 1 ? extreme[0] : null };
    }
    return { ids, leq, bound };
  }
  function labHasse(el) {
    const { controls, view } = PA.lab(el, {
      title: "Joins, meets and lattices in Hasse diagrams",
      hint: "Pick a poset, then click two elements. Green: upper bounds and the join; blue: lower bounds and the meet; orange: competing minimal (or maximal) bounds when no join (or meet) exists.",
    });
    const pick = PA.select(controls, { label: "Poset", options: Object.keys(POSETS).map((k) => [k, POSETS[k].name]), value: "sign" });
    const latEl = verdictEl();
    controls.append(latEl);
    const holder = h("div", { class: "panel" });
    const verdict = verdictEl();
    view.append(holder, h("div", { class: "hs-legend" }, [h("span", { class: "k-sel", text: "picked" }), h("span", { class: "k-join", text: "join" }), h("span", { class: "k-up", text: "upper bound" }), h("span", { class: "k-meet", text: "meet" }), h("span", { class: "k-down", text: "lower bound" }), h("span", { class: "k-cand", text: "competing bound" })]), verdict);
    let P, O, D, sel = [];
    const L = (id) => { const n = P.nodes.find((x) => x.id === id); return n ? n.label : id; };
    const LL = (ids) => ids.map(L).join(" and ");
    function load() {
      P = POSETS[pick.value];
      O = posetOrder(P);
      D = posetSvg(P.nodes, P.covers, (id) => { sel = sel.length >= 2 ? [id] : sel.concat([id]); render(); }, { label: P.name });
      holder.innerHTML = "";
      holder.append(D.el);
      sel = P.nodes.length > 2 ? [P.nodes[1].id, P.nodes[2].id] : [];
      // lattice check
      let fail = null;
      O.ids.forEach((a) => O.ids.forEach((b) => {
        if (fail) return;
        const up = O.bound(a, b, true), dn = O.bound(a, b, false);
        if (!up.best) fail = [a, b, "⊔", up];
        else if (!dn.best) fail = [a, b, "⊓", dn];
      }));
      if (!fail) setVerdict(latEl, "good", "<b>A lattice:</b> every pair has a join and a meet.");
      else setVerdict(latEl, "bad", "<b>Not a lattice:</b> " + PA.esc(L(fail[0]) + " " + fail[2] + " " + L(fail[1])) + " does not exist (" + (fail[3].extreme.length ? "competing bounds " + PA.esc(LL(fail[3].extreme)) : "no bound at all") + ").");
      render();
    }
    function render() {
      const cls = {};
      let msg = "Click two elements.";
      if (sel.length === 1) { cls[sel[0]] = "sel"; msg = "Picked <b>" + PA.esc(L(sel[0])) + "</b>. Click a second element."; }
      if (sel.length === 2) {
        const [a, b] = sel;
        const up = O.bound(a, b, true), dn = O.bound(a, b, false);
        up.B.forEach((u) => (cls[u] = "up"));
        dn.B.forEach((u) => (cls[u] = "down"));
        if (up.best) cls[up.best] = "join"; else up.extreme.forEach((u) => (cls[u] = "cand"));
        if (dn.best) cls[dn.best] = "meet"; else dn.extreme.forEach((u) => (cls[u] = "cand"));
        cls[a] = "sel"; cls[b] = "sel";
        const j = up.best ? "join <b>" + PA.esc(L(a)) + " ⊔ " + PA.esc(L(b)) + " = " + PA.esc(L(up.best)) + "</b>" : up.extreme.length ? "<b>no join</b>: " + PA.esc(LL(up.extreme)) + " are both minimal upper bounds and incomparable" : "<b>no join</b>: no upper bound at all";
        const m = dn.best ? "meet <b>" + PA.esc(L(a)) + " ⊓ " + PA.esc(L(b)) + " = " + PA.esc(L(dn.best)) + "</b>" : dn.extreme.length ? "<b>no meet</b>: " + PA.esc(LL(dn.extreme)) + " are both maximal lower bounds" : "<b>no meet</b>: no lower bound at all";
        const rel = a === b ? "You picked the same element twice" : O.leq(a, b) ? PA.esc(L(a)) + " ⊑ " + PA.esc(L(b)) : O.leq(b, a) ? PA.esc(L(b)) + " ⊑ " + PA.esc(L(a)) : PA.esc(L(a)) + " and " + PA.esc(L(b)) + " are incomparable";
        msg = rel + ". " + j + "; " + m + ".";
      }
      D.set(cls);
      setVerdict(verdict, sel.length === 2 ? "" : "", msg);
    }
    pick.onchange = load;
    load();
  }

  /* =====================================================================
     LAB 5: checking the Galois connection law
     ===================================================================== */
  function labGaloisCheck(el) {
    const { controls, view } = PA.lab(el, {
      title: "Check the Galois law and its consequences",
      hint: "Build a concrete set $c$ on the number line and click an abstract value $a$ in the diagram. Every law is evaluated live. Then mismatch $\\alpha$ and $\\gamma$ to see what breaks.",
    });
    const pair = PA.seg(controls, { label: "Which α and γ", options: [["ok", "correct"], ["swap", "notes' (both swapped)"], ["mix", "correct α, notes' γ"]], value: "ok" });
    let C = new Set([0, 1]);
    let A = 6;
    const pres = PA.btnRow(controls);
    [["{0,1}", [0, 1]], ["{2,3}", [2, 3]], ["{−1}", [-1]], ["{−2,0,2}", [-2, 0, 2]], ["∅", []]].forEach(([l, xs]) => PA.button(pres, l, () => { C = new Set(xs); update(); }, "sm"));
    const exh = verdictEl();
    controls.append(exh);
    const lineBox = h("div", { class: "panel" }, [h("div", { class: "panel-title", text: "Concrete c (click integers)" })]);
    const line = numberLine(lineBox, -4, 4, (n) => { if (C.has(n)) C.delete(n); else C.add(n); update(); });
    lineBox.append(h("div", { class: "nl-legend" }, [h("span", { class: "lx", text: "in c" }), h("span", { class: "lg", text: "in γ(a)" })]));
    const hd = posetSvg(signNodes(), signCovers(), (m) => { A = m; update(); }, { label: "Pick the abstract value a" });
    const hBox = h("div", { class: "panel" }, [h("div", { class: "panel-title", text: "Abstract a (click a node)" }), hd.el, h("div", { class: "hs-legend" }, [h("span", { class: "k-sel", text: "a" }), h("span", { class: "k-abs", text: "α(c)" })])]);
    const laws = h("div", { class: "laws" });
    view.append(h("div", { class: "split" }, [lineBox, hBox]), laws);

    const swapMask = (m) => S.neg(m); // swaps - and +
    function alphaF(set) { const a = S.abstract(set); return pair.value === "swap" ? swapMask(a) : a; }
    function gammaClasses(m) { return pair.value === "ok" ? m : swapMask(m); } // the true-sign classes gamma(m) contains
    const gammaHas = (m, n) => !!(gammaClasses(m) & S.of(n));
    const alphaGamma = (m) => alphaF(S.each(gammaClasses(m)).map((s) => (s === S.NEG ? -1 : s === S.ZERO ? 0 : 1)));
    const subsetGamma = (set, m) => [...set].every((n) => gammaHas(m, n));
    function exhaustive() {
      let bad = 0, tot = 0;
      const base = range(-2, 2);
      for (let bits = 0; bits < 32; bits++) {
        const c = base.filter((_, i) => bits & (1 << i));
        SIGN_ORDER.forEach((m) => { tot++; if (S.leq(alphaF(c), m) !== subsetGamma(c, m)) bad++; });
      }
      return [bad, tot];
    }
    function law(ok, tex, val) {
      return h("div", { class: "law " + (ok ? "good" : "bad") }, [h("span", { class: "mk", text: ok ? "✓" : "✗" }), h("span", { class: "lt", html: PA.tex(tex) }), h("span", { class: "lv", text: val || "" })]);
    }
    function update() {
      const ac = alphaF(C);
      line.paint((n) => C.has(n), (n) => gammaHas(A, n), !!(gammaClasses(A) & S.NEG), !!(gammaClasses(A) & S.POS));
      const cls = {}; cls[ac] = "abs"; cls[A] = "sel";
      hd.set(cls);
      const lhs = S.leq(ac, A), rhs = subsetGamma(C, A);
      const gA = gammaClasses(A);
      laws.innerHTML = "";
      laws.append(h("div", { class: "law" }, [h("span", { class: "mk" }), h("span", { class: "lt", html: PA.tex("c = " + setTex(C) + ",\\quad \\alpha(c) = " + S.tex(ac) + ",\\quad a = " + S.tex(A) + ",\\quad \\gamma(a) = " + GAMMA_TEX[gA]) }), h("span", { class: "lv" })]));
      laws.append(law(lhs === rhs, "\\alpha(c) \\sqsubseteq a \\iff c \\subseteq \\gamma(a)", (lhs ? "true" : "false") + " ⇔ " + (rhs ? "true" : "false")));
      laws.append(law(subsetGamma(C, ac), "\\text{(L1)}\\ c \\subseteq \\gamma(\\alpha(c))"));
      const ag = alphaGamma(A);
      laws.append(law(S.leq(ag, A), "\\text{(L2)}\\ \\alpha(\\gamma(a)) = " + S.tex(ag) + " \\sqsubseteq a"));
      const aga = alphaGamma(ac);
      laws.append(law(aga === ac, "\\text{(L4)}\\ \\alpha(\\gamma(\\alpha(c))) = " + S.tex(aga) + " = \\alpha(c)"));
      laws.append(law(gammaClasses(alphaGamma(A)) === gA, "\\text{(L5)}\\ \\gamma(\\alpha(\\gamma(a))) = \\gamma(a)"));
      const [bad, tot] = exhaustive();
      setVerdict(exh, bad ? "bad" : "good", bad ? "<b>Broken:</b> the law fails for " + bad + " of the " + tot + " pairs (every subset of {−2, …, 2} against every a). " + (pair.value === "mix" ? "Fixing only one of the two definitions breaks the connection." : "") :
        "<b>Exhaustive check:</b> the law holds for all " + tot + " pairs (every subset of {−2, …, 2} against every a)." + (pair.value === "swap" ? " Swapping both consistently keeps the law, but now “+” means negative, contradicting the notes' examples." : ""));
    }
    pair.onchange = update;
    update();
  }

  /* =====================================================================
     LAB 6: abstract arithmetic on signs
     ===================================================================== */
  const OPS = {
    add: { sym: "+", tex: "+", abs: (a, b) => ({ value: S.add(a, b), err: false }), con: (x, y, w) => (w ? (x + y) | 0 : x + y) },
  };
  function labSignOps(el) {
    const { controls, view } = PA.lab(el, {
      title: "Abstract addition, checked against concrete numbers",
      hint: "Pick two sign sets. The lab computes their abstract sum with the notes' table, then tries many concrete pairs from $\\gamma$ of the operands: every concrete result must land inside $\\gamma$ of the abstract result. Click a table cell to pick operands.",
    });
    const op = { value: "add" };
    const segOpts = SIGN_ORDER.map((m) => [m, signShort(m)]);
    const A = PA.seg(controls, { label: "Left operand S", options: segOpts, value: 4 });
    const B = PA.seg(controls, { label: "Right operand T", options: segOpts, value: 1 });
    [A, B].forEach((c) => c.wrap.querySelector(".seg").classList.add("seg4"));
    const wrap = PA.toggle(controls, { label: "32-bit wrap-around (like the JVM)", value: false });
    const res = h("div", { class: "panel" });
    const samp = h("div", { class: "panel" });
    const tbl = h("div", { class: "panel" });
    const verdict = verdictEl();
    view.append(res, samp, verdict, tbl);

    function samples(m, w) {
      const base = range(-6, 6);
      const big = w ? [2147483647, 2147483646, 1073741824, 65536, -2147483648, -2147483647, -1073741824, -65536] : [];
      return base.concat(big).filter((n) => S.contains(m, n));
    }
    function update() {
      const o = OPS[op.value], a = A.value, b = B.value, w = wrap.value;
      const r = o.abs(a, b);
      res.innerHTML = '<div class="panel-title">Abstract result</div>' + PA.tex(S.tex(a) + " " + o.tex + "^{\\#} " + S.tex(b) + " = " + S.tex(r.value), true) +
        '<div class="btn-row" style="justify-content:center">' + (r.value === 7 ? pill("⊤: nothing known about the sign", "maybe") : "") + (r.value === 0 && !r.err ? pill("∅: no result possible", "mute") : "") + "</div>";
      const xs = samples(a, w), ys = samples(b, w);
      const chips = new Map();
      let pairs = 0, zero = 0, outside = 0, observed = 0;
      const outEx = [];
      xs.forEach((x) => ys.forEach((y) => {
        pairs++;
        const z = o.con(x, y, w);
        const inside = S.contains(r.value, z);
        observed |= S.of(z);
        if (!inside) { outside++; if (outEx.length < 3) outEx.push(x + " " + o.sym + " " + y + " = " + z); }
        const k = String(z);
        if (!chips.has(k) || !inside) chips.set(k, inside);
      }));
      const shown = [...chips.entries()].sort((p, q) => Number(p[0]) - Number(q[0]));
      samp.innerHTML = '<div class="panel-title">Concrete results from ' + pairs + " pairs (operands from −6 to 6" + (w ? " plus extreme 32-bit values" : "") + ")</div>";
      const box = h("div", { class: "samples" });
      shown.slice(0, 80).forEach(([k, inside]) => box.append(h("span", { class: inside ? "in" : "out", text: k })));
      if (shown.length > 80) box.append(h("span", { text: "+" + (shown.length - 80) + " more" }));
      if (!pairs) box.append(h("span", { text: "no concrete pairs: an operand is ∅" }));
      samp.append(box);
      const unwitnessed = r.value & ~observed;
      if (outside) setVerdict(verdict, "bad", "<b>Unsound for 32-bit ints:</b> " + outside + " concrete results fall outside $\\gamma$ of the abstract result, e.g. " + PA.esc(outEx.join("; ")) + ". The course table assumes mathematical integers.");
      else if (!pairs) setVerdict(verdict, "", "With an empty operand there is nothing to compute: the result is $\\bot = \\emptyset$ (unreachable).");
      else setVerdict(verdict, unwitnessed ? "warn" : "good", "<b>Sound:</b> every concrete result is inside $\\gamma$ of the abstract result." + "" +
        (unwitnessed ? " (Signs " + PA.esc(S.fmt(unwitnessed)) + " were not hit by these samples.)" : " Every sign in the result is actually hit by some pair, so no smaller answer would be sound: this entry is the best transformer."));
      // table
      const t = h("table", { class: "so-table" });
      const hr = h("tr", null, [h("th", { text: "S " + o.sym + " T" })]);
      SIGN_ORDER.forEach((m) => hr.append(h("th", { text: signShort(m) })));
      t.append(h("thead", null, [hr]));
      const tb = h("tbody");
      SIGN_ORDER.forEach((ra) => {
        const tr = h("tr", null, [h("th", { text: signShort(ra) })]);
        SIGN_ORDER.forEach((cb) => {
          const rr = o.abs(ra, cb);
          const td = h("td", { text: signShort(rr.value), title: S.fmt(ra) + " " + o.sym + " " + S.fmt(cb) + " = " + S.fmt(rr.value), onclick: () => { A.set(ra, true); B.set(cb, true); update(); } });
          td.className = (rr.value === 7 ? "top " : "") + (ra === a && cb === b ? "cur" : "");
          tr.append(td);
        });
        tb.append(tr);
      });
      t.append(tb);
      tbl.innerHTML = '<div class="panel-title">Full table for ' + o.sym + " (rows S, columns T)</div>";
      tbl.append(h("div", { class: "table-wrap" }, [t]));
    }
    [A, B, wrap].forEach((c) => (c.onchange = update));
    update();
  }

  /* =====================================================================
     LAB 7: per-variable abstraction loses relations
     ===================================================================== */
  function labRelations(el) {
    const { controls, view } = PA.lab(el, {
      title: "What the per-variable abstraction forgets",
      hint: "Each cell is a concrete state $(x, y)$; click to add or remove it. The purple region is $\\gamma$ of the per-variable abstraction: every combination of an allowed $x$ with an allowed $y$. Orange dots are spurious states. The program then computes <code>10 / y</code>.",
    });
    const mode = PA.seg(controls, { label: "Abstraction", options: [["pv", "Pv: value sets"], ["sign", "Pv[Sign]: signs"]], value: "pv" });
    const br = PA.toggle(controls, { label: "then take the branch <code>x &gt; 0</code>", value: true });
    let St = new Set();
    const pres = PA.btnRow(controls);
    const diag = range(-4, 4).map((v) => v + "," + v);
    [["copyThenDivide: y = x", diag, true], ["{(1,−1), (−1,1)}", ["1,-1", "-1,1"], false], ["x > 0 and y > 0", range(1, 4).flatMap((x) => range(1, 4).map((y) => x + "," + y)), false], ["clear", [], false]].forEach(([l, xs, b]) =>
      PA.button(pres, l, () => { St = new Set(xs); br.set(b, true); update(); }, "sm"));
    const stats = PA.stats(view, [{ key: "c", label: "Concrete states" }, { key: "g", label: "States in γ (grid)" }, { key: "sp", label: "Spurious" }]);
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    const CS = 34, OX = 34, OY = 10, N = 9;
    const svg = mk("svg", { viewBox: "0 0 " + (OX + N * CS + 10) + " " + (OY + N * CS + 34), role: "group", "aria-label": "Grid of states (x, y)" });
    const cells = {};
    range(-4, 4).forEach((x) => range(-4, 4).forEach((y) => {
      const r = mk("rect", { x: OX + (x + 4) * CS + 1, y: OY + (4 - y) * CS + 1, width: CS - 2, height: CS - 2, rx: 4, class: "rg-cell", tabindex: "0", role: "button", "aria-label": "state x=" + x + ", y=" + y });
      const tog = () => { const k = x + "," + y; if (St.has(k)) St.delete(k); else St.add(k); update(); };
      r.addEventListener("click", tog);
      r.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tog(); } });
      const d = mk("circle", { cx: OX + (x + 4) * CS + CS / 2, cy: OY + (4 - y) * CS + CS / 2, r: 4, class: "rg-dot", style: "display:none" });
      svg.append(r, d);
      cells[x + "," + y] = { r, d };
    }));
    svg.append(mk("line", { x1: OX, y1: OY + 4.5 * CS, x2: OX + N * CS, y2: OY + 4.5 * CS, class: "rg-axis", "stroke-dasharray": "3 4" }));
    svg.append(mk("line", { x1: OX + 4.5 * CS, y1: OY, x2: OX + 4.5 * CS, y2: OY + N * CS, class: "rg-axis", "stroke-dasharray": "3 4" }));
    range(-4, 4).forEach((v) => {
      const tx = mk("text", { x: OX + (v + 4) * CS + CS / 2, y: OY + N * CS + 14, "text-anchor": "middle", class: "rg-lbl" }); tx.textContent = v; svg.append(tx);
      const ty = mk("text", { x: OX - 8, y: OY + (4 - v) * CS + CS / 2 + 3, "text-anchor": "end", class: "rg-lbl" }); ty.textContent = v; svg.append(ty);
    });
    const xl = mk("text", { x: OX + N * CS / 2, y: OY + N * CS + 30, "text-anchor": "middle", class: "rg-name" }); xl.textContent = "x";
    const yl = mk("text", { x: 8, y: OY + 12, class: "rg-name" }); yl.textContent = "y";
    svg.append(xl, yl);
    const desc = h("div", { class: "laws" });
    const verdict = verdictEl();
    view.append(h("div", { class: "split" }, [h("div", { class: "rg panel" }, [svg]), desc]), verdict);

    function update() {
      const pts = [...St].map((k) => k.split(",").map(Number));
      let conc = pts;
      let X = new Set(pts.map((p) => p[0])), Y = new Set(pts.map((p) => p[1]));
      let SX = S.abstract(X), SY = S.abstract(Y);
      if (br.value) {
        conc = pts.filter((p) => p[0] > 0);
        X = new Set([...X].filter((x) => x > 0));
        SX = S.meet(SX, S.POS);
      }
      const concSet = new Set(conc.map((p) => p.join(",")));
      const inG = (x, y) => (mode.value === "pv" ? X.has(x) && Y.has(y) : S.contains(SX, x) && S.contains(SY, y));
      let g = 0, sp = 0, zeroSpur = false;
      for (const k in cells) {
        const [x, y] = k.split(",").map(Number);
        const c = cells[k];
        const isC = concSet.has(k), isG = inG(x, y);
        if (isG) g++;
        if (isG && !isC) { sp++; if (y === 0) zeroSpur = true; }
        c.r.setAttribute("class", "rg-cell" + (isC ? " conc" : isG ? " gam" : "") + (isG && y === 0 ? " zero" : ""));
        c.d.style.display = isG && !isC ? "" : "none";
      }
      const unbounded = mode.value === "sign" && (SX & (S.NEG | S.POS)) && SY !== 0 || mode.value === "sign" && (SY & (S.NEG | S.POS)) && SX !== 0;
      stats.set("c", String(conc.length));
      stats.set("g", g + (unbounded ? " (∞ overall)" : ""));
      stats.set("sp", String(sp), sp ? "warn" : "good");
      desc.innerHTML = "";
      const row = (tex, v) => desc.append(h("div", { class: "law" }, [h("span", { class: "mk" }), h("span", { class: "lt", html: PA.tex(tex) }), h("span", { class: "lv", text: v || "" })]));
      if (mode.value === "pv") {
        row("x \\in " + setTex(X));
        row("y \\in " + setTex(Y));
        row("\\gamma = " + (X.size && Y.size ? "\\{x\\text{'s}\\} \\times \\{y\\text{'s}\\}" : "\\emptyset"), X.size * Y.size + " states");
      } else {
        row("x \\in " + S.tex(SX));
        row("y \\in " + S.tex(SY));
        row("\\gamma = " + GAMMA_TEX[SX].replace(/n/g, "x") + " \\times " + GAMMA_TEX[SY].replace(/n/g, "y"));
      }
      const realZero = conc.some((p) => p[1] === 0);
      const gZero = range(-4, 4).some((x) => inG(x, 0));
      if (!conc.length) setVerdict(verdict, "", "No concrete state: add some by clicking the grid, or pick a preset.");
      else if (realZero) setVerdict(verdict, "bad", "A real state has $y = 0$: <code>10 / y</code> really can divide by zero. The alarm would be a <b>true alarm</b>.");
      else if (gZero) setVerdict(verdict, "warn", "<b>False alarm:</b> no real state has $y = 0$, but the abstraction allows " + (zeroSpur ? "spurious states on the row $y = 0$" : "$y = 0$") + ", so <code>10 / y</code> must be reported as a possible division by zero." + (br.value ? " Inside the branch only $x$ is known to be positive; the abstraction no longer knows that $y = x$." : ""));
      else setVerdict(verdict, "good", "No state in $\\gamma$ has $y = 0$: the analysis can prove <code>10 / y</code> safe here." + (sp ? " It still over-approximates (" + sp + " spurious states), harmlessly for this question." : ""));
    }
    [mode, br].forEach((c) => (c.onchange = update));
    St = new Set(diag);
    update();
  }

  /* =====================================================================
     LAB 8: the abstraction ladder
     ===================================================================== */
  function labLadder(el) {
    const { controls, view } = PA.lab(el, {
      title: "The same behaviours at every level of the chain",
      hint: "We compute the exact $\\Delta^n$ for a small input range, then abstract it step by step down the chain. Watch what each level keeps, and how many concrete states each level's $\\gamma$ stands for.",
    });
    const progSel = PA.select(controls, {
      label: "Program",
      options: [["divideAfterCheck", "divideAfterCheck(int x)"], ["copyThenDivide", "copyThenDivide(int x)"], ["checkTheWrongThing", "checkTheWrongThing(int a)"], ["divideByN", "divideByN(int n)"], ["assertPositive", "assertPositive(int num)"]],
      value: "copyThenDivide",
    });
    const rad = PA.slider(controls, { label: "Inputs from −r to r", min: 1, max: 3, value: 2, fmt: (v) => "r = " + v });
    const nS = PA.slider(controls, { label: "Rounds n", min: 0, max: 12, value: 8, fmt: (v) => "n = " + v });
    const out = h("div", { class: "lad no-math" });
    view.append(out);
    const arrow = (t) => h("div", { class: "lad-arrow", text: "↓ " + t });
    function level(title, sub, body) {
      return h("div", { class: "lad-level" }, [h("div", { class: "lad-head" }, [h("b", { text: title }), h("span", { text: sub })]), h("div", { class: "lad-body" }, [body])]);
    }
    function table(head, rows) {
      const t = h("table", { class: "dt" });
      t.append(h("thead", null, [h("tr", null, head.map((x) => h("th", { text: x })))]));
      const tb = h("tbody");
      rows.forEach((r) => tb.append(h("tr", null, r.map((x, i) => h("td", { class: i === 0 ? "mono" : "mono", text: x })))));
      t.append(tb);
      return t;
    }
    function update() {
      const prog = J.get(progSel.value);
      const inputs = range(-rad.value, rad.value);
      const D = deltaN(prog, inputs, nS.value, "exact");
      out.innerHTML = "";
      // 1. traces
      const tl = h("div");
      D.maximal.slice(0, 8).forEach((t) => tl.append(h("div", { class: "trace-line", text: "x = " + t.input + ": " + pcsOf(t).join(" → ") })));
      if (D.maximal.length > 8) tl.append(h("div", { class: "trace-line", text: "… " + (D.maximal.length - 8) + " more longest traces" }));
      out.append(level("1. Sets of traces  2^Trace", D.all.length + " traces (all prefixes, " + D.maximal.length + " longest)", tl));
      // 2. states
      out.append(arrow("α: keep only the last state of each trace"));
      const states = [...D.states.values()];
      const frames = states.filter((s) => typeof s !== "string");
      const outs = states.filter((s) => typeof s === "string");
      const sl = h("div");
      frames.slice(0, 10).forEach((s) => sl.append(h("div", { class: "trace-line", text: stateShort(s) })));
      if (frames.length > 10) sl.append(h("div", { class: "trace-line", text: "… " + (frames.length - 10) + " more states" }));
      if (outs.length) sl.append(h("div", { class: "trace-line", text: "outcome states: " + outs.join(", ") }));
      out.append(level("2. Sets of states  2^State", states.length + " distinct states reachable within " + nS.value + " steps", sl));
      // 3. per pc
      out.append(arrow("α: group the states by program counter ι"));
      const byPc = new Map();
      frames.forEach((s) => { const pc = topFrame(s).pc.off; if (!byPc.has(pc)) byPc.set(pc, []); byPc.get(pc).push(s); });
      const pcs = [...byPc.keys()].sort((a, b) => a - b);
      out.append(level("3. Per instruction  Pc = ι → 2^State", pcs.length + " instructions reached; nothing lost", table(["ι", "instruction", "#states", "states (locals | stack)"],
        pcs.map((pc) => { const ss = byPc.get(pc); return [String(pc), J.fmtIns(prog.code[pc]), String(ss.length), ss.slice(0, 3).map((s) => { const f = topFrame(s); return "λ=[" + f.locals.map(valShort).join(",") + "] σ=" + (f.stack.map(valShort).join(",") || "ε"); }).join(";  ") + (ss.length > 3 ? ";  …" : "")]; }))));
      // 4. per variable
      out.append(arrow("α: one set of values per local and per stack slot"));
      let totSp = 0;
      const pvRows = pcs.map((pc) => {
        const ss = byPc.get(pc).map(topFrame);
        const nl = Math.max(...ss.map((f) => f.locals.length)), ns = ss[0].stack.length;
        const L = range(0, nl - 1).map((i) => new Set(ss.map((f) => valShort(f.locals[i]))));
        const K = range(0, ns - 1).map((j) => new Set(ss.map((f) => valShort(f.stack[j]))));
        const gsize = L.concat(K).reduce((p, s) => p * s.size, 1);
        totSp += gsize - ss.length;
        const fmt = (s) => "{" + [...s].sort((a, b) => Number(a) - Number(b)).join(",") + "}";
        return [String(pc), L.map(fmt).join(" ") || "·", K.map(fmt).join(" ") || "ε", gsize + " (" + (gsize - ss.length) + " spurious)"];
      });
      out.append(level("4. Per variable  Pv", totSp ? totSp + " spurious frames appear: relations are lost" : "no spurious frame for these inputs", table(["ι", "locals λ", "stack σ", "|γ| at ι"], pvRows)));
      // 5. signs
      out.append(arrow("α: replace each value set by its signs"));
      const sgRows = pcs.map((pc) => {
        const ss = byPc.get(pc).map(topFrame);
        const nl = Math.max(...ss.map((f) => f.locals.length)), ns = ss[0].stack.length;
        const sg = (vals) => { if (vals.some((v) => v == null || v.t !== "int")) return vals.every((v) => v && v.t === "ref") ? "ref" : "·"; return S.fmt(S.abstract(vals.map((v) => v.v))); };
        const L = range(0, nl - 1).map((i) => sg(ss.map((f) => f.locals[i])));
        const K = range(0, ns - 1).map((j) => sg(ss.map((f) => f.stack[j])));
        const inf = L.concat(K).some((x) => x.includes("+") || x.includes("−"));
        return [String(pc), L.join(" ") || "·", K.join(" ") || "ε", inf ? "∞" : "1"];
      });
      out.append(level("5. Signs per variable  Pv[Sign]", "8 possible values per slot; γ is usually infinite", table(["ι", "locals λ", "stack σ", "|γ| at ι"], sgRows)));
      out.append(h("div", { class: "verdict", text: "These levels abstract the real reachable states, α(Δⁿ): the best any analysis over these domains could do. The abstract interpreter of topic 22 never sees the real states; it computes Δ_Aⁿ directly on the abstract level, which can only be larger (Theorem 5.38). For copyThenDivide, compare the divisor at ι = 6 here ({+}) with what the abstract interpreter finds (⊤)." }));
    }
    [progSel, rad, nS].forEach((c) => (c.onchange = update));
    update();
  }

  /* =====================================================================
     LAB 10: parse / pretty round trips
     ===================================================================== */
  function ppParse(s) {
    const toks = [];
    const re = /\s*(?:(\d+)|([A-Za-z_]\w*)|(.))/gy;
    let m;
    while (re.lastIndex < s.length && (m = re.exec(s))) {
      if (m[1]) toks.push({ k: "num", v: Number(m[1]) });
      else if (m[2]) toks.push({ k: "var", v: m[2] });
      else if (m[3] && m[3].trim()) {
        if (!"+-*()".includes(m[3])) throw new Error("unexpected character '" + m[3] + "'");
        toks.push({ k: m[3] });
      }
    }
    let i = 0;
    const peek = () => toks[i] || { k: "eof" };
    const eat = (k) => { if (peek().k !== k) throw new Error("expected " + (k === "eof" ? "end of input" : "'" + k + "'")); return toks[i++]; };
    function expr() { let l = term(); while (peek().k === "+" || peek().k === "-") { const op = toks[i++].k; l = { k: "bin", op, l, r: term() }; } return l; }
    function term() { let l = unary(); while (peek().k === "*") { i++; l = { k: "bin", op: "*", l, r: unary() }; } return l; }
    function unary() { // the parser folds a negated literal into a negative literal, so it never produces Neg(Num(n))
      if (peek().k === "-") { i++; const e = unary(); return e.k === "num" ? { k: "num", v: -e.v } : { k: "neg", e }; }
      return atom();
    }
    function atom() {
      const t = peek();
      if (t.k === "num") { i++; return { k: "num", v: t.v }; }
      if (t.k === "var") { i++; return { k: "var", v: t.v }; }
      if (t.k === "(") { i++; const e = expr(); eat(")"); return e; }
      throw new Error("unexpected " + (t.k === "eof" ? "end of input" : "'" + t.k + "'"));
    }
    const e = expr();
    eat("eof");
    return e;
  }
  function ppPretty(e, prec) {
    prec = prec || 0;
    const wrap = (s, p) => (p < prec ? "(" + s + ")" : s);
    switch (e.k) {
      case "num": return e.v < 0 && prec >= 3 ? "(" + e.v + ")" : String(e.v);
      case "var": return e.v;
      case "neg": return wrap("-" + ppPretty(e.e, 3), 3);
      case "bin": {
        const p = e.op === "*" ? 2 : 1;
        return wrap(ppPretty(e.l, p) + " " + e.op + " " + ppPretty(e.r, p + 1), p);
      }
    }
    return "?";
  }
  function ppTerm(e) {
    switch (e.k) {
      case "num": return "Num(" + e.v + ")";
      case "var": return "Var(" + e.v + ")";
      case "neg": return "Neg(" + ppTerm(e.e) + ")";
      case "bin": return "Bin(" + e.op + ", " + ppTerm(e.l) + ", " + ppTerm(e.r) + ")";
    }
    return "?";
  }
  const NUM = (v) => ({ k: "num", v }), VAR = (v) => ({ k: "var", v }), NEG = (e) => ({ k: "neg", e }), BIN = (op, l, r) => ({ k: "bin", op, l, r });
  const PP_TREES = {
    parsed: null,
    neg1: NEG(NUM(1)),
    negmul: BIN("*", NEG(NUM(2)), VAR("x")),
    assoc: BIN("+", NUM(1), BIN("+", NUM(2), NUM(3))),
    negneg: NEG(NEG(VAR("x"))),
  };
  function labParsePretty(el) {
    const { controls, view } = PA.lab(el, {
      title: "Round-trip laws for a tiny parser and pretty-printer",
      hint: "The parser reads numbers, variables, <code>+ - *</code> and parentheses; it forgets spacing and redundant parentheses and folds <code>-(1)</code> into the literal <code>-1</code>. Trees can also be built by hand (as a compiler pass would). Which laws survive?",
    });
    const inp = PA.textInput(controls, { label: "Input string s", value: "-(1) + ( x*2 )" });
    const pres = PA.btnRow(controls);
    ["-(1) + ( x*2 )", "1 - (2 - 3)", "((x))", "1 + 2 + 3", "-x * -2"].forEach((s) => PA.button(pres, s, () => inp.set(s), "sm"));
    const treeSel = PA.select(controls, {
      label: "Tree a",
      options: [["parsed", "a = parse(s)"], ["neg1", "Neg(Num(1)), built by hand"], ["negmul", "Bin(*, Neg(Num(2)), Var(x)), by hand"], ["assoc", "Bin(+, Num(1), Bin(+, Num(2), Num(3)))"], ["negneg", "Neg(Neg(Var(x)))"]],
      value: "neg1",
    });
    const rows = h("div", { class: "pp-rows no-math" });
    const laws = h("div", { class: "laws" });
    const verdict = verdictEl();
    view.append(h("div", { class: "panel" }, [rows]), laws, verdict);
    function update() {
      rows.innerHTML = ""; laws.innerHTML = "";
      const row = (k, v) => rows.append(h("div", { class: "pp-row" }, [h("span", { class: "k", text: k }), h("span", { class: "v", text: v })]));
      let ps;
      try { ps = ppParse(inp.value); inp.bad(false); } catch (e) { inp.bad(true); row("parse(s)", "parse error: " + e.message); setVerdict(verdict, "bad", "The input string does not parse."); return; }
      const a = treeSel.value === "parsed" ? ps : PP_TREES[treeSel.value];
      const eq = (x, y) => ppTerm(x) === ppTerm(y);
      const p1 = ppPretty(a), a2 = ppParse(p1), p2 = ppPretty(a2);
      const sp = ppPretty(ps), sps = ppParse(sp);
      row("s", inp.value); row("parse(s)", ppTerm(ps)); row("pretty(parse(s))", sp); row("parse(pretty(parse(s)))", ppTerm(sps));
      row("a", ppTerm(a)); row("pretty(a)", p1); row("parse(pretty(a))", ppTerm(a2)); row("pretty(parse(pretty(a)))", p2);
      const law = (ok, txt, note) => laws.append(h("div", { class: "law " + (ok ? "good" : "bad") }, [h("span", { class: "mk", text: ok ? "✓" : "✗" }), h("span", { class: "lt", html: txt }), h("span", { class: "lv", text: note })]));
      const l1 = eq(a2, a);
      law(l1, "<code>parse(pretty(a)) == a</code>", "most of the time");
      law(p2 === p1, "<code>pretty(parse(pretty(a))) == pretty(a)</code>", "always: γαγ = γ");
      law(eq(sps, ps), "<code>parse(pretty(parse(s))) == parse(s)</code>", "always: αγα = α");
      setVerdict(verdict, l1 ? "good" : "warn", l1 ? "All three laws hold for this tree and string." :
        "The tree <code>" + PA.esc(ppTerm(a)) + "</code> prints as <code>" + PA.esc(p1) + "</code>, which parses back to a <em>different</em> tree: information was lost once. Printing again gives the same text, so the loss does not repeat. That is the \"lose it only once\" law.");
    }
    inp.onchange = update;
    treeSel.onchange = update;
    update();
  }

  /* =====================================================================
     Boot
     ===================================================================== */
  const LABS = {
    bfs: labBfs,
    manystep: labManystep,
    alpha: labAlpha,
    hasse: labHasse,
    galoischeck: labGaloisCheck,
    signops: labSignOps,
    relations: labRelations,
    ladder: labLadder,
    parsepretty: labParsePretty,
  };

  PA.boot("bounded-static-analysis", LABS, QUIZ);
})();
