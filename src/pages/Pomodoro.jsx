import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { Play, Pause, RotateCcw, Settings, SkipForward, Volume2, VolumeX, BarChart3, RefreshCw } from 'lucide-react';
import { showAlert } from '../lib/utils';

export default function Pomodoro({ user }) {
  const [view, setView] = useState('timer'); 
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });
  
  // Ana Ayarlar
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('pomoConfig');
    return saved ? JSON.parse(saved) : { focus: 25, short: 5, long: 15, rounds: 4, autoStart: false };
  });

  // Geçici Ayarlar (Kaydetmeden önce)
  const [tempConfig, setTempConfig] = useState(config);

  const [mode, setMode] = useState(() => localStorage.getItem('pomoMode') || 'focus');
  const [isActive, setIsActive] = useState(() => localStorage.getItem('pomoActive') === 'true');
  const [round, setRound] = useState(() => parseInt(localStorage.getItem('pomoRound')) || 1);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [timeLeft, setTimeLeft] = useState(() => {
      const savedTime = parseInt(localStorage.getItem('pomoTime'));
      const maxTime = config[mode] * 60;
      return (savedTime && savedTime <= maxTime) ? savedTime : maxTime;
  });

  useEffect(() => {
      const lastDate = localStorage.getItem('pomoLastDate');
      const today = new Date().toDateString();
      if (lastDate !== today) {
          setRound(1);
          localStorage.setItem('pomoRound', 1);
          localStorage.setItem('pomoLastDate', today);
      }
  }, []);

  // View değiştiğinde tempConfig'i güncelle
  useEffect(() => {
    if (view === 'settings') setTempConfig(config);
  }, [view, config]);

  const audioRef = useRef(new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'));

  const modes = {
    focus: { label: 'ODAKLAN', color: 'text-emerald-500', stroke: '#10b981' },
    short: { label: 'KISA MOLA', color: 'text-teal-400', stroke: '#2dd4bf' },
    long: { label: 'UZUN MOLA', color: 'text-cyan-400', stroke: '#22d3ee' }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    const newTime = config[newMode] * 60;
    setTimeLeft(newTime);
    setIsActive(false);
    localStorage.setItem('pomoMode', newMode);
    localStorage.setItem('pomoTime', newTime);
  };

  const handleTimerComplete = () => {
    setIsActive(false);
    if (soundEnabled) audioRef.current.play().catch(()=>{});
    showAlert("Süre Doldu!", `${modes[mode].label} tamamlandı.`, "success");

    if (mode === 'focus' && user) {
        addDoc(collection(db, 'pomodoro_sessions'), {
            userId: user.uid, duration: config.focus, mode: 'focus', createdAt: serverTimestamp()
        }).catch(e => console.error(e));
    }
    nextRound();
  };

  const nextRound = () => {
    if (mode === 'focus') {
        if (round < config.rounds) { switchMode('short'); } 
        else { switchMode('long'); setRound(1); localStorage.setItem('pomoRound', 1); }
    } else {
        switchMode('focus');
        if (mode === 'short') {
            setRound(r => { const nr = r + 1; localStorage.setItem('pomoRound', nr); return nr; });
        }
    }
    if (config.autoStart) setIsActive(true);
  };

  const skipTimer = () => {
    setIsActive(false);
    nextRound();
  };

  const resetTimer = () => {
    setIsActive(false);
    const newTime = config[mode] * 60;
    setTimeLeft(newTime);
    localStorage.setItem('pomoTime', newTime);
  };

  const resetRounds = () => {
      if(confirm("Oturum sayısını sıfırlamak istiyor musun?")) {
          setRound(1);
          localStorage.setItem('pomoRound', 1);
      }
  };

  // EKLENEN FONKSİYON: AYARLARI KAYDET
  const saveSettings = () => {
    setConfig(tempConfig);
    localStorage.setItem('pomoConfig', JSON.stringify(tempConfig));
    setView('timer');
    showAlert("Ayarlar Kaydedildi", "Yeni süreler uygulandı.", "success");
    
    // Eğer sayaç çalışmıyorsa yeni süreyi hemen uygula
    if(!isActive) {
        const newTime = tempConfig[mode] * 60;
        setTimeLeft(newTime);
        localStorage.setItem('pomoTime', newTime);
    }
  };

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newVal = prev - 1;
          localStorage.setItem('pomoTime', newVal);
          return newVal;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    localStorage.setItem('pomoActive', isActive);
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  useEffect(() => {
    if(view === 'stats' && user) {
        const fetchStats = async () => {
            try {
                const q = query(collection(db, 'pomodoro_sessions'), where('userId', '==', user.uid));
                const snap = await getDocs(q);
                let d = 0, w = 0, m = 0;
                const now = new Date();
                snap.forEach(doc => {
                    const data = doc.data();
                    if(!data.createdAt) return;
                    const date = data.createdAt.toDate();
                    const diff = (now - date) / (1000 * 60 * 60 * 24);
                    if(diff < 1) d += data.duration;
                    if(diff < 7) w += data.duration;
                    if(diff < 30) m += data.duration;
                });
                setStats({ today: d, week: w, month: m });
            } catch (e) { console.error(e); }
        };
        fetchStats();
    }
  }, [view, user]);

  const totalTime = config[mode] * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div className="flex flex-col items-center justify-center h-full animate-fade-in relative p-4">
      <div className="absolute top-0 right-0 flex gap-2 z-10">
        <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-3 glass rounded-xl text-neutral-400 hover:text-white">{soundEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}</button>
        <button onClick={() => setView(view === 'settings' ? 'timer' : 'settings')} className={`p-3 glass rounded-xl transition-colors ${view === 'settings' ? 'text-emerald-500 bg-emerald-500/10' : 'text-neutral-400 hover:text-white'}`}><Settings size={20}/></button>
        <button onClick={() => setView(view === 'stats' ? 'timer' : 'stats')} className={`p-3 glass rounded-xl transition-colors ${view === 'stats' ? 'text-emerald-500 bg-emerald-500/10' : 'text-neutral-400 hover:text-white'}`}><BarChart3 size={20}/></button>
      </div>

      {view === 'timer' && (
        <div className="w-full max-w-lg flex flex-col items-center">
            <div className="flex gap-2 mb-10 bg-black/40 p-1.5 rounded-full border border-white/10">
                {Object.keys(modes).map(m => (
                    <button key={m} onClick={() => switchMode(m)} className={`px-6 py-2 rounded-full text-xs font-bold transition-all uppercase tracking-wide ${mode === m ? 'bg-emerald-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}>{modes[m].label}</button>
                ))}
            </div>
            <div className="relative w-80 h-80 flex items-center justify-center mb-12 group cursor-pointer" onClick={() => setIsActive(!isActive)}>
                <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 transition-colors duration-1000 ${mode === 'focus' ? 'bg-emerald-500' : mode === 'short' ? 'bg-teal-500' : 'bg-cyan-500'}`}></div>
                <svg className="w-full h-full -rotate-90 transform drop-shadow-2xl">
                    <circle cx="160" cy="160" r={radius} stroke="#151515" strokeWidth="12" fill="transparent" />
                    <circle cx="160" cy="160" r={radius} stroke={modes[mode].stroke} strokeWidth="12" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-linear" />
                </svg>
                <div className="absolute flex flex-col items-center pointer-events-none"><span className="text-8xl font-mono font-bold tracking-tighter text-white tabular-nums select-none">{formatTime(timeLeft)}</span><span className={`text-lg font-bold uppercase tracking-[0.4em] mt-4 ${modes[mode].color}`}>{isActive ? 'ÇALIŞILIYOR' : 'DURAKLATILDI'}</span></div>
            </div>
            <div className="flex items-center justify-center gap-8 mb-8">
                <button onClick={resetTimer} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors border border-white/5"><RotateCcw size={24} /></button>
                <button onClick={() => setIsActive(!isActive)} className={`h-20 w-20 rounded-[2rem] flex items-center justify-center transition-all shadow-2xl hover:scale-105 active:scale-95 ${isActive ? 'bg-[#1a1a1a] text-white border border-white/20' : 'bg-emerald-500 text-black shadow-emerald-500/30'}`}>{isActive ? <Pause size={32} fill="currentColor"/> : <Play size={36} fill="currentColor" className="ml-1"/>}</button>
                <button onClick={skipTimer} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors border border-white/5"><SkipForward size={24} /></button>
            </div>
            <div className="text-center relative group">
                <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">OTURUM {round} / {config.rounds}</p>
                <div className="flex gap-2 justify-center mt-2">{Array.from({ length: config.rounds }).map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < round ? 'bg-emerald-500' : i === round - 1 && isActive ? 'bg-emerald-500/50 animate-pulse' : 'bg-white/10'}`}></div>)}</div>
                <button onClick={resetRounds} className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-white p-1"><RefreshCw size={12}/></button>
            </div>
        </div>
      )}

      {view === 'settings' && (
        <div className="w-full max-w-md glass p-8 rounded-3xl animate-fade-in border border-emerald-500/20 bg-[#0a0a0a]">
            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2"><Settings className="text-emerald-500"/> Ayarlar</h2>
            <div className="space-y-8">
                {['focus', 'short', 'long'].map(key => (<div key={key}><div className="flex justify-between text-sm mb-3 font-bold uppercase tracking-wider"><span className={modes[key].color}>{modes[key].label}</span><span className="text-white bg-white/10 px-2 py-0.5 rounded">{tempConfig[key]} dk</span></div><input type="range" min="1" max="90" value={tempConfig[key]} onChange={(e) => setTempConfig({...tempConfig, [key]: parseInt(e.target.value)})} className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"/></div>))}
                <div><div className="flex justify-between text-sm mb-3 font-bold uppercase tracking-wider"><span className="text-purple-400">Tur Sayısı</span><span className="text-white bg-white/10 px-2 py-0.5 rounded">{tempConfig.rounds}</span></div><input type="range" min="1" max="10" value={tempConfig.rounds} onChange={(e) => setTempConfig({...tempConfig, rounds: parseInt(e.target.value)})} className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"/></div>
            </div>
            <div className="flex gap-3 mt-8">
                <button onClick={() => setView('timer')} className="flex-1 py-3 bg-white/5 text-neutral-400 rounded-xl font-bold text-sm hover:bg-white/10">Kapat</button>
                <button onClick={saveSettings} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg">Kaydet</button>
            </div>
        </div>
      )}
      
      {view === 'stats' && (<div className="w-full max-w-2xl glass p-10 rounded-3xl animate-fade-in bg-[#0a0a0a]"><h2 className="text-2xl font-bold text-white mb-8 text-center">Odaklanma İstatistikleri</h2><div className="grid grid-cols-3 gap-6"><div className="bg-white/5 p-6 rounded-2xl text-center border border-white/5"><p className="text-sm text-neutral-500 mb-2">Bugün</p><p className="text-4xl font-bold text-emerald-400">{stats.today} <span className="text-sm text-white">dk</span></p></div><div className="bg-white/5 p-6 rounded-2xl text-center border border-white/5"><p className="text-sm text-neutral-500 mb-2">Bu Hafta</p><p className="text-4xl font-bold text-blue-400">{stats.week} <span className="text-sm text-white">dk</span></p></div><div className="bg-white/5 p-6 rounded-2xl text-center border border-white/5"><p className="text-sm text-neutral-500 mb-2">Bu Ay</p><p className="text-4xl font-bold text-purple-400">{stats.month} <span className="text-sm text-white">dk</span></p></div></div></div>)}
    </div>
  );
}
