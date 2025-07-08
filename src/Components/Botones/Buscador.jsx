import React from 'react';

export default function Buscador({ valor, onCambio, placeholder = "Buscar..." }) {
  return (
      <input
        type="text"
        className="form-control"
        placeholder={placeholder}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
      />
  );
}