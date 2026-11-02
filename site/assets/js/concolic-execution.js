/* Week 8, Concolic Execution: example programs, symbolic expressions, a small solver for linear
   integer constraints (standing in for Z3), one interpreter that runs the course bytecode symbolically
   or concolically, depth-first path exploration, concolic search, the quiz bank and the labs. */
(function () {
  "use strict";
  const h = PA.h;
  const J = PA.jvm;
  const esc = PA.esc;

  /* =====================================================================
     Example programs of this lecture (the shared ones come from jvm.js)
     ===================================================================== */
  const L = (i) => ({ op: "load", type: "I", index: i });
  const P = (v) => ({ op: "push", type: "I", value: v });
  const B = (o) => ({ op: "binary", type: "I", operant: o });
  const R = () => ({ op: "return", type: "I" });
  const ST = (i) => ({ op: "store", type: "I", index: i });
  const AE = "java/lang/AssertionError";
  const fail = () => [
    { op: "get", field: "$assertionsDisabled", static: true },
    null, // filled in: ifz ne <skip>
    { op: "new", class: AE }, { op: "dup" },
    { op: "invoke", access: "special", method: AE + ".<init>:()V", argc: 1, returns: null },
    { op: "throw" },
  ];
  /* "assert false" at the end of a block: get, ifz ne skip, new, dup, init, throw */
  function assertFalse(skip) {
    const c = fail();
    c[1] = { op: "ifz", condition: "ne", target: skip };
    return c;
  }

  const LOCAL = [
    {
      id: "incrByFour", cls: "jpamb.cases.Concolic", desc: "(I)I", params: [{ name: "a", type: "int" }], returns: "int", localNames: ["a", "x"],
      java: "public static int incr(int a) {\n  int x = a;   // x := a\n  x += 1;      // x := a + 1\n  x += 3;      // x := a + 1 + 3 = a + 4\n  return x;    // return (a + 4)\n}",
      input: "(42)",
      code: [L(0), ST(1), { op: "incr", index: 1, amount: 1 }, { op: "incr", index: 1, amount: 3 }, L(1), R()],
    },
    {
      id: "addTen", cls: "jpamb.cases.Concolic", desc: "(I)I", params: [{ name: "i", type: "int" }], returns: "int", localNames: ["i", "r"],
      java: "public static int addTen(int i) {\n  for (int r = 0; r < 10; r++) {\n    i += 1;\n  }\n  return i;\n}",
      input: "(42)",
      code: [P(0), ST(1), L(1), P(10), { op: "if", condition: "ge", target: 8 }, { op: "incr", index: 0, amount: 1 }, { op: "incr", index: 1, amount: 1 }, { op: "goto", target: 2 }, L(0), R()],
    },
    {
      id: "swapSubtract", cls: "jpamb.cases.Concolic", desc: "(II)I", params: [{ name: "a", type: "int" }, { name: "b", type: "int" }], returns: "int", localNames: ["a", "b"],
      java: "public static int swapSubtract(int a, int b) {\n  a = a + b;\n  b = a - b;\n  a = a - b;\n  return a - b;\n}",
      input: "(3, 10)",
      code: [L(0), L(1), B("add"), ST(0), L(0), L(1), B("sub"), ST(1), L(0), L(1), B("sub"), ST(0), L(0), L(1), B("sub"), R()],
    },
    {
      id: "incrBranch", cls: "jpamb.cases.Concolic", desc: "(I)I", params: [{ name: "a", type: "int" }], returns: "int", localNames: ["a", "x"],
      java: "public static int incr(int a) {\n  int x = a;\n  if (x > 10) {\n    x += 1;\n    if (x < 10)\n      assert false;\n  }\n  return x;\n}",
      input: "(0)",
      code: [L(0), ST(1), L(1), P(10), { op: "if", condition: "le", target: 15 }, { op: "incr", index: 1, amount: 1 }, L(1), P(10), { op: "if", condition: "ge", target: 15 }, ...assertFalse(15), L(1), R()],
    },
    {
      id: "incrAsPrinted", cls: "jpamb.cases.Concolic", desc: "(I)I", params: [{ name: "a", type: "int" }], returns: "int", localNames: ["a", "x"],
      java: "// The notes' version: \"x =+ 1\" is \"x = +1\" in Java.\npublic static int incr(int a) {\n  int x = a;\n  if (x > 10) {\n    x =+ 1;\n    if (x < 10)\n      assert false;\n  }\n  return x;\n}",
      input: "(0)",
      code: [L(0), ST(1), L(1), P(10), { op: "if", condition: "le", target: 16 }, P(1), ST(1), L(1), P(10), { op: "if", condition: "ge", target: 16 }, ...assertFalse(16), L(1), R()],
    },
    {
      id: "safeDivAByB", cls: "jpamb.cases.Concolic", desc: "(II)I", params: [{ name: "a", type: "int" }, { name: "b", type: "int" }], returns: "int",
      java: "public static int safeDivAByB(int a, int b) {\n  if (a >= 0) {\n    if (b > a) {\n      return a / b;\n    }\n  }\n  return 0;\n}",
      input: "(0, 0)",
      code: [L(0), { op: "ifz", condition: "lt", target: 9 }, L(1), L(0), { op: "if", condition: "le", target: 9 }, L(0), L(1), B("div"), R(), P(0), R()],
    },
    {
      id: "hashGate", cls: "jpamb.cases.Concolic", desc: "(II)V", params: [{ name: "x", type: "int" }, { name: "y", type: "int" }], returns: "void",
      java: "// hash(y) scrambles the bits of y, like a cryptographic\n// hash (here: the MurmurHash3 finaliser). Inverting it\n// is exactly what a solver is bad at.\npublic static void hashGate(int x, int y) {\n  if (x == hash(y)) {\n    assert false;\n  }\n}",
      input: "(0, 7)",
      code: [L(0), L(1), { op: "invoke", access: "static", method: "jpamb.cases.Concolic.hash:(I)I", target: "hash", native: true, argc: 1, returns: "int" }, { op: "if", condition: "ne", target: 10 }, ...assertFalse(10), { op: "return", type: null }],
    },
  ];
  const PROGS = {};
  LOCAL.forEach((p) => { p.methodId = p.cls + "." + p.id + ":" + p.desc; PROGS[p.id] = p; });
  ["divideByN", "checkBeforeDivideByN", "checkTheWrongThing", "isNotAMillion", "assertPositive", "countdown", "arraySpellsHello"].forEach((id) => (PROGS[id] = J.get(id)));
  const prog = (id) => PROGS[id];

  /* Default concrete input: zeros, false, empty arrays. */
  function zeroInput(p) {
    return p.params.map((q) => (q.type === "int" ? 0 : q.type === "boolean" ? false : []));
  }
  function fmtInput(p, vals) {
    return "(" + p.params.map((q, i) => {
      const v = vals[i];
      if (q.type === "int") return String(v);
      if (q.type === "boolean") return v ? "true" : "false";
      return "[C: " + v.map((c) => "'" + String.fromCharCode(c) + "'").join(",") + "]";
    }).join(", ") + ")";
  }

  /* The bit-mixing finaliser of MurmurHash3 (after adding a constant, so that hash(0) is not 0):
     the stand-in for a one-way function. */
  function hash32(x) {
    let v = (x + 0x9e3779b9) | 0;
    v ^= v >>> 16; v = Math.imul(v, 0x85ebca6b);
    v ^= v >>> 13; v = Math.imul(v, 0xc2b2ae35);
    v ^= v >>> 16;
    return v | 0;
  }

  /* =====================================================================
     Symbolic expressions:  s ::= n | v | s + s | s - s | s * s | s / s | s % s | -s | hash(s)
     ===================================================================== */
  const K = (v) => ({ k: "c", v });
  const V = (name) => ({ k: "v", name });
  const OP = (op, a, b) => ({ k: "op", op, a, b });
  const hasVar = (e) => e.k === "v" || (e.k === "op" && (hasVar(e.a) || (e.b != null && hasVar(e.b))));

  /* Build an operation; two constants are computed right away (32-bit, as the JVM does). */
  function mk(op, a, b) {
    if (a.k === "c" && (b == null || b.k === "c")) {
      if (op === "neg") return K((-a.v) | 0);
      if (op === "hash") return K(hash32(a.v));
      return K(J.arith(op, a.v, b.v));
    }
    if (op === "add" && b && b.k === "c" && b.v < 0) return OP("sub", a, K(-b.v));
    return OP(op, a, b);
  }

  const PREC = { add: 1, sub: 1, mul: 2, div: 2, rem: 2 };
  const OPSYM = { add: " + ", sub: " - ", mul: " * ", div: " / ", rem: " % " };
  function fmt(e, p) {
    p = p || 0;
    if (e.k === "c") return e.v < 0 && p > 0 ? "(" + e.v + ")" : String(e.v);
    if (e.k === "v") return e.name;
    if (e.op === "hash") return "hash(" + fmt(e.a) + ")";
    if (e.op === "neg") return "-" + fmt(e.a, 3);
    const q = PREC[e.op];
    const s = fmt(e.a, q) + OPSYM[e.op] + fmt(e.b, q + 1);
    return q < p ? "(" + s + ")" : s;
  }

  /* Linear form  sum(t[x] * x) + c,  or null when the expression is not linear. */
  function lin(e) {
    if (e.k === "c") return { t: {}, c: e.v };
    if (e.k === "v") return { t: { [e.name]: 1 }, c: 0 };
    if (e.op === "neg") { const a = lin(e.a); return a && scaleL(a, -1); }
    if (e.op === "add" || e.op === "sub") {
      const a = lin(e.a), b = lin(e.b);
      return a && b ? addL(a, e.op === "add" ? b : scaleL(b, -1)) : null;
    }
    if (e.op === "mul") {
      const a = lin(e.a), b = lin(e.b);
      if (!a || !b) return null;
      if (!Object.keys(a.t).length) return scaleL(b, a.c);
      if (!Object.keys(b.t).length) return scaleL(a, b.c);
    }
    return null;
  }
  function scaleL(a, k) {
    const t = {};
    for (const x in a.t) if (a.t[x] * k !== 0) t[x] = a.t[x] * k;
    return { t, c: a.c * k };
  }
  function addL(a, b) {
    const t = Object.assign({}, a.t);
    for (const x in b.t) { t[x] = (t[x] || 0) + b.t[x]; if (t[x] === 0) delete t[x]; }
    return { t, c: a.c + b.c };
  }
  function linExpr(l) {
    let e = null;
    for (const x in l.t) {
      const k = l.t[x], v = V(x);
      if (!e) e = k === 1 ? v : k === -1 ? OP("neg", v) : OP("mul", K(k), v);
      else if (k > 0) e = OP("add", e, k === 1 ? v : OP("mul", K(k), v));
      else e = OP("sub", e, k === -1 ? v : OP("mul", K(-k), v));
    }
    if (!e) return K(l.c);
    if (l.c > 0) return OP("add", e, K(l.c));
    if (l.c < 0) return OP("sub", e, K(-l.c));
    return e;
  }
  /* What z3.simplify does for us here: collect linear parts, keep the rest as is. */
  function simp(e) {
    const l = lin(e);
    if (l) return linExpr(l);
    if (e.k !== "op") return e;
    return OP(e.op, simp(e.a), e.b && simp(e.b));
  }

  /* Evaluate over the mathematical integers (what z3.Int means). */
  function evalZ(e, env) {
    if (e.k === "c") return e.v;
    if (e.k === "v") return env[e.name];
    const a = evalZ(e.a, env), b = e.b ? evalZ(e.b, env) : 0;
    switch (e.op) {
      case "add": return a + b;
      case "sub": return a - b;
      case "mul": return a * b;
      case "div": return Math.trunc(a / b);
      case "rem": return a % b;
      case "neg": return -a;
      case "hash": return hash32(a);
    }
    return NaN;
  }

  /* Constraints:  a cond b  (cond as in the bytecode: eq ne lt ge gt le) */
  const negC = (c) => Object.assign({}, c, { cond: J.NEG_COND[c.cond] });
  const fmtCon = (c, raw) => (raw ? fmt(c.a) : fmt(simp(c.a))) + " " + J.COND_SYM[c.cond] + " " + (raw ? fmt(c.b) : fmt(simp(c.b)));
  const fmtPath = (cs) => (cs.length ? cs.map((c) => fmtCon(c)).join("  ∧  ") : "true");

  /* =====================================================================
     A small solver for conjunctions of linear integer constraints.
     Equalities with a unit coefficient are solved and substituted away (Gaussian elimination),
     then bounds propagation plus a short search; answers sat (with a model), unsat, or unknown.
     It stands in for Z3: like z3.Int, arithmetic is over the mathematical integers.
     ===================================================================== */
  const INT = [-2147483648, 2147483647];
  const CHAR = [97, 122]; // the labs keep generated characters to 'a'..'z'
  const LEN = [0, 16];

  function solve(cons, decls, prefer) {
    decls = decls || {};
    prefer = prefer || {};
    const le = [], ne = [], eqs = [], vars = [];
    const addVars = (t) => { for (const x in t) if (vars.indexOf(x) < 0) vars.push(x); };
    for (const c of cons) {
      const d = lin(OP("sub", c.a, c.b));
      if (!d) {
        const bad = [c.a, c.b].find((e) => !lin(e));
        return { status: "unknown", why: "non-linear term " + fmt(simp(bad)) };
      }
      if (!Object.keys(d.t).length) {
        if (!J.cmp(c.cond, d.c, 0)) return { status: "unsat", why: "a constant constraint is false" };
        continue;
      }
      addVars(d.t);
      const m = scaleL(d, -1);
      switch (c.cond) {
        case "le": le.push(d); break;
        case "lt": le.push({ t: d.t, c: d.c + 1 }); break;
        case "ge": le.push(m); break;
        case "gt": le.push({ t: m.t, c: m.c + 1 }); break;
        case "eq": eqs.push(d); break;
        case "ne": ne.push(d); break;
      }
    }
    const dom0 = {};
    vars.forEach((x) => (dom0[x] = (decls[x] || INT).slice()));

    // Eliminate x from a row of the form a*x + rest + c = 0 with a = +-1: x = -(rest + c) / a.
    const defs = [];
    const subst = (r, x, l) => {
      const b = r.t[x];
      if (!b) return r;
      const t = Object.assign({}, r.t);
      delete t[x];
      return addL({ t, c: r.c }, scaleL(l, b));
    };
    for (;;) {
      const i = eqs.findIndex((r) => Object.keys(r.t).some((x) => Math.abs(r.t[x]) === 1));
      if (i < 0) break;
      const r = eqs.splice(i, 1)[0];
      const x = Object.keys(r.t).find((y) => Math.abs(r.t[y]) === 1);
      const t = Object.assign({}, r.t);
      delete t[x];
      const l = scaleL({ t, c: r.c }, -r.t[x]);
      const [lo, hi] = dom0[x];
      delete dom0[x];
      vars.splice(vars.indexOf(x), 1);
      for (const rows of [le, ne, eqs]) rows.forEach((q, j) => (rows[j] = subst(q, x, l)));
      defs.forEach((d) => (d.l = subst(d.l, x, l)));
      defs.push({ x, l });
      // x must stay inside its domain: lo <= l <= hi
      le.push(addL(scaleL(l, -1), { t: {}, c: lo }), addL(l, { t: {}, c: -hi }));
    }
    eqs.forEach((d) => le.push(d, scaleL(d, -1)));
    for (const rows of [le, ne]) {
      for (let j = rows.length - 1; j >= 0; j--) {
        if (Object.keys(rows[j].t).length) continue;
        if (rows === le ? rows[j].c > 0 : rows[j].c === 0) return { status: "unsat" };
        rows.splice(j, 1);
      }
    }

    function propagate(dom) {
      for (let round = 0; round < 80; round++) {
        let changed = false;
        for (const r of le) {
          for (const x in r.t) {
            const a = r.t[x];
            let rest = r.c;
            for (const y in r.t) if (y !== x) { const b = r.t[y]; rest += Math.min(b * dom[y][0], b * dom[y][1]); }
            if (a > 0) { const ub = Math.floor(-rest / a); if (ub < dom[x][1]) { dom[x][1] = ub; changed = true; } }
            else { const lb = Math.ceil(-rest / a); if (lb > dom[x][0]) { dom[x][0] = lb; changed = true; } }
            if (dom[x][0] > dom[x][1]) return null;
          }
        }
        for (const r of ne) {
          let free = null, nfree = 0, sum = r.c;
          for (const y in r.t) {
            if (dom[y][0] === dom[y][1]) sum += r.t[y] * dom[y][0];
            else { free = y; nfree++; }
          }
          if (nfree === 0 && sum === 0) return null;
          if (nfree === 1 && (-sum) % r.t[free] === 0) {
            const v = -sum / r.t[free];
            if (v === dom[free][0]) { dom[free][0]++; changed = true; }
            else if (v === dom[free][1]) { dom[free][1]--; changed = true; }
            if (dom[free][0] > dom[free][1]) return null;
          }
        }
        if (!changed) return dom;
      }
      return dom;
    }

    let budget = 3000, exhaustive = true;
    function search(dom) {
      if (--budget < 0) { exhaustive = false; return null; }
      dom = propagate(dom);
      if (!dom) return null;
      let x = null, best = Infinity;
      vars.forEach((v) => { const w = dom[v][1] - dom[v][0]; if (w > 0 && w < best) { best = w; x = v; } });
      if (x === null) return dom;
      const [lo, hi] = dom[x];
      const want = prefer[x] != null ? prefer[x] : 0;
      const p = Math.min(hi, Math.max(lo, want));
      let cands;
      const small = hi - lo <= 40;
      if (small) {
        cands = [];
        for (let v = lo; v <= hi; v++) cands.push(v);
        cands.sort((u, w) => Math.abs(u - p) - Math.abs(w - p) || u - w);
      } else {
        cands = [p, p + 1, p - 1, lo, hi, lo + 1, hi - 1].filter((v, i, a) => v >= lo && v <= hi && a.indexOf(v) === i);
      }
      for (const v of cands) {
        const d2 = {};
        for (const y in dom) d2[y] = dom[y].slice();
        d2[x] = [v, v];
        const r = search(d2);
        if (r) return r;
      }
      if (!small) exhaustive = false;
      return null;
    }
    const res = search(dom0);
    if (res) {
      const model = {};
      vars.forEach((x) => (model[x] = res[x][0]));
      for (let j = defs.length - 1; j >= 0; j--) {
        const { x, l } = defs[j];
        let v = l.c;
        for (const y in l.t) v += l.t[y] * (y in model ? model[y] : 0);
        model[x] = v;
      }
      return { status: "sat", model };
    }
    return exhaustive ? { status: "unsat" } : { status: "unknown", why: "the search gave up" };
  }

  /* =====================================================================
     One interpreter, two modes.
       "sym":  values are symbolic only; a branch on a symbolic value has two successors.
       "conc": every value has a concrete part c and a symbolic part s; the concrete part
               decides each branch and the symbolic part records the path constraint.
     A value is { t: "i", s: expr, c: int | undefined } or { t: "r", id }.
     ===================================================================== */
  const kv = (v) => ({ t: "i", s: K(v), c: v });

  function initState(p, input) {
    const decls = {}, arrays = {}, locals = [];
    p.params.forEach((q, i) => {
      const a = input ? input[i] : undefined;
      if (q.type === "int" || q.type === "boolean") {
        decls[q.name] = q.type === "int" ? INT : [0, 1];
        locals.push({ t: "i", s: V(q.name), c: a == null ? undefined : q.type === "boolean" ? (a ? 1 : 0) : a });
      } else {
        const ln = q.name + ".length";
        decls[ln] = LEN;
        arrays[q.name] = { len: { t: "i", s: V(ln), c: a ? a.length : undefined }, items: a || null };
        locals.push({ t: "r", id: q.name });
      }
    });
    return { pc: 0, locals, stack: [], path: [], steps: 0, arrays, decls, notes: [] };
  }
  const cloneSt = (s) => Object.assign({}, s, { locals: s.locals.slice(), stack: s.stack.slice(), path: s.path.slice() });

  function bin(op, a, b, mode, s) {
    let e = mk(op, a.s, b && b.s);
    let c;
    if (a.c !== undefined && (!b || b.c !== undefined)) c = op === "neg" ? (-a.c) | 0 : op === "hash" ? hash32(a.c) : J.arith(op, a.c, b.c);
    if (mode === "conc" && hasVar(e) && !lin(e)) {
      s.notes.push({ pc: s.pc, text: fmt(simp(e)) + " cannot be handed to the solver, so it is replaced by its concrete value " + c });
      e = K(c);
    }
    return { t: "i", s: e, c };
  }

  /* Decide a comparison. Returns the successors as [{ truth, con }]. */
  function decide(x, cond, y, mode, pc, kind) {
    if (!hasVar(x.s) && !hasVar(y.s)) return [{ truth: J.cmp(cond, x.s.v, y.s.v), con: null }];
    const con = { a: x.s, cond, b: y.s, pc, kind };
    if (mode === "conc") { const t = J.cmp(cond, x.c, y.c); return [{ truth: t, con: t ? con : negC(con) }]; }
    return [{ truth: true, con }, { truth: false, con: negC(con) }];
  }

  /* One step. Returns a list of successors { st, con, outcome, ret }. */
  function step(st, p, mode) {
    const ins = p.code[st.pc];
    const s = cloneSt(st);
    s.steps++;
    const out = [];
    const go = (x, extra) => out.push(Object.assign({ st: x, con: null, outcome: null, ret: null }, extra));
    const fork = (ds, f) => ds.forEach((d) => {
      const x = ds.length > 1 ? cloneSt(s) : s;
      if (d.con) x.path.push(d.con);
      go(x, Object.assign({ con: d.con }, f(x, d.truth)));
    });
    switch (ins.op) {
      case "push": s.stack.push(kv(ins.value)); s.pc++; go(s); break;
      case "load": s.stack.push(s.locals[ins.index]); s.pc++; go(s); break;
      case "store": s.locals[ins.index] = s.stack.pop(); s.pc++; go(s); break;
      case "incr": s.locals[ins.index] = bin("add", s.locals[ins.index], kv(ins.amount), mode, s); s.pc++; go(s); break;
      case "negate": s.stack.push(bin("neg", s.stack.pop(), null, mode, s)); s.pc++; go(s); break;
      case "binary": {
        const b = s.stack.pop(), a = s.stack.pop();
        if (ins.operant === "div" || ins.operant === "rem") {
          fork(decide(b, "eq", kv(0), mode, s.pc, "div"), (x, zero) => {
            if (zero) return { outcome: "divide by zero" };
            x.stack.push(bin(ins.operant, a, b, mode, x)); x.pc++;
            return {};
          });
        } else { s.stack.push(bin(ins.operant, a, b, mode, s)); s.pc++; go(s); }
        break;
      }
      case "ifz": {
        const v = s.stack.pop();
        fork(decide(v, ins.condition, kv(0), mode, s.pc, "branch"), (x, t) => { x.pc = t ? ins.target : x.pc + 1; return {}; });
        break;
      }
      case "if": {
        const b = s.stack.pop(), a = s.stack.pop();
        fork(decide(a, ins.condition, b, mode, s.pc, "branch"), (x, t) => { x.pc = t ? ins.target : x.pc + 1; return {}; });
        break;
      }
      case "goto": s.pc = ins.target; go(s); break;
      case "get": s.stack.push(kv(0)); s.pc++; go(s); break;
      case "new": s.stack.push({ t: "r", id: "obj" }); s.pc++; go(s); break;
      case "dup": s.stack.push(s.stack[s.stack.length - 1]); s.pc++; go(s); break;
      case "invoke":
        if (ins.access === "special") s.stack.pop();
        else s.stack.push(bin("hash", s.stack.pop(), null, mode, s));
        s.pc++; go(s); break;
      case "throw": go(s, { outcome: "assertion error" }); break;
      case "return": go(s, { outcome: "ok", ret: ins.type ? s.stack.pop() : null }); break;
      case "arraylength": s.stack.push(s.arrays[s.stack.pop().id].len); s.pc++; go(s); break;
      case "array_load": {
        let i = s.stack.pop();
        const r = s.stack.pop(), arr = s.arrays[r.id];
        if (hasVar(i.s)) {
          if (mode !== "conc") { go(s, { outcome: "symbolic index" }); break; }
          s.notes.push({ pc: s.pc, text: "symbolic index " + fmt(simp(i.s)) + " replaced by its concrete value " + i.c });
          i = kv(i.c);
        }
        const k = i.s.v;
        if (k < 0) { go(s, { outcome: "out of bounds" }); break; }
        fork(decide(kv(k), "ge", arr.len, mode, s.pc, "bounds"), (x, oob) => {
          if (oob) return { outcome: "out of bounds" };
          const name = r.id + "[" + k + "]";
          x.decls[name] = CHAR;
          x.stack.push({ t: "i", s: V(name), c: arr.items ? arr.items[k] : undefined });
          x.pc++;
          return {};
        });
        break;
      }
      default: throw new Error("unsupported instruction " + ins.op);
    }
    return out;
  }

  /* ---------- Concolic: one run ---------- */
  function concolicRun(p, input, maxSteps) {
    let st = initState(p, input);
    const cov = new Set(), pcs = [];
    for (;;) {
      if (st.steps >= (maxSteps || 2000)) return finish({ outcome: "*", st, ret: null });
      cov.add(st.pc); pcs.push(st.pc);
      const r = step(st, p, "conc")[0];
      if (r.outcome) return finish(r);
      st = r.st;
    }
    function finish(r) {
      const env = envOf(p, input);
      const overflow = r.st.path.find((c) => !J.cmp(c.cond, evalZ(c.a, env), evalZ(c.b, env)));
      return { input, outcome: r.outcome, ret: r.ret, path: r.st.path, notes: r.st.notes, decls: r.st.decls, cov, pcs, steps: r.st.steps, overflow };
    }
  }
  function envOf(p, input) {
    const env = {};
    p.params.forEach((q, i) => {
      const v = input[i];
      if (q.type === "int") env[q.name] = v;
      else if (q.type === "boolean") env[q.name] = v ? 1 : 0;
      else { env[q.name + ".length"] = v.length; v.forEach((c, k) => (env[q.name + "[" + k + "]"] = c)); }
    });
    return env;
  }
  /* Turn a model back into an input; whatever the model does not mention keeps its old value. */
  function modelInput(p, model, prev) {
    return p.params.map((q, i) => {
      if (q.type === "int") return q.name in model ? model[q.name] : prev[i];
      if (q.type === "boolean") return q.name in model ? model[q.name] === 1 : prev[i];
      const ln = q.name + ".length";
      const n = ln in model ? model[ln] : prev[i].length;
      const items = [];
      for (let k = 0; k < n; k++) {
        const key = q.name + "[" + k + "]";
        items.push(key in model ? model[key] : prev[i][k] != null ? prev[i][k] : 97);
      }
      return items;
    });
  }

  /* ---------- Concolic: search all paths (each run negates every constraint after its bound) ---------- */
  function concolicSearch(p, seed, maxRuns, maxSteps) {
    const stack = [{ input: seed, bound: 0 }];
    const runs = [], seen = new Set(), found = {}, cov = new Set();
    let calls = 0, unsat = 0, unknown = 0;
    while (stack.length && runs.length < maxRuns) {
      const { input, bound } = stack.pop();
      const r = concolicRun(p, input, maxSteps);
      runs.push(r);
      seen.add(r.pcs.join(",") + "|" + r.outcome);
      if (found[r.outcome] == null) found[r.outcome] = runs.length;
      r.cov.forEach((o) => cov.add(o));
      const pref = envOf(p, input);
      for (let j = bound; j < r.path.length; j++) {
        calls++;
        const q = r.path.slice(0, j).concat([negC(r.path[j])]);
        const res = solve(q, r.decls, pref);
        if (res.status === "sat") stack.push({ input: modelInput(p, res.model, input), bound: j + 1 });
        else if (res.status === "unsat") unsat++;
        else unknown++;
      }
    }
    return { runs, paths: seen.size, found, cov, calls, unsat, unknown, done: !stack.length };
  }

  /* ---------- Symbolic: depth-first exploration to a depth (in steps) ---------- */
  function symExplore(p, maxDepth, nodeCap) {
    const st0 = initState(p, null);
    const stats = { leaves: 0, pruned: 0, unknown: 0, depth: 0, calls: 0, nodes: 0, capped: false };
    const rows = [];
    function walk(st, con, status, model) {
      const node = { con, status, model, children: [], leaf: null };
      stats.nodes++;
      let cur = st;
      for (;;) {
        if (stats.nodes > nodeCap) { stats.capped = true; node.leaf = { kind: "cap" }; return node; }
        if (cur.steps >= maxDepth) { node.leaf = { kind: "depth" }; stats.depth++; rows.push({ path: cur.path, leaf: node.leaf, model, status }); return node; }
        const succ = step(cur, p, "sym");
        if (succ.length === 1 && !succ[0].con) {
          const r = succ[0];
          if (r.outcome) {
            node.leaf = { kind: "end", outcome: r.outcome, ret: r.ret };
            stats.leaves++;
            rows.push({ path: r.st.path, leaf: node.leaf, model, status });
            return node;
          }
          cur = r.st;
          continue;
        }
        node.at = cur.pc;
        succ.forEach((r) => {
          stats.calls++;
          const res = solve(r.st.path, r.st.decls, {});
          if (res.status === "unsat") {
            stats.pruned++;
            node.children.push({ con: r.con, status: "unsat", children: [], leaf: { kind: "pruned" } });
            return;
          }
          if (res.status === "unknown") stats.unknown++;
          if (r.outcome) {
            stats.nodes++;
            const leaf = { kind: "end", outcome: r.outcome, ret: r.ret };
            stats.leaves++;
            node.children.push({ con: r.con, status: res.status, model: res.model, why: res.why, children: [], leaf });
            rows.push({ path: r.st.path, leaf, model: res.model, status: res.status });
          } else {
            const c = walk(r.st, r.con, res.status, res.model);
            c.why = res.why;
            node.children.push(c);
          }
        });
        return node;
      }
    }
    const root = walk(st0, null, "sat", {});
    return { root, rows, stats };
  }

  /* ---------- A fast concrete run for random fuzzing (no symbolic part) ---------- */
  function fastRun(p, input, maxSteps) {
    const locals = [], arrays = [];
    p.params.forEach((q, i) => {
      if (q.type === "char[]") { arrays.push(input[i]); locals.push(arrays.length - 1); }
      else locals.push(q.type === "boolean" ? (input[i] ? 1 : 0) : input[i]);
    });
    const stack = [], cov = new Uint8Array(p.code.length);
    let pc = 0, ph = 0;
    for (let n = 0; n < maxSteps; n++) {
      ph = (Math.imul(ph, 31) + pc + 1) | 0;
      cov[pc] = 1;
      const ins = p.code[pc];
      switch (ins.op) {
        case "push": stack.push(ins.value); pc++; break;
        case "load": stack.push(locals[ins.index]); pc++; break;
        case "store": locals[ins.index] = stack.pop(); pc++; break;
        case "incr": locals[ins.index] = (locals[ins.index] + ins.amount) | 0; pc++; break;
        case "negate": stack.push(-stack.pop() | 0); pc++; break;
        case "binary": {
          const b = stack.pop(), a = stack.pop();
          const r = J.arith(ins.operant, a, b);
          if (typeof r === "string") return { outcome: r, ph, cov };
          stack.push(r); pc++; break;
        }
        case "ifz": pc = J.cmp(ins.condition, stack.pop(), 0) ? ins.target : pc + 1; break;
        case "if": { const b = stack.pop(), a = stack.pop(); pc = J.cmp(ins.condition, a, b) ? ins.target : pc + 1; break; }
        case "goto": pc = ins.target; break;
        case "get": stack.push(0); pc++; break;
        case "new": stack.push(-1); pc++; break;
        case "dup": stack.push(stack[stack.length - 1]); pc++; break;
        case "invoke": if (ins.access === "special") stack.pop(); else stack.push(hash32(stack.pop())); pc++; break;
        case "throw": return { outcome: "assertion error", ph, cov };
        case "return": return { outcome: "ok", ph, cov };
        case "arraylength": stack.push(arrays[stack.pop()].length); pc++; break;
        case "array_load": {
          const i = stack.pop(), a = arrays[stack.pop()];
          if (i < 0 || i >= a.length) return { outcome: "out of bounds", ph, cov };
          stack.push(a[i]); pc++; break;
        }
      }
    }
    return { outcome: "*", ph, cov };
  }

  /* ---------- Small view helpers ---------- */
  const pillCls = (o) => (o === "ok" ? "ok" : o === "*" || o === "depth" ? "maybe" : "err");
  const pill = (text, cls) => '<span class="pill ' + (cls || "") + '">' + esc(text) + "</span>";
  const statusPill = (s) => pill(s, s === "sat" ? "ok" : s === "unsat" ? "mute" : "maybe");
  function witness(p, model) {
    if (!model) return "no model (solver: unknown)";
    return fmtInput(p, modelInput(p, model, zeroInput(p)));
  }
  function codeAndListing(parent, p) {
    parent.innerHTML = "";
    parent.append(PA.codeBlock(p.java, "java"));
    const lst = J.listing(p);
    parent.append(lst.el);
    return lst;
  }
  function parseIn(p, text) {
    try { return { ok: true, v: J.parseInput(p, text) }; } catch (e) { return { ok: false, err: e.message }; }
  }

  /* =====================================================================
     Propositional formulas (for the SAT lab)
     ===================================================================== */
  function parseProp(src) {
    const toks = [];
    const re = /\s*(<->|->|[()!~&|]|¬|∧|∨|→|↔|[A-Za-z_][A-Za-z0-9_]*)/y;
    let m, i = 0;
    src = src.trim();
    while (i < src.length) {
      re.lastIndex = i;
      m = re.exec(src);
      if (!m) throw new Error("cannot read '" + src.slice(i, i + 8) + "'");
      let t = m[1];
      t = { "¬": "!", "~": "!", not: "!", "∧": "&", and: "&", "∨": "|", or: "|", "→": "->", implies: "->", "↔": "<->", iff: "<->" }[t] || t;
      toks.push(t);
      i = re.lastIndex;
      while (i < src.length && /\s/.test(src[i])) i++;
    }
    let k = 0;
    const peek = () => toks[k], eat = (t) => { if (toks[k] !== t) throw new Error("expected " + t); k++; };
    function iff() { let a = imp(); while (peek() === "<->") { k++; a = { k: "iff", a, b: imp() }; } return a; }
    function imp() { const a = or(); if (peek() === "->") { k++; return { k: "imp", a, b: imp() }; } return a; }
    function or() { let a = and(); while (peek() === "|") { k++; a = { k: "or", a, b: and() }; } return a; }
    function and() { let a = not(); while (peek() === "&") { k++; a = { k: "and", a, b: not() }; } return a; }
    function not() {
      const t = peek();
      if (t === "!") { k++; return { k: "not", a: not() }; }
      if (t === "(") { k++; const a = iff(); eat(")"); return a; }
      if (t === "true" || t === "false") { k++; return { k: "const", v: t === "true" }; }
      if (t && /^[A-Za-z_]/.test(t)) { k++; return { k: "var", n: t }; }
      throw new Error(t ? "unexpected '" + t + "'" : "unexpected end");
    }
    const ast = iff();
    if (k < toks.length) throw new Error("unexpected '" + toks[k] + "'");
    return ast;
  }
  function propVars(a, acc) {
    acc = acc || [];
    if (a.k === "var") { if (acc.indexOf(a.n) < 0) acc.push(a.n); }
    else if (a.a) { propVars(a.a, acc); if (a.b) propVars(a.b, acc); }
    return acc;
  }
  function propEval(a, nu) {
    switch (a.k) {
      case "var": return !!nu[a.n];
      case "const": return a.v;
      case "not": return !propEval(a.a, nu);
      case "and": return propEval(a.a, nu) && propEval(a.b, nu);
      case "or": return propEval(a.a, nu) || propEval(a.b, nu);
      case "imp": return !propEval(a.a, nu) || propEval(a.b, nu);
      case "iff": return propEval(a.a, nu) === propEval(a.b, nu);
    }
  }
  const PROP_P = { iff: 1, imp: 2, or: 3, and: 4, not: 5, var: 6, const: 6 };
  function propTex(a, p) {
    p = p || 0;
    let s;
    switch (a.k) {
      case "var": return a.n.replace(/^([A-Za-z]+)(\d+)$/, "$1_{$2}");
      case "const": return a.v ? "\\top" : "\\bot";
      case "not": return "\\neg " + propTex(a.a, 5);
      case "and": s = propTex(a.a, 4) + " \\land " + propTex(a.b, 4.5); break;
      case "or": s = propTex(a.a, 3) + " \\lor " + propTex(a.b, 3.5); break;
      case "imp": s = propTex(a.a, 2.5) + " \\to " + propTex(a.b, 2); break;
      case "iff": s = propTex(a.a, 1) + " \\leftrightarrow " + propTex(a.b, 1.5); break;
    }
    return PROP_P[a.k] < p ? "(" + s + ")" : s;
  }
  function propSmt(a) {
    const flat = (x, k) => (x.k === k ? flat(x.a, k).concat(flat(x.b, k)) : [x]);
    switch (a.k) {
      case "var": return a.n;
      case "const": return a.v ? "true" : "false";
      case "not": return "(not " + propSmt(a.a) + ")";
      case "and": return "(and " + flat(a, "and").map(propSmt).join(" ") + ")";
      case "or": return "(or " + flat(a, "or").map(propSmt).join(" ") + ")";
      case "imp": return "(=> " + propSmt(a.a) + " " + propSmt(a.b) + ")";
      case "iff": return "(= " + propSmt(a.a) + " " + propSmt(a.b) + ")";
    }
  }
  const conjuncts = (a) => (a.k === "and" ? conjuncts(a.a).concat(conjuncts(a.b)) : [a]);

  /* =====================================================================
     Linear integer constraints typed by hand (for the solver lab)
     ===================================================================== */
  function parseLinear(line) {
    const toks = line.match(/\s*(<=|>=|==|!=|[<>=≤≥≠+\-*()]|\d+|[A-Za-z_][A-Za-z0-9_]*)/g);
    if (!toks || toks.join("").replace(/\s/g, "") !== line.replace(/\s/g, "")) throw new Error("cannot read: " + line);
    const ts = toks.map((t) => t.trim());
    let k = 0;
    const peek = () => ts[k];
    function expr() {
      let a = term();
      while (peek() === "+" || peek() === "-") { const o = ts[k++]; a = OP(o === "+" ? "add" : "sub", a, term()); }
      return a;
    }
    function term() {
      let a = factor();
      while (peek() === "*") { k++; a = OP("mul", a, factor()); }
      return a;
    }
    function factor() {
      const t = ts[k++];
      if (t === "-") { const f = factor(); return f.k === "c" ? K(-f.v) : OP("neg", f); }
      if (t === "(") { const e = expr(); if (ts[k++] !== ")") throw new Error("missing )"); return e; }
      if (t && /^\d+$/.test(t)) return K(parseInt(t, 10));
      if (t && /^[A-Za-z_]/.test(t)) return V(t);
      throw new Error(t ? "unexpected '" + t + "'" : "unexpected end of line");
    }
    const a = expr();
    const rel = { "==": "eq", "=": "eq", "!=": "ne", "≠": "ne", "<": "lt", "<=": "le", "≤": "le", ">": "gt", ">=": "ge", "≥": "ge" }[ts[k++]];
    if (!rel) throw new Error("expected a comparison (==, !=, <, <=, >, >=)");
    const b = expr();
    if (k < ts.length) throw new Error("unexpected '" + ts[k] + "'");
    return { a, cond: rel, b };
  }
  function smtExpr(e) {
    if (e.k === "c") return e.v < 0 ? "(- " + -e.v + ")" : String(e.v);
    if (e.k === "v") return e.name;
    if (e.op === "neg") return "(- " + smtExpr(e.a) + ")";
    if (e.op === "hash") return "(hash " + smtExpr(e.a) + ")";
    return "(" + { add: "+", sub: "-", mul: "*", div: "div", rem: "rem" }[e.op] + " " + smtExpr(e.a) + " " + smtExpr(e.b) + ")";
  }
  function smtCon(c) {
    const a = smtExpr(c.a), b = smtExpr(c.b);
    if (c.cond === "ne") return "(not (= " + a + " " + b + "))";
    return "(" + { eq: "=", lt: "<", le: "<=", gt: ">", ge: ">=" }[c.cond] + " " + a + " " + b + ")";
  }
  function exprVars(e, acc) {
    if (e.k === "v") { if (acc.indexOf(e.name) < 0) acc.push(e.name); }
    else if (e.k === "op") { exprVars(e.a, acc); if (e.b) exprVars(e.b, acc); }
    return acc;
  }

  /* =====================================================================
     QUIZ BANK
     ===================================================================== */
  const QUIZ = {
    sat: [
      { q: "An SMT solver answers <code>sat</code>. What else does it give you?", options: [
        ["A proof that the formula holds for every assignment", false, "That is validity. <code>sat</code> only says that <em>some</em> assignment makes the formula true."],
        ["A model: an assignment of values to the variables that makes the formula true", true, "With <code>(get-model)</code> or <code>s.model()</code> you get that assignment, and you can check it yourself by plugging it in."],
        ["The number of assignments that make the formula true", false, "Counting models (#SAT) is a different and harder problem; <code>check-sat</code> stops at the first model."],
        ["A simplified, equivalent formula", false, "That is what <code>simplify</code> does, not <code>check-sat</code>."],
      ] },
      { q: "Take the formulas as printed in the notes, $\\phi_1 = (A \\lor \\neg B) \\land C$ and $\\phi_2 = (\\neg A \\lor B) \\land (A \\lor C) \\land (B \\lor \\neg C)$. Is $\\phi_1 \\land \\phi_2$ satisfiable?", options: [
        ["No, the clauses contradict each other", false, "Try $A = B = C = \\top$: every clause has a true literal."],
        ["Yes, and the only model is $A = B = C = \\top$", true, "$C$ must be true; then $(B \\lor \\neg C)$ forces $B$, and then $(A \\lor \\neg B)$ forces $A$. All other clauses hold. Since each step was forced, this is the only model."],
        ["Yes, with $A = \\bot$", false, "With $A$ false, $(A \\lor \\neg B)$ needs $\\neg B$, then $(B \\lor \\neg C)$ needs $\\neg C$, but $\\phi_1$ needs $C$."],
        ["Only if $C$ is false", false, "$\\phi_1$ as printed contains the clause $C$, so $C$ must be true. (The SMT-LIB code in the notes asserts <code>(not c)</code> instead; see the warning below.)"],
      ] },
      { q: "How do you use a solver to show that $\\phi$ is true for <em>every</em> assignment?", options: [
        ["Check $\\phi$ and expect <code>sat</code>", false, "<code>sat</code> only shows that one assignment works."],
        ["Check $\\neg\\phi$ and expect <code>unsat</code>; a model of $\\neg\\phi$ would be a counterexample", true, "$\\phi$ is valid exactly when $\\neg\\phi$ has no model (Proposition 8.3). This is how solvers prove things: they fail to find a counterexample, and that failure is complete."],
        ["Ask for all models of $\\phi$ and count them", false, "That works for tiny formulas but is exponential; the negation trick needs one solver call."],
        ["Check $\\phi \\land \\neg\\phi$", false, "That is always unsatisfiable, whatever $\\phi$ is."],
      ] },
      { q: "SAT is NP-complete. Why are solvers nevertheless a \"game changer\" for program analysis?", options: [
        ["Because P = NP has been proven for SAT solvers", false, "Nobody has proven P = NP."],
        ["NP-completeness is about the worst case. Modern solvers (conflict-driven clause learning plus theory reasoning) solve the large but structured formulas from real programs quickly, most of the time", true, "There is no guarantee, but it routinely works. When it does not, the solver times out or says <code>unknown</code>."],
        ["Because they give up correctness for speed", false, "A <code>sat</code> answer comes with a model you can check, and <code>unsat</code> answers are exact. What you lose is a bound on the time."],
        ["Because formulas from programs are always 2-SAT", false, "Program conditions are arbitrary; 2-SAT (polynomial) is a very special case."],
      ] },
      { q: "What does \"modulo theories\" add to plain SAT?", options: [
        ["Variables can range over integers, bit-vectors, arrays and so on, and symbols like $+$ and $\\lt$ have their fixed meaning in that theory", true, "For example $a + 1 \\gt a$ is valid in linear integer arithmetic, while a plain SAT solver would only see three unrelated atoms."],
        ["All arithmetic is done modulo a prime number", false, "\"Modulo\" here means \"relative to a background theory\"."],
        ["The solver ignores the meaning of $+$ and $\\lt$", false, "The opposite: the theory fixes their meaning."],
        ["Formulas may only use the connectives $\\land$ and $\\lor$", false, "SMT formulas use all connectives plus theory atoms."],
      ] },
    ],
    "smt-practice": [
      { q: "Using an SMT solver takes three steps. In which order?", options: [
        ["Run the solver, encode the result, decode the problem", false, "You need a formula before you can run anything."],
        ["Encode the problem as a proposition, check it, and turn a model back into a (counter-)solution the user understands", true, "Encode, check, decode. Most mistakes happen in the first step: the solver answers questions about your formula, not about your problem."],
        ["Decode the program, check its types, encode the output", false, "Types play no part in this, and decoding comes last: it turns a model back into an answer."],
      ] },
      { q: "You want to know whether <code>x &gt; 10</code> implies <code>x + 1 &gt; 10</code> for every integer <code>x</code>. What do you give to Z3?", options: [
        ["<code>x &gt; 10</code> and <code>x + 1 &gt; 10</code>, and hope for <code>sat</code>", false, "<code>sat</code> just finds one $x$ for which both hold (like 11). It proves nothing about all $x$."],
        ["<code>x &gt; 10</code> and <code>Not(x + 1 &gt; 10)</code>, and hope for <code>unsat</code>", true, "Assert the premise and the negated claim. <code>unsat</code> means no counterexample exists. Careful: with <code>z3.Int</code> this is about mathematical integers; for Java's 32-bit <code>int</code> you would need <code>z3.BitVec</code>, and there the claim is false for $x = 2^{31} - 1$."],
        ["<code>Implies(x &gt; 10, x + 1 &gt; 10)</code>, and hope for <code>sat</code>", false, "Any $x \\leq 10$ satisfies the implication vacuously, so <code>sat</code> says nothing."],
      ] },
      { q: "With the pairwise encoding (one clause $\\neg p \\lor \\neg q$ for each pair of variables), how many clauses say \"at most one of $k$ variables is true\"?", options: [
        ["$k$", false, "Linear-size encodings exist, but they need extra helper variables. Pairwise uses none."],
        ["$\\binom{k}{2} = k(k-1)/2$", true, "One clause per unordered pair. A helper that loops over <code>itertools.permutations</code> visits every pair twice and so emits $k(k-1)$ clauses: still correct, just twice as many as needed (<code>combinations</code> would do)."],
        ["$2^k$", false, "That would be one clause per assignment, which is never needed here."],
        ["$k^2$", false, "Close, but pairs of a variable with itself are not needed, and order does not matter."],
      ] },
      { q: "Why must you be precise when you define the proposition?", options: [
        ["Because imprecise formulas make the solver crash", false, "The solver happily solves whatever you give it."],
        ["Because the solver answers questions about the formula, not about your problem: a missing or wrong constraint gives models that are not real solutions, or <code>unsat</code> where solutions exist", true, "Example: modelling Java <code>int</code> as <code>z3.Int</code> forgets overflow, so the solver \"proves\" branches unreachable that a real run reaches."],
        ["Because SMT-LIB has no comments", false, "It has comments (lines starting with <code>;</code>)."],
      ] },
    ],
    "sym-values": [
      { q: "What does symbolic execution of <code>incr</code> (x = a; x += 1; x += 3; return x) return?", options: [
        ["46", false, "That is the concrete result for $a = 42$, one input out of $2^{32}$."],
        ["$a + 4$: one formula that is right for every input", true, "That is the point of symbolic values: one run describes all inputs. Without simplification the expression reads $a + 1 + 3$."],
        ["Nothing, because $a$ is unknown", false, "Unknown inputs are exactly what symbols are for."],
        ["$a + 1$", false, "Both increments are applied."],
      ] },
      { q: "How is a symbolic value $s$ connected to concrete runs?", options: [
        ["$s$ is the value of the first concrete run", false, "Symbolic execution does not need any concrete run."],
        ["For every input valuation $\\nu$, the concrete run on $\\nu$ computes exactly $\\sem{s}_\\nu$", true, "That is Theorem 8.10 (for branch-free code; with branches, for the inputs that follow the path)."],
        ["$s$ over-approximates the possible values like a sign", false, "A symbolic value is exact: it is a formula, not a set."],
      ] },
      { q: "In <code>addTen</code> the loop runs ten times, but symbolic execution adds no path constraint. Why?", options: [
        ["Loops are skipped by symbolic execution", false, "The loop is executed, ten times, which is why $i$ becomes $i + 1 + \\cdots + 1$."],
        ["The loop test compares the concrete counter <code>r</code> with 10. Both sides are constants, so the branch is decided without the solver; only branches on symbolic values add constraints", true, "The counter never depends on the input. Contrast with <code>countdown(n)</code>, whose loop test depends on $n$ and adds a constraint every round."],
        ["Because <code>z3.simplify</code> removes the constraints", false, "Simplification rewrites values; it does not remove branches."],
      ] },
      { q: "Over <code>z3.Int</code>, $a + 1 \\gt a$ is valid. What about Java <code>int</code>?", options: [
        ["Also valid", false, "Java ints are 32-bit and wrap around."],
        ["False for $a = 2147483647$: $a + 1$ wraps to $-2147483648$", true, "To model Java faithfully use 32-bit bit-vectors (<code>z3.BitVec(\"a\", 32)</code>), where $+$ wraps. With <code>z3.Int</code> the analysis can call reachable code unreachable."],
        ["Undefined behaviour", false, "That is C. Java defines integer overflow as wrap-around."],
      ] },
    ],
    "path-constraints": [
      { q: "What do $\\psi$ and $\\sigma$ stand for in a symbolic state $\\psi \\vdash \\sigma$?", options: [
        ["$\\psi$ is the conjunction of the branch conditions taken so far (the path constraint), $\\sigma$ maps variables to symbolic values", true, "Values alone do not remember which branches were taken; the path constraint does."],
        ["$\\psi$ is the program, $\\sigma$ the output", false, "Both describe the current point of one path."],
        ["$\\psi$ is the set of possible signs, $\\sigma$ the stack", false, "Signs belong to abstract interpretation (Week 5)."],
      ] },
      { q: "In <code>incr</code> with its two nested tests, why does the analysis say <code>assert false</code> is never executed?", options: [
        ["Because <code>assert</code> statements are disabled", false, "The course always runs with assertions on."],
        ["Because the path constraint $a \\gt 10 \\land a + 1 \\lt 10$ is unsatisfiable (over the mathematical integers)", true, "The solver finds no $a$, so that branch is pruned. The program's summary becomes $a \\gt 10 \\vdash a + 1$ and $a \\leq 10 \\vdash a$."],
        ["Because the second branch is not reachable syntactically", false, "Syntactically it is perfectly reachable; it takes the solver to see the conflict."],
      ] },
      { q: "Is the notes' claim \"never executed\" true for Java's 32-bit <code>int</code>, with the intended <code>x += 1</code>?", options: [
        ["Yes, a number above 10 plus one is above 10", false, "Not with wrap-around."],
        ["No: $a = 2147483647$ passes $a \\gt 10$, then $x = a + 1$ wraps to $-2147483648 \\lt 10$, and the assertion fails", true, "The solver's model (<code>z3.Int</code>) and Java disagree. Run the concolic lab on <code>incr</code> with input <code>(2147483647)</code> to see it."],
        ["It depends on the JVM", false, "Wrap-around is fixed by the Java Language Specification."],
      ] },
      { q: "The notes' listing has the line <code>x =+ 1;</code>. What does Java make of it?", options: [
        ["A syntax error", false, "It compiles."],
        ["The same as <code>x += 1</code>", false, "The tokens are <code>=</code> followed by unary <code>+</code>."],
        ["<code>x = +1</code>: x becomes 1. Then for every $a \\gt 10$ the test <code>x &lt; 10</code> holds and the assertion fails", true, "A typo with a real effect: the program as printed fails for every $a \\gt 10$. The lab has both versions (<code>incrAsPrinted</code>)."],
      ] },
      { q: "How do path constraints relate to Week 4's path-equivalence classes?", options: [
        ["They are unrelated", false, "They describe the same thing from two sides."],
        ["The inputs satisfying the path constraint of a path are exactly the inputs whose runs follow that path: $\\psi_\\pi$ describes the class of $\\pi$", true, "Corollary 8.14. Fuzzing samples a class by luck; symbolic and concolic execution compute its description and ask the solver for a member."],
        ["A path constraint is the coverage of the path", false, "Coverage is a set of instructions; the constraint is a formula over the inputs."],
      ] },
    ],
    "sym-practice": [
      { q: "In the depth-first <code>analyse</code>, when is a successor pushed on the stack?", options: [
        ["Always", false, "Then infeasible branches and endless loops would be explored."],
        ["When its path constraint is satisfiable and the depth is below <code>max_depth</code>", true, "Unsatisfiable branches are pruned; the depth bound makes the search terminate."],
        ["Only when it is a jump target", false, "Both the jump and the fall-through are candidates."],
      ] },
      { q: "A method has ten tests <code>if (x<sub>i</sub> &gt; 0) s++;</code>, each on a <em>different</em> parameter. How many feasible paths?", options: [
        ["10", false, "Every test can go both ways independently."],
        ["11", false, "That is the count for ten tests on the same variable."],
        ["$2^{10} = 1024$", true, "Every combination is feasible, so the solver prunes nothing: path explosion. Try it in the path explosion lab."],
      ] },
      { q: "Now all ten tests are on the <em>same</em> <code>x</code>, with thresholds 10, 20, ..., 100. How many feasible paths?", options: [
        ["$2^{10}$", false, "Most combinations contradict each other, for example $x \\gt 20$ but $x \\leq 10$."],
        ["11: $x$ lies below all thresholds, or between two neighbours, or above all", true, "The solver prunes the other branches as soon as they conflict. Pruning is what keeps symbolic execution practical, when it works."],
        ["10", false, "Count the regions on the number line: ten thresholds cut it into eleven."],
      ] },
      { q: "Symbolic execution to depth $n$ finds no assertion error. What do you know?", options: [
        ["The method never fails an assertion", false, "Longer traces were never looked at."],
        ["No trace of at most $n$ steps fails an assertion, provided the solver is exact and models Java's semantics", true, "Like the bounded analysis of Week 5, it says nothing about longer traces. In the other direction it is strong: a reported error comes with a model, an input that really reaches it."],
        ["The method terminates", false, "Depth bounds say nothing about termination."],
      ] },
      { q: "The notes' <code>analyse</code> starts with <code>stack = [(pc, state, [])]</code> but pops <code>(pc, state, path, n)</code>. What is the fix?", options: [
        ["Start with <code>[(pc, state, [], 0)]</code> (depth 0) and give the type annotation four components", true, "Also: <code>z3.check(path_)</code> should be a call on a solver (<code>z3.Solver().check(*path_)</code>), and the earlier example's <code>path.add</code> should be <code>path.append</code>."],
        ["Pop only three components and drop the depth", false, "Then <code>max_depth</code> could not be enforced."],
        ["Nothing, Python fills in missing tuple components", false, "Unpacking a 3-tuple into 4 names raises a <code>ValueError</code>."],
      ] },
    ],
    limitations: [
      { q: "Why is <code>if (x == hash(y))</code> hard for pure symbolic execution?", options: [
        ["Because it has two parameters", false, "Two parameters are no problem."],
        ["To reach the branch, the solver would have to invert the hash: a non-linear, bit-scrambling function designed to be one-way", true, "The solver times out or answers <code>unknown</code>. The symbolic execution lab shows <code>unknown</code> for <code>hashGate</code>; the concolic lab gets through in two runs."],
        ["Because <code>==</code> cannot be expressed in SMT", false, "Equality is the most basic SMT atom."],
      ] },
      { q: "Why are arrays with symbolic indices a problem?", options: [
        ["Because <code>a[i]</code> may refer to any element, so the analysis must consider every element (or use the theory of arrays, whose formulas grow with every write)", true, "The simple approach therefore needs concrete indices, and concolic execution supplies them."],
        ["Because arrays cannot be stored in memory", false, "Storage is not the issue, knowledge is."],
        ["Because SMT solvers forbid arrays", false, "SMT-LIB has a theory of arrays; it is just expensive."],
      ] },
      { q: "With three reference parameters that may or may not point to the same object, how many aliasing situations must a symbolic executor consider?", options: [
        ["3", false, "Count the ways to group three things."],
        ["5: all different, all the same, or one of the three pairs equal", true, "In general the number of partitions of $k$ references is the Bell number $B_k$ (1, 2, 5, 15, 52, ...): it grows faster than $2^k$."],
        ["8", false, "That would be $2^3$, but aliasing is about groupings, not subsets."],
      ] },
      { q: "Which of these is <em>not</em> a classic limitation of symbolic execution?", options: [
        ["Path explosion", false, "That is the most famous one."],
        ["Library and native code (like <code>malloc</code>) that would need a model", false, "A real limitation: without code or a model there is nothing to execute symbolically."],
        ["Non-linear arithmetic and one-way functions", false, "A real limitation: the solver may fail."],
        ["It can only analyse methods with a single parameter", true, "Any number of inputs works; each one simply gets a symbol."],
      ] },
      { q: "A model for <code>malloc</code> or a string library is written by hand. What can go wrong?", options: [
        ["Nothing, models are always exact", false, "Models are code too, and simpler than the real thing on purpose."],
        ["The model may over- or under-approximate the real behaviour: it can make the analysis report impossible errors or miss real ones", true, "That is the trade-off of simulating built-ins. Concolic execution avoids it by running the real code concretely."],
        ["Models make the solver faster but always wrong", false, "Models are usually much better than nothing; they are just not guaranteed to be exact."],
      ] },
    ],
    concolic: [
      { q: "What is \"concolic\" short for?", options: [
        ["Concurrent and logical", false, "Nothing to do with concurrency."],
        ["Concrete and symbolic", true, "Each value has a concrete part (which drives the run) and a symbolic part (which records how it depends on the input)."],
        ["Conditional and colocated", false, "No."],
      ] },
      { q: "A concolic run of <code>isNotAMillion</code> with $i = 0$ emits which path constraint, and what comes next?", options: [
        ["$i = 0$; next we try $i = 1$", false, "The constraint is about the branch, not about the input value."],
        ["$i \\neq 1000000$; negating it gives $i = 1000000$, and the second run fails the assertion", true, "Two runs instead of about $2^{32}$ random guesses. The <code>$assertionsDisabled</code> test compares constants and emits nothing."],
        ["Nothing; the run returns normally", false, "The comparison with 1000000 is a branch on a symbolic value, so it is recorded."],
      ] },
      { q: "$\\mathit{concolic}(P, i) = \\psi_0, \\ldots, \\psi_n$ and $i' \\models \\psi_0 \\land \\cdots \\land \\psi_{k-1} \\land \\neg\\psi_k$. If the symbolic part is exact, what does the run on $i'$ emit?", options: [
        ["Something unrelated", false, "The first $k$ decisions are forced."],
        ["$\\psi_0, \\ldots, \\psi_{k-1}, \\neg\\psi_k$, possibly followed by new constraints", true, "That is the prefix theorem (Theorem 8.23): the new run takes the same first $k$ decisions and flips the $k$-th, so each negation explores a new subtree."],
        ["Exactly $\\psi_0, \\ldots, \\psi_n$ again", false, "Then it would follow the old path, which $\\neg\\psi_k$ excludes."],
      ] },
      { q: "<code>hashGate(x, y)</code> runs with $x = 0$, $y = 7$. What does concolic execution do at <code>hash(y)</code>?", options: [
        ["It gives up, like symbolic execution", false, "It does not need to understand the hash."],
        ["It uses the concrete value $h = \\mathit{hash}(7)$ as the symbolic value. The branch then emits $x \\neq h$; negating it gives $x = h$ (with $y = 7$ kept), and the next run reaches the assertion", true, "This is concretisation: we lose the dependence on $y$ but keep going. It is the classic example from DART (Godefroid et al. 2005)."],
        ["It inverts the hash by brute force", false, "No inversion is needed: it keeps $y$ and solves for $x$."],
      ] },
      { q: "When can a concolic run <em>diverge</em>, i.e. not follow the path the solver predicted?", options: [
        ["Never, the prefix theorem always holds", false, "The theorem assumes an exact symbolic part."],
        ["When concretisation dropped a dependency (the solver changes $y$, so $\\mathit{hash}(y)$ changes), or when the symbolic model is not Java's semantics (mathematical integers versus 32-bit overflow)", true, "Divergence costs a run, not soundness of what was found: every reported error still comes from a real concrete run."],
        ["When the program has more than one branch", false, "Branches are what concolic execution is made for."],
      ] },
    ],
    "concolic-search": [
      { q: "Why does the search remember which constraints of a run have already been negated (the bound)?", options: [
        ["To save memory", false, "It is about not repeating work."],
        ["Because negating a constraint of the inherited prefix again would recreate a path that was already explored, and the search would loop", true, "A run created by negating $\\psi_k$ only negates its own constraints after position $k$. With an exact symbolic part every feasible path is then run exactly once (Theorem 8.25)."],
        ["Because the solver can negate each constraint only once", false, "The solver has no memory between calls."],
      ] },
      { q: "<code>isNotAMillion</code>: random 32-bit fuzzing against concolic execution. Roughly how many runs does each need to fail the assertion?", options: [
        ["Both about 1000", false, "Random needs to hit one value out of $2^{32}$."],
        ["Random: about $2^{32} \\approx 4.3 \\cdot 10^{9}$ on average. Concolic: 2", true, "One run to learn the constraint $i \\neq 1000000$, one to run its negation. A dictionary fuzzer (Week 4) would also guess the constant, but concolic execution needs no luck and no dictionary."],
        ["Concolic needs more, because solving is slow", false, "Each concolic run is slower, but it needs only two."],
      ] },
      { q: "For which program does the concolic search never finish on its own?", options: [
        ["<code>checkTheWrongThing</code>", false, "It has two paths; the search ends after two runs."],
        ["<code>countdown(n)</code>: every number of loop iterations is a different feasible path, so there are about $2^{31}$ of them", true, "Each run adds a constraint $n - k \\neq 0$ per round, and every negation is satisfiable. Real tools bound the number of runs, the depth, or the time."],
        ["<code>isNotAMillion</code>", false, "Two paths, two runs."],
      ] },
      { q: "Why do tools combine fuzzing with concolic execution (as in SAGE or Driller)?", options: [
        ["Fuzzing is cheap per run and explores the easy paths fast; concolic execution is expensive per run but gets through narrow checks such as magic constants. Each covers the other's weakness", true, "Hybrid fuzzers run the fuzzer until it gets stuck, then ask the concolic engine for an input that takes a new branch."],
        ["Because concolic execution cannot run programs", false, "Concolic execution runs the program concretely, every time."],
        ["Because fuzzing proves programs correct", false, "Neither technique proves correctness in general."],
      ] },
    ],
    instrumentation: [
      { q: "What is code instrumentation?", options: [
        ["Injecting extra instructions into the program so that, while it runs normally, it also tracks and records what happens", true, "For example a counter per branch (coverage), a log line per lock (deadlock prediction), or a shadow symbolic value per variable (concolic execution)."],
        ["Running the program inside our own interpreter", false, "That is the alternative that instrumentation avoids."],
        ["Measuring a program with a stopwatch", false, "Timing can be one use, but instrumentation means changing the code."],
      ] },
      { q: "Why instrument instead of interpreting?", options: [
        ["Speed: the program runs on the real JVM, with its JIT compiler and real libraries, and we do not re-implement the semantics of every instruction", true, "Speed is one big limitation of the dynamic techniques so far. The price is overhead from the injected code, which frameworks differ in (Reichelt et al. 2024)."],
        ["It is always easier to implement", false, "It is not: tracking the symbolic values of the entire memory is not trivial."],
        ["Interpreters cannot handle branches", false, "Your interpreter from Week 3 handles branches fine."],
      ] },
      { q: "For concolic execution by instrumentation, what must the injected code maintain?", options: [
        ["Only a counter of executed instructions", false, "That gives coverage, not constraints."],
        ["A shadow symbolic value for every local, stack slot and memory cell, updated with every instruction, plus a record of each branch on a symbolic value", true, "Essentially a shadow variable for each variable, kept up to date. The concrete values come for free from the real run."],
        ["A copy of the heap after every step", false, "Far too expensive, and still no symbolic information."],
      ] },
      { q: "Why does the course not offer an easy way to instrument bytecode with <code>jvm2json</code>?", options: [
        ["<code>jvm2json</code> cannot write class files", false, "It can, by running it in reverse on JSON."],
        ["It can turn JSON back into class files, but it does not recompute the type information for changed method bytecode, which the JVM needs to load the method", true, "That type information (the stack map frames the verifier checks) depends on every instruction, so injecting code invalidates it."],
        ["Instrumentation is forbidden in JPAMB", false, "It is even a listed technical contribution of the project."],
      ] },
    ],
  };

  /* =====================================================================
     LABS
     ===================================================================== */

  /* --- 1. Truth tables: a tiny SAT solver --- */
  function labSat(el) {
    const { controls, view } = PA.lab(el, {
      title: "A SAT solver you can watch",
      hint: "Pick a formula or type your own (letters, !, &amp;, |, -&gt;, &lt;-&gt;, parentheses). Click a row of the truth table, or flip the variables, to try an assignment. Highlighted rows are models.",
    });
    el.classList.add("wide");
    const PRESETS = [
      ["(A | !B) & C", "ϕ1 as printed: (A ∨ ¬B) ∧ C"],
      ["(A | !B) & !C", "ϕ1 as in the SMT-LIB code: (A ∨ ¬B) ∧ ¬C"],
      ["(!A | B) & (A | C) & (B | !C)", "ϕ2"],
      ["(A | !B) & C & (!A | B) & (A | C) & (B | !C)", "ϕ1 ∧ ϕ2 (as printed)"],
      ["(A | !B) & !C & (!A | B) & (A | C) & (B | !C)", "ϕ1 ∧ ϕ2 (as in the code)"],
      ["A & !A", "A ∧ ¬A (a contradiction)"],
      ["(A -> B) <-> (!B -> !A)", "contraposition (valid)"],
      ["P1 & P2 & (!P1 | !P2)", "two pigeons, one hole"],
    ];
    const top = h("div", { class: "ce-ctl" });
    controls.append(top);
    const pre = PA.select(top, { label: "Formula", options: PRESETS.map(([f, n]) => [f, n]), value: PRESETS[3][0] });
    const txt = PA.textInput(top, { label: "or type one", value: PRESETS[3][0] });
    const varRow = h("div", { class: "ce-vars" });
    controls.append(varRow);
    const stats = PA.stats(view, [{ key: "val", label: "Value under this assignment" }, { key: "sat", label: "Satisfiable?" }, { key: "models", label: "Models" }, { key: "valid", label: "Valid?" }]);
    const shown = h("div", { class: "mathbox ce-formula" });
    const grid = h("div", { class: "split" });
    const left = h("div"), right = h("div");
    grid.append(left, right);
    const verdict = h("div", { class: "verdict" });
    view.append(shown, grid, verdict);
    let ast = null, vars = [], nu = {};
    function load() {
      try { ast = parseProp(txt.value); txt.bad(false); } catch (e) { txt.bad(true); verdict.className = "verdict bad"; verdict.textContent = "Cannot read the formula: " + e.message; return; }
      vars = propVars(ast);
      if (vars.length > 6) { txt.bad(true); verdict.className = "verdict warn"; verdict.textContent = "At most 6 variables, please (64 rows)."; return; }
      const old = nu;
      nu = {};
      vars.forEach((v) => (nu[v] = !!old[v]));
      render();
    }
    function render() {
      if (!ast) return;
      varRow.innerHTML = "";
      vars.forEach((v) => {
        const b = h("button", { type: "button", class: "btn ce-var" + (nu[v] ? " on" : ""), "aria-pressed": String(nu[v]), html: esc(v) + " = " + (nu[v] ? "⊤" : "⊥"), onclick: () => { nu[v] = !nu[v]; render(); } });
        varRow.append(b);
      });
      shown.innerHTML = PA.tex(propTex(ast), true);
      const cs = conjuncts(ast);
      // truth table
      const n = vars.length, rows = 1 << n;
      const t = h("table", { class: "dt ce-tt" });
      let head = "<thead><tr>" + vars.map((v) => "<th class='mono'>" + esc(v) + "</th>").join("") + (cs.length > 1 ? cs.map((c, i) => "<th class='mono' title='" + esc(propSmt(c)) + "'>C" + (i + 1) + "</th>").join("") : "") + "<th>ϕ</th></tr></thead>";
      t.innerHTML = head;
      const tb = h("tbody");
      let models = 0, first = null;
      for (let r = 0; r < rows; r++) {
        const a = {};
        vars.forEach((v, i) => (a[v] = !!((r >> (n - 1 - i)) & 1)));
        const val = propEval(ast, a);
        if (val) { models++; if (!first) first = a; }
        const cur = vars.every((v) => a[v] === nu[v]);
        const tr = h("tr", { class: (val ? "good" : "") + (cur ? " on" : ""), onclick: () => { vars.forEach((v) => (nu[v] = a[v])); render(); } });
        vars.forEach((v) => tr.append(h("td", { class: "mono", text: a[v] ? "⊤" : "⊥" })));
        if (cs.length > 1) cs.forEach((c) => { const cv = propEval(c, a); tr.append(h("td", { class: "mono " + (cv ? "" : "ce-f"), text: cv ? "⊤" : "⊥" })); });
        tr.append(h("td", { class: "mono", html: val ? "<b>⊤</b>" : "⊥" }));
        tb.append(tr);
      }
      t.append(tb);
      left.innerHTML = "";
      left.append(h("div", { class: "panel-title", text: "Truth table (click a row)" }), h("div", { class: "table-wrap" }, [t]));
      // clauses and SMT-LIB
      right.innerHTML = "";
      right.append(h("div", { class: "panel-title", text: cs.length > 1 ? "Conjuncts under this assignment" : "The formula under this assignment" }));
      const ul = h("ul", { class: "ce-clauses" });
      cs.forEach((c, i) => {
        const cv = propEval(c, nu);
        ul.append(h("li", { class: cv ? "t" : "f", html: "<span class='mono'>" + (cs.length > 1 ? "C" + (i + 1) + " " : "") + "</span>" + PA.tex(propTex(c)) + " " + pill(cv ? "true" : "false", cv ? "ok" : "err") }));
      });
      right.append(ul);
      right.append(h("div", { class: "panel-title", text: "The same question in SMT-LIB" }));
      right.append(PA.codeBlock(vars.map((v) => "(declare-const " + v + " Bool)").join("\n") + "\n\n(assert " + propSmt(ast) + ")\n\n(check-sat)\n(get-model)", "plaintext"));
      const val = propEval(ast, nu);
      stats.set("val", val ? "true" : "false", val ? "good" : "bad");
      stats.set("sat", models ? "sat" : "unsat", models ? "good" : "bad");
      stats.set("models", models + " / " + rows);
      stats.set("valid", models === rows ? "yes" : "no", models === rows ? "good" : "");
      verdict.className = "verdict " + (models ? "good" : "bad");
      verdict.innerHTML = models
        ? "<b>sat.</b> A solver would answer with one model, e.g. " + esc(vars.map((v) => v + " = " + (first[v] ? "true" : "false")).join(", ")) + ". " + (models === rows ? "Every row is a model, so the formula is <b>valid</b>: its negation is unsat." : models === 1 ? "It is the only one." : "There are " + models + " in total.")
        : "<b>unsat.</b> No row makes the formula true. Its negation is therefore valid, and a solver would answer <code>unsat</code> without a model.";
    }
    pre.onchange = () => { txt.input.value = pre.value; load(); };
    txt.onchange = load;
    load();
  }

  /* --- 2. A toy solver for linear integer constraints --- */
  function labSolver(el) {
    const { controls, view } = PA.lab(el, {
      title: "Encode, check, decode: a small integer solver",
      hint: "One constraint per line over integer variables, with +, -, * by a constant, and ==, !=, &lt;, &lt;=, &gt;, &gt;=. Variables range over 32-bit ints, but arithmetic is mathematical, as with <code>z3.Int</code>.",
    });
    el.classList.add("wide");
    const PRESETS = [
      ["single", "One constraint: a > 10", "a > 10", false],
      ["branch", "An unreachable branch", "a > 10\na + 1 < 10", false],
      ["two", "Two unknowns", "x + y == 20\nx - y == 4", false],
      ["magic", "Around a magic constant", "i != 1000000\ni >= 999999\ni <= 1000001\ni != 999999", false],
      ["prove", "Prove: x > 10 implies x + 1 > 10", "x > 10\nx + 1 > 10", true],
      ["proveBad", "Prove: x > 10 implies 2 * x > 25", "x > 10\n2 * x > 25", true],
      ["nonlin", "Non-linear: x * y == 35", "x * y == 35\nx > 1\ny > 1", false],
    ];
    const top = h("div", { class: "ce-ctl" });
    controls.append(top);
    const pre = PA.select(top, { label: "Example", options: PRESETS.map((p) => [p[0], p[1]]), value: "branch" });
    const prove = PA.toggle(top, { label: "Prove the last line from the others (check its negation)", value: false });
    const txt = PA.textInput(controls, { label: "Constraints", rows: 5, value: "" });
    const btns = PA.btnRow(controls);
    PA.button(btns, "Check", () => run(), "primary");
    const grid = h("div", { class: "split" });
    const left = h("div"), right = h("div");
    grid.append(left, right);
    const verdict = h("div", { class: "verdict" });
    view.append(grid, verdict);
    function run() {
      const lines = txt.value.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
      let cons;
      try { cons = lines.map(parseLinear); txt.bad(false); } catch (e) { txt.bad(true); verdict.className = "verdict bad"; verdict.textContent = e.message; return; }
      if (!cons.length) { verdict.className = "verdict"; verdict.textContent = "Type at least one constraint."; return; }
      const asked = prove.value && cons.length ? cons.slice(0, -1).concat([negC(cons[cons.length - 1])]) : cons;
      const vars = [];
      asked.forEach((c) => { exprVars(c.a, vars); exprVars(c.b, vars); });
      left.innerHTML = "";
      left.append(h("div", { class: "panel-title", text: "1. Encode (SMT-LIB)" }));
      left.append(PA.codeBlock(vars.map((v) => "(declare-const " + v + " Int)").join("\n") + "\n\n" + asked.map((c, i) => "(assert " + smtCon(c) + ")" + (prove.value && i === asked.length - 1 ? "  ; the negated claim" : "")).join("\n") + "\n\n(check-sat)\n(get-model)", "plaintext"));
      const res = solve(asked, {}, {});
      right.innerHTML = "";
      right.append(h("div", { class: "panel-title", text: "2. Check" }));
      right.append(h("p", { html: "Result: " + pill(res.status, res.status === "sat" ? "ok" : res.status === "unsat" ? "err" : "maybe") + (res.why ? " <span class='ce-sub'>(" + esc(res.why) + ")</span>" : "") }));
      right.append(h("div", { class: "panel-title", text: "3. Decode" }));
      if (res.status === "sat") {
        const full = {};
        vars.forEach((v) => (full[v] = v in res.model ? res.model[v] : 0));
        right.append(PA.codeBlock(">>> s.check()\nsat\n>>> s.model()\n[" + vars.map((v) => v + " = " + full[v]).join(", ") + "]", "python"));
        const ok = asked.every((c) => J.cmp(c.cond, evalZ(c.a, full), evalZ(c.b, full)));
        right.append(h("p", { class: "ce-sub", text: "Plugging the model back in: " + (ok ? "every constraint holds." : "a constraint fails (this should not happen).") }));
      } else right.append(h("p", { class: "ce-sub", text: res.status === "unsat" ? "No model to decode: there is no solution at all." : "No answer: this toy solver only does linear arithmetic. Z3 also handles many non-linear problems (it would find x = 5, y = 7 here), but in general non-linear integer arithmetic is undecidable." }));
      if (prove.value) {
        verdict.className = "verdict " + (res.status === "unsat" ? "good" : res.status === "sat" ? "bad" : "warn");
        verdict.innerHTML = res.status === "unsat" ? "<b>Proven</b> (over the mathematical integers): the premises together with the negated claim have no model." :
          res.status === "sat" ? "<b>Not a theorem.</b> The model is a counterexample: it satisfies the premises but breaks the claim." : "<b>Unknown.</b> Neither proven nor refuted.";
      } else {
        verdict.className = "verdict " + (res.status === "sat" ? "good" : res.status === "unsat" ? "bad" : "warn");
        verdict.innerHTML = res.status === "sat" ? "<b>sat</b>: the constraints have a solution, and the model is one of them." :
          res.status === "unsat" ? "<b>unsat</b>: no integers satisfy all constraints together." + (pre.value === "branch" ? " This is why the <code>assert false</code> branch of <code>incr</code> counts as unreachable. Over Java's 32-bit ints, though, <code>a = 2147483647</code> works, because <code>a + 1</code> wraps around." : "") :
          "<b>unknown</b>: the solver could not decide.";
      }
    }
    pre.onchange = () => { const p = PRESETS.find((x) => x[0] === pre.value); txt.input.value = p[2]; prove.set(p[3], true); run(); };
    prove.onchange = run;
    pre.onchange();
  }

  /* --- 3. Symbolic values, step by step --- */
  function labStepper(el) {
    const { controls, view } = PA.lab(el, {
      title: "Symbolic values next to concrete ones",
      hint: "Step through the bytecode. Every value is shown twice: as a formula over the input symbols, and as the number you get for one concrete input. Turn simplification off to see what <code>z3</code> prints before <code>z3.simplify</code>.",
    });
    el.classList.add("wide");
    const top = h("div", { class: "ce-ctl" });
    controls.append(top);
    const progSel = PA.select(top, { label: "Program", options: [["incrByFour", "incr(int a): adds 4"], ["addTen", "addTen(int i): a loop on a concrete counter"], ["swapSubtract", "swapSubtract(int a, int b)"]], value: "incrByFour" });
    const inp = PA.textInput(top, { label: "Concrete input", value: "(42)" });
    const simpT = PA.toggle(top, { label: "Simplify (z3.simplify)", value: true });
    const btns = PA.btnRow(controls);
    PA.button(btns, "Step", () => { advance(1); }, "primary");
    PA.button(btns, "Run to the end", () => { advance(1000); });
    PA.button(btns, "Reset", () => reset());
    const grid = h("div", { class: "split" });
    const left = h("div"), right = h("div");
    grid.append(left, right);
    const verdict = h("div", { class: "verdict" });
    view.append(grid, verdict);
    let p, lst, st, end, input;
    function reset() {
      p = prog(progSel.value);
      const r = parseIn(p, inp.value);
      inp.bad(!r.ok);
      input = r.ok ? r.v : zeroInput(p);
      lst = codeAndListing(left, p);
      st = initState(p, input);
      end = null;
      render();
    }
    function advance(n) {
      for (let i = 0; i < n && !end; i++) {
        const r = step(st, p, "conc")[0];
        if (r.outcome) end = r;
        else st = r.st;
      }
      render();
    }
    const show = (v) => (v.t === "r" ? "ref" : esc(fmt(simpT.value ? simp(v.s) : v.s)));
    function render() {
      lst.mark({ cur: end ? null : st.pc, cov: new Set() });
      right.innerHTML = "";
      right.append(h("div", { class: "panel-title", text: end ? "Returned" : "Before offset " + st.pc + ": " + J.fmtIns(p.code[st.pc]) }));
      const t = h("table", { class: "dt ce-st" });
      t.innerHTML = "<thead><tr><th>where</th><th>symbolic</th><th>concrete</th></tr></thead>";
      const tb = h("tbody");
      const names = p.localNames || [];
      st.locals.forEach((v, i) => v && tb.append(h("tr", null, [h("td", { class: "mono", text: "λ[" + i + "]" + (names[i] ? " " + names[i] : "") }), h("td", { class: "mono", html: show(v) }), h("td", { class: "mono", text: v.c == null ? "·" : String(v.c) })])));
      st.stack.forEach((v, i) => tb.append(h("tr", { class: "ce-stk" }, [h("td", { class: "mono", text: "σ[" + i + "]" }), h("td", { class: "mono", html: show(v) }), h("td", { class: "mono", text: v.c == null ? "·" : String(v.c) })])));
      if (end && end.ret) tb.append(h("tr", { class: "good" }, [h("td", { class: "mono", text: "return" }), h("td", { class: "mono", html: show(end.ret) }), h("td", { class: "mono", text: String(end.ret.c) })]));
      t.append(tb);
      right.append(h("div", { class: "table-wrap" }, [t]));
      if (end) {
        const s = simp(end.ret.s);
        verdict.className = "verdict good";
        verdict.innerHTML = "<b>Returns " + esc(fmt(s)) + "</b> for every input" + (p.id === "swapSubtract" ? " (the three assignments swap a and b)" : "") + ", and " + end.ret.c + " for " + esc(fmtInput(p, input)) + ". " + (fmt(end.ret.s) !== fmt(s) ? "Unsimplified the same value reads <code>" + esc(fmt(end.ret.s)) + "</code>." : "") + (p.id === "addTen" ? " The loop test compared the concrete counter r with 10 each time, so no path constraint was needed." : "");
      } else {
        verdict.className = "verdict";
        verdict.innerHTML = "Step " + st.steps + ". Constants and the loop counter have no symbols in them, so their symbolic value is just a number.";
      }
    }
    progSel.onchange = () => { inp.input.value = prog(progSel.value).input; reset(); };
    inp.onchange = () => { if (parseIn(prog(progSel.value), inp.value).ok) reset(); else inp.bad(true); };
    simpT.onchange = render;
    reset();
  }

  /* --- 4. Symbolic execution tree --- */
  const TREE_PROGS = [
    ["incrBranch", "incr(int a): two nested tests"],
    ["incrAsPrinted", "incr(int a) as printed (x =+ 1)"],
    ["divideByN", "divideByN(int n)"],
    ["checkBeforeDivideByN", "checkBeforeDivideByN(int n)"],
    ["checkTheWrongThing", "checkTheWrongThing(int a)"],
    ["safeDivAByB", "safeDivAByB(int a, int b)"],
    ["isNotAMillion", "isNotAMillion(int i)"],
    ["countdown", "countdown(int n): a loop"],
    ["arraySpellsHello", "arraySpellsHello(char[] array)"],
    ["hashGate", "hashGate(int x, int y)"],
  ];
  function renderTree(t) {
    function node(n, isRoot) {
      const lab = h("div", { class: "ce-node" + (n.status === "unsat" ? " pruned" : "") });
      let html = isRoot ? "<b>start</b> <span class='ce-sub'>ψ = true</span>" : "<span class='ce-at'>" + n.con.pc + "</span> " + esc(fmtCon(n.con)) + " " + statusPill(n.status);
      if (n.leaf) {
        if (n.leaf.kind === "pruned") html += " <span class='ce-sub'>pruned</span>";
        else if (n.leaf.kind === "depth") html += " → " + pill("depth limit", "maybe");
        else if (n.leaf.kind === "cap") html += " → " + pill("not shown", "mute");
        else html += " → " + pill(n.leaf.outcome, pillCls(n.leaf.outcome)) + (n.leaf.ret ? " <span class='mono'>return " + esc(fmt(simp(n.leaf.ret.s))) + "</span>" : "");
      }
      lab.innerHTML = html;
      const li = h("li", null, [lab]);
      if (n.children.length) {
        const ul = h("ul");
        n.children.forEach((c) => ul.append(node(c)));
        li.append(ul);
      }
      return li;
    }
    return h("ul", { class: "ce-tree no-math" }, [node(t.root, true)]);
  }
  function labSymtree(el) {
    const { controls, view } = PA.lab(el, {
      title: "Symbolic execution: every path, with its path constraint",
      hint: "Depth-first: at a branch on a symbolic value, both sides are tried; the solver prunes a side whose path constraint is unsatisfiable. The number at each node is the offset of the branch.",
    });
    el.classList.add("wide");
    const top = h("div", { class: "ce-ctl" });
    controls.append(top);
    const progSel = PA.select(top, { label: "Program", options: TREE_PROGS, value: "incrBranch" });
    const depth = PA.slider(top, { label: "Maximum depth (steps)", min: 5, max: 120, value: 40 });
    const stats = PA.stats(view, [{ key: "paths", label: "Complete paths" }, { key: "pruned", label: "Pruned (unsat)" }, { key: "unk", label: "Solver unknown" }, { key: "depth", label: "Cut by depth" }, { key: "calls", label: "Solver calls" }]);
    const grid = h("div", { class: "split" });
    const left = h("div"), right = h("div");
    grid.append(left, right);
    const sum = h("div");
    const verdict = h("div", { class: "verdict" });
    view.append(grid, sum, verdict);
    function run() {
      const p = prog(progSel.value);
      const lst = codeAndListing(left, p);
      const t = symExplore(p, depth.value, 400);
      lst.mark({ cov: new Set() });
      right.innerHTML = "";
      right.append(h("div", { class: "panel-title", text: "Execution tree" }), h("div", { class: "ce-treebox" }, [renderTree(t)]));
      if (t.stats.capped) right.append(h("p", { class: "ce-sub", text: "The tree was cut at 400 nodes." }));
      const tab = h("table", { class: "dt ce-sum no-math" });
      tab.innerHTML = "<thead><tr><th>path constraint ψ</th><th>⊢ result</th><th>an input on this path</th></tr></thead>";
      const tb = h("tbody");
      t.rows.forEach((r) => {
        const res = r.leaf.kind === "depth" ? pill("depth limit", "maybe") : pill(r.leaf.outcome, pillCls(r.leaf.outcome)) + (r.leaf.ret ? " <span class='mono'>" + esc(fmt(simp(r.leaf.ret.s))) + "</span>" : "");
        tb.append(h("tr", null, [h("td", { class: "mono", text: fmtPath(r.path) }), h("td", { html: res }), h("td", { class: "mono", text: witness(p, r.model) })]));
      });
      tab.append(tb);
      sum.innerHTML = "";
      sum.append(h("div", { class: "panel-title", text: "Summary: the method as a list of ψ ⊢ result" }), h("div", { class: "table-wrap" }, [tab]));
      stats.set("paths", String(t.stats.leaves), "good");
      stats.set("pruned", String(t.stats.pruned));
      stats.set("unk", String(t.stats.unknown), t.stats.unknown ? "warn" : "");
      stats.set("depth", String(t.stats.depth), t.stats.depth ? "warn" : "");
      stats.set("calls", String(t.stats.calls));
      const errs = t.rows.filter((r) => r.leaf.kind === "end" && r.leaf.outcome !== "ok");
      let msg = "";
      if (p.id === "incrBranch") msg = "<b>Pruned:</b> the branch with $a \\gt 10 \\land a + 1 \\lt 10$ is unsat and pruned, so the method is $a \\gt 10 \\vdash a + 1$ and $a \\leq 10 \\vdash a$. The solver works over the mathematical integers, like <code>z3.Int</code>; on Java's 32-bit ints <code>(2147483647)</code> does reach the assertion (try it in the concolic lab).";
      else if (p.id === "incrAsPrinted") msg = "<b>The typo matters:</b> with <code>x =+ 1</code> the value of x is 1 after the first test, so the assertion fails for every $a \\gt 10$.";
      else if (p.id === "hashGate") msg = "<b>Stuck:</b> both sides of <code>x == hash(y)</code> are <em>unknown</em>. The path constraint contains the hash, and the solver cannot invert it, so no input is found for the assertion. Concolic execution (Part 3) gets through.";
      else if (p.id === "countdown") msg = "<b>A loop:</b> every round adds one more constraint $n - k \\neq 0$, so there is a new path for every iteration count. Raise the depth and the tree grows without end: only the depth bound stops it.";
      else if (errs.length) msg = "<b>Found " + errs.length + " error path" + (errs.length > 1 ? "s" : "") + "</b>, each with an input that really reaches it: " + errs.map((r) => esc(witness(p, r.model)) + " → " + pill(r.leaf.outcome, "err")).join(", ") + ".";
      else msg = "<b>No error path</b> up to depth " + depth.value + (t.stats.depth ? "; some paths were cut by the depth limit, so longer runs are not covered." : ", and no path was cut: every run of this method is covered.");
      verdict.className = "verdict " + (t.stats.unknown ? "warn" : errs.length ? "bad" : "good");
      verdict.innerHTML = msg;
      PA.math(verdict);
    }
    progSel.onchange = run;
    depth.onchange = run;
    run();
  }

  /* --- 5. Path explosion --- */
  function chainProg(k, indep) {
    const s = indep ? k : 1;
    const code = [P(0), ST(s)];
    const params = indep ? Array.from({ length: k }, (_, i) => ({ name: "x" + (i + 1), type: "int" })) : [{ name: "x", type: "int" }];
    let java = "static int count(" + params.map((q) => "int " + q.name).join(", ") + ") {\n  int s = 0;\n";
    for (let i = 1; i <= k; i++) {
      const base = code.length;
      code.push(L(indep ? i - 1 : 0), P(indep ? 0 : 10 * i), { op: "if", condition: "le", target: base + 4 }, { op: "incr", index: s, amount: 1 });
      java += "  if (" + (indep ? "x" + i + " > 0" : "x > " + 10 * i) + ") s++;\n";
    }
    code.push(L(s), R());
    java += "  return s;\n}";
    return { id: "count", cls: "jpamb.cases.Concolic", desc: "", params, returns: "int", code, java, methodId: "count" };
  }
  function labExplosion(el) {
    const { controls, view } = PA.lab(el, {
      title: "Path explosion, and how much the solver can prune",
      hint: "A method with k tests in a row. If the tests are on different inputs, every combination is feasible. If they are all on the same input, most combinations contradict each other and the solver prunes them.",
    });
    el.classList.add("wide");
    const top = h("div", { class: "ce-ctl" });
    controls.append(top);
    const kS = PA.slider(top, { label: "Number of tests k", min: 1, max: 10, value: 4 });
    const mode = PA.seg(top, { label: "The tests are on", options: [["same", "the same x"], ["indep", "different inputs"]], value: "same" });
    const stats = PA.stats(view, [{ key: "naive", label: "Paths without a solver (2^k)" }, { key: "feas", label: "Feasible paths" }, { key: "pruned", label: "Branches pruned" }, { key: "calls", label: "Solver calls" }]);
    const grid = h("div", { class: "split" });
    const left = h("div"), right = h("div");
    grid.append(left, right);
    const verdict = h("div", { class: "verdict" });
    view.append(grid, verdict);
    function run() {
      const k = kS.value, ind = mode.value === "indep";
      const p = chainProg(k, ind);
      const t = symExplore(p, 4 * k + 10, 5000);
      left.innerHTML = "";
      left.append(PA.codeBlock(p.java, "java"));
      stats.set("naive", String(1 << k));
      stats.set("feas", String(t.stats.leaves), ind ? "bad" : "good");
      stats.set("pruned", String(t.stats.pruned));
      stats.set("calls", String(t.stats.calls));
      const tab = h("table", { class: "dt" });
      tab.innerHTML = "<thead><tr><th>k</th><th>2^k</th><th>same x</th><th>different inputs</th></tr></thead>";
      const tb = h("tbody");
      for (let j = 1; j <= 10; j++) tb.append(h("tr", { class: j === k ? "on" : "" }, [h("td", { class: "num", text: String(j) }), h("td", { class: "num", text: String(1 << j) }), h("td", { class: "num", text: String(j + 1) }), h("td", { class: "num", text: String(1 << j) })]));
      tab.append(tb);
      right.innerHTML = "";
      right.append(h("div", { class: "panel-title", text: "Feasible paths" }), h("div", { class: "table-wrap" }, [tab]));
      verdict.className = "verdict " + (ind ? "bad" : "good");
      verdict.innerHTML = ind
        ? "<b>" + t.stats.leaves + " feasible paths for " + k + " tests.</b> Each test can go either way independently, so nothing is pruned and the number doubles with every test. Ten such tests in a loop body, run ten times, would give $2^{100}$ paths."
        : "<b>" + t.stats.leaves + " feasible paths instead of " + (1 << k) + ".</b> Once the path knows $x \\leq 10$, the branch $x \\gt 20$ is unsat, and the solver cuts it off right there. The thresholds cut the number line into " + (k + 1) + " pieces, one path each.";
      PA.math(verdict);
    }
    kS.onchange = run;
    mode.onchange = run;
    run();
  }

  /* --- 6. Concolic execution, one run at a time --- */
  const CONC_PROGS = [
    ["isNotAMillion", "isNotAMillion(int i)"],
    ["divideByN", "divideByN(int n)"],
    ["checkTheWrongThing", "checkTheWrongThing(int a)"],
    ["incrBranch", "incr(int a): two nested tests"],
    ["safeDivAByB", "safeDivAByB(int a, int b)"],
    ["arraySpellsHello", "arraySpellsHello(char[] array)"],
    ["hashGate", "hashGate(int x, int y)"],
    ["countdown", "countdown(int n)"],
  ];
  function labConcolic(el) {
    const { controls, view } = PA.lab(el, {
      title: "Concolic execution: run, negate, solve, run again",
      hint: "Run the program on a concrete input. Each branch on a symbolic value emits the constraint for the side that was taken. Negate one of them: the solver keeps all the constraints before it and produces an input for the other side.",
    });
    el.classList.add("wide");
    const top = h("div", { class: "ce-ctl" });
    controls.append(top);
    const progSel = PA.select(top, { label: "Program", options: CONC_PROGS, value: "isNotAMillion" });
    const inp = PA.textInput(top, { label: "Concrete input", value: "(0)" });
    const btns = PA.btnRow(controls);
    PA.button(btns, "Run", () => runIt(), "primary");
    PA.button(btns, "Reset", () => reset());
    const stats = PA.stats(view, [{ key: "out", label: "Outcome" }, { key: "steps", label: "Steps" }, { key: "cons", label: "Path constraints" }, { key: "runs", label: "Runs so far" }, { key: "paths", label: "Distinct paths" }]);
    const grid = h("div", { class: "split" });
    const left = h("div"), right = h("div");
    grid.append(left, right);
    const query = h("div");
    const hist = h("div");
    const verdict = h("div", { class: "verdict" });
    view.append(grid, query, verdict, hist);
    let p, lst, runs, paths, last;
    function reset() {
      p = prog(progSel.value);
      lst = codeAndListing(left, p);
      runs = []; paths = new Set(); last = null;
      right.innerHTML = ""; query.innerHTML = ""; hist.innerHTML = "";
      ["out", "steps", "cons", "runs", "paths"].forEach((k) => stats.set(k, "-"));
      verdict.className = "verdict";
      verdict.innerHTML = "Press <b>Run</b>.";
      lst.mark({});
    }
    function runIt() {
      const r0 = parseIn(p, inp.value);
      inp.bad(!r0.ok);
      if (!r0.ok) { verdict.className = "verdict bad"; verdict.textContent = r0.err; return; }
      const r = concolicRun(p, r0.v, 3000);
      last = r;
      runs.push(r);
      paths.add(r.pcs.join(",") + "|" + r.outcome);
      lst.mark({ cov: r.cov, err: r.outcome !== "ok" && r.outcome !== "*" ? r.pcs[r.pcs.length - 1] : null, ann: Object.fromEntries(r.path.map((c) => [c.pc, c.kind === "div" ? "div check" : c.kind === "bounds" ? "bounds check" : "branch"])) });
      stats.set("out", esc(r.outcome), r.outcome === "ok" ? "good" : r.outcome === "*" ? "warn" : "bad");
      stats.set("steps", String(r.steps));
      stats.set("cons", String(r.path.length));
      stats.set("runs", String(runs.length));
      stats.set("paths", String(paths.size));
      right.innerHTML = "";
      right.append(h("div", { class: "panel-title", text: "Path constraints of this run (the side that was taken)" }));
      if (!r.path.length) right.append(h("p", { class: "ce-sub", text: "None: no branch depended on the input." }));
      const ol = h("ol", { class: "ce-cons no-math" });
      r.path.forEach((c, j) => {
        const li = h("li", null, [
          h("span", { class: "mono", html: "<span class='ce-at'>" + c.pc + "</span> ψ<sub>" + j + "</sub>: " + esc(fmtCon(c)) }),
          h("button", { type: "button", class: "btn sm", text: "negate", onclick: () => negate(j) }),
        ]);
        ol.append(li);
      });
      right.append(ol);
      r.notes.forEach((n) => right.append(h("p", { class: "ce-note", html: "<b>Concretised at " + n.pc + ":</b> " + esc(n.text) + "." })));
      query.innerHTML = "";
      renderHist();
      let msg = "<b>" + esc(fmtInput(p, r.input)) + " → " + esc(r.outcome) + "</b>" + (r.ret ? ", returns " + r.ret.c + " (symbolically <code>" + esc(fmt(simp(r.ret.s))) + "</code>)" : "") + ". ";
      if (r.overflow) msg += "<b>Careful:</b> the constraint <code>" + esc(fmtCon(r.overflow)) + "</code> held in the real 32-bit run but is false over the mathematical integers: the int overflowed. A solver using <code>z3.Int</code> would call this path impossible. ";
      else if (r.path.length) msg += "Negate a constraint to steer the next run down another path.";
      verdict.className = "verdict " + (r.overflow || r.outcome === "*" ? "warn" : r.outcome === "ok" ? "" : "bad");
      verdict.innerHTML = msg;
    }
    function negate(j) {
      const r = last;
      if (!r) return;
      const q = r.path.slice(0, j).concat([negC(r.path[j])]);
      const res = solve(q, r.decls, envOf(p, r.input));
      query.innerHTML = "";
      query.append(h("div", { class: "panel-title", text: "Solver query: " + (j ? (j > 1 ? "keep ψ0 to ψ" + (j - 1) : "keep ψ0") + ", " : "") + "negate ψ" + j }));
      const box = h("div", { class: "ce-query" });
      box.append(h("p", { class: "mono no-math", text: fmtPath(q) }));
      if (res.status === "sat") {
        const ni = modelInput(p, res.model, r.input);
        box.append(h("p", { html: statusPill("sat") + " model <span class='mono'>" + esc(Object.entries(res.model).map(([k, v]) => k + " = " + v).join(", ")) + "</span>, so the next input is <b class='mono'>" + esc(fmtInput(p, ni)) + "</b> (inputs the model does not mention keep their old values)." }));
        const b = PA.btnRow(box);
        PA.button(b, "Run with this input", () => { inp.input.value = fmtInput(p, ni); runIt(); }, "primary");
      } else box.append(h("p", { html: statusPill(res.status) + " " + (res.status === "unsat" ? "There is no input for the other side: that branch is infeasible after this prefix." : esc(res.why || "")) }));
      query.append(box);
    }
    function renderHist() {
      hist.innerHTML = "";
      if (!runs.length) return;
      hist.append(h("div", { class: "panel-title", text: "Runs" }));
      const strip = h("div", { class: "trace-strip no-math" });
      runs.forEach((r, i) => {
        if (i) strip.append(h("span", { class: "arrow", text: "→" }));
        strip.append(h("span", { class: "ts " + (r.outcome === "ok" ? "end-ok" : r.outcome === "*" ? "" : "end-err"), text: fmtInput(p, r.input) + " " + r.outcome }));
      });
      hist.append(strip);
    }
    progSel.onchange = () => { const q = prog(progSel.value); inp.input.value = q.input || fmtInput(q, zeroInput(q)); reset(); runIt(); };
    inp.onchange = () => inp.bad(!parseIn(p, inp.value).ok);
    progSel.onchange();
  }

  /* --- 7. Concolic search against random fuzzing --- */
  function labRace(el) {
    const { controls, view } = PA.lab(el, {
      title: "Concolic search against random fuzzing",
      hint: "The concolic search starts from zeros (or an empty array) and negates every new constraint of every run. The random fuzzer draws uniform 32-bit ints and arrays of 0 to 8 letters a to z. Both stop a run after 300 steps and report * then.",
    });
    el.classList.add("wide");
    const top = h("div", { class: "ce-ctl" });
    controls.append(top);
    const progSel = PA.select(top, { label: "Program", options: CONC_PROGS, value: "isNotAMillion" });
    const budget = PA.seg(top, { label: "Random runs", options: [[1000, "1,000"], [10000, "10,000"], [100000, "100,000"]], value: 10000 });
    const cap = PA.seg(top, { label: "Concolic runs at most", options: [[10, "10"], [40, "40"]], value: 40 });
    const btns = PA.btnRow(controls);
    const go = PA.button(btns, "Run both", () => run(), "primary");
    const stats = PA.stats(view, [{ key: "cr", label: "Concolic runs" }, { key: "cp", label: "Concolic paths" }, { key: "calls", label: "Solver calls" }, { key: "rp", label: "Random paths" }]);
    const out = h("div");
    const verdict = h("div", { class: "verdict" });
    view.append(out, verdict);
    function run() {
      go.disabled = true;
      verdict.className = "verdict";
      verdict.textContent = "Running...";
      setTimeout(() => {
        try { compute(); } finally { go.disabled = false; }
      }, 20);
    }
    function compute() {
      const p = prog(progSel.value);
      const c = concolicSearch(p, zeroInput(p), cap.value, 300);
      const rng = PA.rng(8);
      const N = budget.value, rFound = {}, rPaths = new Set(), rCov = new Set();
      for (let n = 1; n <= N; n++) {
        const input = p.params.map((q) => q.type === "int" ? (Math.floor(rng() * 4294967296) | 0) : q.type === "boolean" ? rng() < 0.5 : Array.from({ length: Math.floor(rng() * 9) }, () => 97 + Math.floor(rng() * 26)));
        const r = fastRun(p, input, 300);
        if (rFound[r.outcome] == null) rFound[r.outcome] = n;
        rPaths.add(r.ph + "|" + r.outcome);
        r.cov.forEach((v, i) => v && rCov.add(i));
      }
      const outcomes = J.OUTCOMES.filter((o) => c.found[o] != null || rFound[o] != null);
      const tab = h("table", { class: "dt" });
      tab.innerHTML = "<thead><tr><th>outcome</th><th>random: first found at run</th><th>concolic: first found at run</th></tr></thead>";
      const tb = h("tbody");
      outcomes.forEach((o) => tb.append(h("tr", null, [h("td", { html: pill(o, pillCls(o)) }), h("td", { class: "num", text: rFound[o] != null ? rFound[o].toLocaleString("en") : "not in " + N.toLocaleString("en") }), h("td", { class: "num", text: c.found[o] != null ? String(c.found[o]) : "not in " + c.runs.length })])));
      tb.append(h("tr", null, [h("td", { text: "instructions covered" }), h("td", { class: "num", text: rCov.size + " / " + p.code.length }), h("td", { class: "num", text: c.cov.size + " / " + p.code.length })]));
      tab.append(tb);
      out.innerHTML = "";
      out.append(h("div", { class: "table-wrap" }, [tab]));
      const runsStrip = h("div", { class: "trace-strip no-math" });
      c.runs.slice(0, 16).forEach((r, i) => {
        if (i) runsStrip.append(h("span", { class: "arrow", text: "→" }));
        runsStrip.append(h("span", { class: "ts " + (r.outcome === "ok" ? "end-ok" : r.outcome === "*" ? "" : "end-err"), text: fmtInput(p, r.input) + " " + r.outcome }));
      });
      if (c.runs.length > 16) runsStrip.append(h("span", { class: "arrow", text: "... " + (c.runs.length - 16) + " more" }));
      out.append(h("div", { class: "panel-title ce-gap", text: "The concolic runs" }), runsStrip);
      stats.set("cr", String(c.runs.length) + (c.done ? "" : " (cap)"), c.done ? "good" : "warn");
      stats.set("cp", String(c.paths));
      stats.set("calls", c.calls + (c.unsat ? " (" + c.unsat + " unsat)" : ""));
      stats.set("rp", String(rPaths.size));
      const notes = {
        isNotAMillion: "Random fuzzing would need about 2<sup>32</sup> tries for the one bad value; the concolic search needs 2 runs.",
        divideByN: "The same story: the error class is the single input n = 0.",
        checkTheWrongThing: "Here random fuzzing is just as good: the error class is almost every input.",
        incrBranch: "Two paths over the mathematical integers. Random fuzzing over 32-bit ints may even stumble on the overflow, which the concolic search (thinking in mathematical integers) does not predict.",
        safeDivAByB: "Both find the paths quickly; the division by zero is infeasible, so neither finds it.",
        arraySpellsHello: "The concolic search grows the array one letter at a time: every new bounds check and every comparison is a constraint to negate. Random letters spell \"hello\" with probability 26<sup>-5</sup> per long enough array.",
        hashGate: "Random fuzzing must guess x = hash(y): one chance in 2<sup>32</sup>. Concolic execution uses the concrete hash value and solves for x.",
        countdown: "Every iteration count is its own path, so the concolic search never finishes on its own: it stops at the cap. Negative n would run for about 2<sup>32</sup> steps, which neither finds within 300 steps.",
      };
      verdict.className = "verdict " + (c.done ? "good" : "warn");
      verdict.innerHTML = (c.done ? "<b>The concolic search finished:</b> it ran every feasible path it could find (" + c.paths + "). " : "<b>The concolic search hit the cap</b> of " + c.runs.length + " runs. ") + (notes[p.id] || "");
    }
    progSel.onchange = run;
    budget.onchange = run;
    cap.onchange = run;
    run();
  }

  PA.boot("concolic-execution", {
    sat: labSat, solver: labSolver, stepper: labStepper, symtree: labSymtree,
    explosion: labExplosion, concolic: labConcolic, race: labRace,
  }, QUIZ);
})();
