// Shared layout for the Back To Eden documentation set.
// Each document module exports { slug, number, title, subtitle, audience, body() }.

export const META = {
  product: 'Back To Eden',
  version: '1.0',
  date: '19 November 2026',
  client: '[CLIENT NAME]',
  preparedBy: '[DEVELOPMENT TEAM NAME]',
};

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A table. rows: arrays of cells (HTML allowed). */
export function table(head, rows, opts = {}) {
  const cls = opts.cls ? ` class="${opts.cls}"` : '';
  const widths = opts.widths
    ? `<colgroup>${opts.widths.map((w) => `<col style="width:${w}">`).join('')}</colgroup>`
    : '';
  return `<table${cls}>${widths}<thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

export const note = (html, kind = 'info') => `<div class="callout ${kind}">${html}</div>`;
export const code = (s) => `<pre><code>${esc(s)}</code></pre>`;
export const c = (s) => `<code>${esc(s)}</code>`;

/** A figure with a caption. */
export const figure = (svg, caption) =>
  `<figure>${svg}<figcaption>${caption}</figcaption></figure>`;

// ---------------------------------------------------------------- ERD drawing

const ROW = 19;
const HEAD = 26;

/**
 * Entity box. fields: [name, type, flag] where flag is 'PK', 'FK', 'PK FK',
 * 'UQ' or ''. Returns geometry used to attach relationship lines.
 */
function entityBox(e) {
  const h = HEAD + e.fields.length * ROW + 6;
  const w = e.w || 240;
  let s = `<g transform="translate(${e.x},${e.y})">`;
  s += `<rect width="${w}" height="${h}" rx="5" class="ent"/>`;
  s += `<rect width="${w}" height="${HEAD}" rx="5" class="ent-head"/>`;
  s += `<rect y="${HEAD - 6}" width="${w}" height="6" class="ent-head"/>`;
  s += `<text x="10" y="17" class="ent-title">${esc(e.name)}</text>`;
  if (e.db) s += `<text x="${w - 10}" y="17" class="ent-db" text-anchor="end">${esc(e.db)}</text>`;
  e.fields.forEach(([n, t, f = ''], i) => {
    const y = HEAD + i * ROW + 14;
    if (i % 2 === 1) s += `<rect y="${HEAD + i * ROW + 1}" width="${w}" height="${ROW}" class="ent-stripe"/>`;
    s += `<text x="10" y="${y}" class="ent-flag">${esc(f)}</text>`;
    s += `<text x="46" y="${y}" class="ent-field${f.includes('PK') ? ' pk' : ''}">${esc(n)}</text>`;
    s += `<text x="${w - 10}" y="${y}" class="ent-type" text-anchor="end">${esc(t)}</text>`;
  });
  s += '</g>';
  return { svg: s, w, h };
}

function rowY(e, field) {
  const i = e.fields.findIndex((f) => f[0] === field);
  return e.y + HEAD + (i < 0 ? 0 : i) * ROW + ROW / 2 + 1;
}

/**
 * Draws an ERD. entities: [{id,name,db,x,y,w,fields}], rels:
 * [{from:'id.field', to:'id.field', card:'1:N'|'1:1', dashed, label}]
 * "from" is the parent (one) side, "to" the child (many) side.
 */
export function erd(entities, rels, width, height) {
  const byId = Object.fromEntries(entities.map((e) => [e.id, e]));
  const boxes = entities.map((e) => {
    const b = entityBox(e);
    e._w = b.w;
    e._h = b.h;
    return b.svg;
  });
  const lines = rels.map((r) => {
    const [pa, pf] = r.from.split('.');
    const [ca, cf] = r.to.split('.');
    const p = byId[pa];
    const ch = byId[ca];
    const py = rowY(p, pf);
    const cy = rowY(ch, cf);
    // Attach to the facing sides; if they overlap horizontally, loop round the right.
    // pdir: which way the line leaves the parent; dir: which way it enters the child.
    let px, cx, path, pdir, dir;
    if (p.x + p._w < ch.x) {
      px = p.x + p._w; cx = ch.x; pdir = 1; dir = 1;
      const mid = r.mid ?? (px + cx) / 2;
      path = `M${px},${py} H${mid} V${cy} H${cx}`;
    } else if (ch.x + ch._w < p.x) {
      px = p.x; cx = ch.x + ch._w; pdir = -1; dir = -1;
      const mid = r.mid ?? (px + cx) / 2;
      path = `M${px},${py} H${mid} V${cy} H${cx}`;
    } else {
      px = p.x + p._w; cx = ch.x + ch._w; pdir = 1; dir = -1;
      const out = Math.max(px, cx) + (r.loop || 24);
      path = `M${px},${py} H${out} V${cy} H${cx}`;
    }
    // crow's foot at the child end, bar at the parent end
    const end = cx;
    const back = end - dir * 12;
    let marks = '';
    marks += `<line x1="${px + pdir * 8}" y1="${py - 6}" x2="${px + pdir * 8}" y2="${py + 6}" class="rel"/>`;
    if (r.card === '1:1') {
      marks += `<line x1="${back}" y1="${cy - 6}" x2="${back}" y2="${cy + 6}" class="rel"/>`;
    } else {
      marks += `<line x1="${back}" y1="${cy}" x2="${end}" y2="${cy - 7}" class="rel"/>`;
      marks += `<line x1="${back}" y1="${cy}" x2="${end}" y2="${cy + 7}" class="rel"/>`;
      marks += `<line x1="${back - dir * 4}" y1="${cy - 6}" x2="${back - dir * 4}" y2="${cy + 6}" class="rel"/>`;
    }
    let label = '';
    if (r.label) {
      const lx = r.lx ?? (px + cx) / 2;
      const ly = r.ly ?? (py + cy) / 2 - 6;
      label = `<text x="${lx}" y="${ly}" class="rel-label" text-anchor="middle">${esc(r.label)}</text>`;
    }
    return `<path d="${path}" class="rel${r.dashed ? ' dashed' : ''}" fill="none"/>${marks}${label}`;
  });
  return `<svg viewBox="0 0 ${width} ${height}" class="diagram" xmlns="http://www.w3.org/2000/svg">${lines.join('')}${boxes.join('')}</svg>`;
}

// ------------------------------------------------------------ block diagrams

/** Simple boxes-and-arrows diagram. nodes: {id,x,y,w,h,title,sub,kind}; edges: {from,to,label,dashed,fromSide,toSide} */
export function blocks(nodes, edges, width, height) {
  const by = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const anchor = (n, side) => {
    switch (side) {
      case 'l': return [n.x, n.y + n.h / 2];
      case 'r': return [n.x + n.w, n.y + n.h / 2];
      case 't': return [n.x + n.w / 2, n.y];
      default: return [n.x + n.w / 2, n.y + n.h];
    }
  };
  const e = edges.map((ed) => {
    const [x1, y1] = anchor(by[ed.from], ed.fromSide || 'b');
    const [x2, y2] = anchor(by[ed.to], ed.toSide || 't');
    const lx = ed.lx ?? (x1 + x2) / 2 + (ed.dx || 6);
    const ly = ed.ly ?? (y1 + y2) / 2 + (ed.dy || 0);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="edge${ed.dashed ? ' dashed' : ''}" marker-end="url(#arrow)"${ed.both ? ' marker-start="url(#arrow-s)"' : ''}/>` +
      (ed.label ? `<text x="${lx}" y="${ly}" class="edge-label"${ed.anchor ? ` text-anchor="${ed.anchor}"` : ''}>${esc(ed.label)}</text>` : '');
  });
  const n = nodes.map((nd) => {
    const lines = (nd.sub || '').split('\n').filter(Boolean);
    const ty = nd.y + (nd.h - (lines.length ? 16 + lines.length * 14 : 0)) / 2 + 13;
    let s = `<rect x="${nd.x}" y="${nd.y}" width="${nd.w}" height="${nd.h}" rx="7" class="node ${nd.kind || ''}"/>`;
    s += `<text x="${nd.x + nd.w / 2}" y="${lines.length ? ty : nd.y + nd.h / 2 + 5}" class="node-title${nd.kind === 'core' ? ' on-dark' : ''}" text-anchor="middle">${esc(nd.title)}</text>`;
    lines.forEach((l, i) => {
      s += `<text x="${nd.x + nd.w / 2}" y="${ty + 17 + i * 14}" class="node-sub${nd.kind === 'core' ? ' on-dark' : ''}" text-anchor="middle">${esc(l)}</text>`;
    });
    return s;
  });
  const defs = `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="arrowhead"/></marker><marker id="arrow-s" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M10,0 L0,5 L10,10 z" class="arrowhead"/></marker></defs>`;
  return `<svg viewBox="0 0 ${width} ${height}" class="diagram" xmlns="http://www.w3.org/2000/svg">${defs}${n.join('')}${e.join('')}</svg>`;
}

