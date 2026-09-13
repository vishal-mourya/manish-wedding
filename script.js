/* =====================================================
   MANISH ✕ SIMRAN — cinematic invite JS
   Loader · Countdown · Petals · Sparkle · Parallax
   Reveals · Tilt · Ripple · Confetti · Music
====================================================== */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  /* ---------------- Loader dismiss ---------------- */
  window.addEventListener('load', () => {
    const loader = $('#loader');
    if (!loader) return;
    setTimeout(() => loader.classList.add('hidden'), reduceMotion ? 200 : 1600);
    setTimeout(() => loader.remove(), 3000);
  });

  /* ---------------- Countdown ---------------- */
  const target = new Date('2027-03-01T19:00:00+05:30').getTime();
  const cdEls = {
    d: $('[data-cd="d"]'),
    h: $('[data-cd="h"]'),
    m: $('[data-cd="m"]'),
    s: $('[data-cd="s"]'),
  };
  const pad = (n) => String(n).padStart(2, '0');
  function tickCountdown() {
    const now = Date.now();
    let diff = Math.max(0, target - now);
    const days    = Math.floor(diff / 86_400_000); diff -= days    * 86_400_000;
    const hours   = Math.floor(diff / 3_600_000);  diff -= hours   * 3_600_000;
    const minutes = Math.floor(diff / 60_000);     diff -= minutes * 60_000;
    const seconds = Math.floor(diff / 1000);
    if (cdEls.d) cdEls.d.textContent = pad(days);
    if (cdEls.h) cdEls.h.textContent = pad(hours);
    if (cdEls.m) cdEls.m.textContent = pad(minutes);
    if (cdEls.s) cdEls.s.textContent = pad(seconds);
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  /* ---------------- Scroll progress ---------------- */
  const prog = $('#scroll-progress');
  const onScroll = () => {
    const h = document.documentElement;
    const scrolled = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    if (prog) prog.style.width = (scrolled * 100).toFixed(1) + '%';
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------- Reveal on scroll ---------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: 0.15 });
  $$('.reveal').forEach((el) => io.observe(el));

  /* ---------------- Name reveal (uses data-text so gold-foil clip stays intact) ---------------- */
  const nameStyle = document.createElement('style');
  nameStyle.textContent = `
    .hero-name { opacity: 0; transform: translateY(24px); }
    .hero-name.in { animation: nameIn 1.1s cubic-bezier(.2,.7,.2,1) forwards; }
    @keyframes nameIn { to { opacity: 1; transform: translateY(0); } }
  `;
  document.head.appendChild(nameStyle);
  $$('.hero-name').forEach((el, i) => {
    if (el.dataset.text && !el.textContent.trim()) el.textContent = el.dataset.text;
    setTimeout(() => el.classList.add('in'), 1400 + i * 250);
  });

  /* ---------------- Mouse parallax (hero) ---------------- */
  if (!reduceMotion) {
    const parallaxEls = $$('.parallax');
    let mx = 0, my = 0;
    document.addEventListener('mousemove', (e) => {
      mx = (e.clientX / window.innerWidth  - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    // Cache elements that must preserve the CSS translate(-50%, -50%)
    const centered = new WeakSet();
    parallaxEls.forEach((el) => {
      if (el.classList.contains('ring') || el.classList.contains('medallion')) centered.add(el);
    });
    function loopParallax() {
      parallaxEls.forEach((el) => {
        const depth = parseFloat(el.dataset.depth || '0.05');
        const x = -mx * depth * 40;
        const y = -my * depth * 40;
        if (centered.has(el)) {
          // Preserve center offset + existing spin/float animations by using CSS variables
          el.style.setProperty('--px', x + 'px');
          el.style.setProperty('--py', y + 'px');
          el.style.translate = `${x}px ${y}px`;
        } else {
          el.style.translate = `${x}px ${y}px`;
        }
      });
      requestAnimationFrame(loopParallax);
    }
    loopParallax();
  }

  /* ---------------- Cursor sparkle ---------------- */
  const sparkle = $('#cursor-sparkle');
  if (sparkle && !reduceMotion) {
    let sx = 0, sy = 0, tx = 0, ty = 0;
    document.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
    function loopSparkle() {
      sx += (tx - sx) * 0.2;
      sy += (ty - sy) * 0.2;
      sparkle.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
      requestAnimationFrame(loopSparkle);
    }
    loopSparkle();

    // Occasional gold-dust puff
    document.addEventListener('mousemove', (e) => {
      if (Math.random() > 0.9) spawnDust(e.clientX, e.clientY);
    });
    function spawnDust(x, y) {
      const d = document.createElement('div');
      d.style.cssText = `
        position: fixed; left: ${x}px; top: ${y}px; width: 6px; height: 6px;
        border-radius: 50%; pointer-events: none; z-index: 65;
        background: radial-gradient(circle, #ffd370 0%, transparent 65%);
        mix-blend-mode: screen;
        transform: translate(-50%, -50%);
        transition: transform .8s ease-out, opacity .8s ease-out;`;
      document.body.appendChild(d);
      requestAnimationFrame(() => {
        const dx = (Math.random() - 0.5) * 40;
        const dy = -20 - Math.random() * 40;
        d.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        d.style.opacity = '0';
      });
      setTimeout(() => d.remove(), 900);
    }
  }

  /* ---------------- Petals canvas ---------------- */
  const petalsCanvas = $('#petals-canvas');
  if (petalsCanvas && !reduceMotion) {
    const ctx = petalsCanvas.getContext('2d');
    let W = 0, H = 0, petals = [];
    const PETAL_COUNT = window.innerWidth < 700 ? 30 : 55;

    function resize() {
      W = petalsCanvas.width  = window.innerWidth  * devicePixelRatio;
      H = petalsCanvas.height = window.innerHeight * devicePixelRatio;
      petalsCanvas.style.width  = window.innerWidth  + 'px';
      petalsCanvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    window.addEventListener('resize', resize);
    resize();

    class Petal {
      constructor(fromTop = false) { this.reset(fromTop); }
      reset(fromTop = false) {
        this.x = Math.random() * window.innerWidth;
        this.y = fromTop ? -20 - Math.random() * 200 : Math.random() * window.innerHeight;
        this.size = 6 + Math.random() * 10;
        this.speedY = 0.6 + Math.random() * 1.2;
        this.speedX = -0.3 + Math.random() * 0.6;
        this.rot    = Math.random() * Math.PI * 2;
        this.rotSpeed = -0.03 + Math.random() * 0.06;
        this.hue    = 25 + Math.random() * 20;
        this.opacity = 0.55 + Math.random() * 0.35;
      }
      step(mx, my) {
        // gentle attraction toward cursor
        if (mx !== null) {
          const dx = mx - this.x, dy = my - this.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 40000) {
            const f = 0.0006;
            this.speedX += dx * f;
            this.speedY += dy * f;
          }
        }
        this.speedX *= 0.98;
        this.speedY = Math.min(2.5, this.speedY * 0.995 + 0.008);
        this.x += this.speedX;
        this.y += this.speedY;
        this.rot += this.rotSpeed;
        if (this.y > window.innerHeight + 20 || this.x < -30 || this.x > window.innerWidth + 30) {
          this.reset(true);
        }
      }
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.globalAlpha = this.opacity;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        g.addColorStop(0,   `hsl(${this.hue + 15}, 90%, 70%)`);
        g.addColorStop(0.5, `hsl(${this.hue}, 85%, 55%)`);
        g.addColorStop(1,   `hsl(${this.hue - 10}, 70%, 35%)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        // petal shape ~ two arcs
        ctx.moveTo(0, -this.size);
        ctx.bezierCurveTo(this.size * 0.9, -this.size * 0.4, this.size * 0.9, this.size * 0.4, 0, this.size);
        ctx.bezierCurveTo(-this.size * 0.9, this.size * 0.4, -this.size * 0.9, -this.size * 0.4, 0, -this.size);
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = 0; i < PETAL_COUNT; i++) petals.push(new Petal(false));

    let mx = null, my = null;
    document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
    document.addEventListener('mouseleave', () => { mx = null; my = null; });

    let raf;
    function loop() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      petals.forEach((p) => { p.step(mx, my); p.draw(); });
      raf = requestAnimationFrame(loop);
    }
    loop();

    // Pause when tab hidden — save cycles
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else loop();
    });
  }

  /* ---------------- 3D tilt ---------------- */
  if (!reduceMotion) {
    $$('.tilt').forEach((card) => {
      const glow = card.querySelector('.ritual-glow');
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top)  / r.height;
        const rx = (0.5 - py) * 12;
        const ry = (px - 0.5) * 12;
        card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(4px)`;
        if (glow) {
          glow.style.left = `${e.clientX - r.left - 150}px`;
          glow.style.top  = `${e.clientY - r.top  - 150}px`;
        }
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* ---------------- Button ripple hint (mouse pos) ---------------- */
  $$('.btn').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty('--rx', `${((e.clientX - r.left) / r.width)  * 100}%`);
      btn.style.setProperty('--ry', `${((e.clientY - r.top)  / r.height) * 100}%`);
    });
  });

  /* ---------------- Confetti burst on RSVP ---------------- */
  const confettiCanvas = $('#confetti-canvas');
  if (confettiCanvas) {
    const cctx = confettiCanvas.getContext('2d');
    let cw = 0, ch = 0;
    function resizeC() {
      cw = confettiCanvas.width  = window.innerWidth  * devicePixelRatio;
      ch = confettiCanvas.height = window.innerHeight * devicePixelRatio;
      confettiCanvas.style.width  = window.innerWidth  + 'px';
      confettiCanvas.style.height = window.innerHeight + 'px';
      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.scale(devicePixelRatio, devicePixelRatio);
    }
    window.addEventListener('resize', resizeC);
    resizeC();

    const bits = [];
    class Bit {
      constructor(x, y) {
        this.x = x; this.y = y;
        const a = Math.random() * Math.PI * 2;
        const s = 4 + Math.random() * 10;
        this.vx = Math.cos(a) * s;
        this.vy = Math.sin(a) * s - 6;
        this.rot = Math.random() * Math.PI * 2;
        this.rotSpeed = -0.3 + Math.random() * 0.6;
        this.size = 6 + Math.random() * 8;
        this.life = 90 + Math.random() * 40;
        this.age  = 0;
        const palette = ['#f4a02a','#ffd370','#c9a24c','#a02525','#7a1a1a','#fbf3e4','#e2b862'];
        this.color = palette[Math.floor(Math.random() * palette.length)];
        this.shape = Math.random() < 0.4 ? 'circle' : 'rect';
      }
      step() {
        this.age++;
        this.vy += 0.35;   // gravity
        this.vx *= 0.99;
        this.vy *= 0.99;
        this.x += this.vx;
        this.y += this.vy;
        this.rot += this.rotSpeed;
      }
      draw() {
        const alpha = Math.max(0, 1 - this.age / this.life);
        cctx.save();
        cctx.globalAlpha = alpha;
        cctx.translate(this.x, this.y);
        cctx.rotate(this.rot);
        cctx.fillStyle = this.color;
        if (this.shape === 'rect') {
          cctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
        } else {
          cctx.beginPath();
          cctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
          cctx.fill();
        }
        cctx.restore();
      }
      alive() { return this.age < this.life; }
    }

    let ccraf;
    function burst(x, y, n = 90) {
      for (let i = 0; i < n; i++) bits.push(new Bit(x, y));
      if (!ccraf) loop();
    }
    function loop() {
      cctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = bits.length - 1; i >= 0; i--) {
        bits[i].step();
        bits[i].draw();
        if (!bits[i].alive()) bits.splice(i, 1);
      }
      if (bits.length > 0) {
        ccraf = requestAnimationFrame(loop);
      } else {
        cctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        ccraf = null;
      }
    }

    $$('.rsvp-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const r = btn.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2, 120);
        // Second wave for firework effect
        setTimeout(() => burst(window.innerWidth / 2, window.innerHeight * 0.4, 80), 250);
        setTimeout(() => burst(window.innerWidth * 0.25, window.innerHeight * 0.55, 60), 500);
        setTimeout(() => burst(window.innerWidth * 0.75, window.innerHeight * 0.55, 60), 700);
      });
    });
  }

  /* ---------------- Music toggle ---------------- */
  const musicBtn = $('#music-toggle');
  if (musicBtn) {
    // Uses WebAudio to synth a soft ambient tone — no asset needed.
    // If you drop an mp3 into the folder later, swap this for an <audio> element.
    let audioCtx = null;
    let playing = false;
    let nodes = [];
    function startAmbient() {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const master = audioCtx.createGain();
      master.gain.value = 0.0;
      master.connect(audioCtx.destination);
      master.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 1.5);

      // Two detuned drones, sitar-ish
      const freqs = [130.81, 196.00, 261.63]; // C3, G3, C4
      freqs.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = i === 1 ? 'sine' : 'triangle';
        osc.frequency.value = f;
        const g = audioCtx.createGain();
        g.gain.value = 0.15 + i * 0.05;
        // LFO for subtle shimmer
        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = 0.1 + i * 0.05;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 0.5;
        lfo.connect(lfoGain).connect(osc.frequency);
        osc.connect(g).connect(master);
        osc.start();
        lfo.start();
        nodes.push(osc, lfo, g);
      });
      nodes.push(master);
    }
    function stopAmbient() {
      if (!audioCtx) return;
      const master = nodes[nodes.length - 1];
      master.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.6);
      setTimeout(() => {
        try { audioCtx.close(); } catch {}
        audioCtx = null;
        nodes = [];
      }, 800);
    }
    musicBtn.addEventListener('click', () => {
      playing = !playing;
      musicBtn.classList.toggle('playing', playing);
      if (playing) startAmbient(); else stopAmbient();
    });
  }
})();
