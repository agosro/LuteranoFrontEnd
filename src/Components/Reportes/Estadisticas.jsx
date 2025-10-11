import React from "react";

/**
 * Tira de estadísticas reutilizable.
 *
 * Props admitidas:
 * - items | elementos: Array de objetos con las propiedades:
 *   - label | etiqueta: Texto descriptivo (string)
 *   - value | valor: Valor a mostrar (ReactNode)
 *   - variant | variante: 'default' | 'success' | 'danger' | 'warning'
 *
 * Nota: Se mantienen los nombres en inglés por compatibilidad con usos existentes,
 * pero también se aceptan los alias en español.
 */
export default function Estadisticas({ items = [], elementos }) {
  // Permitir usar 'elementos' como alias de 'items'
  const lista = Array.isArray(elementos) ? elementos : items;

  // Mapea la variante a clases de color de Bootstrap
  const colorTexto = (v) => {
    switch (v) {
      case "success":
        return "text-success";
      case "danger":
        return "text-danger";
      case "warning":
        return "text-warning";
      default:
        return "";
    }
  };

  return (
    <div className="row">
      {lista.map((it, idx) => {
        // Soportar claves en inglés o español
        const etiqueta = it.etiqueta ?? it.label;
        const valor = it.valor ?? it.value;
        const variante = it.variante ?? it.variant;
        return (
          <div key={idx} className="col-6 col-md-3 mb-2">
            <div className="text-muted small">{etiqueta}</div>
            <div className={`fs-5 fw-semibold ${colorTexto(variante)}`}>{valor}</div>
          </div>
        );
      })}
    </div>
  );
}
