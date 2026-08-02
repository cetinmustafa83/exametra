# SchulOS PRD: Nerede Olduğumuz ve Eksiklerimiz

**Tarih:** 1 Ağustos 2026  
**Durum:** 30% tamamlanmış, 70% eksik

---

## Özet

SchulOS PRD'ye göre **12 modül** tanımlanmış. Bugünkü konsolidasyonda **Takvim** ve **Notlandırma** sistemini birleştirdik, ama **10 modül hala yapılacak**.

---

## Modül Durumu (12 Modül)

### ✅ Modül A: Akademik Çekirdek (Competency System)
**Durum:** 40% Tamamlı

**Yapılı:**
- Yeterlik şablonları ve ızgaraları
- Öğrenme ilerleme girişi
- Değerlendirmeler
- Notlandırma şeması
- Not hesaplama

**Eksik:**
- Mastery level tanımlamaları (DB eksik)
- Yeterlik Çiçeği (radar chart) tam değil
- Rapor PDF üretimi (framework var, production değil)
- Şablonları özelleştir (clone-on-customize)
- Rapor metin şablonları

**Yapılacak:** 22 DB tablosundan 18'i var, 4 tane daha ekle

---

### ❌ Modül B: Signage (TV Ekranları & Acil Uyarılar)
**Durum:** %5 (Sadece stub)

**Yapılacak:**
- TV/kiosk görüntüleme istemcisi
- Acil uyarı sistemi
- Gerçek zamanlı uyarı geçersiz kılma
- Bilgilendirme (kırmızı düğme) sistemи

---

### ⚠️ Modül C: İletişim & Escalation (Yönetim Kurulu)
**Durum:** 30% Tamamlı

**Yapılı:**
- Doğrudan mesajlaşma
- Sınıf duyuruları
- Temel mesaj dizileri

**Eksik (KRİTİK):**
- **Escalation Policy Engine** - bu modülün kalbi!
  - Veli → Admin escalation kapısı
  - Öğrenci → Rehber escalation
  - 3 iş günü bekleme kuralı
  - Otomatik hesaplama
- Sınıf saatleri boyunca mesajlaşma kilidi
- Sosyal odalar moderation

**Yapılacak:** Escalation policy engine tamamen yapı, 3 tane DB tablosu daha

---

### 🚀 Modül D: Learning Hub (Videolar, Alıştırmalar)
**Durum:** 20% Tamamlı

**Yapılacak:**
- İçerik etiketleme sistemi
- Arama / keşif arayüzü
- Öğrenci ilerleme takibi
- Ödev bağlantıları

---

### 🤖 Modül E: AI Tutor (Ev Ödevi Yardımı)
**Durum:** 20% Tamamlı

**Yapılacak:**
- Bağlam farkında yardım (sınıf, öğrenci, yeterlikler)
- İpucu-yalnızca politikası
- Sınavlar sırasında kilitlenme (Modül F ile entegrasyon)
- ELL öğrencileri için tercüme

---

### 🔒 Modül F: Sınav Modu (Digital Lockdown Kiosk)
**Durum:** 35% Tamamlı

**Yapılı:**
- Sınav denetim admin görünümü
- Canlı öğretmen kontrolleri

**Eksik (KRİTİK):**
- **Tam ekran tarayıcı kilidi** ← Bu lazım!
- Kiosk modu (URL çubuğu yok)
- Copy-paste engelleme
- Tab değiştirme engelleme
- Zaman sayacı
- Oto-gönderme

---

### 📓 Modül G: Digital Notebook (Dijital Defter)
**Durum:** 10% (Sadece stub)

**Yapılacak:**
- Konu başına öğrenci defteri
- Stylus/kalem desteği
- Öğretmen kalem notu (sınavlarda)
- PDF olarak dışa aktar
- Çevrimdışı önce (offline-first)

---

### 🔔 Modül H: Notifications Hub (Bildirim Merkezi)
**Durum:** 0% (Tamamen eksik!)

**Yapılacak:**
- Merkezi bildirim merkezi
- Web Push bildirimleri
- Uygulama içi bildirim merkezi
- Bildirim şablonları
- Okuma/okunmadı takibi
- Acil güvenlik bildirimleri bypass'ı

---

### 📅 Modül I: Calendar (Takvim) — BUGÜN TESLİM EDİLDİ
**Durum:** 70% → Hedef 100%

**Yapılı (Bugün):**
- Birleşik takvim bileşeni
- Multi-view desteği (ay, hafta, gündem)
- Sürükle-bırak yeniden planlama
- Olay tipi sistemi

**Eksik:**
- Okul tatilleri/hafta sonları takvimi
- İşletme günü hesaplayıcı (Modül C için lazım)
- Ders saati eşleştirmesi

---

### 📊 Modül J: Dashboard Widgets
**Durum:** 40% Tamamlı

