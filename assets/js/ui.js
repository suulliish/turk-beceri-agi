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


  // ===== Hareket katmanı =====
  (function(){
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
    const supportsSDA=CSS.supports('animation-timeline','view()');

    // 1. Kaydırma açılışları (tarayıcı desteklemiyorsa IntersectionObserver)
    if(!supportsSDA && !reduce.matches && 'IntersectionObserver' in window){
      const io=new IntersectionObserver((es)=>{
        es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target);}});
      },{rootMargin:'0px 0px -12% 0px',threshold:.08});
      document.querySelectorAll('[data-reveal]').forEach((el,i)=>{
        el.style.setProperty('--d',(i%4)*70+'ms');
        io.observe(el);
      });
    } else if(reduce.matches){
      document.querySelectorAll('[data-reveal]').forEach(el=>el.classList.add('is-in'));
    }

    // 2. İlerleme çizgisi (yalnızca CSS desteği yoksa)
    const bar=document.querySelector('.scroll-progress');
    if(bar && !CSS.supports('animation-timeline','scroll(root block)')){
      let raf=null;
      const upd=()=>{
        const h=document.documentElement.scrollHeight-window.innerHeight;
        bar.style.transform='scaleX('+(h>0?Math.min(1,window.scrollY/h):0)+')';
        raf=null;
      };
      window.addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(upd)},{passive:true});
      upd();
    }

    // 3. Başlık: kaydırınca daralır
    let last=0,tick=null;
    window.addEventListener('scroll',()=>{
      if(tick)return;
      tick=requestAnimationFrame(()=>{
        const y=window.scrollY;
        document.body.classList.toggle('scrolled',y>80);
        last=y;tick=null;
      });
    },{passive:true});

    // 4. Kahraman alanı: küre imleci ve kaydırmayı izler
    const orb=document.getElementById('heroOrb'),hero=document.querySelector('.hero');
    if(orb&&hero&&!reduce.matches){
      let ox=0,oy=0,sy=0,pending=null;
      const apply=()=>{orb.style.transform=`translate3d(${ox}px,${oy+sy}px,0)`;pending=null;};
      hero.addEventListener('pointermove',e=>{
        const r=hero.getBoundingClientRect();
        ox=((e.clientX-r.left)/r.width-.5)*46;
        oy=((e.clientY-r.top)/r.height-.5)*30;
        if(!pending)pending=requestAnimationFrame(apply);
      });
      window.addEventListener('scroll',()=>{
        sy=Math.min(window.scrollY*.22,180);
        if(!pending)pending=requestAnimationFrame(apply);
      },{passive:true});
    }

    // 5. Rakam sayaçları
    if(!reduce.matches && 'IntersectionObserver' in window){
      const parse=(txt)=>{
        const m=txt.match(/-?\d+(?:[.,]\d+)?/);
        return m?{num:parseFloat(m[0].replace(',','.')),raw:m[0],txt}:null;
      };
      const fmt=(v,raw)=>{
        const dec=(raw.split(/[.,]/)[1]||'').length;
        const sep=raw.includes(',')?',':'.';
        return dec?v.toFixed(dec).replace('.',sep):String(Math.round(v));
      };
      const io2=new IntersectionObserver(es=>{
        es.forEach(e=>{
          if(!e.isIntersecting)return;
          io2.unobserve(e.target);
          const el=e.target,info=parse(el.textContent);
          if(!info||info.num>10000)return;
          const t0=performance.now(),dur=900;
          const step=(t)=>{
            const k=Math.min(1,(t-t0)/dur),eased=1-Math.pow(1-k,3);
            el.textContent=info.txt.replace(info.raw,fmt(info.num*eased,info.raw));
            if(k<1)requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      },{threshold:.6});
      document.querySelectorAll('.hero-stat b,.figure-value,.figure-card b,.tile b,.word-wall-meta b').forEach(el=>io2.observe(el));
    }

    // 6. Beceri şeridi (katalogdan, dil değişince yenilenir)
    const track=document.getElementById('skillMarqueeTrack');
    if(track){
      const build=()=>{
        const sel=document.getElementById('matchTeach');
        let items=sel?[...sel.options].slice(1).map(o=>o.textContent.trim()).filter(Boolean):[];
        if(!items.length)return;
        if(items.length<14)items=items.concat(items);
        const row=items.map(x=>`<span class="marquee-item">${x}</span>`).join('');
        track.innerHTML=row+row;
      };
      build();
      const sel=document.getElementById('languageSelect');
      if(sel)sel.addEventListener('change',()=>setTimeout(build,240));
      setTimeout(()=>{if(window.TDAI18n&&window.TDAI18n.onChange)window.TDAI18n.onChange(()=>setTimeout(build,60));},0);
    }


    // 8. İstatistik satırı: artı düğmesiyle ayrıntı açılır
    document.querySelectorAll('.stat-toggle').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const cell=btn.closest('.stat-cell');
        const open=cell.classList.toggle('open');
        btn.setAttribute('aria-expanded',open?'true':'false');
      });
    });
    // 7. Yol haritası yığınının altına nefes payı
    const tl=document.querySelector('.timeline');
    if(tl&&!tl.nextElementSibling?.classList.contains('timeline-spacer')){
      const sp=document.createElement('div');sp.className='timeline-spacer';sp.setAttribute('aria-hidden','true');
      tl.after(sp);
    }
  })();

  // ===== Alt bilgideki ülke bayrakları =====
  (function(){
    const box=document.getElementById('footerFlags');
    if(!box)return;
    const targets=[box,document.getElementById('heroFlags'),document.getElementById('statFlags')].filter(Boolean);
    const flags=[
      ['assets/flags/Flag_of_Turkey.svg','Türkiye'],
      ['assets/flags/Flag_of_Azerbaijan.svg','Azerbaycan'],
      ['assets/flags/Flag_of_Kazakhstan.svg','Kazakistan'],
      ['assets/flags/Flag_of_Uzbekistan.svg','Özbekistan'],
      ['assets/flags/Flag_of_Kyrgyzstan.svg','Kırgızistan'],
      ['assets/flags/Flag_of_Turkmenistan.svg','Türkmenistan'],
      ['assets/flags/Flag_of_the_Turkish_Republic_of_Northern_Cyprus.svg','KKTC']
    ];
    const html=flags.map(f=>`<span class="mini-flag" title="${f[1]}"><img src="${f[0]}" alt="" loading="lazy"></span>`).join('');
    targets.forEach(t=>{t.innerHTML=html;});
  })();

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
