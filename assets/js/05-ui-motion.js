/* Türk Dünyası Beceri Ağı — aktif bolum vurgusu, yukari dugmesi, tablo kaydirma ipucu */
(function(){
  // ===== Nav active-section highlight (IntersectionObserver) =====
  function headerHeightPx(){
    const v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height'));
    return Number.isFinite(v)?v:64;
  }
  const navLinks=[].slice.call(document.querySelectorAll('header nav a[href^="#"], .mobile-nav-item[href^="#"]')).filter(function(a){
    const id=a.getAttribute('href').slice(1);
    return id && id!=='ai' && id!=='main' && document.getElementById(id);
  });
  let sectionObserver=null;
  function setActiveSection(id){
    navLinks.forEach(function(a){
      a.classList.toggle('active', a.getAttribute('href')==='#'+id);
    });
  }
  function setupSectionObserver(){
    if(!('IntersectionObserver' in window) || !navLinks.length)return;
    if(sectionObserver)sectionObserver.disconnect();
    const hh=headerHeightPx();
    const ids=[];
    navLinks.forEach(function(a){const id=a.getAttribute('href').slice(1);if(ids.indexOf(id)===-1)ids.push(id);});
    sectionObserver=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting)setActiveSection(entry.target.id);
      });
    },{root:null,rootMargin:'-'+(hh+2)+'px 0px -65% 0px',threshold:0});
    ids.forEach(function(id){
      const el=document.getElementById(id);
      if(el)sectionObserver.observe(el);
    });
  }
  setupSectionObserver();
  let resizeTimer=null;
  window.addEventListener('resize',function(){
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(setupSectionObserver,200);
  });

  // ===== Back-to-top button =====
  const backBtn=document.getElementById('backToTopBtn');
  if(backBtn){
    const showAfter=()=>window.innerHeight*1.5;
    function onScroll(){
      if(window.scrollY>showAfter())backBtn.classList.add('show');
      else backBtn.classList.remove('show');
    }
    window.addEventListener('scroll',onScroll,{passive:true});
    onScroll();
    backBtn.addEventListener('click',function(){
      window.scrollTo({top:0,behavior:'smooth'});
    });
    const drawer=document.getElementById('mobileDrawer');
    if(drawer){
      const drawerObserver=new MutationObserver(function(){
        backBtn.classList.toggle('hide-for-drawer', drawer.classList.contains('open'));
      });
      drawerObserver.observe(drawer,{attributes:true,attributeFilter:['class']});
    }
  }

  // ===== Table horizontal-scroll shadow indicator =====
  document.querySelectorAll('.table-wrap').forEach(function(wrap){
    function refresh(){
      const scrollable=wrap.scrollWidth>wrap.clientWidth+1;
      wrap.classList.toggle('tda-scrollable',scrollable);
      const atEnd=wrap.scrollLeft+wrap.clientWidth>=wrap.scrollWidth-2;
      wrap.classList.toggle('tda-scroll-end',scrollable&&atEnd);
    }
    wrap.addEventListener('scroll',refresh,{passive:true});
    window.addEventListener('resize',refresh);
    refresh();
  });
})();
