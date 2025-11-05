import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, Row, Col, Form, Button, Spinner, Alert, Badge } from "react-bootstrap";
import AsyncAlumnoSelect from "../Components/Controls/AsyncAlumnoSelect";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";
import { useAuth } from "../Context/AuthContext";
import { useLocation } from "react-router-dom";
import { listarAlumnosConFiltros } from "../Services/AlumnoService";
import { obtenerHistorialActualAlumno } from "../Services/HistorialCursoService";
import { isoToDisplay } from "../utils/fechas";
import { getTituloCurso } from "../utils/cursos";
import { listarCursos } from "../Services/CursoService";
import { listarAlumnosPorCurso } from "../Services/HistorialCursoService";
import { useCicloLectivo } from "../Context/CicloLectivoContext.jsx";

export default function ReporteLegajoAlumno() {
  const { user } = useAuth();
  const token = user?.token;
  const location = useLocation();
  const preselectedAlumnoId = location.state?.preselectedAlumnoId;
  const { cicloLectivo } = useCicloLectivo();

  const [alumnoId, setAlumnoId] = useState(preselectedAlumnoId || "");
  const [alumnoOption, setAlumnoOption] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  // DNI search integrado en AsyncAlumnoSelect

  // Filtro opcional por curso/división
  const [cursos, setCursos] = useState([]);
  const [cursoId, setCursoId] = useState("");
  const [loadingCursos, setLoadingCursos] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [datos, setDatos] = useState(null); // legajo compilado
  const printRef = useRef(null);

  // Cargar alumnos para selector
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const lista = await listarAlumnosConFiltros(token, {});
        if (active) setAlumnos(lista);
      } catch (e) {
        console.error(e);
  } finally { /* noop */ }
    }
    if (token) load();
    return () => { active = false; };
  }, [token]);

  // Cargar cursos para el filtro opcional
  useEffect(() => {
    let active = true;
    async function loadCursos() {
      try {
        setLoadingCursos(true);
        const lista = await listarCursos(token);
        if (active) setCursos(lista || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoadingCursos(false);
      }
    }
    if (token) loadCursos();
    return () => { active = false; };
  }, [token]);

  // Al cambiar curso, traer alumnos de ese curso (opcional)
  useEffect(() => {
    let active = true;
    async function loadAlumnosPorCurso() {
      try {
        if (!cursoId) {
          // Si se limpia el curso, volvemos al listado general
          const lista = await listarAlumnosConFiltros(token, {});
          if (active) setAlumnos(lista);
          return;
    }
    const lista = await listarAlumnosPorCurso(token, cursoId, cicloLectivo?.id ?? null);
        if (active) setAlumnos(lista || []);
        // Si el alumno seleccionado no pertenece, limpiarlo
        if (active && alumnoId) {
          const stillThere = (lista || []).some(a => String(a.id) === String(alumnoId));
          if (!stillThere) { setAlumnoId(""); setAlumnoOption(null); }
        }
      } catch (e) {
        console.error("Error al cargar alumnos por curso", e);
        if (active) setAlumnos([]);
  } finally { /* noop */ }
    }
    if (token) loadAlumnosPorCurso();
    return () => { active = false; };
  }, [token, cursoId, alumnoId, cicloLectivo?.id]);

  // Búsqueda y carga de alumnos encapsuladas en AsyncAlumnoSelect

  const alumnoSel = useMemo(() => alumnos.find(a => String(a.id) === String(alumnoId)) || null, [alumnos, alumnoId]);

  const onGenerar = async (e) => {
    e.preventDefault();
    setError("");
    setDatos(null);
    if (!alumnoId) { setError("Seleccioná un alumno"); return; }
    try {
      setLoading(true);
      // Base de datos personales desde lista (evita otro endpoint detalle)
      const base = alumnoOption?.raw || alumnoSel || {};
      // Curso vigente y ciclo: usar exactamente el campo del backend
      let vigente = null;
      try {
        const res = await obtenerHistorialActualAlumno(token, alumnoId);
        vigente = res?.historialCurso || null;
      } catch { /* opcional */ }
      setDatos({ alumno: base, vigente });
    } catch (err) {
      setError(err.message || "Error al generar legajo");
    } finally {
      setLoading(false);
    }
  };

  const printOnly = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const css = `
      body { font-family: Arial, sans-serif; padding: 16px; }
      h3 { margin: 0 0 12px 0; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
      .box { border: 1px solid #ccc; padding: 8px; border-radius: 4px; }
      .box h6 { margin: 0 0 6px 0; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
      thead tr:first-child th { background: #f0f0f0; }
    `;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Legajo de Alumno</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>Legajo por Alumno</h3>`);
    win.document.write(printRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div className="container mt-4">
      <div className="mb-1"><Breadcrumbs /></div>
      <div className="mb-2"><BackButton /></div>
      <h2 className="mb-2">Legajo de Alumno</h2>
      <div className="mb-3">
        {cicloLectivo?.id ? (
          <Badge bg="secondary">Ciclo lectivo: {String(cicloLectivo?.nombre || cicloLectivo?.id)}</Badge>
        ) : (
          <Alert variant="warning" className="py-1 px-2 mb-0">Seleccioná un ciclo lectivo en Configuración &gt; Ciclo lectivo</Alert>
        )}
      </div>

      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={onGenerar}>
            <Row className="g-3">
              <Col md={4}>
                <Form.Label>Curso (opcional)</Form.Label>
                <Form.Select value={cursoId} onChange={(e)=>setCursoId(e.target.value)} disabled={loadingCursos}>
                  <option value="">Todos</option>
                  {cursos.map(c => (
                    <option key={c.id} value={c.id}>{getTituloCurso(c) || c.nombre || `${c.anio||''} ${c.division||''}`}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={8}>
                <Form.Label>Alumno</Form.Label>
                <AsyncAlumnoSelect
                  token={token}
                  value={alumnoOption}
                  onChange={(opt) => { setAlumnoOption(opt); setAlumnoId(opt?.value || ""); }}
                  cursos={cursos}
                  cursoId={cursoId}
                  showDniSearch={true}
                />
              </Col>
              <Col md={12} className="d-flex align-items-end justify-content-end">
                <Button type="submit" variant="primary" disabled={loading}>{loading ? <><Spinner size="sm" animation="border" className="me-2"/>Generando...</> : "Generar"}</Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && datos && (
        <Card>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="mb-1">{datos.alumno?.apellido}, {datos.alumno?.nombre}</h5>
                <div className="text-muted small">DNI: {datos.alumno?.dni || '-'} · Email: {datos.alumno?.email || '-'}</div>
              </div>
              <div>
                <Button size="sm" className="me-2" variant="outline-secondary" onClick={printOnly}>Imprimir / PDF</Button>
                {/* TODO: exportar a archivo PDF real si se requiere una descarga directa */}
              </div>
            </div>

            <div ref={printRef}>
              <Row className="mb-3">
                <Col md={6}>
                  <div className="box">
                    <h6>Datos personales</h6>
                    <div className="small">Nombre: <strong>{datos.alumno?.nombre || '-'}</strong></div>
                    <div className="small">Apellido: <strong>{datos.alumno?.apellido || '-'}</strong></div>
                    <div className="small">Tipo Doc.: <strong>{datos.alumno?.tipoDoc || 'DNI'}</strong></div>
                    <div className="small">N° Doc.: <strong>{datos.alumno?.dni || '-'}</strong></div>
                    <div className="small">Género: <strong>{datos.alumno?.genero || '-'}</strong></div>
                    <div className="small">Fecha Nac.: <strong>{datos.alumno?.fechaNacimiento ? isoToDisplay(datos.alumno.fechaNacimiento) : '-'}</strong></div>
                    <div className="small">Nacionalidad: <strong>{datos.alumno?.nacionalidad || '-'}</strong></div>
                    <div className="small">Domicilio: <strong>{datos.alumno?.direccion || '-'}</strong></div>
                    <div className="small">Localidad: <strong>{datos.alumno?.localidad || '-'}</strong></div>
                    <div className="small">Ingreso: <strong>{datos.alumno?.fechaIngreso ? isoToDisplay(datos.alumno.fechaIngreso) : '-'}</strong></div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="box">
                    <h6>Contacto</h6>
                    <div className="small">Teléfono: <strong>{datos.alumno?.telefono || '-'}</strong></div>
                    <div className="small">Email: <strong>{datos.alumno?.email || '-'}</strong></div>
                    <div className="small">
                      Tutor: {alumnoSel?.tutor ? (
                        <>
                          <strong>{`${alumnoSel.tutor.apellido ?? ''} ${alumnoSel.tutor.nombre ?? ''}`.trim()}</strong>
                          {" "}· Teléfono: <strong>{alumnoSel.tutor.telefono || '-'}</strong>
                        </>
                      ) : (<strong> -</strong>)}
                    </div>
                  </div>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={12}>
                  <div className="box">
                    <h6>Curso vigente</h6>
                    {datos.vigente ? (
                      <div className="small">
                        <div>Curso: <strong>{getTituloCurso(datos.vigente?.curso) || '-'}</strong></div>
                        <div>Ciclo Lectivo: <strong>{datos.vigente?.cicloLectivo?.nombre || '-'}</strong></div>
                        <div>Desde: <strong>{datos.vigente?.fechaDesde ? isoToDisplay(datos.vigente.fechaDesde) : '-'}</strong> {datos.vigente?.fechaHasta ? <>• Hasta: <strong>{isoToDisplay(datos.vigente.fechaHasta)}</strong></> : null}</div>
                        <div>Estado: <strong>{datos.vigente?.estado || '-'}</strong></div>
                      </div>
                    ) : (
                      <div className="text-muted small">Sin curso vigente</div>
                    )}
                  </div>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <div className="box">
                    <h6>Documentos adjuntos</h6>
                    <div className="text-muted small">Aún no implementado. Cuando exista el endpoint de documentos, se listarán aquí (CVAC, CDOM, CANP, CUS, DNI-F, DNI-D, PNAC, FPACE, etc.) con botones para "Ver archivo".</div>
                  </div>
                </Col>
              </Row>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
