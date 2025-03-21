// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
// Create a separate container for the renderer
const rendererContainer = document.createElement('div');
rendererContainer.id = 'rendererContainer';
document.body.appendChild(rendererContainer);
rendererContainer.appendChild(renderer.domElement);

// Add a ground plane
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x228B22 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Add a simple base (a cube)
const baseGeometry = new THREE.BoxGeometry(5, 2, 5);
const baseMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
const base = new THREE.Mesh(baseGeometry, baseMaterial);
base.position.y = 1;
scene.add(base);

// Base health
let baseHealth = 100;
let healthDisplay;

// Wood resource for building
let wood = 50;
const maxWood = 100;
let woodDisplay;

// Metal resource for building
let metal = 20;
const maxMetal = 50;
let metalDisplay;

// Score system
let score = 0;
let scoreDisplay;

// High scores (stored in localStorage)
let highScores = JSON.parse(localStorage.getItem('highScores')) || [];

// Player speed
let speed = 0.1;

// Difficulty settings
let difficulty = "medium";
let gameInProgress = false;
const difficultySettings = {
    easy: { spawnInterval: 15000, zombieDamage: 5, wallHealth: 40, playerSpeed: 0.15 },
    medium: { spawnInterval: 10000, zombieDamage: 10, wallHealth: 30, playerSpeed: 0.1 },
    hard: { spawnInterval: 7000, zombieDamage: 15, wallHealth: 20, playerSpeed: 0.05 }
};

// Build mode and rotation toggle
let buildMode = false; // Can be false, "wood", or "metal"
let buildModeDisplay;
let rotationAngle = 0;

// Function definitions
function applyDifficulty() {
    const settings = difficultySettings[difficulty];
    speed = settings.playerSpeed;
}

function updateHealthDisplay() {
    if (healthDisplay && document.body.contains(healthDisplay)) {
        healthDisplay.textContent = `Base Health: ${baseHealth}`;
        console.log("Base health updated to:", baseHealth);
        if (baseHealth <= 0) {
            console.log("Game over condition met, baseHealth:", baseHealth);
            healthDisplay.textContent = "Game Over! Base Destroyed. High Scores:\n";
            highScores.sort((a, b) => b - a);
            highScores = highScores.slice(0, 5);
            highScores.forEach((highScore, index) => {
                healthDisplay.textContent += `${index + 1}. ${highScore}\n`;
            });
            playSound(gameoverSound);
            zombies.forEach(zombie => scene.remove(zombie));
            zombies.length = 0;
            clearInterval(spawnInterval);
            const gameUI = document.getElementById('gameUI');
            if (gameUI) {
                if (!gameUI.contains(healthDisplay)) {
                    console.log("healthDisplay not in gameUI, re-adding");
                    gameUI.appendChild(healthDisplay);
                }
                if (woodDisplay && !gameUI.contains(woodDisplay)) {
                    console.log("woodDisplay not in gameUI, re-adding");
                    gameUI.appendChild(woodDisplay);
                }
                if (metalDisplay && !gameUI.contains(metalDisplay)) {
                    console.log("metalDisplay not in gameUI, re-adding");
                    gameUI.appendChild(metalDisplay);
                }
                if (buildModeDisplay && !gameUI.contains(buildModeDisplay)) {
                    console.log("buildModeDisplay not in gameUI, re-adding");
                    gameUI.appendChild(buildModeDisplay);
                }
                if (scoreDisplay && !gameUI.contains(scoreDisplay)) {
                    console.log("scoreDisplay not in gameUI, re-adding");
                    gameUI.appendChild(scoreDisplay);
                }
                const restartButton = document.getElementById('restartButton');
                if (restartButton) {
                    if (!gameUI.contains(restartButton)) {
                        console.log("Restart button not in gameUI, re-adding");
                        gameUI.appendChild(restartButton);
                    }
                    restartButton.style.display = "block";
                    restartButton.style.zIndex = '1001';
                    restartButton.style.pointerEvents = 'auto';
                    restartButton.style.opacity = '1';
                    restartButton.style.visibility = 'visible';
                    const computedStyle = window.getComputedStyle(restartButton);
                    console.log("Restart button computed styles:", {
                        display: computedStyle.display,
                        zIndex: computedStyle.zIndex,
                        pointerEvents: computedStyle.pointerEvents,
                        opacity: computedStyle.opacity,
                        visibility: computedStyle.visibility,
                        position: computedStyle.position,
                        top: computedStyle.top,
                        left: computedStyle.left
                    });
                } else {
                    console.error("Restart button not found in updateHealthDisplay!");
                }
                gameUI.style.display = 'block';
                gameUI.style.pointerEvents = 'none';
                gameUI.style.opacity = '1';
                gameUI.style.visibility = 'visible';
            }
            gameInProgress = false;
            const difficultySelect = document.getElementById('difficultySelect');
            if (difficultySelect) {
                difficultySelect.disabled = false;
            }
            if (highScores.length < 5 || score > highScores[highScores.length - 1]) {
                highScores.push(score);
                highScores.sort((a, b) => b - a);
                highScores = highScores.slice(0, 5);
                localStorage.setItem('highScores', JSON.stringify(highScores));
                console.log("New high score saved:", highScores);
            }
        }
    } else {
        console.log("healthDisplay not found or not in DOM");
    }
}

