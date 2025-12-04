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
