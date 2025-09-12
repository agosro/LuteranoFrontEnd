import React from 'react';

export default function VistaEntidad({ datos, campos }) {
  if (!datos) return <p>No hay datos para mostrar.</p>;

  return (
    <div>
      {campos.map(({ name, label, type, render }) => {
        const valor = datos[name];

        let contenido;
        if (render) {
          contenido = render(datos);
        } else if (Array.isArray(valor)) {
          // Si es una lista (por ejemplo, materias)
          contenido = valor.length
            ? valor.map((item, i) => (
                <span key={i}>
                  {item.nombre || item}
                  {i < valor.length - 1 ? ', ' : ''}
                </span>
              ))
            : '-';
        } else if (type === "date" && valor) {
          // 🔥 Formatear fecha
          contenido = new Date(valor).toLocaleDateString("es-AR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
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