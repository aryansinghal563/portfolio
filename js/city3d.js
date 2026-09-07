// <voxel-city> — an orbitable, zoomable voxel diorama of the things worth
// knowing about me. Clicking a landmark flies the camera to it and opens its
// detail panel.
//
// Content and layout live in js/city-data.js. Geometry lives in
// js/city-voxels.js. This file owns the scene, the camera and the input.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LANDMARKS, P, CARS, EXTENT } from "./city-data.js";
import { BUILDERS, buildGround, buildCar, mulberry } from "./city-voxels.js";

// True isometric elevation, atan(1 / sqrt 2). Keeps the diorama reading like
// the flat version it replaces, until you decide to orbit it.
const ISO = new THREE.Vector3(1, Math.SQRT1_2, 1).normalize();
const DIST = 140;
// Fallback half-extent, only used if the scene bounds come back empty.
const FIT = 39;
// Breathing room around the city, and above it for the floating labels.
const PAD = 1.04;
const FLY_MS = 780;
// Cars run on top of the tarmac. The east arm stops at the waterfront and the
// south arm dead ends at the park gate, so those are the turnaround points.
const ROAD_Y = 0.32;
const X_MIN = -EXTENT + 1;
const X_MAX = 17;
const Z_MIN = -EXTENT + 1;
const Z_MAX = 12;
// Traffic tuning: bumper to bumper length, when to stop behind the car ahead,
// when to start easing off, where the stop line sits and how far the crossing
// itself reaches. Lights run a 13s cycle with an all red clearance each way.
const CAR_LEN = 3.6;
const STOP_GAP = 2.4;
const SLOW_GAP = 9;
const STOP_LINE = 6.8;
const INTER_HALF = 4.6;
const LIGHT_CYCLE = 13;
const ACCEL = 6;
const BRAKE = 15;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

