import { GoogleGenAI, Type } from "@google/genai";
import { GameData } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are a game generator for a puzzle called "Odd1Out".
The game has 4 rows of words.
Each row has 4 words: 3 belong to a specific "Row Category", and 1 is an "Outlier".
Crucially, the 4 Outliers (one from each row) form a "Meta Puzzle".
In the Meta Puzzle, 3 of these Outliers share a hidden "Meta Category".
The 4th Outlier is the "Ultimate Odd1Out" because it does not fit the "Meta Category".

Requirements:
1. Generate 4 rows.
2. Ensure the "Ultimate Odd1Out" logic is sound.
3. Words should be common enough for a general audience but the connection shouldn't be immediately obvious.
4. Output valid JSON.
`;

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Process raw data to shuffle words and update indices
const processRawData = (rawData: any): GameData => {
  const rows = rawData.rows.map((row: any, rIdx: number) => {
    // Create temporary objects to track the outlier during shuffle
    // row.words comes in as string[] from API or fallback
    const wordsWithMeta = row.words.map((w: string, idx: number) => ({
      text: w,
      isOutlier: idx === row.outlierIndex
    }));

    // Shuffle the words
    const shuffledWords = shuffleArray(wordsWithMeta);

    // Find the new index of the outlier after shuffling
    const newOutlierIndex = shuffledWords.findIndex((w: any) => w.isOutlier);

    // Map back to final WordItem format
    const finalWords = shuffledWords.map((w: any, wIdx: number) => ({
      text: w.text,
      // Create a unique ID for React keys
      id: `row-${rIdx}-word-${wIdx}-${Math.random().toString(36).substring(7)}` 
    }));

    return {
      id: `row-${rIdx}`,
      category: row.category,
      words: finalWords,
      outlierIndex: newOutlierIndex,
      explanation: row.explanation
    };
  });

  return {
    rows,
    metaCategory: rawData.metaCategory,
    ultimateOutlierRowIndex: rawData.ultimateOutlierRowIndex,
    ultimateExplanation: rawData.ultimateExplanation
  };
};

export const generateGameData = async (): Promise<GameData> => {
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rows: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: "Category for the 3 common words" },
                  words: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Array of exactly 4 words. One is the outlier."
                  },
                  outlierIndex: { type: Type.INTEGER, description: "Index (0-3) of the outlier word" },
                  explanation: { type: Type.STRING, description: "Why the outlier is different" }
                },
                required: ["category", "words", "outlierIndex", "explanation"]
              }
            },
            metaCategory: { type: Type.STRING, description: "The category shared by 3 of the 4 row-outliers" },
            ultimateOutlierRowIndex: { type: Type.INTEGER, description: "Index of the row containing the Ultimate Odd1Out" },
            ultimateExplanation: { type: Type.STRING, description: "Why the ultimate outlier is different from the other 3 outliers" }
          },
          required: ["rows", "metaCategory", "ultimateOutlierRowIndex", "ultimateExplanation"]
        }
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Generate a new Odd1Out puzzle. Make the topics distinct (e.g., Science, Pop Culture, Geography)."
            }
          ]
        }
      ]
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return processRawData(parsed);
    }
    
    throw new Error("No data returned");
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    // Fallback static data in raw format (strings) to be processed/shuffled
    const fallbackRaw = {
      rows: [
        {
          category: 'Vegetables',
          words: ['Carrot', 'Broccoli', 'Spinach', 'Apple'],
          outlierIndex: 3,
          explanation: "Apple is a fruit, others are vegetables."
        },
        {
          category: 'Furniture',
          words: ['Sofa', 'Table', 'Chair', 'Banana'],
          outlierIndex: 3,
          explanation: "Banana is a fruit, others are furniture."
        },
        {
          category: 'Planets',
          words: ['Mars', 'Venus', 'Jupiter', 'Cherry'],
          outlierIndex: 3,
          explanation: "Cherry is a fruit, others are planets."
        },
        {
          category: 'Tools',
          words: ['Hammer', 'Drill', 'Wrench', 'Red'],
          outlierIndex: 3,
          explanation: "Red is a color, others are tools."
        }
      ],
      metaCategory: 'Fruits',
      ultimateOutlierRowIndex: 3,
      ultimateExplanation: "Red is a color (and abstract), whereas Apple, Banana, and Cherry are physical fruits."
    };
    return processRawData(fallbackRaw);
  }
};