**Yapılacak:**
- Birleşik widget sistemi
- Diğer modüllerden veri çeken salt okunur widgetler
- Widget durumu kalıcılığı
- Mobil responsive grid

---

### 👤 Modül K: Identity & Admin (Kimlik & Yönetici)
**Durum:** 50% Tamamlı

**Yapılı:**
- Kullanıcı model ve kimlik doğrulama
- Rol tabanlı erişim kontrolü (temel)

**Eksik:**
- Rol-permission matrisi (ayrıntılı erişim)
- Öğretmen roller varyasyonları
- 2FA (TOTP)
- Oturum sertleştirme
- Login hız sınırı

---

### ⚖️ Modül L: Legal & Data Protection (GDPR/DSGVO)
**Durum:** 0% (TAMAMEN EKSİK — KRİTİK!)

**Yapılacak (ZORUNLU, ALMANYA'DA DAĞITIM ÖNCE):**
- **GDPR/DSGVO uyum motoru**
- Veri saklama politikaları
- Veri silme (Right to Erasure) with cascading
- Veri dışa aktarma
- Erişim günlüğü
- RoPA oluşturucu
- Rıza yönetimi
- DPO (Data Protection Officer) denetim arayüzü
- İhlal bildirimi iş akışı

**Bu modül olmadan okul dağıtımı yasal olarak imkansız!**

---

## Eksik Database Tabloları (39 tane)

```
Modül A: 4 tane
Modül B: 2 tane  
Modül C: 3 tane
Modül D: 4 tane
Modül E: 2 tane
Modül F: 2 tane
Modül G: 3 tane
Modül H: 3 tane
Modül I: 3 tane
Modül J: 2 tane
Modül K: 3 tane
Modül L: 5 tane (KRİTİK)
```

**Hemen Eklenecek:**
- `EscalationPolicy` (Modül C)
- `NotificationTemplate` (Modül H)
- `DataRetentionPolicy` (Modül L)
- `ConsentRecord` (Modül L)
- `AccessLog` (Modül L)

---

## Eksik API & Mimarı Sorunları

1. **264 API route** tutarsız response formatlar
2. **160+ duplicate fetch patterns** useEffect'te
3. Modül sınırları yok (tight coupling)
4. Ortak durum yönetimi merkezi değil
5. Hiçbir standart error handling

**Bugün yapılan:**
- Takvim birleştirildi (88% kod azaltma)
- Notlandırma birleştirildi (81% kod azaltma)

---

## Kritik Yol (8 Haftada PRD Uyumlu Olmak)

### Hafta 1-2: Temel (MUST DO)
- [x] Takvim birleştirme (Bugün tamamlandı)
- [x] Notlandırma birleştirme (Bugün tamamlandı)
- [ ] API standardlaştırma
- [ ] **Modül A tamamlama** (Academics Core)
- [ ] **Modül K tamamlama** (Identity)

### Hafta 3-5: Çekirdek Modüller (MUST DO)
- [ ] **Modül C: Escalation Engine** (Veli/Öğrenci yönetim kurulu)
- [ ] **Modül F: Sınav Modu Lockdown**
- [ ] **Modül H: Bildirim Hub**
- [ ] **Modül L: GDPR Uyum** ← ZORUNLU

### Hafta 6-8: Ek Modüller (İsteğe Bağlı)
- [ ] Modül B (Signage)
- [ ] Modül D (Learning Hub)
- [ ] Modül E (AI Tutor)
- [ ] Modül G (Digital Notebook)
- [ ] Modül J (Dashboard)

---

## Aciliyet

| Modül | Aciliyet | Neden |
|-------|----------|-------|
| **L** | 🔴 KRİTİK | ALMANYA'DA DAĞITIM YASAL ÖN KOŞUL |
| **A** | 🔴 KRİTİK | Tüm akademik işler buna dayanır |
| **F** | 🔴 KRİTİK | Sınav modu olmadan kullanılamaz |
| **K** | 🔴 KRİTİK | Kimlik ve izin sistemi lazım |
| **C** | 🟡 YÜKSEK | Veli iletişimi temel özellik |
| **H** | 🟡 YÜKSEK | Bildirimleri merkezi olmadan başarısız |
| **I** | 🟡 YÜKSEK | (Bugün tamamlandı, tamamlamayı gerekli) |
| B,D,E,G,J | 🟢 DÜŞÜK | Güzel-to-have, core olmayan |

---

## Sonuç

**Nerede:** 30% tamamlı, çok dağınık  
**Eksikler:** 10 modül, 39 DB tablosu, 200+ API rotası  
**Neden önemli:** Almanya'daki hukuki uyum zorunlu (GDPR/DSGVO)

**İlk yapılacak:**
1. Modül L tamamla (GDPR uyum) — Hukuki ön koşul
2. Modül A tamamla (Academics)
3. Modül C yapı (Escalation)
4. Modül F yapı (Exam Lockdown)

Sonra Modülleri B, D, E, G, J yapabilir.

