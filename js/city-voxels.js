// Voxel model builders for the city. Every landmark kind gets a function that
// returns merged geometry, so a whole building costs one or two draw calls.
//
// Nothing here touches the DOM or the scene graph. js/city3d.js owns those.

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { P, EXTENT, CHAMFER, WATER, ROADS, FILLER, PROPS } from "./city-data.js";

// Multiply a hex colour's channels, the same trick the old SVG city used to
// get light and dark faces off one base colour.
export const sh = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return (
    "#" +
    ((1 << 24) + (c(n >> 16) << 16) + (c((n >> 8) & 255) << 8) + c(n & 255))
      .toString(16)
      .slice(1)
  );
};

// Deterministic RNG so the skyline is identical on every load.
export const mulberry = (seed) => {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const _col = new THREE.Color();

// Bake the colour into vertices, darkening toward the ground so the city has
// some occlusion without paying for a shadow map.
function paint(geo, hex, ao) {
  _col.set(hex);
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const k = ao === false ? 1 : Math.min(1, 0.78 + pos.getY(i) * 0.045);
    arr[i * 3] = _col.r * k;
    arr[i * 3 + 1] = _col.g * k;
    arr[i * 3 + 2] = _col.b * k;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return geo;
}

// Collects boxes, then merges them. Lit surfaces (windows, screens, neon) are
// kept apart so they can draw unlit and read as glowing at night.
class Vox {
  constructor() {
    this.solid = [];
    this.glow = [];
  }
  // cx / cz are the footprint centre, y is the base. Sizes are in cells.
  box(cx, y, cz, w, h, d, col, glow) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(cx, y + h / 2, cz);
    paint(g, col, !glow);
    (glow ? this.glow : this.solid).push(g);
    return this;
  }
  cyl(cx, y, cz, r, h, col, seg, glow) {
    const g = new THREE.CylinderGeometry(r, r, h, seg || 16);
    g.translate(cx, y + h / 2, cz);
    paint(g, col, !glow);
    (glow ? this.glow : this.solid).push(g);
    return this;
  }
  merge() {
    return {
      solid: this.solid.length ? mergeGeometries(this.solid) : null,
      glow: this.glow.length ? mergeGeometries(this.glow) : null,
    };
  }
}

// A grid of lit windows across all four faces of a box.
function windows(v, cx, cz, w, d, y0, h, col, rnd, density) {
  const rows = Math.max(1, Math.floor((h - 2.5) / 3));
  const nw = Math.max(1, Math.round(w / 2.4));
  const nd = Math.max(1, Math.round(d / 2.4));
  const dens = density == null ? 0.45 : density;
  const lit = () => rnd() < dens;
  for (let r = 0; r < rows; r++) {
    const y = y0 + 1.8 + r * 3;
    for (let i = 0; i < nw; i++) {
      const x = cx - w / 2 + ((i + 0.5) * w) / nw;
      if (lit()) v.box(x, y, cz - d / 2 - 0.07, 1.05, 1.5, 0.14, col, true);
      if (lit()) v.box(x, y, cz + d / 2 + 0.07, 1.05, 1.5, 0.14, col, true);
    }
    for (let i = 0; i < nd; i++) {
      const z = cz - d / 2 + ((i + 0.5) * d) / nd;
      if (lit()) v.box(cx - w / 2 - 0.07, y, z, 0.14, 1.5, 1.05, col, true);
      if (lit()) v.box(cx + w / 2 + 0.07, y, z, 0.14, 1.5, 1.05, col, true);
    }
  }
}

// ------------------------------------------------------------------- props
// Small repeated models. They take a Vox so they can be baked into whatever
// mesh is being built, whether that is the ground or a landmark.

function tree(v, x, y, z, s, r) {
  const t = (1.5 + r * 1.1) * s;
  const c = r < 0.34 ? P.green : r < 0.72 ? P.leaf : P.pine;
  v.box(x, y, z, 0.55 * s, t + 0.4 * s, 0.55 * s, sh(P.bark, 0.85));
  v.box(x, y + t, z, 3.0 * s, 1.9 * s, 3.0 * s, sh(c, 0.42));
  v.box(x, y + t + 1.7 * s, z, 2.2 * s, 1.5 * s, 2.2 * s, sh(c, 0.58));
  v.box(x, y + t + 3.0 * s, z, 1.2 * s, 1.0 * s, 1.2 * s, sh(c, 0.76));
}

function pine(v, x, y, z, s, r) {
  v.box(x, y, z, 0.5 * s, 1.2 * s, 0.5 * s, sh(P.bark, 0.75));
  for (let i = 0; i < 4; i++) {
    const w = (2.9 - i * 0.62) * s;
    v.box(x, y + (0.9 + i * 1.2) * s, z, w, 1.45 * s, w, sh(P.pine, 0.4 + i * 0.11));
  }
  v.box(x, y + 5.7 * s, z, 0.45 * s, 0.9 * s, 0.45 * s, sh(P.pine, 0.92));
  if (r > 0.6) v.box(x, y + 6.5 * s, z, 0.3 * s, 0.3 * s, 0.3 * s, P.gold, true);
}

function bush(v, x, y, z, s, r) {
  const c = r < 0.5 ? P.green : P.leaf;
  v.box(x, y, z, 1.7 * s, 1.0 * s, 1.7 * s, sh(c, 0.44));
  v.box(x + 0.4 * s, y + 0.8 * s, z - 0.3 * s, 1.1 * s, 0.7 * s, 1.1 * s, sh(c, 0.6));
}

function rock(v, x, y, z, s, r) {
  v.box(x, y, z, 1.5 * s, 0.9 * s, 1.3 * s, sh(P.kerb, 1.5));
  if (r > 0.45) v.box(x - 0.5 * s, y + 0.7 * s, z + 0.3 * s, 0.9 * s, 0.6 * s, 0.9 * s, sh(P.kerb, 1.9));
}

