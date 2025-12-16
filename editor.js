const GRID = 5;
const CELL = 80;
const CUBE = CELL * 0.85;

let COLORS = {};
let cubes = [];
let goals = [];
let currentFace = "top";
let selectedColor = "yellow";

async function loadColors() {
  try {
    const res = await fetch("./colors.json");
    COLORS = await res.json();
    initializeUI();
  } catch (e) {
    console.error("Failed to load colors", e);
    alert("Failed to load colors.json");
  }
}

function initializeUI() {
  let colorNames = Object.keys(COLORS);
  colorNames.sort();
  const noneIndex = colorNames.indexOf("none");
  if (noneIndex > -1) {
    colorNames.splice(noneIndex, 1);
    colorNames.unshift("none");
  }

  // Setup color palette
  const colorPalette = document.getElementById("color-palette");
  colorNames.forEach((colorName) => {
    const btn = document.createElement("button");
    btn.className = "color-btn";
    if (colorName === "yellow") btn.classList.add("selected");
    if (colorName === "none") btn.classList.add("none");
    
    if (colorName !== "none") {
      const [r, g, b] = COLORS[colorName];
      btn.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
      btn.style.color = r + g + b > 382 ? "#000" : "#fff";
    }
    btn.textContent = colorName;

    btn.onclick = () => {
      document.querySelectorAll(".color-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedColor = colorName;
      document.getElementById("color-status").textContent = `Selected: ${colorName}`;
    };

    colorPalette.appendChild(btn);
  });

  // Setup tabs
  document.querySelectorAll(".tab-btn").forEach((tab) => {
    tab.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentFace = tab.dataset.face;
    };
  });

  // Setup export/import
  document.getElementById("export-btn").onclick = exportJSON;
  document.getElementById("import-btn").onclick = importJSON;
  document.getElementById("save-btn").onclick = downloadJSON;
  document.getElementById("next-level").addEventListener("change", updateJSON);

  updateJSON();
}

function updateJSON() {
  const nextLevel = document.getElementById("next-level").value || null;
  const data = { cubes, goals };
  if (nextLevel) data.nextLevel = nextLevel;
  document.getElementById("json-output").textContent = JSON.stringify(data, null, 2);
  updateValidationStatus();
}

function updateValidationStatus() {
  const validationEl = document.getElementById("validation-status");
  const isValid = cubes.length > 0 && cubes.length === goals.length;
  
  if (isValid) {
    validationEl.textContent = `✓ Valid: ${cubes.length} cube${cubes.length !== 1 ? 's' : ''} & goal${goals.length !== 1 ? 's' : ''}`;
    validationEl.style.color = "#60dc8c";
  } else {
    const errors = [];
    if (cubes.length === 0) errors.push("no cubes");
    if (goals.length === 0) errors.push("no goals");
    if (cubes.length !== goals.length) errors.push(`${cubes.length} cube${cubes.length !== 1 ? 's' : ''} ≠ ${goals.length} goal${goals.length !== 1 ? 's' : ''}`);
    validationEl.textContent = `✗ Invalid: ${errors.join(", ")}`;
    validationEl.style.color = "#f85149";
  }
}

function exportJSON() {
  if (cubes.length === 0 || goals.length === 0 || cubes.length !== goals.length) {
    alert("Invalid level: cubes and goals must both have the same positive length.");
    return;
  }
  const text = document.getElementById("json-output").textContent;
  navigator.clipboard.writeText(text).then(() => {
    alert("JSON copied to clipboard!");
  });
}

function importJSON() {
  const json = prompt("Paste JSON:");
  if (!json) return;
  try {
    const data = JSON.parse(json);
    cubes = data.cubes || [];
    goals = data.goals || [];
    document.getElementById("next-level").value = data.nextLevel || "";
    updateJSON();
  } catch (e) {
    alert("Invalid JSON: " + e.message);
  }
}

function downloadJSON() {
  if (cubes.length === 0 || goals.length === 0 || cubes.length !== goals.length) {
    alert("Invalid level: cubes and goals must both have the same positive length.");
    return;
  }
  const text = document.getElementById("json-output").textContent;
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "level.json";
  a.click();
  URL.revokeObjectURL(url);
}

function getCubeAtPosition(x, y) {
  return cubes.find((c) => c.x === x && c.y === y);
}

