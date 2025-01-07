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
const cards = [];
const cardValues = [1, 2, 3, 4, 5, 6]; // Tarot card values

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
    card.userData.value = value; // Store the value of the card for matching logic
    card.userData.isFlipped = false; // Track if the card is flipped
    card.userData.matched = false; // Track if the card is matched

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

function showCongratulationsMessage() {
    const overlay = document.getElementById('congratulations-overlay');
    overlay.style.display = 'flex'; // Show the overlay

    const playAgainButton = document.getElementById('play-again-button');
    playAgainButton.addEventListener('click', () => {
        overlay.style.display = 'none'; // Hide the overlay

        // Reset game logic
        resetGame();
    });
}

function resetGame() {
    // Reset variables
    score = 0;
    firstCard = null;
    secondCard = null;

    document.getElementById('score').textContent = `Score: ${score}`;

    // Remove all cards from the scene
    cards.forEach(card => scene.remove(card));
    cards.length = 0; // Clear the array

    // Reinitialize the game
    initGame();
}

// Check Match Function
function checkMatch() {
    if (!firstCard || !secondCard) return;

    const isMatch = firstCard.userData.value === secondCard.userData.value;

    if (isMatch) {
        // Disable matched cards
        firstCard.userData.matched = true;
        secondCard.userData.matched = true;

        // Reset selection
        firstCard = null;
        secondCard = null;
        canFlip = true;

        // Update score
        score += 1;
        document.getElementById('score').textContent = `Score: ${score}`;

        // Check if game is complete
        if (score === cardValues.length) {
            showCongratulationsMessage();
        }
    } else {
        canFlip = false;

        // Unflip cards after delay
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

// Game Initialization Function
function initGame() {
    // Create doubled array of values (e.g., two copies of each tarot card)
    let gameValues = [...cardValues, ...cardValues];
    gameValues = shuffleArray(gameValues);

    let xPos = -2.5; // Adjust grid starting position for better layout
    let yPos = 2;

    for (let i = 0; i < gameValues.length; i++) {
        const value = gameValues[i];
        const card = createCard(value, { x: xPos, y: yPos });
        cards.push(card);
        scene.add(card);

        xPos += 1.5; // Adjust spacing between cards horizontally
        if ((i + 1) % 4 === 0) { // Move to the next row after every four cards
            xPos = -2.5; // Reset to starting X position
            yPos -= 2;   // Move down for the next row
        }
    }
}

// Event Listeners
window.addEventListener('click', onMouseClick);
window.addEventListener('resize', onWindowResize);

// Start the game when textures are loaded and ready
initGame();
animate();
