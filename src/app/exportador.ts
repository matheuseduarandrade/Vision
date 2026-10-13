import { Secao } from './relatorios.catalogo';

export interface Meta { titulo: string; parametros: [string, string][]; geradoEm: Date; }
export type Formato = 'pdf' | 'html' | 'csv' | 'json';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const quando = (d: Date) => d.toLocaleString('pt-BR', { timeZone: 'America/Fortaleza', dateStyle: 'short', timeStyle: 'short' });

export function nomeArquivo(base: string, ext: string, d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `vision-${base}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
}
export function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** CSV com separador ";" e BOM (abre direto no Excel em português). Textos iniciados por = + - @ ganham apóstrofo (evita fórmulas). */
export function paraCsv(meta: Meta, secoes: Secao[]): Blob {
  const cel = (v: string | number) => typeof v === 'number' ? String(v) : '"' + (/^[=+\-@\t\r]/.test(v) ? "'" + v : v).replace(/"/g, '""') + '"';
  const linhas: string[] = [cel(meta.titulo), cel('Gerado em ' + quando(meta.geradoEm)), ...meta.parametros.map(([k, v]) => cel(k) + ';' + cel(v))];
  secoes.forEach(s => { linhas.push('', cel(s.titulo), s.colunas.map(cel).join(';'), ...s.linhas.map(l => l.map(cel).join(';'))); });
  return new Blob(['\ufeff' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
}

export function paraJson(meta: Meta, secoes: Secao[]): Blob {
  const obj = { relatorio: meta.titulo, geradoEm: meta.geradoEm.toISOString(), parametros: Object.fromEntries(meta.parametros),
    secoes: secoes.map(s => ({ id: s.id, titulo: s.titulo, linhas: s.linhas.map(l => Object.fromEntries(s.colunas.map((c, i) => [c, l[i]]))) })) };
  return new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
}

export function paraHtml(meta: Meta, secoes: Secao[]): Blob {
  const tabela = (s: Secao) => `<section><h2>${esc(s.titulo)}</h2><table><thead><tr>${s.colunas.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${
    s.linhas.length ? s.linhas.map(l => `<tr>${l.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${s.colunas.length}" class="vazio">Sem dados.</td></tr>`}</tbody></table></section>`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(meta.titulo)}</title><style>
  *{box-sizing:border-box}body{font-family:system-ui,Segoe UI,Roboto,sans-serif;margin:0;background:#f4f7fc;color:#0f172a;line-height:1.45}
  main{max-width:1100px;margin:0 auto;padding:32px 24px}header{border-bottom:4px solid #066dff;padding-bottom:16px;margin-bottom:24px}
  h1{margin:0;font-size:26px}h2{font-size:17px;margin:32px 0 10px;color:#0338c8}.meta{color:#475569;font-size:13px;margin-top:6px}
  .params{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.params span{background:#e2e9f6;border-radius:999px;padding:4px 12px;font-size:12px}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;font-size:13px;box-shadow:0 1px 3px rgba(15,23,42,.1)}
  th{background:#066dff;color:#fff;text-align:left;padding:9px 12px;font-size:11px;letter-spacing:.05em;text-transform:uppercase}
  td{padding:8px 12px;border-top:1px solid #e2e8f0;vertical-align:top}tr:nth-child(even) td{background:#f8fafc}.vazio{text-align:center;color:#64748b}
  footer{margin-top:40px;color:#64748b;font-size:12px;text-align:center}@media print{body{background:#fff}section{break-inside:avoid-page}}
  </style></head><body><main><header><h1>${esc(meta.titulo)}</h1><p class="meta">VISION · Gerado em ${esc(quando(meta.geradoEm))}</p>
  <div class="params">${meta.parametros.map(([k, v]) => `<span><b>${esc(k)}:</b> ${esc(v)}</span>`).join('')}</div></header>
  ${secoes.map(tabela).join('')}<footer>Relatório gerado pelo VISION</footer></main></body></html>`;
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}

export async function paraPdf(meta: Meta, secoes: Secao[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
  doc.setFillColor(6, 109, 255); doc.rect(0, 0, w, 6, 'F');
  doc.setTextColor(15, 23, 42); doc.setFontSize(20); doc.text(meta.titulo, 40, 48);
  doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.text('VISION · Gerado em ' + quando(meta.geradoEm), 40, 64);
  let y = 80;
  if (meta.parametros.length) { doc.setTextColor(51, 65, 85); doc.text(meta.parametros.map(([k, v]) => `${k}: ${v}`).join('   |   '), 40, y); y += 14; }
  y += 10;
  secoes.forEach(s => {
    if (y > h - 120) { doc.addPage(); y = 50; }
    doc.setFontSize(12); doc.setTextColor(3, 56, 200); doc.text(s.titulo, 40, y);
    autoTable(doc, { startY: y + 6, head: [s.colunas], body: s.linhas.length ? s.linhas.map(l => l.map(String)) : [['Sem dados.']],
      styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' }, headStyles: { fillColor: [6, 109, 255], textColor: 255 },
      alternateRowStyles: { fillColor: [244, 247, 252] }, margin: { left: 40, right: 40, bottom: 40 } });
    y = ((doc as any).lastAutoTable?.finalY ?? y + 40) + 26;
  });
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text(`Página ${i} de ${n}`, w - 40, h - 18, { align: 'right' }); }
  return doc.output('blob');
}

export async function exportar(f: Formato, meta: Meta, secoes: Secao[], base: string) {
  const blob = f === 'pdf' ? await paraPdf(meta, secoes) : f === 'html' ? paraHtml(meta, secoes) : f === 'csv' ? paraCsv(meta, secoes) : paraJson(meta, secoes);
  baixar(blob, nomeArquivo(base, f, meta.geradoEm));
}
