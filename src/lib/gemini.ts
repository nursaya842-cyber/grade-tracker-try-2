import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });
export const GEMINI_MODEL = "gemini-2.5-flash";

export async function generateText(
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: systemInstruction ? { systemInstruction } : undefined,
  });
  return response.text ?? "";
}

export async function generateJson<T>(
  prompt: string,
  systemInstruction?: string
): Promise<T | null> {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        ...(systemInstruction ? { systemInstruction } : {}),
      },
    });
    const text = response.text ?? "";
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
