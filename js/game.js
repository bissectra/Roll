let cubes = [];
let goals = [];
let anim = null;
let ready = false;
let dragging = false;
let dragDX = 0, dragDY = 0;
let pickedCube = null;
let moveHistory = [];
let lastCompletionCheck = false;
let isCompleted = false;
let wasUndo = false;
let selectedCubeIndex = 0;
let startX = 0, startY = 0;
let lastX = 0, lastY = 0;

const DIR_DELTAS = {
  north: [0, -1],
  south: [0, 1],
  east: [1, 0],
  west: [-1, 0],
};

const OPPOSITE_DIR = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};

const winDiv = document.getElementById("win");
const hudMoves = document.getElementById("hud-moves");
const levelInfoBtn = document.getElementById("level-info");
const hudDescBottom = document.getElementById("hud-desc-bottom");

function beginInteraction(p) {
  if (!ready || anim) return;
  dragging = true;
  dragDX = dragDY = 0;

  const touch = (p.touches && p.touches[0]) || null;
  const x = touch ? touch.x : p.mouseX;
  const y = touch ? touch.y : p.mouseY;
  startX = lastX = x;
  startY = lastY = y;

  // Temporarily override mouse coords so pick works for touch too
  const prevMouseX = p.mouseX;
  const prevMouseY = p.mouseY;
  p.mouseX = x;
  p.mouseY = y;
  pickedCube = pickCubeAtMouse(p);
  p.mouseX = prevMouseX;
  p.mouseY = prevMouseY;

  if (pickedCube) setSelectedCube(pickedCube);
}

function updateInteraction(p) {
  if (dragging) {
    const touch = (p.touches && p.touches[0]) || null;
    const x = touch ? touch.x : p.mouseX;
    const y = touch ? touch.y : p.mouseY;
    dragDX = x - startX;
    dragDY = y - startY;
    lastX = x;
    lastY = y;
  }
}

function endInteraction(p) {
  dragging = false;
  if (!ready || anim || !pickedCube) return;
  if (Math.hypot(dragDX, dragDY) < DRAG_THRESHOLD) return;

  const dir =
    Math.abs(dragDX) > Math.abs(dragDY)
      ? dragDX > 0
        ? "east"
        : "west"
      : dragDY > 0
      ? "south"
      : "north";

  const cubeIndex = cubes.indexOf(pickedCube);
  queueMove(cubeIndex, dir, p, { recordHistory: true });
}

function setSelectedCubeFromIndex(idx) {
  if (!Array.isArray(cubes) || !cubes.length) return;
  if (idx == null || Number.isNaN(idx)) idx = 0;
  if (idx < 0) idx = 0;
  if (idx >= cubes.length) idx = cubes.length - 1;
  selectedCubeIndex = idx;
}

function setSelectedCube(cube) {
  const idx = cubes.indexOf(cube);
  if (idx !== -1) setSelectedCubeFromIndex(idx);
}

function queueMove(cubeIndex, dir, p, { recordHistory = true } = {}) {
  if (!ready || anim) return false;
  const cube = cubes[cubeIndex];
  if (!cube) return false;
  const delta = DIR_DELTAS[dir];
  if (!delta) return false;

  const nx = cube.x + delta[0];
  const ny = cube.y + delta[1];
  if (!inside(nx, ny)) return false;
  if (occupied(nx, ny, cube)) return false;

  if (recordHistory) {
    const oppositeDir = OPPOSITE_DIR[dir];
    if (moveHistory.length > 0) {
      const lastMove = moveHistory[moveHistory.length - 1];
      if (lastMove[0] === cubeIndex && lastMove[1] === oppositeDir) {
        moveHistory.pop();
        wasUndo = true;
      } else {
        moveHistory.push([cubeIndex, dir]);
        wasUndo = false;
      }
    } else {
      moveHistory.push([cubeIndex, dir]);
      wasUndo = false;
    }
  } else {
    wasUndo = true;
  }

  saveMoveHistory();
  lastCompletionCheck = false;

  anim = {
    cube,
    dir,
    t0: p.millis(),
    x0: cube.x,
    y0: cube.y,
    x1: nx,
    y1: ny,
    oldO: { ...cube.o },
    newCube: false,
  };
  return true;
}

function undoLastMove(p) {
  if (!moveHistory.length || anim) return false;
  const [cubeIndex, dir] = moveHistory.pop();
  const undoDir = OPPOSITE_DIR[dir];
  if (!undoDir) return false;
  saveMoveHistory();
  return queueMove(cubeIndex, undoDir, p, { recordHistory: false });
}

