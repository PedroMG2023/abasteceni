// Dibuja en Graphviz el catálogo físico leído de PostgreSQL (diagrama-fisico.sh).
import { readFileSync } from 'node:fs';

const catalogo = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const escapar = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tablas = new Map();
for (const c of catalogo.columnas ?? []) {
  const clave = `${c.esquema}.${c.tabla}`;
  if (!tablas.has(clave)) tablas.set(clave, { esquema: c.esquema, tabla: c.tabla, columnas: [] });
  tablas.get(clave).columnas.push(c);
}
const restricciones = catalogo.restricciones ?? [];
const privilegios = catalogo.privilegios ?? [];
const pk = (t, col) => restricciones.some((r) => `${r.esquema}.${r.tabla}` === t && r.tipo === 'p' && r.definicion.includes(`(${col})`) || (r.tipo === 'p' && `${r.esquema}.${r.tabla}` === t && r.definicion.match(new RegExp(`[(, ]${col}[,)]`))));
const unico = (t, col) => restricciones.some((r) => `${r.esquema}.${r.tabla}` === t && r.tipo === 'u' && r.definicion === `UNIQUE (${col})`);
const nodo = (t) => `"${t}"`;

const lineas = ['digraph esquema {', '  graph [rankdir=LR, fontname="DejaVu Sans", fontsize=11, nodesep=0.4, ranksep=0.9];', '  node [shape=plaintext, fontname="DejaVu Sans", fontsize=10];', '  edge [color="#555555", arrowsize=0.7];'];
for (const esquema of catalogo.esquemas ?? []) {
  const propias = [...tablas.values()].filter((t) => t.esquema === esquema);
  lineas.push(`  subgraph "cluster_${esquema}" {`, `    label="${esquema}${propias.length ? '' : ' (sin tablas)'}"; style="rounded"; color="#2E74B5"; fontcolor="#1F4D78";`);
  if (!propias.length) lineas.push(`    "${esquema}._vacio" [label="", shape=point, width=0.01];`);
  for (const t of propias) {
    const clave = `${t.esquema}.${t.tabla}`;
    const privs = privilegios.filter((p) => `${p.esquema}.${p.tabla}` === clave).map((p) => p.privilegio).join(', ') || 'ninguno';
    const filas = t.columnas
      .map((c) => {
        const marcas = [pk(clave, c.columna) ? 'PK' : '', unico(clave, c.columna) ? 'UQ' : '', c.nulo ? '' : 'NOT NULL'].filter(Boolean).join(' ');
        return `<tr><td align="left" port="${escapar(c.columna)}">${escapar(c.columna)}</td><td align="left"><font color="#555555">${escapar(c.tipo)}</font></td><td align="left">${marcas ? `<font color="#2E74B5">${marcas}</font>` : ' '}</td></tr>`;
      })
      .join('');
    const checks = restricciones.filter((r) => `${r.esquema}.${r.tabla}` === clave && r.tipo === 'c').length;
    lineas.push(
      `    ${nodo(clave)} [label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="3"><tr><td colspan="3" bgcolor="#DEEAF6"><b>${escapar(t.tabla)}</b></td></tr>${filas}<tr><td colspan="3" align="left"><font point-size="8">CHECK: ${checks} · abasteceni_app: ${escapar(privs)}</font></td></tr></table>>];`,
    );
  }
  lineas.push('  }');
}
for (const r of restricciones.filter((x) => x.tipo === 'f')) {
  const destino = r.definicion.match(/REFERENCES ([\w.]+)\(/)?.[1];
  if (destino) lineas.push(`  ${nodo(`${r.esquema}.${r.tabla}`)} -> ${nodo(destino.includes('.') ? destino : `${r.esquema}.${destino}`)} [label="${escapar(r.nombre)}", fontsize=8];`);
}
lineas.push('}');
console.log(lineas.join('\n'));
