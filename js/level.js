function getBaseInfo() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  const levelIdx = segments.indexOf("level");
  const baseSegments = levelIdx === -1 ? (segments.length > 0 ? [segments[0]] : []) : segments.slice(0, levelIdx);
  const basePath = baseSegments.join("/");
  const baseUrl = basePath ? `${window.location.origin}/${basePath}/` : `${window.location.origin}/`;
  return { segments, levelIdx, basePath, baseUrl };
}

function getLevelName() {
  const { segments, levelIdx } = getBaseInfo();
  if (segments.length === 0) return "tutorial";
  if (levelIdx !== -1) {
    const candidate = segments[levelIdx + 1];
    return candidate || "tutorial";
  }
  // When served from a subpath like /Roll/, a lone segment is just the repo name => tutorial
  if (segments.length === 1) return "tutorial";
  const lastPart = segments[segments.length - 1];
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
  const { baseUrl, basePath } = getBaseInfo();
  const level = getLevelName();
  
  // Check if reset parameter is present
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('reset')) {
    localStorage.removeItem(`moveHistory_${level}`);
    // Remove reset param from URL without reload
    const cleanUrl = window.location.pathname;
    window.history.replaceState(null, "", cleanUrl);
  }
  
  // Redirect base paths to /level/tutorial for consistency
  const path = window.location.pathname;
  const baseCandidates = ["/"];
  if (basePath) {
    baseCandidates.push(`/${basePath}`, `/${basePath}/`);
  }
  if (baseCandidates.includes(path)) {
    window.location.replace(`${baseUrl}level/tutorial`);
    return;
  }

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
    if (typeof setSelectedCubeFromIndex === "function") {
      setSelectedCubeFromIndex(0);
    }
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