function updateWoodDisplay() {
    if (woodDisplay && document.body.contains(woodDisplay)) {
        if (wood > maxWood) {
            wood = maxWood;
            console.log("Wood capped at:", maxWood);
        }
        woodDisplay.textContent = `Wood: ${wood}`;
    }
}

function updateMetalDisplay() {
    if (metalDisplay && document.body.contains(metalDisplay)) {
        if (metal > maxMetal) {
            metal = maxMetal;
            console.log("Metal capped at:", maxMetal);
        }
        metalDisplay.textContent = `Metal: ${metal}`;
    }
}

function updateScoreDisplay() {
    if (scoreDisplay && document.body.contains(scoreDisplay)) {
        scoreDisplay.textContent = `Score: ${score}`;
    }
}

function playSound(sound) {
    sound.currentTime = 0;
    sound.play().catch(error => {
        console.log("Error playing sound:", error);
        document.body.addEventListener('click', () => sound.play(), { once: true });
    });
}

function startGame() {
    const difficultySelect = document.getElementById('difficultySelect');
    if (difficultySelect) {
        difficulty = difficultySelect.value;
        applyDifficulty();
        console.log("Game started with difficulty:", difficulty);
    }

    const startScreen = document.getElementById('startScreen');
    if (startScreen) {
        startScreen.style.display = 'none';
        console.log("Start screen hidden, display:", startScreen.style.display);
    }

    const gameUI = document.getElementById('gameUI');
    if (gameUI) {
        const restartButton = document.getElementById('restartButton');
        Array.from(gameUI.children).forEach(child => {
            if (child !== restartButton) {
                gameUI.removeChild(child);
            }
        });

        healthDisplay = document.createElement('div');
        healthDisplay.id = 'healthDisplay';
        healthDisplay.style.position = 'absolute';
        healthDisplay.style.top = '10px';
        healthDisplay.style.left = '10px';
        healthDisplay.style.color = 'white';
        healthDisplay.style.fontSize = '24px';
        healthDisplay.style.fontFamily = 'Arial';
        healthDisplay.style.zIndex = '1001';
        healthDisplay.style.opacity = '1';
        healthDisplay.style.visibility = 'visible';
        healthDisplay.textContent = `Base Health: ${baseHealth}`;
        gameUI.appendChild(healthDisplay);

        woodDisplay = document.createElement('div');
        woodDisplay.id = 'woodDisplay';
        woodDisplay.style.position = 'absolute';
        woodDisplay.style.top = '40px';
        woodDisplay.style.left = '10px';
        woodDisplay.style.color = 'white';
        woodDisplay.style.fontSize = '24px';
        woodDisplay.style.fontFamily = 'Arial';
        woodDisplay.style.zIndex = '1001';
        woodDisplay.style.opacity = '1';
        woodDisplay.style.visibility = 'visible';
        woodDisplay.textContent = `Wood: ${wood}`;
        gameUI.appendChild(woodDisplay);

        metalDisplay = document.createElement('div');
        metalDisplay.id = 'metalDisplay';
        metalDisplay.style.position = 'absolute';
        metalDisplay.style.top = '70px';
        metalDisplay.style.left = '10px';
        metalDisplay.style.color = 'white';
        metalDisplay.style.fontSize = '24px';
        healthDisplay.style.fontFamily = 'Arial';
        metalDisplay.style.zIndex = '1001';
        metalDisplay.style.opacity = '1';
        metalDisplay.style.visibility = 'visible';
        metalDisplay.textContent = `Metal: ${metal}`;
        gameUI.appendChild(metalDisplay);

        buildModeDisplay = document.createElement('div');
        buildModeDisplay.id = 'buildModeDisplay';
        buildModeDisplay.style.position = 'absolute';
        buildModeDisplay.style.top = '100px';
        buildModeDisplay.style.left = '10px';
        buildModeDisplay.style.color = 'white';
        buildModeDisplay.style.fontSize = '20px';
        buildModeDisplay.style.fontFamily = 'Arial';
        buildModeDisplay.style.zIndex = '1001';
        buildModeDisplay.style.opacity = '1';
        buildModeDisplay.style.visibility = 'visible';
        buildModeDisplay.textContent = "Press B to Build Wood, M to Build Metal";
        gameUI.appendChild(buildModeDisplay);

        scoreDisplay = document.createElement('div');
        scoreDisplay.id = 'scoreDisplay';
        scoreDisplay.style.position = 'absolute';
        scoreDisplay.style.top = '130px';
        scoreDisplay.style.left = '10px';
        scoreDisplay.style.color = 'white';
        scoreDisplay.style.fontSize = '24px';
        scoreDisplay.style.fontFamily = 'Arial';
        scoreDisplay.style.zIndex = '1001';
        scoreDisplay.style.opacity = '1';
        scoreDisplay.style.visibility = 'visible';
        scoreDisplay.textContent = `Score: ${score}`;
        gameUI.appendChild(scoreDisplay);

        if (!restartButton) {
            const newRestartButton = document.createElement('button');
            newRestartButton.id = 'restartButton';
            newRestartButton.style.position = 'absolute';
            newRestartButton.style.top = '160px';
            newRestartButton.style.left = '10px';
            newRestartButton.style.padding = '10px';
            newRestartButton.style.fontSize = '16px';
            newRestartButton.style.display = 'none';
            newRestartButton.style.zIndex = '1001';
            newRestartButton.style.pointerEvents = 'auto';
            newRestartButton.style.backgroundColor = '#4CAF50';
            newRestartButton.style.color = 'white';
            newRestartButton.style.border = 'none';
            newRestartButton.style.borderRadius = '5px';
            newRestartButton.style.cursor = 'pointer';
            newRestartButton.style.opacity = '1';
            newRestartButton.style.visibility = 'visible';
            newRestartButton.textContent = "Restart Game";
            newRestartButton.addEventListener('click', () => {
                console.log("Restart button clicked (direct listener)");
                restartGame();
            });
            gameUI.appendChild(newRestartButton);
            console.log("Restart button created and appended to gameUI");
        } else {
            restartButton.style.display = 'none';
            restartButton.style.zIndex = '1001';
            restartButton.style.opacity = '1';
            restartButton.style.visibility = 'visible';
            gameUI.appendChild(restartButton);
            console.log("Existing restart button reattached with display: none");
        }

        gameUI.style.display = 'block';
        gameUI.style.pointerEvents = 'auto';
        gameUI.style.opacity = '1';
        gameUI.style.visibility = 'visible';
        console.log("Game UI shown, display:", gameUI.style.display);
    }

    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 0.5, 5);
    scene.add(player);

    gameInProgress = true; // Moved to before spawning zombies

    for (let i = 0; i < 3; i++) {
        spawnZombie();
    }

    clearInterval(spawnInterval);
    spawnInterval = setInterval(() => {
        for (let i = 0; i < 3; i++) {
            spawnZombie();
        }
    }, difficultySettings[difficulty].spawnInterval);

    if (difficultySelect) {
        difficultySelect.disabled = true;
    }
}

