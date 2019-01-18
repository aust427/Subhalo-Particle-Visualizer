const WIDTH = 1200;
const HEIGHT = 1200;
 
const VIEW_ANGLE = 45;
const ASPECT = WIDTH / HEIGHT;
const NEAR = 1;
const FAR = 8000;

var scene, renderer, container, camera, controls;
var scene2, renderer2, container2, camera2, axes;
    
var my_JSON_object;

var t_particles;

var form = document.getElementById('snapHaloForm');

var gradient = [
    [0.00, [251, 98, 84]],
    [7.88, [255,163, 80]],
    [11.4, [255,243,151]],
    [20.9, [254,255,208]],
    [62.6, [248,247,252]], 
    [94.4, [154,175,255]]
];

function requestJSON(snapshot, subhalo){
    console.log(snapshot, subhalo);
    var request = new XMLHttpRequest();
    request.open("GET", "../py/pos-T-data.json", false);
    request.send(null)
    my_JSON_object = JSON.parse(request.responseText);
}

// https://stackoverflow.com/questions/5384712/capture-a-form-submit-in-javascript
function processForm(e) {
    if (e.preventDefault) e.preventDefault();

    /* do what you want with the form */
    snapNum = document.forms.snapHaloForm.snapshot.value;
    subHaloNum = document.forms.snapHaloForm.subhalo.value;
    
    if ((snapNum) && (subHaloNum)){
        requestJSON(snapNum, subHaloNum);
        document.getElementById("container").innerHTML = "";
        document.getElementById("inset").innerHTML = "";
        init_scene();
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

function colorRange(T, low, high, i){
   // console.log(T, low[0], high[0]);
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

function colorCalc(T){
    var range_T = colorRange(T, gradient[2], gradient[3], 2);
    return(range_T[0]);
}

function createParticlesBetter(){
    var particleCount = 29934,
    geometry = new THREE.BufferGeometry();
    var rgb;
    var positions = [];
    var colors = [];
    var color = new THREE.Color();
    
    for (var p = 0; p < particleCount; p++){
        // positions
        var pX = my_JSON_object['pos-x'][p];
        var pY = my_JSON_object['pos-y'][p];
        var pZ = my_JSON_object['pos-z'][p];
        
        positions.push(pX, pY, pZ);
        
        // colors
        rgb = colorCalc(my_JSON_object['T'][p]);
        
        var r = rgb[1][0] / 255; 
        var g = rgb[1][1] / 255; 
        var b = rgb[1][2] / 255;
        colors.push(r, g, b);
    }
    
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    geometry.addAttribute('color', new THREE.Float32BufferAttribute(colors,3));
  //  geometry.computeBoundingSphere();
    
    mat = createCanvasMaterial('#FFFFFF', 256);
    
    var pMaterial = new THREE.PointsMaterial({
       // color: 0xFFFF00,
        size: 3,
        map: mat,
        vertexColors: THREE.VertexColors,
        blending: THREE.AdditiveBlending,
        alphaTest: 0.3
        //transparent: true
    });    
    
    points = new THREE.Points(geometry, pMaterial); 
    scene.add(points);
}

function init_scene(){
    // Container
    container = document.querySelector('#container');
    
    // Camera
    camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR,FAR);
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 1000;
   // camera.lookAt(new THREE.Vector3(0,0,0)); // Set look at coordinate like this

    // Renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(WIDTH, HEIGHT);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    
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
    requestAnimationFrame(update);
}

function update () {
    renderer.render(scene, camera);
    
    renderer2.render(scene2, camera2);
    camera2.position.copy( camera.position );
	camera2.position.sub( controls.target ); // added by @libe
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