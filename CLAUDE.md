# CLAUDE.md — Resonador Ω (visor 3D + gráficas de AERHYN)

Contexto permanente del proyecto. Léelo completo antes de tocar código. Si algo de aquí contradice lo que ves en el repo, avísame y no adivines.

## 1. Qué es este proyecto

Página web interactiva del **Resonador Ω**, dispositivo experimental ficticio del universo **AERHYN** (Proyecto Ω, Instituto Kurchátov, Chernóbil 1986, partícula Ω-13, Evento Umbral, fluido Hydraether / HAE). Es un trabajo universitario de **Visualización y Diseño de Información – Unidad 3** (UPB, Medellín), y las gráficas pertenecen a **Interactivos II**.

Dos piezas que ahora se están fusionando:
1. **Visor 3D del Resonador Ω** (este repo, publicado en https://n4ndezzz.github.io/resonador_omega/).
2. **Gráficas animadas de Aerhyn 2082** (repo https://github.com/n4ndeZzz/graficas.git, publicado en https://n4ndezzz.github.io/graficas/). Ya están copiadas en la carpeta `graficas/` de este repo.

Meta de la fusión: una experiencia 3D "dentro del laboratorio" con solo dos zonas clicables: el **reactor** (conserva el visor actual) y una **oficina** con papeles sobre una mesa, donde cada papel abre una gráfica distinta.

### Rúbrica del visor (nivel objetivo N5 – Excelente)
Las cinco herramientas infográficas deben salir del MISMO modelo 3D y cada una debe revelar algo distinto (nunca decorativa): **despiece, explosión, corte, transparencia y acercamiento**, más la vista General. Además: ortografía y redacción impecables en español, y legibilidad para quien no conoce el proyecto.

## 2. Estructura del repo

```
index.html              ← visor generado. NO editar a mano.
resonador_omega.glb     ← modelo 3D exportado
README.md
graficas/               ← 8 gráficas (fragmentos HTML), copiadas del repo graficas
fuentes/
  src/model.js          ← modelo paramétrico (ResonadorModel.build())
  src/app.js            ← visor: estados, etiquetas, controles (IIFE, usa globals THREE y ResonadorModel)
  src/template.html     ← HTML + CSS del visor, con marcadores /*MODEL*/ y /*APP*/ y <!--GLB-->
  build_site.py         ← regenera ../index.html (ejecutar desde fuentes/)
  export_glb.mjs        ← regenera ../resonador_omega.glb (requiere `npm install`, three@0.147)
  test_model.mjs        ← prueba el modelo en Node
```

Flujo: editar `fuentes/src` → `python3 build_site.py` desde `fuentes/` (en Windows puede ser `python` o `py`) → abrir `index.html` con un servidor local (por ejemplo `python -m http.server`; no abrir con file://, porque las gráficas se cargarán por ruta relativa) → si cambió el modelo, `node export_glb.mjs`.

Los archivos de `fuentes/src` pueden tener saltos de línea CRLF (Windows); respétalos y lee/escribe siempre en UTF-8.

## 3. Tecnología y restricciones

- **Three.js r147** (UMD) + OrbitControls, cargados desde `cdn.jsdelivr.net` con versión fija. Sin frameworks, sin bundlers, un solo `index.html` generado. El sitio necesita internet para cargar Three.js y las fuentes de Google.
- Rutas **relativas** siempre: el sitio vive en la subruta `/resonador_omega/` de GitHub Pages.
- Todo el código del modelo es procedural (sin assets externos). El GLB se exporta con GLTFExporter desde Node.
- Colores como variables CSS, tema claro/oscuro, funcionamiento a 400 px de ancho sin scroll horizontal, teclado y `prefers-reduced-motion` respetados.

## 4. El modelo 3D

- Altura ≈ 12,5 m, diámetro ≈ 9,8 m, más una figura humana de 1,75 m como escala. ~56 piezas independientes, ~750 meshes, ~122 000 triángulos.
- Jerarquía (también en el GLB): `RESONADOR_OMEGA → sistema → pieza`. No renombres piezas ni sistemas sin actualizar GLB, etiquetas y árbol "Componentes".
- Seis sistemas: **Estructura exterior** (columnas ×8, arriostres ×8, anillos inferior/intermedio/superior, cabeza de control) · **Núcleo** (cámaras de vacío inferior/superior, placas del capacitor, fluido emulsionado inferior/superior, núcleo Ω con sistema de suspensión y anillos de resonancia) · **Estabilización magnética** (bobinas ×7, varillas tensoras ×4, barra colectora) · **Refrigeración** (intercambiadores A/B, bomba principal, colector) · **Control y energía** (módulos A/B/C, regulador, fuente de energía, cable principal y cables de control A–D) · **Base** (anclajes, plataforma base, pedestal de equipos).
- Parámetros geométricos en el objeto `P` al inicio de `model.js`.
- `ResonadorModel.build()` devuelve `{ root, units, byId, SYS, SECTION, CUT, params, figure }`. El modelo NO debe depender de ninguna escena de laboratorio.

## 5. El visor actual (comportamiento que NO debe cambiar)

- Seis estados (teclas 1–6): General · Despiece · Explosión · Corte · Transparencia · Acercamiento (zona A: lupa de la emulsión de Hydraether; zona B: detalle de bobinas).
- **Despiece**: separación leve, color por sistema, etiquetas numeradas con leyenda. **Explosión**: pila vertical ordenada de 1 (anclajes) a 15 (cabeza) con guías punteadas; columnas, arriostres y equipos se abren en radial. **Corte**: dos planos de recorte (-X y -Z, `clipIntersection`) que quitan un cuarto; rayado naranja en las caras seccionadas (parche `onBeforeCompile` sobre caras traseras); deslizador "Apertura del corte". **Transparencia**: opacidad por rol de pieza. **Acercamiento**: cámara cercana + lupa molecular en un segundo renderer WebGL (H₂O azul, CO₂ rojo/negro, emulsionante dorado).
- Interfaz: encabezado con título "Resonador Ω", pestañas de estados, botones Componentes / Etiquetas / Escala / Guardar PNG / Descargar GLB, panel inferior izquierdo "Qué revela", panel Componentes (árbol con casillas), cotas (12,5 m y Ø 9,8 m), selección de pieza por clic.
- Técnica: `app.js` es un IIFE que crea su propio `WebGLRenderer` (alpha, `localClippingEnabled = true`), escena, cámara (FOV 30) y OrbitControls, y corre su propio bucle `requestAnimationFrame`. Las etiquetas son un overlay SVG (`#overlay`) con líneas guía y algoritmo anti-solape. El fondo del visor es un degradado CSS en `#app` (el canvas es transparente).
- Los textos del panel General (altura, diámetro, peso, energía) vienen de las referencias de la persona usuaria: no los cambies sin confirmarlo.
- Estilo: laboratorio soviético experimental de alta energía. Acero oscuro, grises, concreto, detalles pequeños en dorado/cobre, azul/violeta frío SOLO en el núcleo. Prohibido el aspecto cyberpunk, neón o nave espacial. Ni demasiado limpio ni caricaturesco.

## 6. Las gráficas (carpeta `graficas/`)

Son **8 FRAGMENTOS HTML**, no páginas completas: no tienen `<!doctype>`, `<html>`, `<head>` ni `<title>`. Cada uno trae un `<style>`, un `<div class="card">` con un `<svg id="chart">` (viewBox 720×~500, el de sectores 560×690), botones "▶ Reproducir / ⏸ Pausar / ↺ Reiniciar", una barra de progreso y un `<script>` propio sin dependencias (sin D3, sin CDN, sin fetch). Los datos están dentro del script.

**Dependen del contexto de la página anfitriona**, que el repo actual NO define:
- Variables CSS usadas pero no declaradas: `--surface-1`, `--surface-2`, `--border`, `--border-strong`, `--text-primary`, `--font-sans`, `--radius`. Quien las incruste debe definirlas (valores para claro y oscuro) o las gráficas se verán rotas.
- Detectan el tema con `document.documentElement.dataset.mode === 'dark'` y, si no existe, con `prefers-color-scheme`. Colores de texto fijos en el script (`#111` en claro, `#f0efec` en oscuro), así que las superficies deben ser claras en tema claro y oscuras en tema oscuro.
- Excepción: `sectores_urbanos_aerhyn_mapa_zonas.html` tiene la tarjeta oscura fija (#07090d) y no detecta tema.

Regla: **no modifiques las gráficas** (se ven bien). Si algo obliga a tocarlas, que sea lo mínimo y avísame. Para incrustarlas, usa un iframe con `srcdoc` o una página envoltorio que defina las variables y `data-mode`; así sus scripts quedan aislados del visor 3D.

| N.º | Archivo | Gráfica | Tipo |
|---|---|---|---|
| 01 | `indice_poder_global_animated.html` | Poder global (IPG 1986 vs 2082) | barras horizontales |
| 02 | `indice_adaptacion_biologica_animated.html` | Adaptación biológica | barras agrupadas |
| 03 | `composicion_atmosferica_2082_animated.html` | Atmósfera 2082 | torta |
| 04 | `poder_economia_aerhyn_2082_animated.html` | Economía Aerhyn | dona |
| 05 | `concentracion_hydraether_1986_2082_animated.html` | Hydraether 1986–2082 | línea sigmoide |
| 06 | `evolucion_homo_sapiens_homo_aeris_animated.html` | Evolución Homo | doble línea cruzada |
| 07 | `concentracion_hae_mapa_mundial_v2.html` | HAE por sector | mapa mundial |
| 08 | `sectores_urbanos_aerhyn_mapa_zonas.html` | Sectores Aerhyn | mapa de zonas |

Los títulos cortos vienen de la galería publicada; confirma cada correspondencia leyendo el título dentro de cada SVG (en especial 04 y 07) y corrígela aquí si hace falta.

## 7. Reglas de contenido

- Todo el texto visible en **español**, con tildes y ortografía correctas, claro para alguien que no conoce el proyecto, sin saturar la pantalla.
- **No inventes lore** de AERHYN más allá de lo que aparece en este archivo, en el visor y en las gráficas. Si falta información, escribe `[POR COMPLETAR]` y avísame.
- Antes de dar algo por terminado: ejecuta el build, revisa que no haya errores en consola, comprueba el modo móvil (400 px) y el teclado, y revisa la ortografía de los textos nuevos.

## 8. Reglas de trabajo con git

- Trabaja en una rama (`experiencia-laboratorio`), con commits pequeños por fase. Nunca hagas push ni merge a `main` sin que yo lo pida: `main` es lo que GitHub Pages publica.
- **Cuidado con repos anidados:** `graficas/` se copió desde otro clon y puede conservar su propia carpeta `.git`. Si existe, Git la trata como repo anidado y NO incluye sus archivos al hacer `git add`, así que no se publicarían. Verifica con `git status` y `git ls-files graficas`; si hay `graficas/.git`, no la borres tú: dime que la elimine yo (es solo la copia local de otro repo que ya existe en GitHub).
- No borres ni sobrescribas `index.html` generado, `resonador_omega.glb` o `fuentes/` sin avisarme; todo cambio debe poder revertirse con git.
