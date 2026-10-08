import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs'; import vm from 'vm';
globalThis.THREE = THREE;
globalThis.FileReader = class { readAsArrayBuffer(b){ b.arrayBuffer().then(ab=>{ this.result=ab; this.onloadend&&this.onloadend(); }); }
  readAsDataURL(b){ b.arrayBuffer().then(ab=>{ this.result='data:'+(b.type||'application/octet-stream')+';base64,'+Buffer.from(ab).toString('base64'); this.onloadend&&this.onloadend(); }); } };
vm.runInThisContext(fs.readFileSync('src/model.js','utf8'));
const M = globalThis.ResonadorModel.build();
// el GLB no necesita planos de corte
M.root.traverse(o=>{ if(o.isMesh){ o.material.clippingPlanes=null; } });
new GLTFExporter().parse(M.root, (buf)=>{ fs.writeFileSync('../resonador_omega.glb', Buffer.from(buf)); console.log('GLB bytes', buf.byteLength); },
  (e)=>{ console.error('ERR', e); }, { binary:true, onlyVisible:false });
