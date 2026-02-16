
import React from 'react';
import { Player } from '../types';

interface GameHUDProps {
  player: Player;
  score: { home: number; away: number };
  time: number;
  commentary: string;
  cooldowns: { turbo: number; shield: number; chaos: number };
  onShoot: () => void;
  onPass: () => void;
}

const StatBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="w-full bg-gray-700 rounded-full h-2.5">
    <div
      className={`h-2.5 rounded-full ${color}`}
      style={{ width: `${Math.max(0, Math.min(100, value + 50))}%
` }}
    ></div>
    <span className="text-xs text-gray-300 absolute -bottom-4 left-0 right-0 text-center">
      {label}: {value}
    </span>
  </div>
);

const CooldownBar: React.FC<{ label: string; cooldown: number; maxCooldown: number; color: string }> = ({ label, cooldown, maxCooldown, color }) => {
  const progress = (cooldown / maxCooldown) * 100;
  const displayTime = (cooldown / 60).toFixed(1);

  return (
    <div className="w-full bg-gray-700 rounded-full h-2.5 relative">
      <div
        className={`h-2.5 rounded-full ${color}`}
        style={{ width: `${100 - progress}%` }}
      ></div>
      <span className="text-xs text-gray-300 absolute -bottom-4 left-0 right-0 text-center">
        {label}: {cooldown > 0 ? `${displayTime}s` : 'READY'}
      </span>
    </div>
  );
};

export const GameHUD: React.FC<GameHUDProps> = ({ player, score, time, commentary, cooldowns, onShoot, onPass }) => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  return (
    <div className="absolute top-0 left-0 w-full p-4 z-50 text-white font-mono pointer-events-none">
      {/* Top Row: Score, Time, Period, Commentary */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-2xl font-bold">
          HOME {score.home} - {score.away} AWAY
        </div>
        <div className="text-xl">
          TIME: {minutes}:{seconds < 10 ? '0' : ''}{seconds}
        </div>
        <div className="text-lg bg-gray-800/70 px-3 py-1 rounded">
          PERIOD: 1
        </div>
      </div>

      {/* Commentary Ticker */}
      <div className="bg-gray-800/70 p-2 rounded text-sm mb-4 text-center">
        {commentary}
      </div>

      {/* Player Stats */}
      <div className="bg-gray-800/70 p-3 rounded mb-4">
        <h3 className="text-sm font-bold mb-2">{player.name} ({player.nickname})</h3>
        <div className="grid grid-cols-2 gap-y-6 gap-x-4 relative">
          <StatBar label="Swagger" value={player.gameStats.swagger} color="bg-cyan-500" />
          <StatBar label="Heat" value={player.gameStats.heat} color={player.gameStats.heat > 70 ? "bg-red-500" : player.gameStats.heat > 40 ? "bg-orange-500" : "bg-yellow-500"} />
          <StatBar label="Trust" value={player.gameStats.trust} color="bg-emerald-500" />
          <StatBar label="Chemistry" value={player.gameStats.chemistry} color="bg-purple-500" />
        </div>
      </div>

      {/* Abilities Cooldowns */}
      <div className="bg-gray-800/70 p-3 rounded">
        <h3 className="text-sm font-bold mb-2">Abilities</h3>
        <div className="grid grid-cols-3 gap-x-4 relative">
          <CooldownBar label="Q: Turbo" cooldown={cooldowns.turbo} maxCooldown={300} color="bg-blue-500" />
          <CooldownBar label="W: Shield" cooldown={cooldowns.shield} maxCooldown={480} color="bg-green-500" />
          <CooldownBar label="E: Chaos" cooldown={cooldowns.chaos} maxCooldown={720} color="bg-red-500" />
        </div>
      </div>

      {/* Mobile Touch Controls - Shoot & Pass Buttons */}
      <div className="fixed bottom-4 right-4 flex gap-2 pointer-events-auto">
        <button
          onClick={onPass}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-lg active:scale-95 transition-transform"
        >
          PASS (P)
        </button>
        <button
          onClick={onShoot}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-lg active:scale-95 transition-transform"
        >
          SHOOT (SPACE)
        </button>
      </div>
    </div>
  );
};
