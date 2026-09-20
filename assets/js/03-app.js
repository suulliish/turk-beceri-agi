/* Türk Dünyası Beceri Ağı — i18n motoru, beceri katalogu, prototip islevleri */
(function(){

// =========================================================
// ENTERPRISE UNIFIED I18N ENGINE (TDA I18N)
// - Offline-first, single source of truth, zero external requests
// - Complete 7-language support: tr, az, uz, kk, tk, ky, en
// - Fallback chain: currentLang -> defaultLang ('tr') -> key
// - Declarative binding: [data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria], [data-i18n-html]
// - Reactive pub/sub & MutationObserver for dynamic components
// =========================================================

const UI_LANGUAGE_NAMES = window.TDA_I18N_DATA.uiLanguageNames;
const I18N_RESOURCES = window.TDA_I18N_DATA.resources;

class I18nEngine {
  constructor(options = {}) {
    this.defaultLang = options.defaultLang || 'tr';
    this.currentLang = options.currentLang || 'tr';
    this.supportedLanguages = options.supportedLanguages || ['tr', 'az', 'uz', 'kk', 'tk', 'ky', 'en'];
    this.resources = options.resources || I18N_RESOURCES;
    this.listeners = new Set();
    this.originalTexts = new WeakMap();
    this.originalAttrs = new WeakMap();
  }

  get language() {
    return this.currentLang;
  }

  get languages() {
    return this.supportedLanguages.slice();
  }

  addTranslations(lang, dict) {
    if (!this.resources[lang]) this.resources[lang] = {};
    Object.assign(this.resources[lang], dict);
  }

  t(key, vars = {}) {
    let str = this.resources[this.currentLang]?.[key];
    if (str === undefined) {
      str = this.resources[this.defaultLang]?.[key];
    }
    if (str === undefined) {
      str = key;
    }
    return String(str).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  }

  translateElement(el, lang = this.currentLang) {
    if (!el || el.nodeType !== 1) return;
    if (el.closest && el.closest('[data-no-translate]')) return;

    if (el.hasAttribute('data-i18n')) {
      const k = el.getAttribute('data-i18n');
      const val = this.t(k);
      if (val && el.textContent !== val) el.textContent = val;
    }

    if (el.hasAttribute('data-i18n-html')) {
      const k = el.getAttribute('data-i18n-html');
      const val = this.t(k);
      if (val && el.innerHTML !== val) el.innerHTML = val;
    }

    if (el.hasAttribute('data-i18n-placeholder')) {
      const k = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', this.t(k));
    }

    if (el.hasAttribute('data-i18n-title')) {
      const k = el.getAttribute('data-i18n-title');
      el.setAttribute('title', this.t(k));
    }

    if (el.hasAttribute('data-i18n-aria')) {
      const k = el.getAttribute('data-i18n-aria');
      el.setAttribute('aria-label', this.t(k));
    }
  }

  translateLandingNodes(root, lang) {
    if (!document.createTreeWalker) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        const text = node.nodeValue.trim();
        if (!text) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'OPTION' || tag === 'SELECT') return NodeFilter.FILTER_REJECT;
        if (parent.closest && (parent.closest('[data-no-translate]') || parent.closest('[data-i18n]'))) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      if (!this.originalTexts.has(node)) {
        this.originalTexts.set(node, node.nodeValue);
      }
      const original = this.originalTexts.get(node);
      const clean = original.replace(/\s+/g, ' ').trim();
      if (!clean) continue;

      if (lang === 'tr') {
        if (node.nodeValue !== original) node.nodeValue = original;
        continue;
      }

      const translated = this.resources[lang]?.[clean];
      if (translated !== undefined) {
        const lead = (original.match(/^\s*/) || [''])[0];
        const trail = (original.match(/\s*$/) || [''])[0];
        node.nodeValue = lead + translated + trail;
      }
    }
  }

  updateTopLanguageLabels(lang = this.currentLang) {
    const select = document.getElementById('languageSelect');
    if (!select) return;
    const names = UI_LANGUAGE_NAMES[lang] || UI_LANGUAGE_NAMES.tr;
    Array.from(select.options).forEach(opt => {
      if (names[opt.value]) opt.textContent = names[opt.value];
    });
    select.setAttribute('aria-label', lang === 'tr' ? 'Dil seçimi' : (lang === 'en' ? 'Language selection' : 'Dil saýlawy'));
  }

  translatePage(root = document.body, lang = this.currentLang) {
    if (!root) return;
    const elements = root.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria], [data-i18n-html]');
    elements.forEach(el => this.translateElement(el, lang));
    this.translateLandingNodes(root, lang);
    document.documentElement.lang = lang;
    document.documentElement.dataset.language = lang;
    this.updateTopLanguageLabels(lang);
  }

  setLanguage(lang) {
    if (!this.supportedLanguages.includes(lang)) lang = this.defaultLang;
    this.currentLang = lang;
    try { localStorage.setItem('tda-language', lang); } catch (e) {}

    const sel = document.getElementById('languageSelect');
    if (sel && sel.value !== lang) sel.value = lang;

    this.translatePage(document.body, lang);

    this.listeners.forEach(fn => {
      try { fn(lang); } catch (e) { console.error('i18n listener error:', e); }
    });

    window.dispatchEvent(new CustomEvent('tda:languageChanged', { detail: { language: lang } }));
  }

  onChange(fn) {
    if (typeof fn === 'function') {
      this.listeners.add(fn);
    }
    return () => this.listeners.delete(fn);
  }
}

// Global instance
window.TDAI18n = new I18nEngine({
  defaultLang: 'tr',
  supportedLanguages: ['tr', 'az', 'uz', 'kk', 'tk', 'ky', 'en'],
  resources: I18N_RESOURCES
});

// Dynamic mutation observer
const i18nObserver = new MutationObserver(mutations => {
  for (const m of mutations) {
    for (const node of m.addedNodes || []) {
      if (node.nodeType === 1) {
        if (node.matches && node.matches('[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria]')) {
          window.TDAI18n.translateElement(node);
        }
        if (node.querySelectorAll) {
          node.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria]')
            .forEach(el => window.TDAI18n.translateElement(el));
        }
      }
    }
  }
});
i18nObserver.observe(document.body, { childList: true, subtree: true });

// Attach selector change handler
const globalLangSelect = document.getElementById('languageSelect');
if (globalLangSelect) {
  globalLangSelect.addEventListener('change', () => {
    window.TDAI18n.setLanguage(globalLangSelect.value);
  });
  let savedLang = 'tr';
  try { savedLang = localStorage.getItem('tda-language') || 'tr'; } catch (e) {}
  if (!window.TDAI18n.languages.includes(savedLang)) savedLang = 'tr';
  if (savedLang !== 'tr') {
    setTimeout(() => window.TDAI18n.setLanguage(savedLang), 0);
  } else {
    window.TDAI18n.updateTopLanguageLabels('tr');
  }
}
setTimeout(() => {
  if (window.TDAI18n && window.TDAI18n.t) {
    document.title = window.TDAI18n.t('pageTitle');
    window.TDAI18n.onChange(() => { document.title = window.TDAI18n.t('pageTitle'); });
  }
}, 0);

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