function lamp(v, x, y, z, s) {
  v.box(x, y, z, 0.32 * s, 4.6 * s, 0.32 * s, sh(P.kerb, 1.7));
  v.box(x, y + 4.6 * s, z, 0.85 * s, 0.5 * s, 0.85 * s, sh(P.gold, 1.05), true);
  // The pool of light on the ground. Two flat plates cost nothing and do more
  // to stop a night scene reading as a black void than any amount of geometry.
  v.box(x, y + 0.02, z, 3.8 * s, 0.02, 3.8 * s, sh(P.gold, 0.07), true);
  v.box(x, y + 0.04, z, 2.0 * s, 0.02, 2.0 * s, sh(P.gold, 0.12), true);
}

function crate(v, x, y, z, s, r) {
  const cols = [P.pink, P.cyan, P.gold, P.mag, P.purple];
  v.box(x, y, z, 1.5 * s, 1.3 * s, 1.5 * s, sh(cols[Math.floor(r * 5) % 5], 0.6));
  if (r > 0.5) v.box(x + 0.25 * s, y + 1.3 * s, z, 1.2 * s, 1.1 * s, 1.2 * s, sh(cols[Math.floor(r * 9) % 5], 0.72));
}

function hydrant(v, x, y, z, s) {
  v.box(x, y, z, 0.6 * s, 1.1 * s, 0.6 * s, sh(P.pink, 0.8));
  v.box(x, y + 1.1 * s, z, 0.8 * s, 0.25 * s, 0.8 * s, sh(P.pink, 1.0));
}

const PROP_FN = { tree, pine, bush, rock, lamp, crate, hydrant };

// A chunky voxel car built around its own origin, nose toward +x. The body
// sits high on four block wheels, with a glass cabin, bumpers and a pair of
// head and tail lights so it reads from the isometric distance. Some cars
// get a roof sign. Returns merged { solid, glow } ready to drop into a mesh.
export function buildCar(r) {
  const v = new Vox();
  const cols = [P.pink, P.cyan, P.gold, P.mag, P.trim, P.purple, P.green];
  const c = cols[Math.floor(r * cols.length) % cols.length];
  const body = sh(c, 0.68);
  const darkSide = sh(c, 0.45);
  const glass = sh(P.dark, 2.4);
  // wheels
  for (const sx of [-1.05, 1.05])
    for (const sz of [-0.85, 0.85]) {
      v.box(sx, 0, sz, 0.62, 0.62, 0.34, sh(P.dark, 2.8));
      v.box(sx, 0.14, sz + (sz > 0 ? 0.18 : -0.18), 0.3, 0.3, 0.06, sh(P.trim, 0.7));
    }
  // chassis and main body
  v.box(0, 0.45, 0, 3.2, 0.55, 1.6, darkSide);
  v.box(0, 0.95, 0, 3.1, 0.5, 1.55, body);
  v.box(1.45, 0.95, 0, 0.4, 0.42, 1.45, sh(body, 1.1));
  // cabin glass with a body coloured roof
  v.box(-0.2, 1.45, 0, 1.7, 0.55, 1.35, glass);
  v.box(-0.2, 1.45, 0, 0.2, 0.55, 1.37, sh(P.dark, 1.4));
  v.box(-0.2, 2.0, 0, 1.5, 0.16, 1.25, sh(c, 0.9));
  // bumpers
  v.box(1.66, 0.55, 0, 0.18, 0.3, 1.6, sh(P.trim, 0.7));
  v.box(-1.66, 0.55, 0, 0.18, 0.3, 1.6, sh(P.trim, 0.6));
  // headlights and taillights, a pair each so they read as a car at night
  for (const sz of [-0.5, 0.5]) {
    v.box(1.62, 0.95, sz, 0.14, 0.28, 0.38, P.gold, true);
    v.box(-1.62, 0.95, sz, 0.14, 0.26, 0.38, P.pink, true);
  }
  // a few cars get a taxi style roof sign
  if (r > 0.68) v.box(-0.2, 2.16, 0, 0.7, 0.28, 0.4, P.gold, true);
  return v.merge();
}

// A small moored boat sitting on the water surface.
function boat(v, x, z, r) {
  const y = WATER.y + 0.15;
  const c = r < 0.5 ? P.cyan : P.gold;
  for (let i = 0; i < 5; i++) {
    const t = (i + 0.5) / 5;
    const taper = 1 - Math.abs(t - 0.5) * 1.1;
    v.box(x - 2.5 + t * 5, y, z, 1.05, 0.75, 1.4 + taper * 0.9, sh(P.trim, 0.5));
  }
  v.box(x - 0.4, y + 0.75, z, 1.6, 0.9, 1.7, sh(c, 0.6));
  v.box(x - 0.4, y + 1.65, z, 0.22, 3.2, 0.22, sh(P.trim, 0.7));
  v.box(x - 0.4, y + 4.6, z, 0.3, 0.3, 0.3, c, true);
}

// ---------------------------------------------------------------- builders
// Each returns merged { solid, glow } plus any animated sub-parts.

function buildTower(L, rnd) {
  const v = new Vox();
  const [cx, cz] = L.at;
  const [w, d] = L.size;
  const H = L.height;
  v.box(cx, 0, cz, w + 1.4, 1.1, d + 1.4, sh(L.color, 0.26));
  v.box(cx, 1.1, cz, w, H, d, sh(L.color, 0.56));
  windows(v, cx, cz, w, d, 1.1, H, sh(P.gold, 1.05), rnd);
  // a bright band under the crown so the accent colour reads from far off
  v.box(cx, 1.1 + H - 0.9, cz, w + 0.16, 0.55, d + 0.16, L.color, true);
  // stepped crown
  v.box(cx, 1.1 + H, cz, w - 1.6, 1.4, d - 1.6, sh(L.color, 0.74));
  v.box(cx, 2.5 + H, cz, w - 3.4, 2.6, d - 3.4, sh(L.color, 0.64));
  v.box(cx, 5.1 + H, cz, 0.7, 3.6, 0.7, sh(L.color, 0.8));
  // street furniture so the base is not a bare plinth
  for (const s of [-1, 1]) lamp(v, cx + s * (w / 2 + 1.6), 1.1, cz + s * (d / 2 - 1), 1);
  bush(v, cx - w / 2 - 1.4, 1.1, cz - d / 2 + 1.2, 1, rnd());
  bush(v, cx + w / 2 + 1.4, 1.1, cz + d / 2 - 1.2, 0.9, rnd());
  return { ...v.merge(), beacons: [{ x: cx, y: 8.7 + H, z: cz, c: L.color }] };
}