new p5((p) => {
  p.setup = () => {
    p.createCanvas(innerWidth, innerHeight, p.WEBGL);
    if (p.canvas) {
      p.canvas.style.touchAction = "none"; // prevent browser scroll on swipe
    }
    loadLevel();
  };

  p.draw = () => {
    if (!ready) return;
    p.background(20);
    const r = (GRID * CELL) / 2;
    p.stroke(150);
    p.noFill();
    for (let i = 0; i <= GRID; i++) {
      const t = -r + i * CELL;
      p.line(t, -r, 0, t, r, 0);
      p.line(-r, t, 0, r, t, 0);
    }
    goals.forEach((g) => drawGoal(p, g));

    // Highlight selected cube
    if (cubes[selectedCubeIndex]) {
      const c = cubes[selectedCubeIndex];
      const [hx, hy] = world(c.x, c.y);
      p.push();
      p.translate(hx, hy, 2);
      p.noFill();
      p.stroke(250, 200, 50, 180);
      p.strokeWeight(3);
      p.circle(0, 0, CELL * 0.55);
      p.pop();
    }

    cubes.forEach((c) => {
      if (anim && anim.cube === c && !anim.newCube) return;
      const [cx, cy] = world(c.x, c.y);
      p.push();
      p.translate(cx, cy, CUBE / 2);
      drawCube(p, c.o);
      p.pop();
    });
    if (anim) {
      const raw = Math.min((p.millis() - anim.t0) / ANIM_MS, 1);
      const e = ease(raw);
      const x = p.lerp(anim.x0, anim.x1, e);
      const y = p.lerp(anim.y0, anim.y1, e);
      const ang = rotationAngles(anim.dir, e);
      const [cx, cy] = world(x, y);
      p.push();
      p.translate(cx, cy, CUBE / 2);
      if (ang.rx) p.rotateX(ang.rx);
      if (ang.ry) p.rotateY(ang.ry);
      drawCube(p, anim.oldO);
      p.pop();
      if (raw >= 0.95 && !anim.newCube) {
        anim.cube.x = anim.x1;
        anim.cube.y = anim.y1;
        anim.cube.o = ROLL[anim.dir](anim.oldO);
        anim.newCube = true;
        // Check completion after move settles
        isCompleted = goalsSatisfied();
      }
      if (raw >= 1) anim = null;
    }
    winDiv.style.opacity = isCompleted ? "1" : "0";

    // Update HUD
    hudMoves.textContent = moveHistory.length;

    // Save completion only on state transition and not after an undo
    if (isCompleted && !lastCompletionCheck && !wasUndo) {
      try {
        const levelName = getLevelName ? getLevelName() : null;
        if (levelName) {
          let prev = null;
          try {
            const raw = localStorage.getItem(`completed_${levelName}`);
            prev = raw ? JSON.parse(raw) : null;
          } catch (_) {
            prev = null;
          }
          const currentLen = Array.isArray(moveHistory) ? moveHistory.length : Number.POSITIVE_INFINITY;
          const prevLen = prev && Array.isArray(prev.moveHistory) ? prev.moveHistory.length : Number.POSITIVE_INFINITY;
          if (!prev || currentLen < prevLen) {
            const record = { completedAt: Date.now(), moveHistory: Array.isArray(moveHistory) ? [...moveHistory] : [] };
            localStorage.setItem(`completed_${levelName}`, JSON.stringify(record));
          }
        }
      } catch (e) {
        console.warn("Failed to record completion status", e);
      }
    }
    lastCompletionCheck = isCompleted;
  };

  p.mousePressed = () => {
    beginInteraction(p);
  };

  p.mouseDragged = () => {
    updateInteraction(p);
  };

  p.mouseReleased = () => {
    endInteraction(p);
  };

  // Touch events mapped to the same handlers for mobile
  // Allow default behavior (no preventDefault) when interacting with nav/buttons
  p.touchStarted = (e) => {
    if (e && e.target && (e.target.closest && e.target.closest('#nav'))) {
      return true; // let the button handle the tap
    }
    beginInteraction(p);
    return false; // prevent default scrolling/zoom on canvas gestures
  };

  p.touchMoved = (e) => {
    if (e && e.target && (e.target.closest && e.target.closest('#nav'))) {
      return true;
    }
    updateInteraction(p);
    return false;
  };

  p.touchEnded = (e) => {
    if (e && e.target && (e.target.closest && e.target.closest('#nav'))) {
      return true;
    }
    endInteraction(p);
    return false;
  };

  p.keyPressed = () => {
  };

  p.windowResized = () => p.resizeCanvas(innerWidth, innerHeight);
});
