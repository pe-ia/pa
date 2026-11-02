/* Week 9, Context Sensitive Analysis: example programs with method calls, a bytecode in-liner, an
   interval analysis that handles calls with k-limited call-string contexts (k = 0 is one shared copy
   of each method, k = Infinity is the full call stack), the quiz bank and the labs.
   The labs compute with intervals (Week 6); signs are only read off the intervals for display. */
(function () {
  "use strict";
  const h = PA.h;
  const J = PA.jvm;
  const S = PA.sign;
  const esc = PA.esc;
  const INF = Infinity;

  /* =====================================================================
     Example programs. Every method is registered next to the shared ones, so the
     concrete interpreter in jvm.js can run them too.
     ===================================================================== */
  const L = (i) => ({ op: "load", type: "I", index: i });
  const P = (v) => ({ op: "push", type: "I", value: v });
  const B = (o) => ({ op: "binary", type: "I", operant: o });
  const R = () => ({ op: "return", type: "I" });
  const ST = (i) => ({ op: "store", type: "I", index: i });
  const CALL = (target, argc) => ({ op: "invoke", access: "static", method: "jpamb.cases.Calls." + target + ":(" + "I".repeat(argc) + ")I", target, argc, returns: "int" });

  function method(id, short, sig, paramNames, code, localNames) {
    const p = {
      id, short, name: id, cls: "jpamb.cases.Calls", desc: "", returns: "int", code, localNames: localNames || paramNames,
      params: paramNames.map((name) => ({ name, type: "int" })), methodId: sig,
    };
    J.byId[id] = p;
    return p;
  }
  const label = (p) => p.short || p.id;

  method("id", "id", "int id(int i)", ["i"], [L(0), R()]);
  method("wrap", "wrap", "int wrap(int i)", ["i"], [L(0), CALL("id", 1), R()]);
  method("wrap2", "wrap2", "int wrap2(int i)", ["i"], [L(0), CALL("wrap", 1), R()]);
  method("pick", "pick", "int pick(int c)", ["c"], [L(0), { op: "ifz", condition: "le", target: 4 }, P(1), R(), P(0), R()]);
  method("divide", "divide", "int divide(int a, int b)", ["a", "b"], [L(0), L(1), B("div"), R()]);
  method("inv", "inv", "int inv(int x)", ["x"], [P(10), L(0), B("div"), R()]);
  method("isEven", "isEven", "int isEven(int n)", ["n"], [L(0), { op: "ifz", condition: "ne", target: 4 }, P(1), R(), L(0), P(1), B("sub"), CALL("isOdd", 1), R()]);
  method("isOdd", "isOdd", "int isOdd(int n)", ["n"], [L(0), { op: "ifz", condition: "ne", target: 4 }, P(0), R(), L(0), P(1), B("sub"), CALL("isEven", 1), R()]);

  const mainOf = (id, paramNames, code, localNames) => method(id, "main", "int main(" + paramNames.map((n) => "int " + n).join(", ") + ")", paramNames, code, localNames);
  const twoCalls = (target, a, b, op) => [P(a), CALL(target, 1), ST(0), P(b), CALL(target, 1), ST(1), L(0), L(1), B(op), R()];

  const SUITES = [
    {
      id: "idSum", label: "id(1) + id(0)", truth: ["ok"], methods: ["id"],
      main: mainOf("mainIdSum", [], twoCalls("id", 1, 0, "add"), ["x", "y"]),
      java: "int id(int i) {\n  return i;\n}\n\nint main() {\n  int x = id(1);\n  int y = id(0);\n  return x + y;\n}",
      lesson: (k) => (k === 0 ? "One shared copy of <code>id</code> mixes the two calls: x and y are both [0, 1], and the sum is [0, 2], although 1 + 0 is exactly 1. The answer is sound, just wider than it needs to be." : "Each call has its own copy of <code>id</code>, so x is [1, 1], y is [0, 0] and the sum is exactly [1, 1]."),
    },
    {
      id: "idDivSafe", label: "id(0) / id(1)", truth: ["ok"], methods: ["id"],
      main: mainOf("mainIdDivSafe", [], twoCalls("id", 0, 1, "div"), ["x", "y"]),
      java: "int id(int i) {\n  return i;\n}\n\nint main() {\n  int x = id(0);\n  int y = id(1);\n  return x / y;   // 0 / 1\n}",
      lesson: (k) => (k === 0 ? "The 0 passed to the <em>first</em> call leaks into the result of the <em>second</em> call, so y may be 0. That is the false alarm of one shared copy." : "y comes only from the call <code>id(1)</code>, so the divisor is [1, 1] and the false alarm is gone."),
    },
    {
      id: "idDivBug", label: "id(1) / id(0)", truth: ["divide by zero"], methods: ["id"],
      main: mainOf("mainIdDivBug", [], twoCalls("id", 1, 0, "div"), ["x", "y"]),
      java: "int id(int i) {\n  return i;\n}\n\nint main() {\n  int x = id(1);\n  int y = id(0);\n  return x / y;   // 1 / 0: a real bug\n}",
      lesson: (k) => "This alarm is real: y is 0, so the program computes 1 / 0. More context cannot remove a true alarm, because the analysis is sound." + (k === 0 ? " With one copy, y also looks as if it could be 1, so the analysis thinks the division might succeed as well." : ""),
    },
    {
      id: "pickDiv", label: "10 / pick(5) + pick(-5)", truth: ["ok"], methods: ["pick"],
      main: mainOf("mainPickDiv", [], [P(5), CALL("pick", 1), ST(0), P(-5), CALL("pick", 1), ST(1), P(10), L(0), B("div"), L(1), B("add"), R()], ["a", "b"]),
      java: "int pick(int c) {\n  if (c > 0) return 1;\n  return 0;\n}\n\nint main() {\n  int a = pick(5);\n  int b = pick(-5);\n  return 10 / a + b;\n}",
      lesson: (k) => (k === 0 ? "With one copy, c is [−5, 5], so both branches of <code>pick</code> are possible, and a may be 0." : "In the context of <code>pick(5)</code> the test c &gt; 0 is always true, so the branch that returns 0 is dead <em>in this context</em>, and a is exactly 1."),
    },
    {
      id: "wrapDiv", label: "wrap(0) / wrap(1)", truth: ["ok"], methods: ["wrap", "id"],
      main: mainOf("mainWrapDiv", [], twoCalls("wrap", 0, 1, "div"), ["x", "y"]),
      java: "int id(int i) {\n  return i;\n}\n\nint wrap(int i) {\n  return id(i);\n}\n\nint main() {\n  int x = wrap(0);\n  int y = wrap(1);\n  return x / y;\n}",
      lesson: (k) => (k === 0 ? "One copy of each method, so everything is mixed." : k === 1 ? "<code>wrap</code> gets two contexts, but <code>id</code> has only one call site, <code>wrap:1</code>. Its last call site cannot tell the two calls apart, so they mix inside <code>id</code>. This wrapper needs k = 2." : "<code>id</code> sees main's call site too, so the two calls stay apart all the way down."),
    },
    {
      id: "wrap2Div", label: "wrap2(0) / wrap2(1)", truth: ["ok"], methods: ["wrap2", "wrap", "id"],
      main: mainOf("mainWrap2Div", [], twoCalls("wrap2", 0, 1, "div"), ["x", "y"]),
      java: "int id(int i) {\n  return i;\n}\n\nint wrap(int i) {\n  return id(i);\n}\n\nint wrap2(int i) {\n  return wrap(i);\n}\n\nint main() {\n  int x = wrap2(0);\n  int y = wrap2(1);\n  return x / y;\n}",
      lesson: (k) => (k === 0 ? "One copy of each method, so everything is mixed." : k <= 2 ? "Two wrappers between main and <code>id</code>: the last " + (k === 1 ? "call site" : "2 call sites") + " cannot reach back to main, so the calls mix. It takes k = 3." : "With three call sites of history, <code>id</code> can see which call in main it belongs to."),
    },
    {
      id: "divideBug", label: "divide(10, 2), divide(x, 0)", truth: ["divide by zero"], methods: ["divide"],
      main: mainOf("mainDivideBug", [], [P(10), P(2), CALL("divide", 2), ST(0), L(0), P(0), CALL("divide", 2), ST(1), L(0), L(1), B("add"), R()], ["x", "y"]),
      java: "int divide(int a, int b) {\n  return a / b;\n}\n\nint main() {\n  int x = divide(10, 2);\n  int y = divide(x, 0);\n  return x + y;\n}",
      lesson: (k) => (k === 0 ? "The bug is real, but the report only says \"somewhere in <code>divide</code>\"." : "The bug is real, and the context says which call causes it: only the one at <code>main:6</code>. Context makes reports more useful as well as more precise."),
    },
    {
      id: "domainLimit", label: "if (n != 0) inv(n)", truth: ["ok"], methods: ["inv"],
      main: mainOf("mainDomainLimit", ["n"], [L(0), { op: "ifz", condition: "eq", target: 5 }, L(0), CALL("inv", 1), R(), P(0), R()], ["n"]),
      java: "int inv(int x) {\n  return 10 / x;\n}\n\nint main(int n) {\n  if (n != 0) return inv(n);\n  return 0;\n}",
      lesson: () => "No k helps: there is only one call, so context has nothing to separate. The real problem is the domain, because an interval cannot say \"everything except 0\". Context sensitivity does not replace a better abstraction.",
    },
    {
      id: "factConst", label: "factorial(3)", truth: ["ok"], methods: ["factorial"],
      main: mainOf("mainFactConst", [], [P(3), CALL("factorial", 1), R()], []),
      java: "int factorial(int n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}\n\nint main() {\n  return factorial(3);\n}",
      lesson: (k) => (k >= 2 ? "With a known argument the recursion is only three calls deep. The history tells all three apart, so the analysis computes exactly 6." : "Recursion mixes the calls with the same recent history, so the return value keeps growing until widening sends it to +∞. Sound, but only a bound: the real result is 6."),
    },
    {
      id: "factOf", label: "factorial(n)", truth: ["ok"], methods: ["factorial"],
      main: mainOf("mainFactOf", ["n"], [L(0), CALL("factorial", 1), R()], ["n"]),
      java: "int factorial(int n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}\n\nint main(int n) {\n  return factorial(n);\n}",
      lesson: (k) => (k === INF ? "The argument is unknown, so every recursion depth is possible and every depth is a new call stack. There is no finite fixed point." : "Limiting the context makes the set of contexts finite, so the recursion is no problem, even with an unknown argument."),
    },
    {
      id: "evenOdd", label: "10 / isEven(4)", truth: ["ok"], methods: ["isEven", "isOdd"],
      main: mainOf("mainEvenOdd", [], [P(10), P(4), CALL("isEven", 1), B("div"), R()], []),
      java: "int isEven(int n) {\n  if (n == 0) return 1;\n  return isOdd(n - 1);\n}\n\nint isOdd(int n) {\n  if (n == 0) return 0;\n  return isEven(n - 1);\n}\n\nint main() {\n  return 10 / isEven(4);\n}",
      lesson: (k) => (k >= 3 ? "This history is long enough to tell the calls of this recursion apart, so the analysis finds the exact result: 1." : "Mutual recursion: the two methods call each other from one site each, so a short history looks the same at many depths, and isEven may seem to return 0."),
    },
  ];
  const SUITE = {};
  SUITES.forEach((s) => (SUITE[s.id] = s));

  /* A call tree that doubles at every level: f0 calls f1 twice, f1 calls f2 twice, ... */
  function ladder(n) {
    const name = (j) => "ladder" + n + "f" + j;
    for (let j = 0; j < n; j++) method(name(j), "f" + j, "int f" + j + "(int i)", ["i"], [L(0), CALL(name(j + 1), 1), L(0), CALL(name(j + 1), 1), B("add"), R()]);
    method(name(n), "f" + n, "int f" + n + "(int i)", ["i"], [L(0), R()]);
    const main = mainOf("mainLadder" + n, [], [P(1), CALL(name(0), 1), R()], []);
    return { id: "ladder" + n, label: "a call tree " + n + " levels deep", truth: ["ok"], methods: Array.from({ length: n + 1 }, (_, j) => name(j)), main,
      java: "int f0(int i) { return f1(i) + f1(i); }\nint f1(int i) { return f2(i) + f2(i); }\n...\nint f" + n + "(int i) { return i; }\n\nint main() { return f0(1); }" };
  }

  /* =====================================================================
     In-lining: replace every static call by the callee's body.
     Arguments go to fresh locals, the callee's locals and jumps are moved, a return becomes a
     jump to the end of the copied body (leaving the result on the operand stack).
     ===================================================================== */
  function localsOf(p) {
    let n = p.params.length;
    p.code.forEach((ins) => { if (ins.index != null) n = Math.max(n, ins.index + 1); });
    return n;
  }
  function inlineOnce(p) {
    const out = [], map = [], fix = [];
    let nl = localsOf(p);
    p.code.forEach((ins, i) => {
      map[i] = out.length;
      if (ins.op === "invoke" && ins.access === "static") {
        const c = J.byId[ins.target];
        const base = nl;
        nl += localsOf(c);
        for (let a = ins.argc - 1; a >= 0; a--) out.push(ST(base + a));
        const cmap = [], gotos = [], jumps = [];
        c.code.forEach((ci, j) => {
          cmap[j] = out.length;
          if (ci.op === "return") {
            if (j === c.code.length - 1) return;
            const g = { op: "goto", target: -1 };
            gotos.push(g);
            out.push(g);
            return;
          }
          const n = Object.assign({}, ci);
          if (n.index != null) n.index += base;
          if (n.target != null && n.op !== "invoke") jumps.push(n);
          out.push(n);
        });
        cmap[c.code.length] = out.length;
        jumps.forEach((n) => (n.target = cmap[n.target]));
        gotos.forEach((g) => (g.target = cmap[c.code.length]));
        return;
      }
      const n = Object.assign({}, ins);
      if (n.target != null && n.op !== "invoke") fix.push(n);
      out.push(n);
    });
    map[p.code.length] = out.length;
    fix.forEach((n) => (n.target = map[n.target]));
    return out;
  }
  let inlineCounter = 0;
  function inlineProgram(p) {
    const id = "inlined" + ++inlineCounter;
    return Object.assign({}, p, { id, name: id, code: inlineOnce(p), methodId: "main, after in-lining", localNames: null });
  }
  const callsIn = (p) => p.code.filter((ins) => ins.op === "invoke" && ins.access === "static").length;

  /* =====================================================================
     The interval domain (as in Week 6): bottom is null; arithmetic over mathematical integers
     ===================================================================== */
  const mulB = (x, y) => (x === 0 || y === 0 ? 0 : x * y);
  function divB(x, y) {
    if (!isFinite(y)) return 0;
    if (!isFinite(x)) return (x > 0) === (y > 0) ? INF : -INF;
    return Math.trunc(x / y);
  }
  const ITV = {
    mk: (lo, hi) => (lo > hi ? null : { lo, hi }),
    top: () => ({ lo: -INF, hi: INF }),
    of: (n) => ({ lo: n, hi: n }),
    join(a, b) { if (!a) return b; if (!b) return a; return { lo: Math.min(a.lo, b.lo), hi: Math.max(a.hi, b.hi) }; },
    meet(a, b) { if (!a || !b) return null; return ITV.mk(Math.max(a.lo, b.lo), Math.min(a.hi, b.hi)); },
    eq(a, b) { if (!a || !b) return a === b; return a.lo === b.lo && a.hi === b.hi; },
    contains: (a, n) => !!a && a.lo <= n && n <= a.hi,
    neg: (a) => (a ? { lo: -a.hi, hi: -a.lo } : null),
    add(a, b) { if (!a || !b) return null; return { lo: a.lo + b.lo, hi: a.hi + b.hi }; },
    sub(a, b) { return ITV.add(a, ITV.neg(b)); },
    mul(a, b) {
      if (!a || !b) return null;
      const c = [mulB(a.lo, b.lo), mulB(a.lo, b.hi), mulB(a.hi, b.lo), mulB(a.hi, b.hi)];
      return { lo: Math.min(...c), hi: Math.max(...c) };
    },
    div(a, b) {
      if (!a || !b) return { value: null, err: false };
      let r = null;
      const parts = [];
      if (b.lo <= -1) parts.push({ lo: b.lo, hi: Math.min(b.hi, -1) });
      if (b.hi >= 1) parts.push({ lo: Math.max(b.lo, 1), hi: b.hi });
      parts.forEach((p) => {
        const c = [divB(a.lo, p.lo), divB(a.lo, p.hi), divB(a.hi, p.lo), divB(a.hi, p.hi)];
        r = ITV.join(r, { lo: Math.min(...c), hi: Math.max(...c) });
      });
      return { value: r, err: ITV.contains(b, 0) };
    },
    /* the parts of a and b that can make "a c b" true */
    refine(c, a, b) {
      if (!a || !b) return [null, null];
      let ra, rb;
      switch (c) {
        case "lt": ra = ITV.meet(a, { lo: -INF, hi: b.hi - 1 }); rb = ITV.meet(b, { lo: a.lo + 1, hi: INF }); break;
        case "le": ra = ITV.meet(a, { lo: -INF, hi: b.hi }); rb = ITV.meet(b, { lo: a.lo, hi: INF }); break;
        case "gt": ra = ITV.meet(a, { lo: b.lo + 1, hi: INF }); rb = ITV.meet(b, { lo: -INF, hi: a.hi - 1 }); break;
        case "ge": ra = ITV.meet(a, { lo: b.lo, hi: INF }); rb = ITV.meet(b, { lo: -INF, hi: a.hi }); break;
        case "eq": ra = ITV.meet(a, b); rb = ra; break;
        case "ne": {
          const trim = (x, k) => { if (x.lo === k && x.hi === k) return null; if (x.lo === k) return { lo: k + 1, hi: x.hi }; if (x.hi === k) return { lo: x.lo, hi: k - 1 }; return x; };
          ra = b.lo === b.hi ? trim(a, b.lo) : a;
          rb = a.lo === a.hi ? trim(b, a.lo) : b;
          break;
        }
        default: throw new Error("bad condition " + c);
      }
      return !ra || !rb ? [null, null] : [ra, rb];
    },
    widen(a, b) {
      if (!a) return b;
      if (!b) return a;
      return { lo: b.lo < a.lo ? -INF : a.lo, hi: b.hi > a.hi ? INF : a.hi };
    },
    fmtB: (x) => (x === INF ? "+∞" : x === -INF ? "−∞" : String(x).replace("-", "−")),
    fmt(a) { return a ? "[" + ITV.fmtB(a.lo) + ", " + ITV.fmtB(a.hi) + "]" : "⊥"; },
  };
  /* Read the signs off an interval: for display only, there is no sign analysis here. */
  function signsOf(a) {
    if (!a) return S.fmt(S.BOT);
    return S.fmt((a.lo < 0 ? S.NEG : 0) | (a.lo <= 0 && a.hi >= 0 ? S.ZERO : 0) | (a.hi > 0 ? S.POS : 0));
  }
  const showItv = (a, view) => (view === "sign" ? signsOf(a) : ITV.fmt(a));

  /* =====================================================================
     Abstract frames: locals and stack of { k: "int", v, src? } | { k: "ref" }.
     src remembers which local a stack value was loaded from, so a test also narrows that local.
     ===================================================================== */
  const avInt = (v, src) => (src == null ? { k: "int", v } : { k: "int", v, src });
  function joinAV(a, b) {
    if (a == null) return b;
    if (b == null) return a;
    if (a.k === "int" && b.k === "int") return avInt(ITV.join(a.v, b.v), a.src === b.src ? a.src : null);
    return { k: "ref" };
  }
  function eqAV(a, b) {
    if (a == null || b == null) return a == null && b == null;
    return a.k === b.k && (a.k !== "int" || (ITV.eq(a.v, b.v) && a.src === b.src));
  }
  function joinFrame(f, g) {
    const n = Math.max(f.locals.length, g.locals.length), locals = [];
    for (let i = 0; i < n; i++) locals.push(joinAV(f.locals[i], g.locals[i]));
    return { locals, stack: f.stack.map((v, i) => joinAV(v, g.stack[i])) };
  }
  function widenFrame(old, nw) {
    const w = (a, b) => (a == null || b == null || a.k !== "int" || b.k !== "int" ? b : avInt(ITV.widen(a.v, b.v), a.src === b.src ? a.src : null));
    const n = Math.max(old.locals.length, nw.locals.length), locals = [];
    for (let i = 0; i < n; i++) locals.push(w(old.locals[i], nw.locals[i]));
    return { locals, stack: nw.stack.map((v, i) => w(old.stack[i], v)) };
  }
  function eqFrame(f, g) {
    if (f.stack.length !== g.stack.length) return false;
    const n = Math.max(f.locals.length, g.locals.length);
    for (let i = 0; i < n; i++) if (!eqAV(f.locals[i], g.locals[i])) return false;
    return f.stack.every((v, i) => eqAV(v, g.stack[i]));
  }
  function setLocal(f, i, v) {
    f.locals[i] = v;
    f.stack = f.stack.map((x) => (x && x.k === "int" && x.src === i ? avInt(x.v) : x));
  }
  function refineSrc(g, v, r) {
    if (v && v.src != null && g.locals[v.src] && g.locals[v.src].k === "int") g.locals[v.src] = avInt(ITV.meet(g.locals[v.src].v, r));
  }

  /* =====================================================================
     The analysis.  A context is the list of the last k call sites.  One instance per
     (method, context) holds the abstract frame per offset, the return set R and the return value.
     Worklist iteration; a state that keeps changing is widened after WIDEN_AFTER changes.
     ===================================================================== */
  const WIDEN_AFTER = 3;
  function makeAnalysis(mainP, k, cap) {
    const A = { k, insts: [], byKey: new Map(), wl: [], head: 0, queued: new Set(), visits: 0, done: false, stopped: false, outcomes: new Map(), log: [], cur: null, cap: cap || 3000, root: null };
    function inst(m, ctx) {
      const key = m.id + "|" + ctx.join(",");
      let I = A.byKey.get(key);
      if (!I) {
        I = { key, m, ctx, R: new Map(), states: new Map(), changes: new Map(), ret: null, returned: false, retChanges: 0 };
        A.byKey.set(key, I);
        A.insts.push(I);
      }
      return I;
    }
    function enqueue(I, pc) {
      const q = I.key + "@" + pc;
      if (!A.queued.has(q)) { A.queued.add(q); A.wl.push({ I, pc }); }
    }
    function merge(I, pc, g) {
      const old = I.states.get(pc);
      if (!old) { I.states.set(pc, g); enqueue(I, pc); return true; }
      let nf = joinFrame(old, g);
      if (eqFrame(old, nf)) return false;
      const n = (I.changes.get(pc) || 0) + 1;
      I.changes.set(pc, n);
      if (n > WIDEN_AFTER) nf = widenFrame(old, nf);
      I.states.set(pc, nf);
      enqueue(I, pc);
      return true;
    }
    function outcome(name, I, pc, why) {
      if (!A.outcomes.has(name)) A.outcomes.set(name, []);
      const list = A.outcomes.get(name), site = label(I.m) + ":" + pc;
      if (!list.some((x) => x.I === I && x.pc === pc)) list.push({ I, pc, site, why });
    }
    function transfer(I, pc) {
      const p = I.m, ins = p.code[pc], f0 = I.states.get(pc);
      const f = { locals: f0.locals.slice(), stack: f0.stack.slice() };
      const go = (to, g) => merge(I, to, g || f);
      let note = "";
      switch (ins.op) {
        case "push": f.stack.push(avInt(ITV.of(ins.value))); go(pc + 1); note = "push " + ins.value; break;
        case "load": {
          const v = f.locals[ins.index];
          f.stack.push(v && v.k === "int" ? avInt(v.v, ins.index) : v || { k: "ref" });
          go(pc + 1);
          note = "load λ[" + ins.index + "] = " + (v && v.k === "int" ? ITV.fmt(v.v) : "ref");
          break;
        }
        case "store": {
          const v = f.stack.pop();
          setLocal(f, ins.index, v && v.k === "int" ? avInt(v.v) : v);
          go(pc + 1);
          note = "store " + (v && v.k === "int" ? ITV.fmt(v.v) : "ref") + " in λ[" + ins.index + "]";
          break;
        }
        case "incr": setLocal(f, ins.index, avInt(ITV.add(f.locals[ins.index].v, ITV.of(ins.amount)))); go(pc + 1); note = "add " + ins.amount + " to λ[" + ins.index + "]"; break;
        case "negate": f.stack.push(avInt(ITV.neg(f.stack.pop().v))); go(pc + 1); note = "negate"; break;
        case "binary": {
          const b = f.stack.pop(), a = f.stack.pop();
          let r;
          if (ins.operant === "add") r = ITV.add(a.v, b.v);
          else if (ins.operant === "sub") r = ITV.sub(a.v, b.v);
          else if (ins.operant === "mul") r = ITV.mul(a.v, b.v);
          else if (ins.operant === "div") {
            const d = ITV.div(a.v, b.v);
            if (d.err) outcome("divide by zero", I, pc, "divisor " + ITV.fmt(b.v) + " contains 0");
            r = d.value;
          } else throw new Error("unsupported operation " + ins.operant);
          note = ITV.fmt(a.v) + " " + ins.operant + " " + ITV.fmt(b.v) + " = " + ITV.fmt(r);
          if (r) { f.stack.push(avInt(r)); go(pc + 1); }
          break;
        }
        case "ifz": case "if": {
          let a, b, bv = null;
          if (ins.op === "ifz") { a = f.stack.pop(); b = avInt(ITV.of(0)); } else { bv = f.stack.pop(); a = f.stack.pop(); b = bv; }
          const parts = [];
          [[ins.condition, ins.target, "jump"], [J.NEG_COND[ins.condition], pc + 1, "fall through"]].forEach(([c, to, what]) => {
            const [ra, rb] = ITV.refine(c, a.v, b.v);
            if (!ra || !rb) { parts.push(what + " impossible"); return; }
            const g = { locals: f.locals.slice(), stack: f.stack.slice() };
            refineSrc(g, a, ra);
            if (bv) refineSrc(g, bv, rb);
            go(to, g);
            parts.push(what + " possible");
          });
          note = parts.join(", ");
          break;
        }
        case "goto": go(ins.target); note = "jump to " + ins.target; break;
        case "get": f.stack.push(avInt(ITV.of(0))); go(pc + 1); note = "assertions are on"; break;
        case "new": f.stack.push({ k: "ref" }); go(pc + 1); note = "new object"; break;
        case "dup": f.stack.push(f.stack[f.stack.length - 1]); go(pc + 1); note = "dup"; break;
        case "throw": outcome("assertion error", I, pc, "throw"); note = "throw"; break;
        case "invoke": {
          if (ins.access === "special") { f.stack.pop(); go(pc + 1); note = "constructor"; break; }
          const args = f.stack.splice(f.stack.length - ins.argc, ins.argc);
          const here = label(p) + ":" + pc;
          const callee = J.byId[ins.target];
          const ctx = k === 0 ? [] : I.ctx.concat([here]).slice(-k);
          const C = inst(callee, ctx);
          const rk = I.key + "@" + pc;
          const newCaller = !C.R.has(rk);
          if (newCaller) C.R.set(rk, { I, pc });
          merge(C, 0, { locals: args.map((a) => (a && a.k === "int" ? avInt(a.v) : a)), stack: [] });
          note = "call " + label(callee) + "(" + args.map((a) => ITV.fmt(a.v)).join(", ") + ")" + (newCaller ? ", add " + here + " to its return set" : "");
          if (C.returned) {
            const g = { locals: f.locals, stack: f.stack.slice() };
            if (ins.returns === "int") g.stack.push(avInt(C.ret));
            go(pc + 1, g);
            note += ", result " + ITV.fmt(C.ret);
          }
          break;
        }
        case "return": {
          const v = ins.type ? f.stack.pop() : null;
          const nr = v ? ITV.join(I.ret, v.v) : null;
          const changed = !I.returned || (v && !ITV.eq(I.ret, nr));
          note = v ? "return " + ITV.fmt(v.v) : "return";
          if (changed) {
            I.retChanges++;
            I.ret = v && I.retChanges > WIDEN_AFTER + 1 ? ITV.widen(I.ret, nr) : nr;
            I.returned = true;
            if (I === A.root) outcome("ok", I, pc, "return");
            else {
              const sites = [];
              I.R.forEach((r) => { enqueue(r.I, r.pc); sites.push(label(r.I.m) + ":" + r.pc); });
              note += ", update the result at " + sites.join(" and ");
            }
          }
          break;
        }
        default: throw new Error("unsupported instruction " + ins.op);
      }
      return note;
    }
    A.root = inst(mainP, []);
    merge(A.root, 0, { locals: mainP.params.map(() => avInt(ITV.top())), stack: [] });
    A.step = function () {
      if (A.head >= A.wl.length) { A.done = true; A.cur = null; return false; }
      if (A.visits >= A.cap) { A.stopped = true; A.cur = null; return false; }
      const { I, pc } = A.wl[A.head++];
      A.queued.delete(I.key + "@" + pc);
      A.visits++;
      A.cur = { I, pc };
      const note = transfer(I, pc);
      A.log.push({ site: label(I.m) + ":" + pc, ctx: I.ctx, note });
      if (A.log.length > 8) A.log.shift();
      return true;
    };
    A.run = function () { while (A.step()); return A; };
    A.states = () => A.insts.reduce((n, I) => n + I.states.size, 0);
    return A;
  }

  /* What an analysis reports, against what is true. */
  function report(A, truth) {
    const reached = [...A.outcomes.keys()];
    const extra = reached.filter((o) => !truth.includes(o));
    return { reached, falseAlarms: extra.filter((o) => o !== "ok"), spuriousOk: extra.includes("ok"), missed: A.done ? truth.filter((o) => !reached.includes(o)) : [] };
  }

  /* ---------- Small view helpers ---------- */
  const pill = (text, cls) => '<span class="pill ' + (cls || "") + '">' + esc(text) + "</span>";
  const ctxStr = (ctx) => (ctx.length ? (ctx.length > 4 ? "... → " + ctx.slice(-3).join(" → ") : ctx.join(" → ")) : "ε");
  const kName = (k) => (k === INF ? "full stack" : "k = " + k);
  function returnsTo(I) {
    if (!I.R.size) return "∅";
    return "{" + [...I.R.values()].map((r) => (r.I.ctx.length ? ctxStr(r.I.ctx) + " → " : "") + label(r.I.m) + ":" + r.pc).join(", ") + "}";
  }
  function showAV(a, view) {
    if (a == null) return "·";
    return a.k === "int" ? showItv(a.v, view) : "ref";
  }
  function localsText(p, f, view) {
    const names = p.localNames || [];
    const parts = [];
    f.locals.forEach((v, i) => { if (v != null) parts.push((names[i] || "λ[" + i + "]") + " = " + showAV(v, view)); });
    return parts.join(", ") || "·";
  }
  function listings(parent, suite, main) {
    const map = new Map();
    const add = (p) => { const l = J.listing(p); map.set(p, l); parent.append(l.el); };
    add(main || suite.main);
    suite.methods.forEach((id) => add(J.byId[id]));
    return map;
  }

  /* =====================================================================
     QUIZ BANK
     ===================================================================== */
  const QUIZ = {
    "dynamic-jumps": [
      { q: "Which of these jumps is <em>dynamic</em>, i.e. only known at run time?", options: [
        ["<code>goto 7</code>", false, "The target is written in the instruction."],
        ["<code>ifz eq 6</code>", false, "It has two possible successors, but both are known statically: offset 6 and the next instruction."],
        ["<code>invoke static id</code>", false, "A static call names its callee, so the target is known statically."],
        ["<code>return:I</code>", true, "Where it continues depends on who called the method. That information is in the call stack, not in the instruction."],
      ] },
      { q: "Two states are both at <code>return:I</code> in <code>id</code>, with identical locals and stack. Can they have different successors?", options: [
        ["No, the semantics is deterministic", false, "It is deterministic for a whole state. These two states can differ further down the call stack."],
        ["Yes: the frames below may differ, and the return continues in the caller's frame", true, "That is rule $\\mathsf{return}_\\mu$: the next offset is $\\iota_2 + 1$, taken from the caller's frame. So the top frame alone does not determine the next state (Proposition 9.2)."],
        ["Only if the method is recursive", false, "Two ordinary calls from different places are enough."],
      ] },
      { q: "Why is a return a problem for the analyses of Weeks 5 and 6?", options: [
        ["They keep abstract states per offset and forget the call stack, so at a return they do not know where to send the result", true, "Their control-flow graph has no edge for a return, because the target is not determined by the offset."],
        ["They cannot represent the return value", false, "A return value is an ordinary abstract value."],
        ["Returns can throw exceptions", false, "In our JVM subset a return does not fail."],
      ] },
      { q: "Why does dynamic dispatch make things worse?", options: [
        ["At a virtual call <code>o.m()</code> even the <em>call</em> target depends on the run-time class of <code>o</code>, so now both the call and the return are dynamic", true, "An analysis then has to work out which objects can reach the call site before it knows which methods are called."],
        ["Virtual methods cannot return values", false, "They can."],
        ["Virtual calls need no return address", false, "They need one like any other call."],
      ] },
    ],
    inlining: [
      { q: "What does in-lining do?", options: [
        ["Copies the callee's body into the caller at the call site, so the analysis no longer sees a call", true, "Arguments go to fresh locals, the callee's locals and jumps are moved, and a return becomes a jump to the end of the copy."],
        ["Removes unused methods", false, "That is dead code elimination."],
        ["Moves all methods into one class", false, "Classes play no part in it."],
      ] },
      { q: "When does fully in-lining a program finish?", options: [
        ["Always", false, "A recursive method contains a call to itself in every copy."],
        ["Exactly when no recursion is reachable from <code>main</code>: the call graph has no reachable cycle", true, "Each in-lining unfolds the call tree one more level, and the call tree is finite exactly when there is no reachable cycle (Proposition 9.5)."],
        ["When every method has at most one call", false, "<code>factorial</code> has one call and never finishes."],
      ] },
      { q: "$f_0$ calls $f_1$ twice, $f_1$ calls $f_2$ twice, and so on down to $f_d$. How many copies of $f_d$ does full in-lining produce?", options: [
        ["$d$", false, "That would be a chain of single calls."],
        ["$2d$", false, "The number multiplies at each level instead of adding."],
        ["$2^d$", true, "One copy per path through the call tree, so the code grows exponentially with the depth. Try the call tree in the lab."],
      ] },
      { q: "Which is <em>not</em> a drawback of in-lining for analysis?", options: [
        ["It cannot handle recursion", false, "That is the worst drawback."],
        ["The analysis cannot be reused between calls", false, "Each copy is analysed from scratch."],
        ["It can be hard to get right, for example with name clashes and unknown call targets", false, "Both of these are real difficulties."],
        ["It loses precision, because calls get mixed", true, "It is the opposite: every copy is analysed in its own situation, which is why compilers like it. The cost is size, not precision."],
      ] },
    ],
    plumbing: [
      { q: "What does abstract call plumbing add to the abstract state at each offset?", options: [
        ["A set of return addresses: the places a return here may continue at", true, "The state becomes $\\iota \\mapsto \\pset{\\iota} \\times \\overline{\\State}$. At a return, the result is sent to every address in the set."],
        ["A copy of the caller's heap", false, "Nothing about the heap is added."],
        ["The full call stack", false, "That is the full-stack context, which comes later."],
      ] },
      { q: "Why does the set of return addresses need no abstraction?", options: [
        ["Because it is always a singleton", false, "With one copy per method it often has several elements: <code>{main:1, main:4}</code>."],
        ["Because it is a subset of the finitely many call sites of the program, and usually small", true, "It can only grow a bounded number of times, so it cannot prevent termination."],
        ["Because return addresses are not values", false, "That is true, but it is not why finite sets are enough."],
      ] },
      { q: "In the example, why does the result of <code>x = id(1)</code> change from $\\{+\\}$ to $\\{0, +\\}$ later on?", options: [
        ["Because x is assigned twice", false, "x is assigned once."],
        ["Because analysing <code>id(0)</code> grows the single state of <code>id</code>, and the new return value is sent to <em>every</em> return address, including <code>main:1</code>", true, "The first call has already been answered, but the shared state changed, so its answer must be updated."],
        ["Because the interpreter runs <code>id(1)</code> again with 0", false, "No concrete run ever does that. It is only the abstraction."],
      ] },
      { q: "A fixed point of the plumbing analysis finds no division by zero. What do you know?", options: [
        ["No run divides by zero (for a sound value abstraction)", true, "Theorem 9.7: every frame of every reachable state is described by the fixed point. A missing alarm is a real guarantee, and only alarms can be false."],
        ["Only that the first call does not divide by zero", false, "The result covers every call."],
        ["Nothing, the analysis is unsound for calls", false, "It is sound, just not very precise."],
      ] },
    ],
    leak: [
      { q: "<code>x = id(0); y = id(1); return x / y;</code> With one shared copy of <code>id</code>, what does the analysis report, and is it right?", options: [
        ["Divide by zero, and it is a false alarm: the program computes 0 / 1", true, "y is $\\{0, +\\}$ because the 0 from the first call leaks through the shared state into the result of the second."],
        ["Divide by zero, and the program really does divide by zero", false, "The divisor is <code>id(1)</code>, which is 1."],
        ["No alarm", false, "The shared state gives y the value $\\{0, +\\}$, which contains 0."],
      ] },
      { q: "With one shared copy, <code>x = id(1); y = id(0); return x / y;</code> gets a divide-by-zero alarm. Is it a false alarm?", options: [
        ["Yes, the shared copy causes it", false, "Follow the values: y is 0."],
        ["No: the program really computes 1 / 0, so this alarm is true. The false alarm needs the arguments swapped", true, "<code>id(0) / id(1)</code> is the false alarm. In the lab, this version keeps its alarm at every k."],
        ["It cannot be told without running it", false, "The values are constants: 1 and 0."],
      ] },
      { q: "What is an <em>invalid path</em>?", options: [
        ["A path that crashes", false, "Crashes are valid paths to an error."],
        ["A path whose returns do not match its calls, for example entering <code>id</code> from <code>main:1</code> and leaving it to <code>main:5</code>", true, "No real run can do this. One shared copy cannot rule it out, because the state of <code>id</code> does not say which call it came from."],
        ["A path through dead code", false, "Dead code is about branches, not about matching calls and returns."],
      ] },
      { q: "With one shared copy, how is the result at a call site related to the method's other callers?", options: [
        ["It only depends on its own arguments", false, "That would need one copy per call."],
        ["It includes everything the method can return for any caller", true, "Proposition 9.8: arguments of all callers are joined on entry, and the joined result goes back to all of them."],
        ["It is always $\\top$", false, "It is the join of the actual results, which is often much better than $\\top$."],
      ] },
    ],
    "full-stack": [
      { q: "In the full-stack analysis, what is the key of the abstract state?", options: [
        ["The whole stack of offsets, ending in the current one: $\\iota^{+}$", true, "For example <code>main:1,id:1</code>. Each call stack gets its own state: $\\iota^{+} \\mapsto \\pset{\\iota^{*}} \\times \\overline{\\State}$."],
        ["The offset alone", false, "That is the one-copy analysis."],
        ["The values of the arguments", false, "Keying on abstract arguments is another kind of context, but not this one."],
      ] },
      { q: "With full-stack keys, how many return addresses can a state have?", options: [
        ["At most one, and it can be read off the key", true, "Proposition 9.12: a key $w\\,r\\,\\iota$ can only return to $w\\,r$. The set is only needed once stacks are cut short."],
        ["Up to the number of call sites", false, "That is the one-copy case."],
        ["It must be infinite for recursion", false, "Each individual key still has only one."],
      ] },
      { q: "How does the full stack remove the false alarm in <code>id(0) / id(1)</code>?", options: [
        ["The two calls get different keys (<code>main:1,id:0</code> and <code>main:4,id:0</code>), so their values never mix", true, "Only valid paths are followed, so each result goes back to its own caller, and y stays $\\{+\\}$."],
        ["It runs the program concretely", false, "It is still abstract: with unknown inputs it computes abstract values."],
        ["It uses a better value domain", false, "The value domain is the same."],
      ] },
      { q: "Is tracking the full call stack the only way to know that <code>id(0) / id(1)</code> is safe?", options: [
        ["Yes", false, "Try k = 1 in the lab."],
        ["No: the last call site is enough here (k = 1), and in-lining also works. The full stack is one way, not the only one", true, "The stacks in this program are one call deep, so 1-CFA and the full stack coincide."],
        ["No: even the full stack gives a false alarm", false, "The full stack removes it."],
      ] },
    ],
    explosion: [
      { q: "What are the two big problems with full-stack contexts?", options: [
        ["Space, because there is one state per reachable call stack, and recursion, because the set of stacks can be infinite", true, "Both come from the number of call stacks: exponential in the depth, and unbounded with recursion."],
        ["They are unsound and imprecise", false, "They are sound, and more precise than any shorter context."],
        ["They need a concrete input and a solver", false, "No concrete input and no solver are involved."],
      ] },
      { q: "Each of $d$ levels of methods calls the next level from 2 call sites. How many call stacks reach the deepest method?", options: [
        ["$2d$", false, "The choices multiply along the way."],
        ["$2^d$", true, "One stack per sequence of choices (Proposition 9.14). Try the call tree lab."],
        ["$d^2$", false, "It grows faster than any polynomial in $d$."],
      ] },
      { q: "Why does <code>factorial(n)</code> with unknown <code>n</code> make the full-stack analysis run forever?", options: [
        ["Because multiplication has no abstract version", false, "Interval multiplication exists."],
        ["Because every recursion depth is possible, and each depth is a new key that a sound analysis has to include", true, "Proposition 9.15: no finite map can be a fixed point. Widening cannot help, because it is the set of keys that grows, not a value."],
        ["Because the program does not terminate", false, "It terminates for every <code>n</code>. The problem is the analysis."],
      ] },
      { q: "<code>factorial(3)</code> has a constant argument. What happens with full-stack contexts?", options: [
        ["It also runs forever", false, "With known values the test <code>n &lt;= 1</code> eventually has only one possible side."],
        ["It terminates after three nested calls and computes exactly 6", true, "Recursion is only a problem when the abstract values cannot bound the depth."],
        ["It needs widening", false, "Each key sees one exact value, so nothing keeps growing."],
      ] },
    ],
    "k-cfa": [
      { q: "What is the key in $k$-CFA?", options: [
        ["The last $k$ call sites plus the current offset: at most $k + 1$ offsets", true, "$\\mathit{trunc}_k$ keeps the end of the stack and drops the oldest part."],
        ["The first $k$ call sites", false, "It is the most recent ones that are kept."],
        ["The offset, plus $k$ abstract values", false, "The context is made of call sites, not values."],
      ] },
      { q: "Which analysis is $k = 0$?", options: [
        ["The one shared copy of each method: abstract call plumbing", true, "With no call sites in the key, the key is the offset alone, and all callers mix."],
        ["In-lining", false, "In-lining copies code instead of keeping contexts."],
        ["The full stack", false, "That is the other extreme, when $k$ is at least the stack depth."],
      ] },
      { q: "Why does $k$-CFA need return <em>sets</em> when the full stack does not?", options: [
        ["Because cutting the stack merges callers: one key can have several callers, whose older call sites were dropped", true, "With $k = 1$, <code>id</code> in the context <code>wrap:1</code> has the callers <code>main:1 → wrap:1</code> and <code>main:4 → wrap:1</code> (Proposition 9.17 and the lab)."],
        ["Because the sets are smaller than a single address", false, "A single address is smaller."],
        ["Because $k$-CFA has no call stack in the concrete semantics", false, "The concrete semantics is the same."],
      ] },
      { q: "<code>wrap(0) / wrap(1)</code>, where <code>wrap</code> just calls <code>id</code>. What is the smallest $k$ with no false alarm?", options: [
        ["0", false, "Everything is mixed."],
        ["1", false, "<code>id</code> has only one call site, inside <code>wrap</code>, so its contexts cannot tell the calls apart."],
        ["2", true, "With $d$ wrappers it takes $k = d + 1$ (Proposition 9.20): the context has to reach back to the call site in <code>main</code>."],
        ["There is none", false, "$k = 2$ works here."],
      ] },
      { q: "Does a bigger $k$ ever lose precision?", options: [
        ["Yes, always", false, "A longer key only splits states further."],
        ["Not at least fixed points: truncating a key is an abstraction, so the shorter analysis over-approximates the longer one", true, "Proposition 9.19, from the fixed-point transfer of Week 6. Widening can in principle disturb this, since it depends on the order of updates, but the cost is the main reason not to raise $k$."],
        ["Only for recursive programs", false, "The argument does not depend on recursion."],
      ] },
    ],
    "how-much": [
      { q: "Which value of $k$ is usually a good choice for Java?", options: [
        ["$k = 1$, sometimes $k = 2$", true, "$k = 0$ is usually too imprecise, while $k = 1$ separates the callers of a method at a manageable cost."],
        ["As large as possible", false, "The cost grows quickly with $k$."],
        ["$k = 0$", false, "One shared copy usually gives too many false alarms."],
      ] },
      { q: "What is the \"$k$-CFA paradox\"?", options: [
        ["$k$-CFA is polynomial for object-oriented languages at every fixed $k$, but EXPTIME-complete for functional languages when $k \\geq 1$, although it looks like the same algorithm", true, "Might, Smaragdakis and Van Horn (2010) explain it: closures capture variables from different contexts, while objects are built by copying values into fields."],
        ["A larger $k$ makes the analysis less precise", false, "It does not (Proposition 9.19)."],
        ["$k$-CFA does not terminate", false, "For any finite $k$ there are finitely many contexts."],
      ] },
      { q: "EXPTIME-complete means that ...", options: [
        ["no polynomial-time algorithm solves the problem", true, "This is unconditional: the time hierarchy theorem separates P from EXPTIME. It is stronger than NP-completeness, where the separation from P is unproven."],
        ["it is probably fast in practice", false, "That is not what the class says."],
        ["the problem is undecidable", false, "It is decidable, in exponential time."],
      ] },
      { q: "In <code>if (n != 0) return inv(n);</code> the division in <code>inv</code> still gets a false alarm at every $k$. Why?", options: [
        ["$k$ has to be even larger", false, "There is only one call, so the contexts are the same at every $k$."],
        ["Because intervals cannot express \"everything except 0\". The problem is the value domain, and context cannot fix that", true, "Context separates callers. It does not make one caller's value more precise (Proposition 9.23)."],
        ["Because <code>inv</code> really can divide by zero", false, "The test guards the call."],
      ] },
      { q: "What is the idea of an <em>introspective</em> analysis (Smaragdakis et al. 2014)?", options: [
        ["Run a cheap analysis first, and use its results to decide where a deep context is worth its cost", true, "A few methods cause most of the blow-up. Treating these with less context keeps most of the precision at a fraction of the cost."],
        ["Let the program analyse itself at run time", false, "It is a static analysis."],
        ["Use only reflection to find the callers", false, "Reflection is unrelated to the idea."],
      ] },
    ],
  };

  /* =====================================================================
     LABS
     ===================================================================== */

  /* --- 1. A concrete run: the same return goes to different places --- */
  function labCallstack(el) {
    const { controls, view } = PA.lab(el, {
      title: "One return instruction, several destinations",
      hint: "Step through a real run. Every call pushes a frame on top of the call stack, and the caller's frame remembers where to continue. Watch where each <code>return:I</code> goes.",
    });
    el.classList.add("wide");
    const top = h("div", { class: "csa-ctl" });
    controls.append(top);
    const sel = PA.select(top, { label: "Program", options: [["idSum", "id(1) + id(0)"], ["wrapDiv", "wrap(0) / wrap(1)"], ["factConst", "factorial(3)"]], value: "idSum" });
    const btns = PA.btnRow(controls);
    PA.button(btns, "Step", () => advance(false), "primary");
    PA.button(btns, "Run to the next return", () => advance(true));
    PA.button(btns, "Reset", () => reset());
    const stats = PA.stats(view, [{ key: "steps", label: "Steps" }, { key: "depth", label: "Call stack depth" }, { key: "rets", label: "Returns so far" }, { key: "dests", label: "Places returned to" }]);
    const grid = h("div", { class: "split" });
    const left = h("div"), right = h("div");
    grid.append(left, right);
    const rule = h("div", { class: "csa-rule" });
    const verdict = h("div", { class: "verdict" });
    view.append(grid, rule, verdict);
    let suite, lst, st, n, out, rets, lastNote;
    function reset() {
      suite = SUITE[sel.value];
      left.innerHTML = "";
      left.append(PA.codeBlock(suite.java, "java"));
      lst = listings(left, suite);
      st = J.initState(suite.main.id, []);
      n = 0; out = null; rets = []; lastNote = "";
      rule.innerHTML = "";
      render();
    }
    function one() {
      const f = st.frames[st.frames.length - 1];
      const r = J.step(st);
      n++;
      lastNote = r.note;
      if (r.rule === "invoke" || r.rule === "returnMu" || r.rule === "returnEps") rule.innerHTML = PA.tex(J.rules[r.rule].tex, true);
      if (r.rule === "returnMu") {
        const g = r.state.frames[r.state.frames.length - 1];
        rets.push({ from: label(J.byId[f.pc.prog]) + ":" + f.pc.off, to: label(J.byId[g.pc.prog]) + ":" + g.pc.off });
      }
      if (r.outcome) out = r.outcome;
      else st = r.state;
      return r;
    }
    function advance(toReturn) {
      if (out) return;
      for (let i = 0; i < 400 && !out; i++) {
        const r = one();
        if (!toReturn || r.rule === "returnMu") break;
      }
      render();
    }
    function render() {
      const f = st.frames[st.frames.length - 1];
      lst.forEach((l, p) => l.mark({ cur: !out && p.id === f.pc.prog ? f.pc.off : null, cov: new Set() }));
      right.innerHTML = "";
      right.append(h("div", { class: "panel-title", text: "Call stack (top frame first)" }));
      const stack = h("div", { class: "csa-frames no-math" });
      st.frames.slice().reverse().forEach((fr, i) => {
        const j = st.frames.length - 1 - i;
        const below = st.frames[j - 1];
        const p = J.byId[fr.pc.prog];
        stack.append(h("div", { class: "csa-frame" + (i === 0 && !out ? " on" : "") }, [
          h("div", { class: "csa-frame-head", html: "<b>" + esc(label(p)) + "</b> <span class='mono'>pc " + fr.pc.off + "</span>" }),
          h("div", { class: "mono", text: "λ = [" + fr.locals.map((v) => (v ? v.v : "·")).join(", ") + "]  σ = " + (fr.stack.length ? fr.stack.map((v) => v.v).join(" ") : "ε") }),
          below ? h("div", { class: "csa-ret", text: "returns to " + label(J.byId[below.pc.prog]) + ":" + (below.pc.off + 1) }) : h("div", { class: "csa-ret", text: "last frame: returning here ends the program" }),
        ]));
      });
      right.append(stack);
      if (rets.length) {
        right.append(h("div", { class: "panel-title csa-gap", text: "Returns so far" }));
        const strip = h("div", { class: "trace-strip no-math" });
        rets.forEach((x) => strip.append(h("span", { class: "ts", text: x.from + " to " + x.to })));
        right.append(strip);
      }
      const dests = new Set(rets.map((x) => x.to));
      stats.set("steps", String(n));
      stats.set("depth", String(st.frames.length));
      stats.set("rets", String(rets.length));
      stats.set("dests", String(dests.size), dests.size > 1 ? "good" : "");
      if (out) {
        verdict.className = "verdict good";
        verdict.innerHTML = "<b>The run ends with " + esc(out) + ".</b> Returns went to " + dests.size + " different place" + (dests.size === 1 ? "" : "s") + ": " + esc([...dests].join(", ")) + ". The instruction alone never says where to go: only the call stack does, and an analysis that keeps one state per offset has thrown the call stack away.";
      } else {
        verdict.className = "verdict";
        verdict.textContent = n ? "Last step: " + lastNote + "." : "Press Step, or Run to the next return.";
      }
    }
    sel.onchange = reset;
    reset();
  }

  /* --- 2. In-lining, one level at a time --- */
  function labInline(el) {
    const { controls, view } = PA.lab(el, {
      title: "In-lining, one level at a time",
      hint: "Each press replaces every call in <code>main</code> by the body of the callee. The analysis (one shared copy of whatever is still called) and a concrete run are repeated after each press.",
    });
    el.classList.add("wide");
    const top = h("div", { class: "csa-ctl" });
    controls.append(top);
    const lad = ladder(3);
    const OPTIONS = { idDivSafe: SUITE.idDivSafe, wrapDiv: SUITE.wrapDiv, ladder: lad, factConst: SUITE.factConst };
    const sel = PA.select(top, { label: "Program", options: [["idDivSafe", "id(0) / id(1)"], ["wrapDiv", "wrap(0) / wrap(1)"], ["ladder", "a call tree 3 levels deep"], ["factConst", "factorial(3): recursion"]], value: "idDivSafe" });
    const btns = PA.btnRow(controls);
    const more = PA.button(btns, "In-line one more level", () => inlineMore(), "primary");
    PA.button(btns, "Reset", () => reset());
    const stats = PA.stats(view, [{ key: "lvl", label: "Levels in-lined" }, { key: "size", label: "Instructions" }, { key: "calls", label: "Calls left" }, { key: "alarm", label: "False alarms" }, { key: "run", label: "Real run" }]);
    const grid = h("div", { class: "split" });
    const left = h("div"), right = h("div", { class: "csa-scroll" });
    grid.append(left, right);
    const verdict = h("div", { class: "verdict" });
    view.append(grid, verdict);
    const CAP = 300;
    let suite, cur, lvl;
    function reset() {
      suite = OPTIONS[sel.value];
      cur = suite.main;
      lvl = 0;
      more.disabled = false;
      left.innerHTML = "";
      left.append(PA.codeBlock(suite.java, "java"));
      render();
    }
    function inlineMore() {
      if (!callsIn(cur) || cur.code.length > CAP) return;
      cur = inlineProgram(cur);
      J.byId[cur.id] = cur;
      lvl++;
      render();
    }
    function render() {
      right.innerHTML = "";
      right.append(J.listing(cur).el);
      const A = makeAnalysis(cur, 0, 20000).run();
      const rep = report(A, suite.truth);
      const run = J.run(cur, [], { maxSteps: 5000 });
      const calls = callsIn(cur);
      stats.set("lvl", String(lvl));
      stats.set("size", String(cur.code.length), cur.code.length > 60 ? "warn" : "");
      stats.set("calls", String(calls), calls ? "" : "good");
      stats.set("alarm", rep.falseAlarms.length ? esc(rep.falseAlarms.join(", ")) : "none", rep.falseAlarms.length ? "bad" : "good");
      stats.set("run", esc(run.outcome));
      more.disabled = !calls || cur.code.length > CAP;
      let msg;
      if (!calls) msg = "<b>No calls left.</b> The whole program is now one method, so nothing is shared and nothing gets mixed. " + (rep.falseAlarms.length ? "" : "The analysis gives no false alarm, and the real run agrees with the original program.");
      else if (cur.code.length > CAP) msg = "<b>Stopped at " + cur.code.length + " instructions, with " + calls + " call" + (calls === 1 ? "" : "s") + " left.</b>";
      else if (suite.id === "factConst") msg = lvl ? "<b>Another copy, and still a call.</b> Every copy of <code>factorial</code> contains a call to <code>factorial</code>. In-lining a recursive method never finishes, so at some point you have to stop and handle the remaining call another way." : "<code>factorial</code> calls itself. Press the button and see whether the calls ever run out.";
      else if (lvl === 0) msg = "The original program. The analysis shares one copy of each method, so false alarms are possible.";
      else msg = "<b>" + calls + " call" + (calls === 1 ? "" : "s") + " left.</b> Every in-lined level does the job of one more call site of context.";
      verdict.className = "verdict " + (!calls ? "good" : suite.id === "factConst" && lvl ? "warn" : "");
      verdict.innerHTML = msg;
    }
    sel.onchange = reset;
    reset();
  }

  /* --- 3 to 5. The analysis, step by step: one lab with different settings --- */
  function analysisLab(el, o) {
    const { controls, view } = PA.lab(el, { title: o.title, hint: o.hint });
    el.classList.add("wide");
    const top = h("div", { class: "csa-ctl" });
    controls.append(top);
    const sel = PA.select(top, { label: "Program", options: o.programs.map((id) => [id, SUITE[id].label]), value: o.programs[0] });
    const kSeg = o.fixedK === undefined ? PA.seg(top, { label: "Context", options: [[0, "k = 0"], [1, "k = 1"], [2, "k = 2"], [3, "k = 3"], [INF, "full stack"]], value: o.startK === undefined ? 1 : o.startK }) : null;
    const viewSeg = PA.seg(top, { label: "Show values as", options: [["itv", "intervals"], ["sign", "signs"]], value: "itv" });
    const btns = PA.btnRow(controls);
    PA.button(btns, "Next step", () => advance(1), "primary");
    PA.button(btns, "Run to the fixed point", () => advance(Infinity));
    PA.button(btns, "Reset", () => reset(false));
    const stats = PA.stats(view, [{ key: "visits", label: "Steps" }, { key: "ctx", label: "Method copies" }, { key: "states", label: "Abstract states" }, { key: "st", label: "Fixed point?" }, { key: "alarm", label: "False alarms" }]);
    const grid = h("div", { class: "split" });
    const left = h("div"), right = h("div");
    grid.append(left, right);
    const verdict = h("div", { class: "verdict" });
    const details = h("details", { class: "proof csa-details" }, [h("summary", { text: "Every abstract state, per offset" })]);
    const detailBody = h("div");
    details.append(detailBody);
    view.append(grid, verdict, details);
    let suite, A, lst, k;
    function reset(auto) {
      suite = SUITE[sel.value];
      k = o.fixedK !== undefined ? o.fixedK : kSeg.value;
      A = makeAnalysis(suite.main, k, 3000);
      left.innerHTML = "";
      left.append(PA.codeBlock(suite.java, "java"));
      lst = listings(left, suite);
      if (auto) A.run();
      render();
    }
    function advance(n) {
      for (let i = 0; i < n; i++) if (!A.step()) break;
      render();
    }
    function render() {
      const vw = viewSeg.value;
      const cur = A.cur;
      const rep = report(A, suite.truth);
      lst.forEach((l, p) => {
        const cov = new Set();
        A.insts.forEach((I) => { if (I.m === p) I.states.forEach((_, pc) => cov.add(pc)); });
        let err = null;
        A.outcomes.forEach((list, name) => { if (name !== "ok") list.forEach((x) => { if (x.I.m === p) err = x.pc; }); });
        l.mark({ cur: cur && cur.I.m === p ? cur.pc : null, cov, err });
      });
      right.innerHTML = "";
      right.append(h("div", { class: "panel-title", text: "One row per method copy" }));
      const t = h("table", { class: "dt csa-ctx no-math" });
      t.innerHTML = "<thead><tr><th>method</th><th>context</th><th>returns to</th><th>arguments</th><th>returns</th></tr></thead>";
      const tb = h("tbody");
      A.insts.slice(0, 30).forEach((I) => {
        const entry = I.states.get(0);
        tb.append(h("tr", { class: cur && cur.I === I ? "on" : "" }, [
          h("td", { class: "mono", text: label(I.m) }),
          h("td", { class: "mono", text: ctxStr(I.ctx) }),
          h("td", { class: "mono", text: returnsTo(I) }),
          h("td", { class: "mono", text: entry ? entry.locals.slice(0, I.m.params.length).map((v) => showAV(v, vw)).join(", ") || "·" : "·" }),
          h("td", { class: "mono", text: I.returned ? showItv(I.ret, vw) : "not yet" }),
        ]));
      });
      t.append(tb);
      right.append(h("div", { class: "table-wrap" }, [t]));
      if (A.insts.length > 30) right.append(h("p", { class: "csa-sub", text: "Showing 30 of " + A.insts.length + " method copies." }));
      if (A.log.length) {
        right.append(h("div", { class: "panel-title csa-gap", text: "Last steps" }));
        const ol = h("ol", { class: "csa-log no-math" });
        A.log.slice(-5).forEach((e) => ol.append(h("li", { html: "<span class='mono'>" + esc(e.site) + "</span>" + (e.ctx.length ? " <span class='csa-sub'>in " + esc(ctxStr(e.ctx)) + "</span>" : "") + ": " + esc(e.note) })));
        right.append(ol);
      }
      detailBody.innerHTML = "";
      const dt = h("table", { class: "dt csa-ctx no-math" });
      dt.innerHTML = "<thead><tr><th>context</th><th>offset</th><th>locals</th><th>stack</th></tr></thead>";
      const db = h("tbody");
      let rows = 0;
      A.insts.forEach((I) => [...I.states.keys()].sort((a, b) => a - b).forEach((pc) => {
        if (rows++ >= 120) return;
        const f = I.states.get(pc);
        db.append(h("tr", null, [h("td", { class: "mono", text: ctxStr(I.ctx) }), h("td", { class: "mono", text: label(I.m) + ":" + pc }), h("td", { class: "mono", text: localsText(I.m, f, vw) }), h("td", { class: "mono", text: f.stack.length ? f.stack.map((v) => showAV(v, vw)).join(" ") : "ε" })]));
      }));
      dt.append(db);
      detailBody.append(h("div", { class: "table-wrap" }, [dt]));
      stats.set("visits", String(A.visits));
      stats.set("ctx", String(A.insts.length));
      stats.set("states", String(A.states()));
      stats.set("st", A.done ? "yes" : A.stopped ? "never (stopped)" : "not yet", A.done ? "good" : A.stopped ? "bad" : "");
      stats.set("alarm", rep.falseAlarms.length ? esc(rep.falseAlarms.join(", ")) : "none", rep.falseAlarms.length ? "bad" : A.done ? "good" : "");
      if (A.stopped) {
        verdict.className = "verdict bad";
        verdict.innerHTML = "<b>No fixed point after " + A.visits + " steps, and " + A.insts.length + " method copies so far.</b> " + suite.lesson(k);
      } else if (A.done) {
        const parts = rep.reached.map((name) => pill(name, suite.truth.includes(name) ? (name === "ok" ? "ok" : "err") : "maybe") + (suite.truth.includes(name) ? "" : " <span class='csa-sub'>" + (name === "ok" ? "not possible in a real run" : "false alarm") + "</span>"));
        const sites = [];
        A.outcomes.forEach((list, name) => { if (name !== "ok") list.forEach((x) => sites.push(x.site + (x.I.ctx.length ? " in context " + ctxStr(x.I.ctx) : "") + " (" + x.why + ")")); });
        verdict.className = "verdict " + (rep.falseAlarms.length ? "warn" : "good");
        verdict.innerHTML = "<b>Fixed point after " + A.visits + " steps (" + kName(k) + ").</b> Outcomes: " + (parts.join(" ") || "none") + ". " + (sites.length ? "Reported at " + esc(sites.join("; ")) + ". " : "") + suite.lesson(k);
      } else {
        verdict.className = "verdict";
        verdict.innerHTML = A.visits ? "Step " + A.visits + "." + (rep.reached.length ? " Reached so far: " + esc(rep.reached.join(", ")) + "." : "") : "Press <b>Next step</b> to follow the worklist, or run to the fixed point.";
      }
    }
    sel.onchange = () => reset(o.auto);
    if (kSeg) kSeg.onchange = () => reset(o.auto);
    viewSeg.onchange = render;
    reset(o.auto);
  }
  const labPlumbing = (el) => analysisLab(el, {
    title: "One shared copy of each method",
    hint: "The analysis with k = 0. Step through it and watch the row of <code>id</code>: its return set and its argument both grow, and every change is sent back to all callers. Call sites are written method:offset, with bytecode offsets.",
    programs: ["idSum", "idDivSafe", "idDivBug", "pickDiv"], fixedK: 0,
  });
  const labFullStack = (el) => analysisLab(el, {
    title: "One copy per call stack",
    hint: "The same analysis, with the whole call stack in the key. Compare the rows with the previous lab, and try the recursive programs.",
    programs: ["idDivSafe", "wrapDiv", "pickDiv", "factConst", "factOf"], fixedK: INF,
  });
  const labKcfa = (el) => analysisLab(el, {
    title: "k-CFA: choose how much of the call stack to keep",
    hint: "Change k and the program, and see what happens to the false alarms and to the number of states. With recursive programs the return value also needs widening (Week 6), which the analysis applies to a state after it has changed three times.",
    programs: ["wrapDiv", "wrap2Div", "idDivSafe", "pickDiv", "divideBug", "domainLimit", "factConst", "factOf", "evenOdd"], startK: 1, auto: true,
  });

  /* --- 6. What the full stack costs --- */
  function labLadder(el) {
    const { controls, view } = PA.lab(el, {
      title: "A call tree that doubles at every level",
      hint: "<code>f0</code> calls <code>f1</code> twice, <code>f1</code> calls <code>f2</code> twice, and so on. Nothing else changes between the rows, only how much of the call stack is kept.",
    });
    el.classList.add("wide");
    const top = h("div", { class: "csa-ctl" });
    controls.append(top);
    const nS = PA.slider(top, { label: "Levels d", min: 1, max: 12, value: 5 });
    const grid = h("div", { class: "split" });
    const left = h("div"), right = h("div");
    grid.append(left, right);
    const verdict = h("div", { class: "verdict" });
    view.append(grid, verdict);
    function run() {
      const n = nS.value;
      const s = ladder(n);
      left.innerHTML = "";
      left.append(PA.codeBlock(s.java, "java"));
      const t = h("table", { class: "dt" });
      t.innerHTML = "<thead><tr><th>context</th><th>method copies</th><th>abstract states</th><th>steps</th></tr></thead>";
      const tb = h("tbody");
      const rows = [0, 1, 2, 3, INF].map((k) => {
        const A = makeAnalysis(s.main, k, 400000).run();
        tb.append(h("tr", { class: k === INF ? "bad" : "" }, [h("td", { class: "mono", text: kName(k) }), h("td", { class: "num", text: A.insts.length.toLocaleString("en") }), h("td", { class: "num", text: A.states().toLocaleString("en") }), h("td", { class: "num", text: A.visits.toLocaleString("en") })]));
        return A;
      });
      t.append(tb);
      right.innerHTML = "";
      right.append(h("div", { class: "table-wrap" }, [t]));
      const full = rows[4], k1 = rows[1];
      verdict.className = "verdict";
      verdict.innerHTML = "<b>" + full.insts.length.toLocaleString("en") + " method copies for the full stack, " + k1.insts.length.toLocaleString("en") + " for k = 1.</b> The full stack needs one copy per path in the call tree: 2<sup>d+1</sup> in total, including <code>main</code>, so one more level doubles the work. With k fixed, each method has at most one copy per k-long history of call sites, however deep the program is.";
    }
    nS.onchange = run;
    run();
  }

  /* --- 7. Every program, every k --- */
  function labGrid(el) {
    const { view } = PA.lab(el, {
      title: "Every program, every k",
      hint: "Each cell is one complete analysis. Find the smallest k that gives the true answer for each program, and the programs where no k does.",
    });
    el.classList.add("wide");
    const KS = [0, 1, 2, 3, INF];
    const t = h("table", { class: "dt csa-grid no-math" });
    t.innerHTML = "<thead><tr><th>program</th><th>true outcome</th>" + KS.map((k) => "<th>" + kName(k) + "</th>").join("") + "</tr></thead>";
    const tb = h("tbody");
    SUITES.forEach((s) => {
      const tr = h("tr", null, [h("td", { class: "mono", text: s.label }), h("td", { html: s.truth.map((o) => pill(o, o === "ok" ? "ok" : "err")).join(" ") })]);
      KS.forEach((k) => {
        const A = makeAnalysis(s.main, k, 3000).run();
        const r = report(A, s.truth);
        const verdictHtml = !A.done ? pill("no fixed point", "maybe") : r.falseAlarms.length ? pill("false alarm", "err") : r.spuriousOk ? pill("too wide", "maybe") : pill("right", "ok");
        tr.append(h("td", { html: verdictHtml + "<div class='csa-sub'>" + (A.done ? A.states() + " states" : A.insts.length + "+ copies") + "</div>" }));
      });
      tb.append(tr);
    });
    t.append(tb);
    view.append(h("div", { class: "table-wrap" }, [t]));
    view.append(h("div", { class: "verdict", html: "<b>Read the rows from left to right.</b> False alarms disappear as k grows, as far as context can help at all. Wrappers push the k you need upward, the row <code>if (n != 0) inv(n)</code> is never fixed by context, and recursion with an unknown argument defeats the full stack. \"Too wide\" means the real error is found, but the analysis also thinks the program might finish normally." }));
  }

  PA.boot("context-sensitive-analysis", {
    callstack: labCallstack, inline: labInline, plumbing: labPlumbing, fullstack: labFullStack,
    ladder: labLadder, kcfa: labKcfa, grid: labGrid,
  }, QUIZ);
})();
