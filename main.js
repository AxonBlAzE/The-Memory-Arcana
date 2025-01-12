// Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const loadingManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadingManager);

renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

camera.position.z = 5;

// Game Variables
let firstCard = null;
let secondCard = null;
let canFlip = true;
let score = 0;
let currentLevel = 1;
let maxLevel = 21; // Maximum number of pairs possible
let pairsInCurrentLevel = 2; // Start with 2 pairs
const cards = [];
let gameTimer = 600; // 10 minutes in seconds
let timerInterval;
let finalScore = 0;
let levelsCompleted = 0;


// sfx
const flipSound = new Audio('assets/sfx/flipcard.mp3');
const levelCompleteSound = new Audio('assets/sfx/level-complete.wav');
const matchSound = new Audio('assets/sfx/match.wav');
const gameCompleteSound = new Audio('assets/sfx/game-complete.wav');

// bg
const backgroundShader = {
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        varying vec2 vUv;

        void main() {
            vec2 st = vUv;

            // Gradient background
            vec3 color = mix(vec3(0.05, 0.02, 0.1), vec3(0.3, 0.1, 0.4), st.y);

            // Add subtle glowing effect
            float glow = sin(time + st.x * 10.0) * 0.1;
            color += vec3(glow, glow * 0.5, glow);

            // Add vignette effect
            float vignette = smoothstep(0.8, 0.5, length(st - 0.5));
            color *= vignette;

            gl_FragColor = vec4(color, 1.0);
        }
    `,
    uniforms: {
        time: { value: 0 }
    }
};

const backgroundGeometry = new THREE.PlaneGeometry(2, 2);
const backgroundMaterial = new THREE.ShaderMaterial({
    vertexShader: backgroundShader.vertexShader,
    fragmentShader: backgroundShader.fragmentShader,
    uniforms: backgroundShader.uniforms,
});
const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
backgroundMesh.material.depthWrite = false;
scene.add(backgroundMesh);

// Add Ambient Light
const ambientLight = new THREE.AmbientLight(0x663399, 0.5); // Soft purple light
scene.add(ambientLight);

// Add Particles
const particleGeometry = new THREE.BufferGeometry();
const particleCount = 500;
const positions = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 50; // Spread particles randomly in space
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particleMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    transparent: true,
});
const particleMesh = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particleMesh);


// Function to generate card values based on current level
function generateCardValues() {
    return Array.from({ length: pairsInCurrentLevel }, (_, i) => i + 1);
}

// Card Creation Function
function createCard(value, position) {
    const cardGeometry = new THREE.BoxGeometry(2.7, 4.0, 0.3);

    // Load the back texture (e.g., back.png)
    const backTexture = textureLoader.load(`assets/cards/back.png`);
    const backMaterial = new THREE.MeshBasicMaterial({ map: backTexture });

    // Load the front texture (tarot image) based on the card value
    const frontTexture = textureLoader.load(`assets/cards/${value}.png`);
    const frontMaterial = new THREE.MeshBasicMaterial({ map: frontTexture });

    // Materials for all sides of the card
    const materials = [
        backMaterial, // Right side
        backMaterial, // Left side
        backMaterial, // Top side
        backMaterial, // Bottom side
        backMaterial, // Back face (visible by default)
        frontMaterial // Front face (revealed after flipping)
    ];

    const card = new THREE.Mesh(cardGeometry, materials);
    card.position.set(position.x, position.y, 0);
    card.userData.value = value;
    card.userData.isFlipped = false;
    card.userData.matched = false;

    return card;
}

// Flip Card Function
function flipCard(card) {
    if (!canFlip || card.userData.isFlipped || card.userData.matched) return;

    // Play flip sound
    flipSound.currentTime = 0; // Reset the sound to start
    flipSound.play();

    if (!firstCard) {
        firstCard = card;
        gsap.to(card.rotation, {
            x: -0.3, // Maintain table tilt
            y: Math.PI,
            duration: 1,
            onComplete: () => {
                card.userData.isFlipped = true;
            }
        });
    } else if (!secondCard && card !== firstCard) {
        secondCard = card;
        gsap.to(card.rotation, {
            x: -0.3, // Maintain table tilt
            y: Math.PI,
            duration: 1,
            onComplete: () => {
                card.userData.isFlipped = true;
                checkMatch();
            }
        });
    }
}


// Level Complete Message
function showLevelCompleteMessage() {
    levelsCompleted++;

    // Play level completion sound
    levelCompleteSound.currentTime = 0; // Reset to start
    levelCompleteSound.play();

    const overlay = document.getElementById('congratulations-overlay');
    const message = document.getElementById('congratulations-message');

    message.innerHTML = `
        <h1>Level ${currentLevel} Complete!</h1>
        <p>Time Remaining: ${Math.floor(gameTimer / 60)}:${(gameTimer % 60).toString().padStart(2, '0')}</p>
        <p>Current Score: ${calculateFinalScore()}</p>
        <button id="next-level-button">Continue Journey</button>
    `;

    overlay.style.display = 'flex';

    const nextLevelButton = document.getElementById('next-level-button');
    const newButton = nextLevelButton.cloneNode(true);
    nextLevelButton.parentNode.replaceChild(newButton, nextLevelButton);

    newButton.addEventListener('click', () => {
        overlay.style.display = 'none';
        currentLevel++;
        pairsInCurrentLevel = Math.min(currentLevel + 1, maxLevel);
        initGame();
    });
}

// Game Complete Message
function showGameCompleteMessage() {

    gameCompleteSound.currentTime = 0;
    gameCompleteSound.play();

    const overlay = document.getElementById('congratulations-overlay');
    const message = document.getElementById('congratulations-message');

    message.innerHTML = `
        <h1>Magnificent Victory!</h1>
        <p>You have mastered all ${maxLevel} levels!</p>
        <p>You are truly a Master of the Mystical Cards!</p>
        <button id="play-again-button">Start New Journey</button>
    `;

    overlay.style.display = 'flex';

    const playAgainButton = document.getElementById('play-again-button');
    // Remove any existing event listeners
    const newButton = playAgainButton.cloneNode(true);
    playAgainButton.parentNode.replaceChild(newButton, playAgainButton);

    newButton.addEventListener('click', () => {
        overlay.style.display = 'none';
        currentLevel = 1;
        pairsInCurrentLevel = 2;
        initGame(); // Restart from level 1
    });
}

function startTimer() {
    clearInterval(timerInterval); // Clear any existing timer

    timerInterval = setInterval(() => {
        gameTimer--;

        // Convert seconds to minutes and seconds display
        const minutes = Math.floor(gameTimer / 60);
        const seconds = gameTimer % 60;

        // Update timer display
        document.getElementById('timer').textContent =
            `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Check if time is up
        if (gameTimer <= 0) {
            clearInterval(timerInterval); // Stop the timer
            showFinalScore(); // Show final score pop-up
        }
    }, 1000);
}


