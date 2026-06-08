import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { PerspectiveCamera, Billboard, Environment, Html, useProgress, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { useGameStore, ENEMIES } from '../store/gameStore';
import * as THREE from 'three';

// --- LOADER ---
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{ color: 'white', fontFamily: 'monospace', background: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: '5px' }}>
        Loading 3D Engine... {progress.toFixed(0)}%
      </div>
    </Html>
  );
}

// --- CONTROLS ---
function usePlayerControls() {
  const [movement, setMovement] = useState({ forward: false, backward: false, left: false, right: false, action: false });

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW': setMovement(m => ({ ...m, forward: true })); break;
        case 'KeyS': setMovement(m => ({ ...m, backward: true })); break;
        case 'KeyA': setMovement(m => ({ ...m, left: true })); break;
        case 'KeyD': setMovement(m => ({ ...m, right: true })); break;
        case 'Space': setMovement(m => ({ ...m, action: true })); break;
        case 'KeyE': setMovement(m => ({ ...m, action: true })); break;
      }
    };
    const handleKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW': setMovement(m => ({ ...m, forward: false })); break;
        case 'KeyS': setMovement(m => ({ ...m, backward: false })); break;
        case 'KeyA': setMovement(m => ({ ...m, left: false })); break;
        case 'KeyD': setMovement(m => ({ ...m, right: false })); break;
        case 'Space': setMovement(m => ({ ...m, action: false })); break;
        case 'KeyE': setMovement(m => ({ ...m, action: false })); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return movement;
}

// --- COLLISION LOGIC ---
const checkCollision = (newPos, buildings) => {
  const playerRadius = 1.2;
  for (const b of buildings) {
    if (!b.size) continue;
    const minX = b.position[0] - b.size[0]/2 - playerRadius;
    const maxX = b.position[0] + b.size[0]/2 + playerRadius;
    const minZ = b.position[2] - b.size[2]/2 - playerRadius;
    const maxZ = b.position[2] + b.size[2]/2 + playerRadius;
    
    if (newPos.x > minX && newPos.x < maxX && newPos.z > minZ && newPos.z < maxZ) {
      return true; // Collision
    }
  }
  if (newPos.x < -49 || newPos.x > 49 || newPos.z < -49 || newPos.z > 49) return true;
  return false;
};

// --- PLAYER ---
function Player({ buildings, onInteract, startPos, sceneId, onPositionChange, isCutsceneActive }) {
  const ref = useRef();
  const movement = usePlayerControls();
  const speed = sceneId === 'street' ? 10 : 6;
  
  const texture = useLoader(THREE.TextureLoader, '/assets/federica.png');
  
  const [interactPressed, setInteractPressed] = useState(false);
  
  const prevPos = useRef(new THREE.Vector3());

  useEffect(() => {
    if (ref.current && startPos) {
      ref.current.position.set(startPos[0], startPos[1], startPos[2]);
      prevPos.current.copy(ref.current.position);
    }
  }, [startPos]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    
    // Check interaction
    if (movement.action && !interactPressed && !isCutsceneActive) {
      setInteractPressed(true);
      onInteract(ref.current.position);
    } else if (!movement.action && interactPressed) {
      setInteractPressed(false);
    }

    // Stop moving if dialogue or cutscene is active
    if (useGameStore.getState().dialogue || isCutsceneActive) {
      // Still need to update camera
      state.camera.position.x = ref.current.position.x;
      state.camera.position.z = ref.current.position.z + (sceneId === 'street' ? 14 : 10);
      state.camera.position.y = sceneId === 'street' ? 10 : 8;
      state.camera.lookAt(ref.current.position);
      return;
    }

    // Movement logic
    const moveZ = (movement.backward ? 1 : 0) - (movement.forward ? 1 : 0);
    const moveX = (movement.right ? 1 : 0) - (movement.left ? 1 : 0);
    
    const direction = new THREE.Vector3(moveX, 0, moveZ).normalize();
    
    if (direction.length() > 0) {
      const step = direction.multiplyScalar(speed * delta);
      const newPos = ref.current.position.clone().add(step);
      
      // Attempt full move
      if (!checkCollision(newPos, buildings)) {
        ref.current.position.copy(newPos);
      } else {
        // Slide along walls
        const newPosX = ref.current.position.clone().add(new THREE.Vector3(step.x, 0, 0));
        if (!checkCollision(newPosX, buildings)) ref.current.position.copy(newPosX);
        else {
          const newPosZ = ref.current.position.clone().add(new THREE.Vector3(0, 0, step.z));
          if (!checkCollision(newPosZ, buildings)) ref.current.position.copy(newPosZ);
        }
      }
    }

    // If position changed, notify parent for history (Followers)
    if (ref.current.position.distanceTo(prevPos.current) > 0.1) {
      onPositionChange(ref.current.position.clone());
      prevPos.current.copy(ref.current.position);
    }

    // Camera follow
    state.camera.position.x = ref.current.position.x;
    state.camera.position.z = ref.current.position.z + (sceneId === 'street' ? 14 : 10);
    state.camera.position.y = sceneId === 'street' ? 10 : 8;
    state.camera.lookAt(ref.current.position);
  });

  return (
    <group ref={ref} position={[0, 1.5, 0]}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <mesh castShadow receiveShadow>
          <planeGeometry args={[2.5, 3.5]} />
          <meshBasicMaterial map={texture} transparent={true} alphaTest={0.1} side={THREE.DoubleSide} />
        </mesh>
      </Billboard>
      <ContactShadows position={[0, -1.4, 0]} opacity={0.6} scale={4} blur={2} far={2} />
    </group>
  );
}

