/* =====================================================
   COSMIC INTRO — Three.js
   Galaxy → Earth → Zoom to Althan, Surat (21.15° N, 72.79° E)
   Then hand off to the CSS mandap scene.
====================================================== */
(() => {
  'use strict';

  const cinematic = document.getElementById('cinematic');
  const canvas    = document.getElementById('cosmic-canvas');
  const skipBtn   = document.getElementById('skip-intro');
  const enterBtn  = document.getElementById('enter-invite');
  const replayBtn = document.getElementById('replay-intro');
  const mandap    = document.getElementById('mandap-scene');
  const captions  = document.querySelectorAll('.cine-cap');
  const locator   = document.querySelector('.cine-locator');

  // Lock scroll while cinematic is showing
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  // Debug: URL ?freeze=<seconds> freezes elapsed at that time
  try {
    const m = new URLSearchParams(window.location.search).get('freeze');
    if (m) window.__introFreeze = parseFloat(m);
  } catch {}

  // Populate the marigold arch with flowers along a quadratic bezier
  populateArchFlowers();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !window.THREE) {
    finishIntro(true);
    return;
  }

  function populateArchFlowers() {
    const holder = document.querySelector('.arch-flowers');
    if (!holder) return;
    // Curve: Q(t) with P0(20,300) P1(400,-40) P2(780,300), viewBox 800x300.
    // We map to percentages of the arch container.
    const P0 = [20, 300], P1 = [400, -40], P2 = [780, 300];
    const N = 26;
    for (let i = 1; i <= N; i++) {
      const t = i / (N + 1);
      const x = (1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0];
      const y = (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1];
      const f = document.createElement('div');
      f.className = 'a-flower';
      f.style.left = (x / 800 * 100) + '%';
      f.style.top  = (y / 300 * 100) + '%';
      f.style.animationDelay = (-i * 0.13).toFixed(2) + 's';
      // Vary size slightly
      const s = 16 + Math.random() * 12;
      f.style.width = f.style.height = s + 'px';
      holder.appendChild(f);
    }
  }

  const THREE = window.THREE;
  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());

  const scene  = new THREE.Scene();
  scene.fog    = new THREE.FogExp2(0x120306, 0.0006);

  const camera = new THREE.PerspectiveCamera(58, W() / H(), 0.1, 6000);
  camera.position.set(0, 0, 1200);

  /* ---------- Lighting ---------- */
  const sun = new THREE.DirectionalLight(0xfff2c2, 1.6);
  sun.position.set(400, 250, 500);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x3a1a2a, 0.35));
  // rim light (warm)
  const rim = new THREE.DirectionalLight(0xffa040, 0.6);
  rim.position.set(-500, -200, -300);
  scene.add(rim);

  /* ---------- Nebula backdrop (large sphere) ---------- */
  const nebulaCanvas = document.createElement('canvas');
  nebulaCanvas.width = 1024; nebulaCanvas.height = 512;
  const nctx = nebulaCanvas.getContext('2d');
  // Deep space gradient
  const nebGrad = nctx.createLinearGradient(0, 0, 0, 512);
  nebGrad.addColorStop(0,   '#050110');
  nebGrad.addColorStop(0.4, '#1a0620');
  nebGrad.addColorStop(0.7, '#280a2a');
  nebGrad.addColorStop(1,   '#080108');
  nctx.fillStyle = nebGrad;
  nctx.fillRect(0, 0, 1024, 512);
  // Cloud puffs
  const clusterColors = ['#5a1a5a', '#a0306a', '#3a1a7a', '#7a2a3a', '#ff8060', '#ffc080'];
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 1024;
    const y = 30 + Math.random() * 460;
    const r = 60 + Math.random() * 180;
    const c = clusterColors[Math.floor(Math.random() * clusterColors.length)];
    const g = nctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0,   c + 'aa');
    g.addColorStop(0.5, c + '30');
    g.addColorStop(1,   c + '00');
    nctx.fillStyle = g;
    nctx.beginPath();
    nctx.arc(x, y, r, 0, Math.PI * 2);
    nctx.fill();
  }
  // Sprinkle tiny stars in the nebula texture too
  nctx.fillStyle = '#fff';
  for (let i = 0; i < 800; i++) {
    nctx.globalAlpha = 0.3 + Math.random() * 0.7;
    nctx.fillRect(Math.random() * 1024, Math.random() * 512, 1, 1);
  }
  nctx.globalAlpha = 1;
  const nebulaTex = new THREE.CanvasTexture(nebulaCanvas);
  const nebulaMat = new THREE.MeshBasicMaterial({ map: nebulaTex, side: THREE.BackSide, depthWrite: false });
  const nebula    = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 32), nebulaMat);
  scene.add(nebula);

  /* ---------- Star particles (near) ---------- */
  const STAR_COUNT = 4000;
  const starPos = new Float32Array(STAR_COUNT * 3);
  const starCol = new Float32Array(STAR_COUNT * 3);
  const starSizes = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) {
    // Distribute in a large cube in front + around camera
    const r = 200 + Math.random() * 2200;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = r * Math.cos(phi);
    const tint = Math.random();
    if (tint < 0.6) {
      starCol[i * 3] = 1;   starCol[i * 3 + 1] = 1;   starCol[i * 3 + 2] = 1;
    } else if (tint < 0.85) {
      starCol[i * 3] = 1;   starCol[i * 3 + 1] = 0.85; starCol[i * 3 + 2] = 0.55; // gold
    } else {
      starCol[i * 3] = 0.7; starCol[i * 3 + 1] = 0.8;  starCol[i * 3 + 2] = 1;   // blue
    }
    starSizes[i] = 1 + Math.random() * 3.5;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color',    new THREE.BufferAttribute(starCol, 3));
  starGeo.setAttribute('aSize',    new THREE.BufferAttribute(starSizes, 1));

  const starMat = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aSize;
      varying vec3 vColor;
      uniform float uPixelRatio;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * (300.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float alpha = smoothstep(0.5, 0.0, d);
        // Cross flare
        float cross = max(smoothstep(0.02, 0.0, abs(uv.x)) * smoothstep(0.45, 0.0, abs(uv.y)),
                          smoothstep(0.02, 0.0, abs(uv.y)) * smoothstep(0.45, 0.0, abs(uv.x)));
        alpha = max(alpha, cross * 0.6);
        gl_FragColor = vec4(vColor, alpha);
      }`,
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  /* ---------- Warp streaks (activated during hyperjump) ---------- */
  const WARP = 500;
  const warpPos = new Float32Array(WARP * 6); // pairs of points → line segments
  const warpBase = new Float32Array(WARP * 3);
  for (let i = 0; i < WARP; i++) {
    const r = 30 + Math.random() * 200;
    const t = Math.random() * Math.PI * 2;
    const x = Math.cos(t) * r;
    const y = Math.sin(t) * r;
    const z = -200 - Math.random() * 800;
    warpBase[i * 3]     = x;
    warpBase[i * 3 + 1] = y;
    warpBase[i * 3 + 2] = z;
    warpPos[i * 6]     = x; warpPos[i * 6 + 1] = y; warpPos[i * 6 + 2] = z;
    warpPos[i * 6 + 3] = x; warpPos[i * 6 + 4] = y; warpPos[i * 6 + 5] = z + 20;
  }
  const warpGeo = new THREE.BufferGeometry();
  warpGeo.setAttribute('position', new THREE.BufferAttribute(warpPos, 3));
  const warpMat = new THREE.LineBasicMaterial({ color: 0xffe8b8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
  const warp = new THREE.LineSegments(warpGeo, warpMat);
  scene.add(warp);

  /* ---------- EARTH — real textures with rich procedural fallback ---------- */
  const EARTH_R = 100;

  // (Sun direction is used by the day/night shader — driven by DirectionalLight above)
  const sunDir = new THREE.Vector3().copy(sun.position).normalize();

  // Build the very best procedural fallback we can — 4K canvas with real continent points.
  function buildProceduralEarthTexture() {
    const c = document.createElement('canvas');
    c.width = 4096; c.height = 2048;
    const g = c.getContext('2d');

    // Deep ocean base
    const ogr = g.createLinearGradient(0, 0, 0, 2048);
    ogr.addColorStop(0.00, '#03122a');
    ogr.addColorStop(0.10, '#0a2a5a');
    ogr.addColorStop(0.30, '#1a4a7a');
    ogr.addColorStop(0.50, '#1e5a8e');
    ogr.addColorStop(0.70, '#1a4a7a');
    ogr.addColorStop(0.90, '#0a2a5a');
    ogr.addColorStop(1.00, '#03122a');
    g.fillStyle = ogr;
    g.fillRect(0, 0, 4096, 2048);

    // Subtle ocean current mottle
    for (let i = 0; i < 4500; i++) {
      g.fillStyle = `rgba(30, 80, 140, ${0.04 + Math.random() * 0.09})`;
      const x = Math.random() * 4096, y = Math.random() * 2048;
      const r = 24 + Math.random() * 140;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }

    // Ice caps
    const capGrad = g.createLinearGradient(0, 0, 0, 200);
    capGrad.addColorStop(0, '#eef5fa');
    capGrad.addColorStop(1, 'rgba(220,235,245,0)');
    g.fillStyle = capGrad; g.fillRect(0, 0, 4096, 200);
    const capBGrad = g.createLinearGradient(0, 1848, 0, 2048);
    capBGrad.addColorStop(0, 'rgba(220,235,245,0)');
    capBGrad.addColorStop(1, '#dee9f0');
    g.fillStyle = capBGrad; g.fillRect(0, 1848, 4096, 200);

    // Coordinate helpers
    function ll(lon, lat) { return [((lon + 180) / 360) * 4096, ((90 - lat) / 180) * 2048]; }
    function polygon(points, fill, stroke) {
      g.fillStyle = fill;
      g.beginPath();
      points.forEach((p, i) => {
        const [x, y] = ll(p[0], p[1]);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      });
      g.closePath();
      g.fill();
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); }
    }

    // High-detail continent outlines (approximate but recognizable at zoom)
    // AFRICA
    polygon([
      [-17,21],[-17,15],[-8,10],[-6,6],[-2,4],[3,4],[6,0],[9,-1],[9,3],[12,4],[15,2],[15,-4],[13,-9],
      [12,-16],[16,-20],[20,-25],[19,-30],[24,-33],[27,-33],[32,-28],[32,-24],[35,-22],[36,-15],
      [40,-11],[41,-5],[43,-1],[43,4],[48,10],[50,12],[45,12],[42,16],[39,17],[37,21],[34,23],[33,29],
      [30,31],[24,32],[16,33],[11,35],[9,37],[3,36],[-2,35],[-6,35],[-9,32],[-9,26],[-16,25]
    ], '#4c7a2a', '#3a5a1a');
    // MADAGASCAR
    polygon([[43,-12],[50,-16],[50,-22],[46,-25],[43,-22],[43,-16]], '#4c7a2a');
    // EUROPE
    polygon([
      [-9,36],[-6,44],[-2,44],[3,43],[7,43],[9,45],[12,45],[16,43],[19,42],[24,42],[27,40],[27,45],
      [30,46],[35,47],[40,44],[48,42],[52,38],[56,42],[58,50],[42,52],[40,58],[32,60],[26,63],
      [26,68],[15,70],[6,63],[6,58],[-2,54],[-6,52],[-9,52],[-9,44]
    ], '#4c7a2a');
    // BRITISH ISLES
    polygon([[-10,50],[-6,52],[-4,55],[-2,58],[-3,60],[-6,58],[-8,54],[-10,52]], '#4c7a2a');
    polygon([[-10,52],[-8,53],[-6,55],[-8,55],[-10,54]], '#4c7a2a');
    // SCANDINAVIA
    polygon([[8,58],[12,58],[16,60],[20,63],[24,65],[27,68],[30,70],[24,68],[20,66],[16,64],[12,62],[8,60]], '#4c7a2a');
    // ASIA (huge)
    polygon([
      [26,68],[40,66],[48,60],[55,60],[62,58],[70,60],[80,60],[95,65],[110,63],[125,60],[140,64],
      [150,68],[160,70],[170,68],[180,70],[180,60],[170,55],[160,55],[150,50],[145,45],[135,42],
      [130,37],[125,32],[120,25],[112,20],[104,15],[98,12],[95,17],[92,22],[88,22],[85,22],
      [82,26],[76,32],[70,30],[62,30],[58,36],[52,38],[48,42],[42,44],[40,46],[34,46],[30,46]
    ], '#4c7a2a');
    // INDIA (extra crisp — this is where we zoom)
    polygon([
      [67,24],[68,22],[70,20],[72,20],[73,18],[73,15],[76,10],[78,8.5],[80,8.5],[80,10],[80,13],
      [82,17],[84,19],[87,21],[89,22],[91,21],[92,24],[95,26],[93,27],[89,26],[88,26],[85,26],
      [82,26],[80,28],[78,30],[76,32],[74,34],[73,34],[72,32],[70,29],[68,27]
    ], '#5a8a2a', '#3a5a10');
    // SRI LANKA
    polygon([[80,10],[82,9],[82,6],[81,6],[80,7]], '#4c7a2a');
    // SE ASIA
    polygon([[95,20],[100,15],[104,10],[108,12],[110,15],[108,18],[104,18],[100,20]], '#4c7a2a');
    polygon([[98,15],[100,12],[102,8],[105,5],[103,2],[100,4],[98,10]], '#4c7a2a');
    // INDONESIA
    polygon([[95,5],[104,2],[110,-2],[114,-7],[120,-8],[125,-8],[130,-8],[128,-3],[122,-2],[116,-4],[110,-3],[104,0],[98,3]], '#4c7a2a');
    polygon([[118,-3],[124,-2],[128,-1],[130,-4],[128,-6],[122,-5]], '#4c7a2a');
    // PHILIPPINES
    polygon([[120,6],[122,10],[124,13],[122,17],[120,15],[121,10]], '#4c7a2a');
    // JAPAN
    polygon([[130,32],[135,34],[139,36],[141,39],[141,43],[144,43],[142,41],[139,38],[136,34],[133,33]], '#4c7a2a');
    polygon([[144,43],[145,45],[144,45],[143,44]], '#4c7a2a');
    // AUSTRALIA
    polygon([[114,-22],[113,-26],[115,-32],[118,-35],[126,-32],[130,-32],[134,-32],[138,-35],[141,-38],[146,-38],[150,-37],[153,-28],[153,-24],[146,-20],[142,-17],[138,-13],[130,-12],[124,-14],[118,-19]], '#8a6a2a', '#6a4a10');
    polygon([[145,-40],[148,-41],[148,-43],[146,-43],[144,-42]], '#8a6a2a');
    // NEW ZEALAND
    polygon([[170,-34],[173,-37],[175,-40],[172,-42],[170,-40],[168,-37]], '#4c7a2a');
    polygon([[168,-42],[172,-44],[174,-46],[170,-47],[167,-45]], '#4c7a2a');
    // NORTH AMERICA
    polygon([
      [-165,68],[-160,72],[-150,72],[-140,73],[-130,72],[-118,72],[-105,72],[-95,74],[-85,73],
      [-75,72],[-70,68],[-60,60],[-56,54],[-58,48],[-62,45],[-68,44],[-73,42],[-76,36],[-80,32],
      [-82,26],[-88,29],[-94,29],[-97,28],[-100,25],[-105,22],[-108,25],[-112,30],[-116,32],
      [-120,34],[-124,40],[-124,48],[-127,52],[-132,56],[-135,58],[-140,60],[-146,60],[-152,60],
      [-160,60],[-166,65]
    ], '#4c7a2a', '#3a5a10');
    // FLORIDA
    polygon([[-83,29],[-81,25],[-80,26],[-82,29]], '#4c7a2a');
    // BAJA
    polygon([[-115,32],[-114,28],[-110,24],[-109,22],[-112,26],[-115,30]], '#8a6a2a');
    // CENTRAL AMERICA
    polygon([[-90,22],[-88,18],[-84,16],[-80,12],[-77,9],[-83,8],[-88,14],[-90,17]], '#4c7a2a');
    // CARIBBEAN — Cuba + Hispaniola
    polygon([[-84,22],[-80,22],[-76,20],[-74,20],[-79,21],[-83,23]], '#4c7a2a');
    polygon([[-73,18],[-70,18],[-68,19],[-72,20]], '#4c7a2a');
    // SOUTH AMERICA
    polygon([
      [-78,12],[-72,12],[-63,10],[-59,5],[-52,0],[-48,-2],[-43,-5],[-38,-9],[-36,-14],[-38,-22],
      [-42,-28],[-48,-32],[-58,-38],[-64,-42],[-71,-52],[-74,-53],[-72,-46],[-73,-40],[-74,-34],
      [-72,-28],[-71,-22],[-72,-16],[-78,-10],[-80,-4],[-80,2],[-78,8]
    ], '#4c7a2a', '#3a5a10');
    // AMAZON basin — slightly darker green
    polygon([[-72,0],[-58,0],[-52,-4],[-50,-10],[-58,-12],[-68,-8]], '#3a6820');
    // GREENLAND
    polygon([[-52,82],[-25,84],[-15,80],[-20,72],[-30,68],[-45,68],[-52,74]], '#dee9f0');
    // ICELAND
    polygon([[-23,65],[-16,67],[-14,64],[-20,64]], '#4c7a2a');
    // ANTARCTICA hint
    polygon([[-180,-73],[180,-73],[180,-88],[-180,-88]], '#f0f5fa');

    // DESERTS — Sahara, Arabian, Gobi, Australian Outback overlays
    function desertOverlay(points) {
      g.save();
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(200,150,80,0.55)';
      g.beginPath();
      points.forEach((p, i) => { const [x, y] = ll(p[0], p[1]); if (i === 0) g.moveTo(x,y); else g.lineTo(x,y); });
      g.closePath();
      g.fill();
      g.restore();
    }
    desertOverlay([[-16,30],[-6,30],[10,30],[24,28],[30,24],[32,18],[20,16],[6,16],[-8,20]]); // Sahara
    desertOverlay([[35,30],[48,28],[54,22],[52,16],[42,14],[36,22]]); // Arabian
    desertOverlay([[80,42],[110,44],[115,40],[95,38],[82,38]]); // Gobi
    desertOverlay([[118,-22],[140,-22],[140,-28],[122,-30]]); // Aussie outback
    desertOverlay([[68,26],[74,24],[76,24],[74,28],[70,28]]); // Thar

    // Mountain shading — subtle darker streaks
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.strokeStyle = 'rgba(30,20,10,0.35)';
    g.lineWidth = 3;
    const ranges = [
      [[72,35],[78,32],[86,30],[92,28]],   // Himalayas
      [[-72,-8],[-70,-16],[-71,-24],[-71,-32],[-72,-42]], // Andes
      [[-116,44],[-118,40],[-112,36],[-108,32]], // Rockies
      [[6,45],[10,46],[14,46],[18,46]],   // Alps
      [[36,42],[42,40],[48,38]]           // Caucasus
    ];
    ranges.forEach(pts => {
      g.beginPath();
      pts.forEach(([lon, lat], i) => { const [x, y] = ll(lon, lat); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); });
      g.stroke();
    });
    g.restore();

    // Softly blur the whole thing so edges don't look jagged at zoom
    // (a subtle over-composite of the same texture at slight offsets)
    return new THREE.CanvasTexture(c);
  }

  // Night city lights fallback (procedural)
  function buildProceduralNightTexture() {
    const c = document.createElement('canvas');
    c.width = 2048; c.height = 1024;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, 2048, 1024);
    // Rough population centers as points (lon, lat, intensity)
    const cities = [
      [72.79,21.15, 1.0], [77.20,28.61, 1.0], [72.87,19.07, 1.0], [80.27,13.08, .9],
      [88.36,22.57, .9], [77.59,12.97, .9], [78.48,17.38, .8], [73.85,18.52, .8],
      [-74,40, 1.0], [-118,34, 1.0], [-87,41, .9], [-95,29, .9], [-79,43, .8],
      [-3,51, 1.0], [2.35,48.85, 1.0], [13,52.5, .9], [12.5,41.9, .8],
      [37.6,55.75, 1.0], [30.5,50.4, .8], [39,21, .7],
      [139.7,35.68, 1.0], [116.4,39.9, 1.0], [121.5,31.2, 1.0], [104,30, .9],
      [126.97,37.56, .9], [114,22.3, .8], [113.9,22.5, .8], [100.5,13.75, .8],
      [151.2,-33.87, .8], [144.96,-37.81, .7], [174.76,-36.85, .5],
      [-99.13,19.43, .9], [-46.63,-23.55, .9], [-58.38,-34.6, .8], [-70.65,-33.45, .7],
      [-43.17,-22.9, .7], [15,-4, .5], [3.4,6.5, .7], [28,-26, .7], [31.2,30, .8],
    ];
    cities.forEach(([lon, lat, w]) => {
      const x = ((lon + 180) / 360) * 2048;
      const y = ((90 - lat) / 180) * 1024;
      const r = 40 + w * 40;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0,    `rgba(255,220,140,${0.9 * w})`);
      grd.addColorStop(0.35, `rgba(255,180,80,${0.35 * w})`);
      grd.addColorStop(1,    'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    });
    // Sprinkle small town lights near coasts
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 2048;
      const y = 150 + Math.random() * 700;
      g.fillStyle = `rgba(255,220,140,${Math.random() * 0.4})`;
      g.fillRect(x, y, 1, 1);
    }
    return new THREE.CanvasTexture(c);
  }

  const proceduralEarthTex = buildProceduralEarthTexture();
  const proceduralNightTex = buildProceduralNightTexture();
  proceduralEarthTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  proceduralNightTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Custom day/night shader material — supports either canvas or real textures
  const earthUniforms = {
    uDayTex:    { value: proceduralEarthTex },
    uNightTex:  { value: proceduralNightTex },
    uSunDir:    { value: new THREE.Vector3().copy(sunDir) },
    uAtmoColor: { value: new THREE.Color(0x88bbff) },
  };
  const earthMat = new THREE.ShaderMaterial({
    uniforms: earthUniforms,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uDayTex;
      uniform sampler2D uNightTex;
      uniform vec3 uSunDir;
      uniform vec3 uAtmoColor;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        // Sun direction transformed into view space via normalMatrix approximation:
        // (uSunDir is world-space; we compare against a world-adjusted normal.)
        // Since Earth rotates in place, this looks natural.
        vec3 N = normalize(vNormal);
        vec3 L = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
        float lambert = max(dot(N, L), 0.0);
        float dayMix  = smoothstep(-0.15, 0.25, dot(N, L));

        vec3 dayCol   = texture2D(uDayTex,   vUv).rgb;
        vec3 nightCol = texture2D(uNightTex, vUv).rgb;

        // Warm dusk band at terminator
        float dusk = smoothstep(0.0, 0.15, dot(N, L)) * (1.0 - smoothstep(0.15, 0.35, dot(N, L)));
        vec3 duskTint = vec3(1.0, 0.55, 0.25) * dusk * 0.35;

        vec3 col = mix(nightCol * 1.4, dayCol * (0.35 + 0.9 * lambert), dayMix);
        col += duskTint;

        // Rim / atmosphere hue
        float rim = pow(1.0 - max(dot(N, vViewDir), 0.0), 3.0);
        col += uAtmoColor * rim * 0.6;

        gl_FragColor = vec4(col, 1.0);
      }`,
  });

  const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 128, 128), earthMat);
  scene.add(earth);

  // Cloud sphere — slightly larger, rotates independently
  const cloudsCanvas = document.createElement('canvas');
  cloudsCanvas.width = 2048; cloudsCanvas.height = 1024;
  const cctx = cloudsCanvas.getContext('2d');
  cctx.fillStyle = 'rgba(0,0,0,0)';
  cctx.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 340; i++) {
    const x = Math.random() * 2048;
    const y = 80 + Math.random() * 860;
    const r = 30 + Math.random() * 140;
    const g = cctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    cctx.fillStyle = g;
    cctx.beginPath(); cctx.arc(x, y, r, 0, Math.PI * 2); cctx.fill();
  }
  const cloudTex = new THREE.CanvasTexture(cloudsCanvas);
  const cloudMat = new THREE.MeshPhongMaterial({
    map: cloudTex,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    specular: 0x111111,
    shininess: 4,
  });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.015, 96, 96), cloudMat);
  scene.add(clouds);

  // Multi-layer atmosphere — outer glow (blue) + inner haze
  const atmoOuter = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R * 1.28, 96, 96),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color('#5aa4ff') } },
      vertexShader: `
        varying vec3 vN;
        void main() {
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vN;
        uniform vec3 uColor;
        void main() {
          float i = pow(0.72 - dot(vN, vec3(0.0, 0.0, 1.0)), 3.0);
          gl_FragColor = vec4(uColor, 1.0) * i;
        }`,
    })
  );
  scene.add(atmoOuter);

  const atmoInner = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R * 1.06, 96, 96),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color('#a0d0ff') } },
      vertexShader: `
        varying vec3 vN;
        void main() {
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vN;
        uniform vec3 uColor;
        void main() {
          float i = pow(0.7 - dot(vN, vec3(0.0, 0.0, 1.0)), 2.5);
          gl_FragColor = vec4(uColor, 1.0) * i * 0.75;
        }`,
    })
  );
  scene.add(atmoInner);
  const atmo = atmoOuter; // used by timeline for opacity control

  // Attempt to upgrade to real NASA textures. Prefer high-res (~4K/8K) so the surface
  // stays sharp when we zoom to Gujarat. Fall back through progressively smaller sources.
  (function upgradeTextures() {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    // Try each candidate in order. GitHub raw content serves CORS-friendly + high-res.
    const dayCandidates = [
      // three-globe blue marble — ~8K NASA
      'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-blue-marble.jpg',
      'https://cdn.jsdelivr.net/gh/vasturiano/three-globe@master/example/img/earth-blue-marble.jpg',
      // three.js example — 2K fallback
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_atmos_2048.jpg',
      'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
    ];
    const cloudCandidates = [
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png',
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_clouds_1024.png',
      'https://threejs.org/examples/textures/planets/earth_clouds_1024.png',
    ];
    const nightCandidates = [
      'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg',
      'https://cdn.jsdelivr.net/gh/vasturiano/three-globe@master/example/img/earth-night.jpg',
    ];

    // Overall timeout so we don't hang forever
    let cancelled = false;
    const timer = setTimeout(() => { cancelled = true; }, 8000);

    function tryLoad(urls, onSuccess) {
      let idx = 0;
      const attempt = () => {
        if (cancelled || idx >= urls.length) return;
        loader.load(urls[idx],
          tex => { if (!cancelled) onSuccess(tex, urls[idx]); },
          undefined,
          () => { idx++; attempt(); }
        );
      };
      attempt();
    }

    tryLoad(dayCandidates, (tex, url) => {
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      // Prevent seam artifacts and give the sampler good filtering
      tex.wrapS = THREE.RepeatWrapping;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.needsUpdate = true;
      earthUniforms.uDayTex.value = tex;
      console.log('[intro] Loaded earth day texture:', url, tex.image?.width + 'x' + tex.image?.height);
    });

    tryLoad(cloudCandidates, (tex) => {
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      clouds.material.map = tex;
      clouds.material.needsUpdate = true;
    });

    tryLoad(nightCandidates, (tex) => {
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      earthUniforms.uNightTex.value = tex;
    });
  })();

  /* ---------- Surat marker: sprite + vertical beacon beam ---------- */
  const pinSprite = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const rad = g.createRadialGradient(64, 64, 0, 64, 64, 62);
    rad.addColorStop(0,    'rgba(255,244,190,1)');
    rad.addColorStop(0.25, 'rgba(255,211,112,0.95)');
    rad.addColorStop(0.6,  'rgba(244,160,42,0.5)');
    rad.addColorStop(1,    'rgba(244,160,42,0)');
    g.fillStyle = rad;
    g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    // Cross-flare
    g.strokeStyle = 'rgba(255,244,190,0.8)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(14, 64); g.lineTo(114, 64); g.moveTo(64, 14); g.lineTo(64, 114); g.stroke();
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.scale.set(28, 28, 1);
    return s;
  })();
  scene.add(pinSprite);

  function latLonToVec3(lat, lon, r = EARTH_R) {
    const phi   = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    const x = -r * Math.sin(phi) * Math.cos(theta);
    const z =  r * Math.sin(phi) * Math.sin(theta);
    const y =  r * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  }
  const surat = latLonToVec3(21.15, 72.79, EARTH_R + 0.6);
  pinSprite.position.copy(surat);

  // Beacon beam — a slim tapered cylinder that stands normal to the earth surface at Surat.
  const BEAM_H = 14;
  const beamGeo = new THREE.CylinderGeometry(0.15, 0.9, BEAM_H, 16, 1, true);
  const beamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(0xffd370) },
      uTime:  { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        // Fade top to bottom, pulse
        float v = smoothstep(1.0, 0.0, vUv.y);
        float pulse = 0.7 + 0.3 * sin(uTime * 4.0 + vUv.y * 8.0);
        gl_FragColor = vec4(uColor, v * 0.85 * pulse);
      }`,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.visible = false;
  scene.add(beam);
  // Orient beam along the surface normal (base sits on surface, extends BEAM_H upward)
  {
    const suratSurface = latLonToVec3(21.15, 72.79, EARTH_R);
    const up = suratSurface.clone().normalize();
    beam.position.copy(suratSurface).add(up.clone().multiplyScalar(BEAM_H / 2));
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    beam.quaternion.copy(q);
  }
  // Beam + pin belong to earth's rotation frame so they stay over Surat as earth spins
  earth.add(beam);
  earth.add(pinSprite);
  pinSprite.position.copy(latLonToVec3(21.15, 72.79, EARTH_R + 0.6));

  /* ---------- Resize ---------- */
  window.addEventListener('resize', () => {
    renderer.setSize(W(), H());
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
  });

  /* ---------- Timeline ---------- */
  // Ease helpers
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeIn  = t => t * t * t;
  const lerp = (a, b, t) => a + (b - a) * t;

  // Phases (start times in seconds) — snappier earth zoom, deeper final approach:
  // 0.0 — 1.2 : Wide cosmos, caption 1
  // 1.2 — 2.4 : Warp / hyperjump, caption 2
  // 2.4 — 4.5 : Approach Earth, rotate India to camera, caption 3
  // 4.5 — 6.6 : Dive to Surat — cz reaches 108
  // 6.6 — 7.7 : Push in to Gujarat close-up (cz→105), locator, caption 4
  // 7.7 — 8.5 : Warm gold flash
  const TOTAL = 8.5;

  let startTime = 0;
  let running   = true;
  let finished  = false;

  function setCaption(idx) {
    captions.forEach((c, i) => c.classList.toggle('show', i === idx));
  }

  function step(t) {
    if (!startTime) startTime = t;
    let elapsed = (t - startTime) / 1000;
    // Debug: force-hold at a specific elapsed time by setting window.__introFreeze
    if (typeof window.__introFreeze === 'number') elapsed = window.__introFreeze;

    if (!finished) {
      // Camera path along a curved dolly toward earth
      let cx = 0, cy = 0, cz = 1200;
      let earthRotY = 0;
      let atmoOpacity = 0;
      let warpOpacity = 0;
      let lookAtLerp = 0; // 0 = origin, 1 = Surat world pos

      // The rotation value that brings Surat to +Z in world space.
      // Computed from latLonToVec3(21.15°N, 72.79°E) → local (30.9, 36.1, -88.2).
      // Angle in XZ plane = atan2(-88.2, 30.9) = -1.234 rad. We want +Z = π/2 = 1.571.
      // Three.js right-hand Y-rotation moves +Z → +X, so target = origAngle - desiredAngle.
      const ROT_TO_SURAT = -2.805;

      if (elapsed < 1.2) {
        // Wide cosmos — quick drift in
        const p = elapsed / 1.2;
        cz = lerp(1200, 900, ease(p));
        cx = Math.sin(p * Math.PI) * 40;
        setCaption(0);
        atmoOpacity = 0.6 * p;
      } else if (elapsed < 2.4) {
        // Warp jump — fast
        const p = (elapsed - 1.2) / 1.2;
        cz = lerp(900, 380, ease(p));
        warpOpacity = Math.sin(p * Math.PI);
        earthRotY = lerp(0, ROT_TO_SURAT * 0.4, ease(p));
        setCaption(1);
        atmoOpacity = 0.7;
      } else if (elapsed < 4.5) {
        // Approach — rotate India into view
        const p = (elapsed - 2.4) / 2.1;
        cz = lerp(380, 175, easeOut(p));
        earthRotY = lerp(ROT_TO_SURAT * 0.4, ROT_TO_SURAT, easeOut(p));
        setCaption(2);
        atmoOpacity = 0.85;
        lookAtLerp = 0;
      } else if (elapsed < 6.6) {
        // Dive — camera drops toward Surat & lookAt tracks Surat
        const p = (elapsed - 4.5) / 2.1;
        cz = lerp(175, 122, easeOut(p));
        cy = lerp(0, 40, easeOut(p));
        earthRotY = ROT_TO_SURAT;
        setCaption(3);
        atmoOpacity = lerp(0.85, 0.4, easeOut(p));
        lookAtLerp = easeOut(p);
        if (locator) locator.classList.add('show');
      } else if (elapsed < 7.7) {
        // Hold at a sharp-enough distance — Gujarat clearly visible, texture not blurry
        const p = (elapsed - 6.6) / 1.1;
        cz = lerp(122, 118, p);
        cy = 40;
        earthRotY = ROT_TO_SURAT;
        atmoOpacity = 0.3;
        setCaption(4);
        lookAtLerp = 1;
      } else if (elapsed < TOTAL) {
        // Warm gold flash + gentle push
        const p = (elapsed - 7.7) / (TOTAL - 7.7);
        cz = lerp(118, 116, p);
        cy = 40;
        earthRotY = ROT_TO_SURAT;
        atmoOpacity = 0.25;
        lookAtLerp = 1;
        cinematic.style.setProperty('--flash', p.toFixed(3));
      } else {
        finishIntro();
      }

      camera.position.set(cx, cy, cz);

      // Camera looks at Surat's world position (interpolated from origin).
      // With rotY = ROT_TO_SURAT, Surat sits at ~(0, 36.1, 93.5) in world.
      const suratWorld = new THREE.Vector3(0, 36.1, 93.5);
      // For intermediate rotations, compute Surat's actual world pos.
      const local = latLonToVec3(21.15, 72.79, EARTH_R);
      const cs = Math.cos(earthRotY), sn = Math.sin(earthRotY);
      const suratNow = new THREE.Vector3(
        local.x * cs + local.z * sn,
        local.y,
        -local.x * sn + local.z * cs
      );
      const target = new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 0, 0), suratNow, lookAtLerp);
      camera.lookAt(target);

      earth.rotation.y  = earthRotY;
      clouds.rotation.y = earthRotY + elapsed * 0.02; // clouds drift a hair faster
      atmoOuter.rotation.y = earthRotY;
      atmoInner.rotation.y = earthRotY;

      // Hide sky layers when we're inside their sphere or too close
      atmoOuter.visible = cz > 130;
      atmoInner.visible = cz > 112;
      clouds.visible    = cz > 112;

      // Reveal beacon beam during approach/dive; hide when close-up begins
      beam.visible = elapsed > 3.0 && cz > 128;
      beam.material.uniforms.uTime.value = elapsed;
      const beamGrow = Math.max(0, Math.min(1, (elapsed - 3.0) / 1.5));
      beam.scale.set(1, Math.max(0.01, beamGrow), 1);

      // Pin sprite: bigger when far, tiny when zoomed in
      const nearPinScale = 4 + Math.sin(elapsed * 5) * 0.6;
      const farPinScale  = 12 + Math.sin(elapsed * 5) * 2;
      const zoomT = Math.max(0, Math.min(1, (140 - cz) / 30));
      const pinScale = lerp(farPinScale, nearPinScale, zoomT);
      pinSprite.scale.setScalar(pinScale);

      // Warp streak stretching
      warp.material.opacity = warpOpacity * 0.9;
      const posAttr = warp.geometry.getAttribute('position');
      const stretch = 20 + warpOpacity * 260;
      for (let i = 0; i < WARP; i++) {
        const bx = warpBase[i * 3], by = warpBase[i * 3 + 1], bz = warpBase[i * 3 + 2];
        // Move base toward camera over time for a pulsing feel
        const zOff = ((elapsed * 400 + i * 3) % 1200) - 600;
        const z = bz + zOff;
        posAttr.array[i * 6]     = bx;
        posAttr.array[i * 6 + 1] = by;
        posAttr.array[i * 6 + 2] = z;
        posAttr.array[i * 6 + 3] = bx;
        posAttr.array[i * 6 + 4] = by;
        posAttr.array[i * 6 + 5] = z + stretch;
      }
      posAttr.needsUpdate = true;

      // Rotate nebula slowly for parallax
      nebula.rotation.y = elapsed * 0.003;
      nebula.rotation.x = Math.sin(elapsed * 0.05) * 0.02;
    }

    renderer.render(scene, camera);
    if (running) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);

  /* ---------- Finish → mandap ---------- */
  function finishIntro(instant = false) {
    if (finished) return;
    finished = true;
    if (locator) locator.classList.remove('show');
    if (mandap)  mandap.classList.add('reveal');
    setTimeout(() => {
      cinematic.classList.add('done-cosmos');
      // Fade the flash out over ~1.2s
      let f = 1;
      const fadeFlash = () => {
        f = Math.max(0, f - 0.05);
        cinematic.style.setProperty('--flash', f.toFixed(2));
        if (f > 0) requestAnimationFrame(fadeFlash);
      };
      fadeFlash();
    }, instant ? 0 : 200);
    setTimeout(() => { running = false; }, 4000);
  }

  /* ---------- Skip / enter / replay ---------- */
  if (skipBtn) skipBtn.addEventListener('click', () => finishIntro(true));
  if (enterBtn) enterBtn.addEventListener('click', () => {
    cinematic.classList.add('gone');
    setTimeout(() => {
      cinematic.style.display = 'none';
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }, 900);
    document.body.classList.add('intro-done');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  if (replayBtn) replayBtn.addEventListener('click', () => {
    window.location.reload();
  });
})();
