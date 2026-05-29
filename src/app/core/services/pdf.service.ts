import { Injectable } from '@angular/core';
import { SaldoCliente } from '../models/cliente.model';
import { Movimiento } from '../models/movimiento.model';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

@Injectable({ providedIn: 'root' })
export class PdfService {

  async generarFactura(
    cliente: SaldoCliente,
    movimientos: Movimiento[],
    mes: number,
    anio: number
  ): Promise<Blob> {
    const pdfMake = (await import('pdfmake/build/pdfmake')).default;
    const vfs = (await import('pdfmake/build/vfs_fonts')).default;
    pdfMake.addVirtualFileSystem ? pdfMake.addVirtualFileSystem(vfs) : (pdfMake.vfs = vfs);

    const logoBase64 = await this.cargarLogoBase64('/S&A-Clientes-logo.png');

    const movsFiltrados = movimientos.filter(m => {
      const f = new Date(m.fecha);
      return f.getMonth() + 1 === mes && f.getFullYear() === anio;
    }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const totalCompras = movsFiltrados
      .filter(m => m.tipo === 'COMPRA')
      .reduce((s, m) => s + m.monto, 0);

    const totalAbonos = movsFiltrados
      .filter(m => m.tipo === 'ABONO')
      .reduce((s, m) => s + m.monto, 0);

    const saldo = totalCompras - totalAbonos;

    const filas: any[][] = movsFiltrados.map(m => [
      { text: this.formatFecha(m.fecha), style: 'celda' },
      { text: m.tipo === 'COMPRA' ? 'Compra' : 'Abono', style: 'celda',
        color: m.tipo === 'COMPRA' ? '#dc2626' : '#16a34a' },
      { text: m.descripcion || '—', style: 'celda' },
      { text: m.tipo === 'COMPRA' ? this.formatCOP(m.monto) : '—',
        style: 'celda', alignment: 'right', color: '#dc2626' },
      { text: m.tipo === 'ABONO' ? this.formatCOP(m.monto) : '—',
        style: 'celda', alignment: 'right', color: '#16a34a' },
    ]);

    const docDef: any = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 60],
      content: [
        // Header
        {
          columns: [
            logoBase64
              ? { image: logoBase64, width: 110, margin: [0, 0, 0, 0] }
              : { text: 'S&A Clientes', style: 'titulo', margin: [0, 8, 0, 0] },
            {
              stack: [
                { text: 'S&A Clientes', style: 'empresa' },
                { text: 'Estado de cuenta mensual', style: 'subtitulo' },
              ],
              alignment: 'right'
            }
          ],
          margin: [0, 0, 0, 20]
        },

        // Línea divisora
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e4e4e7' }], margin: [0, 0, 0, 16] },

        // Info cliente + periodo
        {
          columns: [
            {
              stack: [
                { text: 'CLIENTE', style: 'etiqueta' },
                { text: cliente.nombre, style: 'valorGrande' },
                cliente.telefono
                  ? { text: cliente.telefono, style: 'valorPequeno' }
                  : {}
              ]
            },
            {
              stack: [
                { text: 'PERIODO', style: 'etiqueta', alignment: 'right' },
                { text: `${MESES[mes - 1]} ${anio}`, style: 'valorGrande', alignment: 'right' },
                { text: `Generado: ${this.formatFecha(new Date().toISOString())}`, style: 'valorPequeno', alignment: 'right' }
              ]
            }
          ],
          margin: [0, 0, 0, 20]
        },

        // Tabla movimientos
        movsFiltrados.length > 0
          ? {
              table: {
                headerRows: 1,
                widths: [70, 55, '*', 85, 85],
                body: [
                  [
                    { text: 'Fecha', style: 'encabezado' },
                    { text: 'Tipo', style: 'encabezado' },
                    { text: 'Descripción', style: 'encabezado' },
                    { text: 'Compra', style: 'encabezado', alignment: 'right' },
                    { text: 'Abono', style: 'encabezado', alignment: 'right' },
                  ],
                  ...filas,
                ]
              },
              layout: {
                hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
                vLineWidth: () => 0,
                hLineColor: (i: number) => i <= 1 ? '#a1a1aa' : '#f4f4f5',
                paddingTop: () => 7,
                paddingBottom: () => 7,
              },
              margin: [0, 0, 0, 20]
            }
          : { text: 'Sin movimientos en este periodo.', style: 'sinDatos', margin: [0, 0, 0, 20] },

        // Totales
        {
          table: {
            widths: ['*', 120],
            body: [
              [
                { text: 'Total compras', style: 'labelTotal' },
                { text: this.formatCOP(totalCompras), style: 'valorTotal', color: '#dc2626', alignment: 'right' }
              ],
              [
                { text: 'Total abonos', style: 'labelTotal' },
                { text: this.formatCOP(totalAbonos), style: 'valorTotal', color: '#16a34a', alignment: 'right' }
              ],
              [
                { text: 'Saldo pendiente', style: 'labelSaldo', fillColor: saldo > 0 ? '#fef9c3' : '#f0fdf4' },
                { text: this.formatCOP(saldo), style: 'valorSaldo',
                  color: saldo > 0 ? '#b45309' : '#15803d',
                  fillColor: saldo > 0 ? '#fef9c3' : '#f0fdf4',
                  alignment: 'right' }
              ],
            ]
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#e4e4e7',
            paddingTop: () => 8,
            paddingBottom: () => 8,
          }
        },
      ],

      styles: {
        titulo: { fontSize: 20, bold: true, color: '#18181b' },
        empresa: { fontSize: 14, bold: true, color: '#18181b' },
        subtitulo: { fontSize: 10, color: '#71717a', margin: [0, 2, 0, 0] },
        etiqueta: { fontSize: 8, bold: true, color: '#a1a1aa', characterSpacing: 1 },
        valorGrande: { fontSize: 14, bold: true, color: '#18181b', margin: [0, 2, 0, 0] },
        valorPequeno: { fontSize: 10, color: '#71717a', margin: [0, 2, 0, 0] },
        encabezado: { fontSize: 9, bold: true, color: '#52525b', fillColor: '#f4f4f5' },
        celda: { fontSize: 9, color: '#27272a' },
        sinDatos: { fontSize: 11, color: '#a1a1aa', italics: true, alignment: 'center' },
        labelTotal: { fontSize: 10, color: '#52525b', margin: [4, 0, 0, 0] },
        valorTotal: { fontSize: 10, bold: true, margin: [0, 0, 4, 0] },
        labelSaldo: { fontSize: 11, bold: true, color: '#18181b', margin: [4, 0, 0, 0] },
        valorSaldo: { fontSize: 13, bold: true, margin: [0, 0, 4, 0] },
      },

      footer: (currentPage: number, pageCount: number) => ({
        text: `S&A Clientes · Página ${currentPage} de ${pageCount}`,
        alignment: 'center',
        fontSize: 8,
        color: '#a1a1aa',
        margin: [0, 10, 0, 0]
      })
    };

    const blob = await pdfMake.createPdf(docDef).getBlob();
    return blob;
  }

  private async cargarLogoBase64(url: string): Promise<string | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private formatFecha(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  private formatCOP(n: number): string {
    return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  }
}
