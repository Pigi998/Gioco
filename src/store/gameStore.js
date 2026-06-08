import { create } from 'zustand';

// Character Definitions
export const CHARACTERS = {
  federica: {
    id: 'federica',
    name: 'Federica',
    maxHp: 100,
    attack: 15,
    defense: 10,
    skills: [
      { id: 'attack', name: 'Attacco Base', type: 'damage', power: 1 },
      { id: 'mangiare_pizza', name: 'Mangiare Pizza', type: 'heal', power: 30, target: 'ally' },
      { id: 'tirare_pizza', name: 'Tirare Pizza', type: 'damage', power: 25, target: 'enemy' }
    ]
  },
  marialaura: {
    id: 'marialaura',
    name: 'MariaLaura',
    maxHp: 80,
    attack: 12,
    defense: 8,
    skills: [
      { id: 'attack', name: 'Attacco Base', type: 'damage', power: 1 },
      { id: 'insulto', name: 'Insulto', type: 'debuff', effect: 'lower_attack', target: 'enemy' }
    ]
  },
  oscurato: {
    id: 'oscurato',
    name: '???',
    maxHp: 90,
    attack: 20,
    defense: 12,
    skills: [
      { id: 'attack', name: 'Attacco Base', type: 'damage', power: 1 },
      { id: 'alito', name: 'Alito Pestilenziale', type: 'damage_aoe', power: 15, target: 'all_enemies' }
    ]
  }
};

export const ENEMIES = {
  ladro1: { id: 'ladro1', name: 'Ladro 1', maxHp: 150, attack: 15, defense: 5 },
  ladro2: { id: 'ladro2', name: 'Ladro 2', maxHp: 150, attack: 15, defense: 5 },
  ciccio: { 
    id: 'ciccio', name: 'Ciccio', maxHp: 150, attack: 18, defense: 10,
    skills: [{ id: 'scalata', name: 'Scalata Sociale', type: 'steal_hp', power: 20 }]
  },
  alessio: { 
    id: 'alessio', name: 'Alessio', maxHp: 120, attack: 25, defense: 8,
    skills: [
      { id: 'insalata', name: "Mangio dell'insalata", type: 'heal_aoe', power: 20 },
      { id: 'squat', name: 'Squat', type: 'damage', power: 30 }
    ]
  },
  pierluigi: { 
    id: 'pierluigi', name: 'Pierluigi', maxHp: 100, attack: 15, defense: 15,
    skills: [{ id: 'posa', name: 'Flessione', type: 'buff_self_fake', power: 0 }]
  }
};

export const useGameStore = create((set, get) => ({
  currentScene: 'SELECTION', // SELECTION, EXPLORATION_1, COMBAT_1, DIALOGUE_1, EXPLORATION_2, COMBAT_2
  party: [],
  enemies: [],
  dialogue: null, // { speaker: '', text: '', nextScene: '' }
  inventory: [],
  
  // Quest State
  investigation: {
    clues: 0,
    talkedToBarista: false,
    talkedToNegoziante: false,
    foundThieves: false
  },
  
  setInvestigation: (updates) => set(state => ({
    investigation: { ...state.investigation, ...updates }
  })),

  // Actions
  setScene: (scene) => set({ currentScene: scene }),
  
  setParty: (members) => set({ 
    party: members.map(m => ({ ...m, hp: m.maxHp })) 
  }),
  
  setEnemies: (enemyList) => set({
    enemies: enemyList.map(e => ({ ...e, hp: e.maxHp }))
  }),

  startDialogue: (dialogueQueue, onComplete) => {
    let index = 0;
    
    const showNext = () => {
      if (index < dialogueQueue.length) {
        set({ dialogue: { ...dialogueQueue[index], onNext: () => {
          index++;
          showNext();
        }}});
      } else {
        set({ dialogue: null });
        if (onComplete) onComplete();
      }
    };
    
    showNext();
  },

  updatePartyMemberHp: (id, amount) => set(state => ({
    party: state.party.map(p => p.id === id ? { ...p, hp: Math.min(p.maxHp, Math.max(0, p.hp + amount)) } : p)
  })),

  updateEnemyHp: (id, amount) => set(state => ({
    enemies: state.enemies.map(e => e.id === id ? { ...e, hp: Math.max(0, e.hp + amount) } : e)
  })),
  
  // Combat State
  combatState: {
    turnOrder: [],
    currentTurnIndex: 0,
    activeCharacter: null,
    logMessage: '',
  },
  
  initCombat: (party, enemies) => {
    // Basic turn order: party first, then enemies
    const initEnemies = enemies.map(e => ({...e, hp: e.maxHp}));
    const turnOrder = [...party.map(p => ({...p, isEnemy: false})), ...initEnemies.map(e => ({...e, isEnemy: true}))];
    set({
      currentScene: 'COMBAT',
      enemies: initEnemies,
      combatState: { turnOrder, currentTurnIndex: 0, activeCharacter: turnOrder[0], logMessage: 'Inizia il combattimento!' }
    });
  },
  
  nextTurn: () => set(state => {
    const nextIndex = (state.combatState.currentTurnIndex + 1) % state.combatState.turnOrder.length;
    // skip dead characters
    let active = state.combatState.turnOrder[nextIndex];
    
    return {
      combatState: {
        ...state.combatState,
        currentTurnIndex: nextIndex,
        activeCharacter: active,
        logMessage: `Turno di ${active.name}`
      }
    };
  }),

  setCombatLog: (msg) => set(state => ({
    combatState: { ...state.combatState, logMessage: msg }
  }))
}));