class VoxelCity extends HTMLElement {
  connectedCallback() {
    if (this._up) return;
    this._up = true;
    this.replaceChildren();
    this._buildDom();

    try {
      this._initScene();
    } catch (err) {
      // WebGL missing or context creation refused. Leave the markup fallback.
      console.warn("voxel-city: falling back to the static list", err);
      this.classList.add("vc-failed");
      this._renderFallback();
      return;
    }

    this._buildCity();
    this._frameScene();
    this._buildCars();
    this._bindInput();
    this._resize();
    this._home(true);

    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.stage);
    // Only burn frames while the city is actually on screen.
    this._io = new IntersectionObserver(
      (e) => {
        this._onScreen = e[0].isIntersecting;
        this._sync();
      },
      { threshold: 0.01 },
    );
    this._io.observe(this);
    this._onVis = () => this._sync();
    document.addEventListener("visibilitychange", this._onVis);
  }

  disconnectedCallback() {
    this._onScreen = false;
    this._sync();
    this._ro && this._ro.disconnect();
    this._io && this._io.disconnect();
    document.removeEventListener("visibilitychange", this._onVis);
    this.controls && this.controls.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }

  // ------------------------------------------------------------------ dom

  _buildDom() {
    const h = (tag, cls, parent, html) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html != null) e.innerHTML = html;
      (parent || this).appendChild(e);
      return e;
    };

    this.stage = h("div", "vc-stage");
    this.canvas = h("canvas", "vc-canvas", this.stage);
    // Leader lines live in their own SVG under the tags. They have to be real
    // lines, not a strut under each tag, because the de-collision pass moves a
    // tag sideways as well as up.
    this.leadHost = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.leadHost.setAttribute("class", "vc-leads");
    this.stage.appendChild(this.leadHost);
    this.labelHost = h("div", "vc-labels", this.stage);

    this.hud = h("div", "vc-hud", this.stage);
    this.resetBtn = h("button", "vc-btn vc-reset", this.hud, "RESET VIEW");
    this.resetBtn.type = "button";
    this.exitBtn = h("button", "vc-btn vc-exit", this.hud, "DONE");
    this.exitBtn.type = "button";
    this.exitBtn.hidden = true;

    this.veil = h("div", "vc-veil", this.stage);
    h("span", "vc-veil-text", this.veil, "TAP TO EXPLORE THE CITY");

    this.panel = h("div", "vc-panel");
    this.panel.hidden = true;
    this.panel.innerHTML =
      '<button class="vc-close" type="button" aria-label="close">&#215;</button>' +
      '<span class="vc-kick"></span><span class="vc-title"></span>' +
      '<p class="vc-body"></p><span class="vc-stack"></span>' +
      '<a class="vc-link" target="_blank" rel="noopener">OPEN ON GITHUB &#9656;</a>';
    this.pf = {
      kick: this.panel.querySelector(".vc-kick"),
      title: this.panel.querySelector(".vc-title"),
      body: this.panel.querySelector(".vc-body"),
      stack: this.panel.querySelector(".vc-stack"),
      link: this.panel.querySelector(".vc-link"),
      close: this.panel.querySelector(".vc-close"),
    };
  }

  // If WebGL is unavailable the city becomes a plain, readable list.
  _renderFallback() {
    this.replaceChildren();
    const ul = document.createElement("ul");
    ul.className = "vc-fallback";
    for (const L of LANDMARKS) {
      const li = document.createElement("li");
      li.innerHTML =
        '<span class="vc-kick"></span><span class="vc-title"></span><p class="vc-body"></p><span class="vc-stack"></span>';
      li.querySelector(".vc-kick").textContent = L.kick;
      li.querySelector(".vc-title").textContent = L.title;
      li.querySelector(".vc-body").textContent = L.body;
      li.querySelector(".vc-stack").textContent = L.stack;
      if (L.url) {
        const a = document.createElement("a");
        a.className = "vc-link";
        a.href = L.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = "OPEN ON GITHUB ▸";
        li.appendChild(a);
      }
      li.style.setProperty("--cc", L.color);
      ul.appendChild(li);
    }
    this.appendChild(ul);
  }

  // ---------------------------------------------------------------- scene

  _initScene() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: window.devicePixelRatio < 2,
      powerPreference: "high-performance",
    });
    this.renderer.setClearAlpha(0);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));

    this.scene = new THREE.Scene();

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -400, 600);
    this.camera.position.copy(ISO).multiplyScalar(DIST);

    this.scene.add(new THREE.HemisphereLight(0xa898ea, 0x2a1450, 1.35));
    const key = new THREE.DirectionalLight(0xfff0d8, 1.5);
    key.position.set(60, 90, 40);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(P.cyan, 0.5);
    rim.position.set(-70, 40, -55);
    this.scene.add(rim);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.screenSpacePanning = false;
    this.controls.minPolarAngle = 0.18;
    this.controls.maxPolarAngle = 1.36;
    this.controls.minZoom = 0.55;
    this.controls.maxZoom = 7;
    this.homeTarget = new THREE.Vector3(0, 6, 0);
    this.controls.target.copy(this.homeTarget);
    this.fitW = this.fitH = FIT;
    this.halfH = FIT;
    // Stand-ins until the first real measure. A stage that starts at zero size,
    // inside a hidden tab say, makes _resize bail, and a click before it ever
    // succeeds used to divide by nothing and blank the scene.
    this._w = 1;
    this._h = 1;

    // On touch the city must not swallow the page scroll until asked.
    this.touch = matchMedia("(pointer: coarse)").matches;
    this._setActive(!this.touch);
  }

  _buildCity() {
    const rnd = mulberry(1337);
    this.solidMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });

    const ground = buildGround(rnd);
    const gg = new THREE.Group();
    if (ground.solid) gg.add(new THREE.Mesh(ground.solid, this.solidMat));
    if (ground.glow) gg.add(new THREE.Mesh(ground.glow, this.glowMat));
    this.scene.add(gg);

    this.groups = [];
    this.labels = [];
    this.spins = [];
    this.floats = [];
    this.beacons = [];

    const beaconGeo = new THREE.SphereGeometry(0.62, 8, 6);

    for (const L of LANDMARKS) {
      const built = BUILDERS[L.kind](L, rnd);
      const g = new THREE.Group();
      g.userData.landmark = L;
      // Per-landmark material clones so one can be dimmed or lifted alone.
      const sm = this.solidMat.clone();
      const gm = this.glowMat.clone();
      g.userData.mats = [sm, gm];
      if (built.solid) g.add(new THREE.Mesh(built.solid, sm));
      if (built.glow) g.add(new THREE.Mesh(built.glow, gm));

      if (built.spin) {
        const s = new THREE.Group();
        s.position.set(built.spin.x, built.spin.y, built.spin.z);
        if (built.spin.solid) s.add(new THREE.Mesh(built.spin.solid, sm));
        if (built.spin.glow) s.add(new THREE.Mesh(built.spin.glow, gm));
        g.add(s);
        this.spins.push({ obj: s, speed: built.spin.speed, axis: built.spin.axis });
      }
      if (built.float) {
        // The ship rides the swell. Same trick as the spin group: build it
        // around its own origin, then bob and roll the group it lives in.
        const f = new THREE.Group();
        f.position.set(built.float.x, built.float.y, built.float.z);
        if (built.float.solid) f.add(new THREE.Mesh(built.float.solid, sm));
        if (built.float.glow) f.add(new THREE.Mesh(built.float.glow, gm));
        g.add(f);
        this.floats.push({ obj: f, y: built.float.y, ...built.float });
      }
      if (built.screen) {
        // Its own material so it can flicker, but still on the dim list.
        const scMat = gm.clone();
        g.userData.mats.push(scMat);
        const sc = new THREE.Mesh(built.screen.glow, scMat);
        sc.position.set(built.screen.x, built.screen.y, built.screen.z);
        g.add(sc);
        this.screen = sc;
      }
      for (const b of built.beacons || []) {
        const m = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: b.c, transparent: true }));
        m.position.set(b.x, b.y, b.z);
        g.add(m);
        this.beacons.push(m);
      }

      const box = new THREE.Box3().setFromObject(g);
      g.userData.box = box;
      g.userData.center = box.getCenter(new THREE.Vector3());
      // The bounding box centre is the right anchor for a tower and the wrong one
      // for a park: the person on the bench sits in one corner of an 18x18 lawn,
      // so the leader pointed at a shrub. `pin` overrides it where it matters.
      g.userData.top = L.pin
        ? new THREE.Vector3(L.pin[0], L.pin[1], L.pin[2])
        : new THREE.Vector3(g.userData.center.x, box.max.y + 3, g.userData.center.z);

      this.scene.add(g);
      this.groups.push(g);
      this.labels.push(this._makeLabel(L, g));
    }
  }

  // Cars are the only thing in the diorama that moves along the ground. Each
  // one gets its own group so it can drive its lane, built after _frameScene
  // so the moving traffic never affects the home framing.
  _buildCars() {
    this.cars = [];
    for (const c of CARS) {
      const [axis, a, b, r] = c;
      const built = buildCar(r);
      const g = new THREE.Group();
      if (built.solid) g.add(new THREE.Mesh(built.solid, this.solidMat));
      if (built.glow) g.add(new THREE.Mesh(built.glow, this.glowMat));
      const lane = axis === "x" ? b : a;
      const pos = axis === "x" ? a : b;
      // Right hand traffic: eastbound on the south side, northbound on the
      // east side, so the nose always points where it is going.
      const dir = axis === "x" ? (lane > 0 ? 1 : -1) : lane > 0 ? -1 : 1;
      if (axis === "x") g.rotation.y = dir > 0 ? 0 : Math.PI;
      else g.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      g.position.set(axis === "x" ? pos : lane, ROAD_Y, axis === "x" ? lane : pos);
      this.scene.add(g);
      const cruise = 4 + r * 3.5;
      this.cars.push({ obj: g, axis, lane, pos, dir, cruise, v: cruise });
    }
  }

  // One traffic step: alternating green with an all red clearance, plus
  // car following so a fast car queues behind a slow one instead of driving
  // through it. Speeds ease toward their target so stops read as braking.
  _updateCars(dt, now) {
    const phase = (now / 1000) % LIGHT_CYCLE;
    const xGo = phase < 5.5;
    const zGo = phase >= 6.5 && phase < 12;
    const LX = X_MAX - X_MIN;
    const LZ = Z_MAX - Z_MIN;
    let xInside = false;
    let zInside = false;
    for (const c of this.cars) {
      if (Math.abs(c.pos) < INTER_HALF + 1.2) {
        if (c.axis === "x") xInside = true;
        else zInside = true;
      }
    }
    for (const c of this.cars) {
      let want = c.cruise;
      // Nearest car ahead in the same lane, measured around the wrap.
      const L = c.axis === "x" ? LX : LZ;
      let ahead = Infinity;
      for (const o of this.cars) {
        if (o === c || o.axis !== c.axis || Math.abs(o.lane - c.lane) > 0.01) continue;
        const d = c.dir > 0 ? (o.pos - c.pos + L) % L : (c.pos - o.pos + L) % L;
        if (d > 0.01 && d < ahead) ahead = d;
      }
      if (ahead !== Infinity) {
        const gap = ahead - CAR_LEN;
        if (gap < STOP_GAP) want = 0;
        else if (gap < SLOW_GAP) want = Math.min(want, (c.cruise * (gap - STOP_GAP)) / (SLOW_GAP - STOP_GAP));
      }
      // Stop line. Once the nose is past it the car is committed and clears
      // the box even on red, so queues behind it still form at the line.
      const stop = c.dir > 0 ? -STOP_LINE : STOP_LINE;
      const dist = (stop - c.pos) * c.dir;
      const inside = Math.abs(c.pos) < INTER_HALF + 1.2;
      if (!inside && dist > -1 && dist < 10) {
        const go = c.axis === "x" ? xGo : zGo;
        const blocked = c.axis === "x" ? zInside : xInside;
        if (!go || blocked) {
          if (dist < 1.4) want = 0;
          else want = Math.min(want, (c.cruise * (dist - 1.4)) / 6);
        }
      }
      const dv = want - c.v;
      c.v += Math.max(-BRAKE * dt, Math.min(ACCEL * dt, dv));
      if (want === 0 && c.v < 0.25) c.v = 0;
      c.pos += c.dir * c.v * dt;
      if (c.axis === "x") {
        if (c.pos > X_MAX) c.pos = X_MIN;
        else if (c.pos < X_MIN) c.pos = X_MAX;
        c.obj.position.set(c.pos, ROAD_Y, c.lane);
      } else {
        if (c.pos > Z_MAX) c.pos = Z_MIN;
        else if (c.pos < Z_MIN) c.pos = Z_MAX;
        c.obj.position.set(c.lane, ROAD_Y, c.pos);
      }
    }
  }

  _makeLabel(L, group) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "vc-label";
    b.style.setProperty("--cc", L.color);
    b.innerHTML = '<span class="vc-tag"></span>';
    const tag = b.querySelector(".vc-tag");
    tag.textContent = L.label;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      this._select(group);
    });
    this.labelHost.appendChild(b);

    const NS = "http://www.w3.org/2000/svg";
    const line = document.createElementNS(NS, "path");
    line.setAttribute("class", "vc-lead");
    line.setAttribute("stroke", L.color);
    const pip = document.createElementNS(NS, "circle");
    pip.setAttribute("class", "vc-pip");
    pip.setAttribute("r", "2.6");
    pip.setAttribute("fill", L.color);
    this.leadHost.append(line, pip);

    return { el: b, tag, line, pip, group, v: new THREE.Vector3(), w: 60, h: 20, ax: 0, ay: 0, tx: null, ty: 0, off: false };
  }

  // Tag text and box size only change when the stage does, so measure here
  // rather than eleven times a frame.
  _measureLabels() {
    if (!this.labels) return;
    const short = this._w < 620;
    for (const l of this.labels) {
      const L = l.group.userData.landmark;
      const want = short ? L.short || L.label : L.label;
      if (l.tag.textContent !== want) l.tag.textContent = want;
      l.w = l.tag.offsetWidth;
      l.h = l.tag.offsetHeight;
    }
  }

  // ---------------------------------------------------------------- input

  _bindInput() {
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let moved = false;

    this.canvas.addEventListener("pointerdown", (e) => {
      downX = e.clientX;
      downY = e.clientY;
      moved = false;
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) moved = true;
      if (this.touch || !this.active || this.selected) return;
      this._hover(this._pick(ray, ndc, e));
    });
    this.canvas.addEventListener("pointerup", (e) => {
      if (moved || !this.active) return;
      const hit = this._pick(ray, ndc, e);
      hit ? this._select(hit) : this._home();
    });
    this.canvas.addEventListener("pointerleave", () => {
      if (!this.selected) this._hover(null);
    });

    this.veil.addEventListener("click", () => this._setActive(true));
    this.exitBtn.addEventListener("click", () => this._setActive(false));
    this.resetBtn.addEventListener("click", () => this._home());
    this.pf.close.addEventListener("click", () => this._home());

    this.tabIndex = 0;
    this.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.selected) this._home();
    });
  }

  _pick(ray, ndc, e) {
    const r = this.canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, this.camera);
    const hits = ray.intersectObjects(this.groups, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !o.userData.landmark) o = o.parent;
    return o || null;
  }

  _setActive(on) {
    this.active = on;
    this.controls.enabled = on;
    this.canvas.style.touchAction = on ? "none" : "auto";
    this.veil.hidden = on;
    this.exitBtn.hidden = !(on && this.touch);
    this.classList.toggle("vc-active", on);
  }

  _hover(group) {
    if (this.hovered === group) return;
    this.hovered = group;
    this.classList.toggle("vc-hovering", !!group);
    for (const g of this.groups) {
      const on = g === group;
      g.userData.lift = on ? 1.6 : 0;
      for (const m of g.userData.mats) m.color.setScalar(on ? 1.32 : 1);
    }
  }

  // ------------------------------------------------------------- movement

  // Let the camera derive its framing from what actually got built, rather
  // than a hand-tuned constant that goes stale the moment a tower grows.
  _frameScene() {
    const meshes = [];
    this.scene.traverse((o) => {
      if (o.isMesh) meshes.push(o);
    });
    if (!meshes.length) return;

    const world = new THREE.Box3().setFromObject(this.scene);
    if (world.isEmpty()) return;
    this.homeTarget = world.getCenter(new THREE.Vector3());

    // Build the view matrix for the home shot so the city can be measured in
    // the camera's own axes rather than in world space.
    const eye = this.homeTarget.clone().addScaledVector(ISO, DIST);
    const view = new THREE.Matrix4().lookAt(eye, this.homeTarget, this.camera.up);
    view.setPosition(eye);
    view.invert();

    // One box around the whole city would be mostly air: it implies a tower
    // standing on the near corner of the plate, which nothing does. Measuring
    // each mesh separately and taking the union of what they cover is far
    // tighter, and tighter framing means a bigger city on screen.
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    const b = new THREE.Box3();
    const p = new THREE.Vector3();
    for (const m of meshes) {
      b.setFromObject(m);
      if (b.isEmpty()) continue;
      for (let i = 0; i < 8; i++) {
        p.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z);
        p.applyMatrix4(view);
        x0 = Math.min(x0, p.x);
        x1 = Math.max(x1, p.x);
        y0 = Math.min(y0, p.y);
        y1 = Math.max(y1, p.y);
      }
    }

    // Slide the home target so that span is centred on screen. Without this the
    // camera aims at the middle of the bounds, which is not what you see.
    const inv = view.clone().invert();
    const right = new THREE.Vector3().setFromMatrixColumn(inv, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(inv, 1);
    this.homeTarget.addScaledVector(right, (x0 + x1) / 2).addScaledVector(up, (y0 + y1) / 2);

    this.fitW = ((x1 - x0) / 2) * PAD;
    // Labels float above their landmark, so leave a little extra at the top.
    this.fitH = ((y1 - y0) / 2) * PAD * 1.02;
  }

  // Where to put the camera so a landmark fills the view. Measures the box
  // along the axes the camera is actually looking down, rather than using a
  // bounding sphere, which over-estimates badly for anything tall and thin.
  // Takes the viewing direction so a fly-in can frame up from the angle it is
  // about to land on, not the one it is leaving.
  _frameOn(box, dir) {
    const center = box.getCenter(new THREE.Vector3());
    const d = dir || this.camera.position.clone().sub(this.controls.target).normalize();
    const eye = center.clone().addScaledVector(d, DIST);
    const look = new THREE.Matrix4().lookAt(eye, center, this.camera.up);
    look.setPosition(eye);
    const view = look.invert();
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    const p = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      p.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      p.applyMatrix4(view);
      x0 = Math.min(x0, p.x);
      x1 = Math.max(x1, p.x);
      y0 = Math.min(y0, p.y);
      y1 = Math.max(y1, p.y);
    }

    // On a wide screen the panel sits over the left third, so aim for the strip
    // to the right of it. That both keeps the subject clear of the text and
    // buys real zoom, which a full-width fit does not on a letterbox stage.
    const wide = this._w >= 861 && this._w / this._h > 1.2;
    const usable = wide ? 0.62 : 1;
    const halfW = this.halfH * (this._w / this._h);
    const MARGIN = 1.12;
    const zoom = THREE.MathUtils.clamp(
      Math.min((halfW * usable) / (((x1 - x0) / 2) * MARGIN), this.halfH / (((y1 - y0) / 2) * MARGIN)),
      1,
      this.controls.maxZoom,
    );

    const target = box.getCenter(new THREE.Vector3());
    if (wide) {
      const right = new THREE.Vector3().setFromMatrixColumn(view.clone().invert(), 0);
      // Pull the aim point left so the landmark lands right of the panel.
      target.addScaledVector(right, -0.33 * (halfW / zoom));
    }
    return { zoom, target };
  }

  // Pick a viewing direction that actually sees the landmark. Keeps the
  // current elevation and tries the smallest swing first: straight on, then
  // 45deg either way, then 90, then 135, then fully behind. A direction
  // scores by how many sample points on the landmark read as visible, where
  // a ray from the camera hits the landmark itself before anything else.
  _clearDir(box, curDir, group) {
    const center = box.getCenter(new THREE.Vector3());
    const samples = [
      center.clone(),
      new THREE.Vector3(center.x, box.max.y - 1, center.z),
      new THREE.Vector3(center.x, (box.min.y + box.max.y) / 2, center.z),
    ];
    const sph = new THREE.Spherical().setFromVector3(curDir);
    const phi = THREE.MathUtils.clamp(sph.phi, 0.6, 1.2);
    const base = sph.theta;
    const steps = [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, (3 * Math.PI) / 4, (-3 * Math.PI) / 4, Math.PI];
    const ray = new THREE.Raycaster();
    let best = curDir.clone().normalize();
    let bestScore = -1;
    for (const step of steps) {
      const dir = new THREE.Vector3().setFromSphericalCoords(1, phi, base + step).normalize();
      const eye = center.clone().addScaledVector(dir, DIST);
      let visible = 0;
      for (const s of samples) {
        const toS = s.clone().sub(eye);
        const dist = toS.length();
        ray.set(eye, toS.normalize());
        ray.far = dist;
        const hits = ray.intersectObjects(this.groups, true);
        let blocker = null;
        for (const h of hits) {
          let o = h.object;
          while (o && !o.userData.landmark) o = o.parent;
          if (!o) continue;
          blocker = o;
          break;
        }
        if (!blocker || blocker === group) visible++;
      }
      if (visible > bestScore) {
        bestScore = visible;
        best = dir;
        if (visible === samples.length) break;
      }
    }
    return best;
  }

  _home(instant) {
    this.selected = null;
    this.panel.hidden = true;
    this.classList.remove("vc-focused");
    for (const g of this.groups) for (const m of g.userData.mats) m.color.setScalar(1);
    for (const l of this.labels) l.el.classList.remove("vc-muted", "vc-on");
    this._flyTo(this.homeTarget.clone(), 1, instant);
  }

  _select(group) {
    const L = group.userData.landmark;
    this.selected = group;
    this.classList.add("vc-focused");
    this._hover(null);

    for (const g of this.groups) {
      const on = g === group;
      for (const m of g.userData.mats) m.color.setScalar(on ? 1.18 : 0.34);
    }
    for (const l of this.labels) {
      l.el.classList.toggle("vc-on", l.group === group);
      l.el.classList.toggle("vc-muted", l.group !== group);
    }

    this.panel.style.setProperty("--cc", L.color);
    this.pf.kick.textContent = L.kick;
    this.pf.title.textContent = L.title;
    this.pf.body.textContent = L.body;
    this.pf.stack.textContent = L.stack;
    this.pf.link.hidden = !L.url;
    if (L.url) this.pf.link.href = L.url;
    this.panel.hidden = false;

    const curDir = this.camera.position.clone().sub(this.controls.target).normalize();
    // Fly to the subject, not to the footprint. Framing the park's whole bounding
    // box put the one thing worth flying to, the person on the bench, at about
    // fifteen pixels. `pinR` frames a cube around the pin instead.
    const box = L.pinR
      ? new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(L.pin[0], L.pin[1] - L.pinR * 0.45, L.pin[2]),
          new THREE.Vector3(L.pinR * 2, L.pinR * 1.6, L.pinR * 2),
        )
      : group.userData.box;
    // Swing around back lots instead of zooming straight into the tower in
    // front of them. Smallest clear rotation wins, so front lots keep the
    // angle you already had.
    const dir = this._clearDir(box, curDir, group);
    const f = this._frameOn(box, dir);
    this._flyTo(f.target, f.zoom, false, dir);
  }

  _flyTo(target, zoom, instant, dir) {
    const c = this.controls;
    // Default to the iso shot. A fly-in to a clear side also swings the orbit
    // there instead of cutting straight through the towers in between.
    const d = (dir || ISO).clone().normalize();
    if (instant || reduceMotion()) {
      c.target.copy(target);
      this.camera.position.copy(target).addScaledVector(d, DIST);
      this.camera.zoom = zoom;
      this.camera.updateProjectionMatrix();
      c.update();
      this.fly = null;
      return;
    }
    const fromD = this.camera.position.clone().sub(c.target).normalize();
    const fromS = new THREE.Spherical().setFromVector3(fromD);
    const toS = new THREE.Spherical().setFromVector3(d);
    let dTheta = toS.theta - fromS.theta;
    while (dTheta > Math.PI) dTheta -= Math.PI * 2;
    while (dTheta < -Math.PI) dTheta += Math.PI * 2;
    this.fly = {
      t: 0,
      fromT: c.target.clone(),
      toT: target.clone(),
      fromPhi: fromS.phi,
      toPhi: toS.phi,
      fromTheta: fromS.theta,
      dTheta,
      fromZ: this.camera.zoom,
      toZ: zoom,
    };
  }

  // --------------------------------------------------------------- render

  _resize() {
    const w = this.stage.clientWidth;
    const h = this.stage.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this._w = w;
    this._h = h;
    // Fit the measured city on both axes: whichever one runs out first wins.
    const a = w / h;
    const hh = Math.max(this.fitH, this.fitW / a);
    const hw = hh * a;
    this.halfH = hh;
    const c = this.camera;
    c.left = -hw;
    c.right = hw;
    c.top = hh;
    c.bottom = -hh;
    c.updateProjectionMatrix();
    this._measureLabels();
  }

  _sync() {
    const on = !!this._onScreen && !document.hidden;
    if (on && !this._raf) {
      this._last = performance.now();
      this._raf = requestAnimationFrame(this._tick);
    } else if (!on && this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }

  _tick = (now) => {
    this._raf = requestAnimationFrame(this._tick);
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    const still = reduceMotion();

    if (this.fly) {
      this.fly.t = Math.min(1, this.fly.t + (dt * 1000) / FLY_MS);
      const k = easeInOut(this.fly.t);
      this.controls.target.lerpVectors(this.fly.fromT, this.fly.toT, k);
      const phi = this.fly.fromPhi + (this.fly.toPhi - this.fly.fromPhi) * k;
      const theta = this.fly.fromTheta + this.fly.dTheta * k;
      const dir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
      this.camera.position.copy(this.controls.target).addScaledVector(dir, DIST);
      this.camera.zoom = this.fly.fromZ + (this.fly.toZ - this.fly.fromZ) * k;
      this.camera.updateProjectionMatrix();
      if (this.fly.t >= 1) this.fly = null;
    }

    if (!still) {
      for (const s of this.spins) s.obj.rotation[s.axis] += s.speed * dt;
      if (this.cars) this._updateCars(dt, now);
      for (const f of this.floats) {
        const t = (now / 1000) * f.speed;
        f.obj.position.y = f.y + Math.sin(t) * f.amp;
        f.obj.rotation.z = Math.sin(t * 0.77) * f.roll;
        f.obj.rotation.x = Math.cos(t * 0.61) * f.roll * 0.6;
      }
      const pulse = 0.6 + Math.abs(Math.sin(now / 620)) * 0.4;
      for (const b of this.beacons) b.material.opacity = pulse;
      if (this.screen) this.screen.material.color.setScalar(0.82 + Math.sin(now / 90) * 0.18);
    }

    // Ease the hover lift rather than snapping it.
    for (const g of this.groups) {
      const want = g.userData.lift || 0;
      if (Math.abs(g.position.y - want) > 0.01) g.position.y += (want - g.position.y) * Math.min(1, dt * 12);
    }

    this.controls.update();
    this._placeLabels();
    this.renderer.render(this.scene, this.camera);
  };

  // Project every anchor, then shove the tags out of each other's way.
  //
  // Eleven fixed tags collided the moment the stage narrowed: twelve colliding
  // pairs at phone width, which is what "the labels are broken" looked like.
  // Stacking them vertically alone was not enough either, because the tags
  // above the tallest towers ran out of sky. So this is a small 2D relaxation:
  // each tag is pulled toward the column above its landmark and pushed off any
  // tag it overlaps, and the leader line stretches to wherever it ends up.
  _placeLabels() {
    const rw = this._w;
    const rh = this._h;
    const GAP = 18; // shortest leader, so a tag never sits on its own roof
    const PADX = 6;
    const PADY = 5;

    const live = [];
    for (const l of this.labels) {
      l.v.copy(l.group.userData.top);
      l.v.y += l.group.position.y;
      l.v.project(this.camera);
      l.ax = (l.v.x * 0.5 + 0.5) * rw;
      l.ay = (-l.v.y * 0.5 + 0.5) * rh;
      l.off = l.v.x < -0.99 || l.v.x > 0.99 || l.v.y < -0.99 || l.v.y > 0.995;
      const dimmed = this.selected && l.group !== this.selected;
      const hidden = l.off || dimmed;
      l.el.classList.toggle("vc-off", l.off);
      l.line.style.display = hidden ? "none" : "";
      l.pip.style.display = hidden ? "none" : "";
      if (hidden) {
        l.tx = null;
        continue;
      }
      // A fly-in moves everything at once, so start over rather than easing
      // the tag across half the stage.
      if (l.tx === null || Math.abs(l.tx - l.ax) > rw * 0.4) {
        l.tx = l.ax;
        l.ty = l.ay - GAP;
      }
      live.push(l);
    }

    for (const l of live) {
      l.tx += (l.ax - l.tx) * 0.3;
      l.ty += (l.ay - GAP - l.ty) * 0.3;
    }

    for (let it = 0; it < 6; it++) {
      for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
          const a = live[i];
          const b = live[j];
          const ox = (a.w + b.w) / 2 + PADX - Math.abs(a.tx - b.tx);
          const oy = (a.h + b.h) / 2 + PADY - Math.abs(a.ty - a.h / 2 - (b.ty - b.h / 2));
          if (ox <= 0 || oy <= 0) continue;
          // Separate along whichever axis needs the least movement, biased
          // toward vertical: there is far more empty sky above the city than
          // there is room beside it.
          if (oy * 1.7 < ox) {
            const d = (a.ty < b.ty ? -1 : 1) * oy * 0.5;
            a.ty += d;
            b.ty -= d;
          } else {
            const d = (a.tx < b.tx ? -1 : 1) * ox * 0.5;
            a.tx += d;
            b.tx -= d;
          }
        }
      }
      for (const l of live) {
        l.tx = Math.min(Math.max(l.tx, l.w / 2 + 3), rw - l.w / 2 - 3);
        l.ty = Math.min(Math.max(l.ty, l.h + 3), rh - 3);
      }
    }

    for (const l of live) {
      l.el.style.transform =
        "translate(-50%,-100%) translate(" + l.tx.toFixed(1) + "px," + l.ty.toFixed(1) + "px)";
      l.line.setAttribute(
        "d",
        "M" + l.tx.toFixed(1) + " " + l.ty.toFixed(1) + "L" + l.ax.toFixed(1) + " " + l.ay.toFixed(1),
      );
      l.pip.setAttribute("cx", l.ax.toFixed(1));
      l.pip.setAttribute("cy", l.ay.toFixed(1));
    }
  }
}

customElements.define("voxel-city", VoxelCity);
