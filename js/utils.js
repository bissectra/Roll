const inside = (x, y) => x >= 0 && x < GRID && y >= 0 && y < GRID;

const occupied = (x, y, ignore = null) =>
  cubes.some((c) => c !== ignore && c.x === x && c.y === y);

const world = (x, y) => {
  const r = (GRID * CELL) / 2;
  return [-r + CELL / 2 + x * CELL, -r + CELL / 2 + y * CELL];
};

const ease = (t) => t * t * (3 - 2 * t);

function rotationAngles(dir, e) {
  const a = (-e * Math.PI) / 2;
  if (dir === "north") return { rx: -a, ry: 0 };
  if (dir === "south") return { rx: a, ry: 0 };
  if (dir === "east") return { rx: 0, ry: -a };
  if (dir === "west") return { rx: 0, ry: a };
  return { rx: 0, ry: 0 };
}

function goalsSatisfied() {
  return goals.every((g) =>
    cubes.some((c) => c.x === g.x && c.y === g.y && c.o.top === g.top)
  );
}

function pickCubeAtMouse(p) {
  const mx = p.mouseX - p.width / 2;
  const my = p.mouseY - p.height / 2;

  let best = null;
  let bestD = PICK_RADIUS;

  for (const c of cubes) {
    const [cx, cy] = world(c.x, c.y);
    const d = Math.hypot(mx - cx, my - cy);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
