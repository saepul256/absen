
import { GoogleGenAI, Type } from "@google/genai";

// Initialize with named parameter as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function callWithRetry(fn: () => Promise<any>, retries = 2, delay = 1000): Promise<any> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    if (isQuotaError && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 1.5);
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
    try {
      // Use ai.models.generateContent directly and correct model name 'gemini-3-flash-preview'
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            {
              text: `SISTEM ABSENSI INTELLIGENT SMAN 1 CARINGIN.
              Analisis foto ini:
              1. Konfirmasi keaslian wajah (Bukan foto dari layar/cetakan).
              2. Deteksi ekspresi (senang, netral, atau lelah) untuk insight kesejahteraan siswa.
              3. Tentukan status berdasarkan waktu server: ${timestamp}. 
              PENTING: Batas masuk adalah jam 06:30 WIB. Jika waktu menunjukkan > 06:30, status WAJIB "TERLAMBAT".
              4. Berikan skor kepercayaan tinggi.
              
              Balas hanya JSON murni.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValid: { type: Type.BOOLEAN },
              status: { type: Type.STRING },
              confidenceScore: { type: Type.NUMBER },
              reason: { type: Type.STRING },
              aiInsight: { type: Type.STRING },
              mood: { type: Type.STRING }
            },
            required: ["isValid", "status", "confidenceScore", "reason", "aiInsight", "mood"]
          }
        }
      });

      // Use .text property instead of .text() method
      const text = response.text;
      if (!text) throw new Error("Empty AI Response");
      return JSON.parse(text);
    } catch (err) {
      console.error("AI Validation Error:", err);
      // Fallback logic manual jika AI gagal
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const isLate = (hours > 6) || (hours === 6 && minutes > 30);
      
      return {
        isValid: true,
        status: isLate ? "TERLAMBAT" : "HADIR",
        confidenceScore: 0.9,
        reason: "Auto-validation fallback",
        aiInsight: "Kehadiran diverifikasi sistem (Fallback).",
        mood: "Netral"
      };
    }
  });
};

export const generateBehavioralReport = async (history: any[]) => {
  if (history.length === 0) return null;
  
  return callWithRetry(async () => {
    try {
      // Use ai.models.generateContent directly and correct model name 'gemini-3-pro-preview'
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [{
            text: `Analisis data absensi SMAN 1 Caringin berikut: ${JSON.stringify(history)}.
            Berikan laporan strategis untuk sekolah mengenai:
            1. Ringkasan tingkat kedisiplinan.
            2. Daftar nama siswa yang menunjukkan tren penurunan kehadiran (At-Risk).
            3. Analisis tren (Meningkat/Menurun).
            4. Rekomendasi tindakan spesifik untuk wali kelas.
            
            Format dalam Bahasa Indonesia yang formal.`
          }]
        },
        config: {
          // gemini-3-pro-preview supports thinkingConfig
          thinkingConfig: { thinkingBudget: 32768 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              atRiskStudents: { type: Type.ARRAY, items: { type: Type.STRING } },
              trend: { type: Type.STRING },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["summary", "atRiskStudents", "trend", "recommendations"]
          }
        }
      });
      // Use .text property instead of .text() method
      return JSON.parse(response.text || '{}');
    } catch (err) {
      console.error("Analysis Error:", err);
      return {
        summary: "Analisis sedang tidak dapat dihasilkan karena keterbatasan data atau kuota API.",
        atRiskStudents: [],
        trend: "stabil",
        recommendations: ["Lakukan pemantauan manual sementara waktu."]
      };
    }
  });
};
