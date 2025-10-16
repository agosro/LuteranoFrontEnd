import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Card, Button, Form, Row, Col, Table, Spinner, Alert, Badge } from "react-bootstrap";
import AsyncSelect from "react-select/async";
import { useAuth } from "../Context/AuthContext";
import { useLocation } from "react-router-dom";
import { listarAlumnosConFiltros } from "../Services/AlumnoService";
import { listarCursos, listarCursosPorDocente, listarCursosPorPreceptor } from "../Services/CursoService";
import { listarAlumnosPorCurso } from "../Services/HistorialCursoService";
import { listarCalifPorAnio } from "../Services/CalificacionesService";
import { resumenNotasAlumnoPorAnio } from "../Services/ReporteNotasService";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";
import Estadisticas from "../Components/Reportes/Estadisticas";

// Contract expected from backend (approx):
// Contrato backend confirmado:
// CalificacionesAlumnoAnioResponse { code, mensaje, calificacionesAlumnoResumenDto }
// calificacionesAlumnoResumenDto: { alumnoId, dni, apellido, nombre, anio, materias: CalificacionesMateriaResumenDto[] }
// CalificacionesMateriaResumenDto: { materiaId, materiaNombre, e1Notas: int[], e2Notas: int[], e1: number, e2: number, pg: number, estado: string }

