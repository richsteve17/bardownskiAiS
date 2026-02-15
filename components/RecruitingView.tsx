import React, { useState, useEffect } from 'react';
import { Player, Team } from '../types';
import { generateRecruit } from '../services/geminiService';
import { PlayerCard } from './PlayerCard';
import { Button } from './Button';

interface RecruitingViewProps {
  team: Team;
  onRecruit: (player: Player) => void;
  onBack: () => void;
}

export const RecruitingView: React.FC<RecruitingViewProps> = ({ team, onRecruit, onBack }) => {
  const [candidates, setCandidates] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      // Generate 3 candidates
      const p1 = await generateRecruit(team.reputation);
      const p2 = await generateRecruit(team.reputation);
      const p3 = await generateRecruit(team.reputation);
      setCandidates([p1, p2, p3]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (candidates.length === 0) {
        fetchCandidates();
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-950 p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
             <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Fresh Meat</h2>
             <p className="text-gray-400">Budget: <span className="text-green-400">${team.budget.toLocaleString()}</span></p>
        </div>
        <Button onClick={onBack} variant="secondary">Back to Locker</Button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-cyan-500 animate-pulse text-2xl font-bold">SCOUTING THE BARNS...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map(player => (
            <PlayerCard 
                key={player.id} 
                player={player} 
                actionLabel={`Sign ($${player.salary})`}
                onAction={() => {
                    if (team.budget >= player.salary) {
                        onRecruit(player);
                    } else {
                        alert("You're spare parts, bud. You can't afford 'em.");
                    }
                }}
            />
          ))}
        </div>
      )}
       {!loading && (
        <div className="mt-8 text-center">
            <Button onClick={fetchCandidates} variant="secondary">Scout New Batch ($500)</Button>
        </div>
      )}
    </div>
  );
};
