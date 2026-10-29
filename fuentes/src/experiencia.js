/* ============================================================
   Experiencia: un solo renderer (el del visor) y un solo bucle con cinco modos
   portada · laboratorio · reactor · oficina · grafica
   ============================================================ */
(function () {
  'use strict';
  const $ = function (s) { return document.querySelector(s); };
  const app = $('#app'), carga = $('#carga'), bar = $('#cargaBar'), cargaTxt = $('#cargaTxt');
  const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');
  const touch = matchMedia('(pointer: coarse)').matches, small = Math.min(screen.width, screen.height) < 820;
  const lowEnd = touch || small;
  let RES, lab, ofi, T, renderer, camera, controls, mode = 'carga';

  function progress(f, txt) { bar.style.width = Math.round(f * 100) + '%'; carga.setAttribute('aria-valuenow', Math.round(f * 100)); if (txt) cargaTxt.textContent = txt; }
  function frame() { return new Promise(function (r) { requestAnimationFrame(function () { setTimeout(r, 0); }); }); }
  function fail(msg) { carga.classList.add('error'); cargaTxt.textContent = msg; }
  function fonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const all = Promise.all(['40px "Special Elite"', '600 40px "Barlow Condensed"'].map(function (f) { return document.fonts.load(f, 'ΩÁ'); }));
    return Promise.race([all, new Promise(function (r) { setTimeout(r, 3000); })]).catch(function () {});
  }

  async function boot() {
    if (!window.THREE || !THREE.OrbitControls) { fail('No se pudo cargar Three.js. Revisa la conexión a internet y recarga la página.'); return; }
    T = THREE;
    const steps = [
      ['Construyendo el Resonador Ω', function () {
        RES = window.ResonadorApp({ external: true }); renderer = RES.renderer; camera = RES.camera; controls = RES.controls;
        if (!lowEnd) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; }
        RES.M.root.traverse(function (o) { if (o.isMesh) o.castShadow = !lowEnd; });
      }],
      ['Cargando tipografías', fonts],
      ['Levantando la nave del laboratorio', function () { lab = Laboratorio.build(RES, { shadows: !lowEnd }); }],
      ['Preparando la oficina de análisis', function () {
        ofi = Oficina.build(RES, lab, Grafica.LISTA, { shadows: !lowEnd }); lab.collect(); ofi.layout(aspect());
        papersUI();
      }],
      ['Compilando materiales', function () {
        lab.setK(1); const v = lab.portada(aspect()); setCam(v);
        renderer.localClippingEnabled = false; renderer.compile(RES.scene, camera);
        renderer.localClippingEnabled = true; renderer.compile(RES.scene, camera);
      }]
    ];
    try {
      for (let i = 0; i < steps.length; i++) { progress(i / steps.length, steps[i][0] + '…'); await frame(); await steps[i][1](); }
    } catch (e) { console.error(e); fail('No se pudo construir la escena: ' + (e && e.message ? e.message : e)); return; }
    progress(1, 'Listo');
    setMode('portada'); requestAnimationFrame(loop);
    await frame(); carga.classList.add('fuera'); setTimeout(function () { carga.hidden = true; }, 600);
    $('#btnIniciar').disabled = false; $('#btnIniciar').focus({ preventScroll: true });
  }

  /* ---------- cámara de la experiencia (fuera del modo reactor) ---------- */
  const cam = { tw: null, t: null, off: null, par: { x: 0, y: 0, sx: 0, sy: 0 } };
  function aspect() { return Math.max(.2, app.clientWidth / Math.max(1, app.clientHeight)); }
  function setCam(v) { if (!cam.t) { cam.t = new T.Vector3(); cam.off = new T.Vector3(); } camera.position.fromArray(v.p); cam.t.fromArray(v.t); camera.lookAt(cam.t); }
  function goal() {
    const a = aspect();
    if (mode === 'oficina' || mode === 'grafica') return ofi.view(a);
    if (mode === 'portada') return lab.portada(a);
    return lab.view(a);
  }
  function ease(f) { return f < .5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2; }
  function flyTo(dur) {
    const v = goal();
    cam.tw = { p0: camera.position.clone(), t0: cam.t.clone(), p1: new T.Vector3().fromArray(v.p), t1: new T.Vector3().fromArray(v.t), s: performance.now(), d: reduceQ.matches ? 1 : dur };
  }
  function driveCamera(now, dt) {
    const p = cam.par, k = 1 - Math.exp(-dt * 3);
    const allowPar = !reduceQ.matches && !touch && (mode === 'laboratorio' || mode === 'portada');
    p.sx += ((allowPar ? p.x : 0) - p.sx) * k; p.sy += ((allowPar ? p.y : 0) - p.sy) * k;
    if (cam.tw) {
      const f = Math.min(1, (now - cam.tw.s) / cam.tw.d), e = ease(f);
      camera.position.lerpVectors(cam.tw.p0, cam.tw.p1, e); cam.t.lerpVectors(cam.tw.t0, cam.tw.t1, e);
      if (f >= 1) cam.tw = null;
    } else {
      const v = goal(); camera.position.fromArray(v.p); cam.t.fromArray(v.t);
      if (mode === 'portada' && !reduceQ.matches) { camera.position.x += Math.sin(now / 9000) * 2.2; camera.position.y += Math.sin(now / 6500) * .5; }
    }
    if (mode === 'laboratorio' || mode === 'portada') { camera.position.x += p.sx * 1.4; camera.position.y -= p.sy * .7; }
    camera.lookAt(cam.t);
  }

  /* ---------- modos ---------- */
  const live = $('#vivo');
  function setMode(m) {
    mode = m;
    ['portada', 'laboratorio', 'reactor', 'oficina', 'grafica'].forEach(function (k) { app.classList.toggle('modo-' + k, k === m); });
    $('#portada').hidden = m !== 'portada';
    $('#labUI').hidden = m !== 'laboratorio';
    $('#ofiUI').hidden = !(m === 'oficina');
    renderer.domElement.style.cursor = m === 'reactor' ? '' : 'default';
    lab.setHover(null); ofi.setHover(-1); tip.hidden = true;
  }
  function say(t) { live.textContent = t; }
  function iniciar() {
    setMode('laboratorio'); flyTo(2400);
    say('Laboratorio del Proyecto Ω. Dos zonas: el reactor y la oficina de análisis.');
    setTimeout(function () { $('#zReactor').focus({ preventScroll: true }); }, 50);
  }
  function irReactor() {
    if (mode !== 'laboratorio') return;
    setMode('reactor'); cam.tw = null;
    controls.target.copy(cam.t);
    if (reduceQ.matches) { camera.position.fromArray(RES.home.p); controls.target.fromArray(RES.home.t); }
    RES.enter(); say('Reactor Ω. Pestañas del 1 al 6; Escape para volver al laboratorio.');
    $('#tab-general').focus({ preventScroll: true });
  }
  function salirReactor() {
    RES.exit(); cam.t.copy(controls.target); camera.lookAt(cam.t);
    setMode('laboratorio'); flyTo(1900); say('Laboratorio.');
    $('#zReactor').focus({ preventScroll: true });
  }
  function irOficina() {
    if (mode !== 'laboratorio') return;
    setMode('oficina'); flyTo(1900); say('Oficina de análisis: ocho papeles, uno por gráfica.');
    $('#papeles button').focus({ preventScroll: true });
  }
  function salirOficina() { setMode('laboratorio'); flyTo(1900); say('Laboratorio.'); $('#zOficina').focus({ preventScroll: true }); }
  function abrir(i) {
    if (mode !== 'oficina') return;
    setMode('grafica');
    Grafica.open(i, function (j) { setMode('oficina'); const b = document.querySelectorAll('#papeles button')[j]; if (b) b.focus({ preventScroll: true }); });
  }

  /* ---------- interfaz HTML ---------- */
  $('#btnIniciar').addEventListener('click', iniciar);
  $('#zReactor').addEventListener('click', irReactor);
  $('#zOficina').addEventListener('click', irOficina);
  [['#zReactor', 'reactor'], ['#zOficina', 'oficina']].forEach(function (z) {
    const b = $(z[0]);
    ['pointerenter', 'focus'].forEach(function (ev) { b.addEventListener(ev, function () { if (ev === 'pointerenter' || b.matches(':focus-visible')) lab.setHover(z[1]); }); });
    ['pointerleave', 'blur'].forEach(function (ev) { b.addEventListener(ev, function () { if (lab.hover === z[1]) lab.setHover(null); }); });
  });
  $('#btnLab').addEventListener('click', salirReactor);
  $('#ofiBack').addEventListener('click', salirOficina);
  const tip = $('#papelTip');
  function papersUI() {
    const nav = $('#papeles');
    Grafica.LISTA.forEach(function (it, i) {
      const b = document.createElement('button'); b.type = 'button';
      b.innerHTML = '<span class="pn">' + it.n + '</span><span class="pt">' + it.titulo + '</span>';
      b.setAttribute('aria-label', 'Abrir gráfica ' + it.n + ': ' + it.titulo);
      b.addEventListener('click', function () { abrir(i); });
      ['pointerenter', 'focus'].forEach(function (ev) { b.addEventListener(ev, function () { if (ev === 'pointerenter' || b.matches(':focus-visible')) ofi.setHover(i); }); });
      ['pointerleave', 'blur'].forEach(function (ev) { b.addEventListener(ev, function () { if (ofi.hover === i) ofi.setHover(-1); }); });
      nav.appendChild(b);
    });
  }
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (mode === 'reactor') { e.preventDefault(); salirReactor(); }
      else if (mode === 'oficina') { e.preventDefault(); salirOficina(); }
      else if (mode === 'grafica') { e.preventDefault(); Grafica.close(); }
    } else if (mode === 'grafica' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault(); Grafica.step(e.key === 'ArrowLeft' ? -1 : 1);
    }
  });

  /* ---------- puntero sobre el canvas: solo el reactor, la oficina y los papeles responden ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
  const view = $('#view');
  function aim(e) { const r = view.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera); }
  function hoverAt(e) {
    if (cam.tw) return;
    if (mode === 'laboratorio') { aim(e); const z = lab.pick(ray); lab.setHover(z); renderer.domElement.style.cursor = z ? 'pointer' : 'default'; }
    else if (mode === 'oficina') { aim(e); const i = ofi.pick(ray); ofi.setHover(i); renderer.domElement.style.cursor = i >= 0 ? 'pointer' : 'default'; }
  }
  view.addEventListener('pointermove', function (e) {
    const r = view.getBoundingClientRect(); cam.par.x = (e.clientX - r.left) / r.width * 2 - 1; cam.par.y = (e.clientY - r.top) / r.height * 2 - 1;
    if (e.pointerType === 'mouse') hoverAt(e);
  });
  view.addEventListener('pointerleave', function () { if (mode === 'laboratorio') lab.setHover(null); if (mode === 'oficina') ofi.setHover(-1); });
  view.addEventListener('pointerdown', function (e) { down = [e.clientX, e.clientY]; });
  view.addEventListener('pointerup', function (e) {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8 || cam.tw) { down = null; return; }
    down = null;
    if (mode === 'laboratorio') { aim(e); const z = lab.pick(ray); if (z === 'reactor') irReactor(); else if (z === 'oficina') irOficina(); }
    else if (mode === 'oficina') { aim(e); const i = ofi.pick(ray); if (i >= 0) abrir(i); }
  });
  window.addEventListener('resize', function () { if (ofi) ofi.layout(aspect()); });

  /* ---------- etiquetas de zona y de papel ---------- */
  const zR = $('#zReactor'), zO = $('#zOficina'), pv = new THREE.Vector3();
  function toScreen(v) { pv.copy(v).project(camera); return { x: (pv.x + 1) / 2 * app.clientWidth, y: (1 - pv.y) / 2 * app.clientHeight, z: pv.z }; }
  function placeZone(b, z) {
    const s = toScreen(lab.zones[z].anchor), W = app.clientWidth, H = app.clientHeight, bw = b.offsetWidth, bh = b.offsetHeight;
    const x = Math.min(W - bw / 2 - 12, Math.max(bw / 2 + 12, s.x)), y = Math.min(H - bh - 16, Math.max(96, s.y - bh - 8));
    b.style.transform = 'translate(' + (x - bw / 2).toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    b.classList.toggle('on', lab.hover === z);
  }
  function placeTip() {
    const i = ofi.hover;
    if (mode !== 'oficina' || i < 0 || cam.tw) { tip.hidden = true; return; }
    const it = Grafica.LISTA[i], s = toScreen(ofi.anchor(i));
    tip.textContent = it.n + ' · ' + it.titulo; tip.hidden = false;
    const W = app.clientWidth, w = tip.offsetWidth;
    tip.style.transform = 'translate(' + Math.min(W - w - 12, Math.max(12, s.x - w / 2)).toFixed(1) + 'px,' + Math.max(70, s.y - tip.offsetHeight - 10).toFixed(1) + 'px)';
  }

  /* ---------- bucle único ---------- */
  let k = 1, last = performance.now(), dirty = true, drawn = false;
  function loop(now) {
    requestAnimationFrame(loop);
    const dtr = Math.min(.5, (now - last) / 1000), dt = Math.min(.05, dtr); last = now;
    // el laboratorio solo reaparece cuando el reactor volvió a General (la explosión supera los 30 m)
    const c = RES.cur, settled = c.t < .03 && c.cut < .03 && c.xray < .08;
    const kt = mode === 'reactor' ? 0 : (settled ? 1 : 0);
    const k0 = k;
    k = reduceQ.matches ? kt : k + (kt - k) * (1 - Math.exp(-dtr * (kt > k ? 2.6 : 5)));     // tiempo real: no se alarga si bajan los FPS
    if (Math.abs(k - kt) < .003) k = kt;
    lab.setK(k); RES.floor.visible = k < .5;
    renderer.localClippingEnabled = mode === 'reactor' || c.cut > .005;
    if (k !== k0) dirty = true;
    if (mode !== 'reactor') driveCamera(now, dt);
    lab.update(dt);
    if (ofi.update(dt, reduceQ.matches)) dirty = true;
    if (renderer.shadowMap.enabled) { renderer.shadowMap.needsUpdate = k > .01 && (dirty || !settled); dirty = false; }
    // con la gráfica abierta la escena queda quieta detrás del dossier: no hace falta volver a dibujarla
    if (mode === 'grafica' && drawn && !cam.tw) return;
    RES.update(now); drawn = true;
    if (mode === 'laboratorio') { placeZone(zR, 'reactor'); placeZone(zO, 'oficina'); }
    placeTip();
  }

  boot();
})();
