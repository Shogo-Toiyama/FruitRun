import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Initialize player 
let playerX = 0;
const keyboard = {};
const timer = new THREE.Timer();

// Environment settings
const pathLength = 1000;
const pathWidth = 10;
const pathHeight = 0.1;
const grassWidth = 500; 
const y = 0.5;

// Fruit settings
let basketFruitGroup;
const droppedFruits = [];

// Obstacle settings
const clock = new THREE.Clock();
const obstacles = [];
const spawn_dist = -150; 

// Game states
const STATES = {
    MENU: 'MENU',
    COUNTDOWN: 'COUNTDOWN',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER',
    CLEAR: 'CLEAR'
};
let gameState = STATES.MENU;
let storyTimeouts = [];

// Invincibility state
let isInvincible = false;
let invincibilityTimer = 0;
const INVINCIBILITY_DURATION = 1.5;

// HP state
const MAX_HP = 10;
let playerHP = MAX_HP;

// Distance & Speed settings
const GOAL_DISTANCE = 500;
const BASE_SPEED = 30.0;
const MAX_SPEED = 80.0;

let distanceTraveled = 0;
let currentSpeed = BASE_SPEED;
let distanceSinceLastSpawn = 0;
let nextSpawnDistance = 30.0 + Math.random() * 40.0;

let scene, camera, renderer, controls, player, grassTexture, pathTexture, goalHouseMesh = null;
let runTime = 0;

function init() {
    // Initalize background
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xb8f1ff, 50, 160);

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.z = 6;
    camera.position.y = 5;

    // Render
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );    

    // Don't allow for control for the actual game
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 5, 0); // Where the camera is looking towards.

    initLighting();
    initEnvironment();
    addKeysListener();
    setupUIListeners();
    playStoryLine();
    renderer.setAnimationLoop( animate );

}

function initLighting() {
    // Directional light
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7);
    scene.add(light);    

    // Ambient light
    const ambient = new THREE.AmbientLight(0xffbb88, 0.3);
    scene.add(ambient);    
}

