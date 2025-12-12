import { GoogleGenAI, Type } from "@google/genai";
import { Song, AISuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeVibeAndSuggest = async (
  history: Song[],
  availableLibrary: Song[]
): Promise<AISuggestion> => {
  if (history.length === 0 || availableLibrary.length === 0) {
    return {
      mood: "Neutral",
      reasoning: "Not enough data to analyze yet.",
      suggestedSongIds: availableLibrary.slice(0, 5).map(s => s.id)
    };
  }

  // Prepare data for the model
  const historyTitles = history.slice(-3).map(s => `${s.title} by ${s.artist}`).join(", ");
  const libraryCatalog = availableLibrary.map(s => ({
    id: s.id,
    info: `${s.title} by ${s.artist} (${s.genre || 'Unknown Genre'})`
  }));

  const prompt = `
    I have a music player app. 
    The user just listened to: [${historyTitles}].
    
    Here is the available library of songs:
    ${JSON.stringify(libraryCatalog)}

    Task:
    1. Analyze the "Vibe" or "Mood" of the recently played songs (e.g., "Energetic Workout", "Late Night Chill", "Focus", "Melancholy").
    2. Select up to 5 song IDs from the library that BEST fit this mood to play next.
    3. Explain the reasoning briefly.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mood: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            suggestedSongIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      mood: result.mood || "Unknown Vibe",
      reasoning: result.reasoning || "Enjoy some random tracks.",
      suggestedSongIds: result.suggestedSongIds || []
    };

  } catch (error) {
    console.error("Gemini AI Error:", error);
    // Fallback
    return {
      mood: "Offline / Error",
      reasoning: "Could not connect to AI. Shuffling library.",
      suggestedSongIds: availableLibrary.slice(0, 5).map(s => s.id)
    };
  }
};
