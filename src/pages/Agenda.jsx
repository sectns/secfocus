import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, X, BookOpen, GraduationCap, Clock, Tag } from 'lucide-react';

export default function Agenda({ user }) {
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm] = useState({ title: '', time: '09:00', type: 'lecture' });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'events'), where('userId', '==', user.uid));
    return onSnapshot(q, (s) => setEvents(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  const addEvent = async (e) => {
    e.preventDefault();
    if(!form.title || !selectedDay) return;
    await addDoc(collection(db, 'events'), { ...form, date: `${date.getFullYear()}-${date.getMonth()}-${selectedDay}`, userId: user.uid });
    setForm({ title: '', time: '09:00', type: 'lecture' });
  };

  const getTypeColor = (type) => {
    if(type === 'exam') return 'border-red-500 bg-red-500/10 text-red-200';
    if(type === 'assignment') return 'border-yellow-500 bg-yellow-500/10 text-yellow-200';
    return 'border-emerald-500 bg-emerald-500/10 text-emerald-200';
  };

  // Date Picker Handler
  const handleDateChange = (e) => {
      setDate(new Date(e.target.value));
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col animate-fade-in p-1">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 bg-white/5 p-4 rounded-2xl border border-white/5 gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-3 text-white"><CalendarIcon className="text-emerald-500" /> Ajanda</h2>
        
        <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-xl border border-white/10 w-full md:w-auto justify-between relative group">
          <button onClick={() => setDate(new Date(date.getFullYear(), date.getMonth()-1))} className="p-2 hover:bg-white/10 rounded-lg text-white"><ChevronLeft size={20}/></button>
          
          {/* Tarih Göstergesi ve Gizli Picker */}
          <div className="relative">
              <span className="px-4 font-mono font-bold text-white text-sm cursor-pointer hover:text-emerald-400 transition-colors">
                {date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
              </span>
              <input 
                  type="date" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleDateChange} 
              />
          </div>

          <button onClick={() => setDate(new Date(date.getFullYear(), date.getMonth()+1))} className="p-2 hover:bg-white/10 rounded-lg text-white"><ChevronRight size={20}/></button>
        </div>
      </div>
      
      {/* Takvim Grid */}
      <div className="grid grid-cols-7 gap-1 flex-1 overflow-y-auto bg-white/5 p-1 rounded-2xl border border-white/5">
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => <div key={d} className="bg-[#080808]/50 p-3 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider">{d}</div>)}
        {Array.from({ length: offset }).map((_, i) => <div key={`e-${i}`} className="bg-transparent" />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayEvents = events.filter(e => e.date === `${date.getFullYear()}-${date.getMonth()}-${day}`);
          const isToday = new Date().toDateString() === new Date(date.getFullYear(), date.getMonth(), day).toDateString();
          return (
            <div key={day} onClick={() => setSelectedDay(day)} className={`bg-[#0a0a0a] hover:bg-[#151515] p-1 md:p-2 cursor-pointer relative group transition-colors flex flex-col gap-1 rounded-lg min-h-[60px] ${isToday ? 'ring-1 ring-emerald-500 bg-emerald-900/10' : ''}`}>
              <span className={`text-sm font-bold ml-1 ${isToday ? 'text-emerald-500' : 'text-neutral-500 group-hover:text-white'}`}>{day}</span>
              <div className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map(e => <div key={e.id} className={`text-[9px] px-2 py-1 rounded-md truncate font-medium border-l-2 ${getTypeColor(e.type)}`}>{e.time} {e.title}</div>)}
                {dayEvents.length > 3 && <div className="text-[9px] text-neutral-600 text-center font-bold">+{dayEvents.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Etkinlik Ekleme/Görüntüleme */}
      {selectedDay && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-md p-0 md:p-4 animate-fade-in">
          <div className="glass w-full md:w-[500px] h-[85vh] md:h-auto md:rounded-3xl rounded-t-3xl shadow-2xl bg-[#0a0a0a] border-t border-white/20 md:border border-white/10 flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
                <h3 className="font-bold text-white text-xl flex items-center gap-2"><div className="w-2 h-6 bg-emerald-500 rounded-full"></div>{selectedDay} {date.toLocaleDateString('tr-TR', { month: 'long' })}</h3>
                <button onClick={() => setSelectedDay(null)} className="p-2 bg-white/5 rounded-full text-neutral-400 hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {events.filter(e => e.date === `${date.getFullYear()}-${date.getMonth()}-${selectedDay}`).map(e => (
                <div key={e.id} className="flex justify-between bg-white/5 p-4 rounded-2xl items-center group border border-white/5 hover:border-emerald-500/30 transition-colors">
                  <div className="flex gap-4 items-center">
                    <div className="flex flex-col items-center bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 min-w-[60px]">
                        <span className="text-xs font-mono text-neutral-400">{e.time}</span>
                        <span className={`text-[9px] font-bold uppercase ${e.type==='exam'?'text-red-400':e.type==='assignment'?'text-yellow-400':'text-emerald-400'}`}>{e.type === 'lecture' ? 'Ders' : e.type === 'exam' ? 'Sınav' : e.type==='assignment' ? 'Ödev' : 'Diğer'}</span>
                    </div>
                    <p className="text-base text-white font-medium">{e.title}</p>
                  </div>
                  <button onClick={() => deleteDoc(doc(db, 'events', e.id))} className="text-neutral-600 hover:text-red-500 p-2 bg-white/5 rounded-xl opacity-100 md:opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
                </div>
              ))}
              {events.filter(e => e.date === `${date.getFullYear()}-${date.getMonth()}-${selectedDay}`).length === 0 && <div className="text-center text-neutral-600 py-10">Etkinlik yok.</div>}
            </div>

            <form onSubmit={addEvent} className="p-4 border-t border-white/10 bg-black/20 flex flex-col gap-3">
                <div className="flex gap-2">
                    <div className="relative w-1/3">
                        <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="input-field pl-10 text-center text-sm h-14" />
                        <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"/>
                    </div>
                    <div className="relative flex-1 group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"><BookOpen size={16} /></div>
                        <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-field pl-10 h-14" placeholder="Başlık..." />
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="relative w-full">
                        <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="input-field appearance-none cursor-pointer h-14 pl-4">
                            <option value="lecture">Ders</option>
                            <option value="exam">Sınav</option>
                            <option value="assignment">Ödev</option>
                            <option value="other">Diğer</option>
                        </select>
                        <Tag size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"/>
                    </div>
                    <button type="submit" className="bg-emerald-600 p-3 rounded-xl text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 flex-shrink-0 w-20 flex items-center justify-center"><Plus size={28} /></button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
