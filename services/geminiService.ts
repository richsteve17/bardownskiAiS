import { GoogleGenAI, Type } from "@google/genai";
import { Player, PlayerClass } from "../types";

// Initialize Gemini
const API_KEY = (typeof process !== 'undefined' && process.env?.API_KEY) || ((import.meta as any).env?.VITE_GEMINI_API_KEY) || 'PLACEHOLDER';
const ai = new GoogleGenAI({ apiKey: API_KEY });

const SYSTEM_INSTRUCTION = `
You are the "Commissioner" of a gritty, rural 3v3 Hockey MOBA league called "The Barn".
Your personality is a mix of a dungeon master and a character from Letterkenny/Shoresy.
You speak in rapid-fire Canadian slang, are extremely chirpy, tough, and funny.
You value toughness, hard work, and good chirps.
You frequently use slang like "pitter patter", "10-ply", "spare parts", "degens", "ferda", "wheel snipe celly".
Never break character. You are narrating a video game.
`;

export const generateRecruit = async (currentReputation: number): Promise<Player> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Generate a hockey player recruit for my team. The team reputation is ${currentReputation} (0-100).
  Make them funny, weird, or gritty. Give them a "Class" (Sniper, Enforcer, Playmaker, Goalie).
  Stats should be between 1-100 based on class.
  Bio should be a one-sentence funny backstory involving farm work, fighting, or small-town drama.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            nickname: { type: Type.STRING },
            class: { type: Type.STRING, enum: [PlayerClass.SNIPER, PlayerClass.ENFORCER, PlayerClass.PLAYMAKER, PlayerClass.GOALIE] },
            stats: {
              type: Type.OBJECT,
              properties: {
                speed: { type: Type.INTEGER },
                shooting: { type: Type.INTEGER },
                physicality: { type: Type.INTEGER },
                chirp: { type: Type.INTEGER },
              }
            },
            salary: { type: Type.INTEGER },
            bio: { type: Type.STRING }
          }
        }
      }
    });
    const data = JSON.parse(response.text || "{}");
    return {
      id: crypto.randomUUID(),
      ...data,
      energy: 100,
      gameStats: { swagger: 0, heat: 0, trust: 0, chemistry: 0 }
    };
  } catch (e) {
    console.warn('Gemini recruit generation failed:', e);
    return {
      id: crypto.randomUUID(),
      name: 'Mystery Degen', nickname: 'Ghost', class: PlayerClass.ENFORCER,
      stats: { speed: 60, shooting: 50, physicality: 70, chirp: 55 },
      salary: 5000, bio: 'Nobody knows where this one came from.',
      energy: 100, gameStats: { swagger: 0, heat: 0, trust: 0, chemistry: 0 }
    };
  }
};

export const generatePressConferenceQuestion = async (winStreak: boolean): Promise<{ question: string; options: string[] }> => {
  const model = "gemini-3-flash-preview";
  const prompt = `I just ${winStreak ? "won" : "lost"} a match. Roleplay as a snarky sports reporter from a small town paper. Ask me a difficult question. Provide 3 possible short responses (answers) for me to choose from: one humble, one aggressive, one weird/confusing.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.warn('Gemini press conference failed:', e);
    return { question: "So... what happened out there?", options: ["We gave it our all.", "We dominated, end of story.", "I saw a ghost on the ice."] };
  }
};

export const generateCommentary = async (event: string): Promise<string> => {
   const model = "gemini-3-flash-preview";
   const prompt = `React briefly (one sentence) to this hockey event: "${event}". make it colorful.`;
   
   try {
     const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 50,
      }
     });
     return response.text || "Wheel, snipe, celly!";
   } catch (e) {
     return "Wheel, snipe, celly!";
   }
};

export const getIntroduction = async (): Promise<string> => {
    const model = "gemini-3-flash-preview";
    try {
      const response = await ai.models.generateContent({
          model,
          contents: "Introduce yourself as The Commissioner and welcome the player to the Barn Burner league. Tell them they look softer than a taco party pack.",
          config: { systemInstruction: SYSTEM_INSTRUCTION }
      });
      return response.text || "Welcome to the show, buds.";
    } catch (e) {
      return "Welcome to the show, buds. You look softer than a taco party pack. Pitter patter.";
    }
}
