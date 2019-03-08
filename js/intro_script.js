const WIDTH = window.innerHeight * 4 / 5;
const HEIGHT = WIDTH;

const VIEW_ANGLE = 45;
const ASPECT = WIDTH / HEIGHT;
const NEAR = 1;
const FAR = 10000;

var scene, renderer, container, camera, controls;

var star_particle_JSON;
var gas_particle_JSON;

var t_particles;

var particleCount;
var gasParticleCount;

var form = document.getElementById('snapHaloForm');

var currentlyPressedKey = {};

var tog = false;

var frustum = new THREE.Frustum();

var id = null;

var angle = 0.0075;
var step = 4;

var gradient = [
  [0.00, [251, 98, 84]],
  [7.88, [255, 163, 80]],
  [11.4, [255, 243, 151]],
  [20.9, [254, 255, 208]],
  [62.6, [248, 247, 252]],
  [94.4, [154, 175, 255]]
];

function tablePosition() {
  var p = $("#container");
  var pos = p.position();

  var d = document.getElementById('opts_table');
  d.style.left = WIDTH + 20 + 'px';
  d.style.top = pos.top;
}

function PyJSON(parts) {
  $.ajax({
    type: 'POST',
    url: "http://127.0.0.1:5000/particle_JSON",
    data: JSON.stringify(parts),
    dataType: 'json',
    contentType: 'application/json; charset=UTF-8',
    success: function (data) {
      star_particle_JSON = data['stars'];
      gas_particle_JSON = data['gas'];
      init_scene();
    }
  });
  // stop link reloading the page
  event.preventDefault();
}

// https://stackoverflow.com/questions/5384712/capture-a-form-submit-in-javascript
function processForm(e) {
  if (e.preventDefault) e.preventDefault();
  snapNum = document.forms.snapHaloForm.snapshot.value;
  subHaloNum = document.forms.snapHaloForm.subhalo.value;

  if ((snapNum) && (subHaloNum)) {
    var pyJSON = {
      "snapshot": snapNum + '',
      "subhalo": subHaloNum + ''
    };
    PyJSON(pyJSON);
    document.getElementById("container").innerHTML = "";
  }

  return false;
}

//https://2pha.com/blog/threejs-easy-round-circular-particles/
function createCanvasMaterial(color, size) {
  var matCanvas = document.createElement('canvas');
  matCanvas.width = matCanvas.height = size;
  var matContext = matCanvas.getContext('2d');
  // create exture object from canvas.
  var texture = new THREE.Texture(matCanvas);
  // Draw a circle
  var center = size / 2;
  matContext.beginPath();
  matContext.arc(center, center, size / 2, 0, 2 * Math.PI, false);
  matContext.closePath();
  matContext.fillStyle = color;
  matContext.fill();
  // need to set needsUpdate
  texture.needsUpdate = true;
  // return a texture made from the canvas
  return texture;
}


/**
 * Summary. Binary search for finding the range for star colors
 * 
 * @param {any} T
 * @param {any} low
 * @param {any} high
 * @param {any} i
 */
function colorRange(T, low, high, i) {
  if ((T > low[0]) && (T < high[0])) return [low, high];

  if (T < low[0]) return colorRange(T, gradient[i - 2], gradient[i - 1], i - 2);
  if (T > high[0]) return colorRange(T, gradient[i + 1], gradient[i + 2], i - 2);
}


/**
 * Summary. calculate distance ratio for star color and returns combination
 * 
 * @param {any} T         
 * 
 * @return {any} [T, set] 
 */
function colorCalc(T) {
  var range_T = colorRange(T, gradient[2], gradient[3], 2);

  // lower bound 
  var lb_x = range_T[0][0];
  var lb_rgb = range_T[0][1];

  // higher bound
  var hb_x = range_T[1][0];
  var hb_rgb = range_T[1][1];

  // distance calculator between lower and higher bound
  var d_lb = T - lb_x;
  var d_hb = hb_x - T;
  var tot_dist = hb_x - lb_x;

  var set = [];

  for (var i = 0; i < 3; i++) {
    set.push(lb_rgb[i] * (1 - d_lb / tot_dist) + hb_rgb[i] * (1 - d_hb / tot_dist));
  }

  return ([T, set]);
}

