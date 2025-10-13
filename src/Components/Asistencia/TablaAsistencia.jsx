import React from 'react';

function badgeClass(estado) {
  switch (estado) {
    case 'PRESENTE':
      return 'badge text-bg-success';
    case 'AUSENTE':
      return 'badge text-bg-secondary';
    case 'TARDE':
      return 'badge text-bg-warning text-dark';
    case 'JUSTIFICADO':
      return 'badge text-bg-info text-dark';
    case 'CON_LICENCIA':
      return 'badge text-bg-primary';
    default:
      return 'badge text-bg-light text-dark';
  }
}

export default function TablaAsistencia({
  personas = [],
  asistenciaPorId = {},
  presentes = new Set(),
  onTogglePresente,
  onClickEditar,
  disabled = false,
}) {
  const prettyEstado = (estado) => {
    if (estado === 'CON_LICENCIA') return 'CON LICENCIA';
    return estado || '—';
  };
  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>DNI</th>
            <th>Nombre</th>
            <th className="text-center" style={{ width: 110 }}>Presente</th>
            <th>Estado actual</th>
            <th>Observación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {personas.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-muted py-3">No hay registros</td>
            </tr>
          )}
          {personas.map((p) => {
            const asist = asistenciaPorId[p.id] || { estado: '', observacion: '' };
            return (
              <tr key={p.id}>
                <td className="py-2">{p.dni || '-'}</td>
                <td className="py-2">{p.nombre}</td>
                <td className="py-2 text-center">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={!!presentes.has(p.id)}
                    onChange={() => onTogglePresente?.(p.id)}
                  />
                </td>
                <td className="py-2">
                  <span className={badgeClass(asist.estado)}>{prettyEstado(asist.estado)}</span>
                </td>
                <td className="py-2" style={{ minWidth: 240 }}>
                  {asist.observacion ? (
                    <span
                      title={asist.observacion}
                      style={{ maxWidth: 320, display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {asist.observacion}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="py-2">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => onClickEditar?.(p)} disabled={disabled}>
                    Editar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
