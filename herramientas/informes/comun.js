// Generador común de los informes de la fase de desarrollo de AbasteceNi.
// Reproduce el formato del informe 5 (docs/red): carta, Calibri 11, encabezados
// azules, portada institucional, índice y pie con número de página.
const fs = require('fs');
const {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, LevelFormat, Packer, PageBreak,
  PageNumber, Paragraph, ShadingType, Table, TableCell, TableOfContents, TableRow, TextRun, WidthType,
} = require('docx');

const ANCHO_UTIL = 12240 - 2 * 1440; // carta con márgenes de 1440 DXA
const AZUL = '2E74B5';
const GRIS = 'F2F2F2';
const BORDE = { style: BorderStyle.SINGLE, size: 4, color: 'A6A6A6' };
const BORDES = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };

// Texto con marcas mínimas: **negrita**, `código` y _cursiva_.
function runs(texto, base = {}) {
  const partes = [];
  const patron = /(\*\*[^*]+\*\*|`[^`]+`|(?<![\p{L}\p{N}])_[^_]+_(?![\p{L}\p{N}]))/gu;
  let ultimo = 0;
  for (const m of texto.matchAll(patron)) {
    if (m.index > ultimo) partes.push(new TextRun({ text: texto.slice(ultimo, m.index), ...base }));
    const t = m[0];
    if (t.startsWith('**')) partes.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else if (t.startsWith('`')) partes.push(new TextRun({ text: t.slice(1, -1), font: 'Consolas', size: (base.size ?? 22) - 2, ...base, bold: base.bold }));
    else partes.push(new TextRun({ text: t.slice(1, -1), italics: true, ...base }));
    ultimo = m.index + t.length;
  }
  if (ultimo < texto.length) partes.push(new TextRun({ text: texto.slice(ultimo), ...base }));
  return partes;
}

const p = (texto, opciones = {}) =>
  new Paragraph({ children: runs(texto, opciones.run), spacing: { after: 120, line: 276 }, alignment: opciones.alineacion ?? AlignmentType.JUSTIFIED, ...opciones.parrafo });
const h1 = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(texto)], pageBreakBefore: false });
const h2 = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(texto)] });
const h3 = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(texto)] });
const vinetas = (items, nivel = 0) =>
  items.map((t) => new Paragraph({ numbering: { reference: 'vinetas', level: nivel }, children: runs(t), spacing: { after: 60 }, alignment: AlignmentType.LEFT }));
const numerada = (items, referencia = 'numerada') =>
  items.map((t) => new Paragraph({ numbering: { reference: referencia, level: 0 }, children: runs(t), spacing: { after: 60 }, alignment: AlignmentType.LEFT }));
const salto = () => new Paragraph({ children: [new PageBreak()] });
const leyenda = (texto) =>
  new Paragraph({ children: runs(texto, { italics: true, size: 18, color: '595959' }), alignment: AlignmentType.CENTER, spacing: { before: 60, after: 200 } });

// Tabla con anchos relativos (suman 100) convertidos a DXA.
function tabla(encabezados, filas, proporciones) {
  const total = proporciones.reduce((a, b) => a + b, 0);
  const anchos = proporciones.map((x) => Math.floor((x / total) * ANCHO_UTIL));
  anchos[anchos.length - 1] += ANCHO_UTIL - anchos.reduce((a, b) => a + b, 0);
  const celda = (texto, i, encabezado) =>
    new TableCell({
      borders: BORDES,
      width: { size: anchos[i], type: WidthType.DXA },
      shading: encabezado ? { fill: 'DEEAF6', type: ShadingType.CLEAR, color: 'auto' } : undefined,
      margins: { top: 60, bottom: 60, left: 90, right: 90 },
      children: String(texto)
        .split('\n')
        .map((linea) => new Paragraph({ children: runs(linea, { size: 18, bold: encabezado || undefined }), spacing: { after: 30 } })),
    });
  return new Table({
    width: { size: ANCHO_UTIL, type: WidthType.DXA },
    columnWidths: anchos,
    rows: [
      new TableRow({ tableHeader: true, children: encabezados.map((t, i) => celda(t, i, true)) }),
      ...filas.map((fila) => new TableRow({ children: fila.map((t, i) => celda(t, i, false)) })),
    ],
  });
}

function figura(ruta, anchoPx, altoPx, texto) {
  const escala = Math.min(1, 600 / anchoPx, 800 / altoPx);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ type: 'png', data: fs.readFileSync(ruta), transformation: { width: Math.round(anchoPx * escala), height: Math.round(altoPx * escala) } })],
    }),
    leyenda(texto),
  ];
}

