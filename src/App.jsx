import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { Loader2, AlertOctagon, RefreshCw } from 'lucide-react';

import Auth from './components/Auth';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import TodoList from './pages/TodoList';
import Pomodoro from './pages/Pomodoro';
import Notes from './pages/Notes';
import Forum from './pages/Forum';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import Install from './pages/Install';
import Profile from './pages/Profile';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chatTarget, setChatTarget] = useState(null);
  const [isBanned, setIsBanned] = useState(false);
  const [timeoutError, setTimeoutError] = useState(false);

  const [pomoTime, setPomoTime] = useState(() => {
    const saved = localStorage.getItem('pomoTime');
    return saved ? parseInt(saved) : 25 * 60;
  });
  const [pomoActive, setPomoActive] = useState(() => {
     return localStorage.getItem('pomoActive') === 'true';
  });
  const [pomoMode, setPomoMode] = useState(() => {
      return localStorage.getItem('pomoMode') || 'focus';
  });

  // 1. Zaman Aşımı Koruması (5 Saniye)
  useEffect(() => {
    const timer = setTimeout(() => {
        if (loading) {
            console.warn("Yükleme çok uzun sürdü, zorla açılıyor...");
            // Eğer hala yükleniyorsa ve kullanıcı yoksa, muhtemelen auth yanıt vermedi.
            // Loading'i kapatıp login ekranını gösteriyoruz.
            setLoading(false);
        }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  // 2. Pomodoro Timer
  useEffect(() => {
    let interval = null;
    if (pomoActive && pomoTime > 0) {
      interval = setInterval(() => {
        setPomoTime(t => {
            const newTime = t - 1;
            localStorage.setItem('pomoTime', newTime);
            return newTime;
        });
      }, 1000);
    } else if (pomoTime === 0) {
      setPomoActive(false);
      localStorage.setItem('pomoActive', 'false');
      new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(()=>{});
    }
    localStorage.setItem('pomoActive', pomoActive);
    localStorage.setItem('pomoMode', pomoMode);
    return () => clearInterval(interval);
  }, [pomoActive, pomoTime, pomoMode]);

  // 3. Auth ve Heartbeat
  useEffect(() => {
    if (!auth) {
        setLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
            // Kullanıcı verisini çek
            const docRef = doc(db, 'users', u.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Ban kontrolü
                if (data.isBanned) {
                    setIsBanned(true);
                    setLoading(false);
                    return;
                }
                setIsAdmin(data.role === 'admin');
                
                // Heartbeat (Online Durumu)
                await updateDoc(docRef, { lastSeen: serverTimestamp(), isOnline: true });
            }
        } catch (e) { 
            console.error("Kullanıcı verisi çekilemedi:", e); 
        }
        setUser(u);
      } else { 
        setUser(null); setIsAdmin(false); 
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenChat = (uid) => {
    setChatTarget(uid);
    setActiveTab('chat');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center text-emerald-500 gap-6">
        <Loader2 className="w-12 h-12 animate-spin" />
        <div className="text-center">
            <p className="font-mono text-xs tracking-widest animate-pulse mb-2">SİSTEM BAĞLANTISI KURULUYOR...</p>
            <p className="text-[10px] text-neutral-600">Lütfen bekleyin</p>
        </div>
    </div>
  );
  
  if (isBanned) return (
    <div className="min-h-screen bg-red-950/30 flex flex-col items-center justify-center text-red-500 animate-pulse gap-4">
        <AlertOctagon size={64} /><h1 className="text-3xl font-bold">ERİŞİM ENGELLENDİ</h1>
    </div>
  );

  if (!user) return <Auth />;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user} isAdmin={isAdmin} onOpenChat={handleOpenChat}>
      {activeTab === 'dashboard' && <Dashboard user={user} setActiveTab={setActiveTab} />}
      {activeTab === 'agenda' && <Agenda user={user} />}
      {activeTab === 'todo' && <TodoList user={user} />}
      {activeTab === 'pomodoro' && <Pomodoro user={user} timeLeft={pomoTime} setTimeLeft={setPomoTime} isActive={pomoActive} setIsActive={setPomoActive} mode={pomoMode} setMode={setPomoMode} />}
      {activeTab === 'notes' && <Notes user={user} />}
      {activeTab === 'forum' && <Forum user={user} isAdmin={isAdmin} onOpenChat={handleOpenChat} />}
      {activeTab === 'chat' && <Chat user={user} preSelectedUid={chatTarget} isAdmin={isAdmin} />}
      {activeTab === 'profile' && <Profile user={user} />}
      {activeTab === 'admin' && isAdmin && <Admin />}
      {activeTab === 'install' && <Install user={user} setActiveTab={setActiveTab} />}
    </Layout>
  );
}
