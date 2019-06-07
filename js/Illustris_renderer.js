
const WIDTH = window.innerHeight * 4 / 5;
const HEIGHT = WIDTH;

const VIEW_ANGLE = 45;
const ASPECT = WIDTH / HEIGHT;
const NEAR = 1;
const FAR = 10000;

var angle = 0.0075;
var step = 4;

var yhelium = 0.0789;
var Gamma_Minus_1 = 2 / 3;
var ProtonMass = 1.6726 * Math.pow(10, -24);
var Boltzmann = 1.3807 * Math.pow(10, -16);

var camera_o, camera_p;

var star_particle_JSON, gas_particle_JSON, heatmap_JSON, contour_JSON;
var starPoints, gasPoints;
var heatmapField= 'NumDen';

var gridX = gridY = 20;
var colMax = 0;

var mat = createCanvasMaterial('#FFFFFF', 256);

var velList = {
  0: 'v_x',
  1: 'v_y',
  2: 'v_z'
}

var magList = {
  0: 'U-band',
  1: 'B-band',
  2: 'V-band',
  3: 'K-band',
  4: 'g-band',
  5: 'r-band',
  6: 'i-band',
  7: 'z-band'
}

var starList = {
  'NumDen': 'Count',
  'GFM_InitialMass': 'm_i,GFM',
  'GFM_Metallicity': 'Metallicity_GFM',
  'GFM_StellarFormationTime': 't_Star,Form,GFM',
  'GFM_StellarPhotometrics': 'stellarPhoto_GFM',
  'Masses': 'm',
  'Potential': 'PE_g',
  'SubfindDensity': 'p_s.f.',
  'SubfindHsml': 'hsml_s.f.',
  'SubfindVelDisp': 'vel_desp,s.f.',
  'Velocities': 'vel'
};

var gasList = {
  'NumDen': 'Count',
  'ElectronAbundance': 'e_abund',
  'GFM_AGNRadiation': 'Radiation_GFM',
  'GFM_CoolingRate': 'Rate_cool,GFM',
  'GFM_WindDMVelDisp': 'vel_wind,DM,GFM',
  'InternalEnergy': 'E_internal',
  'Masses': 'm',
  'NeutralHydrogenAbundance': 'H_neut,abund',
  'NumTracers': 'N_tracers',
  'Potential': 'Pot',
  'SmoothingLength': 'Smooth Length',
  'StarFormationRate': 'SFR',
  'SubfindDensity': 'p_s.f.',
  'SubfindHsml': 'hsml_s.f.',
  'SubfindVelDisp': 'vel_desp,s.f.',
  'Velocities': 'vel',
  'Volume': 'V'
};

const margin = {
  top: 0,
  bottom: 20,
  left: 30,
  right: 10
};

var pMaterial = new THREE.PointsMaterial({
  size: 1,
  map: mat,
  vertexColors: THREE.VertexColors,
  blending: THREE.AdditiveBlending,
  alphaTest: 0.3
});

var heatmapOptions = {
  "plot": 0,
  "type": 'star',
  "field": 'NumDen',
  "subfield": ''
};


var contourOptions = {
  "plot": 1,
  "type": 'star',
  "field": 'NumDen',
  "subfield": ''
};

function hcJSON(json) {
  if (json.field == 'NumDen') {
    drawHeatmap(json);
    return;
  }

  $.ajax({
    type: 'POST',
    url: path + "/heatmap_JSON",
    data: JSON.stringify(json),
    dataType: 'json',
    contentType: 'application/json; charset=UTF-8',
    success: function (data) {
      if (json['plot'] == 0) {
        heatmap_JSON = data;
        drawHeatmap(json);
      }
      else {
        contour_JSON = data;
        drawContour(json);
      }
    }
  });
  event.preventDefault();
}

function drawHeatmap(json) {
  d3.selectAll("svg").remove();
  var data = d3PointGen(json);
  renderChart(data);
}

function drawContour(json) {
  var data = d3PointGen(json);
  renderContour(data);
}

function PyJSON(parts) {
  $.ajax({
    type: 'POST',
    url: path + "/particle_JSON",
    data: JSON.stringify(parts),
    dataType: 'json',
    contentType: 'application/json; charset=UTF-8',
    success: function (data) {
      init_scene(data);
    }
  });
  event.preventDefault();
}

