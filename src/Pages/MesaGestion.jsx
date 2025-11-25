import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Table, Spinner, Alert, Badge, Tabs, Tab } from 'react-bootstrap';
import { useAuth } from '../Context/AuthContext.jsx';
import Breadcrumbs from '../Components/Botones/Breadcrumbs.jsx';
import BackButton from '../Components/Botones/BackButton.jsx';
import { toast } from 'react-toastify';
import { obtenerMesa, actualizarMesa, agregarConvocados, quitarConvocado, cargarNotasFinales } from '../Services/MesaExamenService.js';
import { listarMateriasDeCurso } from '../Services/MateriaCursoService.js';
import { obtenerCursoPorId, listarCursos } from '../Services/CursoService.js';
import { listarAulas } from '../Services/AulaService.js';
import { listarDocentesAsignados, listarDocentesDisponibles, asignarDocentes } from '../Services/MesaExamenDocenteService.js';
import { listarRindenPorCurso, listarTodosLosAlumnosPorCurso } from '../Services/ReporteRindeService.js';
import { obtenerAlumnosElegibles } from '../Services/ElegibilidadMesaExamenService.js';
import { listarTurnos } from '../Services/TurnoExamenService.js';

export default function MesaGestion() {
  const { mesaId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.token;

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: null, text: '' });
  const [mesa, setMesa] = useState(null);
  const [curso, setCurso] = useState(null);
  const [turnos, setTurnos] = useState([]);

  // Datos básicos
  const [materias, setMaterias] = useState([]);
  const [aulas, setAulas] = useState([]);
  // ...eliminada línea duplicada, solo queda la declaración con horaInicio y horaFin
    const [datosForm, setDatosForm] = useState({ materiaCursoId: '', fecha: '', horaInicio: '', horaFin: '', aulaId: '', tipoMesa: 'EXAMEN' });
  const [datosSaving, setDatosSaving] = useState(false);

  // Docentes
  const [docAsignados, setDocAsignados] = useState([]);
  const [docDisponibles, setDocDisponibles] = useState([]);
  const [docSeleccionados, setDocSeleccionados] = useState(new Set());
  const [docSaving, setDocSaving] = useState(false);

  // Convocados
  const [elegibles, setElegibles] = useState([]);
  const [convSeleccionados, setConvSeleccionados] = useState(new Set());
  const [convSaving, setConvSaving] = useState(false);
  const [mostrarTodos, setMostrarTodos] = useState(false); // Toggle para mostrar todos vs solo elegibles
  const [filtroCondicion, setFiltroCondicion] = useState(''); // '' | 'COLOQUIO' | 'EXAMEN'

  // Notas
  const [notasEdit, setNotasEdit] = useState({});
  const [notasSaving] = useState(false);

  const fmtDate = (iso) => {
    if (!iso) return '-';
    const [y,m,d] = String(iso).split('-');
    if (!y||!m||!d) return iso;
    return `${d.padStart(2,'0')}-${m.padStart(2,'0')}-${y}`;
  };

  const recargarAlumnos = useCallback(async (mesa, tipoMesaOverride = null) => {
    try {
      if (mostrarTodos) {
        // Modo mostrar todos: lógica anterior
        const anio = new Date().getFullYear();
        const mats = await listarMateriasDeCurso(token, mesa.cursoId);
        const mat = mats.find(mt => Number(mt.materiaCursoId) === Number(mesa.materiaCursoId));
        const materiaId = mat?.materiaId;
        const rep = await listarTodosLosAlumnosPorCurso(token, { cursoId: mesa.cursoId, anio });
        const filas = Array.isArray(rep) ? rep : (Array.isArray(rep?.filas) ? rep.filas : []);
        const filtradas = materiaId ? filas.filter(f => Number(f.materiaId) === Number(materiaId)) : filas;
        const lista = filtradas.map(r => ({ 
          id: Number(r.alumnoId), 
          alumnoId: Number(r.alumnoId), 
          dni: r.dni, 
          apellido: r.apellido, 
          nombre: r.nombre, 
          condicion: r.condicion,
          estadoAcademico: r.estadoAcademico || 'DEBE_RENDIR'
        }));
        setElegibles(lista);
        const actuales = new Set((mesa.alumnos||[]).map(a => Number(a.alumnoId)));
        setConvSeleccionados(actuales);
      } else {
        // Modo elegibles: usar endpoint nuevo
        const lista = await obtenerAlumnosElegibles(token, mesa.id || mesaId);
        setElegibles(lista.map(r => ({
          id: Number(r.alumnoId),
          alumnoId: Number(r.alumnoId),
          apellido: r.apellido,
          nombre: r.nombre,
          condicion: r.condicion,
          dni: r.dni || '',
          estadoAcademico: r.estadoAcademico || 'DEBE_RENDIR'
        })));
        const actuales = new Set((mesa.alumnos||[]).map(a => Number(a.alumnoId)));
        setConvSeleccionados(actuales);
      }
    } catch {
      setElegibles([]);
      setConvSeleccionados(new Set());
    }
  }, [token, mostrarTodos, mesaId]);

  const refreshSinAlumnos = useCallback(async () => {
    try {
      const m = await obtenerMesa(token, mesaId);
      setMesa(m);
      setDatosForm({
        materiaCursoId: m.materiaCursoId || '',
        fecha: m.fecha || '',
        horaInicio: m.horaInicio || '',
        horaFin: m.horaFin || '',
        aulaId: m.aulaId || '',
        tipoMesa: m.tipoMesa || 'EXAMEN'
      });
      const [cursoResp, cursosAll, mats, als, asig, disp] = await Promise.all([
        obtenerCursoPorId(token, m.cursoId),
        listarCursos(token),
        listarMateriasDeCurso(token, m.cursoId),
        listarAulas(token),
        listarDocentesAsignados(token, mesaId),
        listarDocentesDisponibles(token, mesaId),
      ]);
      // Resolver forma del curso (tolerar distintas envolturas del backend)
      let resolved = null;
      const candidates = [cursoResp?.curso, cursoResp?.cursoDto, cursoResp?.cursoDTO, cursoResp];
      for (const c of candidates) { if (c && (c.anio !== undefined || c.division !== undefined)) { resolved = c; break; } }
      if (!resolved && Array.isArray(cursosAll)) {
        const hit = cursosAll.find(x => Number(x.id) === Number(m.cursoId));
        if (hit) resolved = hit;
      }
      setCurso(resolved);
      setMaterias(Array.isArray(mats) ? mats : []);
      setAulas(Array.isArray(als) ? als : []);
      setDocAsignados(Array.isArray(asig) ? asig : []);
      setDocDisponibles(Array.isArray(disp) ? disp : []);

      // Notas
      const initNotas = {};
      (m.alumnos||[]).forEach(a => { initNotas[a.alumnoId] = a.notaFinal ?? ''; });
      setNotasEdit(initNotas);

      try {
        const anio = new Date().getFullYear();
        const ts = await listarTurnos(token, anio);
        setTurnos(Array.isArray(ts) ? ts : []);
      } catch { setTurnos([]); }
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }, [token, mesaId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setMsg({ type: null, text: '' });
    try {
      const m = await obtenerMesa(token, mesaId);
      setMesa(m);
      setDatosForm({
        materiaCursoId: m.materiaCursoId || '',
        fecha: m.fecha || '',
        horaInicio: m.horaInicio || '',
        horaFin: m.horaFin || '',
        aulaId: m.aulaId || '',
        tipoMesa: m.tipoMesa || 'EXAMEN'
      });
      const [cursoResp, cursosAll, mats, als, asig, disp] = await Promise.all([
        obtenerCursoPorId(token, m.cursoId),
        listarCursos(token),
        listarMateriasDeCurso(token, m.cursoId),
        listarAulas(token),
        listarDocentesAsignados(token, mesaId),
        listarDocentesDisponibles(token, mesaId),
      ]);
      // Resolver forma del curso (tolerar distintas envolturas del backend)
      let resolved = null;
      const candidates = [cursoResp?.curso, cursoResp?.cursoDto, cursoResp?.cursoDTO, cursoResp];
      for (const c of candidates) { if (c && (c.anio !== undefined || c.division !== undefined)) { resolved = c; break; } }
      if (!resolved && Array.isArray(cursosAll)) {
        const hit = cursosAll.find(x => Number(x.id) === Number(m.cursoId));
        if (hit) resolved = hit;
      }
      setCurso(resolved);
      setMaterias(mats);
      setAulas(als);
      setDocAsignados(asig);
      setDocDisponibles(disp);
      const pre = new Set(asig.map(d => Number(d.id)));
      setDocSeleccionados(pre);

      // Convocados elegibles por curso/año/materia y turnos del año
      try {
        const [yearStr] = String(m.fecha || '').split('-');
        const anio = yearStr ? Number(yearStr) : new Date().getFullYear();
        const mat = mats.find(mt => Number(mt.materiaCursoId) === Number(m.materiaCursoId));
        const materiaId = mat?.materiaId;
        
        // Usar el servicio correcto según el toggle
        const servicioReporte = mostrarTodos ? listarTodosLosAlumnosPorCurso : listarRindenPorCurso;
        const rep = await servicioReporte(token, { cursoId: m.cursoId, anio });
        const filas = Array.isArray(rep) ? rep : (Array.isArray(rep?.filas) ? rep.filas : []);
        const filtradas = materiaId ? filas.filter(f => Number(f.materiaId) === Number(materiaId)) : filas;
        
        // Si mostrarTodos está activado, no filtrar por condición de mesa
        let filtradasPorTipo = filtradas;
        if (!mostrarTodos) {
          // Filtrar por tipo de mesa solo cuando mostrarTodos está desactivado
          const tipoMesa = m.tipoMesa || 'EXAMEN';
          filtradasPorTipo = tipoMesa === 'COLOQUIO' 
            ? filtradas.filter(f => f.condicion === 'COLOQUIO')
            : filtradas;
        }
        
        const lista = filtradasPorTipo.map(r => ({ 
          id: Number(r.alumnoId), 
          alumnoId: Number(r.alumnoId), 
          dni: r.dni, 
          apellido: r.apellido, 
          nombre: r.nombre, 
          condicion: r.condicion,
          estadoAcademico: r.estadoAcademico || 'DEBE_RENDIR'
        }));
        setElegibles(lista);
        const actuales = new Set((m.alumnos||[]).map(a => Number(a.alumnoId)));
        setConvSeleccionados(actuales);
        try {
          const ts = await listarTurnos(token, anio);
          setTurnos(Array.isArray(ts) ? ts : []);
        } catch { setTurnos([]); }
      } catch {
        setElegibles([]);
        setConvSeleccionados(new Set());
        setTurnos([]);
      }

      // Notas
      const initNotas = {};
      (m.alumnos||[]).forEach(a => { initNotas[a.alumnoId] = a.notaFinal ?? ''; });
      setNotasEdit(initNotas);

    } catch (e) {
      setMsg({ type: 'danger', text: e.message });
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [mesaId, token, mostrarTodos]);

  useEffect(() => { refresh(); }, [refresh]);

  // Recargar alumnos cuando cambie el toggle
  useEffect(() => {
    if (mesa) {
      recargarAlumnos(mesa);
    }
  }, [mostrarTodos, mesa, recargarAlumnos]);

  const guardarDatos = async () => {
    try {
      setDatosSaving(true);
      const payload = { id: mesaId };
      if (datosForm.fecha) payload.fecha = datosForm.fecha;
      if (datosForm.horaInicio) payload.horaInicio = datosForm.horaInicio;
      if (datosForm.horaFin) payload.horaFin = datosForm.horaFin;
      if (datosForm.materiaCursoId) payload.materiaCursoId = Number(datosForm.materiaCursoId);
      if (datosForm.aulaId) payload.aulaId = Number(datosForm.aulaId);
      if (datosForm.tipoMesa) payload.tipoMesa = datosForm.tipoMesa;
      
      const mesaActualizada = await actualizarMesa(token, payload);
      
      // Actualizar inmediatamente el estado con la mesa actualizada
      setMesa(mesaActualizada);
      
      // Si cambió el tipo de mesa, recargar alumnos inmediatamente y luego refresh sin alumnos
      if (payload.tipoMesa) {
        await recargarAlumnos(mesaActualizada, payload.tipoMesa);
        await refreshSinAlumnos();
      } else {
        await refresh();
      }
      
      toast.success('Mesa actualizada');
    } catch (e) {
      toast.error(e.message);
    } finally { setDatosSaving(false); }
  };

  const guardarDocentes = async () => {
    try {
      const tipoMesa = datosForm.tipoMesa || mesa?.tipoMesa || 'EXAMEN';
      const cantidadRequerida = tipoMesa === 'COLOQUIO' ? 1 : 3;
      
      if (docSeleccionados.size !== cantidadRequerida) { 
        const mensaje = tipoMesa === 'COLOQUIO' 
          ? 'Debés seleccionar exactamente 1 docente para un coloquio' 
          : 'Debés seleccionar exactamente 3 docentes para un examen final';
        toast.warn(mensaje); 
        return; 
      }
      
      setDocSaving(true);
      const ids = Array.from(docSeleccionados);
      await asignarDocentes(token, mesaId, ids);
      await refresh();
      toast.success('Docentes actualizados');
    } catch (e) {
      toast.error(e.message);
    } finally { setDocSaving(false); }
  };

  const guardarConvocados = async () => {
    try {
      setConvSaving(true);
      const mesaActual = await obtenerMesa(token, mesaId);
      const actuales = new Set((mesaActual?.alumnos||[]).map(a=>Number(a.alumnoId)));
      const aAgregarIds = Array.from(convSeleccionados).filter(id => !actuales.has(id));
      
      const aAgregar = Array.from(aAgregarIds);
      
      if (aAgregar.length) await agregarConvocados(token, mesaId, aAgregar);
      const aQuitar = Array.from(actuales).filter(id => !convSeleccionados.has(id));
      for (const id of aQuitar) { await quitarConvocado(token, mesaId, id); }
      await refresh();
      toast.success('Convocados actualizados');
    } catch (e) {
      toast.error(e.message);
    } finally { setConvSaving(false); }
  };

  const guardarNotas = async () => {
    try {
      if (!mesa || !mesa.alumnos || mesa.alumnos.length === 0) { toast.warn('No hay convocados'); return; }
      const payload = {};
      (mesa.alumnos||[]).forEach(a => {
        const v = notasEdit[a.alumnoId];
        if (v === '' || v === undefined) return;
        payload[a.alumnoId] = Number(v);
      });
      await cargarNotasFinales(token, mesaId, payload);
      await refresh();
      toast.success('Notas guardadas');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const docentesTabla = useMemo(() => {
    const asignadosIds = new Set(docAsignados.map(d => Number(d.id)));
    // Crear mapa de docentes disponibles para obtener nombreMateria
    const disponiblesMap = new Map(docDisponibles.map(d => [Number(d.id), d]));
    
    const combinados = [
      ...docAsignados.map(d => {
        // Si el docente asignado no tiene nombreMateria, intenta obtenerlo del disponibles
        const docDisp = disponiblesMap.get(Number(d.id));
        return { 
          ...d, 
          nombreMateria: d.nombreMateria || docDisp?.nombreMateria || '-',
          origen: 'ASIGNADO' 
        };
      }),
      ...docDisponibles.filter(d => !asignadosIds.has(Number(d.id))).map(d => ({ ...d, origen: 'DISPONIBLE' })),
    ];
    return combinados;
  }, [docAsignados, docDisponibles]);

  return (
    <Container className="py-4">
      <div className="mb-3">
        <Breadcrumbs />
        <div className="mt-2"><BackButton /></div>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-3">Gestionar Mesa de Examen</h3>
          {mesa && (
            <p className="text-muted mb-3">
              Curso: <strong>{curso && (curso.anio || curso.division) ? `${curso.anio ?? ''}°${curso.division ?? ''}` : (mesa.curso ? `${mesa.curso.anio ?? ''}°${mesa.curso.division ?? ''}` : (mesa.cursoId ? `#${mesa.cursoId}` : '-'))}</strong>
              {' '}— Materia actual: <strong>{mesa.materiaNombre || '-'}</strong>
              {' '}— Fecha: <strong>{fmtDate(mesa.fecha)}</strong>
              {' '}— Horario: <strong>{mesa.horaInicio ? mesa.horaInicio.slice(0,5) : '--:--'} a {mesa.horaFin ? mesa.horaFin.slice(0,5) : '--:--'}</strong>
              {' '}— Turno: <strong>{(() => {
                if (!mesa?.fecha || !turnos.length) return '-';
                const [y,mm,d] = String(mesa.fecha).split('-').map(Number);
                if (!y||!mm||!d) return '-';
                const f = new Date(y,mm-1,d);
                const hit = turnos.find(t => {
                  const [y1,m1,d1] = String(t.fechaInicio||'').split('-').map(Number);
                  const [y2,m2,d2] = String(t.fechaFin||'').split('-').map(Number);
                  if (!y1||!m1||!d1||!y2||!m2||!d2) return false;
                  const dIni = new Date(y1,m1-1,d1);
                  const dFin = new Date(y2,m2-1,d2);
                  return f >= dIni && f <= dFin;
                });
                return hit?.nombre || '-';
              })()}</strong>
              {' '}— Tipo: <Badge bg={(datosForm.tipoMesa || mesa?.tipoMesa || 'EXAMEN') === 'COLOQUIO' ? 'info' : 'primary'}>
                {(datosForm.tipoMesa || mesa?.tipoMesa || 'EXAMEN') === 'COLOQUIO' ? 'Coloquio' : 'Examen Final'}
              </Badge>
              {' '}— Estado: {mesa.estado === 'FINALIZADA' ? <Badge bg="secondary">Finalizada</Badge> : <Badge bg="success">Creada</Badge>}
            </p>
          )}
          {msg.type && (
            <Row className="mb-3"><Col><Alert variant={msg.type} onClose={()=>setMsg({type:null,text:''})} dismissible>{msg.text}</Alert></Col></Row>
          )}

          {loading ? (
            <div className="p-3"><Spinner animation="border" /></div>
          ) : (
            <Tabs defaultActiveKey="datos" id="tabs-gestion-mesa" className="mb-3">
              <Tab eventKey="datos" title="Datos">
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Materia</Form.Label>
                      <Form.Select value={datosForm.materiaCursoId} onChange={(e)=> setDatosForm(v=>({...v, materiaCursoId: e.target.value}))} disabled={mesa?.estado==='FINALIZADA'}>
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
                      <Form.Control type="date" value={datosForm.fecha} onChange={(e)=> setDatosForm(v=>({...v, fecha: e.target.value}))} disabled={mesa?.estado==='FINALIZADA'} />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Aula</Form.Label>
                      <Form.Select value={datosForm.aulaId} onChange={(e)=> setDatosForm(v=>({...v, aulaId: e.target.value}))} disabled={mesa?.estado==='FINALIZADA'}>
                        <option value="">-- Sin aula --</option>
                        {aulas.map(a => (
                          <option key={a.id} value={a.id}>{a.nombre || a.id}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                    <Col md={2}>
                      <Form.Group>
                        <Form.Label>Hora inicio</Form.Label>
                        <Form.Control type="time" value={datosForm.horaInicio} onChange={e => setDatosForm(v => ({ ...v, horaInicio: e.target.value }))} disabled={mesa?.estado==='FINALIZADA'} />
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group>
                        <Form.Label>Hora fin</Form.Label>
                        <Form.Control type="time" value={datosForm.horaFin} onChange={e => setDatosForm(v => ({ ...v, horaFin: e.target.value }))} disabled={mesa?.estado==='FINALIZADA'} />
                      </Form.Group>
                    </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Tipo de mesa</Form.Label>
                      <Form.Select 
                        value={datosForm.tipoMesa} 
                        onChange={(e)=> setDatosForm(v=>({...v, tipoMesa: e.target.value}))} 
                        disabled={mesa?.estado==='FINALIZADA' || (mesa?.alumnos?.length > 0 || mesa?.docentes?.length > 0)}
                      >
                        <option value="EXAMEN">Examen final</option>
                        <option value="COLOQUIO">Coloquio</option>
                      </Form.Select>
                      {mesa && (mesa.alumnos?.length > 0 || mesa.docentes?.length > 0) && (
                        <Form.Text className="text-warning">
                          No se puede cambiar el tipo porque ya tiene alumnos o docentes asignados
                        </Form.Text>
                      )}
                      {!(mesa && (mesa.alumnos?.length > 0 || mesa.docentes?.length > 0)) && mesa?.estado !== 'FINALIZADA' && (
                        <Form.Text className="text-muted">
                          {datosForm.tipoMesa === 'COLOQUIO' 
                            ? 'Coloquio: 1 docente (debe ser de la materia)' 
                            : 'Examen final: 3 docentes (al menos uno de la materia)'}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                  <Col xs={12} className="mt-2">
                    <Button variant="primary" onClick={guardarDatos} disabled={datosSaving || mesa?.estado==='FINALIZADA'}>Guardar</Button>
                  </Col>
                </Row>
              </Tab>

              <Tab eventKey="docentes" title="Docentes">
                <p className="text-muted">
                  {(datosForm.tipoMesa || mesa?.tipoMesa || 'EXAMEN') === 'COLOQUIO' 
                    ? 'Seleccioná exactamente 1 docente que dé la materia. Los ya asignados aparecen tildados.' 
                    : 'Seleccioná exactamente 3 docentes. Al menos uno debe dar la materia. Los ya asignados aparecen tildados.'}
                </p>
                <div className="border rounded" style={{maxHeight:300, overflowY:'auto'}}>
                  <Table hover responsive className="mb-0">
                    <thead><tr><th style={{width:48}}></th><th>Apellido</th><th>Nombre</th><th>Materia</th><th>Estado</th></tr></thead>
                    <tbody>
                      {docentesTabla.map(d => {
                        const id = Number(d.id);
                        const checked = docSeleccionados.has(id);
                        return (
                          <tr key={id}>
                            <td>
                              <Form.Check type="checkbox" checked={checked} disabled={mesa?.estado==='FINALIZADA'} onChange={(e)=>{
                                const next = new Set(docSeleccionados);
                                if (e.target.checked) next.add(id); else next.delete(id);
                                setDocSeleccionados(next);
                              }}/>
                            </td>
                            <td>{d.apellido}</td>
                            <td>{d.nombre}</td>
                            <td>{d.nombreMateria || '-'}</td>
                            <td>
                              <Badge bg={d.origen === 'ASIGNADO' ? 'success' : 'secondary'}>
                                {d.origen === 'ASIGNADO' ? 'Asignado' : 'Disponible'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                      {docentesTabla.length===0 && (
                        <tr><td colSpan={5} className="text-center py-3 text-muted">No hay docentes disponibles</td></tr>
                      )}
                    </tbody>
                  </Table>
                </div>
                <div className="mt-3">
                  <Button 
                    variant="primary" 
                    onClick={guardarDocentes} 
                    disabled={
                      mesa?.estado==='FINALIZADA' ||
                      docSaving || 
                      ((datosForm.tipoMesa || mesa?.tipoMesa || 'EXAMEN') === 'COLOQUIO' ? docSeleccionados.size !== 1 : docSeleccionados.size !== 3)
                    }
                  >
                    Guardar docentes
                  </Button>
                </div>
              </Tab>

              <Tab eventKey="convocados" title="Convocados">
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <p className="text-muted mb-0">Marcá los alumnos a convocar para esta mesa.</p>
                    <Form.Check 
                      type="switch"
                      label="Mostrar todos los alumnos (incluye aprobados)"
                      checked={mostrarTodos}
                      disabled={mesa?.estado==='FINALIZADA'}
                      onChange={(e) => setMostrarTodos(e.target.checked)}
                    />
                  </div>
                  <Row className="g-2 align-items-end">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Filtrar por condición</Form.Label>
                        <Form.Select 
                          value={filtroCondicion} 
                          onChange={(e)=> setFiltroCondicion(e.target.value)}
                          disabled={mesa?.estado==='FINALIZADA'}
                        >
                          <option value="">Todos</option>
                          <option value="COLOQUIO">Coloquio</option>
                          <option value="EXAMEN">Examen</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={8} className="d-flex gap-2 justify-content-end">
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        disabled={mesa?.estado==='FINALIZADA'}
                        onClick={()=>{
                          const filtrados = elegibles.filter(al => al.condicion === 'EXAMEN');
                          const next = new Set(convSeleccionados);
                          filtrados.forEach(al => next.add(Number(al.id)));
                          setConvSeleccionados(next);
                        }}
                      >
                        Seleccionar todos Examen
                      </Button>
                      <Button 
                        variant="outline-info" 
                        size="sm"
                        disabled={mesa?.estado==='FINALIZADA'}
                        onClick={()=>{
                          const filtrados = elegibles.filter(al => al.condicion === 'COLOQUIO');
                          const next = new Set(convSeleccionados);
                          filtrados.forEach(al => next.add(Number(al.id)));
                          setConvSeleccionados(next);
                        }}
                      >
                        Seleccionar todos Coloquio
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        disabled={mesa?.estado==='FINALIZADA'}
                        onClick={()=> setConvSeleccionados(new Set())}
                      >
                        Deseleccionar todos
                      </Button>
                    </Col>
                  </Row>
                </div>
                <div className="border rounded" style={{maxHeight:360, overflowY:'auto'}}>
                  <Table hover responsive className="mb-0">
                    <thead>
                      <tr>
                        <th style={{width:48}}></th>
                        <th>DNI</th>
                        <th>Apellido</th>
                        <th>Nombre</th>
                        <th>Condición</th>
                        {mostrarTodos && <th>Estado Académico</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {elegibles.filter(al => !filtroCondicion || al.condicion === filtroCondicion).map(al => {
                        const id = Number(al.id ?? al.alumnoId);
                        const checked = convSeleccionados.has(id);
                        const estaAprobado = al.estadoAcademico === 'PROMOCIONADO' || al.estadoAcademico === 'APROBADO_MESA';
                        return (
                          <tr key={id} className={estaAprobado ? 'table-success' : ''}>
                            <td>
                              <Form.Check 
                                type="checkbox" 
                                checked={checked} 
                                disabled={mesa?.estado==='FINALIZADA' || estaAprobado} // Deshabilitar si ya está aprobado o mesa finalizada
                                onChange={(e)=>{
                                  const next = new Set(convSeleccionados);
                                  if (e.target.checked) next.add(id); else next.delete(id);
                                  setConvSeleccionados(next);
                                }}
                              />
                            </td>
                            <td>{al.dni}</td>
                            <td>{al.apellido}</td>
                            <td>{al.nombre}</td>
                            <td>{(al.condicion ?? '').toString()}</td>
                            {mostrarTodos && (
                              <td>
                                <Badge bg={
                                  al.estadoAcademico === 'PROMOCIONADO' ? 'success' :
                                  al.estadoAcademico === 'APROBADO_MESA' ? 'info' : 
                                  'warning'
                                }>
                                  {al.estadoAcademico === 'PROMOCIONADO' ? 'Promocionado' :
                                   al.estadoAcademico === 'APROBADO_MESA' ? 'Aprobado por Mesa' :
                                   'Debe Rendir'}
                                </Badge>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      {elegibles.filter(al => !filtroCondicion || al.condicion === filtroCondicion).length===0 && (
                        <tr><td colSpan={mostrarTodos ? 6 : 5} className="text-center py-3 text-muted">
                          No hay alumnos {filtroCondicion ? `con condición ${filtroCondicion}` : (mostrarTodos ? 'registrados' : 'elegibles')}
                        </td></tr>
                      )}
                    </tbody>
                  </Table>
                </div>
                <div className="mt-3">
                  <Button variant="primary" onClick={guardarConvocados} disabled={mesa?.estado==='FINALIZADA' || convSaving}>Guardar convocados</Button>
                </div>
              </Tab>

              <Tab eventKey="notas" title="Notas">
                {!mesa?.alumnos || mesa.alumnos.length===0 ? (
                  <Alert variant="warning">Primero convocá al menos un alumno para habilitar notas.</Alert>
                ) : (
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
                      {(mesa.alumnos||[]).map(a => (
                        <tr key={a.alumnoId}>
                          <td>{a.dni}</td>
                          <td>{a.apellido}</td>
                          <td>{a.nombre}</td>
                          <td>
                            <Form.Control type="number" min={0} max={10} value={notasEdit[a.alumnoId] ?? ''}
                              disabled={mesa?.estado === 'FINALIZADA'}
                              onChange={(e)=>{
                                const val = e.target.value === '' ? '' : Math.max(0, Math.min(10, Number(e.target.value)));
                                setNotasEdit(v=>({...v, [a.alumnoId]: val}));
                              }}/>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
                <div className="mt-3">
                  <Button variant="primary" onClick={guardarNotas} disabled={notasSaving || mesa?.estado === 'FINALIZADA' || !(mesa?.alumnos && mesa.alumnos.length)}>Guardar notas</Button>
                </div>
              </Tab>
            </Tabs>
          )}

          <div className="mt-3">
            <Button variant="secondary" onClick={()=> navigate(-1)}>Volver</Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
