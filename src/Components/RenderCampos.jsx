import React from "react";
import { isoToDisplay } from "../utils/fechas";

export default function RenderCampos({ campos, data }) {
  const formatValue = (campo, valor) => {
    if (valor === null || valor === undefined) return "-";

    // Si tiene un render definido en el campo
    if (campo.render) {
      return campo.render(valor);
    }

    // Si es un array
    if (Array.isArray(valor)) {
      return valor.length
        ? valor.map((item, i) =>
            <span key={i}>
              {item.nombre || item}
              {i < valor.length - 1 ? ", " : ""}
            </span>
          )
        : "-";
    }

    // Si es un objeto (ej. tutor o cursoActual)
    if (typeof valor === "object") {
      if (valor.nombre && valor.apellido) return `${valor.nombre} ${valor.apellido}`;
      if (valor.nombre) return valor.nombre;
      if (valor.label) return valor.label;
      if (valor.id) return `ID: ${valor.id}`;
      return JSON.stringify(valor); // fallback
    }

    // Si es fecha
    if (campo.type === "date") {
      return isoToDisplay(valor);
    }

    // Si es select
    if (campo.type === "select" && campo.opciones) {
      return campo.opciones.find((op) => op.value === valor)?.label || "-";
    }

    // Caso simple (string, número, boolean)
    return valor.toString();
  };

  return (
    <div className="card p-3 shadow-sm">
      <div className="row">
        {campos.map((campo) => (
          <div className="col-md-6 mb-3" key={campo.name}>
            <label className="form-label fw-bold">{campo.label}:</label>
            <p className="form-control bg-light">
              {formatValue(campo, data[campo.name])}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
