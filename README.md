# Resonador Ω — modelo 3D modular

Visor interactivo del **Resonador Ω** (Proyecto Ω · Instituto Kurchátov, universo AERHYN) para *Visualización y Diseño de Información — Unidad 3*.

Un solo modelo 3D muestra las cinco herramientas infográficas: **despiece, explosión, corte, transparencia y acercamiento** (más la vista general).

## Ver el visor
Con GitHub Pages activo: `https://n4ndezzz.github.io/resonador_omega/`

Controles: arrastrar para rotar · rueda para acercar · teclas **1–6** para cambiar de estado · clic en una pieza para leerla · botón *Componentes* para ocultar o mostrar piezas.

## Archivos
- `index.html` — visor completo (un solo archivo; carga Three.js y las fuentes desde internet).
- `resonador_omega.glb` — modelo 3D con jerarquía `RESONADOR_OMEGA → sistemas → piezas` (Blender: Archivo › Importar › glTF 2.0).
- `fuentes/` — código paramétrico (`src/model.js`, `src/app.js`, `src/template.html`), `build_site.py` para regenerar el visor y `export_glb.mjs` para regenerar el GLB.

## Modificar el modelo
Las medidas están en el objeto `P` al inicio de `fuentes/src/model.js`. Para regenerar: `python3 build_site.py` (visor) y `node export_glb.mjs` (GLB; requiere `npm install`), ambos desde la carpeta `fuentes/`.
