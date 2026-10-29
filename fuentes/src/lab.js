/* ============================================================
   Laboratorio: nave industrial procedural alrededor del Resonador Ω (metros, escala real)
   Laboratorio.build(RES, { shadows }) → { group, OFFICE, zones, view(), portada(), pick(), setHover(), setK(), collect(), update() }
   No toca el modelo: solo añade objetos a la escena del visor y se desvanece con setK(0..1).
   ============================================================ */
window.Laboratorio = (function () {
  'use strict';
  const T = THREE, PI = Math.PI;
  const X0 = -22, X1 = 30, Z0 = -20, Z1 = 72, HT = 20;          // nave (frente abierto hacia +z)
  const OFFICE = { x0: 8, x1: 16, z0: 9, z1: 15 };              // oficina de análisis
  const FOG = 0x1d2125;

  // r147 trata los colores hex como lineales: se convierten para que el tono sea el que se lee en el código
  function lin(c) { return new T.Color(c).convertSRGBToLinear(); }
  let seed = 11;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function tex(w, h, draw, rep) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8;
    if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  }
  function speckle(g, w, h, n, a, s) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = (rnd() > .5 ? 'rgba(255,255,255,' : 'rgba(0,0,0,') + (a * rnd()).toFixed(3) + ')';
      g.fillRect(rnd() * w, rnd() * h, s * (.4 + rnd()), s * (.4 + rnd()));
    }
  }
  function stains(g, w, h, n, a) {
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * w * .25, gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(20,18,14,' + (a * rnd()).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(20,18,14,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
  }

  function build(RES, opt) {
    opt = opt || {};
    const scene = RES.scene, group = new T.Group(); group.name = 'Laboratorio'; scene.add(group);
    const std = function (c, r, m, extra) { return new T.MeshStandardMaterial(Object.assign({ color: lin(c), roughness: r, metalness: m || 0 }, extra || {})); };
    function box(w, h, d, mat, x, y, z, parent) {
      const o = new T.Mesh(new T.BoxGeometry(w, h, d), mat); o.position.set(x, y, z);
      o.castShadow = o.receiveShadow = !!opt.shadows; (parent || group).add(o); return o;
    }
    function cyl(r1, r2, h, mat, x, y, z, seg, parent) {
      const o = new T.Mesh(new T.CylinderGeometry(r1, r2, h, seg || 16), mat); o.position.set(x, y, z);
      o.castShadow = !!opt.shadows; (parent || group).add(o); return o;
    }
    // instancias de cajas: lista de [x, y, z, sx, sy, sz]
    function boxes(list, mat, cast) {
      const im = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), mat, list.length), m4 = new T.Matrix4();
      list.forEach(function (b, i) { m4.makeScale(b[3], b[4], b[5]).setPosition(b[0], b[1], b[2]); im.setMatrixAt(i, m4); });
      im.castShadow = !!(cast && opt.shadows); im.receiveShadow = !!opt.shadows; group.add(im); return im;
    }

    /* ---------- materiales ---------- */
    const concreteT = tex(1024, 1024, function (g, w, h) {
      g.fillStyle = '#64635d'; g.fillRect(0, 0, w, h);
      stains(g, w, h, 26, .26); speckle(g, w, h, 9000, .09, 2.2);
      g.strokeStyle = 'rgba(30,28,24,.55)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; g.strokeRect(5, 5, w - 10, h - 10);
    }, [(X1 - X0) / 6, (Z1 - Z0) / 6]);
    const wallT = tex(256, 1024, function (g, w, h) {
      g.fillStyle = '#6b6f69'; g.fillRect(0, 0, w, h);                       // paneles superiores
      g.fillStyle = '#3b4540'; g.fillRect(0, h * .85, w, h * .15);            // zócalo pintado (3 m)
      g.fillStyle = '#7c6a3a'; g.fillRect(0, h * .845, w, 5);                 // franja ocre
      stains(g, w, h, 16, .18); speckle(g, w, h, 3500, .07, 2);
      g.fillStyle = 'rgba(25,25,25,.35)'; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 2, h * .845);
      for (let y = 0; y < h * .84; y += 128) g.fillRect(0, y, w, 1.5);
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(.5, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    const hazardT = tex(256, 256, function (g, w, h) {
      g.fillStyle = '#b8932a'; g.fillRect(0, 0, w, h); g.fillStyle = '#1c1c1a';
      for (let i = -h; i < w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 32, 0); g.lineTo(i + 32 + h, h); g.lineTo(i + h, h); g.closePath(); g.fill(); }
      speckle(g, w, h, 1500, .18, 2);
    }, [18, 18]);
    const windowT = tex(256, 256, function (g, w, h) {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#c9d3d8'); gr.addColorStop(1, '#8e9ba3');
      g.fillStyle = gr; g.fillRect(0, 0, w, h); speckle(g, w, h, 900, .12, 3);
      g.fillStyle = '#2a2f33'; for (let i = 0; i <= 4; i++) { g.fillRect(i * (w - 8) / 4, 0, 8, h); g.fillRect(0, i * (h - 8) / 4, w, 8); }
    });
    const gratingT = tex(128, 128, function (g, w, h) {
      g.fillStyle = '#1e2124'; g.fillRect(0, 0, w, h); g.fillStyle = '#4a4f54';
      for (let i = 0; i < w; i += 16) g.fillRect(i, 0, 4, h); g.fillRect(0, 0, w, 4); g.fillRect(0, h / 2, w, 3);
    }, [2, 18]);
    const stencilT = tex(2048, 200, function (g, w, h) {
      g.fillStyle = '#26302b'; g.fillRect(0, 0, w, h); speckle(g, w, h, 4000, .12, 3);
      g.strokeStyle = '#b9ad8c'; g.lineWidth = 4; g.strokeRect(14, 14, w - 28, h - 28);
      g.fillStyle = '#d9cfb4'; g.font = '600 118px "Barlow Condensed", "Arial Narrow", sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
      g.fillText('INSTITUTO KURCHÁTOV · PROYECTO Ω', w / 2, h / 2 + 6);
    });
    const M = {
      floor: std(0xffffff, .92, 0, { map: concreteT }),
      wall: std(0xffffff, .95, 0, { map: wallT }),
      concrete: std(0x7d7c76, .9),
      roof: std(0x23272b, .9),
      steel: std(0x3b4248, .55, .6),
      green: std(0x4f5b54, .6, .25),
      ochre: std(0x9a7a2c, .55, .3),
      rail: std(0xb08a2e, .5, .3),
      black: std(0x1b1d1f, .7, .2),
      copper: std(0xb4672e, .35, 1),
      tray: std(0x8d9296, .45, .7),
      paintDisk: std(0x5c5e5b, .85),
      hazard: std(0xffffff, .8, 0, { map: hazardT }),
      grating: std(0xffffff, .6, .5, { map: gratingT }),
      window: new T.MeshBasicMaterial({ map: windowT, color: lin(0x9aa6ad) }),
      bulb: new T.MeshBasicMaterial({ color: lin(0xffe9c4) }),
      stencil: std(0xffffff, .8, 0, { map: stencilT }),
      lineY: std(0xb8932a, .7),
      led: new T.MeshBasicMaterial({ color: lin(0x7dbb6a) }),
      ledA: new T.MeshBasicMaterial({ color: lin(0xffb74a) })
    };
    M.window.userData.op0 = 1;

    /* ---------- piso, muros, techo ---------- */
    const floor = new T.Mesh(new T.PlaneGeometry(X1 - X0, Z1 - Z0), M.floor);
    floor.rotation.x = -PI / 2; floor.position.set((X0 + X1) / 2, 0, (Z0 + Z1) / 2); floor.receiveShadow = !!opt.shadows; group.add(floor);
    function wall(len, x, z, ry) {
      const t = wallT.clone(); t.needsUpdate = true; t.wrapS = T.RepeatWrapping; t.repeat.set(len / 4, 1);
      const m = M.wall.clone(); m.map = t;
      const o = new T.Mesh(new T.PlaneGeometry(len, HT), m); o.position.set(x, HT / 2, z); o.rotation.y = ry; o.receiveShadow = !!opt.shadows; group.add(o);
    }
    wall(X1 - X0, (X0 + X1) / 2, Z0, 0);
    wall(Z1 - Z0, X0, (Z0 + Z1) / 2, PI / 2);
    wall(Z1 - Z0, X1, (Z0 + Z1) / 2, -PI / 2);
    const roof = new T.Mesh(new T.PlaneGeometry(X1 - X0, Z1 - Z0), M.roof); roof.rotation.x = PI / 2; roof.position.set((X0 + X1) / 2, HT, (Z0 + Z1) / 2); group.add(roof);
    // ventanas altas
    const wg = new T.PlaneGeometry(4, 4.4);
    for (let x = X0 + 4; x < X1 - 2; x += 5.5) { const o = new T.Mesh(wg, M.window); o.position.set(x, 15.2, Z0 + .05); group.add(o); }
    for (let z = Z0 + 5; z < Z1 - 4; z += 6.5) {
      const a = new T.Mesh(wg, M.window); a.position.set(X0 + .05, 15.2, z); a.rotation.y = PI / 2; group.add(a);
      const b = new T.Mesh(wg, M.window); b.position.set(X1 - .05, 15.2, z); b.rotation.y = -PI / 2; group.add(b);
    }
    // pilastras, cerchas y correas del techo
    const pil = [];
    for (let x = X0 + 2; x < X1; x += 8) pil.push([x, HT / 2, Z0 + .35, .8, HT, .7]);
    for (let z = Z0 + 6; z < Z1; z += 8) { pil.push([X0 + .35, HT / 2, z, .7, HT, .8]); pil.push([X1 - .35, HT / 2, z, .7, HT, .8]); }
    boxes(pil, M.concrete, false);
    const tr = [];
    for (let z = Z0 + 6; z < Z1; z += 8) { tr.push([(X0 + X1) / 2, HT - .5, z, X1 - X0, .9, .35]); tr.push([(X0 + X1) / 2, HT - 1.6, z, X1 - X0, .12, .2]); }
    for (let x = X0 + 6; x < X1; x += 8) tr.push([x, HT - .25, (Z0 + Z1) / 2, .2, .3, Z1 - Z0]);
    boxes(tr, M.steel, false);
    // letrero sobre las pilastras del fondo (lado de la oficina, libre de columnas)
    const st = new T.Mesh(new T.PlaneGeometry(14, 1.37), M.stencil); st.position.set(20, 11.4, Z0 + .75); group.add(st);

    /* ---------- marcas del piso ---------- */
    const disk = new T.Mesh(new T.CircleGeometry(7.6, 96), M.paintDisk); disk.rotation.x = -PI / 2; disk.position.y = .004; disk.receiveShadow = !!opt.shadows; group.add(disk);
    const hz = new T.Mesh(new T.RingGeometry(7.6, 8.05, 128), M.hazard); hz.rotation.x = -PI / 2; hz.position.y = .006; hz.receiveShadow = !!opt.shadows; group.add(hz);
    const lines = [];
    [-10.5, 18.5].forEach(function (x) { lines.push([x, .005, (Z0 + 2 + Z1) / 2, .14, .01, Z1 - Z0 - 4]); });
    lines.push([4, .005, 20, 29, .01, .14]); lines.push([4, .005, -12, 29, .01, .14]);
    boxes(lines, M.lineY, false);
    const tg = new T.Mesh(new T.PlaneGeometry(.9, 12), M.grating); tg.rotation.x = -PI / 2; tg.position.set(-2.5, .006, -14); group.add(tg);

    /* ---------- barandilla de contención ---------- */
    (function () {
      const R = 7.25, n = 40, posts = [];
      for (let i = 0; i < n; i++) { const a = i / n * PI * 2; posts.push([R * Math.cos(a), .55, R * Math.sin(a), .07, 1.1, .07]); }
      boxes(posts, M.rail, true);
      [1.08, .58].forEach(function (y) {
        const t = new T.Mesh(new T.TorusGeometry(R, .028, 6, 160), M.rail); t.rotation.x = PI / 2; t.position.y = y; group.add(t);
      });
      const kick = new T.Mesh(new T.CylinderGeometry(R, R, .12, 160, 1, true), M.rail); kick.position.y = .07; group.add(kick);
    })();

    /* ---------- puente grúa sobre el reactor ---------- */
    (function () {
      const cols = [], beams = [];
      [-10.5, 10.5].forEach(function (x) {
        [-18, -7, 5].forEach(function (z) { cols.push([x, 7.75, z, .5, 15.5, .5]); });
        beams.push([x, 15.9, -6.5, .5, .9, 27]);
      });
      boxes(cols, M.steel, true); boxes(beams, M.steel, true);
      const crane = [];
      [-.6, .6].forEach(function (z) { crane.push([0, 16.85, z, 21.6, 1.0, .42]); });
      [-10.5, 10.5].forEach(function (x) { crane.push([x, 16.55, 0, .9, .55, 2.6]); });
      crane.push([0, 17.65, 0, 2.2, .7, 2.0]);
      boxes(crane, M.ochre, true);
      [-.18, .18].forEach(function (z) { cyl(.025, .025, 2.6, M.black, 0, 16.0, z, 6); });
      box(.5, .7, .3, M.ochre, 0, 14.4, 0);
      const hook = new T.Mesh(new T.TorusGeometry(.16, .045, 8, 20, PI * 1.4), M.steel); hook.position.set(0, 13.85, 0); group.add(hook);
    })();

    /* ---------- luminarias colgantes ---------- */
    (function () {
      const pts = [];
      for (let x = -14; x <= 26; x += 10) for (let z = -14; z <= 46; z += 10) pts.push([x, z]);
      const cableG = new T.CylinderGeometry(.012, .012, 1, 4), shadeG = new T.ConeGeometry(.55, .4, 20, 1, true), bulbG = new T.CircleGeometry(.36, 20);
      const c = new T.InstancedMesh(cableG, M.black, pts.length), s = new T.InstancedMesh(shadeG, M.green, pts.length), b = new T.InstancedMesh(bulbG, M.bulb, pts.length);
      const m4 = new T.Matrix4(), q = new T.Quaternion().setFromEuler(new T.Euler(PI / 2, 0, 0)), one = new T.Vector3(1, 1, 1);
      pts.forEach(function (p, i) {
        const y = 13.4;
        m4.makeScale(1, HT - y, 1).setPosition(p[0], (HT + y) / 2, p[1]); c.setMatrixAt(i, m4);
        m4.identity().setPosition(p[0], y, p[1]); s.setMatrixAt(i, m4);
        m4.compose(new T.Vector3(p[0], y - .19, p[1]), q, one); b.setMatrixAt(i, m4);
      });
      M.green.side = T.DoubleSide; group.add(c, s, b);
    })();

    /* ---------- bandejas de cables ---------- */
    (function () {
      const tb = [], hangers = [];
      tb.push([(X0 + X1) / 2, 9, Z0 + .6, X1 - X0 - 2, .1, .6]);
      tb.push([X0 + .7, 9, (Z0 + 34) / 2, .6, .1, 34 - Z0]);
      tb.push([-7.5, 10.5, (Z0 - 3) / 2, .6, .1, -3 - Z0]);                      // del reactor al muro
      for (let z = -4; z > Z0; z -= 3.2) hangers.push([-7.5, (HT + 10.5) / 2, z, .04, HT - 10.5, .04]);
      boxes(tb, M.tray, true); boxes(hangers, M.steel, false);
      const cab = [];
      [-.18, 0, .18].forEach(function (o) {
        cab.push([(X0 + X1) / 2, 9.09, Z0 + .6 + o, X1 - X0 - 2, .07, .07]);
        cab.push([-7.5 + o, 10.59, (Z0 - 3) / 2, .07, .07, -3 - Z0]);
      });
      boxes(cab, M.black, false);
      // bajada vertical de cables hacia la base del reactor
      box(.6, 10.4, .12, M.tray, -7.5, 5.3, -3.06); box(.4, .1, 3.6, M.tray, -7.5, .06, -1.3);
    })();

    /* ---------- equipos de escenario (no responden al clic) ---------- */
    (function () {
      const cab = [];
      for (let i = 0; i < 9; i++) cab.push([-19 + i * 1.08, 1.1, Z0 + 1.0, 1.0, 2.2, .62]);
      boxes(cab, M.green, true);
      const leds = [], ledsA = [];
      for (let i = 0; i < 9; i++) { (i % 3 ? leds : ledsA).push([-19 + i * 1.08 - .3, 1.85, Z0 + 1.33, .06, .06, .02]); leds.push([-19 + i * 1.08 - .18, 1.85, Z0 + 1.33, .06, .06, .02]); }
      boxes(leds, M.led, false); boxes(ledsA, M.ledA, false);
      // pupitres de control junto al muro izquierdo, con diales de cobre
      for (let k = 0; k < 3; k++) {
        const z = -6 + k * 4.2, gC = new T.Group(); gC.position.set(X0 + 1.4, 0, z); gC.rotation.y = PI / 2; group.add(gC);
        box(3.2, .85, 1.0, M.green, 0, .425, 0, gC);
        const p = box(3.2, .06, .8, M.black, 0, 1.0, .05, gC); p.rotation.x = -.5;
        box(3.2, .9, .3, M.green, 0, 1.4, -.45, gC);
        for (let d = 0; d < 6; d++) { const c = cyl(.06, .06, .03, M.copper, -1.2 + d * .48, 1.32, -.29, 14, gC); c.rotation.x = PI / 2; }
      }
      // tanque de vacío horizontal al fondo
      const tk = cyl(1.2, 1.2, 4.2, M.steel, 9, 1.55, Z0 + 3.4, 28); tk.rotation.z = PI / 2;
      [7.6, 10.4].forEach(function (x) { box(.3, .5, 2.0, M.black, x, .25, Z0 + 3.4); });
      // cilindros de gas
      for (let i = 0; i < 6; i++) cyl(.12, .12, 1.5, i % 2 ? M.green : M.steel, 24.5 + (i % 3) * .3, .75, Z0 + 1 + Math.floor(i / 3) * .32, 12);
      // cajas de madera
      const wood = std(0x6d5536, .8);
      box(1.2, 1.0, 1.0, wood, 26.5, .5, 18); box(1.0, .8, 1.0, wood, 26.4, 1.4, 18.1); box(1.4, 1.1, 1.2, wood, 25.4, .55, 20.2);
    })();

    /* ---------- luces del laboratorio (intensidad × k; no cambian el visor) ---------- */
    // van en la escena (no en el grupo): así el número de luces no cambia al ocultar el laboratorio y no se recompilan materiales
    const lights = [];
    function light(l, i) { l.userData.i0 = i; l.intensity = i; scene.add(l); lights.push(l); return l; }
    light(new T.HemisphereLight(0xc4ccd6, 0x2e2b27, .32), .32);
    const sun = light(new T.DirectionalLight(0xe4ecf4, .7), .7);
    sun.position.set(-24, 34, -12); sun.target.position.set(6, 0, 6); scene.add(sun.target);
    if (opt.shadows) {
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006; sun.shadow.normalBias = .02;
      const sc = sun.shadow.camera; sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 5; sc.far = 90;
    }
    const fillL = light(new T.PointLight(0xfff0d8, .4, 46, 1.6), .4); fillL.position.set(8, 15, 14);

    /* ---------- zonas clicables (solo dos) y su resaltado ---------- */
    const hiMat = function () { return new T.MeshBasicMaterial({ color: lin(0xffc56b), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending }); };
    const ringHi = new T.Mesh(new T.RingGeometry(8.15, 8.4, 128), hiMat()); ringHi.rotation.x = -PI / 2; ringHi.position.y = .012; group.add(ringHi);
    const offHi = new T.Group(); group.add(offHi);
    (function () {
      const m = hiMat(), o = OFFICE, w = o.x1 - o.x0, d = o.z1 - o.z0, cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2;
      [[w + .4, .2, cx, o.z0 - .2], [w + .4, .2, cx, o.z1 + .2], [.2, d + .4, o.x0 - .2, cz], [.2, d + .4, o.x1 + .2, cz]].forEach(function (s) {
        const p = new T.Mesh(new T.PlaneGeometry(s[0], s[1]), m); p.rotation.x = -PI / 2; p.position.set(s[2], .012, s[3]); offHi.add(p);
      });
      offHi.userData.mat = m;
    })();
    const inv = new T.MeshBasicMaterial({ visible: false });
    const hitR = new T.Mesh(new T.CylinderGeometry(7.4, 7.4, 14.5, 24), inv); hitR.position.y = 7.25; hitR.userData.zone = 'reactor'; group.add(hitR);
    const hitO = new T.Mesh(new T.BoxGeometry(OFFICE.x1 - OFFICE.x0 + .6, 2.8, OFFICE.z1 - OFFICE.z0 + .6), inv);
    hitO.position.set((OFFICE.x0 + OFFICE.x1) / 2, 1.4, (OFFICE.z0 + OFFICE.z1) / 2); hitO.userData.zone = 'oficina'; group.add(hitO);
    const zones = {
      reactor: { anchor: new T.Vector3(0, 14.4, 0), hi: 0 },
      oficina: { anchor: new T.Vector3((OFFICE.x0 + OFFICE.x1) / 2, 3.2, (OFFICE.z0 + OFFICE.z1) / 2), hi: 0 }
    };
    let hover = null;

    /* ---------- desvanecimiento ---------- */
    let mats = [];
    function collect() {
      const set = new Set();
      group.traverse(function (o) { if (o.material && o.material !== inv) set.add(o.material); });
      mats = Array.from(set);
      mats.forEach(function (m) {
        if (m.userData.op0 === undefined) { m.userData.op0 = m.opacity; m.userData.tr0 = m.transparent; }
        if (m.isMeshStandardMaterial) m.envMapIntensity = m.metalness > .5 ? .5 : .18;   // el entorno de estudio es para el metal del reactor
      });
    }
    collect();
    scene.fog = new T.FogExp2(lin(FOG), 0);                  // la niebla se codifica a sRGB; el color de fondo no
    let kNow = -1;
    function setK(k) {
      if (k === kNow) return; kNow = k;
      group.visible = k > .002;
      mats.forEach(function (m) {
        const hiM = m === ringHi.material || m === offHi.userData.mat;
        if (!hiM) m.opacity = m.userData.op0 * k;
        const t = hiM || m.userData.tr0 || k < .999;
        if (m.transparent !== t) { m.transparent = t; m.needsUpdate = true; }
      });
      lights.forEach(function (l) { l.intensity = l.userData.i0 * k; });
      scene.fog.density = .0105 * k;
      RES.renderer.setClearColor(FOG, k);
    }
    function update(dt) {
      const f = 1 - Math.exp(-dt * 9);
      ['reactor', 'oficina'].forEach(function (z) { zones[z].hi += ((hover === z ? 1 : 0) - zones[z].hi) * f; });
      ringHi.material.opacity = .85 * zones.reactor.hi * Math.max(0, kNow);
      offHi.userData.mat.opacity = .85 * zones.oficina.hi * Math.max(0, kNow);
      fillL.intensity = fillL.userData.i0 * kNow * (1 + .5 * Math.max(zones.reactor.hi, zones.oficina.hi));
    }
    function pick(ray) {
      const h = ray.intersectObjects([hitR, hitO], false);
      return h.length ? h[0].object.userData.zone : null;
    }

    /* ---------- vistas de cámara ---------- */
    const TAN = Math.tan(15 * PI / 180);
    function view(aspect) {
      if (aspect < .9) return { p: [23, 13.5, 33], t: [4.5, 3.2, 5] };       // vertical: oficina delante, reactor detrás
      const t = new T.Vector3(5.5, 5.0, 4), dir = new T.Vector3(0, .13, 1).normalize();
      const d = Math.max(36, 18.5 / (TAN * aspect), 9 / TAN);
      return { p: t.clone().addScaledVector(dir, d).toArray(), t: t.toArray() };
    }
    function portada(aspect) {
      const v = view(aspect); v.p[0] -= 6; v.p[1] += 3.5; v.p[2] += 6; return v;
    }

    return { group: group, OFFICE: OFFICE, zones: zones, view: view, portada: portada, pick: pick, collect: collect, setK: setK, update: update,
      setHover: function (z) { hover = z; }, get hover() { return hover; }, mats: M, addLight: light, tex: tex, rnd: rnd };
  }
  return { build: build };
})();
