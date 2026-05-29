import { Injectable } from '@angular/core';
import { SaldoCliente } from '../models/cliente.model';
import { Movimiento } from '../models/movimiento.model';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const C = {
  primary:      '#6A1B9A',
  primarySoft:  '#F6ECFA',
  primaryMid:   '#9C4DCC',
  primaryBorder:'#E1C4F0',
  text:         '#1a1a2e',
  muted:        '#666666',
  success:      '#4CAF50',
  successBg:    '#E8F5E9',
  warning:      '#E36B00',
  warningBg:    '#FFF5CC',
  danger:       '#F44336',
  white:        '#ffffff',
  offWhite:     '#FAFAFA',
};

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

    const [logoBase64, nequiBase64, brebBase64,
           icoCompra, icoAbono, icoUltima, icoPendiente, icoPeriodo, icoWhatsapp] = await Promise.all([
      this.loadImage('/S&A-Clientes-logo.png'),
      this.loadImage('/Nequi-logo.png'),
      this.loadImage('/Bre-B-logo.png'),
      this.loadImage('/icon/compra.png'),
      this.loadImage('/icon/abono.png'),
      this.loadImage('/icon/ultima_compra.png'),
      this.loadImage('/icon/pendiente.png'),
      this.loadImage('/icon/periodo.png'),
      this.loadImage('/icon/whatsapp.png'),
    ]);

    const movsFiltrados = movimientos
      .filter(m => {
        const f = new Date(m.fecha);
        return f.getMonth() + 1 === mes && f.getFullYear() === anio;
      })
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const compras      = movsFiltrados.filter(m => m.tipo === 'COMPRA');
    const abonos       = movsFiltrados.filter(m => m.tipo === 'ABONO');
    const totalCompras = compras.reduce((s, m) => s + m.monto, 0);
    const totalAbonos  = abonos.reduce((s, m) => s + m.monto, 0);
    const saldo        = totalCompras - totalAbonos;
    const alDia        = saldo <= 0;
    const ultimaCompra = compras[compras.length - 1];

    const docDef: any = {
      pageSize: 'A4',
      pageMargins: [36, 36, 36, 36],
      content: [
        // Barra superior decorativa
        { canvas: [{ type: 'rect', x: 0, y: 0, w: 523, h: 5, color: C.primary }], margin: [0, 0, 0, 18] },

        this.buildHeader(logoBase64, mes, anio, icoPeriodo),
        this.buildInfoCard(cliente, alDia),
        this.buildStatsRow(totalCompras, totalAbonos, saldo, compras.length, abonos.length, ultimaCompra, icoCompra, icoAbono, icoUltima, icoPendiente),

        // Separador decorativo
        this.ornamentDivider(),

        movsFiltrados.length > 0
          ? this.buildTabla(movsFiltrados)
          : { text: 'Sin movimientos en este periodo.', color: C.muted, italics: true, alignment: 'center', margin: [0, 16, 0, 16] },

        this.buildResumen(totalCompras, totalAbonos, saldo),
        this.buildPagoCard(nequiBase64, brebBase64),
        this.buildContactCard(icoWhatsapp),
        this.buildFooterBottom(),

        // Barra inferior decorativa
        { canvas: [{ type: 'rect', x: 0, y: 0, w: 523, h: 3, color: C.primaryBorder }], margin: [0, 8, 0, 0] },
      ],
      styles: {
        label:     { fontSize: 8,  bold: true, color: C.primary, characterSpacing: 1.5 },
        titleCard: { fontSize: 16, bold: true, color: C.text, margin: [0, 4, 0, 3] },
        small:     { fontSize: 9,  color: C.muted },
      },
    };

    return await pdfMake.createPdf(docDef).getBlob();
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  private card(content: any[], bg = C.white, h = 14, v = 13): any {
    return {
      table: {
        widths: ['*'],
        body: [[{ stack: content, fillColor: bg, border: [false, false, false, false] }]],
      },
      layout: {
        hLineWidth: () => 0, vLineWidth: () => 0,
        paddingLeft: () => h, paddingRight: () => h,
        paddingTop: () => v, paddingBottom: () => v,
      },
    };
  }

  private cardWithAccent(content: any[], accentColor = C.primary, bg = C.white): any {
    return {
      table: {
        widths: [4, '*'],
        body: [[
          { text: '', fillColor: accentColor, border: [false, false, false, false] },
          { stack: content, fillColor: bg, border: [false, false, false, false] },
        ]],
      },
      layout: {
        hLineWidth: () => 0, vLineWidth: () => 0,
        paddingLeft: (i: number) => i === 0 ? 0 : 14,
        paddingRight: () => 14,
        paddingTop: () => 12,
        paddingBottom: () => 12,
      },
    };
  }

  private iconChip(symbol: string, bg: string, color = C.white): any {
    return {
      table: {
        body: [[{ text: symbol, fontSize: 11, bold: true, color, fillColor: bg, border: [false, false, false, false] }]],
      },
      layout: {
        hLineWidth: () => 0, vLineWidth: () => 0,
        paddingTop: () => 4, paddingBottom: () => 4,
        paddingLeft: () => 7, paddingRight: () => 7,
      },
    };
  }

  private statCard(label: string, value: string, sub: string, bg: string, valueColor = C.text, img: string | null = null): any {
    const iconEl: any = img
      ? { image: img, width: 22, height: 22 }
      : { ...this.iconChip('■', C.primary), width: 'auto' };

    return {
      width: '*',
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            {
              columns: [
                { ...iconEl, width: 'auto' },
                { text: label, fontSize: 7.5, bold: true, color: C.primary, characterSpacing: 0.8, margin: [6, 5, 0, 0] },
              ],
              margin: [0, 0, 0, 6],
            },
            { text: value, fontSize: 16, bold: true, color: valueColor, margin: [0, 0, 0, 3] },
            ...(sub ? [{ text: sub, fontSize: 8, color: C.muted }] : []),
          ],
          fillColor: bg,
          border: [false, false, false, false],
        }]],
      },
      layout: {
        hLineWidth: () => 0, vLineWidth: () => 0,
        paddingLeft: () => 12, paddingRight: () => 12,
        paddingTop: () => 12, paddingBottom: () => 12,
      },
    };
  }

  private badge(text: string, color: string, bg: string): any {
    return {
      table: {
        body: [[{ text, fontSize: 10, bold: true, color, fillColor: bg, border: [false, false, false, false] }]],
      },
      layout: {
        hLineWidth: () => 0, vLineWidth: () => 0,
        paddingTop: () => 4, paddingBottom: () => 4,
        paddingLeft: () => 10, paddingRight: () => 10,
      },
    };
  }

  private ornamentDivider(): any {
    return {
      stack: [
        { canvas: [
          { type: 'line', x1: 0,   y1: 0, x2: 220, y2: 0, lineWidth: 0.8, lineColor: C.primaryBorder },
          { type: 'line', x1: 303, y1: 0, x2: 523, y2: 0, lineWidth: 0.8, lineColor: C.primaryBorder },
        ]},
        { text: '- - -  Detalle de movimientos  - - -', fontSize: 8, bold: true, color: C.primaryMid,
          alignment: 'center', characterSpacing: 1, margin: [0, -6, 0, 0] },
      ],
      margin: [0, 4, 0, 14],
    };
  }

  // ─── SECTIONS ─────────────────────────────────────────────────────────────

  private buildHeader(logo: string | null, mes: number, anio: number, icoPeriodo: string | null): any {
    const periodoIcon: any = icoPeriodo
      ? { image: icoPeriodo, width: 16, height: 16, margin: [0, 1, 0, 0] }
      : { text: '■', fontSize: 12, color: C.primaryMid, width: 18, margin: [0, 1, 0, 0] };

    return {
      columns: [
        logo
          ? { image: logo, width: 88 }
          : { text: 'S&A', fontSize: 28, bold: true, color: C.primary },
        {
          stack: [
            { text: 'S&A Clientes', fontSize: 25, bold: true, color: C.primary },
            { text: 'Estado de cuenta mensual', fontSize: 11, color: C.muted, margin: [0, 3, 0, 0] },
          ],
          margin: [14, 14, 0, 0],
        },
        {
          width: 130,
          stack: [
            {
              columns: [
                { ...periodoIcon, width: 'auto' },
                { text: 'PERIODO', fontSize: 8, bold: true, color: C.primary, characterSpacing: 1.5, margin: [6, 2, 0, 0] },
              ],
            },
            { text: `${MESES[mes - 1]} ${anio}`, fontSize: 17, bold: true, color: C.text, alignment: 'right', margin: [0, 4, 0, 2] },
            { text: `Generado: ${this.formatFecha(new Date().toISOString())}`, fontSize: 8.5, color: C.muted, alignment: 'right' },
          ],
          margin: [0, 10, 0, 0],
        },
      ],
      margin: [0, 0, 0, 18],
    };
  }

  private buildInfoCard(cliente: SaldoCliente, alDia: boolean): any {
    return {
      ...this.card([{
        columns: [
          {
            width: '*',
            stack: [
              { text: 'CLIENTE', style: 'label' },
              { text: cliente.nombre, style: 'titleCard' },
              ...(cliente.telefono
                ? [{ columns: [{ text: '>', fontSize: 9, color: C.primaryMid, width: 14 }, { text: cliente.telefono, style: 'small', margin: [2, 0, 0, 0] }] }]
                : []
              ),
            ],
          },
          {
            width: 1,
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: 0, y2: 60, lineWidth: 1, lineColor: C.primaryBorder }],
            margin: [18, 0, 18, 0],
          },
          {
            width: '*',
            stack: [
              { text: 'ESTADO', style: 'label' },
              { ...this.badge(alDia ? '● Al día' : '● Pendiente', alDia ? C.success : C.warning, alDia ? C.successBg : C.warningBg), margin: [0, 6, 0, 4] },
              { text: alDia ? 'Gracias por estar al dia!' : 'Tienes un saldo pendiente', style: 'small' },
            ],
          },
        ],
      }], C.white, 16, 14),
      margin: [0, 0, 0, 14],
    };
  }

  private buildStatsRow(
    totalCompras: number, totalAbonos: number, saldo: number,
    nCompras: number, nAbonos: number, ultimaCompra?: Movimiento,
    icoCompra: string | null = null, icoAbono: string | null = null,
    icoUltima: string | null = null, icoPendiente: string | null = null
  ): any {
    return {
      columns: [
        this.statCard('TOTAL COMPRAS',   this.formatCOP(totalCompras), `${nCompras} ${nCompras === 1 ? 'compra' : 'compras'}`, C.primarySoft, C.danger,  icoCompra),
        { width: 8, text: '' },
        this.statCard('TOTAL ABONOS',    this.formatCOP(totalAbonos),  `${nAbonos} ${nAbonos === 1 ? 'abono' : 'abonos'}`,   C.primarySoft, C.success, icoAbono),
        { width: 8, text: '' },
        this.statCard('ÚLTIMA COMPRA',   ultimaCompra ? this.formatFecha(ultimaCompra.fecha) : '-', '', C.primarySoft, C.text,   icoUltima),
        { width: 8, text: '' },
        this.statCard('SALDO PENDIENTE', this.formatCOP(saldo), '', C.warningBg, saldo > 0 ? C.warning : C.success, icoPendiente),
      ],
      margin: [0, 0, 0, 18],
    };
  }

  private buildTabla(movs: Movimiento[]): any {
    const filas = movs.map(m => [
      { text: this.formatFecha(m.fecha), fontSize: 9, color: C.muted },
      { text: m.tipo === 'COMPRA' ? 'Compra' : 'Abono', fontSize: 9, bold: true,
        color: m.tipo === 'COMPRA' ? C.danger : C.success },
      { text: m.descripcion || '—', fontSize: 9, color: C.text },
      { text: m.tipo === 'COMPRA' ? this.formatCOP(m.monto) : '—',
        fontSize: 9, bold: m.tipo === 'COMPRA', color: m.tipo === 'COMPRA' ? C.danger : C.muted, alignment: 'right' },
      { text: m.tipo === 'ABONO'  ? this.formatCOP(m.monto) : '—',
        fontSize: 9, bold: m.tipo === 'ABONO',  color: m.tipo === 'ABONO'  ? C.success : C.muted, alignment: 'right' },
    ]);

    return {
      table: {
        headerRows: 1,
        widths: [65, 52, '*', 80, 72],
        body: [
          [
            { text: 'Fecha',       fontSize: 9, bold: true, color: C.primary },
            { text: 'Tipo',        fontSize: 9, bold: true, color: C.primary },
            { text: 'Descripción', fontSize: 9, bold: true, color: C.primary },
            { text: 'Compra',      fontSize: 9, bold: true, color: C.primary, alignment: 'right' },
            { text: 'Abono',       fontSize: 9, bold: true, color: C.primary, alignment: 'right' },
          ],
          ...filas,
        ],
      },
      layout: {
        fillColor:     (i: number) => i === 0 ? C.primarySoft : i % 2 === 0 ? '#FAF4FD' : C.white,
        hLineWidth:    (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.4,
        vLineWidth:    () => 0,
        hLineColor:    () => C.primaryBorder,
        paddingTop:    () => 9,
        paddingBottom: () => 9,
        paddingLeft:   () => 9,
        paddingRight:  () => 9,
      },
      margin: [0, 0, 0, 0],
    };
  }

  private buildResumen(totalCompras: number, totalAbonos: number, saldo: number): any {
    return {
      table: {
        widths: ['*', 115],
        body: [
          [
            { text: 'Total compras',  fontSize: 10, color: C.muted,    border: [false, false, false, false] },
            { text: this.formatCOP(totalCompras), fontSize: 10, bold: true, color: C.danger,  alignment: 'right', border: [false, false, false, false] },
          ],
          [
            { text: 'Total abonos', fontSize: 10, color: C.muted,    border: [false, false, false, false] },
            { text: this.formatCOP(totalAbonos), fontSize: 10, bold: true, color: C.success, alignment: 'right', border: [false, false, false, false] },
          ],
          [
            { text: 'SALDO PENDIENTE', fontSize: 13, bold: true, color: C.text, fillColor: C.warningBg, border: [false, false, false, false] },
            { text: this.formatCOP(saldo), fontSize: 15, bold: true, fillColor: C.warningBg,
              color: saldo > 0 ? C.warning : C.success, alignment: 'right', border: [false, false, false, false] },
          ],
        ],
      },
      layout: {
        hLineWidth: (i: number, node: any) => i === node.table.body.length - 1 ? 0 : 0,
        vLineWidth: () => 0,
        paddingTop: (i: number) => i === 2 ? 10 : 9,
        paddingBottom: (i: number) => i === 2 ? 10 : 9,
        paddingLeft: () => 10,
        paddingRight: () => 10,
      },
      margin: [0, 0, 0, 18],
    };
  }

  private buildPagoCard(nequi: string | null, breb: string | null): any {
    const metodoRow = (logo: string | null, symbol: string, nombre: string, numero: string): any => ({
      columns: [
        logo
          ? { image: logo, width: 34, margin: [0, 2, 0, 0] }
          : { text: symbol, fontSize: 16, bold: true, color: C.primaryMid, width: 34, margin: [0, 1, 0, 0] },
        { text: nombre, fontSize: 11, bold: true, color: C.text, margin: [12, 5, 0, 0], width: 75 },
        { text: numero, fontSize: 10, color: C.muted, margin: [0, 7, 0, 0] },
      ],
      margin: [0, 0, 0, 10],
    });

    return {
      ...this.cardWithAccent([
        {
          columns: [
            { ...this.iconChip('$', C.primary), width: 'auto', margin: [0, 0, 8, 0] },
            { text: 'MÉTODOS DE PAGO', style: 'label', margin: [0, 4, 0, 0] },
          ],
          margin: [0, 0, 0, 12],
        },
        metodoRow(nequi, 'N', 'Nequi', '3014030939'),
        metodoRow(breb,  'B', 'Bre-B', '3014030939'),
        {
          columns: [
            { text: '$', fontSize: 16, bold: true, color: C.success, width: 34, margin: [0, 1, 0, 0] },
            { text: 'Efectivo', fontSize: 11, bold: true, color: C.text, margin: [12, 5, 0, 0], width: 75 },
            { text: 'Pago en mano', fontSize: 10, color: C.muted, margin: [0, 7, 0, 0] },
          ],
        },
      ], C.primaryMid, C.white),
      margin: [0, 0, 0, 12],
    };
  }

  private buildContactCard(icoWhatsapp: string | null = null): any {
    const waIcon: any = icoWhatsapp
      ? { image: icoWhatsapp, width: 32, height: 32, margin: [0, 2, 0, 0] }
      : { text: 'W', fontSize: 24, bold: true, color: C.success, alignment: 'center' };

    return {
      ...this.card([{
        columns: [
          { ...waIcon, width: 36 },
          {
            stack: [
              { text: '¿Tienes alguna duda o deseas realizar un abono?', fontSize: 10, bold: true, color: C.text },
              { text: 'Escríbenos por WhatsApp', fontSize: 9, color: C.muted, margin: [0, 2, 0, 3] },
              { text: '301 403 0939', fontSize: 13, bold: true, color: C.primary },
            ],
            margin: [12, 0, 0, 0],
          },
          {
            width: 30,
            text: '*',
            fontSize: 20,
            color: C.primaryBorder,
            alignment: 'right',
            margin: [0, 8, 0, 0],
          },
        ],
      }], C.primarySoft, 16, 14),
      margin: [0, 0, 0, 12],
    };
  }

  private buildFooterBottom(): any {
    return {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: 'Gracias por apoyar nuestro emprendimiento',
              fontSize: 12, bold: true, color: C.primary, alignment: 'center' },
            { text: 'Tu confianza nos impulsa a seguir endulzando tus dias.',
              fontSize: 9, color: C.muted, alignment: 'center', margin: [0, 4, 0, 6] },
            { text: 'S&A CLIENTES  -  CONSENTIR TU PALADAR ES NUESTRO ARTE',
              fontSize: 7.5, color: C.primaryMid, alignment: 'center', characterSpacing: 1 },
          ],
          fillColor: C.primarySoft,
          border: [false, false, false, false],
          margin: [0, 14, 0, 14],
        }]],
      },
      layout: {
        hLineWidth: () => 0, vLineWidth: () => 0,
        paddingLeft: () => 0, paddingRight: () => 0,
        paddingTop: () => 0, paddingBottom: () => 0,
      },
    };
  }

  // ─── UTILS ────────────────────────────────────────────────────────────────

  private async loadImage(url: string): Promise<string | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  }

  private formatFecha(iso: string): string {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  private formatCOP(n: number): string {
    return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  }
}
