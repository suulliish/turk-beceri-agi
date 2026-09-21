# Türk Dünyası Beceri Ağı

Öğrenciler arası beceri paylaşım ağının etkileşimli konsept prototipi. Para yerine zaman ve bilgi değişir: bir saat beceri öğreten öğrenci bir Beceri Puanı kazanır ve bu puanla başka bir Türk Dünyası ülkesindeki doğrulanmış bir öğrenciden öğrenir.

Yayın: <https://suulliish.github.io/turk-beceri-agi/>

## Dosya yapısı

```text
turk-beceri-agi/
├── index.html                    # yalnızca içerik ve yapı (markup)
├── 404.html                      # bulunamayan sayfa
├── robots.txt / sitemap.xml      # arama motoru dosyaları
├── assets/
│   ├── css/                      # yükleme sırası dosya adlarındaki numaradır
│   │   ├── 01-base.css           # sıfırlama, tipografi, başlık çubuğu, kahraman alanı, düğmeler
│   │   ├── 02-components.css     # kartlar, tablo, beceri haritası, notlar, bağış paneli, zaman çizelgesi, alt bilgi
│   │   ├── 03-forms.css          # dil seçici, giriş/kayıt modalı, form alanları, ekip, sertifika, beceri seçici
│   │   ├── 04-assistant.css      # Turan yapay zekâ paneli
│   │   ├── 05-responsive.css     # mobil düzeltmeler, sabit başlık, çekmece, medya sorguları
│   │   ├── 06-features.css       # prototip özellik bölümleri: eşleşme, topluluk, makaleler
│   │   └── 07-tabs.css           # sekme çubuğu, paneller, hızlı erişim kartları
│   ├── js/                       # sıra önemlidir, hepsi `defer` ile yüklenir
│   │   ├── 01-ui-shell.js        # odak tuzağı, modal ve çekmece kontrolü, oturum durumu, başlık genişlik ölçümü
│   │   ├── 02-i18n-data.js       # 7 dilin sözlükleri (yalnızca veri, window.TDA_I18N_DATA)
│   │   ├── 03-app.js             # i18n motoru, beceri kataloğu, prototip işlevleri
│   │   ├── 04-assistant.js       # Turan paneli: sohbet ve metin dedektörü
│   │   ├── 05-ui-motion.js       # aktif bölüm vurgusu, yukarı düğmesi, tablo kaydırma ipucu
│   │   ├── 06-rooms.js           # ülke topluluk odaları (prototip sohbet gösterimi)
│   │   └── 07-tabs.js            # sekme kabuğu: bölümleri yedi panele dağıtır
│   ├── flags/                    # 7 ülkenin yerel SVG bayrağı
│   ├── favicon.svg / apple-touch-icon.png
│   └── og-image.jpg              # paylaşım görseli (1200×630)
├── bin/bump-version.py           # yayın öncesi sürüm etiketi
└── README.md
```

CSS ve JS dosyaları numara sırasıyla yüklenir; sıra değişirse basamak (cascade) ve bağımlılıklar bozulur. `02-i18n-data.js` sözlükleri `window.TDA_I18N_DATA` üzerinden `03-app.js` içindeki motora verir.

## Gezinme

Sayfa yedi sekmeye ayrılır: **Ana Sayfa**, **Öğrenci Yolculuğu**, **Akıllı Eşleştirme**, **Topluluk**, **Makaleler**, **Öğrenci Profilim**, **Turan AI**. Bölümler markup içinde tek bir akış olarak durur; `07-tabs.js` bunları çalışma anında panellere taşır. Böylece `#eslesme`, `#makaleler` gibi eski çapa bağlantıları çalışmaya devam eder: bağlantı önce doğru sekmeyi açar, sonra bölüme kaydırır. Adres çubuğundaki `#matching` gibi bir sekme adı doğrudan o sekmeyi açar.

## Özellikler

- **7 dil**: Türkçe, Azərbaycanca, Oʻzbekcha, Қазақша, Türkmençe, Кыргызча, English. Arayüz, içerik, tarih biçimi ve sayfa başlığı dile göre değişir.
- **Beceri Puanı**: 1 saat öğretim +1 puan, 30 dakika +0,5, günlük mikro dil görevi +0,2, yeni kayıtta 2,5 başlangıç puanı.
- **Eşleşme**: serbest metin araması (beceri, dil, ülke, öğrenci adı) ve öğretilen/öğrenilen beceri, ülke, dil, seviye, uygunluk filtreleriyle skorlanmış öneri listesi.
- **Topluluk**: yedi ülke için topluluk odası (hazır mesajlarla prototip sohbet), sıfır puanlı öğrenci için yapılandırılmış destek talebi, öğrenci ID'si ile puan bağışı, ayda en çok 2 puan.
- **Makaleler**: ülke filtresiyle öğrenci yazıları; kayıtlı öğrenci kendi yazısını yayımlayabilir.
- **Turan**: sohbet paneli ve dilsel örüntülere bakan metin ön değerlendirme aracı.
- **Erişilebilirlik**: klavye odak tuzağı, içeriğe geç bağlantısı, görünür odak halkası, `prefers-reduced-motion` desteği.

Veriler tarayıcıda `localStorage` içinde tutulur; sunucu yoktur. Kullanıcılar, puanlar ve beceri verileri örnektir.

## Çalıştırma

Dosyalar dış bağımlılık kullanmaz, ancak birden fazla dosyaya bölündüğü için yerel bir sunucu gerekir:

```bash
cd turk-beceri-agi
python3 -m http.server 8000
```

Sonra tarayıcıda <http://localhost:8000> adresini aç.

## Yayınlama

Her yayından önce sürüm etiketini tazele:

```bash
python3 bin/bump-version.py
```

Betik, CSS ve JS dosyalarının içeriğinden bir özet üretip `index.html` içindeki bağlantılara `?v=<özet>` yazar. GitHub Pages dosyaları 10 dakika önbelleğe aldığı için, etiket değişmezse ziyaretçi güncellenen dosyayı değil eski kopyasını görür. İçerik değişmediyse etiket de değişmez, gereksiz indirme olmaz.


`main` dalına yapılan her değişiklik GitHub Pages tarafından otomatik yayımlanır; yayın genellikle 30–60 saniye sürer.
