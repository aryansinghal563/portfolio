(function () {
  if (customElements.get("github-wave")) return;

  var ROWS = 7;
  var WEEKS_FALLBACK = 52;

  function attr(el, n, d) {
    var v = el.getAttribute(n);
    return v == null || v === "" ? d : v;
  }

  var GithubWave = class extends HTMLElement {
    connectedCallback() {
      if (this._init) return;
      this._init = 1;
      this.user = attr(this, "user", "");
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
        "GitHub contribution graph for " + this.user,
      );

      this.cv = document.createElement("canvas");
      this.appendChild(this.cv);
      this.caption = document.createElement("div");
      this.caption.className = "wave-caption";
      this.caption.textContent = "loading github…";
      this.appendChild(this.caption);

      this.draw(this.placeholder());
      this.load();
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

    draw(weeks) {
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
      for (var x = 0; x < cols; x++) {
        for (var y = 0; y < ROWS; y++) {
          var lvl = weeks[x][y] || 0;
          ctx.fillStyle = this.colors[Math.min(lvl, this.colors.length - 1)];
          ctx.fillRect(x * step, y * step, cell, cell);
        }
      }
    }

    load() {
      var self = this,
        user = this.user;

      fetch(
        "https://github-contributions-api.jogruber.de/v4/" + user + "?y=last",
      )
        .then(function (r) {
          if (!r.ok) throw 0;
          return r.json();
        })
        .then(function (d) {
          if (!d || !d.contributions || !d.contributions.length) throw 0;
          self.total =
            (d.total &&
              (d.total.lastYear || d.total[Object.keys(d.total)[0]])) ||
            null;
          self.draw(self.toWeeks(d.contributions));
          self.updateCaption();
        })
        .catch(function () {});

    }

    updateCaption() {
      var parts = [];
      if (this.total != null) parts.push(this.total + " contributions");
      parts.push("github.com/" + this.user);
      if (!parts.length) parts = ["github.com/" + this.user];
      this.caption.textContent = parts.join(" · ");
    }
  };

  customElements.define("github-wave", GithubWave);
})();
