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

const winDiv = document.getElementById("win");
const hudName = document.getElementById("hud-name");
const hudDifficulty = document.getElementById("hud-difficulty");
const hudDescription = document.getElementById("hud-description");
const hudStars = document.getElementById("hud-stars");
const hudMoves = document.getElementById("hud-moves");

new p5((p) => {
  p.setup = () => {
    p.createCanvas(innerWidth, innerHeight, p.WEBGL);
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
    if (!ready || anim) return;
    dragging = true;
    dragDX = dragDY = 0;
    pickedCube = pickCubeAtMouse(p);
  };

  p.mouseDragged = () => {
    if (dragging) {
      dragDX += p.movedX;
      dragDY += p.movedY;
    }
  };

  p.mouseReleased = () => {
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

    const nx = pickedCube.x + (dir === "east") - (dir === "west");
    const ny = pickedCube.y + (dir === "south") - (dir === "north");
    if (!inside(nx, ny)) return;
    if (occupied(nx, ny, pickedCube)) return;

    const cubeIndex = cubes.indexOf(pickedCube);
    const oppositeDir = { north: "south", south: "north", east: "west", west: "east" }[dir];
    
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
    saveMoveHistory();
    lastCompletionCheck = false; // Reset so completion can be checked after this move
    console.log("Move history:", moveHistory);

    anim = {
      cube: pickedCube,
      dir,
      t0: p.millis(),
      x0: pickedCube.x,
      y0: pickedCube.y,
      x1: nx,
      y1: ny,
      oldO: { ...pickedCube.o },
      newCube: false,
    };
  };

  p.keyPressed = () => {
  };

  p.windowResized = () => p.resizeCanvas(innerWidth, innerHeight);
});
