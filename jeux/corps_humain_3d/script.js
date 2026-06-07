// Main script for the educational 3D body game
let scene, camera, renderer, controls;
let clock = new THREE.Clock();
let voxelSize = 0.5;
let playerSpeed = 3;
let isJumping = false;
let velocity = new THREE.Vector3();
let canJump = false;
const GRAVITY = -9.8;
const JUMP_SPEED = 5;

// Voice recognition
let recognition;
let isListening = false;
const voiceBtn = document.getElementById('voice-btn');
const questDiv = document.getElementById('quest');
const infoDiv = document.getElementById('info');

// Speech synthesis queue (from skill)
var speechQueue = [], isSpeaking = false;
function speak(text, cb) {
  speechQueue.push({text: text, cb: cb});
  if (!isSpeaking) processQueue();
}
function processQueue() {
  if (!speechQueue.length) { isSpeaking = false; return; }
  isSpeaking = true;
  var item = speechQueue.shift();
  var u = new SpeechSynthesisUtterance(item.text);
  u.lang = 'fr-FR'; u.rate = 0.85; u.pitch = 1.2;
  u.onend = function() { if (item.cb) item.cb(); processQueue(); };
  u.onerror = function() { processQueue(); };
  speechSynthesis.speak(u);
}
function stopSpeech() { speechQueue = []; isSpeaking = false; speechSynthesis.cancel(); }

// Initialize Three.js
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 5);
  
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  
  // Light
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 10, 7);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040));
  
  // Create voxel world
  createWorld();
  
  // Controls (simple keyboard)
  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.code] = true; });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  
  // Jump
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && canJump) {
      velocity.y = Math.sqrt(JUMP_SPEED * -2 * GRAVITY);
      canJump = false;
    }
  });
  
  // Voice button
  voiceBtn.addEventListener('click', toggleVoice);
  
  // Initialize voice recognition if available
  initVoiceRecognition();
  
  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  // Start animation loop
  animate();
}

function initVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    infoDiv.innerHTML += '<br><em>Reconnaissance vocale non supportée sur ce navigateur.</em>';
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim().toLowerCase();
    console.log('Vous avez dit:', transcript);
    handleVoiceCommand(transcript);
  };
  
  recognition.onend = () => {
    if (isListening) toggleVoice(); // Auto-restart if needed
  };
  
  recognition.onerror = (event) => {
    console.error('Erreur de reconnaissance:', event.error);
  };
}

function toggleVoice() {
  if (!recognition) {
    alert('La reconnaissance vocale n\'est pas disponible sur ce navigateur.');
    return;
  }
  if (isListening) {
    recognition.stop();
    voiceBtn.classList.remove('listening');
    voiceBtn.textContent = 'Écouter';
    isListening = false;
  } else {
    try {
      recognition.start();
      voiceBtn.classList.add('listening');
      voiceBtn.textContent = 'Écouter...';
      isListening = true;
    } catch (e) {
      console.error('Erreur lors du démarrage de la reconnaissance:', e);
    }
  }
}

function handleVoiceCommand(command) {
  // Simple command handling
  if (command.includes('gauche')) {
    movePlayer(-1, 0);
    speak('Je vais à gauche');
  } else if (command.includes('droite')) {
    movePlayer(1, 0);
    speak('Je vais à droite');
  } else if (command.includes('avant')) {
    movePlayer(0, -1);
    speak('Je vais en avant');
  } else if (command.includes('arrière')) {
    movePlayer(0, 1);
    speak('Je vais en arrière');
  } else if (command.includes('saute')) {
    if (canJump) {
      velocity.y = Math.sqrt(JUMP_SPEED * -2 * GRAVITY);
      canJump = false;
      speak('Je saute');
    }
  } else if (command.includes('qu') && command.includes('est-ce')) {
    // Look at what's in front and describe
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera); // center
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      let description = 'Je vois ';
      if (obj.userData && obj.userData.type) {
        description += obj.userData.type;
      } else {
        description += 'un bloc';
      }
      speak(description);
    } else {
      speak('Je ne vois rien de spécial devant moi');
    }
  } else if (command.includes('aide')) {
    speak('Vous pouvez dire : va à gauche, va à droite, en avant, en arrière, saute, ou qu\'est-ce que c\'est');
  } else {
    // Not understood
    speak('Désolé, je n\'ai pas compris. Essayez à nouveau.');
  }
}

function movePlayer(dx, dz) {
  // Convert to world direction based on camera rotation
  const direction = new THREE.Vector3(dx, 0, dz);
  direction.applyQuaternion(camera.quaternion);
  direction.y = 0;
  direction.normalize();
  
  velocity.x = direction.x * playerSpeed;
  velocity.z = direction.z * playerSpeed;
}

function createWorld() {
  const groundSize = 50;
  const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x556b2f }); // dark olive
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  
  // Create some educational voxel structures
  createBloodVessel(-10, 2, 0);
  createNeuron(10, 2, 0);
  createMuscleFiber(0, 2, -10);
  
  // Create a floating platform for jumping practice
  const platformGeometry = new THREE.BoxGeometry(5, 0.5, 5);
  const platformMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 });
  const platform = new THREE.Mesh(platformGeometry, platformMaterial);
  platform.position.set(0, 3, 0);
  scene.add(platform);
}

