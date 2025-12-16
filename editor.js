const GRID = 5;
const CELL = 80;
const CUBE = CELL * 0.85;

let COLORS = {};
let cubes = [];
let goals = [];
let currentFace = "top";
let selectedColor = "yellow";
let levelName = "";
let levelDescription = "";
let levelDifficulty = "Medium";
let starsThree = 0;
let starsTwo = 0;
let starsOne = 0;

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

  // Setup metadata inputs
  document.getElementById("level-name").oninput = (e) => {
    levelName = e.target.value;
    updateJSON();
  };
  document.getElementById("level-description").oninput = (e) => {
    levelDescription = e.target.value;
    updateJSON();
  };
  document.getElementById("level-difficulty").onchange = (e) => {
    levelDifficulty = e.target.value;
    updateJSON();
  };
  document.getElementById("stars-three").oninput = (e) => {
    starsThree = parseInt(e.target.value) || 0;
    updateJSON();
  };
  document.getElementById("stars-two").oninput = (e) => {
    starsTwo = parseInt(e.target.value) || 0;
    updateJSON();
  };
  document.getElementById("stars-one").oninput = (e) => {
    starsOne = parseInt(e.target.value) || 0;
    updateJSON();
  };

  updateJSON();
}

function updateJSON() {
  const data = {
    name: levelName,
    description: levelDescription,
    difficulty: levelDifficulty,
    stars: { three: starsThree, two: starsTwo, one: starsOne },
    cubes,
    goals
  };
  document.getElementById("json-output").textContent = JSON.stringify(data, null, 2);
  updateValidationStatus();
}

function updateValidationStatus() {
  const validationEl = document.getElementById("validation-status");
  const cubesLabel = `${cubes.length} cube${cubes.length !== 1 ? 's' : ''}`;
  const goalsLabel = `${goals.length} goal${goals.length !== 1 ? 's' : ''}`;
  validationEl.textContent = `Cubes: ${cubesLabel} • Goals: ${goalsLabel}`;
  validationEl.style.color = "#cbd5e1"; // neutral color
}

function exportJSON() {
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
    levelName = data.name || "";
    levelDescription = data.description || "";
    levelDifficulty = data.difficulty || "Medium";
    starsThree = data.stars?.three || 0;
    starsTwo = data.stars?.two || 0;
    starsOne = data.stars?.one || 0;
    cubes = data.cubes || [];
    goals = data.goals || [];
    
    // Update input fields
    document.getElementById("level-name").value = levelName;
    document.getElementById("level-description").value = levelDescription;
    document.getElementById("level-difficulty").value = levelDifficulty;
    document.getElementById("stars-three").value = starsThree;
    document.getElementById("stars-two").value = starsTwo;
    document.getElementById("stars-one").value = starsOne;
    updateJSON();
  } catch (e) {
    alert("Invalid JSON: " + e.message);
  }
}

function downloadJSON() {
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
    p.fill(50);
    p.stroke(80);
    p.strokeWeight(1);
    p.rect(x, y, size, size);
  } else {
    const [r, g, b] = COLORS[color];
    p.fill(...[r, g, b]);
    p.stroke(150);
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
    p.background(30);
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
            p.fill(50);
            p.stroke(80);
            p.strokeWeight(1);
            p.rect(px, py, squareSize, squareSize);
          }
        } else {
          const cube = getCubeAtPosition(x, y);
          if (cube) {
            drawGridSquare(p, px, py, squareSize, cube.orientation[currentFace]);
          } else {
            p.fill(50);
            p.stroke(80);
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
