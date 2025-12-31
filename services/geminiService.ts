
// Use the official import for GoogleGenAI and related types
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Question } from "../types";

// Always use the direct process.env.API_KEY as per guidelines
const getAIClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API Key Gemini tidak ditemukan di process.env. Fitur AI mungkin tidak berfungsi.");
    return null;
  }
  // Initialize with named parameter as required
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export interface FilePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

export const generateQuestions = async (
  topic: string, 
  count: number = 5, 
  materialPart?: FilePart,
  referenceText?: string
): Promise<Question[]> => {
  const ai = getAIClient();
  if (!ai) throw new Error("AI Client not initialized. Please check API Key.");

  const prompt = `Buatkan ${count} soal pilihan ganda tingkat SMA. 
  
  TOPIK UTAMA: ${topic}
  
  ${referenceText ? `SUMBER MATERI (WAJIB DIGUNAKAN): \n"${referenceText}"\n` : ''}
  
  INSTRUKSI KHUSUS:
  1. Jika ada SUMBER MATERI di atas atau LAMPIRAN GAMBAR, Anda WAJIB membuat soal yang bersumber dari konten tersebut.
  2. Gunakan pendekatan HOTS (Higher Order Thinking Skills) untuk menguji pemahaman, bukan sekadar hafalan.
  3. Setiap soal HARUS memiliki tepat 5 pilihan jawaban (A, B, C, D, E).
  4. Berikan jawaban yang benar dalam bentuk indeks (0 untuk A, 1 untuk B, dst).
  5. Kembalikan output HANYA dalam format JSON sesuai schema yang ditentukan.`;

  const textPart = { text: prompt };
  const parts = materialPart ? [materialPart, textPart] : [textPart];

  // Using gemini-3-flash-preview for educational content generation
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { 
              type: Type.STRING, 
              description: "Teks soal lengkap." 
            },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Tepat 5 pilihan jawaban (A-E)"
            },
            correctAnswer: { 
              type: Type.INTEGER, 
              description: "Indeks jawaban yang benar (0-4)" 
            }
          },
          required: ["text", "options", "correctAnswer"]
        }
      }
    }
  });

  try {
    // Access .text property directly (not a method) as per guidelines
    const raw = JSON.parse(response.text || '[]');
    return raw.map((q: any, idx: number) => ({
      ...q,
      id: `q-${Date.now()}-${idx}`
    }));
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return [];
  }
};

export const generateStudentFeedback = async (studentName: string, performanceData: string): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "Teruslah belajar dengan giat untuk mencapai hasil yang lebih maksimal.";

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Sebagai seorang guru yang bijak, berikan komentar raport singkat (max 3 kalimat) untuk siswa bernama ${studentName} berdasarkan data nilai berikut: ${performanceData}. Gunakan Bahasa Indonesia yang formal namun memotivasi.`,
  });
  // Access .text property directly (not a method) as per guidelines
  return response.text || "Teruslah belajar dengan giat untuk mencapai hasil yang lebih maksimal.";
};
