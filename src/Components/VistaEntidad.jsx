import React from 'react';

export default function VistaEntidad({ datos, campos }) {
  if (!datos) return <p>No hay datos para mostrar.</p>;

  return (
    <div>
      {campos.map(({ name, label, render }) => {
        const valor = datos[name];

        let contenido;
        if (render) {
          contenido = render(datos);
        } else if (Array.isArray(valor)) {
          // Si es una lista (por ejemplo, materias)
          contenido = valor.length
            ? valor.map((item, i) => (
                <span key={i}>
                  {item.nombre || item} {/* mostrar el nombre si es objeto */}
                  {i < valor.length - 1 ? ', ' : ''}
                </span>
              ))
            : '-';
        } else {
          contenido = valor !== undefined && valor !== null ? valor : '-';
        }

        return (
          <p key={name}>
            <strong>{label}:</strong> {contenido}
          </p>
        );
      })}
    </div>
  );
}