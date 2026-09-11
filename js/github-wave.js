(function () {
  if (customElements.get("github-wave")) return;

  var ROWS = 7;
  var WEEKS_FALLBACK = 52;

  function attr(el, n, d) {
    var v = el.getAttribute(n);
    return v == null || v === "" ? d : v;
  }

  function reducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  var GithubWave = class extends HTMLElement {
    connectedCallback() {
      if (this._init) return;
      this._init = 1;
      this.user = attr(this, "user", "");
      this.leet = attr(this, "leet", "");
      this.cell = +attr(this, "cell", 12);
      this.gap = +attr(this, "gap", 3);
      this.colors = attr(
        this,
        "colors",
        "#12063a,#4a1a6e,#8a2a9d,#ff2a6d,#05d9e8",
      ).split(",");
      this.style.display = "flex";
      this.style.flexDirection = "column";
      this.style.alignItems = "center";
      this.style.gap = "14px";
      this.setAttribute("role", "img");
      this.setAttribute(
        "aria-label",
        "Contribution graphs for " + this.user,
      );

      this.tabs = document.createElement("div");
      this.tabs.className = "wave-tabs";
      this.tabGh = document.createElement("button");
      this.tabGh.type = "button";
      this.tabGh.className = "wave-tab";
      this.tabGh.textContent = "GITHUB";
      this.tabLc = document.createElement("button");
      this.tabLc.type = "button";
      this.tabLc.className = "wave-tab";
      this.tabLc.textContent = "LEETCODE";
      this.appendChild(this.tabs);
      this.tabs.appendChild(this.tabGh);
      this.tabs.appendChild(this.tabLc);
      var self = this;
      this.tabGh.addEventListener("click", function () {
        self.select("gh");
      });
      this.tabLc.addEventListener("click", function () {
        self.select("lc");
      });

      this.cv = document.createElement("canvas");
      this.appendChild(this.cv);
      this.caption = document.createElement("div");
      this.caption.className = "wave-caption";
      this.caption.textContent = "loading github…";
      this.appendChild(this.caption);

      // Per-source cache: { weeks, total, extra, failed, loaded }.
      this.cache = { gh: null, lc: null };
      this.source = "gh";
      this.draw(this.placeholder(), 1);
      this.loadGh();
      this.loadLc();
    }

    select(source) {
      if (this.source === source && this.cache[source] && this.cache[source].loaded) {
        // Re-selecting replays the fill, that is the whole point.
        this.reveal(this.cache[source].weeks);
        return;
      }
      this.source = source;
      var c = this.cache[source];
      this.tabGh.classList.toggle("on", source === "gh");
      this.tabLc.classList.toggle("on", source === "lc");
      if (c && c.loaded) {
        this.reveal(c.weeks);
        this.updateCaption();
      } else {
        this.caption.textContent =
          source === "gh" ? "loading github…" : "loading leetcode…";
        this.draw(this.placeholder(), 1);
      }
    }

    placeholder() {
      var weeks = [];
      for (var w = 0; w < WEEKS_FALLBACK; w++) {
        var col = [];
        for (var r = 0; r < ROWS; r++) col.push(0);
        weeks.push(col);
      }
      return weeks;
    }

    toWeeks(contribs) {
      var weeks = [],
        col = null;
      for (var i = 0; i < contribs.length; i++) {
        var c = contribs[i];
        var dow = new Date(c.date + "T00:00:00Z").getUTCDay();
        if (dow === 0 || col === null) {
          col = new Array(ROWS).fill(0);
          weeks.push(col);
        }
        col[dow] = c.level || 0;
      }
      return weeks;
    }

    levelFor(n) {
      if (n <= 0) return 0;
      if (n <= 2) return 1;
      if (n <= 5) return 2;
      if (n <= 9) return 3;
      return 4;
    }

    // Submission calendar {unixSeconds: count} into a full 52 week grid.
    // The API only sends active days, so every missing date is walked and
    // filled with zero, exactly like the GitHub side renders.
    calendarToWeeks(cal) {
      var counts = {};
      for (var k in cal) {
        if (!Object.prototype.hasOwnProperty.call(cal, k)) continue;
        var dd = new Date(+k * 1000);
        var key = dd.getFullYear() + "-" + dd.getMonth() + "-" + dd.getDate();
        counts[key] = (+cal[k] || 0) + (counts[key] || 0);
      }
      var weeks = [],
        col = null,
        self = this;
      var today = new Date();
      today.setHours(12, 0, 0, 0);
      for (var i = 364; i >= 0; i--) {
        var dt = new Date(today.getTime() - i * 86400000);
        var dow = dt.getDay();
        if (dow === 0 || col === null) {
          col = new Array(ROWS).fill(0);
          weeks.push(col);
        }
        var kk = dt.getFullYear() + "-" + dt.getMonth() + "-" + dt.getDate();
        col[dow] = Math.max(col[dow], self.levelFor(counts[kk] || 0));
      }
      return weeks;
    }

    // Diagonal fill from top left with a pop as the wavefront passes.
    reveal(weeks) {
      var self = this;
      if (this._raf) cancelAnimationFrame(this._raf);
      if (reducedMotion()) {
        this.draw(weeks, 1);
        return;
      }
      var t0 = performance.now();
      var DUR = 750;
      var step = function (now) {
        var p = Math.min(1, ((now || performance.now()) - t0) / DUR);
        self.draw(weeks, p);
        if (p < 1) self._raf = requestAnimationFrame(step);
        else self._raf = 0;
      };
      this._raf = requestAnimationFrame(step);
    }

    draw(weeks, prog) {
      var cell = this.cell,
        gap = this.gap,
        step = cell + gap;
      var cols = weeks.length;
      var W = cols * step - gap,
        H = ROWS * step - gap;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var cv = this.cv;
      cv.width = W * dpr;
      cv.height = H * dpr;
      cv.style.width = W + "px";
      cv.style.height = H + "px";
      cv.style.maxWidth = "100%";
      cv.style.height = "auto";
      var ctx = cv.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var p = prog == null ? 1 : prog;
      var span = cols + ROWS;
      for (var x = 0; x < cols; x++) {
        for (var y = 0; y < ROWS; y++) {
          var lvl = weeks[x][y] || 0;
          var d = (x + y) / span;
          // Cells ahead of the wavefront stay empty while revealing.
          if (d > p * 1.12) {
            ctx.fillStyle = this.colors[0];
            ctx.fillRect(x * step, y * step, cell, cell);
            continue;
          }
          // Fresh cells pop a little as the front passes over them.
          var fresh = Math.min(1, Math.max(0, (p * 1.12 - d) / 0.1));
          var s = 1 + 0.45 * (1 - fresh);
          var dx = x * step + (cell - cell * s) / 2;
          var dy = y * step + (cell - cell * s) / 2;
          ctx.fillStyle = this.colors[Math.min(lvl, this.colors.length - 1)];
          ctx.fillRect(dx, dy, cell * s, cell * s);
        }
      }
    }

    fetchJson(url, timeout, then, fail) {
      var ctl = null;
      try {
        ctl = new AbortController();
      } catch (e) {
        ctl = null;
      }
      var timer = 0;
      if (ctl) {
        timer = setTimeout(function () {
          try {
            ctl.abort();
          } catch (e) {}
        }, timeout);
      }
      fetch(url, ctl ? { signal: ctl.signal } : undefined)
        .then(function (r) {
          if (!r.ok) throw 0;
          return r.json();
        })
        .then(function (d) {
          if (timer) clearTimeout(timer);
          then(d);
        })
        .catch(function () {
          if (timer) clearTimeout(timer);
          fail();
        });
    }

    loadGh() {
      var self = this;
      // The proxy is unofficial and sometimes hangs. Cap the wait so the
      // caption always lands somewhere honest.
      this.fetchJson(
        "https://github-contributions-api.jogruber.de/v4/" + this.user + "?y=last",
        8000,
        function (d) {
          if (!d || !d.contributions || !d.contributions.length) {
            self.cache.gh = { weeks: self.placeholder(), total: null, failed: true, loaded: true };
          } else {
            var total =
              (d.total && (d.total.lastYear || d.total[Object.keys(d.total)[0]])) || null;
            self.cache.gh = {
              weeks: self.toWeeks(d.contributions),
              total: total,
              failed: false,
              loaded: true,
            };
          }
          if (self.source === "gh") {
            self.tabGh.classList.add("on");
            self.reveal(self.cache.gh.weeks);
            self.updateCaption();
          }
        },
        function () {
          self.cache.gh = { weeks: self.placeholder(), total: null, failed: true, loaded: true };
          if (self.source === "gh") {
            self.tabGh.classList.add("on");
            self.draw(self.cache.gh.weeks, 1);
            self.updateCaption();
          }
        },
      );
    }

    loadLc() {
      var self = this;
      if (!this.leet) return;
      this.fetchJson(
        "https://alfa-leetcode-api.onrender.com/" + this.leet + "/calendar",
        10000,
        function (d) {
          try {
            var cal = typeof d.submissionCalendar === "string"
              ? JSON.parse(d.submissionCalendar)
              : d.submissionCalendar || {};
            var active = d.totalActiveDays || 0;
            var streak = d.streak || 0;
            self.cache.lc = {
              weeks: self.calendarToWeeks(cal),
              total: active,
              streak: streak,
              failed: false,
              loaded: true,
            };
          } catch (e) {
            self.cache.lc = { weeks: self.placeholder(), total: null, failed: true, loaded: true };
          }
          if (self.source === "lc") {
            self.reveal(self.cache.lc.weeks);
            self.updateCaption();
          }
        },
        function () {
          self.cache.lc = { weeks: self.placeholder(), total: null, failed: true, loaded: true };
          if (self.source === "lc") {
            self.draw(self.cache.lc.weeks, 1);
            self.updateCaption();
          }
        },
      );
    }

    updateCaption() {
      var c = this.cache[this.source];
      var parts = [];
      if (this.source === "gh") {
        if (c && c.total != null) parts.push(c.total + " contributions");
        parts.push("github.com/" + this.user);
        if (!c || c.failed) parts.push("offline");
      } else {
        if (c && c.total != null) {
          parts.push(c.total + " active days");
          if (c.streak) parts.push(c.streak + " day streak");
        }
        parts.push("leetcode.com/" + this.leet);
        if (!c || c.failed) parts.push("offline");
      }
      this.caption.textContent = parts.join(" · ");
    }
  };

  customElements.define("github-wave", GithubWave);
})();
