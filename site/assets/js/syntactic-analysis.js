/* Week 2, Syntactic Analysis: quiz bank and interactive labs. */
(function () {
  "use strict";
  const h = PA.h;
  const esc = PA.esc;

  /* =====================================================================
     QUIZ BANK.  Each option: [text (HTML, $math$ allowed), isCorrect, explanation]
     ===================================================================== */
  const QUIZ = {
    what: [
      {
        q: "Which pair of programs is syntactically different but semantically equivalent?",
        options: [
          ["<code>return 1 / n;</code> and <code>return 1 / (n * n + 1);</code>", false, "They share the pattern \"a division\" but mean different things: only the first can divide by zero."],
          ["<code>return 1 + 2;</code> and <code>return 2 + 1;</code>", true, "Different text, tokens and trees, yet both always return 3. A syntactic analysis sees two programs, a semantic one sees one meaning."],
          ["<code>return x;</code> and <code>return x;</code>", false, "These are identical at every level of syntax, so they are not syntactically different."],
          ["<code>return 1 / 0;</code> and <code>return 0;</code>", false, "These differ in syntax and in meaning: the first throws a division by zero."],
        ],
      },
      {
        q: "Why are most linters in practice syntactic pattern matchers?",
        options: [
          ["Because syntactic analyses are sound", false, "They are not: a pattern cannot capture what the program does. The reasons are practical."],
          ["Because they are easier to develop and maintain, and a match points at the exact source location", true, "These are the two reasons in the notes: low engineering cost and good feedback (highlighting the offending code)."],
          ["Because they run the program on many inputs", false, "That would be a dynamic analysis. Syntactic analyses never run the code."],
          ["Because semantic analyses are impossible", false, "Semantic analyses exist (later lectures); they are just harder to build and their results harder to explain."],
        ],
      },
      {
        q: "A syntactic analysis reports \"divide by zero: yes\" for every method containing <code>/</code>. On which method is that a <em>false alarm</em>?",
        options: [
          ["<code>return 1 / n;</code>", false, "This really divides by zero when <code>n == 0</code>, so the warning is correct."],
          ["<code>return 1 / 0;</code>", false, "This always divides by zero, a true warning."],
          ["<code>return 1 / (n * n + 1);</code>", true, "The divisor is never 0 (a square is never one less than a multiple of 4, even with 32-bit overflow), yet the pattern fires. Syntax cannot see values."],
        ],
      },
    ],

    levels: [
      {
        q: "At which level do <code>1232</code> and <code>232</code> first look the same to the analysis?",
        options: [
          ["Text", false, "As text they are different strings of different lengths."],
          ["Tokens", true, "The lexer turns both into an integer-literal token; to the parser they have the same kind (only the lexeme differs)."],
          ["Bits", false, "Their bytes differ."],
          ["They never look the same", false, "From the token level on, both are just an integer literal for the grammar."],
        ],
      },
      {
        q: "What is the main difference between a CST and an AST?",
        options: [
          ["The CST keeps every token (parentheses included); the AST drops what does not matter for the meaning", true, "<code>(( 10 ))</code> and <code>( 10 )</code> have different CSTs but the same AST, <code>10</code>."],
          ["The AST contains comments, the CST does not", false, "Comments are usually already gone after lexing; neither tree typically keeps them."],
          ["The CST is produced after the AST", false, "The order is tokens, CST, AST: the AST is abstracted from the CST."],
          ["Only the AST decides operator precedence", false, "Precedence is decided by the parser, so it is already visible in the CST."],
        ],
      },
      {
        q: "Why can no AST-level analysis warn about redundant parentheses like <code>((10))</code>?",
        options: [
          ["Because ASTs are too slow to traverse", false, "Speed is not the issue."],
          ["Because $\\mathit{abstract}$ maps <code>((10))</code> and <code>10</code> to the same tree, and any function of the AST must then give the same answer (Proposition 2.2)", true, "Once information is lost at some level, no analysis on that level can recover it."],
          ["Because parentheses are a semantic property", false, "Parentheses are pure syntax; they are simply gone from the AST."],
          ["It can, by looking at the bytecode", false, "Bytecode is even further from the text; the parentheses are long gone there."],
        ],
      },
      {
        q: "A compiler rewrites <code>x + 2 + 4</code> into <code>x + 6</code>. What justifies it for Java <code>int</code>?",
        options: [
          ["Nothing, it changes the meaning", false, "For <code>int</code> it does not: wrap-around addition is associative."],
          ["Addition modulo $2^{32}$ is associative, so $(x + 2) + 4 = x + (2 + 4)$ even with overflow", true, "Re-association plus constant folding. The same rewrite would be wrong for <code>double</code>."],
          ["The parser already reads it as <code>x + (2 + 4)</code>", false, "<code>+</code> is left-associative: it is parsed as <code>(x + 2) + 4</code>, which has no constant sub-expression."],
        ],
      },
    ],

    "every-level": [
      {
        q: "Where should a linter that warns about <code>a &amp;&amp; b || c</code> (but not about <code>(a &amp;&amp; b) || c</code>) run?",
        options: [
          ["On the tokens", false, "Tokens show the parentheses, but not the structure that says which operator is the child of which; you would be re-implementing the parser."],
          ["On the CST", true, "The CST has both the structure and the parenthesis nodes, so \"&& directly under ||\" is a one-line check."],
          ["On the AST", false, "Both versions have the same AST, so no AST rule can distinguish them."],
          ["On the bytecode", false, "Bytecode has jumps instead of operators; both versions compile identically."],
        ],
      },
      {
        q: "How does Java read <code>a &amp;&amp; b || c</code>?",
        options: [
          ["<code>(a &amp;&amp; b) || c</code>", true, "&& binds tighter than ||, just like * binds tighter than +."],
          ["<code>a &amp;&amp; (b || c)</code>", false, "That would require || to bind tighter, which it does not. This misreading is exactly why the lint exists."],
          ["It is a compile error", false, "It compiles fine; it is merely easy to misread."],
        ],
      },
      {
        q: "Detecting calls to deprecated functions is easiest on which level?",
        options: [
          ["Text", false, "On text an import alias, a wildcard import or a fully qualified call can hide the name."],
          ["IR", true, "There names are resolved to fully qualified methods, so aliases and imports no longer matter."],
          ["Bits", false, "Bits only tell you about the encoding."],
          ["CST", false, "Possible, but you would have to resolve names yourself; the IR has done it already."],
        ],
      },
    ],

    goal: [
      {
        q: "Why do syntactic analyses usually aim for completeness (few false warnings) rather than soundness?",
        options: [
          ["Because soundness is easy and therefore boring", false, "Soundness is not easy for semantic properties; but the real reason is different."],
          ["Because to be sound from syntax alone they must reject almost every program with the pattern, which drowns developers in false warnings", true, "Syntax does not determine meaning, so a sound syntactic check is hopelessly noisy. Developers prefer fewer false positives."],
          ["Because completeness implies soundness", false, "They are independent; for undecidable properties you cannot have both."],
          ["Because developers prefer to find more bugs at any cost", false, "The survey found the opposite: forced to choose, developers pick fewer false positives."],
        ],
      },
      {
        q: "A tool prints 40 warnings, 30 of which are real bugs. What is its false-alarm rate in the sense of Christakis and Bird?",
        options: [
          ["10%", false, "That is 10 out of 100, but there were only 40 warnings."],
          ["25%", true, "$FP / (TP + FP) = 10 / 40 = 25\\%$, above the 15 to 20% developers said they accept."],
          ["75%", false, "That is the share of correct warnings (the precision)."],
          ["Cannot be computed without the number of true negatives", false, "This rate is about warnings only; true negatives are needed for the statistical false positive rate, not this one."],
        ],
      },
      {
        q: "In the program-based view, which analysis is trivially <em>sound</em>?",
        options: [
          ["One that accepts every program", false, "That one is trivially complete: every good program is accepted."],
          ["One that rejects every program", true, "With $\\mathit{Acc} = \\emptyset$ the inclusion $\\mathit{Acc} \\subseteq \\mathit{Good}$ holds vacuously. Sound, and useless."],
          ["One that runs the program once", false, "Running once is a dynamic analysis and says nothing about all behaviours."],
        ],
      },
    ],

    language: [
      {
        q: "Which statement about $\\Sigma^*$ is true?",
        options: [
          ["It contains only the non-empty words over $\\Sigma$", false, "It includes the empty word $\\epsilon$ (that set without $\\epsilon$ is $\\Sigma^+$)."],
          ["It is the set of all finite words over $\\Sigma$, including $\\epsilon$", true, "$\\Sigma^* = \\bigcup_{n} \\Sigma^n$ with $\\Sigma^0 = \\{\\epsilon\\}$."],
          ["It is finite when $\\Sigma$ is finite", false, "It is infinite (countably) as soon as $\\Sigma$ has at least one symbol: there are words of every length."],
        ],
      },
      {
        q: "What is a language, formally?",
        options: [
          ["A grammar", false, "A grammar is one way to <em>describe</em> a language; the language itself is a set."],
          ["Any subset of $\\Sigma^*$", true, "Nothing more: a set of words. It may be finite, infinite, or not describable by any program at all."],
          ["A set of programs that compile", false, "That is one particular language; the definition is far more general."],
          ["A finite set of symbols", false, "That is the alphabet."],
        ],
      },
      {
        q: "Why are most languages not recognised by any program?",
        options: [
          ["Because programs are too slow", false, "It is not about speed but about counting."],
          ["There are countably many programs but uncountably many languages ($2^{\\Sigma^*}$)", true, "Cantor's diagonal argument: no list of languages (and programs give a list) can contain all of them."],
          ["Because every language is infinite", false, "Finite languages exist and are all easy to recognise."],
        ],
      },
    ],

    deciders: [
      {
        q: "What is the difference between a decider and a recognizer for $L$?",
        options: [
          ["A decider halts on every input; a recognizer may run forever on words outside $L$", true, "Both accept exactly $L$; only the decider promises to say \"no\" in finite time."],
          ["A recognizer is faster", false, "Speed is not the difference; halting is."],
          ["A decider may run forever on words in $L$", false, "A decider halts on every input, members included."],
          ["They accept different languages", false, "Both accept exactly $L$."],
        ],
      },
      {
        q: "Why is the halting problem recognizable?",
        options: [
          ["Because we can decide it with enough memory", false, "No amount of memory makes it decidable."],
          ["Because we can run the program and accept if it terminates", true, "That machine accepts exactly the terminating programs, and runs forever on the others: a recognizer."],
          ["Because every program terminates eventually", false, "Many programs never terminate."],
        ],
      },
      {
        q: "If $L$ and its complement $\\overline{L}$ are both recognizable, then...",
        options: [
          ["$L$ is decidable", true, "Run both recognizers in alternation; exactly one of them eventually accepts (Theorem 2.2)."],
          ["$L$ is regular", false, "Decidable languages can be far more complex than regular ones."],
          ["Nothing follows", false, "This is exactly the characterisation of decidability."],
          ["$L$ is undecidable", false, "The opposite: it is decidable."],
        ],
      },
    ],

    sublanguage: [
      {
        q: "An analysis accepts a method if it has no loops, no recursion and no calls, claiming it terminates. Which is true?",
        options: [
          ["It is sound but not complete for termination", true, "Everything accepted is straight-line code and terminates (sound), but terminating loops like <code>sumTo</code> are rejected (incomplete)."],
          ["It is complete but not sound", false, "It accepts only terminating methods, so it is sound; it misses terminating methods with loops."],
          ["It is both sound and complete", false, "Impossible for an undecidable property (Theorem 2.3), and here it clearly misses <code>sumTo</code>."],
          ["It is neither", false, "It never accepts a non-terminating method, so it is sound."],
        ],
      },
      {
        q: "Complete, written with the accepted language $L_{SA}$:",
        options: [
          ["$L_{SA} \\subseteq L$", false, "That inclusion is soundness."],
          ["$L \\subseteq L_{SA}$", true, "Every program with the property is accepted."],
          ["$L_{SA} = \\emptyset$", false, "That is the trivially sound analysis."],
        ],
      },
      {
        q: "Why can no always-terminating analysis be both sound and complete for $L_{\\mathit{halt}}$?",
        options: [
          ["It would then be a decider for $L_{\\mathit{halt}}$, which is undecidable", true, "Sound and complete means $L_{SA} = L_{\\mathit{halt}}$, and the analysis decides $L_{SA}$."],
          ["Because analyses are written in Python", false, "The language of the analysis is irrelevant."],
          ["Because $L_{\\mathit{halt}}$ is finite", false, "It is infinite; and finite languages are decidable."],
        ],
      },
    ],

    grammar: [
      {
        q: "In $G = (N, \\Sigma, \\to, S)$, what is $N$?",
        options: [
          ["The set of non-terminals (placeholders)", true, "$\\Sigma$ holds the symbols of the words, $N$ the placeholders, $S \\in N$ the start."],
          ["The natural numbers", false, "Here $N$ names the non-terminals, not $\\N$."],
          ["The set of words", false, "The words are what the grammar generates, $L_G$."],
        ],
      },
      {
        q: "When is a string a word of $L_G$?",
        options: [
          ["When it can be derived from $S$ and contains no non-terminals", true, "$L_G = \\{ w \\in \\Sigma^* \\mid S \\to^* w \\}$."],
          ["When it can be derived from $S$, possibly with non-terminals left", false, "Strings with non-terminals are sentential forms, not words."],
          ["When it uses every rule at least once", false, "There is no such requirement."],
        ],
      },
      {
        q: "Why is \"generate all words and check if $w$ is among them\" only a recognizer?",
        options: [
          ["Because generation may never produce $w$ and never finish either", true, "If $w \\notin L_G$ the enumeration of an infinite language goes on forever."],
          ["Because grammars are ambiguous", false, "Ambiguity is unrelated."],
          ["Because it might produce $w$ twice", false, "Duplicates do not matter; accepting the first time is fine."],
        ],
      },
    ],

    derivation: [
      {
        q: "With $S \\to^1 (SX)$, $S \\to^2 a$, $X \\to^3 b$, how many rule applications does $((ab)b)$ need?",
        options: [
          ["3", false, "Count: two uses of rule 1, one of rule 2 and two of rule 3."],
          ["5", true, "$S \\to^1 (SX) \\to^3 (Sb) \\to^1 ((SX)b) \\to^2 ((aX)b) \\to^3 ((ab)b)$."],
          ["4", false, "Each $X$ needs its own rule 3 step, and there are two $X$s."],
        ],
      },
      {
        q: "Which word is in this grammar's language?",
        options: [
          ["$(ab)(ab)$", false, "The rules never place two bracket groups side by side."],
          ["$(((ab)b)b)$", true, "Three wrappings $(S\\,b)$ around $a$."],
          ["$((ab)a)$", false, "The second position inside a bracket is always an $X$, which only becomes $b$."],
          ["$ab$", false, "Without rule 1 there is no $b$; with it there are brackets."],
        ],
      },
      {
        q: "What do LaTeX and the C preprocessor have in common with this example?",
        options: [
          ["They expand macros by rewriting text until nothing is left to expand", true, "Macro expansion is a rewriting system, like applying production rules."],
          ["They are regular languages", false, "Macro systems are far more powerful than regular languages."],
          ["They cannot nest", false, "Macros can expand into other macros, which is exactly nesting."],
        ],
      },
    ],

    chomsky: [
      {
        q: "Which machine recognises context-free languages?",
        options: [
          ["Finite automaton", false, "That handles regular (type 3) languages only."],
          ["Pushdown automaton", true, "A finite automaton plus a stack, enough for nesting."],
          ["Linear bounded automaton", false, "That is the machine for context-sensitive (type 1) languages."],
          ["Nothing, they are undecidable", false, "Context-free membership is decidable, in $O(n^3)$."],
        ],
      },
      {
        q: "Checking that every used variable is declared in an enclosing scope is...",
        options: [
          ["regular", false, "Scopes nest, so not even context-free would do."],
          ["context-free", false, "Matching a later use with an earlier declaration is copy-language-like, beyond context-free."],
          ["context-sensitive", true, "The rewriting of a use depends on its context (the declarations around it); this is the course's type 1 example."],
          ["undecidable", false, "Scope checking is decidable (compilers do it quickly)."],
        ],
      },
      {
        q: "Which inclusion chain is correct?",
        options: [
          ["$\\mathsf{REG} \\subsetneq \\mathsf{CFL} \\subsetneq \\mathsf{CSL} \\subsetneq \\mathsf{RE}$", true, "Each type strictly contains the previous one; e.g. $a^nb^n$ is context-free but not regular."],
          ["$\\mathsf{RE} \\subsetneq \\mathsf{CSL} \\subsetneq \\mathsf{CFL} \\subsetneq \\mathsf{REG}$", false, "Reversed: type 0 is the largest class."],
          ["$\\mathsf{REG} = \\mathsf{CFL}$", false, "$\\{a^n b^n\\}$ separates them."],
        ],
      },
    ],

    regex: [
      {
        q: "What is $\\sem{(a + b)c}$?",
        options: [
          ["$\\{ac, bc\\}$", true, "Concatenate each word of $\\{a, b\\}$ with each word of $\\{c\\}$."],
          ["$\\{a, bc\\}$", false, "The parentheses make the alternative apply before the concatenation."],
          ["$\\{abc\\}$", false, "$+$ is an alternative, not concatenation."],
          ["$\\{a, b, c\\}$", false, "Concatenation glues words; it does not union them."],
        ],
      },
      {
        q: "Why is $\\sem{e^*}$ defined as the <em>least</em> solution of $X = \\{\\epsilon\\} \\cup \\sem{e} X$?",
        options: [
          ["Because larger solutions may contain junk words that are not finite repetitions of $e$", true, "For example $\\Sigma^*$ solves $X = \\{\\epsilon\\} \\cup \\{a\\}X$ over $\\{a, b\\}$, but $b \\notin \\sem{a^*}$. The least solution is $\\bigcup_n \\sem{e}^n$."],
          ["Because the equation has only one solution", false, "It can have several; that is why we must pick one."],
          ["Because the greatest solution is empty", false, "The empty set is not even a solution (it lacks $\\epsilon$)."],
        ],
      },
      {
        q: "Which practical regex feature is <em>not</em> regular in the formal sense?",
        options: [
          ["Character classes like <code>[a-z]</code>", false, "That is just an alternative of 26 symbols."],
          ["One-or-more <code>e+</code>", false, "$e^+ = ee^*$, still regular."],
          ["Back-references like <code>(a*)b\\1</code>", true, "\"The same text as group 1 again\" describes $\\{a^nba^n\\}$, which is not regular."],
          ["Anchors <code>^</code> and <code>$</code>", false, "Anchors only restrict where matching starts or ends."],
        ],
      },
      {
        q: "Kleene's theorem says regular expressions describe exactly the languages of...",
        options: [
          ["finite automata (and type 3 grammars)", true, "Regex, finite automata and right-linear grammars are three views of the same class."],
          ["pushdown automata", false, "Those describe context-free languages, a larger class."],
          ["Turing machines", false, "Those describe recursively enumerable languages."],
        ],
      },
    ],

    "regex-practice": [
      {
        q: "In the method id regex, why write <code>\\.</code> instead of <code>.</code>?",
        options: [
          ["Because <code>.</code> matches any character, so the regex would also accept other separators", true, "An unescaped dot matches <code>X</code> too, so <code>jpambXcasesXSimple</code> would pass."],
          ["Because Python does not support <code>.</code>", false, "It does: it means \"any character\"."],
          ["It makes no difference", false, "It does; try the lab's broken-dots preset."],
        ],
      },
      {
        q: "The notes' body-extraction regex <code>public\\W+static\\W+(?P&lt;retype&gt;void)\\W+(?P&lt;mname&gt;\\w*)()\\W*{(?P&lt;code&gt;[^}]*)}</code> finds which methods of <code>Simple.java</code>?",
        options: [
          ["All of them", false, "Try it in the lab: it misses most."],
          ["Only <code>public static void</code> methods without parameters, with a body without nested braces", true, "<code>()</code> is an empty group, not literal parentheses, and <code>\\W*</code> cannot skip a parameter name; <code>[^}]*</code> stops at the first <code>}</code>."],
          ["Only methods that return <code>int</code>", false, "It hard-codes <code>void</code>."],
          ["Every method containing <code>void</code> anywhere", false, "It needs <code>public</code>, <code>static</code> and <code>void</code> in that order right before the name."],
        ],
      },
      {
        q: "Python's <code>re.match(r\"[\\w.]+\\.(\\w+)\", \"jpamb.cases.Simple.foo:()V\").group(1)</code> returns...",
        options: [
          ["<code>\"cases\"</code>", false, "That would need a lazy <code>+?</code>; the greedy <code>+</code> takes as much as possible."],
          ["<code>\"foo\"</code>", true, "Greedy <code>[\\w.]+</code> first eats everything up to <code>:</code>, then backtracks to the last dot so that <code>\\.(\\w+)</code> can still match."],
          ["<code>\"Simple\"</code>", false, "Backtracking stops at the first position that works, which is the last dot."],
        ],
      },
    ],

    nesting: [
      {
        q: "Which language is <em>not</em> regular?",
        options: [
          ["Strings of parentheses of depth at most 3", false, "Bounded depth is regular: $R_3$ describes it."],
          ["$\\{ \\texttt{(}^n \\texttt{)}^n \\mid n \\geq 0 \\}$", true, "Pumping a block of opening brackets breaks the balance (Proposition 2.10)."],
          ["All strings over $\\{(, )\\}$", false, "That is $\\Sigma^*$, trivially regular."],
          ["Strings with an even number of parentheses", false, "A two-state automaton tracks the parity."],
        ],
      },
      {
        q: "In the proof that $\\texttt{(}^n \\texttt{)}^n$ is not regular, why does $y$ consist only of <code>(</code>?",
        options: [
          ["Because $|xy| \\leq p$ and the first $p$ symbols of $\\texttt{(}^p \\texttt{)}^p$ are all <code>(</code>", true, "So pumping adds opening brackets only, breaking the balance."],
          ["Because $|y| \\geq 1$", false, "That only says $y$ is not empty."],
          ["Because we choose $y$", false, "The lemma gives us the split; we must handle every possible split. The length bound is what pins $y$ down."],
        ],
      },
      {
        q: "Why does extracting a method body with <code>{([^}]*)}</code> break on an <code>if</code> block?",
        options: [
          ["Because <code>[^}]*</code> stops at the first <code>}</code>, which closes the <code>if</code> block, not the method", true, "Blocks nest; finding the matching brace needs counting, which a regex cannot do for unbounded depth."],
          ["Because <code>if</code> is a keyword", false, "Keywords are irrelevant to the regex."],
          ["Because regexes cannot match newlines", false, "<code>[^}]</code> matches newlines just fine."],
        ],
      },
      {
        q: "What extra power does a pushdown automaton have over a finite automaton?",
        options: [
          ["A stack of unbounded size", true, "With a stack (even a counter) it can remember how many brackets are open."],
          ["The ability to read backwards", false, "Both read the input left to right."],
          ["More states", false, "Any fixed finite number of states is still finite; the stack is the difference."],
        ],
      },
    ],

    bnf: [
      {
        q: "Why is $E ::= E + E \\mid E * E \\mid n$ problematic?",
        options: [
          ["It is ambiguous: <code>1 + 2 * 3</code> has two parse trees", true, "One tree computes 9, the other 7. Layered grammars or precedence declarations fix it."],
          ["It cannot generate <code>1 + 2</code>", false, "It can: $E \\to E + E \\to n + n$."],
          ["It is not context-free", false, "Every rule has one non-terminal on the left, so it is context-free."],
        ],
      },
      {
        q: "What does first-match (ordered choice) semantics buy a parser?",
        options: [
          ["At most one parse per input, which (with deterministic grammars) enables linear-time parsing", true, "Committing to the first alternative that works removes ambiguity; deterministic context-free languages parse in $O(n)$."],
          ["The ability to parse context-sensitive languages", false, "It does not add expressive power of that kind."],
          ["Error messages in any language", false, "Unrelated."],
        ],
      },
      {
        q: "In $E ::= E + T \\mid T$, which property of <code>+</code> does the left recursion encode?",
        options: [
          ["Left associativity: <code>1 + 2 + 3</code> is <code>(1 + 2) + 3</code>", true, "The left operand of the topmost + is itself an E containing the earlier +."],
          ["Right associativity", false, "That would be $E ::= T + E \\mid T$."],
          ["That + binds tighter than *", false, "Precedence comes from the layering (T below E), not the recursion side."],
        ],
      },
    ],

    treesitter: [
      {
        q: "In the tree-sitter grammar, what does <code>prec.left</code> on <code>app</code> mean?",
        options: [
          ["<code>a b c</code> parses as <code>(a b) c</code>", true, "Left associativity: application groups from the left, as usual in the lambda calculus."],
          ["<code>a b c</code> parses as <code>a (b c)</code>", false, "That is right associativity."],
          ["Application has lower precedence than variables", false, "<code>prec.left</code> is about grouping of repeated applications."],
        ],
      },
      {
        q: "What does <code>(binary_expression operator: \"/\") @divide</code> do?",
        options: [
          ["It captures, as <code>@divide</code>, every binary expression whose operator field is the token <code>/</code>", true, "The pattern is tried at every node; each match produces a capture map."],
          ["It replaces divisions by zero", false, "Queries only find; they do not rewrite."],
          ["It only matches the first division in the file", false, "All matches are reported."],
          ["It matches divisions by zero only", false, "It matches any division; checking the right operand needs an extra child pattern and predicate."],
        ],
      },
      {
        q: "The notes' grammar has <code>_parens: $ => choice(\"(\", $._exp, \")\")</code>. What is wrong?",
        options: [
          ["<code>choice</code> means \"one of\", so a lone <code>(</code> would be an expression; it should be <code>seq</code>", true, "<code>seq(\"(\", $._exp, \")\")</code> requires all three in order."],
          ["Nothing", false, "As written it accepts a single parenthesis as an expression."],
          ["Parentheses must be named <code>parens</code> without underscore", false, "The underscore only hides the node from the tree; that part is fine."],
        ],
      },
    ],

    context: [
      {
        q: "Analysing <code>assertFalse</code>, a query for <code>/</code> run over the whole class reports a division. Why is this a false alarm?",
        options: [
          ["The match is in <code>divideByZero</code>, another method", true, "Without restricting the search to <code>assertFalse</code>'s body, matches anywhere in the file count."],
          ["Because <code>assert false</code> divides by zero", false, "It throws an assertion error, not a division by zero."],
          ["Because tree-sitter cannot parse <code>assert</code>", false, "It parses it fine."],
        ],
      },
      {
        q: "How does the notes' tree-sitter code avoid the problem?",
        options: [
          ["It runs the divide query only on the method's <code>body</code> node: <code>captures(body)</code>", true, "First find the method, then search only its subtree."],
          ["It deletes the other methods from the file", false, "That works but is not what the notes' code does."],
          ["It uses a regex instead", false, "A regex has the same problem, and nesting problems too."],
        ],
      },
      {
        q: "Why can a single fixed-shape pattern like <code>(method_declaration body: (block (return_statement (binary_expression operator: \"/\"))))</code> miss divisions?",
        options: [
          ["It only looks a fixed number of levels deep, so a division inside an <code>if</code> block is not found", true, "Patterns describe a fixed shape; nested blocks can push the division arbitrarily deep (Proposition 2.12)."],
          ["It is ambiguous", false, "Patterns are not grammars; ambiguity is not the issue."],
          ["It matches too much", false, "It matches too little."],
        ],
      },
    ],

    folds: [
      {
        q: "What does an algebra $\\varphi$ for a fold receive at a <code>Bin</code> node?",
        options: [
          ["The operator and the already computed results for the two children", true, "$h(\\mathtt{Bin}(op, l, r)) = \\varphi(\\mathtt{Bin}(op, h(l), h(r)))$: children first."],
          ["The two child subtrees, unevaluated", false, "That would be a different scheme (a paramorphism); a catamorphism hands over results."],
          ["Only the operator", false, "It also gets the children's results."],
        ],
      },
      {
        q: "Which algebra computes the depth of an expression tree?",
        options: [
          ["$\\mathtt{Num} \\mapsto 1$, $\\mathtt{Var} \\mapsto 1$, $\\mathtt{Bin}(op, l, r) \\mapsto 1 + \\max(l, r)$", true, "Leaves have depth 1; a node is one deeper than its deepest child."],
          ["$\\mathtt{Bin}(op, l, r) \\mapsto 1 + l + r$", false, "That counts nodes (the size)."],
          ["$\\mathtt{Bin}(op, l, r) \\mapsto \\max(l, r)$", false, "Without the $+1$ every tree would have depth 1."],
        ],
      },
      {
        q: "For lists, $F_X(A) = 1 + X \\times A$. What is the corresponding catamorphism?",
        options: [
          ["<code>foldr</code>", true, "The algebra is a value for the empty list (the $1$) and a function combining an element with the folded rest."],
          ["<code>map</code>", false, "<code>map</code> can be written as a fold, but it is not the general catamorphism."],
          ["<code>filter</code>", false, "Also expressible as a fold, but not the definition."],
        ],
      },
    ],

    traversal: [
      {
        q: "For the tree <code>+(1, *(2, 3))</code>, what is the post-order?",
        options: [
          ["<code>+ 1 * 2 3</code>", false, "That is pre-order (Polish notation)."],
          ["<code>1 2 3 * +</code>", true, "Children before the node: reverse Polish notation, exactly the order a stack machine (like the JVM) computes in."],
          ["<code>1 + 2 * 3</code>", false, "That is in-order."],
        ],
      },
      {
        q: "In the notes' cursor traversal, what does the first <code>yield</code> produce?",
        options: [
          ["Pre-order", true, "A node is yielded the first time the cursor arrives at it, before its children."],
          ["Post-order", false, "Its children have not been visited yet at that point."],
          ["In-order", false, "In-order only makes sense for binary trees, and here the node comes before all children."],
        ],
      },
      {
        q: "And the second <code>yield</code> (after <code>goto_parent</code>)?",
        options: [
          ["A complete post-order", false, "It yields <code>node</code>, which was read before climbing: the child being left. Only the last child of each parent is yielded, and the root never is."],
          ["Only the last child of each parent, so not a full post-order", true, "To get the post-order, yield every node when its subtree is finished (see the fixed version in the lab)."],
          ["Nothing, it is unreachable", false, "It is reached every time the cursor climbs."],
        ],
      },
    ],

    bespoke: [
      {
        q: "When do you write a bespoke syntactic analysis?",
        options: [
          ["When the pattern needs context beyond what regexes and fixed tree patterns can express (scopes, declarations, cross-references)", true, "Then you traverse the tree yourself and keep whatever bookkeeping you need."],
          ["Never, tree-sitter queries can express everything", false, "They describe fixed shapes and cannot keep symbol tables."],
          ["Only for regular languages", false, "Regular patterns are exactly the case where ready-made tools suffice."],
        ],
      },
      {
        q: "Why do LLMs, in theory, only recognise regular languages?",
        options: [
          ["Their input window is bounded, and every finite language is regular", true, "A function of inputs of bounded size is a finite object. The bound says little in practice, where they recognise common patterns well."],
          ["Because they are trained on regular expressions", false, "Training data is irrelevant to this argument."],
          ["Because they cannot count", false, "The theoretical argument is about the bounded window."],
        ],
      },
      {
        q: "An ESLint rule visiting <code>BinaryExpression</code> nodes is a...",
        options: [
          ["syntactic analysis on the AST", true, "It inspects the shape of the JavaScript AST and reports matching nodes."],
          ["dynamic analysis", false, "It never runs the code."],
          ["semantic analysis of all traces", false, "It does not reason about executions."],
        ],
      },
    ],

    "java-language": [
      {
        q: "The token level of Java (identifiers, literals, keywords) is...",
        options: [
          ["regular", true, "Each token kind is described by a regular expression; the lexer is a finite automaton."],
          ["context-free but not regular", false, "Tokens do not nest."],
          ["undecidable", false, "Lexing is a linear scan."],
        ],
      },
      {
        q: "Which set of Java programs is not context-free?",
        options: [
          ["The programs the parser accepts", false, "The JLS grammar is context-free."],
          ["The programs that compile (declare before use, types agree)", true, "Matching uses with declarations is copy-language-like, beyond context-free."],
          ["The token sequences", false, "Those are regular."],
        ],
      },
      {
        q: "What did Grigore (2017) show about Java generics?",
        options: [
          ["Subtyping with wildcards is Turing complete, hence undecidable", true, "So no type checker can always be correct and always terminate; well-typed programs are recognizable but not decidable."],
          ["Generics make Java a regular language", false, "Quite the opposite."],
          ["Generics are erased, so they do not matter", false, "Erasure is about run time; type checking happens before and is affected."],
        ],
      },
    ],
  };

  /* =====================================================================
     Shared helpers: tree drawing
     ===================================================================== */
  /* node: { label, kind: "nt"|"tok"|"op"|"paren"|"leaf", cls, ann, children } */
  function treeSVG(root, o) {
    o = Object.assign({ gap: 12, levelH: 56, charW: 7.6, nodeH: 26, pad: 10 }, o || {});
    let maxD = 0, anyAnn = false;
    function measure(n, d) {
      n._d = d; maxD = Math.max(maxD, d);
      n._w = Math.max(30, String(n.label).length * o.charW + 16);
      const ch = n.children || [];
      ch.forEach((c) => measure(c, d + 1));
      const cw = ch.reduce((s, c) => s + c._sw, 0) + Math.max(0, ch.length - 1) * o.gap;
      n._sw = Math.max(n._w, cw);
      if (n.ann != null && n.ann !== "") { anyAnn = true; n._sw = Math.max(n._sw, String(n.ann).length * 7 + 10); }
    }
    function place(n, left) {
      const ch = n.children || [];
      const cw = ch.reduce((s, c) => s + c._sw, 0) + Math.max(0, ch.length - 1) * o.gap;
      let x = left + (n._sw - cw) / 2;
      ch.forEach((c) => { place(c, x); x += c._sw + o.gap; });
      n._x = ch.length ? (ch[0]._x + ch[ch.length - 1]._x) / 2 : left + n._sw / 2;
    }
    measure(root, 0);
    place(root, o.pad);
    if (anyAnn) o.levelH += 14;
    const W = root._sw + 2 * o.pad;
    const annH = anyAnn ? 16 : 0;
    const H = (maxD + 1) * o.levelH + annH;
    const edges = [], nodes = [];
    (function walk(n) {
      const y = n._d * o.levelH + o.nodeH / 2 + 6;
      (n.children || []).forEach((c) => {
        const cy = c._d * o.levelH + o.nodeH / 2 + 6;
        edges.push('<line class="edge" x1="' + n._x + '" y1="' + (y + o.nodeH / 2 + (n.ann != null && n.ann !== "" ? 16 : 0)) + '" x2="' + c._x + '" y2="' + (cy - o.nodeH / 2) + '"/>');
        walk(c);
      });
      nodes.push(
        '<g class="tn ' + (n.kind || "") + " " + (n.cls || "") + '">' +
          '<rect x="' + (n._x - n._w / 2) + '" y="' + (y - o.nodeH / 2) + '" width="' + n._w + '" height="' + o.nodeH + '" rx="7"/>' +
          '<text x="' + n._x + '" y="' + (y + 1) + '">' + esc(n.label) + "</text>" +
          (n.ann != null && n.ann !== "" ? '<text class="ann" x="' + n._x + '" y="' + (y + o.nodeH / 2 + 12) + '">' + esc(n.ann) + "</text>" : "") +
          (n.badge ? '<text class="badge" x="' + (n._x + n._w / 2 + 3) + '" y="' + (y - o.nodeH / 2 - 2) + '">' + esc(n.badge) + "</text>" : "") +
        "</g>"
      );
    })(root);
    return '<svg class="tree" viewBox="0 0 ' + W + " " + (H + 6) + '" width="' + W + '" height="' + (H + 6) + '" role="img" aria-label="' + esc(o.aria || "tree") + '">' + edges.join("") + nodes.join("") + "</svg>";
  }
  function treeBox(title) {
    const wrap = h("div", { class: "tree-wrap" });
    const box = h("div", { class: "panel" }, [title ? h("div", { class: "panel-title", html: title }) : null, wrap]);
    return { box, wrap };
  }

  /* =====================================================================
     Arithmetic: lexer, CST parser, AST, IR, bytecode, folds
     ===================================================================== */
  function lexArith(src) {
    const toks = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { let j = i; while (j < src.length && /\s/.test(src[j])) j++; toks.push({ kind: "WS", text: src.slice(i, j), pos: i }); i = j; continue; }
      if (/[0-9]/.test(c)) { let j = i; while (j < src.length && /[0-9]/.test(src[j])) j++; toks.push({ kind: "INT", text: src.slice(i, j), pos: i }); i = j; continue; }
      if (/[A-Za-z_]/.test(c)) { let j = i; while (j < src.length && /\w/.test(src[j])) j++; toks.push({ kind: "ID", text: src.slice(i, j), pos: i }); i = j; continue; }
      if ("+-*/".includes(c)) { toks.push({ kind: "OP", text: c, pos: i }); i++; continue; }
      if (c === "(") { toks.push({ kind: "LPAREN", text: c, pos: i }); i++; continue; }
      if (c === ")") { toks.push({ kind: "RPAREN", text: c, pos: i }); i++; continue; }
      throw { msg: "unexpected character '" + c + "'", pos: i };
    }
    return toks;
  }
  /* Grammar: E ::= E (+|-) T | T ; T ::= T (*|/) F | F ; F ::= INT | ID | ( E ).  CST nodes keep tokens. */
  function parseArith(src) {
    const toks = lexArith(src).filter((t) => t.kind !== "WS");
    let i = 0;
    const peek = () => toks[i];
    const fail = (m) => { throw { msg: m, pos: peek() ? peek().pos : src.length }; };
    function E() { let l = T(); while (peek() && peek().kind === "OP" && "+-".includes(peek().text)) { const op = toks[i++]; l = { type: "bin", op: op.text, left: l, right: T() }; } return l; }
    function T() { let l = F(); while (peek() && peek().kind === "OP" && "*/".includes(peek().text)) { const op = toks[i++]; l = { type: "bin", op: op.text, left: l, right: F() }; } return l; }
    function F() {
      const t = peek();
      if (!t) fail("unexpected end of input");
      if (t.kind === "INT") { i++; return { type: "num", text: t.text, value: parseInt(t.text, 10) | 0 }; }
      if (t.kind === "ID") { i++; return { type: "var", name: t.text }; }
      if (t.kind === "LPAREN") { i++; const e = E(); if (!peek() || peek().kind !== "RPAREN") fail("expected ')'"); i++; return { type: "paren", inner: e }; }
      fail("unexpected '" + t.text + "'");
    }
    if (!toks.length) throw { msg: "empty expression", pos: 0 };
    const cst = E();
    if (i < toks.length) fail("unexpected '" + peek().text + "'");
    return cst;
  }
  function cstToTree(n) {
    if (n.type === "num") return { label: n.text, kind: "tok" };
    if (n.type === "var") return { label: n.name, kind: "tok" };
    if (n.type === "paren") return { label: "parens", kind: "paren", children: [{ label: "(", kind: "tok" }, cstToTree(n.inner), { label: ")", kind: "tok" }] };
    return { label: "binary", kind: "nt", children: [cstToTree(n.left), { label: n.op, kind: "tok" }, cstToTree(n.right)] };
  }
  function toAst(n) {
    if (n.type === "paren") return toAst(n.inner);
    if (n.type === "num") return { t: "num", v: n.value };
    if (n.type === "var") return { t: "var", x: n.name };
    return { t: "bin", op: n.op, l: toAst(n.left), r: toAst(n.right) };
  }
  function astToTree(a, qualify) {
    if (a.t === "num") return { label: String(a.v), kind: "leaf" };
    if (a.t === "var") return { label: qualify ? "Main." + a.x : a.x, kind: "leaf" };
    return { label: a.op, kind: "op", children: [astToTree(a.l, qualify), astToTree(a.r, qualify)] };
  }
  const javaOp = (op, a, b) => {
    switch (op) {
      case "+": return (a + b) | 0;
      case "-": return (a - b) | 0;
      case "*": return Math.imul(a, b);
      case "/": return b === 0 ? null : (a / b) | 0;
    }
  };
  const PREC = { "+": 1, "-": 1, "*": 2, "/": 2 };
  function showAst(a, qualify, parentPrec, isRight) {
    if (a.t === "num") return String(a.v);
    if (a.t === "var") return qualify ? "Main." + a.x : a.x;
    const p = PREC[a.op];
    const s = showAst(a.l, qualify, p, false) + " " + a.op + " " + showAst(a.r, qualify, p, true);
    const need = parentPrec > p || (parentPrec === p && isRight);
    return need ? "(" + s + ")" : s;
  }
  /* IR: constant folding with re-association of + / - chains and * chains (32-bit Java int arithmetic). */
  function toIR(a, notes) {
    if (a.t !== "bin") return a;
    if (a.op === "+" || a.op === "-") {
      const terms = [];
      (function flat(n, sign) {
        if (n.t === "bin" && (n.op === "+" || n.op === "-")) { flat(n.l, sign); flat(n.r, n.op === "-" ? -sign : sign); }
        else terms.push([sign, toIR(n, notes)]);
      })(a, 1);
      let c = 0, nConst = 0;
      const rest = [];
      terms.forEach(([s, t]) => { if (t.t === "num") { c = s > 0 ? (c + t.v) | 0 : (c - t.v) | 0; nConst++; } else rest.push([s, t]); });
      if (nConst < 2 && !(nConst === 1 && c === 0 && rest.length)) {
        let keep = terms[0][1];
        for (let k = 1; k < terms.length; k++) keep = { t: "bin", op: terms[k][0] > 0 ? "+" : "-", l: keep, r: terms[k][1] };
        return keep;
      }
      notes.push(nConst < 2 ? "dropped a + 0" : rest.length ? "re-associated the sum and folded its constants into " + c : "folded the sum into " + c);
      if (!rest.length) return { t: "num", v: c };
      let out = null;
      const firstPos = rest.findIndex(([s]) => s > 0);
      if (firstPos >= 0) { out = rest[firstPos][1]; rest.splice(firstPos, 1); }
      else { out = { t: "num", v: c }; c = 0; }
      rest.forEach(([s, t]) => { out = { t: "bin", op: s > 0 ? "+" : "-", l: out, r: t }; });
      if (c !== 0) out = { t: "bin", op: c > 0 ? "+" : "-", l: out, r: { t: "num", v: c > 0 ? c : -c } };
      return out;
    }
    if (a.op === "*") {
      const facs = [];
      (function flat(n) { if (n.t === "bin" && n.op === "*") { flat(n.l); flat(n.r); } else facs.push(toIR(n, notes)); })(a);
      let c = 1, nConst = 0;
      const rest = [];
      facs.forEach((f) => { if (f.t === "num") { c = Math.imul(c, f.v); nConst++; } else rest.push(f); });
      if (nConst < 2 && c !== 0 && !(c === 1 && nConst === 1 && rest.length)) {
        let keep = facs[0];
        for (let k = 1; k < facs.length; k++) keep = { t: "bin", op: "*", l: keep, r: facs[k] };
        return keep;
      }
      if (nConst > 1) notes.push(rest.length ? "re-associated the product and folded its constant factors into " + c : "folded the product into " + c);
      if (!rest.length) return { t: "num", v: c };
      if (c === 0) { notes.push("x * 0 = 0 for every int x"); return { t: "num", v: 0 }; }
      let out = rest[0];
      for (let k = 1; k < rest.length; k++) out = { t: "bin", op: "*", l: out, r: rest[k] };
      if (c !== 1) out = { t: "bin", op: "*", l: out, r: { t: "num", v: c } };
      else if (nConst) notes.push("dropped a factor 1");
      return out;
    }
    const l = toIR(a.l, notes), r = toIR(a.r, notes);
    if (l.t === "num" && r.t === "num") {
      const v = javaOp(a.op, l.v, r.v);
      if (v === null) { notes.push("kept " + l.v + " / 0 unfolded: it throws at run time"); return { t: "bin", op: a.op, l, r }; }
      notes.push("folded " + l.v + " " + a.op + " " + r.v + " = " + v);
      return { t: "num", v };
    }
    return { t: "bin", op: a.op, l, r };
  }
  function toBytecode(a, out) {
    if (a.t === "num") out.push("push:I " + a.v);
    else if (a.t === "var") out.push("get static Main." + a.x + ":I");
    else { toBytecode(a.l, out); toBytecode(a.r, out); out.push("binary:I " + { "+": "add", "-": "sub", "*": "mul", "/": "div" }[a.op]); }
    return out;
  }
  function parseErrorHtml(src, e) {
    const pos = e && e.pos != null ? e.pos : 0;
    return "<b>Parse error:</b> " + esc(e.msg || String(e)) + '<pre class="no-math" style="margin:6px 0 0"><code>' + esc(src) + "\n" + " ".repeat(pos) + "^</code></pre>";
  }

  /* =====================================================================
     LAB 1: levels of syntax
     ===================================================================== */
  function labLevels(el) {
    const { controls, view } = PA.lab(el, {
      title: "One expression, seven levels",
      hint: "Type an arithmetic expression (integers, variables, + - * /, parentheses). Watch what survives at each level: white-space dies in the lexer, parentheses in the AST, the developer's exact arithmetic in the IR.",
    });
    const preset = PA.select(controls, {
      label: "Examples from the notes",
      options: [["10 + (5 + 3)", "10 + (5 + 3)"], ["10 + 3 * 5", "10 + 3 * 5"], ["(( 10 ))", "(( 10 ))"], ["x + 2 + 4", "x + 2 + 4"], ["2 * (x + 1) - 4 / 2", "2 * (x + 1) - 4 / 2"], ["x / (3 - 3)", "x / (3 - 3)"]],
      value: "10 + (5 + 3)",
    });
    const input = PA.textInput(controls, { label: "Expression", value: "10 + (5 + 3)" });
    const err = h("div", { class: "verdict bad", hidden: true });
    const bits = h("div", { class: "lv-bits no-math" });
    const text = h("div", { class: "lv-text no-math" });
    const toks = h("div", { class: "tok-row no-math" });
    const cst = treeBox("CST: every token, parentheses kept");
    const ast = treeBox("AST: only what matters for the meaning");
    const ir = h("div", { class: "no-math" });
    const bc = h("div", { class: "no-math" });
    const panel = (t, c) => h("div", { class: "panel" }, [h("div", { class: "panel-title", html: t }), c]);
    view.append(err,
      h("div", { class: "split" }, [panel("1 · Bits (UTF-8 bytes, hex)", bits), panel("2 · Text (· marks a space)", text)]),
      panel("3 · Tokens", toks),
      h("div", { class: "split" }, [cst.box, ast.box]),
      h("div", { class: "split" }, [panel("6 · IR (names qualified, constants folded)", ir), panel("7 · Bytecode (from the IR)", bc)]));
    cst.box.querySelector(".panel-title").innerHTML = "4 · CST: every token, parentheses kept";
    ast.box.querySelector(".panel-title").innerHTML = "5 · AST: only what matters for the meaning";

    function update() {
      const src = input.value;
      const bytes = Array.from(new TextEncoder().encode(src));
      bits.textContent = bytes.length ? bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ") : "(no bytes)";
      bits.append(h("div", { class: "lv-note", text: bytes.length + " bytes" }));
      text.innerHTML = '<span class="lv-chars">' + esc(src.replace(/ /g, "\u00b7")) + '</span><div class="lv-note">' + src.length + " characters, " + (src.match(/\s/g) || []).length + " white-space</div>";
      let lexed;
      try { lexed = lexArith(src); } catch (e) { err.hidden = false; err.innerHTML = parseErrorHtml(src, e); return; }
      toks.innerHTML = lexed.filter((t) => t.kind !== "WS").map((t) => '<span class="tok"><b>' + t.kind + "</b>" + (t.kind === "INT" || t.kind === "ID" ? "(" + esc(t.text) + ")" : " " + esc(t.text)) + "</span>").join("") || '<span class="lv-note">no tokens</span>';
      let c;
      try { c = parseArith(src); } catch (e) {
        err.hidden = false; err.innerHTML = parseErrorHtml(src, e);
        cst.wrap.innerHTML = ""; ast.wrap.innerHTML = ""; ir.innerHTML = ""; bc.innerHTML = "";
        return;
      }
      err.hidden = true;
      cst.wrap.innerHTML = treeSVG(cstToTree(c), { aria: "concrete syntax tree" });
      const a = toAst(c);
      ast.wrap.innerHTML = treeSVG(astToTree(a), { aria: "abstract syntax tree" });
      const notes = [];
      const r = toIR(a, notes);
      ir.innerHTML = '<div class="lv-ir">' + esc(showAst(r, true, 0, false)) + "</div>" +
        (notes.length ? "<ul class=\"lv-notes\">" + notes.map((n) => "<li>" + esc(n) + "</li>").join("") + "</ul>" : '<div class="lv-note">nothing to fold</div>');
      const code = toBytecode(r, []);
      bc.innerHTML = '<ol class="lv-bc">' + code.map((s) => "<li>" + esc(s) + "</li>").join("") + "</ol>";
    }
    preset.onchange = () => input.set(preset.value);
    input.onchange = update;
    update();
  }

  /* =====================================================================
     LAB 2: && / || linter at CST level
     ===================================================================== */
  function lexBool(src) {
    const toks = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (src.startsWith("&&", i)) { toks.push({ k: "&&", pos: i }); i += 2; continue; }
      if (src.startsWith("||", i)) { toks.push({ k: "||", pos: i }); i += 2; continue; }
      if (c === "!" || c === "(" || c === ")") { toks.push({ k: c, pos: i }); i++; continue; }
      if (/[A-Za-z_]/.test(c)) { let j = i; while (j < src.length && /\w/.test(src[j])) j++; toks.push({ k: "id", v: src.slice(i, j), pos: i }); i = j; continue; }
      throw { msg: "unexpected character '" + c + "'", pos: i };
    }
    return toks;
  }
  function parseBool(src) {
    const t = lexBool(src);
    let i = 0;
    const fail = (m) => { throw { msg: m, pos: t[i] ? t[i].pos : src.length }; };
    function or() { let l = and(); while (t[i] && t[i].k === "||") { i++; l = { type: "bin", op: "||", left: l, right: and() }; } return l; }
    function and() { let l = not(); while (t[i] && t[i].k === "&&") { i++; l = { type: "bin", op: "&&", left: l, right: not() }; } return l; }
    function not() { if (t[i] && t[i].k === "!") { i++; return { type: "not", e: not() }; } return atom(); }
    function atom() {
      const x = t[i];
      if (!x) fail("unexpected end of input");
      if (x.k === "id") { i++; return { type: "id", name: x.v }; }
      if (x.k === "(") { i++; const e = or(); if (!t[i] || t[i].k !== ")") fail("expected ')'"); i++; return { type: "paren", inner: e }; }
      fail("unexpected '" + x.k + "'");
    }
    if (!t.length) throw { msg: "empty expression", pos: 0 };
    const r = or();
    if (i < t.length) fail("unexpected '" + t[i].k + "'");
    return r;
  }
  function boolCstTree(n, warnSet) {
    if (n.type === "id") return { label: n.name, kind: "tok" };
    if (n.type === "paren") return { label: "parens", kind: "paren", children: [{ label: "(", kind: "tok" }, boolCstTree(n.inner, warnSet), { label: ")", kind: "tok" }] };
    if (n.type === "not") return { label: "not", kind: "nt", children: [{ label: "!", kind: "tok" }, boolCstTree(n.e, warnSet)] };
    return { label: "binary", kind: "nt", cls: warnSet.has(n) ? "hl" : "", children: [boolCstTree(n.left, warnSet), { label: n.op, kind: "tok", cls: warnSet.has(n) ? "hl" : "" }, boolCstTree(n.right, warnSet)] };
  }
  const boolAst = (n) => (n.type === "paren" ? boolAst(n.inner) : n.type === "id" ? { t: "id", x: n.name } : n.type === "not" ? { t: "not", e: boolAst(n.e) } : { t: "bin", op: n.op, l: boolAst(n.left), r: boolAst(n.right) });
  const boolAstTree = (a) => (a.t === "id" ? { label: a.x, kind: "leaf" } : a.t === "not" ? { label: "!", kind: "op", children: [boolAstTree(a.e)] } : { label: a.op, kind: "op", children: [boolAstTree(a.l), boolAstTree(a.r)] });
  const boolKey = (a) => (a.t === "id" ? a.x : a.t === "not" ? "(! " + boolKey(a.e) + ")" : "(" + a.op + " " + boolKey(a.l) + " " + boolKey(a.r) + ")");
  function boolExplicit(a, parent) { // print with parentheses around every && that sits under ||
    if (a.t === "id") return a.x;
    if (a.t === "not") return "!" + (a.e.t === "bin" ? "(" + boolExplicit(a.e, null) + ")" : boolExplicit(a.e, "!"));
    const s = boolExplicit(a.l, a.op) + " " + a.op + " " + boolExplicit(a.r, a.op);
    if (parent === "||" && a.op === "&&") return "(" + s + ")";
    if (parent === "&&" && a.op === "||") return "(" + s + ")";
    return s;
  }
  function labAndOr(el) {
    const { controls, view } = PA.lab(el, {
      title: "A CST-level linter for <code>&amp;&amp;</code> and <code>||</code>",
      hint: "The lint fires when an && node is a direct child of an || node in the CST. Parentheses insert a parens node in between, so the explicit version is fine. The AST cannot tell the two apart.",
    });
    const preset = PA.select(controls, {
      label: "Examples",
      options: [["a && b || c", "a && b || c"], ["(a && b) || c", "(a && b) || c"], ["a && (b || c)", "a && (b || c)"], ["a || b && c", "a || b && c"], ["!a || b && c || d", "!a || b && c || d"], ["a || (b && c)", "a || (b && c)"]],
      value: "a && b || c",
    });
    const input = PA.textInput(controls, { label: "Boolean expression", value: "a && b || c" });
    const verdict = h("div", { class: "verdict" });
    const cst = treeBox("CST of your input");
    const ast = treeBox("AST of your input");
    const twin = h("div", { class: "verdict" });
    view.append(verdict, h("div", { class: "split" }, [cst.box, ast.box]), twin);
    function update() {
      let c;
      try { c = parseBool(input.value); } catch (e) {
        verdict.className = "verdict bad"; verdict.innerHTML = parseErrorHtml(input.value, e);
        cst.wrap.innerHTML = ast.wrap.innerHTML = ""; twin.innerHTML = ""; return;
      }
      const warn = new Set();
      (function walk(n) {
        if (n.type === "bin") {
          if (n.op === "||") [n.left, n.right].forEach((k) => { if (k.type === "bin" && k.op === "&&") warn.add(k); });
          walk(n.left); walk(n.right);
        } else if (n.type === "paren") walk(n.inner);
        else if (n.type === "not") walk(n.e);
      })(c);
      cst.wrap.innerHTML = treeSVG(boolCstTree(c, warn), { aria: "CST" });
      const a = boolAst(c);
      ast.wrap.innerHTML = treeSVG(boolAstTree(a), { aria: "AST" });
      verdict.className = "verdict " + (warn.size ? "warn" : "good");
      verdict.innerHTML = warn.size
        ? "<b>Warning:</b> " + warn.size + " <code>&amp;&amp;</code> node" + (warn.size > 1 ? "s sit" : " sits") + " directly under <code>||</code> (highlighted). Java reads it with <code>&amp;&amp;</code> first; write the parentheses to make that explicit."
        : "<b>No warning.</b> No <code>&amp;&amp;</code> is a direct child of <code>||</code> in the CST.";
      const ex = boolExplicit(a, null);
      let same = false;
      try { same = boolKey(boolAst(parseBool(ex))) === boolKey(a); } catch (e) { same = false; }
      twin.className = "verdict";
      twin.innerHTML = ex.replace(/\s+/g, "") === input.value.replace(/\s+/g, "")
        ? "Your input already spells out every grouping."
        : "Explicit version: <code>" + esc(ex) + "</code>. Its AST is " + (same ? "<b>identical</b> to yours" : "different") + ", so an AST-level lint could not tell the two apart; only the CST can.";
    }
    preset.onchange = () => input.set(preset.value);
    input.onchange = update;
    update();
  }

  /* =====================================================================
     LAB 3: derivations in S -> (SX) | a, X -> b
     ===================================================================== */
  const GRAMMAR = [
    { n: 1, lhs: "S", rhs: ["(", "S", "X", ")"] },
    { n: 2, lhs: "S", rhs: ["a"] },
    { n: 3, lhs: "X", rhs: ["b"] },
  ];
  const isNT = (s) => s === "S" || s === "X";
  const derivMemo = new Map();
  function canDerive(form, target) {
    const key = form + "|" + target;
    if (derivMemo.has(key)) return derivMemo.get(key);
    let res;
    if (form.length > target.length) res = false;
    else {
      const first = [...form].findIndex(isNT);
      if (first < 0) res = form === target;
      else {
        let last = form.length - 1;
        while (!isNT(form[last])) last--;
        const pre = form.slice(0, first), suf = form.slice(last + 1);
        if (!target.startsWith(pre) || !target.endsWith(suf) || pre.length + suf.length > target.length) res = false;
        else res = GRAMMAR.filter((r) => r.lhs === form[first]).some((r) => canDerive(form.slice(0, first) + r.rhs.join("") + form.slice(first + 1), target));
      }
    }
    derivMemo.set(key, res);
    return res;
  }
  function labDerive(el) {
    const { controls, view } = PA.lab(el, {
      title: "Derive a word by hand",
      hint: "Click a non-terminal in the current string to select it (the leftmost is selected by default), then click a rule. Reach the target with no non-terminals left. The lab tells you when the target has become unreachable.",
    });
    const target = PA.select(controls, {
      label: "Target word",
      options: [["((ab)b)", "((ab)b)"], ["(ab)", "(ab)"], ["a", "a"], ["(((ab)b)b)", "(((ab)b)b)"], ["((ab)a)", "((ab)a) (is it in L?)"], ["(ab)(ab)", "(ab)(ab) (is it in L?)"]],
      value: "((ab)b)",
    });
    const rulesBox = PA.group(controls, "Rules");
    const ruleBtns = GRAMMAR.map((r) => PA.button(rulesBox, PA.tex(r.lhs + " \\to^{" + r.n + "} " + r.rhs.join("")), () => apply(r)));
    const row = PA.btnRow(controls);
    PA.button(row, "Hint step", hint);
    PA.button(row, "Undo", undo);
    PA.button(row, "Reset", reset);
    const formEl = h("div", { class: "form-row" });
    const hist = h("div", { class: "mathbox" });
    const tree = treeBox("Parse tree");
    const verdict = h("div", { class: "verdict" });
    view.append(h("div", { class: "panel" }, [h("div", { class: "panel-title", text: "Current string (click a non-terminal)" }), formEl]), verdict, hist, tree.box);

    let form, steps, sel, root, history;
    function snapshot() { return JSON.stringify({ form: form.map((x) => x.s), steps, sel, tree: serialize(root) }); }
    function serialize(n) { return { label: n.label, kind: n.kind, children: (n.children || []).map(serialize) }; }
    function reset() {
      root = { label: "S", kind: "nt", children: [] };
      form = [{ s: "S", node: root }];
      steps = []; sel = 0; history = [];
      render();
    }
    function relink() { // rebuild form node references after undo
      const leaves = [];
      (function walk(n) { if (n.children && n.children.length) n.children.forEach(walk); else leaves.push(n); })(root);
      form = leaves.map((n) => ({ s: n.label, node: n }));
    }
    function undo() {
      if (!history.length) return;
      const s = JSON.parse(history.pop());
      steps = s.steps; sel = s.sel;
      root = (function build(n) { return { label: n.label, kind: n.kind, children: n.children.map(build) }; })(s.tree);
      relink();
      render();
    }
    function apply(r) {
      if (!form[sel] || form[sel].s !== r.lhs) return;
      history.push(snapshot());
      const node = form[sel].node;
      const kids = r.rhs.map((s) => ({ s, node: { label: s, kind: isNT(s) ? "nt" : "tok", children: [] } }));
      node.children = kids.map((k) => k.node);
      form.splice(sel, 1, ...kids);
      steps.push({ rule: r.n, str: form.map((x) => x.s).join("") });
      const nt = form.findIndex((x) => isNT(x.s));
      sel = nt < 0 ? -1 : nt;
      render();
    }
    function hint() {
      const tgt = target.value;
      const i = form.findIndex((x) => isNT(x.s));
      if (i < 0) return;
      sel = i;
      const str = form.map((x) => x.s).join("");
      const r = GRAMMAR.filter((g) => g.lhs === form[i].s).find((g) => canDerive(str.slice(0, i) + g.rhs.join("") + str.slice(i + 1), tgt));
      if (r) apply(r); else render();
    }
    function render() {
      const str = form.map((x) => x.s).join("");
      formEl.innerHTML = "";
      form.forEach((x, i) => {
        if (isNT(x.s)) formEl.append(h("button", { type: "button", class: "sym nt" + (i === sel ? " on" : ""), text: x.s, "aria-label": "select non-terminal " + x.s + " at position " + (i + 1), onclick: () => { sel = i; render(); } }));
        else formEl.append(h("span", { class: "sym t", text: x.s }));
      });
      ruleBtns.forEach((b, k) => { b.disabled = !form[sel] || form[sel].s !== GRAMMAR[k].lhs; });
      hist.innerHTML = PA.tex("S" + steps.map((s) => " \\to^{" + s.rule + "} " + s.str).join(""), true);
      tree.wrap.innerHTML = treeSVG(root, { aria: "parse tree" });
      const tgt = target.value;
      const inL = canDerive("S", tgt);
      const done = !form.some((x) => isNT(x.s));
      if (done && str === tgt) { verdict.className = "verdict good"; verdict.innerHTML = "<b>Derived</b> " + esc(tgt) + " in " + steps.length + " steps. No non-terminals left, so it is a word of $L_G$."; }
      else if (!inL) { verdict.className = "verdict bad"; verdict.innerHTML = "<b>" + esc(tgt) + " is not in the language.</b> Every word has the shape (<sup>n</sup> a (b))<sup>n</sup>; no sequence of rules reaches this target."; }
      else if (!canDerive(str, tgt)) { verdict.className = "verdict warn"; verdict.innerHTML = "<b>Dead end.</b> From <code>" + esc(str) + "</code> the target can no longer be produced (too long, or the fixed terminals around the non-terminals disagree with it). Undo a step."; }
      else { verdict.className = "verdict"; verdict.innerHTML = done ? "Finished, but this is a different word." : "Still possible: " + form.filter((x) => isNT(x.s)).length + " non-terminal(s) left."; }
      PA.math(verdict);
    }
    target.onchange = reset;
    reset();
  }

  /* =====================================================================
     LAB 4: regex denotation, with the star's fixpoint iteration
     ===================================================================== */
  function parseRegex(src) {
    const s = src.replace(/\s+/g, "");
    let i = 0;
    const fail = (m) => { throw { msg: m, pos: i }; };
    function alt() { let l = cat(); while (s[i] === "+" || s[i] === "|") { i++; l = { t: "alt", a: l, b: cat() }; } return l; }
    function cat() {
      let l = null;
      while (i < s.length && s[i] !== ")" && s[i] !== "+" && s[i] !== "|") { const r = star(); l = l ? { t: "cat", a: l, b: r } : r; }
      return l || { t: "eps" };
    }
    function star() { let e = atom(); while (s[i] === "*") { i++; e = { t: "star", e }; } return e; }
    function atom() {
      const c = s[i];
      if (c === undefined) fail("unexpected end");
      if (c === "(") { i++; const e = alt(); if (s[i] !== ")") fail("expected )"); i++; return e; }
      if (c === "\u03b5" || c === "e" && s.slice(i, i + 3) === "eps") { i += c === "\u03b5" ? 1 : 3; return { t: "eps" }; }
      if (/[a-z0-9]/.test(c)) { i++; return { t: "sym", c }; }
      fail("unexpected '" + c + "'");
    }
    if (!s.length) return { t: "eps" };
    const r = alt();
    if (i < s.length) fail("unexpected '" + s[i] + "'");
    return r;
  }
  function rxTex(e, ctx) {
    switch (e.t) {
      case "eps": return "\\epsilon";
      case "sym": return "\\mathtt{" + e.c + "}";
      case "star": { const inner = rxTex(e.e, "star"); return (e.e.t === "sym" || e.e.t === "eps" ? inner : "(" + inner + ")") + "^{*}"; }
      case "cat": { const s = rxTex(e.a, "cat") + rxTex(e.b, "cat"); return s; }
      case "alt": { const s = rxTex(e.a, "alt") + " + " + rxTex(e.b, "alt"); return ctx === "cat" || ctx === "star" ? "(" + s + ")" : s; }
    }
  }
  const CAP = 4000;
  function den(e, k, starLog) {
    switch (e.t) {
      case "eps": return new Set([""]);
      case "sym": return k >= 1 ? new Set([e.c]) : new Set();
      case "alt": { const r = new Set(den(e.a, k, starLog)); den(e.b, k, starLog).forEach((w) => r.add(w)); return r; }
      case "cat": {
        const A = den(e.a, k, starLog), B = den(e.b, k, starLog), r = new Set();
        A.forEach((u) => B.forEach((w) => { if (u.length + w.length <= k && r.size < CAP) r.add(u + w); }));
        return r;
      }
      case "star": {
        const E = den(e.e, k, starLog);
        let X = new Set();
        const iters = [X];
        for (let n = 0; n < k + 3; n++) {
          const Y = new Set([""]);
          E.forEach((u) => X.forEach((w) => { if (u.length + w.length <= k && Y.size < CAP) Y.add(u + w); }));
          iters.push(Y);
          if (Y.size === X.size) { X = Y; break; }
          X = Y;
        }
        if (starLog) starLog.push({ e, iters });
        return X;
      }
    }
  }
  const sortWords = (S) => [...S].sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
  const wordHtml = (w) => '<span class="word">' + (w === "" ? "\u03b5" : esc(w)) + "</span>";
  function labRegexSem(el) {
    const { controls, view } = PA.lab(el, {
      title: "What does a regex mean?",
      hint: "Write a regex in the course syntax: letters, ε (or eps), concatenation, + (or |) for alternatives, * and parentheses. The lab computes its denotation up to a word length, and shows the star's least-fixpoint iteration.",
    });
    const preset = PA.select(controls, { label: "Examples", options: [["(ab)*", "(ab)*"], ["a*b*", "a*b*"], ["(a+b)*a", "(a+b)*a"], ["a(ba)*", "a(ba)*"], ["ε+ab", "ε+ab"], ["(a*b)*", "(a*b)*"]], value: "(ab)*" });
    const input = PA.textInput(controls, { label: "Regex", value: "(ab)*" });
    const k = PA.slider(controls, { label: "Max word length <i>k</i>", min: 1, max: 7, value: 4 });
    const word = PA.textInput(controls, { label: "Is this word in the language?", value: "abab" });
    const texEl = h("div", { class: "mathbox" });
    const denEl = h("div", { class: "panel" });
    const starEl = h("div", { class: "panel" });
    const mem = h("div", { class: "verdict" });
    view.append(texEl, denEl, starEl, mem);
    function update() {
      let e;
      try { e = parseRegex(input.value); input.bad(false); } catch (err) {
        input.bad(true);
        texEl.innerHTML = '<span class="lv-note">Parse error: ' + esc(err.msg) + "</span>";
        denEl.innerHTML = starEl.innerHTML = mem.innerHTML = "";
        return;
      }
      const K = k.value;
      const log = [];
      const D = den(e, K, log);
      texEl.innerHTML = PA.tex("\\sem{" + rxTex(e, null) + "}", true);
      const words = sortWords(D);
      denEl.innerHTML = '<div class="panel-title">Words of length at most ' + K + " (" + words.length + (D.size >= CAP ? "+, truncated" : "") + ")</div><div class=\"words\">" + (words.length ? words.map(wordHtml).join("") : '<span class="lv-note">none: the empty set</span>') + "</div>";
      if (log.length) {
        const st = log[log.length - 1]; // the outermost (last finished) star
        starEl.innerHTML = '<div class="panel-title">Least fixpoint for ' + PA.tex(rxTex(st.e, null)) + ": $X_0 = \\emptyset$, $X_{i+1} = \\{\\epsilon\\} \\cup \\sem{" + rxTex(st.e.e, null) + "} X_i$ (words up to length " + K + ")</div>" +
          '<table class="dt"><tbody>' + st.iters.map((X, i) => "<tr><td class=\"mono\">X<sub>" + i + "</sub></td><td>" + (X.size ? sortWords(X).slice(0, 40).map(wordHtml).join("") + (X.size > 40 ? " ..." : "") : "\u2205") + "</td><td class=\"num\">" + X.size + "</td></tr>").join("") + "</tbody></table>" +
          '<div class="lv-note">Stable after ' + (st.iters.length - 1) + " rounds: each round adds the words with one more repetition, and the last round adds nothing new (up to length " + K + ").</div>";
        PA.math(starEl);
      } else starEl.innerHTML = '<div class="lv-note">This regex has no star, so its language is finite and no fixpoint is needed.</div>';
      const w = word.value.trim();
      if (!/^[a-z0-9]*$/.test(w)) { mem.className = "verdict warn"; mem.textContent = "Use only letters and digits in the word."; return; }
      const inL = den(e, w.length, null).has(w);
      mem.className = "verdict " + (inL ? "good" : "bad");
      mem.innerHTML = "<b>" + (w === "" ? "\u03b5" : esc(w)) + "</b> is " + (inL ? "" : "<b>not</b> ") + "in the language (checked exactly, by computing all words up to length " + w.length + ").";
    }
    preset.onchange = () => input.set(preset.value);
    input.onchange = update; k.onchange = update; word.onchange = update;
    update();
  }

  /* =====================================================================
     LAB 5: regexes on JPAMB method ids and on Simple.java
     ===================================================================== */
  const SIMPLE_JAVA = [
    "package jpamb.cases;",
    "",
    "import jpamb.utils.Case;",
    "",
    "public class Simple {",
    "",
    '  @Case("() -> assertion error")',
    "  public static void assertFalse() {",
    "    assert false;",
    "  }",
    "",
    '  @Case("(false) -> assertion error")',
    '  @Case("(true) -> ok")',
    "  public static void assertBoolean(boolean shouldFail) {",
    "    assert shouldFail;",
    "  }",
    "",
    '  @Case("(1) -> ok")',
    '  @Case("(0) -> assertion error")',
    "  public static void assertPositive(int num) {",
    "    assert num > 0;",
    "  }",
    "",
    '  @Case("() -> divide by zero")',
    "  public static int divideByZero() {",
    "    return 1 / 0;",
    "  }",
    "",
    '  @Case("(1) -> ok")',
    '  @Case("(0) -> divide by zero")',
    "  public static int divideByN(int n) {",
    "    return 1 / n;",
    "  }",
    "}",
  ].join("\n");
  const NESTED_METHOD = [
    "",
    '  @Case("(1) -> divide by zero")',
    '  @Case("(0) -> ok")',
    "  public static int checkTheWrongThing(int a) {",
    "    if (a != 0) {",
    "      return a / 0;",
    "    }",
    "    return 0;",
    "  }",
  ].join("\n");
  function realMethods(src) { // ground truth by brace counting
    const out = [];
    const re = /(\w+)\s*\(([^)]*)\)\s*\{/g;
    let m;
    while ((m = re.exec(src))) {
      if (["if", "while", "for", "switch", "catch"].includes(m[1])) continue;
      let depth = 0, j = re.lastIndex - 1;
      for (; j < src.length; j++) { if (src[j] === "{") depth++; else if (src[j] === "}" && --depth === 0) break; }
      out.push({ name: m[1], body: src.slice(re.lastIndex, j) });
    }
    return out;
  }
  function labRegexLab(el) {
    const { controls, view } = PA.lab(el, {
      title: "Regexes against JPAMB",
      hint: "Mode 1 splits method ids into named groups (JavaScript syntax: <code>(?&lt;name&gt;...)</code>; Python writes <code>(?P&lt;name&gt;...)</code>). Mode 2 cuts method bodies out of a Simple.java-like file, and lets you break the file the way the course activity asks.",
    });
    const mode = PA.seg(controls, { label: "Mode", options: [["ids", "Method ids"], ["bodies", "Method bodies"]], value: "ids" });
    const idPresets = [
      ["good", "^(?<cls>[\\w.]+)\\.(?<method>\\w+):\\((?<args>[^)]*)\\)(?<ret>.+)$"],
      ["dots", "^(?<cls>\\w+.\\w+.\\w+).(?<method>\\w+)"],
      ["greedy", "(?<cls>.+)\\.(?<method>.+):(?<sig>.+)"],
      ["lazy", "^(?<cls>[\\w.]+?)\\.(?<method>\\w+)"],
    ];
    const bodyPresets = [
      ["hint", "public\\W+static\\W+(?<retype>void)\\W+(?<mname>\\w*)()\\W*{(?<code>[^}]*)}"],
      ["better", "(?:public|private|protected)\\s+(?:static\\s+)?(?<retype>\\w+(?:\\[\\])?)\\s+(?<mname>\\w+)\\s*\\((?<params>[^)]*)\\)\\s*\\{(?<code>[^}]*)\\}"],
    ];
    const g1 = PA.group(controls, "Method ids");
    const idSel = PA.select(g1, { label: "Regex preset", options: [["good", "Named groups (good)"], ["dots", "Forgot to escape the dots"], ["greedy", "Greedy .+ everywhere"], ["lazy", "Lazy class name"]], value: "good" });
    const g2 = PA.group(controls, "Method bodies");
    const bodySel = PA.select(g2, { label: "Regex preset", options: [["hint", "The regex from the notes"], ["better", "A sturdier regex"]], value: "hint" });
    const tNon = PA.toggle(g2, { label: "make the methods non-static", value: false });
    const tNl = PA.toggle(g2, { label: "put <code>{</code> on its own line", value: false });
    const tNest = PA.toggle(g2, { label: "add a method with an <code>if</code> block", value: false });
    const tCase = PA.toggle(g2, { label: "remove the <code>@Case</code> lines", value: false });
    const rx = PA.textInput(view, { label: "Regex (JavaScript flavour)", value: idPresets[0][1] });
    const ids = PA.textInput(view, { label: "Test strings, one per line", rows: 7, value: ["jpamb.cases.Simple.assertFalse:()V", "jpamb.cases.Simple.assertPositive:(I)V", "jpamb.cases.Simple.divideByN:(I)I", "jpamb.cases.Arrays.arraySpellsHello:([C)V", "jpamb.cases.Loops.forever:()V", "jpamb.cases.Calls.callsAssertTrue:()V", "jpambXcasesXSimpleXbroken:(I)V"].join("\n") });
    const srcView = h("details", { class: "proof" }, [h("summary", { text: "Show the Java source being searched" })]);
    const srcPre = h("div");
    srcView.append(srcPre);
    const out = h("div", { class: "table-wrap no-math" });
    const verdict = h("div", { class: "verdict" });
    view.append(srcView, out, verdict);

    function source() {
      let s = SIMPLE_JAVA;
      if (tNest.value) s = s.replace(/\n}$/, NESTED_METHOD + "\n}");
      if (tNon.value) s = s.replace(/public static /g, "public ");
      if (tNl.value) s = s.replace(/\) \{\n/g, ")\n  {\n");
      if (tCase.value) s = s.split("\n").filter((l) => !/^\s*@Case/.test(l)).join("\n");
      return s;
    }
    function setMode() {
      const ids_ = mode.value === "ids";
      g1.style.display = ids_ ? "" : "none";
      g2.style.display = ids_ ? "none" : "";
      ids.wrap.style.display = ids_ ? "" : "none";
      srcView.style.display = ids_ ? "none" : "";
      rx.set((ids_ ? idPresets.find((p) => p[0] === idSel.value) : bodyPresets.find((p) => p[0] === bodySel.value))[1]);
    }
    function update() {
      let re;
      try { re = new RegExp(rx.value, mode.value === "ids" ? "" : "g"); rx.bad(false); } catch (e) {
        rx.bad(true); out.innerHTML = ""; verdict.className = "verdict bad"; verdict.textContent = "Invalid regex: " + e.message; return;
      }
      if (mode.value === "ids") {
        const lines = ids.value.split("\n").map((l) => l.trim()).filter(Boolean);
        let n = 0;
        out.innerHTML = '<table class="dt"><thead><tr><th>String</th><th>Match</th><th>Groups</th></tr></thead><tbody>' + lines.map((l) => {
          const m = re.exec(l);
          if (m) n++;
          const groups = m ? (m.groups ? Object.entries(m.groups) : m.slice(1).map((g, i) => [String(i + 1), g])) : [];
          const path = m && m.groups && m.groups.cls ? '<div class="lv-note">file: ' + esc(m.groups.cls.replace(/\./g, "/")) + ".java</div>" : "";
          return '<tr class="' + (m ? "" : "bad") + '"><td class="mono">' + esc(l) + '</td><td class="mono">' + (m ? esc(m[0]) : "no match") + "</td><td>" + groups.map(([k, v]) => '<span class="grp"><b>' + esc(k) + "</b> " + esc(v == null ? "(unset)" : v) + "</span>").join(" ") + path + "</td></tr>";
        }).join("") + "</tbody></table>";
        const bad = lines.find((l) => /X/.test(l) && re.exec(l));
        verdict.className = "verdict " + (bad ? "warn" : "");
        verdict.innerHTML = n + " of " + lines.length + " lines match." + (bad ? " <b>Note:</b> the garbage line <code>" + esc(bad) + "</code> matched too: an unescaped <code>.</code> accepts any character." : "") +
          (idSel.value === "lazy" ? " The lazy <code>+?</code> stops at the first dot, so the class becomes <code>jpamb</code> and the method <code>cases</code>." : "");
      } else {
        const src = source();
        srcPre.innerHTML = "";
        srcPre.append(PA.codeBlock(src, "java"));
        const truth = realMethods(src);
        const found = [...src.matchAll(re)];
        const rows = truth.map((t) => {
          const m = found.find((f) => f.groups && f.groups.mname === t.name);
          let status, cls;
          if (!m) { status = "missed"; cls = "bad"; }
          else if (m.groups.code == null) { status = "found (no code group)"; cls = "good"; }
          else if (m.groups.code.trim() !== t.body.trim()) { status = "body cut short"; cls = "bad"; }
          else { status = "found"; cls = "good"; }
          const code = m && m.groups.code != null ? m.groups.code.trim().replace(/\s+/g, " ") : "";
          return '<tr class="' + cls + '"><td class="mono">' + esc(t.name) + "</td><td>" + status + '</td><td class="mono">' + esc(code.length > 60 ? code.slice(0, 60) + "..." : code) + "</td></tr>";
        });
        out.innerHTML = '<table class="dt"><thead><tr><th>Method</th><th>Result</th><th>Captured body</th></tr></thead><tbody>' + rows.join("") + "</tbody></table>";
        const ok = rows.filter((r) => r.includes('class="good"')).length;
        verdict.className = "verdict " + (ok === truth.length ? "good" : "warn");
        verdict.innerHTML = "<b>" + ok + " of " + truth.length + "</b> method bodies extracted correctly. " +
          (bodySel.value === "hint" ? "The notes' regex only knows <code>public static void</code> methods without parameters: <code>()</code> is an empty group, not literal parentheses. " : "") +
          (tNest.value ? "With an <code>if</code> block, <code>[^}]*</code> stops at the inner <code>}</code>: nesting is beyond regular expressions. " : "") +
          (tNon.value && bodySel.value === "hint" ? "Non-static methods have no <code>static</code> to match. " : "");
      }
    }
    mode.onchange = () => { setMode(); };
    idSel.onchange = () => rx.set(idPresets.find((p) => p[0] === idSel.value)[1]);
    bodySel.onchange = () => rx.set(bodyPresets.find((p) => p[0] === bodySel.value)[1]);
    [tNon, tNl, tNest, tCase].forEach((t) => (t.onchange = update));
    rx.onchange = update; ids.onchange = update;
    setMode();
  }

  /* =====================================================================
     LAB 6: nesting depth, regex R_k vs a counter
     ===================================================================== */
  function rk(k) { let r = ""; for (let i = 0; i < k; i++) r = "(?:\\(" + r + "\\))*"; return r; }
  function labParens(el) {
    const { controls, view } = PA.lab(el, {
      title: "A regex for depth k against a counter",
      hint: "R<sub>k</sub> accepts exactly the balanced strings of depth at most k. The counter (a one-symbol stack) accepts all balanced strings. Find inputs where they disagree.",
    });
    const k = PA.slider(controls, { label: "Regex depth <i>k</i>", min: 0, max: 5, value: 2 });
    const preset = PA.select(controls, { label: "Examples", options: [["(()(()))", "(()(()))"], ["()()()", "()()()"], ["((()))", "((()))"], ["(((())))", "(((())))"], ["(()", "(()"], ["())(", "())("]], value: "(()(()))" });
    const s = PA.textInput(controls, { label: "Parentheses", value: "(()(()))" });
    const n = PA.slider(controls, { label: "Generate (<sup>n</sup>)<sup>n</sup> with n", min: 1, max: 8, value: 3 });
    PA.button(PA.btnRow(controls), "Generate", () => s.set("(".repeat(n.value) + ")".repeat(n.value)));
    const rxEl = h("div", { class: "panel no-math" });
    const strip = h("div", { class: "depth-strip no-math" });
    const stats = PA.stats(view, [{ key: "rx", label: "Regex R<sub>k</sub>" }, { key: "ctr", label: "Counter" }, { key: "max", label: "Max depth" }]);
    const verdict = h("div", { class: "verdict" });
    view.prepend(rxEl);
    view.append(strip, verdict);
    function update() {
      const str = s.value.replace(/\s+/g, "");
      if (!/^[()]*$/.test(str)) { s.bad(true); verdict.className = "verdict warn"; verdict.textContent = "Only ( and ) please."; return; }
      s.bad(false);
      const K = k.value;
      const body = rk(K);
      const rxOk = new RegExp("^" + body + "$").test(str);
      rxEl.innerHTML = '<div class="panel-title">R<sub>' + K + "</sub> as a JavaScript regex (" + (body.length + 2) + " characters)</div><code class=\"rx\">^" + esc(body) + "$</code>";
      let d = 0, okCtr = true, maxD = 0;
      const depths = [];
      for (const c of str) {
        d += c === "(" ? 1 : -1;
        if (d < 0) okCtr = false;
        maxD = Math.max(maxD, d);
        depths.push(d);
      }
      if (d !== 0) okCtr = false;
      strip.innerHTML = str.length ? [...str].map((c, i) => {
        const depth = c === "(" ? depths[i] : depths[i] + 1;
        const over = depth > K;
        return '<span class="dch' + (over ? " over" : "") + (depths[i] < 0 ? " neg" : "") + '"><i style="height:' + Math.max(2, Math.min(depth, 8) * 8) + 'px"></i><b>' + c + "</b><small>" + depths[i] + "</small></span>";
      }).join("") : '<span class="lv-note">empty string</span>';
      stats.set("rx", rxOk ? "accept" : "reject", rxOk ? "good" : "bad");
      stats.set("ctr", okCtr ? "balanced" : "unbalanced", okCtr ? "good" : "bad");
      stats.set("max", String(maxD), maxD > K ? "warn" : "");
      if (rxOk === okCtr) { verdict.className = "verdict good"; verdict.innerHTML = "They agree. " + (okCtr && maxD <= K ? "This string stays within depth " + K + ", where the regex is exact." : "Unbalanced strings are rejected by both."); }
      else { verdict.className = "verdict bad"; verdict.innerHTML = "<b>They disagree.</b> The string is balanced but reaches depth " + maxD + " &gt; " + K + " (red columns): R<sub>" + K + "</sub> ran out of fingers. Raise k and the regex catches up, but (<sup>" + (K + 1) + "</sup>)<sup>" + (K + 1) + "</sup> beats every fixed k."; }
    }
    preset.onchange = () => s.set(preset.value);
    s.onchange = update; k.onchange = update;
    update();
  }

  /* =====================================================================
     LAB 7: precedence and associativity
     ===================================================================== */
  function lexSimple(src) { return (src.match(/\d+|[A-Za-z]+|λ|\\|[-+*/().]/g) || []); }
  function parseOps(src, mulLevel, assoc) {
    const t = lexSimple(src);
    let i = 0;
    const lvl = mulLevel === "tighter" ? { "+": 1, "-": 1, "*": 2, "/": 2 } : mulLevel === "same" ? { "+": 1, "-": 1, "*": 1, "/": 1 } : { "+": 2, "-": 2, "*": 1, "/": 1 };
    function atom() {
      const x = t[i++];
      if (x === undefined) throw { msg: "unexpected end" };
      if (x === "(") { const e = expr(0); if (t[i++] !== ")") throw { msg: "expected )" }; return e; }
      if (/^\d+$/.test(x)) return { t: "num", v: parseInt(x, 10) };
      if (/^[A-Za-z]+$/.test(x)) return { t: "var", x };
      throw { msg: "unexpected " + x };
    }
    function expr(minP) {
      let l = atom();
      while (i < t.length && lvl[t[i]] !== undefined && lvl[t[i]] >= minP) {
        const op = t[i++];
        const p = lvl[op];
        const r = expr(assoc === "left" ? p + 1 : p);
        l = { t: "bin", op, l, r };
      }
      return l;
    }
    const e = expr(0);
    if (i < t.length) throw { msg: "unexpected " + t[i] };
    return e;
  }
  const evalJ = (a) => (a.t === "num" ? a.v : a.t === "var" ? NaN : (function () { const x = evalJ(a.l), y = evalJ(a.r); if (isNaN(x) || isNaN(y)) return NaN; const v = javaOp(a.op, x, y); return v === null ? NaN : v; })());
  const bracket = (a) => (a.t === "num" ? String(a.v) : a.t === "var" ? a.x : "(" + bracket(a.l) + " " + a.op + " " + bracket(a.r) + ")");
  function parseLam(src, appAssoc, absFar) {
    const t = lexSimple(src.replace(/\\/g, "λ"));
    let i = 0;
    function seq() {
      const items = [];
      while (i < t.length && t[i] !== ")") {
        if (t[i] === "λ") {
          i++;
          const v = t[i++];
          if (!/^[A-Za-z]+$/.test(v || "")) throw { msg: "expected a variable after λ" };
          if (t[i++] !== ".") throw { msg: "expected ." };
          const body = absFar ? seq() : atom();
          items.push({ t: "abs", v, body });
          if (absFar) break;
        } else items.push(atom());
      }
      if (!items.length) throw { msg: "empty expression" };
      if (appAssoc === "left") return items.reduce((l, r) => ({ t: "app", f: l, a: r }));
      return items.reduceRight((r, l) => ({ t: "app", f: l, a: r }));
    }
    function atom() {
      const x = t[i++];
      if (x === "(") { const e = seq(); if (t[i++] !== ")") throw { msg: "expected )" }; return e; }
      if (/^[A-Za-z]+$/.test(x || "")) return { t: "var", x };
      if (x === "λ") { i--; const v = t[i + 1]; i += 3; return { t: "abs", v, body: atom() }; }
      throw { msg: "unexpected " + (x || "end") };
    }
    const e = seq();
    if (i < t.length) throw { msg: "unexpected " + t[i] };
    return e;
  }
  const lamTree = (e) => (e.t === "var" ? { label: e.x, kind: "leaf" } : e.t === "abs" ? { label: "λ" + e.v, kind: "op", children: [lamTree(e.body)] } : { label: "app", kind: "nt", children: [lamTree(e.f), lamTree(e.a)] });
  const lamStr = (e) => (e.t === "var" ? e.x : e.t === "abs" ? "(λ" + e.v + ". " + lamStr(e.body) + ")" : "(" + lamStr(e.f) + " " + lamStr(e.a) + ")");
  function labPrecedence(el) {
    const { controls, view } = PA.lab(el, {
      title: "Precedence and associativity decide the tree",
      hint: "The same tokens, different grammars, different trees. Java's choice for arithmetic is: * and / bind tighter, everything left-associative. For the lambda calculus: application to the left, abstraction as far right as possible.",
    });
    const mode = PA.seg(controls, { label: "Language", options: [["arith", "Arithmetic"], ["lam", "Lambda calculus"]], value: "arith" });
    const ga = PA.group(controls, "Arithmetic");
    const aPre = PA.select(ga, { label: "Expression", options: [["10 - 3 - 2", "10 - 3 - 2"], ["10 + 3 * 5", "10 + 3 * 5"], ["2 * 3 + 4 * 5", "2 * 3 + 4 * 5"], ["8 / 4 / 2", "8 / 4 / 2"], ["1 - 2 + 3", "1 - 2 + 3"]], value: "10 - 3 - 2" });
    const mul = PA.seg(ga, { label: "<code>*</code> and <code>/</code> bind", options: [["tighter", "tighter"], ["same", "same"], ["looser", "looser"]], value: "tighter" });
    const assoc = PA.seg(ga, { label: "Associativity", options: [["left", "left"], ["right", "right"]], value: "left" });
    const gl = PA.group(controls, "Lambda calculus");
    const lPre = PA.select(gl, { label: "Term", options: [["a b c", "a b c"], ["λx. x y", "λx. x y"], ["λx. λy. x y z", "λx. λy. x y z"], ["(λx. x) y z", "(λx. x) y z"]], value: "a b c" });
    const app = PA.seg(gl, { label: "Application (<code>prec</code>)", options: [["left", "prec.left"], ["right", "prec.right"]], value: "left" });
    const abs = PA.seg(gl, { label: "Abstraction body", options: [["far", "as far right as possible"], ["short", "a single atom"]], value: "far" });
    const tree = treeBox("Parse tree");
    const verdict = h("div", { class: "verdict no-math" });
    view.append(tree.box, verdict);
    function update() {
      const isA = mode.value === "arith";
      ga.style.display = isA ? "" : "none";
      gl.style.display = isA ? "none" : "";
      try {
        if (isA) {
          const e = parseOps(aPre.value, mul.value, assoc.value);
          const java = parseOps(aPre.value, "tighter", "left");
          tree.wrap.innerHTML = treeSVG(astToTree(e), { aria: "parse tree" });
          const v = evalJ(e), vj = evalJ(java);
          const same = bracket(e) === bracket(java);
          verdict.className = "verdict " + (same ? "good" : "warn");
          verdict.innerHTML = "Read as <code>" + esc(bracket(e)) + "</code> = <b>" + v + "</b>. " + (same ? "This is how Java reads it." : "Java reads <code>" + esc(bracket(java)) + "</code> = <b>" + vj + "</b>.");
        } else {
          const e = parseLam(lPre.value, app.value, abs.value === "far");
          const std = parseLam(lPre.value, "left", true);
          tree.wrap.innerHTML = treeSVG(lamTree(e), { aria: "parse tree" });
          const same = lamStr(e) === lamStr(std);
          verdict.className = "verdict " + (same ? "good" : "warn");
          verdict.innerHTML = "Read as <code>" + esc(lamStr(e)) + "</code>. " + (same ? "This is the standard reading (the grammar in the notes)." : "The notes' grammar reads <code>" + esc(lamStr(std)) + "</code>.");
        }
      } catch (err) { verdict.className = "verdict bad"; verdict.textContent = "Parse error: " + (err.msg || err); tree.wrap.innerHTML = ""; }
    }
    [mode, aPre, mul, assoc, lPre, app, abs].forEach((c) => (c.onchange = update));
    update();
  }

  /* =====================================================================
     Tree-sitter style CST of a small class, and a mini query engine
     ===================================================================== */
  const tk = (t) => ({ type: t, named: false, text: t, children: [] });
  const nn = (type, ...children) => ({ type, named: true, children });
  const lf = (type, text) => ({ type, named: true, text, children: [] });
  const fld = (field, node) => Object.assign(node, { field });
  const ident = (x) => lf("identifier", x);
  const intLit = (n) => lf("decimal_integer_literal", String(n));
  const binE = (l, op, r) => nn("binary_expression", fld("left", l), fld("operator", tk(op)), fld("right", r));
  const retS = (e) => nn("return_statement", tk("return"), e, tk(";"));
  const blockS = (...st) => nn("block", tk("{"), ...st, tk("}"));
  function methodD(ret, name, params, stmts) {
    return nn("method_declaration",
      nn("modifiers", tk("public"), tk("static")),
      fld("type", ret === "void" ? lf("void_type", "void") : lf("integral_type", ret)),
      fld("name", ident(name)),
      fld("parameters", nn("formal_parameters", tk("("), ...params.map((p) => nn("formal_parameter", fld("type", lf("integral_type", "int")), fld("name", ident(p)))), tk(")"))),
      fld("body", blockS(...stmts)));
  }
  function buildClass() {
    const root = nn("program", nn("class_declaration",
      nn("modifiers", tk("public")), tk("class"), fld("name", ident("Simple")),
      fld("body", nn("class_body", tk("{"),
        methodD("void", "assertFalse", [], [nn("assert_statement", tk("assert"), lf("false", "false"), tk(";"))]),
        methodD("int", "divideByZero", [], [retS(binE(intLit(1), "/", intLit(0)))]),
        methodD("int", "divideByN", ["n"], [retS(binE(intLit(1), "/", ident("n")))]),
        methodD("int", "checkTheWrongThing", ["a"], [
          nn("if_statement", tk("if"), fld("condition", nn("parenthesized_expression", tk("("), binE(ident("a"), "!=", intLit(0)), tk(")"))), fld("consequence", blockS(retS(binE(ident("a"), "/", intLit(0)))))),
          retS(intLit(0)),
        ]),
        tk("}")))));
    let id = 0;
    (function walk(n, parent, depth) {
      n.id = id++; n.parent = parent; n.depth = depth;
      n.children.forEach((c) => walk(c, n, depth + 1));
      if (n.text == null) n.text = n.children.map((c) => c.text).join(" ");
    })(root, null, 0);
    return root;
  }
  const CLASS_SRC = [
    "public class Simple {",
    "  public static void assertFalse() {",
    "    assert false;",
    "  }",
    "  public static int divideByZero() {",
    "    return 1 / 0;",
    "  }",
    "  public static int divideByN(int n) {",
    "    return 1 / n;",
    "  }",
    "  public static int checkTheWrongThing(int a) {",
    "    if (a != 0) {",
    "      return a / 0;",
    "    }",
    "    return 0;",
    "  }",
    "}",
  ].join("\n");
  const allNodes = (n, out) => { out.push(n); n.children.forEach((c) => allNodes(c, out)); return out; };
  const methodOf = (n) => { while (n && n.type !== "method_declaration") n = n.parent; return n; };
  const methodName = (m) => m && m.children.find((c) => c.field === "name").text;

  /* query syntax: pattern := '(' (type|_) child* ')' capture* | "str" capture* | '(' pattern predicate* ')' (group) ;
     child := [field ':'] pattern | predicate ;  predicate := '(' '#eq?' @c ("str"|@d) ')' */
  function lexQuery(s) {
    const out = [];
    const re = /\s*(?:(\()|(\))|(@[\w.-]+)|("(?:[^"\\]|\\.)*")|(#[\w-]+\??)|([A-Za-z_][\w-]*)\s*(:)?|(\S))/gy;
    let m;
    while (re.lastIndex < s.length && (m = re.exec(s))) {
      if (m[0].trim() === "" && m.index + m[0].length >= s.length) break;
      if (m[1]) out.push({ k: "(" });
      else if (m[2]) out.push({ k: ")" });
      else if (m[3]) out.push({ k: "cap", v: m[3].slice(1) });
      else if (m[4]) out.push({ k: "str", v: JSON.parse(m[4]) });
      else if (m[5]) out.push({ k: "pred", v: m[5] });
      else if (m[6]) out.push(m[7] ? { k: "field", v: m[6] } : { k: "id", v: m[6] });
      else if (m[8]) throw { msg: "unexpected '" + m[8] + "' in query" };
    }
    return out;
  }
  function parseQuery(src) {
    const t = lexQuery(src);
    let i = 0;
    const need = (k) => { if (!t[i] || t[i].k !== k) throw { msg: "expected " + k + " in query" }; return t[i++]; };
    function caps(p) { while (t[i] && t[i].k === "cap") p.caps.push(t[i++].v); return p; }
    function pred() {
      need("("); const name = t[i++].v; const args = [];
      while (t[i] && t[i].k !== ")") { const a = t[i++]; if (a.k !== "cap" && a.k !== "str") throw { msg: "bad predicate argument" }; args.push(a); }
      need(")");
      return { name, args };
    }
    function pattern() {
      if (t[i] && t[i].k === "str") return caps({ str: t[i++].v, caps: [], kids: [], preds: [] });
      need("(");
      if (t[i] && t[i].k === "(") { // group: ( pattern predicates... )
        const p = pattern();
        while (t[i] && t[i].k === "(" && t[i + 1] && t[i + 1].k === "pred") p.preds.push(pred());
        need(")");
        return caps(p);
      }
      const ty = t[i++];
      if (!ty || ty.k !== "id") throw { msg: "expected a node type after (" };
      const p = { type: ty.v, caps: [], kids: [], preds: [] };
      while (t[i] && t[i].k !== ")") {
        if (t[i].k === "(" && t[i + 1] && t[i + 1].k === "pred") { p.preds.push(pred()); continue; }
        let field = null;
        if (t[i].k === "field") field = t[i++].v;
        const c = pattern();
        c.field = field;
        p.kids.push(c);
      }
      need(")");
      return caps(p);
    }
    const p = pattern();
    if (i < t.length) throw { msg: "unexpected text after the pattern" };
    return p;
  }
  function checkPreds(p, th) {
    return p.preds.every((pr) => {
      const val = (a) => (a.k === "str" ? a.v : th[a.v] ? th[a.v].text : undefined);
      if (pr.name === "#eq?") return val(pr.args[0]) === val(pr.args[1]);
      if (pr.name === "#not-eq?") return val(pr.args[0]) !== val(pr.args[1]);
      if (pr.name === "#match?") { try { return new RegExp(val(pr.args[1])).test(val(pr.args[0])); } catch (e) { return false; } }
      return true;
    });
  }
  function matchP(p, node, th) {
    if (p.str !== undefined) { if (node.named || node.text !== p.str) return []; }
    else if (p.type === "_") { if (!node.named) return []; }
    else if (node.type !== p.type || !node.named) return [];
    const th1 = Object.assign({}, th);
    p.caps.forEach((c) => (th1[c] = node));
    let res = [th1];
    if (p.kids.length) {
      const kidsMatch = (k, from, th2) => {
        if (k === p.kids.length) return [th2];
        const out = [];
        for (let j = from; j < node.children.length; j++) {
          const ch = node.children[j];
          if (p.kids[k].field && ch.field !== p.kids[k].field) continue;
          matchP(p.kids[k], ch, th2).forEach((t2) => kidsMatch(k + 1, j + 1, t2).forEach((t3) => out.push(t3)));
        }
        return out;
      };
      res = kidsMatch(0, 0, th1);
    }
    return res.filter((t) => checkPreds(p, t));
  }
  function runQuery(p, scope) {
    const out = [];
    allNodes(scope, []).forEach((n) => matchP(p, n, {}).forEach((th) => out.push({ anchor: n, th })));
    return out;
  }
  function sexpView(root, marks) {
    // marks: Map(node.id -> { caps: [names] }) ; scopeIds: Set of ids inside scope (null = all)
    const lines = [];
    (function walk(n, depth) {
      const show = n.named || n.field;
      if (show) {
        const m = marks.caps.get(n.id);
        const inScope = !marks.scope || marks.scope.has(n.id);
        const inMatch = marks.within.has(n.id);
        lines.push('<div class="sx' + (m ? " cap" : inMatch ? " inm" : "") + (inScope ? "" : " out") + '" style="padding-left:' + (depth * 14 + 6) + 'px">' +
          (n.field ? '<span class="fld">' + esc(n.field) + ":</span> " : "") +
          (n.named ? '<span class="ty">' + esc(n.type) + "</span>" : '<span class="an">"' + esc(n.text) + '"</span>') +
          (n.named && !n.children.length ? ' <span class="tx">' + esc(n.text) + "</span>" : "") +
          (m ? m.map((c) => ' <span class="capn">@' + esc(c) + "</span>").join("") : "") + "</div>");
      }
      n.children.forEach((c) => walk(c, show ? depth + 1 : depth));
    })(root, 0);
    return '<div class="sexp no-math">' + lines.join("") + "</div>";
  }
  function markResults(results) {
    const caps = new Map(), within = new Set();
    results.forEach((r) => {
      Object.entries(r.th).forEach(([c, n]) => { if (!caps.has(n.id)) caps.set(n.id, []); if (!caps.get(n.id).includes(c)) caps.get(n.id).push(c); });
      allNodes(r.anchor, []).forEach((n) => within.add(n.id));
    });
    return { caps, within };
  }
  function scrollToMatch(panel, scoped) {
    const box = panel.querySelector(".sexp");
    const tgt = panel.querySelector(".sx.cap") || (scoped ? panel.querySelector(".sx:not(.out)") : null);
    if (box && tgt) box.scrollTop = Math.max(0, tgt.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 40);
  }
  const Q_PRESETS = [
    ["div", '(binary_expression operator: "/") @divide'],
    ["method", '(method_declaration name:\n  ((identifier) @method-name (#eq? @method-name "assertFalse"))\n  body: (_) @body\n) @method'],
    ["zero", '(binary_expression\n  operator: "/"\n  right: (decimal_integer_literal) @zero\n  (#eq? @zero "0")) @div-by-zero'],
    ["fixed", '(method_declaration\n  name: (identifier) @m\n  body: (block (return_statement (binary_expression operator: "/") @div)))'],
  ];
  function labQuery(el) {
    const { controls, view } = PA.lab(el, {
      title: "Tree-sitter style queries",
      hint: "Pick or edit a query. The engine tries the pattern at every node (inside the chosen scope) and lists the capture maps. Supported: (type field: (child) ...) @capture, \"token\", (_), groups with (#eq? @c \"text\"), #not-eq?, #match?.",
    });
    const preset = PA.select(controls, { label: "Query", options: [["div", "Any division"], ["method", "The notes' method query"], ["zero", "Division by literal 0"], ["fixed", "Fixed shape: return of a division"]], value: "div" });
    const qIn = PA.textInput(controls, { label: "Pattern", rows: 5, value: Q_PRESETS[0][1] });
    const scope = PA.select(controls, { label: "Run the query on", options: [["all", "the whole file"], ["assertFalse", "body of assertFalse"], ["divideByZero", "body of divideByZero"], ["divideByN", "body of divideByN"], ["checkTheWrongThing", "body of checkTheWrongThing"]], value: "all" });
    const root = buildClass();
    const src = h("details", { class: "proof" }, [h("summary", { text: "Show the Java source" }), PA.codeBlock(CLASS_SRC, "java")]);
    const res = h("div", { class: "verdict no-math" });
    const sx = h("div", { class: "panel" });
    view.append(src, res, sx);
    function scopeNode(name) {
      if (name === "all") return root;
      const m = allNodes(root, []).find((n) => n.type === "method_declaration" && methodName(n) === name);
      return m.children.find((c) => c.field === "body");
    }
    function update() {
      let p;
      try { p = parseQuery(qIn.value); qIn.bad(false); } catch (e) {
        qIn.bad(true); res.className = "verdict bad"; res.textContent = "Query error: " + (e.msg || e.message); sx.innerHTML = ""; return;
      }
      const sc = scopeNode(scope.value);
      const results = runQuery(p, sc);
      const marks = markResults(results);
      marks.scope = scope.value === "all" ? null : new Set(allNodes(sc, []).map((n) => n.id));
      sx.innerHTML = '<div class="panel-title">CST (named nodes; matches highlighted)</div>' + sexpView(root, marks);
      scrollToMatch(sx, !!marks.scope);
      res.className = "verdict " + (results.length ? "good" : "");
      res.innerHTML = results.length
        ? "<b>" + results.length + " match" + (results.length > 1 ? "es" : "") + ":</b><ul class=\"qres\">" + results.map((r) => "<li>" + Object.entries(r.th).map(([c, n]) => "<code>@" + esc(c) + "</code> = " + esc(n.type) + " <code>" + esc(n.text.length > 40 ? n.text.slice(0, 40) + "..." : n.text) + "</code>").join(", ") + (Object.keys(r.th).length ? "" : esc(r.anchor.type)) + ' <span class="lv-note">(in ' + esc(methodName(methodOf(r.anchor)) || "class") + ")</span></li>").join("") + "</ul>"
        : "<b>No matches</b> in this scope.";
    }
    preset.onchange = () => qIn.set(Q_PRESETS.find((q) => q[0] === preset.value)[1]);
    qIn.onchange = update; scope.onchange = update;
    update();
  }

  function labContext(el) {
    const { controls, view } = PA.lab(el, {
      title: "Does this method divide?",
      hint: "We analyse one method at a time and ask \"does it contain a division?\". Compare three strategies: the division query over the whole file, the same query restricted to the method's body, and a single fixed-shape pattern anchored at the method.",
    });
    const meth = PA.select(controls, { label: "Method under analysis", options: [["assertFalse", "assertFalse"], ["divideByZero", "divideByZero"], ["divideByN", "divideByN"], ["checkTheWrongThing", "checkTheWrongThing"]], value: "assertFalse" });
    const strat = PA.seg(controls, { label: "Show strategy", options: [["file", "whole file"], ["body", "method body"], ["fixed", "fixed shape"]], value: "file" });
    const root = buildClass();
    const divQ = parseQuery(Q_PRESETS[0][1]);
    const fixedQ = parseQuery(Q_PRESETS[3][1]);
    const table = h("div", { class: "table-wrap no-math" });
    const verdict = h("div", { class: "verdict no-math" });
    const sx = h("div", { class: "panel" });
    view.append(verdict, table, sx);
    const methods = ["assertFalse", "divideByZero", "divideByN", "checkTheWrongThing"];
    const mNode = (name) => allNodes(root, []).find((n) => n.type === "method_declaration" && methodName(n) === name);
    function strategies(name) {
      const m = mNode(name), body = m.children.find((c) => c.field === "body");
      const truth = allNodes(body, []).some((n) => n.type === "binary_expression" && n.children.some((c) => c.field === "operator" && c.text === "/"));
      const file = runQuery(divQ, root);
      const scoped = runQuery(divQ, body);
      const fixedRes = runQuery(fixedQ, m);
      return { truth, file, scoped, fixed: fixedRes, m, body };
    }
    function update() {
      table.innerHTML = '<table class="dt"><thead><tr><th>Method</th><th>Really divides?</th><th>Whole-file query</th><th>Body-scoped query</th><th>Fixed shape</th></tr></thead><tbody>' + methods.map((name) => {
        const s = strategies(name);
        const cell = (found) => '<td class="' + (found === s.truth ? "okc" : "badc") + '">' + (found ? "found" : "not found") + (found === s.truth ? "" : " \u2717") + "</td>";
        return "<tr" + (name === meth.value ? ' class="on"' : "") + '><td class="mono">' + name + "</td><td>" + (s.truth ? "yes" : "no") + "</td>" + cell(s.file.length > 0) + cell(s.scoped.length > 0) + cell(s.fixed.length > 0) + "</tr>";
      }).join("") + "</tbody></table>";
      const s = strategies(meth.value);
      const results = strat.value === "file" ? s.file : strat.value === "body" ? s.scoped : s.fixed;
      const marks = markResults(results);
      marks.scope = strat.value === "file" ? null : new Set(allNodes(strat.value === "body" ? s.body : s.m, []).map((n) => n.id));
      sx.innerHTML = '<div class="panel-title">' + (strat.value === "file" ? "Whole file searched" : strat.value === "body" ? "Only the body of " + esc(meth.value) + " searched" : "Fixed pattern anchored at " + esc(meth.value)) + "</div>" + sexpView(root, marks);
      scrollToMatch(sx, !!marks.scope);
      const found = results.length > 0;
      const right = found === s.truth;
      verdict.className = "verdict " + (right ? "good" : "bad");
      verdict.innerHTML = "Analysing <code>" + esc(meth.value) + "</code> with the " + { file: "whole-file query", body: "body-scoped query", fixed: "fixed-shape pattern" }[strat.value] + ": <code>divide by zero;" + (found ? "found" : "not-found") + "</code>. " +
        (right ? "Correct." : found ? "<b>False alarm:</b> the match is in another method." : "<b>Missed:</b> the division sits inside an <code>if</code> block, deeper than the fixed shape looks.");
    }
    meth.onchange = update; strat.onchange = update;
    update();
  }

  /* =====================================================================
     LAB 9: folds with different algebras
     ===================================================================== */
  const ALG3 = (a, b, c) => "\\begin{aligned} \\varphi(\\mathtt{Num}\\,n) &= " + a + " \\\\ \\varphi(\\mathtt{Var}\\,x) &= " + b + " \\\\ \\varphi(\\mathtt{Bin}(op, l, r)) &= " + c + " \\end{aligned}";
  const ALGEBRAS = {
    eval: {
      name: "evaluate", tex: ALG3("n", "\\sigma(x)", "l \\mathbin{op} r"),
      num: (n) => n, var: (x, st) => (x in st ? st[x] : "?"),
      bin: (op, l, r) => (l === "?" || r === "?" ? "?" : l === "err" || r === "err" ? "err" : javaOp(op, l, r) === null ? "err" : javaOp(op, l, r)),
      show: (v) => (v === "err" ? "div by 0" : v === "?" ? "unknown" : String(v)),
    },
    size: { name: "size", tex: ALG3("1", "1", "1 + l + r"), num: () => 1, var: () => 1, bin: (op, l, r) => 1 + l + r, show: String },
    depth: { name: "depth", tex: ALG3("1", "1", "1 + \\max(l, r)"), num: () => 1, var: () => 1, bin: (op, l, r) => 1 + Math.max(l, r), show: String },
    pretty: { name: "pretty-print", tex: ALG3("\\text{the digits of } n", "\\text{the name } x", "\\texttt{(} \\cdot l \\cdot op \\cdot r \\cdot \\texttt{)}"), num: (n) => String(n), var: (x) => x, bin: (op, l, r) => "(" + l + op + r + ")", show: String },
    divs: { name: "count divisions", tex: ALG3("0", "0", "[op = /] + l + r"), num: () => 0, var: () => 0, bin: (op, l, r) => (op === "/" ? 1 : 0) + l + r, show: String },
    zero: {
      name: "divides by a literal 0?",
      tex: "\\begin{aligned} A &= \\mathbb{B} \\times \\mathbb{B} \\quad (\\text{is the literal } 0?,\\ \\text{division by a literal } 0 \\text{ found?}) \\\\ \\varphi(\\mathtt{Num}\\,n) &= (n = 0,\\ \\mathit{false}) \\qquad \\varphi(\\mathtt{Var}\\,x) = (\\mathit{false},\\ \\mathit{false}) \\\\ \\varphi(\\mathtt{Bin}(op, (z_1, f_1), (z_2, f_2))) &= (\\mathit{false},\\ f_1 \\lor f_2 \\lor (op = / \\land z_2)) \\end{aligned}",
      num: (n) => [n === 0, false], var: () => [false, false], bin: (op, l, r) => [false, l[1] || r[1] || (op === "/" && r[0])],
      show: (v) => (v[1] ? "found!" : v[0] ? "is 0" : "no"),
    },
  };

  function labFold(el) {
    const { controls, view } = PA.lab(el, {
      title: "One fold, many algebras",
      hint: "The tree is folded bottom-up: every node gets a value computed from its children's values by the chosen algebra. Drag the step slider to watch the values appear in post-order.",
    });
    const input = PA.textInput(controls, { label: "Expression", value: "(x + 2) * (10 / (y - 3))" });
    const store = PA.textInput(controls, { label: "Store σ (for evaluate)", value: "x = 4, y = 3" });
    const alg = PA.select(controls, { label: "Algebra", options: Object.entries(ALGEBRAS).map(([k, a]) => [k, a.name]), value: "eval" });
    const stepS = PA.slider(controls, { label: "Steps shown", min: 0, max: 20, value: 20 });
    const defEl = h("div", { class: "mathbox" });
    const tree = treeBox("Expression tree with folded values");
    const verdict = h("div", { class: "verdict no-math" });
    view.append(defEl, tree.box, verdict);
    function update(full) {
      let a;
      try { a = toAst(parseArith(input.value)); input.bad(false); } catch (e) { input.bad(true); verdict.className = "verdict bad"; verdict.innerHTML = parseErrorHtml(input.value, e); tree.wrap.innerHTML = ""; return; }
      const st = {};
      store.value.split(/[,;]/).forEach((p) => { const m = /^\s*([A-Za-z_]\w*)\s*=\s*(-?\d+)\s*$/.exec(p); if (m) st[m[1]] = parseInt(m[2], 10) | 0; });
      const A = ALGEBRAS[alg.value];
      defEl.innerHTML = PA.tex(A.tex, true);
      const order = [];
      function fold(n) {
        let v;
        if (n.t === "num") v = A.num(n.v);
        else if (n.t === "var") v = A.var(n.x, st);
        else v = A.bin(n.op, fold(n.l), fold(n.r));
        order.push({ n, v });
        return v;
      }
      const result = fold(a);
      const total = order.length;
      stepS.input.max = total;
      if (full === true || stepS.value > total) stepS.set(total);
      const k = Math.min(stepS.value, total);
      const vals = new Map(order.slice(0, k).map((o, i) => [o.n, { v: o.v, i: i + 1 }]));
      const last = k ? order[k - 1].n : null;
      const toTree = (n) => {
        const got = vals.get(n);
        return { label: n.t === "num" ? String(n.v) : n.t === "var" ? n.x : n.op, kind: n.t === "bin" ? "op" : "leaf", cls: (got ? "done" : "") + (n === last ? " cur" : ""), ann: got ? A.show(got.v) : "", badge: got ? String(got.i) : "", children: n.t === "bin" ? [toTree(n.l), toTree(n.r)] : [] };
      };
      tree.wrap.innerHTML = treeSVG(toTree(a), { aria: "folded expression tree" });
      verdict.className = "verdict" + (k === total ? " good" : "");
      verdict.innerHTML = k === total
        ? "<b>Result at the root:</b> " + esc(A.show(result)) + ". The small numbers show the order in which nodes were finished: exactly the post-order."
        : "Step " + k + " of " + total + ": " + (last ? "finished the node <code>" + esc(last.t === "num" ? String(last.v) : last.t === "var" ? last.x : last.op) + "</code> = " + esc(A.show(vals.get(last).v)) + ", using its children's values only." : "nothing computed yet.");
    }
    input.onchange = () => update(true); store.onchange = () => update(true); alg.onchange = () => update(true); stepS.onchange = () => update(false);
    update(true);
  }

  /* =====================================================================
     LAB 10: the course's cursor traversal, step by step
     ===================================================================== */
  function makeTree() {
    const T = (label, ...children) => ({ label, children });
    const root = T("F", T("B", T("A"), T("D", T("C"), T("E"))), T("G", T("I", T("H"))));
    (function link(n, p) { n.parent = p; n.children.forEach((c, i) => { c.idx = i; link(c, n); }); })(root, null);
    return root;
  }
  function labTraverse(el) {
    const { controls, view } = PA.lab(el, {
      title: "Pre or post-order? Step through the cursor",
      hint: "Each Step runs one iteration of the while loop. Nodes yielded at (A) turn violet, nodes yielded at (B) green, and the labels under them (A1, B1, ...) give the order. Compare with the true pre- and post-order, then switch to the fixed version.",
    });
    const ver = PA.seg(controls, { label: "Version", options: [["course", "as in the notes"], ["fixed", "fixed post-order"]], value: "course" });
    const row = PA.btnRow(controls);
    PA.button(row, "Step", () => { stepOnce(); render(); }, "primary");
    PA.button(row, "Run to end", () => { let n = 0; while (!st.done && n++ < 200) stepOnce(); render(); });
    PA.button(row, "Reset", () => { reset(); render(); });
    const tree = treeBox("Tree (cursor highlighted)");
    const info = h("div", { class: "verdict no-math" });
    const lists = h("div", { class: "table-wrap no-math" });
    view.append(tree.box, info, lists);
    const root = makeTree();
    const pre = [], post = [];
    (function w(n) { pre.push(n.label); n.children.forEach(w); post.push(n.label); })(root);
    let st;
    function reset() { st = { cur: root, deeper: true, done: false, A: [], B: [], marks: new Map(), it: 0, last: "Not started." }; }
    function mark(n, s) { st.marks.set(n, (st.marks.get(n) || "") + s); }
    function stepOnce() {
      if (st.done) return;
      st.it++;
      const node = st.cur;
      const firstChild = () => (node.children.length ? node.children[0] : null);
      const nextSib = () => (node.parent && node.idx + 1 < node.parent.children.length ? node.parent.children[node.idx + 1] : null);
      if (ver.value === "course") {
        if (st.deeper) {
          st.A.push(node.label); mark(node, "A" + st.A.length + " ");
          const c = firstChild();
          if (c) { st.cur = c; st.last = "godeeper: yield (A) " + node.label + ", go to first child " + c.label; }
          else { st.deeper = false; st.last = "godeeper: yield (A) " + node.label + "; no child, godeeper = False"; }
        } else if (nextSib()) { st.cur = nextSib(); st.deeper = true; st.last = "next sibling " + st.cur.label + ", godeeper = True"; }
        else if (node.parent) { st.cur = node.parent; st.B.push(node.label); mark(node, "B" + st.B.length + " "); st.deeper = false; st.last = "no sibling: go to parent " + node.parent.label + ", yield (B) node = " + node.label + " (the child we left)"; }
        else { st.done = true; st.last = "no sibling, no parent: break"; }
      } else {
        if (st.deeper) {
          st.A.push(node.label); mark(node, "A" + st.A.length + " ");
          const c = firstChild();
          if (c) { st.cur = c; st.last = "pre: yield " + node.label + ", go to first child " + c.label; }
          else { st.deeper = false; st.last = "pre: yield " + node.label + "; a leaf, so its subtree is finished"; }
        } else {
          st.B.push(node.label); mark(node, "B" + st.B.length + " ");
          if (nextSib()) { st.cur = nextSib(); st.deeper = true; st.last = "post: yield " + node.label + " (subtree finished), go to sibling " + st.cur.label; }
          else if (node.parent) { st.cur = node.parent; st.last = "post: yield " + node.label + " (subtree finished), climb to " + st.cur.label; }
          else { st.done = true; st.last = "post: yield the root " + node.label + "; done"; }
        }
      }
    }
    function render() {
      const toT = (n) => ({ label: n.label, kind: "nt", cls: (n === st.cur && !st.done ? "cur" : "") + ((st.marks.get(n) || "").includes("B") ? " match" : (st.marks.get(n) || "").includes("A") ? " done" : ""), ann: (st.marks.get(n) || "").trim(), children: n.children.map(toT) });
      tree.wrap.innerHTML = treeSVG(toT(root), { aria: "traversal tree" });
      info.className = "verdict" + (st.done ? " good" : "");
      info.innerHTML = "<b>Iteration " + st.it + ":</b> " + esc(st.last) + (st.done ? "" : " &nbsp;(godeeper = " + (st.deeper ? "True" : "False") + ")");
      const eqA = st.A.join() === pre.join(), eqB = st.B.join() === post.join();
      lists.innerHTML = '<table class="dt"><tbody>' +
        '<tr><th>Yields at (A)</th><td class="mono">' + (st.A.join(" ") || "\u00b7") + "</td><td>" + (st.done ? (eqA ? "= pre-order \u2713" : "not pre-order") : "") + "</td></tr>" +
        '<tr><th>Yields at (B)</th><td class="mono">' + (st.B.join(" ") || "\u00b7") + "</td><td>" + (st.done ? (eqB ? "= post-order \u2713" : "<b>not</b> the post-order") : "") + "</td></tr>" +
        '<tr><th>True pre-order</th><td class="mono">' + pre.join(" ") + "</td><td></td></tr>" +
        '<tr><th>True post-order</th><td class="mono">' + post.join(" ") + "</td><td></td></tr></tbody></table>";
    }
    ver.onchange = () => { reset(); render(); };
    reset(); render();
  }

  /* Spread the correct answers over positions A to D. Deterministic, so saved progress stays valid. */
  let qn = 0;
  Object.values(QUIZ).forEach((qs) => qs.forEach((q) => {
    const len = q.options.length, c = q.options.findIndex((o) => o[1]), target = (qn++ * 7 + 2) % len;
    const shift = (c - target + len) % len;
    q.options = q.options.slice(shift).concat(q.options.slice(0, shift));
  }));

  PA.boot("syntactic-analysis", {
    levels: labLevels, andor: labAndOr, derive: labDerive, regexsem: labRegexSem, regexlab: labRegexLab,
    parens: labParens, precedence: labPrecedence, query: labQuery, context: labContext, fold: labFold, traverse: labTraverse,
  }, QUIZ);
})();
