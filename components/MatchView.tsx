import React, { useState, useEffect, useRef } from 'react';
import { Player, PlayerClass, Team } from '../types';
import { generateCommentary } from '../services/geminiService';
import { Button } from './Button';

interface MatchViewProps {
  playerTeam: Team;
  enemyTeamName: string;
  onMatchEnd: (won: boolean) => void;
}

type Vector = { x: number, y: number };

interface Entity {
  id: string;
  pos: Vector;
  vel: Vector;
  team: 'home' | 'away';
  role: PlayerClass;
  cooldowns: { speed: number; check: number; chirp: number };
  isStunned: number;
}

// Physics Constants - Tuned for slower gameplay
const PLAYER_ACCEL = 0.025;
const AI_ACCEL = 0.015;
const PUCK_FRICTION = 0.985;
const ICE_FRICTION = 0.92; // Higher drag to slow players down
const SHOOT_FORCE = 1.8;
const MAX_SPEED = 0.8; // Cap maximum speed
const HUSTLE_MULT = 1.5;

export const MatchView: React.FC<MatchViewProps> = ({ playerTeam, enemyTeamName, onMatchEnd }) => {
  const [score, setScore] = useState({ home: 0, away: 0 });
  const [time, setTime] = useState(180);
  const [commentary, setCommentary] = useState("Use ARROWS to Move, SPACE to Shoot!");
  const [gameEntities, setGameEntities] = useState<Entity[]>([]);
  
  // Game State Refs (for loop performance)
  const entitiesRef = useRef<Entity[]>([]);
  const puckRef = useRef<Vector>({ x: 50, y: 50 });
  const puckVelRef = useRef<Vector>({ x: 0, y: 0 });
  const puckOwnerRef = useRef<string | null>(null);
  
  const keysRef = useRef<Set<string>>(new Set());
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Initialize
  useEffect(() => {
    const starters = playerTeam.roster.slice(0, 3);
    
    const initialEntities: Entity[] = [
      ...starters.map((p, i) => ({
        id: p.id,
        pos: { x: 20, y: 30 + (i * 20) },
        vel: { x: 0, y: 0 },
        team: 'home' as const,
        role: p.class,
        cooldowns: { speed: 0, check: 0, chirp: 0 },
        isStunned: 0
      })),
      { id: 'e1', pos: { x: 80, y: 30 }, vel: { x: 0, y: 0 }, team: 'away' as const, role: PlayerClass.SNIPER, cooldowns: { speed: 0, check: 0, chirp: 0 }, isStunned: 0 },
      { id: 'e2', pos: { x: 80, y: 50 }, vel: { x: 0, y: 0 }, team: 'away' as const, role: PlayerClass.ENFORCER, cooldowns: { speed: 0, check: 0, chirp: 0 }, isStunned: 0 },
      { id: 'e3', pos: { x: 80, y: 70 }, vel: { x: 0, y: 0 }, team: 'away' as const, role: PlayerClass.GOALIE, cooldowns: { speed: 0, check: 0, chirp: 0 }, isStunned: 0 },
    ];
    
    entitiesRef.current = initialEntities;
    setGameEntities(initialEntities);
    
    const handleKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playerTeam]);

  // Game Loop
  const update = (timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    lastTimeRef.current = timestamp;

    if (time <= 0) {
        cancelAnimationFrame(requestRef.current!);
        onMatchEnd(score.home > score.away);
        return;
    }

    // 1. Process User Input (Controls the first home player)
    const userPlayer = entitiesRef.current.find(e => e.team === 'home');
    if (userPlayer && userPlayer.isStunned <= 0) {
        // Movement
        if (keysRef.current.has('ArrowUp')) userPlayer.vel.y -= PLAYER_ACCEL;
        if (keysRef.current.has('ArrowDown')) userPlayer.vel.y += PLAYER_ACCEL;
        if (keysRef.current.has('ArrowLeft')) userPlayer.vel.x -= PLAYER_ACCEL;
        if (keysRef.current.has('ArrowRight')) userPlayer.vel.x += PLAYER_ACCEL;

        // Shooting / Passing
        if (keysRef.current.has('Space') && puckOwnerRef.current === userPlayer.id) {
             shootPuck(userPlayer);
             generateCommentary("He shoots!").then(setCommentary);
        }

        // Abilities
        if (keysRef.current.has('KeyQ') && userPlayer.cooldowns.speed <= 0) {
            // Hustle
            userPlayer.vel.x *= HUSTLE_MULT; 
            userPlayer.vel.y *= HUSTLE_MULT;
            userPlayer.cooldowns.speed = 300; // frames
            generateCommentary("Turnin' on the jets!").then(setCommentary);
        }
        if (keysRef.current.has('KeyE') && userPlayer.cooldowns.check <= 0) {
            // Check (Dash forward)
            userPlayer.vel.x += 1.0; // Reduced dash force
            userPlayer.cooldowns.check = 180;
             // Logic to stun touched enemies handled in collision
        }
    }

    // 2. AI Logic & Physics for all entities
    entitiesRef.current.forEach(ent => {
        // Cooldowns / Stuns
        if (ent.isStunned > 0) ent.isStunned--;
        if (ent.cooldowns.speed > 0) ent.cooldowns.speed--;
        if (ent.cooldowns.check > 0) ent.cooldowns.check--;
        if (ent.cooldowns.chirp > 0) ent.cooldowns.chirp--;

        if (ent.isStunned > 0) {
            ent.vel.x = 0; ent.vel.y = 0;
            return;
        }

        // AI Logic (skip user player)
        if (ent.id !== userPlayer?.id) {
            let target = { x: puckRef.current.x, y: puckRef.current.y };
            
            // Goalie Logic
            if (ent.role === PlayerClass.GOALIE) {
                target = { x: ent.team === 'home' ? 5 : 95, y: puckRef.current.y };
                if (target.y < 35) target.y = 35;
                if (target.y > 65) target.y = 65;
            } 
            // Teammate Logic (if teammate has puck, move forward, else chase puck)
            else if (puckOwnerRef.current && entitiesRef.current.find(e => e.id === puckOwnerRef.current)?.team === ent.team) {
                target = { x: ent.team === 'home' ? 90 : 10, y: ent.pos.y }; // Move to net
            }

            // Move towards target
            const dx = target.x - ent.pos.x;
            const dy = target.y - ent.pos.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist > 1) {
                ent.vel.x += (dx / dist) * AI_ACCEL;
                ent.vel.y += (dy / dist) * AI_ACCEL;
            }

            // AI Shooting
            if (puckOwnerRef.current === ent.id) {
                // Shoot if close to goal
                const goalX = ent.team === 'home' ? 100 : 0;
                if (Math.abs(ent.pos.x - goalX) < 40) {
                    // Random delay or check
                    if (Math.random() < 0.02) shootPuck(ent); // Slower shooting frequency
                }
            }
        }

        // Apply Friction
        ent.vel.x *= ICE_FRICTION;
        ent.vel.y *= ICE_FRICTION;

        // Clamp Speed
        const speed = Math.hypot(ent.vel.x, ent.vel.y);
        if (speed > MAX_SPEED) {
            ent.vel.x = (ent.vel.x / speed) * MAX_SPEED;
            ent.vel.y = (ent.vel.y / speed) * MAX_SPEED;
        }

        // Apply Velocity
        ent.pos.x += ent.vel.x;
        ent.pos.y += ent.vel.y;

        // Wall collisions
        if (ent.pos.y < 2) { ent.pos.y = 2; ent.vel.y *= -0.5; }
        if (ent.pos.y > 98) { ent.pos.y = 98; ent.vel.y *= -0.5; }
        if (ent.pos.x < 0) { ent.pos.x = 0; ent.vel.x *= -0.5; }
        if (ent.pos.x > 100) { ent.pos.x = 100; ent.vel.x *= -0.5; }

        // Interactions with Puck
        const distToPuck = Math.hypot(ent.pos.x - puckRef.current.x, ent.pos.y - puckRef.current.y);
        
        // Take possession
        if (!puckOwnerRef.current && distToPuck < 3) {
            puckOwnerRef.current = ent.id;
        }
        
        // Steal possession?
        if (puckOwnerRef.current && puckOwnerRef.current !== ent.id && distToPuck < 3) {
             if (Math.random() < 0.02) { // Reduced steal chance
                 puckOwnerRef.current = ent.id;
                 generateCommentary("Turnover!").then(setCommentary);
             }
        }
    });

    // 3. Puck Physics
    if (puckOwnerRef.current) {
        const owner = entitiesRef.current.find(e => e.id === puckOwnerRef.current);
        if (owner) {
            // Dribble: Stick puck slightly in front of velocity
            const offsetDist = 2;
            const angle = Math.atan2(owner.vel.y, owner.vel.x || (owner.team === 'home' ? 1 : -1));
            puckRef.current.x = owner.pos.x + Math.cos(angle) * offsetDist;
            puckRef.current.y = owner.pos.y + Math.sin(angle) * offsetDist;
            puckVelRef.current = { x: owner.vel.x, y: owner.vel.y };
        } else {
            puckOwnerRef.current = null; // Owner not found fallback
        }
    } else {
        // Free Puck
        puckRef.current.x += puckVelRef.current.x;
        puckRef.current.y += puckVelRef.current.y;
        puckVelRef.current.x *= PUCK_FRICTION;
        puckVelRef.current.y *= PUCK_FRICTION;

        // Puck Wall Bounces
        if (puckRef.current.y < 2 || puckRef.current.y > 98) puckVelRef.current.y *= -1;
        if (puckRef.current.x < 0 || puckRef.current.x > 100) puckVelRef.current.x *= -1;
    }

    // 4. Goal Check
    if (puckRef.current.x < 2 && Math.abs(puckRef.current.y - 50) < 10) {
        setScore(s => ({ ...s, away: s.away + 1 }));
        resetPositions();
        generateCommentary("They scored! 10-ply goaltending!").then(setCommentary);
        return;
    }
    if (puckRef.current.x > 98 && Math.abs(puckRef.current.y - 50) < 10) {
        setScore(s => ({ ...s, home: s.home + 1 }));
        resetPositions();
        generateCommentary("Bardownski! What a snipe!").then(setCommentary);
        return;
    }

    setGameEntities([...entitiesRef.current]); // Trigger re-render
    requestRef.current = requestAnimationFrame(update);
  };

  const shootPuck = (shooter: Entity) => {
      puckOwnerRef.current = null;
      // Shoot towards goal or in movement direction
      const goalX = shooter.team === 'home' ? 100 : 0;
      const goalY = 50;
      
      // Calculate angle to goal but add some randomness based on velocity
      let angle = Math.atan2(goalY - shooter.pos.y, goalX - shooter.pos.x);
      
      // If moving fast, bias towards movement direction
      if (Math.hypot(shooter.vel.x, shooter.vel.y) > 0.1) {
          const moveAngle = Math.atan2(shooter.vel.y, shooter.vel.x);
          angle = (angle + moveAngle) / 2;
      }

      puckVelRef.current = {
          x: Math.cos(angle) * SHOOT_FORCE,
          y: Math.sin(angle) * SHOOT_FORCE
      };
  };

  const resetPositions = () => {
    puckRef.current = { x: 50, y: 50 };
    puckVelRef.current = { x: 0, y: 0 };
    puckOwnerRef.current = null;
    
    // Reset players slightly
    entitiesRef.current.forEach((e, i) => {
         e.vel = { x: 0, y: 0 };
         e.isStunned = 0;
         if (e.team === 'home') {
             e.pos = { x: 20, y: 30 + (i * 20) };
         } else {
             e.pos = { x: 80, y: 30 + ((i-3) * 20) };
         }
    });
  };

  useEffect(() => {
    const timer = setInterval(() => {
        setTime(t => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [time]);

  // Helpers for UI
  const userPlayer = gameEntities.find(e => e.team === 'home');

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white p-4 select-none outline-none" tabIndex={0}>
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
      <div className="flex-1 relative bg-blue-100 rounded-xl border-4 border-slate-700 overflow-hidden shadow-inner cursor-none">
        {/* Ice Markings */}
        <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-red-500/30 transform -translate-x-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-24 h-24 border-4 border-blue-500/30 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
        
        {/* Goals */}
        <div className="absolute top-1/2 left-0 w-2 h-20 bg-red-600 transform -translate-y-1/2"></div>
        <div className="absolute top-1/2 right-0 w-2 h-20 bg-red-600 transform -translate-y-1/2"></div>

        {/* Info Overlay */}
        <div className="absolute top-4 left-4 z-20 text-xs font-mono text-slate-500 pointer-events-none">
            <p>[ARROWS] SKATE</p>
            <p>[SPACE] SHOOT</p>
            <p>[Q] HUSTLE</p>
        </div>

        {/* Puck */}
        <div 
            className="absolute w-3 h-3 bg-black rounded-full shadow-sm z-10"
            style={{ 
                left: `${puckRef.current.x}%`, 
                top: `${puckRef.current.y}%`,
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 10px rgba(0,0,0,0.5)'
            }}
        />

        {/* Players */}
        {gameEntities.map(ent => (
             <div 
                key={ent.id}
                className={`absolute w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 shadow-lg transition-transform
                    ${ent.team === 'home' ? 'bg-cyan-600 border-cyan-300 text-white' : 'bg-red-700 border-red-400 text-white'}
                    ${ent.id === puckOwnerRef.current ? 'ring-4 ring-yellow-400' : ''}
                    ${ent.id === userPlayer?.id ? 'ring-2 ring-white scale-110 z-20' : ''}
                    ${ent.isStunned > 0 ? 'opacity-50 animate-pulse' : ''}
                `}
                style={{ 
                    left: `${ent.pos.x}%`, 
                    top: `${ent.pos.y}%`,
                    transform: `translate(-50%, -50%) rotate(${Math.atan2(ent.vel.y, ent.vel.x)}rad)`
                }}
            >
                {ent.role === PlayerClass.GOALIE ? 'G' : ent.role[0]}
                {/* Indicator arrow for user */}
                {ent.id === userPlayer?.id && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-yellow-400 text-[10px] font-black tracking-tighter">YOU</div>
                )}
            </div>
        ))}
      </div>

      {/* Control Panel / Cooldowns */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 h-24">
         {/* Commentary */}
         <div className="md:col-span-2 bg-black border border-green-500/50 p-4 rounded font-mono text-green-400 text-sm overflow-hidden flex items-center">
            <span className="mr-2 animate-pulse">▐</span> {commentary}
         </div>

         {/* Ability Icons */}
         <div className="grid grid-cols-3 gap-2">
            <div className={`flex flex-col items-center justify-center bg-gray-800 rounded border-2 ${userPlayer?.cooldowns.speed ? 'border-gray-600 opacity-50' : 'border-yellow-500'}`}>
                <span className="font-bold text-yellow-500 text-xl">Q</span>
                <span className="text-[10px] uppercase text-gray-400">Hustle</span>
            </div>
             <div className={`flex flex-col items-center justify-center bg-gray-800 rounded border-2 ${userPlayer?.cooldowns.check ? 'border-gray-600 opacity-50' : 'border-red-500'}`}>
                <span className="font-bold text-red-500 text-xl">W</span>
                <span className="text-[10px] uppercase text-gray-400">Stun</span>
            </div>
             <div className="flex flex-col items-center justify-center bg-gray-800 rounded border-2 border-gray-600 opacity-50">
                <span className="font-bold text-gray-500 text-xl">E</span>
                <span className="text-[10px] uppercase text-gray-400">Chirp</span>
            </div>
         </div>
      </div>
    </div>
  );
};