export default function ReporteNotasAlumnos() {
  const { user } = useAuth();
  const token = user?.token;
  const location = useLocation();
  const preselectedAlumnoId = location.state?.preselectedAlumnoId;

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [alumnoId, setAlumnoId] = useState(preselectedAlumnoId || "");
  const [alumnoOption, setAlumnoOption] = useState(null);
  const [cursos, setCursos] = useState([]);
  const [cursoAnioSel, setCursoAnioSel] = useState("");
  const [divisionSel, setDivisionSel] = useState("");
  const [cursoId, setCursoId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [diag, setDiag] = useState(null); // info de diagnóstico
  // const [rawForYear, setRawForYear] = useState(null); // calificaciones crudas del año
  const printRef = React.useRef(null);

  // Cargar cursos (según rol)
  useEffect(() => {
    let active = true;
    async function loadCursos() {
      try {
        let lista = [];
        if (user?.rol === "ROLE_DOCENTE" && user?.docenteId) {
          lista = await listarCursosPorDocente(token, user.docenteId);
        } else if (user?.rol === "ROLE_PRECEPTOR" && user?.preceptorId) {
          lista = await listarCursosPorPreceptor(token, user.preceptorId);
        } else {
          lista = await listarCursos(token);
        }
        if (active) setCursos(lista || []);
      } catch {
        // noop
      }
    }
    if (token) loadCursos();
    return () => { active = false; };
  }, [token, user]);

  // Derivar opciones de año y división a partir de cursos
  const aniosCursoOptions = useMemo(() => {
    const set = new Set();
    (cursos || []).forEach(c => { if (c.anio != null) set.add(String(c.anio)); });
    return Array.from(set).sort((a,b)=> Number(a)-Number(b));
  }, [cursos]);

  const divisionesOptions = useMemo(() => {
    if (!cursoAnioSel) return [];
    const set = new Set();
    (cursos || []).filter(c => String(c.anio) === String(cursoAnioSel)).forEach(c => {
      if (c.division != null && c.division !== '') set.add(String(c.division));
    });
    return Array.from(set).sort();
  }, [cursos, cursoAnioSel]);

  // Cuando cambian año y división, calcular cursoId
  useEffect(() => {
    const match = (cursos || []).find(c => String(c.anio) === String(cursoAnioSel) && String(c.division) === String(divisionSel));
    setCursoId(match?.id ? String(match.id) : "");
  }, [cursos, cursoAnioSel, divisionSel]);

  // Al cambiar curso, limpiar alumno seleccionado (salvo que venga preseleccionado)
  useEffect(() => {
    if (!preselectedAlumnoId) {
      setAlumnoOption(null);
      setAlumnoId("");
    }
  }, [cursoId, preselectedAlumnoId]);

  // Cargar alumno preseleccionado si viene del state
  useEffect(() => {
    if (!preselectedAlumnoId || !token) return;
    let active = true;
    async function loadPreselected() {
      try {
        const lista = await listarAlumnosConFiltros(token, {});
        const alumno = (lista || []).find(a => String(a.id) === String(preselectedAlumnoId));
        if (active && alumno) {
          const opt = {
            value: alumno.id,
            label: `${alumno.apellido || ''}, ${alumno.nombre || ''}${alumno.dni ? ' - ' + alumno.dni : ''}`.trim()
          };
          setAlumnoOption(opt);
          setAlumnoId(String(alumno.id));
        }
      } catch (e) {
        console.error("Error cargando alumno preseleccionado:", e);
      }
    }
    loadPreselected();
    return () => { active = false; };
  }, [preselectedAlumnoId, token]);

  // Helpers para búsqueda
  const buildFiltrosAlumno = useCallback((q) => {
    const s = (q || "").trim();
    if (!s) return {};
    if (/^\d{3,}$/.test(s)) return { dni: s };
    // backend acepta nombre/apellido; usamos ambos con el mismo término
    return { nombre: s, apellido: s };
  }, []);

  const alumnosCursoCache = useRef({}); // cursoId -> lista alumnos
  const alumnosDefaultCache = useRef(null); // lista default sin curso
  const buscarEnLista = (lista, q) => {
    const s = (q || "").toLowerCase();
    if (!s) return lista;
    return (lista || []).filter(a => {
      const nom = `${a.apellido || ''} ${a.nombre || ''}`.toLowerCase();
      const dni = (a.dni || '').toString();
      return nom.includes(s) || dni.includes(s);
    });
  };

  const loadAlumnoOptions = useCallback(async (inputValue) => {
    const q = (inputValue || "").trim();
    try {
      // Si hay curso seleccionado, buscar dentro de ese curso
      if (cursoId) {
        let lista = alumnosCursoCache.current[cursoId];
        if (!lista) {
          lista = await listarAlumnosPorCurso(token, Number(cursoId));
          alumnosCursoCache.current[cursoId] = Array.isArray(lista) ? lista : [];
        }
        const filtrada = buscarEnLista(lista, q).slice(0, 200);
        return filtrada.map(a => ({ value: a.id, label: `${a.apellido || ''}, ${a.nombre || ''}${a.dni ? ' - ' + a.dni : ''}`.trim() }));
      }
      // Sin curso: búsqueda remota por nombre/apellido o DNI
      if (q.length < 1) {
        // Lista default sin filtro (cacheada)
        if (!alumnosDefaultCache.current) {
          const lista = await listarAlumnosConFiltros(token, {});
          alumnosDefaultCache.current = Array.isArray(lista) ? lista : [];
        }
        return alumnosDefaultCache.current.slice(0, 200).map(a => ({ value: a.id, label: `${a.apellido || ''}, ${a.nombre || ''}${a.dni ? ' - ' + a.dni : ''}`.trim() }));
      }
      const filtros = buildFiltrosAlumno(q);
      const lista = await listarAlumnosConFiltros(token, filtros);
      return (lista || []).slice(0, 200).map(a => ({ value: a.id, label: `${a.apellido || ''}, ${a.nombre || ''}${a.dni ? ' - ' + a.dni : ''}`.trim() }));
    } catch {
      return [];
    }
  }, [token, cursoId, buildFiltrosAlumno]);

  const aniosPosibles = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setData(null);
    if (!alumnoId) {
      setError("Seleccioná un alumno");
      return;
    }
    if (!anio) {
      setError("Seleccioná un año");
      return;
    }
    try {
      setLoading(true);
      setDiag(null);
      const res = await resumenNotasAlumnoPorAnio(token, alumnoId, anio);
      setData(res);
      if (res?.code && res.code < 0) setError(res.mensaje || "Error en el reporte");

      // Traigo también las calificaciones crudas del año para diagnóstico y posibles tooltips de fechas
      try {
        const crudas = await listarCalifPorAnio(token, alumnoId, anio);
        const count = Array.isArray(crudas?.calificaciones) ? crudas.calificaciones.length : 0;
        const materiasLen = (res?.calificacionesAlumnoResumenDto?.materias || []).length;
        if (!error && materiasLen === 0) {
          if (count > 0) {
            setDiag({ type: "warn", msg: `Se encontraron ${count} calificaciones en ${anio}, pero no se pudieron agrupar (¿números de nota 1-4 y etapas 1-2?).` });
          } else {
            setDiag({ type: "info", msg: `No se encontraron calificaciones con fecha del año ${anio} para este alumno. Verificá la fecha de las notas.` });
          }
        }
      } catch {
        // ignorar
      }
    } catch (err) {
      setError(err.message || "Error al generar reporte");
    } finally {
      setLoading(false);
    }
  };

  const resumenDto = data?.calificacionesAlumnoResumenDto;
  const resumen = resumenDto?.materias || [];

  const exportCSV = () => {
    if (!resumen || resumen.length === 0) return;
    const header = [
      "Materia",
      "E1 N1","E1 N2","E1 N3","E1 N4","E1 Prom",
      "E2 N1","E2 N2","E2 N3","E2 N4","E2 Prom",
      "PG","Estado"
    ];
    const rows = resumen.map(r => {
      const e1arr = Array.isArray(r.e1Notas) ? r.e1Notas : [];
      const e2arr = Array.isArray(r.e2Notas) ? r.e2Notas : [];
      return [
        r.materiaNombre || "",
        e1arr[0] ?? "", e1arr[1] ?? "", e1arr[2] ?? "", e1arr[3] ?? "", (r.e1 ?? ""),
        e2arr[0] ?? "", e2arr[1] ?? "", e2arr[2] ?? "", e2arr[3] ?? "", (r.e2 ?? ""),
        (r.pg ?? ""), (r.estado ?? "")
      ];
    });
    const csv = [header, ...rows]
      .map(cols => cols.map(v => {
        const s = v == null ? "" : String(v);
        // escapar comillas y envolver si hay separadores
        const escaped = '"' + s.replace(/"/g, '""') + '"';
        return escaped;
      }).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const nombreAlumno = resumenDto ? `${resumenDto.apellido || ''}_${resumenDto.nombre || ''}`.trim() : "alumno";
    a.href = url;
    a.download = `reporte_notas_${nombreAlumno}_${anio}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats globales
  const pgList = resumen.map(r => r.pg).filter(v => typeof v === 'number');
  const totalMaterias = resumen.length;
  const aprobadas = resumen.filter(r => (r.estado || '').toLowerCase() === 'aprobado' || (r.pg ?? 0) >= 6).length;
  const desaprobadas = totalMaterias - aprobadas;
  const promedioGeneralAlumno = pgList.length ? Math.round((pgList.reduce((a,b)=>a+b,0)/pgList.length)*10)/10 : null;

  const printOnlyTable = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const css = `
      body { font-family: Arial, sans-serif; padding: 16px; }
      h3 { margin: 0 0 12px 0; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
      thead tr:first-child th { background: #f0f0f0; }
    `;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte de Notas</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>Notas de ${resumenDto?.apellido || ''}, ${resumenDto?.nombre || ''} - Año ${resumenDto?.anio || anio}</h3>`);
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
      <h2 className="mb-3">Notas de un Alumno</h2>

      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={onSubmit}>
            <Row className="g-3">
              <Col md={3}>
                <Form.Label>Curso (Año, opcional)</Form.Label>
                <Form.Select value={cursoAnioSel} onChange={(e)=>setCursoAnioSel(e.target.value)}>
                  <option value="">Todos</option>
                  {aniosCursoOptions.map(an => (
                    <option key={an} value={an}>{an}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Label>División (opcional)</Form.Label>
                <Form.Select value={divisionSel} onChange={(e)=>setDivisionSel(e.target.value)} disabled={!cursoAnioSel}>
                  <option value="">Todas</option>
                  {divisionesOptions.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label>Alumno</Form.Label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions={true}
                  loadOptions={loadAlumnoOptions}
                  value={alumnoOption}
                  onChange={(opt) => { setAlumnoOption(opt); setAlumnoId(opt?.value || ""); }}
                  placeholder={cursoId ? "Seleccioná o escribí para filtrar dentro del curso..." : "Seleccioná un alumno o escribí para filtrar"}
                  isClearable
                  classNamePrefix="select"
                />
              </Col>
              <Col md={2}>
                <Form.Label>Año</Form.Label>
                <Form.Select value={anio} onChange={(e) => setAnio(e.target.value)}>
                  {aniosPosibles.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button type="submit" variant="primary" disabled={loading || !alumnoId}>
                  {loading ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" /> Generando...
                    </>
                  ) : (
                    "Generar reporte"
                  )}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}
      {!error && diag && (
        <Alert variant={diag.type === 'warn' ? 'warning' : 'info'}>{diag.msg}</Alert>
      )}

      {loading && (
        <div className="d-flex align-items-center">
          <Spinner animation="border" className="me-2" /> Cargando datos...
        </div>
      )}

      {!loading && data && !error && (
        <>
          {/* Estadísticas rápidas */}
          <Card className="mb-3">
            <Card.Body>
              <Estadisticas
                items={[
                  { label: "Materias", value: totalMaterias },
                  { label: "Aprobadas", value: aprobadas, variant: "success" },
                  { label: "Desaprobadas", value: desaprobadas, variant: "danger" },
                  { label: "Promedio General", value: promedioGeneralAlumno ?? "-" },
                ]}
              />
            </Card.Body>
          </Card>

          {/* Tabla detallada con notas por etapa */}
          <Card>
            <Card.Body>
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3">
                <div>
                  <h5 className="mb-1">Detalle de Notas por Materia</h5>
                  {resumenDto && (
                    <div className="text-muted small">
                      Alumno: {resumenDto.apellido}, {resumenDto.nombre} {resumenDto.dni ? `(DNI ${resumenDto.dni})` : ''} · Año: {resumenDto.anio}
                    </div>
                  )}
                </div>
                <div className="mt-2 mt-md-0">
                  <Button variant="outline-secondary" size="sm" className="me-2" onClick={exportCSV} disabled={!resumen || resumen.length===0}>
                    Exportar CSV
                  </Button>
                  <Button variant="outline-secondary" size="sm" onClick={printOnlyTable}>
                    Imprimir / PDF (solo tabla)
                  </Button>
                </div>
              </div>

              <div ref={printRef}>
                {Array.isArray(resumen) && resumen.length > 0 ? (
                  <Table striped bordered hover responsive size="sm">
                    <thead>
                      <tr>
                        <th>Materia</th>
                        <th colSpan={5} className="text-center">Calificaciones Etapa 1</th>
                        <th colSpan={5} className="text-center">Calificaciones Etapa 2</th>
                        <th>PG</th>
                        <th>Estado</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>N1</th><th>N2</th><th>N3</th><th>N4</th><th>E1</th>
                        <th>N1</th><th>N2</th><th>N3</th><th>N4</th><th>E2</th>
                        <th></th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.map((r, idx) => {
                        const e1 = Array.isArray(r.e1Notas) ? r.e1Notas : [];
                        const e2 = Array.isArray(r.e2Notas) ? r.e2Notas : [];
                        return (
                          <tr key={r.materiaId ?? idx}>
                            <td>{r.materiaNombre}</td>
                            <td>{e1[0] ?? '-'}</td><td>{e1[1] ?? '-'}</td><td>{e1[2] ?? '-'}</td><td>{e1[3] ?? '-'}</td><td><Badge bg="light" text="dark">{r.e1 ?? '-'}</Badge></td>
                            <td>{e2[0] ?? '-'}</td><td>{e2[1] ?? '-'}</td><td>{e2[2] ?? '-'}</td><td>{e2[3] ?? '-'}</td><td><Badge bg="light" text="dark">{r.e2 ?? '-'}</Badge></td>
                            <td><Badge bg={(r.pg ?? 0) >= 6 ? 'success' : 'danger'}>{r.pg ?? '-'}</Badge></td>
                            <td>{r.estado ?? '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                ) : (
                  <div className="text-muted">Sin datos para mostrar.</div>
                )}
              </div>
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
}
