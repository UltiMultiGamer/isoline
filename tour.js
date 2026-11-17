(function (root) {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const SEEN = "isoline.tour";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise(requestAnimationFrame);

  const SPRING = true;
  function springEase(t) {
    if (t >= 1) return 1;
    const z = 0.68, w = 9.5, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  }
  function pointer(el, stiff = 0.32, zeta = 0.78) {
    let x = 0, y = 0, vx = 0, vy = 0, gx = 0, gy = 0, raf = 0, last = 0, path = null, alive = true, done = null, calm = false;
    const paint = () => (el.style.translate = `${x}px ${y}px`);
    const cubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), ease = SPRING ? springEase : cubic;
    const tick = (now) => {
      raf = 0; if (!alive) return;
      const steps = Math.min(4, Math.max(1, Math.round((now - (last || now - 16.7)) / 16.7))); last = now;
      if (path) {
        const t = Math.min(1, (now - path.t0) / path.dur), e = (calm ? cubic : ease)(t), u = 1 - e;
        gx = u * u * path.x0 + 2 * u * e * path.cx + e * e * path.x1; gy = u * u * path.y0 + 2 * u * e * path.cy + e * e * path.y1;
        if (t >= 1) path = null;
      }
      for (let i = 0; i < steps; i++) { const k = stiff, d = 2 * Math.sqrt(k) * (calm ? Math.max(zeta, 0.6) : zeta); vx += (gx - x) * k - vx * d; vy += (gy - y) * k - vy * d; x += vx; y += vy; }
      paint();
      if (!path && Math.hypot(gx - x, gy - y) < 0.4 && Math.hypot(vx, vy) < 0.2) { x = gx; y = gy; paint(); last = 0; const r = done; done = null; r?.(); return; }
      raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    return {
      el,
      place(px, py) { x = gx = px; y = gy = py; vx = vy = 0; path = null; paint(); },
      // Spring toward a goal that can change every frame; the pointer eases there with no jumps.
      aim(px, py, quiet = false) { if (reduce.matches) return this.place(px, py); calm = quiet; path = null; gx = px; gy = py; kick(); },
      // Move with scrolled content: shifts both where it is and where it is going, keeping its motion.
      shift(dx, dy) { if (!dx && !dy) return; x += dx; y += dy; gx += dx; gy += dy; paint(); },
      to(px, py, speed = 1, quiet = false) {
        if (reduce.matches) { this.place(px, py); return Promise.resolve(); }
        calm = quiet;
        const dx = px - gx, dy = py - gy, dist = Math.hypot(dx, dy), bow = (Math.random() < 0.5 ? -1 : 1) * (0.12 + Math.random() * 0.12);
        path = { x0: gx, y0: gy, x1: px, y1: py, cx: (gx + px) / 2 - dy * bow, cy: (gy + py) / 2 + dx * bow, t0: performance.now(), dur: Math.min(1200, 240 + 9 * Math.pow(dist, 0.8)) * (SPRING && !quiet ? 1.25 : 1) / speed };
        done?.();
        return new Promise((r) => { done = r; kick(); setTimeout(() => { if (done === r) { done = null; r(); } }, path.dur + 900); });
      },
      async along(f, dur) {
        if (reduce.matches) return;
        const t0 = performance.now(); path = null; calm = false;
        while (alive) { const t = Math.min(1, (performance.now() - t0) / dur); [gx, gy] = f(t); kick(); if (t >= 1) break; await frame(); }
        await new Promise((r) => { done = r; kick(); setTimeout(r, 600); });
      },
      async click() {
        el.classList.add("down");
        const ring = document.createElement("i"); ring.className = "tp-ring"; el.appendChild(ring);
        ring.animate([{ opacity: 0.85, scale: 0.4 }, { opacity: 0, scale: 2.4 }], { duration: 520, easing: "cubic-bezier(.2,.8,.3,1)" }).onfinish = () => ring.remove();
        await wait(130); el.classList.remove("down"); await wait(60);
      },
      press(on) { el.classList.toggle("down", on); },
      get pos() { return [x, y]; },
      stop() { alive = false; cancelAnimationFrame(raf); done?.(); done = null; },
    };
  }

  const LOOKS = ["Prism", "Caddis", "Lagoon", "Orb"];
  const FALLBACK = ["linear-gradient(135deg,#f08a4b,#7b5cff 55%,#e85d9a)", "linear-gradient(120deg,#ff4d2e,#ffc93c 40%,#7fd1ff 75%,#3a7bff)", "radial-gradient(circle at 55% 50%,#c9fbff,#3fd6e6 45%,#0b5d73)", "radial-gradient(circle at 50% 50%,#6a3fd1 20%,#f2a36b 70%)"];
  let pics = null;
  const loadPics = () => (pics ||= Promise.all(LOOKS.map(async (n, i) => { try { const c = await root.Studio.snapshot(320, 200, n); return `url("${c.toDataURL("image/jpeg", 0.86)}")`; } catch (e) { return FALLBACK[i]; } })));
  const TILES = [["Preset", "Prism", "Gradient preset"], ["Generator", "Flow", "Raster, PNG output"], ["Colors", "Prism", "5 colors"], ["Effects", "Grain", "Amount 0.12"]];
  const MOCK = `<div class="tm" aria-hidden="true">
    <div class="tm-top"><span class="tm-logo"><i></i>isoline</span><span class="tm-size">1440 <em>×</em> 900</span><span class="tm-sp"></span><span class="tm-ib"></span><span class="tm-btn">Designs</span><span class="tm-btn">Share</span><span class="tm-exp">Export</span></div>
    <div class="tm-build"><b class="tm-h">Build</b>${TILES.map(([l, t, s], i) => `<span class="tm-l">${l}</span><span class="tm-tile${i === 0 ? " on" : ""}"><i class="tm-th"></i><span><b>${t}</b><small>${s}</small></span></span>`).join("")}</div>
    <div class="tm-opts"><b class="tm-h tm-title">Preset</b><div class="tm-seg"><i class="on">All</i><i>Lines</i><i>Gradients</i><i>Noise</i></div>
      <div class="tm-cards">${LOOKS.map((n, i) => `<span class="tm-card${i === 0 ? " on" : ""}"><i></i>${n}</span>`).join("")}</div>
      <div class="tm-ctrl"><span>Scale</span><em>1.00×</em><span class="tm-slider"><span class="tm-fill"></span><span class="tm-knob"></span></span></div>
      <div class="tm-ctrl"><span>Warp</span><em>0.40</em><span class="tm-slider s2"><span class="tm-fill"></span><span class="tm-knob"></span></span></div>
    </div>
    <div class="tm-stage"><div class="tm-board"><i class="tm-pic a"></i><i class="tm-pic b"></i><span class="tm-obj"><i class="r1"></i><i class="r2"></i><i class="r3"></i></span></div>
      <div class="tm-tools"><span>Variation</span><span class="tm-sur">Surprise</span></div></div>
    <div class="tm-menu"><span>PNG</span><span>SVG</span><span>Video</span><span>Copy link</span></div>
    <div class="tm-toast">Image saved</div>
    <div class="tp tm-dot"></div>
  </div>`;
  const STEPS = [
    { t: "Build in layers", p: "The left column is your design, one layer per tile: preset, generator, shape, colors, objects, effects and motion. Click a tile to open its options." },
    { t: "Every choice is a preview", p: "Options show your own design, so you see what you'll get before you pick. Sliders change it live, and the dice beside them roll a value." },
    { t: "Work on the canvas", p: "Drag points, objects and effect handles right on the canvas. Rings around an object turn it, and the canvas edges resize it." },
    { t: "Take it anywhere", p: "Export a PNG, SVG, video, GIF or a live HTML file. Share sends a link, or a brief your AI agent can build from." },
  ];
  let pane = null, run = 0;

  function buildPane() {
    const m = document.createElement("div");
    m.className = "modal tour-modal"; m.id = "tourModal"; m.hidden = true;
    m.innerHTML = `<div class="dialog tour-pane" role="dialog" aria-modal="true" aria-labelledby="tourTitle">
      <div class="tour-stage">${MOCK}</div>
      <div class="tour-copy"><span class="tour-kicker" id="tourKicker"></span><h3 id="tourTitle"></h3><p id="tourText"></p></div>
      <div class="tour-foot">
        <span class="tf-l"><button class="btn ghost" id="tourSkip">Skip</button><button class="btn" id="tourBack">Back</button></span>
        <span class="tf-c"><span class="tour-dots" id="tourDots">${STEPS.map((_, i) => `<button data-i="${i}" aria-label="Step ${i + 1}"></button>`).join("")}</span><button class="btn primary tour-go" id="tourGo" tabindex="-1">Show me around</button></span>
        <span class="tf-r"><button class="btn primary" id="tourNext">Next</button></span>
      </div>
    </div>`;
    document.body.appendChild(m);
    const cur = pointer(m.querySelector(".tm-dot"));
    let i = 0;
    const show = (n) => {
      i = Math.max(0, Math.min(STEPS.length - 1, n));
      const s = STEPS[i], last = i === STEPS.length - 1;
      $("tourKicker").textContent = `${i + 1} of ${STEPS.length}`;
      $("tourTitle").textContent = s.t; $("tourText").textContent = s.p;
      if (!reduce.matches) m.querySelectorAll(".tour-copy > *").forEach((el, k) => el.animate([{ opacity: 0, translate: "0 6px" }, { opacity: 1, translate: "0 0" }], { duration: 340, delay: k * 45, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" }));
      [...$("tourDots").children].forEach((d, k) => d.classList.toggle("on", k === i));
      $("tourSkip").hidden = i > 0; $("tourBack").hidden = i === 0;
      $("tourNext").textContent = last ? "Start designing" : "Next";
      $("tourNext").classList.toggle("primary", !last);
      m.querySelector(".tour-foot").classList.remove("ready");
      $("tourGo").tabIndex = -1;
      play(m, cur, i, last ? () => { m.querySelector(".tour-foot").classList.add("ready"); $("tourGo").tabIndex = 0; } : null);
    };
    $("tourNext").onclick = () => (i < STEPS.length - 1 ? show(i + 1) : closePane());
    $("tourGo").onclick = () => { closePane(); setTimeout(startTour, 280); };
    $("tourBack").onclick = () => show(i - 1);
    $("tourSkip").onclick = closePane;
    $("tourDots").onclick = (e) => { const b = e.target.closest("[data-i]"); if (b) show(+b.dataset.i); };
    m.addEventListener("click", (e) => { if (e.target === m) closePane(); });
    m.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") show(i + 1); else if (e.key === "ArrowLeft") show(i - 1); else if (e.key === "Escape") closePane(); });
    return { el: m, show, cur };
  }

  function spot(tm, el, fx = 0.5, fy = 0.5) {
    let x = 0, y = 0, n = el;
    while (n && n !== tm) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return [x + el.offsetWidth * fx, y + el.offsetHeight * fy];
  }

  async function play(m, cur, i, once) {
    const id = ++run, alive = () => id === run && !m.hidden;
    const tm = m.querySelector(".tm"), q = (s) => tm.querySelector(s), qa = (s) => [...tm.querySelectorAll(s)];
    const P = await loadPics();
    if (!alive()) return;
    qa(".tm-card i").forEach((c, k) => (c.style.backgroundImage = P[k]));
    let shown = 0, front = "a";
    const art = (k, instant) => {
      const back = front === "a" ? "b" : "a", el = q(".tm-pic." + back);
      el.style.backgroundImage = P[k]; tm.style.setProperty("--art", P[k]);
      if (instant) { q(".tm-pic." + front).style.backgroundImage = P[k]; return; }
      el.classList.add("on"); q(".tm-pic." + front).classList.remove("on"); front = back; shown = k;
    };
    const reset = () => {
      qa(".tm-tile").forEach((t, k) => t.classList.toggle("on", k === 0)); q(".tm-title").textContent = "Preset";
      qa(".tm-card").forEach((c, k) => c.classList.toggle("on", k === 0));
      tm.classList.remove("menu", "swap", "obj", "saved");
      q(".tm-pic.a").classList.add("on"); q(".tm-pic.b").classList.remove("on"); front = "a"; art(0, true);
      q(".tm-board").style.setProperty("--zoom", 1);
      tm.querySelectorAll(".tm-slider").forEach((s) => s.style.setProperty("--v", s.classList.contains("s2") ? 0.3 : 0.5));
      q(".tm-obj").style.cssText = "";
    };
    const goto = (el, fx, fy) => cur.to(...spot(tm, el, fx, fy));
    const click = async (el, fx, fy) => { await goto(el, fx, fy); if (!alive()) return false; await cur.click(); return alive(); };
    const dragTo = async (px, py, f) => { let fin = false; cur.to(px, py, 0.75).then(() => (fin = true)); cur.press(true); while (alive() && !fin) { f(...cur.pos); await frame(); } cur.press(false); return alive(); };
    reset();
    if (!cur.placed) { cur.place(tm.offsetWidth + 24, tm.offsetHeight * 0.75); cur.placed = true; }
    let first = true;
    while (alive()) {
      if (i === 0) {
        for (const k of [2, 3, 1, 0]) {
          if (!(await click(qa(".tm-tile")[k], 0.32, 0.5))) return;
          qa(".tm-tile").forEach((t, j) => t.classList.toggle("on", j === k));
          q(".tm-title").textContent = TILES[k][0];
          tm.classList.remove("swap"); void tm.offsetWidth; tm.classList.add("swap");
          await wait(750); if (!alive()) return;
        }
      } else if (i === 1) {
        for (const k of [1, 2, 3, 0]) {
          if (!(await click(qa(".tm-card")[k], 0.5, 0.4))) return;
          qa(".tm-card").forEach((c, j) => c.classList.toggle("on", j === k)); art(k);
          await wait(700); if (!alive()) return;
        }
        const s = q(".tm-slider"), [sx, sy] = spot(tm, s, 0, 0.5), w = s.offsetWidth;
        await goto(s.querySelector(".tm-knob")); if (!alive()) return;
        for (const v of [0.9, 0.2, 0.5]) {
          if (!(await dragTo(sx + w * v, sy, (x) => { const t = Math.max(0, Math.min(1, (x - sx) / w)); s.style.setProperty("--v", t); q(".tm-board").style.setProperty("--zoom", 0.7 + t * 0.6); s.previousElementSibling.textContent = (0.5 + t).toFixed(2) + "×"; }))) return;
          await wait(180);
        }
        await wait(500);
      } else if (i === 2) {
        const board = q(".tm-board"), obj = q(".tm-obj"), bw = board.offsetWidth, bh = board.offsetHeight, [bx, by] = spot(tm, board, 0, 0);
        tm.classList.add("obj");
        await wait(400);
        if (!(await goto(obj))) return; if (!alive()) return;
        await cur.click();
        for (const [fx, fy] of [[0.28, 0.32], [0.72, 0.62], [0.5, 0.5]]) {
          if (!(await dragTo(bx + bw * fx, by + bh * fy, (x, y) => { obj.style.left = ((x - bx) / bw) * 100 + "%"; obj.style.top = ((y - by) / bh) * 100 + "%"; }))) return;
          await wait(220);
        }
        const [ox, oy] = spot(tm, obj, 0.5, 0.5), R = obj.offsetWidth * 0.62;
        await cur.to(ox + R, oy); if (!alive()) return;
        cur.press(true);
        const t0 = performance.now();
        while (alive() && performance.now() - t0 < 1100) { const a = ((performance.now() - t0) / 1100) * 1.4; cur.place(ox + Math.cos(a) * R, oy + Math.sin(a) * R); obj.style.rotate = a * 57.3 + "deg"; await frame(); }
        cur.press(false);
        await wait(700); if (!alive()) return;
      } else {
        if (!(await click(q(".tm-exp")))) return;
        tm.classList.add("menu"); await wait(450); if (!alive()) return;
        for (const it of qa(".tm-menu span").slice(0, 3)) { await goto(it, 0.3); if (!alive()) return; it.classList.add("hot"); await wait(260); it.classList.remove("hot"); }
        if (!(await click(qa(".tm-menu span")[0], 0.3))) return;
        tm.classList.remove("menu"); tm.classList.add("saved");
        await wait(1300); tm.classList.remove("saved"); await wait(500);
      }
      if (first && alive()) { first = false; once?.(); }
      reset();
      await wait(200);
    }
  }

  function openPane() {
    try { localStorage.setItem(SEEN, "1"); } catch (e) {}
    pane ||= buildPane();
    pane.el.hidden = false;
    root.UI?.tip?.hide?.();
    requestAnimationFrame(() => { pane.show(0); $("tourNext").focus({ preventScroll: true }); });
  }
  function closePane() { if (!pane) return; pane.el.hidden = true; run++; }

  const mode = (m) => async () => {
    const b = document.querySelector(`#cpMode [data-v="${m}"]`);
    if (b && !b.classList.contains("on")) { b.click(); await wait(420); }
  };
  const builder = mode("builder"), libraries = mode("libraries");
  const PANE = false;
  const TOURS = {
    home: [
      { el: '.home [data-go="studio"]', t: "Studio", p: "Make patterns, gradients and effects, animate them and export anywhere." },
      { el: '.home [data-go="palettes"]', t: "Palettes", p: "Roll palettes and check names and contrast. Your colors carry over to the other tools." },
      { el: '.home [data-go="components"]', t: "Components", p: "Build a kit in your colors or browse UI libraries." },
      { el: "#brand", inner: true, calm: true, t: "Feeling lucky?", p: "Click the logo to roll all three at once. Hold it to keep rolling until you press again." },
      { el: '.home [data-go="studio"]', t: "Let's begin", p: "Start in the Studio. A short tutorial is waiting there.", done: "Open the Studio" },
    ],
    // Interactive: steps with `wait` hold until you do the thing, then answer and move on.
    studio: [
      { el: ".app > .slots", t: "Your layers", p: "Your design, one layer per tile. Click a tile to edit it." },
      { el: '[data-slot="colors"]', t: "Open Colors", p: "Click the Colors tile.", wait: { click: '[data-slot="colors"]' }, ok: "Colors opened in the next column." },
      { el: "#palettes", side: true, t: "Pick a palette", p: "Click any palette to recolor your design.", wait: { click: "#palettes .pal" }, ok: "The canvas picked up the new colors." },
      { el: "#surprise", t: "Surprise", p: "Click Surprise to roll a new look.", wait: { click: "#surprise" }, ok: "Undo brings the last look back if you miss it." },
      { el: '[data-slot="motion"]', t: "Make it move", p: "Designs can move too. Open Motion to pick how.", media: "motion:drift", wait: { click: '[data-slot="motion"]' }, ok: "Motion opened in the next column." },
      { el: "#motionType", side: true, t: "Pick a motion", p: "Hover one to preview it, then click it.", wait: { until: () => (root.Studio?.state?.().motion?.type || "still") !== "still" }, ok: "The canvas plays it now. Export saves it as a video or GIF." },
      { el: "#wrap", t: "The canvas", p: "Drag points, objects and handles here. Drag the edges to resize.", media: "mesh-drag" },
      { el: "#exportBtn", t: "Export", p: "PNG, SVG, video, GIF or HTML. Share has a link and a brief for AI agents." },
      { el: "#settingsBtn", t: "Settings", p: "Theme, accent and this tutorial." },
    ],
    palettes: [
      { el: ".pt-col", t: "Your colors", p: "Each column is a color. Hover for lock, copy and shades. Drag to reorder." },
      { el: ".pt-col .pt-info", t: "Names and contrast", p: "Every color shows its name and text contrast." },
      { el: "#ptGen", t: "Generate", p: "Space rolls new colors for every unlocked column. Vary (V) nudges the ones you have." },
      { el: "#ptModeBtn", t: "Harmony", p: "Choose how the colors relate: analogous, complementary, triads and more." },
      { el: "#ptSavedBtn", t: "Saved", p: "Saved palettes show up in the Studio too." },
      { el: "#ptUse", t: "Use them", p: "Send the colors to the Studio, or to the Builder in Components." },
    ],
    components: [
      { pre: builder, el: "#cpMode", t: "Two modes", p: "Builder makes a kit in your colors. Libraries lists UI kits to browse." },
      { pre: builder, el: "#cpBuild", t: "Builder", p: "Pick fonts, scale, radius and depth, and see them on real pages. Export as CSS or a brief." },
      { act: '#cpMode [data-v="libraries"]', el: ".cp-filters", t: "Find a library", p: "Search, or narrow the list by framework and category." },
      { pre: libraries, el: ".cp-grid .lib", t: "A library", p: "Each card opens the library's site and docs." },
    ],
  };
  const KEY = (name) => (name === "studio" ? "isoline.tour.studio3" : name === "home" ? "isoline.tour.home3" : "isoline.tour." + name);
  const seen = (k) => { try { return !!localStorage.getItem(k); } catch (e) { return true; } };
  const mark = (k) => { try { localStorage.setItem(k, "1"); } catch (e) {} };

  function boxOf(s) {
    const el = document.querySelector(s.el); if (!el) return null;
    const many = s.el.includes(",");
    if (!many && (!s.inner || !el.children.length)) return el.getBoundingClientRect();
    const rs = (many ? [...document.querySelectorAll(s.el)] : [...el.children]).map((c) => c.getBoundingClientRect()).filter((r) => r.width);
    if (!rs.length) return el.getBoundingClientRect();
    const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top)), r = Math.max(...rs.map((q) => q.right)), b = Math.max(...rs.map((q) => q.bottom));
    return { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
  }
  function mediaFor(name) {
    const box = document.createElement("div"); box.className = "tour-media";
    const [kind, v] = name.split(":");
    const live = v != null && root.UI?.preview?.(kind, v);
    if (live) box.appendChild(live);
    else { const img = new Image(); img.alt = ""; img.src = root.TIP_MEDIA?.[name] || `previews/tips/${name}.webp`; box.appendChild(img); }
    return box;
  }
  let tour = null;
  function startTour(name = "studio") {
    if (tour) return;
    if (GUIDED[name] || !TOURS[name]) return guidedTour(GUIDED[name] ? name : "studio");
    const STEPS = TOURS[name] || TOURS.studio;
    mark(KEY(name));
    const moving = root.Shell?.route !== name;
    if (moving) root.Shell?.go(name);
    const spotEl = document.createElement("div"), tip = document.createElement("div"), dot = document.createElement("div");
    spotEl.className = "tour-spot"; tip.className = "tour-tip"; dot.className = "tp tour-dot";
    tip.setAttribute("role", "dialog"); tip.setAttribute("aria-live", "polite");
    document.body.append(spotEl, tip, dot);
    const cur = pointer(dot);
    cur.place(innerWidth / 2, innerHeight + 30);
    let i = -1, busy = false, unarm = null, early = null;
    const disarm = () => { unarm?.(); unarm = null; };
    const arm = (s, at) => {
      disarm();
      let fired = false;
      const ok = () => {
        const p = tip.querySelector("p"), acts = tip.querySelector(".tour-acts");
        tip.classList.add("ok"); p.textContent = s.ok || "Nice."; acts.hidden = true;
        if (!reduce.matches) p.animate([{ opacity: 0, translate: "0 4px" }, { opacity: 1, translate: "0 0" }], { duration: 260, easing: "cubic-bezier(.22,1,.36,1)" });
        place();
        setTimeout(() => { if (tour && i === at) go(at + 1); }, 1500);
      };
      // Done before its tip finished arriving? Answer as soon as the tip is up.
      const hit = () => { if (fired || i !== at || !tour) return; fired = true; disarm(); if (busy) early = ok; else ok(); };
      if (s.wait.click) {
        const h = (e) => { if (!tip.contains(e.target) && e.target.closest?.(s.wait.click)) setTimeout(hit, 350); };
        // Some controls re-render on pointerdown, so listen there too.
        document.addEventListener("pointerdown", h, true); document.addEventListener("click", h, true);
        unarm = () => { document.removeEventListener("pointerdown", h, true); document.removeEventListener("click", h, true); };
      } else {
        const id = setInterval(() => { try { if (s.wait.until()) hit(); } catch (e) {} }, 200);
        unarm = () => clearInterval(id);
      }
    };
    const place = () => {
      const r = boxOf(STEPS[i]), pad = 6; if (!r) return;
      Object.assign(spotEl.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
      const tw = tip.offsetWidth, th = tip.offsetHeight, m = 12;
      let x = r.left + r.width / 2 - tw / 2, y = r.bottom + 14;
      if (y + th > innerHeight - m) y = r.top - th - 14;
      if (STEPS[i].side || y < m) { y = Math.min(innerHeight - th - m, Math.max(m, r.top + r.height / 2 - th / 2)); x = r.right + 14 + tw < innerWidth - m ? r.right + 14 : r.left - tw - 14; }
      tip.style.translate = `${Math.max(m, Math.min(innerWidth - tw - m, x))}px ${Math.max(m, Math.min(innerHeight - th - m, y))}px`;
    };
    const settle = async (s) => {
      let y = NaN, still = 0;
      for (const t0 = performance.now(); performance.now() - t0 < 1200 && still < 4; ) { await frame(); const r = typeof s === "function" ? s() : boxOf(s); still = r && Math.abs(r.top - y) < 0.5 ? still + 1 : 0; y = r?.top; }
    };
    const into = async (el, s) => {
      const box = el.getBoundingClientRect();
      const over = [...document.querySelectorAll(".mini.show")].map((n) => n.getBoundingClientRect()).filter((r) => r.top < 140 && r.left < box.right && r.right > box.left);
      el.style.scrollMarginTop = Math.max(0, ...over.map((r) => r.bottom)) + 10 + "px"; el.style.scrollMarginBottom = "10px";
      el.scrollIntoView({ block: "nearest", behavior: reduce.matches ? "auto" : "smooth" });
      await settle(s || (() => el.getBoundingClientRect()));
      el.style.scrollMarginTop = el.style.scrollMarginBottom = "";
    };
    const shown = (s) => { const r = boxOf(s); return r && r.width > 0 && r.height > 0; };
    const go = async (n) => {
      if (busy || n < 0 || !tour) return;
      disarm(); tip.classList.remove("ok");
      if (n >= STEPS.length) return finish();
      busy = true;
      const dir = n < i ? -1 : 1;
      tip.classList.add("moving");
      let s;
      for (; n >= 0 && n < STEPS.length; n += dir) {
        s = STEPS[n];
        if (s.pre) await s.pre();
        if (s.act) {
          const b = document.querySelector(s.act);
          if (b && b.getBoundingClientRect().width) { await into(b); if (!tour) return; const r = b.getBoundingClientRect(); await cur.to(r.left + Math.min(40, r.width / 2), r.top + r.height / 2); await cur.click(); b.click(); await wait(380); }
        }
        if (!tour) return;
        for (let k = 0; k < 20 && (s.act || s.pre) && !shown(s); k++) await wait(30);
        if (shown(s)) break;
      }
      if (n < 0 || n >= STEPS.length) { busy = false; tip.classList.remove("moving"); if (n >= STEPS.length) finish(); else if (i < 0) end(); return; }
      i = n; early = null;
      if (s.wait) arm(s, i);
      const last = i === STEPS.length - 1;
      await into(document.querySelector(s.el), s);
      if (!tour) return;
      const T = (x) => root.I18N?.t?.(x) ?? x;
      tip.innerHTML = `<span class="tour-kicker">${i + 1} of ${STEPS.length}</span><b>${T(s.t)}</b><p>${T(s.p)}</p><div class="tour-acts"><button class="btn sm ghost" data-a="end">${T("End tour")}</button><span class="grow"></span>${i ? `<button class="btn sm" data-a="back">${T("Back")}</button>` : ""}<button class="btn sm ${s.wait ? "ghost" : "primary"}" data-a="next">${T(s.wait ? "Skip step" : last ? s.done || "Done" : "Next")}</button></div>`;
      tip.classList.toggle("wait", !!s.wait);
      if (s.media) tip.insertBefore(mediaFor(s.media), tip.querySelector("p"));
      if (s.ok) s.ok = T(s.ok);
      place();
      if (s.media) tip.querySelector(".tour-media > *")?.addEventListener?.("load", place, { once: true });
      const r = boxOf(s); cur.to(r.left + r.width * 0.5, r.top + Math.min(r.height * 0.5, 40), 1, !!s.calm);
      tip.classList.remove("moving");
      tip.querySelector('[data-a="next"]').focus({ preventScroll: true });
      busy = false;
      if (early) { const f = early; early = null; f(); }
      // Panels slide and settle after opening: keep the spotlight on its target meanwhile.
      for (let t0 = performance.now(), at = i; performance.now() - t0 < 1200 && tour && i === at; ) { await frame(); if (!busy) place(); }
    };
    const cleanup = () => {
      disarm();
      removeEventListener("resize", place); removeEventListener("scroll", follow, true); removeEventListener("keydown", key, true);
      tour = null;
      for (const n of [spotEl, tip]) { n.classList.add("gone"); setTimeout(() => n.remove(), 320); }
    };
    const end = () => { cleanup(); cur.stop(); dot.classList.add("gone"); setTimeout(() => dot.remove(), 320); };
    const finish = async () => {
      if (busy) return; busy = true;
      cleanup();
      if (name === "home") {
        const c = document.querySelector('.home [data-go="studio"]'), r = c?.getBoundingClientRect();
        if (r) { await cur.to(r.left + r.width / 2, r.top + r.height / 2); await cur.click(); }
        dot.classList.add("gone"); setTimeout(() => { cur.stop(); dot.remove(); }, 320);
        root.Shell?.go("studio");
        return;
      }
      await swirlHome(cur, dot);
    };
    const key = (e) => { if (e.key === "Escape") { e.stopPropagation(); end(); } else if (e.key === "ArrowRight") go(i + 1); else if (e.key === "ArrowLeft") go(i - 1); };
    tip.onclick = (e) => { const a = e.target.closest("[data-a]")?.dataset.a; if (a === "next") go(i + 1); else if (a === "back") go(i - 1); else if (a === "end") end(); };
    const follow = () => { if (i >= 0 && !busy) place(); };
    addEventListener("resize", place); addEventListener("scroll", follow, { capture: true, passive: true }); addEventListener("keydown", key, true);
    tour = { end, name };
    setTimeout(() => go(0), moving ? 760 : 120);
  }
  // Guided tours (home and Studio): chapters with a checklist of things to try. Each check ticks off when you do it,
  // the spotlight moves to the next one, and the chapter moves on by itself once its list is done.
  const fxCount = () => root.Studio?.state?.().fxOrder?.length || 0;
  const shown = (sel) => { const n = document.querySelector(sel); return !!n && n.getClientRects().length > 0; };
  const sizeOf = () => { const st = root.Studio?.state?.(); return st ? st.w + "x" + st.h : ""; };
  const hasHandles = () => !!document.querySelector("#ov:not(.off) .pt, #ov:not(.off) .fc, #ov:not(.off) .ob");
  // Counts a real drag of a canvas handle: pressed on one and moved a few pixels.
  function watchCanvas(c) {
    c.size0 = sizeOf();
    const ov = document.getElementById("ov"); if (!ov) return;
    let p0 = null;
    const dn = (e) => { if (e.target.closest?.(".pt, .rs, .fc, .fc2, .fr, .ff, .fa, .ob, .obs, .obr")) p0 = [e.clientX, e.clientY]; };
    const mv = (e) => { if (p0 && Math.hypot(e.clientX - p0[0], e.clientY - p0[1]) > 8) c.dragged = true; };
    const up = () => (p0 = null);
    ov.addEventListener("pointerdown", dn, true); addEventListener("pointermove", mv, true); addEventListener("pointerup", up, true);
    return () => { ov.removeEventListener("pointerdown", dn, true); removeEventListener("pointermove", mv, true); removeEventListener("pointerup", up, true); };
  }
  const GUIDED = {
    home: [
      { center: true, hand: true, t: "Hi! Welcome to Isoline!", p: "Isoline keeps three tools in one tab: a Studio for patterns, gradients and motion, Palettes for finding colors, and Components for turning those colors into a UI kit. This quick look around the home page ends in the Studio, where a second short tour takes over.", next: "Show me around", skip: "Not now" },
      { el: '.home [data-go="studio"]', t: "The Studio", p: "The Studio is where you make patterns, gradients and effects, set them in motion and export them, and this card always shows the design you're working on." },
      { el: '.home [data-go="palettes"]', t: "Palettes", p: "Palettes rolls new color sets and shows each color's name and contrast, and the colors you keep carry straight over to the Studio and Components." },
      { el: '.home [data-go="components"]', t: "Components", p: "Components builds a UI kit in your colors and shows it on real pages, with about 120 libraries to browse when you need a starting point." },
      { el: "#brand", t: "Feeling lucky?", p: "Clicking the logo rolls a new look across the Studio, Palettes and Components together, and holding it keeps rolling until you press it again.",
        tasks: [{ label: "Click the logo", click: "#brand" }], ok: "All three cards picked up the new look." },
      { el: '.home [data-go="studio"]', t: "Start in the Studio", p: "Open the Studio card, and the next tour will walk you through recoloring, rolling and animating a design of your own.",
        tasks: [{ label: "Open the Studio", click: '.home [data-go="studio"]' }], ok: "Opening the Studio for you." },
    ],
    studio: [
      { el: ".app > .slots", t: "Build panel", p: "The Build panel contains the layers which make up your design. Clicking on any one of the tiles opens the options of the corresponding layer.",
        tasks: [{ label: "Open any layer", click: ".app > .slots [data-slot]" }], ok: "That layer's options are open now, in a panel of their own." },
      { el: '[data-slot="colors"]', t: "Layer options", p: "Let's open the [Colors] layer, and pick one of the Curated palettes.",
        start: () => document.querySelector('#palTabs [data-v="Curated"]:not(.on)')?.click(),
        tasks: [{ label: "Open the Colors layer", click: '[data-slot="colors"]', pre: () => shown("#palettes") },
          { label: "Pick a palette", click: "#palettes .pal", el: "#palettes", side: true, p: "Now, let's pick a new palette.", pSkip: "Your [Colors] layer is already open, so let's pick one of the Curated palettes." }],
        ok: "Good job! Note that when we change certain settings, layer previews change accordingly.",
        hints: [{ el: "#slotList .tile-th", max: 3 }] },
      { el: "#variation, #surprise", view: ".app > .stage", t: "Rolling new looks", anyOrder: true,
        p: "[Surprise] draws a new look from presets with somewhat randomized settings.\nThe [Variation] button just slightly changes the look.",
        tasks: [{ label: "Press Surprise", click: "#surprise" }, { label: "Press Variation", click: "#variation" }],
        ok: "If you are feeling really random, you can turn off “Safe values” and turn on “Extreme values” in the settings for true randomness.",
        hints: [{ el: "#settingsBtn" }] },
      { el: "#undo, #redo", view: ".app > .stage", t: "Undo and redo", p: "If you liked the look you had, you can always undo or redo.",
        tasks: [{ label: "Press Undo", click: "#undo" }, { label: "Press Redo", click: "#redo" }], ok: "Your keyboard's undo and redo shortcuts work here too." },
      { el: '[data-slot="motion"]', t: "Animating designs", p: "Any design you make can move, I'm tired of explaining this to people, so let's open [Motion], and pick an option to watch your canvas come to life!", media: "motion:drift",
        tasks: [{ label: "Open the Motion layer", click: '[data-slot="motion"]', pre: () => shown("#motionType") }, { label: "Pick a motion", until: () => (root.Studio?.state?.().motion?.type || "still") !== "still", el: "#motionType", aim: '#motionType button:not(.on)', side: true }], ok: "Your canvas plays the motion now, and Export can save it as a video or GIF." },
      { el: '[data-slot="addfx"]', t: "Stacking effects", p: "Effects sit on top of your design in the order you add them, from glass and blur to print textures, and some of them have special interactions with Motion and other Effects.", start: (c) => (c.fx0 = fxCount()),
        tasks: [{ label: "Open Add effect", click: '[data-slot="addfx"]' }, { label: "Add any effect from the gallery", until: (c) => fxCount() > c.fx0, el: "#fxGallery", aim: "#fxGallery .fx-card", side: true }], ok: "Drag an effect tile up or down to change the order." },
      { el: "#wrap", t: "Canvas nodes", p: "You can drag points, objects and effect handles directly on the canvas, and the canvas itself can be resized by dragging the edges. {Click here} for a preset with handles.",
        action: () => root.Studio?.usePreset?.("Dusk"), start: watchCanvas,
        tasks: [{ label: "Drag a handle", until: (c) => c.dragged, need: hasHandles, why: "This design has none yet", el: "#art", aim: "#ov .pt, #ov .fc, #ov .ob" },
          { label: "Resize the canvas", until: (c) => sizeOf() !== c.size0, el: "#wrap", aim: ".rz-e" }],
        ok: "For fine tuning, you can manually change the size of the canvas in the navbar, and the position of things in the layer settings.",
        hints: [{ el: ".top .size" }, { el: ".app > .options" }] },
      { el: "#designsBtn, #shareBtn, #exportBtn, .top-right .pop:not([hidden])", side: true, t: "Exporting and sharing", anyOrder: true,
        p: "Export your design in whatever file is convenient for you. You can share your designs with friends, and save them locally in-browser or on-device.",
        tasks: [{ label: "Check out Export", click: "#exportBtn" }, { label: "Check out Share", click: "#shareBtn" }, { label: "Check out Designs", click: "#designsBtn" }],
        ok: "Designs also keeps a version of each save, so an older take is never lost." },
      { center: true, finale: true, t: "You're ready to make something", p: "Everything you made during the tour is still on your canvas, and Settings can replay this tour whenever you want a refresher.", next: "Start designing" },
    ],
  };
  const HAND_D = "M15 24V12.5a2.6 2.6 0 0 1 5.2 0V21m0-1V9.6a2.6 2.6 0 0 1 5.2 0V21m0-1v-8a2.6 2.6 0 0 1 5.2 0v10m0-2.5v-3a2.6 2.6 0 0 1 5.2 0V27c0 7.6-5.4 13-12.6 13-5.1 0-8.4-2.6-10.4-6.6l-4.3-8.6a2.6 2.6 0 0 1 4.5-2.6L15 24";
  const HAND_FILL = "M15 24V12.5a2.6 2.6 0 0 1 5.2 0V9.6a2.6 2.6 0 0 1 5.2 0V12a2.6 2.6 0 0 1 5.2 0v5.5a2.6 2.6 0 0 1 5.2 0V27c0 7.6-5.4 13-12.6 13-5.1 0-8.4-2.6-10.4-6.6l-4.3-8.6a2.6 2.6 0 0 1 4.5-2.6L15 24Z";
  // A small marble swatch in the Isoline colors for the hand, drawn once.
  let marble = "";
  function marbleURL() {
    if (marble) return marble;
    try {
      const W = 112, c = document.createElement("canvas"); c.width = c.height = W;
      const x = c.getContext("2d"), img = x.createImageData(W, W);
      const h = (i, j) => { const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return n - Math.floor(n); };
      const noise = (u, v) => { const i = Math.floor(u), j = Math.floor(v), f = u - i, g = v - j, a = f * f * (3 - 2 * f), b = g * g * (3 - 2 * g);
        return (h(i, j) * (1 - a) + h(i + 1, j) * a) * (1 - b) + (h(i, j + 1) * (1 - a) + h(i + 1, j + 1) * a) * b; };
      const fbm = (u, v) => noise(u, v) * 0.55 + noise(u * 2.1 + 5.2, v * 2.1 + 1.3) * 0.3 + noise(u * 4.3 + 9.1, v * 4.3 + 7.7) * 0.15;
      // Bold bands through the Isoline colors, bent by two layers of noise.
      const P = [[244, 241, 236], [232, 87, 42], [244, 241, 236], [28, 28, 30], [85, 81, 76]], S = 1.7;
      for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
        const u = i / W * S, v = j / W * S, wu = u + 1.3 * fbm(u + 1.7, v + 9.2), wv = v + 1.3 * fbm(u + 8.3, v + 2.8);
        const t = wu * 0.9 + wv * 0.55 + 1.6 * fbm(wu * 1.3, wv * 1.3), x5 = (((t * 1.35) % 1) + 1) % 1 * P.length;
        const k = Math.floor(x5) % P.length, f = x5 - Math.floor(x5), e0 = Math.min(1, Math.max(0, (f - 0.78) / 0.22)), e = e0 * e0 * (3 - 2 * e0);
        const A = P[k], B = P[(k + 1) % P.length], o = (j * W + i) * 4;
        img.data[o] = A[0] + (B[0] - A[0]) * e; img.data[o + 1] = A[1] + (B[1] - A[1]) * e; img.data[o + 2] = A[2] + (B[2] - A[2]) * e; img.data[o + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      marble = c.toDataURL();
    } catch (e) { marble = ""; }
    return marble;
  }
  const handMask = () => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44"><path d="${HAND_FILL}"/></svg>`)}")`;
  const handHTML = () => {
    return `<span class="tp-hand"><i class="tp-skin"></i><svg class="tp-edge" viewBox="0 0 44 44" aria-hidden="true"><path d="${HAND_D}"/></svg></span>`;
  };
  const CHECK = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.2 8.4l2.6 2.6 5-5.4"/></svg>`;
  function guidedTour(name) {
    const STEPS = GUIDED[name];
    const T = (x) => root.I18N?.t?.(x) ?? x;
    mark(KEY(name));
    const moving = root.Shell?.route !== name;
    if (moving) root.Shell?.go(name);
    const spotEl = document.createElement("div"), tip = document.createElement("div"), dot = document.createElement("div");
    spotEl.className = "tour-spot js"; tip.className = "tour-tip v3"; dot.className = "tp tour-dot";
    // The dim layer: one sheet with a cut-out for the outline and one for each hint, plus the dashed hint rings and arrows.
    const NS = "http://www.w3.org/2000/svg", vid = "tvm" + Math.random().toString(36).slice(2, 8), veil = document.createElementNS(NS, "svg");
    veil.setAttribute("class", "tour-veil"); veil.setAttribute("aria-hidden", "true");
    veil.innerHTML = `<defs><mask id="${vid}" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"><rect width="100%" height="100%" fill="#fff"/><g class="tv-holes"></g></mask></defs><rect class="tv-dim" width="100%" height="100%" mask="url(#${vid})"/><g class="tv-trails"></g><g class="tv-rings"></g>`;
    const holesG = veil.querySelector(".tv-holes"), trailsG = veil.querySelector(".tv-trails"), ringsG = veil.querySelector(".tv-rings");
    tip.setAttribute("role", "dialog"); tip.setAttribute("aria-live", "polite");
    dot.innerHTML = handHTML(); dot.setAttribute("aria-label", T("Show it"));
    { const sk = dot.querySelector(".tp-skin"), mk = handMask(); sk.style.webkitMaskImage = mk; sk.style.maskImage = mk; sk.style.backgroundImage = `url("${marbleURL()}")`; }
    document.body.append(veil, spotEl, tip, dot);
    const touch = matchMedia("(pointer: coarse)").matches;
    if (touch) dot.classList.add("touch");
    // A softer, slower spring for the guided tours.
    const cur = pointer(dot, 0.03, 0.5);
    cur.place(innerWidth / 2, innerHeight + 40);
    const N = STEPS.filter((x) => !x.center).length, chapterOf = (n) => STEPS.slice(0, n + 1).filter((x) => !x.center).length;
    // Small or touch screens dock the card at the bottom; short landscape screens dock it on the right.
    const docked = () => innerWidth <= 900 || (touch && innerWidth <= 1180);
    const sideDock = () => docked() && innerHeight < 560 && innerWidth > innerHeight * 1.3;
    let i = -1, busy = false, offs = [], ctx = {}, doneT = 0, alive = true, away = null, raf = 0;
    const off = () => { offs.forEach((f) => f()); offs = []; clearTimeout(doneT); };
    const s = () => STEPS[i];
    const usable = (t) => !t.need || t.need(ctx);
    const nextTask = () => (s()?.tasks || []).find((t) => !t.done && usable(t));
    // The next thing to do, or once the list is done, the last thing done, so the spotlight stays put while you read.
    const target = () => { const ts = s()?.tasks || [], t = nextTask() || [...ts].reverse().find((x) => x.done) || ts[ts.length - 1]; return t?.el ? { el: t.el, side: t.side } : s(); };
    dot.addEventListener("click", () => { if (away) point(); });

    // Everything that follows a target runs here, once per frame: the spotlight eases to a new target and then
    // stays locked to it, the card follows on wide screens, and the pointer springs toward where it belongs.
    // Outline and card motion: a smooth ease-in-out when the tour moves to a new target (aimed at where the target
    // is right now, so it lands even if you scroll mid-move), then a gentle ease that trails your scrolling by a beat.
    const box = { l: innerWidth / 2, t: innerHeight / 2, w: 0, h: 0 }, tipAt = { x: NaN, y: NaN };
    let lastEl = null, anchor = null, lastTs = 0, dt = 1 / 60, tween = null, tipTween = null, lastGoal = null;
    const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const follow = (o, goal, keys, tw, tau) => {
      if (reduce.matches) { for (const k of keys) o[k] = goal[k]; return null; }
      if (tw) {
        const p = Math.min(1, (performance.now() - tw.t0) / tw.dur), e = inOut(p);
        for (const k of keys) o[k] = tw.from[k] + (goal[k] - tw.from[k]) * e;
        return p < 1 ? tw : null;
      }
      const a = 1 - Math.exp(-dt / tau);
      for (const k of keys) { o[k] += (goal[k] - o[k]) * a; if (Math.abs(goal[k] - o[k]) < 0.05) o[k] = goal[k]; }
      return null;
    };
    function frameLoop(ts) {
      if (!alive) return;
      raf = requestAnimationFrame(frameLoop);
      dt = Math.min(1 / 30, Math.max(1 / 240, ((ts || 0) - lastTs) / 1000 || 1 / 60)); lastTs = ts || 0;
      if (i < 0) return;
      const st = s(), dock = docked(), side = sideDock(), m = 12;
      tip.classList.toggle("dock", dock); tip.classList.toggle("side", side);
      let goal, aim, el = null, r = null, floor = innerHeight - 4, wall = innerWidth - 4;
      if (st.center) {
        goal = { l: innerWidth / 2, t: innerHeight / 2, w: 0, h: 0 };
        if (!dock) { const tw = tip.offsetWidth, th = tip.offsetHeight; moveTip((innerWidth - tw) / 2, Math.max(m, (innerHeight - th) / 2), false); }
        const tb = tip.getBoundingClientRect();
        aim = st.hand ? [Math.min(innerWidth - 34, tb.right - 40), Math.max(34, tb.top - 30)] : null;
        setAway(null);
      } else {
        const tg = target(); el = document.querySelector(tg.el); r = boxOf(tg);
        // A panel mid re-render can report no size for a moment: hold still instead of jumping to the corner.
        if (!r || (!r.width && !r.height)) return;
        const tb = tip.getBoundingClientRect();
        if (dock && !side) floor = tb.top - 10; else if (dock && side) wall = tb.left - 10;
        const pad = 6;
        goal = { l: r.left - pad, t: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
        if (!dock) {
          const tw = tip.offsetWidth, th = tip.offsetHeight;
          let x = r.left + r.width / 2 - tw / 2, y = r.bottom + 14;
          if (y + th > innerHeight - m) y = r.top - th - 14;
          if (tg.side || y < m) { y = Math.min(innerHeight - th - m, Math.max(m, r.top + r.height / 2 - th / 2)); x = r.right + 14 + tw < innerWidth - m ? r.right + 14 : r.left - tw - 14; }
          moveTip(Math.max(m, Math.min(innerWidth - tw - m, x)), Math.max(m, Math.min(innerHeight - th - m, y)), el !== lastEl);
        }
        // While the outline is split into hints, the pointers belong to the hints, so no off-screen arrow.
        const dir = split && !split.merging ? null : r.bottom < 10 ? "up" : r.top > floor - 10 ? "down" : null;
        setAway(dir);
        // Point at something you can actually press: the first visible match for the task inside the outline.
        const hit = clickable(r, floor);
        aim = dir ? [Math.max(34, Math.min(wall - 34, r.left + r.width / 2)), dir === "up" ? 36 : floor - 36]
                  : hit ? [hit.left + hit.width / 2, Math.min(Math.max(hit.top + hit.height / 2, 14), floor - 14)]
                  : [r.left + r.width * 0.5, Math.min(Math.max(r.top + Math.min(r.height * 0.5, 40), 14), floor - 14)];
      }
      // Spotlight: position and size move together, so it keeps its shape while it travels.
      if (el !== lastEl) { anchor = null; tween = { from: { ...box }, t0: performance.now(), dur: 520 }; }
      tween = follow(box, goal, ["l", "t", "w", "h"], tween, 0.085);
      Object.assign(spotEl.style, { left: box.l + "px", top: box.t + "px", width: Math.max(0, box.w) + "px", height: Math.max(0, box.h) + "px" });
      // Pointer: ride along with the target while it scrolls, then spring toward its spot.
      anchor = r ? [r.left, r.top] : null;
      lastEl = el;
      paintHoles([box, ...drawSplit(aim)]);
      if (aim && (!split || split.merging)) cur.aim(aim[0], aim[1], !!st.center);
    }

    // Cut-outs in the dim layer, one per box, with the outline's rounded corners.
    const holeEls = [];
    const lerpBox = (a, b, e) => ({ l: a.l + (b.l - a.l) * e, t: a.t + (b.t - a.t) * e, w: a.w + (b.w - a.w) * e, h: a.h + (b.h - a.h) * e });
    const setRect = (n, b, rx) => {
      const w = Math.max(0, b.w), h = Math.max(0, b.h);
      n.setAttribute("x", b.l.toFixed(1)); n.setAttribute("y", b.t.toFixed(1)); n.setAttribute("width", w.toFixed(1)); n.setAttribute("height", h.toFixed(1)); n.setAttribute("rx", Math.min(rx, w / 2, h / 2).toFixed(1));
    };
    const paintHoles = (list) => {
      while (holeEls.length < list.length) { const n = document.createElementNS(NS, "rect"); n.setAttribute("fill", "#000"); holesG.appendChild(n); holeEls.push(n); }
      holeEls.forEach((n, k) => setRect(n, list[k] || { l: 0, t: 0, w: 0, h: 0 }, 14));
    };

    // The "by the way" part of a step: the outline splits into dashed rings around each hint, and the pointer splits
    // with it. On wide screens each pointer draws a looping arrow on its way and settles into the arrowhead; on small
    // screens the pointers simply move onto the hints. Moving on merges everything back into the one outline and pointer.
    let split = null;
    const endAt = (S, b) => {
      const qx = Math.max(b.l, Math.min(b.l + b.w, S[0])), qy = Math.max(b.t, Math.min(b.t + b.h, S[1])), dx = S[0] - qx, dy = S[1] - qy, d = Math.hypot(dx, dy);
      return d < 1 ? [b.l + b.w / 2, b.t - 10] : [qx + (dx / d) * 9, qy + (dy / d) * 9];
    };
    // A bowed path with one cursive loop in the middle, bulging the same way as the bow.
    const swirlAt = (S, E, sg, t) => {
      const dx = E[0] - S[0], dy = E[1] - S[1], d = Math.hypot(dx, dy) || 1, nx = (-dy / d) * sg, ny = (dx / d) * sg, bow = 0.2 * d;
      const cx = (S[0] + E[0]) / 2 + nx * bow, cy = (S[1] + E[1]) / 2 + ny * bow, u = 1 - t;
      let x = u * u * S[0] + 2 * u * t * cx + t * t * E[0], y = u * u * S[1] + 2 * u * t * cy + t * t * E[1];
      const R = Math.min(20, d * 0.09), a = 0.3, b = 0.64;
      if (R > 5 && t > a && t < b) {
        const q = (t - a) / (b - a), sm = q * q * (3 - 2 * q), th0 = Math.atan2(-ny, -nx), dir = -Math.sign(-Math.sin(th0) * dx + Math.cos(th0) * dy) || 1, th = th0 + dir * Math.PI * 2 * sm;
        x += R * (Math.cos(th) - Math.cos(th0)); y += R * (Math.sin(th) - Math.sin(th0));
      }
      return [x, y];
    };
    const trailD = (it, e) => { const n = Math.max(2, Math.ceil(56 * e)); let d = ""; for (let j = 0; j <= n; j++) { const [x, y] = swirlAt(it.S, it.E, it.sg, (e * j) / n); d += (j ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); } return d; };
    const headD = (it) => { const [x1, y1] = it.E, [x0, y0] = swirlAt(it.S, it.E, it.sg, 0.95), a = Math.atan2(y1 - y0, x1 - x0), L = 9, w = 0.52; return `M${(x1 - L * Math.cos(a - w)).toFixed(1)} ${(y1 - L * Math.sin(a - w)).toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}L${(x1 - L * Math.cos(a + w)).toFixed(1)} ${(y1 - L * Math.sin(a + w)).toFixed(1)}`; };
    function startSplit() {
      const st = s();
      if (!st.hints) return false;
      dropSplit();
      const floorY = docked() && !sideDock() ? tip.getBoundingClientRect().top - 6 : innerHeight, els = [];
      for (const h of st.hints) {
        let n = 0;
        for (const e of document.querySelectorAll(h.el)) {
          if (n >= (h.max || 1)) break;
          const b = e.getBoundingClientRect();
          if (!b.width || b.bottom < 6 || b.top > floorY - 12 || b.right < 0 || b.left > innerWidth) continue;
          els.push(e); n++;
        }
      }
      if (!els.length) return false;
      const arrows = !docked() && !reduce.matches, P0 = cur.pos.slice(), from = { ...box }, tb = tip.getBoundingClientRect();
      // An arrow that would start under the card starts at the card's edge instead, on the side facing its hint.
      const startFor = (el) => {
        const [x, y] = P0;
        if (x < tb.left || x > tb.right || y < tb.top || y > tb.bottom) return P0;
        const b = el.getBoundingClientRect(), dx = b.left + b.width / 2 - x, dy = b.top + b.height / 2 - y;
        const k = Math.min(dx > 0 ? (tb.right - x) / dx : dx < 0 ? (tb.left - x) / dx : Infinity, dy > 0 ? (tb.bottom - y) / dy : dy < 0 ? (tb.top - y) / dy : Infinity), d = Math.hypot(dx, dy) || 1;
        return [x + dx * k + (dx / d) * 10, y + dy * k + (dy / d) * 10];
      };
      split = { arrows, t0: performance.now(), merging: null, items: els.map((el, k) => {
        const S = arrows ? startFor(el) : P0;
        let d = dot, ptr = cur;
        if (k) { d = document.createElement("div"); d.className = "tp tour-dot clone"; document.body.appendChild(d); ptr = pointer(d, 0.03, 0.5); ptr.place(P0[0], P0[1]); }
        const ring = document.createElementNS(NS, "rect"); ring.setAttribute("class", "tv-ring"); ring.style.opacity = 0; ringsG.appendChild(ring);
        const it = { el, d, ptr, ring, from, box: { ...from }, sg: k % 2 ? -1 : 1, S, E: S, dur: 0 };
        if (arrows) {
          it.g = document.createElementNS(NS, "g"); it.g.setAttribute("class", "tv-trail");
          it.g.innerHTML = `<path class="tv-halo tv-ln"/><path class="tv-line tv-ln"/><path class="tv-halo tv-hd"/><path class="tv-line tv-hd"/>`;
          trailsG.appendChild(it.g);
          const b = el.getBoundingClientRect();
          it.dur = Math.min(1150, 620 + Math.hypot(b.left + b.width / 2 - S[0], b.top + b.height / 2 - S[1]) * 0.55);
        }
        return it;
      }) };
      spotEl.classList.add("tour-split"); dot.classList.add("rest");
      return true;
    }
    function drawSplit(mainAim) {
      if (!split) return [];
      const now = performance.now(), m = split.merging, P = m ? Math.min(1, (now - m.t0) / 620) : 0, E = inOut(P), holes = [];
      split.items.forEach((it, k) => {
        const b = it.el.isConnected ? it.el.getBoundingClientRect() : null, pad = 5;
        if (b && b.width) it.goal = { l: b.left - pad, t: b.top - pad, w: b.width + pad * 2, h: b.height + pad * 2 };
        const goal = it.goal || it.box, age = now - split.t0 - k * 90;
        it.box = m ? lerpBox(m.from[k], box, E) : lerpBox(it.from, goal, inOut(Math.min(1, Math.max(0, age / 640))));
        setRect(it.ring, it.box, 12);
        it.ring.style.opacity = m ? 1 - E : Math.min(1, Math.max(0, age / 220));
        holes.push(it.box);
        if (m) {
          const to = mainAim || cur.pos;
          if (it.ptr !== cur) it.ptr.aim(to[0], to[1]);
          if (it.g) it.g.style.opacity = 1 - E;
          return;
        }
        if (!split.arrows) { it.ptr.aim(goal.l + goal.w / 2, goal.t + goal.h / 2); return; }
        it.E = endAt(it.S, goal);
        const t = Math.min(1, Math.max(0, (now - split.t0 - k * 140) / it.dur)), e = inOut(t), line = trailD(it, e), head = headD(it);
        for (const n of it.g.querySelectorAll(".tv-ln")) n.setAttribute("d", line);
        for (const n of it.g.querySelectorAll(".tv-hd")) n.setAttribute("d", head);
        if (t < 1) { const [x, y] = swirlAt(it.S, it.E, it.sg, e); it.ptr.place(x, y); }
        else if (!it.sunk) { it.sunk = true; it.d.classList.add("sunk"); it.g.classList.add("head"); }
      });
      if (m && P >= 1) dropSplit();
      return holes;
    }
    function mergeSplit() {
      if (!split || split.merging) return;
      split.merging = { t0: performance.now(), from: split.items.map((it) => ({ ...it.box })) };
      for (const it of split.items) { it.d.classList.remove("sunk"); it.g?.classList.remove("head"); }
      spotEl.classList.remove("tour-split"); dot.classList.remove("rest");
    }
    function dropSplit() {
      if (!split) return;
      for (const it of split.items) {
        it.ring.remove(); it.g?.remove();
        if (it.ptr === cur) { it.d.classList.remove("sunk"); continue; }
        it.ptr.stop(); it.d.classList.add("gone"); const d = it.d; setTimeout(() => d.remove(), 320);
      }
      split = null; spotEl.classList.remove("tour-split"); dot.classList.remove("rest");
    }
    function clickable(r, floor) {
      const ts = s()?.tasks || [], t = nextTask() || ts[ts.length - 1], sel = t?.aim || t?.click;
      if (!sel) return null;
      for (const n of document.querySelectorAll(sel)) {
        const b = n.getBoundingClientRect();
        if (b.width && b.height && b.bottom > 8 && b.top < floor - 8 && b.left >= r.left - 2 && b.right <= r.right + 2 && b.top >= r.top - 2 && b.bottom <= r.bottom + 2) return b;
      }
      return null;
    }
    function moveTip(x, y, fresh) {
      if (isNaN(tipAt.x)) { tipAt.x = x; tipAt.y = y; }
      else { if (fresh) tipTween = { from: { ...tipAt }, t0: performance.now(), dur: 520 }; tipTween = follow(tipAt, { x, y }, ["x", "y"], tipTween, 0.1); }
      tip.style.translate = `${tipAt.x}px ${tipAt.y}px`;
    }
    function setAway(dir) {
      if (dir === away) return;
      away = dir;
      dot.classList.toggle("arrow", !!dir); dot.classList.toggle("down", dir === "down");
      spotEl.classList.toggle("away", !!dir);
    }

    // One scroller for the whole tour: wait for any scroll the app started, then ease the panel that holds the
    // target and the page together, and check the result in case the layout moved while we scrolled.
    let scrollStop = null;
    const scroller = (el) => { for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 2) return n; } return null; };
    const quiet = async () => { let last = "", same = 0; for (let k = 0; k < 40 && same < 3; k++) { await frame(); const now = scrollY + ":" + [...document.querySelectorAll(".options, .slots")].map((n) => n.scrollTop).join(","); same = now === last ? same + 1 : 0; last = now; } };
    const curve = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    async function reveal(el, roomTop, roomBottom) {
      scrollStop?.();
      let stopped = false; const stop = () => (stopped = true);
      scrollStop = () => { stop(); removeEventListener("touchstart", stop, true); removeEventListener("wheel", stop, true); };
      addEventListener("touchstart", stop, { capture: true, passive: true }); addEventListener("wheel", stop, { capture: true, passive: true });
      await quiet();
      for (let pass = 0; pass < 2 && !stopped; pass++) {
        const r = el.getBoundingClientRect(), sc = scroller(el), want = Math.min(r.height, roomBottom - roomTop);
        let dy = r.top < roomTop ? r.top - roomTop - 8 : r.top + want > roomBottom ? r.top + want - roomBottom + 8 : 0;
        if (Math.abs(dy) < 2) break;
        const moves = [];
        if (sc) { const b = sc.getBoundingClientRect(), inner = Math.max(-sc.scrollTop, Math.min(sc.scrollHeight - sc.clientHeight - sc.scrollTop, dy - (b.top < roomTop ? b.top - roomTop : 0))); if (Math.abs(inner) > 1 && b.top >= roomTop - 4 && b.bottom <= roomBottom + 4) { moves.push([sc, sc.scrollTop, inner]); dy -= inner; } }
        if (Math.abs(dy) > 1) moves.push([null, scrollY, dy]);
        const dur = reduce.matches ? 0 : Math.min(700, 280 + Math.abs(moves.reduce((a, mv) => a + mv[2], 0)) * 0.4);
        for (const t0 = performance.now(); !stopped; ) {
          const t = dur ? Math.min(1, (performance.now() - t0) / dur) : 1, e = curve(t);
          for (const [n, from, by] of moves) { if (n) n.scrollTop = from + by * e; else window.scrollTo(scrollX, from + by * e); }
          if (t >= 1) break;
          await frame();
        }
      }
      scrollStop();
    }
    // Room under the docked card, so anything on the page can scroll up above it.
    const pad = () => {
      const on = docked() && !sideDock() && !!tip.offsetHeight;
      document.documentElement.classList.toggle("tour-docked", on);
      if (on) document.documentElement.style.setProperty("--tour-pad", tip.offsetHeight + 24 + "px");
    };
    const point = async () => {
      if (s().center) return;
      const el = document.querySelector(s().view || target().el); if (!el) return;
      pad(); await frame();
      const floor = docked() && !sideDock() ? tip.getBoundingClientRect().top - 12 : innerHeight - 12;
      await reveal(el, 12, floor);
    };

    // Feedback when something is done: the pointer pops (and on touch turns back into a cursor for a moment),
    // the check draws itself, and once the list is done a success line slides in while Next fills up as a countdown.
    const pop = () => {
      if (reduce.matches) return;
      cur.click();
      dot.animate([{ scale: 1 }, { scale: 1.45 }, { scale: 1 }], { duration: 420, easing: "cubic-bezier(.3,1.5,.5,1)" });
      if (touch) { dot.classList.add("rest"); setTimeout(() => dot.classList.remove("rest"), 900); }
    };
    // Descriptions: [word] marks a control by name, {text} is a link that runs the step's action, and a new line breaks.
    const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const rich = (x) => esc(T(x)).replace(/\[([^\]]+)\]/g, '<u class="tour-term">$1</u>').replace(/\{([^}]+)\}/g, '<button type="button" class="tour-link" data-a="do">$1</button>').replace(/\n/g, "<br>");
    // What the description says right now: the step's text, the next task's own line once earlier ones are done,
    // or the step's result once everything is.
    const descFor = () => {
      const st = s(), ts = st.tasks || [], nt = nextTask();
      if (!ts.length) return st.p;
      if (!nt) return ts.some((t) => t.done) ? st.ok || st.p : st.p;
      const k = ts.indexOf(nt);
      if (st.anyOrder || !nt.p || k === 0) return st.p;
      return nt.pSkip && ts.slice(0, k).every((t) => t.skipped) ? nt.pSkip : nt.p;
    };
    // A new description fades in tinted with the accent, then settles to the normal text color: one pulse.
    const setDesc = (x, pulse) => {
      const p = tip.querySelector(".tour-desc");
      if (!p || !x || p._x === x) return;
      const first = p._x == null; p._x = x; p.innerHTML = rich(x);
      if (!pulse || first || reduce.matches) return;
      const a = getComputedStyle(tip).getPropertyValue("--accent").trim() || "#e8572a", n = getComputedStyle(p).color;
      p.animate([{ color: a, opacity: 0, translate: "0 4px" }, { color: a, opacity: 1, translate: "0 0", offset: 0.2 }, { color: a, offset: 0.42 }, { color: n }], { duration: 1500, easing: "cubic-bezier(.3,.6,.4,1)" });
    };
    // Keeps the list in step with the page: which task is next, which can't be done yet, and the matching text.
    const refresh = () => {
      if (tip.classList.contains("done")) return;
      const nt = nextTask();
      (s().tasks || []).forEach((t, k) => { const li = tip.querySelector(`li[data-k="${k}"]`); if (!li) return; li.classList.toggle("off", !t.done && !usable(t)); li.classList.toggle("cur", t === nt); });
      setDesc(descFor(), true);
    };
    const tick = (t, li) => {
      t.done = true; li.classList.add("done"); li.classList.remove("cur");
      pop();
      if (!reduce.matches) li.querySelector(".tk").animate([{ scale: 0.6 }, { scale: 1.22 }, { scale: 1 }], { duration: 420, easing: "cubic-bezier(.3,1.5,.5,1)" });
      if (nextTask()) { refresh(); setTimeout(point, 250); return; }
      finished();
    };
    const finished = () => {
      if (tip.classList.contains("done")) return;
      const bar = tip.querySelector(".tour-prog i");
      if (bar) bar.style.width = (chapterOf(i) / N) * 100 + "%";
      tip.querySelectorAll(".tour-tasks li").forEach((li) => li.classList.remove("cur"));
      tip.classList.add("done");
      setDesc(s().ok, true);
      let hinted = startSplit();
      // Hints off screen (the layer previews sit above the panel on a phone): scroll them into view, then split.
      if (!hinted && s().hints) {
        const h = document.querySelector(s().hints[0].el), at = i;
        hinted = !!h;
        if (h) (async () => { await wait(600); if (!tour || i !== at) return; pad(); await reveal(h, 12, docked() && !sideDock() ? tip.getBoundingClientRect().top - 12 : innerHeight - 12); if (tour && i === at && tip.classList.contains("done")) startSplit(); })();
      }
      if (!reduce.matches) tip.animate([{ boxShadow: "var(--pop), 0 0 0 0 color-mix(in srgb, var(--accent) 55%, transparent)" }, { boxShadow: "var(--pop), 0 0 0 10px transparent" }], { duration: 700, easing: "ease-out" });
      const nx = tip.querySelector('[data-a="next"]'), wait2 = s().tasks?.some((t) => t.click === '.home [data-go="studio"]') ? 0 : hinted ? 4800 : 3400;
      nx.querySelector("span").textContent = T(s().next || "Next"); nx.classList.replace("ghost", "primary");
      if (!wait2) return;
      const fill = nx.querySelector(".cd");
      nx.classList.add("counting");
      if (fill && !reduce.matches) fill.animate([{ scale: "0 1" }, { scale: "1 1" }], { duration: wait2, easing: "linear", fill: "forwards" });
      const at = i; doneT = setTimeout(() => { if (tour && i === at) go(i + 1); }, wait2);
    };
    const arm = () => {
      (s().tasks || []).forEach((t, k) => {
        if (t.done) return;
        const hit = () => { if (t.done || !tour) return; const li = tip.querySelector(`li[data-k="${k}"]`); if (li) tick(t, li); };
        if (t.click) {
          // Earlier tasks first: a click only counts once the list reaches it.
          const h = (e) => { if (!tip.contains(e.target) && e.target.closest?.(t.click) && (s().anyOrder ? !t.done && usable(t) : nextTask() === t)) setTimeout(hit, 220); };
          document.addEventListener("pointerdown", h, true); document.addEventListener("click", h, true);
          offs.push(() => { document.removeEventListener("pointerdown", h, true); document.removeEventListener("click", h, true); });
        } else {
          const id = setInterval(() => { try { if ((s().anyOrder ? usable(t) : nextTask() === t) && t.until(ctx)) hit(); } catch (e) {} }, 200);
          offs.push(() => clearInterval(id));
        }
      });
      const rid = setInterval(refresh, 300);
      offs.push(() => clearInterval(rid));
    };
    const render = () => {
      const st = s(), ch = chapterOf(i);
      const head = st.center ? "" : `<div class="tour-prog"><i style="width:${((ch - (st.tasks ? 1 : 0)) / N) * 100}%"></i></div><span class="tour-kicker">${T("Step")} ${ch} ${T("of")} ${N}</span>`;
      const nt = nextTask();
      const tasks = st.tasks ? `<ul class="tour-tasks">${st.tasks.map((t, k) => `<li data-k="${k}" class="${t.done ? "done" : t === nt ? "cur" : !usable(t) ? "off" : ""}"><span class="tk">${CHECK}</span><span>${T(t.label)}${t.why ? `<em class="tk-why">${T(t.why)}</em>` : ""}</span></li>`).join("")}</ul>` : "";
      tip.classList.toggle("hero", !!st.center); tip.classList.remove("done");
      const back = STEPS.slice(0, i).some((x) => !x.center) && !st.finale;
      tip.innerHTML = `${head}<b>${T(st.t)}</b><p class="tour-desc"></p>${tasks}<div class="tour-acts">${st.finale ? "" : `<button class="btn sm ghost" data-a="end">${T(st.skip || "End tour")}</button>`}<span class="grow"></span>${back ? `<button class="btn sm" data-a="back">${T("Back")}</button>` : ""}<button class="btn sm ${st.tasks ? "ghost" : "primary"}" data-a="next"><i class="cd"></i><span>${T(st.tasks ? "Skip" : st.next || "Next")}</span></button></div>`;
      setDesc(descFor(), false);
      if (st.media) tip.insertBefore(mediaFor(st.media), tip.querySelector("p"));
    };
    const go = async (n) => {
      if (busy || !tour) return;
      if (n >= STEPS.length) return finish();
      if (n < 0) return;
      busy = true; off(); scrollStop?.(); mergeSplit();
      tip.classList.add("moving");
      await wait(i < 0 ? 0 : 200);
      if (!tour) return;
      i = n; ctx = {};
      for (const t of s().tasks || []) t.done = t.skipped = false;
      const stop = s().start?.(ctx);
      if (typeof stop === "function") offs.push(stop);
      // Tasks you already did on the way (like opening Colors in the last step) start ticked.
      for (const t of s().tasks || []) { try { if (t.pre?.(ctx)) t.done = t.skipped = true; } catch (e) {} }
      dot.classList.toggle("hand", !!s().hand);
      spotEl.classList.toggle("center", !!s().center);
      render(); pad();
      tip.classList.remove("moving");
      arm();
      if (s().tasks?.length && !nextTask() && s().tasks.every((t) => t.done)) finished();
      tip.querySelector('[data-a="next"]').focus({ preventScroll: true });
      busy = false;
      if (s().finale && !reduce.matches) { const r = tip.getBoundingClientRect(); for (let k = 0; k < 3; k++) setTimeout(() => root.sparks?.(r.left + r.width * (0.2 + 0.3 * k), r.top + 6), k * 140); }
      await point();
    };
    const cleanup = () => {
      alive = false; cancelAnimationFrame(raf);
      off(); scrollStop?.(); dropSplit(); document.body.classList.remove("touring"); document.documentElement.classList.remove("tour-docked");
      removeEventListener("keydown", key, true);
      tour = null;
      for (const n of [spotEl, tip, veil]) { n.classList.add("gone"); setTimeout(() => n.remove(), 320); }
    };
    const end = () => { cleanup(); cur.stop(); dot.classList.add("gone"); setTimeout(() => dot.remove(), 320); };
    const finish = async () => {
      cleanup(); dot.classList.remove("hand", "touch", "arrow");
      if (name === "home") { dot.classList.add("gone"); setTimeout(() => { cur.stop(); dot.remove(); }, 320); return; }
      await swirlHome(cur, dot);
    };
    const key = (e) => { if (e.key === "Escape") { e.stopPropagation(); end(); } else if (e.key === "ArrowRight") go(i + 1); else if (e.key === "ArrowLeft") go(i - 1); };
    tip.onclick = (e) => { const a = e.target.closest("[data-a]")?.dataset.a; if (a === "next") go(i + 1); else if (a === "back") go(i - 1); else if (a === "end") end(); else if (a === "do") { s().action?.(ctx); setTimeout(refresh, 400); } };
    addEventListener("keydown", key, true);
    tour = { end, name };
    document.body.classList.add("touring");
    frameLoop();
    setTimeout(() => go(0), moving ? 760 : 160);
  }

  async function swirlHome(cur, dot) {
    const b = $("settingsBtn").getBoundingClientRect(), tx = b.left + b.width / 2, ty = b.top + b.height / 2;
    const [sx, sy] = cur.pos, full = Math.hypot(tx - sx, ty - sy), CURL = 180, far = full > CURL * 1.3;
    const k = far ? 1 - CURL / full : 0, x0 = sx + (tx - sx) * k, y0 = sy + (ty - sy) * k, glide = full * k;
    const dist = Math.hypot(tx - x0, ty - y0), R = Math.min(110, Math.max(40, dist * 0.22), innerWidth * 0.13);
    const dir = x0 < tx ? 1 : -1, turns = 1.6, a0 = Math.atan2(ty - y0, tx - x0) + (Math.PI / 2) * dir;
    const T2 = 1900, T1 = far ? Math.min(1100, 380 + glide * 0.9) : 0, T = T1 + T2;
    const v = (2 * dist) / T2, m = (v * T1) / Math.max(1, glide);
    await cur.along((t) => {
      const ms = t * T;
      if (ms < T1) {
        const q = ms / T1, h = 3 * q * q - 2 * q * q * q + m * (q * q * q - q * q);
        return [sx + (x0 - sx) * h, sy + (y0 - sy) * h];
      }
      const u = (ms - T1) / T2, e = far ? 1 - (1 - u) * (1 - u) : u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const r = R * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.08)), far ? 3.2 : 1.3), a = a0 + dir * turns * Math.PI * 2 * u;
      return [x0 + (tx - x0) * e + Math.cos(a) * r, y0 + (ty - y0) * e + Math.sin(a) * r];
    }, T);
    dot.animate([{ scale: 1, opacity: 1 }, { scale: 0.2, opacity: 0 }], { duration: 220, easing: "ease-in", fill: "forwards" });
    root.sparks?.(tx, ty);
    $("settingsBtn").animate([{ scale: 1 }, { scale: 1.12 }, { scale: 1 }], { duration: 360, easing: "cubic-bezier(.3,1.5,.5,1)" });
    setTimeout(() => { cur.stop(); dot.remove(); }, 260);
  }

  function showFor(r) { if (PANE && (r === "studio" || !TOURS[r])) openPane(); else startTour(TOURS[r] ? r : "studio"); }

  const offered = new Set();
  function onRoute(r) {
    if (tour && tour.name !== r) tour.end();
    if (offered.has(r) || navigator.webdriver || /[?&]d=/.test(location.hash) || !TOURS[r]) return;
    if (seen(KEY(r))) return;
    offered.add(r);
    (root.introDone || Promise.resolve()).then(() => setTimeout(() => {
      if (root.Shell?.route !== r || tour || (pane && !pane.el.hidden) || document.querySelector(".modal:not([hidden])")) return;
      if (r === "studio" && PANE) openPane(); else startTour(r);
    }, r === "home" ? 700 : 900));
  }
  root.Tour = { open: openPane, start: startTour, show: showFor, onRoute };
  if (root.Shell?.route) onRoute(root.Shell.route);
})(window);
