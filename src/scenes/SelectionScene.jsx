import React from 'react';
import { useGameStore, CHARACTERS } from '../store/gameStore';

export default function SelectionScene() {
  const setScene = useGameStore(state => state.setScene);
  const setParty = useGameStore(state => state.setParty);
  const startDialogue = useGameStore(state => state.startDialogue);

  const handleSelect = () => {
    // Set the initial party
    setParty([CHARACTERS.federica, CHARACTERS.marialaura, CHARACTERS.oscurato]);
    
    // Switch to 3D scene first
    setScene('EXPLORATION_1');
    
    // Start intro dialogue over the 3D scene
    startDialogue([
      { speaker: 'Federica', text: 'Che bella passeggiata oggi!' },
      { speaker: 'MariaLaura', text: 'Sì, davvero rilassante...' },
      { speaker: '???', text: '...' },
      { speaker: 'Ladro', text: 'Fermi tutti! Dateci il telefono!' },
      { speaker: 'Federica', text: 'Ehi! Ridammelo subito!' },
      { speaker: 'Ladro', text: '*I ladri scappano via*' },
      { speaker: 'MariaLaura', text: 'Dobbiamo inseguirli!' },
      { speaker: 'Sistema', text: 'Esplora la strada e chiedi ai passanti se hanno visto qualcosa.' }
    ]);
  };

  return (
    <div className="ui-layer selection-screen">
      <h1 style={{ fontSize: '3rem', marginBottom: '2rem', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
        Federica's Bizarre Adventure
      </h1>
      <p style={{ marginBottom: '2rem', fontSize: '1.2rem' }}>Scegli il tuo personaggio principale</p>
      
      <div style={{ display: 'flex', gap: '2rem' }}>
        <div className="character-card" onClick={handleSelect}>
          <h2>Federica</h2>
          <p style={{ margin: '1rem 0', color: '#ccc' }}>
            Amante della pizza. Combattente bilanciata.
          </p>
          <button className="btn">Seleziona</button>
        </div>
      </div>
    </div>
  );
}