function buildConstruction(L, rnd) {
  const v = new Vox();
  const [cx, cz] = L.at;
  const [w, d] = L.size;
  const H = L.height;
  v.box(cx, 0, cz, w + 1.4, 1, d + 1.4, sh(P.kerb, 1.1));
  // finished lower storeys, bare slabs and columns above
  v.box(cx, 1, cz, w, 6, d, sh(P.stone, 0.4));
  windows(v, cx, cz, w, d, 1, 6, sh(P.gold, 1.05), rnd, 0.35);
  for (let f = 0; f < 3; f++) {
    const y = 7 + f * 2.8;
    v.box(cx, y, cz, w, 0.5, d, sh(P.stone, 0.52));
    const ox = w / 2 - 0.7;
    const oz = d / 2 - 0.7;
    for (const s of [[-ox, -oz], [ox, -oz], [-ox, oz], [ox, oz], [0, -oz], [0, oz]])
      v.box(cx + s[0], y + 0.5, cz + s[1], 0.7, 2.3, 0.7, sh(P.stone, 0.34));
  }
  v.box(cx, H, cz, w, 0.5, d, sh(P.stone, 0.5));
  // hoarding, skip and a pile of materials around the lot
  for (let i = -2; i <= 2; i++) v.box(cx + i * 2.2, 1, cz + d / 2 + 1.4, 2, 2.2, 0.24, sh(P.gold, 0.55));
  v.box(cx - w / 2 - 1.6, 1, cz + d / 2 - 1, 2.6, 1.5, 2, sh(P.rust, 0.9));
  for (let i = 0; i < 3; i++) v.box(cx + w / 2 + 1.4, 1 + i * 0.5, cz - 1 + i * 0.3, 3, 0.5, 1.2, sh(P.stone, 0.46));
  // tower crane on the corner of the lot
  const kx = cx - w / 2 - 2.2;
  const kz = cz - d / 2 - 2.2;
  v.box(kx, 0, kz, 2.6, 1, 2.6, sh(P.gold, 0.35));
  v.box(kx, 1, kz, 1.1, H + 9, 1.1, sh(P.gold, 0.8));
  // the jib spins, so it is built around its own origin
  const jib = new Vox();
  jib.box(0, -0.45, 0, 22, 0.9, 0.9, P.gold);
  jib.box(0, 0.45, 0, 1.3, 3.2, 1.3, sh(P.gold, 0.7));
  jib.box(6.5, -3.85, 0, 0.36, 3.4, 0.36, sh(P.trim, 0.8));
  jib.box(6.5, -5.65, 0, 1.9, 1.8, 1.9, P.pink);
  return {
    ...v.merge(),
    spin: { ...jib.merge(), x: kx, y: H + 10, z: kz, speed: 0.16, axis: "y" },
    beacons: [{ x: kx, y: H + 10.6, z: kz, c: P.pink }],
  };
}

