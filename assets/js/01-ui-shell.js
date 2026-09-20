/* Türk Dünyası Beceri Ağı — odak tuzagi, modal ve cekmece kontrolu, oturum durumu, baslik genislik olcumu */
window.tdaFocusTrap=(function(){
  var stack=[];
  var overlayCount=0;
  function focusablesIn(panel){
    return Array.prototype.slice.call(panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function(el){return el.offsetParent!==null;});
  }
  function updateContentHidden(){
    var hidden=overlayCount>0;
    var header=document.querySelector('header');
    var targets=(header?[header]:[]).concat(Array.prototype.slice.call(document.querySelectorAll('.hero,section')));
    targets.forEach(function(el){
      if(!el)return;
      if(hidden){ if(!el.contains(document.activeElement)) el.setAttribute('aria-hidden','true'); }
      else { el.removeAttribute('aria-hidden'); }
    });
  }
  function onKeydownFactory(panel){
    return function(e){
      if(e.key!=='Tab')return;
      var f=focusablesIn(panel);
      if(!f.length)return;
      var first=f[0],last=f[f.length-1];
      if(e.shiftKey){
        if(document.activeElement===first||!panel.contains(document.activeElement)){e.preventDefault();last.focus();}
      } else {
        if(document.activeElement===last||!panel.contains(document.activeElement)){e.preventDefault();first.focus();}
      }
    };
  }
  function open(panel,opts){
    opts=opts||{};
    var trigger=opts.trigger||document.activeElement;
    overlayCount++;
    updateContentHidden();
    var onKeydown=onKeydownFactory(panel);
    document.addEventListener('keydown',onKeydown,true);
    stack.push({panel:panel,trigger:trigger,onKeydown:onKeydown});
    // panel geçiş animasyonu bitene kadar görünür olmadığı için odak birkaç kez denenir
    var tries=[0,60,200,380,560,760];
    tries.forEach(function(delay){
      setTimeout(function(){
        if(panel.contains(document.activeElement))return;
        var f=focusablesIn(panel);
        if(f.length)f[0].focus();
        updateContentHidden();
      },delay);
    });
    panel.addEventListener('transitionend',function onEnd(ev){
      if(ev.target!==panel)return;
      panel.removeEventListener('transitionend',onEnd);
      if(panel.contains(document.activeElement))return;
      var f=focusablesIn(panel);
      if(f.length)f[0].focus();
    });
  }
  function close(panel){
    var idx=-1;
    for(var i=stack.length-1;i>=0;i--){if(stack[i].panel===panel){idx=i;break;}}
    if(idx===-1)return;
    var entry=stack.splice(idx,1)[0];
    document.removeEventListener('keydown',entry.onKeydown,true);
    overlayCount=Math.max(0,overlayCount-1);
    if(entry.trigger&&typeof entry.trigger.focus==='function')entry.trigger.focus();
    updateContentHidden();
  }
  return {open:open,close:close};
})();
function openAuth(mode){
  const b=document.getElementById('authBackdrop'); if(!b) return;
  const title=document.getElementById('authTitle'); const reg=document.getElementById('registerPanel'); const login=document.getElementById('loginPanel');
  const rs=document.getElementById('registerStatus'); const ls=document.getElementById('loginStatus');
  if(rs) rs.className='auth-status'; if(ls) ls.className='auth-status';
  if(mode==='login'){title.textContent=window.TDAI18n?.t('loginTitle')||'Giriş Yap';reg.style.display='none';login.style.display='block';}
  else {title.textContent=window.TDAI18n?.t('registerTitle')||'Kayıt Ol';reg.style.display='block';login.style.display='none';}
  b.classList.add('open'); b.setAttribute('aria-hidden','false');
  window.tdaFocusTrap.open(b,{trigger:document.activeElement});
}
function closeAuth(){const b=document.getElementById('authBackdrop');if(b){b.classList.remove('open');b.setAttribute('aria-hidden','true');window.tdaFocusTrap.close(b);}}
/* Şterek açıkken arka planın kaymasını tamamen durdur (iOS dahil) */
let __scrollLockY=0,__scrollLocked=false;
function lockBodyScroll(){
  if(__scrollLocked)return;
  __scrollLockY=window.scrollY||window.pageYOffset||0;
  const b=document.body;
  b.style.position='fixed';
  b.style.top=(-__scrollLockY)+'px';
  b.style.left='0';
  b.style.right='0';
  b.style.width='100%';
  b.style.overflowY='hidden';
  __scrollLocked=true;
}
function unlockBodyScroll(){
  if(!__scrollLocked)return;
  const b=document.body,h=document.documentElement;
  b.style.position='';b.style.top='';b.style.left='';b.style.right='';b.style.width='';b.style.overflowY='';
  const prev=h.style.scrollBehavior;
  h.style.scrollBehavior='auto';
  window.scrollTo(0,__scrollLockY);
  h.style.scrollBehavior=prev;
  __scrollLocked=false;
}
function toggleMobileMenu(){
  const d=document.getElementById('mobileDrawer');
  if(!d)return;
  if(d.classList.contains('open'))closeMobileMenu();
  else openMobileMenu();
}
function openMobileMenu(){
  const d=document.getElementById('mobileDrawer');
  const b=document.getElementById('mobileDrawerBackdrop');
  const btn=document.getElementById('mobileMenuBtn');
  if(d){d.classList.add('open');d.setAttribute('aria-hidden','false');}
  if(b){b.classList.add('open');b.setAttribute('aria-hidden','false');}
  if(btn){btn.classList.add('open');btn.setAttribute('aria-expanded','true');}
  lockBodyScroll();
  if(d)window.tdaFocusTrap.open(d,{trigger:btn||document.activeElement});
}
function closeMobileMenu(){
  const d=document.getElementById('mobileDrawer');
  const b=document.getElementById('mobileDrawerBackdrop');
  const btn=document.getElementById('mobileMenuBtn');
  if(d){d.classList.remove('open');d.setAttribute('aria-hidden','true');}
  if(b){b.classList.remove('open');b.setAttribute('aria-hidden','true');}
  if(btn){btn.classList.remove('open');btn.setAttribute('aria-expanded','false');}
  unlockBodyScroll();
  if(d)window.tdaFocusTrap.close(d);
}
/* Oturum durumu: giriş yapılınca şapka/menü "Giriş Yap / Kayıt Ol" yerine ad + Çıkış gösterir */
function tdaGetSession(){try{return localStorage.getItem('tda-session')||null;}catch(e){return null;}}
function tdaLogout(){
  try{localStorage.removeItem('tda-session');}catch(e){}
  window.renderAuthState?.();
  window.renderMyStudentId?.();
}
window.renderAuthState=function renderAuthState(){
  const email=tdaGetSession();
  let user=null;
  if(email){try{user=JSON.parse(localStorage.getItem('tda-demo-user')||'null');}catch(e){}}
  const loggedIn=!!(email&&user&&user.email===email);
  const t=k=>(window.TDAI18n&&window.TDAI18n.t)?window.TDAI18n.t(k):k;
  function fillLoggedIn(container,mobile){
    container.innerHTML='';
    const nameEl=document.createElement('span');
    nameEl.className='auth-user-name';
    nameEl.textContent=(user&&user.firstName)?user.firstName:t('studentFallback');
    const btn=document.createElement('button');
    btn.type='button';
    btn.className=mobile?'auth-btn mobile-auth-btn':'auth-btn';
    btn.setAttribute('data-i18n','logout');
    btn.textContent=t('logout');
    btn.addEventListener('click',()=>{if(mobile)closeMobileMenu();tdaLogout();});
    container.appendChild(nameEl);
    container.appendChild(btn);
  }
  function fillLoggedOut(container,mobile){
    container.innerHTML=mobile
      ?'<button class="auth-btn mobile-auth-btn" onclick="closeMobileMenu();openAuth(\'login\')" type="button" data-i18n="Giriş Yap">Giriş Yap</button><button class="auth-btn register mobile-auth-btn" onclick="closeMobileMenu();openAuth(\'register\')" type="button" data-i18n="Kayıt Ol">Kayıt Ol</button>'
      :'<button class="auth-btn" onclick="openAuth(\'login\')" type="button" data-i18n="Giriş Yap">Giriş Yap</button><button class="auth-btn register" onclick="openAuth(\'register\')" type="button" data-i18n="Kayıt Ol">Kayıt Ol</button>';
  }
  const desktop=document.querySelector('.auth-actions');
  if(desktop){loggedIn?fillLoggedIn(desktop,false):fillLoggedOut(desktop,false);}
  const mobileBox=document.querySelector('.mobile-drawer-auth');
  if(mobileBox){loggedIn?fillLoggedIn(mobileBox,true):fillLoggedOut(mobileBox,true);}
  window.syncHeaderMode?.();
};
setTimeout(()=>{window.renderAuthState();if(window.TDAI18n&&window.TDAI18n.onChange)window.TDAI18n.onChange(()=>window.renderAuthState());},0);
/* Başlık menüsü: içerik satıra sığmıyorsa hamburgere geç (7 dilin tamamı için) */
(function(){
  const header=document.querySelector('header');
  if(!header)return;
  const logo=header.querySelector('.logo');
  const nav=header.querySelector('nav');
  const auth=header.querySelector('.auth-actions');
  const lang=header.querySelector('.lang-wrap');
  const BREATHING=56;
  function requiredWidth(){
    document.body.classList.add('nav-measuring');
    const w=(logo?logo.scrollWidth:0)+(nav?nav.scrollWidth:0)+(auth?auth.scrollWidth:0)+(lang?lang.scrollWidth:0);
    document.body.classList.remove('nav-measuring');
    const cs=getComputedStyle(header);
    return w+parseFloat(cs.paddingLeft||0)+parseFloat(cs.paddingRight||0)+BREATHING;
  }
  let raf=null;
  function syncHeaderMode(){
    const fits=requiredWidth()<=header.clientWidth;
    const wasCollapsed=document.body.classList.contains('nav-collapsed');
    document.body.classList.toggle('nav-collapsed',!fits);
    if(fits&&wasCollapsed)closeMobileMenu();
  }
  window.syncHeaderMode=syncHeaderMode;
  function schedule(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(syncHeaderMode);}
  syncHeaderMode();
  window.addEventListener('resize',schedule);
  window.addEventListener('orientationchange',schedule);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(schedule);
  document.addEventListener('DOMContentLoaded',schedule);
  // dil değişince menü genişliği değişir -> yeniden ölç
  const sel=document.getElementById('languageSelect');
  if(sel)sel.addEventListener('change',()=>setTimeout(syncHeaderMode,60));
  setTimeout(()=>{if(window.TDAI18n&&window.TDAI18n.onChange)window.TDAI18n.onChange(()=>setTimeout(syncHeaderMode,0));},0);
})();
document.addEventListener('click',e=>{if(e.target===document.getElementById('authBackdrop'))closeAuth();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAuth();closeMobileMenu();}});