// https://stackoverflow.com/questions/5384712/capture-a-form-submit-in-javascript
function processForm(e) {
  if (e.preventDefault) e.preventDefault();

  var simul = document.forms.simulForm.simulation.value;
  var snapNum = document.forms.simulForm.snapshot.value;
  var subHaloNum = document.forms.simulForm.subhalo.value;

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

function createParticles(particleJSON, type) {
  var geometry = new THREE.BufferGeometry();
  var positions = [];
  var T = [];
  var T_max = 0;
  var colors = [];

  $('#display_' + type)[0].checked = true; 

  var pCount = particleJSON['count'];

  for (var p = 0; p < pCount; p++) {
    var pX = particleJSON['pos-x'][p];
    var pY = particleJSON['pos-y'][p];
    var pZ = particleJSON['pos-z'][p];

    positions.push(pX, pY, pZ);
    if (type == 'gas') {
      var u = gas_particle_JSON['int-eng'][p];
      var nelec = gas_particle_JSON['nelec'][p];
      var T_calc = Math.pow(10, 10) * (Gamma_Minus_1 * ProtonMass / Boltzmann) * u * (1 + 4 * yhelium) / (1 + yhelium + nelec);

      T.push(T_calc);

      if (T_calc > T_max)
        T_max = T_calc;
    }
    else
      colors.push((255 / 255), (255 / 255), (0 / 255));
  }

  if (type == 'gas') {
    for (var p = 0; p < pCount; p++) {
      var T_col = colorCalc(T[p] / T_max);
      colors.push(T_col[0], T_col[1], T_col[2]);
    }
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

  star_particle_JSON = dat['stars'];
  gas_particle_JSON = dat['gas'];

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

  document.getElementById("container").style.width = document.getElementById("render").style.width;

  requestAnimationFrame(update);
}

function renderChart(data) {
  let h = HEIGHT;

  const rectWidth = WIDTH / gridX;
  const rectHeight = rectWidth;

  const x = d3.scaleLinear()
    .domain([
      d3.min(data, function (d) { return d.upperLeft[0]; }),
      d3.max(data, function (d) { return d.lowerRight[0]; })
    ])
    .range([0, WIDTH]);

  const y = d3.scaleLinear()
    .domain([
      d3.min(data, function (d) { return d.upperLeft[1]; }),
      d3.max(data, function (d) { return d.lowerRight[1]; })
    ])
    .range([WIDTH, 0]);

  var interpolators = ["Inferno"];

  var min = d3.min(data, function (d) { return d.pointCount; });
  var max = d3.max(data, function (d) { return d.pointCount; });

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
    .attr('width', WIDTH + margin.left + margin.right)
    .attr('height', WIDTH + margin.left + margin.right)
    .append('g')

/*  svg.append('g')
    .call(yaxis)
    .attr('id', 'yaxis');

  svg.append('g')
    .attr("transform", "translate(0," + w + ")")
    .attr('id', 'xaxis')
    .call(xaxis); */

  const rects = svg.selectAll('rect')
    .data(data, function (d) { return d; })
    .enter().append('rect')
    .attr('x', function (d, i) { return x(d.upperLeft[0]); })
    .attr('y', function (d) { return y(d.lowerRight[1]); })
    .attr('width', function (d) { return rectWidth; })
    .attr('height', function (d) { return rectHeight; })
    .attr('fill', function (d) { return logColorScale(Math.log(d.pointCount + (1 - min))); })
    .on('mouseover', function (d) {
    });

  $("svg").css({ top: $('#animation').offset().top, left: WIDTH + 50, position: 'absolute' });

  d3.selectAll('g.tick')
    .style('stroke', '#FFFFFF'); 

  document.getElementById("chart").style.width = document.getElementById("render").style.width;


  drawContour(contourOptions);
}

function renderContour(d) {
  var attsContour = {
    'width': $('#bin_num')[0].value,
    'height': $('#bin_num')[0].value,
    'values': []
  }

  for (i = 0; i < d['length']; i++) {
    attsContour['values'].push(Math.log(1+d[i]['pointCount']));
  }

  var min = d3.min(attsContour['values']);
  var max = d3.max(attsContour['values']);

  var svg = d3.select('svg').append('g')
    .attr('id', 'contour')
    .attr('width', $('rect').width() * $('#bin_num')[0].value)
    .attr('height', $('rect').height() * $('#bin_num')[0].value)
    .attr('stroke-width', "0.5")
    .attr('stroke', '#00ffff');

  var width = +svg.attr("width");

var interpolateTerrain = function(t) { '#ff6d3d' },
    color = interpolateTerrain(1);

  var interpolateTerrain = function (t) { 0 };

  var color = d3.scaleSequential(interpolateTerrain).domain([min, max]);

  svg.selectAll("path")
    .data(d3.contours()
      .size([attsContour.width, attsContour.height])
      .thresholds(d3.range(min, max, ((max - min) / 20)))
      .smooth('smooth')
      (attsContour['values']))
    .enter().append("path")
    .attr("d", d3.geoPath(d3.geoIdentity().scale(width / $('#bin_num')[0].value)))
    .attr('transform', 'translate(20,20)')
    .attr("fill", '#00000000');

    $("#contour").css({ top: $('#chart').offset().top });


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

function d3PointGen(json) {
  if (camera.type == "PerspectiveCamera") {
    return;
  }

  updateFrustrum();

  console.log(json);
  var arr, mat;

  var h_points = [];
  var h_val = [];

  var minX = 0;
  var maxX = 0;

  var minY = 0;
  var maxY = 0;

  var count = 0;

  if (json['type'] == 'star') {
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
      if (json['field'] != 'NumDen') {
        if (json['plot'] == 0)
          h_val.push(heatmap_JSON[json['field']][i]);
        else
          h_val.push(contour_JSON[json['field']][i]);
      }

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

  return (makeGrid(bbox, h_points, h_val));
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

function update() {
  particleUpdate();
  starPoints.geometry.verticesNeedUpdate = true; 
  cameraUpdate(0.001);

  updateFrustrum();

  if (currentlyPressedKey[32]) {
       drawHeatmap(heatmapOptions);
  }

  renderer.render(scene, camera);

  id = requestAnimationFrame(update);
}

function populateSelect(tag, obj) {
  for (var i = 0; i < Object.keys(obj).length; i++) {
    $(tag).append('<option value=' + Object.keys(obj)[i] + '>' + Object.values(obj)[i] + '</option>');
  }
}

$(document).ready(function () {
  $('#d3_table').toggle("visible");
  init();

  $("#P_cam").click(function () {
    if (camera && camera.type == "OrthographicCamera") {
      camera_p = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
      camera_p.position.x = camera.position.x;
      camera_p.position.y = camera.position.y;
      camera_p.position.z = camera.position.z;

      camera = camera_p;
      d3.selectAll("svg").remove();
      $('#d3_table').toggle("visible");
    }
  });

  $("#O_cam").click(function () {
    if (camera && camera.type == "PerspectiveCamera") {
      camera_o = new THREE.OrthographicCamera(-ASPECT * viewSize / 2, ASPECT * viewSize / 2, viewSize / 2, -viewSize / 2, -camera.position.z, FAR);
      camera_o.position.x = camera.position.x;
      camera_o.position.y = camera.position.y;
      camera_o.position.z = camera.position.z;

      camera = camera_o;
      $('#d3_table').toggle("visible");

      $('#pType').val('star');
      $('#pType').trigger('change');

      $('#pType_cont').val('star');
      $('#pType_cont').trigger('change');
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

  $('#pType').change(function () {
    heatmapOptions.type = this.value;
    heatmapOptions.field = 'NumDen';
    heatmapOptions.subfield = '';

    drawHeatmap(heatmapOptions);

    $('#pField').children().remove();
    $('#pSubField').children().remove();

    if (this.value == 'star') 
      populateSelect('#pField', starList);
    else if (this.value == 'gas') 
      populateSelect('#pField', gasList);
  });

  $('#pField').change(function () {
    heatmapOptions.field = this.value;
    heatmapOptions.subfield = '';

    $('#pSubField').children().remove();

    if (this.value == 'Velocities')
      populateSelect('#pSubField', velList);
    else if (this.value == 'GFM_StellarPhotometrics')
      populateSelect('#pSubField', magList);
    else {
      hcJSON(heatmapOptions);
    }
  });

  $('#pSubField').change(function () {
    heatmapOptions.subfield = this.value;
    hcJSON(heatmapOptions);
  });
});
