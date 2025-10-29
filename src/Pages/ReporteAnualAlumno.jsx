import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Card, Button, Form, Row, Col, Table, Spinner, Alert, Badge } from "react-bootstrap";
import AsyncSelect from "react-select/async";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";
import { useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { listarCursos, listarCursosPorDocente, listarCursosPorPreceptor } from "../Services/CursoService";
import { listarAlumnosConFiltros } from "../Services/AlumnoService";
import { listarAlumnosPorCurso } from "../Services/HistorialCursoService";
import { obtenerInformeAnualAlumno } from "../Services/ReporteAnualAlumnoService";

export default function ReporteAnualAlumno() {
  const { user } = useAuth();
  const token = user?.token;
  const location = useLocation();
  const preselectedAlumnoId = location.state?.preselectedAlumnoId;

  // Filtros y selección
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [cursos, setCursos] = useState([]);
  const [cursoAnioSel, setCursoAnioSel] = useState("");
  const [divisionSel, setDivisionSel] = useState("");
  const [cursoId, setCursoId] = useState("");
  const [alumnoId, setAlumnoId] = useState(preselectedAlumnoId || "");
  const [alumnoOption, setAlumnoOption] = useState(null);

  // Estado
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const printRef = useRef(null);

  // Cargar cursos según rol
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        let lista = [];
        if (user?.rol === "ROLE_DOCENTE" && user?.docenteId) {
          lista = await listarCursosPorDocente(token, user.docenteId);
        } else if (user?.rol === "ROLE_PRECEPTOR" && user?.preceptorId) {
          lista = await listarCursosPorPreceptor(token, user.preceptorId);
        } else {
          lista = await listarCursos(token);
        }
        setCursos(lista || []);
      } catch {
        // noop
      }
    })();
  }, [token, user]);

  // Derivar opciones de año/ división
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

  // Mapear cursoId a partir de año+división
  useEffect(() => {
    const match = (cursos || []).find(c => String(c.anio) === String(cursoAnioSel) && String(c.division) === String(divisionSel));
    setCursoId(match?.id ? String(match.id) : "");
  }, [cursos, cursoAnioSel, divisionSel]);

  // Reset alumno cuando cambia curso (si no viene preseleccionado)
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
      } catch {
        // noop
      }
    }
    loadPreselected();
    return () => { active = false; };
  }, [preselectedAlumnoId, token]);

  // Cache y helpers de alumnos (misma lógica que ReporteNotasAlumnos)
  const alumnosCursoCache = React.useRef({});
  const alumnosYearCache = React.useRef({});
  const alumnosDefaultCache = React.useRef(null);
  // Forzar remontar el AsyncSelect cuando cambian año/división/cursoId para refrescar opciones por defecto
  const alumnoSelectKey = React.useMemo(
    () => `alumno-${cursoAnioSel || 'any'}-${divisionSel || 'any'}-${cursoId || 'none'}`,
    [cursoAnioSel, divisionSel, cursoId]
  );
  const buscarEnLista = (lista, q) => {
    const s = (q || "").toLowerCase();
    if (!s) return lista;
    return (lista || []).filter(a => {
      const nom = `${a.apellido || ''} ${a.nombre || ''}`.toLowerCase();
      const dni = (a.dni || '').toString();
      return nom.includes(s) || dni.includes(s);
    });
  };

  const buildFiltrosAlumno = useCallback((q) => {
    const s = (q || "").trim();
    if (!s) return {};
    if (/^\d{3,}$/.test(s)) return { dni: s };
    return { nombre: s, apellido: s };
  }, []);

  const loadAlumnoOptions = useCallback(async (inputValue) => {
    const q = (inputValue || "").trim();
    try {
      if (cursoId) {
        let lista = alumnosCursoCache.current[cursoId];
        if (!lista) {
          lista = await listarAlumnosPorCurso(token, Number(cursoId));
          alumnosCursoCache.current[cursoId] = Array.isArray(lista) ? lista : [];
        }
        const filtrada = buscarEnLista(lista, q).slice(0, 200);
        return filtrada.map(a => ({ value: a.id, label: `${a.apellido || ''}, ${a.nombre || ''}${a.dni ? ' - ' + a.dni : ''}`.trim() }));
      }
      if (cursoAnioSel) {
        let yearList = alumnosYearCache.current[cursoAnioSel];
        if (!yearList) {
          const cursosDelAnio = (cursos || []).filter(c => String(c.anio) === String(cursoAnioSel));
          const ids = cursosDelAnio.map(c => c.id).filter(Boolean);
          const results = await Promise.all(ids.map(id => listarAlumnosPorCurso(token, Number(id)).catch(() => [])));
          const map = new Map();
          for (const arr of results) {
            for (const a of (arr || [])) {
              if (!map.has(a.id)) map.set(a.id, a);
            }
          }
          yearList = Array.from(map.values());
          alumnosYearCache.current[cursoAnioSel] = yearList;
        }
        const filtrada = buscarEnLista(yearList, q).slice(0, 200);
        return filtrada.map(a => ({ value: a.id, label: `${a.apellido || ''}, ${a.nombre || ''}${a.dni ? ' - ' + a.dni : ''}`.trim() }));
      }
      if (q.length < 1) {
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
  }, [token, cursoId, cursoAnioSel, cursos, buildFiltrosAlumno]);

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
      const res = await obtenerInformeAnualAlumno(token, alumnoId, anio);
      setData(res);
      if (res?.code && res.code < 0) setError(res.mensaje || "Error en el reporte");
    } catch (err) {
      setError(err.message || "Error al generar reporte");
    } finally {
      setLoading(false);
    }
  };

  const dto = data?.data; // ReporteAnualAlumnoDto
  const materias = useMemo(() => dto?.materias || [], [dto]);

  // Derivados para badges
  const cantPrevias = useMemo(() => {
    if (!Array.isArray(dto?.materiasPreviasIds)) {
      // alternativamente detectar previas por estado
      return materias.filter(m => (m?.estado || '').toLowerCase() === 'desaprobado' || (m?.estadoFinal || '').toLowerCase() === 'desaprobado').length;
    }
    return dto.materiasPreviasIds.length;
  }, [dto, materias]);

  const exportCSV = () => {
    // Construir un CSV más completo: metadatos + tabla de materias + resumen de inasistencias y previas
    const lines = [];
    const alumnoNombre = `${dto?.apellido || ''}, ${dto?.nombre || ''}`.trim();
    const cursoLbl = dto?.curso ? `${dto.curso.anio || ''} ${dto.curso.division || ''}`.trim() : '';
    // Metadatos
    lines.push(["Colegio", "COLEGIO LUTERANO CONCORDIA"]);
    lines.push(["Año", dto?.anio ?? anio]);
    lines.push(["Alumno", alumnoNombre]);
    lines.push(["DNI", dto?.dni ?? ""]);
    lines.push(["Legajo", dto?.legajo || dto?.dni || ""]);
    lines.push(["Curso", cursoLbl]);
    lines.push(["Nivel", dto?.curso?.nivel || ""]);
    lines.push(["Promedio final curso", dto?.promedioFinalCurso ?? ""]);
    // Resumen inasistencias
    lines.push(["Inasistencias (ponderado)", dto?.inasistencias?.ponderado ?? ""]);
    lines.push(["Ausentes", dto?.inasistencias?.ausentes ?? 0]);
    lines.push(["Tardes", dto?.inasistencias?.tardes ?? 0]);
    lines.push(["Retiros", dto?.inasistencias?.retiros ?? 0]);
    lines.push(["Justificados", dto?.inasistencias?.justificados ?? 0]);
    lines.push(["Previas (cant)", cantPrevias]);
    lines.push([]);
    // Tabla materias
    const header = [
      "Materia",
      "E1 N1","E1 N2","E1 N3","E1 N4","E1 Prom",
      "E2 N1","E2 N2","E2 N3","E2 N4","E2 Prom",
      "PG","Estado","Nota Final","Estado Final","Estado Materia"
    ];
    lines.push(header);
    if (Array.isArray(materias)) {
      materias.forEach(r => {
        const e1arr = Array.isArray(r.e1Notas) ? r.e1Notas : [];
        const e2arr = Array.isArray(r.e2Notas) ? r.e2Notas : [];
        lines.push([
          r.materiaNombre || "",
          e1arr[0] ?? "", e1arr[1] ?? "", e1arr[2] ?? "", e1arr[3] ?? "", (r.e1 ?? ""),
          e2arr[0] ?? "", e2arr[1] ?? "", e2arr[2] ?? "", e2arr[3] ?? "", (r.e2 ?? ""),
          (r.pg ?? ""), (r.estado ?? ""), (r.notaFinal ?? ""), (r.estadoFinal ?? ""), (r.estadoMateria ?? "")
        ]);
      });
    }
    // Previas detalle
    lines.push([]);
    lines.push(["Previas"]);
    if (cantPrevias > 0) {
      materias
        .filter(m => (m?.estado || '').toLowerCase() === 'desaprobado' || (m?.estadoFinal || '').toLowerCase() === 'desaprobado')
        .forEach(m => lines.push([m.materiaNombre]));
    } else {
      lines.push(["-"]);
    }

    const csv = lines
      .map(cols => (Array.isArray(cols) ? cols : [cols])
        .map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"')
        .join(','))
      .join('\n');

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const nombreAlumno = `${dto?.apellido || ''}_${dto?.nombre || ''}`.trim() || 'alumno';
    a.href = url;
    a.download = `reporte_anual_${nombreAlumno}_${anio}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printOnlyTable = () => {
    // Imprimir TODO el informe (encabezado, resumen, tabla y bloques inferiores)
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const css = `
      body { font-family: Arial, sans-serif; padding: 16px; }
      h3 { margin: 0 0 12px 0; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
      thead tr:first-child th { background: #f0f0f0; }
      .card { border: 1px solid #ddd; margin-bottom: 12px; }
      .card-header { background: #f7f7f7; padding: 6px 8px; font-weight: 600; }
      .card-body { padding: 8px; }
      .badge { font-size: 12px; }
    `;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte Anual de Alumno</title><style>${css}</style></head><body>`);
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
      <h2 className="mb-3">Informe Anual de Alumno</h2>

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
                  key={alumnoSelectKey}
                  cacheOptions={false}
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
                    <option key={y} value={y}>{y}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button type="submit" variant="primary" disabled={loading || !alumnoId}>
                  {loading ? (<><Spinner size="sm" animation="border" className="me-2" /> Generando...</>) : "Generar reporte"}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Acciones debajo del cuadro de generar reporte y antes del informe */}
      {!loading && dto && !error && (
        <div className="d-flex justify-content-end gap-2 mb-3">
          <Button variant="outline-secondary" size="sm" onClick={exportCSV} disabled={!materias || materias.length===0}>Exportar CSV</Button>
          <Button variant="outline-secondary" size="sm" onClick={printOnlyTable} disabled={!materias || materias.length===0}>Imprimir / PDF</Button>
        </div>
      )}

      {!loading && dto && !error && (
        <div ref={printRef}>
          {/* Encabezado del informe (estilo planilla) */}
          <Card className="mb-3">
            <Card.Body>
              <table className="table table-bordered table-sm mb-0">
                <tbody>
                  <tr>
                    <td><strong>COLEGIO LUTERANO CONCORDIA</strong></td>
                    <td className="text-end">Fecha · {dto?.anio || anio}</td>
                  </tr>
                  <tr>
                    <td colSpan={2}>
                      Apellido y nombre alumno: <strong>{dto?.apellido || '-'}, {dto?.nombre || '-'}</strong>
                      &nbsp;&nbsp; DNI: <strong>{dto?.dni || '-'}</strong>
                      &nbsp;&nbsp; Legajo: <strong>{dto?.legajo || dto?.dni || '-'}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      Curso: <strong>{dto?.curso ? `${dto.curso.anio || ''} ${dto.curso.division || ''}`.trim() : '-'}</strong>
                      &nbsp;&nbsp; Ciclo Lectivo: <strong>{dto?.anio || anio}</strong>
                    </td>
                    <td className="text-end">Nivel: <strong>{dto?.curso?.nivel || '-'}</strong></td>
                  </tr>
                </tbody>
              </table>
              <div className="text-center fw-semibold mt-2">INFORME DE RENDIMIENTO ESCOLAR</div>
            </Card.Body>
          </Card>

          {/* Estadísticas rápidas (sin Licencias) */}
          <Card className="mb-3">
            <Card.Body>
              <div className="row g-2">
                <div className="col-auto"><span className="badge text-bg-secondary">Promedio final curso: {dto?.promedioFinalCurso ?? '-'}</span></div>
                <div className="col-auto"><span className="badge text-bg-warning text-dark">Inasistencias (pond.): {dto?.inasistencias?.ponderado ?? '-'}</span></div>
                <div className="col-auto"><span className="badge text-bg-light">Ausentes: {dto?.inasistencias?.ausentes ?? 0}</span></div>
                <div className="col-auto"><span className="badge text-bg-light">Tardes: {dto?.inasistencias?.tardes ?? 0}</span></div>
                <div className="col-auto"><span className="badge text-bg-light">Retiros: {dto?.inasistencias?.retiros ?? 0}</span></div>
                <div className="col-auto"><span className="badge text-bg-light">Justificados: {dto?.inasistencias?.justificados ?? 0}</span></div>
                <div className="col-auto"><span className="badge text-bg-danger">Previas: {cantPrevias}</span></div>
              </div>
            </Card.Body>
          </Card>

          

          {/* Tabla detallada */}
          <Card>
            <Card.Body>
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3">
                <div>
                  <h5 className="mb-1">Detalle por Materia</h5>
                  {dto && (
                    <div className="text-muted small">
                      Alumno: {dto.apellido}, {dto.nombre} {dto.dni ? `(DNI ${dto.dni})` : ''} · Año: {dto.anio}
                    </div>
                  )}
                </div>
              </div>

              <div>
                {Array.isArray(materias) && materias.length > 0 ? (
                  <Table striped bordered hover responsive size="sm">
                    <thead>
                      <tr>
                        <th>Materia</th>
                        <th colSpan={5} className="text-center">1° Etapa · Calificaciones</th>
                        <th colSpan={5} className="text-center">2° Etapa · Calificaciones</th>
                        <th>Prom PG</th>
                        <th>Estado</th>
                        <th>Nota Final</th>
                        <th>Estado Final</th>
                        <th>Estado Materia</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>N1</th><th>N2</th><th>N3</th><th>N4</th><th>E1</th>
                        <th>N1</th><th>N2</th><th>N3</th><th>N4</th><th>E2</th>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {materias.map((r, idx) => {
                        const e1 = Array.isArray(r.e1Notas) ? r.e1Notas : [];
                        const e2 = Array.isArray(r.e2Notas) ? r.e2Notas : [];
                        return (
                          <tr key={r.materiaId ?? idx}>
                            <td>{r.materiaNombre}</td>
                            <td>{e1[0] ?? '-'}</td><td>{e1[1] ?? '-'}</td><td>{e1[2] ?? '-'}</td><td>{e1[3] ?? '-'}</td><td><Badge bg="light" text="dark">{r.e1 ?? '-'}</Badge></td>
                            <td>{e2[0] ?? '-'}</td><td>{e2[1] ?? '-'}</td><td>{e2[2] ?? '-'}</td><td>{e2[3] ?? '-'}</td><td><Badge bg="light" text="dark">{r.e2 ?? '-'}</Badge></td>
                            <td><Badge bg={(r.pg ?? 0) >= 6 ? 'success' : 'danger'}>{r.pg ?? '-'}</Badge></td>
                            <td>{r.estado ?? '-'}</td>
                            <td>{r.notaFinal ?? '-'}</td>
                            <td>{r.estadoFinal ?? '-'}</td>
                            <td>{r.estadoMateria ?? '-'}</td>
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
          {/* Bloques inferiores estilo planilla: Inasistencias / Previas */}
          <div className="row g-2 mt-3">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header"><strong>Inasistencias</strong></div>
                <div className="card-body p-2 small">
                  <div className="d-flex flex-wrap gap-3">
                    <div>Just.: <strong>{dto?.inasistencias?.justificados ?? 0}</strong></div>
                    <div>Injust.: <strong>{Math.max(0, (dto?.inasistencias?.ausentes ?? 0) - (dto?.inasistencias?.justificados ?? 0))}</strong></div>
                    <div>Total: <strong>{dto?.inasistencias?.ausentes ?? 0}</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card mt-2">
            <div className="card-header"><strong>Previas</strong></div>
            <div className="card-body p-2 small">
              {cantPrevias > 0 ? (
                <ul className="mb-0">
                  {materias.filter(m => (m?.estado || '').toLowerCase() === 'desaprobado' || (m?.estadoFinal || '').toLowerCase() === 'desaprobado').map((m,i) => (
                    <li key={i}>{m.materiaNombre}</li>
                  ))}
                </ul>
              ) : (
                <span>-</span>
              )}
            </div>
          </div>
        </div>
      )}

      

      {loading && (
        <div className="d-flex align-items-center">
          <Spinner animation="border" className="me-2" /> Cargando datos...
        </div>
      )}
    </div>
  );
}