const worldLanguageCatalog = [
    {c:'tur',a2:'tr',n:{tr:'Türkçe',az:'Türkcə',uz:'Turk tili',kk:'Түрік тілі',tk:'Türk dili',ky:'Түрк тили',en:'Turkish',tg:'забони туркӣ'}},
    {c:'aze',a2:'az',n:{tr:'Azerbaycanca',az:'Azərbaycan dili',uz:'Ozarbayjon tili',kk:'Әзербайжан тілі',tk:'Azerbaýjan dili',ky:'Азербайжан тили',en:'Azerbaijani',tg:'забони озарӣ'}},
    {c:'uzb',a2:'uz',n:{tr:'Özbekçe',az:'Özbək dili',uz:'O‘zbek tili',kk:'Өзбек тілі',tk:'Özbek dili',ky:'Өзбек тили',en:'Uzbek',tg:'забони ӯзбекӣ'}},
    {c:'kaz',a2:'kk',n:{tr:'Kazakça',az:'Qazax dili',uz:'Qozoq tili',kk:'Қазақ тілі',tk:'Gazak dili',ky:'Казак тили',en:'Kazakh',tg:'забони қазоқӣ'}},
    {c:'tuk',a2:'tk',n:{tr:'Türkmence',az:'Türkmən dili',uz:'Turkman tili',kk:'Түрікмен тілі',tk:'Türkmen dili',ky:'Түркмөн тили',en:'Turkmen',tg:'забони туркманӣ'}},
    {c:'kir',a2:'ky',n:{tr:'Kırgızca',az:'Qırğız dili',uz:'Qirg‘iz tili',kk:'Қырғыз тілі',tk:'Кыргыз тили',ky:'Кыргыз тили',en:'Kyrgyz',tg:'забони қирғизӣ'}},
    {c:'eng',a2:'en',n:{tr:'İngilizce',az:'İngilis dili',uz:'Ingliz tili',kk:'Ағылшын тілі',tk:'Iňlis dili',ky:'Англис тили',en:'English',tg:'забони англисӣ'}},
    {c:'rus',a2:'ru',n:{tr:'Rusça',az:'Rus dili',uz:'Rus tili',kk:'Орыс тілі',tk:'Rus dili',ky:'Орус тили',tg:'забони русӣ'}},
    {c:'kor',a2:'ko',n:{tr:'Korece',az:'Koreya dili',uz:'Koreys tili',kk:'Корей тілі',tk:'Koreý dili',ky:'Корей тили',tg:'забони кореягӣ'}},
    {c:'jpn',a2:'ja',n:{tr:'Japonca',az:'Yapon dili',uz:'Yapon tili',kk:'Жапон тілі',tk:'Ýapon dili',ky:'Жапон тили',tg:'забони ҷопонӣ'}},
    {c:'ita',a2:'it',n:{tr:'İtalyanca',az:'İtalyan dili',uz:'Italyan tili',kk:'Итальян тілі',tk:'Italýan dili',ky:'Италиян тили',tg:'забони итолиёвӣ'}},
    {c:'fra',a2:'fr',n:{tr:'Fransızca',az:'Fransız dili',uz:'Fransuz tili',kk:'Француз тілі',tk:'Fransuz dili',ky:'Француз тили',tg:'забони фаронсавӣ'}},
    {c:'spa',a2:'es',n:{tr:'İspanyolca',az:'İspan dili',uz:'Ispan tili',kk:'Испан тілі',tk:'Ispan dili',ky:'Испан тили',tg:'забони испанӣ'}},
    {c:'deu',a2:'de',n:{tr:'Almanca',az:'Alman dili',uz:'Nemis tili',kk:'Неміс тілі',tk:'Nemes dili',ky:'Немис тили',tg:'забони олмонӣ'}},
    {c:'por',a2:'pt',n:{tr:'Portekizce',az:'Portuqal dili',uz:'Portugal tili',kk:'Португал тілі',tk:'Portugaliýa dili',ky:'Португал тили',tg:'забони португалӣ'}},
    {c:'ara',a2:'ar',n:{tr:'Arapça',az:'Ərəb dili',uz:'Arab tili',kk:'Араб тілі',tk:'Arap dili',ky:'Араб тили',tg:'забони арабӣ'}},
    {c:'fas',a2:'fa',n:{tr:'Farsça',az:'Fars dili',uz:'Fors tili',kk:'Парсы тілі',tk:'Pars dili',ky:'Парсы тили',tg:'забони форсӣ'}},
    {c:'zho',a2:'zh',n:{tr:'Çince',az:'Çin dili',uz:'Xitoy tili',kk:'Қытай тілі',tk:'Hytaý dili',ky:'Кытай тили',tg:'забони чинӣ'}},
    {c:'hin',a2:'hi',n:{tr:'Hintçe',az:'Hind dili',uz:'Hind tili',kk:'Хинди тілі',tk:'Hindi dili',ky:'Хинди тили',tg:'забони ҳиндӣ'}},
    {c:'urd',a2:'ur',n:{tr:'Urduca',az:'Urdu dili',uz:'Urdu tili',kk:'Урду тілі',tk:'Urdu dili',ky:'Урду тили',tg:'забони урду'}},
    {c:'ben',a2:'bn',n:{tr:'Bengalce',az:'Benqal dili',uz:'Bengal tili',kk:'Бенгал тілі',tk:'Bengal dili',ky:'Бенгал тили',tg:'забони банголӣ'}},
    {c:'ind',a2:'id',n:{tr:'Endonezce',az:'İndoneziya dili',uz:'Indonez tili',kk:'Индонез тілі',tk:'Indonez dili',ky:'Индонез тили',tg:'забони индонезӣ'}},
    {c:'msa',a2:'ms',n:{tr:'Malayca',az:'Malay dili',uz:'Malay tili',kk:'Малай тілі',tk:'Malaý dili',ky:'Малай тили',tg:'забони малайӣ'}},
    {c:'vie',a2:'vi',n:{tr:'Vietnamca',az:'Vyetnam dili',uz:'Vetnam tili',kk:'Вьетнам тілі',tk:'Wýetnam dili',ky:'Вьетнам тили',tg:'забони ветнамӣ'}},
    {c:'tha',a2:'th',n:{tr:'Tayca',az:'Tay dili',uz:'Tay tili',kk:'Тай тілі',tk:'Taý dili',ky:'Тай тили',tg:'забони тайӣ'}},
    {c:'ell',a2:'el',n:{tr:'Yunanca',az:'Yunan dili',uz:'Yunon tili',kk:'Грек тілі',tk:'Grek dili',ky:'Грек тили',tg:'забони юнонӣ'}},
    {c:'heb',a2:'he',n:{tr:'İbranice',az:'İvrit dili',uz:'Ibroniy tili',kk:'Иврит тілі',tk:'Ýewreý dili',ky:'Иврит тили',tg:'забони ибронӣ'}},
    {c:'nld',a2:'nl',n:{tr:'Felemenkçe',az:'Niderland dili',uz:'Niderland tili',kk:'Нидерланд тілі',tk:'Niderland dili',ky:'Нидерланд тили',tg:'забони нидерландӣ'}},
    {c:'swe',a2:'sv',n:{tr:'İsveççe',az:'İsveç dili',uz:'Shved tili',kk:'Швед тілі',tk:'Şwed dili',ky:'Швед тили',tg:'забони шведӣ'}},
    {c:'nor',a2:'no',n:{tr:'Norveççe',az:'Norveç dili',uz:'Norveg tili',kk:'Норвег тілі',tk:'Norweg dili',ky:'Норвег тили',tg:'забони норвегӣ'}},
    {c:'dan',a2:'da',n:{tr:'Danca',az:'Danimarka dili',uz:'Daniya tili',kk:'Дат тілі',tk:'Daniýa dili',ky:'Дат тили',tg:'забони даниягӣ'}},
    {c:'fin',a2:'fi',n:{tr:'Fince',az:'Fin dili',uz:'Fin tili',kk:'Фин тілі',tk:'Fin dili',ky:'Фин тили',tg:'забони финӣ'}},
    {c:'pol',a2:'pl',n:{tr:'Lehçe',az:'Polyak dili',uz:'Polyak tili',kk:'Поляк тілі',tk:'Polýak dili',ky:'Поляк тили',tg:'забони полякӣ'}},
    {c:'ces',a2:'cs',n:{tr:'Çekçe',az:'Çex dili',uz:'Chex tili',kk:'Чех тілі',tk:'Çeh dili',ky:'Чех тили',tg:'забони чехӣ'}},
    {c:'ukr',a2:'uk',n:{tr:'Ukraynaca',az:'Ukrayna dili',uz:'Ukrain tili',kk:'Украин тілі',tk:'Ukrain dili',ky:'Украин тили',tg:'забони украинӣ'}},
    {c:'ron',a2:'ro',n:{tr:'Romence',az:'Rumın dili',uz:'Rumin tili',kk:'Румын тілі',tk:'Rumyn dili',ky:'Румын тили',tg:'забони руминӣ'}},
    {c:'bul',a2:'bg',n:{tr:'Bulgarca',az:'Bolqar dili',uz:'Bolgar tili',kk:'Болгар тілі',tk:'Bolgar dili',ky:'Болгар тили',tg:'забони булғорӣ'}},
    {c:'srp',a2:'sr',n:{tr:'Sırpça',az:'Serb dili',uz:'Serb tili',kk:'Серб тілі',tk:'Serb dili',ky:'Серб тили',tg:'забони сербӣ'}},
    {c:'hrv',a2:'hr',n:{tr:'Hırvatça',az:'Xorvat dili',uz:'Xorvat tili',kk:'Хорват тілі',tk:'Horwat dili',ky:'Хорват тили',tg:'забони хорватӣ'}},
    {c:'hun',a2:'hu',n:{tr:'Macarca',az:'Macar dili',uz:'Venger tili',kk:'Венгр тілі',tk:'Wenger dili',ky:'Венгр тили',tg:'забони венгерӣ'}},
    {c:'kat',a2:'ka',n:{tr:'Gürcüce',az:'Gürcü dili',uz:'Gruzin tili',kk:'Грузин тілі',tk:'Gruzin dili',ky:'Грузин тили',tg:'забони гурҷӣ'}},
    {c:'lat',a2:'la',n:{tr:'Latince',az:'Latın dili',uz:'Lotin tili',kk:'Латын тілі',tk:'Latyn dili',ky:'Латын тили'}}
  ];
  const worldLanguageByCode = new Map(worldLanguageCatalog.map(x=>[x.c,x]));
  const worldLanguageByAlpha2 = new Map(worldLanguageCatalog.filter(x=>x.a2).map(x=>[x.a2,x]));
  function localizedLanguageName(code, lang=(window.TDAI18n ? window.TDAI18n.language : 'tr')) {
    const item=worldLanguageByCode.get(code) || worldLanguageByAlpha2.get(code);
    if(!item) return String(code);
    return item.n[lang] || item.n.tr || `⟦MISSING_LANG:${item.c}⟧`;
  }

