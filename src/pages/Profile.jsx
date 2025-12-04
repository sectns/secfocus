import React, { useState, useEffect, useRef } from 'react';
import { updateProfile, deleteUser } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Save, Loader2, Shield, Settings, ToggleLeft, ToggleRight, Camera, Trash2 } from 'lucide-react';
import { Avatar, fileToBase64, deleteAccountData, showAlert, logSystem } from '../lib/utils';

export default function Profile({ user }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ displayName: '', photoURL: '', bio: '', department: '', gender: '', filterEnabled: true, showBioInForum: true, allowChat: true });

  useEffect(() => {
    const d = async () => { const docSnap = await getDoc(doc(db, 'users', user.uid)); if(docSnap.exists()) setForm(prev => ({ ...prev, ...docSnap.data() })); };
    d();
  }, [user]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500000) { showAlert("Hata", "Dosya boyutu çok büyük.", "error"); return; }

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      setForm(prev => ({ ...prev, photoURL: base64 }));
    } catch (error) { showAlert("Hata", "Resim işlenemedi.", "error"); }
    setUploading(false);
  };

  const update = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        if (form.photoURL && form.photoURL.length < 2000) {
            await updateProfile(user, { displayName: form.displayName, photoURL: form.photoURL });
        } else {
            await updateProfile(user, { displayName: form.displayName });
        }
        await updateDoc(doc(db, 'users', user.uid), { 
          name: form.displayName.split(' ')[0], 
          ...form
        });
        await logSystem('PROFILE_UPDATE', 'Kullanıcı profilini güncelledi', user);
        showAlert("Başarılı", "Profil güncellendi.", "success");
    } catch (e) { console.error(e); showAlert("Hata", e.message, "error"); }
    setLoading(false);
  };

  const handleDelete = async () => {
    const confirmCode = prompt("HESABINI SİLMEK İÇİN 'SIL' YAZ:\n(Dikkat: Bu işlem geri alınamaz ve tüm verilerin silinir.)");
    if(confirmCode !== 'SIL') return;
    
    setLoading(true);
    try {
        // 1. Firestore verilerini sil
        await deleteAccountData(user.uid, user);
        
        // 2. Auth hesabını sil (En son bu yapılmalı çünkü yetki gidecek)
        await deleteUser(user);
        
        // Kullanıcı otomatik çıkış yapacak
    } catch(e) { 
        console.error("Silme hatası:", e);
        if (e.code === 'auth/requires-recent-login') {
            showAlert("Güvenlik Uyarısı", "Hesap silmek için lütfen Çıkış Yapıp tekrar giriş yapın.", "error");
        } else {
            showAlert("Hata", "Hesap silinirken bir sorun oluştu.", "error"); 
        }
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in flex flex-col lg:flex-row gap-8 p-4 pb-24">
      <div className="w-full lg:w-1/3 glass p-6 rounded-3xl flex flex-col items-center text-center h-fit border border-white/10 relative overflow-hidden">
        <div className="relative group mb-4 cursor-pointer" onClick={() => fileInputRef.current.click()}>
            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-emerald-500 to-black shadow-2xl">
                <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center border-4 border-black relative">
                    <Avatar src={form.photoURL} alt={form.displayName} gender={form.gender} className="w-full h-full object-cover opacity-90 group-hover:opacity-50 transition-opacity"/>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {uploading ? <Loader2 className="animate-spin text-emerald-500"/> : <Camera size={32} className="text-white drop-shadow-lg" />}
                    </div>
                </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        </div>
        <h2 className="text-xl font-bold text-white">{form.displayName}</h2>
        <p className="text-emerald-500 font-mono text-xs mt-1 bg-emerald-500/10 px-2 py-0.5 rounded-full">{form.department || 'Öğrenci'}</p>
      </div>

      <div className="flex-1 glass p-6 rounded-3xl border border-white/10">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Settings size={20} className="text-emerald-500"/> Hesap Ayarları</h3>
        <form onSubmit={update} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1"><label className="text-xs text-neutral-500 ml-1">Ad Soyad</label><input value={form.displayName} onChange={e=>setForm({...form, displayName: e.target.value})} className="input-field" /></div>
             <div className="space-y-1"><label className="text-xs text-neutral-500 ml-1">Bölüm</label><input value={form.department} onChange={e=>setForm({...form, department: e.target.value})} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1"><label className="text-xs text-neutral-500 ml-1">Cinsiyet</label><select value={form.gender} onChange={e=>setForm({...form, gender: e.target.value})} className="input-field appearance-none"><option value="">Belirtilmemiş</option><option value="male">Erkek</option><option value="female">Kadın</option></select></div>
             <div className="space-y-1"><label className="text-xs text-neutral-500 ml-1">Biyografi</label><input value={form.bio} onChange={e=>setForm({...form, bio: e.target.value})} className="input-field" /></div>
          </div>
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                <div><p className="text-sm font-bold text-white">Güvenli Mod</p><p className="text-[10px] text-neutral-500">Küfürleri filtrele</p></div>
                <button type="button" onClick={()=>setForm({...form, filterEnabled: !form.filterEnabled})} className={`transition-colors ${form.filterEnabled ? 'text-emerald-500' : 'text-neutral-600'}`}>{form.filterEnabled ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}</button>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                <div><p className="text-sm font-bold text-white">Özel Mesajlar</p><p className="text-[10px] text-neutral-500">DM açık/kapalı</p></div>
                <button type="button" onClick={()=>setForm({...form, allowChat: !form.allowChat})} className={`transition-colors ${form.allowChat ? 'text-emerald-500' : 'text-neutral-600'}`}>{form.allowChat ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}</button>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button disabled={loading} className="btn-primary flex-1">{loading ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Kaydet</>}</button>
            <button type="button" onClick={handleDelete} className="px-4 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 size={20} /></button>
          </div>
        </form>
      </div>
    </div>
  );
}
