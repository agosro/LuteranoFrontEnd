import React from 'react';

export default function ModalEditarAsistencia({
  open,
  persona,
  estado,
  observacion,
  setEstado,
  setObservacion,
  onClose,
  onSave,
  cargando,
  titulo = 'Editar asistencia',
  incluirLicencia = false,
}) {
  if (!open) return null;
  return (
    <div className="modal d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{titulo}</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p className="mb-2"><strong>{persona?.tipo || 'Persona'}:</strong> {persona?.apellido} {persona?.nombre}</p>
            <div className="mb-3">
              <label className="form-label">Estado</label>
              <select className="form-select" value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="TARDE">Tarde</option>
                <option value="JUSTIFICADO">Justificado</option>
                {incluirLicencia && <option value="CON_LICENCIA">Con licencia</option>}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Observación</label>
              <textarea className="form-control" rows={3} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={onSave} disabled={cargando}>
              {cargando ? <span className="spinner-border spinner-border-sm me-2" /> : null}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
