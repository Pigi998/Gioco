import React from 'react';
import { useGameStore } from './store/gameStore';
import SelectionScene from './scenes/SelectionScene';
import ExplorationScene from './scenes/ExplorationScene';
import CombatScene from './scenes/CombatScene';
import DialogueBox from './components/DialogueBox';

function App() {
  const currentScene = useGameStore(state => state.currentScene);

  return (
    <>
      {currentScene === 'SELECTION' && <SelectionScene />}
      {currentScene === 'EXPLORATION_1' && <ExplorationScene sceneId="street" />}
      {currentScene === 'bar' && <ExplorationScene sceneId="bar" />}
      {currentScene === 'shop' && <ExplorationScene sceneId="shop" />}
      {currentScene === 'street' && <ExplorationScene sceneId="street" />}
      {currentScene === 'COMBAT' && <CombatScene combatId="ladri" />}
      {currentScene === 'COMBAT_1' && <CombatScene combatId="ladri" />}
      {currentScene === 'EXPLORATION_2' && <ExplorationScene sceneId="house" />}
      {currentScene === 'COMBAT_2' && <CombatScene combatId="coinquilini" />}
      
      {/* Global UI Overlays */}
      <DialogueBox />
    </>
  );
}

export default App;
