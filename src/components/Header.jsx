import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, User, LogOut, Settings, ChevronDown, Bell, Info, MessageCircle, Check, Trash2 } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { timeAgo, Avatar } from '../lib/utils';

export default function Header({ user, toggleSidebar, setActiveTab, onOpenChat }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // Canlı Kullanıcı Verisi (Fotoğraf anlık değişsin diye)
  useEffect(() => {
    if(!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (d) => {
        if(d.exists()) setCurrentUserData(d.data());
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('toUid', '==', user.uid));
    const unsub = onSnapshot(q, (s) => {
      const data = s.docs.map(d => ({id:d.id, ...d.data()}));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotifications(data);
    });
    return () => unsub();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClick = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
        if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleNav = (tab) => { setActiveTab(tab); setDropdownOpen(false); };
  
  const handleNotificationClick = async (n) => {
    await updateDoc(doc(db, 'notifications', n.id), { read: true });
    setNotifOpen(false);
    if (n.type === 'msg' && n.senderUid) {
        onOpenChat(n.senderUid); 
    } else if (n.type === 'social') {
        setActiveTab('forum');
    }
  };

  const deleteNotification = async (e, id) => {
    e.stopPropagation();
    await deleteDoc(doc(db, 'notifications', id));
  };

  const markAllRead = () => notifications.forEach(n => { if(!n.read) updateDoc(doc(db, 'notifications', n.id), { read: true }) });

  // Profil fotosunu önce DB'den, yoksa Auth'dan al
  const photoURL = currentUserData?.photoURL || user?.photoURL;
  const displayName = currentUserData?.name ? `${currentUserData.name} ${currentUserData.surname}` : user?.displayName;

  return (
    <header className="h-20 border-b border-white/5 bg-[#030303]/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="md:hidden p-2 text-neutral-400 hover:text-white bg-white/5 rounded-xl"><Menu size={20} /></button>
        <div className="hidden md:flex items-center gap-2 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div><span className="text-xs font-bold text-emerald-500 tracking-widest">SİSTEM AKTİF</span></div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={notifRef}>
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <Bell size={20} />
            {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]"></span>}
            </button>
            
            {notifOpen && (
                <div className="absolute right-0 top-full mt-3 w-80 glass-strong rounded-2xl shadow-2xl border border-white/10 z-50 animate-fade-in overflow-hidden bg-[#0a0a0a]">
                    <div className="p-3 border-b border-white/5 bg-white/[0.02] flex justify-between items-center"><h3 className="font-bold text-white text-sm">Bildirimler</h3><button onClick={markAllRead} className="text-[10px] text-emerald-500 hover:underline flex items-center gap-1"><Check size={12}/> Tümünü Oku</button></div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 && <div className="p-8 text-center text-xs text-neutral-500">Henüz bildiriminiz yok.</div>}
                        {notifications.map(n => (
                            <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer flex gap-3 relative group ${!n.read ? 'bg-emerald-500/5' : ''}`}>
                                <div className="mt-1">{n.type === 'msg' ? <MessageCircle size={16} className="text-blue-400"/> : <Info size={16} className="text-emerald-500" />}</div>
                                <div className="flex-1 pr-6">
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-bold text-white">{n.title}</p>
                                        <span className="text-[9px] text-neutral-600 whitespace-nowrap ml-2">{timeAgo(n.createdAt)}</span>
                                    </div>
                                    <p className="text-xs text-neutral-400 line-clamp-2">{n.text}</p>
                                </div>
                                <button onClick={(e) => deleteNotification(e, n.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-3 hover:bg-white/5 p-1.5 pr-3 rounded-xl transition-all border border-transparent hover:border-white/10">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-600 to-black p-[1px]">
                <div className="w-full h-full bg-black rounded-[7px] flex items-center justify-center overflow-hidden">
                    <Avatar src={photoURL} alt={displayName} gender={currentUserData?.gender} className="w-full h-full object-cover"/>
                </div>
            </div>
            <div className="text-right hidden sm:block"><p className="text-sm font-bold text-white">{displayName || 'Öğrenci'}</p></div>
            <ChevronDown size={14} className={`text-neutral-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-60 glass-strong rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in border border-white/10 bg-[#0a0a0a]">
              <div className="px-3 py-2 border-b border-white/5 mb-1"><p className="text-xs text-neutral-500 mb-1">Oturum:</p><p className="text-xs text-white truncate font-mono bg-white/5 p-1.5 rounded">{user?.email}</p></div>
              <button onClick={() => handleNav('profile')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium"><User size={16} className="text-emerald-500"/> Profilim</button>
              <button onClick={() => handleNav('install')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium"><Settings size={16} className="text-blue-500"/> Ayarlar</button>
              <div className="h-px bg-white/5 my-1"></div>
              <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-medium"><LogOut size={16} /> Çıkış Yap</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