// The harbour: a stone quay, a container crane straddling it, and a cargo ship
// tied up alongside. The ship is returned as a floating part so it rides the
// swell instead of sitting in the water like a brick.
function buildHarbor(L, rnd) {
  const v = new Vox();
  const cols = [P.pink, P.cyan, P.gold, P.mag, P.purple, P.green];
  const QX = 18.5; // centre of the quay strip, running north to south
  const WY = WATER.y;

  // quay deck, with a lip standing proud of the water
  v.box(QX, -0.35, 11, 4.6, 0.7, 22, sh(P.stone, 0.42));
  v.box(QX + 2.2, 0.35, 11, 0.6, 0.35, 22, sh(P.trim, 0.55));
  for (let z = 0; z <= 20; z += 3) v.box(QX + 2.2, 0.35, z, 0.7, 0.8, 0.7, sh(P.kerb, 1.7));
  // yard stacks waiting to be loaded
  for (let i = 0; i < 7; i++) {
    if (i === 2 || i === 4) continue; // gaps, so the quay is not a solid wall
    const z = 1.5 + i * 3;
    const n = 1 + Math.floor(rnd() * 2);
    for (let k = 0; k < n; k++)
      v.box(QX - 1.4, 0.35 + k * 1.55, z, 3.1, 1.5, 2.3, sh(cols[(i + k) % 6], 0.5));
  }
  // a shed and a couple of lamps so the yard is not a bare slab
  v.box(QX - 0.4, 0.35, 20.4, 3.6, 3, 3.4, sh(P.kerb, 1.5));
  v.box(QX - 0.4, 3.35, 20.4, 4, 0.4, 3.8, sh(P.gold, 0.5));
  v.box(QX - 2.25, 1.2, 20.4, 0.14, 1.2, 2, P.gold, true);
  lamp(v, QX - 1.6, 0.35, 0.6, 1);
  lamp(v, QX - 1.6, 0.35, 21.4, 1);

  // ---- gantry crane. Legs on the quay, boom reaching east over the ship.
  const gz = 11;
  const GH = 15;
  // Painted steel with a gold safety stripe, not solid gold. At full brightness
  // this thing was the loudest object in the diorama and read as the landmark
  // instead of the ship it is meant to be loading.
  for (const oz of [-2.6, 2.6])
    for (const ox of [-1.7, 1.7]) {
      v.box(QX + ox, 0.35, gz + oz, 1.0, GH, 1.0, sh(P.steel, 0.5));
      v.box(QX + ox, 0.35 + GH * 0.3, gz + oz, 1.1, 0.5, 1.1, sh(P.gold, 0.8));
      v.box(QX + ox * 0.5, 0.35 + GH * 0.55, gz + oz, 3.4, 0.7, 0.7, sh(P.steel, 0.38));
    }
  v.box(QX, 0.35 + GH, gz, 5.4, 1.3, 7.4, sh(P.steel, 0.62));
  // the boom, and a spreader hanging off it with one container in the air
  v.box(QX + 7, 1.65 + GH, gz, 16, 1.1, 1.8, sh(P.steel, 0.68));
  v.box(QX + 7, 2.25 + GH, gz, 16, 0.2, 1.9, sh(P.gold, 0.9));
  v.box(QX - 4.4, 1.65 + GH, gz, 5, 1.1, 1.8, sh(P.steel, 0.5));
  v.box(QX + 5.5, 0.9 + GH, gz, 3, 1.4, 2.6, sh(P.trim, 0.7));
  v.box(QX + 5.5, 5.2, gz, 0.3, GH - 5, 0.3, sh(P.trim, 0.8));
  v.box(QX + 5.5, 3.8, gz, 3.4, 1.4, 2.4, sh(P.pink, 0.9));
  v.box(QX + 5.5, 2.2, gz, 3.1, 1.5, 2.3, sh(P.cyan, 0.75));
  // cab clinging to the landward leg
  v.box(QX - 2.4, 0.35 + GH - 3.2, gz - 3.2, 1.8, 2, 1.8, sh(P.kerb, 1.6));
  v.box(QX - 3.35, 0.35 + GH - 2.8, gz - 3.2, 0.2, 1.1, 1.5, P.cyan, true);

  // Two small craft further out, where the cargo ship is not.
  boat(v, 28.5, 24.5, 0.2);
  boat(v, 23.5, 26, 0.8);

  // ---- the ship, built around its own centre so it can bob. It lies bow to
  // the south, parallel to the quay, so +z is forward.
  const s = new Vox();
  const LEN = 18;
  const BEAM = 8.4;
  const N = 13;
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N;
    // fine at the bow, blunter at the stern, the way a real hull sits
    const bow = t > 0.64 ? 1 - Math.pow((t - 0.64) / 0.36, 1.5) * 0.86 : 1;
    const stern = t < 0.1 ? 0.8 + t * 2 : 1;
    const b = BEAM * bow * stern;
    const d = LEN / N + 0.12;
    const z = -LEN / 2 + t * LEN;
    s.box(0, -2.5, z, b * 0.86, 2.2, d, sh(P.dark, 2.0)); // below the waterline
    s.box(0, -0.3, z, b, 0.45, d, sh(P.rust, 1.35)); // boot topping
    s.box(0, 0.15, z, b, 1.75, d, sh(P.rust, 1.18)); // topsides
    s.box(0, 1.9, z, b + 0.06, 0.35, d, sh(P.trim, 0.72)); // sheer stripe
  }
  s.box(0, 2.25, 0.4, BEAM - 0.6, 0.35, LEN - 3, sh(P.steel, 0.42)); // main deck
  // bulwarks so the deck reads as a well rather than a table top
  for (const ox of [-1, 1]) s.box((ox * (BEAM - 0.6)) / 2, 2.6, 0.4, 0.4, 0.9, LEN - 3, sh(P.rust, 1.0));

  // container bays, three rows across, gaps left on purpose
  for (let bay = 0; bay < 4; bay++)
    for (let row = -1; row <= 1; row++) {
      if (rnd() < 0.12) continue;
      const z = -3.4 + bay * 2.9;
      const n = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++)
        s.box(row * 2.4, 2.6 + k * 1.5, z, 2.2, 1.45, 2.6, sh(cols[(bay + row + k + 6) % 6], 0.72));
    }

  // superstructure and funnel at the stern
  const sz = -LEN / 2 + 2.4;
  s.box(0, 2.6, sz, BEAM - 1.6, 6.6, 3.4, sh(P.trim, 0.62));
  for (let f = 0; f < 3; f++)
    s.box(0, 4.1 + f * 1.9, sz, BEAM - 1.3, 0.75, 3.6, sh(P.cyan, 1.0), true);
  s.box(0, 9.2, sz, BEAM - 0.4, 1.6, 4.4, sh(P.trim, 0.78)); // bridge deck
  s.box(0, 9.4, sz, BEAM - 1.0, 1.1, 3.8, P.cyan, true); // bridge glazing
  s.box(0, 10.8, sz - 0.4, 3, 3.4, 2.4, sh(P.kerb, 1.5)); // funnel
  s.box(0, 12.4, sz - 0.4, 3.2, 1.0, 2.6, P.mag, true); // funnel band
  s.box(0, 10.8, sz + 1.4, 0.3, 4.4, 0.3, sh(P.trim, 0.8));
  // foremast and a pair of deck cranes
  s.box(0, 2.6, LEN / 2 - 3, 0.4, 5, 0.4, sh(P.trim, 0.7));
  s.box(0, 7.6, LEN / 2 - 3, 0.35, 0.35, 0.35, P.pink, true);
  for (const dz of [-1.2, 4]) {
    s.box(0, 2.6, dz, 0.9, 3.2, 0.9, sh(P.gold, 0.7));
    s.box(0, 5.4, dz + 1.6, 0.55, 0.55, 4.4, sh(P.gold, 0.95));
  }
  const ship = s.merge();

  return {
    ...v.merge(),
    float: { ...ship, x: 27.6, y: WY + 0.35, z: 11, amp: 0.22, roll: 0.022, speed: 0.55 },
    beacons: [
      { x: QX, y: 3.4 + GH, z: gz, c: P.gold },
      { x: 27.6, y: WY + 15, z: 11 - LEN / 2 + 2, c: P.mag },
    ],
  };
}

