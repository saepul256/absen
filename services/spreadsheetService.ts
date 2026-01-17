
import { AttendanceLog } from '../types';

/**
 * Mock Service untuk sinkronisasi ke Google Spreadsheet / Database SMAN 1 Caringin.
 * Output diatur sedemikian rupa agar saat diekspor menjadi CSV/XLS, data terbagi per kolom dengan rapi.
 */
export const syncToSpreadsheet = async (log: AttendanceLog): Promise<boolean> => {
  // Simulasi logging data terstruktur untuk laporan spreadsheet
  const spreadsheetRow = {
    'NO_INDUK_SISTEM': log.id,
    'KELAS': log.className,
    'NAMA_LENGKAP': log.studentName,
    'TANGGAL': new Date(log.timestamp).toLocaleDateString('id-ID'),
    'WAKTU_MASUK': new Date(log.timestamp).toLocaleTimeString('id-ID'),
    'STATUS_KEHADIRAN': log.status,
    'CATATAN_AI': log.aiAnalysis,
    'KOORDINAT_GPS': `${log.location.lat}, ${log.location.lng}`,
    'SKOR_VALIDASI': `${(log.confidenceScore * 100).toFixed(0)}%`
  };

  console.log('🔄 Mengirim Baris Data ke Spreadsheet SMAN 1 Caringin:', spreadsheetRow);
  
  // Simulasi delay jaringan database/API
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Dalam implementasi nyata, di sini akan ada:
  // fetch('https://script.google.com/macros/s/ID_SCRIPT/exec', { method: 'POST', body: JSON.stringify(log) })
  
  return true;
};
