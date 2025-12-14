<h1 align="center">Secfocus</h1>

<p align="center">
  <strong>Gelişmiş Pomodoro, Öğrenci Forumu ve Yönetim Paneli - "The Masterpiece"</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Lucide_Icons-F7DF1E?style=for-the-badge&logo=lucide&logoColor=black" alt="Lucide">
</p>

<br>

**Secfocus**, öğrenciler için geliştirilmiş kapsamlı bir üretkenlik ve sosyal etkileşim platformudur. Sadece bir zamanlayıcı değil; kullanıcıların sosyalleşebileceği, birbirini takip edebileceği ve yöneticilerin sistemi detaylı loglarla izleyebileceği tam teşekküllü bir **SaaS (Software as a Service)** prototipidir.

---

## 🔥 Öne Çıkan Özellikler (v28.0)

### 🍅 Gelişmiş Pomodoro Sistemi
* **Özelleştirilebilir Zamanlayıcı:** Odaklanma, Kısa Mola ve Uzun Mola sürelerini ayarlayın.
* **Akıllı Ayarlar:** Ayarlar `LocalStorage` üzerinde saklanır. Değişiklikler "Kaydet" denilmediği sürece aktif sayacı bozmaz (`tempConfig` mimarisi).
* **Detaylı İstatistikler:** Günlük, Haftalık ve Aylık odaklanma sürelerinin grafiksel takibi.
* **Sesli Bildirimler:** Süre dolduğunda uyarı verir.

### 💬 Forum ve Sosyal Ağ
* **Konu & Etiketleme:** Kullanıcılar kategori bazlı konu açabilir ve `#etiket` sistemiyle içeriklerini özelleştirebilir.
* **Kullanıcı Profilleri:** Avatar, Biyografi, Bölüm bilgisi ve **Takipçi/Takip Edilen** sistemi.
* **Filtreleme Sistemi:** Küfür/Argo filtresi (`BAD_WORDS`) ve URL algılama sistemi.
* **Anlık Bildirimler:** Konunuza cevap geldiğinde veya biri sizi takip ettiğinde bildirim alırsınız.

### 🛡️ Admin Paneli & Güvenlik (Kök Erişim)
* **Sistem Logları:** Kimin ne yaptığını IP adresi, Tarih ve Eylem bazında `system_logs` koleksiyonuna kaydeder.
* **Kullanıcı Yönetimi:** Yöneticiler kullanıcıları banlayabilir (`isBanned`), rolünü değiştirebilir veya kalıcı olarak silebilir.
* **Cascading Delete (Derinlemesine Silme):** Bir kullanıcı silindiğinde, veritabanında çöp veri kalmaması için o kişiye ait **tüm notlar, konular, mesajlar ve takipler** otomatik olarak temizlenir.

---

## 🛠 Kullanılan Teknolojiler ve Kütüphaneler

* **Frontend:** React.js, Tailwind CSS (Glassmorphism Tasarım)
* **Backend / Database:** Google Firebase (Firestore, Auth)
* **Icons:** Lucide React
* **Utils:** IPify API (IP tespiti için), Özel Hook'lar

---

## 📦 Kurulum

Projeyi yerel makinenizde çalıştırmak için:

### 1. Projeyi Klonlayın
```bash
git clone [https://github.com/sectns/secfocus.git](https://github.com/sectns/secfocus.git)
cd secfocus
