(function () {
  const PAL = ["#ff2a6d", "#05d9e8", "#ff6ac1", "#9d4edd", "#f8b800"];
  function reg(n, c) {
    if (!customElements.get(n)) customElements.define(n, c);
  }

  class PixelScene extends HTMLElement {
    connectedCallback() {
      this._dead = false;
      if (this.ctx) {
        this._loop();
        return;
      }
      if (this._p) return;
      this._p = 1;
      setTimeout(() => {
        this._p = 0;
        if (!this._dead && !this.ctx) this.setup();
      }, 0);
    }
    disconnectedCallback() {
      this._dead = 1;
      cancelAnimationFrame(this._raf);
    }
    attr(n, d) {
      const v = this.getAttribute(n);
      return v == null || v === "" ? d : v;
    }
    setup() {
      if (this._dead) return;
      this.W = +this.attr("width", 356);
      this.H = +this.attr("height", 300);
      this.cell = +this.attr("cell", 12);
      this.bg = this.attr("bg", "#07011a");
      this.gridc = this.attr("grid", "#170b38");
      this.colors = this.attr("colors", PAL.join(",")).split(",");
      this.font = this.attr("font", "'Press Start 2P'");
      this.hint = this.attr("hint", "");
      this.cols = Math.floor(this.W / this.cell);
      this.rows = Math.floor(this.H / this.cell);
      this.style.display = "block";
      this.style.width = this.W + "px";
      this.style.height = this.H + "px";
      const c = (this.cv = document.createElement("canvas"));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = this.W * dpr;
      c.height = this.H * dpr;
      c.style.width = this.W + "px";
      c.style.height = this.H + "px";
      this.appendChild(c);
      this.ctx = c.getContext("2d");
      this.ctx.scale(dpr, dpr);
      this.t0 = performance.now();
      if (this.init) this.init();
      this._loop();
    }
    _loop() {
      cancelAnimationFrame(this._raf);
      const step = (t) => {
        if (this._dead) return;
        try {
          this.frame((t - this.t0) / 1000);
          this.drawHint();
        } catch (e) {}
        this._raf = requestAnimationFrame(step);
      };
      this._raf = requestAnimationFrame(step);
    }
    drawHint() {
      if (!this.hint) return;
      const ctx = this.ctx,
        fs = 8;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.textAlign = "start";
      ctx.textBaseline = "top";
      ctx.font = fs + "px 'Press Start 2P'";
      const w = Math.ceil(ctx.measureText(this.hint).width);
      ctx.fillStyle = this.bg;
      ctx.fillRect(0, 0, w + 12, 18);
      ctx.fillStyle = "#5a4f90";
      ctx.fillText(this.hint, 6, 5);
      ctx.restore();
    }
    grid() {
      const ctx = this.ctx,
        s = this.cell;
      ctx.fillStyle = this.bg;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.strokeStyle = this.gridc;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= this.cols; x++) {
        ctx.moveTo(x * s + 0.5, 0);
        ctx.lineTo(x * s + 0.5, this.rows * s);
      }
      for (let y = 0; y <= this.rows; y++) {
        ctx.moveTo(0, y * s + 0.5);
        ctx.lineTo(this.cols * s, y * s + 0.5);
      }
      ctx.stroke();
    }
    blk(cx, cy, col, w, h) {
      w = w || 1;
      h = h || 1;
      const s = this.cell,
        ctx = this.ctx,
        x = cx * s,
        y = cy * s,
        ww = s * w,
        hh = s * h;
      if (x + ww < 0 || y + hh < 0 || x > this.W || y > this.H) return;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, ww, hh);
      ctx.fillStyle = "rgba(255,255,255,.28)";
      ctx.fillRect(x, y, ww, 2);
      ctx.fillRect(x, y, 2, hh);
      ctx.fillStyle = "rgba(0,0,0,.4)";
      ctx.fillRect(x, y + hh - 2, ww, 2);
      ctx.fillRect(x + ww - 2, y, 2, hh);
    }
    sprite(map, key, cx, cy) {
      for (let r = 0; r < map.length; r++) {
        const row = map[r];
        for (let c = 0; c < row.length; c++) {
          const ch = row[c];
          if (ch !== "." && key[ch]) this.blk(cx + c, cy + r, key[ch]);
        }
      }
    }
  }

  class Viz extends PixelScene {
    reel(cx, cy, a) {
      for (let i = 0; i < 12; i++) {
        const th = (i / 12) * Math.PI * 2;
        this.blk(
          cx + Math.round(Math.cos(th) * 2),
          cy + Math.round(Math.sin(th) * 2),
          "#ff2a6d",
        );
      }
      this.blk(
        cx + Math.round(Math.cos(a)),
        cy + Math.round(Math.sin(a)),
        "#f8b800",
      );
      this.blk(
        cx - Math.round(Math.cos(a)),
        cy - Math.round(Math.sin(a)),
        "#f8b800",
      );
      this.blk(cx, cy, "#f8b800");
    }
    frame(t) {
      this.grid();
      const cx = Math.floor(this.cols / 2),
        m = Math.floor(this.rows / 2),
        s = this.cell,
        ctx = this.ctx;
      const x0 = cx - 11,
        x1 = cx + 11,
        y0 = m - 7,
        y1 = m + 7;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) this.blk(x, y, "#ff2a6d");
      for (let y = y0 + 2; y <= y0 + 4; y++)
        for (let x = x0 + 2; x <= x1 - 2; x++) this.blk(x, y, "#9d4edd");
      for (let x = x0 + 3; x <= x1 - 3; x += 2) this.blk(x, y0 + 3, "#ff6ac1");
      for (let y = m - 2; y <= m + 3; y++)
        for (let x = cx - 8; x <= cx + 8; x++) this.blk(x, y, "#12063a");
      const ang = t * 4;
      this.reel(cx - 4, m, ang);
      this.reel(cx + 4, m, -ang);
      for (let x = cx - 2; x <= cx + 2; x++) this.blk(x, m - 2, "#f8b800");
      ctx.font = Math.round(s * 1.2) + "px " + this.font;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillStyle = "#f8b800";
      ctx.fillText("MIX", cx * s + s / 2, (y1 - 1.5) * s);
      ctx.textAlign = "start";
      [
        [x0 + 1, y0 + 1],
        [x1 - 1, y0 + 1],
        [x0 + 1, y1 - 1],
        [x1 - 1, y1 - 1],
      ].forEach((p) => this.blk(p[0], p[1], "#f8b800"));
    }
  }

  class Book extends PixelScene {
    frame(t) {
      this.grid();
      const sx = Math.floor(this.cols / 2),
        pw = 9,
        ph = 11,
        by = Math.floor(this.rows / 2) - 5;
      for (let r = -1; r <= ph; r++)
        for (let c = -pw - 1; c <= pw; c++) this.blk(sx + c, by + r, "#ff2a6d");
      for (let r = 0; r < ph; r++)
        for (let c = 1; c <= pw; c++) {
          this.blk(sx - c, by + r, "#05d9e8");
          this.blk(sx - 1 + c, by + r, "#ff6ac1");
        }
      for (let r = 1; r < ph - 1; r += 2)
        for (let c = 2; c <= pw - 1; c++) {
          this.blk(sx - c, by + r, "rgba(13,2,33,.45)");
          this.blk(sx - 1 + c, by + r, "rgba(13,2,33,.4)");
        }
      for (let r = -1; r <= ph; r++) this.blk(sx - 1, by + r, "#9d4edd");
      const cyc = (t * 0.5) % 1.6,
        p = Math.min(1, cyc),
        ang = p * Math.PI;
      const side = Math.cos(ang) >= 0 ? 1 : -1,
        w = Math.max(1, Math.round(pw * Math.abs(Math.cos(ang))));
      for (let c = 1; c <= w; c++) {
        const colX = sx - 1 + side * c,
          edge = c === w;
        for (let r = 0; r < ph; r++)
          this.blk(colX, by + r, edge ? "#f8b800" : "#ffd23f");
      }
    }
  }

  class Term extends PixelScene {
    init() {
      this.lines = [
        "$ ssh azure-vm",
        "  connected ok",
        "$ status hermes",
        "  ok: running",
        "$ uptime",
        "  47 days up",
        "$ deploy --all",
        "  shipping...",
      ];
      this.full = this.lines.join("\n");
    }
    frame(t) {
      this.grid();
      const ctx = this.ctx,
        s = this.cell,
        total = this.full.length,
        cps = 16,
        period = total + 28;
      let n = Math.floor(t * cps) % period;
      if (n > total) n = total;
      const shown = this.full.slice(0, n).split("\n");
      ctx.font = Math.round(s * 0.86) + "px " + this.font;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      const lh = 2,
        startCol = 1,
        startRow = 2;
      shown.forEach((ln, i) => {
        const row = startRow + i * lh;
        ctx.fillStyle = "rgba(5,217,232,.05)";
        ctx.fillRect(0, row * s, this.W, s);
        ctx.fillStyle = ln[0] === "$" ? "#ff2a6d" : "#05d9e8";
        for (let c = 0; c < ln.length; c++)
          ctx.fillText(ln[c], (startCol + c) * s + s / 2, row * s + s / 2 + 1);
      });
      ctx.textAlign = "start";
      if (Math.floor(t * 2) % 2 === 0 && shown.length) {
        const li = shown.length - 1,
          col = startCol + shown[li].length,
          row = startRow + li * lh;
        this.blk(col, row, "#05d9e8");
      }
    }
  }

  class Fight extends PixelScene {
    init() {
      const rnd = (i) => {
        const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
      };
      this.stars = [];
      for (let i = 0; i < 14; i++)
        this.stars.push({
          x: Math.floor(rnd(i) * this.cols),
          y: Math.floor(rnd(i + 50) * 10),
          ph: rnd(i + 90) * 6,
        });
      this.petals = [];
      for (let i = 0; i < 10; i++)
        this.petals.push({
          x0: rnd(i + 7) * this.cols,
          speed: 1.6 + rnd(i + 31) * 1.6,
          ph: rnd(i + 63) * 20,
          sway: 1 + rnd(i + 83) * 2,
        });
    }
    frame(t) {
      this.grid();
      const cols = this.cols,
        rows = this.rows,
        cx = Math.floor(cols / 2),
        s = this.cell,
        ctx = this.ctx;
      this.stars.forEach((st) => {
        if (Math.floor(t * 1.6 + st.ph) % 3 !== 0)
          this.blk(st.x, st.y + 4, "#d1f7ff");
      });
      const mx = cols - 7,
        my = 7,
        r = 3.4;
      for (let dy = -4; dy <= 4; dy++)
        for (let dx = -4; dx <= 4; dx++) {
          const d = Math.hypot(dx, dy);
          if (d <= r)
            this.blk(mx + dx, my + dy, d <= r - 1.4 ? "#f8b800" : "#ffd23f");
        }
      const gx = cx - 8,
        gy = rows - 4;
      for (let c = gx - 2; c <= gx + 9; c++) this.blk(c, gy - 8, "#ff2a6d");
      for (let c = gx - 1; c <= gx + 8; c++) this.blk(c, gy - 7, "#ff2a6d");
      for (let c = gx; c <= gx + 7; c++) this.blk(c, gy - 5, "#ff2a6d");
      for (let r = gy - 7; r <= gy; r++) {
        this.blk(gx + 1, r, "#ff2a6d");
        this.blk(gx + 6, r, "#ff2a6d");
      }
      this.blk(gx + 3, gy - 7, "#ff2a6d");
      this.blk(gx + 4, gy - 7, "#ff2a6d");
      for (let c = 0; c < cols; c++) this.blk(c, rows - 3, "#3a1d6e");
      for (let r = rows - 2; r < rows; r++)
        for (let c = 0; c < cols; c++) this.blk(c, r, "#2a1458");
      this.petals.forEach((p, i) => {
        const y = ((t * p.speed + p.ph) % (rows + 6)) - 3;
        const x =
          Math.floor(p.x0 + Math.sin(t * 0.9 + p.ph) * p.sway + cols) % cols;
        const ry = Math.min(Math.floor(y), rows - 3);
        if (ry >= 0) this.blk(x, ry, i % 3 === 0 ? "#ff2a6d" : "#ff6ac1");
      });
    }
  }

  class Read extends PixelScene {
    init() {
      this.quotes = [
        "This story is for just that one reader.",
        "There are three ways to survive in a ruined world. I have forgotten some of them now. However, one thing is certain: you who are currently reading these words will survive.",
        "It was a happy smile, an exaggerated smile, a ridiculous smile",
      ];
      this.durs = this.quotes.map((q) => q.length / 22 + 3.4);
      this.cyc = this.durs.reduce((a, b) => a + b, 0);
    }
    wrapChars(txt, maxChars) {
      const words = txt.split(" "),
        L = [];
      let c = "";
      for (const w of words) {
        const tr = c ? c + " " + w : w;
        if (tr.length > maxChars && c) {
          L.push(c);
          c = w;
        } else c = tr;
      }
      if (c) L.push(c);
      return L;
    }
    frame(t) {
      this.grid();
      const ctx = this.ctx,
        s = this.cell;
      let tt = t % this.cyc,
        qi = 0;
      while (qi < this.quotes.length - 1 && tt >= this.durs[qi]) {
        tt -= this.durs[qi];
        qi++;
      }
      const q = this.quotes[qi],
        dur = this.durs[qi];
      let alpha = 1;
      if (tt > dur - 0.6) alpha = Math.max(0, 1 - (tt - (dur - 0.6)) / 0.6);
      ctx.save();
      ctx.globalAlpha = alpha;
      const margin = 2,
        maxChars = this.cols - margin * 2;
      const lines = this.wrapChars(q, maxChars),
        lh = 2;
      const blockRows = (lines.length - 1) * lh + 1;
      const row0 = Math.max(margin, Math.floor((this.rows - blockRows) / 2));
      ctx.font = Math.round(s * 1.25) + "px " + this.font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const shown = Math.floor(
        Math.min(1, Math.max(0, tt - 0.4) / (q.length / 22)) * q.length,
      );
      let acc = 0;
      for (let i = 0; i < lines.length; i++) {
        const ln = lines[i],
          row = row0 + i * lh;
        let show = ln,
          last = false;
        if (acc + ln.length > shown) {
          show = ln.slice(0, Math.max(0, shown - acc));
          last = true;
        }
        const col0 = margin + Math.floor((maxChars - ln.length) / 2);
        ctx.fillStyle = "#05d9e8";
        for (let c = 0; c < show.length; c++)
          ctx.fillText(show[c], (col0 + c) * s + s / 2, row * s + s / 2 + 1);
        if (last) {
          if (Math.floor(t * 2) % 2 === 0)
            this.blk(col0 + show.length, row, "#ff6ac1");
          break;
        }
        acc += ln.length + 1;
      }
      ctx.restore();
    }
  }

  reg("pixel-viz", Viz);
  reg("pixel-book", Book);
  reg("pixel-term", Term);
  reg("pixel-fight", Fight);
  reg("pixel-read", Read);
})();
