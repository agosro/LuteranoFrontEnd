import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext.jsx';
import { listarCursos } from '../Services/CursoService.js';
import { listarMateriasDeCurso } from '../Services/MateriaCursoService.js';
import { listarAulas } from '../Services/AulaService.js';
import { listarTurnos } from '../Services/TurnoExamenService.js';
import { crearMesa, listarMesasPorCurso, eliminarMesa, finalizarMesa, actualizarMesa, obtenerMesa, agregarConvocados, quitarConvocado, cargarNotasFinales } from '../Services/MesaExamenService.js';
import { obtenerActaPorMesa, generarActa, actualizarActa, eliminarActa } from '../Services/ActaExamenService.js';
import { Container, Row, Col, Card, Form, Button, Table, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import Paginacion from '../Components/Botones/Paginacion.jsx';
import { useNavigate } from 'react-router-dom';
import Breadcrumbs from '../Components/Botones/Breadcrumbs.jsx';
import BackButton from '../Components/Botones/BackButton.jsx';
import { toast } from 'react-toastify';
import { listarDocentesDisponibles, listarDocentesAsignados, asignarDocentes } from '../Services/MesaExamenDocenteService.js';
import { useCicloIdOrWarn } from '../Context/useCicloIdOrWarn.js';

export default function Mesas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = user?.token;
  const { cicloNombre } = useCicloIdOrWarn();
  const cicloYear = useMemo(() => {
    const n = parseInt(String(cicloNombre), 10);
    return Number.isFinite(n) ? n : new Date().getFullYear();
  }, [cicloNombre]);
  const [cursos, setCursos] = useState([]);
  // Materias dinámicas según el curso en contexto (creación / edición / convocados)
  const [materias, setMaterias] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [turnos, setTurnos] = useState([]);

  const [mesas, setMesas] = useState([]);
  // Nuevo flujo de búsqueda
  const [alcance, setAlcance] = useState('ALL'); // 'ALL' | 'CURSO'
  const [cursoBusquedaId, setCursoBusquedaId] = useState(''); // usado cuando alcance==='CURSO'
  const [tablaFiltroEstado, setTablaFiltroEstado] = useState('');
  const [tablaFiltroMateriaSel, setTablaFiltroMateriaSel] = useState(''); // nombre exacto
  const [tablaMateriaOpciones, setTablaMateriaOpciones] = useState([]); // array de nombres
  const [tablaFiltroTurno, setTablaFiltroTurno] = useState(''); // nombre exacto de turno
  const [filtrosVisibles, setFiltrosVisibles] = useState(false);
  const buscarBtnRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: null, text: '' });
  const [hasSearched, setHasSearched] = useState(false);
  // Paginación
  const [pagina, setPagina] = useState(1);
  const pageSize = 10;

  // Estado antiguo de creación inline eliminado; nuevo modal de creación:
  const [showCrearMesa, setShowCrearMesa] = useState(false);
  const [crearMesaForm, setCrearMesaForm] = useState({ anio: '', cursoId: '', materiaCursoId: '', turnoId: '', fecha: '', aulaId: '' });
  const [turnosPorAnio, setTurnosPorAnio] = useState(new Map()); // anio -> turnos
  const [crearMesaLoading, setCrearMesaLoading] = useState(false);
  const [crearMesaError, setCrearMesaError] = useState('');

  // Estado para modales
  const [showConv, setShowConv] = useState(false);
  const [showNotas, setShowNotas] = useState(false);
  const [mesaSel, setMesaSel] = useState(null);
  // Eliminado flujo de convocatoria en esta vista (se gestiona en página dedicada)
  const [alumnosCurso] = useState([]);
  const [seleccionConvocados, setSeleccionConvocados] = useState(new Set());
  const [notasEdit, setNotasEdit] = useState({});
  const [showEditMesa, setShowEditMesa] = useState(false);
  const [editMesaForm, setEditMesaForm] = useState({ id: null, materiaCursoId: '', fecha: '', aulaId: '' });
  const [showActa, setShowActa] = useState(false);
  const [acta, setActa] = useState(null);
  const [actaForm, setActaForm] = useState({ id: null, numeroActa: '', observaciones: '' });
  const [showDelMesa, setShowDelMesa] = useState(false);
  const [delMesa, setDelMesa] = useState(null);
  const [delMesaLoading, setDelMesaLoading] = useState(false);
  const [delMesaError, setDelMesaError] = useState('');
  // Docentes modal
  const [showDocentes, setShowDocentes] = useState(false);
  const [docentesAsignados, setDocentesAsignados] = useState([]);
  const [docentesDisponibles, setDocentesDisponibles] = useState([]);
  const [docentesSeleccionados, setDocentesSeleccionados] = useState(new Set());

  // Helpers de rol (tolera prefijo ROLE_)
  // hasRole ya no requerido en esta vista (permisos manejados vía rutas y página de gestión)
  // hasAnyRole ya no usado en acciones directas aquí

  useEffect(() => {
    (async () => {
      try {
        const [c, a, t] = await Promise.all([
          listarCursos(token),
          listarAulas(token),
          listarTurnos(token, cicloYear),
        ]);
        setCursos(c);
        setAulas(a);
        setTurnos(t);
        setTurnosPorAnio(prev => new Map(prev).set(String(cicloYear), t));
      } catch (e) {
        setMsg({ type: 'danger', text: e.message });
        toast.error(e.message);
      }
    })();
  }, [token, cicloYear]);

  // Ya no existe cursoId global; materias se cargan on-demand según el curso seleccionado en el modal o el curso de la mesa editada.

  const buscarMesas = async () => {
    setLoading(true);
    setMsg({ type: null, text: '' });
    try {
      if (alcance === 'ALL') {
        const all = [];
        for (const c of cursos) {
          try {
            const resp = await listarMesasPorCurso(token, c.id, { anio: cicloYear });
            resp.forEach(r => all.push({ ...r, curso: c }));
          } catch { /* ignorar error curso */ }
        }
        setMesas(all);
        // Opciones de materia: todas las presentes en el resultado
        const nombres = Array.from(new Set(all.map(m => String(m.materiaNombre || '').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es'));
        setTablaMateriaOpciones(nombres);
  setFiltrosVisibles(true);
  setHasSearched(true);
        setPagina(1);
      } else if (alcance === 'CURSO') {
        if (!cursoBusquedaId) {
          toast.warn('Seleccioná un curso para buscar');
          setMesas([]);
          setTablaMateriaOpciones([]);
          setFiltrosVisibles(false);
          setHasSearched(false);
          setPagina(1);
        } else {
          const c = cursos.find(x => Number(x.id) === Number(cursoBusquedaId));
          const resp = await listarMesasPorCurso(token, cursoBusquedaId, { anio: cicloYear });
            const enr = c ? resp.map(r => ({ ...r, curso: c })) : resp;
            setMesas(enr);
            try {
              // Cargar materias del curso para el combo de filtro
              const mats = await listarMateriasDeCurso(token, cursoBusquedaId);
              const nombres = Array.from(new Set(mats.map(mt => String(mt.nombreMateria || '').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es'));
              setTablaMateriaOpciones(nombres);
            } catch { setTablaMateriaOpciones([]); }
            setFiltrosVisibles(true);
            setHasSearched(true);
            setPagina(1);
        }
      }
      setTablaFiltroEstado('');
      setTablaFiltroMateriaSel('');
      if (buscarBtnRef.current) buscarBtnRef.current.blur();
    } catch (e) {
      setMsg({ type: 'danger', text: e.message });
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const refreshMesas = async () => {
    if (alcance === 'ALL') return buscarMesas();
    if (alcance === 'CURSO' && cursoBusquedaId) return buscarMesas();
    // Si no hay búsqueda activa, no hace nada.
  };

  const submitCrearMesa = async () => {
    setCrearMesaError('');
    if (!crearMesaForm.cursoId || !crearMesaForm.materiaCursoId || !crearMesaForm.turnoId || !crearMesaForm.fecha) {
      setCrearMesaError('Completá Curso, Materia, Turno y Fecha');
      toast.error('Completá Curso, Materia, Turno y Fecha');
      return;
    }
    try {
      setCrearMesaLoading(true);
      const payload = {
        materiaCursoId: Number(crearMesaForm.materiaCursoId),
        turnoId: Number(crearMesaForm.turnoId),
        fecha: crearMesaForm.fecha,
      };
      if (crearMesaForm.aulaId) payload.aulaId = Number(crearMesaForm.aulaId);
      await crearMesa(token, payload);
      await refreshMesas();
      toast.success('Mesa creada');
      setShowCrearMesa(false);
      setCrearMesaForm({ cursoId: '', materiaCursoId: '', turnoId: '', fecha: '', aulaId: '' });
    } catch (e) {
      setCrearMesaError(e.message || 'No se pudo crear la mesa');
      toast.error(e.message);
    } finally { setCrearMesaLoading(false); }
  };

  // Eliminación ahora se realiza mediante modal de confirmación

  const onFinalizar = async (m) => {
    if (!window.confirm('¿Finalizar mesa? Esto impedirá futuras ediciones.')) return;
  try {
    await finalizarMesa(token, m.id);
    await refreshMesas();
    toast.success('Mesa finalizada');
  } catch (e) { setMsg({ type: 'danger', text: e.message }); toast.error(e.message); }
  };

  const materiaNombrePorId = useMemo(() => {
    const map = new Map();
    materias.forEach(mt => map.set(mt.materiaCursoId || mt.id, mt.nombreMateria));
    return map;
  }, [materias]);

  const aulaNombrePorId = useMemo(() => {
    const map = new Map();
    aulas.forEach(a => map.set(a.id, a.nombre || a.id));
    return map;
  }, [aulas]);

  const fmtDate = (iso) => {
    if (!iso) return '-';
    const [y,m,d] = String(iso).split('-');
    if (!y || !m || !d) return iso;
    return `${d.padStart(2,'0')}-${m.padStart(2,'0')}-${y}`;
  };

  const parseLocalDate = (s) => {
    if (!s) return null;
    const [y, m, d] = String(s).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const turnoPorFecha = useCallback((isoFecha) => {
    if (!isoFecha || !Array.isArray(turnos) || !turnos.length) return '-';
    const f = parseLocalDate(isoFecha);
    if (!f) return '-';
    const hit = turnos.find(t => {
      const d1 = parseLocalDate(t.fechaInicio);
      const d2 = parseLocalDate(t.fechaFin);
      return d1 && d2 && f >= d1 && f <= d2;
    });
    return hit ? hit.nombre : '-';
  }, [turnos]);

  const mesasFiltradas = useMemo(() => {
    return mesas
      .filter(m => !tablaFiltroEstado || m.estado === tablaFiltroEstado)
      .filter(m => !tablaFiltroMateriaSel || String(m.materiaNombre || materiaNombrePorId.get(m.materiaCursoId) || '').trim() === tablaFiltroMateriaSel)
      .filter(m => !tablaFiltroTurno || (m.turnoNombre || turnoPorFecha(m.fecha) || '').trim() === tablaFiltroTurno);
  }, [mesas, tablaFiltroEstado, tablaFiltroMateriaSel, tablaFiltroTurno, materiaNombrePorId, turnoPorFecha]);
  const totalPaginas = Math.max(1, Math.ceil(mesasFiltradas.length / pageSize));
  const items = mesasFiltradas.slice((pagina - 1) * pageSize, pagina * pageSize);
  const onPaginaChange = (p) => setPagina(Math.max(1, Math.min(totalPaginas, p)));

  return (
    <Container className="py-4">
      <div className="mb-3">
        <Breadcrumbs />
        <div className="mt-2"><BackButton /></div>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-4">Mesas de examen</h3>

          {msg.type && (
            <Row className="mb-3">
              <Col>
                <Alert variant={msg.type} onClose={()=>setMsg({type:null,text:''})} dismissible>
                  {msg.text}
                </Alert>
              </Col>
            </Row>
          )}

          {/* Aviso arriba del selector (solo ALL) */}
          {alcance === 'ALL' && (
            <div className="mb-2">
              <Alert variant="info" className="py-2 mb-0">
                Mostrando solo mesas del año {cicloYear}. Para ver años anteriores, usá el botón "Historial".
              </Alert>
            </div>
          )}

          {/* Fila de alcance y acciones */}
          <Row className="mb-3 g-2 align-items-end">
            <Col md={8}>
              <Row className="g-2">
                <Col sm={6} md={4}>
                  <Form.Group>
                    <Form.Label>Alcance</Form.Label>
                    <Form.Select value={alcance} onChange={(e)=> setAlcance(e.target.value)}>
                      <option value="ALL">Todas</option>
                      <option value="CURSO">Por curso</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                {alcance === 'CURSO' && (
                  <Col sm={6} md={4}>
                    <Form.Group>
                      <Form.Label>Curso</Form.Label>
                      <Form.Select value={cursoBusquedaId} onChange={(e)=> setCursoBusquedaId(e.target.value)}>
                        <option value="">-- Seleccionar --</option>
                        {cursos.map(c => <option key={c.id} value={c.id}>{`${c.anio ?? ''}°${c.division ?? ''}`}</option>)}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                )}
                <Col sm="auto" className="d-flex align-items-end">
                  <Button ref={buscarBtnRef} onClick={buscarMesas} variant="primary">Buscar</Button>
                </Col>
              </Row>
            </Col>
            <Col className="text-md-end">
              <Button variant="outline-dark" className="me-2" onClick={()=> navigate('/mesa-de-examen/historial')}>Ver historial</Button>
              <Button variant="success" onClick={()=> { setCrearMesaForm({ anio: String(cicloYear), cursoId: '', materiaCursoId: '', turnoId: '', fecha: '', aulaId: '' }); setCrearMesaError(''); setShowCrearMesa(true); }}>Crear mesa</Button>
            </Col>
          </Row>

          {/* Formulario de creación removido: ahora se usa modal */}

          {/* Filtros de tabla (aparecen luego de Buscar) */}
          {filtrosVisibles && (
            <Row className="g-3 mb-3">
              <Col md={3} sm={6} xs={12}>
                <Form.Group>
                  <Form.Label>Estado</Form.Label>
                  <Form.Select value={tablaFiltroEstado} onChange={(e)=> { setTablaFiltroEstado(e.target.value); setPagina(1); }}>
                    <option value="">Todos</option>
                    <option value="CREADA">Creada</option>
                    <option value="FINALIZADA">Finalizada</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3} sm={6} xs={12}>
                <Form.Group>
                  <Form.Label>Materia</Form.Label>
                  <Form.Select value={tablaFiltroMateriaSel} onChange={(e)=> { setTablaFiltroMateriaSel(e.target.value); setPagina(1); }}>
                    <option value="">Todas</option>
                    {tablaMateriaOpciones.map(n => <option key={n} value={n}>{n}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3} sm={6} xs={12}>
                <Form.Group>
                  <Form.Label>Turno</Form.Label>
                  <Form.Select value={tablaFiltroTurno} onChange={(e)=> { setTablaFiltroTurno(e.target.value); setPagina(1); }}>
                    <option value="">Todos</option>
                    {turnos.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md="auto" className="d-flex align-items-end">
                <Button variant="secondary" onClick={()=>{ setTablaFiltroEstado(''); setTablaFiltroMateriaSel(''); setTablaFiltroTurno(''); setPagina(1); }}>Limpiar filtros</Button>
              </Col>
            </Row>
          )}

          {/* Listado (solo después de buscar) */}
          {hasSearched && (loading ? (
            <div className="p-3"><Spinner animation="border" /></div>
          ) : (
            <>
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Materia</th>
                  <th>Turno</th>
                  <th>Aula</th>
                  <th>Estado</th>
                  <th>Convocados</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                  {items.map(m => {
                  const tieneAlumnos = Array.isArray(m.alumnos) && m.alumnos.length > 0;
                  const notasCompletas = tieneAlumnos && (m.alumnos.every(a => a.notaFinal !== null && a.notaFinal !== undefined));
                  const puedeActa = m.estado === 'FINALIZADA' && tieneAlumnos && notasCompletas;
                  const hint = m.estado !== 'FINALIZADA'
                    ? 'La mesa debe estar FINALIZADA'
                    : !tieneAlumnos
                      ? 'La mesa no tiene convocados'
                      : !notasCompletas
                        ? 'Faltan notas finales en algunos alumnos'
                        : '';
                  return (
                    <tr key={m.id}>
                      <td>{fmtDate(m.fecha)}</td>
                      <td>{m.materiaNombre || materiaNombrePorId.get(m.materiaCursoId) || '-'}</td>
                      <td>{m.turnoNombre || turnoPorFecha(m.fecha) || '-'}</td>
                      <td>{aulaNombrePorId.get(m.aulaId) || '-'}</td>
                      <td>
                        {m.estado === 'FINALIZADA' ? <Badge bg="secondary">Finalizada</Badge> : <Badge bg="success">Creada</Badge>}
                      </td>
                      <td>{Array.isArray(m.alumnos) ? m.alumnos.length : 0}</td>
                      <td className="text-end">
                        <Button size="sm" variant="outline-primary" className="me-2" onClick={()=> navigate(`/mesa-de-examen/${m.id}/gestionar`)}>Gestionar</Button>
                        <Button size="sm" variant="outline-dark" className="me-2" title={hint} onClick={async ()=>{
                          if (!puedeActa) {
                            toast.warn(hint || 'No es posible generar/ver el acta aún');
                            return;
                          }
                          setMesaSel(m);
                          try {
                            let a = null;
                            try {
                              a = await obtenerActaPorMesa(token, m.id);
                            } catch {
                              a = await generarActa(token, { mesaId: m.id });
                            }
                            setActa(a);
                            setActaForm({ id: a.id, numeroActa: a.numeroActa || '', observaciones: a.observaciones || '' });
                            setShowActa(true);
                          } catch (e) {
                            toast.error(e.message);
                          }
                        }} disabled={!puedeActa}>Acta</Button>
                        <Button size="sm" variant="outline-success" className="me-2" onClick={()=>onFinalizar(m)} disabled={m.estado==='FINALIZADA'}>Finalizar</Button>
                        <Button size="sm" variant="outline-danger" onClick={()=>{ setDelMesa(m); setDelMesaError(''); setShowDelMesa(true); }} disabled={m.estado==='FINALIZADA'}>Eliminar</Button>
                      </td>
                    </tr>
                  );
                })}
                {mesasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">No hay mesas para este curso</td>
                  </tr>
                )}
              </tbody>
            </Table>
            {mesasFiltradas.length > 0 && (
              <div className="mt-3">
                <Paginacion paginaActual={pagina} totalPaginas={totalPaginas} onPaginaChange={onPaginaChange} />
              </div>
            )}
            </>
          ))}
        </Card.Body>
      </Card>
      {/* Modal Docentes */}
      <Modal show={showDocentes} onHide={()=>setShowDocentes(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Docentes de la mesa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!mesaSel ? (
            <Spinner animation="border" />
          ) : (
            <>
              <div className="mb-3">
                <strong>Asignados</strong>
                <ul className="mb-0">
                  {docentesAsignados.length ? docentesAsignados.map(d => (
                    <li key={d.id}>{d.apellido} {d.nombre}</li>
                  )) : (<li className="text-muted">(ninguno)</li>)}
                </ul>
              </div>
              <div>
                <Form.Label>Disponibles</Form.Label>
                <div className="border rounded" style={{maxHeight:240, overflowY:'auto'}}>
                  <Table hover responsive className="mb-0">
                    <thead><tr><th style={{width:48}}></th><th>Apellido</th><th>Nombre</th></tr></thead>
                    <tbody>
                      {docentesDisponibles.map(d => {
                        const id = Number(d.id);
                        const checked = docentesSeleccionados.has(id);
                        return (
                          <tr key={id}>
                            <td>
                              <Form.Check type="checkbox" checked={checked} onChange={(e)=>{
                                const next = new Set(docentesSeleccionados);
                                if (e.target.checked) next.add(id); else next.delete(id);
                                setDocentesSeleccionados(next);
                              }}/>
                            </td>
                            <td>{d.apellido}</td>
                            <td>{d.nombre}</td>
                          </tr>
                        );
                      })}
                      {docentesDisponibles.length===0 && (
                        <tr><td colSpan={3} className="text-center py-3 text-muted">No hay docentes disponibles</td></tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>setShowDocentes(false)}>Cerrar</Button>
          <Button variant="primary" disabled={!mesaSel || docentesSeleccionados.size!==3} onClick={async ()=>{
            try {
              const ids = Array.from(docentesSeleccionados);
              await asignarDocentes(token, mesaSel.id, ids);
              const [asig, disp] = await Promise.all([
                listarDocentesAsignados(token, mesaSel.id),
                listarDocentesDisponibles(token, mesaSel.id),
              ]);
              setDocentesAsignados(asig);
              setDocentesDisponibles(disp);
              setDocentesSeleccionados(new Set());
              toast.success('Docentes asignados');
              // Refrescar listado según búsqueda activa
              await refreshMesas();
            } catch (e) { toast.error(e.message); }
          }}>Asignar</Button>
        </Modal.Footer>
      </Modal>
      {/* Modal Convocados */}
      <Modal show={showConv} onHide={()=>setShowConv(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Convocados {mesaSel? `- ${mesaSel.materiaNombre || ''}`: ''}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!mesaSel ? <Spinner animation="border"/> : (
            <>
              <p className="text-muted mb-2">Seleccioná los alumnos del curso que estarán convocados a esta mesa.</p>
              <div className="border rounded" style={{ maxHeight: 360, overflowY: 'auto' }}>
                <Table hover responsive className="mb-0">
                  <thead>
                    <tr>
                      <th style={{width: 48}}></th>
                      <th>DNI</th>
                      <th>Apellido</th>
                      <th>Nombre</th>
                      <th>Condición</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumnosCurso.map(al => {
                      const id = Number(al.id ?? al.alumnoId);
                      const checked = seleccionConvocados.has(id);
                      return (
                        <tr key={id}>
                          <td>
                            <Form.Check type="checkbox" checked={checked} onChange={(e)=>{
                              const next = new Set(seleccionConvocados);
                              if (e.target.checked) next.add(id); else next.delete(id);
                              setSeleccionConvocados(next);
                            }}/>
                          </td>
                          <td>{al.dni}</td>
                          <td>{al.apellido}</td>
                          <td>{al.nombre}</td>
                          <td>{(al.condicion ?? '').toString()}</td>
                        </tr>
                      );
                    })}
                    {alumnosCurso.length===0 && (
                      <tr><td colSpan={4} className="text-center py-3 text-muted">No hay alumnos para este curso</td></tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>setShowConv(false)}>Cerrar</Button>
          <Button variant="primary" disabled={!mesaSel} onClick={async ()=>{
            try {
              // Leer estado actual del servidor antes de calcular difs
              const mesaActual = await obtenerMesa(token, mesaSel.id);
              const actuales = new Set((mesaActual?.alumnos||[]).map(a=>Number(a.alumnoId)));
              const aAgregar = Array.from(seleccionConvocados).filter(id => !actuales.has(id));
              if (aAgregar.length) await agregarConvocados(token, mesaSel.id, aAgregar);
              // Calcular a quitar: los que estaban y ya no están seleccionados
              const aQuitar = Array.from(actuales).filter(id => !seleccionConvocados.has(id));
              if (aQuitar.length) {
                for (const id of aQuitar) {
                  await quitarConvocado(token, mesaSel.id, id);
                }
              }
              // Refrescar mesa y listado para asegurar contador correcto
              const mesaRefrescada = await obtenerMesa(token, mesaSel.id);
              setMesaSel(mesaRefrescada);
              await refreshMesas();
              setShowConv(false);
              toast.success('Convocados actualizados');
            } catch (e) {
              toast.error(e.message);
            }
          }}>Guardar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Eliminar Mesa */}
      <Modal show={showDelMesa} onHide={()=>setShowDelMesa(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Eliminar mesa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!delMesa ? (
            <Spinner animation="border" />
          ) : (
            <>
              {delMesaError && (<Alert variant="danger" className="mb-3">{delMesaError}</Alert>)}
              <p>¿Confirmás eliminar la mesa de <strong>{delMesa.materiaNombre || materiaNombrePorId.get(delMesa.materiaCursoId) || 'Materia'}</strong>?</p>
              <p className="mb-0 text-muted">Fecha: {fmtDate(delMesa.fecha)} — Aula: {aulaNombrePorId.get(delMesa.aulaId) || '-'}</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>setShowDelMesa(false)} disabled={delMesaLoading}>Cancelar</Button>
          <Button variant="danger" disabled={!delMesa || delMesaLoading} onClick={async ()=>{
            try {
              setDelMesaLoading(true);
              await eliminarMesa(token, delMesa.id);
              await refreshMesas();
              toast.success('Mesa eliminada');
              setShowDelMesa(false);
              setDelMesa(null);
              setDelMesaError('');
            } catch (e) {
              setDelMesaError(e.message || 'No se pudo eliminar la mesa');
            }
            finally { setDelMesaLoading(false); }
          }}>Eliminar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Notas */}
      <Modal show={showNotas} onHide={()=>setShowNotas(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Notas finales {mesaSel? `- ${mesaSel.materiaNombre || ''}`: ''}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!mesaSel ? <Spinner animation="border"/> : (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>DNI</th>
                  <th>Apellido</th>
                  <th>Nombre</th>
                  <th style={{width:120}}>Nota (0-10)</th>
                </tr>
              </thead>
              <tbody>
                {(mesaSel.alumnos||[]).map(a => (
                  <tr key={a.alumnoId}>
                    <td>{a.dni}</td>
                    <td>{a.apellido}</td>
                    <td>{a.nombre}</td>
                    <td>
                      <Form.Control type="number" min={0} max={10} value={notasEdit[a.alumnoId] ?? ''}
                        disabled={mesaSel?.estado === 'FINALIZADA'}
                        onChange={(e)=>{
                          const val = e.target.value === '' ? '' : Math.max(0, Math.min(10, Number(e.target.value)));
                          setNotasEdit(v=>({...v, [a.alumnoId]: val}));
                        }}/>
                    </td>
                  </tr>
                ))}
                {(!mesaSel.alumnos || mesaSel.alumnos.length===0) && (
                  <tr><td colSpan={4} className="text-center py-3 text-muted">No hay convocados</td></tr>
                )}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>setShowNotas(false)}>Cerrar</Button>
          <Button variant="primary" disabled={!mesaSel || mesaSel?.estado === 'FINALIZADA' || !(mesaSel.alumnos&&mesaSel.alumnos.length)} onClick={async ()=>{
            try {
              // Construir mapa alumnoId->nota (solo números válidos o null)
              const payload = {};
              (mesaSel.alumnos||[]).forEach(a => {
                const v = notasEdit[a.alumnoId];
                if (v === '' || v === undefined) return;
                payload[a.alumnoId] = Number(v);
              });
              await cargarNotasFinales(token, mesaSel.id, payload);
              await refreshMesas();
              setShowNotas(false);
              toast.success('Notas guardadas');
            } catch (e) {
              toast.error(e.message);
            }
          }}>Guardar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Editar Mesa */}
      <Modal show={showEditMesa} onHide={()=>setShowEditMesa(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Editar mesa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Materia</Form.Label>
                  <Form.Select value={editMesaForm.materiaCursoId} onChange={(e)=>setEditMesaForm(v=>({...v, materiaCursoId: e.target.value}))}>
                    <option value="">-- Seleccionar --</option>
                    {materias.map(mt => (
                      <option key={mt.materiaCursoId} value={mt.materiaCursoId}>{mt.nombreMateria}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Fecha</Form.Label>
                  <Form.Control type="date" value={editMesaForm.fecha} onChange={(e)=>setEditMesaForm(v=>({...v, fecha: e.target.value}))} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Aula</Form.Label>
                  <Form.Select value={editMesaForm.aulaId} onChange={(e)=>setEditMesaForm(v=>({...v, aulaId: e.target.value}))}>
                    <option value="">-- Sin aula --</option>
                    {aulas.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre || a.id}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>
          <div className="mt-2 text-muted" style={{fontSize:'.9rem'}}>
            Nota: no se edita el turno desde aquí. Si cambiás la fecha, debe estar dentro del rango del turno de la mesa.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>setShowEditMesa(false)}>Cancelar</Button>
          <Button variant="primary" onClick={async ()=>{
            try {
              if (!editMesaForm.id) return;
              const payload = { id: editMesaForm.id };
              if (editMesaForm.fecha) payload.fecha = editMesaForm.fecha;
              if (editMesaForm.materiaCursoId) payload.materiaCursoId = Number(editMesaForm.materiaCursoId);
              if (editMesaForm.aulaId) payload.aulaId = Number(editMesaForm.aulaId);
              await actualizarMesa(token, payload);
              await refreshMesas();
              toast.success('Mesa actualizada');
              setShowEditMesa(false);
            } catch (e) {
              toast.error(e.message);
            }
          }}>Guardar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Acta */}
      <Modal show={showActa} onHide={()=>setShowActa(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Acta de examen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!acta ? (
            <Spinner animation="border" />
          ) : (
            <Form>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Número de acta</Form.Label>
                    <Form.Control type="text" value={actaForm.numeroActa} onChange={(e)=>setActaForm(v=>({...v, numeroActa: e.target.value}))} />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Observaciones</Form.Label>
                    <Form.Control as="textarea" rows={3} value={actaForm.observaciones} onChange={(e)=>setActaForm(v=>({...v, observaciones: e.target.value}))} />
                  </Form.Group>
                </Col>
              </Row>
              <div className="mt-3 text-muted" style={{fontSize:'.9rem'}}>
                Mesa: {mesaSel?.materiaNombre || materiaNombrePorId.get(mesaSel?.materiaCursoId)} — Fecha: {fmtDate(mesaSel?.fecha)}
              </div>
            </Form>
          )}
        </Modal.Body>
  <Modal.Footer>
          {acta && (
            <>
              <Button variant="primary" onClick={async ()=>{
                try {
                  await actualizarActa(token, { id: actaForm.id, numeroActa: actaForm.numeroActa, observaciones: actaForm.observaciones });
                  // refrescar acta
                  const a = await obtenerActaPorMesa(token, mesaSel.id);
                  setActa(a);
                  toast.success('Acta actualizada');
                  setShowActa(false);
                } catch (e) {
                  toast.error(e.message);
                }
              }}>Guardar</Button>
              <Button variant="outline-danger" onClick={async ()=>{
                if (!window.confirm('¿Eliminar acta? Esta acción no elimina la mesa.')) return;
                try {
                  await eliminarActa(token, acta.id);
                  setActa(null);
                  setShowActa(false);
                  toast.success('Acta eliminada');
                } catch (e) {
                  toast.error(e.message);
                }
              }}>Eliminar acta</Button>
            </>
          )}
        </Modal.Footer>
      </Modal>
      {/* Modal Crear Mesa */}
      <Modal show={showCrearMesa} onHide={()=> setShowCrearMesa(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Crear mesa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {crearMesaError && (<Alert variant="danger" className="mb-3">{crearMesaError}</Alert>)}
          <Form>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Año</Form.Label>
                  <Form.Control type="number" min={2000} max={2100} value={crearMesaForm.anio}
                    onChange={async (e)=> {
                      const anioNuevo = String(e.target.value);
                      setCrearMesaForm(f=>({...f, anio: anioNuevo, turnoId: '' }));
                      if (!anioNuevo) return;
                      if (!turnosPorAnio.has(anioNuevo)) {
                        try {
                          const ts = await listarTurnos(token, Number(anioNuevo));
                          setTurnosPorAnio(prev => new Map(prev).set(anioNuevo, ts));
                        } catch { /* ignore */ }
                      }
                    }} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Curso</Form.Label>
                  <Form.Select value={crearMesaForm.cursoId} onChange={async (e)=>{
                    const v = e.target.value;
                    setCrearMesaForm(f=>({...f, cursoId: v, materiaCursoId: '' }));
                    if (v) {
                      try { const mats = await listarMateriasDeCurso(token, v); setMaterias(mats); } catch { setMaterias([]); }
                    } else { setMaterias([]); }
                  }}>
                    <option value="">-- Seleccionar --</option>
                    {cursos.map(c => <option key={c.id} value={c.id}>{`${c.anio ?? ''}°${c.division ?? ''}`}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Materia</Form.Label>
                  <Form.Select value={crearMesaForm.materiaCursoId} onChange={(e)=> setCrearMesaForm(f=>({...f, materiaCursoId: e.target.value}))} disabled={!crearMesaForm.cursoId}>
                    <option value="">-- Seleccionar --</option>
                    {materias.map(m => <option key={m.materiaCursoId} value={m.materiaCursoId}>{m.nombreMateria}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Turno</Form.Label>
                  <Form.Select value={crearMesaForm.turnoId} onChange={(e)=> setCrearMesaForm(f=>({...f, turnoId: e.target.value}))}>
                    <option value="">-- Seleccionar --</option>
                    {(turnosPorAnio.get(String(crearMesaForm.anio)) || turnos).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Fecha</Form.Label>
                  <Form.Control type="date" value={crearMesaForm.fecha} onChange={(e)=> setCrearMesaForm(f=>({...f, fecha: e.target.value}))} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Aula (opcional)</Form.Label>
                  <Form.Select value={crearMesaForm.aulaId} onChange={(e)=> setCrearMesaForm(f=>({...f, aulaId: e.target.value}))}>
                    <option value="">-- Sin aula --</option>
                    {aulas.map(a => <option key={a.id} value={a.id}>{a.nombre || a.id}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>
          <div className="mt-2 text-muted" style={{fontSize: '.85rem'}}>
            Debe seleccionar un Curso y su Materia asociada. La Fecha debe caer dentro del rango del Turno.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=> setShowCrearMesa(false)} disabled={crearMesaLoading}>Cancelar</Button>
          <Button variant="success" onClick={submitCrearMesa} disabled={crearMesaLoading}>Guardar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}