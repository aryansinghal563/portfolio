(function () {
  const NS = "http://www.w3.org/2000/svg";
  const P = {
    pink: "#ff2a6d",
    cyan: "#05d9e8",
    gold: "#f8b800",
    purple: "#9d4edd",
    mag: "#ff6ac1",
    green: "#18c17c",
  };

  const TW = 26,
    NQ = 22,
    NR = 22,
    OX = 572,
    OY = 130,
    VW = 1144,
    VH = 762;

  const RIVER_LO = 20,
    RIVER_HI = 22,
    BRQ = 15,
    BRR = 15;
  const QST = [4, 10, 15, 20],
    RST = [4, 10, 15];

  const px = (q, r) => [OX + (q - r) * TW, OY + (q + r) * TW * 0.5];
  const ctr = (q, r) => {
    const p = px(q, r);
    return [p[0], p[1] + TW * 0.5];
  };
  const S = (q, r) => q + r;
  const SIDE = (q, r) => q - r;
  const isRiver = (q, r) => S(q, r) >= RIVER_LO && S(q, r) <= RIVER_HI;
  const isBank = (q, r) => S(q, r) === RIVER_LO - 1 || S(q, r) === RIVER_HI + 1;
  const isRamp = (q, r) => isBank(q, r) && (q === BRQ || r === BRR);
  const isSt = (q, r) =>
    !isRiver(q, r) && !isBank(q, r) && (QST.includes(q) || RST.includes(r));
  const inPark = (q, r) => S(q, r) >= 24 && SIDE(q, r) <= -6;
  const inHarbor = (q, r) => S(q, r) >= 24 && SIDE(q, r) >= 9;

  const CONS = [
    [2, 8],
    [3, 8],
    [2, 9],
    [3, 9],
  ];
  const CONS_SET = new Set(CONS.map((c) => c.join(",")));

  const PROJECTS = [
    {
      q: 9,
      r: 6,
      h: 78,
      c: P.pink,
      label: "JUDGE.EXE",
      kick: "PROJECT",
      title: "Code Judge Engine",
      body: "One Docker container per submission. AC / WA / TLE / MLE verdicts, RabbitMQ keeps the queue moving.",
      stack: "Node.js · Docker · RabbitMQ · Prisma",
      url: "https://github.com/aryansinghal563",
    },
    {
      q: 6,
      r: 8,
      h: 58,
      c: P.cyan,
      label: "DOCK.EXE",
      kick: "PROJECT",
      title: "Vivaldi Media Dock",
      body: "Artwork aware mini media player living inside Vivaldi's vertical tab bar. Playback, theming and audio reactive visuals.",
      stack: "JavaScript · Web Audio",
      url: "https://github.com/aryansinghal563/vivaldi-media-player",
    },
  ];

  const INTERNS = [
    {
      q: 13,
      r: 3,
      h: 86,
      c: P.gold,
      label: "LK / SCHNEIDER",
      kick: "INTERNSHIP · JUN—JUL 2026",
      title: "Lauritz Knudsen",
      body: "Built a web based testing workflow portal for the Switchgear Testing Laboratories.",
      stack: "Schneider Electric India",
    },
    {
      q: 16,
      r: 2,
      h: 70,
      c: P.mag,
      label: "NEUROBINARIES",
      kick: "INTERNSHIP · JUN—JUL 2026",
      title: "NeuroBinaries",
      body: "Design and architecture of an e-commerce backend system, from core components to technical design.",
      stack: "Backend architecture",
    },
  ];

  const DOME = [2, 12],
    BILL = [9, 9],
    BENCH = [11, 17],
    MAST = [12, 18],
    WHEEL = [5, 18],
    HCRANE = [18, 7];

  const BASCULE = (76 * Math.PI) / 180;

  let UID = 0;

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const poly = (pts, fill, parent, extra) =>
    el("polygon", Object.assign({ points: pts, fill: fill }, extra || {}), parent);

  function sh(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return "rgb(" + c((n >> 16) & 255) + "," + c((n >> 8) & 255) + "," + c(n & 255) + ")";
  }

  class PixelCity extends HTMLElement {
    connectedCallback() {
      if (this._built) {
        this._watch();
        return;
      }
      this._built = 1;
      this.uid = "pc" + ++UID;
      this.seed = 20260825;
      this.wins = [];
      this.waves = [];
      this.items = [];
      this.actors = [];
      this.bridges = [];
      this.build();
      this._watch();
    }

    disconnectedCallback() {
      this._stop();
      if (this._io) this._io.disconnect();
    }

    rnd() {
      this.seed = (this.seed * 16807) % 2147483647;
      return this.seed / 2147483647;
    }
    pick(a) {
      return a[Math.floor(this.rnd() * a.length)];
    }

    _watch() {
      const reduce =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;
      if (!("IntersectionObserver" in window)) {
        this._start();
        return;
      }
      this._io = new IntersectionObserver(
        (es) => {
          if (es.some((e) => e.isIntersecting)) this._start();
          else this._stop();
        },
        { rootMargin: "120px" },
      );
      this._io.observe(this);
    }
    _start() {
      if (this._raf) return;
      const step = (t) => {
        this._raf = requestAnimationFrame(step);
        try {
          this.frame(t);
        } catch (e) {}
      };
      this._raf = requestAnimationFrame(step);
    }
    _stop() {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }

    build() {
      this.style.display = "block";
      this.style.position = "relative";
      const gutter = () =>
        document.documentElement.style.setProperty(
          "--sbw",
          window.innerWidth - document.documentElement.clientWidth + "px",
        );
      gutter();
      window.addEventListener("resize", gutter);

      const svg = el("svg", {
        viewBox: "0 0 " + VW + " " + VH,
        xmlns: NS,
        role: "img",
        "aria-label":
          "Isometric model city where each landmark is a project, internship or interest",
      });
      this.svg = svg;
      this.stage = document.createElement("div");
      this.stage.className = "city-stage";
      this.stage.appendChild(svg);
      this.appendChild(this.stage);
      this.defs = el("defs", {}, svg);

      this.buildCard();
      this.buildSky(el("g", {}, svg));
      this.buildBase(el("g", {}, svg));
      this.ground = el("g", {}, svg);
      this.buildGround();

      this.scene = el("g", {}, svg);
      this.bands = [];
      for (let i = 0; i <= NQ + NR + 2; i++) this.bands[i] = el("g", {}, this.scene);

      this.buildCity();
      this.buildBridges();
      this.buildActors();

      this.overlay = el(
        "rect",
        {
          x: 0,
          y: 0,
          width: VW,
          height: VH,
          fill: "#07011a",
          opacity: 0,
          "pointer-events": "none",
        },
        svg,
      );
      this.overlay.style.transition = "opacity .18s";
      this.spot = el("g", {}, svg);
      this.sky = el("g", {}, svg);
      this.buildHeli();
    }

    buildCard() {
      const c = document.createElement("div");
      c.className = "city-card";
      c.innerHTML =
        '<span class="cc-kick"></span><span class="cc-title"></span>' +
        '<p class="cc-body"></p><span class="cc-stack"></span>' +
        '<a class="cc-link" target="_blank" rel="noopener">OPEN ON GITHUB &#9656;</a>';
      this.card = c;
      this.appendChild(c);
      this.cc = {
        kick: c.querySelector(".cc-kick"),
        title: c.querySelector(".cc-title"),
        body: c.querySelector(".cc-body"),
        stack: c.querySelector(".cc-stack"),
        link: c.querySelector(".cc-link"),
      };
    }

    showCard(info) {
      const c = this.card;
      c.style.setProperty("--cc", info.c);
      this.cc.kick.textContent = info.kick;
      this.cc.title.textContent = info.title;
      this.cc.body.textContent = info.body;
      this.cc.stack.textContent = info.stack || "";
      this.cc.stack.style.display = info.stack ? "" : "none";
      if (info.url) {
        this.cc.link.href = info.url;
        this.cc.link.style.display = "";
      } else this.cc.link.style.display = "none";
      c.classList.add("on");
    }
    hideCard() {
      this.card.classList.remove("on");
    }

    hook(g, info) {
      const self = this;
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", info.url ? "link" : "button");
      g.setAttribute("aria-label", info.title + ". " + info.body);
      g.style.cursor = "pointer";
      const on = () => {
        if (self.active === g) return;
        if (self.active) self.off(self.active);
        self.active = g;
        g._p = g.parentNode;
        g._n = g.nextSibling;
        self.spot.appendChild(g);
        self.overlay.setAttribute("opacity", 0.62);
        let bb;
        try {
          bb = g.getBBox();
        } catch (e) {}
        self.card.classList.toggle("right", !!bb && bb.x + bb.width / 2 < VW * 0.5);
        self.showCard(info);
      };
      g._off = () => {
        if (g._p) {
          if (g._n && g._n.parentNode === g._p) g._p.insertBefore(g, g._n);
          else g._p.appendChild(g);
        }
        g._p = null;
      };
      g.addEventListener("mouseenter", on);
      g.addEventListener("focus", on);
      g.addEventListener("mouseleave", () => self.off(g));
      g.addEventListener("blur", () => self.off(g));
      g.addEventListener("click", () => {
        on();
        if (info.url && self.lastPointer !== "touch")
          window.open(info.url, "_blank", "noopener");
      });
    }
    off(g) {
      if (this.active !== g) return;
      if (g._off) g._off();
      this.active = null;
      this.overlay.setAttribute("opacity", 0);
      this.hideCard();
    }

    diam(q, r, c, parent, extra) {
      const p = px(q, r);
      return poly(
        p[0] +
          "," +
          p[1] +
          " " +
          (p[0] + TW) +
          "," +
          (p[1] + TW * 0.5) +
          " " +
          p[0] +
          "," +
          (p[1] + TW) +
          " " +
          (p[0] - TW) +
          "," +
          (p[1] + TW * 0.5),
        c,
        parent,
        extra,
      );
    }

    buildSky(g) {
      const gid = this.uid + "-glow";
      const rg = el("radialGradient", { id: gid }, this.defs);
      el("stop", { offset: "0%", "stop-color": P.purple, "stop-opacity": 0.3 }, rg);
      el("stop", { offset: "100%", "stop-color": P.purple, "stop-opacity": 0 }, rg);
      el("ellipse", { cx: 572, cy: 250, rx: 520, ry: 200, fill: "url(#" + gid + ")" }, g);

      const bands = [
        [0, 300, 0.055],
        [1144, 330, 0.045],
      ];
      bands.forEach((b) => {
        el("ellipse", { cx: b[0], cy: b[1], rx: 300, ry: 120, fill: P.cyan, opacity: b[2] }, g);
      });
    }

    buildBase(g) {
      const c = px(NQ - 1, NR - 1),
        b = px(NQ - 1, 0),
        d = px(0, NR - 1),
        D = 34;
      poly(
        d[0] - TW + "," + (d[1] + TW * 0.5) + " " + c[0] + "," + (c[1] + TW) + " " +
          c[0] + "," + (c[1] + TW + D) + " " + (d[0] - TW) + "," + (d[1] + TW * 0.5 + D),
        "#1a0f3c",
        g,
      );
      poly(
        c[0] + "," + (c[1] + TW) + " " + (b[0] + TW) + "," + (b[1] + TW * 0.5) + " " +
          (b[0] + TW) + "," + (b[1] + TW * 0.5 + D) + " " + c[0] + "," + (c[1] + TW + D),
        "#110a2c",
        g,
      );
      el(
        "line",
        {
          x1: d[0] - TW,
          y1: d[1] + TW * 0.5 + 12,
          x2: c[0],
          y2: c[1] + TW + 12,
          stroke: "#2a1458",
          "stroke-width": 2,
        },
        g,
      );
      el(
        "line",
        {
          x1: c[0],
          y1: c[1] + TW + 12,
          x2: b[0] + TW,
          y2: b[1] + TW * 0.5 + 12,
          stroke: "#0c0722",
          "stroke-width": 2,
        },
        g,
      );
      const t = el(
        "text",
        {
          x: c[0],
          y: c[1] + TW + D + 20,
          fill: "#5a4f90",
          "font-size": 13,
          "font-family": "'VT323', monospace",
          "letter-spacing": 2,
          "text-anchor": "middle",
        },
        g,
      );
      t.textContent = "ARYAN CITY   ·   EVERY BLOCK IS A PIECE OF ME";
    }

    buildGround() {
      const g = this.ground;
      for (let r = 0; r < NR; r++)
        for (let q = 0; q < NQ; q++) {
          const k = q + "," + r;
          if (isRiver(q, r)) this.diam(q, r, S(q, r) === 21 ? "#0a4266" : "#093a5a", g);
          else if (isRamp(q, r)) this.diam(q, r, "#171040", g);
          else if (isBank(q, r))
            this.diam(q, r, q % 3 === 0 ? "#1c1b3e" : (q + r) % 2 ? "#0e2c1f" : "#0c2719", g);
          else if (isSt(q, r)) this.diam(q, r, "#0e0630", g);
          else if (inPark(q, r)) this.diam(q, r, (q + r) % 2 ? "#0a2e1e" : "#0b3522", g);
          else if (inHarbor(q, r)) this.diam(q, r, "#211148", g);
          else if (CONS_SET.has(k)) this.diam(q, r, "#241a10", g);
          else this.diam(q, r, (q + r) % 2 ? "#120744" : "#150850", g);
        }

      for (let i = 0; i < 64; i++) {
        const q = 1 + this.rnd() * (NQ - 2),
          r = 21 - q + (this.rnd() * 1.8 - 0.9);
        if (r < 0 || r >= NR) continue;
        const p = ctr(q, r);
        this.waves.push(
          el(
            "rect",
            { x: p[0] - 4, y: p[1], width: 9, height: 1.6, fill: "#0f6592", opacity: 0.75 },
            g,
          ),
        );
      }

      for (let r = 0; r < NR; r++)
        for (let q = 0; q < NQ; q++) {
          if (!isSt(q, r)) continue;
          const p = ctr(q, r),
            main = q === BRQ || r === BRR;
          const vert = QST.includes(q) && !RST.includes(r);
          if (!vert && !(RST.includes(r) && !QST.includes(q))) continue;
          el(
            "rect",
            {
              x: p[0] - 1.3,
              y: p[1] - 3,
              width: 2.6,
              height: 6,
              fill: main ? P.gold : "#4a3f80",
              opacity: 0.5,
              transform: "rotate(" + (vert ? 27 : -27) + " " + p[0] + " " + p[1] + ")",
            },
            g,
          );
        }

      for (const sum of [RIVER_LO - 1, RIVER_HI + 1]) {
        const near = sum > RIVER_LO;
        for (let q = 0; q < NQ; q++) {
          const r = sum - q;
          if (r < 0 || r >= NR || isRamp(q, r)) continue;
          const p = px(q, r);
          const T = [p[0], p[1]],
            R = [p[0] + TW, p[1] + TW * 0.5],
            B = [p[0], p[1] + TW],
            L = [p[0] - TW, p[1] + TW * 0.5];
          const edges = near ? [[L, T], [T, R]] : [[L, B], [B, R]];
          for (const e of edges) {
            if (!near)
              poly(
                e[0][0] + "," + e[0][1] + " " + e[1][0] + "," + e[1][1] + " " + e[1][0] + "," + (e[1][1] + 6) + " " + e[0][0] + "," + (e[0][1] + 6),
                "#2f2a5c",
                g,
              );
            el(
              "line",
              { x1: e[0][0], y1: e[0][1], x2: e[1][0], y2: e[1][1], stroke: "#5b539c", "stroke-width": 1.4, opacity: 0.9 },
              g,
            );
          }
        }
      }
    }

    box(g, cx, cy, w, h, c, glow) {
      poly(
        cx - w + "," + (cy - h) + " " + cx + "," + (cy - h + w * 0.5) + " " + cx + "," +
          (cy + w * 0.5) + " " + (cx - w) + "," + cy,
        sh(c, glow ? 0.55 : 0.42),
        g,
      );
      poly(
        cx + "," + (cy - h + w * 0.5) + " " + (cx + w) + "," + (cy - h) + " " + (cx + w) +
          "," + cy + " " + cx + "," + (cy + w * 0.5),
        sh(c, glow ? 0.9 : 0.66),
        g,
      );
      poly(
        cx + "," + (cy - h - w * 0.5) + " " + (cx + w) + "," + (cy - h) + " " + cx + "," +
          (cy - h + w * 0.5) + " " + (cx - w) + "," + (cy - h),
        sh(c, glow ? 1.25 : 0.92),
        g,
        glow ? { stroke: c, "stroke-width": 1.2 } : null,
      );
    }

    winsOn(g, cx, cy, w, h, glow) {
      for (let wy = cy - h + w * 0.5 + 5; wy < cy - 4; wy += 8) {
        const row = [
          [cx + 4, 0, 0.95],
          [cx + 11, 1.6, 0.95],
          [cx - 8, 0, 0.5],
        ];
        for (const p of row) {
          const lit = glow ? this.rnd() < 0.82 : this.rnd() < 0.28;
          const w2 = el(
            "rect",
            {
              x: p[0],
              y: wy + p[1],
              width: 3.2,
              height: 4.4,
              fill: lit ? (glow ? "#d1f7ff" : "#8a7fd0") : "#241250",
              opacity: p[2],
            },
            g,
          );
          if (!glow && this.wins.length < 320) this.wins.push(w2);
        }
      }
    }

    tower(g, q, r, h, c, glow) {
      const p = ctr(q, r),
        w = TW * 0.76;
      this.box(g, p[0], p[1], w, h, c, glow);
      this.winsOn(g, p[0], p[1], w, h, glow);
      return { cx: p[0], cy: p[1], w: w };
    }

    stepped(g, q, r, c) {
      const p = ctr(q, r),
        w = TW * 0.76,
        h1 = 20 + this.rnd() * 18,
        h2 = 14 + this.rnd() * 14;
      this.box(g, p[0], p[1], w, h1, c, 0);
      this.box(g, p[0], p[1] - h1, w * 0.55, h2, c, 0);
      el(
        "line",
        {
          x1: p[0],
          y1: p[1] - h1 - h2 - w * 0.28,
          x2: p[0],
          y2: p[1] - h1 - h2 - w * 0.28 - 9,
          stroke: sh(c, 1.4),
          "stroke-width": 1.2,
        },
        g,
      );
      this.winsOn(g, p[0], p[1], w, h1, 0);
    }

    midrise(g, q, r, c, hh) {
      const p = ctr(q, r),
        w = TW * 0.78,
        h = hh || 16 + this.rnd() * 20;
      this.box(g, p[0], p[1], w, h, c, 0);
      this.box(g, p[0] + w * 0.28, p[1] - h - 1, w * 0.16, 5, "#2c1c58", 0);
      this.winsOn(g, p[0], p[1], w, h, 0);
      return { cx: p[0], cy: p[1], w: w, h: h };
    }

    house(g, q, r, rc) {
      const p = ctr(q, r),
        cx = p[0],
        cy = p[1],
        w = TW * 0.55,
        hb = 9,
        rh = 8,
        bc = "#2a1458";
      poly(
        cx - w + "," + (cy - hb) + " " + cx + "," + (cy - hb + w * 0.5) + " " + cx + "," +
          (cy + w * 0.5) + " " + (cx - w) + "," + cy,
        sh(bc, 0.72),
        g,
      );
      poly(
        cx + "," + (cy - hb + w * 0.5) + " " + (cx + w) + "," + (cy - hb) + " " + (cx + w) +
          "," + cy + " " + cx + "," + (cy + w * 0.5),
        sh(bc, 1.15),
        g,
      );
      el(
        "rect",
        { x: cx + w * 0.3, y: cy - 4.5, width: 3, height: 5, fill: P.gold, opacity: 0.85 },
        g,
      );
      const wn = el(
        "rect",
        {
          x: cx - w * 0.5,
          y: cy - 6.5,
          width: 3,
          height: 3,
          fill: this.rnd() < 0.5 ? "#ffd23f" : "#241250",
        },
        g,
      );
      if (this.wins.length < 320) this.wins.push(wn);
      const N = cx + "," + (cy - hb - w * 0.5),
        E = cx + w + "," + (cy - hb),
        SP = cx + "," + (cy - hb + w * 0.5),
        W = cx - w + "," + (cy - hb),
        R1 = cx - w / 2 + "," + (cy - hb - w * 0.25 - rh),
        R2 = cx + w / 2 + "," + (cy - hb + w * 0.25 - rh);
      poly(N + " " + E + " " + R2 + " " + R1, sh(rc, 1.05), g);
      poly(W + " " + SP + " " + R2 + " " + R1, sh(rc, 0.55), g);
    }

    shop(g, q, r, c) {
      const p = ctr(q, r),
        cx = p[0],
        cy = p[1],
        w = TW * 0.76,
        h = 11;
      this.box(g, cx, cy, w, h, "#1d0f48", 0);
      poly(
        cx + "," + (cy - h + w * 0.5) + " " + (cx + w) + "," + (cy - h) + " " + (cx + w) +
          "," + (cy - h + 4.5) + " " + cx + "," + (cy - h + w * 0.5 + 4.5),
        c,
        g,
        { opacity: 0.9 },
      );
      const f = el(
        "g",
        { transform: "translate(" + cx + "," + (cy - h + w * 0.5) + ") skewY(-26.565)" },
        g,
      );
      el("rect", { x: 4, y: 6, width: w - 8, height: 2.4, fill: c, opacity: 0.55 }, f);
    }

    glass(g, q, r, h, c) {
      const p = ctr(q, r),
        cx = p[0],
        cy = p[1],
        w = TW * 0.76;
      poly(
        cx - w + "," + (cy - h) + " " + cx + "," + (cy - h + w * 0.5) + " " + cx + "," +
          (cy + w * 0.5) + " " + (cx - w) + "," + cy,
        "#0a1530",
        g,
      );
      poly(
        cx + "," + (cy - h + w * 0.5) + " " + (cx + w) + "," + (cy - h) + " " + (cx + w) +
          "," + cy + " " + cx + "," + (cy + w * 0.5),
        "#10224a",
        g,
      );
      poly(
        cx + "," + (cy - h - w * 0.5) + " " + (cx + w) + "," + (cy - h) + " " + cx + "," +
          (cy - h + w * 0.5) + " " + (cx - w) + "," + (cy - h),
        sh(c, 0.95),
        g,
        { stroke: c, "stroke-width": 1.2 },
      );
      const f = el(
        "g",
        { transform: "translate(" + cx + "," + (cy - h + w * 0.5) + ") skewY(-26.565)" },
        g,
      );
      for (let y = 5; y < h - 3; y += 6.5)
        el(
          "rect",
          { x: 2.5, y: y, width: w - 5, height: 2.4, fill: c, opacity: this.rnd() < 0.7 ? 0.42 : 0.12 },
          f,
        );
      const f2 = el(
        "g",
        { transform: "translate(" + (cx - w) + "," + (cy - h) + ") skewY(26.565)" },
        g,
      );
      for (let y = 5; y < h - 3; y += 6.5)
        el("rect", { x: 2.5, y: y, width: w - 5, height: 2.4, fill: c, opacity: 0.16 }, f2);
      return { cx: cx, cy: cy, w: w };
    }

    tree(g, x, y, s) {
      s = s || 1;
      el("rect", { x: x - 1.3 * s, y: y - 6.5 * s, width: 2.6 * s, height: 6.5 * s, fill: "#43280f" }, g);
      el("rect", { x: x - 5 * s, y: y - 14 * s, width: 10 * s, height: 8 * s, fill: "#0f7a4d" }, g);
      el("rect", { x: x - 3.3 * s, y: y - 17 * s, width: 6.6 * s, height: 4 * s, fill: "#13a266" }, g);
      el("rect", { x: x - 1.6 * s, y: y - 19 * s, width: 3.2 * s, height: 2.4 * s, fill: "#18c17c" }, g);
    }

    lamp(g, x, y, dir, cone) {
      el("rect", { x: x - 1.2, y: y - 25, width: 2.4, height: 25, fill: "#3a2f70" }, g);
      el("rect", { x: dir > 0 ? x : x - 7, y: y - 27, width: 7, height: 2.4, fill: "#3a2f70" }, g);
      const hx = dir > 0 ? x + 7 : x - 7;
      el("rect", { x: hx - 2.4, y: y - 27.5, width: 4.8, height: 3, fill: "#ffd23f" }, g);
      if (cone !== false) {
        poly(
          hx - 3 + "," + (y - 25) + " " + (hx + 3) + "," + (y - 25) + " " + (hx + 13) +
            "," + y + " " + (hx - 13) + "," + y,
          "#ffd23f",
          g,
          { opacity: 0.07 },
        );
        el("ellipse", { cx: hx, cy: y + 1, rx: 13, ry: 6.5, fill: "#ffd23f", opacity: 0.09 }, g);
      }
      return hx;
    }

    sign(g, cx, topY, label, c) {
      const w2 = Math.max(30, label.length * 4 + 10);
      el(
        "rect",
        { x: cx - w2, y: topY - 24, width: w2 * 2, height: 15, fill: "#07011a", stroke: c, "stroke-width": 1.4 },
        g,
      );
      const t = el(
        "text",
        {
          x: cx,
          y: topY - 12.5,
          fill: c,
          "font-size": 13,
          "font-family": "'VT323', monospace",
          "letter-spacing": 0.5,
          "text-anchor": "middle",
        },
        g,
      );
      t.textContent = label;
      el(
        "line",
        { x1: cx, y1: topY - 9, x2: cx, y2: topY - 1, stroke: c, "stroke-width": 1.2, "stroke-dasharray": "2 2" },
        g,
      );
    }

    add(d, fn) {
      this.items.push({ d: d, fn: fn });
    }

    buildCity() {
      const spMap = new Map();
      PROJECTS.concat(INTERNS).forEach((p) => spMap.set(p.q + "," + p.r, p));
      const reserved = new Set(
        [DOME, BILL, BENCH, MAST, WHEEL, HCRANE].map((c) => c.join(",")).concat([...CONS_SET]),
      );

      for (let r = 0; r < NR; r++)
        for (let q = 0; q < NQ; q++) {
          if (isRiver(q, r) || isSt(q, r) || isRamp(q, r)) continue;
          const k = q + "," + r,
            sum = S(q, r),
            side = SIDE(q, r);
          if (reserved.has(k)) continue;

          if (isBank(q, r)) {
            const rl = this.rnd();
            if (rl < 0.34)
              this.add(sum, (g) => {
                const p = ctr(q, r);
                this.tree(g, p[0] + this.rnd() * 12 - 6, p[1], 0.8);
              });
            else if (rl < 0.5)
              this.add(sum, (g) => {
                const p = ctr(q, r);
                this.lamp(g, p[0] + 6, p[1] - 1, -1);
              });
            else if (rl < 0.62)
              this.add(sum, (g) => {
                const p = ctr(q, r),
                  bx = p[0],
                  by = p[1];
                [[-8, 1], [6, 1]].forEach((o) =>
                  el("rect", { x: bx + o[0], y: by + o[1] - 4, width: 1.8, height: 4.5, fill: "#3a2a12" }, g),
                );
                poly(bx - 10 + "," + (by - 3) + " " + bx + "," + (by - 8) + " " + (bx + 10) + "," + (by - 3) + " " + bx + "," + (by + 2), "#6b4a1e", g);
              });
            else if (rl < 0.7)
              this.add(sum, (g) => {
                const p = ctr(q, r);
                el("rect", { x: p[0] - 9, y: p[1] - 12, width: 18, height: 12, fill: "#241250" }, g);
                el("rect", { x: p[0] - 11, y: p[1] - 15, width: 22, height: 3.4, fill: this.pick([P.pink, P.cyan, P.gold]) }, g);
                el("rect", { x: p[0] - 6, y: p[1] - 9, width: 12, height: 5, fill: P.gold, opacity: 0.5 }, g);
              });
            continue;
          }

          const sp = spMap.get(k);
          if (sp) {
            this.add(sum, (g) => {
              const b = sp.kick[0] === "I" ? this.glass(g, q, r, sp.h, sp.c) : this.tower(g, q, r, sp.h, sp.c, 1);
              this.sign(g, b.cx, b.cy - sp.h - b.w * 0.5, sp.label, sp.c);
              this.hook(g, sp);
            });
            continue;
          }

          if (inPark(q, r)) {
            const rl = this.rnd();
            if (rl < 0.5)
              this.add(sum, (g) => {
                const p = ctr(q, r);
                this.tree(g, p[0] - 6, p[1] + 2, 1);
                if (this.rnd() < 0.6) this.tree(g, p[0] + 7, p[1] - 3, 0.75);
              });
            else if (rl < 0.64)
              this.add(sum, (g) => {
                const p = ctr(q, r);
                this.lamp(g, p[0] + 4, p[1], 1);
              });
            else if (rl < 0.74)
              this.add(sum, (g) => {
                const p = ctr(q, r);
                el("ellipse", { cx: p[0], cy: p[1], rx: TW * 0.72, ry: TW * 0.36, fill: "#0a3d5c" }, g);
                el("ellipse", { cx: p[0], cy: p[1] - 1, rx: TW * 0.5, ry: TW * 0.24, fill: "#0e5a80", opacity: 0.6 }, g);
              });
            continue;
          }

          if (inHarbor(q, r)) {
            const rl = this.rnd();
            if (rl < 0.44)
              this.add(sum, (g) => {
                const p = ctr(q, r);
                [[0, 0], [11, -1], [5, -8]].forEach((o, i) => {
                  const c = [P.pink, P.cyan, P.gold][i],
                    x = p[0] + o[0],
                    y = p[1] + o[1];
                  poly(x - 11 + "," + y + " " + (x - 2) + "," + (y + 4.5) + " " + (x - 2) + "," + (y - 3) + " " + (x - 11) + "," + (y - 7.5), sh(c, 0.55), g);
                  poly(x - 2 + "," + (y + 4.5) + " " + (x + 7) + "," + y + " " + (x + 7) + "," + (y - 7.5) + " " + (x - 2) + "," + (y - 3), sh(c, 0.8), g);
                  poly(x - 11 + "," + (y - 7.5) + " " + (x - 2) + "," + (y - 3) + " " + (x + 7) + "," + (y - 7.5) + " " + (x - 2) + "," + (y - 12), sh(c, 1.05), g);
                });
              });
            else if (rl < 0.6)
              this.add(sum, (g) => {
                const b = this.midrise(g, q, r, "#3a2a66", 14 + this.rnd() * 14);
                el("rect", { x: b.cx - b.w * 0.6, y: b.cy - b.h - 4, width: b.w * 1.2, height: 2.6, fill: this.pick([P.gold, P.cyan]), opacity: 0.7 }, g);
              });
            else if (rl < 0.7)
              this.add(sum, (g) => {
                const p = ctr(q, r);
                this.lamp(g, p[0] + 5, p[1], -1);
              });
            else if (rl < 0.8)
              this.add(sum, (g) => {
                const p = ctr(q, r);
                el("rect", { x: p[0] - 10, y: p[1] - 20, width: 20, height: 20, fill: "#1b2f52" }, g);
                el("ellipse", { cx: p[0], cy: p[1] - 20, rx: 10, ry: 5, fill: "#24406e" }, g);
                el("rect", { x: p[0] - 10, y: p[1] - 10, width: 20, height: 1.8, fill: P.cyan, opacity: 0.4 }, g);
              });
            continue;
          }

          if (sum <= RIVER_LO - 2) {
            if (side >= 7) {
              const rl = this.rnd();
              if (rl < 0.12) {
                this.add(sum, (g) => {
                  const p = ctr(q, r);
                  this.diam(q, r, "#1a1050", g);
                  el("circle", { cx: p[0], cy: p[1], r: 5, fill: "none", stroke: P.cyan, "stroke-width": 1.2, opacity: 0.6 }, g);
                  el("circle", { cx: p[0], cy: p[1], r: 1.8, fill: P.cyan }, g);
                });
                continue;
              }
              if (rl < 0.18) continue;
              if (rl < 0.72)
                this.add(sum, (g) =>
                  this.glass(g, q, r, 18 + this.rnd() * 30, this.pick(["#3a5f9e", "#2a4a80", "#4a70b4"])),
                );
              else this.add(sum, (g) => this.midrise(g, q, r, "#33245e"));
              continue;
            }
            if (side <= -7) {
              const rl = this.rnd();
              if (rl < 0.14) {
                this.add(sum, (g) => {
                  const p = ctr(q, r);
                  this.diam(q, r, "#0a2e1e", g);
                  this.tree(g, p[0] - 5, p[1] + 2, 0.9);
                  this.tree(g, p[0] + 6, p[1] - 1, 0.7);
                });
                continue;
              }
              if (rl < 0.2) continue;
              if (rl < 0.46) this.add(sum, (g) => this.house(g, q, r, this.pick([P.mag, "#c44536", "#e07b39", P.purple, "#2f9e8f"])));
              else if (rl < 0.82)
                this.add(sum, (g) =>
                  this.midrise(g, q, r, this.pick(["#3d2370", "#4b2a86", "#6b2f6e", "#5c3a2a", "#2d5a7a"]), 14 + this.rnd() * 20),
                );
              else this.add(sum, (g) => this.shop(g, q, r, this.pick([P.cyan, P.gold, P.mag])));
              continue;
            }
            const rl = this.rnd();
            if (rl < 0.1) {
              this.add(sum, (g) => {
                const p = ctr(q, r);
                this.diam(q, r, "#1a1050", g);
                this.tree(g, p[0], p[1], 0.85);
              });
              continue;
            }
            if (rl < 0.16) continue;
            const near = PROJECTS.concat(INTERNS).some(
              (p) => Math.abs(p.q - q) + Math.abs(p.r - r) <= 2,
            );
            const nearBill = Math.abs(BILL[0] - q) + Math.abs(BILL[1] - r) <= 2;
            const DT = ["#4b2a86", "#402a78", "#57329c", "#2f3b8c", "#6b2f6e", "#7a3350", "#2d5a7a", "#5c3a2a"];
            if (rl < 0.4) this.add(sum, (g) => this.stepped(g, q, r, this.pick(DT)));
            else if (rl < 0.62)
              this.add(sum, (g) => this.glass(g, q, r, 22 + this.rnd() * 26, this.pick([P.cyan, P.mag, "#4a70b4"])));
            else if (rl < 0.86)
              this.add(sum, (g) =>
                this.midrise(g, q, r, this.pick(DT), near || nearBill ? 14 + this.rnd() * 8 : 18 + this.rnd() * 26),
              );
            else this.add(sum, (g) => this.shop(g, q, r, this.pick([P.pink, P.cyan, P.mag, P.gold])));
            continue;
          }

          const rl = this.rnd();
          if (rl < 0.16) {
            this.add(sum, (g) => {
              const p = ctr(q, r);
              this.diam(q, r, "#0a2e1e", g);
              this.tree(g, p[0] - 5, p[1] + 1, 0.95);
              if (this.rnd() < 0.5) this.tree(g, p[0] + 6, p[1] - 2, 0.7);
            });
            continue;
          }
          if (rl < 0.24) continue;
          if (rl < 0.62)
            this.add(sum, (g) =>
              this.house(g, q, r, this.pick([P.mag, P.purple, P.pink, "#c44536", "#e07b39", "#2f9e8f"])),
            );
          else if (rl < 0.78)
            this.add(sum, (g) =>
              this.midrise(g, q, r, this.pick(["#3a2a66", "#4b2a86", "#5c3a2a", "#2d5a7a"]), 16 + this.rnd() * 24),
            );
          else if (rl < 0.86)
            this.add(sum, (g) => this.stepped(g, q, r, this.pick(["#402a78", "#6b2f6e", "#2f3b8c"])));
          else this.add(sum, (g) => this.shop(g, q, r, this.pick([P.cyan, P.gold])));
        }

      this.addDome();
      this.addBillboard();
      this.addConstruction();
      this.addBench();
      this.addMast();
      this.addWheel();
      this.addHarborCrane();

      this.items.sort((a, b) => a.d - b.d);
      for (const it of this.items) {
        const idx = Math.max(0, Math.min(this.bands.length - 1, Math.round(it.d)));
        it.fn(el("g", {}, this.bands[idx]));
      }
    }

    addDome() {
      const q = DOME[0],
        r = DOME[1];
      this.add(S(q, r), (g) => {
        const p = ctr(q, r),
          cx = p[0],
          cy = p[1],
          w = TW * 0.92,
          h = 18;
        this.box(g, cx, cy, w, h, "#2a1458", 0);
        [-w * 0.62, w * 0.5].forEach((o) =>
          el("rect", { x: cx + o, y: cy - h + 1, width: 3, height: h - 2, fill: sh(P.gold, 0.5) }, g),
        );
        el(
          "ellipse",
          { cx: cx, cy: cy - h - w * 0.2, rx: w * 0.6, ry: w * 0.48, fill: sh(P.gold, 0.85), stroke: sh(P.gold, 1.2), "stroke-width": 1.2 },
          g,
        );
        el("rect", { x: cx - 1.5, y: cy - h - w * 0.2 - w * 0.48 - 8, width: 3, height: 8.5, fill: P.gold }, g);
        this.hook(g, {
          c: P.gold,
          kick: "EDUCATION",
          title: "MAIT Campus",
          body: "B.Tech in Computer Science, class of 2028. Maharaja Agrasen Institute of Technology, Delhi.",
          stack: "New Delhi",
        });
      });
    }

    addBillboard() {
      const q = BILL[0],
        r = BILL[1],
        H = 168;
      this.add(S(q, r), (g) => {
        const p = ctr(q, r),
          cx = p[0],
          cy = p[1],
          w = TW * 0.94,
          C = "#5a2a9e";
        this.box(g, cx, cy, w * 1.22, 26, "#3a1d6e", 0);
        this.box(g, cx, cy - 26, w, H - 26, C, 1);
        el("rect", { x: cx - w * 1.22, y: cy - 30, width: w * 2.44, height: 3, fill: P.mag, opacity: 0.7 }, g);
        for (let y = cy - H + w * 0.5 + 6; y < cy - 6; y += 9) {
          el("rect", { x: cx + 3, y: y, width: 4, height: 5, fill: "#d1f7ff", opacity: 0.9 }, g);
          el("rect", { x: cx + 11.5, y: y + 2, width: 4, height: 5, fill: "#d1f7ff", opacity: 0.9 }, g);
          el("rect", { x: cx - 9, y: y, width: 4, height: 5, fill: "#8ab4ff", opacity: 0.5 }, g);
          el("rect", { x: cx - 17, y: y + 2, width: 4, height: 5, fill: "#8ab4ff", opacity: 0.45 }, g);
        }
        el("rect", { x: cx - 1.4, y: cy - H + w * 0.5, width: 2.8, height: H - w * 0.5 - 26, fill: P.mag, opacity: 0.9 }, g);
        const topY = cy - H;
        el("rect", { x: cx - w * 0.5, y: topY - 10, width: w, height: 12, fill: "#2c1c58" }, g);
        const BW = 176,
          BH = 118,
          bx = cx - BW / 2,
          by = topY - 16 - BH;
        [-52, 52].forEach((o) =>
          el("line", { x1: cx + o, y1: by + BH, x2: cx + o * 0.35, y2: topY - 2, stroke: "#2c1c58", "stroke-width": 3 }, g),
        );
        el("rect", { x: bx - 5, y: by - 5, width: BW + 10, height: BH + 10, fill: "#07011a" }, g);
        el("rect", { x: bx - 5, y: by - 5, width: BW + 10, height: BH + 10, fill: "none", stroke: P.mag, "stroke-width": 2 }, g);
        el("rect", { x: bx - 9, y: by - 9, width: BW + 18, height: BH + 18, fill: "none", stroke: P.mag, "stroke-width": 1, opacity: 0.35 }, g);

        const artId = this.uid + "-art";
        const art = el("g", { id: artId }, this.defs);
        this.paintAnime(art, BW, BH);

        const screen = el("g", {}, g);
        this.glitchSlices = [];
        const N = 5,
          sh2 = BH / N;
        for (let i = 0; i < N; i++) {
          const cid = this.uid + "-clip" + i;
          const cp = el("clipPath", { id: cid, clipPathUnits: "userSpaceOnUse" }, this.defs);
          el("rect", { x: 0, y: i * sh2, width: BW, height: sh2 + 0.5 }, cp);
          const holder = el("g", { transform: "translate(" + bx + "," + by + ")" }, screen);
          const inner = el("g", { "clip-path": "url(#" + cid + ")" }, holder);
          const u = el("use", {}, inner);
          u.setAttribute("href", "#" + artId);
          u.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#" + artId);
          this.glitchSlices.push(inner);
        }

        const ghost = el("g", { transform: "translate(" + bx + "," + by + ")", opacity: 0 }, screen);
        const gu = el("use", {}, ghost);
        gu.setAttribute("href", "#" + artId);
        gu.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#" + artId);
        this.ghost = ghost;
        this.ghostAt = [bx, by];

        const scanClip = this.uid + "-scan";
        const scp = el("clipPath", { id: scanClip, clipPathUnits: "userSpaceOnUse" }, this.defs);
        el("rect", { x: bx, y: by, width: BW, height: BH }, scp);
        const scan = el("g", { "clip-path": "url(#" + scanClip + ")" }, g);
        this.scan = el("g", {}, scan);
        for (let y = -8; y < BH + 8; y += 4)
          el("rect", { x: bx, y: by + y, width: BW, height: 1.6, fill: "#07011a", opacity: 0.32 }, this.scan);
        el("rect", { x: bx, y: by, width: BW, height: BH, fill: P.cyan, opacity: 0.05 }, scan);
        this.screen = screen;

        const t = el(
          "text",
          { x: bx + BW + 14, y: by + 16, fill: P.mag, "font-size": 14, "font-family": "'VT323', monospace", "letter-spacing": 1 },
          g,
        );
        t.textContent = "NOW AIRING";
        this.airing = t;
        this.hook(g, {
          c: P.mag,
          kick: "OFF THE CLOCK",
          title: "Anime District",
          body: "The tallest screen in the city and it never turns off. Currently showing whatever I am three episodes behind on.",
          stack: "Anime · Manga · Too many tabs",
        });
      });
    }

    paintAnime(g, W, H) {
      const U = W / 30;
      const r = (x, y, w, h, f, o) =>
        el("rect", Object.assign({ x: x * U, y: y * U, width: w * U, height: h * U, fill: f }, o ? { opacity: o } : {}), g);
      const hairD = "#3a1466",
        hairM = "#5c1f96",
        skin = "#f5d3b8";
      r(0, 0, 30, 20, "#150a33");
      el("circle", { cx: 22.5 * U, cy: 5 * U, r: 4.2 * U, fill: P.pink, opacity: 0.22 }, g);
      el("circle", { cx: 22.5 * U, cy: 5 * U, r: 4.2 * U, fill: "none", stroke: P.pink, "stroke-width": 1, opacity: 0.5 }, g);
      for (let i = 0; i < 6; i++) r(0, 12.4 + i * 1.25, 30, 0.28, P.cyan, 0.12 + i * 0.03);
      r(0, 15.6, 30, 4.4, "#0d0628");
      for (let i = 0; i < 9; i++) r(1 + i * 3.3, 16.2 - (i % 3) * 0.7, 1.5, 4, "#1d1046");
      r(8.4, 3.2, 13, 14, hairD);
      r(7.4, 5.4, 15, 11, hairD);
      r(6.8, 8, 2.4, 8.5, hairM);
      r(20.8, 8, 2.4, 8.5, hairM);
      r(9.6, 15.4, 10.8, 4.6, "#241250");
      r(10.4, 14.6, 9.2, 1.6, "#33206b");
      r(13.6, 12.6, 2.8, 2.2, "#e8bfa0");
      r(10.6, 5.6, 8.8, 7.6, skin);
      r(10, 6.8, 10, 5.4, skin);
      r(9.6, 3.6, 10.8, 3.4, hairM);
      r(9.4, 4.2, 3.2, 5, hairM);
      r(17.4, 4.2, 3.2, 4.4, hairM);
      r(12.8, 4, 4.4, 2.2, hairD);
      r(18.2, 2.8, 3.4, 2.4, P.gold);
      r(19.4, 3.4, 1.2, 1.2, "#ffd23f");
      r(11.3, 7.4, 2.6, 0.5, hairD);
      r(15.9, 7.4, 2.6, 0.5, hairD);
      this.eyeL = r(11.4, 8.2, 2.5, 3, P.cyan);
      this.eyeR = r(16, 8.2, 2.5, 3, P.cyan);
      this.pupL = r(12.1, 8.9, 1.1, 1.6, "#07011a");
      this.pupR = r(16.7, 8.9, 1.1, 1.6, "#07011a");
      r(11.7, 8.5, 0.8, 0.8, "#ffffff");
      r(16.3, 8.5, 0.8, 0.8, "#ffffff");
      r(10.7, 10.8, 1.8, 0.9, P.pink, 0.55);
      r(17.4, 10.8, 1.8, 0.9, P.pink, 0.55);
      this.mouth = r(14.4, 11.6, 1.7, 0.8, "#c9436b");
      r(23.4, 2, 5.4, 16, "#07011a", 0.75);
      const marks = [
        [0.4, 3.6, 0.9],
        [1.6, 2.2, 0.9],
        [0.4, 2.8, 0.9],
        [1.2, 4.2, 0.9],
        [0.6, 2.4, 0.9],
      ];
      let yy = 3;
      marks.forEach((m, i) => {
        r(23.9 + m[0], yy, m[1], m[2], i % 2 ? P.cyan : P.mag);
        yy += 2.6;
      });
      r(1, 17.2, 6.6, 2, P.mag, 0.9);
      const t = el(
        "text",
        { x: 1.5 * U, y: 18.7 * U, fill: "#07011a", "font-size": 1.5 * U, "font-family": "'VT323', monospace" },
        g,
      );
      t.textContent = "EP 12";
    }

    addConstruction() {
      const CQ = CONS[0][0],
        CR = CONS[0][1];
      const d = S(CONS[3][0], CONS[3][1]);
      this.add(d, (g) => {
        const bp = ctr(CQ + 0.5, CR + 0.5);
        const pit = ctr(CQ, CR);
        el("ellipse", { cx: pit[0], cy: pit[1], rx: TW * 0.85, ry: TW * 0.42, fill: "#140d08" }, g);
        el("ellipse", { cx: pit[0], cy: pit[1] - 3, rx: TW * 0.6, ry: TW * 0.3, fill: "#0a0705" }, g);

        const f = ctr(CQ + 1, CR + 1);
        for (let lv = 0; lv < 4; lv++) {
          const yy = f[1] - lv * 15;
          [[-TW * 0.62, TW * 0.31], [TW * 0.62, TW * 0.31], [TW * 0.62, -TW * 0.31], [-TW * 0.62, -TW * 0.31]].forEach((o) =>
            el("rect", { x: f[0] + o[0] - 1.2, y: yy + o[1] - 15, width: 2.4, height: 15, fill: "#8a6b2a" }, g),
          );
          poly(
            f[0] + "," + (yy - TW * 0.62) + " " + (f[0] + TW * 0.62) + "," + (yy - TW * 0.31) + " " + f[0] + "," + yy + " " + (f[0] - TW * 0.62) + "," + (yy - TW * 0.31),
            "#5a4a20",
            g,
            { opacity: lv < 2 ? 0.95 : 0.45 },
          );
          el("line", { x1: f[0] - TW * 0.62, y1: yy - TW * 0.31, x2: f[0] + TW * 0.62, y2: yy - TW * 0.31, stroke: "#8a6b2a", "stroke-width": 1.2, opacity: 0.7 }, g);
        }

        const s = ctr(CQ, CR + 1);
        for (let i = 0; i < 5; i++)
          el("line", { x1: s[0] - 12, y1: s[1] - 4 - i * 8, x2: s[0] + 12, y2: s[1] - 10 - i * 8, stroke: "#6a5a2a", "stroke-width": 1.2, opacity: 0.85 }, g);
        for (let i = 0; i < 5; i++)
          el("line", { x1: s[0] - 12 + i * 6, y1: s[1] - 2 - i * 3, x2: s[0] - 12 + i * 6, y2: s[1] - 38 - i * 3, stroke: "#6a5a2a", "stroke-width": 1, opacity: 0.6 }, g);
        el("rect", { x: s[0] - 13, y: s[1] - 40, width: 26, height: 38, fill: P.gold, opacity: 0.05 }, g);

        const h = ctr(CQ + 1, CR);
        [[-16, 4], [-4, 8], [8, 4]].forEach((o, i) => {
          el("rect", { x: h[0] + o[0], y: h[1] + o[1] - 5, width: 11, height: 5, fill: i % 2 ? "#8a3020" : "#6a4a1a" }, g);
          el("rect", { x: h[0] + o[0], y: h[1] + o[1] - 9, width: 11, height: 4, fill: i % 2 ? "#a03a26" : "#7a5a22" }, g);
        });

        const MX = bp[0] - 6,
          MY = bp[1] - 6;
        for (let i = 0; i < 11; i++) {
          const yy = MY - i * 8;
          el("line", { x1: MX - 4, y1: yy, x2: MX + 4, y2: yy, stroke: P.gold, "stroke-width": 1 }, g);
          el("line", { x1: MX - 4, y1: yy, x2: MX + 4, y2: yy - 8, stroke: P.gold, "stroke-width": 0.8, opacity: 0.8 }, g);
        }
        el("line", { x1: MX - 4, y1: MY, x2: MX - 4, y2: MY - 88, stroke: P.gold, "stroke-width": 1.6 }, g);
        el("line", { x1: MX + 4, y1: MY, x2: MX + 4, y2: MY - 88, stroke: P.gold, "stroke-width": 1.6 }, g);

        const jib = el("g", { transform: "translate(" + MX + "," + (MY - 88) + ") scale(1,0.5)" }, g);
        const jg = el("g", {}, jib);
        el("rect", { x: 0, y: -2, width: 76, height: 4, fill: P.gold }, jg);
        el("rect", { x: -32, y: -2, width: 30, height: 4, fill: sh(P.gold, 0.7) }, jg);
        el("rect", { x: -32, y: -6, width: 11, height: 11, fill: "#8a6b2a" }, jg);
        for (let i = 4; i < 74; i += 9) {
          el("line", { x1: i, y1: -2, x2: i + 4.5, y2: -10, stroke: P.gold, "stroke-width": 0.9, opacity: 0.75 }, jg);
          el("line", { x1: i + 4.5, y1: -10, x2: i + 9, y2: -2, stroke: P.gold, "stroke-width": 0.9, opacity: 0.75 }, jg);
        }
        el("rect", { x: -7, y: -13, width: 14, height: 11, fill: "#2a1458", stroke: P.gold, "stroke-width": 1 }, jg);
        const hookG = el("g", {}, g);
        el("line", { x1: 0, y1: 0, x2: 0, y2: 26, stroke: "#8a6b2a", "stroke-width": 1.2 }, hookG);
        el("rect", { x: -7, y: 26, width: 14, height: 8, fill: sh(P.cyan, 0.6) }, hookG);
        el("rect", { x: -7, y: 23.5, width: 14, height: 3, fill: sh(P.cyan, 0.9) }, hookG);
        this.crane = { jib: jg, hook: hookG, mx: MX, my: MY - 88, a: 0 };

        const l = ctr(CQ + 1, CR);
        el("rect", { x: l[0] - 18, y: l[1] - 5, width: 36, height: 2.4, fill: P.gold, opacity: 0.55 }, g);
        for (let i = 0; i < 5; i++)
          el("rect", { x: l[0] - 18 + i * 8, y: l[1] - 5, width: 4, height: 2.4, fill: P.pink, opacity: 0.55 }, g);

        this.hook(g, {
          c: P.gold,
          kick: "UNDER CONSTRUCTION",
          title: "Work In Progress",
          body: "Whatever I am building right now lives on this lot. The crane never really stops turning.",
          stack: "Always something",
        });
      });
    }

    addBench() {
      const q = BENCH[0],
        r = BENCH[1];
      this.add(S(q, r), (g) => {
        const p = ctr(q, r),
          x = p[0],
          y = p[1];
        el("ellipse", { cx: x, cy: y + 2, rx: TW * 0.85, ry: TW * 0.45, fill: "#0d3d28" }, g);
        this.lamp(g, x + 15, y - 2, -1);
        el("ellipse", { cx: x - 1, cy: y + 2, rx: 16, ry: 8, fill: "#ffd23f", opacity: 0.16 }, g);
        const bx = x - 4,
          by = y + 3;
        [[-10, 2], [8, 2], [-10, -4], [8, -4]].forEach((o) =>
          el("rect", { x: bx + o[0], y: by + o[1] - 5, width: 2, height: 5.5, fill: "#3a2a12" }, g),
        );
        poly(bx - 12 + "," + (by - 4) + " " + (bx - 1) + "," + (by - 9.5) + " " + (bx + 12) + "," + (by - 4) + " " + (bx + 1) + "," + (by + 1.5), "#6b4a1e", g);
        poly(bx - 12 + "," + (by - 4) + " " + (bx - 12) + "," + (by - 12) + " " + (bx - 1) + "," + (by - 17.5) + " " + (bx - 1) + "," + (by - 9.5), "#573c18", g);
        const pg = el("g", {}, g);
        el("rect", { x: bx - 2.8, y: by - 26, width: 5.6, height: 5.6, fill: "#f2cdb0" }, pg);
        el("rect", { x: bx - 3.9, y: by - 27.6, width: 7.8, height: 3.2, fill: "#241250" }, pg);
        el("rect", { x: bx - 3.9, y: by - 21, width: 7.8, height: 8.8, fill: P.cyan }, pg);
        el("rect", { x: bx - 3.9, y: by - 21, width: 7.8, height: 2.8, fill: sh(P.cyan, 1.3) }, pg);
        el("rect", { x: bx - 4.4, y: by - 12.4, width: 8.8, height: 3.8, fill: "#2a1458" }, pg);
        el("rect", { x: bx + 4, y: by - 9.8, width: 5.5, height: 3.2, fill: "#2a1458" }, pg);
        el("rect", { x: bx + 2.2, y: by - 16.2, width: 7.6, height: 1.6, fill: "#1a1a2e" }, pg);
        this.laptop = el("rect", { x: bx + 2.8, y: by - 20.6, width: 6.6, height: 4.8, fill: P.cyan, opacity: 0.85 }, pg);
        el("ellipse", { cx: bx + 6, cy: by - 17.8, rx: 9, ry: 5.5, fill: P.cyan, opacity: 0.12 }, pg);
        this.hook(g, {
          c: P.green,
          kick: "THE PERSON ON THE BENCH",
          title: "That is me",
          body: "Books, anime, music and a laptop that is always doing something. The homelab hums two blocks down.",
          stack: "CSE '28 · New Delhi",
        });
      });
    }

    addMast() {
      const q = MAST[0],
        r = MAST[1];
      this.add(S(q, r), (g) => {
        const p = ctr(q, r),
          x = p[0],
          y = p[1];
        el("ellipse", { cx: x, cy: y, rx: TW * 0.7, ry: TW * 0.35, fill: "#1a1a3e" }, g);
        el("rect", { x: x - 14, y: y - 11, width: 13, height: 9, fill: "#241250" }, g);
        el("rect", { x: x - 14, y: y - 14, width: 13, height: 3, fill: "#332068" }, g);
        for (let i = 0; i < 3; i++) {
          const w = el("rect", { x: x - 12.2 + i * 4, y: y - 9, width: 2.4, height: 2.4, fill: i % 2 ? P.cyan : "#241250" }, g);
          if (this.wins.length < 320) this.wins.push(w);
        }
        poly(x + 3 + "," + y + " " + (x + 15) + "," + y + " " + (x + 10.4) + "," + (y - 54) + " " + (x + 7.6) + "," + (y - 54), "none", g, { stroke: P.cyan, "stroke-width": 1.5 });
        for (let t = 0.2; t < 1; t += 0.2) {
          const w2 = 6 - 4.6 * t;
          el("line", { x1: x + 9 - w2, y1: y - 54 * t, x2: x + 9 + w2, y2: y - 54 * t, stroke: P.cyan, "stroke-width": 0.9 }, g);
        }
        for (let t = 0.1; t < 1; t += 0.2) {
          const w1 = 6 - 4.6 * t,
            w2 = 6 - 4.6 * (t + 0.1);
          el("line", { x1: x + 9 - w1, y1: y - 54 * t, x2: x + 9 + w2, y2: y - 54 * (t + 0.1), stroke: P.cyan, "stroke-width": 0.7, opacity: 0.7 }, g);
        }
        el("line", { x1: x + 9, y1: y - 54, x2: x + 9, y2: y - 65, stroke: P.cyan, "stroke-width": 1.5 }, g);
        [20, 32, 44].forEach((hh) => {
          el("line", { x1: x + 9, y1: y - hh, x2: x + 17, y2: y - hh - 3.5, stroke: P.cyan, "stroke-width": 1, opacity: 0.8 }, g);
          el("line", { x1: x + 9, y1: y - hh, x2: x + 1, y2: y - hh - 3.5, stroke: P.cyan, "stroke-width": 1, opacity: 0.8 }, g);
        });
        this.beacon = el("circle", { cx: x + 9, cy: y - 66.5, r: 2.4, fill: P.pink }, g);
        this.hook(g, {
          c: P.cyan,
          kick: "HOMELAB",
          title: "Signal Tower",
          body: "Self hosted everything. Docker, containers and a pile of services nobody asked for, broadcasting from the park.",
          stack: "Linux · Docker · Azure",
        });
      });
    }

    addWheel() {
      const q = WHEEL[0],
        r = WHEEL[1];
      this.add(S(q, r), (g) => {
        const p = ctr(q, r),
          WX = p[0],
          WY = p[1] - 36;
        el("ellipse", { cx: WX, cy: p[1] + 1, rx: 14, ry: 6, fill: "#241250" }, g);
        el("line", { x1: WX - 10, y1: p[1] + 1, x2: WX, y2: WY, stroke: "#3a2f70", "stroke-width": 2.4 }, g);
        el("line", { x1: WX + 10, y1: p[1] + 1, x2: WX, y2: WY, stroke: "#3a2f70", "stroke-width": 2.4 }, g);
        const rot = el("g", {}, g);
        el("circle", { cx: WX, cy: WY, r: 25, fill: "none", stroke: P.mag, "stroke-width": 1.5 }, rot);
        el("circle", { cx: WX, cy: WY, r: 17, fill: "none", stroke: P.mag, "stroke-width": 0.8, opacity: 0.5 }, rot);
        const cols = [P.pink, P.cyan, P.gold, P.purple, P.mag, "#d1f7ff", P.cyan, P.gold];
        for (let a = 0; a < 8; a++) {
          const an = (a * Math.PI) / 4,
            x2 = WX + Math.cos(an) * 25,
            y2 = WY + Math.sin(an) * 25;
          el("line", { x1: WX, y1: WY, x2: x2, y2: y2, stroke: P.mag, "stroke-width": 0.9, opacity: 0.8 }, rot);
          el("rect", { x: x2 - 2.8, y: y2 - 2.4, width: 5.6, height: 5, fill: cols[a] }, rot);
        }
        this.wheel = { el: rot, x: WX, y: WY, a: 0 };
        this.hook(g, {
          c: P.mag,
          kick: "THE WATERFRONT",
          title: "Pier Wheel",
          body: "Every city needs one thing that exists purely because it looks good at night.",
          stack: "Music · Long walks · Zero deadlines",
        });
      });
    }

    addHarborCrane() {
      const q = HCRANE[0],
        r = HCRANE[1];
      this.add(S(q, r), (g) => {
        const p = ctr(q, r);
        el("rect", { x: p[0] - 3, y: p[1] - 40, width: 6, height: 46, fill: P.gold }, g);
        el("rect", { x: p[0] - 3, y: p[1] - 40, width: 32, height: 4, fill: P.gold }, g);
        el("line", { x1: p[0] + 26, y1: p[1] - 36, x2: p[0] + 26, y2: p[1] - 18, stroke: P.gold, "stroke-width": 1.2 }, g);
        el("rect", { x: p[0] + 20, y: p[1] - 18, width: 12, height: 7, fill: P.pink }, g);
        this.hook(g, {
          c: P.gold,
          kick: "THE HARBOR",
          title: "Shipping Dock",
          body: "Where finished work leaves the city. Containers stacked, queue moving, nothing sitting still for long.",
          stack: "Ship it",
        });
      });
    }

    tilt(L, th) {
      const H = Math.hypot(L.vx, L.vy);
      const vtx = Math.cos(th) * L.vx,
        vty = Math.cos(th) * L.vy - Math.sin(th) * H;
      const det = L.vx * L.wy - L.wx * L.vy;
      const a = (vtx * L.wy - L.wx * L.vy) / det,
        b = (L.wy * (vty - L.vy)) / det,
        c = (L.wx * (L.vx - vtx)) / det,
        d = (L.wy * L.vx - vty * L.wx) / det;
      const e = L.hx - (a * L.hx + c * L.hy),
        f = L.hy - (b * L.hx + d * L.hy);
      L.g.setAttribute(
        "transform",
        "matrix(" + a + " " + b + " " + c + " " + d + " " + e + " " + f + ")",
      );
    }

    buildBridges() {
      const mk = (fixed, axis) => {
        const cells = [];
        const n = axis === "q" ? NR : NQ;
        for (let i = 0; i < n; i++) {
          const q = axis === "q" ? fixed : i,
            r = axis === "q" ? i : fixed;
          if (isRiver(q, r)) cells.push([q, r]);
        }
        if (cells.length < 3) return null;
        const hw = axis === "q" ? [TW * 0.46, TW * 0.23] : [-TW * 0.46, TW * 0.23];
        const at = (t) => (axis === "q" ? ctr(fixed, t) : ctr(t, fixed));
        const t0 = axis === "q" ? cells[0][1] : cells[0][0];
        const s0 = S(cells[0][0], cells[0][1]),
          s2 = S(cells[2][0], cells[2][1]);
        const leaf = (tA, tB, band) => {
          const g = el("g", {}, this.bands[band]);
          const A = at(tA),
            B = at(tB);
          poly(
            A[0] - hw[0] + "," + (A[1] - hw[1]) + " " + (A[0] + hw[0]) + "," + (A[1] + hw[1]) + " " +
              (B[0] + hw[0]) + "," + (B[1] + hw[1]) + " " + (B[0] - hw[0]) + "," + (B[1] - hw[1]),
            "#231346",
            g,
          );
          poly(
            A[0] - hw[0] + "," + (A[1] - hw[1] - 3) + " " + (A[0] + hw[0]) + "," + (A[1] + hw[1] - 3) + " " +
              (B[0] + hw[0]) + "," + (B[1] + hw[1] - 3) + " " + (B[0] - hw[0]) + "," + (B[1] - hw[1] - 3),
            "#4a4180",
            g,
          );
          for (let t = 0.12; t < 1; t += 0.2) {
            const mx = A[0] + (B[0] - A[0]) * t,
              my = A[1] + (B[1] - A[1]) * t;
            el(
              "line",
              { x1: mx - hw[0] * 0.4, y1: my - hw[1] * 0.4 - 3, x2: mx + hw[0] * 0.4, y2: my + hw[1] * 0.4 - 3, stroke: P.gold, "stroke-width": 1, opacity: 0.55 },
              g,
            );
          }
          for (const s of [1, -1]) {
            el("line", { x1: A[0] + hw[0] * s, y1: A[1] + hw[1] * s - 3, x2: B[0] + hw[0] * s, y2: B[1] + hw[1] * s - 3, stroke: P.gold, "stroke-width": 1.4 }, g);
            el("line", { x1: A[0] + hw[0] * s, y1: A[1] + hw[1] * s - 3, x2: A[0] + hw[0] * s, y2: A[1] + hw[1] * s - 13, stroke: P.gold, "stroke-width": 1.1 }, g);
            el("line", { x1: B[0] + hw[0] * s, y1: B[1] + hw[1] * s - 3, x2: B[0] + hw[0] * s, y2: B[1] + hw[1] * s - 13, stroke: P.gold, "stroke-width": 1.1 }, g);
            el("line", { x1: A[0] + hw[0] * s, y1: A[1] + hw[1] * s - 13, x2: B[0] + hw[0] * s, y2: B[1] + hw[1] * s - 13, stroke: P.gold, "stroke-width": 0.9, opacity: 0.7 }, g);
          }
          return {
            g: g,
            hx: A[0],
            hy: A[1],
            vx: B[0] - A[0],
            vy: B[1] - A[1],
            wx: hw[0] * 2,
            wy: hw[1] * 2,
          };
        };
        const mid = t0 + 1;
        const far = leaf(t0 - 0.5, mid, s0);
        const near = leaf(t0 + 2.5, mid, s2);
        const b = { far: far, near: near, bx: at(mid)[0], angle: 0, target: 0, axis: axis, fixed: fixed };
        this.bridges.push(b);
        return b;
      };
      mk(BRQ, "q");
      mk(BRR, "r");
    }

    carSprite(c, s) {
      s = s || 1;
      const out = el("g", {});
      const g = el("g", { transform: "scale(0.8)" }, out);
      const pt = (a, b, h) => 2 * s * (a - b) + "," + (a + b - h);
      const quad = (p1, p2, p3, p4, col) => poly(p1 + " " + p2 + " " + p3 + " " + p4, col, g);
      const fA = s > 0 ? 0.9 : 0.56,
        fB = s > 0 ? 0.56 : 0.9;
      const box = (a0, a1, b0, b1, y0, y1, col) => {
        quad(pt(a1, b0, y0), pt(a1, b1, y0), pt(a1, b1, y1), pt(a1, b0, y1), sh(col, fA));
        quad(pt(a0, b1, y0), pt(a1, b1, y0), pt(a1, b1, y1), pt(a0, b1, y1), sh(col, fB));
        quad(pt(a0, b0, y1), pt(a1, b0, y1), pt(a1, b1, y1), pt(a0, b1, y1), sh(col, 1.18));
      };
      const TYRE = "#0b0918";
      el("ellipse", { cx: 0, cy: 0.8, rx: 13.4, ry: 5.8, fill: "#05010f", opacity: 0.36 }, g);
      box(2.1, 4.0, -2.6, -1.9, 0, 2.6, TYRE);
      box(-4.0, -2.1, -2.6, -1.9, 0, 2.6, TYRE);
      box(-4.8, 4.8, -2.0, 2.0, 1.4, 6.2, c);
      quad(pt(-4.8, 2, 2.9), pt(4.8, 2, 2.9), pt(4.8, 2, 3.6), pt(-4.8, 2, 3.6), sh(c, fB * 0.5));
      box(2.1, 4.0, 1.9, 2.6, 0, 2.6, TYRE);
      box(-4.0, -2.1, 1.9, 2.6, 0, 2.6, TYRE);
      box(-3.3, 1.5, -1.7, 1.7, 6.2, 10.8, c);
      quad(pt(1.5, -1.3, 7.1), pt(1.5, 1.3, 7.1), pt(1.5, 1.3, 10.2), pt(1.5, -1.3, 10.2), "#0d1b32");
      quad(pt(-2.8, 1.7, 7.1), pt(1.1, 1.7, 7.1), pt(1.1, 1.7, 10.2), pt(-2.8, 1.7, 10.2), "#0d1b32");
      quad(pt(-0.4, 1.7, 7.5), pt(0.9, 1.7, 7.5), pt(0.9, 1.7, 9.9), pt(-0.4, 1.7, 9.9), "#3f7398");
      quad(pt(4.8, -1.7, 3.5), pt(4.8, -0.7, 3.5), pt(4.8, -0.7, 4.9), pt(4.8, -1.7, 4.9), "#fff6cf");
      quad(pt(4.8, 0.7, 3.5), pt(4.8, 1.7, 3.5), pt(4.8, 1.7, 4.9), pt(4.8, 0.7, 4.9), "#fff6cf");
      quad(pt(-4.8, 2, 3.5), pt(-3.9, 2, 3.5), pt(-3.9, 2, 5.1), pt(-4.8, 2, 5.1), P.pink);
      return out;
    }

    pedSprite(c) {
      const out = el("g", {});
      const g = el("g", { transform: "scale(0.78)" }, out);
      const D = "#1b1040";
      el("ellipse", { cx: 0, cy: 0.6, rx: 3.6, ry: 1.7, fill: "#05010f", opacity: 0.36 }, g);
      const lL = el("rect", { x: -2.1, y: -4.8, width: 1.8, height: 5, fill: sh(D, 1.55) }, g);
      const lR = el("rect", { x: 0.3, y: -4.8, width: 1.8, height: 5, fill: D }, g);
      const aL = el("rect", { x: -3.5, y: -9.3, width: 1.3, height: 4.2, fill: sh(c, 0.55) }, g);
      el("rect", { x: -2.4, y: -9.8, width: 4.8, height: 5.2, fill: c }, g);
      el("rect", { x: -2.4, y: -9.8, width: 1.6, height: 5.2, fill: sh(c, 0.6) }, g);
      el("rect", { x: -2.4, y: -9.8, width: 4.8, height: 0.9, fill: sh(c, 1.4) }, g);
      const aR = el("rect", { x: 2.3, y: -9.3, width: 1.3, height: 4.2, fill: sh(c, 1.18) }, g);
      el("rect", { x: -1.9, y: -13.9, width: 3.8, height: 4.2, fill: "#c99a72" }, g);
      el("rect", { x: -1.9, y: -13.9, width: 1.3, height: 4.2, fill: "#a3785a" }, g);
      el("rect", { x: -2.1, y: -14.4, width: 4.2, height: 1.9, fill: "#14092c" }, g);
      el("rect", { x: 0.5, y: -12.2, width: 1.4, height: 0.9, fill: "#14092c" }, g);
      return { g: out, lL: lL, lR: lR, aL: aL, aR: aR };
    }

    buildActors() {
      const shipY = ctr(0, 21)[1];
      this.shipY = shipY;
      const ship = el("g", {}, this.bands[21]);
      const hull = (L, W, H, c) => {
        poly(-L + ",0 0," + W + " " + L + ",0 0," + -W, sh(c, 1.1), ship);
        poly(-L + ",0 0," + W + " 0," + (W + H) + " " + -L + "," + H, sh(c, 0.55), ship);
        poly("0," + W + " " + L + ",0 " + L + "," + H + " 0," + (W + H), sh(c, 0.75), ship);
      };
      hull(34, 9, 8, "#2a5a8a");
      [[-17, -1, P.pink], [-3, -1, P.cyan], [11, -1, P.purple], [-10, -8, P.gold], [4, -8, P.mag]].forEach((o) => {
        const g = el("g", { transform: "translate(" + o[0] + "," + o[1] + ")" }, ship);
        poly("-7.5,0 0,3.8 7.5,0 0,-3.8", sh(o[2], 1.1), g);
        poly("-7.5,0 0,3.8 0,-4.4 -7.5,-8.2", sh(o[2], 0.55), g);
        poly("0,3.8 7.5,0 7.5,-8.2 0,-4.4", sh(o[2], 0.8), g);
      });
      const br = el("g", { transform: "translate(22,-3)" }, ship);
      poly("-6.5,0 0,3.2 6.5,0 0,-3.2", "#d1f7ff", br);
      poly("-6.5,0 0,3.2 0,-10 -6.5,-13.2", "#9db6c9", br);
      poly("0,3.2 6.5,0 6.5,-13.2 0,-10", "#b8cede", br);
      el("rect", { x: -4.6, y: -10, width: 3.6, height: 2.4, fill: P.cyan }, br);
      el("rect", { x: 1.4, y: -11.4, width: 3.6, height: 2.4, fill: P.cyan }, br);
      el("rect", { x: -1, y: -21, width: 2, height: 8, fill: "#7a8fa0" }, br);
      this.ship = ship;
      this.shipX = -80;
      this.shipDir = 1;
      this.wake = el("g", {}, this.bands[21]);
      for (let i = 0; i < 5; i++) el("ellipse", { cx: 0, cy: 0, rx: 0, ry: 0, fill: "#0f6592", opacity: 0.5 }, this.wake);

      const mkCar = (c, axis, t, spd) => {
        const face = axis === "q" ? -1 : 1;
        const g = this.carSprite(c, face);
        const fixed = axis === "q" ? BRQ : BRR;
        const pos = t * ((axis === "q" ? NR : NQ) - 1);
        const cc = axis === "q" ? ctr(fixed, pos) : ctr(pos, fixed);
        g.setAttribute("transform", "translate(" + (cc[0] + (axis === "q" ? 8 : -8)) + "," + (cc[1] - 2) + ")");
        this.bands[Math.round(fixed + pos)].appendChild(g);
        this.actors.push({ g: g, kind: "car", axis: axis, fixed: fixed, t: t, spd: spd });
      };
      mkCar(P.gold, "q", 0.05, 0.0016);
      mkCar(P.pink, "q", 0.42, 0.0013);
      mkCar("#d1f7ff", "q", 0.74, 0.0015);
      mkCar(P.cyan, "r", 0.2, 0.0015);
      mkCar(P.mag, "r", 0.58, 0.0012);
      mkCar(P.purple, "r", 0.88, 0.0014);

      const parked = [[10, 3], [10, 13], [4, 7], [20, 6], [4, 17], [20, 15], [14, 10], [7, 10]];
      for (const [q, r] of parked) {
        if (isRiver(q, r) || isBank(q, r)) continue;
        const p = ctr(q, r),
          vert = QST.includes(q);
        const g = this.carSprite(this.pick([P.purple, "#4a70b4", P.mag, "#8a7fd0"]), vert ? -1 : 1);
        g.setAttribute("transform", "translate(" + (p[0] + (vert ? 7 : -7)) + "," + (p[1] + 1) + ") scale(0.9)");
        this.bands[Math.min(this.bands.length - 1, q + r)].appendChild(g);
      }

      for (let i = 0; i < 12; i++) {
        const sum = i % 2 ? RIVER_LO - 1 : RIVER_HI + 1;
        const c = [P.cyan, P.mag, P.gold, P.purple, "#d1f7ff"][i % 5];
        const s = this.pedSprite(c);
        this.bands[sum].appendChild(s.g);
        const t = 0.1 + this.rnd() * 0.8,
          dir = this.rnd() < 0.5 ? 1 : -1;
        const p0 = ctr(t * (NQ - 1), sum - t * (NQ - 1));
        s.g.setAttribute(
          "transform",
          "translate(" + p0[0] + "," + (p0[1] + (sum < RIVER_LO ? 8 : -7)) + ") scale(" + dir + ",1)",
        );
        this.actors.push({
          g: s.g,
          lL: s.lL,
          lR: s.lR,
          aL: s.aL,
          aR: s.aR,
          kind: "ped",
          sum: sum,
          t: t,
          dir: dir,
          spd: 0.0004 + this.rnd() * 0.0003,
        });
      }

      this.svg.addEventListener("pointerdown", (e) => {
        this.lastPointer = e.pointerType;
      });
      this.svg.addEventListener("click", (e) => {
        if (this.active && !this.active.contains(e.target)) this.off(this.active);
      });
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.active) this.off(this.active);
      });
    }

    buildHeli() {
      const g = el("g", {}, this.sky);
      const b = el("g", {}, g);
      poly("-13,0 0,6 13,0 0,-6", sh(P.pink, 0.6), b);
      poly("-13,-6 0,-0.5 0,6 -13,0", sh(P.pink, 0.8), b);
      poly("0,-0.5 13,-6 13,0 0,6", sh(P.pink, 1.05), b);
      poly("-13,-6 0,-0.5 13,-6 0,-11", sh(P.pink, 1.25), b);
      poly("6,-7.4 13,-6 13,0 9.5,-1.4", "#0a1a2e", b);
      el("rect", { x: -26, y: -5, width: 14, height: 2.2, fill: sh(P.pink, 0.8) }, b);
      el("rect", { x: -28.5, y: -11, width: 2.2, height: 7, fill: sh(P.pink, 1) }, b);
      el("rect", { x: -7, y: 2.5, width: 14, height: 1.8, fill: "#3a2f70" }, b);
      el("line", { x1: -5, y1: 4, x2: -5, y2: 7.5, stroke: "#3a2f70", "stroke-width": 1.5 }, b);
      el("line", { x1: 5, y1: 4, x2: 5, y2: 7.5, stroke: "#3a2f70", "stroke-width": 1.5 }, b);
      el("rect", { x: -10, y: 7.5, width: 20, height: 1.8, fill: "#3a2f70" }, b);
      el("rect", { x: -1.1, y: -17, width: 2.2, height: 6, fill: "#3a2f70" }, b);
      this.rotor = el("g", { transform: "translate(0,-17)" }, b);
      el("ellipse", { cx: 0, cy: 0, rx: 31, ry: 3.8, fill: "#8a7fd0", opacity: 0.35 }, this.rotor);
      el("ellipse", { cx: 0, cy: 0, rx: 31, ry: 1.4, fill: "#d1f7ff", opacity: 0.5 }, this.rotor);
      this.tailRotor = el("ellipse", { cx: -28.5, cy: -7.5, rx: 1.6, ry: 6, fill: "#8a7fd0", opacity: 0.4 }, b);
      this.heliLight = el("circle", { cx: 12, cy: 1.5, r: 1.9, fill: P.pink }, b);
      this.heli = g;
      this.ht = 0;
    }

    frame(now) {
      const dt = Math.min(50, now - (this._last || now - 16));
      this._last = now;
      const k = dt / 16;

      this.shipX += this.shipDir * 0.3 * k;
      if (this.shipX > VW + 90) this.shipDir = -1;
      if (this.shipX < -90) this.shipDir = 1;
      this.ship.setAttribute("transform", "translate(" + this.shipX + "," + this.shipY + ") scale(" + this.shipDir + ",1)");
      this.wake.setAttribute("transform", "translate(" + this.shipX + "," + (this.shipY + 5) + ")");
      const wk = this.wake.childNodes;
      for (let i = 0; i < wk.length; i++) {
        const s = i + 1;
        wk[i].setAttribute("cx", -this.shipDir * (34 + s * 13));
        wk[i].setAttribute("rx", 5 + s * 2.6);
        wk[i].setAttribute("ry", 1.6 + s * 0.6);
        wk[i].setAttribute("opacity", Math.max(0, 0.42 - s * 0.07));
      }

      for (const b of this.bridges) {
        b.target = Math.abs(this.shipX - b.bx) < 150 ? 1 : 0;
        b.angle += (b.target - b.angle) * Math.min(1, 0.045 * k);
        const th = b.angle * BASCULE;
        this.tilt(b.far, th);
        this.tilt(b.near, th);
      }
      const openQ = this.bridges[0] && this.bridges[0].angle > 0.1;
      const openR = this.bridges[1] && this.bridges[1].angle > 0.1;

      for (const a of this.actors) {
        if (a.kind === "car") {
          const span = a.axis === "q" ? NR - 1 : NQ - 1;
          const lo = RIVER_LO - a.fixed - 0.7,
            hi = RIVER_HI - a.fixed + 0.7;
          const pos = a.t * span;
          const open = a.axis === "q" ? openQ : openR;
          const inSpan = pos > lo && pos < hi;
          const waiting = open && !inSpan && pos > lo - 1.3 && pos < hi + 1.3;
          if (!waiting) a.t = (a.t + a.spd * k) % 1;
          const p2 = a.t * span;
          const c = a.axis === "q" ? ctr(a.fixed, p2) : ctr(p2, a.fixed);
          const off = a.axis === "q" ? 8 : -8;
          a.g.setAttribute("transform", "translate(" + (c[0] + off) + "," + (c[1] - 2) + ")");
          const d = Math.round(a.axis === "q" ? a.fixed + p2 : p2 + a.fixed);
          const band = this.bands[Math.max(0, Math.min(this.bands.length - 1, d))];
          if (a.g.parentNode !== band) band.appendChild(a.g);
          a.g.setAttribute("opacity", open && p2 > lo && p2 < hi ? 0 : 1);
        } else {
          a.t += a.spd * a.dir * k;
          const lo = Math.max(0.6, a.sum - (NR - 1.6)) / (NQ - 1),
            hi = Math.min(NQ - 1.6, a.sum - 0.6) / (NQ - 1);
          if (a.t >= hi) {
            a.t = hi;
            a.dir = -1;
          }
          if (a.t <= lo) {
            a.t = lo;
            a.dir = 1;
          }
          const q = a.t * (NQ - 1),
            r = a.sum - q;
          const c = ctr(q, r);
          const ph = Math.sin(a.t * 240);
          a.lL.setAttribute("transform", "translate(" + (ph * 1.6).toFixed(2) + ",0)");
          a.lR.setAttribute("transform", "translate(" + (-ph * 1.6).toFixed(2) + ",0)");
          a.aL.setAttribute("transform", "translate(" + (-ph * 1.2).toFixed(2) + ",0)");
          a.aR.setAttribute("transform", "translate(" + (ph * 1.2).toFixed(2) + ",0)");
          const by = c[1] + (a.sum < RIVER_LO ? 8 : -7) - Math.abs(ph) * 0.7;
          a.g.setAttribute("transform", "translate(" + c[0] + "," + by.toFixed(2) + ") scale(" + a.dir + ",1)");
          const band = this.bands[a.sum];
          if (a.g.parentNode !== band) band.appendChild(a.g);
        }
      }

      this.ht += 0.0021 * k;
      const hx = VW / 2 + Math.cos(this.ht) * 400,
        hy = 96 + Math.sin(this.ht * 1.3) * 44;
      const hdir = Math.sin(this.ht) > 0 ? -1 : 1;
      this.heli.setAttribute("transform", "translate(" + hx + "," + hy + ") scale(" + hdir + ",1)");
      this.rotor.setAttribute("transform", "translate(0,-17) scale(" + Math.cos(now / 26).toFixed(3) + ",1)");
      this.tailRotor.setAttribute("rx", 1.6 + Math.abs(Math.sin(now / 20)) * 2.8);
      this.heliLight.setAttribute("opacity", Math.floor(now / 420) % 2 ? 1 : 0.15);

      if (this.crane) {
        this.crane.a += 0.13 * k;
        this.crane.jib.setAttribute("transform", "rotate(" + this.crane.a + ")");
        const ar = (this.crane.a * Math.PI) / 180;
        const jx = this.crane.mx + Math.cos(ar) * 56,
          jy = this.crane.my + Math.sin(ar) * 28;
        this.crane.hook.setAttribute("transform", "translate(" + jx + "," + jy + ") rotate(" + Math.sin(now / 700) * 5 + ")");
      }
      if (this.wheel) {
        this.wheel.a += 0.12 * k;
        this.wheel.el.setAttribute("transform", "rotate(" + this.wheel.a + " " + this.wheel.x + " " + this.wheel.y + ")");
      }
      if (this.beacon) this.beacon.setAttribute("opacity", Math.floor(now / 600) % 2 ? 1 : 0.2);
      if (this.laptop) this.laptop.setAttribute("opacity", 0.7 + Math.sin(now / 300) * 0.18);

      this.animateBillboard(now, k);

      if (Math.random() < 0.5)
        for (let i = 0; i < 4; i++) {
          const w = this.wins[Math.floor(Math.random() * this.wins.length)];
          if (w) w.setAttribute("fill", Math.random() < 0.3 ? "#8a7fd0" : "#241250");
        }
      for (const w of this.waves)
        if (Math.random() < 0.02) w.setAttribute("opacity", 0.25 + Math.random() * 0.6);
    }

    animateBillboard(now, k) {
      if (!this.glitchSlices) return;
      if (this.scan) this.scan.setAttribute("transform", "translate(0," + ((now / 26) % 4) + ")");

      const blink = Math.floor(now / 2900) % 2 === 0 && now % 2900 < 140;
      if (this.eyeL) {
        const h = blink ? 0.5 : 3;
        const U = 176 / 30;
        this.eyeL.setAttribute("height", h * U);
        this.eyeR.setAttribute("height", h * U);
        this.pupL.setAttribute("opacity", blink ? 0 : 1);
        this.pupR.setAttribute("opacity", blink ? 0 : 1);
        const look = Math.sin(now / 1900) * 0.45;
        this.pupL.setAttribute("x", (12.1 + look) * U);
        this.pupR.setAttribute("x", (16.7 + look) * U);
        const talk = 0.8 + Math.max(0, Math.sin(now / 260)) * 1.5;
        this.mouth.setAttribute("height", talk * U);
      }

      if (this._gl == null) this._gl = 0;
      this._gl -= k;
      if (this._gl <= 0) {
        this._gl = Math.random() < 0.25 ? 8 + Math.random() * 14 : 60 + Math.random() * 220;
        this._glOn = this._gl < 40;
      }
      const on = this._glOn && this._gl > 0;
      this.glitchSlices.forEach((s, i) => {
        const dx = on ? (Math.random() - 0.5) * 26 : 0;
        s.setAttribute("transform", "translate(" + dx.toFixed(2) + ",0)");
      });
      if (this.ghost) {
        this.ghost.setAttribute("opacity", on ? 0.45 : 0);
        const gx = on ? (Math.random() - 0.5) * 14 : 0;
        this.ghost.setAttribute(
          "transform",
          "translate(" + (this.ghostAt[0] + gx).toFixed(2) + "," + this.ghostAt[1] + ")",
        );
      }
      if (this.screen) this.screen.setAttribute("opacity", on ? 0.55 + Math.random() * 0.45 : 0.93 + Math.random() * 0.07);
      if (this.airing) this.airing.setAttribute("opacity", Math.floor(now / 700) % 2 ? 1 : 0.3);
    }
  }

  if (!customElements.get("pixel-city")) customElements.define("pixel-city", PixelCity);
})();