function restartGame() {
    console.log("Restarting game... (called from:", new Error().stack.split('\n')[2], ")");
    baseHealth = 100;
    wood = 50;
    metal = 20;
    buildMode = false;
    rotationAngle = 0;
    if (buildModeDisplay) {
        buildModeDisplay.textContent = "Press B to Build Wood, M to Build Metal";
    }
    if (player) {
        console.log("Removing player from scene");
        scene.remove(player);
        player.position.set(0, 0.5, 5);
    }
    score = 0;
    zombies.forEach(zombie => scene.remove(zombie));
    zombies.length = 0;
    console.log("Zombies cleared, total:", zombies.length);
    walls.forEach(wall => scene.remove(wall));
    walls.length = 0;
    console.log("Walls cleared, total:", walls.length);
    clearInterval(spawnInterval);
    const restartButton = document.getElementById('restartButton');
    if (restartButton) {
        restartButton.style.display = "none";
        console.log("Restart button hidden");
    }
    gameInProgress = false;
    const startScreen = document.getElementById('startScreen');
    if (startScreen) {
        console.log("Start screen found, setting display to flex");
        startScreen.style.display = 'flex';
        startScreen.style.zIndex = '10000';
        startScreen.style.opacity = '1';
        startScreen.style.visibility = 'visible';
    } else {
        console.error("Start screen not found!");
    }
    const gameUI = document.getElementById('gameUI');
    if (gameUI) {
        console.log("Hiding game UI");
        Array.from(gameUI.children).forEach(child => {
            if (child !== restartButton) {
                gameUI.removeChild(child);
            }
        });
        gameUI.style.display = 'none';
        gameUI.style.pointerEvents = 'none';
        gameUI.style.zIndex = '1';
    } else {
        console.error("gameUI not found!");
    }
    const difficultySelect = document.getElementById('difficultySelect');
    if (difficultySelect) {
        difficultySelect.disabled = false;
        console.log("Difficulty selector enabled");
    } else {
        console.error("Difficulty select not found!");
    }
    healthDisplay = null;
    woodDisplay = null;
    metalDisplay = null;
    scoreDisplay = null;
    buildModeDisplay = null;
    console.log("Game restarted!");
}

// DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    applyDifficulty();

    const difficultySelect = document.getElementById('difficultySelect');
    if (difficultySelect) {
        console.log("Difficulty select element found:", difficultySelect);
        difficultySelect.value = difficulty;
        difficultySelect.addEventListener('change', (event) => {
            if (!gameInProgress) {
                difficulty = event.target.value;
                applyDifficulty();
                console.log("Difficulty set to:", difficulty);
            } else {
                console.log("Cannot change difficulty during the game!");
                difficultySelect.value = difficulty;
            }
        });
    } else {
        console.error("Could not find difficultySelect element! Defaulting to medium difficulty.");
        difficulty = "medium";
        applyDifficulty();
    }

    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', startGame);
    } else {
        console.error("Could not find startButton element!");
    }
});

// Sound effects
const shootSound = document.getElementById('shootSound');
const buildSound = document.getElementById('buildSound');
const attackSound = document.getElementById('attackSound');
const gameoverSound = document.getElementById('gameoverSound');

// Preload audio files after user interaction
function preloadAudio() {
    const sounds = [shootSound, buildSound, attackSound, gameoverSound];
    sounds.forEach(sound => {
        if (sound) {
            sound.load(); // Ensure the audio file is loaded
            sound.play().then(() => {
                sound.pause(); // Immediately pause to unlock for later playback
                sound.currentTime = 0; // Reset to start
                console.log(`Preloaded sound: ${sound.id}`);
            }).catch(error => {
                console.log(`Error preloading sound ${sound.id}:`, error);
            });
        }
    });
}

