const WIDTH = window.innerWidth * 9 / 10;
const HEIGHT = window.innerHeight * 4 / 5;

const VIEW_ANGLE = 45;
const ASPECT = WIDTH / HEIGHT;
const NEAR = 1;
const FAR = 1000;

var viewSize = 1000;

var scene, renderer, container, camera, camera_o, camera_p, controls;

var form = document.getElementById('simulForm');

var path = 'http://' + '10.128.145.111' + ':5000';

var id = null;

var step = 1;
var angle = 0.01;

var currentlyPressedKey = {};

var frustum = new THREE.Frustum();

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

// https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_instancing2.html
function init_sam(d, geometry, g_r) {
  var pos = d['positions'];
  var shape = d['size'];

  particleCount = d['count'];

  var colors = [];

  for (var i = 0; i < geometry.attributes.position.count; i++) {
    if (g_r == 'r_bulge') 
      colors.push(244 / 255, 194 / 255, 66 / 255);
    else 
      colors.push(84 / 255, 84 / 255, 216 / 255);
  }

  geometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  var material = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: THREE.VertexColors });

  var instancePositions = [];
  var instanceQuaternions = [];
  var instanceScales = [];

  for (var p = 0; p < particleCount; p++) {
    var mesh = new THREE.Mesh(geometry, material);

    var position = mesh.position;
    var quaternion = mesh.quaternion;
    var scale = mesh.scale;

    var a = 1000;

    var ra = pos['pos-x'][p] - pos["pos-x-mid"];
    var dec = pos['pos-y'][p] - pos["pos-y-mid"];
    var z_redshift = pos['pos-z'][p];

    pX = -1 * a * z_redshift * Math.cos(dec) * Math.cos(ra);
    pY = 2 * a * z_redshift * Math.cos(dec) * Math.sin(ra);
    pZ = 2 * a * z_redshift * Math.sin(dec);

    if (shape[g_r][p] != 0) {
      i++;
      position.set(pZ, pY, pX);
      var r = shape[g_r][p] / ((1 + z_redshift));

      if (g_r == 'r_bulge') {
        scale.set(r / 10, r / 10, r / 10);
        quaternion.set(0, 0, 0, 0);
      } else {
        scale.set(r / 10, r / 10, 1 / 10);
        quaternion.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
      }
      quaternion.normalize();

      instancePositions.push(position.x, position.y, position.z);
      instanceQuaternions.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
      instanceScales.push(scale.x, scale.y, scale.z);
    }
  }

  var instancedGeometry = new THREE.InstancedBufferGeometry();
  instancedGeometry.index = geometry.index;
  instancedGeometry.verticesNeedUpdate = true
  instancedGeometry.attributes = geometry.attributes;
  instancedGeometry.addAttribute('instancePosition', new THREE.InstancedBufferAttribute(new Float32Array(instancePositions), 3));
  instancedGeometry.addAttribute('instanceQuaternion', new THREE.InstancedBufferAttribute(new Float32Array(instanceQuaternions), 4));
  instancedGeometry.addAttribute('instanceScale', new THREE.InstancedBufferAttribute(new Float32Array(instanceScales), 3));

  var shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShader').textContent,
    vertexColors: true,
    side: THREE.DoubleSide
  });

  var instancedMesh = new THREE.Mesh(instancedGeometry, shaderMaterial);
  instancedMesh.frustumCulled = false;
  scene.add(instancedMesh);

  return (instancedMesh);
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

  camera = new THREE.OrthographicCamera(-ASPECT * viewSize / 20, ASPECT * viewSize / 20, viewSize / 20, -viewSize / 20, 0, FAR);
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 0;
  camera.name = 'cam';
  camera.frustumCulled = false;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(WIDTH, HEIGHT);
  renderer.domElement.id = 'render';

  scene = new THREE.Scene();
  scene.add(camera);

  disks = init_sam(dat, new THREE.CircleBufferGeometry(1, 16), 'r_disk');
  bulges = init_sam(dat, new THREE.SphereBufferGeometry(1, 8, 8, 0, Math.PI, 0, Math.PI), 'r_bulge');

  container.appendChild(renderer.domElement);

  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  document.getElementById("container").style.width = document.getElementById("render").style.width;

  requestAnimationFrame(update);
}

var zFac = 0.0005;

function cameraUpdate() {
  if (currentlyPressedKey[83]) {
    if (camera.type == "OrthographicCamera") {
      if ((camera.right - camera.left) > 1) {
        camera.left -= zFac * WIDTH;
        camera.right += zFac * WIDTH;
        camera.top += zFac * HEIGHT;
        camera.bottom -= zFac * HEIGHT;
      }
    }
    else { camera.position.z += step; }
  }
  if (currentlyPressedKey[87]) {
    if (camera.type == "OrthographicCamera") {
      if ((camera.right - camera.left) > 2) {
        camera.left += zFac * WIDTH;
        camera.right -= zFac * WIDTH;
        camera.top -= zFac * HEIGHT;
        camera.bottom += zFac * HEIGHT;
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
}

function updateFrustrum() {
  camera.updateProjectionMatrix();
  camera.updateMatrix(); // make sure camera's local matrix is updated
  camera.updateMatrixWorld(); // make sure camera's world matrix is updated
  camera.matrixWorldInverse.getInverse(camera.matrixWorld);

  frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
}


function PyJSON(parts) {
  $.ajax({
    type: 'POST',
    url: path + "/particle_JSON",
    data: JSON.stringify(parts),
    dataType: 'json',
    contentType: 'application/json; charset=UTF-8',
    success: function (data) {
      console.log(data);
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

  updateFrustrum();
  renderer.render(scene, camera);

  id = requestAnimationFrame(update);
}

function init() {
  container = document.querySelector('#container');

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(WIDTH, HEIGHT);
  renderer.domElement.id = 'render';
  renderer.powerPreference = "high-performance";

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
}

$(document).ready(function () {
  init();
});