/* Shared logic for all scenes
   - typing engine
   - preloading assets
   - transitions using crossfade classes and history.pushState
   - audio control & persistence
   - scene-specific sequences controlled by checking body.classList
*/

(function(){
  'use strict';

  const AUDIO_KEY = 'romantic_mute';
  const S2_STEP_KEY = 'scene2_step';
  const TIMEOUT = (n)=>new Promise(r=>setTimeout(r,n));

  // Basic asset preloader
  function preloadAssets(list){
    list.forEach(src=>{
      if(!src) return;
      if(src.endsWith('.mp3') || src.endsWith('.wav')){
        const a = new Audio(); a.preload='auto'; a.src = src; // browser may not load until user gesture
      } else if(src.match(/\.(jpg|png|webp|gif)$/i)){
        const i = new Image(); i.src = src;
      } else if(src.match(/\.(mp4|webm)$/i)){
        const v = document.createElement('video'); v.preload='auto'; v.src=src;
      }
    });
  }

  // Humanized typing engine
  function typeText(el, text, opts={min:25,max:120,caret:true}){
    if(!el) return Promise.resolve();
    el.textContent = '';
    if(opts.caret) el.classList.add('type-caret');
    let i=0;
    return new Promise(async (resolve)=>{
      while(i<text.length){
        const ch = text[i++];
        el.textContent += ch;
        // variable delay for more human feel
        const base = Math.random()*(opts.max-opts.min)+opts.min;
        await TIMEOUT(base + (ch===' ' ? 40 : 0));
      }
      if(opts.caret) el.classList.remove('type-caret');
      resolve();
    });
  }

  // Simple utility to add petal/heart elements for scene backgrounds
  function spawnFloating(container, sprite, count=14, cls='petal'){
    if(!container) return;
    for(let i=0;i<count;i++){
      const el = document.createElement('div');
      el.className = cls;
      el.style.left = Math.random()*100 + '%';
      el.style.top = (-10 - Math.random()*10) + 'vh';
      el.style.opacity = (0.6 + Math.random()*0.4).toFixed(2);
      el.style.width = (18 + Math.random()*36) + 'px';
      el.style.height = el.style.width;
      el.style.backgroundImage = `url(${sprite})`;
      el.style.backgroundSize = 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.animationDuration = (8+Math.random()*10)+'s';
      container.appendChild(el);
      // recycle when done
      (function(e){
        e.addEventListener('animationend', ()=>{
          e.remove();
        });
      })(el);
    }
  }

  // Simple heart/particle background generator (lightweight)
  function makeParallax(root){
    root.addEventListener('pointermove', e=>{
      const cx = e.clientX / window.innerWidth - 0.5;
      const cy = e.clientY / window.innerHeight - 0.5;
      root.style.transform = `translate3d(${cx*8}px, ${cy*6}px, 0)`;
    });
  }

  // Audio manager
  const audio = {
    music: null,
    heartbeat: null,
    init(){
      if(this.music) return;
      this.music = new Audio('assets/music.mp3');
      this.music.loop = true; this.music.preload='auto';
      this.heartbeat = new Audio('assets/heartbeat.mp3');
      this.heartbeat.loop = false; this.heartbeat.preload='auto';
    },
    async playMusic(){
      try{ this.init(); await this.music.play(); }catch(e){/* may be blocked until user gesture */}
    },
    pauseMusic(){ if(this.music) this.music.pause(); },
    playHeartbeat(){ try{ this.init(); this.heartbeat.currentTime=0; this.heartbeat.play(); }catch(e){} },
    setMuted(v){ if(this.music) this.music.muted=v; if(this.heartbeat) this.heartbeat.muted=v; }
  }

  // Persisted mute state
  function getMuted(){ return sessionStorage.getItem(AUDIO_KEY) === '1'; }
  function setMuted(v){ sessionStorage.setItem(AUDIO_KEY, v ? '1':'0'); audio.setMuted(v); updateMuteButtons(v); }
  function updateMuteButtons(v){ document.querySelectorAll('.audio-ctrl').forEach(b=>{ b.textContent = v? '🔇':'🔊'; b.setAttribute('aria-pressed', !!v); }); }

  // Crossfade transition helper (basic)
  async function navigateTo(url){
    // start preloading target scene's images (very lightweight approach: look for assets/ in same folder)
    const imgList = [
      'assets/scene2-step1.jpg','assets/scene2-step2.jpg','assets/scene2-step3.jpg','assets/scene2-step4.jpg','assets/scene2-step5.jpg','assets/scene2-step6.jpg',
      'assets/bg-scene1.mp4','assets/music.mp3','assets/heartbeat.mp3'
    ];
    preloadAssets(imgList);

    // smooth fade-out: apply class to body and wait
    document.documentElement.classList.add('crossfade-exit-active');
    await TIMEOUT(200);
    // push history and navigate (we still use location.href to ensure file loading)
    history.pushState({site:navigateTo, url}, '', url);
    location.href = url;
  }

  // Scene specific controllers
  async function scene1Controller(){
    const root = document.getElementById('s1-root');
    const startBtn = document.getElementById('start-btn');
    const bgVideo = document.getElementById('s1-bg-video');
    const mute = getMuted(); updateMuteButtons(mute);

    // prewarm audio objects
    audio.init(); audio.setMuted(mute);

    // typed headline already present; add event listeners
    startBtn.addEventListener('click', async ()=>{
      await audio.playMusic();
      // small click sound could be implemented if asset provided
      history.pushState({step:'scene1-start'}, '', 'scene1.html');
      await navigateTo('scene2.html');
    });

    // also allow tapping anywhere
    root.addEventListener('click', async (e)=>{
      if(e.target===startBtn) return;
      await audio.playMusic();
      history.pushState({step:'scene1-start'}, '', 'scene1.html');
      await navigateTo('scene2.html');
    });

    document.querySelectorAll('#mute-toggle').forEach(b=>b.addEventListener('click', ()=>setMuted(!getMuted())));

    // spawn some petals on load
    const petalLayer = root.querySelector('.petals');
    spawnFloating(petalLayer, 'assets/scene1-petal-sprite.png', 18, 'petal');

    // typing headline (if JS enabled)
    const h = document.querySelector('.headline.type-animate');
    typeText(h, h.dataset.text || h.textContent, {min:30,max:120});

    makeParallax(root);
  }

  async function scene2Controller(){
    const root = document.getElementById('s2-root');
    const bg = document.getElementById('s2-bg');
    const msg = document.getElementById('s2-typed');
    const nextBtn = document.getElementById('next-btn');

    const steps = [
      {bg:'assets/scene2-step1.jpg', text:'Every time you smile, the world feels lighter ☀️'},
      {bg:'assets/scene2-step2.jpg', text:'You don’t even realize how effortlessly you make my day better 🌹'},
      {bg:'assets/scene2-step3.jpg', text:'I tried to hide these feelings… but they refuse to stay quiet 🌙'},
      {bg:'assets/scene2-step4.jpg', text:'You’re that one person I never want to lose 💫'},
      {bg:'assets/scene2-step5.jpg', text:'You’ve taken a special place in my heart — permanently 💖'},
      {bg:'assets/scene2-step6.jpg', text:'And now… I just need to say this, once and for all.'}
    ];

    let step = parseInt(sessionStorage.getItem(S2_STEP_KEY) || '0', 10);
    step = Math.min(Math.max(step,0), steps.length-1);

    audio.init(); audio.setMuted(getMuted()); await audio.playMusic();

    async function showStep(i){
      const s = steps[i];
      // update background
      bg.style.backgroundImage = `url('${s.bg}')`;
      // spawn some hearts/petals for each step
      const heartLayer = root.querySelector('.hearts');
      const petalLayer = root.querySelector('.petals');
      heartLayer.innerHTML = '';
      petalLayer.innerHTML = '';
      spawnFloating(heartLayer, 'assets/scene2-heart-sprite.png', 8, 'heart');
      spawnFloating(petalLayer, 'assets/scene1-petal-sprite.png', 10, 'petal');

      // typing
      msg.textContent='';
      await typeText(msg, s.text, {min:22,max:110});
      sessionStorage.setItem(S2_STEP_KEY, String(i));
    }

    // initial show
    await showStep(step);

    // advance function
    async function advance(){
      if(step < steps.length -1){ step++; await showStep(step); }
      else { history.pushState({from:'s2-final'}, '', 'scene2.html'); await navigateTo('scene3.html'); }
    }

    root.addEventListener('click', (e)=>{ if(e.target!==nextBtn) advance(); });
    nextBtn.addEventListener('click', advance);

    document.querySelectorAll('#mute-toggle-2').forEach(b=>b.addEventListener('click', ()=>setMuted(!getMuted())));

    makeParallax(root);
  }

  async function scene3Controller(){
    const root = document.getElementById('s3-root');
    const line1 = document.getElementById('s3-line1');
    const final = document.getElementById('s3-final');
    const continueBtn = document.getElementById('continue-btn');

    audio.init(); audio.setMuted(getMuted()); await audio.playMusic();

    // Heartbeat synced reveal
    async function reveal(){
      // slowly type the fragile line while heartbeat plays and increases slightly
      audio.playHeartbeat();
      await typeText(line1, 'I think… I’ve fallen in love with you.', {min:90,max:160});
      // pause, then dramatic final reveal
      await TIMEOUT(700);
      // increase brightness: show final
      final.classList.add('show');
      document.querySelector('.reveal-love')?.classList.add('show');
      // spawn burst of petals and rays
      const rays = document.createElement('div'); rays.className='rays ray-anim'; root.appendChild(rays);
      spawnFloating(root.querySelector('.layer') || root, 'assets/scene1-petal-sprite.png', 36, 'petal');
    }

    reveal();

    continueBtn.addEventListener('click', async ()=>{
      history.pushState({from:'s3'}, '', 'scene3.html');
      await navigateTo('scene4.html');
    });

    document.querySelectorAll('#mute-toggle-3').forEach(b=>b.addEventListener('click', ()=>setMuted(!getMuted())));
    makeParallax(root);
  }

  async function scene4Controller(){
    const root = document.getElementById('s4-root');
    const sendBtn = document.getElementById('send-btn');
    audio.init(); audio.setMuted(getMuted()); await audio.playMusic();

    // UI only: prevent any share or alerts
    sendBtn.addEventListener('click', ()=>{
      // purely UI effect: a soft pulse and glow, but no external behavior
      sendBtn.classList.add('sent');
      setTimeout(()=>sendBtn.classList.remove('sent'), 900);
    });

    document.querySelectorAll('#mute-toggle-4').forEach(b=>b.addEventListener('click', ()=>setMuted(!getMuted())));
    makeParallax(root);
  }

  // On load: dispatch controller based on body class
  function init(){
    const body = document.body;
    // Preload critical assets
    preloadAssets(['assets/music.mp3','assets/heartbeat.mp3','assets/scene1-petal-sprite.png']);

    // Attach mute buttons listeners (global)
    document.querySelectorAll('.audio-ctrl').forEach(b=>{
      b.addEventListener('click', ()=>setMuted(!getMuted()));
    });

    // Route to scene-specific controllers
    if(body.classList.contains('scene1')) scene1Controller();
    else if(body.classList.contains('scene2')) scene2Controller();
    else if(body.classList.contains('scene3')) scene3Controller();
    else if(body.classList.contains('scene4')) scene4Controller();

    // Restore media mute state
    updateMuteButtons(getMuted());

    // Handle popstate for back/forward restoring for scene2
    window.addEventListener('popstate', (ev)=>{
      // attempt to restore scene2 step if applicable
      if(location.pathname.endsWith('scene2.html')){
        // page will reload; sessionStorage preserves step
      }
    });

    // Graceful fallback for JS disabled is handled by noscript in scene1
  }

  // Expose some helpers for debugging
  window.romanticApp = { preloadAssets, typeText };

  document.addEventListener('DOMContentLoaded', init);
})();
