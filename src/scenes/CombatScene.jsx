import React, { useState, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Billboard } from '@react-three/drei';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

function CharacterSprite({ position, image, isTurn, hp, maxHp, name }) {
  const texture = useLoader(THREE.TextureLoader, image);
  
  return (
    <group position={position}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false} position={[0, 1.5, 0]}>
        <mesh>
          <planeGeometry args={[2.5, 3.5]} />
          <meshBasicMaterial map={texture} transparent={true} side={THREE.DoubleSide} color={isTurn ? '#ffffaa' : '#ffffff'} />
        </mesh>
      </Billboard>
      {/* HP Bar */}
      <mesh position={[0, 3.5, 0]}>
        <planeGeometry args={[1.5, 0.2]} />
        <meshBasicMaterial color="red" />
      </mesh>
      <mesh position={[-0.75 + (1.5 * (hp / maxHp)) / 2, 3.5, 0.01]}>
        <planeGeometry args={[1.5 * (hp / maxHp), 0.2]} />
        <meshBasicMaterial color="green" />
      </mesh>
    </group>
  );
}

function Floor({ combatId }) {
  const texturePath = combatId === 'ladri' ? '/assets/street.png' : '/assets/house.png';
  const texture = useLoader(THREE.TextureLoader, texturePath);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

export default function CombatScene({ combatId }) {
  const setScene = useGameStore(state => state.setScene);
  const party = useGameStore(state => state.party);
  const enemies = useGameStore(state => state.enemies);
  const combatState = useGameStore(state => state.combatState);
  const nextTurn = useGameStore(state => state.nextTurn);
  const updatePartyMemberHp = useGameStore(state => state.updatePartyMemberHp);
  const updateEnemyHp = useGameStore(state => state.updateEnemyHp);
  const setCombatLog = useGameStore(state => state.setCombatLog);
  const startDialogue = useGameStore(state => state.startDialogue);

  const [menuState, setMenuState] = useState('MAIN'); // MAIN, SKILLS, TARGET
  const [selectedSkill, setSelectedSkill] = useState(null);

  const activeChar = combatState.activeCharacter;
  const isPlayerTurn = !activeChar?.isEnemy;

  useEffect(() => {
    // Check win/loss condition
    const partyAlive = party.some(p => p.hp > 0);
    const enemiesAlive = enemies.some(e => e.hp > 0);

    if (!enemiesAlive) {
      setTimeout(() => {
        if (combatId === 'ladri') {
          startDialogue([
            { speaker: 'Federica', text: 'Abbiamo recuperato il telefono!' },
            { speaker: 'Gaspare', text: 'Ehi ragazze! Scusate il ritardo.' },
            { speaker: 'MariaLaura', text: 'Gaspare! Tutto risolto, avevamo solo un piccolo contrattempo.' },
            { speaker: 'Gaspare', text: 'Meno male. Sentite, ho scordato il portafoglio a casa. Vi va di passare con me a prenderlo?' },
            { speaker: 'Federica', text: 'Certo, andiamo.' }
          ], () => setScene('EXPLORATION_2'));
        } else {
          startDialogue([
            { speaker: 'Federica', text: 'Fiuu, che scontro...' },
            { speaker: 'Gaspare', text: 'Ragazzi, mi sa che abbiamo interrotto il vostro film, scusate.' },
            { speaker: 'Pierluigi', text: 'Nessun problema, la pizza si è raffreddata però.' },
            { speaker: 'MariaLaura', text: 'Noi andiamo, ciao a tutti!' }
          ], () => setScene('SELECTION')); // For now, end of game returns to selection
        }
      }, 2000);
    } else if (!partyAlive) {
      setTimeout(() => {
        alert("Game Over!");
        setScene('SELECTION');
      }, 2000);
    } else if (!isPlayerTurn && enemiesAlive && partyAlive) {
      // Enemy AI turn
      setTimeout(() => {
        executeEnemyTurn();
      }, 1500);
    }
  }, [party, enemies, combatState.currentTurnIndex]);

  const executeEnemyTurn = () => {
    if (activeChar.hp <= 0) {
      nextTurn();
      return;
    }
    
    // Simple AI
    const skill = activeChar.skills ? activeChar.skills[Math.floor(Math.random() * activeChar.skills.length)] : { type: 'damage', power: 10, name: 'Attacco Base' };
    const validTargets = party.filter(p => p.hp > 0);
    const target = validTargets[Math.floor(Math.random() * validTargets.length)];

    if (skill.type === 'buff_self_fake') {
      setCombatLog(`${activeChar.name} usa ${skill.name}! L'attacco fisico aumenta a dismisura... ma non succede niente!`);
    } else if (skill.type === 'damage') {
      const damage = Math.floor(activeChar.attack * (skill.power / 10));
      updatePartyMemberHp(target.id, -damage);
      setCombatLog(`${activeChar.name} attacca ${target.name} per ${damage} danni!`);
    } else if (skill.type === 'steal_hp') {
      const damage = 15;
      updatePartyMemberHp(target.id, -damage);
      updateEnemyHp(activeChar.id, damage);
      setCombatLog(`${activeChar.name} usa ${skill.name} su ${target.name} rubando ${damage} HP!`);
    } else if (skill.type === 'heal_aoe') {
      enemies.forEach(e => updateEnemyHp(e.id, skill.power));
      setCombatLog(`${activeChar.name} usa ${skill.name} e cura tutti i nemici!`);
    } else {
       const damage = 10;
       updatePartyMemberHp(target.id, -damage);
       setCombatLog(`${activeChar.name} attacca ${target.name} per ${damage} danni!`);
    }

    setTimeout(nextTurn, 2000);
  };

  const handleAction = (skill, target) => {
    if (skill.type === 'damage' || skill.type === 'debuff') {
      const damage = skill.type === 'damage' ? Math.floor(activeChar.attack * (skill.power / 10)) : 0;
      if (damage > 0) updateEnemyHp(target.id, -damage);
      setCombatLog(`${activeChar.name} usa ${skill.name} su ${target.name}${damage > 0 ? ` per ${damage} danni!` : '!'}`);
    } else if (skill.type === 'heal') {
      updatePartyMemberHp(target.id, skill.power);
      setCombatLog(`${activeChar.name} usa ${skill.name} su ${target.name} e lo cura di ${skill.power} HP!`);
    } else if (skill.type === 'damage_aoe') {
      const damage = Math.floor(activeChar.attack * (skill.power / 10));
      enemies.forEach(e => updateEnemyHp(e.id, -damage));
      setCombatLog(`${activeChar.name} usa ${skill.name} su tutti i nemici per ${damage} danni!`);
    }

    setMenuState('MAIN');
    setTimeout(nextTurn, 1500);
  };

  if (!activeChar) return null;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#222' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 4, 10]} lookAt={[0,0,0]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} />
        <Environment preset={combatId === 'ladri' ? "city" : "apartment"} />

        <React.Suspense fallback={null}>
          <Floor combatId={combatId} />

          {/* Party Models */}
          {party.map((p, i) => (
            p.hp > 0 && <CharacterSprite key={p.id} position={[-4 + i * 2, 0, 2]} image={`/assets/${p.id}.png`} isTurn={activeChar.id === p.id} hp={p.hp} maxHp={p.maxHp} name={p.name} />
          ))}

          {/* Enemy Models */}
          {enemies.map((e, i) => (
            e.hp > 0 && <CharacterSprite key={e.id} position={[-2 + i * 2, 0, -3]} image={`/assets/${e.id}.png`} isTurn={activeChar.id === e.id} hp={e.hp} maxHp={e.maxHp} name={e.name} />
          ))}
        </React.Suspense>
      </Canvas>

      <div className="ui-layer">
        <div className="combat-log">
          {combatState.logMessage}
        </div>

        {isPlayerTurn && activeChar.hp > 0 && (
          <div className="combat-ui">
            <div className="combat-menu">
              {menuState === 'MAIN' && (
                <>
                  <button className="menu-btn" onClick={() => setMenuState('SKILLS')}>Abilità</button>
                  <button className="menu-btn" onClick={() => handleAction({type:'damage', power: 10, name:'Attacco Base'}, enemies.find(e=>e.hp>0))}>Attacca (Auto)</button>
                </>
              )}
              {menuState === 'SKILLS' && (
                <>
                  {activeChar.skills?.map(s => (
                    <button key={s.id} className="menu-btn" onClick={() => {
                      if (s.target === 'all_enemies') {
                        handleAction(s, null);
                      } else {
                        setSelectedSkill(s);
                        setMenuState('TARGET');
                      }
                    }}>{s.name}</button>
                  ))}
                  <button className="menu-btn" onClick={() => setMenuState('MAIN')}>Indietro</button>
                </>
              )}
              {menuState === 'TARGET' && (
                <>
                  {selectedSkill?.target === 'ally' ? 
                    party.filter(p=>p.hp>0).map(p => (
                      <button key={p.id} className="menu-btn" onClick={() => handleAction(selectedSkill, p)}>{p.name}</button>
                    )) :
                    enemies.filter(e=>e.hp>0).map(e => (
                      <button key={e.id} className="menu-btn" onClick={() => handleAction(selectedSkill, e)}>{e.name}</button>
                    ))
                  }
                  <button className="menu-btn" onClick={() => setMenuState('SKILLS')}>Indietro</button>
                </>
              )}
            </div>

            <div className="party-status">
              {party.map(p => (
                <div key={p.id} className="character-status">
                  <span style={{width: '100px', fontWeight: activeChar.id === p.id ? 'bold' : 'normal', color: activeChar.id === p.id ? '#fbbf24' : 'white'}}>
                    {p.name}
                  </span>
                  <div className="hp-bar-container">
                    <div className="hp-bar" style={{ width: `${(p.hp / p.maxHp) * 100}%` }} />
                  </div>
                  <span>{p.hp}/{p.maxHp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
