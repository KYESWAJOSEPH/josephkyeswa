
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DictionaryEntry, QuizQuestion, Phrase } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const dictionaryService = {
  async searchWord(query: string, sourceLang: 'luganda' | 'english'): Promise<DictionaryEntry | null> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as a professional Luganda-English lexicographer. Provide a detailed dictionary entry for the term "${query}" translating from ${sourceLang} to the other. Include grammar details like noun classes for Luganda words.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              pronunciation: { type: Type.STRING },
              partOfSpeech: { type: Type.STRING },
              nounClass: { type: Type.STRING },
              translation: { type: Type.STRING },
              definition: { type: Type.STRING },
              examples: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    luganda: { type: Type.STRING },
                    english: { type: Type.STRING }
                  },
                  required: ["luganda", "english"]
                }
              },
              synonyms: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["word", "partOfSpeech", "translation", "definition", "examples"]
          }
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error("Search failed:", error);
      return null;
    }
  },

  async getWordOfTheDay(): Promise<DictionaryEntry> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Select an interesting, common Luganda word as the 'Word of the Day'. Provide its full dictionary entry.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            translation: { type: Type.STRING },
            definition: { type: Type.STRING },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  luganda: { type: Type.STRING },
                  english: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text);
  },

  async getPhrasesByCategory(category: string): Promise<Phrase[]> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate 6 essential and commonly used Luganda-English phrases for the category: "${category}". Provide natural, conversational translations.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                luganda: { type: Type.STRING },
                english: { type: Type.STRING }
              },
              required: ["category", "luganda", "english"]
            }
          }
        }
      });
      return JSON.parse(response.text);
    } catch (error) {
      console.error("Failed to fetch phrases:", error);
      return [];
    }
  },

  async generateQuiz(count: number = 5, type: string = 'General'): Promise<QuizQuestion[]> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a ${type} Luganda language test with ${count} multiple choice questions. The test should cover vocabulary, grammar (noun classes), and common phrases. Ensure cultural context is accurate.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });
    return JSON.parse(response.text);
  },

  async generateSpeech(text: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say clearly in Luganda: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      return base64Audio || '';
    } catch (error) {
      console.error("Speech generation failed:", error);
      return '';
    }
  }
};
