import React, { useEffect } from 'react';
import { X, Bell, MessageCircle } from 'lucide-react';

export default function Toast({ notification, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 md:left-auto md:right-4 md:translate-x-0 z-[100] animate-fade-in w-[90%] md:w-80">
      <div className="glass p-4 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-start gap-3 bg-[#0a0a0a]/95 backdrop-blur-xl">
        <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-500">
          {notification.type === 'msg' ? <MessageCircle size={20}/> : <Bell size={20}/>}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-white">{notification.title}</h4>
          <p className="text-xs text-neutral-300 mt-0.5 line-clamp-2">{notification.text}</p>
        </div>
        <button onClick={onClose} className="text-neutral-500 hover:text-white"><X size={16}/></button>
      </div>
    </div>
  );
}
