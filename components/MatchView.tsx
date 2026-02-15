import React, { useState, useEffect, useRef } from 'react';
import { Player, PlayerClass, Team } from '../types';
import { generateCommentary } from '../services/geminiService';
import { Button } from './Button';

interface MatchViewProps {
  playerTeam: Team;
  enemyTeamName: string; // Simplification: Generated enemy name
  onMatchEnd: (won: boolean) => void;
}

// Simple vector type
type Vector = { x: number, y: number };

interface Entity {
  id: string;
  pos: Vector;
  vel: Vector;
  team: 'home' | 'away';
  role: PlayerClass;
  cooldown: number;
}

export const MatchView: React.FC<MatchViewProps> = ({ playerTeam, enemyTeamName, onMatchEnd }) => {
  const [score, setScore] = useState({ home: 0, away: 0 });
  const [time, setTime] = useState(180); // 3 minutes
  const [commentary, setCommentary] = useState("Faceoff at center ice!");
  const [gameEntities, setGameEntities] = useState<Entity[]>([]);
  const puckRef = useRef<Vector>({ x: 50, y: 50 });
  const puckVelRef = useRef<Vector>({ x: 0, y: 0 });
  
  // Game loop ref
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Initialize Match
  useEffect(() => {
    // Select top 3 players or randoms
    const starters = playerTeam.roster.slice(0, 3);
    
    const entities: Entity[] = [
      ...starters.map((p, i) => ({
        id: p.id,
        pos: { x: 20, y: 30 + (i * 20) }, // Spread out on left
        vel: { x: 0, y: 0 },
        team: 'home' as const,
        role: p.class,
        cooldown: 0
      })),
      { id: 'e1', pos: { x: 80, y: 30 }, vel: { x: 0, y: 0 }, team: 'away' as const, role: PlayerClass.SNIPER, cooldown: 0 },
      { id: 'e2', pos: { x: 80, y: 50 }, vel: { x: 0, y: 0 }, team: 'away' as const, role: PlayerClass.ENFORCER, cooldown: 0 },
      { id: 'e3', pos: { x: 80, y: 70 }, vel: { x: 0, y: 0 }, team: 'away' as const, role: PlayerClass.GOALIE, cooldown: 0 },
    ];
    setGameEntities(entities);
    
    // Initial Commentary
    generateCommentary("Match Start").then(setCommentary);

  }, [playerTeam]);

  // Game Loop
  const update = (timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    // const deltaTime = timestamp - lastTimeRef.current; // Unused for simple tick
    lastTimeRef.current = timestamp;

    if (time <= 0) {
        cancelAnimationFrame(requestRef.current!);
        onMatchEnd(score.home > score.away);
        return;
    }

    // Move Puck
    let puck = puckRef.current;
    let pVel = puckVelRef.current;
    
    puck.x += pVel.x;
    puck.y += pVel.y;
    
    // Puck Friction
    pVel.x *= 0.98;
    pVel.y *= 0.98;

    // Walls
    if (puck.y < 5 || puck.y > 95) pVel.y *= -1;
    if (puck.x < 2) {
        // Away Goal
        setScore(s => ({ ...s, away: s.away + 1 }));
        resetPuck();
        generateCommentary("Away Team Goal").then(setCommentary);
        return; // Skip rest of frame
    }
    if (puck.x > 98) {
        // Home Goal
        setScore(s => ({ ...s, home: s.home + 1 }));
        resetPuck();
        generateCommentary("Home Team Goal").then(setCommentary);
        return;
    }

    // AI Logic (Boids-lite)
    setGameEntities(prev => prev.map(ent => {
        const target = puck;
        const dist = Math.hypot(target.x - ent.pos.x, target.y - ent.pos.y);
        
        let dx = 0; 
        let dy = 0;

        // Simple State Machine
        if (ent.role === PlayerClass.GOALIE) {
            // Stay near goal
            const goalX = ent.team === 'home' ? 10 : 90;
            dx = (goalX - ent.pos.x) * 0.05;
            // Track puck Y
            dy = (puck.y - ent.pos.y) * 0.05;
        } else {
            // Chase Puck
            dx = (target.x - ent.pos.x) * 0.02;
            dy = (target.y - ent.pos.y) * 0.02;
        }

        // Avoidance (Basic)
        // ... (Skipped for brevity/perf)

        // Update position
        const newX = Math.max(0, Math.min(100, ent.pos.x + dx));
        const newY = Math.max(0, Math.min(100, ent.pos.y + dy));

        // Interact with Puck
        if (dist < 3) {
            // Kick puck
            const shootDir = ent.team === 'home' ? 1 : -1;
            puckVelRef.current = { 
                x: shootDir * (Math.random() * 2 + 1), 
                y: (Math.random() - 0.5) * 2 
            };
        }

        return { ...ent, pos: { x: newX, y: newY } };
    }));

    requestRef.current = requestAnimationFrame(update);
  };

  const resetPuck = () => {
      puckRef.current = { x: 50, y: 50 };
      puckVelRef.current = { x: 0, y: 0 };
  }

  // Timer Tick
  useEffect(() => {
    const timer = setInterval(() => {
        setTime(t => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Loop Start/Stop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [time]); // Re-bind if time changes (or just run once)

  // Abilities
  const useAbility = (type: 'SPEED' | 'FIGHT' | 'CHIRP') => {
      if (type === 'SPEED') {
          // Boost home team speed (simulate by pushing puck towards enemy goal)
          puckVelRef.current.x += 3;
          generateCommentary("Home team turns on the jets!").then(setCommentary);
      } else if (type === 'FIGHT') {
          // Stun enemy (not visually implemented, but maybe stops them?)
          generateCommentary("Gloves are off!").then(setCommentary);
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white p-4">
      {/* HUD */}
      <div className="flex justify-between items-center bg-black/50 p-4 border-b-4 border-cyan-500 mb-4 rounded-lg">
        <div className="text-4xl font-black text-cyan-400">{playerTeam.name} <span className="text-white">{score.home}</span></div>
        <div className="flex flex-col items-center">
            <div className="text-3xl font-mono bg-gray-800 px-4 py-1 rounded border border-gray-600">
                {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-xs uppercase text-gray-400 mt-1">Period 3</div>
        </div>
        <div className="text-4xl font-black text-red-500"><span className="text-white">{score.away}</span> {enemyTeamName}</div>
      </div>

      {/* RINK */}
      <div className="flex-1 relative bg-blue-100 rounded-xl border-4 border-slate-700 overflow-hidden shadow-inner">
        {/* Ice Markings */}
        <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-red-500/30 transform -translate-x-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-24 h-24 border-4 border-blue-500/30 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-0 bottom-0 left-[10%] w-1 bg-blue-500/20"></div>
        <div className="absolute top-0 bottom-0 right-[10%] w-1 bg-blue-500/20"></div>

        {/* Puck */}
        <div 
            className="absolute w-4 h-4 bg-black rounded-full shadow-sm z-10 transition-transform duration-75 ease-linear"
            style={{ 
                left: `${puckRef.current.x}%`, 
                top: `${puckRef.current.y}%`,
                transform: 'translate(-50%, -50%)'
            }}
        />

        {/* Players */}
        {gameEntities.map(ent => (
             <div 
                key={ent.id}
                className={`absolute w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 shadow-lg transition-all duration-100 ease-linear
                    ${ent.team === 'home' ? 'bg-cyan-500 border-white text-black' : 'bg-red-600 border-white text-white'}
                `}
                style={{ 
                    left: `${ent.pos.x}%`, 
                    top: `${ent.pos.y}%`,
                    transform: 'translate(-50%, -50%)'
                }}
            >
                {ent.role === PlayerClass.GOALIE ? 'G' : ent.role[0]}
            </div>
        ))}
      </div>

      {/* Control Panel */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 h-32">
         {/* Commentary Box */}
         <div className="md:col-span-2 bg-black border border-green-500/50 p-4 rounded font-mono text-green-400 text-sm overflow-hidden flex items-center">
            <span className="mr-2 animate-pulse">▐</span> {commentary}
         </div>

         {/* Coach Controls */}
         <div className="grid grid-cols-3 gap-2">
            <button onClick={() => useAbility('SPEED')} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-xs rounded shadow-[0_4px_0_rgb(0,0,0)] active:shadow-none active:translate-y-1">
                Hustle
            </button>
            <button onClick={() => useAbility('FIGHT')} className="bg-red-600 hover:bg-red-500 text-white font-black uppercase text-xs rounded shadow-[0_4px_0_rgb(0,0,0)] active:shadow-none active:translate-y-1">
                Goon It Up
            </button>
            <button onClick={() => useAbility('CHIRP')} className="bg-purple-600 hover:bg-purple-500 text-white font-black uppercase text-xs rounded shadow-[0_4px_0_rgb(0,0,0)] active:shadow-none active:translate-y-1">
                Chirp
            </button>
         </div>
      </div>
    </div>
  );
};