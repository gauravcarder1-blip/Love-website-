// script.js — SPA controller
(() => {
  'use strict';

  const S2_KEY = 'scene2_step';
  const MUTE_KEY = 'romantic_mute';
  const s = (q) => document.querySelector(q);
  const sa = (q) => Array.from(document.querySelectorAll(q));

  // DOM
  const scenes = sa('.scene');
  const music = s('#bg-music');
  const hb = s('#heartbeat-snd');

  // Scene nodes
  const scene1 = s('#scene-1');
  const scene2 = s('#scene-2');
  const scene3 = s('#scene-3');
  const scene4 = s('#scene-4');

  const startBtn = s('#start-btn');
  const nextBtn = s('#next-btn');
  const continueBtn = s('#continue-btn');
  const sendBtn = s('#send-btn');

  const muteButtons = sa('.audio-ctrl');

  const s2Typed = s('#s2-typed');
  const s3Line1 = s('#s3-line1');
  const s3Final = s('#s3-final');

  const s2Bg = s('#s2-bg');
  const s3Bg = s('#s3-bg');
  const s4Bg = s('#s4-bg');

  // Scenes data
  const s2Steps = [
    { bg: 'assets/scene2-step1.jpg', text: 'Every time you smile, the world feels lighter ☀️' },
    { bg: 'assets/scene2-step2.jpg', text: 'You don’t even realize how effortlessly you make my day better 🌹' },
    { bg: 'assets/scene2-step3.jpg', text: 'I tried to hide these feelings… but they refuse to stay quiet 🌙' },
    { bg: 'assets/scene2-step4.jpg', text: 'You’re that one person I never want to lose 💫' },
    { bg: 'assets/scene2-step5.jpg', text: 'You’ve taken a special place in my heart — permanently 💖' },
    { bg: 'assets/scene2-step6.jpg', text: 'And now… I just need to say this, once and for all.' }
  ];

  // helpers
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function setActiveScene(n) {
    scenes.forEach(sec => sec.classList.toggle('active', sec.dataset.scene === String(n)));
    history.replaceState({scene:n}, '', `#scene${n}`);
  }

  // persist mute state
  function getMuted() { return sessionStorage.getItem(MUTE_KEY) === '1'; }
  function setMuted(v) {
    if (!music) return;
    music.muted = v;
    hb.muted = v;
    sessionStorage.setItem(MUTE_KEY, v ? '1' : '0');
    muteButtons.forEach(b => { b.textContent = v ? '🔇' : '🔊'; b.setAttribute('aria-pressed', v); });
  }

  // Preload assets (light)
  function preload(list) {
    list.forEach(src => {
      if (!src) return;
      if (/\.(jpg|png|webp|gif)$/i.test(src)) { const img = new Image(); img.src = src; }
      else if (/\.(mp3|wav|ogg)$/i.test(src)) { const a = new Audio(); a.preload = 'auto'; a.src = src; }
      else if (/\.(mp4|webm)$/i.test(src)) { const v = document.createElement('video'); v.preload = 'auto'; v.src = src; }
    });
  }

  // typing engine
  async function typeText(el, text, opts = {min:20, max:120, caret:true}) {
    if (!el) return;
    el.textContent = '';
    if (opts.caret) el.classList.add('type-caret');
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i];
      const delay = Math.random() * (opts.max - opts.min) + opts.min;
      await sleep(delay + (text[i] === ' ' ? 40 : 0));
    }
    el.classList.remove('type-caret');
  }

  // spawn floating elements (petals/hearts)
  function spawnFloating(containerSelector, sprite, count = 12, cls = 'petal') {
    const container = s(containerSelector) || document.body;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = cls;
      el.style.left = (Math.random() * 100) + '%';
      el.style.top = (-10 - Math.random() * 10) + 'vh';
      const size = 14 + Math.random() * 36;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.backgroundImage = `url(${sprite})`;
      el.style.backgroundSize = 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.opacity = (0.6 + Math.random() * 0.4).toFixed(2);
      el.classList.add('animate');
      el.style.animationDuration = (8 + Math.random() * 10) + 's';
      container.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }
  }

  // parallax small effect
  function enableParallax(container) {
    container.addEventListener('pointermove', (e) => {
      const cx = (e.clientX / window.innerWidth - 0.5) * 8;
      const cy = (e.clientY / window.innerHeight - 0.5) * 6;
      container.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    });
  }

  // scene controllers
  async function startScene1() {
    setActiveScene(1);
    // type headline
    const h = s('#s1-head');
    await typeText(h, h.dataset.text || h.textContent, {min:30, max:110});
    // petal warm
    spawnFloating('#scene-1 .layer', 'assets/scene1-petal-sprite.png', 18, 'petal');
    enableParallax(scene1);
  }

  async function runScene2() {
    setActiveScene(2);
    let step = parseInt(sessionStorage.getItem(S2_KEY) || '0', 10);
    step = Math.max(0, Math.min(step, s2Steps.length - 1));
    await showS2Step(step);

    async function advance() {
      if (step < s2Steps.length - 1) {
        step++;
        await showS2Step(step);
      } else {
        // go to scene 3
        sessionStorage.setItem(S2_KEY, String(step));
        navigateToScene(3);
      }
    }

    scene2.addEventListener('click', (ev) => { if (ev.target !== nextBtn) advance(); });
    nextBtn.addEventListener('click', advance);
    enableParallax(scene2);
  }

  async function showS2Step(i) {
    const step = s2Steps[i];
    s2Bg.style.backgroundImage = `url('${step.bg}')`;
    s2Typed.textContent = '';
    // spawn hearts & petals
    s('#scene-2 .hearts').innerHTML = '';
    s('#scene-2 .petals').innerHTML = '';
    spawnFloating('#scene-2 .hearts', 'assets/scene2-heart-sprite.png', 8, 'heart');
    spawnFloating('#scene-2 .petals', 'assets/scene1-petal-sprite.png', 10, 'petal');
    await typeText(s2Typed, step.text, {min:22, max:110});
    sessionStorage.setItem(S2_KEY, String(i));
  }

  async function runScene3() {
    setActiveScene(3);
    s3Line1.textContent = '';
    s3Final.classList.remove('show');
    // heartbeat while typing
    hb.currentTime = 0;
    hb.play().catch(()=>{});
    await typeText(s3Line1, "I think… I’ve fallen in love with you.", {min:90, max:160});
    await sleep(700);
    // show final reveal
    s3Final.classList.add('show');
    s('#scene-3 .centerbox .reveal-love').classList.add('show');
    spawnFloating('#scene-3', 'assets/scene1-petal-sprite.png', 36, 'petal');
    // continue button
    continueBtn.addEventListener('click', () => navigateToScene(4));
    enableParallax(scene3);
  }

  async function runScene4() {
    setActiveScene(4);
    sendBtn.addEventListener('click', () => {
      sendBtn.classList.add('sent');
      setTimeout(()=>sendBtn.classList.remove('sent'), 900);
    });
    enableParallax(scene4);
  }

  // Navigation without reload
  function navigateToScene(n) {
    history.pushState({scene:n}, '', `#scene${n}`);
    switch(n) {
      case 1: startScene1(); break;
      case 2: runScene2(); break;
      case 3: runScene3(); break;
      case 4: runScene4(); break;
      default: startScene1();
    }
  }

  // start behavior: music only after user gesture (browser autoplay policy)
  function userGestureStart() {
    // start music if not already playing
    if (music.paused) {
      music.play().catch(()=>{ /* blocked until user interacts — we are inside gesture so should play */ });
    }
    // mark we started so subsequent clicks don't retrigger
    window.removeEventListener('pointerdown', userGestureStart);
  }

  // initial setup
  function init() {
    // preload critical assets
    preload([
      'assets/song.mp3','assets/heartbeat.mp3','assets/scene1-petal-sprite.png',
      'assets/scene2-step1.jpg','assets/scene2-step2.jpg','assets/scene2-step3.jpg'
    ]);

    // restore mute
    setMuted(getMuted());

    // global mute buttons
    muteButtons.forEach(b => b.addEventListener('click', () => setMuted(!getMuted())));

    // scene start handlers
    startBtn.addEventListener('click', async (e) => {
      // start music on first gesture
      userGestureStart();
      await music.play().catch(()=>{});
      navigateToScene(2);
    });

    // if user clicks anywhere on scene1 start too
    scene1.addEventListener('click', (ev) => {
      if (ev.target === startBtn) return;
      userGestureStart();
      music.play().catch(()=>{});
      navigateToScene(2);
    });

    // popstate restore
    window.addEventListener('popstate', (ev) => {
      const scene = (ev.state && ev.state.scene) ? ev.state.scene : 1;
      // read stored scene if any
      if (scene === 2) runScene2();
      else if (scene === 3) runScene3();
      else if (scene === 4) runScene4();
      else startScene1();
    });

    // start at hash scene or 1
    const startHash = location.hash.match(/scene(\d)/);
    const startScene = startHash ? Number(startHash[1]) : 1;
    // small delay then start
    setTimeout(()=> {
      switch(startScene) {
        case 2: runScene2(); break;
        case 3: runScene3(); break;
        case 4: runScene4(); break;
        default: startScene1();
      }
    }, 120);

    // ensure audio reflect mute
    setMuted(getMuted());
    // allow first gesture anywhere to start audio
    window.addEventListener('pointerdown', userGestureStart, {once:true});
  }

  // run
  document.addEventListener('DOMContentLoaded', init);
})();
