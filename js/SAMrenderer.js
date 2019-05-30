
const WIDTH = window.innerWidth * 9 / 10;
const HEIGHT = window.innerHeight * 4 / 5;

const VIEW_ANGLE = 45;
const ASPECT = WIDTH / HEIGHT;
const NEAR = 1;
const FAR = 1000;

var viewSize = 1000;

var step = 1;
var angle = 0.01;

var zFac = 0.0005;

// https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_instancing2.html
function init_sam(d, geometry, g_r) {
  var pos = d['positions'];
  var shape = d['size'];

  particleCount = d['count'];

  var colors = [];

  for (var i = 0; i < geometry.attributes.position.count; i++) {
    if (g_r == 'r_bulge') 
      colors.push(255 / 255, 0 / 255, 255 / 255);
    else 
      colors.push(0 / 255, 255 / 255, 255 / 255);
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
  cameraUpdate(zFac);

  updateFrustrum();
  renderer.render(scene, camera);

  id = requestAnimationFrame(update);
}

$(document).ready(function () {
  init();

  renderer.powerPreference = "high-performance";
  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 10;
  camera.name = 'cam';
  camera.frustumCulled = false;
});