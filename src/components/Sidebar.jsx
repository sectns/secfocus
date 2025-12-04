import React from 'react';
import { LayoutDashboard, Calendar, CheckSquare, Clock, FileCode, Users, MessageCircle, ShieldAlert, LogOut, Terminal, Settings, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Sidebar({ activeTab, setActiveTab, mobileOpen, setMobileOpen, isAdmin, collapsed, toggleCollapse }) {
  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Panel' },
    { id: 'agenda', icon: <Calendar size={20} />, label: 'Ajanda' },
    { id: 'todo', icon: <CheckSquare size={20} />, label: 'Görevler' },
    { id: 'pomodoro', icon: <Clock size={20} />, label: 'Odaklan' },
    { id: 'notes', icon: <FileCode size={20} />, label: 'Notlar' },
    { id: 'forum', icon: <Users size={20} />, label: 'Forum' },
    { id: 'chat', icon: <MessageCircle size={20} />, label: 'Sohbet' },
  ];

  return (
    <>
      <div className={`fixed inset-0 bg-black/90 z-50 lg:hidden transition-opacity duration-300 backdrop-blur-sm ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMobileOpen(false)}></div>
      <aside className={`fixed top-0 left-0 h-full bg-[#050505] border-r border-white/10 flex flex-col z-[60] transition-all duration-300 ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'} ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        <div className="h-20 flex items-center justify-between px-0 lg:px-0 border-b border-white/5 bg-[#050505] relative">
          <div className={`flex items-center w-full ${collapsed ? 'justify-center' : 'px-6 gap-3'}`}>
            <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-500"><Terminal size={24} /></div>
            {!collapsed && <div><h1 className="font-bold text-white tracking-wide text-lg">SECFOCUS</h1></div>}
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden absolute right-4 text-neutral-400"><X size={24}/></button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileOpen(false); }} className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3.5 rounded-xl transition-all group relative text-sm font-medium ${activeTab === item.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`} title={collapsed ? item.label : ''}>
              {item.icon} {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
          <button onClick={() => { setActiveTab('profile'); setMobileOpen(false); }} className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all text-sm font-medium mt-6 ${activeTab === 'profile' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5'}`}><Settings size={20} /> {!collapsed && 'Ayarlar'}</button>
          {isAdmin && <button onClick={() => { setActiveTab('admin'); setMobileOpen(false); }} className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl text-red-400 hover:bg-red-500/10 mt-2 transition-all text-sm font-bold`}><ShieldAlert size={20} /> {!collapsed && 'Yönetici'}</button>}
        </nav>
        <div className="p-4 border-t border-white/5 bg-[#080808] flex flex-col gap-2">
          <button onClick={toggleCollapse} className="hidden lg:flex w-full items-center justify-center p-2 text-neutral-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">{collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={16} />}</button>
          <button onClick={() => signOut(auth)} className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'justify-center gap-2 px-4'} py-3 text-neutral-400 hover:bg-white/5 hover:text-white rounded-xl transition-colors text-xs font-bold border border-white/5 uppercase tracking-wide`}><LogOut size={18} /> {!collapsed && 'Çıkış'}</button>
        </div>
      </aside>
    </>
  );
}