// --- FOLLOWER ---
function Follower({ image, targetPos, delay }) {
  const ref = useRef();
  const texture = useLoader(THREE.TextureLoader, image);
  
  useEffect(() => {
    if (ref.current && targetPos && ref.current.position.length() === 0) {
      // Init position
      ref.current.position.copy(targetPos);
    }
  }, [targetPos]);

  useFrame(() => {
    if (!ref.current || !targetPos) return;
    // Smooth interpolation towards targetPos
    ref.current.position.lerp(targetPos, 0.1);
  });

  return (
    <group ref={ref}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <planeGeometry args={[2.5, 3.5]} />
          <meshBasicMaterial map={texture} transparent={true} alphaTest={0.1} side={THREE.DoubleSide} />
        </mesh>
      </Billboard>
      <ContactShadows position={[0, 0.1, 0]} opacity={0.6} scale={4} blur={2} far={2} />
    </group>
  );
}

// --- NPC ---
function NPC({ position, image }) {
  const texture = useLoader(THREE.TextureLoader, image);
  return (
    <group position={position}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <planeGeometry args={[2.5, 3.5]} />
          <meshBasicMaterial map={texture} transparent={true} alphaTest={0.1} side={THREE.DoubleSide} />
        </mesh>
      </Billboard>
      <ContactShadows position={[0, 0.1, 0]} opacity={0.6} scale={4} blur={2} far={2} />
    </group>
  );
}

// --- CUTSCENE ACTOR ---
function CutsceneActor({ position, image, active, targetZ }) {
  const ref = useRef();
  const texture = useLoader(THREE.TextureLoader, image);
  
  useEffect(() => {
    if (ref.current) ref.current.position.copy(new THREE.Vector3(...position));
  }, [position]);

  useFrame((state, delta) => {
    if (!ref.current || !active) return;
    if (ref.current.position.z > targetZ) {
      ref.current.position.z -= 15 * delta; // Run fast
    }
  });

  return (
    <group ref={ref}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <planeGeometry args={[2.5, 3.5]} />
          <meshBasicMaterial map={texture} transparent={true} alphaTest={0.1} side={THREE.DoubleSide} />
        </mesh>
      </Billboard>
      <ContactShadows position={[0, 0.1, 0]} opacity={0.6} scale={4} blur={2} far={2} />
    </group>
  );
}

// --- 3D PROPS (Polygonal) ---
function Tree3D({ position }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.6, 3, 8]} />
        <meshStandardMaterial color="#3b2818" />
      </mesh>
      {/* Leaves */}
      <mesh position={[0, 4, 0]} castShadow receiveShadow>
        <icosahedronGeometry args={[2.5, 1]} />
        <meshStandardMaterial color="#1f5c22" flatShading />
      </mesh>
    </group>
  );
}

