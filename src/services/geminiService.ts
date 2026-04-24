import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type IndianLanguage = 
  | 'Hindi' 
  | 'Bengali' 
  | 'Marathi' 
  | 'Telugu' 
  | 'Tamil' 
  | 'Gujarati' 
  | 'Urdu' 
  | 'Kannada' 
  | 'Odia' 
  | 'Malayalam' 
  | 'Punjabi';

export async function translateMessage(text: string, targetLanguage: IndianLanguage) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following English message into ${targetLanguage}. Output ONLY the translated text in the native script of ${targetLanguage}.\n\nMessage: ${text}`,
    });

    return response.text?.trim() || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}
