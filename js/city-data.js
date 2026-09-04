// Content and layout for the voxel city.
// Pure data: no three.js in here. js/city-voxels.js turns this into geometry.
//
// Coordinates are voxel cells on a flat grid. +x runs east, +z runs south,
// y is up. The origin is the middle of the central crossroads. Heights are in
// cells, where one storey is 3 cells.

export const P = {
  pink: "#ff2a6d",
  cyan: "#05d9e8",
  gold: "#f8b800",
  purple: "#9d4edd",
  mag: "#ff6ac1",
  green: "#18c17c",
  // A second and third green so a hundred trees do not read as one flat mass.
  leaf: "#2ee08c",
  pine: "#0e8f5c",
  bark: "#5d3a28",
  brick: "#9c4a37",
  stone: "#c6a878",
  trim: "#cfc3ad",
  roof: "#6f4a35",
  road: "#1b0d3d",
  kerb: "#2a1458",
  ground: "#2c1259",
  grass: "#432291",
  sea: "#1f6ec4",
  foam: "#4ad9ff",
  sand: "#8a7a52",
  steel: "#8e97b5",
  rust: "#8c3a2e",
  dark: "#0d0221",
  skin: "#e8b58a",
  hair: "#1a1a2e",
};

// Half-extent of the ground plate. The city lives inside +/- EXTENT.
export const EXTENT = 32;

// The plate is a square with its four corners cut off. Viewed isometrically a
// square reads as a diamond whose four points are always empty, and those dead
// triangles were most of what the eye saw around the city.
export const CHAMFER = 8;
// A point is on the plate when it is inside the square AND inside the cut.
export const onPlate = (x, z) =>
  Math.abs(x) <= EXTENT && Math.abs(z) <= EXTENT && Math.abs(x) + Math.abs(z) <= 2 * EXTENT - CHAMFER;

// The harbour, cut out of the near corner of the plate. Seen from the
// isometric camera the far half of the city is behind the towers, so water put
// up there is water nobody ever sees: the first pass hid the whole ship behind
// the two tallest blocks. This corner is the closest thing to the viewer, so
// nothing can occlude it.
export const WATER = { x0: 21, z0: -8, y: -0.55 };
export const inWater = (x, z) => x >= WATER.x0 && z >= WATER.z0 && onPlate(x, z);

// Main crossroads. Each entry is an axis aligned strip: [x0, z0, x1, z1].
// The east arm stops at the waterfront instead of running into the sea.
export const ROADS = [
  [-EXTENT, -4, 17, 4],
  // The south arm dead ends at the park gate. Running it to the plate edge cost
  // the park nine cells of width, and a 12x12 park is all props and no lawn.
  [-4, -EXTENT, 4, 12],
];

