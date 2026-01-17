
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Helper function to handle API calls with exponential backoff for 429 errors.
 */
async function callWithRetry(fn: () => Promise<any>, retries = 3, delay = 2000): Promise<any> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    if (isQuotaError && retries > 0) {
      console.warn(`Quota exceeded. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const validateAttendance = async (
  base64Image: string,
  location: { lat: number; lng: number },
  timestamp: string
) => {
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: `Anda adalah sistem validasi kehadiran untuk SMAN 1 Caringin. 
            Tugas: Analisis foto selfie absensi ini.
            Konteks: 
            - Lokasi: ${location.lat}, ${location.lng}
            - Waktu: ${timestamp}
            
            Aturan Validasi:
            1. Verifikasi apakah gambar adalah orang asli secara langsung, bukan foto dari layar atau kertas.
            2. Periksa apakah memakai seragam sekolah jika terlihat.
            3. Berikan skor kepercayaan (0-1).
            4. Deteksi anomali.
            
            Berikan output dalam format JSON.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            status: { type: Type.STRING, description: "PRESENT, LATE, or REJECTED" },
            confidenceScore: { type: Type.NUMBER },
            reason: { type: Type.STRING },
            aiInsight: { type: Type.STRING }
          },
          required: ["isValid", "status", "confidenceScore", "reason", "aiInsight"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  });
};

export const generateBehavioralReport = async (history: any[]) => {
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [{
          text: `Analisis pola kehadiran siswa SMAN 1 Caringin berikut: ${JSON.stringify(history)}. 
          Buat laporan ringkas yang mencakup:
          1. Rekomendasi tindakan untuk guru bagi siswa yang bermasalah.`
        }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            atRiskStudents: { type: Type.ARRAY, items: { type: Type.STRING } },
            trend: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  });
};
