import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../Context/AuthContext.jsx';
import { Container, Row, Col, Card, Form, Button, Table, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import Breadcrumbs from '../Components/Botones/Breadcrumbs.jsx';
import BackButton from '../Components/Botones/BackButton.jsx';
import { toast } from 'react-toastify';
import { listarTurnos, crearTurno, actualizarTurno, eliminarTurno } from '../Services/TurnoExamenService.js';

export default function Turnos() {
  const { user } = useAuth();
  const token = user?.token;
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ anio: new Date().getFullYear(), mes: new Date().getMonth()+1, nombre: '' });
  const [msg, setMsg] = useState({ type: null, text: '' });
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: '', anio: new Date().getFullYear(), mes: new Date().getMonth()+1, activo: true });
  const [showDel, setShowDel] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [delError, setDelError] = useState('');

  const meses = useMemo(() => [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ], []);

  const fmtDate = (iso) => {
    if (!iso) return '-';
    // iso esperado 'YYYY-MM-DD'
    const [y,m,d] = String(iso).split('-');
    if (!y || !m || !d) return iso;
    return `${d.padStart(2,'0')}-${m.padStart(2,'0')}-${y}`;
  };

  useEffect(() => {
    let cancel = false;
    (async () => {
      setCargando(true);
      try {
        const data = await listarTurnos(token, anio);
        if (!cancel) setTurnos(data);
      } catch (e) {
        if (!cancel) alert(e.message);
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => { cancel = true; };
  }, [anio, token]);

  const onCrear = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, activo: true };
      if (!payload.nombre) delete payload.nombre;
  await crearTurno(token, payload);
  setForm({ anio, mes: 1, nombre: '' });
  // recargar lista
  const data = await listarTurnos(token, anio);
  setTurnos(data);
      toast.success('Turno creado');
    } catch (e) {
      setMsg({ type: 'danger', text: e.message });
      toast.error(e.message);
    }
  };

  const onToggleActivo = async (t) => {
    try {
      await actualizarTurno(token, t.id, { activo: !t.activo });
      const data = await listarTurnos(token, anio);
      setTurnos(data);
      toast.success(`Turno ${!t.activo ? 'activado' : 'desactivado'}`);
    } catch (e) {
      setMsg({ type: 'danger', text: e.message });
      toast.error(e.message);
    }
  };

  // Eliminación ahora se hace desde el modal de confirmación

  return (
    <Container className="py-4">
      <div className="mb-3">
        <Breadcrumbs />
        <div className="mt-2"><BackButton /></div>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-4">Turnos de examen</h3>

          {msg.type && (
            <Row className="mb-3">
              <Col>
                <Alert variant={msg.type} onClose={()=>setMsg({type:null,text:''})} dismissible>
                  {msg.text}
                </Alert>
              </Col>
            </Row>
          )}

          <Row className="g-3 align-items-end mb-4">
            <Col md={3} sm={6} xs={12}>
              <Form.Group controlId="filtroAnio">
                <Form.Label>Año</Form.Label>
                <Form.Control type="number" value={anio} onChange={(e)=>setAnio(Number(e.target.value)||new Date().getFullYear())} />
              </Form.Group>
            </Col>
            <Col md="auto">
              <Button variant="secondary" onClick={async ()=>{
                setCargando(true);
                try { const data = await listarTurnos(token, anio); setTurnos(data); }
                catch(e){ setMsg({type:'danger', text: e.message}); toast.error(e.message); }
                finally { setCargando(false);} 
              }} disabled={cargando}>
                {cargando ? (<><Spinner size="sm" animation="border" className="me-2" />Cargando</>) : 'Recargar'}
              </Button>
            </Col>
          </Row>

          {/* Crear turno */}
          <h5 className="mb-3">Crear turno</h5>
          <Form onSubmit={onCrear} className="mb-4">
            <Row className="g-3">
              <Col md={3} sm={6} xs={12}>
                <Form.Group>
                  <Form.Label>Mes</Form.Label>
                  <Form.Select value={form.mes} onChange={(e)=>setForm(v=>({...v, mes: Number(e.target.value)}))}>
                    {meses.map((m, idx)=> <option key={idx+1} value={idx+1}>{m}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3} sm={6} xs={12}>
                <Form.Group>
                  <Form.Label>Año</Form.Label>
                  <Form.Control type="number" value={form.anio} onChange={(e)=>setForm(v=>({...v, anio: Number(e.target.value)}))} />
                </Form.Group>
              </Col>
              <Col md={4} sm={12}>
                <Form.Group>
                  <Form.Label>Nombre (opcional)</Form.Label>
                  <Form.Control type="text" placeholder="FEBRERO 2026" value={form.nombre} onChange={(e)=>setForm(v=>({...v, nombre: e.target.value}))} />
                </Form.Group>
              </Col>
              <Col md="auto" className="d-flex align-items-end">
                <Button type="submit">Crear</Button>
              </Col>
            </Row>
          </Form>

          {/* Listado */}
          {cargando ? (
            <div className="p-3"><Spinner animation="border" /></div>
          ) : (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Año</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Estado</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {turnos.map(t => (
                  <tr key={t.id}>
                    <td>{t.nombre}</td>
                    <td>{t.anio}</td>
                    <td>{fmtDate(t.fechaInicio)}</td>
                    <td>{fmtDate(t.fechaFin)}</td>
                    <td>
                      {t.activo ? <Badge bg="success">Activo</Badge> : <Badge bg="secondary">Inactivo</Badge>}
                    </td>
                    <td className="text-end">
                          <Button size="sm" variant="outline-primary" className="me-2" onClick={()=>{
                            setEditTarget(t);
                            // Derivar mes desde fechaInicio si está
                            let mes = editForm.mes;
                            if (t.fechaInicio) {
                              const parts = String(t.fechaInicio).split('-');
                              if (parts.length >= 2) {
                                const mm = Number(parts[1]);
                                if (!Number.isNaN(mm) && mm >= 1 && mm <= 12) mes = mm;
                              }
                            }
                            setEditForm({ nombre: t.nombre || '', anio: t.anio, mes, activo: !!t.activo });
                            setShowEdit(true);
                          }}>Editar</Button>
                      <Button size="sm" variant={t.activo? 'outline-secondary':'outline-success'} className="me-2" onClick={()=>onToggleActivo(t)}>
                        {t.activo ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={()=>{ setDelTarget(t); setDelError(''); setShowDel(true); }}>Eliminar</Button>
                    </td>
                  </tr>
                ))}
                {turnos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">No hay turnos para el año seleccionado</td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Modal Editar Turno */}
      <Modal show={showEdit} onHide={()=>setShowEdit(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Editar turno</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Nombre</Form.Label>
                  <Form.Control type="text" value={editForm.nombre}
                    onChange={(e)=>setEditForm(v=>({...v, nombre: e.target.value}))} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Mes</Form.Label>
                  <Form.Select value={editForm.mes} onChange={(e)=>setEditForm(v=>({...v, mes: Number(e.target.value)}))}>
                    {meses.map((m, idx)=> <option key={idx+1} value={idx+1}>{m}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Año</Form.Label>
                  <Form.Control type="number" value={editForm.anio}
                    onChange={(e)=>setEditForm(v=>({...v, anio: Number(e.target.value)||new Date().getFullYear()}))} />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Check type="switch" id="edit-activo" label="Activo"
                  checked={editForm.activo} onChange={(e)=>setEditForm(v=>({...v, activo: e.target.checked}))} />
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>setShowEdit(false)}>Cancelar</Button>
          <Button variant="primary" onClick={async ()=>{
            if (!editTarget) return;
            try {
              const payload = {};
              if (editForm.nombre !== editTarget.nombre) payload.nombre = editForm.nombre;
              if (editForm.activo !== editTarget.activo) payload.activo = editForm.activo;
              // Enviar cambio de anio/mes si difiere (evitar desfase por timezone)
              let actualMes = editForm.mes;
              if (editTarget.fechaInicio) {
                const p = String(editTarget.fechaInicio).split('-');
                if (p.length >= 2) {
                  const mm = Number(p[1]);
                  if (!Number.isNaN(mm) && mm >= 1 && mm <= 12) actualMes = mm;
                }
              }
              if (editForm.anio !== editTarget.anio) payload.anio = editForm.anio;
              if (editForm.mes !== actualMes) payload.mes = editForm.mes;
              // Si no hay cambios, cerrar sin llamar
              if (Object.keys(payload).length === 0) { setShowEdit(false); return; }
              await actualizarTurno(token, editTarget.id, payload);
              const data = await listarTurnos(token, anio);
              setTurnos(data);
              toast.success('Turno actualizado');
              setShowEdit(false);
            } catch (e) {
              setMsg({ type: 'danger', text: e.message });
              toast.error(e.message);
            }
          }}>Guardar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Eliminar Turno */}
      <Modal show={showDel} onHide={()=>setShowDel(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Eliminar turno</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {delTarget ? (
            <>
              {delError && (<Alert variant="danger" className="mb-3">{delError}</Alert>)}
              <p>¿Estás seguro que querés eliminar el turno <strong>{delTarget.nombre || '(sin nombre)'}</strong>?</p>
              <p className="mb-0 text-muted">Rango: {fmtDate(delTarget.fechaInicio)} — {fmtDate(delTarget.fechaFin)}</p>
            </>
          ) : (
            <Spinner animation="border" />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>setShowDel(false)} disabled={delLoading}>Cancelar</Button>
          <Button variant="danger" disabled={delLoading} onClick={async ()=>{
            if (!delTarget) return;
            try {
              setDelLoading(true);
              await eliminarTurno(token, delTarget.id);
              const data = await listarTurnos(token, anio);
              setTurnos(data);
              toast.success('Turno eliminado');
              setShowDel(false);
              setDelTarget(null);
              setDelError('');
            } catch (e) {
              setDelError(e.message || 'No se pudo eliminar el turno');
            }
            finally { setDelLoading(false); }
          }}>Eliminar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
