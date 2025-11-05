import React, { useEffect, useMemo, useState } from 'react';
import { Container, Card, Row, Col, Form, Button, Table, Badge, Spinner, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import { listarTurnos } from '../Services/TurnoExamenService';
import { listarCursos } from '../Services/CursoService';
import {
  buscarActas,
  listarActasPorTurno,
  listarActasPorCurso,
  listarActasEntreFechas,
  obtenerActaPorId,
  actualizarActa,
  eliminarActa,
} from '../Services/ActaExamenService';
import { useAuth } from '../Context/AuthContext';

export default function Actas() {
  const { user } = useAuth();
  const token = user?.token;

  const [turnos, setTurnos] = useState([]);
  const [cursos, setCursos] = useState([]);

  const [filtros, setFiltros] = useState({ numero: '', turnoId: '', cursoId: '', desde: '', hasta: '' });
  const [actas, setActas] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [actaSel, setActaSel] = useState(null);
  const [formActa, setFormActa] = useState({ id: null, numeroActa: '', observaciones: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, c] = await Promise.all([
          listarTurnos(token, new Date().getFullYear()).catch(() => []),
          listarCursos(token).catch(() => []),
        ]);
        setTurnos(Array.isArray(t) ? t : []);
        setCursos(Array.isArray(c) ? c : []);
      } catch (e) {
        toast.error(e?.message || 'Error cargando datos iniciales');
      }
    })();
  }, [token]);

  const cursoLabel = (c) => `${c?.anio ?? ''}°${c?.division ?? ''}`;

  const buscar = async () => {
    setCargando(true);
    try {
      const { numero, turnoId, cursoId, desde, hasta } = filtros;
      let lista = [];
      if (numero && numero.trim()) {
        lista = await buscarActas(token, numero.trim());
      } else if (turnoId) {
        lista = await listarActasPorTurno(token, Number(turnoId));
      } else if (cursoId) {
        lista = await listarActasPorCurso(token, Number(cursoId));
      } else if (desde && hasta) {
        lista = await listarActasEntreFechas(token, desde, hasta);
      } else {
        lista = [];
      }

      // Filtros cruzados adicionales (si se llenaron varios campos)
      if (cursoId) {
        lista = lista.filter(a => String(a.cursoId) === String(cursoId));
      }
      if (turnoId) {
        lista = lista.filter(a => String(a.turnoId) === String(turnoId));
      }
      if (desde && hasta) {
        const d1 = new Date(desde);
        const d2 = new Date(hasta);
        lista = lista.filter(a => {
          const f = a.fechaCierre ? new Date(a.fechaCierre) : null;
          return f && f >= d1 && f <= d2;
        });
      }

      setActas(Array.isArray(lista) ? lista : []);
    } catch (e) {
      toast.error(e?.message || 'Error buscando actas');
      setActas([]);
    } finally {
      setCargando(false);
    }
  };

  const limpiar = () => {
    setFiltros({ numero: '', turnoId: '', cursoId: '', desde: '', hasta: '' });
    setActas([]);
  };

  const abrirActa = async (id) => {
    try {
      const a = await obtenerActaPorId(token, id);
      setActaSel(a);
      setFormActa({ id: a.id, numeroActa: a.numeroActa || '', observaciones: a.observaciones || '' });
      setShowModal(true);
    } catch (e) {
      toast.error(e?.message || 'No se pudo abrir el acta');
    }
  };

  const guardarActa = async () => {
    if (!formActa.id) return;
    setSaving(true);
    try {
      await actualizarActa(token, { id: formActa.id, numeroActa: formActa.numeroActa, observaciones: formActa.observaciones });
      toast.success('Acta actualizada');
      setShowModal(false);
      await buscar();
    } catch (e) {
      toast.error(e?.message || 'No se pudo actualizar');
    } finally { setSaving(false); }
  };

  const borrarActa = async () => {
    if (!actaSel?.id) return;
    if (!window.confirm('¿Eliminar acta?')) return;
    try {
      await eliminarActa(token, actaSel.id);
      toast.success('Acta eliminada');
      setShowModal(false);
      await buscar();
    } catch (e) {
      toast.error(e?.message || 'No se pudo eliminar');
    }
  };

  const actasOrdenadas = useMemo(() => {
    return [...actas].sort((a, b) => {
      const na = (a.numeroActa || '').toString();
      const nb = (b.numeroActa || '').toString();
      if (na && nb && na !== nb) return na.localeCompare(nb);
      const fa = a.fechaCierre || '';
      const fb = b.fechaCierre || '';
      return (fb || '').localeCompare(fa || '');
    });
  }, [actas]);

  return (
    <Container className="py-4">
      <div className="mb-3">
        <Breadcrumbs />
        <div className="mt-2"><BackButton /></div>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-4">Actas de examen</h3>

          {/* Filtros */}
          <Row className="g-3 align-items-end">
            <Col md={3} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Número</Form.Label>
                <Form.Control value={filtros.numero} onChange={(e)=>setFiltros(v=>({...v, numero: e.target.value}))} placeholder="Ej: ACTA-2025-001" />
              </Form.Group>
            </Col>
            <Col md={3} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Turno</Form.Label>
                <Form.Select value={filtros.turnoId} onChange={(e)=>setFiltros(v=>({...v, turnoId: e.target.value}))}>
                  <option value="">-- Todos --</option>
                  {turnos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Curso</Form.Label>
                <Form.Select value={filtros.cursoId} onChange={(e)=>setFiltros(v=>({...v, cursoId: e.target.value}))}>
                  <option value="">-- Todos --</option>
                  {cursos.map(c => <option key={c.id} value={c.id}>{cursoLabel(c)}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Desde</Form.Label>
                <Form.Control type="date" value={filtros.desde} onChange={(e)=>setFiltros(v=>({...v, desde: e.target.value}))} />
              </Form.Group>
            </Col>
            <Col md={3} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Hasta</Form.Label>
                <Form.Control type="date" value={filtros.hasta} onChange={(e)=>setFiltros(v=>({...v, hasta: e.target.value}))} />
              </Form.Group>
            </Col>
            <Col md="auto">
              <Button variant="primary" onClick={buscar} disabled={cargando}>
                {cargando ? <Spinner size="sm" /> : 'Buscar'}
              </Button>
            </Col>
            <Col md="auto">
              <Button variant="outline-secondary" onClick={limpiar} disabled={cargando}>Limpiar</Button>
            </Col>
          </Row>

          {/* Listado */}
          {cargando ? (
            <div className="p-3 text-muted">Buscando actas...</div>
          ) : actasOrdenadas.length === 0 ? (
            <p className="mt-3">No hay actas para los filtros seleccionados.</p>
          ) : (
            <Table striped hover responsive className="mt-3">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Curso</th>
                  <th>Materia</th>
                  <th>Turno</th>
                  <th>Fecha cierre</th>
                  <th>Estado</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {actasOrdenadas.map(a => (
                  <tr key={a.id}>
                    <td>{a.numeroActa || '-'}</td>
                    <td>{a.cursoAnio ? `${a.cursoAnio}°${a.cursoDivision || ''}` : (a.cursoId || '-')}</td>
                    <td>{a.materiaNombre || '-'}</td>
                    <td>{a.turnoNombre || a.turnoId || '-'}</td>
                    <td>{a.fechaCierre || '-'}</td>
                    <td>{a.cerrada ? <Badge bg="secondary">Cerrada</Badge> : <Badge bg="success">Abierta</Badge>}</td>
                    <td className="text-end">
                      <Button size="sm" variant="outline-primary" className="me-2" onClick={()=>abrirActa(a.id)}>Ver/Editar</Button>
                      <Button size="sm" variant="outline-danger" onClick={async ()=>{ setActaSel(a); setFormActa({ id: a.id, numeroActa: a.numeroActa || '', observaciones: a.observaciones || '' }); if (window.confirm('¿Eliminar acta?')) { try { await eliminarActa(token, a.id); toast.success('Acta eliminada'); await buscar(); } catch (e) { toast.error(e?.message || 'No se pudo eliminar'); } } }}>Eliminar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Modal editar acta */}
      <Modal show={showModal} onHide={()=>setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Acta</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!actaSel ? (
            <Spinner animation="border" />
          ) : (
            <Form>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Número de acta</Form.Label>
                    <Form.Control value={formActa.numeroActa} onChange={(e)=>setFormActa(v=>({...v, numeroActa: e.target.value}))}/>
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Observaciones</Form.Label>
                    <Form.Control as="textarea" rows={3} value={formActa.observaciones} onChange={(e)=>setFormActa(v=>({...v, observaciones: e.target.value}))}/>
                  </Form.Group>
                </Col>
              </Row>
              <div className="mt-3 text-muted" style={{fontSize:'.9rem'}}>
                Turno: {actaSel?.turnoNombre || actaSel?.turnoId || '-'} — Curso: {actaSel?.cursoAnio ? `${actaSel.cursoAnio}°${actaSel.cursoDivision || ''}` : (actaSel?.cursoId || '-')}
              </div>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>setShowModal(false)} disabled={saving}>Cerrar</Button>
          {actaSel && (
            <>
              <Button variant="primary" onClick={guardarActa} disabled={saving}>{saving ? <Spinner size="sm"/> : 'Guardar'}</Button>
              <Button variant="outline-danger" onClick={borrarActa} disabled={saving}>Eliminar</Button>
            </>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