const skillCatalog = [
    ['Kodlama ve yazılım','Kodlama'],['Web geliştirme','Web geliştirme'],['Mobil uygulama geliştirme','Mobil uygulama'],['Veri analizi','Veri analizi'],['Yapay zekâ','Yapay zekâ'],['Siber güvenlik','Siber güvenlik'],['Robotik','Robotik'],['Elektronik','Elektronik'],
    ['Ekonomi','Ekonomi'],['Finans','Finans'],['Muhasebe','Muhasebe'],['Girişimcilik','Girişimcilik'],['Pazarlama','Pazarlama'],['İş geliştirme','İş geliştirme'],['Proje yönetimi','Proje yönetimi'],['Hukuk','Hukuk'],
    ['Fotoğrafçılık','Fotoğrafçılık'],['Video çekimi','Video çekimi'],['Video düzenleme','Video düzenleme'],['Grafik tasarım','Grafik tasarım'],['UI/UX tasarım','UI/UX tasarım'],['İllüstrasyon','İllüstrasyon'],['Animasyon','Animasyon'],['Müzik','Müzik'],['Enstrüman','Enstrüman'],['Şarkı söyleme','Şarkı söyleme'],
    ['Medya','Medya'],['Gazetecilik','Gazetecilik'],['Sosyal medya','Sosyal medya'],['İçerik üretimi','İçerik üretimi'],['Sunum ve hitabet','Sunum ve hitabet'],['Yaratıcı yazarlık','Yaratıcı yazarlık'],['Akademik yazım','Akademik yazım'],
    ['Öğretmenlik / eğitim','Eğitim'],['Araştırma','Araştırma'],['Matematik','Matematik'],['Fen bilimleri','Fen bilimleri'],['Tarih','Tarih'],['Coğrafya','Coğrafya'],['Psikoloji','Psikoloji'],['Sosyoloji','Sosyoloji'],
    ['Çizim','Çizim'],['El sanatları','El sanatları'],['Dikiş','Dikiş'],['Örgü','Örgü'],['Yemek yapma','Yemek yapma'],['Dans','Dans'],['Spor','Spor'],['Fitness','Fitness'],['Satranç','Satranç'],['Oyun geliştirme','Oyun geliştirme'],
    ['Kişisel finans','Kişisel finans'],['Kariyer planlama','Kariyer planlama'],['CV hazırlama','CV hazırlama'],['Mülakat becerileri','Mülakat becerileri'],['İletişim','İletişim'],['Takım çalışması','Takım çalışması'],['Liderlik','Liderlik'],['Zaman yönetimi','Zaman yönetimi']
  ];