function createBloodVessel(x, y, z) {
  // Simple cylindrical vessel (voxelized)
  const radius = 2;
  const height = 8;
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  
  for (let iy = 0; iy < height; iy += voxelSize) {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.5) {
      const cx = Math.cos(angle) * radius;
      const cz = Math.sin(angle) * radius;
      
      // Create a voxel cube
      const x0 = cx + x;
      const y0 = iy + y;
      const z0 = cz + z;
      
      // 8 corners of a cube
      const corners = [
        [x0, y0, z0],
        [x0 + voxelSize, y0, z0],
        [x0, y0 + voxelSize, z0],
        [x0 + voxelSize, y0 + voxelSize, z0],
        [x0, y0, z0 + voxelSize],
        [x0 + voxelSize, y0, z0 + voxelSize],
        [x0, y0 + voxelSize, z0 + voxelSize],
        [x0 + voxelSize, y0 + voxelSize, z0 + voxelSize]
      ];
      
      for (const corner of corners) {
        positions.push(...corner);
        // Red color for artery
        colors.push(0.8, 0.2, 0.2);
      }
    }
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  
  const material = new THREE.MeshPhongMaterial({ 
    vertexColors: true,
    shininess: 50,
    side: THREE.DoubleSide
  });
  
  const vessel = new THREE.Mesh(geometry, material);
  vessel.userData = { type: 'vaisseau sanguin (artère)' };
  scene.add(vessel);
}

function createNeuron(x, y, z) {
  // Simple neuron: sphere (cell body) + cylinder (axon)
  const bodyRadius = 1.5;
  const axonLength = 6;
  const axonRadius = 0.4;
  
  // Cell body (sphere approximated by icosahedron)
  const bodyGeometry = new THREE.IcosahedronGeometry(bodyRadius, 1);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.set(x, y + bodyRadius, z);
  body.userData = { type: 'neurone (corps cellulaire)' };
  scene.add(body);
  
  // Axon (cylinder)
  const axonGeometry = new THREE.CylinderGeometry(axonRadius, axonRadius, axonLength, 8);
  const axonMaterial = new THREE.MeshStandardMaterial({ color: 0x00bfff });
  const axon = new THREE.Mesh(axonGeometry, axonMaterial);
  axon.position.set(x, y + bodyRadius + axonLength/2, z);
  axon.userData = { type: 'axone du neurone' };
  scene.add(axon);
  
  // Some dendrites (simple lines)
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const len = 2;
    const dendriteGeometry = new THREE.CylinderGeometry(0.1, 0.1, len, 4);
    const dendriteMaterial = new THREE.MeshStandardMaterial({ color: 0xff8800 });
    const dendrite = new THREE.Mesh(dendriteGeometry, dendriteMaterial);
    dendrite.position.set(
      x + Math.cos(angle) * (bodyRadius + 0.5),
      y + bodyRadius + 0.5,
      z + Math.sin(angle) * (bodyRadius + 0.5)
    );
    // Rotate to point outward
    dendrite.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
    );
    dendrite.userData = { type: 'dendrite' };
    scene.add(dendrite);
  }
}

function createMuscleFiber(x, y, z) {
  // Bundle of muscle fibers (cylinders)
  const fiberLength = 6;
  const fiberRadius = 0.3;
  const count = 5;
  const spacing = 0.8;
  
  for (let i = 0; i < count; i++) {
    const offset = (i - (count-1)/2) * spacing;
    const geometry = new THREE.CylinderGeometry(fiberRadius, fiberRadius, fiberLength, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0xff69b4 });
    const fiber = new THREE.Mesh(geometry, material);
    fiber.position.set(x + offset, y + fiberLength/2, z);
    fiber.rotation.z = Math.PI / 2; // Horizontal
    fiber.userData = { type: 'fibre musculaire' };
    scene.add(fiber);
  }
}

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  
  // Apply gravity
  velocity.y += GRAVITY * delta;
  
  // Move player
  camera.position.x += velocity.x * delta;
  camera.position.z += velocity.z * delta;
  camera.position.y += velocity.y * delta;
  
  // Ground collision
  if (camera.position.y < 2) {
    camera.position.y = 2;
    velocity.y = 0;
    canJump = true;
  }
  
  // Keep player within bounds (optional)
  const limit = 25;
  if (camera.position.x < -limit) camera.position.x = -limit;
  if (camera.position.x > limit) camera.position.x = limit;
  if (camera.position.z < -limit) camera.position.z = -limit;
  if (camera.position.z > limit) camera.position.z = limit;
  
  // Update voice button state if needed
  if (isListening && !recognizing) {
    // In case recognition stopped unexpectedly
    voiceBtn.classList.remove('listening');
    voiceBtn.textContent = 'Écouter';
    isListening = false;
  }
  
  renderer.render(scene, camera);
}

// Start the game when page loads
window.addEventListener('load', init);