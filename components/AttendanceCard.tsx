
import React from 'react';
import { MapPin, Clock, ShieldCheck, Zap, Sparkles, AlertCircle, Timer, CameraOff, Trash2, Maximize2 } from 'lucide-react';
import { AttendanceLog, AttendanceStatus } from '../types';

interface Props {
  log: AttendanceLog;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
  onViewPhoto?: (url: string) => void;
}

const AttendanceCard: React.FC<Props> = ({ log, isAdmin, onDelete, onViewPhoto }) => {
  const statusConfig = {
    [AttendanceStatus.PRESENT]: { bg: 'bg-emerald-500', border: 'border-emerald-200', text: 'text-white', lightBg: 'bg-emerald-50', label: 'HADIR' },
    [AttendanceStatus.LATE]: { bg: 'bg-amber-500', border: 'border-amber-300', text: 'text-white', lightBg: 'bg-amber-50', label: 'TERLAMBAT' },
    [AttendanceStatus.ABSENT]: { bg: 'bg-rose-500', border: 'border-rose-200', text: 'text-white', lightBg: 'bg-rose-50', label: 'ALPA' },
    [AttendanceStatus.ALFA_FOTO]: { bg: 'bg-rose-600', border: 'border-rose-300', text: 'text-white', lightBg: 'bg-rose-50', label: 'ALFA (FOTO)' },
    [AttendanceStatus.SICK]: { bg: 'bg-indigo-500', border: 'border-indigo-200', text: 'text-white', lightBg: 'bg-indigo-50', label: 'SAKIT' },
    [AttendanceStatus.PERMISSION]: { bg: 'bg-sky-400', border: 'border-sky-200', text: 'text-white', lightBg: 'bg-sky-50', label: 'IZIN' },
    [AttendanceStatus.REJECTED]: { bg: 'bg-slate-400', border: 'border-slate-200', text: 'text-white', lightBg: 'bg-slate-50', label: 'DITOLAK' },
  };

  const config = statusConfig[log.status];
  const confidencePercent = (log.confidenceScore * 100).toFixed(0);

  return (
    <div className={`bg-white rounded-[28px] p-4 shadow-md border-2 ${config.border} flex flex-col gap-3 transition-all relative overflow-hidden group`}>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0 cursor-pointer" onClick={() => onViewPhoto && onViewPhoto(log.photoUrl)}>
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
            <img src={log.photoUrl} alt={log.studentName} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <Maximize2 className="w-4 h-4 text-white drop-shadow-md" />
            </div>
          </div>
          <div className="absolute -top-1 -right-1 bg-white/90 rounded-lg p-1 shadow-sm border border-slate-100 flex items-center gap-1 px-1.5">
            <span className="text-[8px] font-black text-slate-700">{confidencePercent}% AI</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="truncate">
              <h3 className="font-extrabold text-slate-900 text-[11px] truncate tracking-tight uppercase">{log.studentName}</h3>
              <span className="text-[8px] text-indigo-600 font-black uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{log.className}</span>
            </div>
            <div className="flex gap-2 items-start">
                <div className={`${config.bg} ${config.text} px-3 py-1 rounded-lg font-black text-[8px] tracking-widest border border-white/20 shadow-sm`}>
                {config.label}
                </div>
                {isAdmin && onDelete && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); if(confirm('Hapus data ini?')) onDelete(log.id); }}
                        className="p-1.5 bg-rose-50 text-rose-500 rounded-lg border border-rose-100 hover:bg-rose-100 active:scale-95 transition-all"
                        title="Hapus Data"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                )}
            </div>
          </div>
          
          <div className="mt-2 flex items-center gap-3">
             <div className="flex items-center gap-1 text-slate-400 text-[9px] font-bold">
                <Clock className="w-3 h-3 text-indigo-500" />
                {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
             </div>
             <a 
               href={`https://www.google.com/maps/search/?api=1&query=${log.location.lat},${log.location.lng}`} 
               target="_blank" 
               rel="noreferrer"
               className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
             >
               <MapPin className="w-3 h-3" />
               LIHAT PETA
             </a>
          </div>
        </div>
      </div>

      <div className={`mt-1 p-2 rounded-xl border ${config.border} bg-slate-50/50 flex items-center gap-2`}>
         {log.status === AttendanceStatus.ALFA_FOTO ? <CameraOff className="w-3 h-3 text-rose-500 shrink-0" /> : <ShieldCheck className="w-3 h-3 shrink-0 text-emerald-500" />}
         <span className="text-[9px] font-bold italic text-slate-600 truncate">"{log.aiAnalysis}"</span>
      </div>
    </div>
  );
};

export default AttendanceCard;