function startGame() {
    const difficultySelect = document.getElementById('difficultySelect');
    if (difficultySelect) {
        difficulty = difficultySelect.value;
        applyDifficulty();
        console.log("Game started with difficulty:", difficulty);
    }

    const startScreen = document.getElementById('startScreen');
    if (startScreen) {
        startScreen.style.display = 'none';
        console.log("Start screen hidden, display:", startScreen.style.display);
    }

    // Preload audio files after user interaction (clicking "Start Game")
    preloadAudio();

    // Rest of the startGame function...
    const gameUI = document.getElementById('gameUI');
    if (gameUI) {
        const restartButton = document.getElementById('restartButton');
        Array.from(gameUI.children).forEach(child => {
            if (child !== restartButton) {
                gameUI.removeChild(child);
            }
        });

        healthDisplay = document.createElement('div');
        healthDisplay.id = 'healthDisplay';
        healthDisplay.style.position = 'absolute';
        healthDisplay.style.top = '10px';
        healthDisplay.style.left = '10px';
        healthDisplay.style.color = 'white';
        healthDisplay.style.fontSize = '24px';
        healthDisplay.style.fontFamily = 'Arial';
        healthDisplay.style.zIndex = '1001';
        healthDisplay.style.opacity = '1';
        healthDisplay.style.visibility = 'visible';
        healthDisplay.textContent = `Base Health: ${baseHealth}`;
        gameUI.appendChild(healthDisplay);

        woodDisplay = document.createElement('div');
        woodDisplay.id = 'woodDisplay';
        woodDisplay.style.position = 'absolute';
        woodDisplay.style.top = '40px';
        woodDisplay.style.left = '10px';
        woodDisplay.style.color = 'white';
        woodDisplay.style.fontSize = '24px';
        healthDisplay.style.fontFamily = 'Arial';
        woodDisplay.style.zIndex = '1001';
        woodDisplay.style.opacity = '1';
        woodDisplay.style.visibility = 'visible';
        woodDisplay.textContent = `Wood: ${wood}`;
        gameUI.appendChild(woodDisplay);

        metalDisplay = document.createElement('div');
        metalDisplay.id = 'metalDisplay';
        metalDisplay.style.position = 'absolute';
        metalDisplay.style.top = '70px';
        metalDisplay.style.left = '10px';
        metalDisplay.style.color = 'white';
        metalDisplay.style.fontSize = '24px';
        metalDisplay.style.fontFamily = 'Arial';
        metalDisplay.style.zIndex = '1001';
        metalDisplay.style.opacity = '1';
        metalDisplay.style.visibility = 'visible';
        metalDisplay.textContent = `Metal: ${metal}`;
        gameUI.appendChild(metalDisplay);

        buildModeDisplay = document.createElement('div');
        buildModeDisplay.id = 'buildModeDisplay';
        buildModeDisplay.style.position = 'absolute';
        buildModeDisplay.style.top = '100px';
        buildModeDisplay.style.left = '10px';
        buildModeDisplay.style.color = 'white';
        buildModeDisplay.style.fontSize = '20px';
        buildModeDisplay.style.fontFamily = 'Arial';
        buildModeDisplay.style.zIndex = '1001';
        buildModeDisplay.style.opacity = '1';
        buildModeDisplay.style.visibility = 'visible';
        buildModeDisplay.textContent = "Press B to Build Wood, M to Build Metal";
        gameUI.appendChild(buildModeDisplay);

        scoreDisplay = document.createElement('div');
        scoreDisplay.id = 'scoreDisplay';
        scoreDisplay.style.position = 'absolute';
        scoreDisplay.style.top = '130px';
        scoreDisplay.style.left = '10px';
        scoreDisplay.style.color = 'white';
        scoreDisplay.style.fontSize = '24px';
        scoreDisplay.style.fontFamily = 'Arial';
        scoreDisplay.style.zIndex = '1001';
        scoreDisplay.style.opacity = '1';
        scoreDisplay.style.visibility = 'visible';
        scoreDisplay.textContent = `Score: ${score}`;
        gameUI.appendChild(scoreDisplay);

        if (!restartButton) {
            const newRestartButton = document.createElement('button');
            newRestartButton.id = 'restartButton';
            newRestartButton.style.position = 'absolute';
            newRestartButton.style.top = '160px';
            newRestartButton.style.left = '10px';
            newRestartButton.style.padding = '10px';
            newRestartButton.style.fontSize = '16px';
            newRestartButton.style.display = 'none';
            newRestartButton.style.zIndex = '1001';
            newRestartButton.style.pointerEvents = 'auto';
            newRestartButton.style.backgroundColor = '#4CAF50';
            newRestartButton.style.color = 'white';
            newRestartButton.style.border = 'none';
            newRestartButton.style.borderRadius = '5px';
            newRestartButton.style.cursor = 'pointer';
            newRestartButton.style.opacity = '1';
            newRestartButton.style.visibility = 'visible';
            newRestartButton.textContent = "Restart Game";
            newRestartButton.addEventListener('click', () => {
                console.log("Restart button clicked (direct listener)");
                restartGame();
            });
            gameUI.appendChild(newRestartButton);
            console.log("Restart button created and appended to gameUI");
        } else {
            restartButton.style.display = 'none';
            restartButton.style.zIndex = '1001';
            restartButton.style.opacity = '1';
            restartButton.style.visibility = 'visible';
            gameUI.appendChild(restartButton);
            console.log("Existing restart button reattached with display: none");
        }

        gameUI.style.display = 'block';
        gameUI.style.pointerEvents = 'auto';
        gameUI.style.opacity = '1';
        gameUI.style.visibility = 'visible';
        console.log("Game UI shown, display:", gameUI.style.display);
    }

    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 0.5, 5);
    scene.add(player);

    gameInProgress = true;

    for (let i = 0; i < 3; i++) {
        spawnZombie();
    }

    clearInterval(spawnInterval);
    spawnInterval = setInterval(() => {
        for (let i = 0; i < 3; i++) {
            spawnZombie();
        }
    }, difficultySettings[difficulty].spawnInterval);

    if (difficultySelect) {
        difficultySelect.disabled = true;
    }
}