/* ===== Beceri seçicileri ===== */
  const skillTranslations = {"tg":{"Kodlama ve yazılım":"Барномарезӣ ва таҳияи нармафзор","Web geliştirme":"Таҳияи веб","Mobil uygulama geliştirme":"Таҳияи барномаҳои мобилӣ","Veri analizi":"Таҳлили маълумот","Yapay zekâ":"Зеҳни сунъӣ","Siber güvenlik":"Амнияти киберӣ","Robotik":"Робототехника","Elektronik":"Электроника","Ekonomi":"Иқтисод","Finans":"Молия","Muhasebe":"Муҳосибӣ","Girişimcilik":"Соҳибкорӣ","Pazarlama":"Маркетинг","İş geliştirme":"Рушди тиҷорат","Proje yönetimi":"Идоракунии лоиҳа","Hukuk":"Ҳуқуқ","Fotoğrafçılık":"Аксбардорӣ","Video çekimi":"Наворбардорӣ","Video düzenleme":"Таҳрири видео","Grafik tasarım":"Тарҳи графикӣ","UI/UX tasarım":"Тарҳи UI/UX","İllüstrasyon":"Иллюстратсия","Animasyon":"Аниматсия","Müzik":"Мусиқӣ","Enstrüman":"Асбоби мусиқӣ","Şarkı söyleme":"Сурудхонӣ","Medya":"Медиа","Gazetecilik":"Журналистика","Sosyal medya":"Шабакаҳои иҷтимоӣ","İçerik üretimi":"Истеҳсоли мундариҷа","Sunum ve hitabet":"Презентатсия ва суханварӣ","Yaratıcı yazarlık":"Навиштаи эҷодӣ","Akademik yazım":"Навишти академӣ","Öğretmenlik / eğitim":"Омӯзгорӣ / маориф","Araştırma":"Таҳқиқот","Matematik":"Математика","Fen bilimleri":"Илмҳои табиӣ","Tarih":"Таърих","Coğrafya":"Ҷуғрофия","Psikoloji":"Равоншиносӣ","Sosyoloji":"Ҷомеашиносӣ","Çizim":"Расмкашӣ","El sanatları":"Ҳунарҳои дастӣ","Dikiş":"Дӯзандагӣ","Örgü":"Бофандагӣ","Yemek yapma":"Пухтупаз","Dans":"Рақс","Spor":"Варзиш","Fitness":"Фитнес","Satranç":"Шоҳмот","Oyun geliştirme":"Таҳияи бозӣ","Kişisel finans":"Молияи шахсӣ","Kariyer planlama":"Банақшагирии касб","CV hazırlama":"Таҳияи CV","Mülakat becerileri":"Маҳоратҳои мусоҳиба","İletişim":"Муошират","Takım çalışması":"Кори гурӯҳӣ","Liderlik":"Роҳбарӣ","Zaman yönetimi":"Идоракунии вақт"},"az":{"Kodlama ve yazılım":"Kodlaşdırma və proqramlaşdırma","Web geliştirme":"Veb proqramlaşdırma","Mobil uygulama geliştirme":"Mobil tətbiqlərin tərtibatı","Veri analizi":"Məlumatların təhlili","Yapay zekâ":"Süni intellekt","Siber güvenlik":"Kibertəhlükəsizlik","Robotik":"Robototexnika","Elektronik":"Elektronika","Ekonomi":"İqtisadiyyat","Finans":"Maliyyə","Muhasebe":"Mühasibat","Girişimcilik":"Sahibkarlıq","Pazarlama":"Marketinq","İş geliştirme":"Biznesin inkişafı","Proje yönetimi":"Layihələrin idarə edilməsi","Hukuk":"Hüquq","Fotoğrafçılık":"Fotoqrafçılıq","Video çekimi":"Video çəkilişi","Video düzenleme":"Video montajı","Grafik tasarım":"Qrafik dizayn","UI/UX tasarım":"UI/UX dizaynı","İllüstrasyon":"İllüstrasiya","Animasyon":"Animasiya","Müzik":"Musiqi","Enstrüman":"Musiqi aləti","Şarkı söyleme":"Mahnı oxuma","Medya":"Media","Gazetecilik":"Jurnalistika","Sosyal medya":"Sosial media","İçerik üretimi":"Məzmun yaradılması","Sunum ve hitabet":"Təqdimat və natiqlik","Yaratıcı yazarlık":"Yaradıcı yazı","Akademik yazım":"Akademik yazı","Öğretmenlik / eğitim":"Müəllimlik / təhsil","Araştırma":"Tədqiqat","Matematik":"Riyaziyyat","Fen bilimleri":"Təbiət elmləri","Tarih":"Tarix","Coğrafya":"Coğrafiya","Psikoloji":"Psixologiya","Sosyoloji":"Sosiologiya","Çizim":"Rəsm","El sanatları":"Əl işləri","Dikiş":"Tikiş","Örgü":"Toxuma","Yemek yapma":"Yemək bişirmə","Dans":"Rəqs","Spor":"İdman","Fitness":"Fitnes","Satranç":"Şahmat","Oyun geliştirme":"Oyun tərtibatı","Kişisel finans":"Şəxsi maliyyə","Kariyer planlama":"Karyera planlaşdırılması","CV hazırlama":"CV hazırlama","Mülakat becerileri":"Müsahibə bacarıqları","İletişim":"Ünsiyyət","Takım çalışması":"Komanda işi","Liderlik":"Liderlik","Zaman yönetimi":"Vaxtın idarə edilməsi","Dil":"Dil","İngilizce":"İngilis dili","Kazakça":"Qazax dili","Kültür":"Mədəniyyət"},"uz":{"Kodlama ve yazılım":"Kodlash va dasturlash","Web geliştirme":"Veb dasturlash","Mobil uygulama geliştirme":"Mobil ilovalar yaratish","Veri analizi":"Ma’lumotlarni tahlil qilish","Yapay zekâ":"Sun’iy intellekt","Siber güvenlik":"Kiberxavfsizlik","Robotik":"Robototexnika","Elektronik":"Elektronika","Ekonomi":"Iqtisodiyot","Finans":"Moliya","Muhasebe":"Buxgalteriya","Girişimcilik":"Tadbirkorlik","Pazarlama":"Marketing","İş geliştirme":"Biznesni rivojlantirish","Proje yönetimi":"Loyihalarni boshqarish","Hukuk":"Huquq","Fotoğrafçılık":"Fotografiya","Video çekimi":"Video suratga olish","Video düzenleme":"Videomontaj","Grafik tasarım":"Grafik dizayn","UI/UX tasarım":"UI/UX dizayn","İllüstrasyon":"Illyustratsiya","Animasyon":"Animatsiya","Müzik":"Musiqa","Enstrüman":"Musiqa asbobi","Şarkı söyleme":"Qo‘shiq kuylash","Medya":"Media","Gazetecilik":"Jurnalistika","Sosyal medya":"Ijtimoiy tarmoqlar","İçerik üretimi":"Kontent yaratish","Sunum ve hitabet":"Taqdimot va notiqlik","Yaratıcı yazarlık":"Ijodiy yozish","Akademik yazım":"Akademik yozish","Öğretmenlik / eğitim":"O‘qituvchilik / ta’lim","Araştırma":"Tadqiqot","Matematik":"Matematika","Fen bilimleri":"Tabiiy fanlar","Tarih":"Tarix","Coğrafya":"Geografiya","Psikoloji":"Psixologiya","Sosyoloji":"Sotsiologiya","Çizim":"Rasm chizish","El sanatları":"Amaliy san’at","Dikiş":"Tikuvchilik","Örgü":"To‘qish","Yemek yapma":"Ovqat tayyorlash","Dans":"Raqs","Spor":"Sport","Fitness":"Fitnes","Satranç":"Shaxmat","Oyun geliştirme":"O‘yin yaratish","Kişisel finans":"Shaxsiy moliya","Kariyer planlama":"Karyerani rejalashtirish","CV hazırlama":"CV tayyorlash","Mülakat becerileri":"Suhbat ko‘nikmalari","İletişim":"Muloqot","Takım çalışması":"Jamoada ishlash","Liderlik":"Liderlik","Zaman yönetimi":"Vaqtni boshqarish","Dil":"Til","İngilizce":"Ingliz tili","Kazakça":"Qozoq tili","Kültür":"Madaniyat"},"kk":{"Kodlama ve yazılım":"Бағдарламалау және кодтау","Web geliştirme":"Веб әзірлеу","Mobil uygulama geliştirme":"Мобильді қосымша әзірлеу","Veri analizi":"Деректерді талдау","Yapay zekâ":"Жасанды интеллект","Siber güvenlik":"Киберқауіпсіздік","Robotik":"Робототехника","Elektronik":"Электроника","Ekonomi":"Экономика","Finans":"Қаржы","Muhasebe":"Бухгалтерлік есеп","Girişimcilik":"Кәсіпкерлік","Pazarlama":"Маркетинг","İş geliştirme":"Бизнесті дамыту","Proje yönetimi":"Жобаларды басқару","Hukuk":"Құқық","Fotoğrafçılık":"Фотосурет","Video çekimi":"Бейне түсіру","Video düzenleme":"Бейне өңдеу","Grafik tasarım":"Графикалық дизайн","UI/UX tasarım":"UI/UX дизайны","İllüstrasyon":"Иллюстрация","Animasyon":"Анимация","Müzik":"Музыка","Enstrüman":"Музыкалық аспап","Şarkı söyleme":"Ән айту","Medya":"Медиа","Gazetecilik":"Журналистика","Sosyal medya":"Әлеуметтік желілер","İçerik üretimi":"Мазмұн жасау","Sunum ve hitabet":"Презентация және шешендік өнер","Yaratıcı yazarlık":"Шығармашылық жазу","Akademik yazım":"Академиялық жазу","Öğretmenlik / eğitim":"Мұғалімдік / білім беру","Araştırma":"Зерттеу","Matematik":"Математика","Fen bilimleri":"Жаратылыстану ғылымдары","Tarih":"Тарих","Coğrafya":"География","Psikoloji":"Психология","Sosyoloji":"Әлеуметтану","Çizim":"Сурет салу","El sanatları":"Қолөнер","Dikiş":"Тігін тігу","Örgü":"Тоқу","Yemek yapma":"Тамақ дайындау","Dans":"Би","Spor":"Спорт","Fitness":"Фитнес","Satranç":"Шахмат","Oyun geliştirme":"Ойын әзірлеу","Kişisel finans":"Жеке қаржы","Kariyer planlama":"Мансапты жоспарлау","CV hazırlama":"Түйіндеме дайындау","Mülakat becerileri":"Сұхбаттасу қабілеттері","İletişim":"Қарым-қатынас","Takım çalışması":"Командалық жұмыс","Liderlik":"Көшбасшылық","Zaman yönetimi":"Уақытты басқару","Dil":"Тіл","İngilizce":"Ағылшын тілі","Kazakça":"Қазақ тілі","Kültür":"Мәдениет"},"tk":{"Kodlama ve yazılım":"Kodlaşdyrma we programma üpjünçiligi","Web geliştirme":"Web işläp düzmek","Mobil uygulama geliştirme":"Mobil goşundy işläp düzmek","Veri analizi":"Maglumat seljermesi","Yapay zekâ":"Emeli aň","Siber güvenlik":"Kiberhowpsuzlyk","Robotik":"Robototehnika","Elektronik":"Elektronika","Ekonomi":"Ykdysadyýet","Finans":"Maliýe","Muhasebe":"Hasapçylyk","Girişimcilik":"Telekeçilik","Pazarlama":"Marketing","İş geliştirme":"Biznesi ösdürmek","Proje yönetimi":"Taslamalary dolandyrmak","Hukuk":"Hukuk","Fotoğrafçılık":"Fotosuratçylyk","Video çekimi":"Wideo düşürmek","Video düzenleme":"Wideo redaktirlemek","Grafik tasarım":"Grafiki dizaýn","UI/UX tasarım":"UI/UX dizaýny","İllüstrasyon":"Illýustrasiýa","Animasyon":"Animasiýa","Müzik":"Aýdym-saz","Enstrüman":"Saz guraly","Şarkı söyleme":"Aýdym aýtmak","Medya":"Media","Gazetecilik":"Žurnalistika","Sosyal medya":"Sosial media","İçerik üretimi":"Mazmun döretmek","Sunum ve hitabet":"Tanyşdyryş we sözleýiş","Yaratıcı yazarlık":"Döredijilikli ýazuw","Akademik yazım":"Akademiki ýazuw","Öğretmenlik / eğitim":"Mugallymçylyk / bilim","Araştırma":"Gözleg","Matematik":"Matematika","Fen bilimleri":"Tebigat ylymlary","Tarih":"Taryh","Coğrafya":"Geografiýa","Psikoloji":"Psihologiýa","Sosyoloji":"Sosiologiýa","Çizim":"Surat çekmek","El sanatları":"El işleri","Dikiş":"Tikinçilik","Örgü":"Örmek","Yemek yapma":"Nahar bişirmek","Dans":"Tans","Spor":"Sport","Fitness":"Fitnes","Satranç":"Şahmat","Oyun geliştirme":"Oýun döretmek","Kişisel finans":"Şahsy maliýe","Kariyer planlama":"Kärýera meýilleşdirmek","CV hazırlama":"CV taýýarlamak","Mülakat becerileri":"Söhbetdeşlik başarnyklary","İletişim":"Aragatnaşyk","Takım çalışması":"Toparlaýyn iş","Liderlik":"Liderlik","Zaman yönetimi":"Wagty dolandyrmak","Dil":"Dil","İngilizce":"Iňlis dili","Kazakça":"Gazak dili","Kültür":"Medeniýet"},"ky":{"Kodlama ve yazılım":"Коддоо жана программалоо","Web geliştirme":"Веб иштеп чыгуу","Mobil uygulama geliştirme":"Мобилдик тиркеме иштеп чыгуу","Veri analizi":"Маалыматтарды талдоо","Yapay zekâ":"Жасалма интеллект","Siber güvenlik":"Киберкоопсуздук","Robotik":"Робототехника","Elektronik":"Электроника","Ekonomi":"Экономика","Finans":"Каржы","Muhasebe":"Бухгалтердик эсеп","Girişimcilik":"Ишкердик","Pazarlama":"Маркетинг","İş geliştirme":"Бизнести өнүктүрүү","Proje yönetimi":"Долбоорлорду башкаруу","Hukuk":"Укук","Fotoğrafçılık":"Сүрөткө тартуу","Video çekimi":"Видео тартуу","Video düzenleme":"Видео монтаждоо","Grafik tasarım":"Графикалык дизайн","UI/UX tasarım":"UI/UX дизайн","İllüstrasyon":"Иллюстрация","Animasyon":"Анимация","Müzik":"Музыка","Enstrüman":"Музыкалык аспап","Şarkı söyleme":"Ырдоо","Medya":"Медиа","Gazetecilik":"Журналистика","Sosyal medya":"Социалдык тармактар","İçerik üretimi":"Мазмун түзүү","Sunum ve hitabet":"Презентация жана чечендик өнөр","Yaratıcı yazarlık":"Чыгармачыл жазуу","Akademik yazım":"Академиялык жазуу","Öğretmenlik / eğitim":"Мугалимдик / билим берүү","Araştırma":"Изилдөө","Matematik":"Математика","Fen bilimleri":"Табигый илимдер","Tarih":"Тарых","Coğrafya":"География","Psikoloji":"Психология","Sosyoloji":"Социология","Çizim":"Сүрөт тартуу","El sanatları":"Кол өнөрчүлүк","Dikiş":"Тигүү","Örgü":"Токуу","Yemek yapma":"Тамак жасоо","Dans":"Бий","Spor":"Спорт","Fitness":"Фитнес","Satranç":"Шахмат","Oyun geliştirme":"Оюн иштеп чыгуу","Kişisel finans":"Жеке каржы","Kariyer planlama":"Карьераны пландаштыруу","CV hazırlama":"CV даярдоо","Mülakat becerileri":"Маектешүү көндүмдөрү","İletişim":"Баарлашуу","Takım çalışması":"Командалык иш","Liderlik":"Лидерлик","Zaman yönetimi":"Убакытты башкаруу","Dil":"Тил","İngilizce":"Англис тили","Kazakça":"Казак тили","Kültür":"Маданият"},"en":{"Kodlama ve yazılım":"Coding and software","Web geliştirme":"Web development","Mobil uygulama geliştirme":"Mobile app development","Veri analizi":"Data analysis","Yapay zekâ":"Artificial intelligence","Siber güvenlik":"Cybersecurity","Robotik":"Robotics","Elektronik":"Electronics","Ekonomi":"Economics","Finans":"Finance","Muhasebe":"Accounting","Girişimcilik":"Entrepreneurship","Pazarlama":"Marketing","İş geliştirme":"Business development","Proje yönetimi":"Project management","Hukuk":"Law","Fotoğrafçılık":"Photography","Video çekimi":"Videography","Video düzenleme":"Video editing","Grafik tasarım":"Graphic design","UI/UX tasarım":"UI/UX design","İllüstrasyon":"Illustration","Animasyon":"Animation","Müzik":"Music","Enstrüman":"Musical instruments","Şarkı söyleme":"Singing","Medya":"Media","Gazetecilik":"Journalism","Sosyal medya":"Social media","İçerik üretimi":"Content creation","Sunum ve hitabet":"Public speaking and presentation","Yaratıcı yazarlık":"Creative writing","Akademik yazım":"Academic writing","Öğretmenlik / eğitim":"Teaching and education","Araştırma":"Research","Matematik":"Mathematics","Fen bilimleri":"Natural sciences","Tarih":"History","Coğrafya":"Geography","Psikoloji":"Psychology","Sosyoloji":"Sociology","Çizim":"Drawing","El sanatları":"Handicrafts","Dikiş":"Sewing","Örgü":"Knitting","Yemek yapma":"Cooking","Dans":"Dance","Spor":"Sports","Fitness":"Fitness","Satranç":"Chess","Oyun geliştirme":"Game development","Kişisel finans":"Personal finance","Kariyer planlama":"Career planning","CV hazırlama":"Resume / CV writing","Mülakat becerileri":"Interview skills","İletişim":"Communication","Takım çalışması":"Teamwork","Liderlik":"Leadership","Zaman yönetimi":"Time management","Dil":"Language","İngilizce":"English","Kazakça":"Kazakh","Kültür":"Culture"}};
  function localizedSkillName(label,lang=(window.TDAI18n?window.TDAI18n.language:'tr')){if(lang==='tr')return label;return (skillTranslations[lang]&&skillTranslations[lang][label])||label;}
  function renderSelected(picker){const box=picker.querySelector('[data-selected]');if(!box)return;box.innerHTML='';(picker._selected||new Set()).forEach(label=>{const chip=document.createElement('span');chip.className='skill-chip';chip.textContent=label;const x=document.createElement('button');x.type='button';x.textContent='×';x.setAttribute('aria-label',window.TDAI18n?.t('selectionRemove')||'Seçimi kaldır');x.onclick=()=>{picker._selected.delete(label);renderSelected(picker);renderSkillPicker(picker);syncSkillHidden(picker)};chip.appendChild(x);box.appendChild(chip)});}
  function syncSkillHidden(picker){const input=picker.parentElement.querySelector('input[type=hidden]');if(input)input.value=[...(picker._selected||new Set())].join(' | ');}
  function renderSkillPicker(picker){
    const category=picker.dataset.category||'languages';const list=picker.querySelector('[data-list]');const other=picker.querySelector('.skill-other');const search=picker.querySelector('[data-skill-search]');const count=picker.querySelector('[data-skill-count]');if(!list)return;
    const q=cleanText(search?.value||'').toLocaleLowerCase();
    if(category==='other'){list.style.display='none';other.classList.add('show');if(search)search.parentElement.style.display='none';if(count)count.textContent='';return;}
    if(search)search.parentElement.style.display='flex';list.style.display='grid';other.classList.remove('show');
    let items=category==='languages'?worldLanguageCatalog.map(x=>[localizedLanguageName(x.c,'tr'),x.c,x.n]):skillCatalog.map(x=>[x[0],x[1],null]);
    if(q)items=items.filter(([label,code,names])=>{const hay=names?Object.values(names).join(' ')+' '+code:label+' '+code+' '+['az','uz','kk','tk','ky','tg'].map(l=>localizedSkillName(label,l)).join(' ');return hay.toLocaleLowerCase().includes(q);});
    const limit=q?100:50;const shown=items.slice(0,limit);if(count){const n=items.length>limit?`${limit} / ${items.length}`:`${items.length}`; const k=items.length>limit?'countShowing':'countResults'; count.textContent=window.TDAI18n?.t(k,{n})||'';}
    list.innerHTML='';const selected=picker._selected||new Set();
    shown.forEach(([label,code,names])=>{const row=document.createElement('label');row.className='skill-option';const cb=document.createElement('input');cb.type='checkbox';cb.value=label;cb.dataset.code=code;cb.checked=selected.has(label);const span=document.createElement('span');span.textContent=category==='languages'?localizedLanguageName(code):localizedSkillName(label);row.append(cb,span);list.appendChild(row);cb.addEventListener('change',()=>{if(cb.checked)selected.add(label);else selected.delete(label);picker._selected=selected;renderSelected(picker);syncSkillHidden(picker);});});
  }
  function initSkillPicker(picker){
    picker._selected=new Set();const head=picker.querySelector('.skill-picker-head');head.addEventListener('click',()=>{picker.classList.toggle('open');head.setAttribute('aria-expanded',picker.classList.contains('open'));});head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();head.click();}});
    picker.querySelectorAll('.skill-tab').forEach(tab=>tab.addEventListener('click',()=>{picker.querySelectorAll('.skill-tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');picker.dataset.category=tab.dataset.category;const search=picker.querySelector('[data-skill-search]');if(search)search.value='';renderSkillPicker(picker);}));
    picker.querySelector('[data-skill-search]')?.addEventListener('input',()=>renderSkillPicker(picker));
    picker.querySelector('[data-other-add]').addEventListener('click',()=>{const input=picker.querySelector('[data-other-input]');const v=cleanText(input.value);if(v){picker._selected.add(v);input.value='';renderSelected(picker);syncSkillHidden(picker);}});
    picker.querySelector('[data-other-input]').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();picker.querySelector('[data-other-add]').click();}});
    renderSkillPicker(picker);renderSelected(picker);
  }
  document.querySelectorAll('.skill-picker').forEach(initSkillPicker);

  // Form sıfırlanınca seçicileri de sıfırla.
  document.getElementById('registerForm')?.addEventListener('reset',()=>setTimeout(()=>document.querySelectorAll('.skill-picker').forEach(p=>{p._selected=new Set();p.dataset.category='languages';p.querySelectorAll('.skill-tab').forEach((t,i)=>t.classList.toggle('active',i===0));renderSkillPicker(p);renderSelected(p);syncSkillHidden(p)}),0));

  // Initialized via window.TDAI18n

  // =========================================================
  // KAYIT / GİRİŞ PROTOTİPİ
  // Kayıt formundaki tüm alanlar saklanır ve örnek giriş yapılabilir.
  // Gerçek projede bu bölüm güvenli bir sunucu/kimlik doğrulama servisine taşınmalıdır.
  // =========================================================
  const registerForm=document.getElementById('registerForm');
  const loginForm=document.getElementById('loginForm');
  function showAuthStatus(id,message){const el=document.getElementById(id);if(el){el.textContent=message;el.className='auth-status show';}}
  // İsteğe bağlı sertifika / belge: prototipte küçük dosyalar localStorage'a örnek olarak kaydedilir.
  const certificateInput=document.getElementById('regCertificate');
  const certificateMeta=document.getElementById('certificateMeta');
  const certificateMetaText=document.getElementById('certificateMetaText');
  const CERT_MAX=3*1024*1024;
  const CERT_TYPES=['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  function clearCertificateUI(){
    if(certificateInput)certificateInput.value='';
    if(certificateMeta){certificateMeta.classList.remove('show');}
    if(certificateMetaText)certificateMetaText.textContent='';
  }
  if(certificateInput){
    certificateInput.addEventListener('change',()=>{
      const file=certificateInput.files?.[0]; if(!file)return;
      const allowed=CERT_TYPES.includes(file.type) || /\.(pdf|jpe?g|png|webp|docx?)$/i.test(file.name);
      if(!allowed){showToast(window.TDAI18n.t('certificateInvalid'),'error');clearCertificateUI();return;}
      if(file.size>CERT_MAX){showToast(window.TDAI18n.t('certificateTooLarge'),'error');clearCertificateUI();return;}
      if(certificateMeta){certificateMeta.classList.add('show');}
      if(certificateMetaText)certificateMetaText.textContent=`${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`;
    });
  }
  function readCertificate(file){
    return new Promise(resolve=>{
      if(!file){resolve(null);return;}
      const reader=new FileReader();
      reader.onload=()=>resolve({name:file.name,type:file.type,size:file.size,dataUrl:String(reader.result||'')});
      reader.onerror=()=>resolve({name:file.name,type:file.type,size:file.size});
      reader.readAsDataURL(file);
    });
  }
  async function hashPassword(pw){
    try{
      if(!window.crypto?.subtle)return null;
      const buf=await window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(pw)));
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }catch(err){return null;}
  }
  if(registerForm){
    registerForm.addEventListener('submit',async e=>{
      e.preventDefault();
      const data=Object.fromEntries(new FormData(registerForm).entries());
      const certFile=certificateInput?.files?.[0]||null;
      if(data.password!==data.password2){showAuthStatus('registerStatus',window.TDAI18n.t('passwordMismatch'));return;}
      delete data.password2;
      delete data.certificate;
      const hash=await hashPassword(data.password);
      if(hash){data.passwordHash=hash;delete data.password;}
      data.certificate=await readCertificate(certFile);
      data.createdAt=new Date().toISOString();
      if(!data.studentId)data.studentId=generateStudentId(data.country);
      if(data.points==null)data.points=2.5;
      try{localStorage.setItem('tda-demo-user',JSON.stringify(data));}catch(err){}
      try{localStorage.setItem('tda-session',data.email);}catch(err){}
      showAuthStatus('registerStatus',window.TDAI18n.t('registrationSuccess'));
      registerForm.reset();
      window.renderMyStudentId?.();
      window.renderAuthState?.();
    });
  }
  if(loginForm){
    loginForm.addEventListener('submit',async e=>{
      e.preventDefault();
      const data=Object.fromEntries(new FormData(loginForm).entries());
      let user=null; try{user=JSON.parse(localStorage.getItem('tda-demo-user')||'null');}catch(err){}
      let passwordOk=false;
      if(user && user.email===data.email){
        if(user.passwordHash){const inputHash=await hashPassword(data.password);passwordOk=!!inputHash&&inputHash===user.passwordHash;}
        else if(user.password!==undefined){passwordOk=user.password===data.password;}
      }
      if(passwordOk){
        try{localStorage.setItem('tda-session',data.email);}catch(err){}
        showAuthStatus('loginStatus',window.TDAI18n.t('loginSuccess',{name:user.firstName||window.TDAI18n.t('studentFallback')}));
        window.renderMyStudentId?.();
        window.renderAuthState?.();
      }else{
        showAuthStatus('loginStatus',window.TDAI18n.t('loginNotFound'));
      }
    });
  }




