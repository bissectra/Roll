function getLevelName() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "tutorial";
  const lastPart = parts[parts.length - 1];
  if (!lastPart || lastPart === "index.html" || lastPart.endsWith(".html")) return "tutorial";
  return lastPart;
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
    moveHistory = [];
    ready = true;
    document.title = "Cube Roll – " + level;
    console.log("Loaded", url.href);
  } catch (e) {
    alert("Failed to load " + url.href);
    console.error(e);
  }
}