function calculateFinalScore() {
    // Score formula: (levels completed * 1000) + (remaining time * 10)
    return (levelsCompleted * 1000) + (gameTimer * 10);
}

function showFinalScore() {
    clearInterval(timerInterval);
    finalScore = calculateFinalScore();

    const overlay = document.getElementById('congratulations-overlay');
    const message = document.getElementById('congratulations-message');

    message.innerHTML = `
        <h1>Game Over!</h1>
        <p>Levels Completed: ${levelsCompleted}</p>
        <p>Time Remaining: ${Math.floor(gameTimer / 60)}:${(gameTimer % 60).toString().padStart(2, '0')}</p>
        <p>Final Score: ${finalScore}</p>
        <button id="play-again-button">Play Again</button>
    `;

    overlay.style.display = 'flex';
}

// Reset Game Function
function resetGame() {
    score = 0;
    firstCard = null;
    secondCard = null;
    currentLevel = 1;
    pairsInCurrentLevel = 2;

    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('level').textContent = `Level: ${currentLevel}`;
    document.getElementById('pairs').textContent = `Pairs to Match: ${pairsInCurrentLevel}`;

    cards.forEach(card => scene.remove(card));
    cards.length = 0;

    initGame();
}

// Check Match Function
function checkMatch() {
    if (!firstCard || !secondCard) return;

    const isMatch = firstCard.userData.value === secondCard.userData.value;

    if (isMatch) {

        matchSound.currentTime = 0;
        matchSound.play();


        firstCard.userData.matched = true;
        secondCard.userData.matched = true;
        firstCard = null;
        secondCard = null;
        canFlip = true;

        score += 1;
        document.getElementById('score').textContent = `Score: ${score}`;

        // Check if level is complete
        if (score === pairsInCurrentLevel) {
            setTimeout(() => {
                if (currentLevel < maxLevel) {
                    showLevelCompleteMessage();
                } else {
                    showGameCompleteMessage();
                }
            }, 500); // Short delay before showing message
        }
    } else {
        canFlip = false;

        setTimeout(() => {
            gsap.to(firstCard.rotation, { y: 0, duration: 1 });
            gsap.to(secondCard.rotation, {
                y: 0, duration: 1, onComplete: () => {
                    firstCard.userData.isFlipped = false;
                    secondCard.userData.isFlipped = false;
                    firstCard = null;
                    secondCard = null;
                    canFlip = true;
                }
            });
        }, 1000);
    }
}


