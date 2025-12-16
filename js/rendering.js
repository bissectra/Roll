function quad(p, a, b, c, d, color) {
  p.noStroke();
  p.fill(...COLORS[color]);
  p.beginShape();
  [a, b, c, d].forEach(v => p.vertex(...v));
  p.endShape(p.CLOSE);
}

function drawCube(p, o) {
  const h = CUBE / 2;
  const p000 = [-h, -h, -h], p001 = [-h, -h, h], p010 = [-h, h, -h], p011 = [-h, h, h];
  const p100 = [h, -h, -h], p101 = [h, -h, h], p110 = [h, h, -h], p111 = [h, h, h];
  quad(p, p001, p101, p111, p011, o.top);
  quad(p, p000, p010, p110, p100, o.bottom);
  quad(p, p011, p111, p110, p010, o.south);
  quad(p, p000, p100, p101, p001, o.north);
  quad(p, p101, p100, p110, p111, o.east);
  quad(p, p000, p001, p011, p010, o.west);
}

function drawGoal(p, g) {
  const [cx, cy] = world(g.x, g.y);
  p.push();
  p.translate(cx, cy, 1);
  p.noStroke();
  p.fill(...COLORS[g.top], 120);
  p.circle(0, 0, CELL * 0.5);
  p.pop();
}