// ------------------------------------------------------------------- page

const CSS = `
@page { size: A4; margin: 20mm 18mm 20mm 18mm;
  @bottom-left { content: "${META.product} · DOCNUM"; font: 8pt 'Segoe UI', Arial, sans-serif; color: #7a7f73; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt 'Segoe UI', Arial, sans-serif; color: #7a7f73; }
  @top-right { content: "DOCTITLE"; font: 8pt 'Segoe UI', Arial, sans-serif; color: #7a7f73; }
}
@page :first { @bottom-left { content: none; } @bottom-right { content: none; } @top-right { content: none; } }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #22261f; margin: 0; }
.cover { height: 247mm; display: flex; flex-direction: column; page-break-after: always; }
.cover .band { background: #2f5d3a; color: #fff; padding: 22mm 14mm 16mm; border-radius: 4px; }
.cover .eyebrow { letter-spacing: .18em; font-size: 9pt; text-transform: uppercase; opacity: .85; }
.cover h1 { color: #fff; font-size: 30pt; line-height: 1.15; margin: 8mm 0 3mm; font-weight: 700; }
.cover .subtitle { font-size: 13pt; opacity: .92; }
.cover .docno { margin-top: 10mm; font-size: 10pt; opacity: .85; }
.cover .meta { margin-top: auto; }
.cover .meta table { width: 100%; }
.cover .meta td:first-child { width: 38mm; color: #5d6457; font-weight: 600; }
.cover .conf { margin-top: 6mm; font-size: 8.5pt; color: #6b7165; }
h1, h2, h3, h4 { color: #1f4128; page-break-after: avoid; break-after: avoid; }
h2 { font-size: 16pt; margin: 0 0 4mm; padding-bottom: 2mm; border-bottom: 2px solid #2f5d3a; page-break-before: always; break-before: page; }
h2.first { page-break-before: auto; break-before: auto; }
h3 { font-size: 12pt; margin: 6mm 0 2mm; }
h4 { font-size: 10.5pt; margin: 4mm 0 1.5mm; color: #2f5d3a; }
p { margin: 0 0 2.6mm; }
ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
li { margin-bottom: 1mm; }
table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 8.8pt; page-break-inside: auto; }
tr { page-break-inside: avoid; break-inside: avoid; }
thead { display: table-header-group; }
th { background: #e6eee2; color: #1f4128; text-align: left; padding: 1.6mm 2mm; border: 1px solid #c9d5c3; font-weight: 600; }
td { padding: 1.4mm 2mm; border: 1px solid #d8dfd3; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f7f9f5; }
table.compact td, table.compact th { padding: 1mm 1.6mm; font-size: 8.3pt; }
code { font-family: Consolas, 'Courier New', monospace; font-size: 8.6pt; background: #eef2eb; padding: 0 1mm; border-radius: 2px; }
pre { background: #f3f6f1; border: 1px solid #d8dfd3; border-radius: 4px; padding: 3mm; font-size: 8.4pt; line-height: 1.4; white-space: pre-wrap; word-break: break-word; page-break-inside: avoid; }
pre code { background: none; padding: 0; }
.callout { border-left: 4px solid #2f5d3a; background: #eef4ea; padding: 2.5mm 3.5mm; margin: 3mm 0 4mm; border-radius: 0 4px 4px 0; page-break-inside: avoid; }
.callout.warn { border-color: #b7791f; background: #fdf6e7; }
.callout.risk { border-color: #b23a3a; background: #fbeeee; }
.callout p:last-child { margin-bottom: 0; }
figure { margin: 4mm 0 5mm; page-break-inside: avoid; break-inside: avoid; text-align: center; }
figcaption { font-size: 8.5pt; color: #5d6457; margin-top: 2mm; font-style: italic; }
svg.diagram { width: 100%; height: auto; }
.ent { fill: #fff; stroke: #6f8d63; stroke-width: 1.2; }
.ent-head { fill: #2f5d3a; }
.ent-stripe { fill: #f2f6ef; }
.ent-title { fill: #fff; font: 600 12px 'Segoe UI', Arial; }
.ent-db { fill: #cfe0c8; font: 9px 'Segoe UI', Arial; }
.ent-field { fill: #22261f; font: 10.5px Consolas, monospace; }
.ent-field.pk { font-weight: 700; }
.ent-type { fill: #6b7165; font: 9.5px 'Segoe UI', Arial; }
.ent-flag { fill: #b7791f; font: 600 8.5px 'Segoe UI', Arial; }
.rel { stroke: #4a6b40; stroke-width: 1.3; fill: none; }
.rel.dashed, .edge.dashed { stroke-dasharray: 5 4; }
.rel-label, .edge-label { fill: #4a5345; font: italic 9.5px 'Segoe UI', Arial; }
.node { fill: #f2f6ef; stroke: #6f8d63; stroke-width: 1.3; }
.node.client { fill: #e8f0fb; stroke: #5a7fb0; }
.node.store { fill: #fdf6e7; stroke: #b7891f; }
.node.ext { fill: #f4f4f4; stroke: #9a9a9a; stroke-dasharray: 5 4; }
.node.core { fill: #2f5d3a; stroke: #2f5d3a; }
.node-title.on-dark, .node-sub.on-dark { fill: #fff; }
.node-title { font: 600 12px 'Segoe UI', Arial; fill: #1f2a1c; }
.node-sub { font: 10px 'Segoe UI', Arial; fill: #4a5345; }
.edge { stroke: #4a5345; stroke-width: 1.3; }
.arrowhead { fill: #4a5345; }
.toc { page-break-after: always; }
.toc h2 { page-break-before: avoid; break-before: avoid; }
.toc ol { list-style: none; padding: 0; counter-reset: none; }
.toc li { display: flex; border-bottom: 1px dotted #b9c3b3; padding: 1.4mm 0; margin: 0; }
.toc li span.n { width: 10mm; color: #2f5d3a; font-weight: 600; }
.req { font-family: Consolas, monospace; font-size: 8.4pt; color: #2f5d3a; font-weight: 700; white-space: nowrap; }
.tag { display: inline-block; font-size: 7.8pt; padding: 0 1.6mm; border-radius: 8px; background: #e6eee2; color: #1f4128; font-weight: 600; }
.tag.must { background: #2f5d3a; color: #fff; }
.tag.open { background: #fdf0d5; color: #8a5a10; }
.tag.done { background: #dcefd7; color: #22612b; }
.tag.gap { background: #f6dcdc; color: #8d2a2a; }
.method { font: 700 8pt Consolas, monospace; padding: 0.3mm 1.4mm; border-radius: 2px; color: #fff; }
.GET { background: #3b7a57; } .POST { background: #3d66a8; } .DELETE { background: #a83d3d; }
.small { font-size: 8.6pt; color: #5d6457; }
.keep { page-break-inside: avoid; break-inside: avoid; }
`;

