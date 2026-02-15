import React from 'react';
import { Player, PlayerClass } from '../types';

interface PlayerCardProps {
  player: Player;
  onAction?: () => void;
  actionLabel?: string;
  compact?: boolean;
}

const getClassIcon = (cls: PlayerClass) => {
    switch(cls) {
        case PlayerClass.SNIPER: return '🎯';
        case PlayerClass.ENFORCER: return '🥊';
        case PlayerClass.PLAYMAKER: return '⛸️';
        case PlayerClass.GOALIE: return '🧱';
        default: return '🏒';
    }
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onAction, actionLabel, compact }) => {
  return (
    <div className={`relative bg-gray-900 border-2 border-gray-700 p-4 shadow-lg flex flex-col gap-2 ${compact ? 'w-48 text-sm' : 'w-full max-w-sm'}`}>
      <div className="flex justify-between items-start">
        <div>
            <h3 className={`font-bold text-cyan-400 ${compact ? 'text-md' : 'text-xl'}`}>{player.name}</h3>
            <p className="text-gray-400 italic">"{player.nickname}"</p>
        </div>
        <div className="text-2xl" title={player.class}>{getClassIcon(player.class)}</div>
      </div>
      
      {!compact && <p className="text-gray-300 text-sm border-b border-gray-800 pb-2 mb-2">{player.bio}</p>}

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex justify-between"><span>Speed:</span> <span className="text-yellow-400">{player.stats.speed}</span></div>
        <div className="flex justify-between"><span>Shoot:</span> <span className="text-red-400">{player.stats.shooting}</span></div>
        <div className="flex justify-between"><span>Tough:</span> <span className="text-green-400">{player.stats.physicality}</span></div>
        <div className="flex justify-between"><span>Chirp:</span> <span className="text-purple-400">{player.stats.chirp}</span></div>
      </div>

      <div className="mt-2 flex justify-between items-center text-xs text-gray-500 font-mono">
        <span>SALARY: ${player.salary.toLocaleString()}</span>
        <span>NRG: {player.energy}%</span>
      </div>

      {onAction && (
        <button 
            onClick={onAction}
            className="mt-2 w-full bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 py-1 text-xs uppercase tracking-widest border border-cyan-800 transition-colors"
        >
            {actionLabel}
        </button>
      )}
    </div>
  );
};