function buildCampus(L, rnd) {
  const v = new Vox();
  const [cx, cz] = L.at;
  // paved plate and courtyard
  v.box(cx, 0, cz, 22, 0.5, 20, sh(P.kerb, 1.15));
  v.box(cx, 0.5, cz, 13, 0.22, 8, sh(P.purple, 0.5));
  v.box(cx, 0.72, cz, 9, 0.16, 2.6, sh(P.cyan, 0.34));
  // four brick wings around the courtyard
  const WH = 12;
  for (const s of [[-5, -6], [5, -6], [-5, 6], [5, 6]]) {
    const wx = cx + s[0];
    const wz = cz + s[1];
    v.box(wx, 0.5, wz, 9, WH, 5.4, sh(P.brick, 0.82));
    windows(v, wx, wz, 9, 5.4, 0.5, WH, sh(P.gold, 1.05), rnd, 0.5);
    v.box(wx, 0.5 + WH, wz, 9.6, 0.9, 6, sh(P.trim, 0.72));
    v.box(wx, 1.4 + WH, wz, 2.4, 2, 2.4, sh(P.brick, 0.7));
  }
  // the library. In 3D this is simply a cylinder, no faking required.
  const lx = cx - 8.5;
  v.cyl(lx, 0.5, cz, 5.6, 1.2, sh(P.stone, 0.4), 28);
  v.cyl(lx, 1.7, cz, 5, 15, sh(P.stone, 0.74), 28);
  // three ribbons of glazing wrapping the drum
  for (let f = 0; f < 3; f++) {
    const y = 3.6 + f * 4.2;
    v.cyl(lx, y, cz, 5.08, 1.7, sh(P.gold, 0.95), 28, true);
    v.cyl(lx, y + 1.7, cz, 5.12, 0.4, sh(P.stone, 0.44), 28);
  }
  v.cyl(lx, 16.7, cz, 5.9, 0.7, sh(P.roof, 0.7), 28);
  v.cyl(lx, 17.4, cz, 1.6, 1.2, sh(P.roof, 1.0), 16);
  // an avenue of trees down the courtyard, benches and lamps around it
  for (const dz of [-7.5, -2.5, 2.5, 7.5])
    for (const dx of [-0.2, 10.2]) tree(v, cx + dx, 0.5, cz + dz, 0.86, (dz + dx) / 18 + 0.4);
  for (const dz of [-4, 4]) {
    v.box(cx + 4.5, 0.72, cz + dz, 0.35, 0.9, 2.6, sh(P.roof, 0.8));
    v.box(cx + 4.5, 1.6, cz + dz, 1.6, 0.35, 2.6, sh(P.roof, 1.1));
  }
  lamp(v, cx + 1.5, 0.5, cz - 9.2, 1);
  lamp(v, cx + 1.5, 0.5, cz + 9.2, 1);
  return { ...v.merge(), beacons: [{ x: lx, y: 18.8, z: cz, c: P.gold }] };
}

function buildBillboard(L, rnd) {
  const v = new Vox();
  const [cx, cz] = L.at;
  const [w, d] = L.size;
  const H = L.height;
  const base = H * 0.55;
  v.box(cx, 0, cz, w + 1.2, 1, d + 1.2, sh(P.kerb, 1.1));
  v.box(cx, 1, cz, w, base, d, sh(P.purple, 0.58));
  windows(v, cx, cz, w, d, 1, base, sh(P.mag, 1.05), rnd, 0.5);
  // twin legs carrying the screen
  for (const s of [-1, 1]) v.box(cx + s * (w / 2 - 1), 1 + base, cz, 1, H * 0.45, 1, sh(P.kerb, 1.4));
  const sy = 1 + base + H * 0.45;
  const sw = w + 3;
  const shh = 7;
  v.box(cx, sy - 0.6, cz, sw + 0.8, shh + 1.2, 1.2, sh(P.kerb, 1.5));
  // a strip of vending machines and a noodle stall at street level
  for (let i = -1; i <= 1; i++) {
    v.box(cx + i * 1.5, 1, cz + d / 2 + 0.7, 1.2, 2.2, 0.8, sh(P.kerb, 1.6));
    v.box(cx + i * 1.5, 1.7, cz + d / 2 + 1.12, 0.85, 1.2, 0.1, i ? P.cyan : P.pink, true);
  }
  v.box(cx - w / 2 - 2.4, 1, cz + 1.4, 3, 1.8, 2.6, sh(P.rust, 0.9));
  v.box(cx - w / 2 - 2.4, 2.8, cz + 1.4, 3.6, 0.4, 3.2, sh(P.pink, 0.7));
  v.box(cx - w / 2 - 2.4, 3.2, cz + 1.4, 0.6, 1.6, 0.6, sh(P.kerb, 1.6));
  v.box(cx - w / 2 - 2.4, 4.8, cz + 1.4, 1.6, 0.7, 1.6, P.gold, true);
  // the screen is its own mesh so it can flicker
  const screen = new Vox();
  screen.box(0, 0, 0, sw, shh, 0.3, P.mag, true);
  return {
    ...v.merge(),
    screen: { ...screen.merge(), x: cx, y: sy, z: cz + 0.75 },
    beacons: [{ x: cx, y: sy + shh + 1, z: cz, c: P.mag }],
  };
}

function buildMast(L, rnd) {
  const v = new Vox();
  const [cx, cz] = L.at;
  const H = L.height;
  v.box(cx, 0, cz, 6, 1, 6, sh(P.kerb, 1.2));
  v.box(cx, 1, cz, 3.4, 2.6, 3.4, sh(P.cyan, 0.3));
  // four tapering legs with cross bracing
  const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const seg = 6;
  for (let s = 0; s < seg; s++) {
    const y = 3.6 + (s * H) / seg;
    const r = 1.5 * (1 - s / (seg + 2));
    for (const l of legs) v.box(cx + l[0] * r, y, cz + l[1] * r, 0.42, H / seg, 0.42, sh(P.cyan, 0.55));
    v.box(cx, y + H / seg - 0.3, cz, r * 2 + 0.5, 0.3, r * 2 + 0.5, sh(P.cyan, 0.75));
  }
  v.box(cx, 3.6 + H, cz, 0.4, 3, 0.4, sh(P.cyan, 0.8));
  v.box(cx + 1.5, 3.6 + H * 0.55, cz, 2.4, 2.4, 0.5, sh(P.trim, 0.8));
  // the shed at the foot of it, with a rack of blinking kit inside
  v.box(cx - 3.4, 1, cz + 2.4, 3.4, 2.6, 3, sh(P.kerb, 1.5));
  v.box(cx - 3.4, 3.6, cz + 2.4, 3.8, 0.4, 3.4, sh(P.cyan, 0.4));
  for (let i = 0; i < 3; i++) v.box(cx - 3.4, 1.6 + i * 0.7, cz + 3.95, 2.2, 0.3, 0.14, i ? P.green : P.gold, true);
  bush(v, cx + 3.2, 1, cz - 2.6, 1.1, rnd());
  tree(v, cx - 3.6, 1, cz - 2.8, 0.8, rnd());
  return { ...v.merge(), beacons: [{ x: cx, y: 6.6 + H, z: cz, c: P.pink }] };
}

