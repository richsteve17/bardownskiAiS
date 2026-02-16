
import React, { useEffect, useState } from 'react';
import { generateCommentary } from '../services/geminiService';

interface ScrapEngineProps {
  enforcer1Name: string;
  enforcer2Name: string;
  onScrapEnd: () => void;
}

export const ScrapEngine: React.FC<ScrapEngineProps> = ({ enforcer1Name, enforcer2Name, onScrapEnd }) => {
  const [balance, setBalance] = useState<number>(50); // 0-100, player must keep in middle range (30-70)
  const [oppWill, setOppWill] = useState<number>(100); // 0-100, reduce to 0 to win
  const [commentary, setCommentary] = useState<string>("Balance the meter and PUNCH to win!");
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [punchCooldown, setPunchCooldown] = useState<number>(0);
  const [driftDirection, setDriftDirection] = useState<number>(Math.random() > 0.5 ? 1 : -1);

  // Game Loop - Balance meter constantly drifts, oppWill decreases on punch
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameInterval = setInterval(() => {
      setBalance(prev => {
        let newBalance = prev + driftDirection * 1.5; // Constant drift

        // Random direction change occasionally
        if (Math.random() < 0.05) {
          setDriftDirection(d => -d);
        }

        // Clamp balance
        if (newBalance < 0) newBalance = 0;
        if (newBalance > 100) newBalance = 100;

        // Check lose condition: balance reaches 0 or 100
        if (newBalance <= 0 || newBalance >= 100) {
          setGameState('lost');
          generateCommentary(`${enforcer1Name} got thrown down! Brutal!`).then(setCommentary);
          return newBalance;
        }

        return newBalance;
      });

      // Decrement punch cooldown
      setPunchCooldown(prev => Math.max(0, prev - 1));
    }, 100); // Update every 100ms

    return () => clearInterval(gameInterval);
  }, [gameState, driftDirection, enforcer1Name]);

  // Check win condition
  useEffect(() => {
    if (oppWill <= 0 && gameState === 'playing') {
      setGameState('won');
      generateCommentary(`${enforcer1Name} dominates ${enforcer2Name}! SWAGGER BOOST!`).then(setCommentary);
    }
  }, [oppWill, gameState, enforcer1Name, enforcer2Name]);

  const handlePunch = () => {
    if (gameState !== 'playing' || punchCooldown > 0) return;

    // Punch reduces oppWill
    const punchDamage = 15 + Math.random() * 10; // 15-25 damage
    setOppWill(prev => Math.max(0, prev - punchDamage));

    // Punch causes random balance recoil
    const recoil = (Math.random() - 0.5) * 20; // -10 to +10
    setBalance(prev => {
      let newBalance = prev + recoil;
      if (newBalance < 0) newBalance = 0;
      if (newBalance > 100) newBalance = 100;
      return newBalance;
    });

    setPunchCooldown(15); // 1.5 second cooldown (15 * 100ms)
    generateCommentary(`${enforcer1Name} lands a solid punch!`).then(setCommentary);
  };

  const handleCounterBalance = (direction: 'left' | 'right') => {
    if (gameState !== 'playing') return;

    // Manually adjust balance to counteract drift
    const adjustment = direction === 'left' ? -3 : 3;
    setBalance(prev => {
      let newBalance = prev + adjustment;
      if (newBalance < 0) newBalance = 0;
      if (newBalance > 100) newBalance = 100;
      return newBalance;
    });
  };

  const handleContinue = () => {
    onScrapEnd();
  };

  return (
    <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-[100]">
      {/* Title */}
      <h2 className="text-6xl font-black text-red-500 mb-4 uppercase tracking-widest">SCRAP!</h2>
      <p className="text-2xl text-white font-bold mb-8">
        {enforcer1Name} vs. {enforcer2Name}
      </p>

      {/* Game Area */}
      <div className="w-full max-w-2xl px-8 mb-8">
        {/* Balance Meter */}
        <div className="mb-8">
          <div className="text-white font-bold mb-2">BALANCE METER</div>
          <div className="relative bg-gray-800 h-12 rounded border-2 border-gray-600">
            {/* Safe zone indicator */}
            <div className="absolute top-0 left-[30%] w-[40%] h-full bg-green-500/20 border-l border-r border-green-500/50"></div>
            
            {/* Balance bar */}
            <div
              className={`absolute top-0 left-0 h-full transition-all duration-100 ${
                balance < 30 || balance > 70 ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${balance}%` }}
            ></div>

            {/* Balance text */}
            <div className="absolute inset-0 flex items-center justify-center font-bold text-white text-lg">
              {Math.round(balance)}
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-1 text-center">
            Keep balance between 30-70 or you lose!
          </div>
        </div>

        {/* Opponent Will Meter */}
        <div className="mb-8">
          <div className="text-white font-bold mb-2">{enforcer2Name.toUpperCase()} WILL</div>
          <div className="relative bg-gray-800 h-12 rounded border-2 border-gray-600">
            <div
              className="absolute top-0 left-0 h-full bg-red-600 transition-all duration-200"
              style={{ width: `${oppWill}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center font-bold text-white text-lg">
              {Math.round(oppWill)}
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-1 text-center">
            Reduce to 0 to win!
          </div>
        </div>

        {/* Commentary */}
        <div className="bg-gray-900/80 p-4 rounded border border-gray-700 text-gray-300 font-mono text-center mb-8">
          <span className="text-red-500 font-bold">COMMISSIONER:</span> {commentary}
        </div>

        {/* Game Status */}
        {gameState === 'playing' && (
          <div className="text-center">
            <div className="text-yellow-400 font-bold text-lg mb-4">
              {balance < 30 || balance > 70 ? '⚠️ LOSING BALANCE!' : '✓ BALANCED'}
            </div>
          </div>
        )}

        {gameState === 'won' && (
          <div className="text-center mb-4">
            <div className="text-green-400 font-black text-3xl mb-2">VICTORY!</div>
            <div className="text-green-300 text-lg">+Swagger Boost +Power Play Buff</div>
          </div>
        )}

        {gameState === 'lost' && (
          <div className="text-center mb-4">
            <div className="text-red-400 font-black text-3xl mb-2">DEFEATED!</div>
            <div className="text-red-300 text-lg">-Swagger Penalty</div>
          </div>
        )}
      </div>

      {/* Controls */}
      {gameState === 'playing' && (
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => handleCounterBalance('left')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg active:scale-95 transition-transform"
          >
            ← LEFT
          </button>
          <button
            onClick={handlePunch}
            disabled={punchCooldown > 0}
            className={`${
              punchCooldown > 0
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 active:scale-95'
            } text-white font-black py-3 px-8 rounded-lg text-2xl transition-transform`}
          >
            {punchCooldown > 0 ? `PUNCH (${(punchCooldown / 10).toFixed(1)}s)` : 'PUNCH!'}
          </button>
          <button
            onClick={() => handleCounterBalance('right')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg active:scale-95 transition-transform"
          >
            RIGHT →
          </button>
        </div>
      )}

      {/* Continue Button */}
      {gameState !== 'playing' && (
        <button
          onClick={handleContinue}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg active:scale-95 transition-transform"
        >
          Continue Match
        </button>
      )}
    </div>
  );
};