// The eleven things worth clicking. `kind` picks the builder in city-voxels.js,
// `at` is the footprint centre, `size` is [width, depth] in cells. `short` is
// the label used once the stage is too narrow for the full name.
export const LANDMARKS = [
  {
    id: "judge",
    kind: "tower",
    at: [-12, -12],
    size: [9, 9],
    height: 30,
    color: P.pink,
    label: "JUDGE.EXE",
    short: "JUDGE",
    kick: "PROJECT",
    title: "Code Judge Engine",
    body: "One Docker container per submission. AC / WA / TLE / MLE verdicts, RabbitMQ keeps the queue moving.",
    stack: "Node.js · Docker · RabbitMQ · Prisma",
    url: "https://github.com/aryansinghal563",
  },
  {
    id: "dock",
    kind: "tower",
    at: [-24, -10],
    size: [8, 8],
    height: 22,
    color: P.cyan,
    label: "DOCK.EXE",
    short: "DOCK",
    kick: "PROJECT",
    title: "Vivaldi Media Dock",
    body: "Artwork aware mini media player living inside Vivaldi's vertical tab bar. Playback, theming and audio reactive visuals.",
    stack: "JavaScript · Web Audio",
    url: "https://github.com/aryansinghal563/vivaldi-media-player",
  },
  {
    id: "wip",
    kind: "construction",
    at: [-13, -24],
    size: [9, 8],
    height: 16,
    color: P.gold,
    label: "WIP",
    short: "WIP",
    kick: "UNDER CONSTRUCTION",
    title: "Work In Progress",
    body: "Whatever I am building right now lives on this lot. The crane never really stops turning.",
    stack: "Always something",
  },
  {
    id: "lk",
    kind: "tower",
    at: [11, -11],
    size: [9, 9],
    height: 34,
    color: P.gold,
    label: "LK / SCHNEIDER",
    short: "LK",
    kick: "INTERNSHIP · JUN—JUL 2026",
    title: "Lauritz Knudsen",
    body: "Built a web based testing workflow portal for the Switchgear Testing Laboratories.",
    stack: "Schneider Electric India",
  },
  {
    id: "neuro",
    kind: "tower",
    at: [24, -14],
    size: [8, 8],
    height: 26,
    color: P.mag,
    label: "NEUROBINARIES",
    short: "NEURO",
    kick: "INTERNSHIP · JUN—JUL 2026",
    title: "NeuroBinaries",
    body: "Design and architecture of an e-commerce backend system, from core components to technical design.",
    stack: "Backend architecture",
  },
  {
    id: "harbor",
    kind: "harbor",
    at: [23.5, 11],
    size: [13, 22],
    height: 20,
    color: P.gold,
    pin: [27.6, 15, 11],
    pinR: 9.5,
    label: "SHIPPING DOCK",
    short: "SHIP IT",
    kick: "THE HARBOR",
    title: "Shipping Dock",
    body: "Where finished work leaves the city. Containers stacked, queue moving, nothing sitting still for long.",
    stack: "Ship it",
  },
  {
    id: "campus",
    kind: "campus",
    at: [-17, 15],
    size: [22, 20],
    height: 15,
    color: P.gold,
    label: "MAIT",
    short: "MAIT",
    kick: "EDUCATION",
    title: "MAIT Campus",
    body: "B.Tech in Computer Science, class of 2028. Maharaja Agrasen Institute of Technology, Delhi.",
    stack: "New Delhi",
  },
  {
    id: "anime",
    kind: "billboard",
    at: [9, 8],
    size: [7, 5],
    height: 24,
    color: P.mag,
    label: "ANIME DISTRICT",
    short: "ANIME",
    kick: "OFF THE CLOCK",
    title: "Anime District",
    body: "The tallest screen in the city and it never turns off. Currently showing whatever I am three episodes behind on.",
    stack: "Anime · Manga · Too many tabs",
  },
  {
    id: "homelab",
    kind: "mast",
    at: [13, -24],
    size: [6, 6],
    height: 36,
    color: P.cyan,
    label: "SIGNAL TOWER",
    short: "SIGNAL",
    kick: "HOMELAB",
    title: "Signal Tower",
    body: "Self hosted everything. Docker, containers and a pile of services nobody asked for, broadcasting from the park.",
    stack: "Linux · Docker · Azure",
  },
  {
    id: "bench",
    kind: "park",
    at: [6, 21],
    size: [18, 18],
    height: 8,
    color: P.green,
    pin: [9.2, 6.2, 27.1],
    pinR: 6,
    label: "THAT IS ME",
    short: "THAT IS ME",
    kick: "THE PERSON ON THE BENCH",
    title: "That is me",
    body: "Books, anime, music and a laptop that is always doing something. The homelab hums two blocks down.",
    stack: "CSE '28 · New Delhi",
  },
  {
    id: "wheel",
    kind: "wheel",
    at: [26, -5],
    size: [11, 6],
    height: 24,
    color: P.mag,
    label: "PIER WHEEL",
    short: "WHEEL",
    kick: "THE WATERFRONT",
    title: "Pier Wheel",
    body: "Every city needs one thing that exists purely because it looks good at night.",
    stack: "Music · Long walks · Zero deadlines",
  },
];

// ------------------------------------------------------------- scatter
// Filler blocks and props used to be hand listed, which meant every change to
// the plate size started a round of manual collision fixing. They are generated
// here instead, from a fixed seed. Same numbers on every load, no overlaps by
// construction.
//
// Rejection sampling over the whole square wastes almost every try, because
// after the landmarks, the roads and the bay only about a fifth of the plate is
// actually free. So the free cells are listed once, shuffled, and walked.

const lcg = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const rnd = lcg(20260904);

// Every rectangle something already occupies, in world cells.
const taken = [];
const claim = (cx, cz, w, d, pad) =>
  taken.push({ x0: cx - w / 2 - pad, z0: cz - d / 2 - pad, x1: cx + w / 2 + pad, z1: cz + d / 2 + pad });

for (const L of LANDMARKS) claim(L.at[0], L.at[1], L.size[0], L.size[1], 0.9);
for (const r of ROADS) taken.push({ x0: r[0] - 0.5, z0: r[1] - 0.5, x1: r[2] + 0.5, z1: r[3] + 0.5 });
// The bay, plus a metre of shoreline nothing should stand on.
taken.push({ x0: WATER.x0 - 1.4, z0: WATER.z0 - 1.4, x1: EXTENT + 4, z1: EXTENT + 4 });

