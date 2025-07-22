import React from 'react';

export default function VistaEntidad({ datos, campos, titulo, show }) {
  if (!datos) return <p>No hay datos disponibles.</p>;

  // Filtrás campos para no mostrar contraseña
  const camposFiltrados = campos.filter(campo => campo.name !== 'password');
  

  return (
    <div className="container">
      {titulo && <h5 className="mb-3">{titulo}</h5>}
      <table className="table table-bordered table-striped">
        <tbody>
          {camposFiltrados.map((campo) => (
            <tr key={campo.name}>
              <th style={{ width: '30%' }}>{campo.label}</th>
              <td>{datos[campo.name]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}