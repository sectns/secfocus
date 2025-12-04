#!/bin/bash
echo "💎 [v28.0] FINAL MASTERPIECE: POMODORO SETTINGS & READABLE LOGS..."

# 1. UTILS (Loglama ve Silme İyileştirildi)
cat << 'EOF' > src/lib/utils.jsx
import { db } from './firebase';
import { addDoc, collection, serverTimestamp, query, where, getDocs, deleteDoc, doc, updateDoc, arrayRemove, writeBatch, getDoc } from 'firebase/firestore';
import React from 'react';

const BAD_WORDS = ['kötü', 'kelime', 'küfür', 'aptal', 'salak', 'mal', 'gerizekalı']; 

const getIp = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (e) { return 'Gizli IP'; }
};

export const logSystem = async (action, details, user) => {
  try {
    const ip = await getIp();
    // user objesi bazen null gelebilir (silinmişse), kontrol et
    const performedBy = user ? (user.email || user.uid || 'Bilinmiyor') : 'Sistem';
    const uid = user ? (user.uid || 'sys') : 'sys';
    
    await addDoc(collection(db, 'system_logs'), {
      action, 
      details, 
      performedBy, 
      uid, 
      ip, 
      createdAt: serverTimestamp()
    });
  } catch (e) { console.error("Log error:", e); }
};

export const sendNotification = async (toUid, title, text, type = 'system', senderUid = null) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      toUid, title, text, type, senderUid, read: false, createdAt: serverTimestamp()
    });
  } catch (e) { console.error(e); }
};

export const deleteAccountData = async (targetUid, executorUser) => {
  // Silmeden önce e-postasını al (Log için)
  let identifier = targetUid;
  try {
      const uDoc = await getDoc(doc(db, 'users', targetUid));
      if(uDoc.exists()) identifier = uDoc.data().email;
  } catch(e){}

  await logSystem('HESAP SİLME', `İşlem Başladı: ${identifier}`, executorUser);
  
  const collections = ['notes', 'todos', 'events', 'pomodoro_sessions', 'messages', 'forum_threads', 'forum_replies', 'notifications'];
  for (const col of collections) {
      let field = 'userId';
      if (col === 'messages') field = 'senderId';
      if (col === 'forum_threads' || col === 'forum_replies') field = 'authorId';
      if (col === 'notifications') field = 'toUid';
      
      const q = query(collection(db, col), where(field, '==', targetUid));
      const snap = await getDocs(q);
      snap.forEach(d => deleteDoc(d.ref)); 
  }

  // Takip listelerinden temizle
  const usersRef = collection(db, 'users');
  const f1 = await getDocs(query(usersRef, where('following', 'array-contains', targetUid)));
  f1.forEach(d => updateDoc(d.ref, { following: arrayRemove(targetUid) }));
  
  const f2 = await getDocs(query(usersRef, where('followers', 'array-contains', targetUid)));
  f2.forEach(d => updateDoc(d.ref, { followers: arrayRemove(targetUid) }));

  await deleteDoc(doc(db, 'users', targetUid));
  await logSystem('HESAP SİLİNDİ', `Silinen Kullanıcı: ${identifier}`, executorUser);
};

export const processText = (text, filterEnabled) => {
  if (!text) return "";
  let processed = text;
  if (filterEnabled) {
    const regex = new RegExp(`\\b(${BAD_WORDS.join('|')})\\b`, 'gi');
    processed = processed.replace(regex, (match) => '*'.repeat(match.length));
  }
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return processed.split(urlRegex).map((part, i) => 
    part.match(urlRegex) ? <a key={i} href={part} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline break-all cursor-pointer" onClick={(e)=>e.stopPropagation()}>{part}</a> : part
  );
};

export const nameToColor = (name) => {
  const colors = ['text-red-400', 'text-blue-400', 'text-green-400', 'text-purple-400', 'text-orange-400'];
  return colors[name ? name.length % colors.length : 0];
};

export const timeAgo = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'Az önce';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  return date.toLocaleDateString('tr-TR');
};

export const Avatar = ({ src, alt, gender, className }) => {
  const [error, setError] = React.useState(false);
  const defaultMale = "https://cdn-icons-png.flaticon.com/512/4128/4128176.png";
  const defaultFemale = "https://cdn-icons-png.flaticon.com/512/4128/4128335.png";
  const defaultUser = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
  let finalSrc = src;
  if (error || !src) {
    if (gender === 'male') finalSrc = defaultMale;
    else if (gender === 'female') finalSrc = defaultFemale;
    else finalSrc = defaultUser;
  }
  return <img src={finalSrc} alt={alt} className={className} onError={() => setError(true)} />;
};

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

