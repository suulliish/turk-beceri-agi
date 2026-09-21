# Türk Dünyası Beceri Ağı — Geliştirme Raporu

**Yayın:** <https://suulliish.github.io/turk-beceri-agi/>
**Tarih:** 21 Eylül 2026
**Kapsam:** hata düzeltmeleri, erişilebilirlik, çok dillilik, kod düzeni, sekmeli gezinme

---

## 1. Özet

Prototip; çalışmayan altı işlevi onarılmış, WCAG AA kontrast eşiğini geçen, yedi dilde eksiksiz çevrilmiş, tek bir 380 KB'lik dosya yerine on üç modüle ayrılmış ve yedi sekmeli bir gezinme kabuğuna taşınmış hâlde yayında. Tüm ölçümler tarayıcıda, yayındaki sürüm üzerinde yapıldı.

| Ölçüt | Önce | Sonra |
|---|---|---|
| Sayfa yüklenirken JavaScript hatası | 2 | 0 |
| Kontrast eşiğini geçemeyen metin | 27 öğe | 0 öğe |
| Çalışmayan işlev | 6 | 0 |
| Kaynak dosya sayısı | 1 dosya (380 KB) | 13 modül (index 44 KB) |
| Bağlantı paylaşımında önizleme | yok | başlık, açıklama ve 1200×630 görsel |

---

## 2. Onarılan işlevler

### 2.1 Değerlendirme (yıldız ve yorum)
**Sorun:** Yıldızlar tıklamaya yanıt vermiyordu, puan her zaman 5 kalıyordu; "Yayımla" düğmesi formu sunucuya göndermeye çalışıp sayfayı baştan yüklüyor ve yazılanı siliyordu.
**Neden:** Değerlendirme penceresinin HTML'i, onu dinleyen betikten **sonra** geliyordu. `?.addEventListener` çağrısı, henüz var olmayan öğede sessizce hiçbir şey yapmıyordu.
**Çözüm:** Dinleyiciler `DOMContentLoaded` içine alındı.
**Neden daha iyi:** Sessiz başarısızlık yerine belirli bir sıra garantisi var. Jüri "değerlendirme bırak" dediğinde sayfa artık başa dönmüyor, yorum kaydediliyor.

### 2.2 Yapay zekâ metin dedektörü
**Sorun:** 80 karakterden uzun her metinde `ReferenceError: featureT is not defined` hatası; sonuç hiç görünmüyordu.
**Neden:** Çeviri yardımcısı `featureT` başka bir kapsamdaydı (ilk betik bloğu), dedektör ikinci bloktaydı.
**Çözüm:** Panelin kendi kapsamına küçük bir çeviri yardımcısı eklendi.
**Neden daha iyi:** Dedektör tamamen tarayıcıda, sunucusuz çalışan gerçek bir özellik. Artık gösterilebiliyor.

### 2.3 Öğrenci ID'si
**Sorun:** Kayıttan sonra "Senin Öğrenci ID'n" alanı `—` kalıyordu; puan bağışı gösterimi bu yüzden tamamlanamıyordu.
**Çözüm:** Kayıt ve giriş sonrasında ilgili alan yeniden çiziliyor.

### 2.4 Oturum durumu
**Sorun:** Giriş yapıldıktan sonra da başlıkta "Giriş Yap / Kayıt Ol" yazıyordu; kullanıcı girip girmediğini anlayamıyordu.
**Çözüm:** Ayrı bir oturum anahtarı eklendi; başlıkta ve mobil çekmecede ad ve "Çıkış Yap" görünüyor, çıkışta hesap silinmiyor, yeniden girilebiliyor.

### 2.5 Eşleşme sonucu boşken çıkan mesaj
**Sorun:** Filtreye uyan kimse yoksa "Bu ülkede henüz açık destek talebi yok" yazıyordu; bu, bağış bölümünün metniydi.
**Çözüm:** Yedi dilde ayrı bir `noMatches` anahtarı: "Bu filtrelerle eşleşen öğrenci bulunamadı."

### 2.6 Makale çevirileri
**Sorun:** Yedi örnek makale, arayüz Kazakçaya geçse bile Türkçe kalıyordu.
**Çözüm:** Başlık ve gövdeler yedi dile çevrildi; çeviri **ekrana çizim anında** uygulandığı için tarayıcıda saklı eski kayıtlar da doğru dilde görünüyor. Kullanıcının kendi yazdığı yazıya dokunulmuyor.

---

## 3. Erişilebilirlik

