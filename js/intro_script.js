const WIDTH = window.innerHeight * 4 / 5;
const HEIGHT = WIDTH;

const VIEW_ANGLE = 45;
const ASPECT = WIDTH / HEIGHT;
const NEAR = 1;
const FAR = 10000;

var viewSize = 1000;

var scene, renderer, container, camera, camera_o, camera_p, controls;

var star_particle_JSON, gas_particle_JSON, heatmap_JSON;
var starPoints, gasPoints;
var heatmapField= 'NumDen';

var form = document.getElementById('snapHaloForm');
var simul;

var currentlyPressedKey = {};

var frustum = new THREE.Frustum();

var id = null;

var angle = 0.0075;
var step = 4;

var gridX = gridY = 20;
var colMax = 0;

mat = createCanvasMaterial('#FFFFFF', 256);

var pMaterial = new THREE.PointsMaterial({
  size: 1,
  map: mat,
  vertexColors: THREE.VertexColors,
  blending: THREE.AdditiveBlending,
  alphaTest: 0.3
});

var heatmapOptions = {
  "type": 'star',
  "field": 'NumDen'
};

var yhelium = 0.0789;
var Gamma_Minus_1 = 2 / 3;
var ProtonMass = 1.6726 * Math.pow(10, -24);
var Boltzmann = 1.3807 * Math.pow(10, -16);

var path = 'http://' + '10.128.145.111' + ':5000';

function tablePosition() {
  var p = $("#container");
  var pos = p.position();

  var d = document.getElementById('opts_table');
  d.style.left = WIDTH + 20 + 'px';
  d.style.top = pos.top;
}

function heatmapJSON(json) {
  $.ajax({
    type: 'POST',
    url: path + "/heatmap_JSON",
    data: JSON.stringify(json),
    dataType: 'json',
    contentType: 'application/json; charset=UTF-8',
    success: function (data) {
      heatmap_JSON = data;
      drawHeatmap(json);
    }
  });
  event.preventDefault();
}

function PyJSON(parts) {
  $.ajax({
    type: 'POST',
    url: path + "/particle_JSON",
    data: JSON.stringify(parts),
    dataType: 'json',
    contentType: 'application/json; charset=UTF-8',
    success: function (data) {
      star_particle_JSON = data['stars'];
      gas_particle_JSON = data['gas'];
      
      init_scene(data);
    }
  });
  event.preventDefault();
}

