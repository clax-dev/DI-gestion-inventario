import { Injectable } from '@angular/core';

/** Columna de un informe: título y cómo obtener el texto de cada fila. */
export interface ColumnaInforme<T> {
  titulo: string;
  valor: (fila: T) => string | number;
}

/**
 * Generación de informes tabulados en CSV y PDF en el propio navegador.
 * jsPDF se carga con import() dinámico: solo se descarga si el usuario exporta (bundle inicial más ligero).
 */
@Injectable({ providedIn: 'root' })
export class ExportacionService {
  /** CSV con separador ';' y BOM UTF-8 para que Excel en español lo abra con tildes y columnas correctas. */
  csv<T>(nombreArchivo: string, columnas: ColumnaInforme<T>[], filas: T[]): void {
    const escapar = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lineas = [
      columnas.map(c => escapar(c.titulo)).join(';'),
      ...filas.map(f => columnas.map(c => escapar(c.valor(f))).join(';')),
    ];
    const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    this.descargar(blob, `${nombreArchivo}.csv`);
  }

  /** PDF con cabecera, tabla con estilo, filas alternas y número de página. */
  async pdf<T>(nombreArchivo: string, titulo: string, columnas: ColumnaInforme<T>[], filas: T[], resumen: string[] = []): Promise<void> {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const azul: [number, number, number] = [16, 64, 128];

    doc.setFillColor(...azul);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(titulo, 14, 15);
    doc.setFontSize(9);
    doc.text(`Gestión de inventario · ${new Date().toLocaleString('es-ES')}`, 14, 20);

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    resumen.forEach((linea, i) => doc.text(linea, 14, 32 + i * 5));

    autoTable(doc, {
      startY: 34 + resumen.length * 5,
      head: [columnas.map(c => c.titulo)],
      body: filas.map(f => columnas.map(c => String(c.valor(f)))),
      headStyles: { fillColor: azul, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 244, 250] },
      styles: { fontSize: 9, cellPadding: 2 },
      didDrawPage: () => {
        const pagina = doc.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(110, 110, 110);
        doc.text(`Página ${pagina}`, 196, 290, { align: 'right' });
      },
    });

    doc.save(`${nombreArchivo}.pdf`);
  }

  private descargar(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }
}
