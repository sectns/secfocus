import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp, doc, updateDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Send, User, Ban, Shield, Lock, Unlock, MessageCircle, Search, Plus, X, ChevronLeft, EyeOff } from 'lucide-react';
import { logSystem, sendNotification, processText, Avatar } from '../lib/utils';

export default function Chat({ user, preSelectedUid, isAdmin }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [blocked, setBlocked] = useState([]);
  const [following, setFollowing] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);

  const encode = (str) => { try { return btoa(unescape(encodeURIComponent(str))); } catch { return str; } };
  const decode = (str) => { try { return decodeURIComponent(escape(atob(str))); } catch { return str; } };

  useEffect(() => {
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (d) => {
        if(d.exists()) {
            const data = d.data();
            setCurrentUserData(data);
            setBlocked(data.blocked || []);
            setFollowing(data.following || []);
        }
    });

    const q = query(collection(db, 'users'), where('uid', '!=', user.uid));
    const unsubAll = onSnapshot(q, (s) => {
        const allUsers = s.docs.map(d => d.data());
        allUsers.sort((a, b) => (b.role === 'admin' ? 1 : 0) - (a.role === 'admin' ? 1 : 0));
        setUsers(allUsers);
        setFilteredUsers(allUsers);
        
        if (preSelectedUid) {
            const target = allUsers.find(u => u.uid === preSelectedUid);
            if(target) setSelectedUser(target);
        }
    });
    return () => { unsubUser(); unsubAll(); };
  }, [user, preSelectedUid]);

  useEffect(() => {
    setFilteredUsers(users.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [searchTerm, users]);

  useEffect(() => {
    if(!selectedUser) return;
    const chatId = [user.uid, selectedUser.uid].sort().join('_');
    const q = query(collection(db, 'messages'), where('chatId', '==', chatId));
    return onSnapshot(q, (s) => {
      const data = s.docs.map(d => d.data());
      data.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setMessages(data);
    });
  }, [selectedUser, user]);

  const iBlockedThem = blocked.includes(selectedUser?.uid);
  // FIX: Karşı tarafın beni engelleyip engellemediğini kendi verimden değil ondan anlarım ama
  // güvenlik nedeniyle client side'da tüm kullanıcıları dinlediğimiz 'users' state'inden bakabiliriz.
  // selectedUser zaten güncel.
  const theyBlockedMe = selectedUser?.blocked?.includes(user.uid);
  const isRemoteChatClosed = selectedUser?.allowChat === false;
  const amIWhitelisted = selectedUser?.chatWhitelist?.includes(user.uid); 
  const canChat = isAdmin || (!iBlockedThem && !theyBlockedMe && (!isRemoteChatClosed || amIWhitelisted));

  const sendMessage = async (e) => {
    e.preventDefault();
    if(!text.trim() || (!canChat && !isAdmin)) return;
    
    const chatId = [user.uid, selectedUser.uid].sort().join('_');
    const encrypted = encode(text);
    
    await addDoc(collection(db, 'messages'), { chatId, text: encrypted, senderId: user.uid, createdAt: serverTimestamp() });
    
    // Whitelist ekleme
    // Normalde karşı tarafın dökümanına yazamayız (kurallar). Sadece bildirim atıyoruz.
    sendNotification(selectedUser.uid, "Yeni Mesaj", `${user.displayName}: ${text.substring(0, 20)}...`, 'msg', user.uid);
    logSystem('SEND_MESSAGE', `Alıcı: ${selectedUser.email}`, user);
    setText('');
  };

  const toggleBlock = async () => {
    if(iBlockedThem) {
      await updateDoc(doc(db, 'users', user.uid), { blocked: arrayRemove(selectedUser.uid) });
    } else {
      if(confirm('Kullanıcıyı engellemek istiyor musun?')) {
        await updateDoc(doc(db, 'users', user.uid), { blocked: arrayUnion(selectedUser.uid) });
      }
    }
  };

  return (
    <div className="h-full flex gap-4 animate-fade-in max-w-6xl mx-auto p-1 relative">
      
      {showNewChat && (
        <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4" onClick={()=>setShowNewChat(false)}>
            <div className="w-full max-w-md glass p-6 rounded-2xl max-h-[80%] flex flex-col border border-white/10" onClick={e=>e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                    <h3 className="font-bold text-white text-lg">Kişi Seç</h3>
                    <button onClick={()=>setShowNewChat(false)} className="p-2 bg-white/5 rounded-full"><X size={20}/></button>
                </div>
                <input autoFocus value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="input-field mb-4" placeholder="İsim ara..." />
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {filteredUsers.map(u => (
                        <div key={u.uid} onClick={() => { setSelectedUser(u); setShowNewChat(false); }} className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-xl cursor-pointer transition-colors">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 flex-shrink-0"><Avatar src={u.photoURL} alt={u.name} gender={u.gender} className="w-full h-full object-cover"/></div>
                            <div className="flex-1"><span className="text-sm font-bold text-white flex items-center gap-2">{u.name} {u.role === 'admin' && <span className="text-[9px] bg-red-500 px-1.5 rounded text-white">YÖNETİCİ</span>}</span><p className="text-xs text-neutral-500 truncate">{u.bio}</p></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      <div className={`w-full md:w-80 glass rounded-2xl overflow-hidden flex flex-col border border-white/10 ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/10 font-bold text-white bg-[#0a0a0a] flex justify-between items-center">
            <span className="flex items-center gap-2"><MessageCircle size={18} className="text-emerald-500"/> Sohbetler</span>
            <button onClick={()=>setShowNewChat(true)} className="p-2 bg-white/10 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors"><Plus size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
           {filteredUsers.slice(0, 15).map(u => (
            <div key={u.uid} onClick={() => setSelectedUser(u)} className={`p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-all ${selectedUser?.uid === u.uid ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-white/5 border border-transparent'}`}>
              <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 relative flex-shrink-0"><Avatar src={u.photoURL} alt={u.name} gender={u.gender} className="w-full h-full object-cover"/>
                 {u.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-black rounded-full"></div>}
              </div>
              <div className="overflow-hidden flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-white text-sm font-bold truncate">{u.name}</p>
                    {u.role === 'admin' && <span className="text-[9px] bg-red-500/20 text-red-400 px-1 rounded">ADM</span>}
                  </div>
                  <p className="text-xs text-neutral-500 truncate">{u.bio || 'Müsait'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`flex-1 glass rounded-2xl overflow-hidden flex-col border border-white/10 relative ${selectedUser ? 'flex' : 'hidden md:flex'}`}>
        {selectedUser ? (
          <>
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0a0a0a] z-10">
              <div className="flex items-center gap-3 cursor-pointer">
                <button className="md:hidden p-2 hover:bg-white/10 rounded-lg text-neutral-400" onClick={()=>setSelectedUser(null)}><ChevronLeft size={24}/></button>
                <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10"><Avatar src={selectedUser.photoURL} alt={selectedUser.name} gender={selectedUser.gender} className="w-full h-full object-cover"/></div>
                <div>
                    <span className="font-bold text-white text-base block">{selectedUser.name} {selectedUser.surname}</span>
                    <div className="flex items-center gap-2">
                        {iBlockedThem && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 rounded border border-red-500/20">ENGELLENDİ</span>}
                        {selectedUser.isOnline && !iBlockedThem && <span className="text-[10px] text-emerald-500 font-medium">Çevrimiçi</span>}
                    </div>
                </div>
              </div>
              <div className="flex gap-2">
                  <button onClick={toggleBlock} className={`p-2.5 rounded-xl transition-colors ${iBlockedThem ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-neutral-400 hover:text-red-500 hover:bg-red-500/10'}`}>
                    {iBlockedThem ? <Unlock size={18} /> : <Ban size={18} />}
                  </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#050505] scroll-smooth">
              {messages.length === 0 && <div className="h-full flex items-center justify-center text-neutral-600 text-sm">Sohbet başlatmak için mesaj gönder.</div>}
              {messages.map((m, i) => {
                const isMe = m.senderId === user.uid;
                return <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}><div className={isMe ? 'chat-me' : 'chat-other'}>{processText(decode(m.text), currentUserData?.filterEnabled)}</div></div>
              })}
            </div>

            {(canChat || isAdmin) ? (
              <form onSubmit={sendMessage} className="p-3 md:p-4 bg-[#0a0a0a] border-t border-white/10 flex gap-2">
                <input value={text} onChange={e=>setText(e.target.value)} className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 text-white outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 text-sm" placeholder="Mesajınızı yazın..." />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl transition-colors shadow-lg"><Send size={20} /></button>
              </form>
            ) : (
                <div className="p-4 text-center text-red-400 bg-red-500/5 border-t border-red-500/10 flex items-center justify-center gap-2">
                    <EyeOff size={16} /> 
                    {iBlockedThem ? "Bu kullanıcıyı engellediniz." : theyBlockedMe ? "Bu kullanıcı sizi engelledi." : "Bu kullanıcı mesaj isteklerini kapatmış."}
                </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-600 flex-col gap-4 bg-[#050505] p-8 text-center">
            <div className="p-6 bg-white/5 rounded-full"><Shield size={48} className="opacity-20"/></div>
            <div><h3 className="text-lg font-bold text-white mb-1">Güvenli Sohbet</h3><p className="text-sm">Mesajlaşmaya başlamak için soldan bir kişi seçin.</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