// https://stackoverflow.com/questions/5384712/capture-a-form-submit-in-javascript
function processForm(e) {
  if (e.preventDefault) e.preventDefault();

  simul = document.forms.snapHaloForm.simulation.value;
  snapNum = document.forms.snapHaloForm.snapshot.value;
  subHaloNum = document.forms.snapHaloForm.subhalo.value;

  if ((snapNum) && (subHaloNum)) {
    var pyJSON = {
      "simulation": simul + '',
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
 * Summary. calculate distance ratio for star color and returns combination
 * 
 * @param {any} T         
 * 
 * @return {any} [T, set] 
 */
function colorCalc(p) {
  var lb_x = 0;
  var lb_rgb = [1, 0, 0];

  var hb_x = 1;
  var hb_rgb = [0, 0, 1];

  // distance calculator between lower and higher bound
  var d_lb = p - lb_x;
  var d_hb = hb_x - p;
  var tot_dist = hb_x - lb_x;

  var set = [];

  for (var i = 0; i < 3; i++) {
    set.push(lb_rgb[i] * (1 - d_lb / tot_dist) + hb_rgb[i] * (1 - d_hb / tot_dist));
  }

  return (set);
}

   // var u = gas_particle_JSON['int-eng'][p];
  //  var nelec = gas_particle_JSON['nelec'][p];
// var T_calc = Math.pow(10, 10) * (Gamma_Minus_1 * ProtonMass / Boltzmann) * u * (1 + 4 * yhelium) / (1 + yhelium + nelec);

function createParticles(particleJSON, type) {
  var geometry = new THREE.BufferGeometry();
  var positions = [];
  var colors = [];

  $('#display_' + type)[0].checked = true; 

  var pCount = particleJSON['count'];

  for (var p = 0; p < pCount; p++) {
    var pX = particleJSON['pos-x'][p];
    var pY = particleJSON['pos-y'][p];
    var pZ = particleJSON['pos-z'][p];

    positions.push(pX, pY, pZ);
    if (type == 'gas')
      colors.push((0 / 255), (56 / 255), (170 / 255));
    else
      colors.push((255 / 255), (255 / 255), (0 / 255));
  }

  geometry.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();

  points = new THREE.Points(geometry, pMaterial);
  points.name = type;
  scene.add(points);
  return (points);
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

  if (positive) { //solid line
    line_material = new THREE.LineBasicMaterial({ color: line_col });
    createAxes(new THREE.Vector3(vec.x * -1, vec.y * -1, vec.z * -1), false, line_col, axis);
  } else { //negative line
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

function init_scene(dat) {
  if (id !== null) {
    cancelAnimationFrame(id);
  }

  container = document.querySelector('#container');

  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 4000;
  camera.name = 'cam';
  camera.frustumCulled = false;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(WIDTH, HEIGHT);
  renderer.domElement.id = 'render';

  scene = new THREE.Scene();
  scene.add(camera);

  createAxes(new THREE.Vector3(1000000, 0, 0), true, 0x0000ff, 'x');
  createAxes(new THREE.Vector3(0, 1000000, 0), true, 0x00ff00, 'z');
  createAxes(new THREE.Vector3(0, 0, -1000000), true, 0xff0000, 'y');
  createGrids();

  gasPoints = createParticles(gas_particle_JSON, 'gas');
  starPoints = createParticles(star_particle_JSON, 'stars');

  $('#display_grid')[0].checked = true; 
  $('#display_axes')[0].checked = true; 

  container.appendChild(renderer.domElement);

  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  document.getElementById("container").style.width = document.getElementById("render").style.width;

  requestAnimationFrame(update);
}

function updateFrustrum() {
  camera.updateProjectionMatrix();
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

function renderChart(data) {
  const margin = {
    top: 0,
    bottom: 20,
    left: 30,
    right: 10
  };

  console.log(data);
  let w = WIDTH - margin.left - margin.right;
  let h = HEIGHT - margin.top - margin.bottom;

  const rectWidth = w / gridX;
  const rectHeight = h / gridY;

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

  var interpolators = ["Inferno"];

  var min = d3.min(data, function (d) { return d.pointCount; });
  var max = d3.max(data, function (d) { return d.pointCount; });

  console.log([min, max]);
  console.log([(min + (1 - min)), (max + (1 - min))]);
  console.log([Math.log(min + (1 - min)), Math.log(max + (1 - min))]);

  var linColorScale = d3.scaleSequential()
    .domain([min, max])
    .interpolator(d3.interpolateInferno);

  var logColorScale = d3.scaleSequential()
    .domain([Math.log(min + (1 - min)), Math.log(max + (1 - min))])
    .interpolator(d3.interpolateInferno);

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
    .attr('x', function (d, i) { return x(d.upperLeft[0]); })
    .attr('y', function (d) { return y(d.lowerRight[1]); })
    .attr('width', function (d) { return rectWidth; })
    .attr('height', function (d) { return rectHeight; })
    .attr('fill', function (d) { return logColorScale(Math.log(d.pointCount + (1 - min))); })
    .on('mouseover', function (d) {
      console.log(d.pointCount);
      console.log(Math.log(d.pointCount + (1 - min)));
    });

  svg.append('g')
    .call(yaxis);

  svg.append('g')
    .attr("transform", "translate(0," + h + ")")
    .call(xaxis);

  $("svg").css({ top: 80, left: WIDTH + 300, position: 'absolute' });

  d3.selectAll('g.tick')
    .style('stroke', 'white'); 

  document.getElementById("chart").style.width = document.getElementById("render").style.width;
}

function makeBins(x, y, box, w, h, heat_p, heat_v) {
  let bin = {
    id: '' + x + y,
    upperLeft: [],
    lowerRight: [],
    points: [],
    pointCount: 0
  }

  bin.upperLeft[0] = box[0][0] + (x * w);
  bin.upperLeft[1] = box[0][1] + (y * h);

  bin.lowerRight[0] = bin.upperLeft[0] + w;
  bin.lowerRight[1] = bin.upperLeft[1] + h;

  var i = 0; 

  // to fix: this will currently count points twice if they fall on a datum's bbox edge
  heat_p.forEach(function (p) {
    if (p[0] >= bin.upperLeft[0] && p[0] <= bin.lowerRight[0] && p[1] >= bin.upperLeft[1] && p[1] <= bin.lowerRight[1]) {
      if (heat_v.length > 0)
        bin.pointCount += 1 * heat_v[i];
      else
        bin.pointCount += 1;

      bin.points.push(p);
      i++; 
    }
  });

  return bin;
}

function makeGrid(box, heat_p, heat_v) {
  var width = Math.abs(box[0][0] - box[1][0]) / gridX;
  var height = Math.abs(box[0][1] - box[1][1]) / gridY;

  var bins = [];

  for (let i = 0; i < gridX; i++) {
    for (let j = 0; j < gridY; j++) {
      const b = makeBins(i, j, box, width, height, heat_p, heat_v);
      bins.push(b);
    }
  }

  return (bins);
}

function drawHeatmap(hjson) {
  if (camera.type == "PerspectiveCamera") {
    return;
  }
  console.log(hjson);
  d3.selectAll("svg").remove();
  updateFrustrum();

  var arr, mat;

  var h_points = [];
  var h_val = [];

  var minX = 0;
  var maxX = 0;

  var minY = 0;
  var maxY = 0;

  var count = 0; 

  if (hjson['type'] == 'star') {
    count = star_particle_JSON['count'];
    arr = starPoints.geometry.attributes.position.array;
    mat = starPoints.matrix;
  }
  else {
    count = gas_particle_JSON['count'];
    arr = gasPoints.geometry.attributes.position.array;
    mat = gasPoints.matrix;
  }

  for (let i = 0; i < count; i++) {
    var t = new THREE.Vector3(arr[3 * i], arr[3 * i + 1], arr[3 * i + 2]);
    t.applyMatrix4(mat);
    if (frustum.containsPoint(t)) {
      h_points.push([t.x, t.y]);
      if (hjson['field'] != 'NumDen')
        h_val.push(heatmap_JSON[hjson['field']][i]);

      if (arr[3 * i] > maxX) maxX = arr[3 * i]; 
      if (arr[3 * i] < minX) minX = arr[3 * i]; 

      if (arr[3 * i + 1] > maxY) maxY = arr[3 * i + 1]; 
      if (arr[3 * i + 1] < minY) minY = arr[3 * i + 1]; 
    }
  }

  var bbox = [];
  if (camera.type == "PerspectiveCamera") {
    bbox = [[Math.floor(minX), Math.floor(minY)], [Math.ceil(maxX), Math.ceil(maxY)]];
  }
  else {
    bbox = [[camera.left, camera.bottom], [camera.right, camera.top]];
  }

  renderChart(makeGrid(bbox, h_points, h_val));
}

function particleUpdate() {
  if (currentlyPressedKey[74]) {
    starPoints.rotation.y += angle;
    gasPoints.rotation.y += angle;
  }
  if (currentlyPressedKey[76]) {
    starPoints.rotation.y -= angle;
    gasPoints.rotation.y -= angle;}

  if (currentlyPressedKey[73]) {
    starPoints.rotation.x += angle;
    gasPoints.rotation.x += angle;
  }

  if (currentlyPressedKey[75]) {
    starPoints.rotation.x -= angle;
    gasPoints.rotation.x -= angle;
  }

  starPoints.updateMatrixWorld();
  gasPoints.updateMatrixWorld();
}

function cameraUpdate() {
  if (currentlyPressedKey[83]) {
    if (camera.type == "OrthographicCamera") {
      if ((camera.right - camera.left) > 1) {
        camera.left -= 1;
        camera.right += 1;
        camera.top += 1;
        camera.bottom -= 1;
      }
    }
    else { camera.position.z += step; }
  }
  if (currentlyPressedKey[87]) {
    if (camera.type == "OrthographicCamera") {
      if ((camera.right - camera.left) > 2) {
        camera.left += 1;
        camera.right -= 1;
        camera.top -= 1;
        camera.bottom += 1;
      }
    }
    else { camera.position.z -= step; }
  }

  if (currentlyPressedKey[68]) {
    if (camera.type == "OrthographicCamera") {
      camera.left += step;
      camera.right += step;
    }
    else { camera.position.x += step; }
  }
  if (currentlyPressedKey[65]) {
    if (camera.type == "OrthographicCamera") {
      camera.left -= step;
      camera.right -= step;
    }
    else { camera.position.x -= step; }
  }

  if (currentlyPressedKey[82]) {
    if (camera.type == "OrthographicCamera") {
      camera.bottom += step;
      camera.top += step;
    }
    else { camera.position.y += step; }
  }
  if (currentlyPressedKey[70]) {
    if (camera.type == "OrthographicCamera") {
      camera.bottom -= step;
      camera.top -= step;
    }
    else { camera.position.y -= step; }}
}

function update() {
  particleUpdate();
  starPoints.geometry.verticesNeedUpdate = true; 
  cameraUpdate();

  if (currentlyPressedKey[32]) {
       drawHeatmap(heatmapOptions);
  }

  updateFrustrum();

  renderer.render(scene, camera);

  id = requestAnimationFrame(update);
}

function init() {
  container = document.querySelector('#container');

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(WIDTH, HEIGHT);
  renderer.domElement.id = 'render';

  scene = new THREE.Scene();
  container.appendChild(renderer.domElement);

  tablePosition();

  if (form.attachEvent) {
    form.attachEvent("submit", processForm);
  } else {
    form.addEventListener("submit", processForm);
  }
}

$(document).ready(function () {
  init();

  $("#P_cam").click(function () {
    if (camera) {
      camera_p = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
      camera_p.position.x = camera.position.x;
      camera_p.position.y = camera.position.y;
      camera_p.position.z = camera.position.z;

      camera = camera_p;
      d3.selectAll("svg").remove();
    }
  });
  $("#O_cam").click(function () {
    if (camera) {
      camera_o = new THREE.OrthographicCamera(-ASPECT * viewSize / 2, ASPECT * viewSize / 2, viewSize / 2, -viewSize / 2, -camera.position.z, FAR);
      camera_o.position.x = camera.position.x;
      camera_o.position.y = camera.position.y;
      camera_o.position.z = camera.position.z;

      camera = camera_o;
      drawHeatmap(heatmapOptions);
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
    if (camera.type == 'PerspectiveCamera') {
      camera.position.x = 0;
      camera.position.y = 0; 
      camera.position.z = 4000;
    }
    else {
      camera.left = -ASPECT * viewSize / 2;
      camera.right = ASPECT * viewSize / 2;
      camera.top = viewSize / 2;
      camera.bottom = -viewSize / 2;

      drawHeatmap(heatmapOptions);
    }
  });
  $('#reset_rot').click(function () {
    if (camera) {
      scene.getObjectByName('stars').rotation.x = 0;
      scene.getObjectByName('stars').rotation.y = 0;
      scene.getObjectByName('stars').rotation.z = 0;

      scene.getObjectByName('gas').rotation.x = 0;
      scene.getObjectByName('gas').rotation.y = 0;
      scene.getObjectByName('gas').rotation.z = 0;

      drawHeatmap(heatmapOptions);
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
    angle = ($('#rot_input')[0].valueAsNumber);
  });
  $('#bin_num').change(function () {
    if (camera) {
      gridX = ($('#bin_num')[0].valueAsNumber);
      gridY = gridX;
      drawHeatmap(heatmapOptions);
    }
  });
  $('#step_input').change(function () {
    step = ($('#step_input')[0].valueAsNumber);
  });
  $('#heatmapField').change(function () {
    if ((camera) && camera.type == 'OrthographicCamera') {
      var val = $('#heatmapField').val();
      heatmapOptions = $.parseJSON(val.replace(/'/g, '"'));

      if (heatmapOptions["field"] == "NumDen")
        drawHeatmap(heatmapOptions);
      else
        heatmapJSON(heatmapOptions);
    }
  });
});