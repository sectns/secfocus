import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import Toast from './Toast';
import CustomAlert from './CustomAlert';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Layout({ children, activeTab, setActiveTab, user, isAdmin, onOpenChat }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [toast, setToast] = useState(null);

  const toggleDesktopSidebar = () => {
    const newState = !desktopCollapsed;
    setDesktopCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState);
  };

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('toUid', '==', user.uid), where('read', '==', false));
    let isFirstLoad = true;
    const unsub = onSnapshot(q, (snapshot) => {
        if (isFirstLoad) { isFirstLoad = false; return; }
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const notif = change.doc.data();
                if(notif.senderUid !== user.uid) {
                    setToast({ ...notif, id: change.doc.id });
                    new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(()=>{});
                }
            }
        });
    });
    return () => unsub();
  }, [user]);

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      <CustomAlert />
      <Toast notification={toast} onClose={() => setToast(null)} />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} isAdmin={isAdmin} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} collapsed={desktopCollapsed} toggleCollapse={toggleDesktopSidebar} />
      <div className={`flex-1 flex flex-col h-screen relative transition-all duration-300 w-full ${desktopCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Header user={user} activeTab={activeTab} setActiveTab={setActiveTab} toggleSidebar={() => setMobileOpen(!mobileOpen)} onOpenChat={onOpenChat} />
        <main className="flex-1 overflow-y-auto relative bg-mesh scroll-smooth">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
          <div className="relative z-10 p-4 md:p-8 min-h-full flex flex-col max-w-[1920px] mx-auto w-full">{children}</div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
