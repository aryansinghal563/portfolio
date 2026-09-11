(function () {
  var PAL = "#ff2a6d,#05d9e8,#ff6ac1,#9d4edd,#f8b800";

  var CARTS = [
    {
      title: "SKILLS.EXE",
      html:
        '<tetris-skills width="356" height="300" cell="12"' +
        ' colors="' +
        PAL +
        '" bg="#07011a" grid="#170b38"' +
        ' words="DOCKER,NODE,PYTHON,REACT,SQL,LINUX" font="\'Press Start 2P\'"' +
        ' textcolor="#4a3f80"' +
        ' style="width:356px;height:300px"></tetris-skills>',
    },
    {
      title: "MUSIC.EXE",
      html: sceneFrame("pixel-viz", 'colors="' + PAL + '" hint="NOW PLAYING"'),
    },
    {
      title: "ANIME.EXE",
      html: sceneFrame("pixel-fight", 'colors="' + PAL + '" hint="WATCHING"'),
    },
    {
      title: "READING.EXE",
      html: sceneFrame("pixel-read", 'font="\'VT323\'" hint="READING"'),
    },
    {
      title: "HOMELAB.EXE",
      html: sceneFrame(
        "pixel-term",
        'colors="' + PAL + '" font="\'Press Start 2P\'" hint="LIVE"',
      ),
    },
  ];

  function sceneFrame(tag, extra) {
    return (
      '<div class="scene-frame">' +
      "<" +
      tag +
      ' width="356" height="300" cell="12" bg="#07011a" grid="#170b38" ' +
      extra +
      ' style="width:356px;height:300px"></' +
      tag +
      ">" +
      "</div>"
    );
  }

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function easeOutBounce(p) {
    if (p < 1 / 2.75) return 7.5625 * p * p;
    if (p < 2 / 2.75) {
      p -= 1.5 / 2.75;
      return 7.5625 * p * p + 0.75;
    }
    if (p < 2.5 / 2.75) {
      p -= 2.25 / 2.75;
      return 7.5625 * p * p + 0.9375;
    }
    p -= 2.625 / 2.75;
    return 7.5625 * p * p + 0.984375;
  }

  var consoleEl = document.querySelector(".console");
  var stage = document.getElementById("screenStage");
  var titleEl = document.getElementById("cartTitle");
  var dotsEl = document.getElementById("dots");
  var cart = 0;
  // off | boot | on | shut. Only "on" answers the d-pad.
  var power = "off";
  var backlight = true;
  var powerRaf = 0;

  var dots = CARTS.map(function () {
    var s = document.createElement("span");
    dotsEl.appendChild(s);
    return s;
  });

  function setPowerAttr(on) {
    if (consoleEl) consoleEl.setAttribute("data-power", on ? "on" : "off");
  }

  function setLightAttr() {
    if (consoleEl) consoleEl.setAttribute("data-light", backlight ? "on" : "dim");
  }

  function stopFx() {
    if (powerRaf) {
      cancelAnimationFrame(powerRaf);
      powerRaf = 0;
    }
  }

  function clearDots() {
    dots.forEach(function (d) {
      d.classList.remove("on");
    });
  }

  function fxCanvas() {
    stopFx();
    stage.innerHTML =
      '<canvas class="fx-canvas" width="356" height="300" style="width:356px;height:300px"></canvas>';
    return [stage.firstChild, stage.firstChild.getContext("2d")];
  }

  function render() {
    var c = CARTS[cart];
    titleEl.textContent = c.title;
    stopFx();
    stage.innerHTML = c.html;
    dots.forEach(function (d, i) {
      d.classList.toggle("on", i === cart);
    });
  }

  function go(i) {
    if (power !== "on") return;
    var n = CARTS.length;
    cart = ((i % n) + n) % n;
    render();
  }

  // Standby attract: a dim blinking PRESS START on canvas so the 3D
  // screen shows it too.
  function showOffHint() {
    titleEl.textContent = "POWER OFF";
    clearDots();
    var parts = fxCanvas();
    var x = parts[1];
    function draw(t) {
      x.fillStyle = "#07011a";
      x.fillRect(0, 0, 356, 300);
      var a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 3.2));
      x.globalAlpha = a;
      x.font = "13px 'Press Start 2P', monospace";
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.fillStyle = "#5a4f90";
      x.fillText("PRESS START", 178, 150);
      x.globalAlpha = 1;
    }
    if (reducedMotion()) {
      draw(0.4);
      return;
    }
    var t0 = performance.now();
    powerRaf = requestAnimationFrame(function fr(now) {
      if (power !== "off") return;
      draw(((now || performance.now()) - t0) / 1000);
      powerRaf = requestAnimationFrame(fr);
    });
  }

  // Opening: line flash, white-out, then the logo drops in with a ping.
  function boot() {
    if (power === "boot" || power === "on") return;
    power = "boot";
    setPowerAttr(true);
    titleEl.textContent = "ARYAN BOY";
    clearDots();
    if (reducedMotion()) {
      power = "on";
      render();
      return;
    }
    var parts = fxCanvas();
    var x = parts[1];
    var t0 = performance.now();
    var T = 1.7;
    powerRaf = requestAnimationFrame(function fr(now) {
      if (power !== "boot") return;
      var s = ((now || performance.now()) - t0) / 1000;
      x.fillStyle = "#07011a";
      x.fillRect(0, 0, 356, 300);
      if (s < 0.22) {
        // black beat
      } else if (s < 0.4) {
        var k = (s - 0.22) / 0.18;
        x.fillStyle = "#d1f7ff";
        x.fillRect(178 - 178 * k, 148, 356 * k, 3);
      } else if (s < 0.62) {
        var k2 = (s - 0.4) / 0.22;
        x.fillStyle = "#d1f7ff";
        x.fillRect(0, 150 - 150 * k2, 356, 300 * k2);
      } else if (s < 0.72) {
        var k3 = 1 - (s - 0.62) / 0.1;
        x.fillStyle = "rgba(209,247,255," + k3.toFixed(3) + ")";
        x.fillRect(0, 0, 356, 300);
      } else {
        var lt = s - 0.72;
        var drop = Math.min(1, lt / 0.38);
        var y = -50 + 200 * easeOutBounce(drop);
        if (lt > 0.38 && lt < 0.72) {
          var rk = (lt - 0.38) / 0.34;
          x.strokeStyle = "rgba(5,217,232," + (0.7 * (1 - rk)).toFixed(3) + ")";
          x.lineWidth = 3;
          x.beginPath();
          x.arc(178, 150, 10 + 90 * rk, 0, 6.283);
          x.stroke();
        }
        x.textAlign = "center";
        x.textBaseline = "middle";
        x.font = "21px 'Press Start 2P', monospace";
        x.fillStyle = "#05d9e8";
        x.fillText("ARYAN BOY", 180, y + 3);
        x.fillStyle = "#ff2a6d";
        x.fillText("ARYAN BOY", 178, y);
        x.font = "8px 'Press Start 2P', monospace";
        x.fillStyle = "#5a4f90";
        x.fillText("POCKET POWER", 178, y + 30);
        if (s > 1.5) {
          var f = Math.min(1, (s - 1.5) / 0.2);
          x.fillStyle = "rgba(7,1,26," + f.toFixed(3) + ")";
          x.fillRect(0, 0, 356, 300);
        }
      }
      if (s < T) powerRaf = requestAnimationFrame(fr);
      else {
        power = "on";
        render();
      }
    });
  }

  function finishOff() {
    power = "off";
    setPowerAttr(false);
    showOffHint();
  }

  // Closing: freeze the cart frame, CRT-collapse it to a line, then a dot.
  function shut() {
    if (power !== "on") return;
    power = "shut";
    titleEl.textContent = "POWER OFF";
    clearDots();
    if (reducedMotion()) {
      finishOff();
      return;
    }
    var src = stage.querySelector("canvas");
    var frozen = document.createElement("canvas");
    frozen.width = 356;
    frozen.height = 300;
    if (src) {
      try {
        // cart canvases render at device pixel density, so scale the
        // frozen frame down instead of copying raw pixels (which zooms).
        frozen.getContext("2d").drawImage(src, 0, 0, 356, 300);
      } catch (e) {}
    }
    var parts = fxCanvas();
    var x = parts[1];
    var t0 = performance.now();
    var T = 0.85;
    powerRaf = requestAnimationFrame(function fr(now) {
      if (power !== "shut") return;
      var s = ((now || performance.now()) - t0) / 1000;
      x.fillStyle = "#07011a";
      x.fillRect(0, 0, 356, 300);
      if (s < 0.32) {
        var k = s / 0.32;
        var e = k * k;
        var h = Math.max(2, 300 * (1 - e));
        x.drawImage(frozen, 0, 0, 356, 300, 0, (300 - h) / 2, 356, h);
        x.fillStyle = "rgba(209,247,255," + (0.75 * e).toFixed(3) + ")";
        x.fillRect(0, (300 - h) / 2, 356, h);
      } else if (s < 0.5) {
        var k2 = (s - 0.32) / 0.18;
        var w = 356 * (1 - k2);
        x.fillStyle = "#eafcff";
        x.fillRect((356 - w) / 2, 148, w, 3);
      } else if (s < 0.62) {
        var k3 = Math.max(0, 1 - (s - 0.5) / 0.12);
        x.fillStyle = "rgba(234,252,255," + k3.toFixed(3) + ")";
        x.beginPath();
        x.arc(178, 150, 7 * Math.max(0.01, k3), 0, 6.283);
        x.fill();
      }
      if (s < T) powerRaf = requestAnimationFrame(fr);
      else finishOff();
    });
  }

  function togglePower() {
    if (power === "on") shut();
    else if (power === "off") boot();
  }

  // SELECT: backlight. Dead while powered off, like real hardware.
  function toggleLight() {
    if (power !== "on") return;
    backlight = !backlight;
    setLightAttr();
  }

  document.querySelector('[data-power="start"]').addEventListener("click", togglePower);
  document.querySelector('[data-light="select"]').addEventListener("click", toggleLight);

  document.querySelectorAll("[data-nav]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      go(cart + (btn.getAttribute("data-nav") === "next" ? 1 : -1));
    });
  });

  document.addEventListener("keydown", function (e) {
    var t = document.activeElement;
    if (t && t.tagName) {
      var tag = t.tagName.toLowerCase();
      if (
        tag === "a" ||
        tag === "button" ||
        tag === "input" ||
        tag === "textarea" ||
        tag === "tetris-skills"
      )
        return;
    }
    if (e.key === "ArrowLeft") {
      go(cart - 1);
    } else if (e.key === "ArrowRight") {
      go(cart + 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      togglePower();
    }
  });

  showOffHint();
  setLightAttr();
  setTimeout(boot, 800);

  // 3D fallback watchdog: the 2D console stays hidden while 3D is
  // expected. If the 3D module never reports ready (CDN blocked,
  // no WebGL), reveal the 2D console instead of a stuck loader.
  setTimeout(function () {
    try {
      var de = document.documentElement;
      if (!de.classList.contains("is-3d-ready")) de.classList.remove("expect-3d");
    } catch (e) {}
  }, 6000);
})();
