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

// Function to generate card values based on current level
function generateCardValues() {
    return Array.from({ length: pairsInCurrentLevel }, (_, i) => i + 1);
}

// Card Creation Function
function createCard(value, position) {
    const cardGeometry = new THREE.BoxGeometry(1, 1.5, 0.1);

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

    if (!firstCard) {
        firstCard = card;
        gsap.to(card.rotation, {
            y: Math.PI,
            duration: 1,
            onComplete: () => {
                card.userData.isFlipped = true;
            }
        });
    } else if (!secondCard && card !== firstCard) {
        secondCard = card;
        gsap.to(card.rotation, {
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
    const overlay = document.getElementById('congratulations-overlay');
    const message = document.getElementById('congratulations-message');

    message.innerHTML = `
        <h1>Level ${currentLevel} Complete!</h1>
        <p>You've matched all ${pairsInCurrentLevel} pairs!</p>
        <p>Ready for Level ${currentLevel + 1}?</p>
        <button id="next-level-button">Continue Journey</button>
    `;

    overlay.style.display = 'flex';

    const nextLevelButton = document.getElementById('next-level-button');
    // Remove any existing event listeners
    const newButton = nextLevelButton.cloneNode(true);
    nextLevelButton.parentNode.replaceChild(newButton, nextLevelButton);

    newButton.addEventListener('click', () => {
        overlay.style.display = 'none';
        currentLevel++;
        pairsInCurrentLevel = Math.min(currentLevel + 1, maxLevel);
        initGame(); // Start next level
    });
}

// Game Complete Message
function showGameCompleteMessage() {
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

// Game Initialization Function
function initGame() {
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

    // Calculate card spacing and starting positions
    const cardWidth = 1.5;
    const cardHeight = 2;
    const spacing = 0.2;

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

    // Adjust camera position based on grid size
    const maxDimension = Math.max(totalWidth, totalHeight);
    camera.position.z = maxDimension * 1.2;
}

// Event Listeners
window.addEventListener('click', onMouseClick);
window.addEventListener('resize', onWindowResize);

// Initialize game
initGame();
animate();
