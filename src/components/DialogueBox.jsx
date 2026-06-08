import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export default function DialogueBox() {
  const dialogue = useGameStore(state => state.dialogue);
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!dialogue) {
      setDisplayedText('');
      return;
    }

    let i = 0;
    setDisplayedText('');
    
    // Typewriter effect
    const interval = setInterval(() => {
      setDisplayedText(() => {
        if (i <= dialogue.text.length) {
          const nextText = dialogue.text.substring(0, i);
          i++;
          return nextText;
        } else {
          clearInterval(interval);
          return dialogue.text;
        }
      });
    }, 30); // Speed of typing

    return () => clearInterval(interval);
  }, [dialogue]);

  if (!dialogue) return null;

  const isFinished = displayedText === dialogue.text;

  const handleNext = () => {
    if (isFinished) {
      dialogue.onNext();
    } else {
      // Skip animation
      setDisplayedText(dialogue.text);
    }
  };

  return (
    <div className="ui-layer">
      <div className="dialogue-container" onClick={handleNext}>
        <div className="dialogue-speaker">{dialogue.speaker}</div>
        <div className="dialogue-text">{displayedText}</div>
        {isFinished && <div className="dialogue-next">Click per continuare ▼</div>}
      </div>
    </div>
  );
}
