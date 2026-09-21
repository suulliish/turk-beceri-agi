/* Türk Dünyası Beceri Ağı — ülke topluluk odaları (prototip sohbet gösterimi) */
(function () {
  const modal = document.getElementById('communityModal');
  const title = document.getElementById('communityModalTitle');
  const chat = document.getElementById('communityChat');
  const closeBtn = document.getElementById('communityModalClose');
  const cards = [...document.querySelectorAll('.community-room-card')];
  if (!modal || !cards.length) return;

  const t = (k, fallback) => (window.TDAI18n && window.TDAI18n.t ? window.TDAI18n.t(k) : null) || fallback;
  const label = (country) => (window.TDAI18n && window.TDAI18n.t ? window.TDAI18n.t(country) : null) || country;

  let lastTrigger = null;
  let currentCountry = '';

  function resetChat() {
    chat.innerHTML = '';
    const intro = document.createElement('div');
    intro.className = 'community-message';
    intro.setAttribute('data-i18n', 'roomIntro');
    intro.textContent = t('roomIntro', 'Bu odada hazır mesajlardan birini seçerek topluluğa katılabilirsin.');
    chat.appendChild(intro);
  }

  function openRoom(country, trigger) {
    currentCountry = country;
    lastTrigger = trigger || document.activeElement;
    title.textContent = label(country) + ' · ' + t('roomChatTitle', 'Sohbet Odası');
    resetChat();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    if (window.tdaFocusTrap) window.tdaFocusTrap.open(modal, { trigger: lastTrigger });
    else closeBtn?.focus();
  }

  function closeRoom() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (window.tdaFocusTrap) window.tdaFocusTrap.close(modal);
    else if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
  }

  cards.forEach((card) => {
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    const country = card.getAttribute('data-room') || card.querySelector('h3')?.textContent.trim() || '';
    card.addEventListener('click', () => openRoom(country, card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });
  });

  document.querySelectorAll('.community-ready-message').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bubble = document.createElement('div');
      bubble.className = 'community-message user';
      bubble.textContent = btn.textContent;
      chat.appendChild(bubble);
      chat.scrollTop = chat.scrollHeight;
    });
  });

  closeBtn?.addEventListener('click', closeRoom);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeRoom(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeRoom();
  });

  // dil değişince açık odanın başlığı ve karşılama metni yenilenir
  const sel = document.getElementById('languageSelect');
  if (sel) sel.addEventListener('change', () => setTimeout(() => {
    if (!modal.classList.contains('open')) return;
    title.textContent = label(currentCountry) + ' · ' + t('roomChatTitle', 'Sohbet Odası');
  }, 200));
})();
