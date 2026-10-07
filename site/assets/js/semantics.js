/* Week 3, Semantics: quiz bank and interactive labs. */
(function () {
  "use strict";
  const h = PA.h;
  const esc = PA.esc;
  const J = PA.jvm;

  /* =====================================================================
     QUIZ BANK.  Each option: [text (HTML, $math$ allowed), isCorrect, explanation]
     ===================================================================== */
  const QUIZ = {
    deduction: [
      {
        q: "In the rule $\\dfrac{A \\quad B}{A \\land B}\\rulename{\\land}$, what are $A$ and $B$?",
        options: [
          ["The premises: what must hold before the rule may be used", true, "Everything above the line is a premise. If all premises hold, the conclusion below the line holds."],
          ["The conclusions of the rule", false, "The conclusion is the single judgement below the line, here $A \\land B$."],
          ["Axioms that are always true", false, "An axiom is a rule with no premises. $A$ and $B$ are premises that you still have to establish."],
          ["The context of the judgement", false, "A context appears left of a turnstile $\\vdash$. This rule has no turnstile at all."],
        ],
      },
      {
        q: "Why does disjunction $A \\lor B$ get two rules while conjunction $A \\land B$ gets only one?",
        options: [
          ["Because the rules for $\\lor$ are incomplete", false, "They are complete for introducing a disjunction: one rule per way of establishing it."],
          ["Either disjunct alone is enough, so there are two separate ways to conclude $A \\lor B$; a conjunction needs both parts at once", true, "Several rules with the same conclusion shape are alternatives. $\\lor_L$ uses $A$, $\\lor_R$ uses $B$. One rule with both premises would wrongly demand both."],
          ["Because $\\lor$ is evaluated left to right", false, "Rules are not evaluated in an order; they state which conclusions follow from which premises."],
          ["It is a convention; one rule with premise $A$ or $B$ would be the same", false, "A single rule has a fixed list of premises that must all hold, so it cannot express a choice; that is exactly why there are two rules."],
        ],
      },
      {
        q: "From the assumptions $\\{B\\}$, using only the rules $\\land$, $\\lor_L$ and $\\lor_R$, which judgement can you derive?",
        options: [
          ["$A \\land B$", false, "The $\\land$ rule needs a derivation of $A$ too, and $A$ is not an assumption."],
          ["$A \\lor B$", true, "Apply $\\lor_R$ to the assumption $B$: one line, one rule."],
          ["$A$", false, "No rule produces a bare atom except using it as an assumption, and $A$ is not one."],
          ["$B \\land C$", false, "You would need $C$ as well."],
        ],
      },
      {
        q: "A rule with no premises at all is...",
        options: [
          ["invalid, every rule needs a premise", false, "Rules with zero premises are allowed and important: they are the leaves of every derivation."],
          ["an axiom: its conclusion holds outright", true, "With $n = 0$ the implication $J_1 \\land \\cdots \\land J_n \\implies J$ has an empty (true) left side, so $J$ always holds. Example: $\\frac{}{n \\downarrow n}$ for numbers."],
          ["a rule whose conclusion is always false", false, "It is the opposite: nothing has to be shown, so the conclusion always follows."],
          ["the same as an assumption in $\\Gamma$", false, "Assumptions are given for one particular derivation; an axiom is part of the rule system and holds in every derivation."],
        ],
      },
    ],

    what: [
      {
        q: "<code>1 + 2</code> and <code>2 + 1</code> are...",
        options: [
          ["the same syntax and the same semantics", false, "They are different strings, so the syntax differs."],
          ["different syntax with the same semantics", true, "Different text, same meaning: both mean 3. A semantics makes this precise: $\\sem{\\mathtt{1+2}} = \\sem{\\mathtt{2+1}}$."],
          ["different syntax and different semantics", false, "Both evaluate to 3 in any store, so their meanings coincide."],
          ["impossible to compare without running them", false, "A denotational semantics lets us compute both meanings with plain arithmetic, no machine needed."],
        ],
      },
      {
        q: "Which style of semantics does the course use for JVM bytecode?",
        options: [
          ["Axiomatic (Hoare logic)", false, "Hoare logic is used for verifying specific programs, not as the course's definition of the JVM."],
          ["Denotational", false, "Denotational semantics suits expression languages; the JVM is a stateful machine."],
          ["Small-step operational semantics", true, "Each instruction gets a rule $\\bc \\vdash s \\to \\bar s$, which maps directly to one case of the interpreter you write."],
          ["Big-step operational semantics", false, "Big-step semantics cannot describe non-terminating runs or intermediate states, which the analyses need."],
        ],
      },
      {
        q: "Which style describes the meaning of a statement by what is true before and after it?",
        options: [
          ["Operational", false, "Operational semantics describes how the machine moves from state to state."],
          ["Axiomatic", true, "Axiomatic semantics attaches pre and postconditions, as Hoare triples $\\{P\\}\\,C\\,\\{Q\\}$."],
          ["Denotational", false, "Denotational semantics maps the program to a mathematical object, e.g. a function."],
          ["Syntactic", false, "There is no syntactic semantics; syntax is the opposite of meaning."],
        ],
      },
    ],

    hoare: [
      {
        q: "What does $\\{x \\geq 0\\}\\ \\mathtt{y := x + 1}\\ \\{y \\gt 0\\}$ claim?",
        options: [
          ["$y \\gt 0$ holds before the assignment", false, "The postcondition is about the state after the statement."],
          ["Every state with $x \\geq 0$ ends, after the assignment, in a state with $y \\gt 0$", true, "That is a (partial correctness) Hoare triple: precondition before, postcondition after, for every start state satisfying the precondition."],
          ["The assignment sets $x$ to a non-negative value", false, "The statement assigns $y$, and $x \\geq 0$ is an assumption about the start state."],
          ["If $y \\gt 0$ afterwards then $x \\geq 0$ before", false, "That is the converse; triples go from precondition to postcondition."],
        ],
      },
      {
        q: "You proved $\\{P_1\\}\\,C_1\\,\\{y \\gt 1\\}$ and $\\{y \\gt 0\\}\\,C_2\\,\\{Q_2\\}$. May you conclude $\\{P_1\\}\\,C_1;C_2\\,\\{Q_2\\}$ with the sequencing rule?",
        options: [
          ["No, the middle assertions must be identical", false, "They only need $Q_1 \\Rightarrow P_2$, not equality."],
          ["Yes, because $y \\gt 1 \\Rightarrow y \\gt 0$", true, "The side condition $Q_1 \\Rightarrow P_2$ holds: what $C_1$ guarantees is more than what $C_2$ needs."],
          ["Only if $C_2$ does not change $y$", false, "The rule has no such condition; $C_2$'s own triple takes care of what it changes."],
          ["No, the implication goes the wrong way", false, "The rule needs exactly $Q_1 \\Rightarrow P_2$, and $y \\gt 1 \\Rightarrow y \\gt 0$ is that direction."],
        ],
      },
      {
        q: "Is the partial correctness triple $\\{\\mathit{true}\\}\\ \\mathtt{while\\ true\\ do\\ skip}\\ \\{\\mathit{false}\\}$ valid?",
        options: [
          ["No, nothing can establish $\\mathit{false}$", false, "Nothing reaches the postcondition because the loop never ends; partial correctness only constrains terminating runs."],
          ["Yes: the loop never terminates, so there is no end state that could violate the postcondition", true, "Partial correctness says \"if it terminates, then $Q$\". With no terminating run, the triple holds vacuously. Total correctness would reject it."],
          ["It depends on the initial state", false, "The loop diverges from every state."],
          ["Only under total correctness", false, "It is the other way around: total correctness requires termination, so $[\\mathit{true}]\\,\\ldots\\,[\\mathit{false}]$ is invalid."],
        ],
      },
      {
        q: "Why is axiomatic semantics rarely used for automatic program analysis at large?",
        options: [
          ["Because it cannot describe loops", false, "The while rule handles loops, given an invariant."],
          ["Because proofs need assertions such as loop invariants for each specific program, usually supplied by a human", true, "It shines at verifying one program with annotations. A general analysis has to work on unannotated code."],
          ["Because Hoare triples are unsound", false, "Hoare logic is sound with respect to the operational semantics."],
          ["Because it only works for functional languages", false, "Hoare logic was designed for imperative programs with assignments."],
        ],
      },
    ],

    denotational: [
      {
        q: "What does $\\mathcal{E} : \\mathbb{EX} \\to (\\Sigma \\to \\N)$ say?",
        options: [
          ["Each expression is mapped to a function from stores to natural numbers", true, "The meaning of an expression is how its value depends on the store."],
          ["Each store is mapped to an expression", false, "The arrow goes from expressions to functions; stores are the input of those functions."],
          ["Expressions are executed step by step", false, "That would be operational semantics. $\\mathcal{E}$ jumps straight to a mathematical function."],
          ["Each expression has a type", false, "$\\mathcal{E}$ gives values, not types."],
        ],
      },
      {
        q: "Let $\\sigma = [x \\mapsto 2, y \\mapsto 4]$. What is $\\Den{\\mathtt{x + y + 1}}\\,\\sigma$?",
        options: [
          ["$7$", true, "$\\Den{\\mathtt{x + y}}\\sigma + \\Den{\\mathtt{1}}\\sigma = (2 + 4) + 1 = 7$."],
          ["$\\mathtt{x + y + 1}$", false, "That is the syntax, not its meaning."],
          ["$6$", false, "You forgot the literal 1."],
          ["Undefined, because $\\mathcal{E}$ needs a big-step derivation", false, "Denotations are computed by equations, with ordinary arithmetic."],
        ],
      },
      {
        q: "What does it mean that $\\mathcal{E}$ is compositional?",
        options: [
          ["It can be composed with other functions", false, "Any function can; compositionality is about how the definition is structured."],
          ["The meaning of a compound expression depends only on the meanings of its parts", true, "$\\Den{e_1 + e_2}$ uses $e_1$ and $e_2$ only through $\\Den{e_1}$ and $\\Den{e_2}$. Hence equal-meaning parts can be swapped."],
          ["Every expression is a composition of numbers", false, "Variables are not numbers; compositionality is a property of the meaning function."],
          ["The store is built from smaller stores", false, "Stores are simply maps from variables to numbers."],
        ],
      },
    ],

    operational: [
      {
        q: "What does $\\psi \\vdash \\sigma \\to \\bar\\sigma$ express?",
        options: [
          ["In environment $\\psi$, state $\\sigma$ takes exactly one step to $\\bar\\sigma$", true, "Single arrow, single step. The bar marks \"the next\" state."],
          ["$\\sigma$ runs to completion with result $\\bar\\sigma$", false, "That is the big-step judgement, written with $\\downarrow$."],
          ["$\\sigma$ and $\\bar\\sigma$ are equivalent", false, "The arrow is a step, not equality."],
          ["$\\bar\\sigma$ is the negation of $\\sigma$", false, "The bar is just a name for the successor state."],
        ],
      },
      {
        q: "Using the left-to-right small-step rules, what is the first step of $(1 + 2) + (3 + 4)$?",
        options: [
          ["$(1 + 2) + 7$", false, "The rules only step the right operand once the left one is a number."],
          ["$3 + (3 + 4)$", true, "Rule $+_L$ applies (the left side is not a number), and its premise $1 + 2 \\to 3$ comes from $+_N$."],
          ["$10$", false, "That is the big-step result; small steps do one operation at a time."],
          ["$3 + 7$", false, "That takes two steps."],
        ],
      },
      {
        q: "Which statement describes big-step semantics?",
        options: [
          ["It relates a program directly to its final value and hides the order of intermediate steps", true, "$\\psi \\vdash \\sigma \\downarrow v$ says \"$\\sigma$ evaluates to $v$\" in one judgement whose derivation tree contains the sub-evaluations."],
          ["It is easier to turn into a pausable interpreter", false, "Small-step is the one that maps to a step function you can pause."],
          ["It describes infinite runs", false, "A diverging program simply has no big-step derivation."],
          ["It needs fewer rules than small-step for the same language", false, "Often it does need fewer rules, but that is not what defines it."],
        ],
      },
    ],

    lambda: [
      {
        q: "What is a closure $(\\psi_1 \\mid \\lambda x.e)$?",
        options: [
          ["A function together with the environment it was created in", true, "The closure remembers $\\psi_1$, so variables the function captured keep their values when it is called later."],
          ["A function that has already been called", false, "A closure is a value that can still be called."],
          ["An expression with all variables removed", false, "Variables stay; the environment says what they mean."],
          ["A finished trace", false, "Closures are values of the lambda calculus, not traces."],
        ],
      },
      {
        q: "When does rule $\\beta^2$ apply to an application $e_1\\,e_2$?",
        options: [
          ["When $e_1$ is not yet a value", false, "Then $\\beta^1$ applies: step the function first."],
          ["When $e_1$ is already a closure and $e_2$ can still take a step", true, "$\\beta^2$ steps the argument once the function part is finished. This fixes call-by-value, left-to-right order."],
          ["When both are values", false, "Then $\\beta^3$ applies and the body is entered."],
          ["Always, it is the only application rule", false, "There are three application rules, one per phase."],
        ],
      },
      {
        q: "The notes' big-step rule evaluates the body in $\\psi[x \\mapsto v_2]$, the caller's environment. Which scoping does that model?",
        options: [
          ["Lexical (static) scoping", false, "Lexical scoping uses the environment where the function was defined, i.e. the closure's $\\psi_1$."],
          ["Dynamic scoping", true, "Free variables of the body would be looked up where the function is called. The small-step rules with closures give lexical scoping instead."],
          ["No scoping; variables are global", false, "Environments are extended and passed around, so there is scoping."],
          ["Both, since they always coincide", false, "They differ as soon as a function refers to a variable that the caller binds differently."],
        ],
      },
    ],

    "small-to-big": [
      {
        q: "What does big-step semantics say about <code>while (true) {}</code>?",
        options: [
          ["It evaluates to a special value $\\infty$", false, "There is no such value; there is simply no derivation."],
          ["Nothing: there is no derivation of any $\\sigma \\downarrow v$, exactly as for a program that gets stuck", true, "Corollary 3.15: big-step cannot tell \"loops forever\" from \"crashes\". Small-step shows the infinite chain of steps."],
          ["It derives $\\sigma \\downarrow \\mathtt{ok}$", false, "The loop never finishes, so no value is reached."],
          ["It derives an error", false, "Errors need an error rule; a loop does not trigger one."],
        ],
      },
      {
        q: "Rule (step) concludes $\\psi \\vdash \\sigma \\downarrow v$ from which premises?",
        options: [
          ["$\\sigma \\to v$ only", false, "That is the (done) rule."],
          ["One small step $\\sigma \\to \\bar\\sigma$, and $\\bar\\sigma \\downarrow v$", true, "Take one step, then the rest of the run evaluates to $v$. Unfolding the recursion is \"keep stepping until a value\"."],
          ["$\\sigma \\downarrow \\bar\\sigma$ and $\\bar\\sigma \\downarrow v$", false, "The first premise is a single small step, not a big step."],
          ["None, it is an axiom", false, "It has two premises."],
        ],
      },
      {
        q: "Why does the course build on small-step semantics?",
        options: [
          ["It is shorter to write", false, "Usually it needs more rules."],
          ["It turns directly into a step function: we can bound the number of steps, inspect every intermediate state and describe runs that never end", true, "All three are what interpreters, dynamic analyses and bounded static analyses need."],
          ["Big-step semantics is unsound", false, "Both describe the same terminating results (Proposition 3.14)."],
          ["Java's specification is written in small-step style", false, "The JVM specification is prose; the course chooses small-step for the reasons above."],
        ],
      },
    ],

    "transition-system": [
      {
        q: "What are the three components of a transition system $\\langle \\State_p, \\delta_p, I_p \\rangle$?",
        options: [
          ["States, transition relation, initial states", true, "All positions, the legal moves (from the step rules), and where runs may begin."],
          ["Syntax, semantics, analysis", false, "Those are topics, not parts of a transition system."],
          ["Heap, call stack, program counter", false, "Those make up one JVM state, an element of $\\State_p$."],
          ["Inputs, outputs, errors", false, "Outcomes are particular states; inputs determine initial states."],
        ],
      },
      {
        q: "How many initial states does <code>assertPositive(int num)</code> have?",
        options: [
          ["1", false, "There is one initial state per possible argument value."],
          ["2, one per JPAMB case", false, "The cases are just two examples of inputs."],
          ["$2^{32}$, one per <code>int</code> value of <code>num</code>", true, "The locals of the initial frame hold the argument, and an int has $2^{32}$ values."],
          ["Infinitely many", false, "Java ints are 32-bit, so there are finitely many."],
        ],
      },
      {
        q: "Why is $\\delta_p$ a relation rather than a function?",
        options: [
          ["Because the JVM is non-deterministic", false, "Our JVM semantics is deterministic; the general definition just allows more."],
          ["So that the same definition covers non-deterministic programs (threads, random choice), where a state can have several successors", true, "For our deterministic JVM, $\\delta_p$ happens to be a partial function: at most one successor per state."],
          ["Because final states have two successors", false, "Final states ($\\ok$, errors) have no successors."],
          ["Functions cannot be defined by inference rules", false, "They can; determinism is a property of the rules."],
        ],
      },
    ],

    traces: [
      {
        q: "In a trace $\\tau \\in \\Sem(p)$, what is $\\tau_0$?",
        options: [
          ["The last state", false, "$\\tau_{|\\tau|-1}$ is the last state of a finite trace."],
          ["An initial state, $\\tau_0 \\in I_p$", true, "Every trace starts in one of the initial states."],
          ["The empty state", false, "There is no empty state; $\\tau_0$ is a real state."],
          ["The number of steps", false, "The length is $|\\tau|$."],
        ],
      },
      {
        q: "When is $p \\in \\mathcal{L}_{\\mathit{halt}}$?",
        options: [
          ["When some trace of $p$ is finite", false, "That only says $p$ halts on some input."],
          ["When every trace in $\\Sem(p)$ is finite", true, "$\\mathcal{L}_{\\mathit{halt}} = \\{p \\mid \\forall \\tau \\in \\Sem(p).\\ |\\tau| \\neq \\infty\\}$."],
          ["When the interpreter returns within 1000 steps", false, "A budget only tests finitely many steps of finitely many inputs."],
          ["When $p$ has no loops", false, "Loops can terminate (sumTo), and recursion can loop forever without a loop statement."],
        ],
      },
      {
        q: "Running <code>countdown(-1)</code> with a budget of 1000 steps gives <code>*</code>. What do you know?",
        options: [
          ["The trace is infinite", false, "Not from a budget. In fact with 32-bit wrap-around <code>n</code> reaches $-2^{31}$, wraps to $2^{31}-1$ and counts down to 0, so the trace ends after about 4.3 billion iterations."],
          ["Only that the trace has more states than the budget", true, "A budget can never prove non-termination. That needs a different argument (for example, a repeated state in a deterministic system), and in general it is undecidable."],
          ["The program has a bug", false, "Taking long is not a bug by itself."],
          ["The trace ends in an error", false, "No error happened within the budget."],
        ],
      },
    ],

    jvm: [
      {
        q: "Why does Java compile to bytecode instead of machine code?",
        options: [
          ["Bytecode is faster than machine code", false, "Speed comes from the JIT compiler; the point of bytecode is portability."],
          ["Write once, run anywhere: one virtual machine per platform runs the same class files", true, "The JVM hides the differences between x86, ARM, RISC-V and others."],
          ["Bytecode cannot be decompiled", false, "It decompiles very well; the course relies on that."],
          ["Machine code cannot express objects", false, "Everything ends up as machine code eventually."],
        ],
      },
      {
        q: "javap prints <code>3: ifne 18</code> but the course listing says <code>1: ifz ne 8</code>. Why the different numbers?",
        options: [
          ["They are different methods", false, "Same method; the numbering differs."],
          ["javap shows byte offsets; jvm2json numbers instructions 0, 1, 2, ...", true, "Instructions have different byte lengths, so byte offsets skip numbers. Our jump targets are instruction indices."],
          ["jvm2json reorders the code", false, "The order is preserved."],
          ["One of them is wrong", false, "Both are correct, in different units."],
        ],
      },
      {
        q: "Roughly how many instructions does the course's intermediate language have, compared to the JVM?",
        options: [
          ["About 39 instead of about two hundred", true, "jvm2json merges typed variants (like iload, aload, iload_0) into general instructions with a type field."],
          ["Exactly the same set", false, "The point of the intermediate language is to be smaller."],
          ["About 10", false, "Too few: you still need loads, stores, branches, calls, arrays, objects, ..."],
          ["About 500", false, "The real JVM has around two hundred."],
        ],
      },
    ],

    "reading-bytecode": [
      {
        q: "In <code>assertFalse</code>, why is there a <code>dup</code> right after <code>new</code>?",
        options: [
          ["To make the error message longer", false, "Duplicating a reference copies the pointer, not the object."],
          ["The constructor call consumes one reference and <code>throw</code> needs another, so the reference is copied first", true, "Stack: [ref] after new, [ref, ref] after dup, [ref] after invoke special &lt;init&gt;, then throw uses it."],
          ["To allocate two AssertionError objects", false, "Only one object is allocated; dup copies the reference to it."],
          ["Because <code>throw</code> pops two values", false, "throw pops one reference."],
        ],
      },
      {
        q: "What does instruction 1, <code>ifz ne 6</code>, do in <code>assertFalse</code>?",
        options: [
          ["Jumps to 6 if the top of the stack is zero", false, "<code>ne</code> means \"not equal to zero\"."],
          ["Pops the value; if it is not zero (assertions disabled) it jumps to 6 (return), otherwise continues at 2", true, "That skips the assertion when assertions are turned off."],
          ["Compares two stack values", false, "That is <code>if</code>; <code>ifz</code> compares one value with zero."],
          ["Pushes 6", false, "6 is the jump target, not a pushed value."],
        ],
      },
      {
        q: "What is the stack effect of <code>binary:I add</code>?",
        options: [
          ["Pops one value, pushes one", false, "Addition needs two operands."],
          ["Pops two ints $v_1, v_2$ and pushes $v_1 + v_2$", true, "$\\sigma\\, v_1\\, v_2 \\Rightarrow \\sigma\\, (v_1 + v_2)$; the stack shrinks by one."],
          ["Pops two, pushes two", false, "It pushes only the result."],
          ["Adds the top value to local 0", false, "That would be a different instruction; binary works only on the stack."],
        ],
      },
    ],

    judgements: [
      {
        q: "Which three kinds of conclusions can a JVM step have?",
        options: [
          ["$\\bc \\vdash s \\to \\bar s$, $\\bc \\vdash s \\to \\ok$, $\\bc \\vdash s \\to \\err(\\text{`msg'})$", true, "Continue in a new state, finish normally, or finish with an error."],
          ["true, false, unknown", false, "Those are analysis answers, not semantic steps."],
          ["push, pop, jump", false, "Those are kinds of instructions."],
          ["$\\to$, $\\downarrow$, $\\models$", false, "Only the first is a step; the others are big-step and truth."],
        ],
      },
      {
        q: "What does it mean that a state is <em>stuck</em>?",
        options: [
          ["It is an infinite loop", false, "A loop keeps taking steps; stuck means no step at all."],
          ["No rule applies to it, for example an instruction we never defined or an ill-typed operand", true, "In the Python interpreter this is a <code>NotImplementedError</code> or a failing <code>assert</code>."],
          ["It is the ok state", false, "ok is a final outcome, not a stuck state."],
          ["It is waiting for input", false, "Our semantics has no input during execution."],
        ],
      },
      {
        q: "What does the Python <code>step</code> function return?",
        options: [
          ["Always a new State", false, "It can also return an outcome string."],
          ["Either a new state or a string naming the outcome, like <code>\"ok\"</code> or <code>\"divide by zero\"</code>", true, "That mirrors the three judgement forms."],
          ["A boolean saying whether the program halts", false, "That would solve the halting problem."],
          ["The whole trace", false, "The trace comes from calling step repeatedly."],
        ],
      },
    ],

    pc: [
      {
        q: "What is $\\iota \\leftarrow 5$ when $\\iota = \\langle m, 2 \\rangle$?",
        options: [
          ["$\\langle m, 7 \\rangle$", false, "That would be $\\iota + 5$."],
          ["$\\langle m, 5 \\rangle$", true, "Set the offset to 5, stay in the same method: a jump."],
          ["$\\langle 5, 2 \\rangle$", false, "The method stays the same."],
          ["$\\langle m, 2 \\rangle$ with 5 pushed", false, "Nothing is pushed; only the pc changes."],
        ],
      },
      {
        q: "In the course's Python <code>PC</code>, what does <code>pc %= n</code> do?",
        options: [
          ["Computes the offset modulo $n$", false, "The class overloads <code>%=</code> to mean something else."],
          ["Replaces the offset with $n$, i.e. $\\iota \\leftarrow n$", true, "It is used for jumps: <code>frame.pc %= target</code>."],
          ["Adds $n$ to the offset", false, "That is <code>pc += n</code>."],
          ["Switches to method $n$", false, "Method changes happen by pushing frames."],
        ],
      },
      {
        q: "Which instructions change the method component $\\iota_m$ of the current pc?",
        options: [
          ["goto", false, "goto stays in the method: $\\iota \\leftarrow t$."],
          ["None: calls push a new frame with its own pc and returns pop it, the current frame's method never changes", true, "That is why $\\iota + n$ and $\\iota \\leftarrow n$ are all we need inside a frame."],
          ["ifz and if", false, "Branches only change the offset."],
          ["Every instruction", false, "Most just do $\\iota + 1$."],
        ],
      },
    ],

    values: [
      {
        q: "Which of these is <em>not</em> a stack value $\\mathbf{V}_\\sigma$?",
        options: [
          ["$(\\mathtt{int}\\ 5)$", false, "Ints are stack values."],
          ["$(\\mathtt{ref}\\ 3)$", false, "References are stack values; they point into the heap."],
          ["$(\\mathtt{array}\\ \\mathtt{char}\\ [\\ldots])$", true, "Arrays live in the heap ($\\mathbf{V}_\\eta$); the stack only holds a reference to them."],
          ["$(\\mathtt{float}\\ 1.5)$", false, "32-bit floats are stack values."],
        ],
      },
      {
        q: "What does the JVM compute for <code>2147483647 + 1</code> (an int addition)?",
        options: [
          ["$2147483648$", false, "That does not fit in 32 bits. Python would give this, which is a classic interpreter bug."],
          ["$-2147483648$", true, "$\\mathrm{wrap}(2^{31}) = -2^{31}$: the value wraps around like an odometer."],
          ["An overflow error", false, "Java int arithmetic never throws on overflow."],
          ["$0$", false, "Only $2^{32}$ would wrap to 0."],
        ],
      },
      {
        q: "How are Java booleans represented on the operand stack?",
        options: [
          ["As a special bool value", false, "The JVM has no boolean stack type."],
          ["As ints 0 (false) and 1 (true)", true, "That is why <code>assertBoolean(Z)V</code> uses <code>ifz</code> on the loaded argument."],
          ["As references to Boolean objects", false, "Boxed Booleans exist in Java, but primitive booleans are ints."],
          ["As floats", false, "No."],
        ],
      },
    ],

    frame: [
      {
        q: "In the frame $\\langle \\lambda, \\sigma, \\iota \\rangle$, what are the three parts?",
        options: [
          ["Locals, operand stack, program counter", true, "The drawers, the pile of scratch paper and the bookmark."],
          ["Lambda, sigma, iota as in the lambda calculus", false, "Same letters, different meaning here."],
          ["Heap, call stack, pc", false, "Heap and call stack are parts of the whole state, not of a frame."],
          ["Input, output, error", false, "No."],
        ],
      },
      {
        q: "If $\\sigma = \\epsilon(\\mathtt{int}\\ 1)(\\mathtt{int}\\ 2)(\\mathtt{int}\\ 3)$, which value is on top?",
        options: [
          ["$(\\mathtt{int}\\ 1)$", false, "We push and pop at the right end."],
          ["$(\\mathtt{int}\\ 3)$", true, "The rightmost value is the top: it was pushed last and is popped first."],
          ["$\\epsilon$", false, "$\\epsilon$ is the empty stack at the bottom."],
          ["It depends on the instruction", false, "The notation fixes the top on the right."],
        ],
      },
      {
        q: "What is the initial frame of <code>assertPositive(5)</code>?",
        options: [
          ["$\\langle [\\,], \\epsilon(\\mathtt{int}\\ 5), \\langle \\mathit{assertPositive}, 0\\rangle \\rangle$", false, "Arguments go in the locals, not on the operand stack."],
          ["$\\langle [(\\mathtt{int}\\ 5)], \\epsilon, \\langle \\mathit{assertPositive}, 0\\rangle \\rangle$", true, "Local 0 holds the argument, the stack is empty, the pc is at offset 0."],
          ["$\\langle [(\\mathtt{int}\\ 5)], \\epsilon, \\langle \\mathit{assertPositive}, 1\\rangle \\rangle$", false, "Execution starts at offset 0."],
          ["$\\langle [(\\mathtt{int}\\ 0)], \\epsilon, \\langle \\mathit{assertPositive}, 0\\rangle \\rangle$", false, "The argument is 5."],
        ],
      },
    ],

    "push-load": [
      {
        q: "$\\bc[\\langle m, 3\\rangle] = (\\mathtt{push{:}I}\\ 7)$. Which state follows $\\langle [(\\mathtt{int}\\ 2)], \\epsilon(\\mathtt{int}\\ 1), \\langle m, 3\\rangle \\rangle$?",
        options: [
          ["$\\langle [(\\mathtt{int}\\ 2)], \\epsilon(\\mathtt{int}\\ 1)(\\mathtt{int}\\ 7), \\langle m, 4\\rangle \\rangle$", true, "Rule $\\mathsf{push}_I$: the stack gains 7 on top, the pc moves to 4, the locals stay."],
          ["$\\langle [(\\mathtt{int}\\ 7)], \\epsilon(\\mathtt{int}\\ 1), \\langle m, 4\\rangle \\rangle$", false, "push does not touch the locals."],
          ["$\\langle [(\\mathtt{int}\\ 2)], \\epsilon(\\mathtt{int}\\ 7)(\\mathtt{int}\\ 1), \\langle m, 4\\rangle \\rangle$", false, "The new value goes on top, which is the right end."],
          ["$\\langle [(\\mathtt{int}\\ 2)], \\epsilon(\\mathtt{int}\\ 1)(\\mathtt{int}\\ 7), \\langle m, 3\\rangle \\rangle$", false, "The pc must move on, otherwise the push repeats forever."],
        ],
      },
      {
        q: "Does <code>load:I 0</code> change the locals?",
        options: [
          ["Yes, it empties local 0", false, "Loading copies; the local keeps its value."],
          ["No, it pushes a copy of $\\lambda[0]$ and leaves $\\lambda$ unchanged", true, "In the rule $\\mathsf{load}_I$ the locals $\\lambda$ appear unchanged on both sides."],
          ["Yes, it sets local 0 to the top of the stack", false, "That is <code>store:I 0</code>."],
          ["Only if local 0 is an int", false, "If it is not an int, the rule does not apply at all (stuck)."],
        ],
      },
      {
        q: "<code>store:I 1</code> runs on stack $\\epsilon(\\mathtt{int}\\ 4)(\\mathtt{int}\\ 9)$. What happens?",
        options: [
          ["$\\lambda[1] = 4$ and the stack becomes $\\epsilon(\\mathtt{int}\\ 9)$", false, "store takes the top value, which is 9."],
          ["$\\lambda[1] = 9$ and the stack becomes $\\epsilon(\\mathtt{int}\\ 4)$", true, "Pop the top (9) into local 1."],
          ["$\\lambda[1] = 9$ and the stack stays the same", false, "store pops the value."],
          ["$\\lambda[9] = 1$", false, "1 is the local index, 9 the value."],
        ],
      },
    ],

    callstack: [
      {
        q: "In $\\mu = \\ldots\\langle \\lambda_2, \\sigma_2, \\iota_2 \\rangle\\langle \\lambda_1, \\sigma_1, \\iota_1 \\rangle$, which frame is executing?",
        options: [
          ["$\\langle \\lambda_1, \\sigma_1, \\iota_1 \\rangle$, the rightmost", true, "The call stack, like the operand stack, has its top on the right. The frame to its left is the caller waiting for it."],
          ["$\\langle \\lambda_2, \\sigma_2, \\iota_2 \\rangle$", false, "That is the caller."],
          ["The leftmost frame, the main method", false, "The bottom frame resumes only when all others have returned."],
          ["All frames run in parallel", false, "There are no threads in our JVM."],
        ],
      },
      {
        q: "What do the lifting rules $\\mathsf{lift}_\\mu$ and $\\mathsf{lift}_\\eta$ achieve?",
        options: [
          ["They move frames to the heap", false, "Frames stay on the call stack."],
          ["They let every frame-level rule (push, load, ...) act as a step of the whole state, on the top frame, leaving the heap and the other frames unchanged", true, "So we write the simple rules once on frames and reuse them."],
          ["They implement method calls", false, "Calls have their own rule (invoke)."],
          ["They copy the heap into each frame", false, "The heap is shared, not copied."],
        ],
      },
      {
        q: "<code>invoke static factorial</code> runs with stack $\\sigma(\\mathtt{int}\\ 2)$. What new frame appears?",
        options: [
          ["$\\langle [(\\mathtt{int}\\ 2)], \\epsilon, \\langle \\mathit{factorial}, 0\\rangle \\rangle$ on top of the caller", true, "The argument is popped from the caller's stack into the callee's locals; the callee starts with an empty stack at offset 0."],
          ["$\\langle [\\,], \\epsilon(\\mathtt{int}\\ 2), \\langle \\mathit{factorial}, 0\\rangle \\rangle$", false, "Arguments go into the locals."],
          ["None: the caller's pc just jumps to factorial", false, "A call creates a fresh frame so the caller can resume later."],
          ["$\\langle [(\\mathtt{int}\\ 2)], \\epsilon, \\langle \\mathit{factorial}, 1\\rangle \\rangle$", false, "Callees start at offset 0."],
        ],
      },
    ],

    return: [
      {
        q: "What does $\\mathsf{return}_\\epsilon$ produce?",
        options: [
          ["$\\ok$: the last frame returned, the program finished normally", true, "With no caller left, returning ends the run successfully."],
          ["An empty state", false, "There is no state left to continue with; the outcome is ok."],
          ["$\\err(\\text{`return'})$", false, "Returning is the normal way to finish."],
          ["The returned value as a new initial state", false, "The run is over."],
        ],
      },
      {
        q: "After $\\mathsf{return}_\\mu$, where does the caller continue?",
        options: [
          ["At $\\iota_2$, the invoke instruction itself", false, "That would call the method again forever."],
          ["At $\\iota_2 + 1$, just after its invoke", true, "The caller's pc still points at the call; returning moves it on."],
          ["At offset 0", false, "The caller resumes where it left off."],
          ["At the callee's last pc", false, "The callee frame is gone."],
        ],
      },
      {
        q: "Where does the returned value go?",
        options: [
          ["Into local 0 of the caller", false, "It goes on the operand stack, where the caller's next instruction (e.g. a multiplication) expects it."],
          ["On top of the caller's operand stack", true, "$\\langle \\lambda_2, \\sigma_2(\\mathtt{int}\\ v), \\iota_2 + 1\\rangle$."],
          ["Into the heap", false, "Ints are returned on the stack."],
          ["It is discarded", false, "Only void returns have no value."],
        ],
      },
    ],

    errors: [
      {
        q: "What is <code>-7 / 2</code> for Java ints?",
        options: [
          ["$-4$", false, "That is Python's floor division <code>-7 // 2</code>."],
          ["$-3$", true, "Java truncates toward zero."],
          ["$-3.5$", false, "Integer division gives an int."],
          ["An error", false, "Only a zero divisor is an error."],
        ],
      },
      {
        q: "An interpreter implements <code>div</code> as Python's <code>v1 // v2</code>. Which input exposes the bug?",
        options: [
          ["<code>7 / 2</code>", false, "Both give 3 for positive operands."],
          ["<code>-7 / 2</code>", true, "Python floors to -4, Java truncates to -3. Mixed signs expose the difference."],
          ["<code>6 / 3</code>", false, "Exact divisions agree."],
          ["<code>0 / 5</code>", false, "Both give 0."],
        ],
      },
      {
        q: "Can both $\\mathsf{bdiv}_{I0}$ and $\\mathsf{bdiv}_{I1}$ apply to the same state?",
        options: [
          ["Yes, and the interpreter picks one at random", false, "The JVM is deterministic."],
          ["No: one needs $v_2 = 0$, the other $v_2 \\neq 0$, so exactly one applies", true, "Complementary side conditions keep the semantics deterministic."],
          ["Yes, when $v_1 = 0$", false, "The conditions are about the divisor $v_2$."],
          ["Neither ever applies to ints", false, "They are the int division rules."],
        ],
      },
    ],

    branching: [
      {
        q: "<code>if lt 9</code> runs on stack $\\epsilon(\\mathtt{int}\\ 3)(\\mathtt{int}\\ 5)$ at offset 4. What happens?",
        options: [
          ["It compares $5 \\lt 3$, false, falls through to 5", false, "The comparison is $v_1 \\mathrel{c} v_2$ with $v_1 = 3$ (deeper) and $v_2 = 5$ (top)."],
          ["It compares $3 \\lt 5$, true, pops both and jumps to 9", true, "Rule $\\mathsf{if}_1$: both values are consumed and $\\iota \\leftarrow 9$."],
          ["It jumps to 9 and leaves both values on the stack", false, "Branches pop the compared values."],
          ["It pushes true", false, "Comparisons in bytecode jump; they do not push booleans."],
        ],
      },
      {
        q: "<code>ifz le 8</code> runs with $(\\mathtt{int}\\ -2)$ on top. Next pc?",
        options: [
          ["8, since $-2 \\leq 0$", true, "Rule $\\mathsf{ifz}_1$: the condition holds, so jump."],
          ["The next instruction, since $-2$ is not zero", false, "<code>le</code> is \"less than or equal to zero\", not \"equal\"."],
          ["8, and $-2$ stays on the stack", false, "ifz pops its operand."],
          ["It is stuck", false, "Negative ints are fine."],
        ],
      },
      {
        q: "How does javac typically compile <code>if (n &lt;= 1) return 1;</code>?",
        options: [
          ["As <code>if le</code> jumping to the <code>return 1</code>", false, "javac jumps over the then-branch, so it tests the opposite condition."],
          ["With the negated test: <code>if gt</code> jumps past the <code>return 1</code>", true, "If $n \\gt 1$ skip the then-branch, otherwise fall into it. You can see it in <code>factorial</code>: <code>if gt 5</code>."],
          ["With a goto only", false, "A condition needs a conditional jump."],
          ["With ifz", false, "The comparison is against 1, so it needs <code>if</code> with two operands."],
        ],
      },
    ],

    dup: [
      {
        q: "What does <code>dup</code> do to $\\epsilon(\\mathtt{int}\\ 1)(\\mathtt{ref}\\ 0)$?",
        options: [
          ["$\\epsilon(\\mathtt{int}\\ 1)(\\mathtt{ref}\\ 0)(\\mathtt{ref}\\ 0)$", true, "Copy the top value. A reference is copied as a reference (the object is not cloned)."],
          ["$\\epsilon(\\mathtt{int}\\ 1)(\\mathtt{int}\\ 1)(\\mathtt{ref}\\ 0)$", false, "dup copies the top, not the second value."],
          ["$\\epsilon(\\mathtt{int}\\ 1)(\\mathtt{ref}\\ 0)(\\mathtt{ref}\\ 1)$", false, "It is the same reference, pointing to the same object."],
          ["$\\epsilon(\\mathtt{ref}\\ 0)$", false, "Nothing is removed."],
        ],
      },
      {
        q: "Why is the value in the dup rule written as a plain $v$ instead of $(\\mathtt{int}\\ v)$?",
        options: [
          ["Because dup only works on ints", false, "The opposite: the plain $v$ lets it work for any value."],
          ["So that the rule applies to any stack value: ints, floats and references", true, "<code>new; dup</code> duplicates a reference, which an int-only rule could not do."],
          ["It is a typo", false, "It is deliberate."],
          ["Because $v$ is popped", false, "$v$ is not popped; it stays and gains a copy."],
        ],
      },
      {
        q: "In the rule for <code>new C</code>, what does the side condition $r \\notin \\operatorname{dom}(\\eta)$ ensure?",
        options: [
          ["That $r$ is a fresh heap location not used by any existing object", true, "Allocation must not overwrite existing objects."],
          ["That $r$ is null", false, "new never pushes null."],
          ["That the class $C$ exists", false, "The condition is about the heap location."],
          ["That the heap is empty", false, "Only that $r$ is unused."],
        ],
      },
      {
        q: "Why does our <code>get</code> rule always push $(\\mathtt{int}\\ 0)$ for <code>$assertionsDisabled</code>?",
        options: [
          ["Because the field is always zero in Java", false, "It depends on how the JVM was started; the course simplifies."],
          ["We assume assertions are enabled, as the notes suggest, so the field reads false (0)", true, "Then <code>ifz ne</code> falls through and the assertion is checked. A full JVM would read the static field from the heap."],
          ["Because static fields are not supported at all", false, "We support exactly this one, by assumption."],
          ["Because 0 means true on the JVM", false, "0 means false."],
        ],
      },
    ],

    interpreter: [
      {
        q: "Your interpreter returns <code>*</code> after the step budget. What can you conclude?",
        options: [
          ["The method loops forever", false, "It may just need more steps (countdown(-1) needs billions)."],
          ["The run has more steps than the budget; it may or may not terminate", true, "Proposition 3.34: a finite budget can never prove non-termination. JPAMB still predicts * from timeouts because it is often a good bet."],
          ["The interpreter has a bug", false, "Not necessarily."],
          ["The method throws an error", false, "No outcome was reached within the budget."],
        ],
      },
      {
        q: "In terms of the semantics, what is an interpreter?",
        options: [
          ["An implementation of the step relation: $\\mathit{step}(s) = c$ exactly when $\\bc \\vdash s \\to c$", true, "Each rule becomes one case; iterating step produces the trace."],
          ["A compiler to machine code", false, "Interpreters execute directly."],
          ["A decider for $\\mathcal{L}_{\\mathit{halt}}$", false, "No such decider exists."],
          ["A tool that checks Hoare triples", false, "That would be a verifier."],
        ],
      },
    ],
  };

  /* =====================================================================
     Shared little helpers
     ===================================================================== */
  const sameVal = (a, b) => a && b && a.t === b.t && a.v === b.v;
  const top = (st) => st.frames[st.frames.length - 1];
  function cellsEl(items) {
    const c = h("div", { class: "cells" });
    items.forEach(([text, cls]) => c.append(h("span", { class: "cell" + (cls ? " " + cls : ""), text })));
    return c;
  }
  function stateRow(k, vEl) {
    return h("div", { class: "state-row" }, [h("span", { class: "state-k", text: k }), h("span", { class: "state-v" }, [vEl])]);
  }
  function stackDiff(prev, cur) {
    let k = 0;
    while (prev && k < prev.length && k < cur.length && sameVal(prev[k], cur[k])) k++;
    const out = [];
    for (let i = 0; i < k; i++) out.push([J.fmtVal(cur[i]), ""]);
    if (prev) for (let i = k; i < prev.length; i++) out.push([J.fmtVal(prev[i]), "gone"]);
    for (let i = k; i < cur.length; i++) out.push([J.fmtVal(cur[i]), prev ? "new" : ""]);
    if (!out.length) out.push(["ε (empty)", "empty"]);
    return out;
  }
  function localsDiff(prev, cur) {
    if (!cur.length) return [["none", "empty"]];
    return cur.map((v, i) => ["[" + i + "] " + J.fmtVal(v), prev && !sameVal(prev[i], v) ? "new" : ""]);
  }
  function heapText(heap) {
    if (!heap.length) return "∅ (empty)";
    return heap.map((o, i) => i + " ↦ " + J.fmtHeapObj(o)).join(",  ");
  }
  function outcomePill(o) {
    const cls = o === "ok" ? "ok" : o === "*" ? "maybe" : "err";
    return h("span", { class: "pill " + cls, text: o === "ok" ? "ok" : o === "*" ? "* (budget)" : "err('" + o + "')" });
  }
  const ruleName = (n) => '<span class="rn">' + PA.tex("\\mathsf{" + n + "}") + "</span>";
  function frameText(f) {
    return "λ=[" + f.locals.map(J.fmtVal).join(", ") + "]  σ=" + J.fmtStack(f.stack) + "  pc=" + f.pc.off;
  }

  /* =====================================================================
     LAB 1: build a natural deduction derivation
     ===================================================================== */
  const A = (n) => ({ t: "atom", n }), AND = (l, r) => ({ t: "and", l, r }), OR = (l, r) => ({ t: "or", l, r });
  function fstr(f, inner) {
    if (f.t === "atom") return f.n;
    const s = fstr(f.l, true) + (f.t === "and" ? " ∧ " : " ∨ ") + fstr(f.r, true);
    return inner ? "(" + s + ")" : s;
  }
  function labProofTree(el) {
    const { controls, view } = PA.lab(el, {
      title: "Build a derivation tree",
      hint: "Pick a goal. Click an open (dashed) goal to select it, then apply a rule. Close every leaf with an assumption. A wrong choice can leave a goal that nothing proves: use Undo.",
    });
    const GOALS = [
      { label: "A ∧ (B ∨ C) from {A, C}", assm: ["A", "C"], goal: AND(A("A"), OR(A("B"), A("C"))) },
      { label: "(A ∨ B) ∧ (B ∨ C) from {B}", assm: ["B"], goal: AND(OR(A("A"), A("B")), OR(A("B"), A("C"))) },
      { label: "(B ∧ A) ∨ C from {A, B}", assm: ["A", "B"], goal: OR(AND(A("B"), A("A")), A("C")) },
      { label: "A ∨ (B ∧ (C ∨ D)) from {B, D}", assm: ["B", "D"], goal: OR(A("A"), AND(A("B"), OR(A("C"), A("D")))) },
    ];
    const pick = PA.select(controls, { label: "Goal", options: GOALS.map((g, i) => [String(i), g.label]), value: "0" });
    const grp = PA.group(controls, "Apply to the selected goal");
    const rowA = PA.btnRow(grp), rowB = PA.btnRow(grp);
    const ctl = PA.btnRow(controls);
    const assmEl = h("div", { class: "verdict" });
    const wrap = h("div", { class: "pt-wrap" });
    const verdict = h("div", { class: "verdict" });
    view.append(assmEl, wrap, verdict);

    let G, root, sel, ids, history, msg;
    function node(f) { return { id: ++ids, f, rule: null, kids: [] }; }
    function reset() {
      G = GOALS[+pick.value]; ids = 0; root = node(G.goal); sel = root.id; history = []; msg = null; render();
    }
    function find(n, id) { if (n.id === id) return n; for (const k of n.kids) { const r = find(k, id); if (r) return r; } return null; }
    function opens(n, acc) { if (!n.rule) acc.push(n); n.kids.forEach((k) => opens(k, acc)); return acc; }
    function dead(n) { return !n.rule && n.f.t === "atom" && G.assm.indexOf(n.f.n) < 0; }
    function snapshot() { history.push(JSON.stringify({ root, sel, ids })); }
    function apply(rule) {
      const n = find(root, sel);
      if (!n || n.rule) { msg = ["warn", "Select an open goal first (click a dashed box)."]; render(); return; }
      const f = n.f;
      const ok =
        (rule === "assm" && f.t === "atom" && G.assm.indexOf(f.n) >= 0) ||
        (rule === "and" && f.t === "and") || ((rule === "orL" || rule === "orR") && f.t === "or");
      if (!ok) {
        msg = ["bad", rule === "assm"
          ? (f.t === "atom" ? "<b>" + esc(f.n) + "</b> is not an assumption, so it cannot be a leaf." : "Only an atom can be closed by an assumption; this goal still has structure.")
          : "The conclusion of that rule has the wrong shape for <b>" + esc(fstr(f)) + "</b>: " + (rule === "and" ? "∧ concludes a conjunction." : "∨ rules conclude a disjunction.")];
        render(); return;
      }
      snapshot();
      n.rule = rule;
      if (rule === "and") n.kids = [node(f.l), node(f.r)];
      if (rule === "orL") n.kids = [node(f.l)];
      if (rule === "orR") n.kids = [node(f.r)];
      const o = opens(root, []);
      sel = o.length ? o[0].id : null;
      msg = null;
      render();
    }
    const RN = { and: "∧", orL: "∨L", orR: "∨R" };
    function renderNode(n) {
      const box = h("div", { class: "pt" });
      if (n.rule && n.rule !== "assm") {
        box.append(h("div", { class: "pt-prem" }, n.kids.map(renderNode)));
        box.append(h("div", { class: "pt-bar" }, [h("span", { class: "pt-rule", text: "(" + RN[n.rule] + ")" })]));
      }
      if (n.rule === "assm") {
        box.append(h("span", { class: "pt-f leaf" }, [h("span", { class: "pt-tag", text: "assumption" }), fstr(n.f)]));
      } else if (!n.rule) {
        const b = h("button", { type: "button", class: "pt-f " + (dead(n) ? "dead" : "open") + (n.id === sel ? " sel" : ""), text: fstr(n.f), "aria-label": "Select goal " + fstr(n.f) });
        b.addEventListener("click", () => { sel = n.id; msg = null; render(); });
        box.append(b);
      } else {
        box.append(h("span", { class: "pt-f", text: fstr(n.f) }));
      }
      return box;
    }
    function render() {
      assmEl.className = "verdict";
      assmEl.innerHTML = "<b>Assumptions Γ =</b> {" + esc(G.assm.join(", ")) + "} &nbsp; <b>Goal:</b> " + esc(fstr(G.goal));
      wrap.innerHTML = "";
      wrap.append(renderNode(root));
      const o = opens(root, []);
      const deads = o.filter(dead);
      if (msg) { verdict.className = "verdict " + msg[0]; verdict.innerHTML = msg[1]; }
      else if (!o.length) { verdict.className = "verdict good"; verdict.innerHTML = "<b>Proof complete.</b> Every leaf is an assumption and every line is a rule instance, so Γ ⊢ " + esc(fstr(G.goal)) + "."; }
      else if (deads.length) { verdict.className = "verdict bad"; verdict.innerHTML = "<b>Stuck:</b> " + esc(deads.map((d) => fstr(d.f)).join(", ")) + " is not an assumption and no rule produces a bare atom. Undo and pick the other ∨ rule."; }
      else { verdict.className = "verdict"; verdict.innerHTML = "<b>" + o.length + " open goal" + (o.length > 1 ? "s" : "") + ".</b> Selected: " + esc(fstr(find(root, sel).f)) + ". Which rule has a conclusion of this shape?"; }
    }
    PA.button(rowA, "Assumption", () => apply("assm"));
    PA.button(rowA, "∧ (and)", () => apply("and"));
    PA.button(rowB, "∨L (left)", () => apply("orL"));
    PA.button(rowB, "∨R (right)", () => apply("orR"));
    PA.button(ctl, "Undo", () => { if (!history.length) return; const s = JSON.parse(history.pop()); root = s.root; sel = s.sel; ids = s.ids; msg = null; render(); });
    PA.button(ctl, "Reset", reset);
    pick.onchange = reset;
    reset();
  }

  /* =====================================================================
     LAB 2: Hoare triples by brute force
     ===================================================================== */
  function labHoare(el) {
    const { controls, view } = PA.lab(el, {
      title: "Check Hoare triples and the sequencing rule",
      hint: "Choose the assertions. Each triple is checked on every start state with x, y, z in [-8, 8]. That is testing, not a proof, but it finds counterexamples fast.",
    });
    const C = (n, f, t) => [n, f, t];
    const PROGS = [
      {
        c1: "y := x + 1", c2: "z := y * 2", f1: (s) => ({ x: s.x, y: s.x + 1, z: s.z }), f2: (s) => ({ x: s.x, y: s.y, z: s.y * 2 }),
        pre: [C("x ≥ 0", (s) => s.x >= 0), C("x > -1", (s) => s.x > -1), C("x ≥ -1", (s) => s.x >= -1), C("true", () => true)],
        mid: [C("y > 0", (s) => s.y > 0), C("y ≥ 0", (s) => s.y >= 0), C("y > 1", (s) => s.y > 1), C("true", () => true)],
        post: [C("z > 0", (s) => s.z > 0), C("z ≥ 2", (s) => s.z >= 2), C("z > 2", (s) => s.z > 2), C("z ≥ 0", (s) => s.z >= 0)],
        def: [0, 0, 0, 0],
      },
      {
        c1: "x := x - 3", c2: "y := x * x", f1: (s) => ({ x: s.x - 3, y: s.y, z: s.z }), f2: (s) => ({ x: s.x, y: s.x * s.x, z: s.z }),
        pre: [C("x ≥ 3", (s) => s.x >= 3), C("x > 5", (s) => s.x > 5), C("true", () => true)],
        mid: [C("x ≥ 0", (s) => s.x >= 0), C("x > 2", (s) => s.x > 2), C("true", () => true)],
        post: [C("y ≥ 0", (s) => s.y >= 0), C("y > 0", (s) => s.y > 0), C("y ≥ 9", (s) => s.y >= 9)],
        def: [0, 0, 0, 0],
      },
      {
        c1: "y := 2 * x", c2: "z := y - x", f1: (s) => ({ x: s.x, y: 2 * s.x, z: s.z }), f2: (s) => ({ x: s.x, y: s.y, z: s.y - s.x }),
        pre: [C("true", () => true), C("x > 0", (s) => s.x > 0)],
        mid: [C("y = 2x", (s) => s.y === 2 * s.x), C("y > x", (s) => s.y > s.x), C("true", () => true)],
        post: [C("z = x", (s) => s.z === s.x), C("z > 0", (s) => s.z > 0), C("z ≥ x", (s) => s.z >= s.x)],
        def: [0, 0, 0, 0],
      },
    ];
    const prog = PA.seg(controls, { label: "Program", options: [[0, "A"], [1, "B"], [2, "C"]], value: 0 });
    const slots = h("div", { style: "display:grid;gap:12px" });
    controls.append(slots);
    const progEl = h("div", { class: "hoare-prog" });
    const table = h("table", { class: "dt" });
    const verdict = h("div", { class: "verdict" });
    view.append(progEl, h("div", { class: "table-wrap" }, [table]), verdict);
    let P, sP1, sQ1, sP2, sQ2;
    const states = [];
    for (let x = -8; x <= 8; x++) for (let y = -8; y <= 8; y++) for (let z = -8; z <= 8; z++) states.push({ x, y, z });
    const sStr = (s) => "x=" + s.x + ", y=" + s.y + ", z=" + s.z;
    function build() {
      P = PROGS[prog.value];
      slots.innerHTML = "";
      const opt = (arr) => arr.map((c, i) => [String(i), c[0]]);
      sP1 = PA.select(slots, { label: "P₁ (before C₁)", options: opt(P.pre), value: String(P.def[0]) });
      sQ1 = PA.select(slots, { label: "Q₁ (after C₁)", options: opt(P.mid), value: String(P.def[1]) });
      sP2 = PA.select(slots, { label: "P₂ (before C₂)", options: opt(P.mid), value: String(P.def[2]) });
      sQ2 = PA.select(slots, { label: "Q₂ (after C₂)", options: opt(P.post), value: String(P.def[3]) });
      [sP1, sQ1, sP2, sQ2].forEach((s) => (s.onchange = check));
      check();
    }
    function triple(pre, f, post) {
      for (const s of states) if (pre(s)) { const t = f(s); if (!post(t)) return { ok: false, s, t }; }
      return { ok: true };
    }
    function check() {
      const p1 = P.pre[+sP1.value], q1 = P.mid[+sQ1.value], p2 = P.mid[+sP2.value], q2 = P.post[+sQ2.value];
      progEl.textContent = "{" + p1[0] + "}  " + P.c1 + " ; " + P.c2 + "  {" + q2[0] + "}";
      const t1 = triple(p1[1], P.f1, q1[1]);
      const t2 = triple(p2[1], P.f2, q2[1]);
      let imp = { ok: true };
      for (const s of states) if (q1[1](s) && !p2[1](s)) { imp = { ok: false, s }; break; }
      const concl = triple(p1[1], (s) => P.f2(P.f1(s)), q2[1]);
      const row = (name, r, cex) => "<tr><td>" + name + "</td><td class='" + (r.ok ? "ok-cell" : "bad-cell") + "'>" + (r.ok ? "✓ holds" : "✗ fails") + "</td><td class='mono'>" + (r.ok ? "" : esc(cex)) + "</td></tr>";
      table.innerHTML = "<thead><tr><th>Check</th><th>Result</th><th>Counterexample</th></tr></thead><tbody>" +
        row("{" + esc(p1[0]) + "} " + esc(P.c1) + " {" + esc(q1[0]) + "}", t1, t1.ok ? "" : sStr(t1.s) + " → " + sStr(t1.t)) +
        row("{" + esc(p2[0]) + "} " + esc(P.c2) + " {" + esc(q2[0]) + "}", t2, t2.ok ? "" : sStr(t2.s) + " → " + sStr(t2.t)) +
        row("side condition: " + esc(q1[0]) + " ⇒ " + esc(p2[0]), imp, imp.ok ? "" : sStr(imp.s)) +
        row("<b>conclusion</b> {" + esc(p1[0]) + "} C₁;C₂ {" + esc(q2[0]) + "}", concl, concl.ok ? "" : sStr(concl.s) + " → " + sStr(P.f2(P.f1(concl.s)))) +
        "</tbody>";
      const prem = t1.ok && t2.ok && imp.ok;
      if (prem) { verdict.className = "verdict good"; verdict.innerHTML = "<b>All three premises hold</b>, so rule (seq) derives the conclusion, and indeed it holds on every tested state."; }
      else if (concl.ok) { verdict.className = "verdict warn"; verdict.innerHTML = "<b>The rule cannot be used</b> with these assertions (a premise fails), although the conclusion happens to be true. A rule is a sufficient condition: choose better middle assertions."; }
      else { verdict.className = "verdict bad"; verdict.innerHTML = "<b>The conclusion is false</b>: a start state satisfying P₁ ends outside Q₂. No choice of middle assertions can derive a false triple, since the rule is sound."; }
    }
    prog.onchange = build;
    build();
  }

  /* =====================================================================
     LAB 3: denotational semantics of EX, step by step
     ===================================================================== */
  function parseEX(src) {
    const toks = src.match(/\s*([A-Za-z_]\w*|\d+|[+()]|\S)/g) || [];
    const t = toks.map((s) => s.trim());
    let i = 0;
    function prim() {
      const k = t[i];
      if (k == null) throw new Error("unexpected end of input");
      if (k === "(") { i++; const e = sum(); if (t[i] !== ")") throw new Error("missing )"); i++; return e; }
      if (/^\d+$/.test(k)) { i++; return { t: "num", n: parseInt(k, 10) }; }
      if (/^[A-Za-z_]\w*$/.test(k)) { i++; return { t: "var", x: k }; }
      throw new Error("unexpected '" + k + "' (EX has only +, variables and numbers)");
    }
    function sum() { let e = prim(); while (t[i] === "+") { i++; e = { t: "add", l: e, r: prim() }; } return e; }
    const e = sum();
    if (i < t.length) throw new Error("unexpected '" + t[i] + "'");
    return e;
  }
  function exStr(e, inner) {
    if (e.t === "num") return String(e.n);
    if (e.t === "var") return e.x;
    const s = exStr(e.l, false) + " + " + exStr(e.r, true);
    return inner ? "(" + s + ")" : s;
  }
  function labDenote(el) {
    const { controls, view } = PA.lab(el, {
      title: "Compute a denotation by equational reasoning",
      hint: "Type an EX expression (+, variables, natural numbers, parentheses) and a store. Each line rewrites the leftmost thing that can be rewritten, using one of the three equations, exactly like the x + 5 example.",
    });
    const ex = PA.textInput(controls, { label: "Expression e", value: "x + 5" });
    const st = PA.textInput(controls, { label: "Store σ", value: "x = 3" });
    const pres = PA.btnRow(controls);
    [["x + 5", "x = 3"], ["x + y + 1", "x = 2, y = 4"], ["(a + 1) + (b + 2)", "a = 10, b = 20"], ["z + 1", "x = 3"]].forEach(([e, s]) =>
      PA.button(pres, e, () => { ex.input.value = e; st.input.value = s; run(); }, "sm"));
    const out = h("div", { class: "mathbox" });
    const verdict = h("div", { class: "verdict" });
    view.append(out, verdict);

    const tt = (s) => "\\texttt{" + s.replace(/[{}\\]/g, "") + "}";
    function tex(n, inner) {
      switch (n.k) {
        case "E": return "\\Den{" + tt(exStr(n.e)) + "}\\,\\sigma";
        case "lookup": return "\\mathrm{lookup}(\\sem{" + tt(n.x) + "}, \\sigma)";
        case "toNat": return "\\mathrm{toNat}(\\sem{" + tt(String(n.n)) + "})";
        case "n": return String(n.v);
        case "plus": { const s = tex(n.l, true) + " + " + tex(n.r, true); return inner ? "(" + s + ")" : s; }
      }
    }
    function stepTerm(n, store) {
      // leftmost reducible node in pre-order among E / lookup / toNat; else leftmost-innermost sum of numbers
      function pre(n) {
        if (n.k === "E") {
          const e = n.e;
          if (e.t === "add") return { r: { k: "plus", l: { k: "E", e: e.l }, r: { k: "E", e: e.r } }, why: "sum equation" };
          if (e.t === "var") return { r: { k: "lookup", x: e.x }, why: "variable equation" };
          return { r: { k: "toNat", n: e.n }, why: "number equation" };
        }
        if (n.k === "lookup") {
          if (!(n.x in store)) return { err: n.x };
          return { r: { k: "n", v: store[n.x] }, why: "\\sigma(" + n.x + ") = " + store[n.x] };
        }
        if (n.k === "toNat") return { r: { k: "n", v: n.n }, why: "toNat" };
        if (n.k === "plus") {
          const a = pre(n.l); if (a) return a.err ? a : { r: { k: "plus", l: a.r, r: n.r }, why: a.why };
          const b = pre(n.r); if (b) return b.err ? b : { r: { k: "plus", l: n.l, r: b.r }, why: b.why };
        }
        return null;
      }
      const p = pre(n);
      if (p) return p;
      function arith(n) {
        if (n.k !== "plus") return null;
        if (n.l.k === "n" && n.r.k === "n") return { r: { k: "n", v: n.l.v + n.r.v }, why: "arithmetic" };
        const a = arith(n.l); if (a) return { r: { k: "plus", l: a.r, r: n.r }, why: a.why };
        const b = arith(n.r); if (b) return { r: { k: "plus", l: n.l, r: b.r }, why: b.why };
        return null;
      }
      return arith(n);
    }
    function run() {
      let e, store = {};
      try { e = parseEX(ex.value); ex.bad(false); } catch (err) { ex.bad(true); out.innerHTML = ""; verdict.className = "verdict bad"; verdict.innerHTML = "<b>Syntax error:</b> " + esc(err.message); return; }
      try {
        st.value.split(",").map((s) => s.trim()).filter(Boolean).forEach((kv) => {
          const m = /^([A-Za-z_]\w*)\s*=\s*(\d+)$/.exec(kv);
          if (!m) throw new Error("write the store as x = 3, y = 4 (natural numbers)");
          store[m[1]] = parseInt(m[2], 10);
        });
        st.bad(false);
      } catch (err) { st.bad(true); out.innerHTML = ""; verdict.className = "verdict bad"; verdict.innerHTML = "<b>Store:</b> " + esc(err.message); return; }
      if (countLeaves(e) > 10) { verdict.className = "verdict warn"; verdict.innerHTML = "Keep it to at most 10 numbers and variables so the derivation fits."; out.innerHTML = ""; return; }
      let term = { k: "E", e };
      const lines = [tex(term) + " && "];
      let guard = 0, error = null;
      while (guard++ < 80) {
        const r = stepTerm(term, store);
        if (!r) break;
        if (r.err) { error = r.err; break; }
        term = r.r;
        lines.push("= {} & " + tex(term) + " && " + (r.why.indexOf("\\") >= 0 ? r.why : "\\text{(" + r.why + ")}"));
      }
      const storeTex = "\\sigma = [" + Object.keys(store).map((k) => k + " \\mapsto " + store[k]).join(", ") + "]";
      out.innerHTML = PA.tex(storeTex, true) + PA.tex("\\begin{aligned} & " + lines.join(" \\\\ ") + "\\end{aligned}", true);
      if (error) { verdict.className = "verdict bad"; verdict.innerHTML = "<b>Stuck:</b> the variable <code>" + esc(error) + "</code> is not in the store, so lookup has no value. In the notes stores are total ($\\Sigma = \\mathit{Var} \\to \\N$), so every variable must be given a value."; PA.math(verdict); }
      else { verdict.className = "verdict good"; verdict.innerHTML = "<b>Meaning:</b> " + esc(exStr(e)) + " denotes " + term.v + " in this store. " + (lines.length - 1) + " equational steps, no machine involved."; }
    }
    function countLeaves(e) { return e.t === "add" ? countLeaves(e.l) + countLeaves(e.r) : 1; }
    ex.onchange = run; st.onchange = run;
    run();
  }

  /* =====================================================================
     LAB 4: small-step vs big-step on arithmetic
     ===================================================================== */
  function parseArith(src) {
    const t = (src.match(/\s*(\d+|[-+*/()]|\S)/g) || []).map((s) => s.trim());
    let i = 0;
    function prim() {
      const k = t[i];
      if (k == null) throw new Error("unexpected end of input");
      if (k === "(") { i++; const e = add(); if (t[i] !== ")") throw new Error("missing )"); i++; return e; }
      if (/^\d+$/.test(k)) { i++; return { t: "n", v: parseInt(k, 10) }; }
      throw new Error("unexpected '" + k + "'");
    }
    function mul() { let e = prim(); while (t[i] === "*" || t[i] === "/") { const o = t[i++]; e = { t: "op", o, l: e, r: prim() }; } return e; }
    function add() { let e = mul(); while (t[i] === "+" || t[i] === "-") { const o = t[i++]; e = { t: "op", o, l: e, r: mul() }; } return e; }
    const e = add();
    if (i < t.length) throw new Error("unexpected '" + t[i] + "'");
    return e;
  }
  const OPT = { "+": "+", "-": "-", "*": "\\times", "/": "/" };
  const calc = (o, a, b) => (o === "+" ? a + b : o === "-" ? a - b : o === "*" ? a * b : Math.trunc(a / b));
  function aTex(e, box, path, inner) {
    let s;
    if (e.t === "n") s = String(e.v);
    else s = aTex(e.l, box, path + "l", true) + " " + OPT[e.o] + " " + aTex(e.r, box, path + "r", true);
    if (e.t === "op" && inner && path !== box) s = "(" + s + ")";
    if (path === box) s = "\\boxed{" + s + "}";
    return s;
  }
  function sstep(e) {
    if (e.t === "n") return null;
    if (e.l.t !== "n") { const r = sstep(e.l); if (r.stuck) return { stuck: true, path: "l" + r.path }; return { e: { t: "op", o: e.o, l: r.e, r: e.r }, rules: [OPT[e.o] + "_L"].concat(r.rules), path: "l" + r.path }; }
    if (e.r.t !== "n") { const r = sstep(e.r); if (r.stuck) return { stuck: true, path: "r" + r.path }; return { e: { t: "op", o: e.o, l: e.l, r: r.e }, rules: [OPT[e.o] + "_R"].concat(r.rules), path: "r" + r.path }; }
    if (e.o === "/" && e.r.v === 0) return { stuck: true, path: "" };
    return { e: { t: "n", v: calc(e.o, e.l.v, e.r.v) }, rules: [OPT[e.o] + "_N"], path: "" };
  }
  function bigTree(e) {
    if (e.t === "n") return { tex: "\\dfrac{}{" + e.v + " \\downarrow " + e.v + "}\\rulename{num}", v: e.v };
    const a = bigTree(e.l), b = bigTree(e.r);
    if (a.err || b.err) return { err: true };
    if (e.o === "/" && b.v === 0) return { err: true };
    const v = calc(e.o, a.v, b.v);
    return { tex: "\\dfrac{" + a.tex + " \\quad " + b.tex + " \\quad " + v + " = " + a.v + " " + OPT[e.o] + " " + b.v + "}{" + aTex(e, null, "", false) + " \\downarrow " + v + "}\\rulename{op}", v };
  }
  function labSmallBig(el) {
    const { controls, view } = PA.lab(el, {
      title: "One expression, two semantics",
      hint: "Small-step: each line is one step; the boxed part is the redex (what gets rewritten), and the rule chain says how the step was derived. Big-step: one derivation tree. Try a division by zero.",
    });
    el.classList.add("wide");
    const ex = PA.textInput(controls, { label: "Arithmetic expression (+ - * / and parentheses, natural numbers)", value: "(1 + 2) * (3 + 4)" });
    const pres = PA.btnRow(controls);
    ["(1 + 2) * (3 + 4)", "10 - 2 - 3", "2 * 3 + 4 * 5", "8 / (2 - 2) + 1"].forEach((s) => PA.button(pres, s, () => ex.set(s), "sm"));
    const smallP = h("div", { class: "panel" }, [h("div", { class: "panel-title", text: "Small-step: e → e' → …" })]);
    const smallM = h("div", { style: "overflow-x:auto" });
    smallP.append(smallM);
    const bigP = h("div", { class: "panel" }, [h("div", { class: "panel-title", text: "Big-step: one derivation of e ↓ v" })]);
    const bigM = h("div", { style: "overflow-x:auto" });
    bigP.append(bigM);
    const verdict = h("div", { class: "verdict" });
    view.append(smallP, bigP, verdict);
    function run() {
      let e;
      try { e = parseArith(ex.value); ex.bad(false); } catch (err) { ex.bad(true); smallM.innerHTML = ""; bigM.innerHTML = ""; verdict.className = "verdict bad"; verdict.innerHTML = "<b>Syntax error:</b> " + esc(err.message); return; }
      const ops = (x) => (x.t === "n" ? 0 : 1 + ops(x.l) + ops(x.r));
      if (ops(e) > 6) { verdict.className = "verdict warn"; verdict.innerHTML = "Use at most 6 operators so the derivation tree stays readable."; smallM.innerHTML = bigM.innerHTML = ""; return; }
      const lines = [];
      let cur = e, stuck = false, n = 0;
      while (cur.t !== "n" && n < 40) {
        const r = sstep(cur);
        if (r.stuck) { lines.push("& " + aTex(cur, r.path, "", false) + " && \\text{stuck: no rule applies}"); stuck = true; break; }
        lines.push((n ? "\\to {} & " : "& ") + aTex(cur, r.path, "", false) + " && " + r.rules.map((x) => "(" + x + ")").join(" \\leftarrow "));
        cur = r.e; n++;
      }
      if (!stuck) lines.push((n ? "\\to {} & " : "& ") + cur.v + " && \\text{value}");
      smallM.innerHTML = PA.tex("\\begin{aligned}" + lines.join(" \\\\ ") + "\\end{aligned}", true);
      const b = bigTree(e);
      bigM.innerHTML = b.err ? "<p class='eqn-note' style='text-align:left'>No derivation exists: the rule (op) has no instance for a division by zero, so nothing of the form e ↓ v can be derived.</p>" : PA.tex(b.tex, true);
      if (stuck) { verdict.className = "verdict bad"; verdict.innerHTML = "<b>Stuck after " + n + " step" + (n === 1 ? "" : "s") + ".</b> A division by zero matches no rule. Without error rules, \"crash\" and \"no rule\" are the same thing; the JVM semantics adds the rule bdiv<sub>I0</sub> so the crash becomes an outcome, err('divide by zero')."; }
      else { verdict.className = "verdict good"; verdict.innerHTML = "<b>Both agree:</b> " + n + " small steps reach " + cur.v + ", and the big-step tree concludes ↓ " + b.v + " (Proposition 3.14). Small-step fixes the order: left operand first."; }
    }
    ex.onchange = run;
    run();
  }

  /* =====================================================================
     LAB 5: the trace set Sem(p) for a range of inputs
     ===================================================================== */
  function runTrace(prog, args, budget) {
    let s = J.initState(prog, args);
    const states = [s];
    const seen = new Map();
    const key = (st) => JSON.stringify(st);
    seen.set(key(s), 0);
    for (let i = 0; i < budget; i++) {
      const r = J.step(s);
      if (r.outcome) return { states, outcome: r.outcome };
      s = r.state;
      const k = key(s);
      if (seen.has(k)) { states.push(s); return { states, outcome: "*", cycle: seen.get(k) }; }
      seen.set(k, states.length);
      states.push(s);
    }
    return { states, outcome: "*" };
  }
  function labTraceSet(el) {
    const { controls, view } = PA.lab(el, {
      title: "Sem(p), restricted to a range of inputs",
      hint: "One row per initial state (input). Each box is a state, labelled by its pc offset. Click a row for the full states. A repeated state proves the trace is infinite; a spent budget proves nothing.",
    });
    const PROGS = ["countdown", "collatz", "assertPositive", "divideByN", "checkTheWrongThing", "sumTo", "factorial"];
    const pick = PA.select(controls, { label: "Program", options: PROGS.map((p) => [p, J.get(p).methodId.split(".").slice(-1)[0]]), value: "countdown" });
    const lo = PA.slider(controls, { label: "lowest input", min: -5, max: 0, value: -2 });
    const hi = PA.slider(controls, { label: "highest input", min: 0, max: 9, value: 3 });
    const budget = PA.slider(controls, { label: "step budget per run", min: 20, max: 400, step: 10, value: 120 });
    const stats = PA.stats(controls, [{ key: "n", label: "traces" }, { key: "fin", label: "finite" }, { key: "pre", label: "prefixes too" }]);
    const java = h("div");
    const list = h("div", { class: "tr-list" });
    const detail = h("div");
    const verdict = h("div", { class: "verdict" });
    view.append(java, list, detail, verdict);
    let rows = [], selIdx = 0;
    function run() {
      const prog = J.get(pick.value);
      java.innerHTML = ""; java.append(PA.codeBlock(prog.java, "java"));
      rows = [];
      for (let n = lo.value; n <= hi.value; n++) rows.push(Object.assign({ n }, runTrace(prog, [n], budget.value)));
      list.innerHTML = "";
      rows.forEach((r, i) => {
        const strip = h("div", { class: "trace-strip" });
        const offs = r.states.map((s) => (typeof s === "string" ? null : top(s).pc.off));
        const show = offs.length > 16 ? offs.slice(0, 14) : offs;
        show.forEach((o) => strip.append(h("span", { class: "ts", text: String(o) })));
        if (offs.length > 16) strip.append(h("span", { class: "arrow", text: "… +" + (offs.length - 14) }));
        if (r.cycle != null) strip.append(h("span", { class: "arrow", text: "↺ repeats state " + r.cycle }));
        const b = h("button", { type: "button", class: "tr-row" + (i === selIdx ? " on" : "") }, [h("span", { class: "tr-in", text: "n = " + r.n }), strip, outcomePill(r.outcome)]);
        b.addEventListener("click", () => { selIdx = i; run(); });
        list.append(b);
      });
      if (selIdx >= rows.length) selIdx = 0;
      const r = rows[selIdx];
      const tbl = h("table", { class: "dt no-math" });
      tbl.innerHTML = "<thead><tr><th>i</th><th>pc</th><th>locals λ</th><th>stack σ</th></tr></thead>";
      const tb = h("tbody");
      r.states.slice(0, 60).forEach((s, i) => {
        const f = top(s);
        tb.append(h("tr", null, [h("td", { class: "num", text: String(i) }), h("td", { class: "mono", text: String(f.pc.off) + (s.frames.length > 1 ? " (depth " + s.frames.length + ")" : "") }), h("td", { class: "mono", text: f.locals.map(J.fmtVal).join(" ") }), h("td", { class: "mono", text: J.fmtStack(f.stack) })]));
      });
      tbl.append(tb);
      detail.innerHTML = "";
      detail.append(h("div", { class: "panel-title", text: "Trace for n = " + r.n + " (" + r.states.length + " states" + (r.states.length > 60 ? ", first 60 shown" : "") + "), then " + (r.outcome === "*" ? "no outcome yet" : r.outcome) }), h("div", { class: "tr-detail" }, [tbl]));
      const fin = rows.filter((x) => x.outcome !== "*").length;
      const cyc = rows.filter((x) => x.cycle != null);
      const unk = rows.filter((x) => x.outcome === "*" && x.cycle == null);
      stats.set("n", String(rows.length));
      stats.set("fin", fin + " / " + rows.length, fin === rows.length ? "good" : "warn");
      stats.set("pre", String(rows.reduce((a, x) => a + x.states.length, 0)));
      let v;
      if (fin === rows.length) v = ["good", "<b>Every trace for these inputs is finite.</b> That is evidence, not proof, that the program is in L<sub>halt</sub>: other inputs might loop."];
      else if (cyc.length) v = ["bad", "<b>Not in L<sub>halt</sub>:</b> for n = " + cyc.map((x) => x.n).join(", ") + " a state repeats, and since the JVM is deterministic the trace loops forever." + (unk.length ? " For n = " + unk.map((x) => x.n).join(", ") + " the budget ran out without a repeat: unknown." : "")];
      else v = ["warn", "<b>Budget exhausted</b> for n = " + unk.map((x) => x.n).join(", ") + ", with no repeated state. " + (pick.value === "countdown" ? "Here the trace is actually finite: with 32-bit wrap-around n goes down to -2147483648, wraps to 2147483647 and counts down to 0, after about 4.3 billion iterations." : "Is it infinite or just long? A budget cannot tell.")];
      verdict.className = "verdict " + v[0];
      verdict.innerHTML = v[1] + " The notes' definition of Sem(p) also contains every prefix of these runs (" + rows.reduce((a, x) => a + x.states.length, 0) + " sequences in total).";
    }
    pick.onchange = () => {
      const p = pick.value;
      const R = { countdown: [-2, 3], collatz: [0, 7], assertPositive: [-2, 2], divideByN: [-2, 2], checkTheWrongThing: [-2, 2], sumTo: [-1, 4], factorial: [-1, 5] }[p];
      lo.set(R[0]); hi.set(R[1]); selIdx = 0; run();
    };
    lo.onchange = hi.onchange = budget.onchange = () => { selIdx = 0; run(); };
    run();
  }

  /* =====================================================================
     LAB 6: reading bytecode (Java, listing, jvm2json-style JSON, stack effects)
     ===================================================================== */
  function toJson(prog, ins) {
    const ty = (t) => (t === "I" ? "int" : t === "A" ? "ref" : t === "C" ? "char" : t);
    switch (ins.op) {
      case "push": return { opr: "push", value: { type: "integer", value: ins.value } };
      case "load": return { opr: "load", type: ty(ins.type), index: ins.index };
      case "store": return { opr: "store", type: ty(ins.type), index: ins.index };
      case "binary": return { opr: "binary", type: "int", operant: ins.operant };
      case "negate": return { opr: "negate", type: "int" };
      case "incr": return { opr: "incr", index: ins.index, amount: ins.amount };
      case "ifz": return { opr: "ifz", condition: ins.condition, target: ins.target };
      case "if": return { opr: "if", condition: ins.condition, target: ins.target };
      case "goto": return { opr: "goto", target: ins.target };
      case "return": return { opr: "return", type: ins.type ? "int" : null };
      case "get": return { opr: "get", static: true, field: { class: prog.cls.replace(/\./g, "/"), name: "$assertionsDisabled", type: "boolean" } };
      case "new": return { opr: "new", class: ins.class };
      case "dup": return { opr: "dup", words: 1 };
      case "invoke":
        if (ins.access === "special") return { opr: "invoke", access: "special", method: { args: [], is_interface: false, name: "<init>", ref: { kind: "class", name: "java/lang/AssertionError" }, returns: null } };
        return { opr: "invoke", access: "static", method: { args: ["int"], is_interface: false, name: ins.target, ref: { kind: "class", name: prog.cls.replace(/\./g, "/") }, returns: "int" } };
      case "throw": return { opr: "throw" };
      case "arraylength": return { opr: "arraylength" };
      case "array_load": return { opr: "array_load", type: ty(ins.type) };
    }
    return { opr: ins.op };
  }
  function effect(ins) {
    const c = J.COND_SYM;
    switch (ins.op) {
      case "push": return ["… → … " + ins.value, "Push the constant " + ins.value + (ins._char ? " (the char '" + ins._char + "')" : "") + "."];
      case "load": return ["… → … λ[" + ins.index + "]", "Push a copy of local " + ins.index + (ins.type === "A" ? " (a reference)" : "") + "."];
      case "store": return ["… v → …", "Pop the top value into local " + ins.index + "."];
      case "binary": return ["… v1 v2 → … (v1 " + ins.operant + " v2)", "Pop two ints, push the 32-bit " + ins.operant + (ins.operant === "div" || ins.operant === "rem" ? "; error if v2 = 0" : "") + "."];
      case "negate": return ["… v → … -v", "Negate the top int."];
      case "incr": return ["… → …", "Add " + ins.amount + " to local " + ins.index + " in place."];
      case "ifz": return ["… v → …", "Pop v; if v " + c[ins.condition] + " 0 jump to " + ins.target + ", else continue."];
      case "if": return ["… v1 v2 → …", "Pop two; if v1 " + c[ins.condition] + " v2 jump to " + ins.target + ", else continue."];
      case "goto": return ["… → …", "Jump to " + ins.target + "."];
      case "return": return ins.type ? ["… v → (caller)", "Return the top int to the caller (or finish with ok)."] : ["… → (caller)", "Return; finish with ok if this is the last frame."];
      case "get": return ["… → … 0", "Read the static field (assertions are on, so it is false = 0)."];
      case "new": return ["… → … ref", "Allocate an " + ins.class.split("/").pop() + " on the heap, push a reference."];
      case "dup": return ["… v → … v v", "Duplicate the top value."];
      case "invoke": return ins.access === "special" ? ["… ref → …", "Run the constructor, consuming one reference."] : ["… args → … result", "Call " + ins.target + " in a new frame; its result is pushed on return."];
      case "throw": return ["… ref → error", "Throw the exception: err('assertion error')."];
      case "arraylength": return ["… ref → … len", "Push the length of the array."];
      case "array_load": return ["… ref i → … a[i]", "Read element i; error if out of bounds or null."];
    }
    return ["?", ""];
  }
  function labBytecode(el) {
    const { controls, view } = PA.lab(el, {
      title: "Read a method four ways",
      hint: "Pick a method. Compare the Java source, the listing, the decompiled JSON (simplified jvm2json style) and the stack effect of every instruction. Click a table row to highlight it in the listing.",
    });
    el.classList.add("wide");
    const pick = PA.select(controls, { label: "Method", options: J.programs.map((p) => [p.id, p.methodId]), value: "assertFalse" });
    const javaP = h("div", { class: "panel" }, [h("div", { class: "panel-title", text: "Java source" })]);
    const lstP = h("div", { class: "panel" }, [h("div", { class: "panel-title", text: "Listing (instruction indices)" })]);
    const jsonD = h("details", { class: "proof" }, [h("summary", { text: "Decompiled JSON (simplified jvm2json style)" })]);
    const tbl = h("table", { class: "dt no-math" });
    view.append(h("div", { class: "split" }, [javaP, lstP]), jsonD, h("div", { class: "table-wrap" }, [tbl]));
    let lst, cur = null;
    function run() {
      const prog = J.get(pick.value);
      javaP.querySelectorAll("pre").forEach((p) => p.remove()); javaP.append(PA.codeBlock(prog.java, "java"));
      if (lst) lst.el.remove();
      lst = J.listing(prog, { title: false });
      lstP.append(lst.el);
      jsonD.querySelectorAll("pre").forEach((p) => p.remove());
      jsonD.append(PA.codeBlock("[\n" + prog.code.map((i) => " " + JSON.stringify(toJson(prog, i))).join(",\n") + "\n]", "json"));
      tbl.innerHTML = "<thead><tr><th>#</th><th>instruction</th><th>stack effect</th><th>meaning</th></tr></thead>";
      const tb = h("tbody");
      prog.code.forEach((ins, i) => {
        const [ef, mean] = effect(ins);
        const tr = h("tr", { style: "cursor:pointer" }, [h("td", { class: "num", text: String(i) }), h("td", { class: "mono", text: J.fmtIns(ins) }), h("td", { class: "mono", text: ef }), h("td", { text: mean })]);
        tr.addEventListener("click", () => { cur = i; mark(); });
        tb.append(tr);
      });
      tbl.append(tb);
      cur = null; mark();
    }
    function mark() {
      lst.mark({ cur });
      tbl.querySelectorAll("tbody tr").forEach((tr, i) => tr.classList.toggle("on", i === cur));
    }
    pick.onchange = run;
    run();
  }

  /* =====================================================================
     LAB 7: the JVM stepper (centerpiece)
     ===================================================================== */
  function labStepper(el) {
    const { controls, view } = PA.lab(el, {
      title: "Step through any method, one rule at a time",
      hint: "Pick a method and an input (JPAMB syntax, e.g. (5), (true), ([C: 'h','i'])). Each Step applies exactly one rule; new stack cells are green, popped ones red. Back undoes a step.",
    });
    const pick = PA.select(controls, { label: "Method", options: J.programs.map((p) => [p.id, p.id + " " + p.desc]), value: "divideByN" });
    const inp = PA.textInput(controls, { label: "Input", value: "(0)" });
    const pres = PA.btnRow(controls);
    const btns = PA.btnRow(controls);
    const stats = PA.stats(controls, [{ key: "steps", label: "steps taken" }, { key: "depth", label: "call depth" }]);
    const lstHolder = h("div");
    const stateEl = h("div", { class: "state" });
    const heapEl = h("div", { class: "heap-line" });
    const verdict = h("div", { class: "verdict" });
    const ruleEl = h("div", { class: "rule-box" });
    const strip = h("div", { class: "trace-strip" });
    const javaD = h("details", { class: "proof" }, [h("summary", { text: "Java source" })]);
    view.append(h("div", { class: "split" }, [lstHolder, h("div", { style: "display:grid;gap:10px;align-content:start" }, [stateEl, verdict])]), ruleEl, h("div", { class: "panel" }, [h("div", { class: "panel-title", text: "Trace so far (pc offsets in the entry method)" }), strip]), javaD);
    let prog, lst, hist;
    function setProg() {
      prog = J.get(pick.value);
      if (lst) lst.el.remove();
      lst = J.listing(prog);
      lstHolder.append(lst.el);
      pres.innerHTML = "";
      prog.cases.forEach(([i]) => PA.button(pres, i, () => { inp.input.value = i; reset(); }, "sm"));
      inp.input.value = prog.cases[0][0];
      javaD.querySelectorAll("pre").forEach((p) => p.remove());
      javaD.append(PA.codeBlock(prog.java, "java"));
      reset();
    }
    function reset() {
      let args;
      try { args = J.parseInput(prog, inp.value); inp.bad(false); }
      catch (e) { inp.bad(true); verdict.className = "verdict bad"; verdict.innerHTML = "<b>Input:</b> " + esc(e.message) + ". Expected " + esc(prog.desc.slice(0, prog.desc.indexOf(")") + 1)) + "."; return; }
      hist = [{ st: J.initState(prog, args), r: null, out: null }];
      render();
    }
    const cur = () => hist[hist.length - 1];
    function stepOnce() {
      const c = cur();
      if (!c || c.out) return false;
      const r = J.step(c.st);
      hist.push({ st: r.outcome ? c.st : r.state, r, out: r.outcome, prev: c.st });
      return true;
    }
    function render() {
      const c = cur();
      if (!c) return;
      const st = c.st, f = top(st), prev = c.prev ? top(c.prev) : null;
      const samePrevFrame = prev && c.prev.frames.length === st.frames.length;
      lst.mark({ cur: c.out || f.pc.prog !== prog.id ? null : f.pc.off, err: c.out && c.out !== "ok" && f.pc.prog === prog.id ? f.pc.off : null, cov: new Set(hist.map((x) => top(x.st)).filter((x) => x.pc.prog === prog.id).map((x) => x.pc.off)) });
      stateEl.innerHTML = "";
      stateEl.append(
        stateRow("locals λ", cellsEl(localsDiff(samePrevFrame ? prev.locals : null, f.locals))),
        stateRow("stack σ", cellsEl(stackDiff(samePrevFrame ? prev.stack : null, f.stack))),
        stateRow("pc ι", document.createTextNode("⟨" + f.pc.prog + ", " + f.pc.off + "⟩")),
        stateRow("heap η", document.createTextNode(heapText(st.heap)))
      );
      if (st.frames.length > 1) stateEl.append(stateRow("call stack", document.createTextNode(st.frames.length + " frames, callers below: " + st.frames.slice(0, -1).map((x) => x.pc.prog + "@" + x.pc.off).join(", "))));
      heapEl.textContent = "";
      if (c.r) {
        const rule = J.rules[c.r.rule];
        ruleEl.innerHTML = '<div class="rule-name">Rule used: ' + ruleName(rule.name) + "</div>" + PA.tex(rule.tex, true) + '<div class="eqn-note no-math"></div>';
        ruleEl.querySelector(".eqn-note").textContent = c.r.note;
      } else ruleEl.innerHTML = '<div class="rule-name">Initial state: no step taken yet</div><div class="eqn-note" style="text-align:left">One frame, the arguments in the locals, an empty stack, pc at offset 0. Press Step.</div>';
      strip.innerHTML = "";
      const offs = hist.map((x) => top(x.st)).filter((x, i) => !hist[i].out).map((x) => x.pc.prog === prog.id ? String(x.pc.off) : "↓");
      const start = Math.max(0, offs.length - 40);
      if (start) strip.append(h("span", { class: "arrow", text: "…" }));
      offs.slice(start).forEach((o, i) => strip.append(h("span", { class: "ts" + (start + i === offs.length - 1 && !c.out ? " on" : ""), text: o })));
      if (c.out) strip.append(h("span", { class: "ts " + (c.out === "ok" ? "end-ok" : "end-err"), text: c.out }));
      stats.set("steps", String(hist.length - 1));
      stats.set("depth", String(st.frames.length));
      if (c.out) {
        verdict.className = "verdict " + (c.out === "ok" ? "good" : "bad");
        verdict.innerHTML = "<b>Finished:</b> " + (c.out === "ok" ? "ok" : "err('" + esc(c.out) + "')") + " after " + (hist.length - 1) + " steps. Expected by the case annotation: " + esc((prog.cases.find((k) => k[0].replace(/\s/g, "") === inp.value.replace(/\s/g, "")) || [0, "?"])[1]) + ".";
      } else {
        verdict.className = "verdict";
        verdict.innerHTML = "Next: <code></code>";
        verdict.querySelector("code").textContent = J.fmtIns(J.get(f.pc.prog).code[f.pc.off]);
      }
    }
    PA.button(btns, "Step", () => { stepOnce(); render(); }, "primary");
    PA.button(btns, "Back", () => { if (hist.length > 1) { hist.pop(); render(); } });
    PA.button(btns, "Run", () => { let n = 0; while (n++ < 400 && stepOnce()); render(); });
    PA.button(btns, "Reset", reset);
    pick.onchange = setProg;
    inp.input.addEventListener("keydown", (e) => { if (e.key === "Enter") reset(); });
    inp.onchange = () => { try { J.parseInput(prog, inp.value); inp.bad(false); } catch (e) { inp.bad(true); } };
    inp.input.addEventListener("change", reset);
    setProg();
  }

  /* =====================================================================
     LAB 8: the call stack of factorial
     ===================================================================== */
  function labCalls(el) {
    const { controls, view } = PA.lab(el, {
      title: "Watch the call stack grow and shrink",
      hint: "factorial(n) calls itself until n ≤ 1. Each invoke pushes a frame (top of the list = active frame, the rightmost in μ), each return pops one and hands the value to the caller.",
    });
    const nS = PA.slider(controls, { label: "n", min: 0, max: 6, value: 3 });
    const btns = PA.btnRow(controls);
    const stats = PA.stats(controls, [{ key: "depth", label: "frames now" }, { key: "max", label: "max depth" }, { key: "steps", label: "steps" }]);
    const mu = h("div", { class: "mu-line" });
    const frames = h("div", { class: "frames" });
    const ruleEl = h("div", { class: "rule-box" });
    const heap = h("div", { class: "heap-line" });
    const verdict = h("div", { class: "verdict" });
    view.append(frames, mu, heap, ruleEl, verdict);
    const prog = J.get("factorial");
    let hist;
    function reset() { hist = [{ st: J.initState(prog, [nS.value]), r: null, out: null }]; render(); }
    function stepOnce() {
      const c = hist[hist.length - 1];
      if (c.out) return false;
      const r = J.step(c.st);
      hist.push({ st: r.outcome ? c.st : r.state, r, out: r.outcome });
      return true;
    }
    function render() {
      const c = hist[hist.length - 1];
      const st = c.st;
      const prevDepth = hist.length > 1 ? hist[hist.length - 2].st.frames.length : st.frames.length;
      frames.innerHTML = "";
      st.frames.slice().reverse().forEach((f, i) => {
        const isTop = i === 0 && !c.out;
        const card = h("div", { class: "frame-card" + (isTop ? " top" : "") + (isTop && st.frames.length > prevDepth ? " new-in" : "") }, [
          h("div", { class: "fc-h" }, [h("span", { text: (isTop ? "active frame: " : "waiting: ") + "factorial(" + f.locals[0].v + ")" }), h("span", { text: "ι = ⟨factorial, " + f.pc.off + "⟩" })]),
          h("div", { text: "λ = [" + f.locals.map(J.fmtVal).join(", ") + "]" }),
          h("div", { text: "σ = " + J.fmtStack(f.stack) }),
        ]);
        frames.append(card);
      });
      if (c.out) frames.append(h("div", { class: "verdict good", text: "Call stack empty: the last frame returned." }));
      mu.textContent = "μ = ε" + st.frames.map((f) => "⟨[" + f.locals.map((v) => v.v).join(",") + "], " + J.fmtStack(f.stack) + ", " + f.pc.off + "⟩").join("");
      heap.textContent = "η = " + heapText(st.heap) + "  (factorial never allocates)";
      if (c.r) { const rule = J.rules[c.r.rule]; ruleEl.innerHTML = '<div class="rule-name">Rule used: ' + ruleName(rule.name) + "</div>" + PA.tex(rule.tex, true) + '<div class="eqn-note no-math"></div>'; ruleEl.querySelector(".eqn-note").textContent = c.r.note; }
      else ruleEl.innerHTML = '<div class="rule-name">Initial state</div>';
      const maxD = Math.max(...hist.map((x) => x.st.frames.length));
      stats.set("depth", c.out ? "0" : String(st.frames.length));
      stats.set("max", String(maxD));
      stats.set("steps", String(hist.length - 1));
      if (c.out) {
        const lastRet = hist[hist.length - 1].r.note;
        verdict.className = "verdict good"; verdict.innerHTML = "<b>ok</b> after " + (hist.length - 1) + " steps. The deepest point had " + maxD + " frames on the call stack. " + esc(lastRet) + ".";
      } else {
        const ins = prog.code[top(st).pc.off];
        verdict.className = "verdict";
        verdict.innerHTML = "Next instruction: <code>" + esc(J.fmtIns(ins)) + "</code>" + (ins.op === "invoke" ? " (will push a frame)" : ins.op === "return" ? (st.frames.length > 1 ? " (will pop this frame and push the result on the caller's stack)" : " (last frame: will finish with ok)") : "");
      }
    }
    PA.button(btns, "Step", () => { stepOnce(); render(); }, "primary");
    PA.button(btns, "Next call / return", () => {
      const d0 = hist[hist.length - 1].st.frames.length;
      let n = 0;
      while (n++ < 200 && stepOnce()) { const c = hist[hist.length - 1]; if (c.out || c.st.frames.length !== d0) break; }
      render();
    });
    PA.button(btns, "Back", () => { if (hist.length > 1) { hist.pop(); render(); } });
    PA.button(btns, "Reset", reset);
    nS.onchange = reset;
    reset();
  }

  /* =====================================================================
     LAB 9: predict the next state
     ===================================================================== */
  function labPredict(el) {
    const { controls, view } = PA.lab(el, {
      title: "Predict the next state",
      hint: "A real state from a real run, and the instruction about to execute. Which state (or outcome) comes next? Apply the rule in your head, then click.",
    });
    const stats = PA.stats(controls, [{ key: "score", label: "correct" }, { key: "streak", label: "streak" }]);
    const btns = PA.btnRow(controls);
    const onlyDup = PA.toggle(controls, { label: "Only <code>dup</code>, <code>new</code> and <code>throw</code>", value: false });
    const q = h("div", { class: "pred-q no-math" });
    const ruleEl = h("div", { class: "rule-box", hidden: true });
    view.append(q, ruleEl);
    // pool of single-frame steps from real runs
    const pool = [];
    J.programs.forEach((p) => {
      if (p.id === "infiniteLoop") return;
      p.cases.forEach(([inp]) => {
        let s = J.initState(p, J.parseInput(p, inp));
        for (let i = 0; i < 60; i++) {
          const r = J.step(s);
          const f = top(s);
          const ins = J.get(f.pc.prog).code[f.pc.off];
          const ok = s.frames.length === 1 && !(ins.op === "invoke" && ins.access === "static");
          if (ok) pool.push({ s, r, ins, prog: J.get(f.pc.prog) });
          if (r.outcome) break;
          s = r.state;
        }
      });
    });
    const OUT = (o) => (o === "ok" ? "ok" : "err('" + o + "')");
    function variants(item) {
      const f = top(item.s), ins = item.ins, r = item.r;
      const correct = r.outcome ? OUT(r.outcome) : frameText(top(r.state));
      const fr = (locals, stack, off) => frameText({ locals, stack, pc: { off } });
      const L = f.locals, S = f.stack, o = f.pc.off;
      const d = [];
      const nf = r.outcome ? null : top(r.state);
      if (nf) {
        if (nf.pc.off !== o) d.push(fr(nf.locals, nf.stack, o));
        if (nf.pc.off !== o + 1) d.push(fr(nf.locals, nf.stack, o + 1));
        else if (ins.op === "ifz" || ins.op === "if") d.push(fr(nf.locals, nf.stack, ins.target));
      }
      switch (ins.op) {
        case "push": d.push(fr(L, [J.int(ins.value)].concat(S), o + 1), fr(L, S, o + 1)); break;
        case "load": d.push(fr(L.map((v, i) => (i === ins.index ? J.int(0) : v)), nf.stack, o + 1), fr(L, S, o + 1)); if (L.length > 1) d.push(fr(L, S.concat([L[(ins.index + 1) % L.length]]), o + 1)); break;
        case "store": d.push(fr(L, S, o + 1), fr(nf.locals, S, o + 1)); break;
        case "binary": {
          const a = S[S.length - 2], b = S[S.length - 1], rest = S.slice(0, -2);
          if (r.outcome) d.push(fr(L, rest.concat([J.int(0)]), o + 1), "ok", fr(L, rest, o + 1));
          else {
            const sw = J.arith(ins.operant, b.v, a.v);
            if (typeof sw === "number" && sw !== nf.stack[nf.stack.length - 1].v) d.push(fr(L, rest.concat([J.int(sw)]), o + 1));
            d.push(fr(L, S.concat([nf.stack[nf.stack.length - 1]]), o + 1));
          }
          break;
        }
        case "ifz": case "if": d.push(fr(L, S, nf.pc.off)); break;
        case "dup": d.push(fr(L, S, o + 1)); if (S.length > 1) d.push(fr(L, S.concat([S[S.length - 2]]), o + 1)); d.push(fr(L, S.concat([S[S.length - 1]]), o)); break;
        case "get": d.push(fr(L, S.concat([J.int(1)]), o + 1)); break;
        case "new": d.push(fr(L, S, o + 1), fr(L, S.concat([J.ref(null)]), o + 1)); break;
        case "invoke": d.push(fr(L, S, o + 1)); break;
        case "throw": d.push("ok", "err('null pointer')", fr(L, S.slice(0, -1), o + 1)); break;
        case "return": d.push(fr(L, S, o + 1), "err('assertion error')", fr(L, S, o)); break;
        case "goto": d.push(fr(L, S, o + 1)); break;
        case "incr": d.push(fr(L, S.concat([J.int(L[ins.index].v + ins.amount)]), o + 1), fr(L.map((v, i) => (i === ins.index ? J.int(v.v - ins.amount) : v)), S, o + 1)); break;
        case "array_load": d.push(fr(L, S, o + 1), "err('out of bounds')"); break;
      }
      d.push("err('divide by zero')", fr(L, [], o + 1));
      const uniq = [];
      d.forEach((x) => { if (x !== correct && uniq.indexOf(x) < 0) uniq.push(x); });
      const opts = [correct].concat(uniq.slice(0, 3));
      for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
      return { opts, correct };
    }
    let score = 0, total = 0, streak = 0, item;
    function next() {
      const want = onlyDup.value ? ["dup", "new", "throw"] : null;
      const cands = want ? pool.filter((p) => want.indexOf(p.ins.op) >= 0) : pool;
      const weighted = cands.concat(cands.filter((p) => p.ins.op === "dup"));
      item = weighted[Math.floor(Math.random() * weighted.length)];
      const f = top(item.s);
      const { opts, correct } = variants(item);
      ruleEl.hidden = true;
      q.innerHTML = "";
      q.append(
        h("div", { class: "panel-title", style: "text-transform:none;letter-spacing:0", text: "Method " + item.prog.id + ": current state" }),
        h("div", { class: "state" }, [
          stateRow("locals λ", cellsEl(localsDiff(null, f.locals))),
          stateRow("stack σ", cellsEl(stackDiff(null, f.stack))),
          stateRow("pc ι", document.createTextNode(String(f.pc.off))),
          stateRow("heap η", document.createTextNode(heapText(item.s.heap))),
        ]),
        h("div", null, [h("span", { text: "Instruction at " + f.pc.off + ": " }), h("span", { class: "pred-ins", text: J.fmtIns(item.ins) })])
      );
      const list = h("div", { class: "pred-opts" });
      opts.forEach((o, i) => {
        const b = h("button", { type: "button", class: "pred-opt" }, [h("span", { class: "opt-letter", text: "ABCD"[i] }), h("code", { text: o })]);
        b.addEventListener("click", () => {
          const right = o === correct;
          total++; if (right) { score++; streak++; } else streak = 0;
          list.querySelectorAll("button").forEach((x) => { x.disabled = true; if (x.querySelector("code").textContent === correct) x.classList.add("correct"); });
          if (!right) b.classList.add("wrong");
          stats.set("score", score + " / " + total, right ? "good" : "bad");
          stats.set("streak", String(streak));
          const rule = J.rules[item.r.rule];
          ruleEl.hidden = false;
          ruleEl.innerHTML = '<div class="rule-name">' + (right ? "Correct" : "Not quite") + ": rule " + ruleName(rule.name) + "</div>" + PA.tex(rule.tex, true) + '<div class="eqn-note no-math"></div>';
          ruleEl.querySelector(".eqn-note").textContent = item.r.note;
        });
        list.append(b);
      });
      q.append(list);
    }
    stats.set("score", "0 / 0"); stats.set("streak", "0");
    PA.button(btns, "Next question", next, "primary");
    onlyDup.onchange = next;
    next();
  }

  /* =====================================================================
     Boot
     ===================================================================== */
  const LABS = {
    prooftree: labProofTree,
    hoare: labHoare,
    denote: labDenote,
    smallbig: labSmallBig,
    traceset: labTraceSet,
    bytecode: labBytecode,
    stepper: labStepper,
    calls: labCalls,
    predict: labPredict,
  };

  PA.boot("semantics", LABS, QUIZ);
})();
