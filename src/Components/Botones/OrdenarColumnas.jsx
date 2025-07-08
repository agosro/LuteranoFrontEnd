import React from 'react';

export default function OrdenableHeader({ columnas, orden, onOrdenar }) {
  return (
    <>
      <th
        style={{ cursor: "pointer" }}
        onClick={() => onOrdenar("id")}
      >
        ID {orden.columna === "id" ? (orden.asc ? "▲" : "▼") : ""}
      </th>
      {columnas.map(({ key, label }) => (
        <th
          key={key}
          style={{ cursor: "pointer", userSelect: "none" }}
          onClick={() => onOrdenar(key)}
        >
          {label} {orden.columna === key ? (orden.asc ? "▲" : "▼") : ""}
        </th>
      ))}
      <th>Acciones</th>
    </>
  );
}