function createGas() {
  console.log(gas_particle_JSON['count']);
  var geometry = new THREE.BufferGeometry();
  var positions = [];
  var colors = [];

  gasParticleCount = gas_particle_JSON['count'];

  for (var p = 0; p < gasParticleCount; p++) {
    // positions
    var pX = gas_particle_JSON['pos-x'][p];
    var pY = gas_particle_JSON['pos-y'][p];
    var pZ = gas_particle_JSON['pos-z'][p];

    positions.push(pX, pY, pZ);
    colors.push((58/255), (56/255), (170/255));
  }

  geometry.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();

  mat = createCanvasMaterial('#FFFFFF', 256);

  var pMaterial = new THREE.PointsMaterial({
    size: 1,
    map: mat,
    vertexColors: THREE.VertexColors,
    blending: THREE.AdditiveBlending,
    alphaTest: 0.3
  });

  gasPoints = new THREE.Points(geometry, pMaterial);
  gasPoints.name = 'gas';
  // points.frustumCulled = false;
  scene.add(gasPoints);
  $('#display_gas')[0].checked = true; 
}

/** 
 * Summary. Creates particles for the scene. 
 */
function createParticles() {
  var geometry = new THREE.BufferGeometry();
  var rgb;
  var positions = [];
  var colors = [];
  var color = new THREE.Color();

  particleCount = star_particle_JSON['count'];

  for (var p = 0; p < particleCount; p++) {
    // positions
    var pX = star_particle_JSON['pos-x'][p];
    var pY = star_particle_JSON['pos-y'][p];
    var pZ = star_particle_JSON['pos-z'][p];

    positions.push(pX, pY, pZ);

    // colors
    rgb = colorCalc(star_particle_JSON['T'][p]);

    var r = rgb[1][0] / 255;
    var g = rgb[1][1] / 255;
    var b = rgb[1][2] / 255;
    colors.push(r, g, b);
  }

  geometry.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();

  mat = createCanvasMaterial('#FFFFFF', 256);

  var pMaterial = new THREE.PointsMaterial({
    size: 3,
    map: mat,
    vertexColors: THREE.VertexColors,
    blending: THREE.AdditiveBlending,
    alphaTest: 0.3
  });

  points = new THREE.Points(geometry, pMaterial);
  points.name = 'stars';
  // points.frustumCulled = false;
  scene.add(points);
  createGas();
  $('#display_stars')[0].checked = true; 
}

function createGrids() {
  var size = 10000;
  var divisions = 100;
  var colorGrid = 0x3d3d3d;

  var grid = new THREE.GridHelper(size, divisions, colorGrid, colorGrid);
  grid.name = 'grid';

  scene.add(grid); 
}

/**
 * Summary. Creates x-y-z axes for visually orienting the scene. 
 * 
 * @param {any} vec 
 * @param {any} positive
 * @param {any} line_col
 */
function createAxes(vec, positive, line_col, axis) {
  var line_material = null;

  // postive - solid line, negative - dashed line 
  if (positive) {
    line_material = new THREE.LineBasicMaterial({ color: line_col });
    createAxes(new THREE.Vector3(vec.x * -1, vec.y * -1, vec.z * -1), false, line_col, axis);
  } else {
    line_material = new THREE.LineDashedMaterial({ color: line_col, dashSize: 4, gapSize: 4, linewidth: 2 });
  }

  var line_geometry = new THREE.Geometry();
  line_geometry.vertices.push(new THREE.Vector3(0, 0, 0));
  line_geometry.vertices.push(vec);

  line = new THREE.Line(line_geometry, line_material);
  line.name = (positive) ? axis + '-pos' : axis + '-neg'; 
  line.computeLineDistances();

  scene.add(line);
}

function init_scene() {
  // Check to see if scene already exists, prevents initialization bug
  if (id !== null) {
    cancelAnimationFrame(id);
  }

  // Container
  container = document.querySelector('#container');

  // Camera
  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 2000;
  camera.name = 'cam'

  camera.frustumCulled = false;

  // Renderer
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(WIDTH, HEIGHT);
  renderer.domElement.id = 'render';

  // Scene
  scene = new THREE.Scene();
  scene.add(camera);

  // Add items to scene 
  createParticles();
  createGrids();
  createAxes(new THREE.Vector3(1000000, 0, 0), true, 0x0000ff, 'x');
  createAxes(new THREE.Vector3(0, 1000000, 0), true, 0x00ff00, 'z');
  createAxes(new THREE.Vector3(0, 0, -1000000), true, 0xff0000, 'y');

  $('#display_grid')[0].checked = true; 
  $('#display_axes')[0].checked = true; 

  container.appendChild(renderer.domElement);

  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;

  updateFrustrum();

  requestAnimationFrame(update);

  document.getElementById("container").style.width = document.getElementById("render").style.width;

  // getPoints(points.geometry.attributes.position.array);
  // document.getElementById("chart").style.width = document.getElementById("render").style.width;
}

