/* ============================================================
   RESONADOR Ω — modelo 3D paramétrico (Three.js r147)
   Proyecto Ω · Instituto Kurchátov · Universo AERHYN
   Todas las medidas están en metros. Eje vertical = Y.
   Altura total ≈ 12,5 m · Diámetro de la plataforma = 9,8 m
   Jerarquía: RESONADOR_OMEGA → sistema → pieza → mallas
   ============================================================ */
(function (root) {
  'use strict';
  const T = root.THREE;
  const PI = Math.PI, D2R = PI / 180, cos = Math.cos, sin = Math.sin;

  // ---------- parámetros globales (editar aquí) ----------
  const P = {
    platR: 4.9,          // radio circunscrito de la plataforma (Ø 9,8 m)
    colR: 3.1,           // radio de las columnas
    nCoils: 7,           // número de bobinas
    coilY0: 3.6, coilDy: 0.8, coilR: 1.95, coilRc: 0.285, coilTurns: 56,
    chamberR: 1.25
  };

  // Estado compartido de corte (clipping) y rayado de secciones
  const SECTION = { value: 0 };
  const CUT = { planes: [new T.Plane(new T.Vector3(-1, 0, 0), 8), new T.Plane(new T.Vector3(0, 0, -1), 8)] };

  const SYS = {
    ESTRUCTURA_EXTERIOR:      { es: 'Estructura exterior',      color: 0x7f93aa, role: 'ext' },
    NUCLEO:                   { es: 'Núcleo y cámara de vacío', color: 0xa070ff, role: 'core' },
    ESTABILIZACION_MAGNETICA: { es: 'Estabilización magnética', color: 0xe0873a, role: 'coil' },
    REFRIGERACION:            { es: 'Refrigeración',            color: 0x3fb9cf, role: 'aux' },
    CONTROL:                  { es: 'Control y energía',        color: 0xe3b341, role: 'aux' },
    BASE:                     { es: 'Base',                     color: 0x9aa1a8, role: 'base' }
  };

  // ---------- materiales ----------
  const KINDS = {
    steel:      { color: 0x3f454c, metalness: .85, roughness: .46 },
    steelDark:  { color: 0x23272c, metalness: .8,  roughness: .52 },
    steelLight: { color: 0x717982, metalness: .9,  roughness: .36 },
    iron:       { color: 0x1c1f23, metalness: .6,  roughness: .66 },
    gold:       { color: 0xb8872c, metalness: 1,   roughness: .38 },
    copper:     { color: 0xb4672e, metalness: 1,   roughness: .28 },
    rubber:     { color: 0x16181b, metalness: .1,  roughness: .75 },
    pipe:       { color: 0x3c7188, metalness: .7,  roughness: .4 },
    panel:      { color: 0x14181c, metalness: .3,  roughness: .4 },
    led:        { color: 0x9fd4ff, emissive: 0x4aa8ff, emissiveIntensity: 1.8, metalness: 0, roughness: .4, noTint: true, fill: false },
    amber:      { color: 0xffb74a, emissive: 0xff8a00, emissiveIntensity: 1.8, metalness: 0, roughness: .4, noTint: true, fill: false },
    glass:      { color: 0x2b3b57, metalness: 0, roughness: .08, opacity: .4, transparent: true, fill: false, role: 'cham', envMapIntensity: .45 },
    fluid:      { color: 0x7a5cff, emissive: 0x5b3dff, emissiveIntensity: 1.7, opacity: .92, transparent: true, fill: false, noTint: true },
    lens:       { color: 0xbcd0ff, emissive: 0x2a3a88, emissiveIntensity: .4, metalness: .1, roughness: .1, opacity: .3, transparent: true, fill: false, noTint: true },
    coreGlow:   { color: 0xe8e2ff, emissive: 0xb8a8ff, emissiveIntensity: 3.2, metalness: 0, roughness: .3, fill: false, noTint: true },
    droplet:    { color: 0xd9ccff, emissive: 0xb7a3ff, emissiveIntensity: 2.4, metalness: 0, roughness: .3, fill: false, noTint: true }
  };

  function patch(m, fill) {
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uSection = SECTION;
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', 'uniform float uSection;\nvoid main() {')
        .replace('#include <dithering_fragment>',
          '#include <dithering_fragment>\n' +
          (fill ? 'if (uSection > 0.5 && !gl_FrontFacing) {\n' +
            '  float h = step(0.5, fract((gl_FragCoord.x - gl_FragCoord.y) / 7.0));\n' +
            '  gl_FragColor = vec4(mix(vec3(0.80,0.37,0.16), vec3(0.43,0.17,0.07), h), gl_FragColor.a);\n}' : ''));
    };
    m.customProgramCacheKey = function () { return fill ? 'sec1' : 'sec0'; };
  }

  function mk(kind) {
    const p = Object.assign({}, KINDS[kind]);
    const fill = p.fill !== false, noTint = !!p.noTint, role = p.role;
    delete p.fill; delete p.noTint; delete p.role;
    const m = new T.MeshStandardMaterial(Object.assign({ side: T.DoubleSide }, p));
    m.clippingPlanes = CUT.planes; m.clipIntersection = true;
    m.name = kind;
    m.userData = {
      kind: kind, noTint: noTint, fill: fill, role: role,
      baseColor: m.color.clone(), baseOpacity: m.opacity,
      baseEmissive: m.emissive.clone(), baseEmissiveI: m.emissiveIntensity
    };
    patch(m, fill);
    return m;
  }

  // ---------- geometrías auxiliares ----------
  function annulus(ro, ri, h, seg) {
    const s = new T.Shape(); s.absarc(0, 0, ro, 0, PI * 2, false);
    const hole = new T.Path(); hole.absarc(0, 0, ri, 0, PI * 2, true); s.holes.push(hole);
    const g = new T.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: seg || 56 });
    g.rotateX(-PI / 2); g.translate(0, -h / 2, 0); return g;
  }
  function sector(ro, ri, h, a0, a1) { // ángulos de azimut en grados (x=cos, z=sin)
    const s = new T.Shape(), A0 = -a1 * D2R, A1 = -a0 * D2R;
    s.absarc(0, 0, ro, A0, A1, false); s.absarc(0, 0, ri, A1, A0, true);
    const g = new T.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 8 });
    g.rotateX(-PI / 2); g.translate(0, -h / 2, 0); return g;
  }
  function oct(rt, rb, h) { const g = new T.CylinderGeometry(rt, rb, h, 8, 1); g.rotateY(PI / 8); return g; }
  function box(x, y, z) { return new T.BoxGeometry(x, y, z); }
  function cyl(r, h, seg) { return new T.CylinderGeometry(r, r, h, seg || 24, 1); }
  function cylX(r, h, seg) { const g = cyl(r, h, seg); g.rotateZ(PI / 2); return g; }   // eje en X (radial)
  function cylZ(r, h, seg) { const g = cyl(r, h, seg); g.rotateX(PI / 2); return g; }   // eje en Z (tangencial)
  function tor(R, r, rs, ts) { const g = new T.TorusGeometry(R, r, rs || 12, ts || 64); g.rotateX(PI / 2); return g; }
  function rodGeo(a, b, r, seg) {
    const d = new T.Vector3().subVectors(b, a), L = d.length();
    const g = new T.CylinderGeometry(r, r, L, seg || 8, 1);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); return g;
  }
  function V(x, y, z) { return new T.Vector3(x, y, z); }
  function polar(r, aDeg, y) { const a = aDeg * D2R; return V(r * cos(a), y, r * sin(a)); }
  function tube(pts, r, seg, rad) {
    const c = new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.35);
    return new T.TubeGeometry(c, seg || 80, r, rad || 8, false);
  }
  class CoilCurve extends T.Curve {
    constructor(R, r, n) { super(); this.R = R; this.r = r; this.n = n; }
    getPoint(t, target) {
      target = target || new T.Vector3();
      const phi = t * 2 * PI, th = t * this.n * 2 * PI, rr = this.R + this.r * cos(th);
      return target.set(rr * cos(phi), this.r * sin(th), rr * sin(phi));
    }
    getPointAt(u, target) { return this.getPoint(u, target); }
    getTangentAt(u, target) { return this.getTangent(u, target); }
  }
  let seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  // ---------- construcción ----------
  function build() {
    seed = 7;
    const rootG = new T.Group(); rootG.name = 'RESONADOR_OMEGA';
    const sysG = {};
    Object.keys(SYS).forEach(function (k) { const g = new T.Group(); g.name = k; g.userData = { sys: true, es: SYS[k].es }; sysG[k] = g; rootG.add(g); });
    const units = [], byId = {};

    function unit(id, o) {
      const g = new T.Group(); g.name = id;
      const p = o.pos || [0, 0, 0];
      g.position.set(p[0], p[1], p[2]);
      if (o.rotY) g.rotation.y = o.rotY;
      g.userData = {
        id: id, es: o.es, sys: o.sys, role: o.role || SYS[o.sys].role, desc: o.desc || '',
        cy: o.cy, h: o.h, az: o.az || 0, dr: o.dr || 0, dyMode: o.dyMode || null, dyLike: o.dyLike || null,
        stack: !!o.stack, gap: o.gap, mats: {}, subs: []
      };
      units.push(g); byId[id] = g; sysG[o.sys].add(g);
      return g;
    }
    function sub(u, name, es) {
      const g = new T.Group(); g.name = name; u.add(g);
      u.userData.subs.push({ name: name, es: es }); return g;
    }
    function add(u, geo, kind, o) {
      o = o || {};
      let m = u.userData.mats[kind]; if (!m) { m = mk(kind); u.userData.mats[kind] = m; }
      const mesh = new T.Mesh(geo, m);
      if (o.pos) mesh.position.set(o.pos[0], o.pos[1], o.pos[2]);
      if (o.rot) mesh.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
      if (o.name) mesh.name = o.name;
      (o.parent || u).add(mesh); return mesh;
    }
    // pieza colocada en coordenadas radiales (r, azimut°, y) dentro de una unidad con origen en el eje
    function addRad(u, geo, kind, r, aDeg, y, o) {
      o = o || {};
      const gp = new T.Group(); const a = aDeg * D2R;
      gp.position.set(r * cos(a), y, r * sin(a)); gp.rotation.y = -a;
      (o.parent || u).add(gp);
      return add(u, geo, kind, { parent: gp, pos: o.pos, rot: o.rot, name: o.name });
    }
    function radPivot(r, aDeg, y) { const a = aDeg * D2R; return { pos: [r * cos(a), y, r * sin(a)], rotY: -a, az: aDeg }; }

    // geometrías compartidas
    const gHexHead = new T.CylinderGeometry(.16, .16, .13, 6), gWasher = cyl(.22, .03, 16), gNut = new T.CylinderGeometry(.085, .085, .06, 6);
    const gScrew = new T.CylinderGeometry(.03, .03, .03, 6);

    /* ================= BASE ================= */
    {
      const u = unit('Anclajes', { es: 'Pernos de anclaje', sys: 'BASE', cy: 0, h: 1.8, stack: true,
        desc: 'Dieciséis pernos que atraviesan la plataforma y la fijan a la losa de hormigón. Absorben las vibraciones del conjunto.' });
      const gShaft = cyl(.075, 1.7, 10);
      for (let k = 0; k < 8; k++) for (let s = -1; s <= 1; s += 2) {
        const a = 22.5 + 45 * k + s * 5, p = polar(4.4, a, 0);
        add(u, gShaft, 'steelLight', { pos: [p.x, -.05, p.z] });
        add(u, gHexHead, 'steelDark', { pos: [p.x, .865, p.z] });
        add(u, gWasher, 'steel', { pos: [p.x, .815, p.z] });
      }
    }
    {
      const u = unit('Plataforma_Base', { es: 'Plataforma base', sys: 'BASE', pos: [0, .4, 0], cy: .4, h: .8, stack: true,
        desc: 'Zócalo octogonal de acero de 9,8 m de diámetro. Reparte el peso del dispositivo (unas 420 t) sobre la losa.' });
      add(u, oct(P.platR - .15, P.platR, .8), 'steelDark');
      add(u, oct(P.platR - .35, P.platR - .3, .06), 'steel', { pos: [0, .43, 0] });
      for (let k = 0; k < 8; k++) {
        addRad(u, box(.06, .4, 1.7), 'steel', P.platR * cos(22.5 * D2R) + .01, 45 * k, -.02);
        addRad(u, box(.08, .06, .4), 'steelLight', P.platR * cos(22.5 * D2R) + .06, 45 * k, .0);
      }
    }
    {
      const u = unit('Pedestal_Equipos', { es: 'Pedestal de equipos', sys: 'BASE', pos: [0, 1.7, 0], cy: 1.7, h: 1.8, stack: true,
        desc: 'Sistema inferior: bancada octogonal donde se fijan los módulos de control, con un asiento central que sostiene la cámara de vacío.' });
      add(u, oct(2.8, 2.9, 1.0), 'steelDark', { pos: [0, -.4, 0] });
      add(u, cyl(1.6, .8, 40), 'steel', { pos: [0, .5, 0] });
      add(u, annulus(1.78, 1.45, .1, 40), 'steelLight', { pos: [0, .8, 0] });
      for (let i = 0; i < 12; i++) { const p = polar(1.62, i * 30, 0); add(u, gScrew, 'gold', { pos: [p.x, .87, p.z] }); }
    }

    /* ================= CONTROL ================= */
    function moduloControl(id, es, az, leds) {
      const q = radPivot(2.679 + .5, az, 1.3);
      const u = unit(id, { es: es, sys: 'CONTROL', pos: q.pos, rotY: q.rotY, az: az, cy: 1.3, h: .96, dr: 3.2, dyLike: 'Pedestal_Equipos',
        desc: 'Módulo de control montado sobre el pedestal: paneles con indicadores y mandos que regulan la energía enviada a las bobinas.' });
      add(u, box(1.0, .96, 1.4), 'steelDark');
      add(u, box(.05, .76, 1.12), 'panel', { pos: [.52, 0, 0] });
      for (let i = 0; i < leds; i++) add(u, box(.03, .05, .08), 'led', { pos: [.55, .22, -.45 + i * (.9 / (leds - 1))] });
      [-.3, .3].forEach(function (z) { add(u, cylX(.07, .06, 16), 'gold', { pos: [.56, -.05, z] }); });
      for (let i = 0; i < 3; i++) add(u, box(.03, .04, .5), 'iron', { pos: [.55, -.2 - i * .09, 0] });
      [[-.45, .3], [.45, .3], [-.45, -.3], [.45, -.3]].forEach(function (c) { add(u, gScrew, 'steelLight', { pos: [.55, c[1] * 1.2, c[0] * 1.1], rot: [0, 0, PI / 2] }); });
      add(u, cyl(.12, .12, 16), 'steelLight', { pos: [0, .54, 0] });
      return u;
    }
    moduloControl('Modulo_Control_A', 'Módulo de control A', 45, 6);
    moduloControl('Modulo_Control_B', 'Módulo de control B', 135, 5);
    moduloControl('Modulo_Control_C', 'Módulo de control C', 225, 4);
    {
      const q = radPivot(2.679 + .4, 315, 1.2);
      const u = unit('Regulador', { es: 'Regulador de tensión', sys: 'CONTROL', pos: q.pos, rotY: q.rotY, az: 315, cy: 1.2, h: .7, dr: 3.2, dyLike: 'Pedestal_Equipos',
        desc: 'Regulador de tensión con dial: ajusta la energía que recibe el sistema antes de repartirla a los módulos.' });
      add(u, box(.8, .7, .9), 'steelDark');
      add(u, cylX(.22, .1, 28), 'gold', { pos: [.45, .05, 0] });
      add(u, box(.04, .03, .16), 'iron', { pos: [.51, .05, .06] });
      add(u, cylX(.05, .06, 12), 'led', { pos: [.43, .25, .3] });
      [-.2, .2].forEach(function (z) { add(u, cyl(.06, .1, 12), 'steelLight', { pos: [0, .4, z] }); });
      add(u, cyl(.1, .1, 12), 'steelLight', { pos: [0, .39, -.0] });
    }
    {
      const q = radPivot(4.05, 0, 1.55);
      const u = unit('Fuente_Energia', { es: 'Fuente de energía', sys: 'CONTROL', pos: q.pos, rotY: q.rotY, az: 0, cy: 1.55, h: 1.5, dr: 3.4, dyLike: 'Plataforma_Base',
        desc: 'Acometida de potencia que llega desde el reactor nuclear. De aquí sale el cable principal que sube hasta la cabeza.' });
      add(u, box(1.0, 1.5, 1.7), 'steelDark');
      add(u, box(.04, .6, .6), 'gold', { pos: [.52, 0, 0] });
      const s = new T.Shape();
      [[.10, .26], [-.10, -.01], [0, -.01], [-.08, -.26], [.12, .05], [.02, .05]].forEach(function (p, i) { i ? s.lineTo(p[0] * .85, p[1] * .85) : s.moveTo(p[0] * .85, p[1] * .85); });
      const bg = new T.ExtrudeGeometry(s, { depth: .03, bevelEnabled: false }); bg.rotateY(PI / 2);
      add(u, bg, 'iron', { pos: [.535, 0, 0] });
      [-.5, .5].forEach(function (z) { for (let i = 0; i < 4; i++) add(u, cyl(.2 - i * .015, .05, 20), 'rubber', { pos: [.1, .78 + i * .07, z] }); });
      add(u, cyl(.3, .3, 24), 'steelLight', { pos: [0, .9, 0] });
      add(u, box(.04, .5, 1.4), 'steel', { pos: [.52, -.55, 0] });
    }
    // cables (origen en el eje, coordenadas mundo)
    function ferrule(u, r, a, y) { addRad(u, cylX(.13, .22, 14), 'steelLight', r, a, y); }
    {
      const u = unit('Cable_Principal', { es: 'Cable de potencia', sys: 'CONTROL', az: 0, cy: 7.2, h: 9.6, dr: 3.0, dyMode: 'tower',
        desc: 'Cable grueso de potencia: lleva la energía de la fuente a la cabeza del dispositivo.' });
      const pts = [[4.05, 0, 2.62], [4.3, 1, 3.5], [4.55, -2, 6], [4.55, 2, 9], [4.25, 0, 10.8], [3.95, 0, 11.6], [3.45, 0, 11.85], [3.1, 0, 11.75]]
        .map(function (p) { return polar(p[0], p[1], p[2]); });
      add(u, tube(pts, .17, 90, 12), 'rubber');
      ferrule(u, 3.2, 0, 11.75);
    }
    [['A', 45, 3.18, 1.9], ['B', 135, 3.18, 1.9], ['C', 225, 3.18, 1.9], ['D', 315, 3.08, 1.75]].forEach(function (c) {
      const a = c[1];
      const u = unit('Cable_Control_' + c[0], { es: 'Cable de control ' + c[0], sys: 'CONTROL', az: a, cy: 6.8, h: 9.9, dr: 3.0, dyMode: 'tower',
        desc: 'Cable de señales y control: conecta un módulo de la base con un puerto de la cabeza.' });
      const raw = [[c[2], a, c[3]], [c[2] + .02, a + 1, 2.5], [3.75, a - 1, 2.9], [4.15, a, 3.8], [4.25, a + 2, 6], [4.1, a - 2, 9], [4.0, a, 10.8], [3.9, a, 11.55], [3.45, a, 11.85], [3.1, a, 11.75]];
      add(u, tube(raw.map(function (p) { return polar(p[0], p[1], p[2]); }), .07, 90, 8), 'rubber');
      ferrule(u, 3.2, a, 11.75);
    });

    /* ================= REFRIGERACIÓN ================= */
    function intercambiador(id, es, az) {
      const q = radPivot(4.02, az, 2.0);
      const u = unit(id, { es: es, sys: 'REFRIGERACION', pos: q.pos, rotY: q.rotY, az: az, cy: 2.6, h: 3.6, dr: 3.2, dyLike: 'Plataforma_Base',
        desc: 'Intercambiador de calor con aletas: enfría el líquido refrigerante que sube por la tubería hasta las bobinas.' });
      add(u, cyl(.46, 2.4, 28), 'steelLight');
      for (let i = 0; i < 14; i++) add(u, cyl(.62, .03, 28), 'steel', { pos: [0, -1.0 + i * .155, 0] });
      add(u, new T.SphereGeometry(.46, 24, 8, 0, PI * 2, 0, PI / 2), 'steelLight', { pos: [0, 1.2, 0] });
      add(u, cyl(.6, .12, 28), 'steelDark', { pos: [0, -1.14, 0] });
      const pts = [V(0, 1.2, 0), V(0, 2.1, 0), V(-.15, 2.4, 0), V(-.5, 2.4, 0), V(-1.28, 2.4, 0)];
      add(u, tube(pts, .1, 40, 10), 'pipe');
      add(u, cylX(.15, .1, 16), 'steelLight', { pos: [-1.3, 2.4, 0] });
    }
    intercambiador('Intercambiador_A', 'Intercambiador de calor A', 90);
    intercambiador('Intercambiador_B', 'Intercambiador de calor B', 270);
    {
      const q = radPivot(3.95, 180, 1.25);
      const u = unit('Bomba_Principal', { es: 'Bomba de refrigerante', sys: 'REFRIGERACION', pos: q.pos, rotY: q.rotY, az: 180, cy: 1.25, h: 1.0, dr: 3.2, dyLike: 'Plataforma_Base',
        desc: 'Bomba que hace circular el agua del circuito cerrado de refrigeración entre los intercambiadores y las bobinas.' });
      add(u, box(1.5, .12, 1.3), 'steelDark', { pos: [0, -.35, 0] });
      add(u, cylZ(.34, 1.1, 24), 'steel', { pos: [0, .1, -.15] });
      add(u, cylZ(.5, .42, 28), 'steelLight', { pos: [0, .1, .6] });
      add(u, cyl(.12, .5, 14), 'pipe', { pos: [0, .5, .6] });
      add(u, cylZ(.4, .08, 24), 'gold', { pos: [0, .1, -.75] });
    }
    {
      const u = unit('Colector_Refrigeracion', { es: 'Colector de refrigeración', sys: 'REFRIGERACION', az: 180, cy: 1.05, h: .3, dr: 2.6, dyLike: 'Plataforma_Base',
        desc: 'Tubería que une la bomba con los dos intercambiadores, a ras de la plataforma.' });
      [[90, 172, 1], [270, 188, -1]].forEach(function (s) {
        const pts = [];
        pts.push(polar(4.02, s[0], 1.05), polar(4.3, s[0] + s[2] * 20, 1.05), polar(4.35, 135 + (s[0] === 270 ? 90 : 0), 1.05), polar(4.2, s[1], 1.2), polar(4.0, s[1] + s[2] * 6, 1.2));
        add(u, tube(pts, .085, 40, 8), 'pipe');
      });
    }

    /* ================= ESTRUCTURA EXTERIOR ================= */
    {
      const u = unit('Anillo_Inferior', { es: 'Anillo inferior (plataforma de acceso)', sys: 'ESTRUCTURA_EXTERIOR', pos: [0, 2.05, 0], cy: 2.05, h: .5, stack: true,
        desc: 'Anillo con pasarela de acceso: recibe la base de las ocho columnas y permite el mantenimiento del sistema inferior.' });
      add(u, annulus(3.5, 1.9, .5, 64), 'steel');
      for (let i = 0; i < 16; i++) { const p = polar(3.28, i * 22.5, 0); add(u, gHexHead, 'steelDark', { pos: [p.x, .3, p.z], rot: [0, 0, 0] }); }
    }
    {
      const u = unit('Anillo_Intermedio', { es: 'Anillo intermedio', sys: 'ESTRUCTURA_EXTERIOR', pos: [0, 6, 0], cy: 6, h: .45, stack: true,
        desc: 'Anillo de rigidez que amarra las ocho columnas y sujeta la bobina central mediante ocho brazos.' });
      add(u, annulus(3.3, 2.6, .45, 64), 'steel');
      for (let k = 0; k < 8; k++) addRad(u, box(.4, .2, .16), 'steelLight', 2.44, 45 * k, 0);
    }
    {
      const u = unit('Anillo_Superior', { es: 'Anillo superior de contención magnética', sys: 'ESTRUCTURA_EXTERIOR', pos: [0, 11.05, 0], cy: 11.05, h: .5, stack: true,
        desc: 'Anillo segmentado en doce arcos con abrazaderas doradas. Cierra la estructura por arriba y contiene el campo magnético.' });
      for (let i = 0; i < 12; i++) {
        add(u, sector(3.7, 2.5, .5, i * 30 + .8, (i + 1) * 30 - .8), 'steel', { name: 'Segmento_' + (i + 1) });
        addRad(u, box(.5, .62, 1.3), 'gold', 3.1, i * 30, 0, { name: 'Abrazadera_' + (i + 1) });
      }
    }
    for (let k = 0; k < 8; k++) {
      const a = 22.5 + 45 * k, q = radPivot(P.colR, a, 6.55), n = String(k + 1).padStart(2, '0');
      const u = unit('Columna_' + n, { es: 'Columna ' + n, sys: 'ESTRUCTURA_EXTERIOR', pos: q.pos, rotY: q.rotY, az: a, cy: 6.55, h: 8.5, dr: 3.4, dyMode: 'tower',
        desc: 'Columna de acero que soporta la carga entre el anillo inferior y el anillo superior. Hay ocho, repartidas cada 45°.' });
      add(u, cyl(.26, 8.5, 16), 'steel');
      add(u, box(.8, .12, .8), 'steelDark', { pos: [0, -4.19, 0] });
      add(u, box(.8, .12, .8), 'steelDark', { pos: [0, 4.19, 0] });
      [-3.2, -1.6, 1.6, 3.2].forEach(function (y) { add(u, cyl(.31, .1, 16), 'steelDark', { pos: [0, y, 0] }); });
      [-3.85, 3.85].forEach(function (y) { add(u, cyl(.28, .14, 16), 'gold', { pos: [0, y, 0] }); });
      add(u, cyl(.36, .6, 16), 'steelLight', { pos: [0, -.55, 0] });
    }
    for (let k = 0; k < 8; k++) {
      const b = 45 * k, q = radPivot(P.colR * cos(22.5 * D2R), b, 6.5), n = String(k + 1).padStart(2, '0');
      const u = unit('Arriostres_' + n, { es: 'Arriostres ' + n, sys: 'ESTRUCTURA_EXTERIOR', pos: q.pos, rotY: q.rotY, az: b, cy: 6.5, h: 8, dr: 3.4, dyMode: 'tower',
        desc: 'Tirantes en X entre dos columnas vecinas. Rigidizan la estructura frente a las vibraciones.' });
      const w = .93;
      [[-3.9, -.7], [-.3, 4.1]].forEach(function (t) {
        add(u, rodGeo(V(0, t[0], -w), V(0, t[1], w), .045, 8), 'steelLight');
        add(u, rodGeo(V(0, t[0], w), V(0, t[1], -w), .045, 8), 'steelLight');
        add(u, box(.07, .2, .2), 'steelDark', { pos: [0, (t[0] + t[1]) / 2, 0] });
        [t[0], t[1]].forEach(function (y) { [-w, w].forEach(function (z) { add(u, box(.1, .2, .2), 'steelDark', { pos: [0, y, z] }); }); });
      });
    }
    {
      const u = unit('Cabeza', { es: 'Cabeza de control', sys: 'ESTRUCTURA_EXTERIOR', pos: [0, 11.9, 0], cy: 11.9, h: 1.2, stack: true,
        desc: 'Cúpula superior con módulos sensores, cámara de monitoreo, baliza de alarma, tornillos de brida y puertos de cables.' });
      const R = 5.5, th = Math.asin(2.7 / R), cy0 = 11.55 - R * cos(th) - 11.9;
      add(u, cyl(2.9, .25, 56), 'steelDark', { pos: [0, -.475, 0] });
      add(u, annulus(3.0, 2.7, .08, 56), 'steel', { pos: [0, -.33, 0] });
      add(u, new T.SphereGeometry(R, 56, 14, 0, PI * 2, 0, th), 'steel', { pos: [0, cy0, 0] });
      for (let i = 0; i < 16; i++) { const p = polar(2.85, i * 22.5, 0); add(u, gScrew, 'gold', { pos: [p.x, -.31, p.z], rot: [0, 0, 0] }); }
      add(u, cyl(.55, .32, 28), 'steelLight', { pos: [0, .22, 0] });
      add(u, cyl(.25, .1, 20), 'led', { pos: [0, .4, 0] });
      for (let i = 0; i < 4; i++) { const p = polar(1.35, 45 + i * 90, 0); add(u, cyl(.28, .24, 20), 'steelDark', { pos: [p.x, .05, p.z] }); add(u, cyl(.12, .05, 14), 'led', { pos: [p.x, .19, p.z] }); }
      // puertos de cable
      [0, 45, 135, 225, 315].forEach(function (a) { addRad(u, cylX(.2, .55, 18), 'steelLight', 2.825, a, -.15); });
      // cámara (az 90°) y baliza (az 270°)
      addRad(u, box(.5, .35, .4), 'steelDark', 2.45, 90, -.1);
      addRad(u, cylX(.1, .2, 16), 'iron', 2.8, 90, -.1);
      addRad(u, cylX(.045, .05, 12), 'led', 2.92, 90, -.1);
      addRad(u, cyl(.17, .3, 20), 'amber', 2.5, 270, -.2);
      addRad(u, cyl(.2, .06, 20), 'steelDark', 2.5, 270, -.37);
    }

    /* ================= NÚCLEO ================= */
    function chamberGeo(sign) {
      let pts = [[0, -1.7], [1.0, -1.7], [1.25, -1.45], [1.25, 1.7], [1.19, 1.7], [1.19, -1.4], [.98, -1.64], [0, -1.64]]
        .map(function (p) { return new T.Vector2(p[0], p[1] * sign); });
      if (sign < 0) pts.reverse();
      return new T.LatheGeometry(pts, 56);
    }
    function camara(id, es, sign, cy) {
      const u = unit(id, { es: es, sys: 'NUCLEO', pos: [0, cy, 0], cy: cy, h: 3.4, stack: true, role: 'cham',
        desc: 'Semicámara de vacío ultra alto (acero y cuarzo) que rodea al núcleo. Las dos mitades se unen por una brida atornillada.' });
      add(u, chamberGeo(sign), 'glass');
      add(u, annulus(1.55, 1.19, .14, 48), 'steelLight', { pos: [0, sign * 1.63, 0] });
      for (let i = 0; i < 12; i++) { const p = polar(1.37, i * 30, 0); add(u, gScrew, 'gold', { pos: [p.x, sign * 1.71, p.z] }); }
      addRad(u, cylX(.09, .5, 12), 'steelLight', 1.5, 270, sign * -1.0);
      addRad(u, cylX(.15, .06, 16), 'steelDark', 1.76, 270, sign * -1.0);
    }
    camara('Camara_Vacio_Inferior', 'Cámara de vacío (mitad inferior)', 1, 4.3);
    camara('Camara_Vacio_Superior', 'Cámara de vacío (mitad superior)', -1, 7.7);

    function electrodo(id, es, cy) {
      const u = unit(id, { es: es, sys: 'NUCLEO', pos: [0, cy, 0], cy: cy, h: .25, stack: true,
        desc: 'Placa del capacitor: aplica el campo eléctrico al fluido emulsionado de la cápsula.' });
      add(u, cyl(.95, .22, 40), 'steelLight');
      add(u, cyl(.2, .1, 20), 'gold', { pos: [0, cy < 6 ? -.14 : .14, 0] });
      add(u, tor(.9, .03, 8, 48), 'gold', { pos: [0, cy < 6 ? .12 : -.12, 0] });
    }
    electrodo('Electrodo_Inferior', 'Placa inferior del capacitor', 3.225);
    electrodo('Electrodo_Superior', 'Placa superior del capacitor', 8.775);

    function fluido(id, es, cy) {
      const u = unit(id, { es: es, sys: 'NUCLEO', pos: [0, cy, 0], cy: cy, h: 1.85, stack: true,
        desc: 'Cápsula con fluido emulsionado de Hydraether: la columna luminosa del núcleo. Contiene gotas de agua y CO₂ estabilizadas por un emulsionante.' });
      add(u, cyl(.46, 1.85, 40), 'fluid', { name: 'Fluido' });
      add(u, cyl(.54, 1.85, 40), 'lens', { name: 'Capsula_Cuarzo' });
      [-.92, .92].forEach(function (y) { add(u, cyl(.62, .07, 40), 'steelLight', { pos: [0, y, 0] }); });
      const gd = new T.SphereGeometry(1, 8, 6);
      for (let i = 0; i < 34; i++) {
        const r = Math.sqrt(rnd()) * .38, a = rnd() * PI * 2, s = .03 + rnd() * .05;
        const m = add(u, gd, 'droplet', { pos: [r * cos(a), (rnd() - .5) * 1.7, r * sin(a)], name: 'Gota' });
        m.scale.setScalar(s);
      }
    }
    fluido('Fluido_Inferior', 'Fluido emulsionado (inferior)', 4.275);
    fluido('Fluido_Superior', 'Fluido emulsionado (superior)', 7.725);

    {
      const u = unit('Nucleo_Omega', { es: 'Núcleo del Resonador Ω', sys: 'NUCLEO', pos: [0, 6, 0], cy: 6, h: 2.0, stack: true,
        desc: 'Corazón del resonador: carcasa metálica con ventana ecuatorial, lente de cuarzo y centro energético donde se concentran las fluctuaciones cuánticas del vacío.' });
      const cap = PI / 2 - .2;
      add(u, new T.SphereGeometry(.8, 56, 22, 0, PI * 2, 0, cap), 'steel', { name: 'Carcasa_Superior' });
      add(u, new T.SphereGeometry(.8, 56, 22, 0, PI * 2, PI / 2 + .2, cap), 'steel', { name: 'Carcasa_Inferior' });
      [-1, 1].forEach(function (s) { add(u, tor(.784, .025, 8, 64), 'gold', { pos: [0, s * .159, 0] }); });
      add(u, new T.SphereGeometry(.66, 40, 24), 'lens', { name: 'Lente_Cuarzo' });
      add(u, new T.SphereGeometry(.4, 36, 24), 'coreGlow', { name: 'Centro_Energetico' });
      add(u, new T.SphereGeometry(.18, 24, 16), 'coreGlow');
      [-1, 1].forEach(function (s) { add(u, cyl(.56, .26, 36), 'steelDark', { pos: [0, s * .78, 0] }); });
      const susp = sub(u, 'Sistema_Suspension', 'Sistema de suspensión');
      for (let i = 0; i < 6; i++) { const a = i * 60 * D2R; add(u, rodGeo(V(.74 * cos(a), 0, .74 * sin(a)), V(1.0 * cos(a), 0, 1.0 * sin(a)), .03, 8), 'steelLight', { parent: susp }); }
      const rings = sub(u, 'Anillos_Resonancia', 'Anillos de resonancia');
      add(u, tor(1.0, .04, 10, 72), 'steelLight', { parent: rings });
      const r2 = add(u, tor(.97, .03, 10, 72), 'steelLight', { parent: rings }); r2.rotation.x = PI / 3;
      const r3 = add(u, tor(.97, .03, 10, 72), 'steelLight', { parent: rings }); r3.rotation.z = PI / 3;
    }

    /* ================= ESTABILIZACIÓN MAGNÉTICA ================= */
    const gFormer = tor(P.coilR, .27, 14, 72);
    const gWind = new T.TubeGeometry(new CoilCurve(P.coilR, P.coilRc, P.coilTurns), P.coilTurns * 10, .028, 5, false);
    for (let i = 0; i < P.nCoils; i++) {
      const y = P.coilY0 + P.coilDy * i, n = String(i + 1).padStart(2, '0');
      const u = unit('Bobina_' + n, { es: 'Bobina ' + n, sys: 'ESTABILIZACION_MAGNETICA', pos: [0, y, 0], cy: y, h: .6, stack: true,
        desc: 'Bobina de cobre de ' + P.coilTurns + ' espiras sobre un carrete de acero. Genera el campo magnético que estabiliza el núcleo.' });
      add(u, gFormer, 'steelDark', { name: 'Carrete' });
      add(u, gWind, 'copper', { name: 'Devanado_Cobre' });
      for (let j = 0; j < 4; j++) addRad(u, box(.34, .16, .26), 'steelLight', 2.40, 22.5 + 90 * j, 0, { name: 'Orejeta_' + (j + 1) });
      add(u, box(.24, .12, .18), 'copper', { pos: [-2.36, 0, 0], name: 'Terminal' });
    }
    for (let j = 0; j < 4; j++) {
      const a = 22.5 + 90 * j, q = radPivot(2.43, a, 5.8);
      const u = unit('Varilla_Tensora_' + (j + 1), { es: 'Varilla tensora ' + (j + 1), sys: 'ESTABILIZACION_MAGNETICA', pos: q.pos, rotY: q.rotY, az: a, cy: 5.8, h: 7.0, dr: 2.2, dyMode: 'tower',
        desc: 'Varilla roscada que mantiene las siete bobinas alineadas y comprimidas entre sí mediante tuercas.' });
      add(u, cyl(.045, 7.0, 10), 'steelLight');
      for (let i = 0; i < P.nCoils; i++) { const yy = P.coilY0 + P.coilDy * i - 5.8; [-.11, .11].forEach(function (d) { add(u, gNut, 'steel', { pos: [0, yy + d, 0] }); }); }
      [-3.5, 3.5].forEach(function (y) { add(u, new T.SphereGeometry(.06, 10, 8), 'steelLight', { pos: [0, y, 0] }); });
    }
    {
      const q = radPivot(2.45, 180, 6.0);
      const u = unit('Barra_Colectora', { es: 'Barra colectora', sys: 'ESTABILIZACION_MAGNETICA', pos: q.pos, rotY: q.rotY, az: 180, cy: 6, h: 5.4, dr: 2.2, dyMode: 'tower',
        desc: 'Barra de cobre que une los terminales de las siete bobinas y reparte la corriente entre ellas.' });
      add(u, box(.1, 5.4, .22), 'copper');
      for (let i = 0; i < P.nCoils; i++) add(u, box(.16, .12, .3), 'steelDark', { pos: [0, P.coilY0 + P.coilDy * i - 6, 0] });
    }

    /* ================= ESCALA: figura humana ================= */
    const fig = new T.Group(); fig.name = 'Figura_Humana_1_75m';
    {
      const coat = new T.MeshStandardMaterial({ color: 0xe6e4dc, roughness: .8 }),
        pants = new T.MeshStandardMaterial({ color: 0x2b2f36, roughness: .8 }),
        skin = new T.MeshStandardMaterial({ color: 0xd2a98a, roughness: .7 });
      function m(g, mat, x, y, z) { const o = new T.Mesh(g, mat); o.position.set(x, y, z); fig.add(o); return o; }
      m(new T.CylinderGeometry(.07, .06, .85, 10), pants, -.1, .425, 0);
      m(new T.CylinderGeometry(.07, .06, .85, 10), pants, .1, .425, 0);
      m(new T.CapsuleGeometry(.2, .55, 4, 12), coat, 0, 1.2, 0);
      m(new T.CylinderGeometry(.045, .045, .6, 8), coat, -.27, 1.2, 0);
      m(new T.CylinderGeometry(.045, .045, .6, 8), coat, .27, 1.2, 0);
      m(new T.SphereGeometry(.11, 16, 12), skin, 0, 1.64, 0);
      const p = polar(6.0, 340, 0); fig.position.set(p.x, 0, p.z); fig.rotation.y = 1.2;
    }
    rootG.add(fig);

    rootG.updateMatrixWorld(true);
    return { root: rootG, units: units, byId: byId, SYS: SYS, SECTION: SECTION, CUT: CUT, params: P, figure: fig };
  }

  root.ResonadorModel = { build: build };
})(typeof window !== 'undefined' ? window : globalThis);
