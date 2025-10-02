import React from 'react';

export default function OrdenableHeader({ columnas }) {
  return (
    <>
      <th>ID</th>
      {columnas.map(({ key, label }) => (
        <th key={key}>{label}</th>
      ))}
      <th>Acciones</th>
    </>
  );
}