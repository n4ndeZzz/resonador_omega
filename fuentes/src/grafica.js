/* ============================================================
   Visor de gráficas (dossier del archivo). Cada gráfica es un fragmento HTML incrustado por build_site.py;
   aquí se envuelve en una página completa (variables CSS + data-mode) y se carga en un iframe con srcdoc.
   ============================================================ */
window.Grafica = (function () {
  'use strict';
  const LISTA = [
    { n: '01', archivo: 'indice_poder_global_animated.html', titulo: 'Poder global', sub: 'Índice de poder global (IPG), 1986 frente a 2082', tipo: 'Barras horizontales', glyph: 'barrasH' },
    { n: '02', archivo: 'indice_adaptacion_biologica_animated.html', titulo: 'Adaptación biológica', sub: 'Índice de adaptación biológica de especies', tipo: 'Barras agrupadas', glyph: 'barrasG' },
    { n: '03', archivo: 'composicion_atmosferica_2082_animated.html', titulo: 'Atmósfera 2082', sub: 'Composición atmosférica en 2082', tipo: 'Torta', glyph: 'torta' },
    { n: '04', archivo: 'poder_economia_aerhyn_2082_animated.html', titulo: 'Economía Aerhyn', sub: 'Poder en la economía global de Aerhyn, 2082', tipo: 'Dona', glyph: 'dona' },
    { n: '05', archivo: 'concentracion_hydraether_1986_2082_animated.html', titulo: 'Hydraether 1986–2082', sub: 'Concentración de Hydraether entre 1986 y 2082', tipo: 'Línea sigmoide', glyph: 'linea' },
    { n: '06', archivo: 'evolucion_homo_sapiens_homo_aeris_animated.html', titulo: 'Evolución Homo', sub: 'Homo sapiens y Homo Aeris, 1986–2082', tipo: 'Doble línea cruzada', glyph: 'doble' },
    { n: '07', archivo: 'concentracion_hae_mapa_mundial_v2.html', titulo: 'HAE por sector', sub: 'Concentración de HAE por sector', tipo: 'Mapa mundial', glyph: 'mapa' },
    { n: '08', archivo: 'sectores_urbanos_aerhyn_mapa_zonas.html', titulo: 'Sectores Aerhyn', sub: 'Sectores urbanos y zonas HAE de Aerhyn', tipo: 'Mapa de zonas', glyph: 'zonas' }
  ];
  const $ = function (s) { return document.querySelector(s); };
  let datos = null, idx = -1, blobUrl = null, onClose = null, lastFocus = null;

  function fragmento(archivo) {
    if (!datos) { const el = $('#graficas-datos'); datos = el ? JSON.parse(el.textContent) : {}; }
    return datos[archivo] || '<p style="font:16px system-ui;padding:24px">No se encontró la gráfica ' + archivo + '.</p>';
  }
  function modo() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  // página completa: define las variables que las gráficas usan y data-mode según el tema de la página
  function envoltorio(item) {
    const fit = '<script>(function(){var c=document.querySelector(".card");if(!c)return;var mw=parseFloat(getComputedStyle(c).maxWidth)||720;' +
      'function fit(){c.style.maxWidth="";for(var k=0;k<2;k++){var r=c.getBoundingClientRect(),av=innerHeight-44;if(r.height>av)c.style.maxWidth=Math.max(280,Math.floor(r.width*av/r.height))+"px";}}' +
      'fit();addEventListener("resize",fit);' +
      'if(!matchMedia("(prefers-reduced-motion: reduce)").matches){var b=document.getElementById("btnPlay");if(b)setTimeout(function(){b.click();},450);}})();<\/script>';
    return '<!doctype html><html lang="es" data-mode="' + modo() + '"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + item.n + ' · ' + item.titulo + ' — Archivo del Proyecto Ω</title><style>' +
      ':root{--surface-1:#f1ece0;--surface-2:#fbf8f1;--border:rgba(58,48,30,.2);--border-strong:rgba(58,48,30,.42);--text-primary:#1f1b14;' +
      '--font-sans:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--radius:4px;color-scheme:light}' +
      'html[data-mode="dark"]{--surface-1:#17191c;--surface-2:#202327;--border:rgba(236,228,210,.14);--border-strong:rgba(236,228,210,.34);--text-primary:#ece6d8;color-scheme:dark}' +
      'html{background:var(--surface-1)}</style></head><body>' + fragmento(item.archivo) + fit + '</body></html>';
  }

  const el = {};
  function init() {
    el.root = $('#dossier'); el.frame = $('#dosFrame'); el.num = $('#dosNum'); el.title = $('#dosTitle'); el.sub = $('#dosSub');
    el.prev = $('#dosPrev'); el.next = $('#dosNext'); el.back = $('#dosBack'); el.solo = $('#dosSolo');
    el.prev.addEventListener('click', function () { step(-1); });
    el.next.addEventListener('click', function () { step(1); });
    el.back.addEventListener('click', close);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refresh);
    new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
  function load() {
    const item = LISTA[idx], html = envoltorio(item);
    el.num.textContent = item.n + ' / ' + String(LISTA.length).padStart(2, '0');
    el.title.textContent = item.titulo; el.sub.textContent = item.sub + ' · ' + item.tipo.toLowerCase();
    el.frame.title = 'Gráfica ' + item.n + ': ' + item.titulo;
    el.frame.srcdoc = html;
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    el.solo.href = blobUrl;
    el.prev.setAttribute('aria-label', 'Anterior: ' + LISTA[(idx + LISTA.length - 1) % LISTA.length].titulo);
    el.next.setAttribute('aria-label', 'Siguiente: ' + LISTA[(idx + 1) % LISTA.length].titulo);
  }
  function open(i, cb) {
    if (!el.root) init();
    idx = i; onClose = cb || null; lastFocus = document.activeElement;
    el.root.hidden = false; el.root.classList.add('open'); load(); el.back.focus();
  }
  function step(d) { if (idx < 0) return; idx = (idx + d + LISTA.length) % LISTA.length; load(); }
  function close() {
    if (idx < 0) return;
    const i = idx; idx = -1; el.root.classList.remove('open'); el.root.hidden = true; el.frame.srcdoc = '';
    if (onClose) onClose(i);
  }
  function refresh() { if (idx >= 0) load(); }
  return { LISTA: LISTA, open: open, close: close, step: step, isOpen: function () { return idx >= 0; }, current: function () { return idx; }, modo: modo };
})();
