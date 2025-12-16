function getLevelName() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "tutorial";
  const lastPart = parts[parts.length - 1];
  if (!lastPart || lastPart === "index.html" || lastPart.endsWith(".html")) return "tutorial";
  return lastPart;
}

function saveMoveHistory() {
  const levelName = getLevelName();
  localStorage.setItem(`moveHistory_${levelName}`, JSON.stringify(moveHistory));
}

function loadMoveHistory() {
  const levelName = getLevelName();
  const saved = localStorage.getItem(`moveHistory_${levelName}`);
  return saved ? JSON.parse(saved) : [];
}

function replayMoves(moves) {
  for (const [cubeIndex, direction] of moves) {
    if (cubeIndex >= cubes.length) continue;
    const cube = cubes[cubeIndex];
    const dx = (direction === "east") - (direction === "west");
    const dy = (direction === "south") - (direction === "north");
    cube.x += dx;
    cube.y += dy;
    cube.o = ROLL[direction](cube.o);
  }
}

async function loadLevel() {
  const level = getLevelName();
  if (window.location.pathname === "/") window.history.replaceState(null, "", "./tutorial");
  const baseUrl = window.location.origin + "/";
  const url = new URL(`levels/${level}.json`, baseUrl);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    cubes = data.cubes.map((c) => ({
      x: c.x,
      y: c.y,
      o: { ...c.orientation },
    }));
    goals = data.goals || [];
    nextLevel = data.nextLevel || null;
    moveHistory = loadMoveHistory();
    replayMoves(moveHistory);
    ready = true;
    document.title = "Cube Roll – " + level;
    console.log("Loaded", url.href);
  } catch (e) {
    alert("Failed to load " + url.href);
    console.error(e);
  }
}