const free = (cx, cz, w, d, pad) => {
  const x0 = cx - w / 2 - pad;
  const x1 = cx + w / 2 + pad;
  const z0 = cz - d / 2 - pad;
  const z1 = cz + d / 2 + pad;
  // Every corner has to clear the chamfer, not just the square edge.
  if (!onPlate(x0, z0) || !onPlate(x1, z0) || !onPlate(x0, z1) || !onPlate(x1, z1)) return false;
  for (const t of taken) if (x0 < t.x1 && x1 > t.x0 && z0 < t.z1 && z1 > t.z0) return false;
  return true;
};

// Candidate centres: every half-cell on the plate that is not already inside a
// landmark, a road or the water, shuffled once.
const CELLS = [];
for (let x = -EXTENT + 1.5; x <= EXTENT - 1.5; x += 1) {
  for (let z = -EXTENT + 1.5; z <= EXTENT - 1.5; z += 1) {
    if (free(x, z, 0, 0, 0)) CELLS.push([x, z]);
  }
}
for (let i = CELLS.length - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1));
  const t = CELLS[i];
  CELLS[i] = CELLS[j];
  CELLS[j] = t;
}

// Walk the shuffled cells once, placing whatever still fits.
const sow = (want, size, pad, make) => {
  let made = 0;
  for (const c of CELLS) {
    if (made >= want) break;
    const s = size(rnd());
    if (!free(c[0], c[1], s, s, pad)) continue;
    make(c[0], c[1], s);
    claim(c[0], c[1], s, s, pad * 0.5);
    made++;
  }
  return made;
};

// Everything small: [kind, x, z, scale, seed].
export const PROPS = [];
const put = (kind, x, z, s, w, pad) => {
  if (!free(x, z, w, w, pad)) return false;
  PROPS.push([kind, x, z, s, rnd()]);
  claim(x, z, w, w, pad * 0.5);
  return true;
};

// Avenues first. The verge between the kerb and the first building is the one
// strip the sampler never reaches, and a row of trees down the main streets
// does more for the place feeling lived in than anything scattered.
const VERGE = 6.1;
for (let t = -EXTENT + 4; t < EXTENT - 3; t += 5.5) {
  if (Math.abs(t) < 9) continue;
  for (const s of [-1, 1]) {
    put("tree", t, s * VERGE, 0.78 + rnd() * 0.2, 2.2, 0.1);
    put("tree", s * VERGE, t, 0.78 + rnd() * 0.2, 2.2, 0.1);
  }
}

// Unremarkable blocks that give the landmarks a skyline to sit in.
// [x, z, width, depth, height]
export const FILLER = [];
sow(
  26,
  // Narrow blocks as well as square ones: most of what is left between the
  // landmarks and the kerb is a strip about three cells wide.
  () => 2 + Math.floor(rnd() * 4),
  0.5,
  (x, z, s) => {
    const d = Math.max(3, s - Math.floor(rnd() * 2));
    // Tall blocks belong downtown, low ones out by the edge, so the skyline
    // slopes toward the middle instead of being uniform noise.
    const near = 1 - Math.min(1, Math.hypot(x, z) / EXTENT);
    FILLER.push([x, z, s, d, Math.round(4 + near * 16 + rnd() * 6)]);
  },
);

// Then the planting. A tree's footprint here is deliberately smaller than its
// canopy, so neighbouring crowns interlock the way they do in the reference art.
const prop = (kind) => (x, z, s) => PROPS.push([kind, x, z, s, rnd()]);
sow(80, () => 1.8 + rnd() * 0.6, 0.12, (x, z) => {
  PROPS.push([rnd() < 0.74 ? "tree" : "pine", x, z, 0.74 + rnd() * 0.5, rnd()]);
});
sow(26, () => 1.2, 0.15, prop("bush"));
sow(14, () => 1.1, 0.2, prop("rock"));
sow(16, () => 1.0, 0.25, prop("lamp"));
sow(14, () => 1.3, 0.2, prop("crate"));
sow(12, () => 0.8, 0.2, prop("hydrant"));

// Cars sit on the tarmac, so they are placed along the lanes rather than
// scattered. Two lanes each way on both main streets.
export const CARS = [];
for (let t = -EXTENT + 5; t < EXTENT - 4; t += 4) {
  if (rnd() < 0.5) CARS.push(["x", t, rnd() < 0.5 ? -2.1 : 2.1, rnd()]);
  if (Math.abs(t) > 6 && rnd() < 0.5) CARS.push(["z", rnd() < 0.5 ? -2.1 : 2.1, t, rnd()]);
}
