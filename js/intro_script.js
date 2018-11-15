const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
 
const VIEW_ANGLE = 45;
const ASPECT = WIDTH / HEIGHT;
const NEAR = 0.1;
const FAR = 8000;

var scene, renderer, container, camera;
var xpos, ypos, zpos;
var particles;

function createParticles(){
    var vertices = [];
    var geometry = new THREE.BufferGeometry();

    for (var i = 0; i < 10000; i++){
        var x = 2000 * Math.random() - 1000;
        var y = 2000 * Math.random() - 1000;
        var z = 2000 * Math.random() - 1000;

        vertices.push(x,y,z); 
    }

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
        xpos = (data.x);
        ypos = (data.y);
        zpos = data.z;
    });
}

function init(){
    readData();
    
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
}

function update () {
//particles.rotation.y += 0.001;
    renderer.render(scene, camera);
    //    console.log(particles);

    requestAnimationFrame(update);
}

init();
requestAnimationFrame(update);