export const showAlert = (title, message, type = 'info') => {
  const event = new CustomEvent('custom-alert', { detail: { title, message, type } });
  window.dispatchEvent(event);
};
EOF

# 2. POMODORO (SaveSettings ve TempConfig Eklendi)
cat << 'EOF' > src/pages/Pomodoro.jsx
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
EOF

# 3. FORUM (Okunabilir Loglar için Düzeltme)
cat << 'EOF' > src/pages/Forum.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, deleteDoc, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Users, ChevronLeft, Send, Hash, Trash2, Reply, UserPlus, UserMinus, X, ArrowRight, MessageCircle, Tag, Plus, Search } from 'lucide-react';
import { logSystem, sendNotification, processText, nameToColor, Avatar, timeAgo, showAlert } from '../lib/utils';

const NewThreadForm = ({ form, setForm, tagInput, setTagInput, onAddTag, removeTag, onSubmit, onClose }) => (
    <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/10">
           <h3 className="font-bold text-white flex items-center gap-2 text-lg"><Send size={20} className="text-emerald-500"/> Konu Başlat</h3>
           <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"><X size={20}/></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 flex-1 flex flex-col">
            <input value={form.title} onChange={e=>setForm({...form, title:e.target.value})} className="input-field py-4 text-lg" placeholder="Konu Başlığı..." required />
            <div className="input-field flex flex-wrap gap-2 items-center min-h-[50px] py-2">
                {form.tags.map(t => (<span key={t} className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-lg flex items-center gap-1 border border-emerald-500/20">#{t} <button type="button" onClick={()=>removeTag(t)}><X size={12}/></button></span>))}
                <input value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={onAddTag} className="bg-transparent outline-none text-sm flex-1 min-w-[100px]" placeholder="Etiket ekle (Enter)..." />
            </div>
            <textarea value={form.content} onChange={e=>setForm({...form, content:e.target.value})} className="input-field flex-1 resize-none p-4 leading-relaxed" placeholder="Ne hakkında konuşmak istersin?" required />
            <button type="submit" className="btn-primary w-full py-4 text-base mt-auto">Yayınla</button>
        </form>
    </div>
);

export default function Forum({ user, isAdmin, onOpenChat }) {
  const [view, setView] = useState('categories');
  const [category, setCategory] = useState(null);
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', tags: [] });
  const [tagInput, setTagInput] = useState('');
  const [reply, setReply] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [userModal, setUserModal] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [showNewThreadMobile, setShowNewThreadMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); 
  const [selectedTag, setSelectedTag] = useState(null);

  const categories = [
    { id: 'general', name: 'Genel Sohbet', desc: 'Kampüs gündemi', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'dev', name: 'Yazılım Kulübü', desc: 'Kodlama, projeler', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { id: 'help', name: 'Yardım Merkezi', desc: 'Soru & Cevap', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { id: 'events', name: 'Etkinlikler', desc: 'Konserler, partiler', color: 'text-purple-400', bg: 'bg-purple-500/10' }
  ];

  useEffect(() => {
    if(!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (d) => setCurrentUserData(d.data()));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (view === 'list' && category) {
      const q = query(collection(db, 'forum_threads'), where('category', '==', category.id));
      return onSnapshot(q, (s) => {
        const d = s.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        d.sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds);
        setThreads(d);
      });
    }
  }, [view, category]);

  useEffect(() => {
    if (view === 'detail' && activeThread) {
      const q = query(collection(db, 'forum_replies'), where('threadId', '==', activeThread.id));
      return onSnapshot(q, (s) => {
        const d = s.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        d.sort((a,b) => a.createdAt?.seconds - b.createdAt?.seconds);
        setReplies(d);
      });
    }
  }, [view, activeThread]);

  const handleAddTag = (e) => {
      if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const val = tagInput.trim();
          const currentTags = Array.isArray(form.tags) ? form.tags : [];
          if(val && !currentTags.includes(val)) setForm(prev => ({ ...prev, tags: [...currentTags, val] }));
          setTagInput('');
      }
  };

  const removeTag = (t) => setForm(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== t) }));

  const createThread = async (e) => {
    e.preventDefault();
    if(!form.title.trim()) return;
    const photo = currentUserData?.photoURL || user.photoURL || '';
    await addDoc(collection(db, 'forum_threads'), {
      ...form, category: category.id, 
      author: user.displayName, authorId: user.uid, authorPhoto: photo,
      bio: currentUserData?.showBioInForum ? (currentUserData?.bio || 'Öğrenci') : '', 
      createdAt: serverTimestamp(), replyCount: 0
    });
    logSystem('KONU_OLUSTURMA', `Başlık: ${form.title}`, user);
    setForm({ title: '', content: '', tags: [] }); setShowModal(false); setShowNewThreadMobile(false); showAlert("Başarılı", "Konu oluşturuldu.", "success");
  };
  
  const sendReply = async (e) => {
    e.preventDefault();
    if(!reply.trim()) return;
    const photo = currentUserData?.photoURL || user.photoURL || '';
    await addDoc(collection(db, 'forum_replies'), {
      text: reply, threadId: activeThread.id,
      author: user.displayName, authorId: user.uid, authorPhoto: photo,
      bio: currentUserData?.showBioInForum ? (currentUserData?.bio || 'Öğrenci') : '',
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, 'forum_threads', activeThread.id), { replyCount: (activeThread.replyCount || 0) + 1 });
    if(activeThread.authorId !== user.uid) sendNotification(activeThread.authorId, "Cevap Geldi", `${user.displayName} yanıtladı.`, 'social');
    setReply('');
  };

  const openUserModal = async (uid) => {
    const d = await getDoc(doc(db, 'users', uid));
    if(d.exists()) setUserModal(d.data());
  };

  // --- SİLME İŞLEMİNDE OKUNABİLİR LOG ---
  const deleteItem = async (col, id, ownerId, titleOrContent) => {
    if (isAdmin || user.uid === ownerId) {
        if(confirm("Silmek istiyor musun?")) { 
            await deleteDoc(doc(db, col, id)); 
            const typeName = col === 'forum_threads' ? 'Konu' : 'Yorum';
            const detail = titleOrContent ? `${typeName}: ${titleOrContent.substring(0, 30)}...` : `${typeName} ID: ${id}`;
            logSystem('SİLME', `Silinen ${detail}`, user); 
        }
    }
  };

  const toggleFollow = async () => {
    if(!userModal || !user.uid) return;
    const myId = user.uid;
    const targetId = userModal.uid;
    const isFollowing = currentUserData?.following?.includes(targetId);
    try {
        if(isFollowing) {
            await updateDoc(doc(db, 'users', myId), { following: arrayRemove(targetId) });
            await updateDoc(doc(db, 'users', targetId), { followers: arrayRemove(myId) });
        } else {
            await updateDoc(doc(db, 'users', myId), { following: arrayUnion(targetId) });
            await updateDoc(doc(db, 'users', targetId), { followers: arrayUnion(myId) });
            sendNotification(targetId, "Yeni Takipçi", `${user.displayName} seni takip etti.`, 'social', myId);
        }
    } catch(e) { console.error(e); }
  };

  const filteredThreads = threads.filter(t => 
    (t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.content.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!selectedTag || (t.tags && t.tags.includes(selectedTag)))
  );

  return (
    <div className="flex flex-col h-full animate-fade-in p-2 relative">
      {/* USER MODAL */}
      {userModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={() => setUserModal(null)}>
            <div className="glass p-8 rounded-3xl w-full max-w-sm text-center bg-[#0a0a0a] border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-emerald-500 overflow-hidden"><Avatar src={userModal.photoURL} alt={userModal.name} gender={userModal.gender} className="w-full h-full object-cover"/></div>
                <h3 className="text-2xl font-bold text-white">{userModal.name} {userModal.surname}</h3>
                <p className="text-emerald-500 font-mono text-xs mb-2 bg-emerald-500/10 px-2 py-0.5 rounded inline-block">{userModal.department || 'Öğrenci'}</p>
                <p className="text-neutral-400 text-sm italic mb-6">"{userModal.bio || '...'}"</p>
                {userModal.uid !== user.uid && (
                    <div className="flex flex-col gap-3">
                        <button onClick={toggleFollow} className={`btn-primary w-full ${currentUserData?.following?.includes(userModal.uid) ? 'bg-red-600 hover:bg-red-500' : ''}`}>{currentUserData?.following?.includes(userModal.uid) ? <><UserMinus size={18}/> Takibi Bırak</> : <><UserPlus size={18}/> Takip Et</>}</button>
                        {(userModal.allowChat !== false || isAdmin) && <button onClick={() => { onOpenChat(userModal.uid); setUserModal(null); }} className="w-full py-3 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2 font-bold text-sm border border-white/5"><MessageCircle size={18} /> Mesaj Gönder</button>}
                    </div>
                )}
            </div>
        </div>
      )}

      {showModal && <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl"><div className="w-full max-w-3xl glass-strong p-8 rounded-3xl border border-emerald-500/20 relative h-[80vh] flex flex-col"><NewThreadForm form={form} setForm={setForm} tagInput={tagInput} setTagInput={setTagInput} onAddTag={handleAddTag} removeTag={removeTag} onSubmit={createThread} onClose={() => setShowModal(false)} /></div></div>}
      {showNewThreadMobile && <div className="fixed inset-0 z-[90] bg-[#0a0a0a] p-6 flex flex-col animate-fade-in lg:hidden"><NewThreadForm form={form} setForm={setForm} tagInput={tagInput} setTagInput={setTagInput} onAddTag={handleAddTag} removeTag={removeTag} onSubmit={createThread} onClose={() => setShowNewThreadMobile(false)} /></div>}

      <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
            {view !== 'categories' && <button onClick={() => setView(view === 'detail' ? 'list' : 'categories')} className="p-2 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors"><ChevronLeft size={24} /></button>}
            <h2 className="text-xl font-bold text-white">{view === 'categories' ? 'Forumlar' : category?.name}</h2>
        </div>
        {view === 'list' && (
             <div className="flex items-center bg-white/5 rounded-xl px-3 py-1.5 border border-white/10 w-48 md:w-64">
                <Search size={14} className="text-neutral-500 mr-2"/>
                <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="bg-transparent outline-none text-sm text-white w-full placeholder:text-neutral-600" placeholder="Konu ara..." />
            </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {view === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto h-full pr-2">
            {categories.map(c => (
              <div key={c.id} onClick={() => { setCategory(c); setView('list'); }} className="glass p-6 rounded-xl cursor-pointer hover:border-emerald-500/30 hover:bg-white/[0.02] transition-all group border border-white/5">
                <div className={`p-3 rounded-lg ${c.bg} w-fit mb-3`}><Hash className={c.color} size={24} /></div>
                <h3 className="text-lg font-bold text-white mb-1">{c.name}</h3><p className="text-neutral-400 text-sm">{c.desc}</p>
              </div>
            ))}
          </div>
        )}

        {view === 'list' && (
          <div className="flex gap-6 h-full relative">
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {selectedTag && <div className="flex items-center gap-2 mb-2 text-xs text-neutral-400">Filtre: <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded flex items-center gap-1">#{selectedTag} <button onClick={()=>setSelectedTag(null)}><X size={12}/></button></span></div>}
              
              {filteredThreads.length === 0 && <div className="text-center text-neutral-500 py-10">Konu bulunamadı.</div>}
              {filteredThreads.map(t => (
                <div key={t.id} onClick={() => { setActiveThread(t); setView('detail'); }} className="glass p-5 rounded-xl relative group hover:bg-white/[0.02] transition-all border border-white/5 cursor-pointer">
                  <h3 className="font-bold text-white text-lg mb-2">{t.title}</h3>
                  <div className="flex gap-2 mb-3 flex-wrap">{Array.isArray(t.tags) && t.tags.map(tag => <span key={tag} onClick={(e)=>{e.stopPropagation(); setSelectedTag(tag)}} className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">#{tag}</span>)}</div>
                  <div className="flex items-center justify-between mt-2 text-xs text-neutral-500">
                    <span className={`font-bold hover:underline ${nameToColor(t.author)}`} onClick={(e)=>{e.stopPropagation(); openUserModal(t.authorId)}}>{t.author}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={12}/> {t.replyCount || 0}</span>
                  </div>
                  {(isAdmin || user.uid === t.authorId) && <button onClick={(e) => { e.stopPropagation(); deleteItem('forum_threads', t.id, t.authorId, t.title); }} className="absolute top-4 right-4 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"><Trash2 size={16}/></button>}
                </div>
              ))}
            </div>
            <div className="w-80 hidden lg:block glass p-6 rounded-2xl h-fit border border-emerald-500/20"><NewThreadForm form={form} setForm={setForm} tagInput={tagInput} setTagInput={setTagInput} onAddTag={handleAddTag} removeTag={removeTag} onSubmit={createThread} onClose={() => setShowModal(false)} /></div>
            <button onClick={()=>setShowNewThreadMobile(true)} className="lg:hidden fixed bottom-24 right-6 bg-emerald-600 text-white p-4 rounded-full shadow-2xl shadow-emerald-900/50 z-50"><Plus size={28}/></button>
          </div>
        )}

        {view === 'detail' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pb-4 pr-2">
              <div className="glass p-8 rounded-2xl border-l-4 border-l-emerald-500 bg-[#0a0a0a] relative">
                <h1 className="text-2xl font-bold text-white mb-4">{activeThread.title}</h1>
                <div className="flex gap-2 mb-4">{Array.isArray(activeThread.tags) && activeThread.tags.map(tag => <span key={tag} className="text-xs bg-white/5 text-emerald-300 px-2 py-1 rounded border border-white/10">#{tag}</span>)}</div>
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
                    <div className="w-12 h-12 rounded-full border border-white/10 overflow-hidden cursor-pointer" onClick={()=>openUserModal(activeThread.authorId)}><Avatar src={activeThread.authorPhoto} alt={activeThread.author} className="w-full h-full object-cover"/></div>
                    <div><span className={`font-bold text-sm cursor-pointer hover:underline ${nameToColor(activeThread.author)}`} onClick={()=>openUserModal(activeThread.authorId)}>{activeThread.author}</span></div>
                    <div className="ml-auto text-xs text-neutral-600 font-mono">{timeAgo(activeThread.createdAt)}</div>
                </div>
                <p className="text-neutral-200 leading-relaxed whitespace-pre-wrap">{processText(activeThread.content, currentUserData?.filterEnabled)}</p>
                {(isAdmin || user.uid === activeThread.authorId) && <button onClick={() => { deleteItem('forum_threads', activeThread.id, activeThread.authorId, activeThread.title); setView('list'); }} className="absolute top-6 right-6 text-neutral-600 hover:text-red-500 opacity-50 hover:opacity-100 transition-opacity"><Trash2 size={20}/></button>}
              </div>
              {replies.map(r => (
                <div key={r.id} className="glass p-5 rounded-2xl border border-white/5 ml-4 md:ml-10 relative group">
                  <div className="flex justify-between mb-2 items-start">
                    <div className="flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border border-white/10" onClick={()=>openUserModal(r.authorId)}><Avatar src={r.authorPhoto} alt={r.author} className="w-full h-full object-cover"/></div>
                        <span className={`font-bold text-sm cursor-pointer hover:underline ${nameToColor(r.author)}`} onClick={()=>openUserModal(r.authorId)}>{r.author}</span>
                    </div>
                    <div className="flex items-center gap-3"><span className="text-[10px] text-neutral-600 font-mono">{timeAgo(r.createdAt)}</span>{(isAdmin || user.uid === r.authorId) && <button onClick={() => deleteItem('forum_replies', r.id, r.authorId, r.text)} className="text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>}</div>
                  </div>
                  <p className="text-neutral-300 text-sm ml-11 leading-relaxed">{processText(r.text, currentUserData?.filterEnabled)}</p>
                  <button onClick={() => setReply(`@${r.author} `)} className="absolute bottom-3 right-3 text-neutral-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg"><Reply size={16}/></button>
                </div>
              ))}
            </div>
            <form onSubmit={sendReply} className="mt-4 flex gap-3 bg-[#0a0a0a] p-3 rounded-2xl border border-white/10 flex-shrink-0">
              <input value={reply} onChange={e=>setReply(e.target.value)} className="flex-1 bg-transparent text-white outline-none placeholder:text-neutral-600" placeholder="Yanıtınızı yazın..." />
              <button type="submit" className="text-emerald-500 p-2"><Send size={24} /></button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
EOF

# 4. ADMIN (Log Düzeltmesi)
cat << 'EOF' > src/pages/Admin.jsx
import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, deleteDoc, doc, onSnapshot, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ShieldAlert, Trash2, User, Activity, MessageCircle, Ban, Unlock, Crown, Globe } from 'lucide-react';
import { deleteAccountData, timeAgo } from '../lib/utils';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('users');

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (s) => setUsers(s.docs.map(d => ({id:d.id, ...d.data()}))));
    const unsubLogs = onSnapshot(collection(db, 'system_logs'), (s) => {
        const l = s.docs.map(d => ({id:d.id, ...d.data()}));
        l.sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds);
        setLogs(l);
    });
    return () => { unsubUsers(); unsubLogs(); };
  }, []);

  const toggleBan = async (uid, currentStatus) => {
    if(confirm(currentStatus ? 'Ban kaldırılsın mı?' : 'Kullanıcı banlansın mı?')) {
        await updateDoc(doc(db, 'users', uid), { isBanned: !currentStatus });
    }
  };

  const changeRole = async (uid, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if(confirm(`Rolü ${newRole} olarak değiştirmek istiyor musun?`)) {
        await updateDoc(doc(db, 'users', uid), { role: newRole });
    }
  };

  const handleDeleteUser = async (uid) => {
    if(!confirm('DİKKAT: Bu kullanıcının TÜM verileri kalıcı olarak silinecek. Emin misin?')) return;
    try { await deleteAccountData(uid, { email: 'ADMIN' }); alert("Silindi."); } catch(e) { alert(e.message); }
  };

  const translateAction = (action) => {
      const map = {
          'ACCOUNT_WIPE_START': 'Hesap Silme Başladı',
          'ACCOUNT_WIPE_COMPLETE': 'Hesap Silindi',
          'THREAD_CREATE': 'Konu Açıldı',
          'SEND_MESSAGE': 'Mesaj Gönderildi',
          'FORUM_DELETE': 'İçerik Silindi',
          'NOTE_SAVE': 'Not Kaydedildi'
      };
      return map[action] || action;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto h-full flex flex-col p-2">
      <div className="flex items-center justify-between p-6 rounded-3xl bg-gradient-to-r from-red-950/40 to-black border border-red-500/20 shadow-2xl">
        <div className="flex items-center gap-5">
            <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 animate-pulse"><ShieldAlert className="text-red-500" size={32} /></div>
            <div><h1 className="text-2xl font-bold text-white tracking-tight">YÖNETİM MERKEZİ</h1><p className="text-red-400/60 font-mono text-xs mt-1 tracking-widest">SİSTEM KÖK ERİŞİMİ</p></div>
        </div>
        <div className="flex gap-2">
            <button onClick={()=>setTab('users')} className={`px-4 py-2 rounded-lg text-xs font-bold ${tab==='users' ? 'bg-red-600 text-white' : 'bg-white/5 text-neutral-400'}`}>KULLANICILAR</button>
            <button onClick={()=>setTab('logs')} className={`px-4 py-2 rounded-lg text-xs font-bold ${tab==='logs' ? 'bg-red-600 text-white' : 'bg-white/5 text-neutral-400'}`}>LOGLAR</button>
        </div>
      </div>

      <div className="glass-strong p-0 rounded-2xl flex flex-col overflow-hidden border border-white/5 flex-1">
        {tab === 'users' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
            {users.map(u => (
                <div key={u.id} className="bg-white/[0.02] hover:bg-white/5 p-4 rounded-xl flex justify-between items-center border border-white/5 transition-all">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-white font-bold text-sm border border-white/10 relative">
                    {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover rounded-full"/> : u.email?.[0].toUpperCase()}
                    {u.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-black rounded-full"></div>}
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm flex items-center gap-2">{u.name} {u.surname} {u.role === 'admin' && <span className="text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/10">ADMIN</span>} {u.isBanned && <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded">BANLI</span>}</p>
                        <p className="text-xs text-neutral-500 font-mono">{u.email}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => changeRole(u.id, u.role)} className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg" title="Rol Değiştir"><Crown size={18}/></button>
                    <button onClick={() => toggleBan(u.id, u.isBanned)} className={`p-2 rounded-lg transition-all ${u.isBanned ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-white/5 text-neutral-400 hover:text-white'}`} title="Banla/Kaldır">{u.isBanned ? <Unlock size={18}/> : <Ban size={18}/>}</button>
                    <button onClick={() => handleDeleteUser(u.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"><Trash2 size={18} /></button>
                </div>
                </div>
            ))}
            </div>
        )}
        {tab === 'logs' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 font-mono">
                {logs.map(l => (
                    <div key={l.id} className="bg-black/40 p-3 rounded-lg border border-white/5 text-xs flex justify-between items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex gap-2"><span className="text-emerald-500 font-bold">[{translateAction(l.action)}]</span> <span className="text-neutral-300">{l.details}</span></div>
                            {l.ip && <div className="flex gap-2 text-[10px] text-neutral-600"><Globe size={10} className="mt-0.5"/> IP: {l.ip}</div>}
                        </div>
                        <div className="text-right">
                            <p className="text-neutral-500">{timeAgo(l.createdAt)}</p>
                            <p className="text-[10px] text-neutral-600">{l.performedBy}</p>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
EOF

echo "✅ [v28.0] FINAL MASTERPIECE COMPLETED!"