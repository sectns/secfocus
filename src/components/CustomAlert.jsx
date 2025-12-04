import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export default function CustomAlert() {
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const handleAlert = (e) => {
      setAlert(e.detail);
      setTimeout(() => setAlert(null), 4000);
    };
    window.addEventListener('custom-alert', handleAlert);
    return () => window.removeEventListener('custom-alert', handleAlert);
  }, []);

  if (!alert) return null;

  const colors = {
    error: 'bg-red-500/10 border-red-500/20 text-red-500',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-500'
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-fade-in w-[90%] max-w-md">
      <div className={`glass p-4 rounded-2xl shadow-2xl border flex items-start gap-3 ${colors[alert.type] || colors.info}`}>
        <div className="mt-0.5">
          {alert.type === 'error' ? <AlertCircle size={20}/> : alert.type === 'success' ? <CheckCircle size={20}/> : <Info size={20}/>}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm text-white">{alert.title}</h4>
          <p className="text-xs text-neutral-300 mt-1">{alert.message}</p>
        </div>
        <button onClick={() => setAlert(null)} className="text-neutral-400 hover:text-white"><X size={16}/></button>
      </div>
    </div>
  );
}
