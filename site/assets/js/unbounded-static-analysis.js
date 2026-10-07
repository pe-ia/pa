/* Week 6, Unbounded Static Analysis: example programs, an interval domain, a domain-generic abstract
   interpreter (lockstep rounds and worklist, with join or widening), named values, control-flow graphs
   (DFS, reverse post-order, Tarjan's SCCs), the quiz bank and the labs. */
(function () {
  "use strict";
  const h = PA.h;
  const S = PA.sign;
  const INF = Infinity;

  /* =====================================================================
     Example programs of this lecture, registered next to the shared ones
     ===================================================================== */
  const L = (i) => ({ op: "load", type: "I", index: i });
  const P = (v) => ({ op: "push", type: "I", value: v });
  const B = (o) => ({ op: "binary", type: "I", operant: o });
  const R = () => ({ op: "return", type: "I" });
  const ST = (i) => ({ op: "store", type: "I", index: i });
  const LOCAL = [
    {
      id: "safeDivByN", cls: "jpamb.cases.Dependent", desc: "(I)I", params: [{ name: "n", type: "int" }], returns: "int",
      java: '@Case("(0) -> ok")\n@Case("(1) -> ok")\npublic static int safeDivByN(int n) {\n  if (n != 0) {\n    return 1 / n;\n  }\n  return 0;\n}',
      cases: [["(0)", "ok"], ["(1)", "ok"]], truth: ["ok"],
      code: [L(0), { op: "ifz", condition: "eq", target: 6 }, P(1), L(0), B("div"), R(), P(0), R()],
    },
    {
      id: "safeDivAByB", cls: "jpamb.cases.Dependent", desc: "(II)I", params: [{ name: "a", type: "int" }, { name: "b", type: "int" }], returns: "int",
      java: '@Case("(0, 0) -> ok")\n@Case("(1, 1) -> ok")\npublic static int safeDivAByB(int a, int b) {\n  if (a >= 0) {\n    if (b > a) {\n      return a / b;\n    }\n  }\n  return 0;\n}',
      cases: [["(0, 0)", "ok"], ["(1, 1)", "ok"]], truth: ["ok"],
      code: [L(0), { op: "ifz", condition: "lt", target: 9 }, L(1), L(0), { op: "if", condition: "le", target: 9 }, L(0), L(1), B("div"), R(), P(0), R()],
    },
    {
      id: "safeDivSwapped", cls: "jpamb.cases.Dependent", desc: "(II)I", params: [{ name: "a", type: "int" }, { name: "b", type: "int" }], returns: "int",
      java: '@Case("(0, 0) -> ok")\n@Case("(0, 1) -> ok")\npublic static int safeDivSwapped(int a, int b) {\n  if (b > a) {\n    if (a >= 0) {\n      return a / b;\n    }\n  }\n  return 0;\n}',
      cases: [["(0, 0)", "ok"], ["(0, 1)", "ok"]], truth: ["ok"],
      code: [L(1), L(0), { op: "if", condition: "le", target: 9 }, L(0), { op: "ifz", condition: "lt", target: 9 }, L(0), L(1), B("div"), R(), P(0), R()],
    },
    {
      id: "loopTo100", cls: "jpamb.cases.Loops", desc: "()I", params: [], returns: "int",
      java: '@Case("() -> ok")\npublic static int loopTo100() {\n  int i = 0;\n  while (i < 100) {\n    i += 1;\n  }\n  return 1000 / (i - 50);\n}',
      cases: [["()", "ok"]], truth: ["ok"],
      code: [P(0), ST(0), L(0), P(100), { op: "if", condition: "ge", target: 7 }, { op: "incr", index: 0, amount: 1 }, { op: "goto", target: 2 }, P(1000), L(0), P(50), B("sub"), B("div"), R()],
    },
    {
      id: "ifThenElse", cls: "jpamb.cases.Dependent", desc: "(I)I", params: [{ name: "x", type: "int" }], returns: "int",
      java: '@Case("(0) -> ok")\n@Case("(4) -> ok")\npublic static int ifThenElse(int x) {\n  int i = 0;\n  if (x == 0) {\n    i += 1;\n  } else {\n    i -= 1;\n  }\n  return 10 / i;\n}',
      cases: [["(0)", "ok"], ["(4)", "ok"]], truth: ["ok"],
      code: [P(0), ST(1), L(0), { op: "ifz", condition: "ne", target: 6 }, { op: "incr", index: 1, amount: 1 }, { op: "goto", target: 7 }, { op: "incr", index: 1, amount: -1 }, P(10), L(1), B("div"), R()],
    },
    {
      id: "runsForever", cls: "jpamb.cases.Loops", desc: "()V", params: [], returns: "void",
      java: '// The notes\' example. On Java ints it ends after 2^31 rounds,\n// when i + 1 wraps around to a negative number.\n@Case("() -> *")\npublic static void runsForever() {\n  int i = 0;\n  while (i >= 0) {\n    i = i + 1;\n  }\n}',
      cases: [["()", "*"]], truth: ["*"],
      code: [P(0), ST(0), L(0), { op: "ifz", condition: "lt", target: 9 }, L(0), P(1), B("add"), ST(0), { op: "goto", target: 2 }, { op: "return", type: null }],
    },
    {
      id: "manyOps", cls: "jpamb.cases.Dependent", desc: "(I)I", params: [{ name: "x", type: "int" }], returns: "int",
      java: '@Case("(0) -> ok")\npublic static int manyOps(int x) {\n  int i = 0;\n  if (x == 0) {\n    i += 1;\n  } else {\n    i -= 1;\n  }\n  i = i * 2;   // many operations on i\n  i = i + 3;\n  i = i - 1;\n  return i;\n}',
      cases: [["(0)", "ok"]], truth: ["ok"],
      code: [P(0), ST(1), L(0), { op: "ifz", condition: "ne", target: 6 }, { op: "incr", index: 1, amount: 1 }, { op: "goto", target: 7 }, { op: "incr", index: 1, amount: -1 },
        L(1), P(2), B("mul"), ST(1), L(1), P(3), B("add"), ST(1), L(1), P(1), B("sub"), ST(1), L(1), R()],
    },
  ];
  LOCAL.forEach((p) => { p.name = p.id; p.methodId = p.cls + "." + p.id + ":" + p.desc; PA.jvm.byId[p.id] = p; });
  const TRUTH = {
    safeDivByN: ["ok"], safeDivAByB: ["ok"], safeDivSwapped: ["ok"], loopTo100: ["ok"], ifThenElse: ["ok"], runsForever: ["*"], manyOps: ["ok"],
    divideAfterCheck: ["ok"], plusOneDivide: ["ok"], copyThenDivide: ["ok"], divideByN: ["ok", "divide by zero"], sumTo: ["ok"],
    countdown: ["ok", "*"], collatz: ["ok", "*"], checkTheWrongThing: ["ok", "divide by zero"],
  };
  const prog = (id) => PA.jvm.get(id);

  /* =====================================================================
     The interval domain  Itval = { [i, j] | i <= j } + bottom, with i, j in Z + {-inf, +inf}
     Bottom is null.  Arithmetic is over mathematical integers (no 32-bit wrap-around).
     ===================================================================== */
  const mulB = (x, y) => (x === 0 || y === 0 ? 0 : x * y);
  function divB(x, y) {
    if (!isFinite(y)) return isFinite(x) ? 0 : 0;
    if (!isFinite(x)) return (x > 0) === (y > 0) ? INF : -INF;
    return Math.trunc(x / y);
  }
  function minK(v, K) { let best = -INF; K.forEach((k) => { if (k <= v && k > best) best = k; }); return best; }
  function maxK(v, K) { let best = INF; K.forEach((k) => { if (k >= v && k < best) best = k; }); return best; }
  const ITV = {
    name: "Interval",
    mk(lo, hi) { return lo > hi ? null : { lo, hi }; },
    top: () => ({ lo: -INF, hi: INF }),
    bool: () => ({ lo: 0, hi: 1 }),
    of: (n) => ({ lo: n, hi: n }),
    isBot: (a) => a == null,
    join(a, b) { if (!a) return b; if (!b) return a; return { lo: Math.min(a.lo, b.lo), hi: Math.max(a.hi, b.hi) }; },
    meet(a, b) { if (!a || !b) return null; return ITV.mk(Math.max(a.lo, b.lo), Math.min(a.hi, b.hi)); },
    leq(a, b) { if (!a) return true; if (!b) return false; return b.lo <= a.lo && a.hi <= b.hi; },
    eq(a, b) { if (!a || !b) return a === b; return a.lo === b.lo && a.hi === b.hi; },
    contains: (a, n) => !!a && a.lo <= n && n <= a.hi,
    abstract(ns) { let lo = INF, hi = -INF; for (const n of ns) { if (n < lo) lo = n; if (n > hi) hi = n; } return ITV.mk(lo, hi); },
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
      const err = ITV.contains(b, 0);
      let r = null;
      const parts = [];
      if (b.lo <= -1) parts.push({ lo: b.lo, hi: Math.min(b.hi, -1) });
      if (b.hi >= 1) parts.push({ lo: Math.max(b.lo, 1), hi: b.hi });
      parts.forEach((p) => {
        const c = [divB(a.lo, p.lo), divB(a.lo, p.hi), divB(a.hi, p.lo), divB(a.hi, p.hi)];
        r = ITV.join(r, { lo: Math.min(...c), hi: Math.max(...c) });
      });
      return { value: r, err };
    },
    rem(a, b) {
      if (!a || !b) return { value: null, err: false };
      const err = ITV.contains(b, 0);
      if (b.lo === 0 && b.hi === 0) return { value: null, err };
      const bound = Math.max(Math.abs(b.lo), Math.abs(b.hi)) - 1;
      let v;
      if (a.lo >= 0) v = { lo: 0, hi: Math.min(a.hi, bound) };
      else if (a.hi <= 0) v = { lo: Math.max(a.lo, -bound), hi: 0 };
      else v = { lo: Math.max(a.lo, -bound), hi: Math.min(a.hi, bound) };
      return { value: v, err };
    },
    /* refine(c, a, b): the parts of a and b that can make "x c y" true */
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
          ra = a; rb = b;
          const trim = (x, k) => { if (!x) return x; if (x.lo === k && x.hi === k) return null; if (x.lo === k) return { lo: k + 1, hi: x.hi }; if (x.hi === k) return { lo: x.lo, hi: k - 1 }; return x; };
          if (b.lo === b.hi) ra = trim(a, b.lo);
          if (a.lo === a.hi) rb = trim(b, a.lo);
          break;
        }
        default: throw new Error("bad condition " + c);
      }
      if (!ra || !rb) return [null, null];
      return [ra, rb];
    },
    widenCourse(a, b, K) { if (!a) return b; if (!b) return a; return { lo: minK(Math.min(a.lo, b.lo), K), hi: maxK(Math.max(a.hi, b.hi), K) }; },
    widenStd(a, b, K) {
      if (!a) return b; if (!b) return a;
      return { lo: b.lo < a.lo ? minK(b.lo, K) : a.lo, hi: b.hi > a.hi ? maxK(b.hi, K) : a.hi };
    },
    fmtB: (x) => (x === INF ? "+∞" : x === -INF ? "−∞" : String(x).replace("-", "−")),
    fmt(a) { return a ? "[" + ITV.fmtB(a.lo) + ", " + ITV.fmtB(a.hi) + "]" : "⊥"; },
    texB: (x) => (x === INF ? "\\infty" : x === -INF ? "-\\infty" : String(x)),
    tex(a) { return a ? "[" + ITV.texB(a.lo) + ", " + ITV.texB(a.hi) + "]" : "\\bot"; },
    parse(s) {
      const t = String(s).replace(/[\[\]\s]/g, "").toLowerCase();
      if (t === "⊥" || t === "bot" || t === "empty") return null;
      const m = /^([+-]?(?:\d+|inf|∞)),([+-]?(?:\d+|inf|∞))$/.exec(t.replace(/−/g, "-"));
      if (!m) throw new Error("write it as lo, hi (e.g. -3, 5 or 0, inf)");
      const num = (x) => (/inf|∞/.test(x) ? (x.startsWith("-") ? -INF : INF) : parseInt(x, 10));
      const lo = num(m[1]), hi = num(m[2]);
      if (lo > hi) throw new Error("lo must be at most hi");
      return { lo, hi };
    },
  };

  /* =====================================================================
     A domain-generic abstract interpreter over Pv[D] (per instruction, per variable)
     frame = { locals: [AV], stack: [AV] },  AV = { k: "int", v, src? } | { k: "ref" } | null
     opts: { refine: "none" | "src", mode: "join" | "course" | "std", K: [ints], widenAt: "heads" | "all" }
     ===================================================================== */
  const NEG_COND = PA.jvm.NEG_COND;
  const avInt = (v, src) => (src == null ? { k: "int", v } : { k: "int", v, src });
  function fmtAV(D, a) { if (a == null) return "·"; if (a.k === "int") return D.fmt(a.v); return "ref"; }
  function initFrame(p, D) {
    return { locals: p.params.map((q) => (q.type === "int" ? avInt(D.top()) : q.type === "boolean" ? avInt(D.bool()) : { k: "ref" })), stack: [] };
  }
  function joinAV(D, a, b) {
    if (a == null) return b; if (b == null) return a;
    if (a.k === "int" && b.k === "int") return avInt(D.join(a.v, b.v), a.src === b.src ? a.src : null);
    return { k: "ref" };
  }
  function widenAV(D, old, nw, opts) {
    if (old == null || nw == null || old.k !== "int" || nw.k !== "int") return nw;
    const f = opts.mode === "std" ? D.widenStd : D.widenCourse;
    return avInt(f(old.v, nw.v, opts.K || []), old.src === nw.src ? old.src : null);
  }
  function eqAV(D, a, b) {
    if (a == null || b == null) return a === b;
    return a.k === b.k && (a.k !== "int" || (D.eq(a.v, b.v) && a.src === b.src));
  }
  function joinFrame(D, f, g) {
    if (!f) return g; if (!g) return f;
    const n = Math.max(f.locals.length, g.locals.length), locals = [];
    for (let i = 0; i < n; i++) locals.push(joinAV(D, f.locals[i], g.locals[i]));
    return { locals, stack: f.stack.map((v, i) => joinAV(D, v, g.stack[i])) };
  }
  function widenFrame(D, old, nw, opts) {
    const n = Math.max(old.locals.length, nw.locals.length), locals = [];
    for (let i = 0; i < n; i++) locals.push(widenAV(D, old.locals[i], nw.locals[i], opts));
    return { locals, stack: nw.stack.map((v, i) => widenAV(D, old.stack[i], v, opts)) };
  }
  function eqFrame(D, f, g) {
    if (!f || !g) return f === g;
    if (f.stack.length !== g.stack.length || f.locals.length !== g.locals.length) return false;
    return f.locals.every((v, i) => eqAV(D, v, g.locals[i])) && f.stack.every((v, i) => eqAV(D, v, g.stack[i]));
  }
  function setLocal(f, i, v) {
    f.locals[i] = v;
    f.stack = f.stack.map((x) => (x && x.k === "int" && x.src === i ? avInt(x.v) : x));
  }
  function refineSrc(D, g, v, r) {
    if (v && v.src != null && g.locals[v.src] && g.locals[v.src].k === "int") g.locals[v.src] = avInt(D.meet(g.locals[v.src].v, r));
  }

  /* successors of one abstract frame at offset off: { succ: [[off, frame]], out: [[outcome, why]], note } */
  function stepOne(p, D, off, f0, opts) {
    const ins = p.code[off];
    const f = { locals: f0.locals.slice(), stack: f0.stack.slice() };
    const succ = [], out = [];
    const go = (o, g) => succ.push([o, g || f]);
    let note = "";
    switch (ins.op) {
      case "push": f.stack.push(avInt(D.of(ins.value))); go(off + 1); note = "push " + D.fmt(D.of(ins.value)); break;
      case "load": {
        const v = f.locals[ins.index];
        f.stack.push(v && v.k === "int" ? avInt(v.v, ins.index) : v || { k: "ref" });
        go(off + 1); note = "load λ[" + ins.index + "] = " + fmtAV(D, v); break;
      }
      case "store": { const v = f.stack.pop(); setLocal(f, ins.index, v && v.k === "int" ? avInt(v.v) : v); go(off + 1); note = "λ[" + ins.index + "] := " + fmtAV(D, v); break; }
      case "incr": {
        const v = f.locals[ins.index];
        const r = D.add(v.v, D.of(ins.amount));
        setLocal(f, ins.index, avInt(r)); go(off + 1); note = "λ[" + ins.index + "] := " + D.fmt(v.v) + " + " + ins.amount + " = " + D.fmt(r); break;
      }
      case "negate": { const v = f.stack.pop(); f.stack.push(avInt(D.neg(v.v))); go(off + 1); break; }
      case "binary": {
        const b = f.stack.pop(), a = f.stack.pop();
        let r;
        if (ins.operant === "add") r = D.add(a.v, b.v);
        else if (ins.operant === "sub") r = D.sub(a.v, b.v);
        else if (ins.operant === "mul") r = D.mul(a.v, b.v);
        else {
          const d = ins.operant === "div" ? D.div(a.v, b.v) : D.rem(a.v, b.v);
          if (d.err) out.push(["divide by zero", "divisor " + D.fmt(b.v) + " contains 0"]);
          r = d.value;
        }
        note = D.fmt(a.v) + " " + ins.operant + " " + D.fmt(b.v) + " = " + D.fmt(r);
        if (!D.isBot(r)) { f.stack.push(avInt(r)); go(off + 1); }
        break;
      }
      case "ifz": case "if": {
        let a, b, bv = null;
        if (ins.op === "ifz") { a = f.stack.pop(); b = avInt(D.of(0)); } else { bv = f.stack.pop(); a = f.stack.pop(); b = bv; }
        const parts = [];
        [[ins.condition, ins.target, "jump"], [NEG_COND[ins.condition], off + 1, "fall through"]].forEach(([c, to, what]) => {
          const [ra, rb] = D.refine(c, a.v, b.v);
          if (D.isBot(ra) || D.isBot(rb)) { parts.push(what + ": impossible"); return; }
          const g = { locals: f.locals.slice(), stack: f.stack.slice() };
          if (opts.refine !== "none") { refineSrc(D, g, a, ra); if (bv) refineSrc(D, g, bv, rb); }
          go(to, g);
          parts.push(what + (opts.refine !== "none" && a.src != null ? ": λ[" + a.src + "] ∈ " + D.fmt(ra) : ": possible"));
        });
        note = parts.join("; ");
        break;
      }
      case "goto": go(ins.target); note = "jump to " + ins.target; break;
      case "get": f.stack.push(avInt(D.of(0))); go(off + 1); note = "assertions are on"; break;
      case "new": f.stack.push({ k: "ref" }); go(off + 1); break;
      case "dup": f.stack.push(f.stack[f.stack.length - 1]); go(off + 1); break;
      case "invoke":
        if (ins.access === "special") { f.stack.pop(); go(off + 1); break; }
        f.stack.splice(f.stack.length - ins.argc, ins.argc);
        if (ins.returns === "int") f.stack.push(avInt(D.top()));
        go(off + 1); note = "call not analysed: result top"; break;
      case "throw": f.stack.pop(); out.push(["assertion error", "throw"]); note = "throw"; break;
      case "return": out.push(["ok", "return"]); note = "return"; break;
      case "arraylength": f.stack.pop(); f.stack.push(avInt(D.top())); out.push(["null pointer", "array may be null"]); go(off + 1); break;
      case "array_load": f.stack.pop(); f.stack.pop(); out.push(["out of bounds", "index not tracked"], ["null pointer", "array may be null"]); f.stack.push(avInt(D.top())); go(off + 1); break;
      default: throw new Error("unknown op " + ins.op);
    }
    return { succ, out, note };
  }

  function combine(D, old, inc, to, opts, heads) {
    if (!old) return inc;
    const j = joinFrame(D, old, inc);
    if (opts.mode && opts.mode !== "join" && (opts.widenAt === "all" || heads.has(to))) return widenFrame(D, old, j, opts);
    return j;
  }

  /* Lockstep rounds:  A_{n+1} = Delta_A(A_n) combined with A_n  (as in Week 5, but with join or widening). */
  function lockInit(p, D) { return { n: 0, states: new Map([[0, initFrame(p, D)]]), outcomes: new Set(), changed: new Set([0]), visits: 0, stable: false }; }
  function lockStep(p, D, A, opts, heads) {
    const incoming = new Map(), outcomes = new Set(A.outcomes), log = [];
    A.states.forEach((f, off) => {
      const r = stepOne(p, D, off, f, opts);
      r.succ.forEach(([to, g]) => incoming.set(to, incoming.has(to) ? joinFrame(D, incoming.get(to), g) : g));
      r.out.forEach(([o]) => outcomes.add(o));
      log.push({ off, note: r.note });
    });
    const states = new Map(A.states), changed = new Set();
    incoming.forEach((g, to) => {
      const old = A.states.get(to);
      const nf = combine(D, old, g, to, opts, heads);
      if (!old || !eqFrame(D, old, nf)) { states.set(to, nf); changed.add(to); }
    });
    const newOut = [...outcomes].filter((o) => !A.outcomes.has(o));
    return { n: A.n + 1, states, outcomes, changed, log, visits: A.visits + A.states.size, stable: changed.size === 0 && newOut.length === 0 };
  }
  function lockRun(p, D, opts, cap) {
    const heads = loopHeads(p);
    let A = lockInit(p, D);
    const rounds = [A];
    for (let i = 0; i < (cap || 300) && !A.stable; i++) { A = lockStep(p, D, A, opts, heads); rounds.push(A); }
    return rounds;
  }

  /* Worklist iteration; order "fifo" | "lifo" | "rpo". Returns the final states and every event. */
  function worklistRun(p, D, opts, order, cap) {
    const heads = loopHeads(p);
    const rpo = instrRPO(p);
    const states = new Map([[0, initFrame(p, D)]]);
    const outcomes = new Set();
    let wl = [0];
    const events = [];
    let visits = 0;
    while (wl.length && visits < (cap || 2000)) {
      let pc;
      if (order === "lifo") pc = wl.pop();
      else if (order === "rpo") { let bi = 0; wl.forEach((x, i) => { if (rpo.index[x] < rpo.index[wl[bi]]) bi = i; }); pc = wl[bi]; wl.splice(bi, 1); }
      else pc = wl.shift();
      visits++;
      const r = stepOne(p, D, pc, states.get(pc), opts);
      r.out.forEach(([o]) => outcomes.add(o));
      const changed = [];
      r.succ.forEach(([to, g]) => {
        const old = states.get(to);
        const nf = combine(D, old, g, to, opts, heads);
        if (!old || !eqFrame(D, old, nf)) { states.set(to, nf); changed.push(to); if (!wl.includes(to)) wl.push(to); }
      });
      events.push({ pc, changed, wl: wl.slice(), note: r.note, outcomes: new Set(outcomes) });
    }
    return { states, outcomes, events, visits, done: wl.length === 0 };
  }

  /* =====================================================================
     Control-flow graphs: instruction successors, DFS orders, back edges, basic blocks, Tarjan
     ===================================================================== */
  function succOf(p, i) {
    const ins = p.code[i];
    switch (ins.op) {
      case "goto": return [ins.target];
      case "ifz": case "if": return ins.target === i + 1 ? [i + 1] : [ins.target, i + 1];
      case "return": case "throw": return [];
      default: return i + 1 < p.code.length ? [i + 1] : [];
    }
  }
  /* depth-first search over a graph given by succ(v); returns discovery order, post-order, RPO, back edges */
  function dfs(n, succ, root) {
    const color = new Array(n).fill(0), pre = [], post = [], back = [], tree = [], fwdcross = [];
    (function visit(v) {
      color[v] = 1; pre.push(v);
      succ(v).forEach((w) => {
        if (color[w] === 0) { tree.push([v, w]); visit(w); }
        else if (color[w] === 1) back.push([v, w]);
        else fwdcross.push([v, w]);
      });
      color[v] = 2; post.push(v);
    })(root || 0);
    const rpo = post.slice().reverse();
    const index = {};
    rpo.forEach((v, i) => (index[v] = i));
    return { pre, post, rpo, index, back, tree, fwdcross, reached: color.map((c) => c > 0) };
  }
  function instrRPO(p) { return dfs(p.code.length, (v) => succOf(p, v), 0); }
  function loopHeads(p) { return new Set(instrRPO(p).back.map(([, w]) => w)); }

  function basicBlocks(p) {
    const n = p.code.length, leader = new Set([0]);
    p.code.forEach((ins, i) => {
      if (ins.op === "goto" || ins.op === "ifz" || ins.op === "if") { leader.add(ins.target); if (i + 1 < n) leader.add(i + 1); }
      if (ins.op === "return" || ins.op === "throw") { if (i + 1 < n) leader.add(i + 1); }
    });
    const starts = [...leader].sort((a, b) => a - b);
    const blocks = starts.map((s, k) => ({ id: k, start: s, end: (k + 1 < starts.length ? starts[k + 1] : n) - 1 }));
    const of = {};
    blocks.forEach((b) => { for (let i = b.start; i <= b.end; i++) of[i] = b.id; });
    blocks.forEach((b) => {
      const last = p.code[b.end];
      b.succ = succOf(p, b.end).map((t) => of[t]);
      b.exit = last.op === "return" ? "ok" : last.op === "throw" ? "throw" : null;
      b.cond = last.op === "ifz" || last.op === "if";
      b.jump = b.cond ? of[last.target] : null;
    });
    return { blocks, of };
  }
  /* Tarjan's algorithm, as a list of events for step-by-step display */
  function tarjanEvents(n, succ) {
    const index = new Array(n).fill(-1), low = new Array(n).fill(-1), on = new Array(n).fill(false), stack = [], ev = [], sccs = [];
    let next = 0;
    function strong(v) {
      index[v] = low[v] = next++; stack.push(v); on[v] = true;
      ev.push({ t: "visit", v, index: index[v], low: low[v], stack: stack.slice() });
      succ(v).forEach((w) => {
        if (index[w] === -1) {
          strong(w);
          low[v] = Math.min(low[v], low[w]);
          ev.push({ t: "back-up", v, w, low: low[v], stack: stack.slice() });
        } else if (on[w]) {
          low[v] = Math.min(low[v], index[w]);
          ev.push({ t: "on-stack", v, w, low: low[v], stack: stack.slice() });
        } else ev.push({ t: "done", v, w, low: low[v], stack: stack.slice() });
      });
      if (low[v] === index[v]) {
        const comp = [];
        let w;
        do { w = stack.pop(); on[w] = false; comp.push(w); } while (w !== v);
        sccs.push(comp);
        ev.push({ t: "scc", v, comp: comp.slice(), stack: stack.slice() });
      }
    }
    for (let v = 0; v < n; v++) if (index[v] === -1) strong(v);
    return { ev, sccs, index, low };
  }

  PA.usa = { ITV, stepOne, lockRun, worklistRun, instrRPO, loopHeads, basicBlocks, tarjanEvents, LOCAL, TRUTH };

  /* small helpers for the labs */
  const pill = (txt, cls) => '<span class="pill ' + cls + '">' + PA.esc(txt) + "</span>";
  function constantsOf(p) {
    const K = new Set([0]);
    p.code.forEach((ins) => { if (ins.op === "push") K.add(ins.value); if (ins.op === "incr") K.add(ins.amount); });
    return [...K].sort((a, b) => a - b);
  }

  /* =====================================================================
     QUIZ BANK
     ===================================================================== */
  const QUIZ = {
    dependent: [
      { q: "The naive sign analysis reports a possible division by zero in <code>safeDivByN</code>. Why?", options: [
        ["Because <code>1 / n</code> can overflow", false, "Integer division by a non-zero int never overflows except for MIN_VALUE / -1, and that is not a division by zero anyway."],
        ["Because after <code>ifz eq 6</code> it still believes local 0 may be 0: the test was made on a copy on the stack, and that copy was popped", true, "The analysis refines nothing it can still see. The copy loaded at offset 000 and the local are the <em>same number</em>, but the analysis treats them as unrelated values."],
        ["Because the sign lattice cannot represent $\\{-, +\\}$", false, "It can: $\\{-,+\\}$ is one of the 8 elements of $2^{\\Sign}$. The problem is that nothing tells the analysis to use it for the local."],
        ["Because <code>safeDivByN(0)</code> really divides by zero", false, "With $n = 0$ the jump to offset 6 is taken and the method returns 0. The alarm is false."],
      ] },
      { q: "What does it mean that two values are <em>dependent</em>?", options: [
        ["They are stored in the same frame", false, "Living in the same frame says nothing about their values."],
        ["They were computed by the same instruction", false, "That is about origin, not about what we can conclude."],
        ["Their possible values constrain each other: learning something about one tells us something about the other", true, "E.g. after <code>load:I 0</code> the stack top and local 0 are equal, so a test on one is a test on both; after <code>if (b &gt; a)</code> the pair must satisfy $b - a \\geq 1$."],
        ["Their types depend on each other", false, "Types are fixed by the bytecode; dependence is about values."],
      ] },
      { q: "Which instruction creates a dependency between a stack value and a local variable?", options: [
        ["<code>push:I 5</code>", false, "A constant does not depend on any variable."],
        ["<code>goto 7</code>", false, "Jumps move the program counter only."],
        ["<code>return:I</code>", false, "Return ends the frame."],
        ["<code>load:I 0</code>", true, "It copies local 0 onto the stack: from then on both hold the same number. <code>dup</code>, <code>store</code>, array and field accesses create dependencies too."],
      ] },
    ],
    "named-values": [
      { q: "In the notes' named-values table, the state at offset 006 is $\\{n \\mapsto \\{0\\}\\} / \\ldots$. Where does $\\{0\\}$ come from?", options: [
        ["From <code>push:I 0</code> at offset 006", false, "That push happens <em>at</em> 006, so its effect is visible only after it. The constraint is already there before."],
        ["From the jump branch of <code>ifz eq 6</code>: the compared stack value is the name $n$, so the analysis can refine $n$ itself to $\\{0\\}$", true, "Because the stack holds the <em>name</em> $n$, not a copy of its value, refining the stack value refines the local too."],
        ["From the initial state", false, "Initially $n \\mapsto \\{+, -, 0\\}$."],
      ] },
      { q: "Why must named values never change?", options: [
        ["To make the analysis faster", false, "It is about correctness, not speed."],
        ["Because a copy loaded earlier still refers to the old value: if <code>store</code> overwrites a local, the local must get a <em>fresh</em> name, otherwise the old copy would wrongly change with it", true, "Names stand for values, not for storage locations. Overwriting a location means the location now holds a different value, so a different name."],
        ["Because Java variables are final", false, "Java locals can be reassigned; that is exactly why fresh names are needed."],
      ] },
      { q: "<code>int y = x; if (x &gt; 0) return 10 / y;</code> With named values, what does the analysis conclude at the division?", options: [
        ["Possible division by zero, as with the per-variable sign analysis", false, "That is the Week 5 result (topic pv-abs). Named values fix exactly this case."],
        ["Safe: <code>store:I 1</code> makes local 1 refer to the same name as local 0, so refining $x &gt; 0$ refines $y$ too", true, "Both locals hold the name $x$; the branch sets $x \\mapsto \\{+\\}$, so the divisor is $\\{+\\}$."],
        ["Nothing, named values do not handle stores", false, "Stores just copy the name (or create a fresh one for an anonymous value)."],
      ] },
      { q: "A named state is $C / \\langle \\lambda, \\sigma, \\iota \\rangle$. What concrete states does it describe?", options: [
        ["All states whose locals are in $\\gamma(C(n))$ for some $n$", false, "That forgets which local holds which name, i.e. exactly the dependencies."],
        ["All states obtained from a valuation $\\nu$ of the names with $\\nu(n) \\in \\gamma(C(n))$, by replacing every name in $\\lambda$ and $\\sigma$ with its value", true, "One valuation per concrete state: a name used in two places gets the <em>same</em> number in both. That is how equality is remembered."],
        ["Only the states reached by one concrete input", false, "Abstract states describe sets of states."],
      ] },
    ],
    relational: [
      { q: "Why does a non-relational analysis (signs or intervals per variable) fail on <code>safeDivSwapped</code>?", options: [
        ["At <code>b &gt; a</code> both are unknown, so neither range shrinks; later <code>a &gt;= 0</code> refines only $a$. The fact $b &gt; a$ was never stored, so $b$ can still be 0", true, "The knowledge was <em>relational</em> ($b - a \\geq 1$); a per-variable domain has nowhere to put it."],
        ["Because $a / b$ is integer division", false, "Truncation is irrelevant to whether $b$ can be 0."],
        ["Because the method has two parameters", false, "Two parameters are fine; the problem is the relation between them."],
        ["Because the branches are nested", false, "Nesting is fine (safeDivAByB is nested too and works with refinement)."],
      ] },
      { q: "Which constraint can an <strong>octagon</strong> express but an interval cannot?", options: [
        ["$a \\geq 0$", false, "That is a plain bound; intervals express it."],
        ["$b - a \\geq 1$", true, "Octagons store constraints $\\pm x \\pm y \\leq c$: sums and differences of two variables."],
        ["$a \\cdot b \\geq 0$", false, "Products are not linear; neither octagons nor polyhedra express this directly."],
        ["$a \\neq 0$", false, "Disequalities are non-convex; none of intervals, octagons or polyhedra express them."],
      ] },
      { q: "Why not always use polyhedra?", options: [
        ["They are unsound", false, "They are sound and very precise."],
        ["Their operations are expensive (exponential in the worst case), while octagons stay cubic in the number of variables", true, "Cousot and Halbwachs (1978) polyhedra keep any linear inequalities; Mine's octagons (2006) restrict them to $\\pm x \\pm y \\leq c$ to get $O(n^3)$ closure."],
        ["They cannot represent $x = y$", false, "Equalities are linear, so polyhedra represent them."],
      ] },
      { q: "In <code>safeDivAByB</code> (first <code>a &gt;= 0</code>, then <code>b &gt; a</code>), what does a sign analysis that refines <em>both</em> compared values conclude?", options: [
        ["Safe: when <code>b &gt; a</code> is tested, $a \\in \\{0, +\\}$ already, so $b$ must be $\\{+\\}$", true, "A positive-or-zero $a$ and $b &gt; a$ leave only positive $b$. The order of the tests matters: swap them and the information is gone."],
        ["Possible division by zero, the notes say it is hard", false, "The notes refer to the naive analysis. Refining both sides is enough here."],
        ["It cannot analyse two parameters", false, "It can."],
      ] },
    ],
    unbounded: [
      { q: "A bounded analysis ran $10^6$ rounds and found no division by zero. What do you know?", options: [
        ["The program never divides by zero", false, "That would need a guarantee for all depths."],
        ["No trace of at most about $10^6$ steps divides by zero; longer traces are unknown", true, "Bounded results are about the bound only (Week 5, topic bounded). Round $10^6 + 1$ could still find one."],
        ["The program terminates", false, "A bounded analysis says nothing about termination."],
      ] },
      { q: "When may an unbounded analysis stop?", options: [
        ["After a fixed number of rounds", false, "That is the bounded analysis."],
        ["When a round changes nothing: the abstract state is a fixed point", true, "Then every further round gives the same state, so the state already covers every depth."],
        ["When it finds the first error", false, "Then it could miss other outcomes; we want all of them."],
      ] },
      { q: "What does a fixed point of a sound abstract step guarantee?", options: [
        ["That every abstract state is reachable", false, "Over-approximation may include unreachable states (false alarms)."],
        ["That it covers all reachable states at <em>every</em> depth", true, "If $\\Delta_A(X) \\sqsubseteq X$ and $X$ covers the initial states, induction over the depth shows $\\Delta^n \\subseteq \\gamma(X)$ for all $n$."],
        ["That the program terminates", false, "A fixed point of the analysis exists even for programs that loop forever."],
      ] },
    ],
    fixpoints: [
      { q: "Which property is <em>monotonicity</em> of $f$?", options: [
        ["$\\forall a.\\ a \\sqsubseteq f(a)$", false, "That is <em>extensive</em> (inflationary), which the notes wrote by mistake."],
        ["$\\forall a, b.\\ a \\sqsubseteq b \\implies f(a) \\sqsubseteq f(b)$", true, "Bigger inputs give bigger (or equal) outputs. This is what Knaster-Tarski and Kleene iteration need."],
        ["$\\forall a.\\ f(f(a)) = f(a)$", false, "That is idempotence."],
        ["$\\forall a, b.\\ f(a \\sqcup b) = f(a) \\sqcup f(b)$", false, "That is join-preservation (additivity), stronger than monotonicity."],
      ] },
      { q: "Kleene iteration $\\bot, f(\\bot), f^2(\\bot), \\ldots$ with monotone $f$ on a lattice of height $h$ (longest strict chain has $h$ steps). How many strict increases can it make?", options: [
        ["At most $h$", true, "The iterates form an ascending chain; every strict increase is a step of a strict chain, so after at most $h$ increases it must stop."],
        ["Exactly $2^h$", false, "There is no exponential here; each strict step climbs one level at least."],
        ["Infinitely many", false, "Only in lattices with infinite ascending chains, like intervals."],
      ] },
      { q: "What is the <em>least</em> fixed point, according to the notes' definition done right?", options: [
        ["The least $n$ with $f^n(\\bot) = f^{n+1}(\\bot)$", false, "$n$ is only the number of steps. The fixed point is the <em>value</em> $f^n(\\bot)$."],
        ["The value $f^n(\\bot)$ for that $n$: a fixed point below every other fixed point", true, "By induction $f^k(\\bot) \\sqsubseteq x$ for every fixed point $x$, so the value where the chain stops is the least one."],
        ["$\\top$", false, "$\\top$ is the greatest fixed point of an extensive function."],
      ] },
      { q: "Knaster-Tarski says a monotone $f$ on a complete lattice...", options: [
        ["has exactly one fixed point", false, "It can have many; they form a complete lattice themselves."],
        ["has a least fixed point, namely $\\mathop{\\Large\\sqcap}\\{x \\mid f(x) \\sqsubseteq x\\}$", true, "The meet of all post-fixed points is itself a fixed point, and it is the least one."],
        ["reaches its fixed point in finitely many steps", false, "That needs more: finite height (or the ascending chain condition)."],
      ] },
    ],
    "adding-one": [
      { q: "With $a(x) = x +_{\\Sign} \\alpha(\\{1\\})$ and $f(x) = x \\sqcup a(x)$, what is $f^2(\\{0\\})$?", options: [
        ["$\\{0\\}$", false, "$f(\\{0\\}) = \\{0\\} \\sqcup \\{+\\}$ already grows."],
        ["$\\{0, +\\}$", true, "$f(\\{0\\}) = \\{0, +\\}$ and $f(\\{0,+\\}) = \\{0,+\\} \\sqcup \\{+\\} = \\{0,+\\}$: stable after one step."],
        ["$\\{-, 0, +\\}$", false, "Adding one to $\\{0,+\\}$ never produces a negative sign (over mathematical integers)."],
      ] },
      { q: "Why does the notes' example join with the input ($x \\sqcup a(x)$)?", options: [
        ["It makes $f$ extensive, so the iterates can only grow: an ascending chain that must stop in a finite-height lattice", true, "This is the same trick as $\\Delta_A(X) \\sqcup X$ in Week 5: keep what you had and add the new states."],
        ["It makes $f$ faster", false, "It is about guaranteeing an ascending sequence, not speed."],
        ["Because $a$ is not defined on $\\{0\\}$", false, "$a$ is defined everywhere."],
      ] },
      { q: "If you iterate that same $f(x) = x \\sqcup a(x)$ from $\\bot = \\emptyset$ instead of $\\{0\\}$, what do you get?", options: [
        ["$\\{0, +\\}$", false, "Nothing ever adds $0$."],
        ["$\\emptyset$: it is already a fixed point, because $a(\\emptyset) = \\emptyset$", true, "The starting value matters. To compute the reachable values as a least fixed point, the initial values belong inside the function: $F(X) = \\{0\\} \\sqcup X \\sqcup a(X)$."],
        ["It never stops", false, "$\\emptyset$ is a fixed point immediately."],
      ] },
    ],
    lfp: [
      { q: "Why are the reachable states the <em>least</em> fixed point of $F(X) = I \\cup \\Delta(X)$?", options: [
        ["Because larger fixed points may contain states that are never reached, e.g. a cycle of states nothing enters", true, "Any set closed under the step and containing $I$ is a fixed point candidate; the least one contains exactly what is forced: the reachable states."],
        ["Because the least fixed point is always $\\emptyset$", false, "$I \\subseteq F(X)$, so it contains at least the initial states."],
        ["Because $F$ is not monotone", false, "$F$ is monotone (even additive)."],
      ] },
      { q: "Which condition makes the abstract least fixed point sound, $\\operatorname{lfp} F \\subseteq \\gamma(\\operatorname{lfp} F^{\\#})$?", options: [
        ["$F^{\\#}$ is extensive", false, "Extensiveness alone says nothing about the concrete semantics."],
        ["$F \\circ \\gamma \\subseteq \\gamma \\circ F^{\\#}$ (equivalently $\\alpha \\circ F \\sqsubseteq F^{\\#} \\circ \\alpha$ for a Galois connection), with $F^{\\#}$ monotone", true, "Then $\\gamma(\\operatorname{lfp} F^{\\#})$ is a post-fixed point of $F$, and Knaster-Tarski puts $\\operatorname{lfp} F$ below every post-fixed point."],
        ["$\\gamma$ is injective", false, "Injectivity (a Galois insertion) is about redundancy, not soundness."],
      ] },
      { q: "Why is any abstract <strong>post-fixed point</strong> ($F^{\\#}(X^{\\#}) \\sqsubseteq X^{\\#}$) already a sound result?", options: [
        ["Because $\\gamma(X^{\\#})$ is then closed under the concrete step and contains the initial states, so it contains every reachable state", true, "This is why widening is fine: it may overshoot the least fixed point, but it stops at a post-fixed point."],
        ["Because post-fixed points are least fixed points", false, "They are upper bounds of the least fixed point, not equal to it."],
        ["It is not sound", false, "It is: soundness only needs an over-approximation."],
      ] },
    ],
    intervals: [
      { q: "What is $\\gamma([2, 5])$?", options: [
        ["$\\{2, 3, 4, 5\\}$", true, "All integers between the bounds, both inclusive. The notes' $\\{n \\mid j \\geq n \\leq i\\}$ is a typo for $i \\leq n \\leq j$."],
        ["$\\{2, 5\\}$", false, "An interval means everything in between, not just the endpoints."],
        ["$\\{3, 4\\}$", false, "Both ends are included."],
        ["$\\{n \\mid n \\leq 2\\}$", false, "That is what the typo literally says; it is not what is meant."],
      ] },
      { q: "$[1, 3] \\sqcup [6, 8] = \\;?$", options: [
        ["$[1, 3] \\cup [6, 8]$ exactly", false, "An interval cannot have a hole."],
        ["$[1, 8]$, which also includes 4 and 5", true, "The join is the smallest interval containing both, so it adds the gap: the price of convexity."],
        ["$[3, 6]$", false, "That is neither the join nor the meet."],
      ] },
      { q: "How tall is the interval lattice over $\\Z$?", options: [
        ["4, like signs", false, "Signs have 8 elements; intervals have infinitely many."],
        ["Infinite: $[0,0] \\sqsubset [0,1] \\sqsubset [0,2] \\sqsubset \\cdots$ never ends", true, "That is why plain Kleene iteration can run forever and we need widening. (Over 32-bit ints it is finite, but about $2^{32}$ steps tall: useless in practice.)"],
        ["2", false, "There are chains of every length."],
      ] },
    ],
    "interval-ops": [
      { q: "$[1, 3] - [0, 2] = \\;?$", options: [
        ["$[1, 1]$", false, "Subtract bound-wise crosswise: smallest minus largest, largest minus smallest."],
        ["$[-1, 3]$", true, "Lower bound $1 - 2 = -1$, upper bound $3 - 0 = 3$."],
        ["$[1, 3]$", false, "Subtracting a range widens the result."],
      ] },
      { q: "$[-2, 3] \\times [-1, 4] = \\;?$", options: [
        ["$[2, 12]$", false, "Mixed signs: you must take the minimum and maximum over all four corner products."],
        ["$[-8, 12]$", true, "Corners: $2, -8, -3, 12$; min $-8$, max $12$."],
        ["$[-2, 12]$", false, "$-2 \\cdot 4 = -8$ is smaller."],
      ] },
      { q: "$[10, 20] / [-1, 1]$ (Java division)?", options: [
        ["$[10, 20]$", false, "Dividing by $-1$ flips the sign."],
        ["Possible division by zero; the non-zero divisors $\\{-1\\}$ and $\\{1\\}$ give $[-20,-10] \\sqcup [10,20] = [-20, 20]$", true, "Split the divisor around 0, divide each part, join, and report the error because $0 \\in [-1, 1]$."],
        ["$\\bot$, it always fails", false, "Only the divisor 0 fails; $\\pm 1$ are fine."],
      ] },
      { q: "Refining $x \\in [0, +\\infty]$ by the test <code>x &lt; 5</code>: the jump branch gets... and the fall-through gets...", options: [
        ["$[0, 4]$ and $[5, +\\infty]$", true, "Intersect with $(-\\infty, 4]$ for the true branch and with $[5, +\\infty)$ for the false branch."],
        ["$[0, 5]$ and $[5, +\\infty]$", false, "$x &lt; 5$ excludes 5 for integers."],
        ["$[0, +\\infty]$ for both", false, "That is the naive analysis without refinement."],
      ] },
    ],
    "infinite-height": [
      { q: "In the notes' <code>while (i &gt;= 0) i = i + 1;</code> table, why does plain interval iteration not stop?", options: [
        ["The upper bound grows by one every round: $[0,0], [0,1], [0,2], \\ldots$, an infinite strictly ascending chain", true, "No round repeats the previous one, so there is never a fixed point to detect."],
        ["Because the loop body has no instructions", false, "It has an addition and a store."],
        ["Because intervals are unsound", false, "Every iterate is sound for its depth; the problem is termination."],
      ] },
      { q: "Does <code>while (i &gt;= 0) i = i + 1;</code> really run forever in Java?", options: [
        ["Yes, $i$ grows forever", false, "Java ints are 32-bit."],
        ["No: after $2^{31}$ iterations $i + 1$ wraps to $-2^{31}$ and the loop exits", true, "An analysis over mathematical integers (signs, intervals) wrongly concludes that the exit is unreachable. To be sound for Java it must model wrap-around."],
        ["It throws an overflow exception", false, "Java int arithmetic wraps silently."],
      ] },
      { q: "Which lattice property guarantees that Kleene iteration terminates?", options: [
        ["Every element has a complement", false, "Complements are unrelated to termination."],
        ["The ascending chain condition: no infinite strictly ascending chains (e.g. finite height)", true, "Signs satisfy it; intervals over $\\Z$ do not."],
        ["The lattice is distributive", false, "Distributivity does not prevent infinite chains."],
      ] },
    ],
    widening: [
      { q: "With $K = \\{0, 100\\}$, what is $[0, 1] \\nabla [0, 2]$ with the course's widening?", options: [
        ["$[0, 2]$", false, "That is the join; widening jumps further."],
        ["$[0, 100]$", true, "$\\min_K\\{0,0\\} = 0$, and $\\max_K\\{1, 2\\}$ is the smallest constant $\\geq 2$, which is 100."],
        ["$[0, +\\infty]$", false, "Only if no constant in $K$ is at least 2."],
        ["$[-\\infty, +\\infty]$", false, "The lower bound did not move and 0 is in $K$."],
      ] },
      { q: "Why is it safe to jump to a much bigger interval?", options: [
        ["Because $a \\sqcup b \\sqsubseteq a \\nabla b$: widening only over-approximates, and the iteration stops at a post-fixed point, which covers the least fixed point", true, "We lose precision, never soundness."],
        ["Because the constants in $K$ are exact values of the program", false, "Constants are only good guesses for bounds; soundness does not depend on them."],
        ["It is not safe, it is a heuristic", false, "The result is provably sound (topic proving-widening)."],
      ] },
      { q: "Where does the constant set $K$ come from?", options: [
        ["From running the program", false, "That would be dynamic; widening is part of a static analysis."],
        ["From the constants in the program or file, scanned syntactically, like the dictionaries in dynamic analysis", true, "Loop bounds such as <code>100</code> in <code>i &lt; 100</code> are likely thresholds."],
        ["It must contain all 32-bit integers", false, "Then widening would not speed anything up."],
      ] },
      { q: "How does the standard widening differ from the course's?", options: [
        ["It only moves a bound that grew; stable bounds stay exact", true, "The course's version snaps both bounds to $K$ at every widening. Both terminate; the standard one is usually more precise."],
        ["It always returns $\\top$", false, "Only the unstable bounds jump."],
        ["It is the same as the join", false, "Then it would not guarantee termination."],
      ] },
    ],
    "proving-widening": [
      { q: "Which two properties must a widening operator have?", options: [
        ["Commutativity and associativity", false, "Widening need not be either."],
        ["Upper bound ($a \\sqsubseteq a \\nabla b$ and $b \\sqsubseteq a \\nabla b$) and: every sequence $w_0 = a_0,\\ w_{k+1} = w_k \\nabla a_{k+1}$ eventually stabilises", true, "The first gives soundness, the second termination."],
        ["Monotonicity and idempotence", false, "Widening is in general not monotone."],
      ] },
      { q: "For $K$-intervals, why does every widening sequence stabilise?", options: [
        ["After the first step every bound lies in $K \\cup \\{-\\infty, +\\infty\\}$ and bounds only move outwards, so each bound can change at most $|K| + 1$ times", true, "A finite set of possible values plus monotone movement gives a uniform bound like $2(|K| + 2)$ steps."],
        ["Because $K$ is sorted", false, "Order helps define $\\min_K$, but finiteness is the reason."],
        ["Because the program is finite", false, "Programs are finite but intervals still form infinite chains without widening."],
      ] },
      { q: "Is the widening operator required to be monotone?", options: [
        ["Yes, otherwise the analysis is unsound", false, "Soundness comes from the upper-bound property and stopping at a post-fixed point."],
        ["No, and in general it is not; that is why the iteration order can change the result", true, "Different orders may stop at different post-fixed points, all sound."],
        ["Only for intervals", false, "No widening needs to be monotone."],
      ] },
    ],
    worklist: [
      { q: "What does the worklist hold?", options: [
        ["Every instruction of the program, always", false, "That is the lockstep approach."],
        ["The program points whose abstract state changed and whose successors must therefore be recomputed", true, "Only changes generate work: a point leaves the list when processed and returns only when its state grows."],
        ["The concrete traces left to explore", false, "It holds program points of the abstract analysis."],
      ] },
      { q: "With the join (no widening), do lockstep rounds and the worklist algorithm compute the same result?", options: [
        ["Yes: both compute the least fixed point of the same monotone equations (chaotic iteration)", true, "Any fair order of updating monotone equations reaches the same least solution; the worklist just skips useless updates."],
        ["No, the worklist is less precise", false, "It is exactly as precise."],
        ["Only if the program has no loops", false, "Loops are fine, as long as the lattice has finite height (or we iterate to the fixed point)."],
      ] },
      { q: "With widening at loop heads, can the order of the worklist change the final result?", options: [
        ["No, never", false, "Widening is not monotone, so it can."],
        ["Yes: different orders can widen at different moments and stop at different (all sound) post-fixed points", true, "Good orders (reverse post-order, loops first) usually give better precision and fewer steps."],
        ["Only for signs", false, "Signs never need widening at all."],
      ] },
    ],
    rpo: [
      { q: "How do you compute a reverse post-order?", options: [
        ["Sort instructions by offset, descending", false, "Offsets need not follow the control flow."],
        ["Run a depth-first search, record each node when it is finished (post-order), then reverse the list", true, "In the result every node comes before its successors, except along back edges."],
        ["Breadth-first search from the exit", false, "That is a different order."],
      ] },
      { q: "Why does RPO help in the <code>if/else</code> example?", options: [
        ["Both branches are processed before the join point, so the code after the join is analysed once, with both branches already merged", true, "In FIFO or LIFO order, one branch flows through all the following code first, then the other branch changes the join and it all runs again."],
        ["It skips one of the branches", false, "Both branches must be analysed for soundness."],
        ["It removes the join", false, "The join is still needed; RPO just reaches it at the right time."],
      ] },
      { q: "In RPO numbering, an edge $u \\to v$ with $v$ numbered before $u$ is...", options: [
        ["a back edge, closing a loop", true, "For reducible graphs, edges that go against RPO are exactly the loop back edges; their targets are the loop heads where widening is applied."],
        ["impossible", false, "Every loop produces one."],
        ["a tree edge", false, "Tree edges go forward in RPO."],
      ] },
    ],
    scc: [
      { q: "What is a strongly connected component?", options: [
        ["A maximal set of nodes where every node can reach every other node", true, "A loop body with its head is the typical example; a node without a self-loop is a trivial SCC on its own."],
        ["A basic block", false, "A basic block is a straight-line sequence; it is an SCC only if it loops to itself."],
        ["All nodes reachable from the entry", false, "Reachability from one node is not mutual reachability."],
      ] },
      { q: "Why stabilise an SCC before analysing the code after it?", options: [
        ["The code after the loop depends on the loop's final state; analysing it earlier wastes work that has to be redone", true, "Collapse each SCC into one node: the condensation is acyclic, so process it in RPO and iterate inside each component until stable."],
        ["Because otherwise the analysis is unsound", false, "Any fair order is sound; this is about efficiency."],
        ["Because SCCs cannot contain branches", false, "They can."],
      ] },
      { q: "What is the running time of Tarjan's SCC algorithm?", options: [
        ["$O(V + E)$", true, "One depth-first search, each node pushed and popped once, each edge looked at once."],
        ["$O(V^3)$", false, "That is Floyd-Warshall, not Tarjan."],
        ["$O(2^V)$", false, "Far too pessimistic."],
      ] },
    ],
    together: [
      {
        q: "A sound analysis reaches a fixed point, and <code>divide by zero</code> is never reached. What should you predict?",
        options: [
          ["<code>maybe</code>, to be careful", false, "No uncertainty is left: the fixed point covers every input and every depth, so a cautious bet only costs points."],
          ["<code>no</code>: it cannot happen for any input", true, "An over-approximation at a fixed point contains every reachable state. If the error is not in it, no run reaches it (up to the analysis' own assumptions, such as ignoring overflow)."],
          ["<code>yes</code>", false, "Nothing suggests the error happens; the analysis rules it out."],
          ["<code>*</code>", false, "Unreached errors say nothing about non-termination."],
        ],
      },
      {
        q: "The same analysis reports that <code>divide by zero</code> <em>is</em> reached. What do you know?",
        options: [
          ["It definitely happens for some input", false, "An over-approximation also contains spurious states, so this may be a false alarm."],
          ["The analysis must be unsound", false, "Reporting too much is exactly what a sound over-approximation is allowed to do."],
          ["It may happen, or it may be a false alarm; a concrete run that hits it (a dynamic analysis) would confirm it", true, "May answers from a static analysis are not witnesses. Pairing them with dynamic analysis turns some of them into certain yes answers."],
        ],
      },
      {
        q: "A reduced product of intervals and signs holds <code>[0, 5]</code> and <code>{-, +}</code> for the same variable. What does the reduction give?",
        options: [
          ["<code>[1, 5]</code> and <code>{+}</code>", true, "The value must be in both meanings: between 0 and 5 and not zero, so it lies in 1 to 5 and is positive."],
          ["<code>[0, 5]</code> and <code>{-, +}</code>, unchanged", false, "That is the plain product; the reduction lets each component tighten the other."],
          ["<code>[-5, 5]</code> and <code>{-, 0, +}</code>", false, "A reduction never makes a component bigger."],
          ["Bottom, the two facts contradict each other", false, "They are compatible: the numbers 1 to 5 satisfy both."],
        ],
      },
    ],
  };

  /* Spread the correct answers over the positions: rotate each question's options by a hash of its text. */
  Object.values(QUIZ).forEach((qs) => qs.forEach((q) => {
    let hsh = 0;
    for (const ch of q.q) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
    const r = hsh % q.options.length;
    q.options = q.options.slice(r).concat(q.options.slice(0, r));
  }));

  /* =====================================================================
     LABS
     ===================================================================== */

  /* --- 1. Three analyses of a dependent program --- */
  /* Precomputed results of three sign analyses (fixed point) for the example methods, in the notes' table format. */
  const NAMED_DATA = {"safeDivByN": {"panels": "<div class=\"panel\"><div class=\"usa-ph\"><b>A. Naive sign analysis</b><span><span class=\"pill ok\">ok</span> <span class=\"pill err\">divide by zero</span></span></div><p class=\"usa-sub\">Nothing is refined: a branch only checks that it is possible. This is the notes' first table.</p><div class=\"table-wrap\"><table class=\"dt usa-st\"><thead><tr><th>Offset</th><th>Instruction</th><th>Abstract state before</th><th>Goes to</th></tr></thead><tbody><tr class=\"\"><td class=\"mono\">000</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">1</td></tr><tr class=\"\"><td class=\"mono\">001</td><td class=\"mono\">ifz eq 6</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">6, 2</td></tr><tr class=\"\"><td class=\"mono\">002</td><td class=\"mono\">push:I 1</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">3</td></tr><tr class=\"\"><td class=\"mono\">003</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}}, {+}⟩</td><td class=\"mono\">4</td></tr><tr class=\"on\"><td class=\"mono\">004</td><td class=\"mono\">binary:I div</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}}, {+}·{−, 0, +}⟩</td><td class=\"mono\">5, divide by zero</td></tr><tr class=\"\"><td class=\"mono\">005</td><td class=\"mono\">return:I</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">ok</td></tr><tr class=\"\"><td class=\"mono\">006</td><td class=\"mono\">push:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">7</td></tr><tr class=\"\"><td class=\"mono\">007</td><td class=\"mono\">return:I</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}}, {0}⟩</td><td class=\"mono\">ok</td></tr></tbody></table></div></div><div class=\"panel\"><div class=\"usa-ph\"><b>B. Refine the local a compared value came from</b><span><span class=\"pill ok\">ok</span></span></div><p class=\"usa-sub\">A lighter variant of named values: a stack value remembers the local it was loaded from, and a branch narrows that local too.</p><div class=\"table-wrap\"><table class=\"dt usa-st\"><thead><tr><th>Offset</th><th>Instruction</th><th>Abstract state before</th><th>Goes to</th></tr></thead><tbody><tr class=\"\"><td class=\"mono\">000</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">1</td></tr><tr class=\"\"><td class=\"mono\">001</td><td class=\"mono\">ifz eq 6</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">6, 2</td></tr><tr class=\"\"><td class=\"mono\">002</td><td class=\"mono\">push:I 1</td><td class=\"mono\">⟨{0 ↦ {−, +}}, ε⟩</td><td class=\"mono\">3</td></tr><tr class=\"\"><td class=\"mono\">003</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, +}}, {+}⟩</td><td class=\"mono\">4</td></tr><tr class=\"on\"><td class=\"mono\">004</td><td class=\"mono\">binary:I div</td><td class=\"mono\">⟨{0 ↦ {−, +}}, {+}·{−, +}⟩</td><td class=\"mono\">5</td></tr><tr class=\"\"><td class=\"mono\">005</td><td class=\"mono\">return:I</td><td class=\"mono\">⟨{0 ↦ {−, +}}, {−, 0, +}⟩</td><td class=\"mono\">ok</td></tr><tr class=\"\"><td class=\"mono\">006</td><td class=\"mono\">push:I 0</td><td class=\"mono\">⟨{0 ↦ {0}}, ε⟩</td><td class=\"mono\">7</td></tr><tr class=\"\"><td class=\"mono\">007</td><td class=\"mono\">return:I</td><td class=\"mono\">⟨{0 ↦ {0}}, {0}⟩</td><td class=\"mono\">ok</td></tr></tbody></table></div></div><div class=\"panel\"><div class=\"usa-ph\"><b>C. Named values with constraints</b><span><span class=\"pill ok\">ok</span></span></div><p class=\"usa-sub\">Locals and the stack hold names; a constraint map says what each name may be. Loading copies the name, so a test on the copy is a test on the local. This is the notes' second table.</p><div class=\"table-wrap\"><table class=\"dt usa-st\"><thead><tr><th>Offset</th><th>Instruction</th><th>Constraints / state before</th><th>Goes to</th></tr></thead><tbody><tr class=\"\"><td class=\"mono\">000</td><td class=\"mono\">load:I 0</td><td class=\"mono\">{n ↦ {−, 0, +}} / ⟨{0 ↦ n}, ε⟩</td><td class=\"mono\">1</td></tr><tr class=\"\"><td class=\"mono\">001</td><td class=\"mono\">ifz eq 6</td><td class=\"mono\">{n ↦ {−, 0, +}} / ⟨{0 ↦ n}, n⟩</td><td class=\"mono\">6, 2</td></tr><tr class=\"\"><td class=\"mono\">002</td><td class=\"mono\">push:I 1</td><td class=\"mono\">{n ↦ {−, +}} / ⟨{0 ↦ n}, ε⟩</td><td class=\"mono\">3</td></tr><tr class=\"\"><td class=\"mono\">003</td><td class=\"mono\">load:I 0</td><td class=\"mono\">{n ↦ {−, +}} / ⟨{0 ↦ n}, {+}⟩</td><td class=\"mono\">4</td></tr><tr class=\"on\"><td class=\"mono\">004</td><td class=\"mono\">binary:I div</td><td class=\"mono\">{n ↦ {−, +}} / ⟨{0 ↦ n}, {+}·n⟩</td><td class=\"mono\">5</td></tr><tr class=\"\"><td class=\"mono\">005</td><td class=\"mono\">return:I</td><td class=\"mono\">{n ↦ {−, +}} / ⟨{0 ↦ n}, {−, 0, +}⟩</td><td class=\"mono\">ok</td></tr><tr class=\"\"><td class=\"mono\">006</td><td class=\"mono\">push:I 0</td><td class=\"mono\">{n ↦ {0}} / ⟨{0 ↦ n}, ε⟩</td><td class=\"mono\">7</td></tr><tr class=\"\"><td class=\"mono\">007</td><td class=\"mono\">return:I</td><td class=\"mono\">{n ↦ {0}} / ⟨{0 ↦ n}, {0}⟩</td><td class=\"mono\">ok</td></tr></tbody></table></div></div>", "verdict": "<b>False alarms:</b> A. The comparison <code>n != 0</code> is made on a copy. Only B and C connect the copy to the local. Truth: <span class=\"pill ok\">ok</span>", "vclass": "verdict warn"}, "copyThenDivide": {"panels": "<div class=\"panel\"><div class=\"usa-ph\"><b>A. Naive sign analysis</b><span><span class=\"pill ok\">ok</span> <span class=\"pill err\">divide by zero</span></span></div><p class=\"usa-sub\">Nothing is refined: a branch only checks that it is possible. This is the notes' first table.</p><div class=\"table-wrap\"><table class=\"dt usa-st\"><thead><tr><th>Offset</th><th>Instruction</th><th>Abstract state before</th><th>Goes to</th></tr></thead><tbody><tr class=\"\"><td class=\"mono\">000</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">1</td></tr><tr class=\"\"><td class=\"mono\">001</td><td class=\"mono\">store:I 1</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">2</td></tr><tr class=\"\"><td class=\"mono\">002</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">3</td></tr><tr class=\"\"><td class=\"mono\">003</td><td class=\"mono\">ifz le 8</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">8, 4</td></tr><tr class=\"\"><td class=\"mono\">004</td><td class=\"mono\">push:I 10</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">5</td></tr><tr class=\"\"><td class=\"mono\">005</td><td class=\"mono\">load:I 1</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {+}⟩</td><td class=\"mono\">6</td></tr><tr class=\"on\"><td class=\"mono\">006</td><td class=\"mono\">binary:I div</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {+}·{−, 0, +}⟩</td><td class=\"mono\">7, divide by zero</td></tr><tr class=\"\"><td class=\"mono\">007</td><td class=\"mono\">return:I</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">ok</td></tr><tr class=\"\"><td class=\"mono\">008</td><td class=\"mono\">push:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">9</td></tr><tr class=\"\"><td class=\"mono\">009</td><td class=\"mono\">return:I</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {0}⟩</td><td class=\"mono\">ok</td></tr></tbody></table></div></div><div class=\"panel\"><div class=\"usa-ph\"><b>B. Refine the local a compared value came from</b><span><span class=\"pill ok\">ok</span> <span class=\"pill err\">divide by zero</span></span></div><p class=\"usa-sub\">A lighter variant of named values: a stack value remembers the local it was loaded from, and a branch narrows that local too.</p><div class=\"table-wrap\"><table class=\"dt usa-st\"><thead><tr><th>Offset</th><th>Instruction</th><th>Abstract state before</th><th>Goes to</th></tr></thead><tbody><tr class=\"\"><td class=\"mono\">000</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">1</td></tr><tr class=\"\"><td class=\"mono\">001</td><td class=\"mono\">store:I 1</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">2</td></tr><tr class=\"\"><td class=\"mono\">002</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">3</td></tr><tr class=\"\"><td class=\"mono\">003</td><td class=\"mono\">ifz le 8</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">8, 4</td></tr><tr class=\"\"><td class=\"mono\">004</td><td class=\"mono\">push:I 10</td><td class=\"mono\">⟨{0 ↦ {+}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">5</td></tr><tr class=\"\"><td class=\"mono\">005</td><td class=\"mono\">load:I 1</td><td class=\"mono\">⟨{0 ↦ {+}, 1 ↦ {−, 0, +}}, {+}⟩</td><td class=\"mono\">6</td></tr><tr class=\"on\"><td class=\"mono\">006</td><td class=\"mono\">binary:I div</td><td class=\"mono\">⟨{0 ↦ {+}, 1 ↦ {−, 0, +}}, {+}·{−, 0, +}⟩</td><td class=\"mono\">7, divide by zero</td></tr><tr class=\"\"><td class=\"mono\">007</td><td class=\"mono\">return:I</td><td class=\"mono\">⟨{0 ↦ {+}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">ok</td></tr><tr class=\"\"><td class=\"mono\">008</td><td class=\"mono\">push:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">9</td></tr><tr class=\"\"><td class=\"mono\">009</td><td class=\"mono\">return:I</td><td class=\"mono\">⟨{0 ↦ {−, 0}, 1 ↦ {−, 0, +}}, {0}⟩</td><td class=\"mono\">ok</td></tr></tbody></table></div></div><div class=\"panel\"><div class=\"usa-ph\"><b>C. Named values with constraints</b><span><span class=\"pill ok\">ok</span></span></div><p class=\"usa-sub\">Locals and the stack hold names; a constraint map says what each name may be. Loading copies the name, so a test on the copy is a test on the local. This is the notes' second table.</p><div class=\"table-wrap\"><table class=\"dt usa-st\"><thead><tr><th>Offset</th><th>Instruction</th><th>Constraints / state before</th><th>Goes to</th></tr></thead><tbody><tr class=\"\"><td class=\"mono\">000</td><td class=\"mono\">load:I 0</td><td class=\"mono\">{x ↦ {−, 0, +}} / ⟨{0 ↦ x}, ε⟩</td><td class=\"mono\">1</td></tr><tr class=\"\"><td class=\"mono\">001</td><td class=\"mono\">store:I 1</td><td class=\"mono\">{x ↦ {−, 0, +}} / ⟨{0 ↦ x}, x⟩</td><td class=\"mono\">2</td></tr><tr class=\"\"><td class=\"mono\">002</td><td class=\"mono\">load:I 0</td><td class=\"mono\">{x ↦ {−, 0, +}} / ⟨{0 ↦ x, 1 ↦ x}, ε⟩</td><td class=\"mono\">3</td></tr><tr class=\"\"><td class=\"mono\">003</td><td class=\"mono\">ifz le 8</td><td class=\"mono\">{x ↦ {−, 0, +}} / ⟨{0 ↦ x, 1 ↦ x}, x⟩</td><td class=\"mono\">8, 4</td></tr><tr class=\"\"><td class=\"mono\">004</td><td class=\"mono\">push:I 10</td><td class=\"mono\">{x ↦ {+}} / ⟨{0 ↦ x, 1 ↦ x}, ε⟩</td><td class=\"mono\">5</td></tr><tr class=\"\"><td class=\"mono\">005</td><td class=\"mono\">load:I 1</td><td class=\"mono\">{x ↦ {+}} / ⟨{0 ↦ x, 1 ↦ x}, {+}⟩</td><td class=\"mono\">6</td></tr><tr class=\"on\"><td class=\"mono\">006</td><td class=\"mono\">binary:I div</td><td class=\"mono\">{x ↦ {+}} / ⟨{0 ↦ x, 1 ↦ x}, {+}·x⟩</td><td class=\"mono\">7</td></tr><tr class=\"\"><td class=\"mono\">007</td><td class=\"mono\">return:I</td><td class=\"mono\">{x ↦ {+}} / ⟨{0 ↦ x, 1 ↦ x}, {0, +}⟩</td><td class=\"mono\">ok</td></tr><tr class=\"\"><td class=\"mono\">008</td><td class=\"mono\">push:I 0</td><td class=\"mono\">{x ↦ {−, 0}} / ⟨{0 ↦ x, 1 ↦ x}, ε⟩</td><td class=\"mono\">9</td></tr><tr class=\"\"><td class=\"mono\">009</td><td class=\"mono\">return:I</td><td class=\"mono\">{x ↦ {−, 0}} / ⟨{0 ↦ x, 1 ↦ x}, {0}⟩</td><td class=\"mono\">ok</td></tr></tbody></table></div></div>", "verdict": "<b>False alarms:</b> A, B. B refines <code>x</code> but <code>y</code> is a separate local holding an unrelated set; C stores the <em>name</em> of x into y, so refining x refines y. Truth: <span class=\"pill ok\">ok</span>", "vclass": "verdict warn"}, "safeDivAByB": {"panels": "<div class=\"panel\"><div class=\"usa-ph\"><b>A. Naive sign analysis</b><span><span class=\"pill ok\">ok</span> <span class=\"pill err\">divide by zero</span></span></div><p class=\"usa-sub\">Nothing is refined: a branch only checks that it is possible. This is the notes' first table.</p><div class=\"table-wrap\"><table class=\"dt usa-st\"><thead><tr><th>Offset</th><th>Instruction</th><th>Abstract state before</th><th>Goes to</th></tr></thead><tbody><tr class=\"\"><td class=\"mono\">000</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">1</td></tr><tr class=\"\"><td class=\"mono\">001</td><td class=\"mono\">ifz lt 9</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">9, 2</td></tr><tr class=\"\"><td class=\"mono\">002</td><td class=\"mono\">load:I 1</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">3</td></tr><tr class=\"\"><td class=\"mono\">003</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">4</td></tr><tr class=\"\"><td class=\"mono\">004</td><td class=\"mono\">if le 9</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}·{−, 0, +}⟩</td><td class=\"mono\">9, 5</td></tr><tr class=\"\"><td class=\"mono\">005</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">6</td></tr><tr class=\"\"><td class=\"mono\">006</td><td class=\"mono\">load:I 1</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">7</td></tr><tr class=\"on\"><td class=\"mono\">007</td><td class=\"mono\">binary:I div</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}·{−, 0, +}⟩</td><td class=\"mono\">8, divide by zero</td></tr><tr class=\"\"><td class=\"mono\">008</td><td class=\"mono\">return:I</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">ok</td></tr><tr class=\"\"><td class=\"mono\">009</td><td class=\"mono\">push:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">10</td></tr><tr class=\"\"><td class=\"mono\">010</td><td class=\"mono\">return:I</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {0}⟩</td><td class=\"mono\">ok</td></tr></tbody></table></div></div><div class=\"panel\"><div class=\"usa-ph\"><b>B. Refine the local a compared value came from</b><span><span class=\"pill ok\">ok</span></span></div><p class=\"usa-sub\">A lighter variant of named values: a stack value remembers the local it was loaded from, and a branch narrows that local too.</p><div class=\"table-wrap\"><table class=\"dt usa-st\"><thead><tr><th>Offset</th><th>Instruction</th><th>Abstract state before</th><th>Goes to</th></tr></thead><tbody><tr class=\"\"><td class=\"mono\">000</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">1</td></tr><tr class=\"\"><td class=\"mono\">001</td><td class=\"mono\">ifz lt 9</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">9, 2</td></tr><tr class=\"\"><td class=\"mono\">002</td><td class=\"mono\">load:I 1</td><td class=\"mono\">⟨{0 ↦ {0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">3</td></tr><tr class=\"\"><td class=\"mono\">003</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">4</td></tr><tr class=\"\"><td class=\"mono\">004</td><td class=\"mono\">if le 9</td><td class=\"mono\">⟨{0 ↦ {0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}·{0, +}⟩</td><td class=\"mono\">9, 5</td></tr><tr class=\"\"><td class=\"mono\">005</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {0, +}, 1 ↦ {+}}, ε⟩</td><td class=\"mono\">6</td></tr><tr class=\"\"><td class=\"mono\">006</td><td class=\"mono\">load:I 1</td><td class=\"mono\">⟨{0 ↦ {0, +}, 1 ↦ {+}}, {0, +}⟩</td><td class=\"mono\">7</td></tr><tr class=\"on\"><td class=\"mono\">007</td><td class=\"mono\">binary:I div</td><td class=\"mono\">⟨{0 ↦ {0, +}, 1 ↦ {+}}, {0, +}·{+}⟩</td><td class=\"mono\">8</td></tr><tr class=\"\"><td class=\"mono\">008</td><td class=\"mono\">return:I</td><td class=\"mono\">⟨{0 ↦ {0, +}, 1 ↦ {+}}, {0, +}⟩</td><td class=\"mono\">ok</td></tr><tr class=\"\"><td class=\"mono\">009</td><td class=\"mono\">push:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">10</td></tr><tr class=\"\"><td class=\"mono\">010</td><td class=\"mono\">return:I</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {0}⟩</td><td class=\"mono\">ok</td></tr></tbody></table></div></div><div class=\"panel\"><div class=\"usa-ph\"><b>C. Named values with constraints</b><span><span class=\"pill ok\">ok</span></span></div><p class=\"usa-sub\">Locals and the stack hold names; a constraint map says what each name may be. Loading copies the name, so a test on the copy is a test on the local. This is the notes' second table.</p><div class=\"table-wrap\"><table class=\"dt usa-st\"><thead><tr><th>Offset</th><th>Instruction</th><th>Constraints / state before</th><th>Goes to</th></tr></thead><tbody><tr class=\"\"><td class=\"mono\">000</td><td class=\"mono\">load:I 0</td><td class=\"mono\">{a ↦ {−, 0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, ε⟩</td><td class=\"mono\">1</td></tr><tr class=\"\"><td class=\"mono\">001</td><td class=\"mono\">ifz lt 9</td><td class=\"mono\">{a ↦ {−, 0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, a⟩</td><td class=\"mono\">9, 2</td></tr><tr class=\"\"><td class=\"mono\">002</td><td class=\"mono\">load:I 1</td><td class=\"mono\">{a ↦ {0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, ε⟩</td><td class=\"mono\">3</td></tr><tr class=\"\"><td class=\"mono\">003</td><td class=\"mono\">load:I 0</td><td class=\"mono\">{a ↦ {0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, b⟩</td><td class=\"mono\">4</td></tr><tr class=\"\"><td class=\"mono\">004</td><td class=\"mono\">if le 9</td><td class=\"mono\">{a ↦ {0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, b·a⟩</td><td class=\"mono\">9, 5</td></tr><tr class=\"\"><td class=\"mono\">005</td><td class=\"mono\">load:I 0</td><td class=\"mono\">{a ↦ {0, +}, b ↦ {+}} / ⟨{0 ↦ a, 1 ↦ b}, ε⟩</td><td class=\"mono\">6</td></tr><tr class=\"\"><td class=\"mono\">006</td><td class=\"mono\">load:I 1</td><td class=\"mono\">{a ↦ {0, +}, b ↦ {+}} / ⟨{0 ↦ a, 1 ↦ b}, a⟩</td><td class=\"mono\">7</td></tr><tr class=\"on\"><td class=\"mono\">007</td><td class=\"mono\">binary:I div</td><td class=\"mono\">{a ↦ {0, +}, b ↦ {+}} / ⟨{0 ↦ a, 1 ↦ b}, a·b⟩</td><td class=\"mono\">8</td></tr><tr class=\"\"><td class=\"mono\">008</td><td class=\"mono\">return:I</td><td class=\"mono\">{a ↦ {0, +}, b ↦ {+}} / ⟨{0 ↦ a, 1 ↦ b}, {0, +}⟩</td><td class=\"mono\">ok</td></tr><tr class=\"\"><td class=\"mono\">009</td><td class=\"mono\">push:I 0</td><td class=\"mono\">{a ↦ {−, 0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, ε⟩</td><td class=\"mono\">10</td></tr><tr class=\"\"><td class=\"mono\">010</td><td class=\"mono\">return:I</td><td class=\"mono\">{a ↦ {−, 0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, {0}⟩</td><td class=\"mono\">ok</td></tr></tbody></table></div></div>", "verdict": "<b>False alarms:</b> A. Refining both compared values is enough here: when <code>b &gt; a</code> is tested, a is already non-negative, so b must be positive. Truth: <span class=\"pill ok\">ok</span>", "vclass": "verdict warn"}, "safeDivSwapped": {"panels": "<div class=\"panel\"><div class=\"usa-ph\"><b>A. Naive sign analysis</b><span><span class=\"pill ok\">ok</span> <span class=\"pill err\">divide by zero</span></span></div><p class=\"usa-sub\">Nothing is refined: a branch only checks that it is possible. This is the notes' first table.</p><div class=\"table-wrap\"><table class=\"dt usa-st\"><thead><tr><th>Offset</th><th>Instruction</th><th>Abstract state before</th><th>Goes to</th></tr></thead><tbody><tr class=\"\"><td class=\"mono\">000</td><td class=\"mono\">load:I 1</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">1</td></tr><tr class=\"\"><td class=\"mono\">001</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">2</td></tr><tr class=\"\"><td class=\"mono\">002</td><td class=\"mono\">if le 9</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}·{−, 0, +}⟩</td><td class=\"mono\">9, 3</td></tr><tr class=\"\"><td class=\"mono\">003</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">4</td></tr><tr class=\"\"><td class=\"mono\">004</td><td class=\"mono\">ifz lt 9</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">9, 5</td></tr><tr class=\"\"><td class=\"mono\">005</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">6</td></tr><tr class=\"\"><td class=\"mono\">006</td><td class=\"mono\">load:I 1</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">7</td></tr><tr class=\"on\"><td class=\"mono\">007</td><td class=\"mono\">binary:I div</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}·{−, 0, +}⟩</td><td class=\"mono\">8, divide by zero</td></tr><tr class=\"\"><td class=\"mono\">008</td><td class=\"mono\">return:I</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">ok</td></tr><tr class=\"\"><td class=\"mono\">009</td><td class=\"mono\">push:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">10</td></tr><tr class=\"\"><td class=\"mono\">010</td><td class=\"mono\">return:I</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {0}⟩</td><td class=\"mono\">ok</td></tr></tbody></table></div></div><div class=\"panel\"><div class=\"usa-ph\"><b>B. Refine the local a compared value came from</b><span><span class=\"pill ok\">ok</span> <span class=\"pill err\">divide by zero</span></span></div><p class=\"usa-sub\">A lighter variant of named values: a stack value remembers the local it was loaded from, and a branch narrows that local too.</p><div class=\"table-wrap\"><table class=\"dt usa-st\"><thead><tr><th>Offset</th><th>Instruction</th><th>Abstract state before</th><th>Goes to</th></tr></thead><tbody><tr class=\"\"><td class=\"mono\">000</td><td class=\"mono\">load:I 1</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">1</td></tr><tr class=\"\"><td class=\"mono\">001</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">2</td></tr><tr class=\"\"><td class=\"mono\">002</td><td class=\"mono\">if le 9</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}·{−, 0, +}⟩</td><td class=\"mono\">9, 3</td></tr><tr class=\"\"><td class=\"mono\">003</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">4</td></tr><tr class=\"\"><td class=\"mono\">004</td><td class=\"mono\">ifz lt 9</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">9, 5</td></tr><tr class=\"\"><td class=\"mono\">005</td><td class=\"mono\">load:I 0</td><td class=\"mono\">⟨{0 ↦ {0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">6</td></tr><tr class=\"\"><td class=\"mono\">006</td><td class=\"mono\">load:I 1</td><td class=\"mono\">⟨{0 ↦ {0, +}, 1 ↦ {−, 0, +}}, {0, +}⟩</td><td class=\"mono\">7</td></tr><tr class=\"on\"><td class=\"mono\">007</td><td class=\"mono\">binary:I div</td><td class=\"mono\">⟨{0 ↦ {0, +}, 1 ↦ {−, 0, +}}, {0, +}·{−, 0, +}⟩</td><td class=\"mono\">8, divide by zero</td></tr><tr class=\"\"><td class=\"mono\">008</td><td class=\"mono\">return:I</td><td class=\"mono\">⟨{0 ↦ {0, +}, 1 ↦ {−, 0, +}}, {−, 0, +}⟩</td><td class=\"mono\">ok</td></tr><tr class=\"\"><td class=\"mono\">009</td><td class=\"mono\">push:I 0</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, ε⟩</td><td class=\"mono\">10</td></tr><tr class=\"\"><td class=\"mono\">010</td><td class=\"mono\">return:I</td><td class=\"mono\">⟨{0 ↦ {−, 0, +}, 1 ↦ {−, 0, +}}, {0}⟩</td><td class=\"mono\">ok</td></tr></tbody></table></div></div><div class=\"panel\"><div class=\"usa-ph\"><b>C. Named values with constraints</b><span><span class=\"pill ok\">ok</span> <span class=\"pill err\">divide by zero</span></span></div><p class=\"usa-sub\">Locals and the stack hold names; a constraint map says what each name may be. Loading copies the name, so a test on the copy is a test on the local. This is the notes' second table.</p><div class=\"table-wrap\"><table class=\"dt usa-st\"><thead><tr><th>Offset</th><th>Instruction</th><th>Constraints / state before</th><th>Goes to</th></tr></thead><tbody><tr class=\"\"><td class=\"mono\">000</td><td class=\"mono\">load:I 1</td><td class=\"mono\">{a ↦ {−, 0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, ε⟩</td><td class=\"mono\">1</td></tr><tr class=\"\"><td class=\"mono\">001</td><td class=\"mono\">load:I 0</td><td class=\"mono\">{a ↦ {−, 0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, b⟩</td><td class=\"mono\">2</td></tr><tr class=\"\"><td class=\"mono\">002</td><td class=\"mono\">if le 9</td><td class=\"mono\">{a ↦ {−, 0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, b·a⟩</td><td class=\"mono\">9, 3</td></tr><tr class=\"\"><td class=\"mono\">003</td><td class=\"mono\">load:I 0</td><td class=\"mono\">{a ↦ {−, 0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, ε⟩</td><td class=\"mono\">4</td></tr><tr class=\"\"><td class=\"mono\">004</td><td class=\"mono\">ifz lt 9</td><td class=\"mono\">{a ↦ {−, 0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, a⟩</td><td class=\"mono\">9, 5</td></tr><tr class=\"\"><td class=\"mono\">005</td><td class=\"mono\">load:I 0</td><td class=\"mono\">{a ↦ {0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, ε⟩</td><td class=\"mono\">6</td></tr><tr class=\"\"><td class=\"mono\">006</td><td class=\"mono\">load:I 1</td><td class=\"mono\">{a ↦ {0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, a⟩</td><td class=\"mono\">7</td></tr><tr class=\"on\"><td class=\"mono\">007</td><td class=\"mono\">binary:I div</td><td class=\"mono\">{a ↦ {0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, a·b⟩</td><td class=\"mono\">8, divide by zero</td></tr><tr class=\"\"><td class=\"mono\">008</td><td class=\"mono\">return:I</td><td class=\"mono\">{a ↦ {0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, {−, 0, +}⟩</td><td class=\"mono\">ok</td></tr><tr class=\"\"><td class=\"mono\">009</td><td class=\"mono\">push:I 0</td><td class=\"mono\">{a ↦ {−, 0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, ε⟩</td><td class=\"mono\">10</td></tr><tr class=\"\"><td class=\"mono\">010</td><td class=\"mono\">return:I</td><td class=\"mono\">{a ↦ {−, 0, +}, b ↦ {−, 0, +}} / ⟨{0 ↦ a, 1 ↦ b}, {0}⟩</td><td class=\"mono\">ok</td></tr></tbody></table></div></div>", "verdict": "<b>False alarms:</b> A, B, C. Here every analysis with per-name sign constraints fails: <code>b &gt; a</code> is tested while both are unknown, and the relation between them is never stored. Only a relational domain (topic 03) helps. Truth: <span class=\"pill ok\">ok</span>", "vclass": "verdict warn"}};
  function labNamed(el) {
    const { controls, view } = PA.lab(el, {
      title: "Naive, refining and named: three analyses of the same method",
      hint: "Each table shows the abstract state right before every instruction, at the fixed point, and where the results go. Compare the state at the division.",
    });
    el.classList.add("wide");
    const progSel = PA.select(controls, { label: "Method", options: [["safeDivByN", "safeDivByN(int n)"], ["copyThenDivide", "copyThenDivide(int x)"], ["safeDivAByB", "safeDivAByB(int a, int b)"], ["safeDivSwapped", "safeDivSwapped(int a, int b)"]], value: "safeDivByN" });
    const javaBox = h("div");
    const out = h("div", { class: "usa-three" });
    const verdict = h("div", { class: "verdict" });
    view.append(javaBox, out, verdict);
    function render() {
      const p = prog(progSel.value);
      const d = NAMED_DATA[p.id];
      javaBox.innerHTML = "";
      javaBox.append(PA.codeBlock(p.java, "java"));
      out.innerHTML = d.panels;
      verdict.className = d.vclass;
      verdict.innerHTML = d.verdict;
    }
    progSel.onchange = render;
    render();
  }

  /* --- 2. Relational domains in the plane --- */
  function labRelational(el) {
    const { controls, view } = PA.lab(el, {
      title: "Box, octagon or polyhedron: who keeps b away from 0?",
      hint: "The dots are the integer pairs (a, b) that satisfy the active conditions, in program order. Each shape is what one domain remembers. The red line is b = 0, the divisor we fear.",
    });
    const W = 6;
    const CONS = {
      bgta: { label: "b &gt; a", lin: [[-1, 1, 1]], test: (a, b) => b > a, apply: (A, Bv) => ITV.refine("gt", Bv, A).reverse() },
      age0: { label: "a &ge; 0", lin: [[1, 0, 0]], test: (a) => a >= 0, apply: (A, Bv) => [ITV.refine("ge", A, ITV.of(0))[0], Bv] },
      age1: { label: "a &ge; 1", lin: [[1, 0, 1]], test: (a) => a >= 1, apply: (A, Bv) => [ITV.refine("ge", A, ITV.of(1))[0], Bv] },
      ale4: { label: "a &le; 4", lin: [[-1, 0, -4]], test: (a) => a <= 4, apply: (A, Bv) => [ITV.refine("le", A, ITV.of(4))[0], Bv] },
      ble5: { label: "b &le; 5", lin: [[0, -1, -5]], test: (a, b) => b <= 5, apply: (A, Bv) => [A, ITV.refine("le", Bv, ITV.of(5))[0]] },
      sum: { label: "a + b &le; 6", lin: [[-1, -1, -6]], test: (a, b) => a + b <= 6, apply: (A, Bv) => [A && Bv ? ITV.meet(A, { lo: -INF, hi: 6 - Bv.lo }) : null, A && Bv ? ITV.meet(Bv, { lo: -INF, hi: 6 - A.lo }) : null] },
      beqa: { label: "b = a", lin: [[-1, 1, 0], [1, -1, 0]], test: (a, b) => b === a, apply: (A, Bv) => { const m = ITV.meet(A, Bv); return [m, m]; } },
    };
    const PRESETS = {
      swapped: { label: "safeDivSwapped: b > a, then a >= 0", order: ["bgta", "age0"] },
      aByB: { label: "safeDivAByB: a >= 0, then b > a", order: ["age0", "bgta"] },
      boxed: { label: "b > a, a >= 0, a + b <= 6", order: ["bgta", "age0", "sum"] },
      copy: { label: "a copy: b = a, then a >= 1", order: ["beqa", "age1"] },
    };
    const preset = PA.select(controls, { label: "Path condition", options: Object.keys(PRESETS).map((k) => [k, PRESETS[k].label]), value: "swapped" });
    const show = {};
    const grp = PA.group(controls, "Show");
    [["pts", "Concrete pairs", true], ["box", "Interval analysis (step by step)", true], ["best", "Best box &alpha;(S)", false], ["oct", "Octagon", true], ["poly", "Polyhedron", false]].forEach(([k, t, v]) => { show[k] = PA.toggle(grp, { label: t, value: v }); });
    const stage = h("div", { class: "stage usa-plane" });
    const table = h("div", { class: "table-wrap" });
    const verdict = h("div", { class: "verdict" });
    view.append(stage, table, verdict);

    // half-plane clipping of a convex polygon by c0*a + c1*b >= c2
    function clip(poly, [c0, c1, c2]) {
      const out = [], inside = (p) => c0 * p[0] + c1 * p[1] >= c2 - 1e-9;
      for (let i = 0; i < poly.length; i++) {
        const P1 = poly[i], P2 = poly[(i + 1) % poly.length];
        const i1 = inside(P1), i2 = inside(P2);
        if (i1) out.push(P1);
        if (i1 !== i2) {
          const d1 = c0 * P1[0] + c1 * P1[1] - c2, d2 = c0 * P2[0] + c1 * P2[1] - c2;
          const t = d1 / (d1 - d2);
          out.push([P1[0] + t * (P2[0] - P1[0]), P1[1] + t * (P2[1] - P1[1])]);
        }
      }
      return out;
    }
    const BIG = 1e5;
    function polygonOf(lins, bound) { let poly = [[-bound, -bound], [bound, -bound], [bound, bound], [-bound, bound]]; lins.forEach((l) => { poly = poly.length ? clip(poly, l) : poly; }); return poly; }
    function render() {
      const order = PRESETS[preset.value].order;
      const lins = order.flatMap((k) => CONS[k].lin);
      // concrete integer points in the window
      const pts = [];
      for (let a = -W; a <= W; a++) for (let b = -W; b <= W; b++) if (order.every((k) => CONS[k].test(a, b))) pts.push([a, b]);
      // step-by-step intervals
      let A = ITV.top(), Bv = ITV.top();
      const steps = [];
      order.forEach((k) => { const r = CONS[k].apply(A, Bv); A = r[0]; Bv = r[1]; steps.push([k, A, Bv]); });
      // exact polygon (real solutions) and octagon bounds over it
      const exact = polygonOf(lins, BIG);
      const forms = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
      const octB = forms.map(([x, y]) => { let m = -INF; exact.forEach((p) => { m = Math.max(m, x * p[0] + y * p[1]); }); return m > BIG / 2 ? INF : Math.floor(m + 1e-9); });
      const octLins = forms.map(([x, y], i) => [-x, -y, -octB[i]]).filter((l, i) => octB[i] !== INF);
      const bestBox = { a: { lo: -octB[1], hi: octB[0] }, b: { lo: -octB[3], hi: octB[2] } };
      const bestA = ITV.mk(bestBox.a.lo === -INF ? -INF : bestBox.a.lo, bestBox.a.hi), bestB = ITV.mk(bestBox.b.lo === -INF ? -INF : bestBox.b.lo, bestBox.b.hi);
      // drawing
      const S0 = 300, pad = 26, sc = (S0 - 2 * pad) / (2 * W + 1);
      const X = (a) => pad + (a + W + 0.5) * sc, Y = (b) => S0 - pad - (b + W + 0.5) * sc;
      function clipToView(poly) { let p = poly; [[1, 0, -W - 0.5], [-1, 0, -W - 0.5], [0, 1, -W - 0.5], [0, -1, -W - 0.5]].forEach((l) => { if (p.length) p = clip(p, l); }); return p; }
      const path = (poly) => (poly.length ? "M" + poly.map((q) => X(q[0]).toFixed(1) + " " + Y(q[1]).toFixed(1)).join(" L") + " Z" : "");
      let s = '<svg viewBox="0 0 ' + S0 + " " + S0 + '" width="' + S0 + '" height="' + S0 + '" role="img" aria-label="Pairs a, b and the shapes each domain keeps">';
      for (let a = -W; a <= W; a++) s += '<line class="usa-grid" x1="' + X(a) + '" y1="' + Y(-W) + '" x2="' + X(a) + '" y2="' + Y(W) + '"/>';
      for (let b = -W; b <= W; b++) s += '<line class="usa-grid" x1="' + X(-W) + '" y1="' + Y(b) + '" x2="' + X(W) + '" y2="' + Y(b) + '"/>';
      s += '<line class="usa-axis" x1="' + X(0) + '" y1="' + Y(-W) + '" x2="' + X(0) + '" y2="' + Y(W) + '"/>';
      s += '<line class="usa-zero" x1="' + X(-W - 0.5) + '" y1="' + Y(0) + '" x2="' + X(W + 0.5) + '" y2="' + Y(0) + '"/>';
      s += '<text class="usa-lbl" x="' + (X(W) + 4) + '" y="' + (Y(0) - 4) + '" text-anchor="end">b = 0</text>';
      s += '<text class="usa-lbl" x="' + (X(W) + 6) + '" y="' + (Y(-W) + 16) + '" text-anchor="end">a</text><text class="usa-lbl" x="' + (X(0) + 6) + '" y="' + (Y(W) - 6) + '">b</text>';
      const rectOf = (ia, ib) => [[Math.max(ia.lo, -BIG), Math.max(ib.lo, -BIG)], [Math.min(ia.hi, BIG), Math.max(ib.lo, -BIG)], [Math.min(ia.hi, BIG), Math.min(ib.hi, BIG)], [Math.max(ia.lo, -BIG), Math.min(ib.hi, BIG)]];
      if (show.poly.value && exact.length) s += '<path class="usa-poly" d="' + path(clipToView(exact)) + '"/>';
      if (show.oct.value) { const oct = polygonOf(octLins, BIG); if (oct.length) s += '<path class="usa-oct" d="' + path(clipToView(oct)) + '"/>'; }
      if (show.best.value && bestA && bestB) s += '<path class="usa-best" d="' + path(clipToView(rectOf(bestA, bestB))) + '"/>';
      if (show.box.value && A && Bv) s += '<path class="usa-box" d="' + path(clipToView(rectOf(A, Bv))) + '"/>';
      if (show.pts.value) pts.forEach(([a, b]) => { s += '<circle class="usa-pt" cx="' + X(a) + '" cy="' + Y(b) + '" r="3.6"/>'; });
      s += "</svg>";
      stage.innerHTML = s;
      // table
      const hasZero = (ib) => !!ib && ib.lo <= 0 && 0 <= ib.hi;
      const octZero = !(octB[3] !== INF && -octB[3] > 0) && !(octB[2] !== INF && octB[2] < 0);
      const rows = [
        ["Interval analysis, step by step", "a ∈ " + ITV.fmt(A) + ", b ∈ " + ITV.fmt(Bv), hasZero(Bv)],
        ["Best box α(S) (bounds of the real solutions)", "a ∈ " + ITV.fmt(bestA) + ", b ∈ " + ITV.fmt(bestB), hasZero(bestB)],
        ["Octagon (±x ±y ≤ c)", forms.map(([x, y], i) => (octB[i] === INF ? null : (x === 1 ? "a" : x === -1 ? "−a" : "") + (y === 1 ? (x ? " + b" : "b") : y === -1 ? (x ? " − b" : "−b") : "") + " ≤ " + String(octB[i]).replace("-", "−"))).filter(Boolean).join(",  ") || "no constraint", octZero],
        ["Polyhedron (any linear constraints)", order.map((k) => CONS[k].label.replace("&gt;", ">").replace("&ge;", "≥").replace("&le;", "≤")).join(" ∧ "), octZero],
      ];
      table.innerHTML = "";
      const t = h("table", { class: "dt" });
      t.innerHTML = "<thead><tr><th>Domain</th><th>What it remembers at the division</th><th>b = 0 possible?</th></tr></thead>";
      const tb = h("tbody");
      rows.forEach(([n, w, z]) => tb.append(h("tr", { class: z ? "bad" : "good" }, [h("td", { text: n }), h("td", { class: "mono", text: w }), h("td", { html: z ? pill("alarm", "err") : pill("safe", "ok") })])));
      t.append(tb);
      table.append(t);
      const stepTxt = steps.map(([k, a, b]) => "after " + CONS[k].label + ": a ∈ " + PA.esc(ITV.fmt(a)) + ", b ∈ " + PA.esc(ITV.fmt(b))).join("; ");
      verdict.className = "verdict " + (hasZero(Bv) ? "warn" : "good");
      verdict.innerHTML = (hasZero(Bv)
        ? "<b>The interval analysis cannot rule out b = 0.</b> "
        : "<b>Here even intervals suffice.</b> ") + stepTxt + ". " +
        (preset.value === "swapped" ? "Look at the best box: it excludes 0. The loss is not in the final shape but in refining one test at a time: when <code>b &gt; a</code> is tested, nothing is known about a yet, and the relation is dropped. The octagon keeps b − a ≥ 1, so a ≥ 0 later gives b ≥ 1." : preset.value === "copy" ? "Equalities between variables are octagonal (b − a ≤ 0 and a − b ≤ 0); this is the copy pattern of <code>copyThenDivide</code>." : "");
    }
    preset.onchange = render;
    Object.values(show).forEach((t) => (t.onchange = render));
    render();
  }

  /* --- 3. Kleene iteration --- */
  function labKleene(el) {
    const { controls, view } = PA.lab(el, {
      title: "Kleene iteration: climb from the bottom until nothing changes",
      hint: "Pick a lattice and a function, then press Step. The chain of iterates lights up on the diagram. Watch for the three possible endings: a fixed point, an oscillation, or growth that never stops.",
    });
    const NAMES = { 0: "∅", 1: "{−}", 2: "{0}", 4: "{+}", 3: "{−,0}", 5: "{−,+}", 6: "{0,+}", 7: "{−,0,+}" };
    const FUNS = {
      reach: { label: "Signs: F(X) = {0} ⊔ (X + {+})", lat: "sign", f: (x) => S.ZERO | S.add(x, S.POS), start: 0, startLabel: "⊥ = ∅", mono: true },
      notesBot: { label: "Signs: f(x) = x ⊔ (x + {+}), from ⊥", lat: "sign", f: (x) => x | S.add(x, S.POS), start: 0, startLabel: "⊥ = ∅", mono: true },
      notesZero: { label: "Signs: f(x) = x ⊔ (x + {+}), from {0} (the notes)", lat: "sign", f: (x) => x | S.add(x, S.POS), start: S.ZERO, startLabel: "{0}", mono: true },
      negate: { label: "Signs: F(X) = {+} ⊔ −X", lat: "sign", f: (x) => S.POS | S.neg(x), start: 0, startLabel: "⊥ = ∅", mono: true },
      compl: { label: "Signs: g(X) = complement of X (not monotone)", lat: "sign", f: (x) => 7 & ~x, start: 0, startLabel: "⊥ = ∅", mono: false },
      complJ: { label: "Signs: X ⊔ g(X) (join with the input)", lat: "sign", f: (x) => x | (7 & ~x), start: 0, startLabel: "⊥ = ∅", mono: false },
      chain: { label: "Chain 0 < 1 < 2 < 3 < 4: f(n) = min(n + 1, 3)", lat: "chain", f: (n) => Math.min(n + 1, 3), start: 0, startLabel: "⊥ = 0", mono: true },
      itv: { label: "Intervals: F(X) = [0, 0] ⊔ (X + [1, 1])", lat: "itv", f: (x) => ITV.join(ITV.of(0), ITV.add(x, ITV.of(1))), start: null, startLabel: "⊥", mono: true },
    };
    const fun = PA.select(controls, { label: "Function", options: Object.keys(FUNS).map((k) => [k, FUNS[k].label]), value: "reach" });
    const widen = PA.toggle(controls, { label: "Use widening (intervals, K = {0})", value: false });
    const btns = PA.btnRow(controls);
    PA.button(btns, "Step", () => { stepOnce(); render(); }, "primary");
    PA.button(btns, "Run", () => { for (let i = 0; i < 14 && !done(); i++) stepOnce(); render(); });
    PA.button(btns, "Reset", () => { reset(); render(); });
    const diagram = h("div", { class: "stage usa-kl" });
    const list = h("div", { class: "trace-strip usa-iter" });
    const verdict = h("div", { class: "verdict" });
    view.append(diagram, list, verdict);
    let xs = [];
    const F = () => FUNS[fun.value];
    const eq = (a, b) => (F().lat === "itv" ? ITV.eq(a, b) : a === b);
    const fmt = (x) => (F().lat === "sign" ? NAMES[x] : F().lat === "chain" ? String(x) : ITV.fmt(x));
    function reset() { xs = [F().start]; }
    function next(x) { const y = F().f(x); if (F().lat === "itv" && widen.value) return ITV.widenCourse(x, ITV.join(x, y), [0]); return y; }
    function status() {
      const n = xs.length - 1;
      if (n >= 1 && eq(xs[n], xs[n - 1])) return { k: "fix", n: n - 1 };
      for (let i = 0; i < n - 1; i++) if (eq(xs[i], xs[n])) return { k: "cycle", i, n };
      return null;
    }
    const done = () => !!status() || xs.length > 14;
    function stepOnce() { if (done()) return; xs.push(next(xs[xs.length - 1])); }
    function render() {
      widen.wrap.style.display = F().lat === "itv" ? "" : "none";
      const st = status();
      const seen = new Map();
      xs.forEach((x, i) => { const k = F().lat === "itv" ? ITV.fmt(x) : String(x); if (!seen.has(k)) seen.set(k, i); });
      // diagram
      let s = "";
      if (F().lat === "sign") {
        const pos = { 0: [150, 230], 1: [60, 160], 2: [150, 160], 4: [240, 160], 3: [60, 90], 5: [150, 90], 6: [240, 90], 7: [150, 20] };
        const edges = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [4, 5], [4, 6], [3, 7], [5, 7], [6, 7]];
        s = '<svg viewBox="0 0 300 250" width="300" height="250" role="img" aria-label="Hasse diagram of the sign lattice with the iterates">';
        edges.forEach(([a, b]) => { s += '<line class="hs-e" x1="' + pos[a][0] + '" y1="' + pos[a][1] + '" x2="' + pos[b][0] + '" y2="' + pos[b][1] + '"/>'; });
        Object.keys(pos).forEach((k) => {
          const m = Number(k), [x, y] = pos[m], idx = seen.get(String(m));
          s += '<g class="hs-n' + (idx != null ? " on" : "") + (idx === seen.get(String(xs[xs.length - 1])) ? " cur" : "") + '"><rect x="' + (x - 34) + '" y="' + (y - 13) + '" width="68" height="26" rx="8"/><text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle">' + NAMES[m] + "</text>" + (idx != null ? '<circle cx="' + (x + 34) + '" cy="' + (y - 13) + '" r="9"/><text class="hs-i" x="' + (x + 34) + '" y="' + (y - 9) + '" text-anchor="middle">' + idx + "</text>" : "") + "</g>";
        });
        s += "</svg>";
      } else if (F().lat === "chain") {
        s = '<svg viewBox="0 0 300 250" width="300" height="250" role="img" aria-label="A chain lattice with the iterates">';
        for (let n = 0; n <= 4; n++) { const y = 230 - n * 52; if (n < 4) s += '<line class="hs-e" x1="150" y1="' + (y - 13) + '" x2="150" y2="' + (y - 39) + '"/>'; const idx = seen.get(String(n)); s += '<g class="hs-n' + (idx != null ? " on" : "") + '"><rect x="116" y="' + (y - 13) + '" width="68" height="26" rx="8"/><text x="150" y="' + (y + 5) + '" text-anchor="middle">' + n + "</text>" + (idx != null ? '<circle cx="184" cy="' + (y - 13) + '" r="9"/><text class="hs-i" x="184" y="' + (y - 9) + '" text-anchor="middle">' + idx + "</text>" : "") + "</g>"; }
        s += "</svg>";
      } else {
        const W2 = 300, maxv = 14;
        s = '<svg viewBox="0 0 ' + W2 + ' 250" width="' + W2 + '" height="250" role="img" aria-label="Interval iterates as bars">';
        xs.slice(0, 14).forEach((x, i) => {
          const y = 18 + i * 16;
          s += '<text class="usa-lbl" x="4" y="' + (y + 9) + '">' + i + "</text>";
          if (x) { const x0 = 30 + (Math.max(0, x.lo) / maxv) * 240, x1 = 30 + (Math.min(maxv, x.hi) / maxv) * 240; s += '<rect class="usa-bar' + (x.hi === INF ? " inf" : "") + '" x="' + x0 + '" y="' + y + '" width="' + Math.max(4, x1 - x0) + '" height="10" rx="3"/>' + (x.hi === INF ? '<text class="usa-lbl" x="' + (x1 + 2) + '" y="' + (y + 9) + '" text-anchor="end">→ ∞</text>' : ""); }
        });
        s += '<line class="usa-axis" x1="30" y1="12" x2="30" y2="246"/>';
        s += "</svg>";
      }
      diagram.innerHTML = s;
      list.innerHTML = xs.map((x, i) => '<span class="ts' + (st && st.k === "fix" && i >= st.n ? " end-ok" : st && st.k === "cycle" && i >= st.i ? " end-err" : "") + '">f<sup>' + i + "</sup> = " + PA.esc(fmt(x)) + "</span>").join('<span class="arrow">→</span>');
      if (st && st.k === "fix") { verdict.className = "verdict good"; verdict.innerHTML = "<b>Fixed point after " + st.n + " step" + (st.n === 1 ? "" : "s") + ":</b> f<sup>" + st.n + "</sup>(" + PA.esc(F().startLabel) + ") = " + PA.esc(fmt(xs[st.n])) + "." + (fun.value === "notesBot" ? " Starting from ⊥ nothing ever happens: ∅ is already a fixed point. The start value has to be built into the function (first option)." : fun.value === "complJ" ? " Joining with the input made the sequence ascending, so it had to stop in this finite lattice, even though g is not monotone. (It stops at ⊤: sound, but not a least fixed point of anything useful.)" : F().lat === "itv" ? " Widening jumped straight to +∞ on the second step." : " Since f is monotone and we started at ⊥, this is the least fixed point."); }
      else if (st && st.k === "cycle") { verdict.className = "verdict bad"; verdict.innerHTML = "<b>Oscillation:</b> the value " + PA.esc(fmt(xs[st.n])) + " came back after " + (st.n - st.i) + " steps. g is not monotone, so the iterates are not a chain and need not settle. Fix: iterate X ⊔ g(X) instead."; }
      else if (xs.length > 14 || (F().lat === "itv" && xs.length > 4)) { verdict.className = "verdict bad"; verdict.innerHTML = "<b>Still growing after " + (xs.length - 1) + " steps.</b> Intervals have infinite ascending chains: [0,0] ⊏ [0,1] ⊏ [0,2] ⊏ … Turn on widening."; }
      else { verdict.className = "verdict"; verdict.innerHTML = "Iterating from " + PA.esc(F().startLabel) + ". " + (F().mono ? "f is monotone." : "This function is <b>not</b> monotone.") + " Press Step."; }
    }
    fun.onchange = () => { reset(); render(); };
    widen.onchange = () => { reset(); render(); };
    reset();
    render();
  }

  /* --- 4. Interval operations --- */
  function labIntervalOps(el) {
    const { controls, view } = PA.lab(el, {
      title: "Interval arithmetic and refinement",
      hint: "Type two intervals as lo, hi (use inf for infinity). The result is checked against thousands of random concrete pairs: every concrete result must land inside.",
    });
    const ia = PA.textInput(controls, { label: "A", value: "-3, 5" });
    const ib = PA.textInput(controls, { label: "B", value: "-1, 4" });
    const op = PA.seg(controls, { label: "Operation", options: [["add", "+"], ["sub", "−"], ["mul", "×"], ["div", "/"], ["rem", "%"]], value: "div" });
    const cmp = PA.select(controls, { label: "Assume the test", options: [["lt", "A < B"], ["le", "A ≤ B"], ["gt", "A > B"], ["ge", "A ≥ B"], ["eq", "A = B"], ["ne", "A ≠ B"]], value: "lt" });
    const stats = PA.stats(view, [{ key: "res", label: "A op B" }, { key: "err", label: "Divide by zero?" }, { key: "chk", label: "Sampled pairs inside" }]);
    const line = h("div", { class: "stage" });
    const ref = h("div", { class: "verdict" });
    view.append(line, ref);
    const SYM = { add: "+", sub: "−", mul: "×", div: "/", rem: "%" };
    function concrete(o, x, y) {
      if (o === "add") return x + y; if (o === "sub") return x - y; if (o === "mul") return x * y;
      if (y === 0) return null; return o === "div" ? Math.trunc(x / y) : x % y;
    }
    function sample(a, r) {
      const lo = a.lo === -INF ? -1000 : a.lo, hi = a.hi === INF ? 1000 : a.hi;
      const pick = [lo, hi, 0, 1, -1].filter((v) => v >= lo && v <= hi);
      return pick.length && r() < 0.3 ? pick[Math.floor(r() * pick.length)] : lo + Math.floor(r() * (hi - lo + 1));
    }
    function render() {
      let A, B;
      try { A = ITV.parse(ia.value); ia.bad(false); } catch (e) { ia.bad(true); stats.set("res", "check A", "bad"); return; }
      try { B = ITV.parse(ib.value); ib.bad(false); } catch (e) { ib.bad(true); stats.set("res", "check B", "bad"); return; }
      const o = op.value;
      let res, err = false;
      if (o === "div" || o === "rem") { const d = ITV[o](A, B); res = d.value; err = d.err; } else res = ITV[o](A, B);
      stats.set("res", PA.esc(ITV.fmt(res)));
      stats.set("err", o === "div" || o === "rem" ? (err ? "possible" : "no") : "n/a", err ? "bad" : "good");
      // sampling check
      let ok = 0, tot = 0;
      const r = PA.rng(7);
      if (A && B) for (let k = 0; k < 4000; k++) { const x = sample(A, r), y = sample(B, r); const z = concrete(o, x, y); if (z == null) continue; tot++; if (ITV.contains(res, z)) ok++; }
      stats.set("chk", tot ? ok + " / " + tot : "none", ok === tot ? "good" : "bad");
      // number line
      const fin = [A, B, res].filter(Boolean).flatMap((x) => [x.lo, x.hi]).filter(isFinite);
      let lo = Math.min(-2, ...fin), hi = Math.max(2, ...fin);
      const span = hi - lo, W2 = 600;
      lo -= span * 0.08; hi += span * 0.08;
      const X = (v) => 70 + ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (W2 - 90);
      let s = '<svg viewBox="0 0 ' + W2 + ' 120" width="' + W2 + '" height="120" role="img" aria-label="The intervals on a number line">';
      s += '<line class="usa-axis" x1="70" y1="104" x2="' + (W2 - 20) + '" y2="104"/>';
      s += '<line class="usa-zero" x1="' + X(0) + '" y1="8" x2="' + X(0) + '" y2="108"/><text class="usa-lbl" x="' + X(0) + '" y="118" text-anchor="middle">0</text>';
      [["A", A, 14, "a"], ["B", B, 42, "b"], ["A " + SYM[o] + " B", res, 70, "r"]].forEach(([n, x, y, c]) => {
        s += '<text class="usa-lbl" x="4" y="' + (y + 11) + '">' + PA.esc(n) + "</text>";
        if (x) { const x0 = X(x.lo), x1 = X(x.hi); s += '<rect class="usa-iv ' + c + '" x="' + x0 + '" y="' + y + '" width="' + Math.max(3, x1 - x0) + '" height="14" rx="4"/><text class="usa-lbl" x="' + x0 + '" y="' + (y - 2) + '">' + PA.esc(ITV.fmtB(x.lo)) + '</text><text class="usa-lbl" x="' + x1 + '" y="' + (y - 2) + '" text-anchor="end">' + PA.esc(ITV.fmtB(x.hi)) + "</text>"; }
        else s += '<text class="usa-lbl" x="70" y="' + (y + 11) + '">⊥</text>';
      });
      s += "</svg>";
      line.innerHTML = s;
      const [ra, rb] = ITV.refine(cmp.value, A, B);
      const [na, nb] = ITV.refine(NEG_COND[cmp.value], A, B);
      ref.className = "verdict";
      ref.innerHTML = "<b>Refinement by the test " + PA.esc(cmp.select.options[cmp.select.selectedIndex].text) + ":</b> if it holds, A ∈ " + PA.esc(ITV.fmt(ra)) + " and B ∈ " + PA.esc(ITV.fmt(rb)) + "; if it fails, A ∈ " + PA.esc(ITV.fmt(na)) + " and B ∈ " + PA.esc(ITV.fmt(nb)) + "." + (ra == null || na == null ? " One branch is impossible (⊥): the analysis can drop it." : "") + (cmp.value === "ne" ? " Note how little ≠ can do: an interval cannot have a hole, so only an endpoint can be cut off." : "") + (o === "div" && err ? " The divisor contains 0, so the analysis reports a possible division by zero and divides by the non-zero parts only." : "");
    }
    [ia, ib, op, cmp].forEach((c) => (c.onchange = render));
    render();
  }

  /* --- 5. Widening, the centerpiece --- */
  function labWidening(el) {
    const { controls, view } = PA.lab(el, {
      title: "Interval analysis of a loop: join versus widening",
      hint: "Each round steps every reached instruction and merges the results. With the plain join the loop head creeps up by one per round; widening jumps to the next constant in K (or to infinity) and the analysis stops.",
    });
    el.classList.add("wide");
    const top = h("div", { class: "usa-ctl" });
    controls.append(top);
    const progSel = PA.select(top, { label: "Program", options: [["runsForever", "runsForever()"], ["loopTo100", "loopTo100()"], ["sumTo", "sumTo(int n)"], ["countdown", "countdown(int n)"], ["collatz", "collatz(int n)"]], value: "loopTo100" });
    const mode = PA.seg(top, { label: "Merge at the loop head", options: [["join", "join ⊔"], ["course", "course ∇"], ["std", "standard ∇"]], value: "join" });
    const kIn = PA.textInput(top, { label: "Constants K", value: "" });
    const where = PA.seg(top, { label: "Widen at", options: [["heads", "loop heads"], ["all", "every merge"]], value: "heads" });
    const btns = PA.btnRow(top);
    PA.button(btns, "Next round", () => { advance(1); }, "primary");
    PA.button(btns, "Run to fixpoint", () => { advance(CAP + 1); });
    PA.button(btns, "Reset", () => { reset(); });
    PA.button(btns, "K from the program", () => { kIn.set(constantsOf(prog(progSel.value)).join(", ")); });
    const stats = PA.stats(view, [{ key: "n", label: "Round" }, { key: "st", label: "Fixed point?" }, { key: "head", label: "Loop head" }, { key: "out", label: "Outcomes reached" }]);
    const grid = h("div", { class: "split" });
    const left = h("div"), right = h("div");
    grid.append(left, right);
    const chart = h("div", { class: "stage" });
    const verdict = h("div", { class: "verdict" });
    view.append(grid, chart, verdict);
    const CAP = 700;
    let rounds, lst, p, heads, opts, K;
    function parseK() {
      const t = kIn.value.trim();
      if (!t) { kIn.bad(false); return []; }
      const parts = t.split(/[\s,]+/).filter(Boolean);
      if (parts.some((x) => !/^-?\d+$/.test(x))) { kIn.bad(true); return null; }
      kIn.bad(false);
      return parts.map(Number);
    }
    function reset() {
      p = prog(progSel.value);
      K = parseK() || [];
      heads = loopHeads(p);
      opts = { refine: "src", mode: mode.value, K, widenAt: where.value };
      rounds = [lockInit(p, ITV)];
      left.innerHTML = "";
      left.append(PA.codeBlock(p.java, "java"));
      lst = PA.jvm.listing(p);
      left.append(lst.el);
      render();
    }
    function advance(k) {
      for (let i = 0; i < k; i++) {
        const A = rounds[rounds.length - 1];
        if (A.stable) break;
        if (rounds.length > CAP && mode.value === "join") break;
        rounds.push(lockStep(p, ITV, A, opts, heads));
      }
      render();
    }
    function render() {
      const A = rounds[rounds.length - 1];
      const head = [...heads][0];
      const hf = A.states.get(head);
      lst.mark({ cov: new Set(A.states.keys()), hot: A.changed, ann: Object.fromEntries([...A.states].map(([off, f]) => [off, f.locals.map((v) => fmtAV(ITV, v)).join(" ")])) });
      right.innerHTML = "";
      const t = h("table", { class: "dt usa-st" });
      t.innerHTML = "<thead><tr><th>pc</th><th>locals λ</th><th>stack σ</th></tr></thead>";
      const tb = h("tbody");
      [...A.states.keys()].sort((a, b) => a - b).forEach((off) => {
        const f = A.states.get(off);
        tb.append(h("tr", { class: (A.changed.has(off) ? "on" : "") + (heads.has(off) ? " usa-head" : "") }, [h("td", { class: "mono", text: off + (heads.has(off) ? " ↺" : "") }), h("td", { class: "mono", text: f.locals.map((v, i) => i + ": " + fmtAV(ITV, v)).join(", ") || "·" }), h("td", { class: "mono", text: f.stack.length ? f.stack.map((v) => fmtAV(ITV, v)).join(" · ") : "ε" })]));
      });
      t.append(tb);
      right.append(h("div", { class: "panel-title", text: "Abstract state per instruction (↺ = loop head, highlighted = changed this round)" }), h("div", { class: "table-wrap" }, [t]));
      stats.set("n", String(A.n));
      stats.set("st", A.stable ? "yes" : rounds.length > CAP ? "never (stopped)" : "not yet", A.stable ? "good" : rounds.length > CAP ? "bad" : "");
      stats.set("head", hf ? PA.esc(hf.locals.map((v) => fmtAV(ITV, v)).join(" ")) : "·");
      stats.set("out", [...A.outcomes].join(", ") || "none");
      // chart of the loop head's upper bound of the most interesting local (the loop counter)
      const idx = p.id === "sumTo" ? 2 : 0;
      const series = rounds.map((R) => { const f = R.states.get(head); const v = f && f.locals[idx]; return v && v.k === "int" ? v.v : null; });
      const fin = series.filter(Boolean).flatMap((v) => [v.lo, v.hi]).filter(isFinite);
      const ymax = Math.max(4, ...fin.map(Math.abs)) * 1.1, ymin = Math.min(0, ...fin) * 1.1;
      const W2 = 640, H2 = 170, n = Math.max(series.length, 8);
      const X = (i) => 46 + (i / (n - 1)) * (W2 - 70), Y = (v) => (v === INF ? 14 : v === -INF ? H2 - 16 : H2 - 24 - ((v - ymin) / (ymax - ymin || 1)) * (H2 - 50));
      let s = '<svg viewBox="0 0 ' + W2 + " " + H2 + '" width="' + W2 + '" height="' + H2 + '" role="img" aria-label="Loop head interval over the rounds">';
      s += '<line class="usa-axis" x1="46" y1="' + (H2 - 20) + '" x2="' + (W2 - 20) + '" y2="' + (H2 - 20) + '"/><line class="usa-axis" x1="46" y1="10" x2="46" y2="' + (H2 - 20) + '"/>';
      s += '<text class="usa-lbl" x="40" y="18" text-anchor="end">+∞</text><text class="usa-lbl" x="40" y="' + (Y(0) + 4) + '" text-anchor="end">0</text><text class="usa-lbl" x="' + (W2 - 20) + '" y="' + (H2 - 4) + '" text-anchor="end">round</text>';
      s += '<line class="usa-inf" x1="46" y1="14" x2="' + (W2 - 20) + '" y2="14"/>';
      const ptsHi = [], ptsLo = [];
      series.forEach((v, i) => { if (v) { ptsHi.push(X(i) + "," + Y(v.hi)); ptsLo.push(X(i) + "," + Y(v.lo)); } });
      if (ptsHi.length) { s += '<polyline class="usa-hi" points="' + ptsHi.join(" ") + '"/><polyline class="usa-lo" points="' + ptsLo.join(" ") + '"/>'; }
      s += '<text class="usa-lbl usa-hi-t" x="52" y="34">bounds of λ[' + idx + "] at the loop head (solid: upper, dashed: lower)</text>";
      s += "</svg>";
      chart.innerHTML = s;
      // verdict
      const truth = TRUTH[p.id];
      const found = A.outcomes;
      let msg = "";
      if (A.stable) {
        const fa = [...found].filter((o) => !truth.includes(o));
        const exitReached = p.code.some((ins, off) => ins.op === "return" && A.states.has(off));
        msg = "<b>Fixed point after " + A.n + " rounds.</b> Outcomes reached: " + ([...found].map((o) => pill(o, truth.includes(o) ? "ok" : "err")).join(" ") || "none") + ". ";
        if (fa.length) msg += "False alarm: " + fa.join(", ") + " (the widened bound is too coarse; try the program's constants as K, or the standard widening). ";
        if (!exitReached) msg += "The return is unreachable in the fixed point: over mathematical integers the analysis proves the loop never exits. ";
        if (p.id === "runsForever") msg += "Careful: on Java's 32-bit ints, i + 1 wraps to −2<sup>31</sup> after 2<sup>31</sup> rounds and the loop does exit; a sound Java analysis must model overflow. ";
      } else if (rounds.length > CAP) msg = "<b>No fixed point after " + CAP + " rounds.</b> With the plain join the loop head grows by one per round: an infinite ascending chain. Switch to widening.";
      else msg = "Round " + A.n + ". " + (mode.value === "join" ? "Watch the loop head grow by one each round." : "K = {" + K.join(", ") + "}: the loop head will jump to " + (K.length ? "the next constant" : "±∞") + ".");
      verdict.className = "verdict " + (A.stable ? ([...found].some((o) => !truth.includes(o)) ? "warn" : "good") : rounds.length > CAP ? "bad" : "");
      verdict.innerHTML = msg;
    }
    progSel.onchange = () => { kIn.input.value = constantsOf(prog(progSel.value)).join(", "); reset(); };
    mode.onchange = reset; where.onchange = reset; kIn.onchange = () => { if (parseK() !== null) reset(); };
    kIn.input.value = constantsOf(prog(progSel.value)).join(", ");
    reset();
  }

  /* --- 6. Sign versus intervals --- */
  /* Precomputed sign-analysis results (fixed point, refining compared locals) for the comparison table. */
  const SIGN_RESULTS = {"safeDivByN": {"divisor": "{−, +}", "alarm": false}, "safeDivAByB": {"divisor": "{+}", "alarm": false}, "safeDivSwapped": {"divisor": "{−, 0, +}", "alarm": true}, "loopTo100": {"divisor": "{−, 0, +}", "alarm": true}, "ifThenElse": {"divisor": "{−, +}", "alarm": false}, "divideAfterCheck": {"divisor": "{+}", "alarm": false}, "plusOneDivide": {"divisor": "{−, 0, +}", "alarm": true}, "copyThenDivide": {"divisor": "{−, 0, +}", "alarm": true}};
  function labCompare(el) {
    const { controls, view } = PA.lab(el, {
      title: "Signs or intervals: who raises false alarms?",
      hint: "Every method below is safe: no input divides by zero. Each analysis runs to its fixed point (intervals with widening at loop heads, K = the method's constants). Red means a false alarm.",
    });
    el.classList.add("wide");
    const wmode = PA.seg(controls, { label: "Interval widening", options: [["course", "course ∇"], ["std", "standard ∇"]], value: "course" });
    const tableBox = h("div", { class: "table-wrap" });
    const verdict = h("div", { class: "verdict" });
    view.append(tableBox, verdict);
    const IDS = ["safeDivByN", "safeDivAByB", "safeDivSwapped", "loopTo100", "ifThenElse", "divideAfterCheck", "plusOneDivide", "copyThenDivide"];
    function divisorAt(p, states, D) {
      const off = p.code.findIndex((ins) => ins.op === "binary" && ins.operant === "div");
      const f = states.get(off);
      if (!f) return "unreachable";
      const v = f.stack[f.stack.length - 1];
      return v && v.k === "int" ? D.fmt(v.v) : "?";
    }
    function render() {
      const t = h("table", { class: "dt" });
      t.innerHTML = "<thead><tr><th>Method</th><th>Sign analysis: divisor</th><th>verdict</th><th>Interval analysis: divisor</th><th>verdict</th><th>Why</th></tr></thead>";
      const tb = h("tbody");
      let fs = 0, fi = 0;
      const WHY = {
        safeDivByN: "Intervals cannot express n ≠ 0 (no holes), signs can: {−, +}.",
        safeDivAByB: "Both refine b > a after a ≥ 0: b ≥ 1 (intervals), b ∈ {+} (signs).",
        safeDivSwapped: "Needs the relation b − a ≥ 1: only relational domains (topic 03).",
        loopTo100: "Intervals know i = 100 after the loop; signs only know i ≥ 0, so i − 50 may be 0.",
        ifThenElse: "Intervals join [1,1] and [−1,−1] into [−1,1], which contains 0; signs keep {−, +}.",
        divideAfterCheck: "x > 0: both domains get it.",
        plusOneDivide: "Intervals handle the threshold −1 exactly; signs cannot (Week 5, topic limits).",
        copyThenDivide: "y is a separate copy of x: neither per-variable domain links them (named values do).",
      };
      IDS.forEach((id) => {
        const p = prog(id);
        const sg = SIGN_RESULTS[id];
        const ir = lockRun(p, ITV, { refine: "src", mode: wmode.value, K: constantsOf(p), widenAt: "heads" }, 300);
        const ifin = ir[ir.length - 1];
        const sAl = sg.alarm, iAl = ifin.outcomes.has("divide by zero");
        if (sAl) fs++; if (iAl) fi++;
        tb.append(h("tr", null, [
          h("td", { class: "mono", text: id }),
          h("td", { class: "mono", text: sg.divisor }),
          h("td", { html: sAl ? pill("false alarm", "err") : pill("safe", "ok") }),
          h("td", { class: "mono", text: divisorAt(p, ifin.states, ITV) }),
          h("td", { html: iAl ? pill("false alarm", "err") : pill("safe", "ok") }),
          h("td", { text: WHY[id] }),
        ]));
      });
      t.append(tb);
      tableBox.innerHTML = "";
      tableBox.append(t);
      verdict.className = "verdict warn";
      verdict.innerHTML = "<b>Signs: " + fs + " false alarms, intervals: " + fi + " false alarms out of " + IDS.length + " safe methods.</b> Neither domain is uniformly better: intervals are more precise about magnitudes, signs can describe a hole around 0. Running both and taking the meet of their results (a reduced product) beats each alone.";
    }
    wmode.onchange = render;
    render();
  }

  /* --- 7. Worklist versus lockstep --- */
  function labWorklist(el) {
    const { controls, view } = PA.lab(el, {
      title: "Same fixed point, less work: the worklist",
      hint: "Lockstep re-runs every reached instruction every round. The worklist only re-runs instructions whose input changed. Pick the order in which the worklist is emptied and step through it.",
    });
    el.classList.add("wide");
    const top = h("div", { class: "usa-ctl" });
    controls.append(top);
    const progSel = PA.select(top, { label: "Program", options: [["manyOps", "manyOps(int x)"], ["sumTo", "sumTo(int n)"], ["loopTo100", "loopTo100()"], ["collatz", "collatz(int n)"], ["ifThenElse", "ifThenElse(int x)"]], value: "manyOps" });
    const order = PA.seg(top, { label: "Worklist order", options: [["fifo", "FIFO"], ["lifo", "LIFO"], ["rpo", "RPO first"]], value: "lifo" });
    const btns = PA.btnRow(top);
    PA.button(btns, "Step", () => { if (k < res.events.length) k++; render(); }, "primary");
    PA.button(btns, "Run", () => { k = res.events.length; render(); });
    PA.button(btns, "Reset", () => { k = 0; render(); });
    const bars = h("div", { class: "meter" });
    const grid = h("div", { class: "split" });
    const left = h("div"), right = h("div");
    grid.append(left, right);
    const verdict = h("div", { class: "verdict" });
    view.append(h("div", { class: "panel-title", text: "Instruction visits until the fixed point" }), bars, grid, verdict);
    let res, k = 0, p, lst, D, opts, all;
    function compute() {
      p = prog(progSel.value);
      D = ITV;
      opts = { refine: "src", mode: "course", K: constantsOf(p), widenAt: "heads" };
      const lock = lockRun(p, D, opts, 400);
      const lfin = lock[lock.length - 1];
      all = { lockstep: { visits: lfin.visits, states: lfin.states } };
      ["fifo", "lifo", "rpo"].forEach((o) => { const r = worklistRun(p, D, opts, o); all[o] = { visits: r.visits, states: r.states }; });
      res = worklistRun(p, D, opts, order.value);
      k = 0;
      left.innerHTML = "";
      lst = PA.jvm.listing(p);
      left.append(lst.el);
      const max = Math.max(...Object.values(all).map((x) => x.visits));
      const NAMES = { lockstep: "Lockstep rounds", fifo: "Worklist FIFO", lifo: "Worklist LIFO", rpo: "Worklist RPO" };
      bars.innerHTML = Object.keys(all).map((kk) => '<div class="meter-row"><span class="m-label">' + NAMES[kk] + '</span><div class="meter-track"><div class="meter-fill" style="width:' + (all[kk].visits / max) * 100 + "%;background:" + (kk === "lockstep" ? "var(--muted)" : kk === order.value ? "var(--accent)" : "var(--tech)") + '"></div></div><span class="m-val">' + all[kk].visits + "</span></div>").join("");
    }
    const sameStates = (a, b) => a.size === b.size && [...a.keys()].every((x) => b.has(x) && eqFrame(D, a.get(x), b.get(x)));
    function render() {
      const e = k ? res.events[k - 1] : null;
      lst.mark({ cur: e ? e.pc : null, hot: new Set(e ? e.wl : [0]), cov: new Set(res.events.slice(0, k).map((x) => x.pc)) });
      right.innerHTML = "";
      right.append(h("div", { class: "panel-title", text: "Worklist after step " + k + " of " + res.events.length }));
      const cells = h("div", { class: "cells" });
      (e ? e.wl : [0]).forEach((x) => cells.append(h("span", { class: "cell", text: String(x) })));
      if (e && !e.wl.length) cells.append(h("span", { class: "cell empty", text: "empty: done" }));
      right.append(cells);
      if (e) right.append(h("p", { class: "usa-sub", html: "Processed pc <b>" + e.pc + "</b> (" + PA.esc(PA.jvm.fmtIns(p.code[e.pc])) + "). " + (e.changed.length ? "Changed and (re)added: " + e.changed.join(", ") + "." : "No successor changed, nothing added.") }));
      const counts = {};
      res.events.slice(0, k).forEach((x) => (counts[x.pc] = (counts[x.pc] || 0) + 1));
      const multi = Object.entries(counts).filter(([, c]) => c > 1).map(([pc, c]) => pc + "×" + c);
      right.append(h("p", { class: "usa-sub", text: "Instructions visited more than once so far: " + (multi.join(", ") || "none") }));
      const eqL = ["fifo", "lifo", "rpo"].every((o) => sameStates(all[o].states, all.lockstep.states));
      verdict.className = "verdict " + (eqL ? "good" : "warn");
      verdict.innerHTML = (eqL ? "<b>All orders reach the same fixed point as lockstep.</b> " : "<b>The orders reach different (all sound) results:</b> widening is not monotone, so where and when it fires depends on the order. ") +
        (p.id === "manyOps" ? "In FIFO and LIFO order the code after the join is first reached through one branch; then the other branch changes the join and everything after it runs again (see the instructions visited twice). RPO finishes both branches first, so every instruction after the join runs once." : "Lockstep pays for every reached instruction in every round, even the ones that did not change.");
    }
    [progSel, order].forEach((c) => (c.onchange = () => { compute(); render(); }));
    compute();
    render();
  }

  /* --- 8. Control-flow graph, RPO and Tarjan --- */
  function labCfg(el) {
    const { controls, view } = PA.lab(el, {
      title: "From bytecode to a control-flow graph, RPO and SCCs",
      hint: "Basic blocks are maximal straight runs of instructions. The DFS numbers give the post-order; reversing it gives the reverse post-order (RPO). Step through Tarjan's algorithm to find the loops.",
    });
    el.classList.add("wide");
    const top = h("div", { class: "usa-ctl" });
    controls.append(top);
    const ids = ["loopTo100", "manyOps", "ifThenElse", "sumTo", "collatz", "countdown", "runsForever", "safeDivAByB", "assertPositive", "factorial", "infiniteLoop", "arraySpellsHello"];
    const progSel = PA.select(top, { label: "Program", options: ids.map((i) => [i, i]), value: "loopTo100" });
    const btns = PA.btnRow(top);
    PA.button(btns, "Tarjan step", () => { if (k < tj.ev.length) k++; render(); }, "primary");
    PA.button(btns, "Run Tarjan", () => { k = tj.ev.length; render(); });
    PA.button(btns, "Reset", () => { k = 0; render(); });
    const grid = h("div", { class: "split" });
    const left = h("div", { class: "stage usa-cfg" }), right = h("div");
    grid.append(left, right);
    const verdict = h("div", { class: "verdict" });
    view.append(grid, verdict);
    let p, bb, d, tj, k = 0;
    function compute() {
      p = prog(progSel.value);
      bb = basicBlocks(p);
      d = dfs(bb.blocks.length, (v) => bb.blocks[v].succ, 0);
      tj = tarjanEvents(bb.blocks.length, (v) => bb.blocks[v].succ);
      k = 0;
    }
    function render() {
      const blocks = bb.blocks;
      const order = d.rpo.concat(blocks.map((b) => b.id).filter((id) => !d.reached[id]));
      const pos = {};
      const lineH = 15, padY = 10, hdr = 16, bw = 230, x0 = 120;
      let y = 14;
      order.forEach((id) => { const b = blocks[id]; const hgt = (b.end - b.start + 1) * lineH + 2 * padY + hdr; pos[id] = { y, h: hgt }; y += hgt + 34; });
      const H2 = y + 6, W2 = 470;
      const sccOf = {};
      const doneSccs = tj.ev.slice(0, k).filter((e) => e.t === "scc").map((e) => e.comp);
      doneSccs.forEach((c, i) => c.forEach((v) => (sccOf[v] = i)));
      const cur = k ? tj.ev[k - 1] : null;
      const backSet = new Set(d.back.map(([u, v]) => u + ">" + v));
      let s = '<svg viewBox="0 0 ' + W2 + " " + H2 + '" width="' + W2 + '" height="' + H2 + '" role="img" aria-label="Control-flow graph">';
      s += '<defs><marker id="usa-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="usa-arrhead"/></marker></defs>';
      let lane = 0, rlane = 0;
      blocks.forEach((b) => {
        b.succ.forEach((t, si) => {
          const a = pos[b.id], c = pos[t];
          if (!a || !c) return;
          const isBack = backSet.has(b.id + ">" + t);
          const label = b.cond ? (si === 0 ? "jump" : "fall") : "";
          if (isBack) {
            const xr = x0 + bw + 22 + 14 * rlane++;
            s += '<path class="usa-edge back" marker-end="url(#usa-arr)" d="M' + (x0 + bw) + " " + (a.y + a.h / 2) + " H" + xr + " V" + (c.y + 12) + " H" + (x0 + bw + 2) + '"/>';
          } else if (order.indexOf(t) === order.indexOf(b.id) + 1) {
            s += '<path class="usa-edge" marker-end="url(#usa-arr)" d="M' + (x0 + bw / 2) + " " + (a.y + a.h) + " V" + (c.y - 2) + '"/>' + (label ? '<text class="usa-lbl" x="' + (x0 + bw / 2 + 6) + '" y="' + (a.y + a.h + 18) + '">' + label + "</text>" : "");
          } else {
            const xl = x0 - 22 - 14 * lane++;
            s += '<path class="usa-edge" marker-end="url(#usa-arr)" d="M' + x0 + " " + (a.y + a.h / 2) + " H" + xl + " V" + (c.y + 12) + " H" + (x0 - 2) + '"/>' + (label ? '<text class="usa-lbl" x="' + (xl - 4) + '" y="' + (a.y + a.h / 2 + 4) + '" text-anchor="end">' + label + "</text>" : "");
          }
        });
      });
      order.forEach((id) => {
        const b = blocks[id], q = pos[id];
        const inScc = sccOf[id] != null, big = inScc && doneSccs[sccOf[id]].length > 1 || (inScc && b.succ.includes(id));
        const isCur = cur && (cur.v === id);
        const onStack = cur && cur.stack.includes(id);
        s += '<g class="usa-blk' + (big ? " scc" : "") + (isCur ? " cur" : "") + (onStack ? " stk" : "") + (!d.reached[id] ? " dead" : "") + '"><rect x="' + x0 + '" y="' + q.y + '" width="' + bw + '" height="' + q.h + '" rx="8"/>';
        for (let i = b.start; i <= b.end; i++) s += '<text class="usa-ins" x="' + (x0 + 10) + '" y="' + (q.y + padY + hdr + 11 + (i - b.start) * lineH) + '">' + i + "  " + PA.esc(PA.jvm.fmtIns(p.code[i])) + "</text>";
        s += '<text class="usa-bid" x="' + (x0 + 10) + '" y="' + (q.y + 16) + '">B' + id + "</text>";
        s += '<text class="usa-rpo" x="' + (x0 + bw - 8) + '" y="' + (q.y + 14) + '" text-anchor="end">rpo ' + (d.index[id] != null ? d.index[id] : "·") + "</text>";
        if (b.exit) s += '<text class="usa-lbl" x="' + (x0 + bw / 2) + '" y="' + (q.y + q.h + 14) + '" text-anchor="middle">→ ' + (b.exit === "ok" ? "return" : "throw") + "</text>";
        s += "</g>";
      });
      s += "</svg>";
      left.innerHTML = s;
      right.innerHTML = "";
      const t = h("table", { class: "dt" });
      t.innerHTML = "<thead><tr><th>Order</th><th>Blocks</th></tr></thead>";
      const tb = h("tbody");
      [["DFS discovery (pre-order)", d.pre], ["Post-order (finish)", d.post], ["Reverse post-order", d.rpo]].forEach(([n, arr]) => tb.append(h("tr", null, [h("td", { text: n }), h("td", { class: "mono", text: arr.map((v) => "B" + v).join(" → ") })])));
      tb.append(h("tr", null, [h("td", { text: "Back edges (loops)" }), h("td", { class: "mono", text: d.back.map(([u, v]) => "B" + u + " → B" + v).join(", ") || "none" })]));
      t.append(tb);
      right.append(h("div", { class: "table-wrap" }, [t]));
      right.append(h("div", { class: "panel-title", text: "Tarjan, step " + k + " of " + tj.ev.length }));
      const log = h("ol", { class: "usa-log" });
      tj.ev.slice(Math.max(0, k - 7), k).forEach((e) => {
        let txt = "";
        if (e.t === "visit") txt = "visit B" + e.v + ": index = low = " + e.index + "; push it";
        else if (e.t === "back-up") txt = "back from B" + e.w + " to B" + e.v + ": low[B" + e.v + "] = " + e.low;
        else if (e.t === "on-stack") txt = "edge B" + e.v + " → B" + e.w + " hits the stack: low[B" + e.v + "] = " + e.low;
        else if (e.t === "done") txt = "edge B" + e.v + " → B" + e.w + ": already in a finished SCC, ignore";
        else txt = "low = index at B" + e.v + ": pop SCC {" + e.comp.map((v) => "B" + v).join(", ") + "}";
        log.append(h("li", { class: e.t === "scc" ? "scc" : "", text: txt }));
      });
      right.append(log);
      right.append(h("p", { class: "usa-sub", text: "Stack: " + (cur ? cur.stack.map((v) => "B" + v).join(" ") || "empty" : "empty") }));
      const nontriv = tj.sccs.filter((c) => c.length > 1 || bb.blocks[c[0]].succ.includes(c[0]));
      const cond = tj.sccs.slice().reverse();
      verdict.className = "verdict";
      verdict.innerHTML = k < tj.ev.length ? "Step through Tarjan: a block is the root of an SCC when, after all its edges, its <code>low</code> still equals its own index." :
        "<b>" + tj.sccs.length + " SCCs, " + nontriv.length + " of them loops</b>" + (nontriv.length ? " (" + nontriv.map((c) => "{" + c.slice().sort((a, b) => a - b).map((v) => "B" + v).join(", ") + "}").join(", ") + ")" : "") +
        ". Tarjan emits SCCs in reverse topological order, so the condensation is processed as " + cond.map((c) => "{" + c.slice().sort((a, b) => a - b).map((v) => "B" + v).join(", ") + "}").join(" → ") + ": iterate each loop to stability, then move on.";
    }
    progSel.onchange = () => { compute(); render(); };
    compute();
    render();
  }

  PA.boot("unbounded-static-analysis", {
    named: labNamed, relational: labRelational, kleene: labKleene, intervalops: labIntervalOps,
    widening: labWidening, compare: labCompare, worklist: labWorklist, cfg: labCfg,
  }, QUIZ);
})();
