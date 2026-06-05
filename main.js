import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Initialize player 
let playerX = 0;
const playerSpeed = 5.0;
const keyboard = {};
const timer = new THREE.Timer();

// Environment settings
const pathLength = 1000;
const pathWidth = 10;
const pathHeight = 0.1;
const grassWidth = 500; 
const y = 0.5;

// Obstacle settings
const clock = new THREE.Clock();
const obstacles = [];
const obstacle_speed = 20.0;
const spawn_dist = -150; 
let spawnTimer = 0;
let nextSpawnTime = 1.0 + Math.random() * 2.0; 

// Game states
const STATES = {
    MENU: 'MENU',
    COUNTDOWN: 'COUNTDOWN',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED'
};
let gameState = STATES.MENU;

let scene, camera, renderer, controls, cube, player, tree, rock, log;

function init() {
    // Initalize background
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x87CEEB );  

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.z = 6;
    camera.position.y = 5;

    // Render
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );    

    // Don't allow for control for the actual game
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 5, 0); // Where the camera is looking towards.

    initLighting();
    initEnvironment();
    addKeysListener();
    setupUIListeners();
    renderer.setAnimationLoop( animate );

}

function initLighting() {
    // Directional light
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7);
    scene.add(light);    

    // Ambient light
    const ambient = new THREE.AmbientLight(0x404040);
    scene.add(ambient);    
}

function initEnvironment() {
    // Grass
    const grass = new THREE.Mesh(
        new THREE.PlaneGeometry(grassWidth, pathLength),
        new THREE.MeshPhongMaterial({ color: 0x2FA829 })
    );
    grass.matrixAutoUpdate = false;
    let grass_T = new THREE.Matrix4();
    grass_T.multiplyMatrices(rotationMatrixX(-(Math.PI)/2), grass_T);
    grass.matrix.copy(grass_T);
    scene.add( grass );
    
    // Path
    const path = new THREE.Mesh(
        new THREE.BoxGeometry( pathWidth, pathHeight, pathLength ),
        new THREE.MeshPhongMaterial( {color: 0x8b4513})
    );
    path.position.y = 0.1;
    scene.add( path );

    // Cube
    cube = new THREE.Mesh( 
        new THREE.BoxGeometry( 1, 1, 1 ),
        new THREE.MeshBasicMaterial( { color: 0x00ff00 } )
    );
    
    cube.matrixAutoUpdate = false;
    // scene.add( cube );

    // Player
    player = new THREE.Group();

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0xffe6ce })
    );
    head.position.y = 1.5;
    player.add(head);

    const hat = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshPhongMaterial({ color: 0xff0000 })
    );
    hat.position.y = 1.6;
    player.add(hat);

    const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.2, 0.1, 32),
        new THREE.MeshPhongMaterial({ color: 0xff0000 })
    );
    brim.position.y = 1.6;
    player.add(brim);

    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.8, 1.5, 32),
        new THREE.MeshPhongMaterial({ color: 0xff7777 })
    );
    body.position.y = 0.2;
    player.add(body);

    const leftArm = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 1, 32),
        new THREE.MeshPhongMaterial({ color: 0xff7777 })
    );
    leftArm.position.set(-0.5, 0.6, 0);
    leftArm.rotation.z = - Math.PI / 5;
    player.add(leftArm);

    const rightArm = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 1, 32),
        new THREE.MeshPhongMaterial({ color: 0xff7777 })
    );
    rightArm.position.set(0.5, 0.6, 0);
    rightArm.rotation.z = Math.PI / 5;
    player.add(rightArm);

    const basket = new THREE.Group();

    for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.15*i+0.3, 0.04, 8, 32),
            new THREE.MeshPhongMaterial({ color: 0xb06545 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = i * 0.2;
        basket.add(ring);
    }

    for (let i = 0; i < 5; i++) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.6 - 0.1 * Math.abs(i-2), 0.04, 8, 32, -Math.PI),
            new THREE.MeshPhongMaterial({ color: 0xb06545 })
        );
        ring.position.z = i * 0.2 - 0.4;
        ring.position.y = 0.45;
        basket.add(ring);
    }

    for (let i = 0; i < 5; i++) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.6 - 0.1 * Math.abs(i-2), 0.04, 8, 32, -Math.PI),
            new THREE.MeshPhongMaterial({ color: 0xb06545 })
        );
        ring.rotation.y = Math.PI/2;
        ring.position.x = i * 0.2 - 0.4;
        ring.position.y = 0.45;
        basket.add(ring);
    }

    const handle = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.08, 8, 32, Math.PI),
        new THREE.MeshPhongMaterial({ color: 0xb06545 })
    );
    handle.position.y = 0.35;
    handle.rotation.y = Math.PI / 2;
    basket.add(handle);

    basket.rotation.z = Math.PI / 5;
    basket.position.set(1.5, -0.4, 0);
    player.add(basket);

    scene.add(player);
}

function addKeysListener() {
    window.addEventListener('keydown', (event) => {
        keyboard[event.code] = true;
        if (event.code === 'Escape') {
            if (gameState === STATES.PLAYING) {
                setGameState(STATES.PAUSED);
            } else if (gameState === STATES.PAUSED) {
                setGameState(STATES.PLAYING);
            }
        }
    });
    window.addEventListener('keyup', (event) => {
        keyboard[event.code] = false;
    });
}

function movePlayer(delta) {
    // Left movement on A
    if(keyboard["KeyA"] || keyboard["ArrowLeft"]) {
        playerX -= playerSpeed * delta;
    }
    // right movement on D
    if(keyboard["KeyD"] || keyboard["ArrowRight"]) {
        playerX += playerSpeed * delta;
    }
    playerX = Math.max(-4, Math.min(4, playerX));
    player.position.set(playerX, 0.8, 0);
}