- **Kontrast.** İki renk AA eşiğinin altındaydı: bölüm etiketleri `#b37b0b` (3.65:1) ve küçük yazılar `#7a8497` (3.77:1). Sırasıyla `#8a5f00` (5.65:1) ve `#5f6673` (5.78:1) yapıldı. Yedi sekmenin tamamında yapılan son ölçüm: **eşiği geçemeyen 0 öğe.**
- **Klavye.** Sekmeler ok tuşları, Home ve End ile geziliyor; etkin sekme `aria-selected` taşıyor. Pencereler (kayıt, değerlendirme, topluluk odası) odağı içeride tutuyor, Escape ile kapanıyor ve odak açan düğmeye geri dönüyor.
- **"İçeriğe geç" bağlantısı.** Klavyeyle ilk Tab'da görünür oluyor. Ekran dışına itme (`left:-9999px`) yerine `clip-path` tekniği kullanıldı; bu yöntem yatay kaymaya yol açmıyor.
- **Hareket tercihi.** `prefers-reduced-motion` açıkken animasyonlar kapanıyor.
- **Ekran okuyucu.** Kapalı çekmece ve pencereler `aria-hidden` ile gizleniyor, böylece okuyucu görünmeyen bağlantıları okumuyor.

---

## 4. Çok dillilik

- Yedi dil eksiksiz: sözlükler arasında **eksik anahtar yok**.
- Sayfa başlığı (`<title>`), logo, sekme adları, tarih biçimi ve eşleşme kartlarındaki seviye/uygunluk bilgisi dile göre değişiyor.
- Tarihler artık tarayıcının değil, seçilen dilin biçimini kullanıyor (`tr-TR`, `kk-KZ`, `uz-UZ`, `ky-KG`, `tk-TM`, `az-AZ`, `en-GB`).
- Ülke listesi çeviriyle gösteriliyor ama süzgeç değeri Türkçe kalıyor; böylece veriyle karşılaştırma bozulmuyor.
- Denetim: Türkçe metinler ile diğer dillerdeki metinler karşılaştırıldığında Kazakça, Özbekçe, Azerbaycanca ve Kırgızcada **çevrilmemiş satır yok**; İngilizcede yalnızca ekip adları kalıyor (özel isim).

---

## 5. Gezinme: yedi sekmeli kabuk

Uzun tek sayfa yerine yedi bölüm: Ana Sayfa, Öğrenci Yolculuğu, Akıllı Eşleştirme, Topluluk, Makaleler, Öğrenci Profilim, Turan AI.

**Nasıl kurgulandı:** Bölümler HTML içinde tek bir akış olarak duruyor; `07-tabs.js` bunları açılışta panellere taşıyor.

**Neden bu yaklaşım daha iyi:**
- İçerik tek kaynakta kalıyor; aynı bölümü iki yere kopyalamak gerekmiyor.
- `#eslesme`, `#makaleler` gibi eski bağlantılar çalışmaya devam ediyor: bağlantı önce doğru sekmeyi açıyor, sonra bölüme kaydırıyor.
- Adres satırındaki `#matching` gibi bir sekme adı doğrudan o sekmeyi açıyor, yani paylaşılan bağlantı doğru ekranı gösteriyor.
- Sekme çubuğu başlığın içine sıkıştırılmadı, kendi satırında duruyor: başlık dar ekranda dağılmıyor, çubuk dar ekranda yatay kayıyor.
- Ana sayfada üç hızlı erişim kartı var; yeni gelen kullanıcı ilk hamlede nereye gideceğini görüyor.

---

## 6. Güvenlik ve veri

- **Parola artık düz metin değil.** Kayıtta SHA-256 özeti saklanıyor, giriş bu özetle karşılaştırılıyor. Daha önce kaydolmuş hesaplar eski yöntemle girmeye devam ediyor, yani kimse dışarıda kalmıyor.
- Kullanıcı adları ekrana yazılırken kaçış uygulanıyor; forma yazılan HTML çalıştırılamıyor.
- Tüm veri tarayıcıda kalıyor, sunucuya gönderilmiyor; bu, prototipin bilinçli sınırı olarak arayüzde de belirtiliyor.

---

## 7. Görünürlük ve paylaşım

Eklendi: sayfa açıklaması, Open Graph ve Twitter etiketleri, 1200×630 paylaşım görseli, favicon, apple-touch-icon, `theme-color`, `canonical`, `robots.txt`, `sitemap.xml` ve tasarıma uygun bir `404.html`.

**Neden önemli:** Bağlantı bir gruba ya da jüriye gönderildiğinde artık boş gri kutu değil, başlıklı ve görselli bir kart görünüyor.

---

## 8. Kod düzeni

Tek dosyalık 380 KB'lik yapı on üç modüle ayrıldı:

