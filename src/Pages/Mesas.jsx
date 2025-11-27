import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext.jsx';
import { listarCursos } from '../Services/CursoService.js';
import { listarMateriasDeCurso } from '../Services/MateriaCursoService.js';
import { listarAulas } from '../Services/AulaService.js';
import { listarTurnos } from '../Services/TurnoExamenService.js';
import { crearMesa, listarMesasPorCurso, eliminarMesa, finalizarMesa, crearMesasMasivas } from '../Services/MesaExamenService.js';
import { obtenerActaPorMesa, generarActa, actualizarActa, eliminarActa } from '../Services/ActaExamenService.js';
import { Container, Row, Col, Card, Form, Button, Table, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import Paginacion from '../Components/Botones/Paginacion.jsx';
import ConfirmarAccion from '../Components/Modals/ConfirmarAccion.jsx';
import { useNavigate } from 'react-router-dom';
import Breadcrumbs from '../Components/Botones/Breadcrumbs.jsx';
import BackButton from '../Components/Botones/BackButton.jsx';
import { toast } from 'react-toastify';
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
  const [tablaFiltroTipo, setTablaFiltroTipo] = useState(''); // tipo de mesa
  const [filtrosVisibles, setFiltrosVisibles] = useState(false);
  const buscarBtnRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: null, text: '' });
  const [hasSearched, setHasSearched] = useState(false);
  // Paginación
  const [pagina, setPagina] = useState(1);
  const pageSize = 10;
  const [showCrearMesa, setShowCrearMesa] = useState(false);
  const [crearMesaForm, setCrearMesaForm] = useState({ anio: String(cicloYear), cursoId: '', materiaCursoId: '', turnoId: '', fecha: '', aulaId: '', horaInicio: '', horaFin: '', tipoMesa: 'EXAMEN' });
  const [turnosPorAnio, setTurnosPorAnio] = useState(new Map()); // anio -> turnos
  const [crearMesaLoading, setCrearMesaLoading] = useState(false);
  const [crearMesaError, setCrearMesaError] = useState('');

  // Creación masiva
  const [showCrearMasiva, setShowCrearMasiva] = useState(false);
  const [crearMasivaForm, setCrearMasivaForm] = useState({ turnoId: '', fecha: '', tipoMesa: 'EXAMEN', cursoIds: [], materiaIds: [] });
  const [crearMasivaAnio, setCrearMasivaAnio] = useState(cicloYear);
  const [crearMasivaLoading, setCrearMasivaLoading] = useState(false);
  const [crearMasivaError, setCrearMasivaError] = useState('');
  const [crearMasivaResultado, setCrearMasivaResultado] = useState(null);
  const [materiasMasivas, setMateriasMasivas] = useState([]); // materias de los cursos seleccionados

  // Estado para modales que aún se usan
  const [mesaSel, setMesaSel] = useState(null);
  const [showActa, setShowActa] = useState(false);
  const [acta, setActa] = useState(null);
  const [actaForm, setActaForm] = useState({ id: null, numeroActa: '', observaciones: '' });
  const [showDelMesa, setShowDelMesa] = useState(false);
  const [delMesa, setDelMesa] = useState(null);
  const [delMesaLoading, setDelMesaLoading] = useState(false);
  const [delMesaError, setDelMesaError] = useState('');
  const [showFinalizarMesa, setShowFinalizarMesa] = useState(false);
  const [mesaAFinalizar, setMesaAFinalizar] = useState(null);
  const [finalizarLoading, setFinalizarLoading] = useState(false);

  // Selección múltiple
  const [mesasSeleccionadas, setMesasSeleccionadas] = useState(new Set());
  const [showConfirmarDelMasivo, setShowConfirmarDelMasivo] = useState(false);
  const [delMasivoCargando, setDelMasivoCargando] = useState(false);
  const [showConfirmarFinalizarMasivo, setShowConfirmarFinalizarMasivo] = useState(false);
  const [finalizarMasivoCargando, setFinalizarMasivoCargando] = useState(false);
  const [showConfirmarActaMasivo, setShowConfirmarActaMasivo] = useState(false);
  const [actaMasivoCargando, setActaMasivoCargando] = useState(false);

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
    
    // Escuchar mensajes de la ventana hijo (GestionFechasMesas)
    const handleMessage = (event) => {
      if (event.origin === window.location.origin && event.data.action === 'reload-mesas') {
        console.log('Recibido mensaje para recargar mesas - reconsultando datos');
        // Re-fetch in place (sin F5) para mantener filtros y estado
        buscarMesas();
        toast.success('Mesas actualizadas');
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, cicloYear]);

  // Re-inicializar el formulario de crear mesa cuando se abre el modal
  const abrirCrearMesa = () => {
    setCrearMesaForm({ anio: String(cicloYear), cursoId: '', materiaCursoId: '', turnoId: '', fecha: '', aulaId: '', horaInicio: '', horaFin: '', tipoMesa: 'EXAMEN' });
    setShowCrearMesa(true);
  };

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
        tipoMesa: crearMesaForm.tipoMesa,
      };
      if (crearMesaForm.aulaId) payload.aulaId = Number(crearMesaForm.aulaId);
      if (crearMesaForm.horaInicio) payload.horaInicio = crearMesaForm.horaInicio;
      if (crearMesaForm.horaFin) payload.horaFin = crearMesaForm.horaFin;
      await crearMesa(token, payload);
      await refreshMesas();
      toast.success('Mesa creada');
      setShowCrearMesa(false);
      setCrearMesaForm({ anio: String(cicloYear), cursoId: '', materiaCursoId: '', turnoId: '', fecha: '', aulaId: '', horaInicio: '', horaFin: '', tipoMesa: 'EXAMEN' });
    } catch (e) {
      setCrearMesaError(e.message || 'No se pudo crear la mesa');
      toast.error(e.message);
    } finally { setCrearMesaLoading(false); }
  };

  const submitCrearMasiva = async () => {
    setCrearMasivaError('');
    setCrearMasivaResultado(null);
    if (!crearMasivaForm.turnoId || crearMasivaForm.cursoIds.length === 0) {
      setCrearMasivaError('Completá Turno y seleccioná al menos un curso');
      toast.error('Completá Turno y seleccioná al menos un curso');
      return;
    }
    try {
      setCrearMasivaLoading(true);
      const payload = {
        turnoId: Number(crearMasivaForm.turnoId),
        cursoIds: crearMasivaForm.cursoIds.map(Number),
        tipoMesa: crearMasivaForm.tipoMesa,
      };
      // Solo enviar materiaIds si se seleccionaron materias específicas
      if (crearMasivaForm.materiaIds.length > 0) {
        payload.materiaIds = crearMasivaForm.materiaIds.map(Number);
      }
      // Solo enviar fecha si se ingresó
      if (crearMasivaForm.fecha) {
        payload.fechaMesa = crearMasivaForm.fecha;
      }
      const mesasCreadas = await crearMesasMasivas(token, payload);
      await refreshMesas();
      setCrearMasivaResultado({ success: true, cantidad: mesasCreadas.length });
      toast.success(`Se crearon ${mesasCreadas.length} mesas de examen`);
      setTimeout(() => {
        setShowCrearMasiva(false);
        setCrearMasivaForm({ turnoId: '', fecha: '', tipoMesa: 'EXAMEN', cursoIds: [], materiaIds: [] });
        setCrearMasivaResultado(null);
        setMateriasMasivas([]);
      }, 2000);
    } catch (e) {
      setCrearMasivaError(e.message || 'No se pudieron crear las mesas');
      toast.error(e.message);
    } finally { setCrearMasivaLoading(false); }
  };

  // Eliminación ahora se realiza mediante modal de confirmación

  const onFinalizar = (m) => {
    setMesaAFinalizar(m);
    setShowFinalizarMesa(true);
  };

  const confirmarFinalizar = async () => {
    if (!mesaAFinalizar) return;
    try {
      setFinalizarLoading(true);
      await finalizarMesa(token, mesaAFinalizar.id);
      await refreshMesas();
      toast.success('Mesa finalizada');
      setShowFinalizarMesa(false);
      setMesaAFinalizar(null);
    } catch (e) {
      setMsg({ type: 'danger', text: e.message });
      toast.error(e.message);
    } finally {
      setFinalizarLoading(false);
    }
  };

  // Acciones masivas
  const confirmarFinalizarMasivo = async () => {
    try {
      setFinalizarMasivoCargando(true);
      let exitosas = 0;
      let fallidas = 0;
      for (const mesaId of mesasSeleccionadas) {
        try {
          await finalizarMesa(token, mesaId);
          exitosas++;
        } catch {
          fallidas++;
        }
      }
      await refreshMesas();
      if (fallidas === 0) {
        toast.success(`Se finalizaron ${exitosas} mesa(s)`);
      } else {
        toast.warning(`${exitosas} exitosas, ${fallidas} fallidas`);
      }
      setShowConfirmarFinalizarMasivo(false);
      setMesasSeleccionadas(new Set());
    } catch (e) {
      toast.error(e.message);
    } finally {
      setFinalizarMasivoCargando(false);
    }
  };

  const confirmarDelMasivo = async () => {
    try {
      setDelMasivoCargando(true);
      let exitosas = 0;
      let fallidas = 0;
      for (const mesaId of mesasSeleccionadas) {
        try {
          await eliminarMesa(token, mesaId);
          exitosas++;
        } catch {
          fallidas++;
        }
      }
      await refreshMesas();
      if (fallidas === 0) {
        toast.success(`Se eliminaron ${exitosas} mesa(s)`);
      } else {
        toast.warning(`${exitosas} exitosas, ${fallidas} fallidas`);
      }
      setShowConfirmarDelMasivo(false);
      setMesasSeleccionadas(new Set());
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDelMasivoCargando(false);
    }
  };

  const confirmarActaMasivo = async () => {
    try {
      setActaMasivoCargando(true);
      let exitosas = 0;
      let fallidas = 0;
      for (const mesaId of mesasSeleccionadas) {
        const mesa = mesas.find(m => m.id === mesaId);
        if (!mesa) continue;
        
        const tieneAlumnos = Array.isArray(mesa.alumnos) && mesa.alumnos.length > 0;
        const notasCompletas = tieneAlumnos && (mesa.alumnos.every(a => a.notaFinal !== null && a.notaFinal !== undefined));
        
        if (mesa.estado === 'FINALIZADA' && tieneAlumnos && notasCompletas) {
          try {
            try {
              await obtenerActaPorMesa(token, mesaId);
            } catch {
              await generarActa(token, { mesaId: mesaId });
            }
            exitosas++;
          } catch {
            fallidas++;
          }
        } else {
          fallidas++;
        }
      }
      await refreshMesas();
      if (fallidas === 0) {
        toast.success(`Se generaron/obtuvieron ${exitosas} acta(s)`);
      } else {
        toast.warning(`${exitosas} exitosas, ${fallidas} no pudieron generarse`);
      }
      setShowConfirmarActaMasivo(false);
      setMesasSeleccionadas(new Set());
    } catch (e) {
      toast.error(e.message);
    } finally {
      setActaMasivoCargando(false);
    }
  };

  // Abrir gestión de fechas en nueva pestaña
  const abrirGestionFechas = () => {
    // Filtrar solo mesas en estado CREADA (excluir finalizadas)
    const mesasCreadas = mesasFiltradas.filter(m => m.estado === 'CREADA');
    
    if (mesasCreadas.length === 0) {
      toast.warn('No hay mesas en estado CREADA para gestionar. Las mesas finalizadas no se pueden modificar.');
      return;
    }
    
    const url = '/mesa-de-examen/gestion-fechas';
    const newWindow = window.open(url, '_blank');
    if (newWindow) {
      // Esperar a que la ventana cargue y enviar solo las mesas CREADAS
      newWindow.addEventListener('load', () => {
        newWindow.postMessage({ mesas: mesasCreadas }, window.location.origin);
      });
    }
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
      .filter(m => !tablaFiltroTurno || (m.turnoNombre || turnoPorFecha(m.fecha) || '').trim() === tablaFiltroTurno)
      .filter(m => !tablaFiltroTipo || (m.tipoMesa || 'EXAMEN') === tablaFiltroTipo);
  }, [mesas, tablaFiltroEstado, tablaFiltroMateriaSel, tablaFiltroTurno, tablaFiltroTipo, materiaNombrePorId, turnoPorFecha]);
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
                Mostrando solo mesas del Ciclo Lectivo {cicloYear}. Para ver ciclos anteriores, usá el botón "Historial".
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
              <Row className="g-2">
                <Col sm="auto">
                  <Button variant="outline-dark" onClick={()=> navigate('/mesa-de-examen/historial')}>Ver historial</Button>
                </Col>
                {hasSearched && mesasFiltradas.length > 0 && (
                  <Col sm="auto">
                    <Button variant="warning" onClick={abrirGestionFechas}>
                      Gestión de Fechas
                    </Button>
                  </Col>
                )}
                <Col sm="auto">
                  <Button variant="info" onClick={()=> { setCrearMasivaAnio(cicloYear); setCrearMasivaForm({ turnoId: '', fecha: '', tipoMesa: 'EXAMEN', cursoIds: [], materiaIds: [] }); setCrearMasivaError(''); setCrearMasivaResultado(null); setMateriasMasivas([]); setShowCrearMasiva(true); }}>Crear masiva</Button>
                </Col>
                <Col sm="auto">
                  <Button variant="success" onClick={abrirCrearMesa}>Crear mesa</Button>
                </Col>
              </Row>
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
              <Col md={3} sm={6} xs={12}>
                <Form.Group>
                  <Form.Label>Tipo</Form.Label>
                  <Form.Select value={tablaFiltroTipo} onChange={(e)=> { setTablaFiltroTipo(e.target.value); setPagina(1); }}>
                    <option value="">Todos</option>
                    <option value="EXAMEN">Examen final</option>
                    <option value="COLOQUIO">Coloquio</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md="auto" className="d-flex align-items-end">
                <Button variant="secondary" onClick={()=>{ setTablaFiltroEstado(''); setTablaFiltroMateriaSel(''); setTablaFiltroTurno(''); setTablaFiltroTipo(''); setPagina(1); }}>Limpiar filtros</Button>
              </Col>
            </Row>
          )}

          {/* Acciones masivas */}
          {hasSearched && mesasSeleccionadas.size > 0 && (
            <Row className="mb-3 p-3 bg-light border rounded">
              <Col>
                <span className="me-3"><strong>{mesasSeleccionadas.size} mesa(s) seleccionada(s)</strong></span>
                <Button size="sm" variant="outline-primary" className="me-2" onClick={()=> setMesasSeleccionadas(new Set())}>Deseleccionar todo</Button>
                <Button size="sm" variant="warning" className="me-2" onClick={()=> setShowConfirmarFinalizarMasivo(true)} disabled={finalizarMasivoCargando}>Finalizar</Button>
                <Button size="sm" variant="info" className="me-2" onClick={()=> setShowConfirmarActaMasivo(true)} disabled={actaMasivoCargando}>Generar actas</Button>
                <Button size="sm" variant="danger" onClick={()=> setShowConfirmarDelMasivo(true)} disabled={delMasivoCargando}>Eliminar</Button>
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
                  <th style={{width: '40px'}}><Form.Check type="checkbox" checked={mesasSeleccionadas.size === items.length && items.length > 0} onChange={(e)=> {
                    if (e.target.checked) {
                      setMesasSeleccionadas(new Set(items.map(m => m.id)));
                    } else {
                      setMesasSeleccionadas(new Set());
                    }
                  }} /></th>
                  <th>Fecha</th>
                  <th>Materia</th>
                  <th>Curso</th>
                  <th>Turno</th>
                  <th>Aula</th>
                  <th>Tipo</th>
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
                  // Obtener nombre del curso
                  let cursoStr = '-';
                  if (m.curso) {
                    const c = m.curso;
                    cursoStr = `${c.anio ?? ''}°${c.division ?? ''}`.trim();
                  }
                  return (
                    <tr key={m.id}>
                      <td><Form.Check type="checkbox" checked={mesasSeleccionadas.has(m.id)} onChange={(e)=> {
                        const newSet = new Set(mesasSeleccionadas);
                        if (e.target.checked) {
                          newSet.add(m.id);
                        } else {
                          newSet.delete(m.id);
                        }
                        setMesasSeleccionadas(newSet);
                      }} /></td>
                      <td>{fmtDate(m.fecha)}</td>
                      <td>{m.materiaNombre || materiaNombrePorId.get(m.materiaCursoId) || '-'}</td>
                      <td>{cursoStr}</td>
                      <td>{m.turnoNombre || turnoPorFecha(m.fecha) || '-'}</td>
                      <td>{aulaNombrePorId.get(m.aulaId) || '-'}</td>
                      <td>
                        <Badge bg={m.tipoMesa === 'COLOQUIO' ? 'info' : 'primary'}>
                          {m.tipoMesa === 'COLOQUIO' ? 'Coloquio' : 'Examen Final'}
                        </Badge>
                      </td>
                      <td>
                        {m.estado === 'FINALIZADA' ? <Badge bg="secondary">Finalizada</Badge> : <Badge bg="success">Creada</Badge>}
                      </td>
                      <td>{Array.isArray(m.alumnos) ? m.alumnos.length : 0}</td>
                      <td className="text-end">
                        <Button size="sm" variant="outline-primary" className="me-2" onClick={()=> window.open(`/mesa-de-examen/${m.id}/gestionar`, '_blank')}>Gestionar</Button>
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
                    <td colSpan={10} className="text-center py-4 text-muted">No hay mesas para este curso</td>
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
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Hora inicio (opcional)</Form.Label>
                  <Form.Control type="time" value={crearMesaForm.horaInicio || ''} onChange={(e)=> setCrearMesaForm(f=>({...f, horaInicio: e.target.value}))} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Hora fin (opcional)</Form.Label>
                  <Form.Control type="time" value={crearMesaForm.horaFin || ''} onChange={(e)=> setCrearMesaForm(f=>({...f, horaFin: e.target.value}))} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Tipo de mesa</Form.Label>
                  <Form.Select value={crearMesaForm.tipoMesa} onChange={(e)=> setCrearMesaForm(f=>({...f, tipoMesa: e.target.value}))}>
                    <option value="EXAMEN">Examen final</option>
                    <option value="COLOQUIO">Coloquio</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    {crearMesaForm.tipoMesa === 'COLOQUIO' 
                      ? 'Coloquio: 1 docente (debe ser de la materia)' 
                      : 'Examen final: 3 docentes (al menos uno de la materia)'}
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Form>
          <div className="mt-2 text-muted" style={{fontSize: '.85rem'}}>
            Debe seleccionar un Curso y su Materia asociada. La Fecha debe caer dentro del rango del Turno. Los campos de Hora, Aula y detalles se pueden editar después en la gestión de la mesa.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=> setShowCrearMesa(false)} disabled={crearMesaLoading}>Cancelar</Button>
          <Button variant="success" onClick={submitCrearMesa} disabled={crearMesaLoading}>Guardar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Confirmar Finalizar Mesa */}
      <ConfirmarAccion
        show={showFinalizarMesa}
        title="Finalizar mesa de examen"
        message={
          mesaAFinalizar ? (
            <div>
              <p>¿Confirmás finalizar esta mesa? <strong>Esta acción no se puede deshacer</strong> e impedirá futuras ediciones.</p>
              <div className="text-muted" style={{ fontSize: '.9rem' }}>
                <strong>Materia:</strong> {mesaAFinalizar.materiaNombre || materiaNombrePorId.get(mesaAFinalizar.materiaCursoId) || '-'}<br />
                <strong>Fecha:</strong> {fmtDate(mesaAFinalizar.fecha)}<br />
                <strong>Aula:</strong> {aulaNombrePorId.get(mesaAFinalizar.aulaId) || '-'}
              </div>
            </div>
          ) : null
        }
        confirmText="Finalizar"
        cancelText="Cancelar"
        confirmBtnClass="btn-warning"
        loading={finalizarLoading}
        onConfirm={confirmarFinalizar}
        onClose={() => {
          setShowFinalizarMesa(false);
          setMesaAFinalizar(null);
        }}
      />

      {/* Modal Crear Mesas Masivas */}
      <Modal show={showCrearMasiva} onHide={()=> setShowCrearMasiva(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Crear mesas de examen masivas</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {crearMasivaError && (<Alert variant="danger" className="mb-3">{crearMasivaError}</Alert>)}
          {crearMasivaResultado?.success && (<Alert variant="success" className="mb-3">Se crearon {crearMasivaResultado.cantidad} mesas exitosamente</Alert>)}
          <Form>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Año</Form.Label>
                  <Form.Control type="number" min={2000} max={2100} value={crearMasivaAnio}
                    onChange={async (e)=> {
                      const anioNuevo = Number(e.target.value);
                      setCrearMasivaAnio(anioNuevo);
                      setCrearMasivaForm(f=>({...f, turnoId: '' }));
                      if (!anioNuevo) return;
                      if (!turnosPorAnio.has(String(anioNuevo))) {
                        try {
                          const ts = await listarTurnos(token, anioNuevo);
                          setTurnosPorAnio(prev => new Map(prev).set(String(anioNuevo), ts));
                        } catch { /* ignore */ }
                      }
                    }} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Turno *</Form.Label>
                  <Form.Select value={crearMasivaForm.turnoId} onChange={(e)=> setCrearMasivaForm(f=>({...f, turnoId: e.target.value}))}>
                    <option value="">-- Seleccionar --</option>
                    {(turnosPorAnio.get(String(crearMasivaAnio)) || []).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    El año lectivo se determina automáticamente según el turno
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Tipo de mesa</Form.Label>
                  <Form.Select value={crearMasivaForm.tipoMesa} onChange={(e)=> setCrearMasivaForm(f=>({...f, tipoMesa: e.target.value}))}>
                    <option value="EXAMEN">Examen final</option>
                    <option value="COLOQUIO">Coloquio</option>
                  </Form.Select>
                  <Form.Text className="text-muted d-block mt-1">
                    {crearMasivaForm.tipoMesa === 'COLOQUIO' 
                      ? 'Coloquio: solo alumnos con condición de coloquio del año actual' 
                      : 'Examen final: alumnos regulares y previas de años anteriores'}
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Cursos *</Form.Label>
                  <div className="border rounded p-2" style={{maxHeight: '200px', overflowY: 'auto'}}>
                    <div className="mb-2">
                      <Button 
                        size="sm" 
                        variant="outline-secondary" 
                        onClick={() => {
                          if (crearMasivaForm.cursoIds.length === cursos.length) {
                            setCrearMasivaForm(f=>({...f, cursoIds: [], materiaIds: []}));
                            setMateriasMasivas([]);
                          } else {
                            setCrearMasivaForm(f=>({...f, cursoIds: cursos.map(c => String(c.id))}));
                            // Cargar materias de todos los cursos
                            (async () => {
                              try {
                                const todasMaterias = [];
                                for (const c of cursos) {
                                  const mats = await listarMateriasDeCurso(token, c.id);
                                  todasMaterias.push(...mats);
                                }
                                setMateriasMasivas(todasMaterias);
                              } catch { setMateriasMasivas([]); }
                            })();
                          }
                        }}
                      >
                        {crearMasivaForm.cursoIds.length === cursos.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                      </Button>
                    </div>
                    {cursos.map(c => (
                      <Form.Check 
                        key={c.id}
                        type="checkbox"
                        id={`curso-${c.id}`}
                        label={`${c.anio ?? ''}° ${c.division ?? ''}`}
                        checked={crearMasivaForm.cursoIds.includes(String(c.id))}
                        onChange={async (e) => {
                          const id = String(c.id);
                          const checked = e.target.checked;
                          
                          setCrearMasivaForm(f => ({
                            ...f,
                            cursoIds: checked 
                              ? [...f.cursoIds, id]
                              : f.cursoIds.filter(x => x !== id)
                          }));
                          
                          // Cargar/descargar materias del curso
                          if (checked) {
                            try {
                              const mats = await listarMateriasDeCurso(token, id);
                              setMateriasMasivas(prev => [...prev, ...mats]);
                            } catch { /* ignore */ }
                          } else {
                            // Remover materias de este curso
                            setMateriasMasivas(prev => prev.filter(m => String(m.cursoId) !== id));
                            // Limpiar materias seleccionadas de este curso
                            setCrearMasivaForm(f => ({
                              ...f,
                              materiaIds: f.materiaIds.filter(mId => {
                                const materia = materiasMasivas.find(m => String(m.materiaId) === mId);
                                return !materia || String(materia.cursoId) !== id;
                              })
                            }));
                          }
                        }}
                      />
                    ))}
                  </div>
                  <Form.Text className="text-muted d-block mt-1">
                    Seleccionados: {crearMasivaForm.cursoIds.length > 0 ? crearMasivaForm.cursoIds.length + ' curso(s)' : 'ninguno'}
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Materias (opcional)</Form.Label>
                  <div className="border rounded p-2" style={{maxHeight: '150px', overflowY: 'auto'}}>
                    {crearMasivaForm.cursoIds.length === 0 ? (
                      <div className="text-muted text-center py-2">Primero seleccioná al menos un curso</div>
                    ) : (
                      <>
                        <div className="mb-2">
                          <Button 
                            size="sm" 
                            variant="outline-secondary"
                            onClick={() => {
                              const uniqueMaterias = Array.from(new Set(materiasMasivas.map(m => JSON.stringify({id: m.materiaId, nombre: m.nombreMateria}))))
                                .map(str => JSON.parse(str));
                              if (crearMasivaForm.materiaIds.length === uniqueMaterias.length) {
                                setCrearMasivaForm(f=>({...f, materiaIds: []}));
                              } else {
                                setCrearMasivaForm(f=>({...f, materiaIds: uniqueMaterias.map(m => String(m.id))}));
                              }
                            }}
                          >
                            {crearMasivaForm.materiaIds.length > 0 ? 'Deseleccionar todas' : 'Seleccionar todas'}
                          </Button>
                        </div>
                        {Array.from(new Set(materiasMasivas.map(m => JSON.stringify({id: m.materiaId, nombre: m.nombreMateria}))))
                          .map(str => JSON.parse(str))
                          .map(m => (
                            <Form.Check 
                              key={m.id}
                              type="checkbox"
                              id={`materia-${m.id}`}
                              label={m.nombre}
                              checked={crearMasivaForm.materiaIds.includes(String(m.id))}
                              onChange={(e) => {
                                const id = String(m.id);
                                setCrearMasivaForm(f => ({
                                  ...f,
                                  materiaIds: e.target.checked 
                                    ? [...f.materiaIds, id]
                                    : f.materiaIds.filter(x => x !== id)
                                }));
                              }}
                            />
                          ))}
                        {materiasMasivas.length === 0 && (
                          <div className="text-muted text-center py-2">No hay materias para los cursos seleccionados</div>
                        )}
                      </>
                    )}
                  </div>
                  <Form.Text className="text-muted d-block mt-1">
                    {crearMasivaForm.materiaIds.length > 0 
                      ? `Filtrar por: ${crearMasivaForm.materiaIds.length} materia(s)` 
                      : 'Sin filtro: se procesarán todas las materias de los cursos seleccionados'}
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Form>
          <Alert variant="info" className="mt-3 mb-0" style={{fontSize: '.9rem'}}>
            <strong>¿Cómo funciona?</strong>
            <ul className="mb-1 mt-1">
              <li>El sistema consulta el reporte de rinden del año lectivo determinado por el turno</li>
              <li>Solo crea mesas donde haya alumnos que deban rendir según su condición</li>
              <li><strong>Examen final:</strong> incluye alumnos regulares y previas de años anteriores</li>
              <li><strong>Coloquio:</strong> solo alumnos con condición de coloquio del año actual</li>
              <li>Se asigna automáticamente el docente titular de la materia</li>
              <li>Para exámenes finales, las divisiones de la misma materia comparten jurado, fecha y horario</li>
            </ul>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=> setShowCrearMasiva(false)} disabled={crearMasivaLoading}>Cancelar</Button>
          <Button variant="primary" onClick={submitCrearMasiva} disabled={crearMasivaLoading}>
            {crearMasivaLoading ? <><Spinner animation="border" size="sm" className="me-2" />Creando...</> : 'Crear mesas'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Confirmar Eliminar Masivo */}
      <Modal show={showConfirmarDelMasivo} onHide={()=>setShowConfirmarDelMasivo(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Eliminar mesas</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Confirmás eliminar las <strong>{mesasSeleccionadas.size} mesa(s)</strong> seleccionadas?</p>
          <p className="text-muted mb-0">Esta acción no se puede deshacer.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>setShowConfirmarDelMasivo(false)} disabled={delMasivoCargando}>Cancelar</Button>
          <Button variant="danger" onClick={confirmarDelMasivo} disabled={delMasivoCargando}>
            {delMasivoCargando ? <><Spinner animation="border" size="sm" className="me-2" />Eliminando...</> : 'Eliminar'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Confirmar Finalizar Masivo */}
      <Modal show={showConfirmarFinalizarMasivo} onHide={()=>setShowConfirmarFinalizarMasivo(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Finalizar mesas</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Confirmás finalizar las <strong>{mesasSeleccionadas.size} mesa(s)</strong> seleccionadas?</p>
          <p className="text-muted mb-0"><strong>Esta acción no se puede deshacer</strong> e impedirá futuras ediciones.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>setShowConfirmarFinalizarMasivo(false)} disabled={finalizarMasivoCargando}>Cancelar</Button>
          <Button variant="warning" onClick={confirmarFinalizarMasivo} disabled={finalizarMasivoCargando}>
            {finalizarMasivoCargando ? <><Spinner animation="border" size="sm" className="me-2" />Finalizando...</> : 'Finalizar'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Confirmar Generar Actas Masivo */}
      <Modal show={showConfirmarActaMasivo} onHide={()=>setShowConfirmarActaMasivo(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Generar actas</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Generarás actas para las <strong>{mesasSeleccionadas.size} mesa(s)</strong> seleccionadas?</p>
          <p className="text-muted mb-0">Solo se generarán actas para mesas finalizadas con notas completas.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>setShowConfirmarActaMasivo(false)} disabled={actaMasivoCargando}>Cancelar</Button>
          <Button variant="info" onClick={confirmarActaMasivo} disabled={actaMasivoCargando}>
            {actaMasivoCargando ? <><Spinner animation="border" size="sm" className="me-2" />Generando...</> : 'Generar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