function ensureCubeAtPosition(x, y) {
  let cube = getCubeAtPosition(x, y);
  if (!cube) {
    cube = {
      x,
      y,
      orientation: {
        top: "white",
        bottom: "white",
        north: "white",
        south: "white",
        east: "white",
        west: "white",
      },
    };
    cubes.push(cube);
  }
  return cube;
}

function getGoalAtPosition(x, y) {
  return goals.find((g) => g.x === x && g.y === y);
}

function setGoalAtPosition(x, y, color) {
  if (color === "none") {
    const goalIndex = goals.findIndex((g) => g.x === x && g.y === y);
    if (goalIndex !== -1) {
      goals.splice(goalIndex, 1);
    }
  } else {
    let goal = getGoalAtPosition(x, y);
    if (goal) {
      goal.top = color;
    } else {
      goals.push({ x, y, top: color });
    }
  }
}

function drawGridSquare(p, x, y, size, color) {
  if (color === "none") {
    p.fill(40);
    p.stroke(100);
    p.strokeWeight(1);
    p.rect(x, y, size, size);
  } else {
    const [r, g, b] = COLORS[color];
    p.fill(...[r, g, b]);
    p.stroke(100);
    p.strokeWeight(2);
    p.rect(x, y, size, size);
  }
}

function drawGoalIndicator(p, x, y, size, color) {
  if (color === "none") return;
  const [r, g, b] = COLORS[color];
  p.push();
  p.translate(x + size / 2, y + size / 2);
  p.noFill();
  p.stroke(...[r, g, b]);
  p.strokeWeight(3);
  p.circle(0, 0, size * 0.4);
  p.pop();
}

new p5((p) => {
  p.setup = () => {
    const container = document.getElementById("canvas-container");
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    const canvas = p.createCanvas(w, h);
    canvas.parent("canvas-container");
    loadColors();
  };

  p.draw = () => {
    p.background(20);
    if (!Object.keys(COLORS).length) return;

    // Calculate grid
    const padding = 40;
    const availWidth = p.width - 2 * padding;
    const availHeight = p.height - 2 * padding;
    const squareSize = Math.min(availWidth, availHeight) / GRID;

    // Draw grid
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const px = padding + x * squareSize;
        const py = padding + y * squareSize;

        if (currentFace === "goal") {
          const goal = getGoalAtPosition(x, y);
          if (goal) {
            drawGridSquare(p, px, py, squareSize, goal.top);
          } else {
            p.fill(40);
            p.stroke(100);
            p.strokeWeight(1);
            p.rect(px, py, squareSize, squareSize);
          }
        } else {
          const cube = getCubeAtPosition(x, y);
          if (cube) {
            drawGridSquare(p, px, py, squareSize, cube.orientation[currentFace]);
          } else {
            p.fill(40);
            p.stroke(100);
            p.strokeWeight(1);
            p.rect(px, py, squareSize, squareSize);
          }
        }
      }
    }
  };

  p.mousePressed = () => {
    if (!Object.keys(COLORS).length) return;

    const padding = 40;
    const availWidth = p.width - 2 * padding;
    const availHeight = p.height - 2 * padding;
    const squareSize = Math.min(availWidth, availHeight) / GRID;

    const mx = p.mouseX - padding;
    const my = p.mouseY - padding;

    if (mx < 0 || my < 0) return;

    const gridX = Math.floor(mx / squareSize);
    const gridY = Math.floor(my / squareSize);

    if (gridX < 0 || gridX >= GRID || gridY < 0 || gridY >= GRID) return;

    if (currentFace === "goal") {
      setGoalAtPosition(gridX, gridY, selectedColor);
    } else {
      if (selectedColor === "none") {
        const cubeIndex = cubes.findIndex((c) => c.x === gridX && c.y === gridY);
        if (cubeIndex !== -1) {
          cubes.splice(cubeIndex, 1);
        }
      } else {
        const cube = ensureCubeAtPosition(gridX, gridY);
        cube.orientation[currentFace] = selectedColor;
      }
    }

    updateJSON();
  };

  p.windowResized = () => {
    const container = document.getElementById("canvas-container");
    if (container) {
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      p.resizeCanvas(w, h);
    }
  };
});
