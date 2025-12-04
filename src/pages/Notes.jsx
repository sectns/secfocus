import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { FileCode, Plus, X, Trash2, Save, Search } from 'lucide-react';
import { logSystem } from '../lib/utils';

export default function Notes({ user }) {
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [activeNote, setActiveNote] = useState({ title: '', content: '' });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notes'), where('userId', '==', user.uid));
    return onSnapshot(q, (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotes(data);
      setFilteredNotes(data);
    });
  }, [user]);

  useEffect(() => {
      setFilteredNotes(notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())));
  }, [search, notes]);

  const save = async () => {
    if(!activeNote.title.trim()) return;
    const data = { ...activeNote, userId: user.uid, createdAt: serverTimestamp() };
    if(activeNote.id) await updateDoc(doc(db, 'notes', activeNote.id), data);
    else await addDoc(collection(db, 'notes'), data);
    logSystem('NOTE_SAVE', `Not kaydedildi: ${activeNote.title}`, user);
    setIsEditing(false); setActiveNote({ title: '', content: '' });
  };

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto p-2 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 pb-6 border-b border-white/5 gap-4">
        <div>
            <h2 className="text-3xl font-bold text-white flex gap-3 items-center"><span className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400"><FileCode size={24}/></span> Kod Snippet</h2>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 py-2.5 text-sm text-white focus:border-purple-500 outline-none" placeholder="Notlarda ara..." />
            </div>
            <button onClick={() => { setActiveNote({ title: '', content: '' }); setIsEditing(true); }} className="btn-primary py-2.5 px-4 text-sm flex-shrink-0"><Plus size={20} /> Yeni</button>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="bg-[#0a0a0a] w-full max-w-4xl h-[85vh] rounded-3xl flex flex-col shadow-2xl border border-white/10 relative overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-[#050505]">
              <input value={activeNote.title} onChange={e=>setActiveNote({...activeNote, title:e.target.value})} placeholder="Not Başlığı..." className="bg-transparent text-white font-bold text-2xl w-full focus:outline-none placeholder:text-neutral-700" autoFocus />
              <div className="flex gap-2">
                <button onClick={save} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2"><Save size={16} /> Kaydet</button>
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/10 rounded-xl text-neutral-400 hover:text-white"><X size={20} /></button>
              </div>
            </div>
            <div className="flex-1 relative bg-[#080808]">
                <div className="absolute left-0 top-0 bottom-0 w-12 border-r border-white/5 text-right pr-3 pt-6 text-neutral-800 font-mono text-sm select-none">1<br/>2<br/>3<br/>4<br/>5</div>
                <textarea value={activeNote.content} onChange={e=>setActiveNote({...activeNote, content:e.target.value})} className="absolute inset-0 w-full h-full bg-transparent p-6 pl-16 text-emerald-100 font-mono text-sm resize-none focus:outline-none leading-relaxed" placeholder="// Kod buraya..." spellCheck={false} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
        {filteredNotes.map(n => (
          <div key={n.id} onClick={() => { setActiveNote(n); setIsEditing(true); }} className="group glass p-0 rounded-2xl cursor-pointer hover:border-purple-500/40 hover:bg-white/[0.02] transition-all h-64 flex flex-col relative overflow-hidden">
            <div className="p-5 border-b border-white/5 bg-white/[0.01] flex justify-between items-start">
                <h3 className="font-bold text-white text-lg truncate pr-2 group-hover:text-purple-400 transition-colors">{n.title}</h3>
                <button onClick={(e) => { e.stopPropagation(); if(confirm('Sil?')) deleteDoc(doc(db, 'notes', n.id)); }} className="text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
            </div>
            <div className="p-5 flex-1 overflow-hidden bg-black/20">
              <pre className="text-xs text-neutral-400 font-mono opacity-80 whitespace-pre-wrap line-clamp-6">{n.content}</pre>
            </div>
          </div>
        ))}
        {filteredNotes.length === 0 && <div className="text-center text-neutral-500 col-span-full py-10 border-2 border-dashed border-white/10 rounded-2xl">Not bulunamadı.</div>}
      </div>
    </div>
  );
}