function portada({ titulo, subtitulo, numero, normas }) {
  const centro = (texto, opciones = {}) =>
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: opciones.despues ?? 80 }, children: [new TextRun({ text: texto, ...opciones.run })] });
  return [
    centro('UNIVERSIDAD NACIONAL DE INGENIERÍA', { run: { bold: true, size: 28 } }),
    centro('ÁREA DACTIC', { run: { size: 24 } }),
    centro('Programa Académico de Ingeniería en Computación', { run: { size: 24 } }),
    centro('INGENIERÍA DE SOFTWARE I', { run: { bold: true, size: 24 }, despues: 600 }),
    centro(titulo, { run: { bold: true, size: 36, color: AZUL }, despues: 160 }),
    centro(subtitulo, { run: { size: 26 }, despues: 160 }),
    centro('Plataforma Web B2B de Emparejamiento Comercial «AbasteceNi»', { run: { size: 24 } }),
    centro(`Empresa simulada AbasteceNi, S.A. — Informe ${numero} de la fase de desarrollo`, { run: { size: 22, italics: true }, despues: 480 }),
    centro('Marco normativo rector', { run: { bold: true, size: 22 } }),
    ...normas.map((n) => centro(n, { run: { size: 20 } })),
    new Paragraph({ spacing: { after: 480 }, children: [] }),
    centro('Integrantes', { run: { bold: true, size: 22 } }),
    centro('Edith Yasohara Roda Hernández — 2023-0752U', { run: { size: 22 } }),
    centro('Pedro José Miranda Gómez — 2022-0288U', { run: { size: 22 } }),
    centro('Grupo: 4S1-COM · Versión 1.0 · 17 de octubre de 2026', { run: { size: 22 }, despues: 0 }),
    salto(),
    new Paragraph({ children: [new TextRun({ text: 'Tabla de contenido', bold: true, size: 28, color: AZUL })], spacing: { after: 120 } }),
    p('Si el índice aparece vacío, haga clic derecho sobre él y elija «Actualizar campo».', { run: { italics: true, size: 18, color: '595959' } }),
    new TableOfContents('Tabla de contenido', { hyperlink: true, headingStyleRange: '1-3' }),
    salto(),
  ];
}

function documento({ titulo, numero, portadaDatos, contenido }) {
  return new Document({
    creator: 'Equipo AbasteceNi (U-01)',
    title: titulo,
    description: `Informe ${numero} de la fase de desarrollo de AbasteceNi`,
    styles: {
      default: { document: { run: { font: 'Calibri', size: 22 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, color: AZUL, font: 'Calibri Light' }, paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, color: AZUL, font: 'Calibri Light' }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, color: '1F4D78', font: 'Calibri Light' }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
      ],
    },
    numbering: {
      config: [
        { reference: 'vinetas', levels: [0, 1].map((level) => ({ level, format: LevelFormat.BULLET, text: level ? '–' : '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540 + level * 360, hanging: 270 } } } })) },
        { reference: 'numerada', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
      ],
    },
    sections: [
      {
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1300, right: 1440, bottom: 1300, left: 1440 } }, titlePage: true },
        headers: {
          default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `AbasteceNi — Informe ${numero}: ${titulo}`, size: 16, color: '7F7F7F' })] })] }),
          first: new Header({ children: [] }),
        },
        footers: {
          default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }),
          first: new Footer({ children: [] }),
        },
        children: [...portada({ ...portadaDatos, numero }), ...contenido.flat(Infinity)],
      },
    ],
  });
}

async function escribir(doc, ruta) {
  fs.writeFileSync(ruta, await Packer.toBuffer(doc));
}

// Casos de un reporte JUnit (Jest o Playwright): suite, nombre, tiempo y archivo.
function leerJUnit(ruta) {
  const xml = fs.readFileSync(ruta, 'utf8');
  const casos = [];
  const decodificar = (t) => t.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'");
  for (const suite of xml.matchAll(/<testsuite name="([^"]*)"([^>]*)>([\s\S]*?)<\/testsuite>/g)) {
    for (const caso of suite[3].matchAll(/<testcase ([^>]*?)\/?>(?:([\s\S]*?)<\/testcase>)?/g)) {
      const attr = (n) => decodificar((caso[1].match(new RegExp(`${n}="([^"]*)"`)) ?? [])[1] ?? '');
      casos.push({ suite: decodificar(suite[1]), nombre: attr('name'), tiempo: Number(attr('time') || 0), archivo: attr('file'), fallo: /<failure/.test(caso[2] ?? '') });
    }
  }
  return casos;
}

module.exports = {
  leerJUnit, p, h1, h2, h3, vinetas, numerada, tabla, figura, leyenda, salto, documento, escribir, GRIS };
