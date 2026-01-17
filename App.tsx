
import React, { useState, useEffect, useRef } from 'react';
import { Camera, ShieldCheck, Users, Bell, LogIn, Sparkles, LogOut, CheckCircle2, MapPin, Search, GraduationCap, School, BookOpen, Award, Download, Calendar, Trash2, Edit3, X, BarChart3, AlertCircle, Clock, HeartPulse, FileText, UserX, Wifi, ZapOff, FileSpreadsheet } from 'lucide-react';
import { validateAttendance, generateBehavioralReport } from './services/geminiService';
import { syncToSpreadsheet } from './services/spreadsheetService';
import { AttendanceLog, AttendanceStatus, AIReport, User, UserRole } from './types';
import AttendanceCard from './components/AttendanceCard';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AIReport | null>(null);
  const [view, setView] = useState<'daily' | 'analysis' | 'monthly'>('daily');
  
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);
  const [loginFeedback, setLoginFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  
  const [loginRole, setLoginRole] = useState<UserRole>('STUDENT');
  const [nameInput, setNameInput] = useState('');
  const [classInput, setClassInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const classList = [
    "X-1", "X-2", "X-3", "X-4", "X-5", "X-6", "X-7", "X-8",
    "XI-1", "XI-2", "XI-3", "XI-4", "XI-5", "XI-6", "XI-7", "XI-8", "XI-9",
    "XII-1", "XII-2", "XII-3", "XII-4", "XII-5", "XII-6", "XII-7", "XII-8", "XII-9"
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginFeedback(null);

    if (loginRole === 'STUDENT') {
      if (pinInput === '123' && nameInput.trim() && classInput.trim()) {
        setLoginFeedback({ message: "Login Berhasil! Mengalihkan...", type: 'success' });
        setTimeout(() => {
          setCurrentUser({ name: nameInput, className: classInput, role: 'STUDENT' });
          setLoginFeedback(null);
        }, 1000);
      } else {
        setLoginFeedback({ message: "Login Gagal! Periksa kembali data Anda.", type: 'error' });
      }
    } else {
      if (nameInput.toLowerCase() === 'admin' && pinInput === 'admin') {
        setLoginFeedback({ message: "Akses Admin Diterima!", type: 'success' });
        setTimeout(() => {
          setCurrentUser({ name: 'Administrator', role: 'ADMIN' });
          setLoginFeedback(null);
        }, 1000);
      } else {
        setLoginFeedback({ message: "Login Gagal! Kredensial Admin Salah.", type: 'error' });
      }
    }
  };

  const startCamera = (status: AttendanceStatus) => {
    setSelectedStatus(status);
    setIsCapturing(true);
    setApiError(null);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        alert("Izin kamera ditolak. Pastikan koneksi online aktif.");
        setIsCapturing(false);
      }
    }, 100);
  };

  const takeAbsence = async () => {
    if (!videoRef.current || !canvasRef.current || !currentUser) return;
    setLoading(true);
    setApiError(null);

    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0);
    
    const base64Image = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      try {
        const result = await validateAttendance(base64Image, location, new Date().toISOString());
        
        let finalStatus = selectedStatus;
        if (selectedStatus === AttendanceStatus.PRESENT) {
           finalStatus = result.status as AttendanceStatus;
        }

        const newLog: AttendanceLog = {
          id: Math.random().toString(36).substr(2, 9).toUpperCase(),
          studentName: currentUser.name,
          className: currentUser.className || 'ADMIN',
          timestamp: new Date().toISOString(),
          status: finalStatus,
          photoUrl: `data:image/jpeg;base64,${base64Image}`,
          location,
          aiAnalysis: `${finalStatus === selectedStatus && finalStatus !== AttendanceStatus.PRESENT ? 'Keterangan ' + finalStatus + '. ' : ''}${result.aiInsight}`,
          confidenceScore: result.confidenceScore
        };

        const isSynced = await syncToSpreadsheet(newLog);
        if (isSynced) {
          setLogs(prev => [newLog, ...prev]);
          setAttendanceSuccess(true);
          setTimeout(() => setAttendanceSuccess(false), 3000);
        }

        const stream = videoRef.current?.srcObject as MediaStream;
        stream?.getTracks().forEach(t => t.stop());
        setIsCapturing(false);
      } catch (err: any) {
        const isQuota = err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');
        setApiError(isQuota ? "Sistem sedang sibuk (Quota limit). Mohon tunggu 1 menit dan coba lagi." : "Gagal koneksi AI. Pastikan internet stabil.");
      } finally {
        setLoading(false);
      }
    }, () => {
      alert("Lokasi GPS diperlukan untuk validasi sekolah.");
      setLoading(false);
    });
  };

  const updateLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    setLogs(prev => prev.map(l => l.id === editingLog.id ? editingLog : l));
    setEditingLog(null);
  };

  const exportToCSV = (dataToExport: AttendanceLog[], filename: string) => {
    if (dataToExport.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }
    
    const sortedLogs = [...dataToExport].sort((a, b) => {
      if (a.className !== b.className) return a.className.localeCompare(b.className);
      return a.studentName.localeCompare(b.studentName);
    });

    // Menyiapkan Header Kolom yang Terpisah dan Teratur
    const headers = [
      "NO", 
      "KELAS", 
      "NAMA LENGKAP", 
      "TANGGAL", 
      "JAM", 
      "STATUS UTAMA",
      "HADIR (V)", 
      "SAKIT (V)", 
      "IZIN (V)", 
      "ALFA (V)", 
      "CATATAN AI", 
      "SKOR VALIDASI"
    ];

    const rows = sortedLogs.map((l, index) => {
      // Logika pemisahan kolom status
      const isHadir = (l.status === AttendanceStatus.PRESENT || l.status === AttendanceStatus.LATE) ? "V" : "";
      const isSakit = l.status === AttendanceStatus.SICK ? "V" : "";
      const isIzin = l.status === AttendanceStatus.PERMISSION ? "V" : "";
      // Jika statusnya ABSENT atau memang tidak ada keterangan yang valid, maka ALFA
      const isAlfa = (l.status === AttendanceStatus.ABSENT || l.status === AttendanceStatus.REJECTED) ? "V" : "";

      return [
        index + 1,
        l.className,
        `"${l.studentName.replace(/"/g, '""')}"`,
        new Date(l.timestamp).toLocaleDateString('id-ID'),
        new Date(l.timestamp).toLocaleTimeString('id-ID'),
        l.status,
        isHadir,
        isSakit,
        isIzin,
        isAlfa,
        `"${l.aiAnalysis.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `${(l.confidenceScore * 100).toFixed(0)}%`
      ];
    });

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(l => {
    const isOwner = currentUser?.role === 'ADMIN' || l.studentName === currentUser?.name;
    const logDate = new Date(l.timestamp);
    if (view === 'daily') {
      const filterStr = filterDate;
      const logStr = l.timestamp.split('T')[0];
      return isOwner && logStr === filterStr && (!filterClass || l.className === filterClass);
    } else if (view === 'monthly') {
      const matchMonth = (logDate.getMonth() + 1) === filterMonth;
      const matchYear = logDate.getFullYear() === filterYear;
      return isOwner && matchMonth && matchYear && (!filterClass || l.className === filterClass);
    }
    return isOwner;
  });

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-700 via-indigo-600 to-emerald-500"></div>
        <div className="w-full bg-white rounded-[40px] p-8 shadow-2xl border border-slate-200 relative z-10 text-center">
          <div className="flex flex-col items-center mb-10">
             <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl mb-6 transform rotate-3 hover:rotate-0 transition-transform">
                <GraduationCap className="w-10 h-10 text-white" />
             </div>
            <div className="text-center">
              <p className="text-[10px] font-black tracking-[0.35em] text-blue-700 mb-1 uppercase">Sistem Online Presensi</p>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight">SMAN 1 CARINGIN</h1>
            </div>
            <div className="mt-4 flex items-center gap-2 bg-blue-50 px-4 py-1.5 rounded-full">
              <Wifi className="w-3 h-3 text-blue-600 animate-pulse" />
              <span className="text-[9px] font-bold text-blue-700 uppercase tracking-widest">Server Connected</span>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 border border-slate-200/40">
            <button 
              onClick={() => { setLoginRole('STUDENT'); setLoginFeedback(null); }}
              className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${loginRole === 'STUDENT' ? 'bg-white text-blue-700 shadow-md' : 'text-slate-400'}`}
            >
              SISWA
            </button>
            <button 
              onClick={() => { setLoginRole('ADMIN'); setLoginFeedback(null); }}
              className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${loginRole === 'ADMIN' ? 'bg-white text-blue-700 shadow-md' : 'text-slate-400'}`}
            >
              ADMIN
            </button>
          </div>

          {loginFeedback && (
            <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300 ${loginFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {loginFeedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="text-xs font-bold uppercase tracking-tight text-left">{loginFeedback.message}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-[0.1em]">Input Nama / Admin ID</label>
              <input 
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 font-bold focus:border-blue-400 focus:bg-white transition-all outline-none text-sm"
                placeholder="Data Sesuai Dapodik"
              />
            </div>

            {loginRole === 'STUDENT' && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-[0.1em]">Pilih Kelas</label>
                <select 
                  required
                  value={classInput}
                  onChange={(e) => setClassInput(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 font-bold focus:border-blue-400 focus:bg-white transition-all outline-none text-sm appearance-none cursor-pointer"
                >
                  <option value="" disabled>-- Pilih Kelas Anda --</option>
                  {classList.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-[0.1em]">PIN Akses</label>
              <input 
                type="password"
                required
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 font-bold focus:border-blue-400 focus:bg-white transition-all outline-none text-sm"
                placeholder="****"
              />
            </div>

            <button type="submit" className="w-full bg-slate-900 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-2xl transition-all active:scale-[0.98] mt-4 tracking-[0.3em] uppercase text-[10px] flex items-center justify-center gap-3">
              OTENTIKASI MASUK <LogIn className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative flex flex-col pb-24">
      {attendanceSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-10 duration-500">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-black text-[10px] uppercase tracking-widest text-center">Data Terkirim Online</span>
        </div>
      )}

      <header className="bg-slate-900 text-white pt-14 px-6 pb-12 rounded-b-[48px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-700/30 to-transparent"></div>
        <div className="flex justify-between items-start mb-8 relative z-10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <School className="w-6 h-6 text-white" />
             </div>
             <div>
                <h1 className="text-[10px] font-black uppercase tracking-widest text-blue-300">Presensi Aktif</h1>
                <p className="text-sm font-black tracking-tight leading-tight max-w-[160px] line-clamp-1">{currentUser.name}</p>
                <span className="text-[9px] font-black text-slate-400 uppercase mt-0.5">{currentUser.className || 'ADMINISTRATOR'}</span>
             </div>
          </div>
          <button onClick={() => { setCurrentUser(null); setNameInput(''); setPinInput(''); setClassInput(''); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10">
            <LogOut className="w-5 h-5 text-blue-300" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 -mt-8 relative z-20">
        {currentUser.role === 'ADMIN' && (
          <div className="mb-8 flex flex-col gap-2 bg-white p-2 rounded-[32px] shadow-xl border border-slate-100">
            <div className="flex w-full">
              <button onClick={() => setView('daily')} className={`flex-1 py-3 px-2 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all ${view === 'daily' ? 'bg-blue-700 text-white shadow-lg' : 'text-slate-400'}`}>HARIAN</button>
              <button onClick={() => setView('monthly')} className={`flex-1 py-3 px-2 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all ${view === 'monthly' ? 'bg-blue-700 text-white shadow-lg' : 'text-slate-400'}`}>BULANAN</button>
              <button onClick={async () => { setLoading(true); try { const data = await generateBehavioralReport(logs); setReport(data); setView('analysis'); } catch(e) { alert("Sistem AI sedang sibuk. Coba lagi nanti."); } finally { setLoading(false); } }} className={`flex-1 py-3 px-2 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all ${view === 'analysis' ? 'bg-blue-700 text-white shadow-lg' : 'text-slate-400'}`}>REKAP AI</button>
            </div>
          </div>
        )}

        {(view === 'daily' || view === 'monthly') && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center px-2">
                <h2 className="font-black text-slate-800 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em]">
                  <div className="w-1.5 h-4 bg-blue-700 rounded-full"></div>
                  {view === 'daily' ? 'RECORD HARIAN' : 'RECORD BULANAN'}
                </h2>
                <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 uppercase">
                  {filteredLogs.length} Entri
                </span>
              </div>

              {currentUser.role === 'ADMIN' && (
                <div className="space-y-3">
                  <div className="flex gap-2 px-2 items-center">
                    {view === 'daily' ? (
                      <div className="flex-1 relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-blue-400 shadow-sm" />
                      </div>
                    ) : (
                      <div className="flex-1 flex gap-2">
                        <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))} className="flex-1 bg-white border border-slate-200 rounded-2xl py-3 px-4 text-[10px] font-bold text-slate-700 outline-none focus:border-blue-400 shadow-sm">
                          {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                        <select value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))} className="flex-1 bg-white border border-slate-200 rounded-2xl py-3 px-4 text-[10px] font-bold text-slate-700 outline-none focus:border-blue-400 shadow-sm">
                          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="flex-1 relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-blue-400 appearance-none shadow-sm">
                        <option value="">Semua Kelas</option>
                        {classList.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="px-2">
                    <button onClick={() => exportToCSV(filteredLogs, `SMAN1_REPORT_${filterClass || 'ALL'}_${view === 'daily' ? filterDate : months[filterMonth-1]}`)} className="w-full bg-blue-700 hover:bg-blue-800 text-white py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 transform active:scale-95 group">
                      <FileSpreadsheet className="w-4 h-4 group-hover:animate-bounce" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Ekspor Kolom Spreadsheet Terpisah</span>
                    </button>
                    <div className="mt-3 bg-slate-100 p-3 rounded-xl border border-dashed border-slate-300">
                       <p className="text-[8px] font-bold text-slate-500 text-center uppercase tracking-tight">Format Ekspor: [Hadir] [Sakit] [Izin] [Alfa]</p>
                       <p className="mt-1 text-[7px] font-medium text-slate-400 text-center uppercase italic">* Siswa tanpa record pada hari sekolah otomatis dinyatakan ALFA di laporan</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {filteredLogs.map(log => (
                <div key={log.id} className="relative group">
                  <AttendanceCard log={log} />
                  {currentUser.role === 'ADMIN' && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingLog(log)} className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 shadow-sm"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { if(confirm("Hapus log?")) setLogs(prev => prev.filter(l => l.id !== log.id)); }} className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100 shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="text-center py-24 opacity-30 grayscale p-8 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                  <School className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em]">Database Kosong</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'analysis' && (
          <div className="space-y-6">
            {report && (
              <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                <h4 className="font-black text-slate-800 mb-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.4em]"><Award className="w-4 h-4 text-emerald-500" /> REKOMENDASI AI CARINGIN</h4>
                <div className="space-y-4">
                  {report.recommendations.map((rec, i) => <div key={i} className="text-[11px] text-slate-600 bg-slate-50 p-5 rounded-2xl border-l-4 border-blue-700 font-bold leading-relaxed">{rec}</div>)}
                </div>
              </div>
            )}
            {loading && <div className="text-center py-32"><div className="w-12 h-12 border-4 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto"></div></div>}
          </div>
        )}
      </main>

      {currentUser.role === 'STUDENT' && (
        <div className="fixed bottom-0 left-0 right-0 p-8 flex flex-col gap-4 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent pointer-events-none z-40">
          <div className="flex justify-between gap-3 pointer-events-auto max-w-sm mx-auto w-full">
            <button onClick={() => startCamera(AttendanceStatus.PRESENT)} className="flex-1 bg-emerald-600 text-white p-5 rounded-3xl shadow-2xl flex flex-col items-center gap-2 active:scale-95 transition-all transform hover:-translate-y-1">
              <Clock className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-tighter">HADIR</span>
            </button>
            <button onClick={() => startCamera(AttendanceStatus.SICK)} className="flex-1 bg-blue-600 text-white p-5 rounded-3xl shadow-2xl flex flex-col items-center gap-2 active:scale-95 transition-all transform hover:-translate-y-1">
              <HeartPulse className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-tighter">SAKIT</span>
            </button>
            <button onClick={() => startCamera(AttendanceStatus.PERMISSION)} className="flex-1 bg-amber-600 text-white p-5 rounded-3xl shadow-2xl flex flex-col items-center gap-2 active:scale-95 transition-all transform hover:-translate-y-1">
              <FileText className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-tighter">IZIN</span>
            </button>
          </div>
          <p className="text-[8px] font-black text-slate-400 text-center uppercase tracking-widest pointer-events-auto">Wajib Aktif Internet & GPS</p>
        </div>
      )}

      {isCapturing && (
        <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-2xl">
          <div className="mb-6 bg-blue-600 px-6 py-2 rounded-full text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 shadow-2xl">
            <Wifi className="w-3 h-3" /> VERIFIKASI: {selectedStatus}
          </div>
          
          <div className="relative w-full aspect-[3/4] rounded-[60px] overflow-hidden shadow-2xl border-4 border-white/10 max-w-sm">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
            {loading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                 <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6 shadow-lg"></div>
                 <p className="text-[11px] font-black text-white uppercase tracking-widest animate-pulse leading-relaxed">Menghubungkan ke Engine AI<br/>SMAN 1 Caringin...</p>
              </div>
            )}
          </div>

          {apiError && (
            <div className="mt-6 max-w-sm w-full bg-red-500/20 border border-red-500/50 p-4 rounded-2xl flex items-center gap-3 animate-bounce shadow-lg">
              <ZapOff className="w-5 h-5 text-red-500" />
              <p className="text-[10px] font-black text-red-200 uppercase leading-tight">{apiError}</p>
            </div>
          )}

          <div className="mt-14 flex gap-4 w-full max-w-sm relative z-10">
            <button onClick={() => { const stream = videoRef.current?.srcObject as MediaStream; stream?.getTracks().forEach(t => t.stop()); setIsCapturing(false); setApiError(null); }} className="flex-1 bg-white/10 text-white py-5 rounded-[24px] font-black text-[10px] uppercase transition-all hover:bg-white/20">BATAL</button>
            <button disabled={loading} onClick={takeAbsence} className="flex-1 bg-blue-600 text-white py-5 rounded-[24px] font-black text-[10px] uppercase shadow-2xl transition-all disabled:opacity-50 transform active:scale-95">
              {loading ? "PROSESING..." : "VERIFIKASI ONLINE"}
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {editingLog && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-slate-100">
            <h3 className="font-black text-slate-800 text-xs mb-6 uppercase tracking-widest text-center">Update Data Presensi</h3>
            <form onSubmit={updateLog} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Status Kehadiran</label>
                <select className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl text-xs font-bold focus:border-blue-500 outline-none" value={editingLog.status} onChange={(e) => setEditingLog({...editingLog, status: e.target.value as AttendanceStatus})}>
                  <option value={AttendanceStatus.PRESENT}>HADIR</option>
                  <option value={AttendanceStatus.SICK}>SAKIT</option>
                  <option value={AttendanceStatus.PERMISSION}>IZIN</option>
                  <option value={AttendanceStatus.ABSENT}>ALPA</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Analisis/Catatan</label>
                <textarea className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl text-xs font-bold h-24 focus:border-blue-500 outline-none" value={editingLog.aiAnalysis} onChange={(e) => setEditingLog({...editingLog, aiAnalysis: e.target.value})} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditingLog(null)} className="flex-1 p-4 bg-slate-100 rounded-xl font-black text-[10px] uppercase hover:bg-slate-200">CANCEL</button>
                <button type="submit" className="flex-1 p-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase hover:bg-blue-700 shadow-lg">UPDATE</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