function initEnvironment() {
    // Grass
    const textureLoader = new THREE.TextureLoader();
    grassTexture = textureLoader.load('/textures/grass_texture_test.jpg');
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(50, 100);
    grassTexture.colorSpace = THREE.SRGBColorSpace;

    const grass = new THREE.Mesh(
        new THREE.PlaneGeometry(grassWidth, pathLength),
        new THREE.MeshToonMaterial({ map: grassTexture })
    );
    grass.matrixAutoUpdate = false;
    let grass_T = new THREE.Matrix4();
    grass_T.multiplyMatrices(rotationMatrixX(-(Math.PI)/2), grass_T);
    grass.matrix.copy(grass_T);
    scene.add( grass );
    
    // Path
    pathTexture = textureLoader.load('/textures/dirt_texture_test.jpg');
    pathTexture.wrapS = THREE.RepeatWrapping;
    pathTexture.wrapT = THREE.RepeatWrapping;
    pathTexture.repeat.set(2, 200);
    pathTexture.colorSpace = THREE.SRGBColorSpace;

    const path = new THREE.Mesh(
        new THREE.BoxGeometry( pathWidth, pathHeight, pathLength ),
        new THREE.MeshToonMaterial({ map: pathTexture })
    );
    path.position.y = 0.1;
    scene.add( path );

    // Player
    player = new THREE.Group();

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 32, 32),
        new THREE.MeshToonMaterial({ color: 0xffe6ce })
    );
    head.position.y = 1.5;
    player.add(head);

    const hat = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshToonMaterial({ color: 0xff0000 })
    );
    hat.position.y = 1.6;
    player.add(hat);

    const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.2, 0.1, 32),
        new THREE.MeshToonMaterial({ color: 0xff0000 })
    );
    brim.position.y = 1.6;
    player.add(brim);

    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.8, 1.5, 32),
        new THREE.MeshToonMaterial({ color: 0xff7777 })
    );
    body.position.y = 0.2;
    player.add(body);

    const leftArm = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 1, 32),
        new THREE.MeshToonMaterial({ color: 0xff7777 })
    );
    leftArm.position.set(-0.5, 0.6, 0);
    leftArm.rotation.z = - Math.PI / 5;
    player.add(leftArm);

    const rightArm = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 1, 32),
        new THREE.MeshToonMaterial({ color: 0xff7777 })
    );
    rightArm.position.set(0.5, 0.6, 0);
    rightArm.rotation.z = Math.PI / 5;
    player.add(rightArm);

    const basket = new THREE.Group();

    for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.15*i+0.3, 0.04, 8, 32),
            new THREE.MeshToonMaterial({ color: 0xb06545 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = i * 0.2;
        basket.add(ring);
    }

    for (let i = 0; i < 5; i++) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.6 - 0.1 * Math.abs(i-2), 0.04, 8, 32, -Math.PI),
            new THREE.MeshToonMaterial({ color: 0xb06545 })
        );
        ring.position.z = i * 0.2 - 0.4;
        ring.position.y = 0.45;
        basket.add(ring);
    }

    for (let i = 0; i < 5; i++) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.6 - 0.1 * Math.abs(i-2), 0.04, 8, 32, -Math.PI),
            new THREE.MeshToonMaterial({ color: 0xb06545 })
        );
        ring.rotation.y = Math.PI/2;
        ring.position.x = i * 0.2 - 0.4;
        ring.position.y = 0.45;
        basket.add(ring);
    }

    const handle = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.08, 8, 32, Math.PI),
        new THREE.MeshToonMaterial({ color: 0xb06545 })
    );
    handle.position.y = 0.35;
    handle.rotation.y = Math.PI / 2;
    basket.add(handle);

    basket.rotation.z = Math.PI / 5;
    basket.position.set(1.5, -0.4, 0);
    player.add(basket);

    basketFruitGroup = new THREE.Group();
    basket.add(basketFruitGroup);
    initFruit();

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
    // Scale lateral movement speed
    const activePlayerSpeed = currentSpeed * 0.2;

    // Left movement on A
    if(keyboard["KeyA"] || keyboard["ArrowLeft"]) {
        playerX -= activePlayerSpeed * delta;
    }
    // right movement on D
    if(keyboard["KeyD"] || keyboard["ArrowRight"]) {
        playerX += activePlayerSpeed * delta;
    }
    playerX = Math.max(-4, Math.min(4, playerX));
    player.position.x = playerX;
}

function createTree() {
    const tree = new THREE.Group();
    
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 2, 32),
        new THREE.MeshToonMaterial({ color: 0x8b4513 })
    );
    trunk.position.y = 0;
    tree.add(trunk);

    const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(1, 3, 32),
        new THREE.MeshToonMaterial({ color: 0x228b22 })
    );
    leaves.position.y = 2;
    tree.add(leaves);

    return tree;
}

function createHouse() {
    const house = new THREE.Group();

    // Wall
    const bodyGeom = new THREE.BoxGeometry(10, 5, 8);
    const bodyMat = new THREE.MeshToonMaterial({ color: 0xfffdd0 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 1.5; 
    house.add(body);

    // Roof
    const roofGeom = new THREE.ConeGeometry(8, 5, 4);
    const roofMat = new THREE.MeshToonMaterial({ color: 0xcd5c5c });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 6;
    house.add(roof);

    // Chimney
    const chimneyGeom = new THREE.BoxGeometry(1.2, 3.0, 1.2);
    const chimneyMat = new THREE.MeshToonMaterial({ color: 0x8b4513 });
    const chimney = new THREE.Mesh(chimneyGeom, chimneyMat);
    chimney.position.set(3, 6.5, 0);
    house.add(chimney);

    return house;
}

function spawnObstacle(x, z) {
    const obs_type = Math.floor(Math.random() * 3);
    let obstacle;
    let geometry;
    let material;

    if (obs_type === 0) {
        // Rock
        geometry = new THREE.DodecahedronGeometry(1.5, 0);
        material = new THREE.MeshToonMaterial({ color: 0x808080 });
        obstacle = new THREE.Mesh(geometry, material);
    } else if (obs_type === 1) {
        // Log
        geometry = new THREE.CylinderGeometry(0.7, 0.7, 1.5, 32);
        const barkMaterial = new THREE.MeshToonMaterial({ color: 0x502010 });
        const woodMaterial = new THREE.MeshToonMaterial({ color: 0xffc196 });
        obstacle = new THREE.Mesh(geometry, [barkMaterial, woodMaterial, woodMaterial]);
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

        cur_obs.z += currentSpeed * delta;

        const T = translationMatrix(cur_obs.x, cur_obs.y, cur_obs.z);

        cur_obs.mesh.matrix.copy(T);

        if (cur_obs.z > 10) {
            scene.remove(cur_obs.mesh);
            obstacles.splice(i, 1);
        }
    }
}

function createApple() {
    const apple = new THREE.Group();

    // Fruit body
    const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 10, 10),
        new THREE.MeshToonMaterial({
            color: 0xff0000
        })
    );
    body.position.y = 0.5;
    apple.add(body);

    // Stem
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.05, 0.3, 8),
        new THREE.MeshToonMaterial({color: 0x5a3d28})
    );
    stem.position.set(0, 0.65, 0);
    stem.rotation.z = 0.2;

    apple.add(stem);

    return apple;
}

