/* ============================================================
   Visor interactivo del Resonador Ω — seis estados sobre un mismo modelo
   ============================================================ */
(function () {
  'use strict';
  const T = THREE, PI = Math.PI, D2R = PI / 180;
  const $ = function (s) { return document.querySelector(s); };
  const M = ResonadorModel.build();
  const units = M.units, byId = M.byId, SYS = M.SYS;
  const sysList = Object.keys(SYS);

  /* ---------- renderer, escena, cámara ---------- */
  const view = $('#view'), svg = $('#overlay');
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.outputEncoding = T.sRGBEncoding; renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);
  view.appendChild(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(30, 1, 0.5, 400);
  camera.position.set(21, 10.5, 26);
  const controls = new T.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.target.set(0, 6, 0);
  controls.minDistance = 2.5; controls.maxDistance = 110; controls.maxPolarAngle = PI * 0.52;
  scene.add(M.root);

  // entorno de estudio (reflejos para el metal)
  (function () {
    const sc = new T.Scene();
    sc.add(new T.Mesh(new T.BoxGeometry(34, 18, 34), new T.MeshBasicMaterial({ color: 0x2b3138, side: T.BackSide })));
    function panel(w, h, x, y, z, k, c) {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k), side: T.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m);
    }
    panel(14, 6, 0, 8, -12, 5, 0xffffff); panel(6, 10, 14, 2, 4, 3, 0xe9f0ff);
    panel(8, 8, -13, 5, 6, 2, 0xfff2e0); panel(16, 16, 0, 15, 0, 2, 0xffffff);
    panel(18, 3, 0, -4, 12, .7, 0xbfc8d4);
    const pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(sc, 0.04).texture;
  })();
  const key = new T.DirectionalLight(0xffffff, 1.1); key.position.set(10, 18, 12); scene.add(key);
  const rimL = new T.DirectionalLight(0x9db8ff, 0.7); rimL.position.set(-12, 8, -10); scene.add(rimL);
  scene.add(new T.HemisphereLight(0xdfe6ee, 0x333b44, 0.35));

  // brillo del núcleo (solo visor; no se exporta)
  const fx = new T.Group(); scene.add(fx);
  const coreLight = new T.PointLight(0x8f7bff, 3, 10, 2); fx.add(coreLight);
  (function () {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    gr.addColorStop(0, 'rgba(210,200,255,1)'); gr.addColorStop(.25, 'rgba(140,120,255,.55)'); gr.addColorStop(1, 'rgba(90,70,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: .55 }));
    sp.scale.setScalar(4.2); sp.name = 'halo'; fx.add(sp);
  })();

  /* ---------- suelo, cotas ---------- */
  const floor = new T.Group(); scene.add(floor);
  (function () {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 20, 128, 128, 126);
    gr.addColorStop(0, 'rgba(0,0,0,.5)'); gr.addColorStop(.6, 'rgba(0,0,0,.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const sh = new T.Mesh(new T.PlaneGeometry(15, 15), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    sh.rotation.x = -PI / 2; sh.position.y = 0.01; floor.add(sh);
    const lm = new T.LineBasicMaterial({ color: 0x6d7782, transparent: true, opacity: .4 });
    [5.6, 8.5, 12].forEach(function (r) {
      const pts = []; for (let i = 0; i <= 96; i++) pts.push(new T.Vector3(r * Math.cos(i / 96 * PI * 2), 0.02, r * Math.sin(i / 96 * PI * 2)));
      floor.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), lm));
    });
    for (let i = 0; i < 8; i++) { const a = i * PI / 4; floor.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(5.6 * Math.cos(a), .02, 5.6 * Math.sin(a)), new T.Vector3(12 * Math.cos(a), .02, 12 * Math.sin(a))]), lm)); }
  })();
  const cotas = new T.Group(); scene.add(cotas);
  const cotaPts = {};
  (function () {
    const lm = new T.LineBasicMaterial({ color: 0x55606b });
    function seg(a, b) { cotas.add(new T.Line(new T.BufferGeometry().setFromPoints([a, b]), lm)); }
    const th = 51 * D2R, rg = new T.Vector3(Math.sin(th), 0, -Math.cos(th)), fr = new T.Vector3(Math.cos(th), 0, Math.sin(th));
    const base = fr.clone().multiplyScalar(-0.2).addScaledVector(rg, -6.6).add(new T.Vector3(0, 0, 0));
    base.addScaledVector(fr, 3.2);
    const a = base.clone(), b = base.clone(); b.y = 12.5; a.y = 0.02;
    seg(a, b); [a, b].forEach(function (p) { seg(p.clone().addScaledVector(rg, -.35), p.clone().addScaledVector(rg, .35)); });
    cotaPts.h = a.clone().lerp(b, .5);
    const c = fr.clone().multiplyScalar(5.9), p1 = c.clone().addScaledVector(rg, -4.9), p2 = c.clone().addScaledVector(rg, 4.9);
    p1.y = p2.y = 0.03; seg(p1, p2); [p1, p2].forEach(function (p) { seg(p.clone().addScaledVector(fr, -.35), p.clone().addScaledVector(fr, .35)); });
    cotaPts.d = p1.clone().lerp(p2, .5);
  })();
  const cotaH = $('#cotaH'), cotaD = $('#cotaD');

  /* ---------- explosión: posiciones objetivo ---------- */
  const stackOrder = ['Anclajes', 'Plataforma_Base', 'Pedestal_Equipos', 'Anillo_Inferior', 'Camara_Vacio_Inferior', 'Electrodo_Inferior',
    'Fluido_Inferior', 'Nucleo_Omega', 'Fluido_Superior', 'Electrodo_Superior', 'Camara_Vacio_Superior',
    'Bobina_01', 'Bobina_02', 'Bobina_03', 'Bobina_04', 'Bobina_05', 'Bobina_06', 'Bobina_07', 'Anillo_Intermedio', 'Anillo_Superior', 'Cabeza'];
  let expTop = 0, expBottom = 0;
  (function () {
    let y = -6.0;
    stackOrder.forEach(function (id) {
      const d = byId[id].userData, ctr = y + d.h / 2;
      d.dyExp = ctr - d.cy; d.ctrExp = ctr;
      y += d.h + (id.indexOf('Bobina_0') === 0 && id !== 'Bobina_07' ? 0.2 : 0.4);
    });
    expBottom = -6.0; expTop = y;
    const tc = (byId.Anillo_Inferior.userData.ctrExp + byId.Anillo_Superior.userData.ctrExp) / 2;
    units.forEach(function (u) {
      const d = u.userData;
      d.base = u.position.clone(); d.azr = d.az * D2R; d.drExp = d.dr || 0;
      if (d.dyMode === 'tower') d.dyExp = tc - d.cy;
    });
    units.forEach(function (u) { const d = u.userData; if (d.dyLike) d.dyExp = byId[d.dyLike].userData.dyExp; });
  })();
  const floorExpY = byId.Anclajes.userData.ctrExp - 1.0;

  // líneas punteadas de ensamblaje (estáticas: posición original → posición desplazada)
  const guides = new T.Group(); scene.add(guides);
  const guideMat = new T.LineDashedMaterial({ color: 0x3b4650, dashSize: .28, gapSize: .2, transparent: true, opacity: 0 });
  (function () {
    function line(a, b) { const l = new T.Line(new T.BufferGeometry().setFromPoints([a, b]), guideMat); l.computeLineDistances(); guides.add(l); }
    line(new T.Vector3(0, expBottom - .6, 0), new T.Vector3(0, expTop + .4, 0));
    units.forEach(function (u) {
      const d = u.userData; if (!d.dr) return;
      const box = new T.Box3().setFromObject(u), c0 = box.getCenter(new T.Vector3());
      line(c0, new T.Vector3(c0.x + d.dr * Math.cos(d.azr), c0.y + d.dyExp, c0.z + d.dr * Math.sin(d.azr)));
    });
  })();

  /* ---------- etiquetas ---------- */
  const LBL = {
    despiece: [
      ['Cabeza', 'Cabeza de control'], ['Anillo_Superior', 'Anillo superior de\ncontención magnética'],
      ['Columna_02', 'Columnas estructurales (×8)'], ['Arriostres_02', 'Arriostres diagonales (×8)'],
      ['Anillo_Intermedio', 'Anillo intermedio'], ['Bobina_05', 'Bobinas de estabilización\nmagnética (×7)'],
      ['Camara_Vacio_Superior', 'Cámara de vacío\n(dos semicámaras)'], ['Nucleo_Omega', 'Núcleo del Resonador Ω'],
      ['Fluido_Superior', 'Fluido emulsionado'], ['Nucleo_Omega', 'Anillos de resonancia', 'Anillos_Resonancia'],
      ['Intercambiador_A', 'Sistema de refrigeración'], ['Modulo_Control_A', 'Módulos de control'],
      ['Fuente_Energia', 'Fuente de energía'], ['Anillo_Inferior', 'Anillo inferior\n(plataforma de acceso)'],
      ['Plataforma_Base', 'Base y anclajes']
    ].map(function (a) { return { u: a[0], t: a[1], sub: a[2], n: true }; }),
    explosion: [
      ['Anclajes', 'Pernos de anclaje'], ['Plataforma_Base', 'Plataforma base'], ['Pedestal_Equipos', 'Pedestal de equipos'],
      ['Anillo_Inferior', 'Anillo inferior'], ['Camara_Vacio_Inferior', 'Cámara de vacío (inferior)'], ['Electrodo_Inferior', 'Placa del capacitor'],
      ['Fluido_Inferior', 'Fluido emulsionado'], ['Nucleo_Omega', 'Núcleo del Resonador Ω'], ['Fluido_Superior', 'Fluido emulsionado'],
      ['Electrodo_Superior', 'Placa del capacitor'], ['Camara_Vacio_Superior', 'Cámara de vacío (superior)'],
      ['Bobina_04', 'Bobinas de estabilización (×7)'], ['Anillo_Intermedio', 'Anillo intermedio'], ['Anillo_Superior', 'Anillo superior'], ['Cabeza', 'Cabeza de control']
    ].map(function (a) { return { u: a[0], t: a[1], n: true }; }).concat([
      ['Columna_02', 'Columnas (×8)'], ['Arriostres_02', 'Arriostres (×8)'], ['Fuente_Energia', 'Fuente de energía'],
      ['Modulo_Control_A', 'Módulos de control'], ['Intercambiador_A', 'Refrigeración'], ['Cable_Principal', 'Cableado'], ['Varilla_Tensora_1', 'Varillas tensoras']
    ].map(function (a) { return { u: a[0], t: a[1], n: false }; })),
    corte: [
      ['Anillo_Superior', 'Estructura exterior\n(columnas y anillos)'], ['Camara_Vacio_Superior', 'Cámara de vacío'],
      ['Nucleo_Omega', 'Núcleo Ω en capas\n(carcasa, lente y centro)'], ['Fluido_Inferior', 'Fluido emulsionado'],
      ['Bobina_02', 'Bobinas con devanado\nde cobre'], ['Intercambiador_B', 'Conductos de refrigeración'],
      ['Bomba_Principal', 'Sistema de refrigeración'], ['Modulo_Control_C', 'Módulos de control'], ['Plataforma_Base', 'Base y pedestal']
    ].map(function (a) { return { u: a[0], t: a[1], n: true }; }),
    transparencia: [
      ['Columna_02', 'Estructura exterior\n(transparente)'], ['Camara_Vacio_Superior', 'Cámara de vacío\n(semitransparente)'],
      ['Nucleo_Omega', 'Núcleo Ω (visible)'], ['Bobina_03', 'Bobinas (visibles)'], ['Fluido_Superior', 'Fluido emulsionado'],
      ['Intercambiador_A', 'Conductos y refrigeración']
    ].map(function (a) { return { u: a[0], t: a[1], n: true }; }),
    acercaA: [
      ['Fluido_Superior', 'Fluido emulsionado\nde Hydraether'], ['Nucleo_Omega', 'Núcleo del Resonador Ω'],
      ['Electrodo_Superior', 'Placa del capacitor'], ['Camara_Vacio_Superior', 'Cámara de vacío']
    ].map(function (a) { return { u: a[0], t: a[1], n: true }; }),
    acercaB: [
      { u: 'Bobina_05', t: 'Devanado de cobre', off: [1.379, .31, 1.379] },
      { u: 'Bobina_05', t: 'Carrete de acero', off: [1.19, -.1, 1.19] },
      { u: 'Bobina_05', t: 'Orejeta de sujeción', off: [2.217, .08, .918] },
      { u: 'Varilla_Tensora_1', t: 'Varilla tensora', off: [0, 1.0, 0] },
      { u: 'Camara_Vacio_Superior', t: 'Cámara de vacío', off: [.884, -.9, .884] }
    ].map(function (a) { a.n = true; return a; })
  };
  // anclas locales (centro de la caja de cada pieza en reposo)
  Object.keys(LBL).forEach(function (k) {
    LBL[k].forEach(function (l) {
      const u = byId[l.u]; let p;
      if (l.off) p = new T.Vector3(l.off[0], l.off[1], l.off[2]);
      else {
        const o = l.sub ? u.getObjectByName(l.sub) : u;
        p = u.worldToLocal(new T.Box3().setFromObject(o).getCenter(new T.Vector3()));
      }
      l.anchor = p; l.unit = u;
    });
  });

  /* ---------- estados ---------- */
  const STATES = {
    general: {
      name: 'General', t: 0, cut: 0, xray: 0, tint: 0, cotas: true, labels: null,
      cam: { p: [21, 10.5, 26], t: [0, 5.6, 0] },
      title: 'Vista general', text: 'El Resonador Ω completo: un único dispositivo de 12,5 m de altura y 9,8 m de diámetro. Un núcleo luminoso al centro, rodeado de bobinas, columnas y anillos; la cabeza de control arriba y los equipos en la base.'
    },
    despiece: {
      name: 'Despiece', t: 0.28, cut: 0, xray: 0, tint: .5, cotas: false, labels: 'despiece',
      cam: { p: [23, 11.5, 29], t: [0, 6, 0] },
      title: 'Despiece', text: 'Identifica las partes principales y explica qué hace cada una. El color marca el sistema al que pertenece la pieza: estructura, núcleo, estabilización magnética, refrigeración, control y base. Haz clic en una pieza para leer su función.'
    },
    explosion: {
      name: 'Explosión', t: 1, cut: 0, xray: 0, tint: 0.35, cotas: false, labels: 'explosion', guides: 1,
      cam: { p: [30, 15, 50], t: [0, 9.4, 0] },
      title: 'Explosión', text: 'Las piezas se separan a lo largo del eje vertical en orden de ensamblaje: se arma de 1 (anclajes) a 15 (cabeza). Columnas, arriostres y equipos se abren en dirección radial. Las líneas punteadas llevan cada pieza a su posición original.'
    },
    corte: {
      name: 'Corte', t: 0, cut: 1, xray: 0, tint: 0, cotas: false, labels: 'corte',
      cam: { p: [19, 9.5, 23], t: [0, 5.8, 0] },
      title: 'Corte longitudinal', text: 'Se retira un cuarto del dispositivo para ver el interior: la carcasa externa, la cámara de vacío, el núcleo en capas, el devanado de las bobinas y el sistema de refrigeración. Las superficies seccionadas llevan rayado naranja, como en un plano técnico.'
    },
    transparencia: {
      name: 'Transparencia', t: 0, cut: 0, xray: 1, tint: 0, cotas: false, labels: 'transparencia',
      xr: { ext: .1, cham: .7, coil: 1, aux: 1, base: .4, core: 1 },
      cam: { p: [21, 10.5, 26], t: [0, 5.6, 0] },
      title: 'Transparencia', text: 'La estructura exterior casi desaparece y la cámara de vacío queda semitransparente. Núcleo, bobinas y refrigeración siguen visibles, así se entienden las capas del interior hacia afuera: núcleo, cámara, bobinas y estructura.'
    },
    acercamiento: {
      name: 'Acercamiento', t: 0, cut: 0, xray: 1, tint: 0, cotas: false, labels: 'acercaA', inset: true,
      xr: { ext: .06, cham: .45, coil: .22, aux: .3, base: .2, core: 1 },
      cam: { p: [6.5, 7.4, 6.5], t: [0, 6.2, 0] },
      title: 'Acercamiento', text: ''
    }
  };
  const ZONES = {
    A: {
      labels: 'acercaA', inset: true, xr: { ext: .06, cham: .45, coil: .22, aux: .3, base: .2, core: 1 }, cam: { p: [6.5, 7.4, 6.5], t: [0, 6.2, 0] },
      title: 'Acercamiento A · La emulsión de Hydraether',
      text: 'Lo que no se ve a simple vista. El fluido del núcleo es una emulsión: gotas de agua (H₂O) y dióxido de carbono (CO₂) que no se mezclan solas y se mantienen unidas gracias a un emulsionante. La lupa muestra la idea de forma esquemática; no está a escala molecular.'
    },
    B: {
      labels: 'acercaB', inset: false, xr: { ext: .12, cham: .5, coil: 1, aux: .4, base: .3, core: 1 }, cam: { p: [4.3, 7.6, 4.3], t: [1.38, 6.8, 1.38] },
      title: 'Acercamiento B · Estabilización magnética',
      text: 'Detalle de una bobina: el devanado de cobre sobre su carrete de acero, las orejetas que la sujetan a las varillas tensoras y su cercanía a la cámara de vacío. En la vista general estas piezas parecen simples anillos.'
    }
  };
  let stateId = 'general', zoneId = 'A', cutOpen = 1;
  const cur = { t: 0, cut: 0, xray: 0, tint: 0, guides: 0 };
  let tgt = { t: 0, cut: 0, xray: 0, tint: 0, guides: 0 };
  let curXr = { ext: 1, cham: 1, coil: 1, aux: 1, base: 1, core: 1 };
  let stateXr = curXr, activeLabels = null, wantInset = false, showCotas = true, showLabels = true, showFigure = true;
  let tween = null, selected = null;

  function activeState() { return stateId === 'acercamiento' ? Object.assign({}, STATES.acercamiento, ZONES[zoneId]) : STATES[stateId]; }
  function go(id, zone) {
    stateId = id; if (zone) zoneId = zone;
    const s = activeState();
    tgt = { t: s.t, cut: s.cut, xray: s.xray, tint: s.tint, guides: s.guides || 0 };
    if (s.xr) stateXr = s.xr;
    activeLabels = s.labels; wantInset = !!s.inset;
    tween = { t0: performance.now(), dur: 1500, p0: camera.position.clone(), t0v: controls.target.clone(), p1: new T.Vector3().fromArray(s.cam.p), t1: new T.Vector3().fromArray(s.cam.t) };
    renderUI();
  }
  window.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const ids = ['general', 'despiece', 'explosion', 'corte', 'transparencia', 'acercamiento'], i = parseInt(e.key, 10);
    if (i >= 1 && i <= 6) go(ids[i - 1]);
  });

  /* ---------- interfaz ---------- */
  const tabs = $('#tabs'), info = $('#info'), panel = $('#panel');
  const order = ['general', 'despiece', 'explosion', 'corte', 'transparencia', 'acercamiento'];
  order.forEach(function (id, i) {
    const b = document.createElement('button'); b.className = 'tab'; b.id = 'tab-' + id; b.type = 'button';
    b.innerHTML = '<span class="n">' + (i + 1) + '</span>' + STATES[id].name;
    b.addEventListener('click', function () { go(id); }); tabs.appendChild(b);
  });
  function shortDesc(d) { const m = d.match(/^[^.]+\./); return m ? m[0] : d; }
  function renderUI() {
    order.forEach(function (id) { const b = $('#tab-' + id); b.setAttribute('aria-selected', id === stateId); b.classList.toggle('on', id === stateId); });
    const s = activeState();
    let h = '<h2>' + s.title + '</h2>';
    h += '<p class="what"><span class="k">Qué revela</span>' + (s.text) + '</p>';
    if (stateId === 'general') h += '<dl class="data"><div><dt>Altura</dt><dd>12,5 m</dd></div><div><dt>Diámetro</dt><dd>9,8 m</dd></div><div><dt>Peso aprox.</dt><dd>420 t</dd></div><div><dt>Energía</dt><dd>1,2 GW</dd></div></dl>';
    if (stateId === 'acercamiento') h += '<div class="seg" role="group" aria-label="Zona de acercamiento"><button type="button" id="zA" class="' + (zoneId === 'A' ? 'on' : '') + '">A · Emulsión</button><button type="button" id="zB" class="' + (zoneId === 'B' ? 'on' : '') + '">B · Bobinas</button></div>';
    if (stateId === 'corte') h += '<label class="slide" for="cutRange"><span>Apertura del corte</span><input id="cutRange" type="range" min="0.15" max="1" step="0.01" value="' + cutOpen + '"></label>';
    if (stateId === 'transparencia') h += '<ul class="key"><li><i style="opacity:.12"></i>Transparente: estructura exterior</li><li><i style="opacity:.5"></i>Semitransparente: cámara de vacío</li><li><i style="opacity:1"></i>Visible: núcleo, bobinas, conductos</li></ul>';
    if (activeLabels && LBL[activeLabels] && LBL[activeLabels].some(function (l) { return l.n; })) {
      let n = 0, items = LBL[activeLabels].filter(function (l) { return l.n; }).map(function (l) { n++; const u = l.sub ? null : l.unit; return '<li value="' + n + '">' + l.t.replace('\n', ' ') + (u ? ' <span>' + shortDesc(u.userData.desc) + '</span>' : '') + '</li>'; }).join('');
      h += '<details class="legend"' + (stateId === 'despiece' ? ' open' : '') + '><summary>Leyenda numerada</summary><ol>' + items + '</ol></details>';
    }
    if (selected) { const d = selected.userData; h += '<div class="sel"><span class="k">' + SYS[d.sys].es + '</span><b>' + d.es + '</b><p>' + d.desc + '</p><button type="button" id="selClear">Quitar selección</button></div>'; }
    info.innerHTML = h;
    const zA = $('#zA'), zB = $('#zB'); if (zA) { zA.onclick = function () { go('acercamiento', 'A'); }; zB.onclick = function () { go('acercamiento', 'B'); }; }
    const cr = $('#cutRange'); if (cr) cr.oninput = function () { cutOpen = parseFloat(cr.value); };
    const sc = $('#selClear'); if (sc) sc.onclick = function () { selected = null; renderUI(); };
  }
  // árbol de componentes
  const vis = {};
  (function () {
    const tree = $('#tree'); let h = '';
    sysList.forEach(function (k) {
      const us = units.filter(function (u) { return u.userData.sys === k; });
      h += '<details open><summary><input type="checkbox" class="cs" data-sys="' + k + '" checked aria-label="Sistema ' + SYS[k].es + '"><i class="dot" style="background:#' + SYS[k].color.toString(16).padStart(6, '0') + '"></i>' + SYS[k].es + ' <em>' + us.length + '</em></summary><ul>';
      us.forEach(function (u) {
        h += '<li><label><input type="checkbox" class="cu" data-id="' + u.name + '" checked>' + u.userData.es + '</label>';
        if (u.userData.subs.length) { h += '<ul>'; u.userData.subs.forEach(function (s) { h += '<li><label><input type="checkbox" class="cb" data-id="' + u.name + '" data-sub="' + s.name + '" checked>' + s.es + '</label></li>'; }); h += '</ul>'; }
        h += '</li>';
      });
      h += '</ul></details>';
    });
    tree.innerHTML = h;
    tree.addEventListener('change', function (e) {
      const t = e.target;
      if (t.classList.contains('cu')) { byId[t.dataset.id].visible = t.checked; }
      else if (t.classList.contains('cb')) { byId[t.dataset.id].getObjectByName(t.dataset.sub).visible = t.checked; }
      else if (t.classList.contains('cs')) {
        tree.querySelectorAll('.cu').forEach(function (c) { if (byId[c.dataset.id].userData.sys === t.dataset.sys) { c.checked = t.checked; byId[c.dataset.id].visible = t.checked; } });
      }
    });
    $('#showAll').addEventListener('click', function () {
      tree.querySelectorAll('input').forEach(function (c) { c.checked = true; });
      units.forEach(function (u) { u.visible = true; u.userData.subs.forEach(function (s) { u.getObjectByName(s.name).visible = true; }); });
    });
  })();
  $('#btnPanel').addEventListener('click', function () { const o = panel.classList.toggle('open'); $('#btnPanel').setAttribute('aria-pressed', o); });
  $('#btnLabels').addEventListener('click', function () { showLabels = !showLabels; $('#btnLabels').setAttribute('aria-pressed', showLabels); });
  $('#btnScale').addEventListener('click', function () { showFigure = !showFigure; M.figure.visible = showFigure; showCotas = showFigure; $('#btnScale').setAttribute('aria-pressed', showFigure); });
  $('#btnPng').addEventListener('click', savePng);
  const toast = $('#toast');
  function say(t) { toast.textContent = t; toast.hidden = false; clearTimeout(say.t); say.t = setTimeout(function () { toast.hidden = true; }, 3600); }
  async function savePng() {
    try {
      const dl = window.claude && await window.claude.use('downloads');
      const w = renderer.domElement.width, h = renderer.domElement.height, pr = renderer.getPixelRatio();
      renderer.setPixelRatio(Math.min(3, pr * 2)); renderer.setSize(W, H, false); render3();
      const blob = await new Promise(function (res) { renderer.domElement.toBlob(res, 'image/png'); });
      renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
      const fn = 'resonador_omega_' + stateId + '.png';
      if (dl) await dl.save({ filename: fn, data: blob });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fn; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }
      say('Imagen guardada (fondo transparente, sin etiquetas).');
    } catch (e) { if (!e || e.code !== 'declined') say('No se pudo guardar la imagen.'); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(W, H, false); }
  }

  /* ---------- selección por clic ---------- */
  const ray = new T.Raycaster(), mouse = new T.Vector2(); let down = null;
  renderer.domElement.addEventListener('pointerdown', function (e) { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', function (e) {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const meshes = []; M.root.traverse(function (o) { if (o.isMesh) { let v = true, p = o; while (p) { if (!p.visible) v = false; p = p.parent; } if (v) meshes.push(o); } });
    const hits = ray.intersectObjects(meshes, false), c = M.CUT.planes[0].constant;
    let pick = null;
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i], m = h.object.material;
      if (m.opacity < .25) continue;
      if (M.SECTION.value > .5 && h.point.x > c && h.point.z > c) continue;
      let p = h.object; while (p && !(p.userData && p.userData.id)) p = p.parent;
      if (p) { pick = p; break; }
    }
    selected = pick && pick !== selected ? pick : null; renderUI();
  });

  /* ---------- lupa molecular (acercamiento A) ---------- */
  const insetEl = $('#inset'), insetCanvasHost = $('#insetCanvas');
  const ir = new T.WebGLRenderer({ antialias: true, alpha: true });
  ir.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); ir.setSize(280, 280); ir.setClearColor(0x000000, 0);
  ir.outputEncoding = T.sRGBEncoding; insetCanvasHost.appendChild(ir.domElement);
  const isc = new T.Scene(), icam = new T.PerspectiveCamera(34, 1, .1, 60); icam.position.set(0, 0, 8.4);
  isc.add(new T.HemisphereLight(0xffffff, 0x445066, 1.1)); const idl = new T.DirectionalLight(0xffffff, 1.3); idl.position.set(3, 4, 6); isc.add(idl);
  const mol = new T.Group(); isc.add(mol);
  (function () {
    const sph = function (r, c, em) { return new T.Mesh(new T.SphereGeometry(r, 18, 14), new T.MeshStandardMaterial({ color: c, roughness: .35, metalness: .05, emissive: em || 0x000000, emissiveIntensity: em ? .5 : 0 })); };
    const drop = new T.Mesh(new T.SphereGeometry(1.6, 48, 32), new T.MeshStandardMaterial({ color: 0x7a5cff, transparent: true, opacity: .32, roughness: .2, emissive: 0x4a2fd6, emissiveIntensity: .7, depthWrite: false }));
    mol.add(drop);
    function h2o() { const g = new T.Group(), o = sph(.17, 0x4aa8ff); g.add(o); [-1, 1].forEach(function (s) { const h = sph(.1, 0xffffff); h.position.set(s * .2, .14, 0); g.add(h); }); return g; }
    function co2() { const g = new T.Group(); g.add(sph(.13, 0x3a3f45)); [-1, 1].forEach(function (s) { const o = sph(.15, 0xe8553b); o.position.x = s * .31; g.add(o); }); return g; }
    let k = 7; function r() { k = (k * 16807) % 2147483647; return (k - 1) / 2147483646; }
    for (let i = 0; i < 15; i++) { const m = h2o(), v = new T.Vector3(r() - .5, r() - .5, r() - .5).normalize().multiplyScalar(Math.cbrt(r()) * 1.25); m.position.copy(v); m.rotation.set(r() * 6, r() * 6, r() * 6); mol.add(m); }
    for (let i = 0; i < 12; i++) { const m = co2(), v = new T.Vector3(r() - .5, r() - .5, r() - .5).normalize().multiplyScalar(2.15 + r() * 1.0); m.position.copy(v); m.rotation.set(r() * 6, r() * 6, r() * 6); mol.add(m); }
    const N = 46, tailM = new T.MeshStandardMaterial({ color: 0xc9b8ff, roughness: .5 });
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963, n = new T.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad);
      const head = sph(.1, 0xf0c14b, 0x8a6a10); head.position.copy(n).multiplyScalar(1.62); mol.add(head);
      const tail = new T.Mesh(new T.CylinderGeometry(.025, .025, .42, 6), tailM);
      tail.position.copy(n).multiplyScalar(1.62 + .25); tail.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), n); mol.add(tail);
    }
  })();

  /* ---------- tamaño y bucle ---------- */
  let W = 0, H = 0;
  function resize() {
    W = view.clientWidth; H = view.clientHeight; renderer.setSize(W, H, false);
    renderer.domElement.style.width = W + 'px'; renderer.domElement.style.height = H + 'px';
    camera.aspect = W / H; camera.updateProjectionMatrix(); svg.setAttribute('width', W); svg.setAttribute('height', H);
  }
  window.addEventListener('resize', resize); resize();

  const sysColor = {}; sysList.forEach(function (k) { sysColor[k] = new T.Color(SYS[k].color); });
  const tmp = new T.Vector3(), tmp2 = new T.Vector3();
  function step(dt) {
    const k = 1 - Math.exp(-dt * 4);
    Object.keys(cur).forEach(function (n) { cur[n] += (tgt[n] - cur[n]) * k; if (Math.abs(tgt[n] - cur[n]) < .0008) cur[n] = tgt[n]; });
    if (tween) {
      const f = Math.min(1, (performance.now() - tween.t0) / tween.dur), e = f < .5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0v, tween.t1, e);
      if (f >= 1) tween = null;
    }
  }
  let wasInx = false;
  function applyModel() {
    const e = cur.t;
    units.forEach(function (u) {
      const d = u.userData, dr = d.drExp * e;
      u.position.set(d.base.x + dr * Math.cos(d.azr), d.base.y + (d.dyExp || 0) * e, d.base.z + dr * Math.sin(d.azr));
      const col = sysColor[d.sys], rf = 1 + (stateXr[d.role] - 1) * cur.xray;
      const isSel = u === selected;
      for (const kk in d.mats) {
        const m = d.mats[kk], ud = m.userData;
        if (!ud.noTint) m.color.copy(ud.baseColor).lerp(col, cur.tint * .55);
        const rr = ud.role === 'cham' ? stateXr.cham : stateXr[d.role];
        const op = ud.baseOpacity * (1 + (rr - 1) * cur.xray), tr = op < .995 || ud.baseOpacity < .995;
        m.opacity = op; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.depthWrite = !tr;
        if (isSel && !ud.noTint) { m.emissive.setHex(0x3a5cff); m.emissiveIntensity = .55; } else { m.emissive.copy(ud.baseEmissive); m.emissiveIntensity = ud.baseEmissiveI; }
      }
    });
    floor.position.y = floorExpY * e;
    guideMat.opacity = .75 * cur.guides; guides.visible = cur.guides > .02;
    const cs = (cur.cut > 0.02);
    M.SECTION.value = cs ? 1 : 0;
    const cMin = (1 - cutOpen) * 3.2, c = 8 + (cMin - 8) * cur.cut;
    M.CUT.planes[0].constant = c; M.CUT.planes[1].constant = c;
    cotas.visible = showCotas && activeState().cotas && cur.t < .05;
    const core = byId.Nucleo_Omega; core.getWorldPosition(tmp); fx.position.copy(tmp);
    fx.visible = true;
  }
  function toScreen(v) { tmp2.copy(v).project(camera); return { x: (tmp2.x + 1) / 2 * W, y: (1 - tmp2.y) / 2 * H, z: tmp2.z }; }
  function spread(items, ymin, ymax, gap) {
    items.sort(function (a, b) { return a.y - b.y; });
    let prev = ymin - gap;
    items.forEach(function (it) { it.ty = Math.max(it.y, prev + gap * (it.lines > 1 ? 1.45 : 1)); prev = it.ty; });
    const last = items[items.length - 1];
    if (last && last.ty > ymax) { let nx = ymax + gap; for (let i = items.length - 1; i >= 0; i--) { items[i].ty = Math.min(items[i].ty, nx - gap * (items[i].lines > 1 ? 1.45 : 1)); nx = items[i].ty; } }
  }
  const wp = new T.Vector3();
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function drawLabels() {
    const L = activeLabels && showLabels ? LBL[activeLabels] : null;
    let out = '';
    if (L) {
      const wide = W >= 820, cx = toScreen(controls.target).x, items = [];
      let n = 0;
      L.forEach(function (l) {
        const num = l.n ? ++n : 0;
        if (!l.unit.visible) return;
        wp.copy(l.anchor); l.unit.localToWorld(wp); const s = toScreen(wp);
        if (s.z > 1) return;
        items.push({ l: l, x: s.x, y: s.y, num: num, side: s.x < cx ? 'L' : 'R', lines: l.t.split('\n').length });
      });
      const colW = 250, lx = (panel.classList.contains('open') ? 292 : 24), rx = W - 24;
      const ymin = 96, infoH = info.offsetHeight;
      ['L', 'R'].forEach(function (sd) {
        const arr = items.filter(function (i) { return i.side === sd; });
        arr.forEach(function (i) { i.y0 = i.y; });
        const insOn = wantInset && insetEl.classList.contains('show');
        spread(arr, ymin, H - 28 - (sd === 'L' && wide ? infoH + 16 : 0) - (sd === 'R' && wide && insOn ? insetEl.offsetHeight + 16 : 0), 21);
        arr.forEach(function (i) {
          const l = i.l, tipX = sd === 'L' ? lx + colW + 6 : rx - colW - 6;
          out += '<g class="lbl">';
          if (wide) {
            out += '<polyline class="lead" points="' + i.x.toFixed(1) + ',' + i.y.toFixed(1) + ' ' + (tipX + (sd === 'L' ? 14 : -14)).toFixed(1) + ',' + i.ty.toFixed(1) + ' ' + tipX.toFixed(1) + ',' + i.ty.toFixed(1) + '"/>';
            const lines = l.t.split('\n'), tx = sd === 'L' ? lx + colW - 22 : rx - colW + 22, anc = sd === 'L' ? 'end' : 'start';
            lines.forEach(function (ln, j) { out += '<text class="lt" x="' + tx + '" y="' + (i.ty + 4 + (j - (lines.length - 1) / 2) * 14).toFixed(1) + '" text-anchor="' + anc + '">' + esc(ln) + '</text>'; });
            const bx = sd === 'L' ? lx + colW - 9 : rx - colW + 9;
            if (i.num) out += '<circle class="nb" cx="' + bx + '" cy="' + i.ty.toFixed(1) + '" r="9"/><text class="nt" x="' + bx + '" y="' + (i.ty + 3.6).toFixed(1) + '" text-anchor="middle">' + i.num + '</text>';
            else out += '<rect class="sq" x="' + (bx - 4) + '" y="' + (i.ty - 4) + '" width="8" height="8" transform="rotate(45 ' + bx + ' ' + i.ty + ')"/>';
          }
          out += '<circle class="dot" cx="' + i.x.toFixed(1) + '" cy="' + i.y.toFixed(1) + '" r="' + (wide ? 3.4 : 9) + '"/>';
          if (!wide && i.num) out += '<text class="nt" x="' + i.x.toFixed(1) + '" y="' + (i.y + 3.6).toFixed(1) + '" text-anchor="middle">' + i.num + '</text>';
          out += '</g>';
        });
      });
    }
    // lupa: línea desde el núcleo hasta el círculo
    if (wantInset && insetEl.classList.contains('show')) {
      const c = new T.Vector3(); byId.Fluido_Superior.getWorldPosition(c); const s = toScreen(c), r = insetEl.getBoundingClientRect(), vr = view.getBoundingClientRect();
      const ex = r.left - vr.left + r.width / 2, ey = r.top - vr.top + 140;
      const dx = ex - s.x, dy = ey - s.y, d = Math.hypot(dx, dy) || 1;
      out = '<circle class="ring" cx="' + s.x.toFixed(1) + '" cy="' + s.y.toFixed(1) + '" r="46"/><line class="lead" x1="' + (s.x + dx / d * 46).toFixed(1) + '" y1="' + (s.y + dy / d * 46).toFixed(1) + '" x2="' + (ex - dx / d * 142).toFixed(1) + '" y2="' + (ey - dy / d * 142).toFixed(1) + '"/>' + out;
    }
    svg.innerHTML = out;
    if (cotas.visible) {
      const a = toScreen(cotaPts.h), b = toScreen(cotaPts.d);
      cotaH.style.cssText = 'left:' + (a.x - 10) + 'px;top:' + a.y + 'px'; cotaD.style.cssText = 'left:' + b.x + 'px;top:' + (b.y + 14) + 'px';
      cotaH.hidden = cotaD.hidden = false;
    } else cotaH.hidden = cotaD.hidden = true;
  }
  function render3() { renderer.render(scene, camera); }
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    step(dt); controls.update(); applyModel(); render3(); drawLabels();
    const showIn = wantInset && cur.xray > .6; insetEl.classList.toggle('show', showIn);
    if (showIn) { mol.rotation.y += dt * .35; mol.rotation.x = Math.sin(now / 3000) * .15; ir.render(isc, icam); }
  }
  renderUI(); requestAnimationFrame(loop);
  window.RES = { go: go, camera: camera, controls: controls, units: byId, cur: cur, scene: scene, renderer: renderer, M: M };
})();
