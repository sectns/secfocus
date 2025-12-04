import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { ShieldCheck, User, Mail, Lock, ChevronRight, Loader2, GraduationCap, Globe, AtSign, KeyRound } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', surname: '', bio: '', department: '' });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [quote, setQuote] = useState({t:'', a:''});

  const quotes = [
    { t: "Kod yazmak, geleceği inşa etmektir.", a: "Anonim" },
    { t: "Başarı, hazırlık ve fırsatın buluştuğu yerdir.", a: "Bobby Unser" }
  ];

  useEffect(() => { setQuote(quotes[Math.floor(Math.random() * quotes.length)]); }, []);

  const handleChange = (e) => setForm({...form, [e.target.name]: e.target.value});

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(''); setMsg(''); setLoading(true);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
        if(!userCredential.user.emailVerified) setMsg("Lütfen e-postanızı onaylayın.");
      } else {
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await updateProfile(cred.user, { displayName: `${form.name} ${form.surname}` });
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid, name: form.name, surname: form.surname, email: form.email,
          bio: form.bio, department: form.department, role: 'user', gender: 'unspecified', isOnline: true,
          blocked: [], following: [], followers: [], allowChat: true, filterEnabled: true, createdAt: new Date(), photoURL: ''
        });
        await sendEmailVerification(cred.user);
        setMsg("Kayıt başarılı! E-postanızı onaylayın.");
        setIsLogin(true);
      }
    } catch (err) { setError(err.message.replace('Firebase:', '')); } 
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#02040a] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#10b98115_0%,_transparent_50%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
      
      <div className="glass p-8 md:p-12 rounded-[3rem] w-full max-w-md relative z-10 shadow-2xl animate-fade-in border border-white/5">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 mb-4 shadow-[0_0_30px_rgba(16,185,129,0.1)] animate-float">
            <ShieldCheck className="w-12 h-12 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">SecFocus</h2>
          <p className="text-neutral-400 text-sm font-medium">Kampüs Yönetim Sistemi</p>
        </div>

        <div className="mb-8 bg-black/30 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
            <p className="text-xs text-emerald-400/80 italic text-center leading-relaxed">"{quote.t}"</p>
        </div>

        {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-sm mb-4 border border-red-500/20 flex items-center gap-2"><span>⚠️</span> {error}</div>}
        {msg && <div className="bg-blue-500/10 text-blue-400 p-3 rounded-xl text-sm mb-4 border border-blue-500/20 flex items-center gap-2"><span>📧</span> {msg}</div>}
        
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group"><div className="input-icon"><User size={18} /></div><input name="name" onChange={handleChange} className="input-field" placeholder="Ad" required /></div>
                <div className="input-group"><div className="input-icon"><User size={18} /></div><input name="surname" onChange={handleChange} className="input-field" placeholder="Soyad" required /></div>
              </div>
              <div className="input-group"><div className="input-icon"><GraduationCap size={18} /></div><input name="department" onChange={handleChange} className="input-field" placeholder="Bölüm" required /></div>
              <div className="input-group"><div className="input-icon"><Globe size={18} /></div><input name="bio" onChange={handleChange} className="input-field" placeholder="Biyografi (İsteğe bağlı)" /></div>
            </div>
          )}
          <div className="input-group"><div className="input-icon"><AtSign size={18} /></div><input type="email" name="email" onChange={handleChange} className="input-field" placeholder="E-posta Adresi" required /></div>
          <div className="input-group"><div className="input-icon"><KeyRound size={18} /></div><input type="password" name="password" onChange={handleChange} className="input-field" placeholder="Şifre" required /></div>
          
          <button type="submit" disabled={loading} className="btn-primary w-full mt-6 py-4 text-base">
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Giriş Yap' : 'Hesap Oluştur')}
            {!loading && <ChevronRight size={18} />}
          </button>
        </form>
        <div className="mt-8 text-center pt-6 border-t border-white/5">
            <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-neutral-400 hover:text-emerald-400 transition-colors underline underline-offset-4 font-medium">
                {isLogin ? 'Hesabın yok mu? Kayıt Ol' : 'Zaten hesabın var mı? Giriş Yap'}
            </button>
        </div>
      </div>
    </div>
  );
}
