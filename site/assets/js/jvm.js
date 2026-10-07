/* PA Study: a tiny JVM shared by the labs of lectures 3 to 6.
   Programs are written in the simplified bytecode that jvm2json / `jpamb inspect` shows
   (push, load, store, binary, ifz, if, goto, return, get, new, dup, invoke, throw, ...),
   with instruction indices as offsets.

   PA.jvm    programs, a concrete small-step interpreter that names the rule it used, formatting, a listing widget
   PA.sign   the sign lattice (subsets of {-, 0, +}) as 3-bit masks, with the notes' abstract addition

   Simplifications (the same ones the course makes): no long/double, no exceptions other than the
   JPAMB outcomes, `$assertionsDisabled` is always false (assertions are on), constructors do nothing. */
(function () {
  "use strict";
  const PA = (window.PA = window.PA || {});

  /* =====================================================================
     Programs
     ===================================================================== */
  const AE = "java/lang/AssertionError";
  const assertGuard = (skipTo) => ({ op: "get", field: "$assertionsDisabled", static: true, _skip: skipTo });
  const failBlock = () => [
    { op: "new", class: AE },
    { op: "dup" },
    { op: "invoke", access: "special", method: AE + ".<init>:()V", argc: 1, returns: null },
    { op: "throw" },
  ];

  const PROGRAMS = [
    {
      id: "assertFalse", cls: "jpamb.cases.Simple", desc: "()V", params: [], returns: "void",
      java: '@Case("() -> assertion error")\npublic static void assertFalse() {\n  assert false;\n}',
      cases: [["()", "assertion error"]],
      code: [assertGuard(6), { op: "ifz", condition: "ne", target: 6 }, ...failBlock(), { op: "return", type: null }],
    },
    {
      id: "assertBoolean", cls: "jpamb.cases.Simple", desc: "(Z)V", params: [{ name: "shouldFail", type: "boolean" }], returns: "void",
      java: '@Case("(false) -> assertion error")\n@Case("(true) -> ok")\npublic static void assertBoolean(boolean shouldFail) {\n  assert shouldFail;\n}',
      cases: [["(false)", "assertion error"], ["(true)", "ok"]],
      code: [
        assertGuard(8), { op: "ifz", condition: "ne", target: 8 },
        { op: "load", type: "I", index: 0 }, { op: "ifz", condition: "ne", target: 8 },
        ...failBlock(), { op: "return", type: null },
      ],
    },
    {
      id: "assertPositive", cls: "jpamb.cases.Simple", desc: "(I)V", params: [{ name: "num", type: "int" }], returns: "void",
      java: '@Case("(1) -> ok")\n@Case("(0) -> assertion error")\npublic static void assertPositive(int num) {\n  assert num > 0;\n}',
      cases: [["(1)", "ok"], ["(0)", "assertion error"]],
      code: [
        assertGuard(8), { op: "ifz", condition: "ne", target: 8 },
        { op: "load", type: "I", index: 0 }, { op: "ifz", condition: "gt", target: 8 },
        ...failBlock(), { op: "return", type: null },
      ],
    },
    {
      id: "divideByZero", cls: "jpamb.cases.Simple", desc: "()I", params: [], returns: "int",
      java: '@Case("() -> divide by zero")\npublic static int divideByZero() {\n  return 1 / 0;\n}',
      cases: [["()", "divide by zero"]],
      code: [{ op: "push", type: "I", value: 1 }, { op: "push", type: "I", value: 0 }, { op: "binary", type: "I", operant: "div" }, { op: "return", type: "I" }],
    },
    {
      id: "divideByN", cls: "jpamb.cases.Simple", desc: "(I)I", params: [{ name: "n", type: "int" }], returns: "int",
      java: '@Case("(1) -> ok")\n@Case("(0) -> divide by zero")\npublic static int divideByN(int n) {\n  return 1 / n;\n}',
      cases: [["(1)", "ok"], ["(0)", "divide by zero"]],
      code: [{ op: "push", type: "I", value: 1 }, { op: "load", type: "I", index: 0 }, { op: "binary", type: "I", operant: "div" }, { op: "return", type: "I" }],
    },
    {
      id: "checkBeforeDivideByN", cls: "jpamb.cases.Simple", desc: "(I)I", params: [{ name: "n", type: "int" }], returns: "int",
      java: '@Case("(1) -> ok")\n@Case("(0) -> assertion error")\npublic static int checkBeforeDivideByN(int n) {\n  assert n != 0;\n  return 1 / n;\n}',
      cases: [["(1)", "ok"], ["(0)", "assertion error"]],
      code: [
        assertGuard(8), { op: "ifz", condition: "ne", target: 8 },
        { op: "load", type: "I", index: 0 }, { op: "ifz", condition: "ne", target: 8 },
        ...failBlock(),
        { op: "push", type: "I", value: 1 }, { op: "load", type: "I", index: 0 }, { op: "binary", type: "I", operant: "div" }, { op: "return", type: "I" },
      ],
    },
    {
      id: "checkTheWrongThing", cls: "jpamb.cases.Simple", desc: "(I)I", params: [{ name: "a", type: "int" }], returns: "int",
      java: '@Case("(1) -> divide by zero")\n@Case("(0) -> ok")\npublic static int checkTheWrongThing(int a) {\n  if (a != 0) {\n    return a / 0;\n  } else {\n    return 0;\n  }\n}',
      cases: [["(1)", "divide by zero"], ["(0)", "ok"]],
      code: [
        { op: "load", type: "I", index: 0 }, { op: "ifz", condition: "eq", target: 6 },
        { op: "load", type: "I", index: 0 }, { op: "push", type: "I", value: 0 }, { op: "binary", type: "I", operant: "div" }, { op: "return", type: "I" },
        { op: "push", type: "I", value: 0 }, { op: "return", type: "I" },
      ],
    },
    {
      id: "isNotAMillion", cls: "jpamb.cases.Fuzz", desc: "(I)V", params: [{ name: "i", type: "int" }], returns: "void",
      java: '@Case("(1000000) -> assertion error")\n@Case("(0) -> ok")\npublic static void isNotAMillion(int i) {\n  assert i != 1000000;\n}',
      cases: [["(1000000)", "assertion error"], ["(0)", "ok"]],
      code: [
        assertGuard(9), { op: "ifz", condition: "ne", target: 9 },
        { op: "load", type: "I", index: 0 }, { op: "push", type: "I", value: 1000000 }, { op: "if", condition: "ne", target: 9 },
        ...failBlock(), { op: "return", type: null },
      ],
    },
    {
      id: "arraySpellsHello", cls: "jpamb.cases.Arrays", desc: "([C)V", params: [{ name: "array", type: "char[]" }], returns: "void",
      java: '@Case("([C: \'h\',\'e\',\'l\',\'l\',\'o\']) -> ok")\n@Case("([C: \'x\']) -> assertion error")\n@Case("([C: ]) -> out of bounds")\npublic static void arraySpellsHello(char[] array) {\n  assert array[0] == \'h\'\n      && array[1] == \'e\'\n      && array[2] == \'l\'\n      && array[3] == \'l\'\n      && array[4] == \'o\';\n}',
      cases: [["([C: 'h','e','l','l','o'])", "ok"], ["([C: 'x'])", "assertion error"], ["([C: ])", "out of bounds"]],
      code: (function () {
        const c = [assertGuard(31), { op: "ifz", condition: "ne", target: 31 }];
        "hello".split("").forEach((ch, i) => {
          c.push({ op: "load", type: "A", index: 0 }, { op: "push", type: "I", value: i }, { op: "array_load", type: "C" }, { op: "push", type: "I", value: ch.charCodeAt(0), _char: ch });
          c.push(i < 4 ? { op: "if", condition: "ne", target: 27 } : { op: "if", condition: "eq", target: 31 });
        });
        return c.concat(failBlock(), [{ op: "return", type: null }]);
      })(),
    },
    {
      id: "countdown", cls: "jpamb.cases.Loops", desc: "(I)V", params: [{ name: "n", type: "int" }], returns: "void",
      java: '// For n < 0, n-- wraps around after about 4.3 billion\n// steps: far past any step budget, so JPAMB says *.\n@Case("(3) -> ok")\n@Case("(-1) -> *")\npublic static void countdown(int n) {\n  while (n != 0) {\n    n--;\n  }\n}',
      cases: [["(3)", "ok"], ["(-1)", "*"]],
      code: [
        { op: "load", type: "I", index: 0 }, { op: "ifz", condition: "eq", target: 4 },
        { op: "incr", index: 0, amount: -1 }, { op: "goto", target: 0 },
        { op: "return", type: null },
      ],
    },
    {
      id: "collatz", cls: "jpamb.cases.Loops", desc: "(I)V", params: [{ name: "n", type: "int" }], returns: "void",
      java: '// Does this halt for every n > 0? Nobody knows (the Collatz conjecture).\npublic static void collatz(int n) {\n  while (n != 1) {\n    if (n % 2 == 0) n = n / 2;\n    else n = 3 * n + 1;\n  }\n}',
      cases: [["(6)", "ok"], ["(0)", "*"]],
      code: [
        { op: "load", type: "I", index: 0 }, { op: "push", type: "I", value: 1 }, { op: "if", condition: "eq", target: 19 },
        { op: "load", type: "I", index: 0 }, { op: "push", type: "I", value: 2 }, { op: "binary", type: "I", operant: "rem" }, { op: "ifz", condition: "ne", target: 12 },
        { op: "load", type: "I", index: 0 }, { op: "push", type: "I", value: 2 }, { op: "binary", type: "I", operant: "div" }, { op: "store", type: "I", index: 0 }, { op: "goto", target: 0 },
        { op: "push", type: "I", value: 3 }, { op: "load", type: "I", index: 0 }, { op: "binary", type: "I", operant: "mul" }, { op: "push", type: "I", value: 1 }, { op: "binary", type: "I", operant: "add" }, { op: "store", type: "I", index: 0 }, { op: "goto", target: 0 },
        { op: "return", type: null },
      ],
    },
    {
      id: "sumTo", cls: "jpamb.cases.Loops", desc: "(I)I", params: [{ name: "n", type: "int" }], returns: "int",
      java: 'public static int sumTo(int n) {\n  int s = 0;\n  for (int i = 0; i < n; i++) {\n    s += i;\n  }\n  return s;\n}',
      cases: [["(4)", "ok"], ["(0)", "ok"]],
      code: [
        { op: "push", type: "I", value: 0 }, { op: "store", type: "I", index: 1 },
        { op: "push", type: "I", value: 0 }, { op: "store", type: "I", index: 2 },
        { op: "load", type: "I", index: 2 }, { op: "load", type: "I", index: 0 }, { op: "if", condition: "ge", target: 13 },
        { op: "load", type: "I", index: 1 }, { op: "load", type: "I", index: 2 }, { op: "binary", type: "I", operant: "add" }, { op: "store", type: "I", index: 1 },
        { op: "incr", index: 2, amount: 1 }, { op: "goto", target: 4 },
        { op: "load", type: "I", index: 1 }, { op: "return", type: "I" },
      ],
    },
    {
      id: "factorial", cls: "jpamb.cases.Calls", desc: "(I)I", params: [{ name: "n", type: "int" }], returns: "int",
      java: 'public static int factorial(int n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}',
      cases: [["(3)", "ok"], ["(0)", "ok"]],
      code: [
        { op: "load", type: "I", index: 0 }, { op: "push", type: "I", value: 1 }, { op: "if", condition: "gt", target: 5 },
        { op: "push", type: "I", value: 1 }, { op: "return", type: "I" },
        { op: "load", type: "I", index: 0 }, { op: "load", type: "I", index: 0 }, { op: "push", type: "I", value: 1 }, { op: "binary", type: "I", operant: "sub" },
        { op: "invoke", access: "static", method: "jpamb.cases.Calls.factorial:(I)I", target: "factorial", argc: 1, returns: "int" },
        { op: "binary", type: "I", operant: "mul" }, { op: "return", type: "I" },
      ],
    },
    {
      id: "divideAfterCheck", cls: "jpamb.cases.Signs", desc: "(I)I", params: [{ name: "x", type: "int" }], returns: "int",
      java: 'public static int divideAfterCheck(int x) {\n  if (x > 0) {\n    return 100 / x;\n  }\n  return 0;\n}',
      cases: [["(5)", "ok"], ["(0)", "ok"]],
      code: [
        { op: "load", type: "I", index: 0 }, { op: "ifz", condition: "le", target: 6 },
        { op: "push", type: "I", value: 100 }, { op: "load", type: "I", index: 0 }, { op: "binary", type: "I", operant: "div" }, { op: "return", type: "I" },
        { op: "push", type: "I", value: 0 }, { op: "return", type: "I" },
      ],
    },
    {
      id: "copyThenDivide", cls: "jpamb.cases.Signs", desc: "(I)I", params: [{ name: "x", type: "int" }], returns: "int",
      java: 'public static int copyThenDivide(int x) {\n  int y = x;\n  if (x > 0) {\n    return 10 / y;\n  }\n  return 0;\n}',
      cases: [["(5)", "ok"], ["(0)", "ok"]],
      code: [
        { op: "load", type: "I", index: 0 }, { op: "store", type: "I", index: 1 },
        { op: "load", type: "I", index: 0 }, { op: "ifz", condition: "le", target: 8 },
        { op: "push", type: "I", value: 10 }, { op: "load", type: "I", index: 1 }, { op: "binary", type: "I", operant: "div" }, { op: "return", type: "I" },
        { op: "push", type: "I", value: 0 }, { op: "return", type: "I" },
      ],
    },
    {
      id: "plusOneDivide", cls: "jpamb.cases.Signs", desc: "(I)I", params: [{ name: "x", type: "int" }], returns: "int",
      java: 'public static int plusOneDivide(int x) {\n  if (x > -1) {\n    return 100 / (x + 1);\n  }\n  return 0;\n}',
      cases: [["(0)", "ok"], ["(-5)", "ok"]],
      code: [
        { op: "load", type: "I", index: 0 }, { op: "push", type: "I", value: -1 }, { op: "if", condition: "le", target: 9 },
        { op: "push", type: "I", value: 100 }, { op: "load", type: "I", index: 0 }, { op: "push", type: "I", value: 1 }, { op: "binary", type: "I", operant: "add" }, { op: "binary", type: "I", operant: "div" }, { op: "return", type: "I" },
        { op: "push", type: "I", value: 0 }, { op: "return", type: "I" },
      ],
    },
    {
      id: "infiniteLoop", cls: "jpamb.cases.Loops", desc: "()V", params: [], returns: "void",
      java: '@Case("() -> *")\npublic static void infiniteLoop() {\n  while (true) { }\n}',
      cases: [["()", "*"]],
      code: [{ op: "goto", target: 0 }],
    },
  ];
  const BY_ID = {};
  PROGRAMS.forEach((p) => {
    p.code.forEach((ins) => delete ins._skip);
    p.name = p.id;
    p.methodId = p.cls + "." + p.id + ":" + p.desc;
    BY_ID[p.id] = p;
  });

  /* =====================================================================
     Values and formatting
     ===================================================================== */
  const int = (v) => ({ t: "int", v: v | 0 });
  const ref = (r) => ({ t: "ref", v: r });

  function fmtVal(v) {
    if (v == null) return "·";
    if (v.t === "int") return "(int " + v.v + ")";
    if (v.t === "ref") return v.v == null ? "null" : "(ref " + v.v + ")";
    return String(v);
  }
  function fmtStack(st) {
    return st.length ? "ε" + st.map(fmtVal).join("") : "ε";
  }
  function fmtHeapObj(o) {
    if (!o) return "·";
    if (o.kind === "array") return "(array " + o.type + " [" + o.items.map((c) => (o.type === "char" ? "'" + String.fromCharCode(c) + "'" : c)).join(", ") + "])";
    if (o.kind === "object") return "(object " + o.cls.split("/").pop() + ")";
    return "?";
  }
  const COND_SYM = { eq: "=", ne: "≠", lt: "<", ge: "≥", gt: ">", le: "≤" };
  const COND_TEX = { eq: "=", ne: "\\neq", lt: "<", ge: "\\geq", gt: ">", le: "\\leq" };
  const NEG_COND = { eq: "ne", ne: "eq", lt: "ge", ge: "lt", gt: "le", le: "gt" };

  function fmtIns(ins) {
    switch (ins.op) {
      case "push": return "push:" + ins.type + " " + ins.value + (ins._char ? "  ('" + ins._char + "')" : "");
      case "load": return "load:" + ins.type + " " + ins.index;
      case "store": return "store:" + ins.type + " " + ins.index;
      case "binary": return "binary:" + ins.type + " " + ins.operant;
      case "negate": return "negate:" + ins.type;
      case "incr": return "incr " + ins.index + " by " + ins.amount;
      case "ifz": return "ifz " + ins.condition + " " + ins.target;
      case "if": return "if " + ins.condition + " " + ins.target;
      case "goto": return "goto " + ins.target;
      case "return": return ins.type ? "return:" + ins.type : "return";
      case "get": return "get static " + ins.field;
      case "new": return "new " + ins.class;
      case "dup": return "dup";
      case "invoke": return "invoke " + ins.access + " " + (ins.access === "special" ? ins.method.replace("java/lang/", "") : ins.method.split(".").slice(-1)[0]);
      case "throw": return "throw";
      case "arraylength": return "arraylength";
      case "array_load": return "array_load:" + ins.type;
      default: return ins.op;
    }
  }

  /* =====================================================================
     Concrete semantics:  bc |- <eta, mu> -> <eta', mu'>  |  ok  |  err('...')
     ===================================================================== */
  function clone(state) {
    return {
      heap: state.heap.map((o) => (o.kind === "array" ? { kind: "array", type: o.type, items: o.items.slice() } : Object.assign({}, o))),
      frames: state.frames.map((f) => ({ locals: f.locals.slice(), stack: f.stack.slice(), pc: { prog: f.pc.prog, off: f.pc.off } })),
    };
  }

  /* args: JS values. int -> number, boolean -> true/false, char[] -> string (or array of char codes, or null). */
  function initState(prog, args) {
    if (typeof prog === "string") prog = BY_ID[prog];
    const heap = [];
    const locals = prog.params.map((p, i) => {
      const a = args ? args[i] : undefined;
      if (p.type === "int") return int(a == null ? 0 : a);
      if (p.type === "boolean") return int(a ? 1 : 0);
      if (p.type === "char[]" || p.type === "int[]") {
        if (a === null) return ref(null);
        const items = typeof a === "string" ? a.split("").map((c) => c.charCodeAt(0)) : (a || []).slice();
        heap.push({ kind: "array", type: p.type === "char[]" ? "char" : "int", items });
        return ref(heap.length - 1);
      }
      return int(0);
    });
    return { heap, frames: [{ locals, stack: [], pc: { prog: prog.id, off: 0 } }] };
  }

  function cmp(c, a, b) {
    switch (c) {
      case "eq": return a === b;
      case "ne": return a !== b;
      case "lt": return a < b;
      case "ge": return a >= b;
      case "gt": return a > b;
      case "le": return a <= b;
    }
    throw new Error("bad condition " + c);
  }
  function arith(op, a, b) {
    switch (op) {
      case "add": return (a + b) | 0;
      case "sub": return (a - b) | 0;
      case "mul": return Math.imul(a, b);
      case "div": return b === 0 ? "divide by zero" : (a / b) | 0;
      case "rem": return b === 0 ? "divide by zero" : (a % b) | 0;
    }
    throw new Error("bad operant " + op);
  }

  /* One small step. Returns { state, outcome, rule, note }.
     state is a fresh copy (the input is never mutated); outcome is null while running,
     otherwise "ok" | "assertion error" | "divide by zero" | "out of bounds" | "null pointer". */
  function step(state) {
    const s = clone(state);
    const f = s.frames[s.frames.length - 1];
    const prog = BY_ID[f.pc.prog];
    const ins = prog.code[f.pc.off];
    if (!ins) throw new Error("pc out of code: " + f.pc.prog + ":" + f.pc.off);
    const out = (o, rule, note) => ({ state: s, outcome: o, rule, note });
    const next = (rule, note) => ({ state: s, outcome: null, rule, note });
    switch (ins.op) {
      case "push":
        f.stack.push(int(ins.value)); f.pc.off++;
        return next("push", "push (int " + ins.value + ")");
      case "load": {
        const v = f.locals[ins.index];
        f.stack.push(v); f.pc.off++;
        return next(ins.type === "A" ? "loadA" : "load", "load λ[" + ins.index + "] = " + fmtVal(v));
      }
      case "store": {
        const v = f.stack.pop();
        f.locals[ins.index] = v; f.pc.off++;
        return next("store", "store " + fmtVal(v) + " into λ[" + ins.index + "]");
      }
      case "incr": {
        const v = f.locals[ins.index];
        f.locals[ins.index] = int(v.v + ins.amount); f.pc.off++;
        return next("incr", "λ[" + ins.index + "] := " + v.v + " + " + ins.amount);
      }
      case "negate": {
        const v = f.stack.pop();
        f.stack.push(int(-v.v)); f.pc.off++;
        return next("negate", "negate " + v.v);
      }
      case "binary": {
        const b = f.stack.pop(), a = f.stack.pop();
        const r = arith(ins.operant, a.v, b.v);
        if (typeof r === "string") return out(r, ins.operant === "div" ? "bdivZero" : "bremZero", a.v + " " + ins.operant + " 0");
        f.stack.push(int(r)); f.pc.off++;
        return next("binary", a.v + " " + ins.operant + " " + b.v + " = " + r);
      }
      case "ifz": {
        const v = f.stack.pop();
        const taken = cmp(ins.condition, v.v, 0);
        if (taken) f.pc.off = ins.target; else f.pc.off++;
        return next(taken ? "ifzT" : "ifzF", v.v + " " + COND_SYM[ins.condition] + " 0 is " + taken + (taken ? ", jump to " + ins.target : ", fall through"));
      }
      case "if": {
        const b = f.stack.pop(), a = f.stack.pop();
        const taken = cmp(ins.condition, a.v, b.v);
        if (taken) f.pc.off = ins.target; else f.pc.off++;
        return next(taken ? "ifT" : "ifF", a.v + " " + COND_SYM[ins.condition] + " " + b.v + " is " + taken + (taken ? ", jump to " + ins.target : ", fall through"));
      }
      case "goto":
        f.pc.off = ins.target;
        return next("goto", "jump to " + ins.target);
      case "get":
        f.stack.push(int(0)); f.pc.off++;
        return next("get", "$assertionsDisabled is false, push (int 0)");
      case "new":
        s.heap.push({ kind: "object", cls: ins.class });
        f.stack.push(ref(s.heap.length - 1)); f.pc.off++;
        return next("new", "allocate " + ins.class.split("/").pop() + " at heap location " + (s.heap.length - 1));
      case "dup": {
        const v = f.stack[f.stack.length - 1];
        f.stack.push(v); f.pc.off++;
        return next("dup", "duplicate " + fmtVal(v));
      }
      case "invoke": {
        if (ins.access === "special") {
          f.stack.pop(); f.pc.off++;
          return next("init", "run the (empty) constructor");
        }
        const callee = BY_ID[ins.target];
        const args = f.stack.splice(f.stack.length - ins.argc, ins.argc);
        s.frames.push({ locals: args, stack: [], pc: { prog: callee.id, off: 0 } });
        return next("invoke", "call " + callee.id + "(" + args.map((a) => a.v).join(", ") + "), push a new frame");
      }
      case "throw": {
        const r = f.stack.pop();
        if (r.v == null) return out("null pointer", "throwNull", "throw null");
        const o = s.heap[r.v];
        return out(o.cls === AE ? "assertion error" : "error", "throw", "throw " + o.cls.split("/").pop());
      }
      case "return": {
        const v = ins.type ? f.stack.pop() : null;
        s.frames.pop();
        if (!s.frames.length) return out("ok", ins.type ? "returnEps" : "returnVEps", "return from the last frame" + (v ? " with " + fmtVal(v) : ""));
        const g = s.frames[s.frames.length - 1];
        if (v) g.stack.push(v);
        g.pc.off++;
        return next(ins.type ? "returnMu" : "returnVMu", "return " + (v ? fmtVal(v) + " " : "") + "to the caller");
      }
      case "arraylength": {
        const r = f.stack.pop();
        if (r.v == null) return out("null pointer", "alenNull", "arraylength of null");
        f.stack.push(int(s.heap[r.v].items.length)); f.pc.off++;
        return next("alen", "length " + s.heap[r.v].items.length);
      }
      case "array_load": {
        const i = f.stack.pop(), r = f.stack.pop();
        if (r.v == null) return out("null pointer", "aloadNull", "load from null");
        const arr = s.heap[r.v];
        if (i.v < 0 || i.v >= arr.items.length) return out("out of bounds", "aloadOOB", "index " + i.v + " not in [0, " + arr.items.length + ")");
        f.stack.push(int(arr.items[i.v])); f.pc.off++;
        return next("aload", "a[" + i.v + "] = " + arr.items[i.v] + (arr.type === "char" ? " ('" + String.fromCharCode(arr.items[i.v]) + "')" : ""));
      }
    }
    throw new Error("unknown instruction " + ins.op);
  }

  /* Run to completion or until maxSteps.  outcome "*" means the step budget ran out.
     opts.keep: keep every state (for traces).  Coverage is the set of "progId:off" executed. */
  function run(prog, args, opts) {
    opts = opts || {};
    const max = opts.maxSteps || 1000;
    if (typeof prog === "string") prog = BY_ID[prog];
    let st = initState(prog, args);
    const states = opts.keep ? [st] : null;
    const steps = [];
    const cov = new Set();
    const path = [];
    for (let n = 0; n < max; n++) {
      const f = st.frames[st.frames.length - 1];
      const key = f.pc.prog + ":" + f.pc.off;
      cov.add(key);
      if (f.pc.prog === prog.id) path.push(f.pc.off);
      const r = step(st);
      if (opts.keep) steps.push({ rule: r.rule, note: r.note, pc: { prog: f.pc.prog, off: f.pc.off } });
      if (r.outcome) {
        if (states) states.push(r.outcome);
        return { outcome: r.outcome, steps: n + 1, states, log: steps, coverage: cov, path };
      }
      st = r.state;
      if (states) states.push(st);
    }
    return { outcome: "*", steps: max, states, log: steps, coverage: cov, path };
  }

  /* Parse a JPAMB-style input such as "(1)", "(false)", "(-3, true)", "([C: 'h','i'])", "([C: ])". */
  function parseInput(prog, text) {
    if (typeof prog === "string") prog = BY_ID[prog];
    let t = String(text).trim();
    if (t.startsWith("(") && t.endsWith(")")) t = t.slice(1, -1);
    const parts = [];
    let depth = 0, cur = "";
    for (const ch of t) {
      if (ch === "[") depth++;
      if (ch === "]") depth--;
      if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; } else cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    return prog.params.map((p, i) => {
      const s = parts[i];
      if (s == null) throw new Error("missing argument " + p.name);
      if (p.type === "int") { if (!/^-?\d+$/.test(s)) throw new Error(p.name + " must be an int"); return parseInt(s, 10); }
      if (p.type === "boolean") { if (s !== "true" && s !== "false") throw new Error(p.name + " must be true or false"); return s === "true"; }
      if (s === "null") return null;
      const m = /^\[([CI]):\s*(.*)\]$/.exec(s);
      if (!m) throw new Error(p.name + " must look like [C: 'a','b']");
      const body = m[2].trim();
      if (!body) return [];
      return body.split(",").map((x) => {
        x = x.trim();
        if (m[1] === "C") { const mm = /^'(.)'$/.exec(x); if (!mm) throw new Error("bad char " + x); return mm[1].charCodeAt(0); }
        return parseInt(x, 10);
      });
    });
  }

  /* =====================================================================
     Formal rules (KaTeX), keyed by the rule names step() returns
     ===================================================================== */
  const fr = (l, s, i) => "\\langle " + l + ", " + s + ", " + i + " \\rangle";
  const ins = (s) => "\\bc[\\iota] = (\\mathtt{" + s + "})";
  const I_ = (x) => "(\\mathtt{int}\\ " + x + ")";
  const R_ = (x) => "(\\mathtt{ref}\\ " + x + ")";
  const RULES = {
    push: { name: "push_I", tex: "\\frac{" + ins("push{:}I}\\ v\\mathtt{") + "}{\\bc \\vdash " + fr("\\lambda", "\\sigma", "\\iota") + " \\to " + fr("\\lambda", "\\sigma" + I_("v"), "\\iota + 1") + "}\\rulename{push_I}" },
    load: { name: "load_I", tex: "\\frac{" + ins("load{:}I}\\ n\\mathtt{") + " \\quad " + I_("v") + " = \\lambda[n]}{\\bc \\vdash " + fr("\\lambda", "\\sigma", "\\iota") + " \\to " + fr("\\lambda", "\\sigma" + I_("v"), "\\iota + 1") + "}\\rulename{load_I}" },
    loadA: { name: "load_A", tex: "\\frac{" + ins("load{:}A}\\ n\\mathtt{") + " \\quad " + R_("r") + " = \\lambda[n]}{\\bc \\vdash " + fr("\\lambda", "\\sigma", "\\iota") + " \\to " + fr("\\lambda", "\\sigma" + R_("r"), "\\iota + 1") + "}\\rulename{load_A}" },
    store: { name: "store_I", tex: "\\frac{" + ins("store{:}I}\\ n\\mathtt{") + "}{\\bc \\vdash " + fr("\\lambda", "\\sigma" + I_("v"), "\\iota") + " \\to " + fr("\\lambda[n \\mapsto " + I_("v") + "]", "\\sigma", "\\iota + 1") + "}\\rulename{store_I}" },
    incr: { name: "incr", tex: "\\frac{" + ins("incr}\\ n\\ c\\mathtt{") + " \\quad " + I_("v") + " = \\lambda[n]}{\\bc \\vdash " + fr("\\lambda", "\\sigma", "\\iota") + " \\to " + fr("\\lambda[n \\mapsto " + I_("v +_{i32} c") + "]", "\\sigma", "\\iota + 1") + "}\\rulename{incr}" },
    negate: { name: "negate_I", tex: "\\frac{" + ins("negate{:}I") + "}{\\bc \\vdash " + fr("\\lambda", "\\sigma" + I_("v"), "\\iota") + " \\to " + fr("\\lambda", "\\sigma" + I_("-_{i32} v"), "\\iota + 1") + "}\\rulename{negate_I}" },
    binary: { name: "binary_I", tex: "\\frac{" + ins("binary{:}I}\\ \\mathit{op}\\mathtt{") + " \\quad v_3 = v_1 \\mathbin{\\mathit{op}_{i32}} v_2}{\\bc \\vdash " + fr("\\lambda", "\\sigma" + I_("v_1") + I_("v_2"), "\\iota") + " \\to " + fr("\\lambda", "\\sigma" + I_("v_3"), "\\iota + 1") + "}\\rulename{binary_I}" },
    bdivZero: { name: "bdiv_{I0}", tex: "\\frac{" + ins("binary{:}I\\ div") + " \\quad v_2 = 0}{\\bc \\vdash " + fr("\\lambda", "\\sigma" + I_("v_1") + I_("v_2"), "\\iota") + " \\to \\err(\\text{`divide by zero'})}\\rulename{bdiv_{I0}}" },
    bremZero: { name: "brem_{I0}", tex: "\\frac{" + ins("binary{:}I\\ rem") + " \\quad v_2 = 0}{\\bc \\vdash " + fr("\\lambda", "\\sigma" + I_("v_1") + I_("v_2"), "\\iota") + " \\to \\err(\\text{`divide by zero'})}\\rulename{brem_{I0}}" },
    ifzT: { name: "ifz_1", tex: "\\frac{" + ins("ifz}\\ c\\ t\\mathtt{") + " \\quad v \\mathrel{c} 0}{\\bc \\vdash " + fr("\\lambda", "\\sigma" + I_("v"), "\\iota") + " \\to " + fr("\\lambda", "\\sigma", "\\iota \\leftarrow t") + "}\\rulename{ifz_1}" },
    ifzF: { name: "ifz_2", tex: "\\frac{" + ins("ifz}\\ c\\ t\\mathtt{") + " \\quad \\neg(v \\mathrel{c} 0)}{\\bc \\vdash " + fr("\\lambda", "\\sigma" + I_("v"), "\\iota") + " \\to " + fr("\\lambda", "\\sigma", "\\iota + 1") + "}\\rulename{ifz_2}" },
    ifT: { name: "if_1", tex: "\\frac{" + ins("if}\\ c\\ t\\mathtt{") + " \\quad v_1 \\mathrel{c} v_2}{\\bc \\vdash " + fr("\\lambda", "\\sigma" + I_("v_1") + I_("v_2"), "\\iota") + " \\to " + fr("\\lambda", "\\sigma", "\\iota \\leftarrow t") + "}\\rulename{if_1}" },
    ifF: { name: "if_2", tex: "\\frac{" + ins("if}\\ c\\ t\\mathtt{") + " \\quad \\neg(v_1 \\mathrel{c} v_2)}{\\bc \\vdash " + fr("\\lambda", "\\sigma" + I_("v_1") + I_("v_2"), "\\iota") + " \\to " + fr("\\lambda", "\\sigma", "\\iota + 1") + "}\\rulename{if_2}" },
    goto: { name: "goto", tex: "\\frac{" + ins("goto}\\ t\\mathtt{") + "}{\\bc \\vdash " + fr("\\lambda", "\\sigma", "\\iota") + " \\to " + fr("\\lambda", "\\sigma", "\\iota \\leftarrow t") + "}\\rulename{goto}" },
    get: { name: "get", tex: "\\frac{" + ins("get\\ static\\ \\$assertionsDisabled") + "}{\\bc \\vdash " + fr("\\lambda", "\\sigma", "\\iota") + " \\to " + fr("\\lambda", "\\sigma" + I_("0"), "\\iota + 1") + "}\\rulename{get}" },
    new: { name: "new", tex: "\\frac{" + ins("new}\\ C\\mathtt{") + " \\quad r \\notin \\operatorname{dom}(\\eta)}{\\bc \\vdash \\langle \\eta, \\mu" + fr("\\lambda", "\\sigma", "\\iota") + "\\rangle \\to \\langle \\eta[r \\mapsto (\\mathtt{object}\\ C)], \\mu" + fr("\\lambda", "\\sigma" + R_("r"), "\\iota + 1") + "\\rangle}\\rulename{new}" },
    dup: { name: "dup", tex: "\\frac{" + ins("dup") + "}{\\bc \\vdash " + fr("\\lambda", "\\sigma\\, v", "\\iota") + " \\to " + fr("\\lambda", "\\sigma\\, v\\, v", "\\iota + 1") + "}\\rulename{dup}" },
    init: { name: "init", tex: "\\frac{" + ins("invoke\\ special}\\ C.\\langle\\mathit{init}\\rangle\\mathtt{") + "}{\\bc \\vdash " + fr("\\lambda", "\\sigma" + R_("r"), "\\iota") + " \\to " + fr("\\lambda", "\\sigma", "\\iota + 1") + "}\\rulename{init}" },
    invoke: { name: "invoke", tex: "\\frac{" + ins("invoke\\ static}\\ m\\mathtt{") + " \\quad m \\text{ takes } k \\text{ arguments}}{\\bc \\vdash \\langle \\eta, \\mu" + fr("\\lambda", "\\sigma\\, v_1 \\cdots v_k", "\\iota") + "\\rangle \\to \\langle \\eta, \\mu" + fr("\\lambda", "\\sigma", "\\iota") + fr("[v_1, \\ldots, v_k]", "\\epsilon", "\\langle m, 0 \\rangle") + "\\rangle}\\rulename{invoke}" },
    throw: { name: "throw", tex: "\\frac{" + ins("throw") + " \\quad \\eta(r) = (\\mathtt{object}\\ \\mathtt{AssertionError})}{\\bc \\vdash \\langle \\eta, \\mu" + fr("\\lambda", "\\sigma" + R_("r"), "\\iota") + "\\rangle \\to \\err(\\text{`assertion error'})}\\rulename{throw}" },
    throwNull: { name: "throw_{null}", tex: "\\frac{" + ins("throw") + "}{\\bc \\vdash " + fr("\\lambda", "\\sigma\\,\\mathtt{null}", "\\iota") + " \\to \\err(\\text{`null pointer'})}\\rulename{throw_{null}}" },
    returnEps: { name: "return_\\epsilon", tex: "\\frac{" + ins("return{:}I") + "}{\\bc \\vdash \\langle \\eta, \\epsilon" + fr("\\lambda", "\\sigma" + I_("v"), "\\iota") + "\\rangle \\to \\ok}\\rulename{return_\\epsilon}" },
    returnVEps: { name: "return_\\epsilon", tex: "\\frac{" + ins("return") + "}{\\bc \\vdash \\langle \\eta, \\epsilon" + fr("\\lambda", "\\sigma", "\\iota") + "\\rangle \\to \\ok}\\rulename{return_\\epsilon}" },
    returnMu: { name: "return_\\mu", tex: "\\frac{" + ins("return{:}I") + "}{\\bc \\vdash \\langle \\eta, \\mu" + fr("\\lambda_2", "\\sigma_2", "\\iota_2") + fr("\\lambda", "\\sigma" + I_("v"), "\\iota") + "\\rangle \\to \\langle \\eta, \\mu" + fr("\\lambda_2", "\\sigma_2" + I_("v"), "\\iota_2 + 1") + "\\rangle}\\rulename{return_\\mu}" },
    returnVMu: { name: "return_\\mu", tex: "\\frac{" + ins("return") + "}{\\bc \\vdash \\langle \\eta, \\mu" + fr("\\lambda_2", "\\sigma_2", "\\iota_2") + fr("\\lambda", "\\sigma", "\\iota") + "\\rangle \\to \\langle \\eta, \\mu" + fr("\\lambda_2", "\\sigma_2", "\\iota_2 + 1") + "\\rangle}\\rulename{return_\\mu}" },
    alen: { name: "arraylength", tex: "\\frac{" + ins("arraylength") + " \\quad \\eta(r) = (\\mathtt{array}\\ t\\ a)}{\\bc \\vdash " + fr("\\lambda", "\\sigma" + R_("r"), "\\iota") + " \\to " + fr("\\lambda", "\\sigma" + I_("|a|"), "\\iota + 1") + "}\\rulename{arraylength}" },
    alenNull: { name: "arraylength_{null}", tex: "\\frac{" + ins("arraylength") + "}{\\bc \\vdash " + fr("\\lambda", "\\sigma\\,\\mathtt{null}", "\\iota") + " \\to \\err(\\text{`null pointer'})}\\rulename{arraylength_{null}}" },
    aload: { name: "array\\_load", tex: "\\frac{" + ins("array\\_load{:}C") + " \\quad \\eta(r) = (\\mathtt{array}\\ t\\ a) \\quad 0 \\leq i < |a|}{\\bc \\vdash " + fr("\\lambda", "\\sigma" + R_("r") + I_("i"), "\\iota") + " \\to " + fr("\\lambda", "\\sigma" + I_("a[i]"), "\\iota + 1") + "}\\rulename{aload}" },
    aloadOOB: { name: "array\\_load_{oob}", tex: "\\frac{" + ins("array\\_load{:}C") + " \\quad \\eta(r) = (\\mathtt{array}\\ t\\ a) \\quad i \\notin [0, |a|)}{\\bc \\vdash " + fr("\\lambda", "\\sigma" + R_("r") + I_("i"), "\\iota") + " \\to \\err(\\text{`out of bounds'})}\\rulename{aload_{oob}}" },
    aloadNull: { name: "array\\_load_{null}", tex: "\\frac{" + ins("array\\_load{:}C") + "}{\\bc \\vdash " + fr("\\lambda", "\\sigma\\,\\mathtt{null}" + I_("i"), "\\iota") + " \\to \\err(\\text{`null pointer'})}\\rulename{aload_{null}}" },
  };

  /* =====================================================================
     Listing widget
     ===================================================================== */
  function listing(prog, opts) {
    if (typeof prog === "string") prog = BY_ID[prog];
    opts = opts || {};
    const h = PA.h;
    const ol = h("ol");
    const rows = prog.code.map((insn, i) => {
      const ann = h("span", { class: "ann" });
      const li = h("li", { "data-off": i }, [h("span", { class: "ix", text: String(i) }), h("span", { class: "ins", text: fmtIns(insn) }), ann]);
      li._ann = ann;
      ol.append(li);
      return li;
    });
    const el = h("div", { class: "listing no-math" }, [opts.title === false ? null : h("div", { class: "listing-title", text: opts.title || prog.methodId }), ol]);
    return {
      el, rows,
      /* m: { cur, cov:Set<int>, err, hot:Set<int>, dead:Set<int>, ann:{off:text} } */
      mark(m) {
        m = m || {};
        rows.forEach((li, i) => {
          li.className = [
            m.cov && m.cov.has(i) ? "cov" : "",
            m.hot && m.hot.has(i) ? "hot" : "",
            m.dead && m.dead.has(i) ? "dead" : "",
            m.err === i ? "err-at" : "",
            m.cur === i ? "cur" : "",
          ].filter(Boolean).join(" ");
          li._ann.textContent = m.ann && m.ann[i] != null ? m.ann[i] : "";
        });
      },
    };
  }

  PA.jvm = {
    programs: PROGRAMS, get: (id) => BY_ID[id], byId: BY_ID,
    int, ref, initState, step, run, parseInput, clone,
    fmtVal, fmtStack, fmtIns, fmtHeapObj, COND_SYM, COND_TEX, NEG_COND,
    rules: RULES, listing, cmp, arith,
    OUTCOMES: ["ok", "divide by zero", "assertion error", "out of bounds", "null pointer", "*"],
  };

  /* =====================================================================
     The sign lattice  (2^{-,0,+}, subseteq)  as bitmasks: - = 1, 0 = 2, + = 4
     ===================================================================== */
  const NEG = 1, ZERO = 2, POS = 4, TOP = 7, BOT = 0;
  const SIGNS = [NEG, ZERO, POS];
  const SYM = { 1: "−", 2: "0", 4: "+" };
  const of = (n) => (n < 0 ? NEG : n === 0 ? ZERO : POS);
  const each = (m) => SIGNS.filter((s) => m & s);
  function lift(table) { // table(s, t) -> mask, for single signs s, t
    return (a, b) => { let r = 0; each(a).forEach((s) => each(b).forEach((t) => { r |= table(s, t); })); return r; };
  }
  const addT = (s, t) => (s === ZERO ? t : t === ZERO ? s : s === t ? s : TOP);
  const neg = (m) => ((m & NEG) ? POS : 0) | (m & ZERO) | ((m & POS) ? NEG : 0);
  function fmtSign(m) {
    if (m === BOT) return "∅";
    return "{" + each(m).map((s) => SYM[s]).join(", ") + "}";
  }
  function texSign(m) {
    if (m === BOT) return "\\emptyset";
    return "\\{" + each(m).map((s) => (s === NEG ? "-" : s === ZERO ? "0" : "+")).join(", ") + "\\}";
  }
  PA.sign = {
    NEG, ZERO, POS, TOP, BOT, SIGNS, of, each,
    abstract: (nums) => { let m = 0; for (const n of nums) m |= of(n); return m; },
    contains: (m, n) => !!(m & of(n)),
    join: (a, b) => a | b, meet: (a, b) => a & b, leq: (a, b) => (a & ~b) === 0,
    add: lift(addT), neg,
    fmt: fmtSign, tex: texSign,
    ALL: [0, 1, 2, 4, 3, 5, 6, 7],
  };
})();
