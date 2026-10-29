/* ============================================================
   Oficina de análisis: escritorio con 8 papeles (uno por gráfica), mobiliario y figura de escala
   Oficina.build(RES, lab, lista, { shadows }) → { view(), layout(), pick(), setHover(), update(), anchor(), count }
   ============================================================ */
window.Oficina = (function () {
  'use strict';
  const T = THREE, PI = Math.PI;
  const PW = .24, PH = .33;                       // papel (m), algo mayor que A4 para leerse bien
  const FONT = '"Special Elite", "Courier New", Courier, monospace';

  function wrap(g, text, maxW) {
    const words = text.split(' '), out = []; let line = '';
    words.forEach(function (w) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
    if (line) out.push(line); return out;
  }
  // pictograma del tipo de gráfica, dibujado a tinta
  function glyph(g, kind, x, y, w, h) {
    g.save(); g.translate(x, y); g.strokeStyle = 'rgba(40,34,26,.8)'; g.fillStyle = 'rgba(40,34,26,.18)'; g.lineWidth = 3;
    g.strokeRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) * .36;
    if (kind === 'barrasH') { [.8, .55, .7, .4, .9].forEach(function (v, i) { g.fillRect(12, 12 + i * (h - 24) / 5, (w - 24) * v, (h - 24) / 5 - 6); g.strokeRect(12, 12 + i * (h - 24) / 5, (w - 24) * v, (h - 24) / 5 - 6); }); }
    else if (kind === 'barrasG') { [.5, .8, .35, .65, .7, .45].forEach(function (v, i) { const bw = (w - 24) / 6 - 4, bx = 12 + i * ((w - 24) / 6) + (i % 2 ? -2 : 2); g.fillRect(bx, h - 12 - (h - 24) * v, bw, (h - 24) * v); g.strokeRect(bx, h - 12 - (h - 24) * v, bw, (h - 24) * v); }); }
    else if (kind === 'torta' || kind === 'dona') {
      let a = -PI / 2; [.42, .24, .16, .1, .08].forEach(function (v) { g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a, a + v * PI * 2); g.closePath(); g.stroke(); a += v * PI * 2; });
      if (kind === 'dona') { g.beginPath(); g.arc(cx, cy, r * .5, 0, PI * 2); g.fillStyle = '#e9e1cc'; g.fill(); g.stroke(); }
    } else if (kind === 'linea' || kind === 'doble') {
      g.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40, s = 1 / (1 + Math.exp(-(t - .5) * 10)); const px = 10 + t * (w - 20), py = h - 12 - s * (h - 24); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
      if (kind === 'doble') { g.setLineDash([8, 6]); g.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40, s = 1 - 1 / (1 + Math.exp(-(t - .5) * 10)); const px = 10 + t * (w - 20), py = h - 12 - s * (h - 24); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); g.setLineDash([]); }
    } else if (kind === 'mapa') {
      [[.12, .25, .3, .3], [.22, .6, .16, .28], [.47, .2, .2, .22], [.5, .48, .14, .3], [.68, .22, .24, .32], [.78, .66, .14, .14]].forEach(function (b) { g.beginPath(); g.ellipse(w * (b[0] + b[2] / 2), h * (b[1] + b[3] / 2), w * b[2] / 2, h * b[3] / 2, .3, 0, PI * 2); g.fill(); g.stroke(); });
    } else if (kind === 'zonas') {
      g.beginPath(); g.arc(cx, cy, r, 0, PI * 2); g.stroke(); g.beginPath(); g.arc(cx, cy, r * .55, 0, PI * 2); g.stroke();
      for (let i = 0; i < 6; i++) { const a = i * PI / 3; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * .55, cy + Math.sin(a) * r * .55); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke(); }
    }
    g.restore();
  }
  function paperTexture(item, idx, total, rnd, aniso) {
    const W = 768, H = Math.round(W * PH / PW), c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    // papel envejecido
    g.fillStyle = '#e9e1cc'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { g.fillStyle = 'rgba(' + (rnd() > .5 ? '255,250,235' : '120,100,70') + ',' + (.06 * rnd()).toFixed(3) + ')'; g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 3, 2 + rnd() * 3); }
    const e = g.createRadialGradient(W / 2, H / 2, W * .35, W / 2, H / 2, H * .75); e.addColorStop(0, 'rgba(120,95,60,0)'); e.addColorStop(1, 'rgba(120,95,60,.28)');
    g.fillStyle = e; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(110,90,60,.12)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, H * .5 + 3); g.lineTo(W, H * .5 - 2); g.stroke();   // doblez
    const ink = '#2a241b', ink2 = 'rgba(42,36,27,.62)', M = 52;
    g.fillStyle = ink; g.textBaseline = 'alphabetic';
    g.font = '26px ' + FONT; g.fillText('INSTITUTO KURCHÁTOV', M, 78);
    g.fillStyle = ink2; g.fillText('PROYECTO Ω · ARCHIVO', M, 112);
    g.textAlign = 'right'; g.fillText('HOJA ' + item.n + ' / ' + String(total).padStart(2, '0'), W - M, 78); g.textAlign = 'left';
    g.fillStyle = ink; g.fillRect(M, 134, W - 2 * M, 3); g.fillRect(M, 142, W - 2 * M, 1.5);
    // número grande y título
    g.font = '170px ' + FONT; g.fillText(item.n, M - 6, 316);
    g.font = '58px ' + FONT;
    const tl = wrap(g, item.titulo, W - 2 * M); tl.forEach(function (l, i) { g.fillText(l, M, 400 + i * 64); });
    let y = 400 + tl.length * 64 + 6;
    g.font = '32px ' + FONT; g.fillStyle = ink2;
    wrap(g, item.sub, W - 2 * M).forEach(function (l) { g.fillText(l, M, y); y += 40; });
    g.fillText('Tipo: ' + item.tipo.toLowerCase(), M, y + 6); y += 34;
    // pictograma y líneas mecanografiadas (relleno sin texto)
    glyph(g, item.glyph, M, y + 34, W - 2 * M, 250); y += 34 + 250 + 46;
    g.fillStyle = 'rgba(42,36,27,.22)';
    for (let i = 0; y + i * 30 < H - 70; i++) { const w = (W - 2 * M) * (i % 4 === 3 ? .45 + rnd() * .2 : .82 + rnd() * .18); g.fillRect(M, y + i * 30, w, 9); }
    // sello «ARCHIVO»
    g.save(); g.translate(W - 210, 236); g.rotate(-.21 + (idx % 3 - 1) * .05);
    g.strokeStyle = 'rgba(163,48,38,.82)'; g.fillStyle = 'rgba(163,48,38,.82)'; g.lineWidth = 7; g.strokeRect(-150, -52, 300, 104);
    g.lineWidth = 2.5; g.strokeRect(-138, -41, 276, 82); g.font = '64px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ARCHIVO', 0, 4);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 700; i++) { g.fillStyle = 'rgba(0,0,0,' + (.5 * rnd()).toFixed(2) + ')'; g.fillRect(-160 + rnd() * 320, -60 + rnd() * 120, 2 + rnd() * 4, 2 + rnd() * 4); }
    g.restore();
    // el sello resta tinta y deja transparente; se recompone sobre papel
    const out = document.createElement('canvas'); out.width = W; out.height = H; const o = out.getContext('2d');
    o.fillStyle = '#e9e1cc'; o.fillRect(0, 0, W, H); o.drawImage(c, 0, 0);
    const t = new T.CanvasTexture(out); t.encoding = T.sRGBEncoding; t.anisotropy = aniso; return t;
  }

  function build(RES, lab, lista, opt) {
    opt = opt || {};
    const O = lab.OFFICE, g = new T.Group(); g.name = 'Oficina'; lab.group.add(g);
    const rnd = lab.rnd, sh = !!opt.shadows;
    const lin = function (c) { return new T.Color(c).convertSRGBToLinear(); };
    const std = function (c, r, m, ex) { return new T.MeshStandardMaterial(Object.assign({ color: lin(c), roughness: r, metalness: m || 0 }, ex || {})); };
    function box(w, h, d, mat, x, y, z, parent) {
      const o = new T.Mesh(new T.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); o.castShadow = o.receiveShadow = sh; (parent || g).add(o); return o;
    }
    const wood = std(0x5e3f26, .62), woodL = std(0x7a5634, .7), steel = std(0x3b4248, .5, .6), green = std(0x56624f, .6, .25),
      felt = std(0x2f4a3c, .95), cream = std(0xc9c2ae, .9), copper = std(0xb4672e, .35, 1), glass = std(0x9fb2bb, .1, 0, { transparent: true, opacity: .22, depthWrite: false }),
      black = std(0x1b1d1f, .6, .2);
    const cx = (O.x0 + O.x1) / 2, cz = (O.z0 + O.z1) / 2, w = O.x1 - O.x0, d = O.z1 - O.z0;

    /* ---------- suelo y tabiques ---------- */
    const linoT = lab.tex(512, 512, function (c, W, H) {
      c.fillStyle = '#5a5340'; c.fillRect(0, 0, W, H); for (let i = 0; i < 3000; i++) { c.fillStyle = 'rgba(0,0,0,' + (.08 * rnd()).toFixed(3) + ')'; c.fillRect(rnd() * W, rnd() * H, 3, 3); }
      c.strokeStyle = 'rgba(20,18,12,.45)'; c.lineWidth = 2; for (let i = 0; i <= W; i += 128) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, H); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(W, i); c.stroke(); }
    }, [w / 2, d / 2]);
    const lino = new T.Mesh(new T.PlaneGeometry(w, d), std(0xffffff, .8, 0, { map: linoT })); lino.rotation.x = -PI / 2; lino.position.set(cx, .008, cz); lino.receiveShadow = sh; g.add(lino);
    box(w, 2.6, .12, std(0x8a8d84, .9), cx, 1.3, O.z0);                                   // muro del fondo
    box(w, .12, .16, wood, cx, 2.62, O.z0);
    [[O.x0, 1], [O.x1, -1]].forEach(function (s) {                                          // tabiques laterales: zócalo + vidrio
      const x = s[0];
      box(.1, 1.05, d, green, x, .525, cz);
      const gl = new T.Mesh(new T.PlaneGeometry(d, 1.3), glass); gl.position.set(x, 1.7, cz); gl.rotation.y = PI / 2; g.add(gl);
      box(.12, .08, d, wood, x, 1.06, cz); box(.12, .08, d, wood, x, 2.38, cz);
      for (let z = O.z0; z <= O.z1 + .01; z += d / 4) box(.1, 2.4, .1, wood, x, 1.2, z);
    });

    /* ---------- escritorio ---------- */
    const DT = .78, D = new T.Vector3(cx, DT, cz + .2);
    box(2.0, .045, 1.0, wood, D.x, DT - .0225, D.z);
    box(.48, .72, .92, woodL, D.x + .72, .36, D.z);                                         // cajonera
    [.12, .36, .58].forEach(function (y) { box(.04, .02, .14, copper, D.x + .72, y + .02, D.z + .47); });
    [[-.95, -.45], [-.95, .45]].forEach(function (p) { box(.05, DT - .05, .05, steel, D.x + p[0], (DT - .05) / 2, D.z + p[1]); });
    box(.05, .05, .9, steel, D.x - .95, .12, D.z);
    const pad = box(1.62, .006, .9, felt, D.x - .04, DT + .003, D.z); pad.castShadow = false;
    // lámpara de escritorio (esquina trasera izquierda, fuera de la zona de papeles)
    (function () {
      const L = new T.Group(); L.position.set(D.x - .93, DT, D.z - .43); g.add(L);
      const base = new T.Mesh(new T.CylinderGeometry(.09, .1, .03, 20), black); base.position.y = .015; L.add(base);
      const a1 = new T.Mesh(new T.CylinderGeometry(.012, .012, .42, 8), black); a1.position.set(0, .22, 0); a1.rotation.z = -.2; L.add(a1);
      const a2 = new T.Mesh(new T.CylinderGeometry(.012, .012, .3, 8), black); a2.position.set(.08, .45, .07); a2.rotation.set(.9, 0, -.6); L.add(a2);
      const shade = new T.Mesh(new T.ConeGeometry(.11, .16, 20, 1, true), std(0x3f5a45, .45, .4, { side: T.DoubleSide })); shade.position.set(.1, .47, .07); shade.rotation.set(.35, 0, -.55); L.add(shade);
      const bulb = new T.Mesh(new T.SphereGeometry(.04, 12, 8), new T.MeshBasicMaterial({ color: lin(0xffe2a8) })); bulb.position.set(.11, .44, .08); L.add(bulb);
      const pl = lab.addLight(new T.PointLight(0xffd59c, .7, 3.5, 2), .7); pl.position.set(D.x - .8, DT + .4, D.z - .33);
    })();
    // teléfono de disco y carpetas (atrezo)
    box(.2, .08, .22, black, D.x + .82, DT + .04, D.z - .3); box(.24, .045, .06, black, D.x + .82, DT + .1, D.z - .3);
    const dial = new T.Mesh(new T.CylinderGeometry(.06, .06, .01, 20), cream); dial.position.set(D.x + .82, DT + .085, D.z - .22); dial.rotation.x = -.3; g.add(dial);
    [0, 1, 2].forEach(function (i) { const f = box(.26, .025, .34, std([0x8a6f45, 0x6f6f5a, 0x7d5e3a][i], .85), D.x + .82, DT + .015 + i * .026, D.z + .18); f.rotation.y = (i - 1) * .08; });

    /* ---------- silla ---------- */
    (function () {
      const C = new T.Group(); C.position.set(D.x - .1, 0, D.z + .82); C.rotation.y = .25; g.add(C);
      box(.46, .04, .44, wood, 0, .46, 0, C);
      [[-.2, -.19], [.2, -.19], [-.2, .19], [.2, .19]].forEach(function (p) { box(.035, .46, .035, wood, p[0], .23, p[1], C); });
      box(.035, .5, .035, wood, -.2, .72, .19, C); box(.035, .5, .035, wood, .2, .72, .19, C); box(.44, .16, .03, wood, 0, .86, .19, C);
    })();

    /* ---------- archivadores y tablero de avisos ---------- */
    [O.x0 + .55, O.x0 + 1.3].forEach(function (x) {
      box(.7, 1.33, .62, green, x, .665, O.z0 + .38);
      for (let k = 0; k < 4; k++) { box(.66, .006, .01, black, x, .3 + k * .32, O.z0 + .695); box(.12, .025, .03, copper, x, .2 + k * .32, O.z0 + .71); }
    });
    const boardT = lab.tex(1024, 512, function (c, W, H) {
      c.fillStyle = '#9a7650'; c.fillRect(0, 0, W, H); for (let i = 0; i < 6000; i++) { c.fillStyle = 'rgba(' + (rnd() > .5 ? '60,40,20' : '200,170,120') + ',' + (.25 * rnd()).toFixed(2) + ')'; c.fillRect(rnd() * W, rnd() * H, 2, 2); }
      const notes = [['AVISO', 64, 50, 250, 300, -.03], ['PROYECTO Ω', 360, 40, 280, 200, .02], ['INSTITUTO KURCHÁTOV', 700, 70, 270, 330, .03], ['TURNOS', 370, 280, 240, 190, -.04]];
      notes.forEach(function (n) {
        c.save(); c.translate(n[1] + n[3] / 2, n[2] + n[4] / 2); c.rotate(n[5]);
        c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-n[3] / 2 + 6, -n[4] / 2 + 8, n[3], n[4]);
        c.fillStyle = '#ece4cf'; c.fillRect(-n[3] / 2, -n[4] / 2, n[3], n[4]);
        c.fillStyle = '#2a241b'; c.font = '26px ' + FONT; c.textAlign = 'center'; c.fillText(n[0], 0, -n[4] / 2 + 40);
        c.fillStyle = 'rgba(42,36,27,.3)'; for (let y = -n[4] / 2 + 64; y < n[4] / 2 - 18; y += 22) c.fillRect(-n[3] / 2 + 18, y, (n[3] - 36) * (.6 + rnd() * .4), 7);
        c.fillStyle = '#a33026'; c.beginPath(); c.arc(0, -n[4] / 2 + 10, 8, 0, PI * 2); c.fill();
        c.restore();
      });
    });
    const board = new T.Mesh(new T.PlaneGeometry(2.2, 1.1), std(0xffffff, .9, 0, { map: boardT })); board.position.set(cx + 1.4, 1.65, O.z0 + .07); g.add(board);
    box(2.3, .06, .05, wood, cx + 1.4, 2.23, O.z0 + .08); box(2.3, .06, .05, wood, cx + 1.4, 1.07, O.z0 + .08);

    /* ---------- figura humana de 1,75 m (referencia de escala) ---------- */
    const fig = RES.M.figure.clone(true);
    fig.traverse(function (o) { if (o.isMesh) { o.material = o.material.clone(); o.castShadow = sh; } });
    fig.position.set(O.x0 + 1.3, 0, O.z1 - .9); fig.rotation.y = .5; g.add(fig);

    /* ---------- papeles ---------- */
    const aniso = RES.renderer.capabilities.getMaxAnisotropy();
    const geo = new T.PlaneGeometry(PW, PH);
    const papers = lista.map(function (item, i) {
      const m = new T.MeshStandardMaterial({ map: paperTexture(item, i, lista.length, rnd, aniso), color: lin(0xc4c4c4), roughness: .92, emissive: lin(0xffe6b8), emissiveIntensity: 0 });
      const p = new T.Mesh(geo, m); p.castShadow = sh; p.receiveShadow = sh; p.userData.idx = i;
      p.userData.j = { x: (rnd() - .5) * .024, z: (rnd() - .5) * .02, r: (rnd() - .5) * .1 };
      p.userData.h = 0; g.add(p); return p;
    });
    let orient = '', hover = -1;
    function layout(aspect) {
      const o = aspect >= 1 ? 'h' : 'v'; if (o === orient) return; orient = o;
      papers.forEach(function (p, i) {
        const j = p.userData.j, r = Math.floor(i / (o === 'h' ? 4 : 2)), c = i % (o === 'h' ? 4 : 2);
        let x, z, ry;
        if (o === 'h') { x = -.54 + c * .36; z = -.2 + r * .41; ry = 0; }            // 4 × 2, se lee desde el frente (+z)
        else { x = -.57 + r * .38; z = .15 - c * .3; ry = PI / 2; }                  // 2 × 4, se lee desde el extremo (+x)
        p.userData.base = new T.Vector3(D.x + x + j.x, DT + .008 + i * .0004, D.z + z + j.z); p.userData.ry = ry + j.r;
        place(p);
      });
    }
    function place(p) {
      const h = p.userData.h, b = p.userData.base;
      p.position.set(b.x, b.y + .05 * h, b.z);
      p.rotation.set(-PI / 2 + .16 * h, p.userData.ry, 0, 'YXZ');
      p.material.emissiveIntensity = .1 * h;
    }
    function update(dt, reduce) {
      let moving = false; const f = reduce ? 1 : 1 - Math.exp(-dt * 12);
      papers.forEach(function (p, i) {
        const t = i === hover ? 1 : 0, h = p.userData.h;
        if (Math.abs(t - h) > .002) { p.userData.h = h + (t - h) * f; place(p); moving = true; }
        else if (h !== t) { p.userData.h = t; place(p); moving = true; }
      });
      return moving;
    }
    const TAN = Math.tan(15 * PI / 180);
    function view(aspect, ui) {
      ui = ui || 1.18;                                       // margen para la interfaz superior e inferior
      if (aspect >= 1) {
        const dist = Math.max(.82 * ui / (TAN * aspect), .5 * ui / TAN), el = 54 * PI / 180;
        return { p: [D.x, DT + dist * Math.sin(el), D.z + .02 + dist * Math.cos(el)], t: [D.x, DT, D.z + .02] };
      }
      const dist = Math.max(.36 * ui / (TAN * aspect), .82 * ui / TAN), el = 62 * PI / 180;
      return { p: [D.x + dist * Math.cos(el), DT + dist * Math.sin(el), D.z], t: [D.x, DT, D.z] };
    }
    function pick(ray) { const h = ray.intersectObjects(papers, false); return h.length ? h[0].object.userData.idx : -1; }
    // punto superior del papel (para la etiqueta flotante)
    function anchor(i) { const p = papers[i]; return new T.Vector3(0, PH / 2, 0).applyMatrix4(p.matrixWorld); }
    return { group: g, view: view, layout: layout, pick: pick, update: update, anchor: anchor, count: papers.length,
      setHover: function (i) { hover = i; }, get hover() { return hover; } };
  }
  return { build: build };
})();
