const WIDTH = window.innerWidth * 4 / 5;
const HEIGHT = window.innerHeight * 4 / 5;

const VIEW_ANGLE = 45;
const ASPECT = WIDTH / HEIGHT;
const NEAR = 0.01;
const FAR = 100000;

var viewSize = 1000;

var scene, renderer, container, camera, camera_o, camera_p, controls;

var form = document.getElementById('simulForm');

var path = 'http://' + '10.128.145.42' + ':5000';

var id = null;

var step = 1;
var angle = 0.01;

var currentlyPressedKey = {};

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

function init_sam(d) {
  var pos = d['positions'];
  var shape = d['size'];

  particleCount = d['count'];

  var geometry = new THREE.CircleGeometry(0.1, 12);
  var material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  material.side = THREE.DoubleSide;

  var sphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  var spherematerial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

  for (var p = 0; p < particleCount; p++) {
    var disk = new THREE.Mesh(geometry, material);
    var sphere = new THREE.Mesh(sphereGeometry, spherematerial);

    var ra = pos['pos-x'][p] - 150.13226;
    var dec = pos['pos-y'][p] - 2.3211206;
    var z_redshift = pos['pos-z'][p];

    var a = 1000;

    pX = -1 * a * z_redshift * Math.cos(dec) * Math.cos(ra);
    pY = a * z_redshift * Math.cos(dec) * Math.sin(ra);
    pZ = a * z_redshift * Math.sin(dec);
    
    // bulge shenanigans 
    sphere.position.x = pZ;
    sphere.position.y = pY;
    sphere.position.z = pX;

    sphere.scale.x = shape['r_bulge'][p] / 2;
    sphere.scale.y = shape['r_bulge'][p] / 2;
    sphere.scale.z = shape['r_bulge'][p] / 2;

    sphere.frustumCulled = false;

    if (sphere.scale.x > 0.00000001) scene.add(sphere);

    // Disk shenanigans 
    disk.position.x = pZ;
    disk.position.y = pY;
    disk.position.z = pX;

    disk.rotation.x = Math.random() * 2 * Math.PI;
    disk.rotation.y = Math.random() * 2 * Math.PI;
    disk.rotation.z = Math.random() * 2 * Math.PI;

    disk.scale.x = shape['r_disk'][p] / 2;
    disk.scale.y = shape['r_disk'][p] / 2;

    disk.frustumCulled = false;

    scene.add(disk);
  }
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

function handleKeyDown(event) {
  currentlyPressedKey[event.keyCode] = true;
}

function handleKeyUp(event) {
  currentlyPressedKey[event.keyCode] = false;
}

function init_scene(dat) {
  if (id !== null) {
    cancelAnimationFrame(id);
  }

  container = document.querySelector('#container');

  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 10;
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
  //createGrids();

  points = init_sam(dat);

 // $('#display_grid')[0].checked = true;
 // $('#display_axes')[0].checked = true;

  container.appendChild(renderer.domElement);

  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  document.getElementById("container").style.width = document.getElementById("render").style.width;

  requestAnimationFrame(update);
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
    else { camera.position.y -= step; }
  }

  if (currentlyPressedKey[74]) {
    camera.rotation.y += angle;
  }
  if (currentlyPressedKey[76]) {
    camera.rotation.y -= angle;
  }

  if (currentlyPressedKey[73]) {
    camera.rotation.x += angle;
  }

  if (currentlyPressedKey[75]) {
    camera.rotation.x -= angle;
  }
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

function processForm(e) {
  if (e.preventDefault) e.preventDefault();

  simul = document.forms.simulForm.simulation.value;
  field = document.forms.simulForm.field.value;
  realization = document.forms.simulForm.realization.value;
  z_l = document.forms.simulForm.redshift_low.value;
  z_h = document.forms.simulForm.redshift_high.value;

  if ((z_l) && (z_h)) {
    var pyJSON = {
      "simulation": simul + '',
      "field": field + '',
      "realization": realization + '',
      "z_l": z_l + '',
      "z_h": z_h + ''
    };
    console.log(pyJSON);
    PyJSON(pyJSON);
    document.getElementById("container").innerHTML = "";
  }

  return false;
}

function update() {
  cameraUpdate();

  renderer.render(scene, camera);

  id = requestAnimationFrame(update);
}

function instancing() {
  var geometry = new THREE.CircleGeometry(1, 12);

  var pCount = 20000;
  
  var instancedGeometry = new THREE.InstancedBufferGeometry();
  
  
  instancedGeometry.index = geometry.index;
  instancedGeometry.maxInstancedCount = pCount;
  
  const matArraySize = pCount * 4
  const matrixArray = [
    new Float32Array(matArraySize),
    new Float32Array(matArraySize),
    new Float32Array(matArraySize),
    new Float32Array(matArraySize),
  ]
  /*
    Object.keys(geometry.attributes).forEach(attributeName => {
    instancedGeometry.attributes[attributeName] = geometry.attributes[attributeName]
  });
  
  for (let i = 0; i < matrixArray.length; i++) {
    instancedGeometry.addAttribute(
      `aInstanceMatrix${i}`,
      new THREE.InstancedBufferAttribute(matrixArray[i], 4)
    )
  }

  const instanceColorArray = new Uint8Array(pCount * 3)
  instancedGeometry.addAttribute(
    'aInstanceColor',
    new THREE.InstancedBufferAttribute(instanceColorArray, 3, true)
  )
  
  */
  var material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  var disk = new THREE.Mesh(geometry, material);

  for (var i = 0; i < pCount; i++) {
    var disk = new THREE.Mesh(geometry, material);

    disk.position.x = Math.random() * 800 - 400;
    disk.position.y = Math.random() * 800 - 400;
    disk.position.z = Math.random() * 800 - 400;

    disk.rotation.x = Math.random() * 2 * Math.PI;
    disk.rotation.y = Math.random() * 2 * Math.PI;
    disk.rotation.z = Math.random() * 2 * Math.PI;

    disk.scale.x = Math.random() + 0.5;
    disk.scale.y = Math.random() + 0.5;

    scene.add(disk);
  }
}


function init() {
  container = document.querySelector('#container');

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(WIDTH, HEIGHT);
  renderer.domElement.id = 'render';

  scene = new THREE.Scene();
  container.appendChild(renderer.domElement);

  if (form.attachEvent) {
    form.attachEvent("submit", processForm);
  } else {
    form.addEventListener("submit", processForm);
  }

  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 10;
  camera.name = 'cam';
  camera.frustumCulled = false;

  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;

 // instancing();
  update();
}

$(document).ready(function () {
  init();
});