let spawnInterval;

// Add a player (a smaller cube)
const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x0000FF });
let player;

// Position the camera for a straight top-down view
camera.position.set(0, 20, 0);
camera.lookAt(0, 0, 0);
camera.updateProjectionMatrix();

// Player movement variables
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const mouse = new THREE.Vector2();

// Keyboard controls
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'w': moveForward = true; console.log("Player: Move Forward"); break;
        case 's': moveBackward = true; console.log("Player: Move Backward"); break;
        case 'a': moveLeft = true; console.log("Player: Move Left"); break;
        case 'd': moveRight = true; console.log("Player: Move Right"); break;
        case 'b':
            if (buildMode === "wood") {
                buildMode = false;
            } else {
                buildMode = "wood";
            }
            if (buildModeDisplay) {
                if (buildMode === "wood") {
                    buildModeDisplay.textContent = "Build Mode: Click to place wooden wall (Cost: 5 wood), R to rotate";
                } else if (buildMode === "metal") {
                    buildModeDisplay.textContent = "Build Mode: Click to place metal wall (Cost: 3 metal), R to rotate";
                } else {
                    buildModeDisplay.textContent = "Press B to Build Wood, M to Build Metal";
                }
            }
            break;
        case 'm':
            if (buildMode === "metal") {
                buildMode = false;
            } else {
                buildMode = "metal";
            }
            if (buildModeDisplay) {
                if (buildMode === "wood") {
                    buildModeDisplay.textContent = "Build Mode: Click to place wooden wall (Cost: 5 wood), R to rotate";
                } else if (buildMode === "metal") {
                    buildModeDisplay.textContent = "Build Mode: Click to place metal wall (Cost: 3 metal), R to rotate";
                } else {
                    buildModeDisplay.textContent = "Press B to Build Wood, M to Build Metal";
                }
            }
            break;
        case 'r':
            if (buildMode) {
                rotationAngle = (rotationAngle + 90) % 360;
                if (buildModeDisplay) {
                    if (buildMode === "wood") {
                        buildModeDisplay.textContent = `Build Mode: Click to place wooden wall (Cost: 5 wood), R to rotate, Angle: ${rotationAngle}°`;
                    } else if (buildMode === "metal") {
                        buildModeDisplay.textContent = `Build Mode: Click to place metal wall (Cost: 3 metal), R to rotate, Angle: ${rotationAngle}°`;
                    }
                }
                console.log("Rotation angle set to:", rotationAngle);
            }
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'w': moveForward = false; break;
        case 's': moveBackward = false; break;
        case 'a': moveLeft = false; break;
        case 'd': moveRight = false; break;
    }
});

// Zombie array and spawn function
const zombies = [];
const zombieGeometry = new THREE.BoxGeometry(1, 1, 1);