const COUNTRIES=[
 {name:'Türkiye',flag:'assets/flags/Flag_of_Turkey.svg'},
 {name:'Azerbaycan',flag:'assets/flags/Flag_of_Azerbaijan.svg'},
 {name:'Kazakistan',flag:'assets/flags/Flag_of_Kazakhstan.svg'},
 {name:'Özbekistan',flag:'assets/flags/Flag_of_Uzbekistan.svg'},
 {name:'Kırgızistan',flag:'assets/flags/Flag_of_Kyrgyzstan.svg'},
 {name:'Türkmenistan',flag:'assets/flags/Flag_of_Turkmenistan.svg'},
 {name:'Kuzey Kıbrıs Türk Cumhuriyeti',flag:'assets/flags/Flag_of_the_Turkish_Republic_of_Northern_Cyprus.svg'}
];
const DEMO_USERS=[
 {id:'u1',studentId:'TDA-DEMO-001',name:'Aylin Yılmaz',country:'Türkiye',languages:['Türkçe','İngilizce'],teach:['Excel','Ekonomi','Türkçe','Sunum ve hitabet'],learn:['Kazakça','Python','Grafik tasarım'],level:'İleri',availability:'Hafta içi',points:2.5,verified:true},
 {id:'u2',studentId:'TDA-DEMO-002',name:'Leyla Məmmədova',country:'Azerbaycan',languages:['Azərbaycanca','Türkçe','İngilizce'],teach:['Grafik tasarım','UI/UX tasarım','Türkçe'],learn:['Excel','Kodlama ve yazılım'],level:'İleri',availability:'Akşam',points:1.4,verified:true},
 {id:'u3',studentId:'TDA-DEMO-003',name:'Aruzhan Sarsenova',country:'Kazakistan',languages:['Қазақша','Türkçe','İngilizce'],teach:['Kodlama ve yazılım','Veri analizi','Matematik'],learn:['Kazakça','Ekonomi','Sunum ve hitabet'],level:'Orta',availability:'Hafta içi',points:1.1,verified:true},
 {id:'u4',studentId:'TDA-DEMO-004',name:'Dilnoza Karimova',country:'Özbekistan',languages:['O‘zbekcha','Türkçe'],teach:['Girişimcilik','Pazarlama','İngilizce'],learn:['Grafik tasarım','Türkçe'],level:'Orta',availability:'Hafta sonu',points:0,verified:true},
 {id:'u5',studentId:'TDA-DEMO-005',name:'Aizada Turgunbaeva',country:'Kırgızistan',languages:['Кыргызча','Türkçe'],teach:['Medya','Fotoğrafçılık','Türkçe'],learn:['Video düzenleme','İngilizce'],level:'Başlangıç',availability:'Akşam',points:0,verified:true},
 {id:'u6',studentId:'TDA-DEMO-006',name:'Mähri Orazowa',country:'Türkmenistan',languages:['Türkmençe','Türkçe'],teach:['Yaratıcı yazarlık','Akademik yazım','Dil'],learn:['Pazarlama','Sunum ve hitabet'],level:'İleri',availability:'Hafta sonu',points:1.8,verified:true},
 {id:'u7',studentId:'TDA-DEMO-007',name:'Elif Demir',country:'Kuzey Kıbrıs Türk Cumhuriyeti',languages:['Türkçe','İngilizce'],teach:['Kültür','Araştırma','Sunum ve hitabet'],learn:['Kodlama ve yazılım','Veri analizi'],level:'Orta',availability:'Hafta içi',points:0,verified:true}
];
const ARTICLES_DEFAULT=[
 {id:'a1',title:'Türk Dünyasında Öğrenci Becerilerinin Dijital Paylaşımı',country:'Türkiye',author:'Aylin Yılmaz',category:'Akademik',body:'Beceri paylaşımı, öğrencilerin yalnızca bilgi edinmesini değil, sahip oldukları bilgiyi başka bir öğrencinin öğrenme sürecine aktarmasını da mümkün kılar. Dijital ağlar bu süreci sınırlar ötesine taşıyabilir.'},
 {id:'a2',title:'Azerbaycanlı Öğrencilerde Tasarım Öğrenme Kültürü',country:'Azerbaycan',author:'Leyla Məmmədova',category:'Kültür',body:'Tasarım becerilerinin akranlar arasında paylaşılması, farklı eğitim deneyimlerinin karşılaştırılmasına ve ortak üretim kültürünün gelişmesine katkı sağlayabilir.'},
 {id:'a3',title:'Kazakistan ve Veri Okuryazarlığı Üzerine Öğrenci Notları',country:'Kazakistan',author:'Aruzhan Sarsenova',category:'Eğitim',body:'Veri analizi öğrenirken temel kavramları küçük uygulamalarla pekiştirmek, öğrencilerin teknik becerileri daha sürdürülebilir biçimde geliştirmesine yardımcı olabilir.'},
 {id:'a4',title:'Özbekistan’da Girişimcilik Öğrenmenin Öğrenci Boyutu',country:'Özbekistan',author:'Dilnoza Karimova',category:'Öğrenci Deneyimi',body:'Girişimcilik eğitimi yalnızca iş fikri üretmekten ibaret değildir. Öğrencinin problem tanımlama, iletişim ve küçük denemeler yapma becerileri de sürecin parçasıdır.'},
 {id:'a5',title:'Kırgızistan ile Medya Becerilerinde Akran Öğrenimi',country:'Kırgızistan',author:'Aizada Turgunbaeva',category:'Medya',body:'Medya becerileri üzerinde çalışan öğrenciler, kısa video ve fotoğraf projeleri üzerinden birbirlerine geri bildirim vererek öğrenme sürecini uygulamalı hâle getirebilir.'},
 {id:'a6',title:'Türkmenistanlı Öğrenciler İçin Akademik Yazım Deneyimi',country:'Türkmenistan',author:'Mähri Orazowa',category:'Akademik',body:'Akademik yazımda kaynak düzeni, açık anlatım ve argüman kurma gibi temel becerilerin küçük geri bildirim döngüleriyle geliştirilmesi öğrencinin özgüvenini destekleyebilir.'},
 {id:'a7',title:'Kuzey Kıbrıs’ta Kültürlerarası Öğrenci Bağları',country:'Kuzey Kıbrıs Türk Cumhuriyeti',author:'Elif Demir',category:'Kültür',body:'Öğrenciler arasında kültür ve eğitim deneyimlerinin paylaşılması, farklı ülkelerden gelen katılımcıların birbirlerini daha yakından tanımasına ve ortak öğrenme alanları oluşturmasına yardımcı olabilir.'}
];
const SKILL_OPTIONS=[...new Set(DEMO_USERS.flatMap(u=>[...u.teach,...u.learn]))].sort((a,b)=>a.localeCompare(b,'tr'));
const LANG_OPTIONS=[...new Set(DEMO_USERS.flatMap(u=>u.languages))];
const $=id=>document.getElementById(id);
function featureT(k,vars={}){return window.TDAI18n ? window.TDAI18n.t(k,vars) : k;}
function countryLabel(c){return (window.TDAI18n && window.TDAI18n.t(c)) || c;}
function categoryLabel(cat){const m={'Akademik':'catAcademic','Kültür':'catCulture','Eğitim':'catEducation','Teknoloji':'catTech','Öğrenci Deneyimi':'catStudentExp','Medya':'catMedia'};const k=m[cat];return k?featureT(k):cat;}
function levelLabel(v){const m={'Başlangıç':'beginner','Orta':'intermediate','İleri':'advanced'};const k=m[v];return k?featureT(k):v;}
function availabilityLabel(v){const m={'Hafta içi':'weekdays','Hafta sonu':'weekends','Akşam':'evenings'};const k=m[v];return k?featureT(k):v;}
function skillLabel(c){const v=localizedSkillName?localizedSkillName(c,(window.TDAI18n?window.TDAI18n.language:'tr')):c;return String(v).startsWith('⟦MISSING_SKILL:')?c:v}
function populateSelect(id,items,allKey='anyOption',labelFn=skillLabel){const el=$(id);if(!el)return;const val=el.value;el.innerHTML='';const first=document.createElement('option');first.value='';first.textContent=featureT(allKey);el.appendChild(first);items.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=labelFn(x);el.appendChild(o)});el.value=items.includes(val)?val:''}
function populateMatchControls(){populateSelect('matchTeach',SKILL_OPTIONS);populateSelect('matchLearn',SKILL_OPTIONS);populateSelect('matchCountry',COUNTRIES.map(c=>c.name),'allCountries',countryLabel);populateSelect('matchLanguage',LANG_OPTIONS);const sort=$('matchSort');if(sort){const v=sort.value;sort.innerHTML=`<option value="score">${featureT('scoreSort')}</option><option value="rating">${featureT('ratingSort')}</option>`;sort.value=v||'score'}}
function monthKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function formatDate(value){const locales={tr:'tr-TR',az:'az-AZ',uz:'uz-UZ',kk:'kk-KZ',tk:'tk-TM',ky:'ky-KG',en:'en-GB'};const lang=(window.TDAI18n&&window.TDAI18n.language)||'tr';const locale=locales[lang]||'tr-TR';try{return new Date(value).toLocaleDateString(locale)}catch(e){return new Date(value).toLocaleDateString('tr-TR')}}
function readJSON(k,fallback){try{const v=JSON.parse(localStorage.getItem(k));return v??fallback}catch(e){return fallback}}
function writeJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function generateStudentId(country=''){const prefix=({Türkiye:'TR',Azerbaycan:'AZ',Özbekistan:'UZ',Kazakistan:'KZ','Kuzey Kıbrıs Türk Cumhuriyeti':'KKTC',Türkmenistan:'TM',Kırgızistan:'KG'}[country]||'TD');return `TDA-${prefix}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;}
function ensureStudentId(user){if(!user)return null;if(!user.studentId){user.studentId=generateStudentId(user.country);try{localStorage.setItem('tda-demo-user',JSON.stringify(user));}catch(e){}}return user;}
function getProfile(){const u=readJSON('tda-demo-user',null);if(!u)return null;ensureStudentId(u);return {...u,points:Number(u.points??0)} }
function getRating(id){const rs=readJSON('tda-reviews',[]).filter(r=>r.userId===id);if(!rs.length)return {avg:null,count:0};return {avg:rs.reduce((a,b)=>a+b.rating,0)/rs.length,count:rs.length}}
function scoreMatch(me,c,filters){let score=0;const reasons=[];const teachNeed=filters.learn;const learnNeed=filters.teach;
 if(teachNeed&&c.teach.includes(teachNeed)){score+=35;reasons.push(featureT('skillsMatch'))}
 else if(!teachNeed){score+=15}
 if(learnNeed&&c.learn.includes(learnNeed)){score+=20;reasons.push(featureT('skillsMatch'))}
 else if(!learnNeed){score+=10}
 const lang=filters.language; if(lang&&c.languages.includes(lang)){score+=15;reasons.push(featureT('languageMatch'))} else if(!lang){score+=8}
 if(filters.country&&c.country===filters.country){score+=10;reasons.push(featureT('countryMatch'))} else if(!filters.country){score+=4}
 if(filters.level&&c.level===filters.level){score+=10;reasons.push(featureT('levelMatch'))} else if(!filters.level){score+=5}
 if(filters.availability&&c.availability===filters.availability){score+=10;reasons.push(featureT('availabilityMatch'))} else if(!filters.availability){score+=5}
 const rating=getRating(c.id);return {...c,score:Math.min(100,score),rating:rating.avg,reviews:rating.count,reasons};}
function renderMatches(){const box=$('matchResults');if(!box)return;const filters={teach:$('matchTeach').value,learn:$('matchLearn').value,country:$('matchCountry').value,language:$('matchLanguage').value,level:$('matchLevel').value,availability:$('matchAvailability').value};const mode=$('matchMode').value;let list=DEMO_USERS.map(u=>scoreMatch(getProfile(),u,filters)).filter(u=>!filters.country||u.country===filters.country).filter(u=>!filters.language||u.languages.includes(filters.language)).filter(u=>!filters.level||u.level===filters.level).filter(u=>!filters.availability||u.availability===filters.availability);
 if(filters.teach)list=list.filter(u=>u.learn.includes(filters.teach));
 if(filters.learn)list=list.filter(u=>u.teach.includes(filters.learn));
 list.sort((a,b)=>($('matchSort').value==='rating'?(b.rating??-1)-(a.rating??-1):b.score-a.score));
 if(mode==='auto')list=list.slice(0,3); if(!list.length){box.innerHTML=`<div class="empty-state">${featureT('noMatches')}</div>`;return}
 box.innerHTML=list.map(u=>{const r=u.rating?`${u.rating.toFixed(1)} / 5 · ${u.reviews} ${featureT('reviews')}`:featureT('noReviews');return `<article class="match-card"><div class="match-top"><div><h3 style="margin:0">${escapeHtml(u.name)}</h3><div class="match-meta">${escapeHtml(countryLabel(u.country))} · ${escapeHtml(levelLabel(u.level))} · ${escapeHtml(availabilityLabel(u.availability))}</div></div><div class="match-score">${u.score}%</div></div><div class="match-tags">${u.teach.slice(0,3).map(x=>`<span>${escapeHtml(skillLabel(x))}</span>`).join('')}</div><div class="match-meta">⭐ ${r}</div><div class="match-reason"><strong>${featureT('whyMatch')}:</strong> ${u.reasons.length?u.reasons.join(' · '):featureT('demo')}</div><button class="ghost-btn" style="margin-top:11px" data-review-user="${u.id}">${featureT('rating')}</button></article>`}).join('');box.querySelectorAll('[data-review-user]').forEach(b=>b.onclick=()=>openReview(b.dataset.reviewUser));}
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
function renderReviews(){const box=$('reviewList');if(!box)return;const rs=readJSON('tda-reviews',[]);if(!rs.length){box.innerHTML=`<div class="empty-state">${featureT('noReviews')}</div>`;return}box.innerHTML=rs.slice().reverse().map(r=>`<div class="review-item"><strong>${escapeHtml(r.author||'Öğrenci')}</strong> · ${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}<br>${escapeHtml(r.text||'')}</div>`).join('')}
function showToast(message,type){
  let t=document.getElementById('tdaToast');
  if(!t){
    t=document.createElement('div');
    t.id='tdaToast';
    t.style.cssText='position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#102343;color:#fff;padding:12px 24px;border-radius:30px;box-shadow:0 10px 30px rgba(0,0,0,.25);z-index:99999;font-size:14px;font-weight:700;transition:opacity .3s ease,transform .3s ease,background .2s ease;opacity:0;pointer-events:none;';
    document.body.appendChild(t);
  }
  t.textContent=message;
  t.style.background=(type==='error')?'#7f2417':'#102343';
  t.style.opacity='1';
  t.style.transform='translateX(-50%) translateY(0)';
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(-50%) translateY(10px)';}, 2800);
}
window.showToast=showToast;

function updateReviewStars(val){
  const stars=document.querySelectorAll('#reviewStarRating span');
  stars.forEach((s,i)=>{ s.style.color=(i<val)?'#f5cf79':'#cbd5e1'; });
}

function openReview(userId){
  const u=DEMO_USERS.find(x=>x.id===userId); if(!u)return;
  const modal=document.getElementById('reviewModalBackdrop'); if(!modal)return;
  document.getElementById('reviewTargetUserId').value=u.id;
  document.getElementById('reviewTargetUserName').textContent=u.name;
  document.getElementById('reviewTargetUserMeta').textContent=`${countryLabel(u.country)} · ${levelLabel(u.level)} · ${availabilityLabel(u.availability)}`;
  document.getElementById('reviewRatingValue').value='5';
  document.getElementById('reviewModalComment').value='';
  updateReviewStars(5);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  window.tdaFocusTrap.open(modal,{trigger:document.activeElement});
}

function closeReviewModal(){
  const modal=document.getElementById('reviewModalBackdrop');
  if(modal){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');window.tdaFocusTrap.close(modal);}
}
window.openReview=openReview;
window.closeReviewModal=closeReviewModal;

document.addEventListener('DOMContentLoaded', function(){
document.querySelectorAll('#reviewStarRating span').forEach(s=>{
  s.addEventListener('click',()=>{
    const val=parseInt(s.dataset.star,10)||5;
    document.getElementById('reviewRatingValue').value=val;
    updateReviewStars(val);
  });
});

document.getElementById('reviewModalForm')?.addEventListener('submit',e=>{
  e.preventDefault();
  const userId=document.getElementById('reviewTargetUserId').value;
  const rating=parseInt(document.getElementById('reviewRatingValue').value,10)||5;
  const comment=document.getElementById('reviewModalComment').value.trim();
  const rs=readJSON('tda-reviews',[]);
  const author=getProfile()?.firstName||featureT('demo');
  rs.push({id:Date.now(),userId,author,rating,text:comment,date:new Date().toISOString()});
  writeJSON('tda-reviews',rs);
  closeReviewModal();
  renderReviews();
  renderMatches();
  showToast(featureT('reviewSaved'));
});

document.addEventListener('click',e=>{if(e.target===document.getElementById('reviewModalBackdrop'))closeReviewModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeReviewModal();});
});

function renderCommunities(){const box=$('countryCommunities');if(!box)return;const reqs=readJSON('tda-support-requests',[]);const profile=getProfile();box.innerHTML=COUNTRIES.map(c=>{const count=reqs.filter(r=>r.country===c.name&&r.status==='open').length;const canRequest=!!profile&&profile.country===c.name;return `<div class="country-card"><div class="country-head"><img class="country-flag" src="${c.flag}" alt="${escapeHtml(c.name)} bayrağı"><h3>${escapeHtml(countryLabel(c.name))}</h3></div><div class="country-stat">${count} ${featureT('supportRequests').toLocaleLowerCase()}</div><button class="ghost-btn" data-country="${escapeHtml(c.name)}" ${canRequest?'':'disabled'}>${featureT('requestOnePoint')}</button></div>`}).join('');box.querySelectorAll('[data-country]').forEach(b=>b.onclick=()=>createRequest());renderSupportRequests();}
function receivedThisMonth(){const profile=getProfile();if(!profile)return 0;const key=monthKey();return readJSON('tda-point-transfers',[]).filter(x=>x.to===profile.email&&x.month===key).reduce((a,b)=>a+Number(b.amount||0),0)}
function findUserByStudentId(studentId){const id=String(studentId||'').trim().toUpperCase();if(!id)return null;const p=getProfile();if(p&&String(p.studentId||'').toUpperCase()===id)return p;const demo=DEMO_USERS.find(u=>String(u.studentId||'').toUpperCase()===id);return demo||null;}
function renderMyStudentId(){const el=$('myStudentIdValue');if(!el)return;const p=getProfile();el.textContent=p?.studentId||'—';}
window.renderMyStudentId=renderMyStudentId;
function setDonationStatus(msg,type=''){const el=$('donationStatus');if(!el)return;el.textContent=msg;el.className='donation-status'+(type?' '+type:'');}
function donateByStudentId(){const p=getProfile();if(!p){showToast(featureT('profileRequired'),'error');return}const recipientId=$('donationRecipientId')?.value?.trim();const amount=Number($('donationAmount')?.value||1);if(!recipientId){setDonationStatus(featureT('donationRecipientNotFound'),'error');return}if(!Number.isFinite(amount)||amount<=0||amount>10||Math.round(amount*2)!==amount*2){setDonationStatus(featureT('donationAmountInvalid'),'error');return}const recipient=findUserByStudentId(recipientId);if(!recipient){setDonationStatus(featureT('donationRecipientNotFound'),'error');return}if(String(recipient.studentId||'').toUpperCase()===String(p.studentId||'').toUpperCase()){setDonationStatus(featureT('donationSelf'),'error');return}if(Number(p.points||0)<amount){showToast(featureT('insufficientPoints'),'error');return}p.points=Number(p.points)-amount;try{localStorage.setItem('tda-demo-user',JSON.stringify(p));}catch(e){}
const transfers=readJSON('tda-point-transfers',[]);transfers.push({id:Date.now(),from:p.studentId,fromEmail:p.email,to:recipient.studentId,toEmail:recipient.email||null,amount,month:monthKey(),createdAt:new Date().toISOString(),type:'direct-id-donation'});writeJSON('tda-point-transfers',transfers);
if(recipient.email===p.email){}else if(recipient.email){const saved=readJSON('tda-demo-user',null);if(saved&&saved.email===recipient.email){saved.points=Number(saved.points||0)+amount;writeJSON('tda-demo-user',saved);}}
renderMyStudentId();setDonationStatus(`${featureT('donationSuccess')} ${recipient.studentId}`,'ok');}
function renderSupportRequests(){const box=$('supportRequests'),lim=$('supportLimit');if(!box||!lim)return;const profile=getProfile();const received=receivedThisMonth();lim.textContent=`${featureT('monthlyLimit')}: ${Math.max(0,2-received)} ${featureT('points')} (2 ${featureT('points')} / ${monthKey()})`;const reqs=readJSON('tda-support-requests',[]).filter(r=>r.status==='open');if(!reqs.length){box.innerHTML=`<div class="empty-state">${featureT('noRequests')}</div>`;return}box.innerHTML=reqs.map(r=>`<div class="request-card"><div><strong>${escapeHtml(r.name)}</strong><small>${escapeHtml(countryLabel(r.country))} · ID: ${escapeHtml(r.studentId||'—')} · ${escapeHtml(formatDate(r.createdAt))}</small></div><div class="request-actions">${profile&&profile.email!==r.email&&received<2&&Number(profile.points||0)>=1?`<button class="ghost-btn" data-donate="${r.id}">${featureT('donate')}</button>`:''}</div></div>`).join('');box.querySelectorAll('[data-donate]').forEach(b=>b.onclick=()=>donatePoint(b.dataset.donate));}
function createRequest(){const p=getProfile();if(!p){showToast(featureT('profileRequired'),'error');return}if(Number(p.points||0)!==0){showToast(featureT('requestDenied'),'error');return}const country=p.country;const reqs=readJSON('tda-support-requests',[]);if(reqs.some(r=>r.email===p.email&&r.status==='open')){showToast(featureT('requestCreated'));return}reqs.push({id:'r'+Date.now(),studentId:p.studentId,name:`${p.firstName||''} ${p.lastName||''}`.trim()||featureT('demo'),email:p.email,country,amount:1,status:'open',createdAt:new Date().toISOString()});writeJSON('tda-support-requests',reqs);renderCommunities();showToast(featureT('requestCreated'));}
function donatePoint(requestId){const p=getProfile();const reqs=readJSON('tda-support-requests',[]);const r=reqs.find(x=>x.id===requestId&&x.status==='open');if(!p||!r)return;const received=readJSON('tda-point-transfers',[]).filter(x=>x.to===r.email&&x.month===monthKey()).reduce((a,b)=>a+Number(b.amount||0),0);if(received>=2){showToast(featureT('supportLimitReached'),'error');return}if(Number(p.points||0)<1){showToast(featureT('insufficientPoints'),'error');return}p.points=Number(p.points)-1;writeJSON('tda-demo-user',p);const transfers=readJSON('tda-point-transfers',[]);transfers.push({id:Date.now(),from:p.email,to:r.email,amount:1,month:monthKey(),createdAt:new Date().toISOString()});writeJSON('tda-point-transfers',transfers);const nowReceived=received+1;if(nowReceived>=2)r.status='closed';writeJSON('tda-support-requests',reqs);renderSupportRequests();showToast(featureT('donationDone'));}

function seedArticleField(a,field){if(!/^a[1-7]$/.test(a.id))return a[field];const key='articleA'+a.id.slice(1).toUpperCase()+(field==='title'?'Title':'Body');return featureT(key)}
function renderArticles(){const tabs=$('articleTabs'),grid=$('articleGrid');if(!tabs||!grid)return;const selected=tabs.dataset.selected||'';tabs.innerHTML='';const all=[{name:'',label:featureT('allArticles')},...COUNTRIES.map(c=>({name:c.name,label:countryLabel(c.name)}))];all.forEach(x=>{const b=document.createElement('button');b.className='article-tab'+(x.name===selected?' active':'');b.textContent=x.label;b.onclick=()=>{tabs.dataset.selected=x.name;renderArticles()};tabs.appendChild(b)});const articles=readJSON('tda-articles',ARTICLES_DEFAULT);const filtered=selected?articles.filter(a=>a.country===selected):articles;if(!filtered.length){grid.innerHTML=`<div class="empty-state">${featureT('noArticles')}</div>`;return}grid.innerHTML=filtered.slice().reverse().map(a=>`<article class="article-card"><h3>${escapeHtml(seedArticleField(a,'title'))}</h3><p>${escapeHtml(seedArticleField(a,'body'))}</p><div class="article-country">${escapeHtml(countryLabel(a.country))} · ${escapeHtml(categoryLabel(a.category))}</div><div class="article-byline">${escapeHtml(a.author)} · ${formatDate(a.createdAt||Date.now())}</div></article>`).join('')}
function articleCountryFromProfile(){return getProfile()?.country||''}
$('articleForm')?.addEventListener('submit',e=>{e.preventDefault();const p=getProfile();const country=articleCountryFromProfile();if(!p||!country){showToast(featureT('profileRequired'),'error');return}const title=$('articleTitle').value.trim(),body=$('articleBody').value.trim(),category=$('articleCategory').value;const arr=readJSON('tda-articles',ARTICLES_DEFAULT);arr.push({id:'a'+Date.now(),title,body,category,country,author:`${p.firstName||''} ${p.lastName||''}`.trim()||featureT('demo'),createdAt:new Date().toISOString()});writeJSON('tda-articles',arr);e.target.reset();const st=$('articleStatus');st.style.display='block';st.textContent=featureT('articlePublished');renderArticles();});

$('requestPointBtn')?.addEventListener('click',()=>createRequest());
$('donateByIdBtn')?.addEventListener('click',donateByStudentId);
renderMyStudentId();

$('runMatch')?.addEventListener('click',renderMatches);$('clearMatch')?.addEventListener('click',()=>{['matchTeach','matchLearn','matchCountry','matchLanguage','matchLevel','matchAvailability'].forEach(id=>{if($(id))$(id).value=''});$('matchMode').value='manual';renderMatches()});
function rerenderFeatureLanguage(){populateMatchControls();renderMatches();renderReviews();renderCommunities();renderArticles();}
// applyLanguage zaten mevcut select'i ve sayfayı yeniliyor; dinamik katmanı da güvenli biçimde yenile.
if(window.TDAI18n){window.TDAI18n.onChange(()=>rerenderFeatureLanguage());}
// İlk yükleme
populateMatchControls();renderMatches();renderReviews();renderCommunities();renderArticles();
})();
