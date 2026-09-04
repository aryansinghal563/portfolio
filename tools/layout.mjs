// Audits the voxel city layout.
//
//   node tools/layout.mjs
//
// This used to generate the filler and tree lists and print them for pasting
// back into js/city-data.js. It does not any more: the scatter moved into
// city-data.js itself, where it enumerates the free cells of the plate once,
// shuffles them with a fixed seed and walks them. So all that is left to do
// here is check the hand-placed part, the eleven landmarks, which is the part
// a human still edits and therefore the part that still breaks.
//
// Checks, in order of how often each one has actually caught something:
//   - every landmark corner sits on the chamfered plate
//   - no landmark sits in the water, the harbour and the pier excepted
//   - no landmark straddles a road
//   - no two landmarks overlap
//   - nothing tall stands in front of something shorter
//
// That last one is the one worth explaining. The camera is a true isometric
// orthographic, so screen-x is proportional to (x - z) and distance toward the
// viewer is proportional to (x + z). A landmark with a larger x + z is nearer
// and will occlude anything behind it in the same screen column. The first pass
// at this layout put the harbour on the far edge and the whole ship disappeared
// behind the two tallest towers, which is a mistake that costs an afternoon and
// takes four lines to detect.
import { LANDMARKS, ROADS, WATER, onPlate, inWater } from "../js/city-data.js";

const screenY = (y, depth) => (y * Math.SQRT2 - depth / Math.SQRT2) / Math.sqrt(3);

const rect = (L) => ({
  id: L.id,
  x0: L.at[0] - L.size[0] / 2,
  x1: L.at[0] + L.size[0] / 2,
  z0: L.at[1] - L.size[1] / 2,
  z1: L.at[1] + L.size[1] / 2,
  h: L.height,
  depth: L.at[0] + L.at[1],
  sx: (L.at[0] - L.at[1]) / Math.SQRT2,
  sw: (L.size[0] + L.size[1]) / 2 / Math.SQRT2, // half width on screen
  // Screen height, which is NOT the same as the model height. The elevation is
  // atan(1 / sqrt 2), so a point at (x, y, z) lands at
  //   (y * sqrt2 - (x + z) / sqrt2) / sqrt3
  // and something far up the plate is lifted a long way up the frame purely by
  // being far away. Comparing raw heights instead reported the harbour as
  // hiding a tower that renders forty units above it.
  y0: screenY(0, L.at[0] + L.at[1] + (L.size[0] + L.size[1]) / 2),
  y1: screenY(L.height, L.at[0] + L.at[1] - (L.size[0] + L.size[1]) / 2),
});

// The harbour is a quay and a berth, the pier wheel stands on pilings. Both are
// meant to be in the water.
const AMPHIBIOUS = new Set(["harbor", "wheel"]);

const rs = LANDMARKS.map(rect);
const bad = [];

for (let i = 0; i < rs.length; i++) {
  const a = rs[i];
  for (const [x, z] of [
    [a.x0, a.z0],
    [a.x1, a.z0],
    [a.x0, a.z1],
    [a.x1, a.z1],
  ]) {
    if (!onPlate(x, z)) bad.push(`OFF PLATE  ${a.id} corner ${x},${z}`);
    if (!AMPHIBIOUS.has(a.id) && inWater(x, z)) bad.push(`IN WATER   ${a.id} corner ${x},${z}`);
  }
  for (const r of ROADS)
    if (a.x0 < r[2] && a.x1 > r[0] && a.z0 < r[3] && a.z1 > r[1])
      bad.push(`ON ROAD    ${a.id} crosses [${r}]`);
  for (let j = i + 1; j < rs.length; j++) {
    const b = rs[j];
    if (Math.min(a.x1, b.x1) > Math.max(a.x0, b.x0) && Math.min(a.z1, b.z1) > Math.max(a.z0, b.z0))
      bad.push(`OVERLAP    ${a.id} x ${b.id}`);
  }
}

// Occlusion. Partial occlusion is what a city looks like and is not a fault, so
// this only complains when a nearer landmark swallows a farther one whole: it
// covers the farther one's full screen column AND its full screen height. That
// is the case that actually shipped once, with the whole cargo ship behind two
// towers.
for (const a of rs)
  for (const b of rs) {
    if (a === b || a.depth <= b.depth) continue;
    const coversX = a.sx - a.sw <= b.sx - b.sw && a.sx + a.sw >= b.sx + b.sw;
    const coversY = a.y0 <= b.y0 && a.y1 >= b.y1;
    if (coversX && coversY) bad.push(`BURIES     ${a.id} completely hides ${b.id}`);
  }

console.log(`water: x >= ${WATER.x0}, z >= ${WATER.z0}\n`);
console.log("id         at            size      h   depth   screen-x");
for (const L of LANDMARKS) {
  const r = rect(L);
  console.log(
    L.id.padEnd(10) +
      `[${L.at}]`.padEnd(14) +
      `${L.size[0]}x${L.size[1]}`.padEnd(10) +
      String(L.height).padStart(2) +
      String(r.depth).padStart(8) +
      r.sx.toFixed(1).padStart(11),
  );
}

console.log("");
if (bad.length) {
  for (const b of bad) console.log(b);
  process.exitCode = 1;
} else {
  console.log(`CLEAN: ${rs.length} landmarks, no plate, water, road, overlap or burial faults.`);
}
