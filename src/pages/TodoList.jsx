import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { CheckSquare, Plus, Check, Trash2, Flag, ListTodo, Search } from 'lucide-react';

export default function TodoList({ user }) {
  const [todos, setTodos] = useState([]);
  const [filteredTodos, setFilteredTodos] = useState([]);
  const [search, setSearch] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const [priority, setPriority] = useState('medium'); 

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'todos'), where('userId', '==', user.uid));
    return onSnapshot(q, (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setTodos(data);
      setFilteredTodos(data);
    });
  }, [user]);

  useEffect(() => {
      setFilteredTodos(todos.filter(t => t.text.toLowerCase().includes(search.toLowerCase())));
  }, [search, todos]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    await addDoc(collection(db, 'todos'), { 
        text: newTodo, priority, completed: false, userId: user.uid, createdAt: serverTimestamp() 
    });
    setNewTodo('');
  };

  const getPriorityColor = (p) => {
      if (p === 'high') return 'text-red-500 fill-red-500/20';
      if (p === 'low') return 'text-emerald-500 fill-emerald-500/20';
      return 'text-yellow-500 fill-yellow-500/20';
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in p-2 pb-24">
      <div className="mb-8 bg-gradient-to-r from-emerald-900/10 to-transparent p-6 rounded-3xl border border-emerald-500/10 flex justify-between items-end">
        <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3"><CheckSquare className="text-emerald-500" size={32} /> Görev Yöneticisi</h2>
            <p className="text-neutral-400 text-sm mt-2 ml-1">Hedeflerini belirle, önceliklendir ve tamamla.</p>
        </div>
        <div className="relative w-64 hidden md:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 py-2 text-sm text-white focus:border-emerald-500 outline-none" placeholder="Görev ara..." />
        </div>
      </div>
      
      <form onSubmit={handleAdd} className="relative mb-10 flex gap-3 items-stretch flex-col sm:flex-row">
        <div className="relative flex-1 input-group">
            <div className="input-icon"><ListTodo size={20}/></div>
            <input value={newTodo} onChange={e => setNewTodo(e.target.value)} placeholder="Yeni bir görev ekle..." className="input-field pl-12 py-4 text-lg shadow-xl" />
        </div>
        <div className="relative w-full sm:w-40">
             <label className="absolute -top-6 left-1 text-xs text-neutral-500 font-bold uppercase tracking-wider">Önem Derecesi</label>
             <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full h-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-4 text-white text-sm focus:border-emerald-500 outline-none appearance-none cursor-pointer hover:border-white/20 transition-colors">
                <option value="low">🟢 Düşük</option>
                <option value="medium">🟡 Orta</option>
                <option value="high">🔴 Yüksek</option>
            </select>
        </div>
        <button type="submit" className="h-14 sm:h-auto sm:w-20 bg-emerald-600 rounded-2xl flex items-center justify-center text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 flex-shrink-0 active:scale-95"><Plus size={28} /></button>
      </form>

      <div className="space-y-3">
        {filteredTodos.map(t => (
          <div key={t.id} className={`flex items-center gap-4 p-5 rounded-2xl border border-white/5 transition-all duration-300 group ${t.completed ? 'bg-white/[0.02] opacity-50' : 'glass hover:border-emerald-500/30 hover:bg-white/5'}`}>
            <button onClick={() => updateDoc(doc(db, 'todos', t.id), { completed: !t.completed })} className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-colors flex-shrink-0 ${t.completed ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-neutral-600 hover:border-emerald-500 text-transparent'}`}><Check size={18} strokeWidth={4} /></button>
            <div className="flex-1 min-w-0"><p className={`text-lg font-medium truncate ${t.completed ? 'line-through text-neutral-600' : 'text-white'}`}>{t.text}</p></div>
            <div className="flex items-center gap-3">
                <Flag size={18} className={getPriorityColor(t.priority)} fill="currentColor" fillOpacity={0.2} />
                <button onClick={() => deleteDoc(doc(db, 'todos', t.id))} className="p-2 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
            </div>
          </div>
        ))}
        {filteredTodos.length === 0 && <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl text-neutral-600">Görev bulunamadı.</div>}
      </div>
    </div>
  );
}