// The park, and the person on the bench. This is the one model in the city
// that is meant to survive being flown right up to, so it is built at a finer
// grain than everything else.
function buildPark(L, rnd) {
  const v = new Vox();
  const [cx, cz] = L.at;
  const [w, d] = L.size;
  const G = 0.6; // grass surface height
  const R = w / 12; // everything below was laid out for a 12 wide park

  // lawn, with a kerb around it and a couple of raised mounds
  v.box(cx, 0, cz, w, G, d, sh(P.green, 0.95));
  v.box(cx, 0, cz, w + 0.8, G - 0.2, d + 0.8, sh(P.kerb, 1.35));
  v.box(cx - 3.6 * R, G, cz - 3.4 * R, 6 * R, 0.3, 5 * R, sh(P.green, 1.15));
  v.box(cx + 3.8 * R, G, cz + 3.6 * R, 5 * R, 0.3, 4.4 * R, sh(P.green, 1.08));

  // a pond in the far corner, with a foam rim and a couple of lily pads
  const px = cx - 4.6 * R;
  const pz = cz - 4.4 * R;
  v.box(px, G - 0.5, pz, 5.6 * R, 0.5, 4.4 * R, sh(P.sea, 1.25));
  v.box(px, G - 0.06, pz, 5.9 * R, 0.12, 4.7 * R, sh(P.foam, 0.5), true);
  v.box(px - 1.4 * R, G - 0.02, pz - 0.7 * R, 1.0, 0.14, 1.0, sh(P.leaf, 0.55));
  v.box(px + 1.6 * R, G - 0.02, pz + 1.0 * R, 0.8, 0.14, 0.8, sh(P.leaf, 0.55));

  // a path curving in from the street to the bench
  const path = [[-4.2, -6], [-3.4, -4], [-2.4, -2], [-1.2, -0.2], [0.2, 1.4], [1.6, 2.6], [2.6, 3.6]];
  for (const [ox, oz] of path)
    v.box(cx + ox * R, G, cz + oz * R, 2.6, 0.16, 2.6, sh(P.stone, 0.62));

  // ---- the bench and the person on it, facing the viewer
  const bx = cx + 2.6 * R;
  const bz = cz + 4.2 * R;
  const SEAT = G + 1.3;
  for (const s of [-2.1, 2.1]) {
    v.box(bx + s, G, bz - 0.2, 0.4, 1.3, 1.7, sh(P.kerb, 1.5));
    v.box(bx + s, G, bz - 0.9, 0.4, 2.7, 0.4, sh(P.kerb, 1.5));
  }
  v.box(bx, SEAT, bz - 0.2, 5.2, 0.32, 1.8, sh(P.roof, 1.15));
  v.box(bx, SEAT + 0.32, bz - 0.95, 5.2, 1.5, 0.34, sh(P.roof, 0.95));
  v.box(bx, SEAT + 1.82, bz - 0.95, 5.4, 0.22, 0.5, sh(P.roof, 1.3));

  const S = SEAT + 0.32; // hip height
  const mx = bx - 0.7;
  const mz = bz - 0.2;
  // legs: thighs forward, shins down, shoes flat on the grass
  v.box(mx, S, mz + 0.62, 1.5, 0.62, 1.7, sh(P.purple, 0.62));
  for (const s of [-0.42, 0.42]) {
    v.box(mx + s, G, mz + 1.42, 0.6, S - G, 0.62, sh(P.purple, 0.5));
    v.box(mx + s, G, mz + 1.72, 0.64, 0.34, 1.05, sh(P.dark, 2.6));
  }
  // torso, with a lighter hoodie hem and a hood bunched at the neck
  v.box(mx, S + 0.62, mz - 0.02, 1.44, 1.72, 1.12, sh(L.color, 0.68));
  v.box(mx, S + 0.62, mz - 0.02, 1.5, 0.34, 1.18, sh(L.color, 0.46));
  v.box(mx, S + 1.96, mz - 0.02, 1.72, 0.44, 1.2, sh(L.color, 0.8));
  v.box(mx, S + 2.0, mz - 0.46, 1.3, 0.5, 0.5, sh(L.color, 0.5));
  // arms bent forward onto the laptop, hands on the keyboard
  for (const s of [-0.86, 0.86]) {
    v.box(mx + s, S + 0.86, mz - 0.02, 0.44, 1.24, 0.62, sh(L.color, 0.56));
    v.box(mx + s, S + 0.86, mz + 0.72, 0.44, 0.44, 1.24, sh(L.color, 0.62));
    v.box(mx + s * 0.82, S + 0.84, mz + 1.3, 0.42, 0.34, 0.42, P.skin);
  }
  // head
  v.box(mx, S + 2.4, mz - 0.02, 0.44, 0.28, 0.44, sh(P.skin, 0.82));
  v.box(mx, S + 2.68, mz - 0.02, 1.02, 1.0, 0.96, P.skin);
  v.box(mx, S + 3.5, mz - 0.02, 1.1, 0.36, 1.04, P.hair);
  v.box(mx, S + 3.0, mz - 0.54, 1.08, 0.62, 0.22, P.hair);
  // sideburns go on the sides of the head, not on the front of it, where they
  // were reading as two black eyes in the wrong place
  for (const s of [-0.5, 0.5]) v.box(mx + s, S + 3.06, mz - 0.06, 0.08, 0.46, 0.5, P.hair);
  // and the actual face, which is what makes this read as a person at fly-in zoom
  for (const s of [-0.22, 0.22]) v.box(mx + s, S + 3.14, mz + 0.45, 0.14, 0.16, 0.06, P.hair);
  v.box(mx, S + 2.9, mz + 0.45, 0.34, 0.08, 0.06, sh(P.brick, 0.8));
  // the laptop. The lid faces away, so the light has to come off the keyboard
  // and the halo behind the lid, which is what actually reads at this size.
  v.box(mx, S + 0.62, mz + 1.02, 1.56, 0.14, 1.12, sh(P.kerb, 1.9));
  v.box(mx, S + 0.72, mz + 1.02, 1.36, 0.06, 0.92, P.cyan, true);
  v.box(mx, S + 0.76, mz + 1.56, 1.62, 1.16, 0.2, sh(P.kerb, 1.6));
  v.box(mx, S + 0.74, mz + 1.7, 1.5, 1.06, 0.06, sh(P.cyan, 0.7), true);
  v.box(mx, S + 1.2, mz + 1.63, 0.3, 0.3, 0.1, P.cyan, true);

  // a coffee cup on the bench, a bag on the grass, a dog keeping watch
  v.box(bx + 1.9, SEAT + 0.32, bz - 0.1, 0.34, 0.44, 0.34, sh(P.trim, 0.9));
  v.box(bx - 3.1, G, bz + 1.1, 1.0, 0.9, 0.7, sh(P.pink, 0.5));
  v.box(bx - 3.1, G + 0.9, bz + 1.1, 0.8, 0.3, 0.6, sh(P.pink, 0.7));
  const dx = bx + 3.4;
  const dz = bz + 2.1;
  v.box(dx, G + 0.42, dz, 1.5, 0.62, 0.66, sh(P.trim, 0.66));
  for (const a of [-0.5, 0.5])
    for (const b of [-0.2, 0.2]) v.box(dx + a, G, dz + b, 0.22, 0.44, 0.22, sh(P.trim, 0.55));
  v.box(dx + 0.86, G + 0.72, dz, 0.56, 0.56, 0.56, sh(P.trim, 0.72));
  v.box(dx + 0.86, G + 1.24, dz, 0.5, 0.22, 0.36, sh(P.roof, 0.9));
  v.box(dx - 0.88, G + 0.9, dz, 0.5, 0.24, 0.24, sh(P.trim, 0.6));

  // planting round the edge, lamps, a picnic table and a low rail on the street
  const ring = [[-5.4, -4.6], [-5.6, 0.4], [-4.6, 5.2], [-1.6, 6.2], [6.4, 6.2], [6.2, -0.6], [4.8, -5], [-0.6, -5.4]];
  ring.forEach((p, i) => {
    const [ox, oz] = [cx + p[0] * R, cz + p[1] * R];
    if (i % 3 === 1) pine(v, ox, G, oz, 0.86 + (i % 2) * 0.12, rnd());
    else tree(v, ox, G, oz, 0.9 + (i % 3) * 0.1, rnd());
  });
  for (const p of [[-2.4, -4.2], [2.6, 3.4], [-4.8, 2.6], [1.4, -4.6], [4.6, -2.2], [-5.4, -1.4]])
    bush(v, cx + p[0] * R, G, cz + p[1] * R, 1, rnd());
  rock(v, cx - 1.2 * R, G, cz + 4.6 * R, 1.1, rnd());
  lamp(v, cx - 4.9 * R, G, cz - 4.9 * R, 1.05);
  lamp(v, cx + 5.1 * R, G, cz + 1.4 * R, 1.05);
  lamp(v, cx + 5.1 * R, G, cz + 5.3 * R, 1.05);
  const tx = cx - 3.4 * R;
  const tz = cz + 2.4 * R;
  v.box(tx, G, tz, 2.6, 0.14, 1.8, sh(P.roof, 1.05));
  v.box(tx, G + 0.14, tz, 2.4, 0.9, 0.24, sh(P.roof, 0.7));
  for (const s of [-0.9, 0.9]) v.box(tx + s, G, tz, 0.24, 0.9, 1.8, sh(P.roof, 0.62));
  for (let x = -w / 2 + 1; x <= w / 2 - 1; x += 2.2) {
    v.box(cx + x, G, cz - d / 2 + 0.2, 0.24, 1.3, 0.24, sh(P.kerb, 1.6));
    v.box(cx + x + 1.1, G + 1.0, cz - d / 2 + 0.2, 2.2, 0.18, 0.16, sh(P.kerb, 1.9));
  }
  return { ...v.merge(), beacons: [] };
}