```
index.html              44 KB   yalnızca içerik ve yapı
assets/css/01…07        56 KB   temel, bileşenler, formlar, asistan, duyarlılık, özellikler, sekmeler
assets/js/01…07        344 KB   kabuk, sözlükler, uygulama, asistan, hareket, odalar, sekmeler
```

Dosya adlarındaki numara yükleme sırasını gösteriyor; sıra bozulursa basamaklama (cascade) ve bağımlılıklar bozulur. Ayırma işlemi sonrası iki sürüm 1280×5000 piksel karşılaştırıldı: **6,4 milyon pikselde 3 piksel fark** (yalnızca yazı yumuşatma). Yani düzen bire bir korundu.

Betikler `defer` ile yükleniyor: sıra korunuyor ve kod HTML çözümlendikten sonra çalışıyor. Bu, 2.1'de anlatılan "dinleyici öğeden önce bağlanıyor" hatasının tüm sınıfını ortadan kaldırıyor.

Varlık bağlantılarına sürüm etiketi eklendi (`?v=20260921`); GitHub Pages dosyaları 10 dakika önbelleğe aldığı için, güncelleme sonrası kullanıcı eski dosyayı görmüyor.

---

## 9. Yeni özellikler

- **Arama.** Eşleşme bölümünde serbest metin araması: ad, ülke, seviye, uygunluk, dil ve beceri üzerinde çalışıyor; hem Türkçe özgün ad hem çevrilmiş ad eşleşiyor. Her tuş vuruşunda süzüyor.
- **Ülke topluluk odaları.** Yedi ülke kartı; kart açılınca hazır mesajlarla örnek sohbet penceresi geliyor. Kartlar klavyeyle açılıyor, pencere odağı içeride tutuyor, Escape ile kapanıyor ve mesajların saklanmadığı açıkça yazıyor.
- **Örnek değerlendirme.** Kendi değerlendirmesi olmayan ziyaretçi boş bir bölüm görmüyor; örnek bir Python ↔ İngilizce takası görünüyor, kullanıcı kendi yorumunu bırakınca örnek kayboluyor.
- **Çevrilen logo.** Kazakçada "ТҮРКІ ӘЛЕМІ ҚАБІЛЕТТЕР ЖЕЛІСІ", İngilizcede "TURKIC WORLD SKILL NETWORK".
- **Öğrenci yolculuğu zaman çizelgesi.** Altı adım, yan yana kutular ve oklar yerine tek bir dikey zaman çizelgesinde duruyor: sol kenarda sürekli bir çizgi, her adımın hizasında bir nokta. Adımların sırası dar ekranda da bozulmuyor, ayrı bir mobil düzen gerekmiyor.
- **Etiketli beceri haritası kartları.** Ülke kartları artık "Beceri Arzı" ve "Öğrenme İhtiyacı" başlıklarıyla iki satır gösteriyor; daha önce iki bilgi tek satırda nokta ile ayrılıyordu ve hangisinin arz hangisinin ihtiyaç olduğu belirsizdi. Etiketler ve beceri adları yedi dile çevrildi; beceri çevirileri mevcut beceri katalogundan alındığı için ikinci bir kaynak oluşmadı.

---

## 10. Son doğrulama (yayındaki sürüm)

| Kontrol | Sonuç |
|---|---|
| Konsol hatası | 0 |
| Yüklenemeyen dosya | 0 |
| Yedi sekmenin tamamı içerik gösteriyor | evet |
| Eşleşme / makale / ülke / harita kartları | 7 / 7 / 7 / 7 |
| Arama: "medya" → 1 sonuç, boş → 7 sonuç | evet |
| Değerlendirme: yıldız 4, kayıt var, sayfa yenilenmedi | evet |
| Dedektör sonucu görünüyor | evet |
| Kayıt: düz parola yok, 64 karakterlik özet var, başlıkta ad | evet |
| Yedi sekmede kontrast eşiği | 0 hata |
| Kazakça: başlık, logo, sekme, oda adı, tarih | çeviriyor |
| 390 piksel: yatay kaydırma yok, çubuk kayıyor, çekmece arka planı kilitliyor | evet |
| Klavye: ilk Tab "İçeriğe geç", ok tuşlarıyla sekme, Escape ile pencere | evet |

---

## 11. Sınırlar

- Sistem hâlâ bir prototip: veriler tarayıcıda tutuluyor, gerçek kullanıcı ve puan transferi için sunucu ve veritabanı gerekir.
- Turan asistanının sohbet kısmı bir yapay zekâ ucu (`/api/ai`) bekliyor; statik barındırmada bu uç yok, bu yüzden bağlı olmadığını açıkça söylüyor. Metin dedektörü ise tamamen tarayıcıda çalışıyor.
- Topluluk odalarındaki mesajlar kaydedilmiyor; gösterim amaçlı.
