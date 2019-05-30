var viewSize = 1000;

var scene, renderer, container, camera, controls;

var path = 'http://' + '10.128.145.6' + ':5000';

var id = null;

var currentlyPressedKey = {};

var frustum = new THREE.Frustum();

var form = document.getElementById('simulForm');

function updateFrustrum() {
  camera.updateProjectionMatrix();
  camera.updateMatrix(); // make sure camera's local matrix is updated
  camera.updateMatrixWorld(); // make sure camera's world matrix is updated
  camera.matrixWorldInverse.getInverse(camera.matrixWorld);

  frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
}

function PyJSON(parts) {
  console.log(parts);
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

function handleKeyDown(event) {
  currentlyPressedKey[event.keyCode] = true;
}

function handleKeyUp(event) {
  currentlyPressedKey[event.keyCode] = false;
}

function cameraUpdate(zFac) {
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

  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
}