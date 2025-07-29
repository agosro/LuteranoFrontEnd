import React from 'react';

export default function VistaEntidad({ datos, campos }) {
  if (!datos) return <p>No hay datos para mostrar.</p>;

  return (
    <div>
      {campos.map(({ name, label, render }) => (
        <p key={name}>
          <strong>{label}:</strong>{' '}
          {render ? render(datos) : (datos[name] !== undefined ? datos[name] : '-')}
        </p>
      ))}
    </div>
  );
}

