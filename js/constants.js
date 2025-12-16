const GRID = 5;
const CELL = 120;
const CUBE = CELL * 0.85;
const PICK_RADIUS = CELL * 0.45;
const DRAG_THRESHOLD = 20;
const ANIM_MS = 250;

const COLORS = {
  white: [240, 240, 250],
  yellow: [255, 240, 60],
  green: [60, 220, 140],
  blue: [60, 140, 220],
  red: [255, 60, 60],
  orange: [255, 165, 0],
};

const ROLL = {
  north: (o) => ({ top: o.south, bottom: o.north, north: o.top, south: o.bottom, east: o.east, west: o.west }),
  south: (o) => ({ top: o.north, bottom: o.south, north: o.bottom, south: o.top, east: o.east, west: o.west }),
  east: (o) => ({ top: o.west, bottom: o.east, east: o.top, west: o.bottom, north: o.north, south: o.south }),
  west: (o) => ({ top: o.east, bottom: o.west, east: o.bottom, west: o.top, north: o.north, south: o.south }),
};
