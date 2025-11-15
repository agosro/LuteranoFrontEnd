import React, { useEffect, useMemo, useState } from 'react';
import { Container, Card, Row, Col, Form, Button, Table, Badge, Spinner, Modal, Alert } from 'react-bootstrap';
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

  const currentYear = new Date().getFullYear();
  const [filtros, setFiltros] = useState({ numero: '', turnoId: '', cursoId: '', desde: '', hasta: '', anio: String(currentYear) });
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

  // Recargar turnos cuando cambia el Año del filtro
  useEffect(() => {
    (async () => {
      try {
        const y = Number(filtros.anio) || new Date().getFullYear();
        const t = await listarTurnos(token, y).catch(() => []);
        const ts = Array.isArray(t) ? t : [];
        setTurnos(ts);
        // Si el turno seleccionado ya no existe para ese año, limpiarlo
        if (filtros.turnoId && !ts.some(tt => String(tt.id) === String(filtros.turnoId))) {
          setFiltros(v => ({ ...v, turnoId: '' }));
        }
      } catch {
        setTurnos([]);
      }
    })();
  }, [token, filtros.anio, filtros.turnoId]);

  const cursoLabel = (c) => `${c?.anio ?? ''}°${c?.division ?? ''}`;

  const buscar = async () => {
    setCargando(true);
    try {
      const { numero, turnoId, cursoId, desde, hasta, anio } = filtros;
      let lista = [];
      if (numero && numero.trim()) {
        lista = await buscarActas(token, numero.trim());
      } else if (turnoId) {
        lista = await listarActasPorTurno(token, Number(turnoId));
      } else if (cursoId) {
        lista = await listarActasPorCurso(token, Number(cursoId));
      } else if (desde && hasta) {
        lista = await listarActasEntreFechas(token, desde, hasta);
      } else if (anio) {
        // Solo año: traemos por rango del año
        const desdeAnio = `${anio}-01-01`;
        const hastaAnio = `${anio}-12-31`;
        lista = await listarActasEntreFechas(token, desdeAnio, hastaAnio);
      } else {
        // Si solo se seleccionó año, filtraremos luego (usamos combinaciones)
        lista = [];
      }

      // Filtros cruzados adicionales (si se llenaron varios campos)
      if (anio) {
        lista = lista.filter(a => {
          const y = (a.fechaCierre || a.fecha || '').split('-')[0];
            return String(y) === String(anio);
        });
      }
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
    setFiltros({ numero: '', turnoId: '', cursoId: '', desde: '', hasta: '', anio: String(currentYear) });
    setActas([]);
  };

  const abrirActa = async (objOrId) => {
    const isObj = typeof objOrId === 'object' && objOrId !== null;
    const id = isObj ? objOrId.id : objOrId;
    const fallback = isObj ? objOrId : null; // por si falla el fetch, mostramos lo que tenemos de la lista
    try {
      const a = await obtenerActaPorId(token, id);
      setActaSel(a);
      setFormActa({ id: a.id, numeroActa: a.numeroActa || '', observaciones: a.observaciones || '' });
      setShowModal(true);
    } catch (e) {
      // 422: Acta todavía no generada (lazy), intentar crear si hay datos mínimos (mesaId) o mostrar fallback
      const statusText = e?.message || '';
      if (/422|Unprocessable/i.test(statusText)) {
        toast.warn('El backend no devolvió el acta completa (422). Podés reintentar más tarde o generar el acta desde la mesa.');
      } else {
        toast.error(e?.message || 'No se pudo abrir el acta');
      }
      if (fallback) {
        setActaSel(fallback);
        setFormActa({ id: fallback.id, numeroActa: fallback.numeroActa || '', observaciones: fallback.observaciones || '' });
        setShowModal(true);
      }
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

  const imprimirActa = () => {
    if (!actaSel) { toast.info('Abrí primero un acta'); return; }
    const win = window.open('', '_blank');
    if (!win) return;
    const css = `
      @page { margin: 14mm; }
      body { font-family: Arial, sans-serif; }
      h3 { margin: 0 0 8px 0; }
      .sub { color: #555; font-size: 12px; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
      thead tr:first-child th { background: #f0f0f0; }
    `;
    const alumnos = actaSel.alumnos || actaSel.items || actaSel.detalle || [];
    const encabezado = {
      numero: actaSel.numeroActa || '-',
      curso: actaSel.cursoAnio ? `${actaSel.cursoAnio}°${actaSel.cursoDivision || ''}` : (actaSel.cursoNombre || '-'),
      cursoNivel: actaSel.cursoNivel || '',
      materia: actaSel.materiaNombre || '-',
      turno: actaSel.turnoNombre || actaSel.turnoId || '-',
      fechaMesa: actaSel.fecha || '',
      fechaCierre: actaSel.fechaCierre || '',
      docentes: Array.isArray(actaSel.docentes)
        ? actaSel.docentes
            .map(d => {
              const nombre = d.nombre || d.nombreCompleto || d.apellidoNombre || '';
              const dni = d.dni ? ` (${d.dni})` : '';
              return (nombre + dni).trim();
            })
            .filter(Boolean)
            .join(', ')
        : (actaSel.docente || actaSel.docenteNombre || '')
    };
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Acta de Examen</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>Acta de Examen</h3>`);
    win.document.write(`<div class="sub">
      Número: <strong>${encabezado.numero}</strong> · Curso: <strong>${encabezado.curso}${encabezado.cursoNivel ? ' · ' + encabezado.cursoNivel : ''}</strong> · Materia: <strong>${encabezado.materia}</strong><br/>
      Turno: <strong>${encabezado.turno}</strong> · Fecha mesa: <strong>${encabezado.fechaMesa || '-'}</strong> · Fecha cierre: <strong>${encabezado.fechaCierre || '-'}</strong><br/>
      Docente/s a cargo: <strong>${encabezado.docentes || '-'}</strong>
    </div>`);
    if (Array.isArray(alumnos) && alumnos.length) {
      win.document.write(`<table><thead><tr>
        <th>#</th><th>Alumno</th><th>DNI</th><th>Condición</th><th>Nota</th><th>Observación</th>
      </tr></thead><tbody>`);
      alumnos.forEach((r, i) => {
        const nombre = r.apellidoNombre || `${r.apellido || ''} ${r.nombre || ''}`.trim();
        const obs = r.observacion || r.estado || r.estadoFinal || '';
        win.document.write(`<tr>
          <td>${i + 1}</td>
          <td>${nombre || '-'}</td>
          <td>${r.dni ?? '-'}</td>
          <td>${r.condicionRinde ?? '-'}</td>
          <td>${r.nota ?? r.notaFinal ?? r.pf ?? '-'}</td>
          <td>${obs || '-'}</td>
        </tr>`);
      });
      win.document.write(`</tbody></table>`);
    } else {
      win.document.write(`<div class="sub">Sin detalle de alumnos en el acta.</div>`);
    }
    win.document.write(`</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { try { win.print(); } finally { win.close(); } }, 300);
  };

  return (
    <Container className="py-4">
      <div className="mb-3">
        <Breadcrumbs />
        <div className="mt-2"><BackButton /></div>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-4">Actas de examen</h3>

          <Alert variant="info" className="py-2 mb-3">
            Podés combinar los filtros libremente. Para limitar rápidamente, empezá por Año. Dejá campos vacíos para no aplicarlos.
          </Alert>
          {/* Filtros */}
          <Row className="g-3 align-items-end">
            <Col md={2} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Año</Form.Label>
                <Form.Control type="number" min={2000} max={2100} value={filtros.anio} onChange={(e)=>setFiltros(v=>({...v, anio: e.target.value }))} />
              </Form.Group>
            </Col>
            <Col md={2} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Número</Form.Label>
                <Form.Control value={filtros.numero} onChange={(e)=>setFiltros(v=>({...v, numero: e.target.value}))} placeholder="Ej: ACTA-2025-001" />
              </Form.Group>
            </Col>
            <Col md={2} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Turno</Form.Label>
                <Form.Select value={filtros.turnoId} onChange={(e)=>setFiltros(v=>({...v, turnoId: e.target.value}))}>
                  <option value="">-- Todos --</option>
                  {turnos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Curso</Form.Label>
                <Form.Select value={filtros.cursoId} onChange={(e)=>setFiltros(v=>({...v, cursoId: e.target.value}))}>
                  <option value="">-- Todos --</option>
                  {cursos.map(c => <option key={c.id} value={c.id}>{cursoLabel(c)}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Desde</Form.Label>
                <Form.Control type="date" value={filtros.desde} onChange={(e)=>setFiltros(v=>({...v, desde: e.target.value}))} />
              </Form.Group>
            </Col>
            <Col md={2} sm={6} xs={12}>
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
                      <Button size="sm" variant="outline-primary" className="me-2" onClick={()=>abrirActa(a)}>Ver/Editar</Button>
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
                Número: <strong>{actaSel?.numeroActa || '-'}</strong><br/>
                Curso: <strong>{actaSel?.cursoAnio ? `${actaSel.cursoAnio}°${actaSel.cursoDivision || ''}` : (actaSel?.cursoId || '-')}</strong>{actaSel?.cursoNivel ? ` · ${actaSel.cursoNivel}` : ''}<br/>
                Materia: <strong>{actaSel?.materiaNombre || '-'}</strong><br/>
                Turno: <strong>{actaSel?.turnoNombre || actaSel?.turnoId || '-'}</strong><br/>
                Fecha mesa: <strong>{actaSel?.fecha || '-'}</strong> · Fecha cierre: <strong>{actaSel?.fechaCierre || '-'}</strong><br/>
                Docentes: <strong>{Array.isArray(actaSel?.docentes) ? actaSel.docentes.map(d => {
                  const nombre = d.nombre || d.nombreCompleto || d.apellidoNombre || '';
                  const dni = d.dni ? ` (${d.dni})` : '';
                  return (nombre + dni).trim();
                }).filter(Boolean).join(', ') : (actaSel?.docenteNombre || '-')}</strong>
              </div>
              {/* Si el backend trae detalle de alumnos, lo mostramos también aquí */}
              {Array.isArray((actaSel?.alumnos || actaSel?.items || actaSel?.detalle)) && (actaSel?.alumnos || actaSel?.items || actaSel?.detalle)?.length > 0 && (
                <div className="table-responsive mt-3">
                  <Table bordered size="sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Alumno</th>
                        <th>DNI</th>
                        <th>Condición</th>
                        <th>Nota</th>
                        <th>Observación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(actaSel.alumnos || actaSel.items || actaSel.detalle).map((r,i) => (
                        <tr key={i}>
                          <td>{i+1}</td>
                          <td>{r.apellidoNombre || `${r.apellido || ''} ${r.nombre || ''}`.trim()}</td>
                          <td>{r.dni ?? '-'}</td>
                          <td>{r.condicionRinde ?? '-'}</td>
                          <td>{r.nota ?? r.notaFinal ?? r.pf ?? '-'}</td>
                          <td>{r.observacion || r.estado || r.estadoFinal || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          {actaSel && (
            <>
              <Button variant="primary" onClick={guardarActa} disabled={saving}>{saving ? <Spinner size="sm"/> : 'Guardar'}</Button>
              <Button variant="outline-danger" onClick={borrarActa} disabled={saving}>Eliminar</Button>
              <Button variant="outline-secondary" onClick={imprimirActa} disabled={saving}>Imprimir / PDF</Button>
              {(!actaSel?.id || !actaSel?.numeroActa) && (
                <Button variant="outline-warning" disabled className="ms-2">Acta parcial (datos incompletos)</Button>
              )}
            </>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
