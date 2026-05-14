import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
// Initialize player 
let playerX = 0;
const playerSpeed = 5.0;
const keyboard = {};
const clock = new THREE.Clock();

// Initialize path
const pathLength = 500;
const pathWidth = 4.0;
const pathHeight = 10;

// Initalize background
scene.background = new THREE.Color( 0x87CEEB );

function addKeysListener() {
    window.addEventListener('keydown', (event) => {
        keyboard[event.code] = true;
    });
    window.addEventListener('keyup', (event) => {
        keyboard[event.code] = false;
    });
}
addKeysListener();

// Render
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

function addLighting() {
    // Directional light
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7);
    scene.add(light);    

    // Ambient light
    const ambient = new THREE.AmbientLight(0x404040);
    scene.add(ambient);    
}
addLighting();

// Cube
const cube = new THREE.Mesh( 
    new THREE.BoxGeometry( 1, 1, 1 ),
    new THREE.MeshBasicMaterial( { color: 0x00ff00 } )
);
cube.matrixAutoUpdate = false;
scene.add( cube );

// Path
const path = new THREE.Mesh(
    new THREE.BoxGeometry( 10, 0.1, 50 ),
    new THREE.MeshPhongMaterial( {color: 0x8b4513})
)
scene.add( path );

camera.position.z = 5;
camera.position.y = 1;

const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 10, 10); // Where the camera is.
controls.target.set(0, 5, 0); // Where the camera is looking towards.

function translationMatrix(tx, ty, tz) {
	return new THREE.Matrix4().set(
		1, 0, 0, tx,
		0, 1, 0, ty,
		0, 0, 1, tz,
		0, 0, 0, 1
	);
}

function movePlayer(delta) {
    // Left movement on A
    if(keyboard["KeyA"]) {
        playerX -= playerSpeed * delta;
    }
    // right movement on D
    if(keyboard["KeyD"]) {
        playerX += playerSpeed * delta;
    }
    cube.matrix.copy(translationMatrix(playerX, 0, 0));
}

function animate() {
    const delta = clock.getDelta();
    movePlayer(delta);
    // followPlayer();

	renderer.render( scene, camera );

    controls.update();

}

function createAxisLine(color, start, end) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({ color: color });
    return new THREE.Line(geometry, material);
}

// Create axis lines
const xAxis = createAxisLine(0xff0000, new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 0, 0)); // Red
const yAxis = createAxisLine(0x00ff00, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 5, 0)); // Green
const zAxis = createAxisLine(0x0000ff, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 5)); // Blue

// Add axes to scene
scene.add(xAxis);
scene.add(yAxis);
scene.add(zAxis);