function spawnZombie() {
    if (!gameInProgress) {
        console.log("Cannot spawn zombie: Game has not started yet.");
        return;
    }

    const zombie = new THREE.Mesh(zombieGeometry);
    const spawnEdge = Math.random() > 0.5 ? 25 : -25;
    zombie.position.set(
        Math.random() > 0.5 ? spawnEdge : Math.random() * 50 - 25,
        1,
        Math.random() > 0.5 ? spawnEdge : Math.random() * 50 - 25
    );
    zombie.lastAttack = 0;

    const rand = Math.random();
    if (rand < 0.4) { // 40% chance for normal zombie
        zombie.type = "normal";
        zombie.speed = 0.03;
        zombie.health = 20; // Normal zombie: 2 hits to kill (10 damage per hit)
        zombie.maxHealth = 20; // Store max health for color scaling
        zombie.damage = difficultySettings[difficulty].zombieDamage;
        zombie.material = new THREE.MeshBasicMaterial({ color: 0xFF0000 }); // Red
        zombie.drops = { wood: 7, metal: 2 };
    } else if (rand < 0.6) { // 20% chance for strong zombie
        zombie.type = "strong";
        zombie.speed = 0.02;
        zombie.health = 40; // Strong zombie: 4 hits to kill
        zombie.maxHealth = 40;
        zombie.damage = difficultySettings[difficulty].zombieDamage * 2;
        zombie.material = new THREE.MeshBasicMaterial({ color: 0x800000 }); // Dark red
        zombie.drops = { wood: 10, metal: 5 };
    } else if (rand < 0.9) { // 30% chance for fast zombie
        zombie.type = "fast";
        zombie.speed = 0.08;
        zombie.health = 10; // Fast zombie: 1 hit to kill
        zombie.maxHealth = 10;
        zombie.damage = difficultySettings[difficulty].zombieDamage * 0.5;
        zombie.material = new THREE.MeshBasicMaterial({ color: 0x800080 }); // Purple
        zombie.drops = { wood: 5, metal: 1 };
    } else { // 10% chance for tank zombie
        zombie.type = "tank";
        zombie.speed = 0.01; // Very slow
        zombie.health = 100; // Tank zombie: 10 hits to kill
        zombie.maxHealth = 100;
        zombie.damage = difficultySettings[difficulty].zombieDamage * 3; // High damage
        zombie.material = new THREE.MeshBasicMaterial({ color: 0x00FF00 }); // Green for tank
        zombie.drops = { wood: 20, metal: 10 }; // Higher rewards
    }

    zombie.geometry.computeBoundingBox();
    zombie.geometry.computeBoundingSphere();

    scene.add(zombie);
    zombies.push(zombie);
    console.log("Zombie spawned at:", zombie.position, "Type:", zombie.type, "Health:", zombie.health, "Speed:", zombie.speed, "Damage:", zombie.damage, "Total zombies:", zombies.length);
}

// Walls array and creation
const walls = [];
const wallGeometry = new THREE.BoxGeometry(3, 2, 0.5);
const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
const metalWallMaterial = new THREE.MeshBasicMaterial({ color: 0xA9A9A9 });

function createWall(position, materialType) {
    const wall = new THREE.Mesh(wallGeometry, materialType === "metal" ? metalWallMaterial : wallMaterial);
    wall.position.copy(position);
    wall.position.y = 1;
    wall.health = materialType === "metal" ? difficultySettings[difficulty].wallHealth * 2 : difficultySettings[difficulty].wallHealth;
    wall.materialType = materialType;
    wall.rotation.y = THREE.MathUtils.degToRad(rotationAngle);
    scene.add(wall);
    walls.push(wall);
    console.log(`${materialType === "metal" ? "Metal" : "Wooden"} wall created with health:`, wall.health, "Rotation:", rotationAngle);
}

