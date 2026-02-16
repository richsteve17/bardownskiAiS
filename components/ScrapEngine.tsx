
import React, { useEffect, useState } from 'react';
import { generateCommentary } from '../services/geminiService';

interface ScrapEngineProps {
  enforcer1Name: string;
  enforcer2Name: string;
  onScrapEnd: () => void;
}

const SCRAP_ROUNDS = 5;
const EMOJIS = ['👊', '💥', '💢', '😤', '🤕'];

export const ScrapEngine: React.FC<ScrapEngineProps> = ({ enforcer1Name, enforcer2Name, onScrapEnd }) => {
  const [round, setRound] = useState(0);
  const [emojiIndex, setEmojiIndex] = useState(0);
  const [commentary, setCommentary] = useState("");

  useEffect(() => {
    const scrapInterval = setInterval(() => {
      setRound(prev => prev + 1);
      setEmojiIndex(Math.floor(Math.random() * EMOJIS.length));
      generateCommentary(`A brutal exchange between ${enforcer1Name} and ${enforcer2Name}!`).then(setCommentary);
    }, 500); // Each round lasts 0.5 seconds

    if (round >= SCRAP_ROUNDS) {
      clearInterval(scrapInterval);
      setTimeout(() => {
        onScrapEnd();
      }, 3000); // Pause for 3 seconds after scrap ends before resuming game
    }

    return () => clearInterval(scrapInterval);
  }, [round, enforcer1Name, enforcer2Name, onScrapEnd]);

  return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[100]">
      <h2 className="text-5xl font-black text-red-500 mb-8 uppercase tracking-widest">SCRAP!</h2>
      <div className="text-7xl mb-8 animate-pulse">
        {EMOJIS[emojiIndex]}
      </div>
      <p className="text-3xl text-white font-bold mb-4">
        {enforcer1Name} vs. {enforcer2Name}
      </p>
      <p className="text-xl text-gray-300 mb-8">
        Round {Math.min(round, SCRAP_ROUNDS)} of {SCRAP_ROUNDS}
      </p>
      <div className="max-w-xl bg-gray-900/80 p-4 rounded border border-gray-700 text-gray-300 font-mono text-center">
        <span className="text-red-500 font-bold">COMMISSIONER:</span> {commentary || "The fists are flying!"}
      </div>
    </div>
  );
};
