import { db } from './firebase';
import { addDoc, collection, serverTimestamp, query, where, getDocs, deleteDoc, doc, updateDoc, arrayRemove, writeBatch, getDoc } from 'firebase/firestore';
import React from 'react';

const BAD_WORDS = ['kötü', 'kelime', 'küfür', 'aptal', 'salak', 'mal', 'gerizekalı']; 

const getIp = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (e) { return 'Gizli IP'; }
};

export const logSystem = async (action, details, user) => {
  try {
    const ip = await getIp();
    // user objesi bazen null gelebilir (silinmişse), kontrol et
    const performedBy = user ? (user.email || user.uid || 'Bilinmiyor') : 'Sistem';
    const uid = user ? (user.uid || 'sys') : 'sys';
    
    await addDoc(collection(db, 'system_logs'), {
      action, 
      details, 
      performedBy, 
      uid, 
      ip, 
      createdAt: serverTimestamp()
    });
  } catch (e) { console.error("Log error:", e); }
};

export const sendNotification = async (toUid, title, text, type = 'system', senderUid = null) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      toUid, title, text, type, senderUid, read: false, createdAt: serverTimestamp()
    });
  } catch (e) { console.error(e); }
};

export const deleteAccountData = async (targetUid, executorUser) => {
  // Silmeden önce e-postasını al (Log için)
  let identifier = targetUid;
  try {
      const uDoc = await getDoc(doc(db, 'users', targetUid));
      if(uDoc.exists()) identifier = uDoc.data().email;
  } catch(e){}

  await logSystem('HESAP SİLME', `İşlem Başladı: ${identifier}`, executorUser);
  
  const collections = ['notes', 'todos', 'events', 'pomodoro_sessions', 'messages', 'forum_threads', 'forum_replies', 'notifications'];
  for (const col of collections) {
      let field = 'userId';
      if (col === 'messages') field = 'senderId';
      if (col === 'forum_threads' || col === 'forum_replies') field = 'authorId';
      if (col === 'notifications') field = 'toUid';
      
      const q = query(collection(db, col), where(field, '==', targetUid));
      const snap = await getDocs(q);
      snap.forEach(d => deleteDoc(d.ref)); 
  }

  // Takip listelerinden temizle
  const usersRef = collection(db, 'users');
  const f1 = await getDocs(query(usersRef, where('following', 'array-contains', targetUid)));
  f1.forEach(d => updateDoc(d.ref, { following: arrayRemove(targetUid) }));
  
  const f2 = await getDocs(query(usersRef, where('followers', 'array-contains', targetUid)));
  f2.forEach(d => updateDoc(d.ref, { followers: arrayRemove(targetUid) }));

  await deleteDoc(doc(db, 'users', targetUid));
  await logSystem('HESAP SİLİNDİ', `Silinen Kullanıcı: ${identifier}`, executorUser);
};

export const processText = (text, filterEnabled) => {
  if (!text) return "";
  let processed = text;
  if (filterEnabled) {
    const regex = new RegExp(`\\b(${BAD_WORDS.join('|')})\\b`, 'gi');
    processed = processed.replace(regex, (match) => '*'.repeat(match.length));
  }
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return processed.split(urlRegex).map((part, i) => 
    part.match(urlRegex) ? <a key={i} href={part} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline break-all cursor-pointer" onClick={(e)=>e.stopPropagation()}>{part}</a> : part
  );
};

export const nameToColor = (name) => {
  const colors = ['text-red-400', 'text-blue-400', 'text-green-400', 'text-purple-400', 'text-orange-400'];
  return colors[name ? name.length % colors.length : 0];
};

export const timeAgo = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'Az önce';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  return date.toLocaleDateString('tr-TR');
};

export const Avatar = ({ src, alt, gender, className }) => {
  const [error, setError] = React.useState(false);
  const defaultMale = "https://cdn-icons-png.flaticon.com/512/4128/4128176.png";
  const defaultFemale = "https://cdn-icons-png.flaticon.com/512/4128/4128335.png";
  const defaultUser = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
  let finalSrc = src;
  if (error || !src) {
    if (gender === 'male') finalSrc = defaultMale;
    else if (gender === 'female') finalSrc = defaultFemale;
    else finalSrc = defaultUser;
  }
  return <img src={finalSrc} alt={alt} className={className} onError={() => setError(true)} />;
};

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

export const showAlert = (title, message, type = 'info') => {
  const event = new CustomEvent('custom-alert', { detail: { title, message, type } });
  window.dispatchEvent(event);
};
