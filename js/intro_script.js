const WIDTH = 1000;
const HEIGHT = 1000;
 
const VIEW_ANGLE = 45;
const ASPECT = WIDTH / HEIGHT;
const NEAR = 1;
const FAR = 10000;

var radius = 1000;
var angle = 0;

var scene, renderer, container, camera, controls;
var scene2, renderer2, container2, camera2, axes;
    
var particle_JSON;

var t_particles;

var particleCount;

var form = document.getElementById('snapHaloForm');

var currentlyPressedKey = {};

var frustum = new THREE.Frustum();

var gradient = [
    [0.00, [251,  98,  84]],
    [7.88, [255, 163,  80]],
    [11.4, [255, 243, 151]],
    [20.9, [254, 255, 208]],
    [62.6, [248, 247, 252]], 
    [94.4, [154, 175, 255]]
];

function PyJSON(parts) {
	$.ajax({
        type: 'POST',
        url: "http://127.0.0.1:5000/particle_JSON",
        data: JSON.stringify(parts),
        dataType: 'json',
        contentType: 'application/json; charset=UTF-8',
        success: function(data){
            console.log(data);
            particle_JSON = data;
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
    
    if ((snapNum) && (subHaloNum)){
        var pyJSON = {
            "snapshot": snapNum+'',
            "subhalo": subHaloNum+''
        };
        PyJSON(pyJSON);
        document.getElementById("container").innerHTML = "";
        document.getElementById("inset").innerHTML = "";
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
  matContext.arc(center, center, size/2, 0, 2 * Math.PI, false);
  matContext.closePath();
  matContext.fillStyle = color;
  matContext.fill();
  // need to set needsUpdate
  texture.needsUpdate = true;
  // return a texture made from the canvas
  return texture;
}

// binary search for finding the range for star colors
function colorRange(T, low, high, i){
    if ((T > low[0])&&(T < high[0])){
        return [low, high];
    }
    if (T < low[0]){
        return colorRange(T, gradient[i-2], gradient[i-1], i-2);
    }
    if (T > high[0]){
        return colorRange(T, gradient[i+1], gradient[i+2], i-2);
    }
} 

// calculate distance ratio for star color and return combination
function colorCalc(T){
    var range_T = colorRange(T, gradient[2], gradient[3], 2);
    
    var lb_x = range_T[0][0];
    var lb_rgb = range_T[0][1];
    
    var hb_x = range_T[1][0];
    var hb_rgb = range_T[1][1];
    
    var d_lb = T - lb_x;
    var d_hb = hb_x - T;
    
    var tot_dist = hb_x - lb_x;
    
    var set = [];
    
    for (var i = 0; i < 3; i++){
        set.push(lb_rgb[i] * (1 - d_lb / tot_dist) + hb_rgb[i] * (1 - d_hb / tot_dist) );
    }
    
    var rT = [T, set];
    return(rT);
}

function createParticlesBetter(){
    var geometry = new THREE.BufferGeometry();
    var rgb;
    var positions = [];
    var colors = [];
    var color = new THREE.Color();
    
    particleCount = particle_JSON['count'];
    
    for (var p = 0; p < particleCount; p++){
        // positions
        var pX = particle_JSON['pos-x'][p];
        var pY = particle_JSON['pos-y'][p];
        var pZ = particle_JSON['pos-z'][p];
        
        positions.push(pX, pY, pZ);
        
        // colors
        rgb = colorCalc(particle_JSON['T'][p]);
        
        var r = rgb[1][0] / 255; 
        var g = rgb[1][1] / 255; 
        var b = rgb[1][2] / 255;
        colors.push(r, g, b);
    }
    
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    geometry.addAttribute('color', new THREE.Float32BufferAttribute(colors,3));
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
   // points.frustumCulled = false;
    scene.add(points);
}

function init_scene(){
    // Container
    container = document.querySelector('#container');
    
    radius = 1000;
    angle = 0;
    
    // Camera
    camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR,FAR);
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = radius;
    
    camera.frustumCulled = false;

    // Renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(WIDTH, HEIGHT);
    
   // controls = new THREE.OrbitControls(camera, renderer.domElement);
    
    // Scene
    scene = new THREE.Scene();
    scene.add(camera);
    createParticlesBetter();
    
    // https://stackoverflow.com/questions/16226693/three-js-show-world-coordinate-axes-in-corner-of-scene
    // dom
    container2 = document.getElementById('inset');

    // renderer
    renderer2 = new THREE.WebGLRenderer();
    renderer2.setClearColor( 0xf0f0f0, 1 );
    renderer2.setSize( 100, 100 );
    container2.appendChild( renderer2.domElement );

    // scene
    scene2 = new THREE.Scene();

    // camera
    camera2 = new THREE.PerspectiveCamera( 50, 100 / 100, 1, 1000 );
    camera2.up = camera.up; // important!

    // axes
    axes = new THREE.AxesHelper( 100 );
    scene2.add( axes );
    
    container.appendChild(renderer.domElement);
    
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    
    requestAnimationFrame(update);
}

function handleKeyDown(event) {
    currentlyPressedKey[event.keyCode] = true;
}

function handleKeyUp(event) {
    currentlyPressedKey[event.keyCode] = false;
}

function getPoints(arr){
    var ret = [];
    for (var i = 0; i < particleCount; i++){
        var t = new THREE.Vector3(arr[3*i], arr[3*i+1], arr[3*i+2]);
        if (frustum.containsPoint(t)){
            ret.push(t);
        }
    }
    return(ret);
}

function update () {
   // points.rotation.y += 0.01;
    //radius -= 1;
    //radius = Math.pow((Math.pow(camera.position.x, 2) + Math.pow(camera.position.x, 2) + Math.pow(camera.position.x, 2)), 0.5);

    if(currentlyPressedKey[68]){
        angle += 0.0075;
        camera.position.x = radius * Math.sin(angle);
        camera.position.z = radius * Math.cos(angle);
    }
    
    if(currentlyPressedKey[65]){
        angle -= 0.0075;
        camera.position.x = radius * Math.sin(angle);
        camera.position.z = radius * Math.cos(angle);
    }   
    
    if(currentlyPressedKey[83]){
        if (radius > 1){
            radius += 4;
            camera.position.x = radius * Math.sin(angle);
            camera.position.z = radius * Math.cos(angle);
        }
    }    
    
    if(currentlyPressedKey[87]){
        if (radius - 4 > 1){
            radius -= 4;
            camera.position.x = radius * Math.sin(angle);
            camera.position.z = radius * Math.cos(angle);

        }
    }    
    
    if (currentlyPressedKey[32]){
           getPoints(points.geometry.attributes.position.array);
    }

    camera.lookAt(new THREE.Vector3(0,0,0)); // Set look at coordinate like this
    
    camera.updateMatrix(); // make sure camera's local matrix is updated
    camera.updateMatrixWorld(); // make sure camera's world matrix is updated
    camera.matrixWorldInverse.getInverse( camera.matrixWorld );

    frustum.setFromMatrix( new THREE.Matrix4().multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse ) );
    
    renderer.render(scene, camera);
    renderer2.render(scene2, camera2);
    
    camera2.position.copy( camera.position );
	camera2.position.setLength( 300 );
    camera2.lookAt( scene2.position );
    
    requestAnimationFrame(update);
}

function init(){
    if (form.attachEvent) {
        form.attachEvent("submit", processForm);
    } else {
        form.addEventListener("submit", processForm);
    }
}

init();