function buildWheel(L) {
  const v = new Vox();
  const [cx, cz] = L.at;
  const R = 8.2;
  const hubY = R + 3.2;

  // pier deck and the A-frame that carries the hub
  v.box(cx, 0, cz, 13, 1, 5.5, sh(P.kerb, 1.2));
  // The pier stands in the bay now, so it needs legs to stand on.
  for (let x = -5.5; x <= 5.5; x += 2.75)
    for (const oz of [-2, 2]) v.box(cx + x, -3.4, cz + oz, 0.7, 3.5, 0.7, sh(P.bark, 0.7));
  for (const s of [-1, 1]) {
    v.box(cx + s * 3.2, 1, cz, 1.1, hubY - 1, 1.1, sh(P.mag, 0.5));
    v.box(cx + s * 5.4, 1, cz, 0.8, hubY - 5, 0.8, sh(P.mag, 0.4));
  }
  v.box(cx, 1, cz + 1.6, 6, 1.6, 2.4, sh(P.purple, 0.55));
  // a ticket booth and a queue rail, so it is not just a machine on a slab
  v.box(cx - 5.4, 1, cz + 2.8, 2.4, 2.2, 2, sh(P.kerb, 1.5));
  v.box(cx - 5.4, 2.4, cz + 3.85, 1.8, 0.9, 0.14, P.gold, true);
  for (let i = 0; i < 4; i++) v.box(cx - 3.4 + i * 1.6, 1, cz + 3.2, 0.2, 1.1, 0.2, sh(P.kerb, 1.8));

  // The ring rotates, so it is built around its own origin.
  const ring = new Vox();

  // The rim comes first. Without it the cars are just bright cubes hanging in
  // the dark, which is exactly how the first pass read.
  const RIM = 56;
  for (let i = 0; i < RIM; i++) {
    const a = (i / RIM) * Math.PI * 2;
    ring.box(Math.cos(a) * R, Math.sin(a) * R - 0.55, 0, 1.1, 1.1, 1.7, sh(P.mag, 1.0));
  }

  const N = 10;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    // Spokes step along the radius with enough overlap to read as a solid bar
    // rather than the dotted line the coarser step produced.
    for (let t = 0.14; t < 0.97; t += 0.06) {
      ring.box(ux * R * t, uy * R * t - 0.3, 0, 0.62, 0.62, 0.62, sh(P.mag, 0.72));
    }
    ring.box(ux * R, uy * R - 0.75, 0, 1.7, 1.5, 2.6, i % 2 ? P.cyan : P.gold, true);
  }
  ring.box(0, -1.3, 0, 2.6, 2.6, 3, sh(P.mag, 1.05));

  return {
    ...v.merge(),
    spin: { ...ring.merge(), x: cx, y: hubY, z: cz, speed: 0.22, axis: "z" },
    beacons: [],
  };
}

