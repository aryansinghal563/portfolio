// <aryan-boy-3d> — a realistic handheld take on the ARYAN BOY console.
// The pixel cartridges keep running in the hidden #screenStage and every
// frame is copied onto the 3D screen as a texture, so no game logic moves.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function textSprite({ w = 512, h = 64, draw }) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { canvas: c, tex };
}

class AryanBoy3D extends HTMLElement {
  connectedCallback() {
    if (this._up) return;
    this._up = true;
    try {
      this._init();
    } catch (err) {
      console.warn("aryan-boy-3d: falling back to CSS console", err);
      this.style.display = "none";
      try {
        document.documentElement.classList.remove("expect-3d");
        this._setFlatInert(false);
      } catch (_) {}
      return;
    }
    document.querySelector(".console")?.classList.add("has-3d");
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this);
    this._io = new IntersectionObserver(
      (e) => {
        this._onScreen = e[0].isIntersecting;
        this._selfRatio = e[0].intersectionRatio || 0;
        this._sync();
      },
      { threshold: [0, 0.02, 0.35, 0.6] },
    );
    this._io.observe(this);
    // Yield to the city when it clearly owns the viewport, so two WebGL
    // loops never burn frames together on weak hardware. Ties run both.
    this._cityRatio = 0;
    try {
      const peer = document.querySelector("voxel-city");
      if (peer && "IntersectionObserver" in window) {
        this._peerIo = new IntersectionObserver(
          (e) => {
            this._cityRatio = e[0].intersectionRatio || 0;
            this._sync();
          },
          { threshold: [0, 0.35, 0.6] },
        );
        this._peerIo.observe(peer);
      }
    } catch (_) {}
    this._onVis = () => this._sync();
    document.addEventListener("visibilitychange", this._onVis);
    this._sync();
  }

  disconnectedCallback() {
    this._onScreen = false;
    this._sync();
    try { this._setFlatInert(false); } catch (_) {}
    this._ro?.disconnect();
    this._io?.disconnect();
    this._peerIo?.disconnect();
    document.removeEventListener("visibilitychange", this._onVis);
    this._mo?.disconnect();
    this._mo2?.disconnect();
    this._mo3?.disconnect();
    this.renderer?.dispose();
  }

  _init() {
    this.style.display = "block";
    this.style.position = "relative";
    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.touchAction = "manipulation";
    this.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Match the voxel city: default tone mapping, no environment map.
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

    // Same rig as js/city3d.js so the handheld reads as part of the city,
    // plus a pink kick from the right so the dark shell lifts off the page bg.
    this.scene.add(new THREE.HemisphereLight(0xa898ea, 0x2a1450, 1.35));
    const key = new THREE.DirectionalLight(0xfff0d8, 1.5);
    key.position.set(60, 90, 40);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x05d9e8, 0.9);
    rim.position.set(-70, 40, -55);
    this.scene.add(rim);
    const kick = new THREE.DirectionalLight(0xff2a6d, 0.55);
    kick.position.set(70, 10, -20);
    this.scene.add(kick);

    this.rig = new THREE.Group();
    this.scene.add(this.rig);
    this.boy = new THREE.Group();
    this.rig.add(this.boy);

    this._buildBody();
    this._buildScreen();
    this._buildControls();
    this._buildDetails();
    this._watchCartridge();

    this.tRY = 0;
    this.tRX = -0.03;
    this.rY = 0;
    this.rX = -0.03;
    // Entrance spin state. Progresses in _tick so the real model turns
    // a full 360 with a scale pop instead of CSS flipping the canvas.
    this._enter = 0;
    this._enterDur = 0.9;
    this._bindTilt();

    this._resize();
    this._last = performance.now();
  }

  // ---------------------------------------------------------- construction

  _buildBody() {
    // Voxel-city plastics: flat Lambert, crisp chunky edges, site palette.
    // Lifted a step off pure bg-dark so the shell does not melt into the page.
    const shellMat = new THREE.MeshLambertMaterial({ color: 0x241547 });
    const body = new THREE.Mesh(new RoundedBoxGeometry(4.6, 7.6, 0.85, 2, 0.12), shellMat);
    this.boy.add(body);
    const face = new THREE.Mesh(
      new RoundedBoxGeometry(4.32, 7.32, 0.18, 2, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x190e42 }),
    );
    face.position.z = 0.38;
    this.boy.add(face);
    // neon back edge so the silhouette separates from the dark page
    const edge = new THREE.Mesh(
      new RoundedBoxGeometry(4.72, 7.72, 0.6, 2, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x9d4edd, transparent: true, opacity: 0.3, side: THREE.BackSide, toneMapped: false }),
    );
    edge.position.z = -0.1;
    this.boy.add(edge);
    // top groove where a cartridge would sit
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.1, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x07011a }),
    );
    slot.position.set(0, 3.82, 0);
    this.boy.add(slot);
  }

  _buildScreen() {
    const bezel = new THREE.Mesh(
      new RoundedBoxGeometry(3.95, 3.6, 0.3, 2, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x0b0620 }),
    );
    bezel.position.set(0, 1.55, 0.48);
    this.boy.add(bezel);

    // live texture fed from the hidden 2D cartridge canvas
    this.texCanvas = document.createElement("canvas");
    this.texCanvas.width = 512;
    this.texCanvas.height = 432;
    this.screenTex = new THREE.CanvasTexture(this.texCanvas);
    this.screenTex.colorSpace = THREE.SRGBColorSpace;
    this.screenTex.anisotropy = 8;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(3.18, 2.68),
      new THREE.MeshBasicMaterial({ map: this.screenTex, toneMapped: false }),
    );
    screen.position.set(0, 1.32, 0.65);
    this.boy.add(screen);
    this.screenMat = screen.material;

    // scanlines for the LCD feel
    const { tex: scanTex } = textSprite({
      w: 64,
      h: 64,
      draw: (ctx) => {
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 60, 64, 4);
      },
    });
    scanTex.wrapS = scanTex.wrapT = THREE.RepeatWrapping;
    scanTex.repeat.set(1, 40);
    const scan = new THREE.Mesh(
      new THREE.PlaneGeometry(3.18, 2.68),
      new THREE.MeshBasicMaterial({ map: scanTex, transparent: true, opacity: 0.16, toneMapped: false }),
    );
    scan.position.set(0, 1.32, 0.652);
    this.boy.add(scan);

    // faint diagonal glare streak only (no clearcoat glass, city has none)
    const { tex: glareTex } = textSprite({
      w: 256,
      h: 256,
      draw: (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 256, 256);
        g.addColorStop(0.32, "rgba(255,255,255,0)");
        g.addColorStop(0.46, "rgba(255,255,255,0.5)");
        g.addColorStop(0.6, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 256);
      },
    });
    const glare = new THREE.Mesh(
      new THREE.PlaneGeometry(3.18, 2.68),
      new THREE.MeshBasicMaterial({ map: glareTex, transparent: true, opacity: 0.1, toneMapped: false, depthWrite: false }),
    );
    glare.position.set(0, 1.32, 0.665);
    this.boy.add(glare);

    // title strip drawn from #cartTitle
    const title = textSprite({ w: 512, h: 56, draw: () => {} });
    this.titleCanvas = title.canvas;
    this.titleTex = title.tex;
    const titleMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 0.33),
      new THREE.MeshBasicMaterial({ map: this.titleTex, transparent: true, toneMapped: false }),
    );
    titleMesh.position.set(0.18, 2.98, 0.65);
    this.boy.add(titleMesh);
    this.titleMat = titleMesh.material;
    // power LED
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0x3a1440, toneMapped: false }),
    );
    led.position.set(-1.72, 2.98, 0.65);
    this.boy.add(led);
    const ledGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xff2a6d, transparent: true, opacity: 0.06, toneMapped: false }),
    );
    ledGlow.position.copy(led.position);
    this.boy.add(ledGlow);
    this.led = led;
    this.ledGlow = ledGlow;
  }

  _labelPlane(text, { size = 44, color = "#ff6ac1", w = 512, h = 80, spacing = 2 } = {}) {
    const { tex } = textSprite({
      w,
      h,
      draw: (ctx) => {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        try {
          ctx.letterSpacing = spacing + "px";
        } catch {}
        // shrink until it fits so wide words never clip at the plane edges
        let s = size;
        ctx.font = `${s}px 'Press Start 2P', monospace`;
        while (s > 10 && ctx.measureText(text).width > w - 32) {
          s -= 2;
          ctx.font = `${s}px 'Press Start 2P', monospace`;
        }
        ctx.fillText(text, w / 2, h / 2 + 2);
      },
    });
    return tex;
  }

  _buildControls() {
    this.pressables = [];
    const padMat = new THREE.MeshLambertMaterial({ color: 0x2a1458 });

    // d-pad cross: chunky boxes, crisp small-bevel edges
    this.dpad = new THREE.Group();
    this.dpad.position.set(-1.22, -1.05, 0.5);
    const vArm = new THREE.Mesh(new RoundedBoxGeometry(0.44, 1.32, 0.24, 1, 0.05), padMat);
    const hArm = new THREE.Mesh(new RoundedBoxGeometry(1.32, 0.44, 0.24, 1, 0.05), padMat);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.28, 20), padMat);
    hub.rotation.x = Math.PI / 2;
    this.dpad.add(vArm, hArm, hub);
    this.dpadLeft = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
    this.dpadLeft.position.set(-0.45, 0, 0);
    this.dpadRight = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
    this.dpadRight.position.set(0.45, 0, 0);
    this.dpadLeft.userData.nav = "prev";
    this.dpadRight.userData.nav = "next";
    this.dpad.add(this.dpadLeft, this.dpadRight);
    this.pressables.push(this.dpadLeft, this.dpadRight);
    this.boy.add(this.dpad);

    // A / B with wells: flat saturated site colors
    const wellMat = new THREE.MeshLambertMaterial({ color: 0x0d0428 });
    const mkBtn = (x, y, color, nav, label) => {
      const well = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.1, 20), wellMat);
      well.rotation.x = Math.PI / 2;
      well.position.set(x, y, 0.46);
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.33, 0.36, 0.26, 20),
        new THREE.MeshLambertMaterial({ color }),
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(x, y, 0.6);
      btn.userData.nav = nav;
      btn.userData.baseZ = 0.6;
      this.pressables.push(btn);
      this.boy.add(well, btn);
      const lab = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 0.16),
        new THREE.MeshBasicMaterial({ map: this._labelPlane(label, { size: 40, color: "#7a6fb0", w: 128, h: 48 }), transparent: true, toneMapped: false }),
      );
      lab.position.set(x, y - 0.55, 0.5);
      this.boy.add(lab);
      return btn;
    };
    this.btnB = mkBtn(0.95, -1.15, 0x05d9e8, "prev", "B");
    this.btnA = mkBtn(1.8, -0.8, 0xff2a6d, "next", "A");

    // select / start pills
    const pillMat = new THREE.MeshLambertMaterial({ color: 0x2a1458 });
    for (const x of [-0.45, 0.6]) {
      const pill = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.44, 4, 10), pillMat);
      pill.rotation.z = Math.PI / 2;
      pill.position.set(x, -2.5, 0.48);
      pill.userData.baseZ = 0.48;
      this.boy.add(pill);
      if (x > 0) this.pillStart = pill;
      else this.pillSelect = pill;
    }
    for (const [x, t] of [
      [-0.45, "SELECT"],
      [0.6, "START"],
    ]) {
      const lab = new THREE.Mesh(
        new THREE.PlaneGeometry(0.72, 0.13),
        new THREE.MeshBasicMaterial({ map: this._labelPlane(t, { size: 30, color: "#7a6fb0", w: 256, h: 44 }), transparent: true, toneMapped: false }),
      );
      lab.position.set(x, -2.78, 0.5);
      this.boy.add(lab);
    }

    // invisible START hit box over the right pill
    const startHit = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.4, 0.4),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    startHit.position.set(0.6, -2.5, 0.5);
    startHit.userData.action = "power";
    this.pressables.push(startHit);
    this.boy.add(startHit);

    // invisible SELECT hit box over the left pill
    const selectHit = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.4, 0.4),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    selectHit.position.set(-0.45, -2.5, 0.5);
    selectHit.userData.action = "light";
    this.pressables.push(selectHit);
    this.boy.add(selectHit);

    // swap hint + dots
    const hint = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.16),
      new THREE.MeshBasicMaterial({ map: this._labelPlane("SWAP CARTRIDGE", { size: 26, color: "#7a6fb0", w: 512, h: 44 }), transparent: true, toneMapped: false }),
    );
    hint.position.set(0, -0.4, 0.5);
    this.boy.add(hint);

    // cartridge dots as tiny emissive discs, one per cart, centered
    this.dotMeshes = [];
    const dotGeo = new THREE.CircleGeometry(0.055, 16);
    const dotCount = document.querySelectorAll("#dots span").length || 5;
    for (let i = 0; i < dotCount; i++) {
      const m = new THREE.Mesh(
        dotGeo.clone(),
        new THREE.MeshBasicMaterial({ color: 0x2a1458, transparent: true, opacity: 0.9, toneMapped: false }),
      );
      m.position.set((i - (dotCount - 1) / 2) * 0.2, -0.64, 0.5);
      this.boy.add(m);
      this.dotMeshes.push(m);
    }
  }

  _buildDetails() {
    // speaker slits
    const slitMat = new THREE.MeshLambertMaterial({ color: 0x0a0618 });
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.52, 0.06), slitMat);
      s.position.set(1.0 + i * 0.22, -3.15, 0.47);
      s.rotation.z = -0.42;
      this.boy.add(s);
    }
  }

  // --------------------------------------------------------------- wiring

  _sourceCanvas() {
    return document.querySelector("#screenStage canvas");
  }

  _watchCartridge() {
    this._drawTitle();
    this._drawDots();
    const stage = document.getElementById("screenStage");
    if (stage) {
      this._mo = new MutationObserver(() => {
        this._src = null;
        this._drawTitle();
        this._drawDots();
      });
      this._mo.observe(stage, { childList: true, subtree: true });
    }
    const dots = document.getElementById("dots");
    if (dots) {
      this._mo2 = new MutationObserver(() => {
        this._drawDots();
      });
      this._mo2.observe(dots, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    }
    // power LED and backlight follow the console flags owned by main.js
    this._syncLed();
    this._syncLight();
    const con = document.querySelector(".console");
    if (con) {
      this._mo3 = new MutationObserver(() => {
        this._syncLed();
        this._syncLight();
      });
      this._mo3.observe(con, { attributes: true, attributeFilter: ["data-power", "data-light"] });
    }
  }

  _syncLight() {
    const dim = document.querySelector(".console")?.getAttribute("data-light") === "dim";
    if (this.screenMat) this.screenMat.color.set(dim ? 0x8a8a8a : 0xffffff);
    if (this.titleMat) this.titleMat.opacity = dim ? 0.45 : 1;
  }

  _syncLed() {
    const on = document.querySelector(".console")?.getAttribute("data-power") !== "off";
    if (this.led) this.led.material.color.set(on ? 0xff2a6d : 0x3a1440);
    if (this.ledGlow) this.ledGlow.material.opacity = on ? 0.35 : 0.06;
  }

  _drawTitle() {
    if (!this.titleCanvas) return;
    const ctx = this.titleCanvas.getContext("2d");
    const t = (document.getElementById("cartTitle")?.textContent || "SKILLS.EXE").slice(0, 24);
    ctx.clearRect(0, 0, 512, 56);
    ctx.fillStyle = "#05d9e8";
    ctx.textBaseline = "middle";
    let s = 17;
    ctx.font = `${s}px 'Press Start 2P', monospace`;
    while (s > 10 && ctx.measureText(t).width > 512 - 84) {
      s -= 2;
      ctx.font = `${s}px 'Press Start 2P', monospace`;
    }
    ctx.fillText(t, 62, 30);
    ["#ff2a6d", "#f8b800", "#05d9e8"].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(12 + i * 11, 23, 7, 7);
    });
    this.titleTex.needsUpdate = true;
  }

  _drawDots() {
    if (!this.dotMeshes) return;
    const els = [...document.querySelectorAll("#dots span")];
    this.dotMeshes.forEach((m, i) => {
      const on = els[i]?.classList.contains("on");
      m.material.color.set(on ? "#05d9e8" : "#2a1458");
    });
  }

  // The flat 2D controls are display:none under 3D, but inert makes
  // certain keyboard users can never tab into the hidden buttons.
  _setFlatInert(on) {
    const con = document.querySelector(".console");
    if (!con) return;
    for (const sel of [".controls", ".startsel"]) {
      const el = con.querySelector(sel);
      if (!el) continue;
      if (on) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    }
  }

  _pressPower() {
    document.querySelector('[data-power="start"]')?.click();
    if (this.pillStart && !reduceMotion()) {
      this.pillStart.position.z = this.pillStart.userData.baseZ - 0.08;
      clearTimeout(this._relPill);
      this._relPill = setTimeout(() => (this.pillStart.position.z = this.pillStart.userData.baseZ), 130);
    }
  }

  _pressLight() {
    document.querySelector('[data-light="select"]')?.click();
    if (this.pillSelect && !reduceMotion()) {
      this.pillSelect.position.z = this.pillSelect.userData.baseZ - 0.08;
      clearTimeout(this._relPillS);
      this._relPillS = setTimeout(() => (this.pillSelect.position.z = this.pillSelect.userData.baseZ), 130);
    }
  }

  _press(nav, src) {
    const btn = document.querySelector(`[data-nav="${nav}"]`);
    btn?.click();
    if (!reduceMotion()) {
      if (src === this.dpadLeft || src === this.dpadRight) {
        // rock the pad toward the pressed side, A and B stay still
        this.dpad.rotation.y = nav === "next" ? 0.14 : -0.14;
        this.dpad.position.z = 0.44;
        clearTimeout(this._relPad);
        this._relPad = setTimeout(() => {
          this.dpad.rotation.y = 0;
          this.dpad.position.z = 0.5;
        }, 130);
      } else {
        const mesh = nav === "next" ? this.btnA : this.btnB;
        if (mesh) {
          mesh.position.z = mesh.userData.baseZ - 0.1;
          clearTimeout(this._relT);
          this._relT = setTimeout(() => (mesh.position.z = mesh.userData.baseZ), 130);
        }
      }
    }
    this._drawDots();
    setTimeout(() => this._drawDots(), 50);
  }

  _bindTilt() {
    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    let dragging = false;
    let px = 0;
    const pick = (e) => {
      const r = this.canvas.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, this.camera);
      const hits = ray.intersectObjects(this.pressables, false);
      return hits[0]?.object || null;
    };
    this.canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      px = e.clientX;
      this._dragX = e.clientX;
      this._dragY = e.clientY;
      this._hit = pick(e);
      this.canvas.setPointerCapture?.(e.pointerId);
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (dragging && !this._hit) {
        this.tRY = THREE.MathUtils.clamp(this.tRY + ((e.clientX - px) / 220), -0.5, 0.5);
        px = e.clientX;
      } else if (!dragging && e.pointerType === "mouse" && !reduceMotion()) {
        const r = this.canvas.getBoundingClientRect();
        this.tRY = ((e.clientX - r.left) / r.width - 0.5) * 0.22;
        this.tRX = -0.03 + ((e.clientY - r.top) / r.height - 0.5) * -0.12;
      }
      this.canvas.style.cursor = !dragging && pick(e) ? "pointer" : dragging ? "grabbing" : "grab";
    });
    const up = (e) => {
      if (!dragging) return;
      dragging = false;
      if (this._hit) {
        const moved = Math.hypot(e.clientX - this._dragX, e.clientY - this._dragY);
        if (moved < 8) {
          if (this._hit.userData.action === "power") this._pressPower();
          else if (this._hit.userData.action === "light") this._pressLight();
          else this._press(this._hit.userData.nav, this._hit);
        }
        this._hit = null;
      }
    };
    this.canvas.addEventListener("pointerup", up);
    this.canvas.addEventListener("pointercancel", () => ((dragging = false), (this._hit = null)));
    this.canvas.addEventListener("pointerleave", () => {
      if (!dragging && !reduceMotion()) {
        this.tRY = 0;
        this.tRX = -0.03;
      }
    });
  }

  // ---------------------------------------------------------------- render

  _resize() {
    const w = this.clientWidth || 520;
    const h = this.clientHeight || 660;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Fill the frame with the 4.6 x 7.6 shell, leaving only a small margin.
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const distH = 3.95 / Math.tan(halfFov);
    const distW = 2.42 / (Math.tan(halfFov) * this.camera.aspect);
    const dist = Math.max(distH, distW) + 0.25;
    this.camera.position.set(0, 0.35, dist);
    this.camera.lookAt(0, -0.15, 0);
    this.camera.updateProjectionMatrix();
  }

  _sync() {
    const defer =
      (this._cityRatio || 0) > 0.35 && (this._selfRatio || 0) < (this._cityRatio || 0);
    const on = this._onScreen !== false && !document.hidden && !defer;
    if (on && !this._raf) {
      this._last = performance.now();
      this._raf = requestAnimationFrame(this._tick);
    } else if (!on && this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
    if (on && this._raf === 0) {
      this._last = performance.now();
      this._raf = requestAnimationFrame(this._tick);
    }
  }

  _tick = (now) => {
    this._raf = requestAnimationFrame(this._tick);
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    const still = reduceMotion();

    // pump the live cartridge frame onto the screen
    const src = this._sourceCanvas();
    if (src && (src !== this._src || !still)) {
      this._src = src;
      const ctx = this.texCanvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#07011a";
      ctx.fillRect(0, 0, 512, 432);
      const s = Math.min(512 / src.width, 432 / src.height);
      const dw = src.width * s;
      const dh = src.height * s;
      ctx.drawImage(src, (512 - dw) / 2, (432 - dh) / 2 + 8, dw, dh);
      this.screenTex.needsUpdate = true;
    } else if (!src && this._src !== null) {
      // stage empty mid-transition: hold a dark screen, never a stale frame
      this._src = null;
      const ctx = this.texCanvas.getContext("2d");
      ctx.fillStyle = "#07011a";
      ctx.fillRect(0, 0, 512, 432);
      this.screenTex.needsUpdate = true;
    }

    // Entrance: one full turn plus a scale pop with overshoot.
    // easeOutCubic drives the spin, easeOutBack drives the scale.
    var spin = 0;
    var scl = 1;
    if (!still && this._enter < this._enterDur) {
      this._enter = Math.min(this._enterDur, this._enter + dt);
      var k = this._enter / this._enterDur;
      var e = 1 - Math.pow(1 - k, 3);
      spin = (1 - e) * -Math.PI * 2;
      var c1 = 1.70158;
      var c3 = c1 + 1;
      var b = 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
      scl = 0.55 + 0.45 * b;
      if (this._enter >= this._enterDur && !this._enterDone) {
        this._enterDone = true;
        try {
          window.dispatchEvent(new CustomEvent("boy-enter-done"));
        } catch (_) {}
      }
    } else if (still && !this._enterDone) {
      this._enterDone = true;
      try {
        window.dispatchEvent(new CustomEvent("boy-enter-done"));
      } catch (_) {}
    }
    this.boy.scale.setScalar(scl);

    if (!still) {
      const t = now / 1000;
      this.boy.position.y = Math.sin(t * 0.9) * 0.06;
      this.rig.rotation.z = Math.sin(t * 0.55) * 0.008;
      this.rY += (this.tRY - this.rY) * Math.min(1, dt * 7);
      this.rX += (this.tRX - this.rX) * Math.min(1, dt * 7);
    } else {
      this.rY = this.tRY;
      this.rX = this.tRX;
    }
    this.rig.rotation.y = this.rY + spin;
    this.rig.rotation.x = this.rX;

    this.renderer.render(this.scene, this.camera);
    if (!this._ready) {
      this._ready = true;
      document.querySelector(".console")?.classList.add("is-3d-ready");
      try { this._setFlatInert(true); } catch (_) {}
      try {
        var de = document.documentElement;
        de.classList.add("is-3d-ready");
        de.classList.remove("expect-3d");
      } catch (_) {}
    }
  };
}

customElements.define("aryan-boy-3d", AryanBoy3D);