// Shuffle Array Function
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Mouse Click Handler
function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cards);

    if (intersects.length > 0) {
        const card = intersects[0].object;
        flipCard(card);
    }
}


// Window Resize Handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    backgroundShader.uniforms.time.value += 0.01;

    renderer.render(scene, camera);
}

// Calculate Grid Layout
function calculateGridLayout(totalCards) {
    // rectangular layouts for even number of cards
    if (totalCards === 8) { // 4 pairs
        return { rows: 2, cols: 4 };
    } else if (totalCards === 12) { // 6 pairs
        return { rows: 3, cols: 4 };
    } else if (totalCards === 16) { // 8 pairs
        return { rows: 4, cols: 4 };
    } else if (totalCards === 20) { // 10 pairs
        return { rows: 4, cols: 5 };
    }

    // closest square-like rectangle for odd number of cards
    const sqrt = Math.sqrt(totalCards);
    const cols = Math.ceil(sqrt);
    const rows = Math.ceil(totalCards / cols);

    return { rows, cols };
}

function applyCardTilt(card) {
    // Tilt cards slightly forward
    card.rotation.x = -0.3; // Tilt on X axis for table-like appearance

    // Add subtle random rotation on Y and Z for natural look
    card.rotation.y = (Math.random() - 0.5) * 0.1;
    card.rotation.z = (Math.random() - 0.5) * 0.1;
}

// Main Menu Logic
document.getElementById('start-game-button').addEventListener('click', () => {
    // Hide main menu
    document.getElementById('main-menu').style.display = 'none';

    // Show game elements
    document.getElementById('game-info').style.display = 'flex';
    document.getElementById('game-container').style.display = 'block';

    // Start the game
    initGame();
});

// Play Sound on User Interaction
document.addEventListener('click', () => {
    flipSound.play().catch(() => {
        console.log('Audio playback started after user interaction.');
    });
}, { once: true });

// Game Initialization Function
function initGame() {
    // Start timer for new game
    if (currentLevel === 1 && timerInterval == null) { // Only reset timer for a new game
        levelsCompleted = 0;
        startTimer();
    }

    // Clear existing cards
    cards.forEach(card => scene.remove(card));
    cards.length = 0;

    // Reset score for new level
    score = 0;

    // Update UI
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('level').textContent = `Level: ${currentLevel}`;
    document.getElementById('pairs').textContent = `Pairs to Match: ${pairsInCurrentLevel}`;

    // Generate and shuffle card values
    let gameValues = [...generateCardValues(), ...generateCardValues()];
    gameValues = shuffleArray(gameValues);

    // Calculate grid layout
    const totalCards = gameValues.length;
    const { rows, cols } = calculateGridLayout(totalCards);

    // Increased fixed card dimensions
    const cardWidth = 3.0; // Increased from 1.5
    const cardHeight = 4.0; // Increased from 2.0
    const spacing = 1; // Increased spacing between cards

    const totalWidth = (cols * cardWidth) + ((cols - 1) * spacing);
    const totalHeight = (rows * cardHeight) + ((rows - 1) * spacing);

    const startX = -(totalWidth / 2) + (cardWidth / 2);
    const startY = (totalHeight / 2) - (cardHeight / 2);

    // Create and position cards
    for (let i = 0; i < totalCards; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;

        const xPos = startX + (col * (cardWidth + spacing));
        const yPos = startY - (row * (cardHeight + spacing));

        const card = createCard(gameValues[i], { x: xPos, y: yPos });
        cards.push(card);
        scene.add(card);
    }

    // Adjust camera position to maintain consistent card sizes
    const aspectRatio = window.innerWidth / window.innerHeight;
    const maxGridDimension = Math.max(totalWidth / aspectRatio, totalHeight);
    const baseDistance = 7; // Increased base distance
    camera.position.z = baseDistance + (maxGridDimension * 0.7);
}



// Event Listeners
window.addEventListener('click', onMouseClick);
window.addEventListener('resize', onWindowResize);

// Initialize game
initGame();
animate();