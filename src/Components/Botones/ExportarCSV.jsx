import React from 'react';

export default function ExportarCSV({ datos, columnas, nombreArchivo = "export.csv" }) {
  const handleExport = () => {
    if (!datos || datos.length === 0) return;

    // Armar CSV: primera fila con los títulos
    const encabezados = columnas.map(col => col.label);
    const filas = datos.map(item =>
      columnas.map(col => {
        if (col.render) return `"${col.render(item)}"`;
        return `"${item[col.key]}"`;
      }).join(',')
    );

    const csvContent = [encabezados.join(','), ...filas].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button className="btn btn-outline-success" onClick={handleExport}>
      Exportar CSV
    </button>
  );
}