function Bench3D({ position }) {
  return (
    <group position={position}>
      {/* Seat */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.2, 1]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 1.2, -0.4]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.8, 0.2]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      {/* Legs */}
      <mesh position={[-1.2, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 0.6, 0.8]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      <mesh position={[1.2, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 0.6, 0.8]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
    </group>
  );
}

function Lamp3D({ position }) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.1, 0.15, 6, 8]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.4, 8]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {/* Light Bulb */}
      <mesh position={[0, 6.2, 0]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial emissive="#ffdd88" emissiveIntensity={2} color="#ffffff" />
      </mesh>
    </group>
  );
}

function Trash3D({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.5, 1.6, 12]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  );
}

// --- BUILDING & FURNITURE ---
function BuildingWithTexture({ position, size, textureMap, type }) {
  const texture = useLoader(THREE.TextureLoader, textureMap);
  const clonedTexture = useMemo(() => {
    const clone = texture.clone();
    clone.wrapS = THREE.RepeatWrapping;
    clone.wrapT = THREE.RepeatWrapping;
    if (size) clone.repeat.set(size[0]/5, size[1]/5);
    clone.needsUpdate = true;
    return clone;
  }, [texture, size]);

  return (
    <mesh position={position} castShadow receiveShadow>
      {type === 'cylinder' ? (
        <cylinderGeometry args={[size[0], size[2], size[1], 16]} />
      ) : (
        <boxGeometry args={size} />
      )}
      <meshStandardMaterial map={clonedTexture} />
    </mesh>
  );
}

function BuildingSolid({ position, size, color, type }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      {type === 'cylinder' ? (
        <cylinderGeometry args={[size[0], size[2], size[1], 16]} />
      ) : (
        <boxGeometry args={size} />
      )}
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Building(props) {
  if (props.textureMap) return <BuildingWithTexture {...props} />;
  return <BuildingSolid {...props} />;
}

// --- DOOR ---
function Door({ position, rotation = [0, 0, 0] }) {
  const texture = useLoader(THREE.TextureLoader, '/assets/door.png');
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[3, 4.5]} />
      <meshStandardMaterial map={texture} transparent={true} />
    </mesh>
  );
}

// --- FLOOR ---
function Floor({ sceneId }) {
  const isStreet = sceneId === 'street';
  const texturePath = isStreet ? '/assets/street.png' : '/assets/wood_floor.png';
  const texture = useLoader(THREE.TextureLoader, texturePath);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  
  const size = isStreet ? [100, 100] : [20, 20];
  texture.repeat.set(isStreet ? 20 : 5, isStreet ? 20 : 5);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, isStreet ? 0 : -0.1]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

