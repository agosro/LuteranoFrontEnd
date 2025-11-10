import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { buscarTutores } from '../../Services/TutorService';
import { asignarMultiplesTutores, desasignarMultiplesTutores } from '../../Services/TutorAlumnoService';
import { toast } from 'react-toastify';

/* ModalAsignarTutores
   Props:
   - show: boolean
   - onClose: fn
   - alumno: objeto alumno (requiere id y tutores[])
   - token: auth token
   - onAlumnoActualizado: fn(newAlumno) => void (para refrescar lista padres)
*/
export default function ModalAsignarTutores({ show, onClose, alumno, token, onAlumnoActualizado }) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);
  const [operando, setOperando] = useState(false);

  const tutoresAsignados = useMemo(() => alumno?.tutores || [], [alumno]);
  const asignadosIds = useMemo(() => new Set(tutoresAsignados.map(t => t.id)), [tutoresAsignados]);

  const ejecutarBusqueda = useCallback(async (q) => {
    if (!token) return;
    if (q.trim().length < 2) { setResultados([]); return; }
    setLoadingBusqueda(true);
    try {
      const lista = await buscarTutores(q, token);
      // Filtrar ya asignados
      setResultados(lista.filter(t => !asignadosIds.has(t.id)));
    } catch (e) {
      console.error(e);
      setResultados([]);
    } finally {
      setLoadingBusqueda(false);
    }
  }, [token, asignadosIds]);

  useEffect(() => {
    if (!show) return;
    const id = setTimeout(() => ejecutarBusqueda(query), 350);
    return () => clearTimeout(id);
  }, [query, ejecutarBusqueda, show]);

  if (!show) return null;
  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Gestionar tutores de {alumno?.nombre} {alumno?.apellido}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {/* Tutores asignados */}
            <div className="mb-3">
              <label className="form-label fw-bold">Tutores actuales</label>
              {tutoresAsignados.length === 0 && <div className="text-muted">Sin tutores asignados</div>}
              <div className="d-flex flex-wrap gap-2">
                {tutoresAsignados.map(t => (
                  <div key={t.id} className="badge bg-primary d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
                    <span>{t.apellido} {t.nombre}</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-light"
                      disabled={operando}
                      onClick={async () => {
                        try {
                          setOperando(true);
                          const resp = await desasignarMultiplesTutores(token, alumno.id, [t.id]);
                          if (resp.success) {
                            toast.success(resp.message || 'Tutor desasignado');
                            onAlumnoActualizado(resp.alumno);
                          } else {
                            toast.warn(resp.message || 'Respuesta desconocida');
                          }
                        } catch (e) {
                          toast.error(e.message || 'Error desasignando tutor');
                        } finally {
                          setOperando(false);
                        }
                      }}
                      style={{ lineHeight: '1', padding: '0 6px' }}
                    >&times;</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Buscador */}
            <div className="mb-3">
              <label className="form-label">Buscar tutores (mínimo 2 caracteres por nombre, apellido o DNI)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej: Perez, 30123456, Ana"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>

            {/* Resultados */}
            <div>
              <label className="form-label fw-bold">Resultados</label>
              {loadingBusqueda && <p>Buscando...</p>}
              {!loadingBusqueda && resultados.length === 0 && query.trim().length >= 2 && <p>No se encontraron tutores disponibles</p>}
              <ul className="list-group mb-2">
                {resultados.map(t => (
                  <li key={t.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{t.apellido} {t.nombre}</strong> {t.dni && <span className="text-muted">(DNI: {t.dni})</span>}
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      disabled={operando}
                      onClick={async () => {
                        try {
                          setOperando(true);
                          const resp = await asignarMultiplesTutores(token, alumno.id, [t.id]);
                          if (resp.success) {
                            toast.success(resp.message || 'Tutor asignado');
                            onAlumnoActualizado(resp.alumno);
                            setQuery(''); // limpiar para evitar duplicar
                            setResultados([]);
                          } else {
                            toast.warn(resp.message || 'Respuesta desconocida');
                          }
                        } catch (e) {
                          toast.error(e.message || 'Error asignando tutor');
                        } finally {
                          setOperando(false);
                        }
                      }}
                    >Añadir</button>
                  </li>
                ))}
              </ul>
              <p className="small text-muted">Se muestran máximo 20 coincidencias. Para más precisión, afina la búsqueda.</p>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={operando}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