function createTree() {
    const tree = new THREE.Group();
    
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 2, 32),
        new THREE.MeshPhongMaterial({ color: 0x8b4513 })
    );
    trunk.position.y = 0;
    tree.add(trunk);

    const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(1, 3, 32),
        new THREE.MeshPhongMaterial({ color: 0x228b22 })
    );
    leaves.position.y = 2;
    tree.add(leaves);

    return tree;
}

function spawnObstacle(x, z) {
    const obs_type = Math.floor(Math.random() * 3);
    let obstacle;
    let geometry;
    let material;

    if (obs_type === 0) {
        // Rock
        geometry = new THREE.DodecahedronGeometry(1.5, 0);
        material = new THREE.MeshPhongMaterial({ color: 0x808080 });
        obstacle = new THREE.Mesh(geometry, material);
    } else if (obs_type === 1) {
        // Log
        geometry = new THREE.CylinderGeometry(0.7, 0.7, 1.5, 32);
        material = new THREE.MeshPhongMaterial({ color: 0x502010 });
        obstacle = new THREE.Mesh(geometry, material);
        obstacle.rotation.x = Math.PI / 2;
        obstacle.rotation.z = Math.PI / 2;
    } else {
        // Tree
        obstacle = createTree();
    }

    obstacle.matrixAutoUpdate = false;
    const initialT = translationMatrix(x, y, z);
    obstacle.matrix.copy(initialT);
    scene.add(obstacle);

    obstacles.push({
        mesh: obstacle,
        x: x,
        y: y,
        z: z
    })
}

function moveObstacles(delta) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const cur_obs = obstacles[i];

        cur_obs.z += obstacle_speed * delta;

        const T = translationMatrix(cur_obs.x, cur_obs.y, cur_obs.z);

        cur_obs.mesh.matrix.copy(T);

        if (cur_obs.z > 10) {
            scene.remove(cur_obs.mesh);
            obstacles.splice(i, 1);
        }
    }
}

// Transformation Matrices
function translationMatrix(tx, ty, tz) {
	return new THREE.Matrix4().set(
		1, 0, 0, tx,
		0, 1, 0, ty,
		0, 0, 1, tz,
		0, 0, 0, 1
	);
}

function rotationMatrixX(theta) {
	return new THREE.Matrix4().set(
    1, 0, 0, 0,
    0, Math.cos(theta), -1*Math.sin(theta), 0,
    0, Math.sin(theta), Math.cos(theta), 0,
    0, 0, 0, 1
	);
}

function rotationMatrixZ(theta) {
	return new THREE.Matrix4().set(
    Math.cos(theta), -1*Math.sin(theta), 0, 0,
    Math.sin(theta), Math.cos(theta), 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
	);
}


function animate(timestamp) {
    timer.update(timestamp);
    const delta = timer.getDelta();
    const ani_delta = clock.getDelta();
    
    if (gameState === STATES.PLAYING) {
        movePlayer(delta);
        moveObstacles(ani_delta);

        // Spawn obstacles at random intervals (0.8 to 2.5 seconds) with 1 or 2 obstacles
        spawnTimer += delta;
        if (spawnTimer >= nextSpawnTime) {
            const lanes = [-3, 0, 3];
            const shuffled = [...lanes].sort(() => 0.5 - Math.random());
            const spawnCount = Math.floor(Math.random() * 2) + 1; // 1 or 2
            for (let i = 0; i < spawnCount; i++) {
                spawnObstacle(shuffled[i], spawn_dist);
            }
            nextSpawnTime = 0.8 + Math.random() * 1.7;
            spawnTimer = 0;
        }
    }

	renderer.render( scene, camera );

    controls.update();

}

// UI & Game State Management Helpers
function setGameState(state) {
    gameState = state;
    
    const menuScreen = document.getElementById('menu-screen');
    const countdownScreen = document.getElementById('countdown-screen');
    const pauseScreen = document.getElementById('pause-screen');

    menuScreen.classList.add('hidden');
    countdownScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');

    if (state === STATES.MENU) {
        menuScreen.classList.remove('hidden');
    } else if (state === STATES.COUNTDOWN) {
        countdownScreen.classList.remove('hidden');
    } else if (state === STATES.PAUSED) {
        pauseScreen.classList.remove('hidden');
    }
}

function resetGame() {
    // Clear all existing obstacles from scene
    for (let i = obstacles.length - 1; i >= 0; i--) {
        scene.remove(obstacles[i].mesh);
    }
    obstacles.length = 0;

    // Reset player position
    playerX = 0;
    if (player) {
        player.position.set(0, 0.8, 0);
    }

    // Reset spawning timer
    spawnTimer = 0;
    nextSpawnTime = 0.8 + Math.random() * 1.7;
}

function startCountdown() {
    setGameState(STATES.COUNTDOWN);
    resetGame();

    const countdownText = document.getElementById('countdown-text');
    let count = 3;
    countdownText.innerText = count;

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownText.innerText = count;
        } else if (count === 0) {
            countdownText.innerText = 'GO!';
        } else {
            clearInterval(interval);
            setGameState(STATES.PLAYING);
        }
    }, 1000);
}

function setupUIListeners() {
    document.getElementById('start-btn').addEventListener('click', () => {
        startCountdown();
    });
    document.getElementById('resume-btn').addEventListener('click', () => {
        setGameState(STATES.PLAYING);
    });
    document.getElementById('restart-btn').addEventListener('click', () => {
        setGameState(STATES.MENU);
        resetGame();
    });
}

init();
