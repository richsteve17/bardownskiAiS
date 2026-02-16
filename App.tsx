import React, { useState, useEffect } from 'react';
import { GamePhase, Team, Player, PlayerClass } from './types';
import { getIntroduction } from './services/geminiService';
import { Button } from './components/Button';
import { PlayerCard } from './components/PlayerCard';
import { RecruitingView } from './components/RecruitingView';
import { MatchView } from './components/MatchView';
import { PressConference } from './components/PressConference';

const INITIAL_TEAM: Team = {
  name: "Sudbury Blueberry Bulldogs",
  reputation: 10,
  budget: 50000,
  wins: 0,
  losses: 0,
  roster: [
    {
      id: '1', name: 'Shoresy', nickname: 'Waffle', class: PlayerClass.SNIPER, 
      stats: { speed: 85, shooting: 90, physicality: 60, chirp: 99 }, 
      salary: 10000, bio: 'Hates to lose.', energy: 100,
      gameStats: { swagger: 0, heat: 0, trust: 0, chemistry: 0 }
    },
    {
        id: '2', name: 'J.J. Frankie JJ', nickname: 'Big Sexy', class: PlayerClass.PLAYMAKER,
        stats: { speed: 70, shooting: 80, physicality: 50, chirp: 40 },
        salary: 12000, bio: 'Absolute unit.', energy: 100,
        gameStats: { swagger: 0, heat: 0, trust: 0, chemistry: 0 }
    },
    {
        id: '3', name: 'Hitch', nickname: 'Ten Inch', class: PlayerClass.ENFORCER,
        stats: { speed: 60, shooting: 50, physicality: 95, chirp: 80 },
        salary: 8000, bio: 'Looks like a martial artist.', energy: 100,
        gameStats: { swagger: 0, heat: 0, trust: 0, chemistry: 0 }
    }
  ]
};

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.MENU);
  const [team, setTeam] = useState<Team>(INITIAL_TEAM);
  const [introText, setIntroText] = useState("");
  const [lastMatchWon, setLastMatchWon] = useState(false);

  useEffect(() => {
    // Start with introduction
    getIntroduction().then(setIntroText);
  }, []);

  const handleRecruit = (player: Player) => {
    setTeam(prev => ({
        ...prev,
        budget: prev.budget - player.salary,
        roster: [...prev.roster, player]
    }));
    setPhase(GamePhase.MATCH_PREP);
  };

  const handleMatchEnd = (won: boolean) => {
      setLastMatchWon(won);
      setTeam(prev => ({
          ...prev,
          wins: won ? prev.wins + 1 : prev.wins,
          losses: won ? prev.losses : prev.losses + 1,
          reputation: won ? prev.reputation + 5 : Math.max(0, prev.reputation - 2),
          budget: won ? prev.budget + 5000 : prev.budget + 1000 // Gate revenue
      }));
      setPhase(GamePhase.PRESS_CONFERENCE);
  };

  const renderContent = () => {
    switch(phase) {
      case GamePhase.MENU:
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-8 p-8 text-center bg-cover bg-center" style={{backgroundImage: 'linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8))'}}>
             <div className="space-y-2">
                <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase italic drop-shadow-[0_5px_5px_rgba(255,0,0,0.8)]">
                  Bardownski
                </h1>
                <h2 className="text-2xl text-cyan-400 font-bold tracking-widest uppercase">Rink Rat Dynasty</h2>
             </div>
             
             <div className="max-w-xl bg-gray-900/80 p-6 rounded border border-gray-700 text-gray-300 font-mono">
                <span className="text-cyan-500 font-bold">COMMISSIONER:</span> {introText || "Loading chirps..."}
             </div>

             <Button onClick={() => setPhase(GamePhase.MATCH_PREP)} className="text-xl px-12 py-4">
                Pitter Patter
             </Button>
          </div>
        );

      case GamePhase.MATCH_PREP:
        return (
          <div className="h-full flex flex-col bg-gray-900 p-6 overflow-hidden">
             <div className="flex justify-between items-end mb-6 border-b border-gray-700 pb-4">
                <div>
                    <h2 className="text-4xl font-black text-white italic">{team.name}</h2>
                    <div className="flex gap-4 text-sm mt-2 font-mono text-gray-400">
                        <span>REP: {team.reputation}</span>
                        <span>CASH: <span className="text-green-400">${team.budget.toLocaleString()}</span></span>
                        <span>RECORD: {team.wins}-{team.losses}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setPhase(GamePhase.RECRUITING)} variant="secondary">Recruit Degens</Button>
                    <Button onClick={() => setPhase(GamePhase.MATCH)}>Start Match</Button>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto">
                <h3 className="text-gray-500 uppercase font-bold text-sm mb-4">Active Roster</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {team.roster.map(p => (
                        <PlayerCard key={p.id} player={p} />
                    ))}
                    {team.roster.length < 3 && (
                        <div className="border-2 border-dashed border-gray-700 rounded flex items-center justify-center p-8 text-gray-600 font-bold uppercase">
                            Need more bodies
                        </div>
                    )}
                </div>
             </div>
          </div>
        );

      case GamePhase.RECRUITING:
        return <RecruitingView team={team} onRecruit={handleRecruit} onBack={() => setPhase(GamePhase.MATCH_PREP)} />;

      case GamePhase.MATCH:
        return <MatchView playerTeam={team} enemyTeamName="The North Bay No-Shows" onMatchEnd={handleMatchEnd} />;

      case GamePhase.PRESS_CONFERENCE:
        return <PressConference lastMatchWon={lastMatchWon} onComplete={() => setPhase(GamePhase.MATCH_PREP)} />;

      default:
        return <div>Error: Unknown Phase</div>;
    }
  };

  return (
    <div className="w-full h-screen bg-black text-white font-sans selection:bg-cyan-500 selection:text-black">
      {renderContent()}
    </div>
  );
};

export default App;