// Zombie movement with wall attacks
function updateZombies() {
    const currentTime = Date.now();

    zombies.forEach((zombie, index) => {
        const distanceToBase = zombie.position.distanceTo(base.position);
        let canMove = true;
        let attackedWall = false;

        for (let i = 0; i < walls.length; i++) {
            const wall = walls[i];
            const distanceToWall = zombie.position.distanceTo(wall.position);
            if (distanceToWall < 2) {
                canMove = false;
                if (currentTime - zombie.lastAttack >= 1000) {
                    // Tank zombies deal more damage to walls
                    const wallDamage = zombie.type === "tank" ? 20 : 10;
                    wall.health -= wallDamage;
                    zombie.lastAttack = currentTime;
                    console.log(`Zombie attacked wall! Type: ${zombie.type}, Wall health: ${wall.health}`);
                    playSound(attackSound);
                    if (wall.health <= 0) {
                        scene.remove(wall);
                        walls.splice(i, 1);
                        console.log("Wall destroyed!");
                        i--;
                    }
                }
                attackedWall = true;
                break;
            }
        }

        if (distanceToBase > 0.5 && canMove) {
            const direction = new THREE.Vector3()
                .subVectors(base.position, zombie.position)
                .normalize();
            zombie.position.addScaledVector(direction, zombie.speed);
        } else if (distanceToBase <= 0.5 && !attackedWall) {
            baseHealth -= zombie.damage;
            console.log(`Zombie reached base, dealing damage: ${zombie.damage}, New baseHealth: ${baseHealth}`);
            // Add visual feedback
            base.material.color.set(0xFF0000); // Turn base red temporarily
            setTimeout(() => base.material.color.set(0x808080), 200); // Reset color after 200ms
            updateHealthDisplay();
            scene.remove(zombie);
            zombies.splice(index, 1);
            console.log("Zombie dealt damage! Base health:", baseHealth);
        }
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    if (player) {
        if (moveForward) player.position.z -= speed;
        if (moveBackward) player.position.z += speed;
        if (moveLeft) player.position.x -= speed;
        if (moveRight) player.position.x += speed;
    }
    updateZombies();
    renderer.render(scene, camera);
}
animate();

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Mouse movement for aiming
document.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Clicking to shoot or build
document.addEventListener('click', () => {
    if (!gameInProgress) {
        console.log("Game has not started yet. Please click 'Start Game' to begin.");
        return;
    }

    console.log("Click detected at:", mouse.x, mouse.y);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    raycaster.near = 0;
    raycaster.far = 50;

    console.log("Raycaster origin:", raycaster.ray.origin);
    console.log("Raycaster direction:", raycaster.ray.direction);

    if (buildMode === "wood") {
        const groundIntersects = raycaster.intersectObject(ground);
        if (groundIntersects.length > 0 && wood >= 5) {
            const position = groundIntersects[0].point;
            createWall(position, "wood");
            wood -= 5;
            updateWoodDisplay();
            console.log("Wooden wall placed at:", position);
            playSound(buildSound);
        } else if (wood < 5) {
            console.log("Not enough wood to build!");
        }
    } else if (buildMode === "metal") {
        const groundIntersects = raycaster.intersectObject(ground);
        if (groundIntersects.length > 0 && metal >= 3) {
            const position = groundIntersects[0].point;
            createWall(position, "metal");
            metal -= 3;
            updateMetalDisplay();
            console.log("Metal wall placed at:", position);
            playSound(buildSound);
        } else if (metal < 3) {
            console.log("Not enough metal to build!");
        }
    } else {
        console.log("Checking for zombie hits...");
        const intersects = raycaster.intersectObjects(zombies, false);
        console.log("Intersects:", intersects.length, "Zombies array length:", zombies.length);
        zombies.forEach((zombie, index) => {
            console.log(`Zombie ${index} position:`, zombie.position);
        });
        if (intersects.length > 0) {
            const zombie = intersects[0].object;
            // Deal damage to the zombie
            const damage = 10; // 10 damage per hit
            zombie.health -= damage;
            console.log(`Zombie hit! Type: ${zombie.type}, Health: ${zombie.health}/${zombie.maxHealth}`);

            // Update zombie color based on health (from original color to darker shade)
            const healthRatio = zombie.health / zombie.maxHealth;
            let originalColor;
            switch (zombie.type) {
                case "normal":
                    originalColor = 0xFF0000; // Red
                    break;
                case "strong":
                    originalColor = 0x800000; // Dark red
                    break;
                case "fast":
                    originalColor = 0x800080; // Purple
                    break;
                case "tank":
                    originalColor = 0x00FF00; // Green
                    break;
            }
            const color = new THREE.Color(originalColor);
            color.multiplyScalar(healthRatio); // Darken as health decreases
            zombie.material.color.set(color);

            if (zombie.health <= 0) {
                console.log("Zombie killed at:", zombie.position, "Type:", zombie.type);
                scene.remove(zombie);
                zombies.splice(zombies.indexOf(zombie), 1);
                wood += zombie.drops.wood;
                metal += zombie.drops.metal;
                console.log("Before update - Wood:", wood, "Metal:", metal);
                updateWoodDisplay();
                updateMetalDisplay();
                console.log("After update - Wood:", wood, "Metal:", metal);
                console.log(`Gained ${zombie.drops.wood} wood and ${zombie.drops.metal} metal for killing ${zombie.type} zombie! Total wood:`, wood, "Total metal:", metal);
                score += 10;
                updateScoreDisplay();
                console.log("Score increased to:", score);
                playSound(shootSound);
            } else {
                // Play a hit sound or visual effect if the zombie is still alive
                console.log(`Zombie still alive! Health remaining: ${zombie.health}`);
                // Optionally play a different sound for a hit (e.g., a "hit" sound)
            }
        } else {
            console.log("No zombies hit. Camera position:", camera.position, "Looking at:", camera.getWorldDirection(new THREE.Vector3()));
        }
    }
});