function updateFrustrum() {
  camera.updateMatrix(); // make sure camera's local matrix is updated
  camera.updateMatrixWorld(); // make sure camera's world matrix is updated
  camera.matrixWorldInverse.getInverse(camera.matrixWorld);

  frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
}

function handleKeyDown(event) {
  currentlyPressedKey[event.keyCode] = true;
}

function handleKeyUp(event) {
  currentlyPressedKey[event.keyCode] = false;
}

function renderChart(data, gX, gY) {
  const margin = {
    top: 10,
    bottom: 20,
    left: 30,
    right: 10
  };

  let w = WIDTH - margin.left - margin.right;
  let h = HEIGHT - margin.top - margin.bottom;

  const rectWidth = w / gX;
  const rectHeight = h / gY;

  const x = d3.scaleLinear()
    .domain([
      d3.min(data, function (d) { return d.upperLeft[0]; }),
      d3.max(data, function (d) { return d.lowerRight[0]; })
    ])
    .range([0, w]);

  const y = d3.scaleLinear()
    .domain([
      d3.min(data, function (d) { return d.upperLeft[1]; }),
      d3.max(data, function (d) { return d.lowerRight[1]; })
    ])
    .range([h, 0]);

  var colorScale = d3.scaleLinear()
    .domain([0, Math.log(d3.max(data, function (d) { return d.pointCount; }))])
    .range(["#000000", "#FFFFFF"]);

  const yaxis = d3.axisLeft()
    .scale(y);

  const xaxis = d3.axisBottom()
    .scale(x);

  const svg = d3.select('#container').append('svg')
    .attr('id', 'chart')
    .attr('width', w + margin.left + margin.right)
    .attr('height', h + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  const rects = svg.selectAll('rect')
    .data(data, function (d) { return d; })
    .enter().append('rect')
    .attr('x', function (d, i) {
      return x(d.upperLeft[0]);
    })
    .attr('y', function (d) { return y(d.lowerRight[1]); })
    .attr('width', function (d) { return rectWidth; })
    .attr('height', function (d) { return rectHeight; })
    .attr('fill', function (d) { return colorScale((Math.log(1 + d.pointCount))); })
    .on('mouseover', function (d) { console.log(d.pointCount); });

  svg.append('g')
    .call(yaxis);

  svg.append('g')
    .attr("transform", "translate(0," + h + ")")
    .call(xaxis);

  $("svg").css({ top: 80, left: WIDTH + 20, position: 'absolute' });
}

function makeBins(x, y, box, w, h, heat_p) {
  let bin = {
    id: '' + x + y,
    upperLeft: [],
    lowerRight: [],
    points: [],
    pointCount: 0
  }

  bin.upperLeft[0] = (x * w) - Math.abs(box[0][0]);
  bin.upperLeft[1] = (y * h) - Math.abs(box[0][1]);

  bin.lowerRight[0] = bin.upperLeft[0] + w;
  bin.lowerRight[1] = bin.upperLeft[1] + h;

  // to fix: this will currently count points twice if they fall on a datum's bbox edge
  heat_p.forEach(function (p) {
    if (p[0] >= bin.upperLeft[0] && p[0] <= bin.lowerRight[0] && p[1] >= bin.upperLeft[1] && p[1] <= bin.lowerRight[1]) {
      bin.pointCount += 1;
      bin.points.push(p);
    }
  });

  return bin;
}

function makeGrid(box, heat_p) {
  var gridX = 40;
  var gridY = 40;

  var width = Math.abs(box[0][0] - box[1][0]) / gridX;
  var height = Math.abs(box[0][1] - box[1][1]) / gridY;

  var bins = [];

  for (let i = 0; i < gridX; i++) {
    for (let j = 0; j < gridY; j++) {
      const b = makeBins(i, j, box, width, height, heat_p);
      bins.push(b);
    }
  }

  renderChart(bins, gridX, gridY);
}

function getPoints(arr) {
  var h_points = [];

  var minX = 0;
  var maxX = 0;

  var minY = 0;
  var maxY = 0;

  for (let i = 0; i < particleCount; i++) {
    var t = new THREE.Vector3(arr[3 * i], arr[3 * i + 1], arr[3 * i + 2]);
    if (frustum.containsPoint(t)) {
      h_points.push([arr[3 * i], arr[3 * i + 1]]);

      if (arr[3 * i] > maxX) maxX = arr[3 * i]; 
      if (arr[3 * i] < minX) minX = arr[3 * i]; 

      if (arr[3 * i + 1] > maxY) maxY = arr[3 * i + 1]; 
      if (arr[3 * i + 1] < minY) minY = arr[3 * i + 1]; 
    }
  }

  var bbox = [[Math.floor(minX), Math.floor(minY)], [Math.ceil(maxX), Math.ceil(maxY)]];

  makeGrid(bbox, h_points);
}

function particleUpdate() {
  if (currentlyPressedKey[74]) {
    points.rotation.y += angle;
    gasPoints.rotation.y += angle;
  }
  if (currentlyPressedKey[76]) {
    points.rotation.y -= angle;
    gasPoints.rotation.y -= angle;}

  if (currentlyPressedKey[73]) {
    points.rotation.x += angle;
    gasPoints.rotation.x += angle;
  }

  if (currentlyPressedKey[75]) {
    points.rotation.x -= angle;
    gasPoints.rotation.x -= angle;}
}

function cameraUpdate() {
  if (currentlyPressedKey[83]) { camera.position.z += step; }
  if (currentlyPressedKey[87]) { camera.position.z -= step; }

  if (currentlyPressedKey[68]) { camera.position.x += step; }
  if (currentlyPressedKey[65]) { camera.position.x -= step; }
 
  if (currentlyPressedKey[82]) { camera.position.y += step; }
  if (currentlyPressedKey[70]) { camera.position.y -= step; }
}

function update() {
  particleUpdate();
  cameraUpdate();

  if (currentlyPressedKey[32]) {
    //   d3.select("svg").remove();
    //   getPoints(points.geometry.attributes.position.array);
  }
  //camera.updateProjectionMatrix();

  updateFrustrum();
  // console.log(frustum);

  renderer.render(scene, camera);

  id = requestAnimationFrame(update);
}

function init_blank() {
  container = document.querySelector('#container');

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(WIDTH, HEIGHT);
  renderer.domElement.id = 'render';

  scene = new THREE.Scene();
  container.appendChild(renderer.domElement);
}

function init() {
  if (form.attachEvent) {
    form.attachEvent("submit", processForm);
  } else {
    form.addEventListener("submit", processForm);
  }
  tablePosition();
}

$(document).ready(function () {
  init();
  init_blank();
 
  $("#P_cam").click(function () {
    if (camera) {
      var camera_p = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
      camera_p.position.x = camera.position.x;
      camera_p.position.y = camera.position.y;
      camera_p.position.z = camera.position.z;

      camera = camera_p;
    }
  });
  $("#O_cam").click(function () {
    if (camera) {
      var viewSize = 1000;
      camera_o = new THREE.OrthographicCamera(-ASPECT * viewSize / 2, ASPECT * viewSize / 2, viewSize / 2, -viewSize / 2, -camera.position.z, FAR);
      camera_o.position.x = camera.position.x;
      camera_o.position.y = camera.position.y;
      camera_o.position.z = camera.position.z;

      camera = camera_o;
    }
  });
  $('#display_grid').change(function () {
    if (camera) {
      scene.getObjectByName('grid').visible = !scene.getObjectByName('grid').visible;
    }
  });
  $('#display_stars').change(function () {
    if (camera) {
      scene.getObjectByName('stars').visible = !scene.getObjectByName('stars').visible;
    }
  });
  $('#display_gas').change(function () {
    if (camera) {
      scene.getObjectByName('gas').visible = !scene.getObjectByName('gas').visible;
    }
  });
  $('#reset_cam').click(function () {
    if (camera) {
      camera.position.x = 0;
      camera.position.y = 0; 
      camera.position.z = 2000;
    }
  });
  $('#reset_rot').click(function () {
    if (camera) {
      scene.getObjectByName('points').rotation.x = 0;
      scene.getObjectByName('points').rotation.y = 0;
      scene.getObjectByName('points').rotation.z = 0;
    }
  })
  $('#display_axes').change(function () {
    if (camera) {
      var axis_flag = !scene.getObjectByName('x-pos').visible;

      scene.getObjectByName('x-pos').visible = axis_flag;
      scene.getObjectByName('x-neg').visible = axis_flag;
      scene.getObjectByName('y-pos').visible = axis_flag;
      scene.getObjectByName('y-neg').visible = axis_flag;
      scene.getObjectByName('z-pos').visible = axis_flag;
      scene.getObjectByName('z-neg').visible = axis_flag;
    }
  });
  $('#rot_input').change(function () {
    console.log($('#rot_input')[0].valueAsNumber);
  });
});