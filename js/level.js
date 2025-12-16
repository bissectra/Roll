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
    moveHistory = loadMoveHistory();
    replayMoves(moveHistory);
    ready = true;
    document.title = "Cube Roll – " + level;
    
    // Update HUD with level metadata
    const hudName = document.getElementById("hud-name");
    const hudDifficulty = document.getElementById("hud-difficulty");
    const hudDescription = document.getElementById("hud-description");
    const hudStars = document.getElementById("hud-stars");
    
    if (hudName) hudName.textContent = data.name || level;
    if (hudDifficulty) hudDifficulty.textContent = data.difficulty || "–";
    if (hudDescription) hudDescription.textContent = data.description || "–";
    
    // Update stars thresholds in HUD
    if (hudStars && data.stars) {
      const t1 = data.stars.one ?? "–";
      const t2 = data.stars.two ?? "–";
      const t3 = data.stars.three ?? "–";
      hudStars.textContent = `★: ${t1} • ${t2} • ${t3}`;
    }
    
    console.log("Loaded", url.href);
  } catch (e) {
    alert("Failed to load " + url.href);
    console.error(e);
  }
}

// Clear move history for current level and reload level from JSON
function resetMoves() {
  try {
    const levelName = getLevelName();
    localStorage.removeItem(`moveHistory_${levelName}`);
    moveHistory = [];
    anim = null;
    ready = false;
    loadLevel();
  } catch (e) {
    console.error("Failed to reset moves", e);
  }
}

// expose globally for UI bindings
window.resetMoves = resetMoves;