// --- MAIN SCENE COMPONENT ---
export default function ExplorationScene({ sceneId }) {
  const setScene = useGameStore(state => state.setScene);
  const startDialogue = useGameStore(state => state.startDialogue);
  const initCombat = useGameStore(state => state.initCombat);
  const party = useGameStore(state => state.party);
  
  const investigation = useGameStore(state => state.investigation);
  const setInvestigation = useGameStore(state => state.setInvestigation);
  
  const [playerStartPos, setPlayerStartPos] = useState([0, 1.5, 8]);
  const [history, setHistory] = useState([]);
  
  // Cutscene State
  const [cutscene, setCutscene] = useState(sceneId === 'street' && !investigation.theftDone ? 'START' : 'DONE'); // START, RUNNING, DONE

  useEffect(() => {
    if (cutscene === 'START') {
      setTimeout(() => {
        setCutscene('RUNNING');
        startDialogue([
          { speaker: 'Ladro 1', text: 'Spacca! Spostati!' },
          { speaker: 'Federica', text: 'Ehi, ma siete pazzi?! ...Aspetta!' },
          { speaker: 'MariaLaura', text: 'Federica, ti hanno preso il telefono dalle mani!' },
          { speaker: 'Federica', text: 'Il mio telefono nuovo! Prendeteli!' }
        ], () => {
          setCutscene('DONE');
          setInvestigation({ theftDone: true });
        });
      }, 1000);
    }
  }, [cutscene]);

  // City Data
  const cityBuildings = [
    // Left side buildings
    { id: 'b1', position: [-20, 5, -20], size: [24, 15, 24], textureMap: '/assets/brick.png' },
    { id: 'b3', position: [-20, 5, 20], size: [24, 15, 24], textureMap: '/assets/brick.png' },
    { id: 'b5', position: [-20, 5, -50], size: [24, 15, 24], textureMap: '/assets/brick.png' },
    // Right side buildings
    { id: 'b2', position: [20, 5, -20], size: [24, 15, 24], textureMap: '/assets/shop_texture.png' },
    { id: 'b4', position: [20, 5, 20], size: [24, 15, 24], textureMap: '/assets/shop_texture.png' },
    { id: 'b6', position: [20, 5, -50], size: [24, 15, 24], textureMap: '/assets/brick.png' },
    // End of Street Wall
    { id: 'end_wall', position: [0, 10, -65], size: [100, 20, 10], textureMap: '/assets/brick.png' },
    // Hedges
    { id: 'hedge1', position: [-8, 0.5, 10], size: [1.5, 1, 6], color: '#005500' },
    { id: 'hedge2', position: [8, 0.5, 10], size: [1.5, 1, 6], color: '#005500' },
    // Road lines (Center dividing lines)
    { id: 'line1', position: [0, 0.01, 10], size: [0.5, 0.02, 4], color: '#ffffff' },
    { id: 'line2', position: [0, 0.01, 0], size: [0.5, 0.02, 4], color: '#ffffff' },
    { id: 'line3', position: [0, 0.01, -10], size: [0.5, 0.02, 4], color: '#ffffff' },
    { id: 'line4', position: [0, 0.01, -20], size: [0.5, 0.02, 4], color: '#ffffff' },
    { id: 'line5', position: [0, 0.01, -30], size: [0.5, 0.02, 4], color: '#ffffff' },
  ];

  const streetProps = [
    // Benches
    { id: 'bench1', position: [-6, 0, -5], type: 'bench' },
    { id: 'bench2', position: [6, 0, -5], type: 'bench' },
    { id: 'bench3', position: [-6, 0, -25], type: 'bench' },
    { id: 'bench4', position: [6, 0, -25], type: 'bench' },
    // Trees
    { id: 'tree1', position: [-10, 0, -15], type: 'tree' },
    { id: 'tree2', position: [10, 0, -15], type: 'tree' },
    { id: 'tree3', position: [-10, 0, 5], type: 'tree' },
    { id: 'tree4', position: [10, 0, 5], type: 'tree' },
    // Trash cans
    { id: 'trash1', position: [-8, 0, -2], type: 'trash' },
    { id: 'trash2', position: [8, 0, -22], type: 'trash' },
    // Street lamps
    { id: 'lamp1', position: [-9, 0, 0], type: 'lamp' },
    { id: 'lamp2', position: [9, 0, 0], type: 'lamp' },
    { id: 'lamp3', position: [-9, 0, -20], type: 'lamp' },
    { id: 'lamp4', position: [9, 0, -20], type: 'lamp' },
  ];
  
  const doors = [
    { id: 'bar', position: [-10, 2.25, -7.99], destination: 'bar' },
    { id: 'shop', position: [10, 2.25, -7.99], destination: 'shop' }
  ];

  // Interiors Data
  const interiorBuildings = [
    { id: 'wall_n', position: [0, 5, -10], size: [20, 10, 2], textureMap: '/assets/wallpaper.png' },
    { id: 'wall_w', position: [-10, 5, 0], size: [2, 10, 20], textureMap: '/assets/wallpaper.png' },
    { id: 'wall_e', position: [10, 5, 0], size: [2, 10, 20], textureMap: '/assets/wallpaper.png' },
  ];
  
  const barFurniture = [
    { id: 'counter', position: [0, 1.5, -6], size: [10, 3, 2], color: '#8b4513' },
    { id: 'stool1', position: [-3, 1, -4], size: [0.8, 2, 0.8], color: '#cc0000', type: 'cylinder' },
    { id: 'stool2', position: [0, 1, -4], size: [0.8, 2, 0.8], color: '#cc0000', type: 'cylinder' },
    { id: 'stool3', position: [3, 1, -4], size: [0.8, 2, 0.8], color: '#cc0000', type: 'cylinder' },
    { id: 'table1', position: [-6, 1.5, 2], size: [3, 0.2, 3], color: '#deb887', type: 'cylinder' },
    { id: 'table_base1', position: [-6, 0.75, 2], size: [0.5, 1.5, 0.5], color: '#333', type: 'cylinder' },
    { id: 'table2', position: [6, 1.5, 2], size: [3, 0.2, 3], color: '#deb887', type: 'cylinder' },
    { id: 'table_base2', position: [6, 0.75, 2], size: [0.5, 1.5, 0.5], color: '#333', type: 'cylinder' }
  ];

  const shopFurniture = [
    { id: 'cashdesk', position: [0, 1.5, -6], size: [6, 3, 2], color: '#ddd' },
    { id: 'shelf1', position: [-8, 4, 0], size: [2, 8, 6], color: '#8b4513' },
    { id: 'shelf2', position: [8, 4, 0], size: [2, 8, 6], color: '#8b4513' },
    { id: 'display', position: [0, 1.5, 2], size: [4, 2, 2], color: '#aaa' }
  ];

  let currentBuildings = sceneId === 'street' ? cityBuildings : interiorBuildings;
  if (sceneId === 'bar') currentBuildings = [...currentBuildings, ...barFurniture];
  if (sceneId === 'shop') currentBuildings = [...currentBuildings, ...shopFurniture];

  const interiorDoors = [
    { id: 'exit', position: [0, 2.25, 8.99], destination: 'street', rotation: [0, Math.PI, 0] }
  ];

  const currentDoors = sceneId === 'street' ? doors : interiorDoors;

  // Interactions
  const handleInteract = (playerPos) => {
    // 1. Check Doors
    for (const door of currentDoors) {
      if (playerPos.distanceTo(new THREE.Vector3(door.position[0], 0, door.position[2])) < 4) {
        setScene(door.destination); 
        if (door.destination === 'street') setPlayerStartPos([door.position[0], 1.5, door.position[2] + 4]); 
        else setPlayerStartPos([0, 1.5, 5]);
        return;
      }
    }

    // 2. Check NPCs
    if (sceneId === 'bar') {
      if (playerPos.distanceTo(new THREE.Vector3(0, 0, -4)) < 4) {
        if (!investigation.talkedToBarista) {
          setInvestigation({ talkedToBarista: true, clues: investigation.clues + 1 });
          startDialogue([
            { speaker: 'Barista', text: 'Benvenuti! Ladri? Sì, due ragazzi con le maschere sono passati di corsa. Andavano verso nord, molto agitati.' },
            { speaker: 'Federica', text: 'Grazie! Un indizio utile.' }
          ]);
        } else {
          startDialogue([{ speaker: 'Barista', text: 'Prendete un caffè se volete, offre la casa!' }]);
        }
      }
    } else if (sceneId === 'shop') {
      if (playerPos.distanceTo(new THREE.Vector3(0, 0, -4)) < 4) {
        if (!investigation.talkedToNegoziante) {
          setInvestigation({ talkedToNegoziante: true, clues: investigation.clues + 1 });
          startDialogue([
            { speaker: 'Negoziante', text: 'Ho visto due tipi sospetti fuggire verso nord, alla fine della strada. Hanno fatto cadere una cover!' },
            { speaker: 'MariaLaura', text: 'La cover di Federica! Andiamo a prenderli!' }
          ]);
        } else {
          startDialogue([{ speaker: 'Negoziante', text: 'State attente, sembravano tipi pericolosi.' }]);
        }
      }
    }
  };

  const handlePositionChange = (pos) => {
    setHistory(prev => {
      const newHistory = [...prev, pos];
      if (newHistory.length > 50) newHistory.shift(); 
      return newHistory;
    });

    // Automatic combat trigger at end of street
    if (sceneId === 'street' && pos.z < -30 && investigation.clues >= 2 && !investigation.foundThieves) {
      setInvestigation({ foundThieves: true });
      startDialogue([
        { speaker: 'Federica', text: 'Eccoli! Fermatevi!' },
        { speaker: 'Ladro', text: 'Ci avete trovato... ma non vi libererete di noi così facilmente!' }
      ], () => {
        initCombat(party, [ENEMIES.ladro1, ENEMIES.ladro2]);
      });
    }
  };

  const follower1Target = history.length > 20 ? history[history.length - 20] : null;
  const follower2Target = history.length > 40 ? history[history.length - 40] : null;

  return (
    <div style={{ width: '100vw', height: '100vh', background: sceneId === 'street' ? '#111' : '#000' }}>
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 5, 10]} />
        <ambientLight intensity={sceneId === 'street' ? 0.3 : 0.6} />
        <directionalLight position={[10, 20, 5]} intensity={0.5} color="#ffffef" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.0005} />
        
        {sceneId === 'street' ? <Environment preset="night" /> : <Environment preset="apartment" />}
        
        {sceneId === 'street' && (
          // Bright warm lights near the doors and street lamps (NO CAST SHADOW TO SAVE PERFORMANCE)
          <>
            <pointLight position={[-10, 3, -7]} intensity={1.5} color="#ffaa55" distance={15} />
            <pointLight position={[10, 3, -7]} intensity={1.5} color="#ffaa55" distance={15} />
            <pointLight position={[0, 5, -20]} intensity={1} color="#ffffff" distance={30} />
            
            {/* Street lamp lights */}
            <pointLight position={[-9, 5, 0]} intensity={1} color="#ffffaa" distance={20} />
            <pointLight position={[9, 5, 0]} intensity={1} color="#ffffaa" distance={20} />
            <pointLight position={[-9, 5, -20]} intensity={1} color="#ffffaa" distance={20} />
            <pointLight position={[9, 5, -20]} intensity={1} color="#ffffaa" distance={20} />
          </>
        )}

        <React.Suspense fallback={<Loader />}>
          <EffectComposer>
            <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={0.8} />
            <Noise opacity={0.02} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
          <Floor sceneId={sceneId} />
          
          {currentBuildings.map(b => <Building key={b.id} {...b} isExterior={sceneId === 'street'} />)}
          {sceneId === 'street' && streetProps.map(p => {
            if (p.type === 'tree') return <Tree3D key={p.id} position={p.position} />;
            if (p.type === 'bench') return <Bench3D key={p.id} position={p.position} />;
            if (p.type === 'lamp') return <Lamp3D key={p.id} position={p.position} />;
            if (p.type === 'trash') return <Trash3D key={p.id} position={p.position} />;
            return null;
          })}
          {currentDoors.map(d => <Door key={d.id} position={d.position} rotation={d.rotation} />)}

          <Player buildings={currentBuildings} onInteract={handleInteract} startPos={playerStartPos} sceneId={sceneId} onPositionChange={handlePositionChange} isCutsceneActive={cutscene === 'RUNNING'} />

          {/* Companions */}
          {party.length > 1 && <Follower image={`/assets/${party[1].id}.png`} targetPos={follower1Target} delay={20} />}
          {party.length > 2 && <Follower image={`/assets/${party[2].id}.png`} targetPos={follower2Target} delay={40} />}

          {/* Cutscene Actors */}
          {sceneId === 'street' && (cutscene === 'RUNNING' || cutscene === 'START') && (
            <>
              <CutsceneActor position={[-1, 1.5, 15]} image="/assets/ladro.png" active={cutscene === 'RUNNING'} targetZ={-40} />
              <CutsceneActor position={[1, 1.5, 16]} image="/assets/ladro.png" active={cutscene === 'RUNNING'} targetZ={-40} />
            </>
          )}

          {/* NPCs */}
          {sceneId === 'bar' && <NPC position={[0, 0, -4]} image="/assets/pierluigi.png" />}
          {sceneId === 'shop' && <NPC position={[0, 0, -4]} image="/assets/ciccio.png" />}
          {sceneId === 'street' && investigation.clues >= 2 && (
            <>
              <NPC position={[-2, 0, -35]} image="/assets/ladro.png" />
              <NPC position={[2, 0, -35]} image="/assets/ladro.png" />
            </>
          )}

        </React.Suspense>
      </Canvas>
      
      {!useGameStore.getState().dialogue && (
        <div className="ui-layer">
          <div style={{ padding: '2rem', color: 'white', textShadow: '0 1px 4px black', background: 'rgba(0,0,0,0.5)', width: '300px' }}>
            <h2>{sceneId === 'street' ? 'Strada Principale' : sceneId === 'bar' ? 'Bar di Quartiere' : 'Negozio di Elettronica'}</h2>
            <p><strong>W A S D</strong> per muoverti.</p>
            <p><strong>Spazio / E</strong> per interagire.</p>
            <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#333', borderRadius: '4px' }}>
              <h3>Obiettivo</h3>
              <p>Indaga nei negozi: {investigation.clues} / 2 indizi</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
