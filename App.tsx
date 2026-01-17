
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Camera, 
  LogOut, 
  GraduationCap, 
  School, 
  Clock, 
  HeartPulse, 
  FileText, 
  FileSpreadsheet, 
  ChevronRight,
  CheckCircle,
  RefreshCw,
  Table,
  Lightbulb,
  TrendingDown,
  BrainCircuit,
  UserCheck,
  ShieldCheck,
  ChevronDown,
  WifiOff,
  Zap,
  Calendar as CalendarIcon,
  ChevronLeft,
  Info,
  Star,
  Sparkles,
  Target,
  Filter,
  BarChart3,
  Users,
  LayoutGrid,
  Timer,
  Edit2,
  Download,
  FileSearch,
  CameraOff,
  AlertTriangle,
  ClipboardCheck,
  CalendarDays,
  Navigation,
  MapPin,
  Lock,
  X,
  PieChart,
  Percent
} from 'lucide-react';
import { validateAttendance, generateBehavioralReport } from './services/geminiService';
import { syncToSpreadsheet } from './services/spreadsheetService';
import { AttendanceLog, AttendanceStatus, User, UserRole, AIReport } from './types';
import AttendanceCard from './components/AttendanceCard';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [view, setView] = useState<'daily' | 'analysis' | 'summary'>('daily');
  // Updated state type to include monthly_chart
  const [recapMode, setRecapMode] = useState<'daily' | 'monthly' | 'monthly_chart'>('daily');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);
  
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
  
  const [loginRole, setLoginRole] = useState<UserRole>('STUDENT');
  const [nameInput, setNameInput] = useState('');
  const [classInput, setClassInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  // GPS State - Simplified to just track location for metadata, no distance calculation
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Time State for Live Clock & Late Check
  const [currentTime, setCurrentTime] = useState(new Date());

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  
  // Date formatter for Login Screen
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric'
  });

  const classList = useMemo(() => {
    const list: string[] = [];
    for (let i = 1; i <= 8; i++) list.push(`X-${i}`);
    for (let i = 1; i <= 9; i++) list.push(`XI-${i}`);
    for (let i = 1; i <= 9; i++) list.push(`XII-${i}`);
    return list;
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Update clock every minute for late check accuracy
    const timer = setInterval(() => setCurrentTime(new Date()), 1000 * 60);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(timer);
    };
  }, []);

  // Helper to determine if it is currently "Late" (After 06:30)
  const isLate = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    // Late if hour is > 6 OR (hour is 6 AND minute > 30)
    return hours > 6 || (hours === 6 && minutes > 30);
  };

  // Real-time GPS Tracking when Camera is Open
  useEffect(() => {
    let watchId: number;
    if (isCapturing) {
      setGpsError(null);
      if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentLocation({ lat: latitude, lng: longitude });
            // Distance calculation removed as attendance is now allowed anywhere
          },
          (error) => {
            console.error("GPS Error", error);
            setGpsError("Gagal mendeteksi lokasi.");
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );
      } else {
        setGpsError("GPS tidak didukung.");
      }
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isCapturing]);

  const filteredLogs = logs.filter(log => {
    if (currentUser?.role === 'STUDENT') {
      return log.studentName === currentUser.name;
    }
    const logDate = new Date(log.timestamp).toISOString().split('T')[0];
    return logDate === filterDate;
  });

  // DAILY RECAP CALCULATIONS
  const dailyRecap = useMemo(() => {
    const rekap: Record<string, { H: number, S: number, I: number, Af: number, Total: number }> = {};
    classList.forEach(c => rekap[c] = { H: 0, S: 0, I: 0, Af: 0, Total: 0 });
    
    filteredLogs.forEach(log => {
      if (rekap[log.className]) {
        if (log.status === AttendanceStatus.PRESENT || log.status === AttendanceStatus.LATE) rekap[log.className].H++;
        else if (log.status === AttendanceStatus.SICK) rekap[log.className].S++;
        else if (log.status === AttendanceStatus.PERMISSION) rekap[log.className].I++;
        else if (log.status === AttendanceStatus.ALFA_FOTO) rekap[log.className].Af++;
        rekap[log.className].Total++;
      }
    });

    const sorted = Object.entries(rekap).sort((a, b) => {
      const getPriority = (name: string) => {
        const [grade, num] = name.split('-');
        let score = grade === 'XII' ? 3000 : grade === 'XI' ? 2000 : 1000;
        return score + (parseInt(num) || 0);
      };
      return getPriority(a[0]) - getPriority(b[0]);
    });

    const schoolTotal = sorted.reduce((acc, [_, counts]) => ({
      H: acc.H + counts.H,
      S: acc.S + counts.S,
      I: acc.I + counts.I,
      Af: acc.Af + counts.Af,
      Total: acc.Total + counts.Total
    }), { H: 0, S: 0, I: 0, Af: 0, Total: 0 });

    return { classes: sorted, schoolTotal };
  }, [filteredLogs, classList]);

  // MONTHLY RECAP CALCULATIONS
  const monthlyRecap = useMemo(() => {
    const rekap: Record<string, { H: number, S: number, I: number, Af: number, Total: number }> = {};
    classList.forEach(c => rekap[c] = { H: 0, S: 0, I: 0, Af: 0, Total: 0 });

    logs.forEach(log => {
      const logDate = new Date(log.timestamp);
      if (logDate.getMonth() === filterMonth) {
        if (rekap[log.className]) {
          if (log.status === AttendanceStatus.PRESENT || log.status === AttendanceStatus.LATE) rekap[log.className].H++;
          else if (log.status === AttendanceStatus.SICK) rekap[log.className].S++;
          else if (log.status === AttendanceStatus.PERMISSION) rekap[log.className].I++;
          else if (log.status === AttendanceStatus.ALFA_FOTO) rekap[log.className].Af++;
          rekap[log.className].Total++;
        }
      }
    });

    const sorted = Object.entries(rekap).sort((a, b) => {
      const getPriority = (name: string) => {
        const [grade, num] = name.split('-');
        let score = grade === 'XII' ? 3000 : grade === 'XI' ? 2000 : 1000;
        return score + (parseInt(num) || 0);
      };
      return getPriority(a[0]) - getPriority(b[0]);
    });

    const schoolTotal = sorted.reduce((acc, [_, counts]) => ({
      H: acc.H + counts.H,
      S: acc.S + counts.S,
      I: acc.I + counts.I,
      Af: acc.Af + counts.Af,
      Total: acc.Total + counts.Total
    }), { H: 0, S: 0, I: 0, Af: 0, Total: 0 });

    return { classes: sorted, schoolTotal };
  }, [logs, classList, filterMonth]);

  const handleDeleteLog = (id: string) => {
    setLogs(prev => prev.filter(log => log.id !== id));
  };

  const handleExport = () => {
    let dataToExport = logs;
    let filename = "";

    // If Daily View -> Export Filtered Date Logs
    if (view === 'daily') {
        dataToExport = logs.filter(log => new Date(log.timestamp).toISOString().split('T')[0] === filterDate);
        filename = `Absensi_Harian_${filterDate}`;
    } 
    // If Summary View -> Check Mode
    else if (view === 'summary') {
        if (recapMode === 'daily') {
             dataToExport = logs.filter(log => new Date(log.timestamp).toISOString().split('T')[0] === filterDate);
             filename = `Rekap_Harian_${filterDate}`;
        } else {
             // For both monthly and monthly_chart
             dataToExport = logs.filter(log => new Date(log.timestamp).getMonth() === filterMonth);
             filename = `Rekap_Bulanan_${months[filterMonth]}`;
        }
    }

    const headers = ["ID", "Waktu", "Nama", "Kelas", "Status", "Lokasi", "Catatan AI", "Kepercayaan"];
    const csvContent = [
      headers.join(","),
      ...dataToExport.map(log => [
        log.id,
        new Date(log.timestamp).toLocaleString('id-ID'),
        `"${log.studentName}"`,
        log.className,
        log.status,
        `"${log.location.lat}, ${log.location.lng}"`,
        `"${log.aiAnalysis.replace(/"/g, '""')}"`,
        `${(log.confidenceScore * 100).toFixed(1)}%`
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginRole === 'STUDENT') {
      if (pinInput === '123' && nameInput.trim() && classInput.trim()) {
        setCurrentUser({ name: nameInput, className: classInput, role: 'STUDENT' });
      }
    } else {
      if (nameInput.toLowerCase() === 'admin' && pinInput === 'admin') {
        setCurrentUser({ name: 'Super Admin', role: 'ADMIN' });
      }
    }
  };

  const startCamera = (status: AttendanceStatus) => {
    setSelectedStatus(status);
    setIsCapturing(true);
    setCurrentLocation(null);
    setGpsError(null);
    // Refresh current time when camera starts to ensure late status is accurate
    setCurrentTime(new Date()); 
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) { setIsCapturing(false); }
    }, 100);
  };

  const takeAbsence = async () => {
    // Explicitly check internet connection before processing
    if (!navigator.onLine) {
      setShowOfflineWarning(true);
      return;
    }

    if (!videoRef.current || !canvasRef.current || !currentUser) return;
    setLoading(true);
    try {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
      if (videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      const timestamp = new Date().toISOString();
      const location = currentLocation || { lat: 0, lng: 0 };
      
      // Determine Final Status: If checking "PRESENT" but it's late, force "LATE"
      const currentlyLate = isLate();
      const finalStatus = (selectedStatus === AttendanceStatus.PRESENT && currentlyLate) 
        ? AttendanceStatus.LATE 
        : selectedStatus;

      const result = await validateAttendance(base64Image, location, timestamp);
      
      const newLog: AttendanceLog = {
        id: Math.random().toString(36).substr(2, 6).toUpperCase(),
        studentName: currentUser.name,
        className: currentUser.className || 'STAFF',
        timestamp: timestamp,
        status: finalStatus, // Use the time-corrected status
        photoUrl: `data:image/jpeg;base64,${base64Image}`,
        location,
        aiAnalysis: result.aiInsight || "Data terverifikasi otomatis.",
        confidenceScore: result.confidenceScore || 0.95
      };
      await syncToSpreadsheet(newLog);
      setLogs(prev => [newLog, ...prev]);
      setLoading(false);
      setIsCapturing(false);
      setShowSuccessOverlay(true);
      setTimeout(() => setShowSuccessOverlay(false), 2000);
    } catch (err) {
      setLoading(false);
      setIsCapturing(false);
      // If error occurs during process (e.g. timeout), also show offline warning if likely network issue
      if (!navigator.onLine) setShowOfflineWarning(true);
    }
  };

  // Determine which recap data to use for rendering
  // Note: monthly_chart also uses monthlyRecap data
  const activeRecap = recapMode === 'daily' ? dailyRecap : monthlyRecap;

  // Responsive Layout Logic
  const isAdmin = currentUser?.role === 'ADMIN';
  const containerClass = isAdmin 
    ? "min-h-screen bg-[#f8fbff] flex flex-col pb-10 w-full" // Admin uses full width
    : "max-w-md mx-auto min-h-screen bg-[#f8fbff] flex flex-col pb-28 border-[6px] border-indigo-100 shadow-xl relative"; // Student/Login uses mobile style

  return (
    <div className={containerClass}>
       {/* CSS for Marquee */}
       <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: flex;
          align-items: center;
          white-space: nowrap;
          animation: marquee 35s linear infinite;
        }
      `}</style>

      {!currentUser ? (
        <div className="max-w-md mx-auto min-h-screen bg-[#fafbff] flex flex-col px-6 py-8 relative overflow-hidden border-[6px] border-double border-indigo-200">
           {/* Marquee Banner - Clean & Vertically Centered */}
           <div className="absolute top-0 left-0 right-0 bg-indigo-900 text-white h-12 flex items-center overflow-hidden z-30 shadow-xl border-b border-indigo-700">
             <div className="animate-marquee px-4 h-full">
                <span className="mx-8 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
                   <School className="w-3 h-3 text-indigo-300" /> Selamat Datang di Sistem Smart Absensi SMAN 1 Caringin
                </span>
                <span className="mx-8 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 text-amber-300">
                   <Clock className="w-3 h-3" /> Batas Hadir: 06:30 WIB
                </span>
                <span className="mx-8 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
                   <Zap className="w-3 h-3 text-emerald-300" /> Verifikasi Wajah AI Aktif
                </span>
                <span className="mx-8 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
                   <Star className="w-3 h-3 text-indigo-300" /> Disiplin adalah Kunci Kesuksesan
                </span>
                <span className="mx-8 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 text-sky-300">
                   <MapPin className="w-3 h-3" /> Lokasi GPS Dicatat
                </span>
             </div>
           </div>

           <header className="mt-16 mb-6 text-center z-20">
             <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center shadow-xl mb-4 mx-auto border-2 border-white/50 animate-float">
               <GraduationCap className="w-8 h-8 text-white" />
             </div>
             <h1 className="text-2xl font-black text-slate-900 tracking-tighter">Smart Absensi</h1>
             <p className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.3em] bg-indigo-50 px-4 py-1.5 rounded-full inline-block mt-2">SMAN 1 CARINGIN</p>
             
             {/* DATE WIDGET */}
             <div className="mt-5 flex justify-center animate-in slide-in-from-bottom-2 duration-700 delay-100">
               <div className="bg-white/90 backdrop-blur-sm px-5 py-2.5 rounded-2xl border-2 border-indigo-50 shadow-sm flex items-center gap-2.5 transform hover:scale-105 transition-transform cursor-default">
                 <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
                   <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                 </div>
                 <div className="text-left">
                   <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Hari Ini</span>
                   <span className="block text-[10px] font-black text-slate-800 uppercase tracking-wide leading-none">
                     {todayFormatted}
                   </span>
                 </div>
               </div>
             </div>
           </header>
           <form onSubmit={handleLogin} className="space-y-4 bg-white p-6 rounded-[32px] border-2 border-white shadow-2xl relative z-20">
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
              <button type="button" onClick={() => setLoginRole('STUDENT')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${loginRole === 'STUDENT' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>SISWA</button>
              <button type="button" onClick={() => setLoginRole('ADMIN')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${loginRole === 'ADMIN' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>ADMIN</button>
            </div>
            <input type="text" required value={nameInput} onChange={e => setNameInput(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] p-4 font-bold text-slate-800 outline-none" placeholder="Username / Nama..." />
            {loginRole === 'STUDENT' && (
               <select required value={classInput} onChange={e => setClassInput(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] p-4 font-bold text-slate-800 outline-none appearance-none">
                  <option value="" disabled>Pilih Kelas...</option>
                  {classList.map(cls => <option key={cls} value={cls}>{cls}</option>)}
               </select>
            )}
            <input type="password" required value={pinInput} onChange={e => setPinInput(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] p-4 font-bold text-slate-800 outline-none" placeholder="PIN..." />
            <button type="submit" className="w-full bg-slate-900 text-white font-black h-[58px] rounded-[20px] text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">MASUK SISTEM</button>
            
            <div className="mt-8 pt-6 border-t-2 border-slate-50">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-indigo-600" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tentang Aplikasi</h3>
              </div>
              
              <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-50 space-y-3">
                <p className="text-[10px] font-bold text-slate-600 leading-relaxed text-justify">
                  Smart Absensi SMAN 1 Caringin mengintegrasikan kecerdasan buatan (Artificial Intelligence) untuk memastikan validitas kehadiran siswa melalui verifikasi wajah dan lokasi secara real-time.
                </p>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                   <div className="bg-white p-2 rounded-xl border border-indigo-100 flex items-center gap-2">
                      <BrainCircuit className="w-3 h-3 text-indigo-500" />
                      <span className="text-[8px] font-black text-slate-700 uppercase">Validasi AI</span>
                   </div>
                   <div className="bg-white p-2 rounded-xl border border-indigo-100 flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-emerald-500" />
                      <span className="text-[8px] font-black text-slate-700 uppercase">Lokasi GPS</span>
                   </div>
                   <div className="bg-white p-2 rounded-xl border border-indigo-100 flex items-center gap-2">
                      <ShieldCheck className="w-3 h-3 text-sky-500" />
                      <span className="text-[8px] font-black text-slate-700 uppercase">Anti-Fraud</span>
                   </div>
                   <div className="bg-white p-2 rounded-xl border border-indigo-100 flex items-center gap-2">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span className="text-[8px] font-black text-slate-700 uppercase">Real-Time</span>
                   </div>
                </div>
                
                <div className="text-center pt-2">
                  <p className="text-[8px] font-bold text-slate-400">Versi 2.0.1 (Stable) • © 2025/2026 SMAN 1 Caringin</p>
                </div>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <>
          <header className={`glass-effect p-5 flex justify-between items-center sticky top-0 z-50 border-b border-indigo-100 ${isAdmin ? 'px-8 py-4 shadow-sm' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><School className="w-5 h-5" /></div>
              <div className="min-w-0">
                <h2 className="text-[10px] font-black text-slate-900 truncate uppercase">{currentUser.name}</h2>
                <span className="text-[8px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{currentUser.className || 'SUPER ADMIN'}</span>
              </div>
            </div>
            <div className="flex gap-2">
               {currentUser.role === 'ADMIN' && (
                  <button onClick={handleExport} className="p-2.5 text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-100 active:scale-95 transition-transform" title={`Download Spreadsheet (${view === 'daily' ? 'Harian' : (recapMode === 'monthly_chart' ? 'Grafik' : recapMode)})`}>
                    <Download className="w-4 h-4" />
                  </button>
               )}
               <button onClick={() => setCurrentUser(null)} className="p-2.5 text-slate-400 bg-white rounded-xl border border-slate-200"><LogOut className="w-4 h-4" /></button>
            </div>
          </header>

          <main className={`flex-1 p-5 space-y-6 ${isAdmin ? 'max-w-7xl mx-auto w-full px-4 lg:px-8 pt-8' : ''}`}>
            {currentUser.role === 'ADMIN' ? (
              <div className="space-y-6">
                <div className="flex gap-2 p-1 bg-white rounded-2xl border border-indigo-50 max-w-md mx-auto shadow-sm">
                  {['daily', 'summary'].map(v => (
                    <button key={v} onClick={() => setView(v as any)} className={`flex-1 py-2.5 text-[9px] font-black rounded-xl transition-all ${view === v ? 'bg-indigo-600 text-white' : 'text-slate-400 uppercase'}`}>{v === 'daily' ? 'Log Harian' : 'Rekapitulasi'}</button>
                  ))}
                </div>

                {view === 'summary' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    {/* Navigation Sub-Tabs */}
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl max-w-lg mx-auto">
                      <button onClick={() => setRecapMode('daily')} className={`flex-1 py-2 text-[8px] font-black rounded-lg transition-all ${recapMode === 'daily' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 uppercase'}`}>Harian</button>
                      <button onClick={() => setRecapMode('monthly')} className={`flex-1 py-2 text-[8px] font-black rounded-lg transition-all ${recapMode === 'monthly' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 uppercase'}`}>Tabel Bulanan</button>
                      <button onClick={() => setRecapMode('monthly_chart')} className={`flex-1 py-2 text-[8px] font-black rounded-lg transition-all ${recapMode === 'monthly_chart' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 uppercase'}`}>Grafik Bulanan</button>
                    </div>
                    
                    {/* CONTENT AREA: Single Column now for full width per tab */}
                    <div className="w-full">
                        
                        {/* CHART VISUALIZATION TAB */}
                        {recapMode === 'monthly_chart' && (
                            <div className="bg-white p-6 rounded-[32px] border border-indigo-50 shadow-sm space-y-4 h-full animate-in zoom-in-95 duration-200">
                               <div className="flex justify-between items-center mb-4">
                                 <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                   <PieChart className="w-4 h-4 text-indigo-600" />
                                   Grafik Statistik Bulan {months[filterMonth]}
                                 </h3>
                                 <select value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))} className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-xl border-none outline-none appearance-none cursor-pointer">
                                    {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                                 </select>
                               </div>
                               
                               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  {activeRecap.classes.length > 0 ? activeRecap.classes.map(([cls, counts]) => {
                                    // Calculate Percentage: (Present / Total) * 100
                                    const percent = counts.Total > 0 ? ((counts.H / counts.Total) * 100).toFixed(0) : 0;
                                    let percentColor = 'text-rose-500';
                                    if (Number(percent) >= 90) percentColor = 'text-emerald-600';
                                    else if (Number(percent) >= 75) percentColor = 'text-indigo-500';

                                    return (
                                    <div key={cls} className="space-y-4 bg-slate-50/50 p-5 rounded-3xl border border-slate-100 relative overflow-hidden group hover:bg-white hover:shadow-md transition-all">
                                       
                                       <div className="flex justify-between items-start">
                                         <div>
                                            <span className="text-lg font-black text-slate-800 tracking-tight">{cls}</span>
                                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase mt-1">
                                                <Users className="w-3 h-3" /> {counts.Total} Data Masuk
                                            </div>
                                         </div>
                                         <div className="text-right">
                                            <div className="flex items-end justify-end gap-0.5">
                                                <span className={`text-3xl font-black ${percentColor}`}>{percent}</span>
                                                <span className={`text-sm font-bold mb-1.5 ${percentColor}`}>%</span>
                                            </div>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Kehadiran</p>
                                         </div>
                                       </div>
                                       
                                       {/* Stacked Bar */}
                                       <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                                          {counts.Total > 0 ? (
                                            <>
                                              <div style={{ width: `${(counts.H / counts.Total) * 100}%` }} className="bg-emerald-500 h-full hover:opacity-90 transition-opacity" title={`Hadir: ${counts.H}`} />
                                              <div style={{ width: `${(counts.S / counts.Total) * 100}%` }} className="bg-indigo-500 h-full hover:opacity-90 transition-opacity" title={`Sakit: ${counts.S}`} />
                                              <div style={{ width: `${(counts.I / counts.Total) * 100}%` }} className="bg-sky-400 h-full hover:opacity-90 transition-opacity" title={`Izin: ${counts.I}`} />
                                              <div style={{ width: `${(counts.Af / counts.Total) * 100}%` }} className="bg-rose-500 h-full hover:opacity-90 transition-opacity" title={`Alfa: ${counts.Af}`} />
                                            </>
                                          ) : (
                                            <div className="w-full h-full bg-slate-200" />
                                          )}
                                       </div>

                                       {/* Legend/Details per card */}
                                       <div className="flex justify-between text-[9px] font-bold text-slate-500 pt-1 border-t border-slate-200/50">
                                          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> H: {counts.H}</span>
                                          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> S: {counts.S}</span>
                                          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-sky-400"></div> I: {counts.I}</span>
                                          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Af: {counts.Af}</span>
                                       </div>
                                    </div>
                                  )}) : (
                                    <div className="col-span-full text-center py-20 text-slate-400 text-[10px] uppercase font-bold border-2 border-dashed border-slate-200 rounded-3xl">Belum ada data visual untuk bulan ini</div>
                                  )}
                               </div>
                               
                               <div className="flex flex-wrap gap-4 justify-center pt-6 mt-4 border-t border-slate-50">
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div><span className="text-[9px] font-black text-emerald-800 uppercase">Hadir (≥90%)</span></div>
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100"><div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm"></div><span className="text-[9px] font-black text-indigo-800 uppercase">Sakit (75-89%)</span></div>
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 rounded-lg border border-sky-100"><div className="w-3 h-3 rounded-full bg-sky-400 shadow-sm"></div><span className="text-[9px] font-black text-sky-800 uppercase">Izin</span></div>
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 rounded-lg border border-rose-100"><div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm"></div><span className="text-[9px] font-black text-rose-800 uppercase">Alfa ({"<"}75%)</span></div>
                               </div>
                            </div>
                        )}

                        {/* TABLE DATA TABS (Daily OR Monthly Table) */}
                        {(recapMode === 'daily' || recapMode === 'monthly') && (
                            <div className="bg-white p-6 rounded-[32px] border border-indigo-50 shadow-sm space-y-4 animate-in zoom-in-95 duration-200">
                              <div className="flex justify-between items-center">
                                <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                  {recapMode === 'daily' ? <Clock className="w-4 h-4 text-indigo-600" /> : <CalendarDays className="w-4 h-4 text-indigo-600" />}
                                  Tabel Data {recapMode === 'daily' ? 'Detail' : `Bulan ${months[filterMonth]}`}
                                </h3>
                                {recapMode === 'daily' ? (
                                  <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-xl border-none outline-none cursor-pointer hover:bg-indigo-100 transition-colors" />
                                ) : (
                                  <select value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))} className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-xl border-none outline-none appearance-none cursor-pointer hover:bg-indigo-100 transition-colors">
                                    {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                                  </select>
                                )}
                              </div>

                              <div className="overflow-x-auto rounded-2xl border border-slate-100 no-scrollbar">
                                <table className="w-full text-left text-[10px] font-bold min-w-[300px]">
                                  <thead className="bg-slate-900 text-white sticky top-0 uppercase font-black">
                                    <tr>
                                      <th className="p-3">Kelas</th>
                                      <th className="p-3 text-center">H</th>
                                      <th className="p-3 text-center">S</th>
                                      <th className="p-3 text-center">I</th>
                                      <th className="p-3 text-center">Af</th>
                                      <th className="p-3 text-center bg-indigo-800">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white">
                                    {activeRecap.classes.map(([cls, counts]) => (
                                      <tr key={cls} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-black text-slate-800">{cls}</td>
                                        <td className="p-3 text-center text-emerald-600">{counts.H}</td>
                                        <td className="p-3 text-center text-indigo-500">{counts.S}</td>
                                        <td className="p-3 text-center text-sky-500">{counts.I}</td>
                                        <td className="p-3 text-center text-rose-600">{counts.Af}</td>
                                        <td className="p-3 text-center text-slate-900 font-black bg-slate-50/50">{counts.Total}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-indigo-50 font-black text-indigo-900">
                                    <tr>
                                      <td className="p-3 uppercase">Total Sekolah</td>
                                      <td className="p-3 text-center">{activeRecap.schoolTotal.H}</td>
                                      <td className="p-3 text-center">{activeRecap.schoolTotal.S}</td>
                                      <td className="p-3 text-center">{activeRecap.schoolTotal.I}</td>
                                      <td className="p-3 text-center">{activeRecap.schoolTotal.Af}</td>
                                      <td className="p-3 text-center bg-indigo-600 text-white">{activeRecap.schoolTotal.Total}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                              
                              <div className="p-3 bg-slate-50 rounded-2xl flex gap-3 items-center">
                                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                                <p className="text-[9px] font-bold text-slate-500 uppercase leading-tight">
                                  H: Hadir, S: Sakit, I: Izin, Af: Alfa Foto.<br/>
                                  Total: Jumlah siswa yang sudah melakukan pelaporan.
                                </p>
                              </div>
                            </div>
                        )}
                    </div>
                  </div>
                )}

                {view === 'daily' && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    <div className="max-w-md mx-auto">
                        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full p-4 rounded-2xl border border-indigo-100 bg-white font-black text-xs text-slate-700 outline-none mb-4 shadow-sm" />
                    </div>
                    
                    {/* Grid Layout for Logs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredLogs.length > 0 ? filteredLogs.map(log => (
                            <AttendanceCard 
                                key={log.id} 
                                log={log} 
                                isAdmin={true} 
                                onDelete={handleDeleteLog}
                                onViewPhoto={setSelectedPhoto}
                            />
                        )) : (
                        <div className="col-span-full p-16 text-center text-slate-400 font-black text-[10px] uppercase border-2 border-dashed border-slate-200 rounded-[32px]">Data Belum Tersedia</div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">Portal Siswa</h3>
                   <p className="text-xl font-black">Histori & Pengajuan</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => startCamera(AttendanceStatus.PRESENT)} className="col-span-2 bg-slate-900 text-white p-5 rounded-[24px] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl">
                    <Camera className="w-6 h-6" /><span className="text-[10px] font-black uppercase tracking-widest">ABSEN HADIR</span>
                  </button>
                  <button onClick={() => startCamera(AttendanceStatus.SICK)} className="bg-white border border-rose-100 text-rose-600 p-4 rounded-[20px] flex items-center justify-center gap-2 active:scale-95 text-[9px] font-black uppercase hover:bg-rose-50 shadow-sm">
                    <HeartPulse className="w-4 h-4" /> SAKIT
                  </button>
                  <button onClick={() => startCamera(AttendanceStatus.PERMISSION)} className="bg-white border border-sky-100 text-sky-600 p-4 rounded-[20px] flex items-center justify-center gap-2 active:scale-95 text-[9px] font-black uppercase hover:bg-sky-50 shadow-sm">
                    <ClipboardCheck className="w-4 h-4" /> FORM IZIN
                  </button>
                  <button onClick={() => startCamera(AttendanceStatus.ALFA_FOTO)} className="col-span-2 bg-white border border-rose-100 text-rose-500 p-4 rounded-[20px] flex items-center justify-center gap-2 active:scale-95 text-[9px] font-black uppercase hover:bg-rose-50 shadow-sm italic">
                    <CameraOff className="w-4 h-4" /> PENGISIAN ALFA (FOTO BUKTI)
                  </button>
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Aktivitas Terbaru</h3>
                   {filteredLogs.length > 0 ? filteredLogs.map(log => (
                       <AttendanceCard 
                          key={log.id} 
                          log={log} 
                          onViewPhoto={setSelectedPhoto}
                       />
                   )) : (
                      <div className="p-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Belum ada riwayat hari ini</p>
                      </div>
                   )}
                </div>
              </div>
            )}
          </main>

          {isCapturing && (
            <div className="fixed inset-0 bg-slate-950 z-[400] flex flex-col items-center justify-center p-8">
               <div className="absolute top-10 text-center text-white space-y-2 w-full max-w-sm">
                  {/* Visual Feedback for Status */}
                  <span className={`px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl transition-colors ${
                      selectedStatus === AttendanceStatus.PRESENT 
                        ? (isLate() ? 'bg-amber-500 text-white' : 'bg-indigo-600') 
                        : 'bg-rose-600'
                    }`}>
                    {selectedStatus === AttendanceStatus.PRESENT 
                      ? (isLate() ? 'TERLAMBAT: JAM MASUK 06:30' : 'VERIFIKASI WAJAH AI') 
                      : selectedStatus === AttendanceStatus.SICK ? 'FOTO SURAT SAKIT' 
                      : selectedStatus === AttendanceStatus.PERMISSION ? 'FOTO FORM IZIN' 
                      : 'FOTO BUKTI ALFA'}
                  </span>

                  <div className="mt-4 p-3 rounded-2xl border flex items-center justify-between shadow-lg backdrop-blur-md bg-slate-800/80 border-slate-600">
                     <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          currentLocation ? 'bg-indigo-500' : 'bg-slate-700 animate-pulse'
                       }`}>
                          <MapPin className="w-4 h-4 text-white" />
                       </div>
                       <div className="text-left">
                         <p className="text-[9px] font-black uppercase tracking-wider text-white">
                           {currentLocation ? "GPS AKTIF & TERKUNCI" : "MENCARI SINYAL GPS..."}
                         </p>
                         <p className="text-[8px] opacity-80 font-mono mt-0.5 text-slate-300">
                            {currentLocation ? 
                            `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}` : 
                            "Menunggu koordinat..."}
                         </p>
                       </div>
                     </div>
                  </div>
               </div>
               
               <video ref={videoRef} autoPlay playsInline className="w-full aspect-[3/4] rounded-[50px] border-4 border-indigo-500 object-cover scale-x-[-1] shadow-2xl mt-4" />
               
               <div className="mt-8 flex gap-4 w-full">
                  <button onClick={() => { if(videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t=>t.stop()); setIsCapturing(false); }} className="flex-1 bg-white/10 text-white py-5 rounded-[24px] font-black text-[10px] uppercase border border-white/20">BATAL</button>
                  <button disabled={loading} onClick={takeAbsence} className="flex-[2] bg-indigo-600 text-white py-5 rounded-[24px] font-black text-[10px] uppercase shadow-xl">
                    {loading ? "MEMPROSES..." : "AMBIL & KIRIM"}
                  </button>
               </div>
               <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {/* Photo Preview Modal */}
          {selectedPhoto && (
            <div className="fixed inset-0 z-[700] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedPhoto(null)}>
              <div className="relative w-full max-w-2xl">
                 <button onClick={() => setSelectedPhoto(null)} className="absolute -top-12 right-0 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all">
                    <X className="w-6 h-6" />
                 </button>
                 <img 
                    src={selectedPhoto} 
                    alt="Bukti Absensi Fullscreen" 
                    className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-2xl border-4 border-white/10" 
                    onClick={(e) => e.stopPropagation()} 
                 />
                 <div className="mt-4 text-center">
                    <p className="text-white/50 text-[10px] uppercase tracking-widest font-black">Mode Pratinjau Foto</p>
                 </div>
              </div>
            </div>
          )}

          {showSuccessOverlay && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center bg-emerald-600/95 backdrop-blur-xl animate-in zoom-in duration-300">
               <div className="text-center">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl animate-bounce"><CheckCircle className="w-10 h-10 text-emerald-600" /></div>
                  <h2 className="text-xl font-black text-white uppercase">Berhasil Terkirim</h2>
                  <p className="text-white/70 text-[10px] font-bold uppercase mt-1">Data Anda Otomatis Memperbarui Rekap</p>
               </div>
            </div>
          )}

          {/* Offline Warning Overlay */}
          {showOfflineWarning && (
            <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-6 animate-in zoom-in duration-200">
               <div className="bg-white w-full max-w-sm rounded-[32px] p-6 text-center shadow-2xl border-2 border-rose-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-100/50 rounded-full -mr-10 -mt-10"></div>
                  <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce shadow-sm">
                    <WifiOff className="w-8 h-8 text-rose-500" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase mb-2 tracking-tight">Koneksi Terputus</h3>
                  <p className="text-[11px] font-bold text-slate-500 leading-relaxed mb-6">
                    Absensi membutuhkan koneksi internet untuk Verifikasi Wajah AI. 
                    <br/><br/>
                    <span className="text-rose-500 bg-rose-50 px-2 py-0.5 rounded">Silakan periksa jaringan Anda dan coba lagi.</span>
                  </p>
                  <button 
                    onClick={() => setShowOfflineWarning(false)}
                    className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition-transform shadow-lg"
                  >
                    Saya Mengerti, Coba Lagi
                  </button>
               </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default App;
