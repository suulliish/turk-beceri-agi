/* Türk Dünyası Beceri Ağı — sekme kabuğu
   Uzun tek sayfa yerine yedi bölüm: bölümler çalışma anında panellere taşınır,
   böylece markup tek kaynak olarak kalır ve eski çapa bağlantıları çalışmaya devam eder. */
(function () {
  if (document.body.dataset.tabShellReady === 'true') return;

  const header = document.querySelector('header');
  const hero = document.querySelector('.hero');
  if (!header || !hero) return;

  const TAB_IDS = ['home', 'journey', 'matching', 'community', 'articles', 'profile', 'turan'];

  const TAB_LABELS = {
    tr: ['Ana Sayfa / Hakkında', 'Nasıl Çalışır? / Öğrenci Yolculuğu', 'Akıllı Eşleştirme', 'Topluluk', 'Makaleler', 'Öğrenci Profilim', 'Turan AI Asistanı'],
    az: ['Ana səhifə / Haqqında', 'Necə işləyir? / Tələbə səyahəti', 'Ağıllı uyğunlaşdırma', 'İcma', 'Məqalələr', 'Tələbə profilim', 'Turan AI köməkçisi'],
    uz: ['Bosh sahifa / Loyiha haqida', 'Qanday ishlaydi? / Talabaning yoʻli', 'Aqlli moslashtirish', 'Hamjamiyat', 'Maqolalar', 'Talaba profilim', 'Turan AI yordamchisi'],
    kk: ['Басты бет / Жоба туралы', 'Қалай жұмыс істейді? / Студенттің жолы', 'Ақылды сәйкестендіру', 'Қауымдастық', 'Мақалалар', 'Студент профилім', 'Turan AI көмекшісі'],
    tk: ['Baş sahypa / Taslama barada', 'Nähili işleýär? / Talybyň ýoly', 'Akylly gabatlaşdyrma', 'Jemgyýet', 'Makalalar', 'Talyp profilim', 'Turan AI kömekçisi'],
    ky: ['Башкы бет / Долбоор жөнүндө', 'Кантип иштейт? / Студенттин жолу', 'Акылдуу дал келтирүү', 'Коомчулук', 'Макалалар', 'Студент профилим', 'Turan AI жардамчысы'],
    en: ['Home / About', 'How It Works / Student Journey', 'Smart Matching', 'Community', 'Articles', 'My Student Profile', 'Turan AI Assistant']
  };
  const TAB_ARIA = { tr: 'Ana bölümler', az: 'Əsas bölmələr', uz: 'Asosiy boʻlimlar', kk: 'Негізгі бөлімдер', tk: 'Esasy bölümler', ky: 'Негизги бөлүмдөр', en: 'Main sections' };
  const QUICK_ARIA = { tr: 'Hızlı erişim', az: 'Sürətli giriş', uz: 'Tezkor kirish', kk: 'Жылдам қолжетімділік', tk: 'Çalt giriş', ky: 'Ыкчам жетүү', en: 'Quick access' };
  const QUICK = {
    tr: [['journey', 'Öğrenci Yolculuğu', 'Sistemi adım adım keşfet'], ['matching', 'Akıllı Eşleştirme', 'Sana uygun öğrencileri bul'], ['turan', 'Turan AI Asistanı', 'Sorularına hızlıca yanıt al']],
    az: [['journey', 'Tələbə səyahəti', 'Sistemi addım-addım kəşf et'], ['matching', 'Ağıllı uyğunlaşdırma', 'Sənə uyğun tələbələri tap'], ['turan', 'Turan AI köməkçisi', 'Suallarına tez cavab al']],
    uz: [['journey', 'Talabaning yoʻli', 'Tizimni bosqichma-bosqich koʻr'], ['matching', 'Aqlli moslashtirish', 'Senga mos talabalarni top'], ['turan', 'Turan AI yordamchisi', 'Savollaringga tez javob ol']],
    kk: [['journey', 'Студенттің жолы', 'Жүйені қадам-қадаммен зерттеңіз'], ['matching', 'Ақылды сәйкестендіру', 'Сізге сай студенттерді табыңыз'], ['turan', 'Turan AI көмекшісі', 'Сұрақтарыңызға жылдам жауап алыңыз']],
    tk: [['journey', 'Talybyň ýoly', 'Ulgamy ädimme-ädim öwren'], ['matching', 'Akylly gabatlaşdyrma', 'Saňa laýyk talyplary tap'], ['turan', 'Turan AI kömekçisi', 'Soraglaryňa çalt jogap al']],
    ky: [['journey', 'Студенттин жолу', 'Системаны кадам сайын изилде'], ['matching', 'Акылдуу дал келтирүү', 'Сага ылайыктуу студенттерди тап'], ['turan', 'Turan AI жардамчысы', 'Сурооңа тез жооп ал']],
    en: [['journey', 'Student Journey', 'Explore the system step by step'], ['matching', 'Smart Matching', 'Find students who fit your needs'], ['turan', 'Turan AI Assistant', 'Get quick answers to your questions']]
  };
  // hangi bölüm hangi sekmede durur; listede olmayan bölüm ana sayfaya düşer
  const SECTION_OWNER = { nasil: 'journey', yol: 'journey', eslesme: 'matching', topluluk: 'community', makaleler: 'articles', profil: 'profile' };

  const lang = () => (window.TDAI18n && window.TDAI18n.language) || document.documentElement.lang || 'tr';
  const pick = (map) => map[lang()] || map.en;

  // --- iskelet ---
  const bar = document.createElement('div');
  bar.className = 'tab-bar';
  const tabNav = document.createElement('div');
  tabNav.className = 'tab-nav';
  tabNav.setAttribute('role', 'tablist');
  bar.appendChild(tabNav);

  const app = document.createElement('main');
  app.id = 'tabApp';

  const panels = {};
  const buttons = TAB_IDS.map((id) => {
    const panel = document.createElement('div');
    panel.id = 'tab-' + id;
    panel.className = 'tab-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'tab-button-' + id);
    app.appendChild(panel);
    panels[id] = panel;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'tab-button-' + id;
    btn.className = 'tab-button';
    btn.dataset.tab = id;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-controls', 'tab-' + id);
    tabNav.appendChild(btn);
    return btn;
  });

  // --- içeriği panellere dağıt ---
  const stacks = {};
  TAB_IDS.forEach((id) => {
    const s = document.createElement('div');
    s.className = 'section-stack';
    stacks[id] = s;
  });

  panels.home.appendChild(hero);
  const quick = document.createElement('div');
  quick.className = 'quick-access';
  panels.home.appendChild(quick);

  document.querySelectorAll('body > section').forEach((section) => {
    const owner = SECTION_OWNER[section.id] || 'home';
    section.dataset.tabOwner = owner;
    stacks[owner].appendChild(section);
  });
  TAB_IDS.forEach((id) => panels[id].appendChild(stacks[id]));

  // Turan kendi sekmesine gömülür, yüzen düğme sayfada kalır
  const turan = document.getElementById('turanPanel');
  if (turan) {
    turan.classList.add('embedded');
    panels.turan.insertBefore(turan, stacks.turan);
  }

  header.after(bar);
  bar.after(app);

  // sabit çubuğun yüksekliği düzen hesaplarına verilir
  const syncBarHeight = () => document.documentElement.style.setProperty('--tabbar-height', bar.offsetHeight + 'px');
  syncBarHeight();
  window.addEventListener('resize', () => requestAnimationFrame(syncBarHeight));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncBarHeight);
  document.body.dataset.tabShellReady = 'true';
  document.body.classList.add('tabs-on');

  // --- etiketler ---
  function setLabels() {
    const labels = pick(TAB_LABELS);
    buttons.forEach((b, i) => { b.textContent = labels[i]; });
    tabNav.setAttribute('aria-label', pick(TAB_ARIA));
    quick.setAttribute('aria-label', pick(QUICK_ARIA));
    quick.innerHTML = pick(QUICK)
      .map(([id, title, desc]) => `<button type="button" data-quick-tab="${id}">${title}<small>${desc}</small></button>`)
      .join('');
  }

  // --- sekme değiştirme ---
  let current = 'home';
  function setTab(id, updateHash = true, scrollTop = true) {
    if (!panels[id]) id = 'home';
    current = id;
    buttons.forEach((b) => {
      const active = b.dataset.tab === id;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
      b.tabIndex = active ? 0 : -1;
      panels[b.dataset.tab].classList.toggle('active', active);
      panels[b.dataset.tab].setAttribute('aria-hidden', String(!active));
    });
    if (turan) {
      const onTuran = id === 'turan';
      turan.classList.toggle('open', onTuran);
      turan.setAttribute('aria-hidden', String(!onTuran));
    }
    if (updateHash) history.replaceState(null, '', '#' + id);
    if (scrollTop) window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof closeMobileMenu === 'function') closeMobileMenu();
    window.dispatchEvent(new CustomEvent('tda:tabChanged', { detail: { tab: id } }));
  }
  window.tdaSetTab = setTab;

  tabNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-button');
    if (btn) setTab(btn.dataset.tab);
  });
  quick.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-quick-tab]');
    if (btn) setTab(btn.dataset.quickTab);
  });
  tabNav.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const i = buttons.indexOf(document.activeElement);
    const next = e.key === 'Home' ? 0
      : e.key === 'End' ? buttons.length - 1
      : (i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus();
    setTab(buttons[next].dataset.tab);
  });

  // --- eski çapa bağlantıları: önce doğru sekmeyi aç, sonra bölüme kaydır ---
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href === '#' || href === '#main') return;
    const target = document.querySelector(href);
    const panel = target && target.closest('.tab-panel');
    if (!panel) return;
    e.preventDefault();
    const id = panel.id.replace('tab-', '');
    if (id !== current) setTab(id, true, false);
    requestAnimationFrame(() => {
      const offset = header.offsetHeight + bar.offsetHeight + 12;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  });

  window.addEventListener('hashchange', () => {
    const hash = location.hash.replace('#', '');
    if (panels[hash]) { setTab(hash, false); return; }
    const target = hash && document.getElementById(hash);
    const panel = target && target.closest('.tab-panel');
    if (panel) setTab(panel.id.replace('tab-', ''), false, false);
  });

  // dil değişince sekme adları yenilenir
  const sel = document.getElementById('languageSelect');
  if (sel) sel.addEventListener('change', () => setTimeout(setLabels, 240));
  setTimeout(() => {
    if (window.TDAI18n && window.TDAI18n.onChange) window.TDAI18n.onChange(() => setTimeout(setLabels, 60));
  }, 0);
  window.addEventListener('tda:languageChanged', setLabels);

  // --- başlangıç durumu ---
  setLabels();
  const initialHash = location.hash.replace('#', '');
  const initialTarget = initialHash ? document.getElementById(initialHash) : null;
  const initialPanel = initialTarget ? initialTarget.closest('.tab-panel') : null;
  setTab(panels[initialHash] ? initialHash : initialPanel ? initialPanel.id.replace('tab-', '') : 'home', false, false);
  if (initialTarget && !panels[initialHash]) {
    requestAnimationFrame(() => {
      const offset = header.offsetHeight + bar.offsetHeight + 12;
      const top = initialTarget.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top) });
    });
  }
})();
