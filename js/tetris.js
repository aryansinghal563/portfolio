(function () {
  if (customElements.get("tetris-skills")) return;
  const F = {
    A: ["0110", "1001", "1111", "1001", "1001"],
    B: ["1110", "1001", "1110", "1001", "1110"],
    C: ["0111", "1000", "1000", "1000", "0111"],
    D: ["1110", "1001", "1001", "1001", "1110"],
    E: ["1111", "1000", "1110", "1000", "1111"],
    F: ["1111", "1000", "1110", "1000", "1000"],
    G: ["0111", "1000", "1011", "1001", "0111"],
    H: ["1001", "1001", "1111", "1001", "1001"],
    I: ["111", "010", "010", "010", "111"],
    J: ["0011", "0001", "0001", "1001", "0110"],
    K: ["1001", "1010", "1100", "1010", "1001"],
    L: ["100", "100", "100", "100", "111"],
    M: ["10001", "11011", "10101", "10001", "10001"],
    N: ["1001", "1101", "1011", "1001", "1001"],
    O: ["0110", "1001", "1001", "1001", "0110"],
    P: ["1110", "1001", "1110", "1000", "1000"],
    Q: ["0110", "1001", "1001", "1010", "0101"],
    R: ["1110", "1001", "1110", "1010", "1001"],
    S: ["0111", "1000", "0110", "0001", "1110"],
    T: ["111", "010", "010", "010", "010"],
    U: ["1001", "1001", "1001", "1001", "0110"],
    V: ["10001", "10001", "01010", "01010", "00100"],
    W: ["10001", "10001", "10101", "11011", "10001"],
    X: ["101", "010", "010", "010", "101"],
    Y: ["101", "101", "010", "010", "010"],
    Z: ["1111", "0001", "0110", "1000", "1111"],
    "+": ["000", "010", "111", "010", "000"],
    ".": ["0", "0", "0", "0", "1"],
    0: ["0110", "1001", "1001", "1001", "0110"],
    1: ["01", "11", "01", "01", "01"],
    2: ["1110", "0001", "0110", "1000", "1111"],
    3: ["1110", "0001", "0110", "0001", "1110"],
    8: ["0110", "1001", "0110", "1001", "0110"],
    " ": ["00", "00", "00", "00", "00"],
  };
  const SHAPES = [
    [[1, 1, 1, 1]],
    [
      [1, 1],
      [1, 1],
    ],
    [
      [0, 1, 0],
      [1, 1, 1],
    ],
    [
      [1, 0, 0],
      [1, 1, 1],
    ],
    [
      [0, 0, 1],
      [1, 1, 1],
    ],
    [
      [1, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 1, 1],
      [1, 1, 0],
    ],
  ];
  function mul32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  class TetrisSkills extends HTMLElement {
    connectedCallback() {
      this._dead = false;
      if (this.ctx) {
        this._startLoop();
        return;
      }
      if (this._pending) return;
      this._pending = 1;
      setTimeout(() => {
        this._pending = 0;
        if (!this._dead && !this.ctx) this.setup();
      }, 0);
    }
    disconnectedCallback() {
      this._dead = 1;
      cancelAnimationFrame(this._raf);
    }
    _startLoop() {
      cancelAnimationFrame(this._raf);
      let last = performance.now();
      const loop = (t) => {
        if (this._dead) return;
        const dt = Math.min(t - last, 100);
        last = t;
        this.tick(dt);
        this.draw();
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }
    attr(n, d) {
      const v = this.getAttribute(n);
      return v == null || v === "" ? d : v;
    }
    setup() {
      if (this._dead) return;
      const W = (this.W = +this.attr("width", 400)),
        H = (this.H = +this.attr("height", 360));
      this.cell = +this.attr("cell", 14);
      this.colors = this.attr(
        "colors",
        "#3cbcfc,#f8b800,#f83800,#92cc41",
      ).split(",");
      this.bg = this.attr("bg", "#0d0d0d");
      this.gridc = this.attr("grid", "");
      this.words = this.attr(
        "words",
        "DOCKER,NODE,REACT,PYTHON,LINUX,SQL",
      ).split(",");
      this.font = this.attr("font", "monospace");
      this.tc = this.attr("textcolor", "#888");
      this.ambient = this.attr("ambient", "") !== "";
      this.hint = this.ambient ? "" : this.attr("hint", "CLICK TO PLAY");
      this.cols = Math.floor(W / this.cell);
      this.rows = Math.floor(H / this.cell);
      this.ambient = this.attr("ambient", "") !== "";
      this.style.display = "block";
      this.style.width = W + "px";
      this.style.height = H + "px";
      this.style.cursor = this.ambient ? "default" : "pointer";
      this.style.outline = "none";
      if (!this.ambient) this.tabIndex = 0;
      const c = (this.cv = document.createElement("canvas"));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = W * dpr;
      c.height = H * dpr;
      c.style.width = W + "px";
      c.style.height = H + "px";
      this.appendChild(c);
      this.ctx = c.getContext("2d");
      this.ctx.scale(dpr, dpr);
      this.mode = "auto";
      this.wi = 0;
      this.startWord();
      if (!this.ambient) {
        this.addEventListener("click", () => {
          if (this.mode !== "play") {
            this.startPlay();
          }
          this.focus();
        });
        this.addEventListener("keydown", (e) => this.key(e));
      }
      this.acc = 0;
      this._startLoop();
    }
    wordCells(w) {
      const rows = 5,
        cells = [];
      let width = 0;
      const gl = [...w].map((ch) => F[ch] || F[" "]);
      gl.forEach((g) => (width += g[0].length + 1));
      width -= 1;
      if (width > this.cols) return null;
      let x0 = Math.floor((this.cols - width) / 2),
        y0 = this.rows - rows - 1;
      gl.forEach((g, gi) => {
        for (let r = 0; r < rows; r++)
          for (let cc = 0; cc < g[r].length; cc++)
            if (g[r][cc] === "1")
              cells.push({
                c: x0 + cc,
                r: y0 + r,
                col: this.colors[gi % this.colors.length],
              });
        x0 += g[0].length + 1;
      });
      return cells;
    }
    startWord() {
      let tries = 0,
        cells = null;
      while (
        tries < this.words.length &&
        !(cells = this.wordCells(this.words[this.wi % this.words.length]))
      ) {
        this.wi++;
        tries++;
      }
      this.wi++;
      this.target = cells || [];
      this.settled = [];
      this.fallers = [];
      this.pending = {};
      this.target.forEach((t) => {
        (this.pending[t.c] = this.pending[t.c] || []).push(t);
      });
      Object.values(this.pending).forEach((a) => a.sort((x, y) => y.r - x.r));
      this.phase = "spell";
      this.phaseT = 0;
    }
    tick(dt) {
      if (this.mode === "play") {
        this.playTick(dt);
        return;
      }
      this.phaseT += dt;
      this.acc += dt;
      const step = 28;
      while (this.acc > step) {
        this.acc -= step;
        if (this.phase === "spell") {
          const busy = new Set(this.fallers.map((f) => f.t.c));
          let spawned = 0;
          for (const k of Object.keys(this.pending)) {
            if (spawned >= 3) break;
            const st = this.pending[k];
            if (!st.length || busy.has(+k)) continue;
            if (Math.random() < 0.35) {
              this.fallers.push({ t: st.shift(), y: -1 });
              busy.add(+k);
              spawned++;
            }
          }
          this.fallers.forEach((f) => (f.y += 1));
          this.fallers = this.fallers.filter((f) => {
            if (f.y >= f.t.r) {
              this.settled.push(f.t);
              return false;
            }
            return true;
          });
          if (
            !this.fallers.length &&
            Object.values(this.pending).every((a) => !a.length) &&
            this.settled.length === this.target.length
          ) {
            this.phase = "hold";
            this.phaseT = 0;
          }
        } else if (this.phase === "hold") {
          if (this.phaseT > 1600) {
            this.phase = "flash";
            this.phaseT = 0;
          }
        } else if (this.phase === "flash") {
          if (this.phaseT > 520) {
            this.phase = "drop";
            this.settled.forEach((s) => {
              s.vy = 0.3 + Math.random() * 0.7;
              s.fy = s.r;
            });
          }
        } else if (this.phase === "drop") {
          let alive = false;
          this.settled.forEach((s) => {
            s.vy += 0.25;
            s.fy += s.vy;
            if (s.fy < this.rows + 2) alive = true;
          });
          if (!alive) this.startWord();
        }
      }
    }
    block(x, y, col, s) {
      const ctx = this.ctx;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = "rgba(255,255,255,.28)";
      ctx.fillRect(x, y, s, 2);
      ctx.fillRect(x, y, 2, s);
      ctx.fillStyle = "rgba(0,0,0,.4)";
      ctx.fillRect(x, y + s - 2, s, 2);
      ctx.fillRect(x + s - 2, y, 2, s);
    }
    draw() {
      const ctx = this.ctx,
        s = this.cell,
        W = this.W,
        H = this.H;
      ctx.fillStyle = this.bg;
      ctx.fillRect(0, 0, W, H);
      if (this.gridc) {
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
      ctx.font = "10px " + this.font;
      ctx.textBaseline = "top";
      if (this.mode === "auto") {
        const flash =
          this.phase === "flash" && Math.floor(this.phaseT / 90) % 2 === 0;
        this.settled.forEach((b) => {
          const y = this.phase === "drop" ? b.fy : b.r;
          if (y < this.rows + 1)
            this.block(b.c * s, y * s, flash ? "#ffffff" : b.col, s);
        });
        this.fallers.forEach((f) => {
          if (f.y >= 0) this.block(f.t.c * s, f.y * s, f.t.col, s);
        });
        if (this.hint) {
          const ht = this.hint,
            hw = ctx.measureText(ht).width;
          ctx.fillStyle = this.bg;
          ctx.fillRect(0, 0, hw + 12, 18);
          ctx.fillStyle = this.tc;
          ctx.fillText(ht, 6, 5);
        }
      } else {
        const g = this.board;
        for (let r = 0; r < this.rows; r++)
          for (let c = 0; c < this.cols; c++)
            if (g[r][c]) this.block(c * s, r * s, g[r][c], s);
        if (this.piece && !this.over)
          this.eachPiece((c, r) => {
            if (r >= 0) this.block(c * s, r * s, this.piece.col, s);
          });
        ctx.fillStyle = this.tc;
        ctx.fillText("SCORE " + String(this.score).padStart(6, "0"), 6, 6);
        ctx.fillText(
          "ESC=EXIT  \u2190\u2192\u2193 \u2191=ROT SPACE=DROP",
          6,
          H - 16,
        );
        if (this.over) {
          ctx.fillStyle = "#fff";
          ctx.font = "16px " + this.font;
          const m = "GAME OVER";
          ctx.fillText(m, (W - ctx.measureText(m).width) / 2, H / 2 - 10);
        }
        if (this.paused) {
          ctx.fillStyle = "#fff";
          ctx.font = "16px " + this.font;
          const m = "PAUSE";
          ctx.fillText(m, (W - ctx.measureText(m).width) / 2, H / 2 - 10);
        }
      }
    }
    startPlay() {
      this.mode = "play";
      this.score = 0;
      this.over = false;
      this.paused = false;
      this.board = Array.from({ length: this.rows }, () =>
        Array(this.cols).fill(null),
      );
      this.newPiece();
      this.dropAcc = 0;
    }
    newPiece() {
      const sh = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      this.piece = {
        sh,
        c: Math.floor(this.cols / 2) - 1,
        r: -sh.length,
        col: this.colors[Math.floor(Math.random() * this.colors.length)],
      };
    }
    eachPiece(fn, p) {
      p = p || this.piece;
      p.sh.forEach((row, r) =>
        row.forEach((v, c) => {
          if (v) fn(p.c + c, p.r + r);
        }),
      );
    }
    fits(p) {
      let ok = true;
      this.eachPiece((c, r) => {
        if (
          c < 0 ||
          c >= this.cols ||
          r >= this.rows ||
          (r >= 0 && this.board[r][c])
        )
          ok = false;
      }, p);
      return ok;
    }
    lock() {
      let dead = false;
      this.eachPiece((c, r) => {
        if (r < 0) {
          dead = true;
          return;
        }
        this.board[r][c] = this.piece.col;
      });
      if (dead) {
        this.over = true;
        setTimeout(() => {
          if (this.mode === "play" && this.over) {
            this.mode = "auto";
            this.startWord();
          }
        }, 2200);
        return;
      }
      let lines = 0;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.board[r].every((v) => v)) {
          this.board.splice(r, 1);
          this.board.unshift(Array(this.cols).fill(null));
          lines++;
          r++;
        }
      }
      this.score += [0, 100, 300, 500, 800][lines] || 0;
      this.newPiece();
      if (!this.fits(this.piece)) {
        this.over = true;
        setTimeout(() => {
          if (this.mode === "play" && this.over) {
            this.mode = "auto";
            this.startWord();
          }
        }, 2200);
      }
    }
    playTick(dt) {
      if (this.over || this.paused) return;
      this.dropAcc += dt;
      if (this.dropAcc > Math.max(120, 480 - this.score / 10)) {
        this.dropAcc = 0;
        this.move(0, 1, true);
      }
    }
    move(dc, dr, lockOnFail) {
      if (this.over || this.paused) return;
      const p = { ...this.piece, c: this.piece.c + dc, r: this.piece.r + dr };
      if (this.fits(p)) {
        this.piece = p;
      } else if (lockOnFail && dr > 0) {
        this.lock();
      }
    }
    rotate() {
      if (this.over || this.paused) return;
      const sh = this.piece.sh,
        n = sh[0].length,
        rot = Array.from({ length: n }, (_, r) =>
          sh.map((row) => row[r]).reverse(),
        );
      const p = { ...this.piece, sh: rot };
      if (this.fits(p)) this.piece = p;
    }
    key(e) {
      if (this.mode !== "play") return;
      const k = e.key;
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(k))
        e.preventDefault();
      if (k === "ArrowLeft") this.move(-1, 0);
      else if (k === "ArrowRight") this.move(1, 0);
      else if (k === "ArrowDown") this.move(0, 1, true);
      else if (k === "ArrowUp" || k === "x") this.rotate();
      else if (k === " ") {
        while (this.fits({ ...this.piece, r: this.piece.r + 1 }))
          this.piece.r++;
        this.lock();
      } else if (k === "p") this.paused = !this.paused;
      else if (k === "Escape") {
        this.mode = "auto";
        this.startWord();
        this.blur();
      }
    }
  }
  customElements.define("tetris-skills", TetrisSkills);
  class PixelGraph extends HTMLElement {
    connectedCallback() {
      if (this._i) return;
      this._i = 1;
      setTimeout(() => {
        const cols = +this.getAttribute("cols") || 52,
          rows = +this.getAttribute("rows") || 7,
          cell = +this.getAttribute("cell") || 10,
          gap = +this.getAttribute("gap") || 3,
          colors = (
            this.getAttribute("colors") ||
            "#161b22,#0e4429,#006d32,#26a641,#39d353"
          ).split(","),
          seed = +this.getAttribute("seed") || 42,
          rnd = mul32(seed);
        const W = cols * (cell + gap) - gap,
          H = rows * (cell + gap) - gap,
          dpr = Math.min(window.devicePixelRatio || 1, 2);
        const c = document.createElement("canvas");
        c.width = W * dpr;
        c.height = H * dpr;
        c.style.width = W + "px";
        c.style.height = H + "px";
        this.style.display = "inline-block";
        this.appendChild(c);
        const ctx = c.getContext("2d");
        ctx.scale(dpr, dpr);
        for (let x = 0; x < cols; x++) {
          const streak = rnd();
          for (let y = 0; y < rows; y++) {
            let v = rnd();
            v = v * v * (0.4 + streak);
            let i =
              v < 0.35 ? 0 : v < 0.55 ? 1 : v < 0.75 ? 2 : v < 0.9 ? 3 : 4;
            ctx.fillStyle = colors[i];
            ctx.fillRect(x * (cell + gap), y * (cell + gap), cell, cell);
          }
        }
      }, 0);
    }
  }
  if (!customElements.get("pixel-graph"))
    customElements.define("pixel-graph", PixelGraph);
})();