export const BUILDERS = {
  tower: buildTower,
  construction: buildConstruction,
  harbor: buildHarbor,
  campus: buildCampus,
  billboard: buildBillboard,
  mast: buildMast,
  park: buildPark,
  wheel: buildWheel,
};

// ------------------------------------------------------- ground and filler
// None of this is clickable, so the whole lot merges into one pair of meshes.

export function buildGround(rnd) {
  const v = new Vox();
  const E = EXTENT;
  // The plate is laid as strips so its corners can be chamfered. A plain square
  // projects to a diamond with four permanently empty points, which is what the
  // first pass looked like.
  const STEP = 2;
  for (let i = 0; i < (E * 2) / STEP; i++) {
    const z = -E + (i + 0.5) * STEP;
    const cut = Math.max(0, Math.abs(z) - (E - CHAMFER));
    const hw = E - cut;
    if (hw <= 0) continue;
    const sea = z >= WATER.z0 && WATER.x0 < hw ? hw - WATER.x0 : 0;
    // The rock the whole diorama sits on. It has to stop below the grass, not
    // at grade: capped at y = 0 it quietly buried the entire bay.
    if (sea) {
      const lw = hw + WATER.x0 + 1.25;
      v.box((WATER.x0 - hw - 1.25) / 2, -3.4, z, lw, 3.05, STEP + 2.5, sh(P.ground, 1.15));
      // the seabed, a good half metre lower so there is somewhere for the
      // water to sit
      v.box((WATER.x0 + hw) / 2 + 1.25, -3.4, z, sea + 2.5, 2.5, STEP + 2.5, sh(P.ground, 0.8));
      v.box((WATER.x0 - hw) / 2, -0.35, z, hw + WATER.x0, 0.35, STEP, sh(P.grass, 0.95));
      v.box((WATER.x0 + hw) / 2, -0.9, z, sea, 0.4, STEP, sh(P.sea, i % 2 ? 1.0 : 0.86));
      // crests, so the bay reads as water rather than a flat blue rectangle
      for (let k = 0; k < 3; k++) {
        const wx = WATER.x0 + 1.5 + ((k * 3.7 + i * 2.3) % Math.max(1, sea - 3));
        v.box(wx, -0.52, z + (i % 2 ? 0.4 : -0.4), 2.2 + (k % 2), 0.06, 0.45, sh(P.foam, 0.4), true);
      }
      // a sand lip and a foam line where land meets water
      v.box(WATER.x0 - 0.6, -0.34, z, 1.6, 0.36, STEP, sh(P.sand, 0.5));
      v.box(WATER.x0 + 0.45, -0.52, z, 0.7, 0.08, STEP, sh(P.foam, 0.6), true);
    } else {
      v.box(0, -3.4, z, hw * 2 + 2.5, 3.05, STEP + 2.5, sh(P.ground, 1.15));
      v.box(0, -0.35, z, hw * 2, 0.35, STEP, sh(P.grass, 0.95));
    }
  }

  // the north shore of the bay, running east from the end of the main street
  v.box(26.5, -0.34, WATER.z0 - 0.7, 11, 0.36, 1.6, sh(P.sand, 0.5));
  v.box(26.5, -0.52, WATER.z0 + 0.45, 11, 0.08, 0.7, sh(P.foam, 0.6), true);

  for (const r of ROADS) {
    v.box((r[0] + r[2]) / 2, -0.02, (r[1] + r[3]) / 2, r[2] - r[0], 0.34, r[3] - r[1], P.road);
  }
  // lane markings down the two main streets
  for (let t = -E + 2; t < E; t += 4) {
    v.box(t, 0.32, 0, 2, 0.06, 0.34, sh(P.gold, 0.8), true);
    v.box(0, 0.32, t, 0.34, 0.06, 2, sh(P.gold, 0.8), true);
  }
  // street lamps down both kerbs of the main crossroads
  for (let t = -E + 6; t < E - 4; t += 9) {
    if (Math.abs(t) > 5) {
      lamp(v, t, 0, 4.6, 0.95);
      lamp(v, t, 0, -4.6, 0.95);
      lamp(v, 4.6, 0, t, 0.95);
      lamp(v, -4.6, 0, t, 0.95);
    }
  }

  for (const b of FILLER) {
    const [x, z, w, d, h] = b;
    const tint = [P.purple, P.kerb, "#3a2168", "#2d1a52"][Math.floor(rnd() * 4)];
    v.box(x, 0, z, w, h, d, sh(tint, 0.9));
    v.box(x, h, z, w + 0.5, 0.5, d + 0.5, sh(tint, 1.25));
    windows(v, x, z, w, d, 0, h, sh(P.gold, 0.9), rnd, 0.3);
    // rooftop clutter, because a flat lid reads as a placeholder
    if (rnd() < 0.65) v.box(x + w * 0.2, h + 0.5, z - d * 0.2, 1.6, 1.4, 1.6, sh(tint, 1.5));
    if (rnd() < 0.4) {
      v.box(x - w * 0.25, h + 0.5, z + d * 0.2, 0.3, 3.4, 0.3, sh(P.trim, 0.5));
      v.box(x - w * 0.25, h + 3.9, z + d * 0.2, 0.4, 0.4, 0.4, P.pink, true);
    }
  }

  for (const p of PROPS) {
    const fn = PROP_FN[p[0]];
    if (fn) fn(v, p[1], 0, p[2], p[3], p[4]);
  }
  return v.merge();
}
