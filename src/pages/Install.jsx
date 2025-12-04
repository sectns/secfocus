import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Settings, CheckCircle, Lock } from 'lucide-react';

export default function Install({ user, setActiveTab }) {
  const [status, setStatus] = useState('checking');
  const [log, setLog] = useState([]);
  const addLog = (msg) => setLog(prev => [...prev, msg]);

  useEffect(() => {
    const checkInstall = async () => {
      const docSnap = await getDoc(doc(db, 'system', 'config'));
      if (docSnap.exists() && docSnap.data().installed) {
        setStatus('locked');
      } else {
        setStatus('idle');
      }
    };
    checkInstall();
  }, []);

  const runInstall = async () => {
    setStatus('running');
    addLog("Sistem başlatılıyor...");
    try {
      addLog(`Yönetici yetkileri atanıyor: ${user.email}`);
      await setDoc(doc(db, 'users', user.uid), { role: 'admin', installedAt: new Date() }, { merge: true });
      await setDoc(doc(db, 'system', 'config'), { installed: true, version: '9.0.0', installer: user.email });
      addLog("✅ Sistem kuruldu ve kilitlendi.");
      setStatus('success');
      setTimeout(() => setActiveTab('dashboard'), 2000);
    } catch (e) { addLog("❌ Hata: " + e.message); setStatus('error'); }
  };

  if (status === 'locked') return <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in"><div className="p-6 bg-red-500/10 rounded-full mb-4"><Lock size={64} className="text-red-500" /></div><h2 className="text-3xl font-bold text-white">Sistem Kilitli</h2><p className="text-neutral-400 mt-2">Kurulum daha önce tamamlanmış. Güvenlik nedeniyle erişilemez.</p></div>;

  return (
    <div className="flex items-center justify-center h-full"><div className="glass p-10 rounded-3xl w-full max-w-xl text-center border-emerald-500/30"><div className="bg-emerald-500/10 p-6 rounded-full inline-block mb-8 shadow-[0_0_40px_rgba(16,185,129,0.2)]"><Settings size={48} className="text-emerald-500" /></div><h1 className="text-4xl font-bold text-white mb-4">SecFocus Kurulum</h1><p className="text-neutral-400 mb-8 text-lg">Sistem yapılandırılacak ve <strong>Süper Yönetici</strong> yetkileri size verilecek.</p><div className="bg-black/50 p-6 rounded-xl text-left font-mono text-sm text-emerald-400 h-40 overflow-y-auto mb-8 border border-white/10 shadow-inner">{log.length === 0 ? <span className="text-neutral-600 animate-pulse">&gt; Bekleniyor...</span> : log.map((l, i) => <div key={i}>&gt; {l}</div>)}</div><button onClick={runInstall} disabled={status !== 'idle'} className="btn-primary w-full py-4 text-lg tracking-wider disabled:opacity-50">{status === 'idle' ? 'KURULUMU BAŞLAT' : 'İŞLENİYOR...'}</button></div></div>
  );
}
