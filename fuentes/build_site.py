# Regenera ../index.html (visor completo) a partir de src/. Uso: python3 build_site.py
t = open('src/template.html', encoding='utf-8').read()
t = t.replace('/*MODEL*/', open('src/model.js', encoding='utf-8').read()).replace('/*APP*/', open('src/app.js', encoding='utf-8').read())
t = t.replace('<!--GLB-->', '<a class="tool" href="resonador_omega.glb" download>Descargar GLB</a>')
head = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="description" content="Modelo 3D modular e interactivo del Resonador Ω: despiece, explosión, corte, transparencia y acercamiento.">\n')
t = head + t[t.index('<title>'):]
t = t.replace('<div id="app">', '</head>\n<body>\n<div id="app">', 1) + '\n</body>\n</html>\n'
open('../index.html', 'w', encoding='utf-8').write(t)
print('index.html', len(t), 'caracteres')
