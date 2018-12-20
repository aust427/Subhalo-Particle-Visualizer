const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
 
const VIEW_ANGLE = 45;
const ASPECT = WIDTH / HEIGHT;
const NEAR = 0.1;
const FAR = 8000;

var scene, renderer, container, camera;
var xpos, ypos, zpos;
var particles;

var vertices = [];
var loaded = false;

function createParticles(){
    var geometry = new THREE.BufferGeometry();

    geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );

    material = new THREE.PointsMaterial( { 
        size: Math.random()*8, 
        sizeAttenuation: false, 
        alphaTest: 0.5, 
        transparent: true
    } );
				
    material.color.setHSL( 1.0, 0.3, 0.7 );

    return new THREE.Points( geometry, material );
}

function readData(){
    d3.csv("py/135_Coordinates.csv", function(data) {
        xpos = data.x;
        ypos = data.y;
        zpos = data.z;
        vertices.push(xpos, ypos, zpos);
    });
}

function init(){
    
    container = document.querySelector('#container');
    
    // Camera
    camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR,FAR);
    camera.position.set = (0, 0, 0);
    
    // Renderer
    renderer = new THREE.WebGLRenderer();
    //renderer.setClearColor(new THREE.Color(0,1));
    renderer.setSize(WIDTH, HEIGHT);
    
    particles = createParticles();
    
    // Scene
    scene = new THREE.Scene();
    scene.add(camera);
    scene.add( particles );
    
    container.appendChild(renderer.domElement);
    update();
}


function update () {
//particles.rotation.y += 0.001;
    renderer.render(scene, camera);
    requestAnimationFrame(update);
}

readData();
init();
requestAnimationFrame(update);