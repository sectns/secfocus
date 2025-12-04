import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Calendar, CheckSquare, Clock, Users, ArrowUpRight, Activity, TrendingUp, BookOpen, MessageSquare } from 'lucide-react';

export default function Dashboard({ user, setActiveTab }) {
  const [quote, setQuote] = useState({ t: "...", a: "..." });
  const [stats, setStats] = useState({ todos: 0, notes: 0, forum: 0, events: 0 });

  const quotes = [
    { t: "Kod yazmak, geleceği inşa etmektir.", a: "Anonim" },
    { t: "Basitlik, karmaşıklığın en üst noktasıdır.", a: "Da Vinci" },
    { t: "Önce problemi çöz, sonra kodu yaz.", a: "John Johnson" }
  ];

  useEffect(() => {
    setQuote(quotes[new Date().getDate() % quotes.length]);
    const fetchStats = async () => {
      if(!user) return;
      try {
          const notesSnap = await getDocs(query(collection(db, 'notes'), where('userId', '==', user.uid)));
          const todoSnap = await getDocs(query(collection(db, 'todos'), where('userId', '==', user.uid), where('completed', '==', false)));
          // Forum için genel sayı (kendi yazdıkları değil, genel aktivite)
          const forumSnap = await getDocs(collection(db, 'forum_threads'));
          // Ajanda (Bugünkü etkinlikler)
          const todayStr = new Date().toISOString().split('T')[0]; // Basit tarih
          // const eventsSnap = await getDocs(query(collection(db, 'events'), where('userId', '==', user.uid))); // Filtreleme client'ta yapılabilir

          setStats({ 
              notes: notesSnap.size, 
              todos: todoSnap.size, 
              forum: forumSnap.size,
              events: 0 // Şimdilik 0
          });
      } catch(e) { console.log(e); }
    };
    fetchStats();
  }, [user]);

  const statCards = [
    { label: 'Yapılacaklar', val: stats.todos, icon: <CheckSquare size={24} className="text-emerald-400"/>, bg: 'bg-emerald-500/5 border-emerald-500/20' },
    { label: 'Notlarım', val: stats.notes, icon: <BookOpen size={24} className="text-blue-400"/>, bg: 'bg-blue-500/5 border-blue-500/20' },
    { label: 'Forum', val: stats.forum, icon: <MessageSquare size={24} className="text-purple-400"/>, bg: 'bg-purple-500/5 border-purple-500/20' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/5">
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">Hoşgeldin, {user?.displayName?.split(' ')[0]} 👋</h1>
            <p className="text-neutral-400">Kampüs asistanın hazır.</p>
        </div>
      </div>

      {/* Hero Section */}
      <div className="glass p-8 md:p-10 rounded-3xl relative overflow-hidden border border-emerald-500/10 group">
        <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-4">
                <Activity size={14} className="animate-pulse"/> GÜNÜN MOTİVASYONU
            </div>
            <p className="text-2xl md:text-3xl font-light italic text-white leading-relaxed font-serif">"{quote.t}"</p>
            <p className="text-sm text-emerald-500 font-bold mt-6 uppercase tracking-widest">— {quote.a}</p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity duration-700 transform translate-y-1/4 translate-x-1/4 pointer-events-none">
          <TrendingUp size={400} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => setActiveTab('agenda')} className="glass p-6 rounded-2xl hover:bg-white/5 transition-all text-left group border border-white/5 hover:border-emerald-500/50 flex flex-col justify-between h-40">
          <div className="bg-white/5 w-12 h-12 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors text-neutral-400"><Calendar size={24} /></div>
          <div><h3 className="font-bold text-white text-lg">Ajanda</h3><p className="text-xs text-neutral-500 mt-1 flex items-center gap-1 group-hover:text-emerald-400">Takvimi Görüntüle <ArrowUpRight size={12} /></p></div>
        </button>
        
        {statCards.map((s, i) => (
          <div key={i} className={`p-6 rounded-2xl border ${s.bg} flex flex-col justify-between h-40 backdrop-blur-sm`}>
            <div className="flex justify-between items-start">
                <div className="p-2.5 bg-black/40 rounded-xl">{s.icon}</div>
                <span className="text-4xl font-bold text-white tracking-tight">{s.val}</span>
            </div>
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
