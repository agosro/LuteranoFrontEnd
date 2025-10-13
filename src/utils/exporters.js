// Utilidades de exportación para Reporte Rinde
// CSV simple y PDF con jsPDF + autoTable

import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Utilidad base para descargar CSV
export function downloadCSV(filename, headers, rows) {
  const sep = ',';
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val).replace(/"/g, '""');
    // si contiene comas, comillas o saltos de línea, envolver en comillas
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const content = [headers.map(escape).join(sep), ...rows.map(r => r.map(escape).join(sep))].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Datos planos comunes
const planoHeaders = ['Alumno', 'DNI', 'Materia', 'E1', 'E2', 'PG', 'CO', 'EX', 'PF', 'Condición'];
const planoRowsFromFilas = (filas) => (filas || []).map(f => [
  `${(f.apellido || '')} ${(f.nombre || '')}`.trim(),
  f.dni ?? '',
  f.materiaNombre ?? '',
  f.e1 ?? '',
  f.e2 ?? '',
  f.pg ?? '',
  f.co ?? '',
  f.ex ?? '',
  f.pf ?? '',
  f.condicion ?? '',
]);

export function exportRindeCSV({ vista, filas, gruposAlumno, filename = 'reporte_rinden.csv' }) {
  if (vista === 'plano' || vista === 'materia') {
    // para materia exportamos plano igual (alumno+materia por fila)
    const headers = planoHeaders;
    const rows = planoRowsFromFilas(filas);
    downloadCSV(filename, headers, rows);
    return;
  }
  // vista alumno: expandimos a plano para CSV
  if (vista === 'alumno') {
    const headers = planoHeaders;
    const rows = [];
    (gruposAlumno || []).forEach(a => {
      (a.materias || []).forEach(m => {
        rows.push([
          `${(a.apellido || '')} ${(a.nombre || '')}`.trim(),
          a.dni ?? '',
          m.nombre ?? '',
          m.e1 ?? '',
          m.e2 ?? '',
          m.pg ?? '',
          m.co ?? '',
          m.ex ?? '',
          m.pf ?? '',
          m.condicion ?? '',
        ]);
      });
    });
    downloadCSV(filename, headers, rows);
  }
}

export function exportRindePDF({ vista, filas, gruposAlumno, meta = {} }) {
  const doc = new jsPDF({ orientation: 'l', unit: 'pt', format: 'a4' });
  const margin = 36;
  const fecha = new Date().toLocaleString();
  const titulo = meta.titulo || 'Reporte de alumnos que rinden';
  const subtitulo = [
    meta.curso ? `Curso: ${meta.curso}` : null,
    meta.anio ? `Año: ${meta.anio}` : null,
    meta.materia ? `Materia: ${meta.materia}` : null,
    meta.condicion && meta.condicion !== 'TODAS' ? `Condición: ${meta.condicion}` : null,
  ].filter(Boolean).join('  |  ');

  doc.setFontSize(14);
  doc.text(titulo, margin, 28);
  doc.setFontSize(10);
  if (subtitulo) doc.text(subtitulo, margin, 44);
  doc.setFontSize(8);
  doc.text(`Generado: ${fecha}`, margin, 60);

  const autoTable = (headers, rows, opts = {}) => {
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 16 : 76,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [240, 240, 240] },
      ...opts,
    });
  };

  if (vista === 'plano' || vista === 'materia') {
    // para materia exportamos en plano igualmente
    autoTable(planoHeaders, planoRowsFromFilas(filas));
  } else if (vista === 'alumno') {
    // Secciones por alumno
  (gruposAlumno || []).forEach((a) => {
      // si no es el primero y no entra en la página, autoTable hace salto
      const header = `Alumno: ${`${a.apellido || ''} ${a.nombre || ''}`.trim()}${a.dni ? ` (DNI ${a.dni})` : ''}`;
      doc.setFontSize(11);
      const startY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 18 : 76;
      // añadir salto si estamos muy abajo
      if (startY > doc.internal.pageSize.getHeight() - 120) {
        doc.addPage();
      }
      const y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 18 : 76;
      doc.text(header, margin, y);
      const rows = (a.materias || []).map(m => [
        m.nombre ?? '', m.e1 ?? '', m.e2 ?? '', m.pg ?? '', m.co ?? '', m.ex ?? '', m.condicion ?? ''
      ]);
      doc.autoTable({
        head: [['Materia', 'E1', 'E2', 'PG', 'CO', 'EX', 'Condición']],
        body: rows,
        startY: y + 8,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [240, 240, 240] },
      });
    });
  }

  doc.save((meta.filename || 'reporte_rinden') + '.pdf');
}
