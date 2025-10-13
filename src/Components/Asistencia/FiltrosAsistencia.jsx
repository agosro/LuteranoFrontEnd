import React from 'react';

export default function FiltrosAsistencia({
  cursos = [],
  cursoId,
  setCursoId,
  fecha,
  setFecha,
  onMarcarTodosPresentes,
  onLimpiarSeleccion,
  disableAcciones = false,
  mostrarCurso = true,
  etiquetaCurso = 'Curso',
  etiquetaFecha = 'Fecha',
}) {
  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="row g-3 align-items-end">
          {mostrarCurso && (
            <div className="col-sm-4">
              <div className="mb-3">
                <label className="form-label">{etiquetaCurso}</label>
                <select className="form-select" value={cursoId || ''} onChange={(e) => setCursoId(e.target.value)}>
                  <option value="">Seleccione</option>
                  {cursos.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="col-sm-3">
            <div className="mb-3">
              <label className="form-label">{etiquetaFecha}</label>
              <input type="date" className="form-control" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
          <div className={mostrarCurso ? 'col-sm-5' : 'col-sm-9'}>
            <div className="d-flex gap-2 justify-content-sm-end align-items-end flex-wrap">
              <button className="btn btn-outline-success" onClick={onMarcarTodosPresentes} disabled={disableAcciones}>
                Marcar todos PRESENTES
              </button>
              <button className="btn btn-outline-secondary" onClick={onLimpiarSeleccion} disabled={disableAcciones}>
                Limpiar selección
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
