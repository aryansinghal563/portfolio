(function () {
  var PAL = "#ff2a6d,#05d9e8,#ff6ac1,#9d4edd,#f8b800";

  var CARTS = [
    {
      title: "SKILLS.EXE — TETRIS",
      html:
        '<tetris-skills width="356" height="300" cell="12"' +
        ' colors="' +
        PAL +
        '" bg="#07011a" grid="#170b38"' +
        ' words="DOCKER,NODE,PYTHON,REACT,SQL,LINUX" font="\'Press Start 2P\'"' +
        ' textcolor="#4a3f80" hint="CLICK TO PLAY"' +
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

  var stage = document.getElementById("screenStage");
  var titleEl = document.getElementById("cartTitle");
  var dotsEl = document.getElementById("dots");
  var cart = 0;

  var dots = CARTS.map(function () {
    var s = document.createElement("span");
    dotsEl.appendChild(s);
    return s;
  });

  function render() {
    var c = CARTS[cart];
    titleEl.textContent = c.title;
    stage.innerHTML = c.html;
    dots.forEach(function (d, i) {
      d.classList.toggle("on", i === cart);
    });
  }

  function go(i) {
    var n = CARTS.length;
    cart = ((i % n) + n) % n;
    render();
  }

  document.querySelectorAll("[data-nav]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      go(cart + (btn.getAttribute("data-nav") === "next" ? 1 : -1));
    });
  });

  document.addEventListener("keydown", function (e) {
    var t = document.activeElement;
    if (t && t.tagName && t.tagName.toLowerCase() === "tetris-skills") return;
    if (e.key === "ArrowLeft") {
      go(cart - 1);
    } else if (e.key === "ArrowRight") {
      go(cart + 1);
    }
  });

  render();
})();
