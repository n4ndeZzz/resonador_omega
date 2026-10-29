# Regenera ../index.html (experiencia completa) a partir de src/. Uso: python3 build_site.py
import glob, json, os
src = lambda n: open('src/' + n, encoding='utf-8').read()
t = src('template.html')
for mark, name in [('/*MODEL*/', 'model.js'), ('/*APP*/', 'app.js'), ('/*LAB*/', 'lab.js'), ('/*OFICINA*/', 'oficina.js'),
                   ('/*GRAFICA*/', 'grafica.js'), ('/*EXPERIENCIA*/', 'experiencia.js')]:
    if mark in t:
        t = t.replace(mark, src(name))
t = t.replace('<!--GLB-->', '<a class="tool" href="resonador_omega.glb" download>Descargar GLB</a>')
# gráficas (fragmentos HTML) incrustadas como JSON; '</' se escapa para no cerrar el <script>
graf = {os.path.basename(f): open(f, encoding='utf-8').read() for f in sorted(glob.glob('../graficas/*.html'))}
t = t.replace('/*GRAFICAS_JSON*/', json.dumps(graf, ensure_ascii=False).replace('</', '<\\/'))
head = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="description" content="Experiencia 3D en el laboratorio del Proyecto Ω: el Resonador Ω (despiece, explosión, corte, transparencia y acercamiento) y la oficina de análisis con las gráficas de AERHYN.">\n')
t = head + t[t.index('<title>'):]
t = t.replace('<div id="app">', '</head>\n<body>\n<div id="app">', 1) + '\n</body>\n</html>\n'
open('../index.html', 'w', encoding='utf-8').write(t)
print('index.html', len(t), 'caracteres;', len(graf), 'gráficas')
