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
