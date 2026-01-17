
import React from 'react';
import { MapPin } from 'lucide-react';
import { AttendanceLog, AttendanceStatus } from '../types';

interface Props {
  log: AttendanceLog;
}

const AttendanceCard: React.FC<Props> = ({ log }) => {
  const statusColors = {
    [AttendanceStatus.PRESENT]: 'bg-green-100 text-green-700',
    [AttendanceStatus.LATE]: 'bg-amber-100 text-amber-700',
    [AttendanceStatus.ABSENT]: 'bg-red-100 text-red-700',
    [AttendanceStatus.SICK]: 'bg-blue-100 text-blue-700',
    [AttendanceStatus.PERMISSION]: 'bg-orange-100 text-orange-700',
    [AttendanceStatus.REJECTED]: 'bg-gray-100 text-gray-500',
  };

  const statusLabels = {
    [AttendanceStatus.PRESENT]: 'HADIR',
    [AttendanceStatus.LATE]: 'TERLAMBAT',
    [AttendanceStatus.ABSENT]: 'ALPA',
    [AttendanceStatus.SICK]: 'SAKIT',
    [AttendanceStatus.PERMISSION]: 'IZIN',
    [AttendanceStatus.REJECTED]: 'DITOLAK',
  };

  const googleMapsUrl = `https://www.google.com/maps?q=${log.location.lat},${log.location.lng}`;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md">
      <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 border-2 border-indigo-50">
        <img src={log.photoUrl} alt={log.studentName} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-slate-800 leading-none">{log.studentName}</h3>
            <span className="text-[10px] text-indigo-600 font-semibold uppercase">{log.className}</span>
          </div>
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${statusColors[log.status]}`}>
            {statusLabels[log.status]}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">{new Date(log.timestamp).toLocaleString('id-ID')}</p>
        
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 line-clamp-1 italic max-w-[150px]">"{log.aiAnalysis}"</p>
          <a 
            href={googleMapsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[9px] font-bold text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg"
          >
            <MapPin className="w-2.5 h-2.5" />
            LOKASI MAP
          </a>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCard;