export function page(doc) {
  const toc = doc.sections.map((s, i) => `<li><span class="n">${i + 1}.</span><span>${esc(s.title)}</span></li>`).join('');
  const sections = doc.sections
    .map((s, i) => `<section><h2${i === 0 ? ' class="first"' : ''}>${i + 1}. ${esc(s.title)}</h2>${s.html}</section>`)
    .join('\n');
  const css = CSS.replace('DOCNUM', `${doc.number} v${META.version}`).replace('DOCTITLE', doc.title);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(doc.title)} - ${META.product}</title><style>${css}</style></head><body>
<div class="cover">
  <div class="band">
    <div class="eyebrow">${META.product} · Project documentation</div>
    <h1>${esc(doc.title)}</h1>
    <div class="subtitle">${esc(doc.subtitle)}</div>
    <div class="docno">Document ${doc.number} · Version ${META.version} · ${META.date}</div>
  </div>
  <div class="meta">
    <table>
      <tr><td>Client</td><td>${META.client}</td></tr>
      <tr><td>Prepared by</td><td>${META.preparedBy}</td></tr>
      <tr><td>Intended readers</td><td>${esc(doc.audience)}</td></tr>
      <tr><td>Status</td><td>Issued for client review</td></tr>
      <tr><td>Applies to</td><td>Back To Eden web app, API and Expo phone app as of ${META.date}</td></tr>
    </table>
    <div class="conf">Confidential. Prepared for the client named above. Items in [SQUARE BRACKETS] are to be completed by the client or the development team before final sign-off.</div>
  </div>
</div>
<div class="toc"><h2 class="first">Contents</h2><ol>${toc}</ol></div>
${sections}
</body></html>`;
}

/** Document control table used at the end of each document. */
export function control(extraRows = []) {
  return table(
    ['Version', 'Date', 'Author', 'Change'],
    [[META.version, META.date, META.preparedBy, 'First issue for client review.'], ...extraRows],
    { widths: ['14%', '20%', '26%', '40%'] },
  );
}