function initFruit() {
    basketFruitGroup.clear();
    const basketFloor = -0.35;
    for (let i = 0; i < MAX_HP; i++) {
        const basketApple = createApple();
        basketApple.matrixAutoUpdate = true;

        let localX = 0;
        let localY = 0;
        let localZ = 0;
        let layerRadius = 0;
        let angle = 0;

        // First fruit layer
        if (i < 4) {
            layerRadius = 0.25;
            angle = (i/4) * Math.PI * 2;
            localY = basketFloor;
        } else if (i < 9) {
            layerRadius = 0.4;
            const indexInLayer = i - 5;

            angle = (indexInLayer/5) * Math.PI*2 + (Math.PI /5);
            localY = basketFloor + 0.35;
        } else {
            
            localY = basketFloor + 0.35
        }

        localX = Math.cos(angle) * layerRadius;
        localZ = Math.sin(angle) * layerRadius;

        basketApple.position.set(localX, localY, localZ);
        basketFruitGroup.add(basketApple);        
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
    
    if (gameState === STATES.PLAYING || gameState === STATES.COUNTDOWN) {
        runTime += delta * 10.0;
        const bob = Math.abs(Math.sin(runTime)) * 0.12;
        player.position.y = 0.8 + bob;
        player.rotation.x = 0.15 + Math.sin(runTime * 2.0) * 0.05;

        // Scroll texture
        if (grassTexture) {
            grassTexture.offset.y += (currentSpeed * delta) / 10.0;
        }
        if (pathTexture) {
            pathTexture.offset.y += (currentSpeed * delta) / 5.0;
        }

        // Move obstacles
        moveObstacles(ani_delta);

        // Spawn obstacles (during countdown, or during playing if not near the goal)
        if (gameState === STATES.COUNTDOWN || distanceTraveled < (GOAL_DISTANCE - 25)) {
            distanceSinceLastSpawn += currentSpeed * delta;
            if (distanceSinceLastSpawn >= nextSpawnDistance) {
                const lanes = [-3, 0, 3];
                const shuffled = [...lanes].sort(() => 0.5 - Math.random());
                const spawnCount = Math.floor(Math.random() * 2) + 1;
                for (let i = 0; i < spawnCount; i++) {
                    spawnObstacle(shuffled[i], spawn_dist);
                }
                nextSpawnDistance = 30.0 + Math.random() * 40.0;
                distanceSinceLastSpawn = 0;
            }
        }

        if (gameState === STATES.PLAYING) {
            movePlayer(delta);
            animateDroppedFruits(ani_delta);
            checkCollisions();

            // Dynamic Speed: gradually accelerate
            currentSpeed = Math.min(MAX_SPEED, currentSpeed + 1 * delta);

            // Distance tracking
            distanceTraveled += currentSpeed * delta * 0.15;
            updateHUD();

            // Check Goal Reached
            if (distanceTraveled >= GOAL_DISTANCE) {
                setGameState(STATES.CLEAR);
            } else {
                // Move goal house if spawned
                if (goalHouseMesh) {
                    goalHouseMesh.position.z += currentSpeed * delta;
                }

                // Spawn the goal house
                if (!goalHouseMesh && distanceTraveled >= GOAL_DISTANCE - 20) {
                    goalHouseMesh = createHouse();
                    goalHouseMesh.position.set(0, 0.5, spawn_dist);
                    scene.add(goalHouseMesh);
                }
            }
        }
    }

    // Invincibile blinking effect
    if (isInvincible) {
        invincibilityTimer -= delta;
        if (player) {
            player.visible = Math.floor(invincibilityTimer * 10) % 2 === 0;
        }
        if (invincibilityTimer <= 0) {
            isInvincible = false;
            if (player) {
                player.visible = true;
            }
        }
    }

	renderer.render( scene, camera );

    controls.update();

}

// Play the storyline
function playStoryLine() {
    const container = document.getElementById('story-container');
    const startBtn = document.getElementById('start-btn');

    if (!container || !startBtn) return;

    container.innerHTML = '';
    startBtn.classList.add('hidden');
    storyTimeouts.forEach(clearTimeout);
    storyTimeouts = [];

    const storyLines = [
        "You've finished gathering fruit for your family...",
        "Now, it's time to get back home!",
        "Avoid the obstacles in your path.",
        "Every time you collide with an obstacle, you'll lose fruit that could have fed your family!"
    ];

    const lineDelay = 1600;

    storyLines.forEach((text, index) => {
        const p = document.createElement('p');
        p.className = 'story-line';
        p.innerText = text;
        container.appendChild(p);

        const t = setTimeout(() => {
            p.classList.add('visible');
        }, index * lineDelay);
        storyTimeouts.push(t);
    });

    const finalTriggerTime = storyLines.length * lineDelay;
    const btnTimeout = setTimeout(() => {
        startBtn.classList.remove('hidden');
    }, finalTriggerTime);
    storyTimeouts.push(btnTimeout);
}

// UI & Game State
function setGameState(state) {
    gameState = state;
    
    const menuScreen = document.getElementById('menu-screen');
    const countdownScreen = document.getElementById('countdown-screen');
    const pauseScreen = document.getElementById('pause-screen');
    const gameoverScreen = document.getElementById('gameover-screen');
    const clearScreen = document.getElementById('clear-screen');
    const fruitsHud = document.getElementById('fruits-hud');
    const distanceHud = document.getElementById('distance-hud');

    menuScreen.classList.add('hidden');
    countdownScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    clearScreen.classList.add('hidden');

    if (state === STATES.MENU) {
        menuScreen.classList.remove('hidden');
        fruitsHud.classList.add('hidden');
        distanceHud.classList.add('hidden');
    } else if (state === STATES.COUNTDOWN) {
        countdownScreen.classList.remove('hidden');
        fruitsHud.classList.remove('hidden');
        distanceHud.classList.remove('hidden');
    } else if (state === STATES.PLAYING) {
        fruitsHud.classList.remove('hidden');
        distanceHud.classList.remove('hidden');
    } else if (state === STATES.PAUSED) {
        pauseScreen.classList.remove('hidden');
        fruitsHud.classList.remove('hidden');
        distanceHud.classList.remove('hidden');
    } else if (state === STATES.GAMEOVER) {
        gameoverScreen.classList.remove('hidden');
        fruitsHud.classList.remove('hidden');
        distanceHud.classList.remove('hidden');
    } else if (state === STATES.CLEAR) {
        clearScreen.classList.remove('hidden');
        fruitsHud.classList.remove('hidden');
        distanceHud.classList.remove('hidden');
    }
}

function resetGame() {
    // Clear all existing obstacles from scene
    for (let i = obstacles.length - 1; i >= 0; i--) {
        scene.remove(obstacles[i].mesh);
    }
    obstacles.length = 0;

    // Reset goal house
    if (goalHouseMesh) {
        scene.remove(goalHouseMesh);
        goalHouseMesh = null;
    }

    // Reset player position
    playerX = 0;
    if (player) {
        player.position.set(0, 0.8, 0);
        player.rotation.set(0, 0, 0);
        player.visible = true;
    }
    runTime = 0;

    // Reset fruit in basket
    initFruit();

    // Reset distance counters
    distanceTraveled = 0;
    distanceSinceLastSpawn = 0;
    nextSpawnDistance = 30.0 + Math.random() * 40.0;
    currentSpeed = BASE_SPEED;

    // Reset invincibility
    isInvincible = false;
    invincibilityTimer = 0;

    // Reset HP
    playerHP = MAX_HP;
    updateHUD();
}

function updateHUD() {
    const hpValue = document.getElementById('hp-value');
    if (hpValue) {
        hpValue.innerText = playerHP;
    }
    const distanceValue = document.getElementById('distance-value');
    if (distanceValue) {
        distanceValue.innerText = Math.floor(distanceTraveled);
    }
    const speedValue = document.getElementById('speed-value');
    if (speedValue) {
        speedValue.innerText = Math.floor(currentSpeed);
    }
    const goalValue = document.getElementById('goal-value');
    if (goalValue) {
        goalValue.innerText = GOAL_DISTANCE;
    }
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
    document.getElementById('try-again-btn').addEventListener('click', () => {
        setGameState(STATES.MENU);
        resetGame();
    });
    document.getElementById('clear-again-btn').addEventListener('click', () => {
        setGameState(STATES.MENU);
        resetGame();
    });
}

function animateDroppedFruits(delta) {
    const gravity = -9.8;
    const floorY = 0.2;

    for (let i = droppedFruits.length - 1; i >= 0; i--) {
        const fruit = droppedFruits[i];
        fruit.vy += gravity * delta;
        fruit.x += fruit.vx * delta;
        fruit.y += fruit.vy * delta;
        fruit.z += fruit.vz * delta;

        fruit.mesh.matrix.copy(translationMatrix(fruit.x, fruit.y, fruit.z));
        const hitGround = fruit.vy < 0 && fruit.y <= floorY;

        if (hitGround) {
            scene.remove(fruit.mesh);
            droppedFruits.splice(i, 1);
        }
        
    }
}

function checkCollisions() {
    if (isInvincible) return;

    // Collision box dimensions
    const hitWidth = 1.2;
    const hitLength = 1.2;

    for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];

        // Player is at z = 0, x = playerX
        const dx = Math.abs(playerX - obs.x);
        const dz = Math.abs(0 - obs.z);

        if (dx < hitWidth && dz < hitLength) {
            isInvincible = true;
            invincibilityTimer = INVINCIBILITY_DURATION;
            
            playerHP--;
            currentSpeed = BASE_SPEED;
            updateHUD();
            console.log("Collision detected! HP is now:", playerHP);

            if (basketFruitGroup.children.length > 0) {
                const targetFruitIndex = basketFruitGroup.children.length - 1;
                const fruitToDrop = basketFruitGroup.children[targetFruitIndex];
                player.updateMatrixWorld(true);
                const worldPosition = new THREE.Vector3();
                fruitToDrop.getWorldPosition(worldPosition);

                basketFruitGroup.remove(fruitToDrop);

                const looseFruit = createApple();
                looseFruit.matrixAutoUpdate = false;
                looseFruit.matrix.copy(translationMatrix(worldPosition.x, worldPosition.y, worldPosition.z));
                scene.add(looseFruit);

                droppedFruits.push({
                    mesh: looseFruit,
                    x: worldPosition.x,
                    y: worldPosition.y,
                    z: worldPosition.z,
                    vx: 4,
                    vy: 4,
                    vz: 2
                    // vx: 5,
                    // vy: 6 + (Math.random() * 4),
                    // vz: 0.5 + -1*(-1 - Math.random() * 3)
                });
            }

            if (playerHP <= 0) {
                setGameState(STATES.GAMEOVER);
            }
            break; 
        }
    }
}

init();
