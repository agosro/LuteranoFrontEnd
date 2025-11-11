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
import { listarRindenPorCurso } from '../Services/ReporteRindeService.js';
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
  const [datosForm, setDatosForm] = useState({ materiaCursoId: '', fecha: '', aulaId: '' });
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

  // Notas
  const [notasEdit, setNotasEdit] = useState({});
  const [notasSaving] = useState(false);

  const fmtDate = (iso) => {
    if (!iso) return '-';
    const [y,m,d] = String(iso).split('-');
    if (!y||!m||!d) return iso;
    return `${d.padStart(2,'0')}-${m.padStart(2,'0')}-${y}`;
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setMsg({ type: null, text: '' });
    try {
      const m = await obtenerMesa(token, mesaId);
      setMesa(m);
      setDatosForm({ materiaCursoId: m.materiaCursoId || '', fecha: m.fecha || '', aulaId: m.aulaId || '' });
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
        const rep = await listarRindenPorCurso(token, { cursoId: m.cursoId, anio });
        const filas = Array.isArray(rep) ? rep : (Array.isArray(rep?.filas) ? rep.filas : []);
        const filtradas = materiaId ? filas.filter(f => Number(f.materiaId) === Number(materiaId)) : filas;
        const lista = filtradas.map(r => ({ id: Number(r.alumnoId), alumnoId: Number(r.alumnoId), dni: r.dni, apellido: r.apellido, nombre: r.nombre, condicion: r.condicion }));
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
  }, [mesaId, token]);

  useEffect(() => { refresh(); }, [refresh]);

  const guardarDatos = async () => {
    try {
      setDatosSaving(true);
      const payload = { id: mesaId };
      if (datosForm.fecha) payload.fecha = datosForm.fecha;
      if (datosForm.materiaCursoId) payload.materiaCursoId = Number(datosForm.materiaCursoId);
      if (datosForm.aulaId) payload.aulaId = Number(datosForm.aulaId);
      await actualizarMesa(token, payload);
      await refresh();
      toast.success('Mesa actualizada');
    } catch (e) {
      toast.error(e.message);
    } finally { setDatosSaving(false); }
  };

  const guardarDocentes = async () => {
    try {
      if (docSeleccionados.size !== 3) { toast.warn('Debés seleccionar exactamente 3 docentes'); return; }
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
      const aAgregar = Array.from(convSeleccionados).filter(id => !actuales.has(id));
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
    const combinados = [
      ...docAsignados.map(d => ({ ...d, origen: 'ASIGNADO' })),
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
                  <Col xs={12} className="mt-2">
                    <Button variant="primary" onClick={guardarDatos} disabled={datosSaving || mesa?.estado==='FINALIZADA'}>Guardar</Button>
                  </Col>
                </Row>
              </Tab>

              <Tab eventKey="docentes" title="Docentes">
                <p className="text-muted">Seleccioná exactamente 3 docentes. Los ya asignados aparecen tildados.</p>
                <div className="border rounded" style={{maxHeight:300, overflowY:'auto'}}>
                  <Table hover responsive className="mb-0">
                    <thead><tr><th style={{width:48}}></th><th>Apellido</th><th>Nombre</th><th>Origen</th></tr></thead>
                    <tbody>
                      {docentesTabla.map(d => {
                        const id = Number(d.id);
                        const checked = docSeleccionados.has(id);
                        return (
                          <tr key={id}>
                            <td>
                              <Form.Check type="checkbox" checked={checked} onChange={(e)=>{
                                const next = new Set(docSeleccionados);
                                if (e.target.checked) next.add(id); else next.delete(id);
                                setDocSeleccionados(next);
                              }}/>
                            </td>
                            <td>{d.apellido}</td>
                            <td>{d.nombre}</td>
                            <td>{d.origen}</td>
                          </tr>
                        );
                      })}
                      {docentesTabla.length===0 && (
                        <tr><td colSpan={4} className="text-center py-3 text-muted">No hay docentes disponibles</td></tr>
                      )}
                    </tbody>
                  </Table>
                </div>
                <div className="mt-3">
                  <Button variant="primary" onClick={guardarDocentes} disabled={docSaving || docSeleccionados.size!==3}>Guardar docentes</Button>
                </div>
              </Tab>

              <Tab eventKey="convocados" title="Convocados">
                <p className="text-muted">Marcá los alumnos a convocar para esta mesa.</p>
                <div className="border rounded" style={{maxHeight:360, overflowY:'auto'}}>
                  <Table hover responsive className="mb-0">
                    <thead>
                      <tr>
                        <th style={{width:48}}></th>
                        <th>DNI</th>
                        <th>Apellido</th>
                        <th>Nombre</th>
                        <th>Condición</th>
                      </tr>
                    </thead>
                    <tbody>
                      {elegibles.map(al => {
                        const id = Number(al.id ?? al.alumnoId);
                        const checked = convSeleccionados.has(id);
                        return (
                          <tr key={id}>
                            <td>
                              <Form.Check type="checkbox" checked={checked} onChange={(e)=>{
                                const next = new Set(convSeleccionados);
                                if (e.target.checked) next.add(id); else next.delete(id);
                                setConvSeleccionados(next);
                              }}/>
                            </td>
                            <td>{al.dni}</td>
                            <td>{al.apellido}</td>
                            <td>{al.nombre}</td>
                            <td>{(al.condicion ?? '').toString()}</td>
                          </tr>
                        );
                      })}
                      {elegibles.length===0 && (
                        <tr><td colSpan={5} className="text-center py-3 text-muted">No hay alumnos elegibles</td></tr>
                      )}
                    </tbody>
                  </Table>
                </div>
                <div className="mt-3">
                  <Button variant="primary" onClick={guardarConvocados} disabled={convSaving}>Guardar convocados</Button>
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
