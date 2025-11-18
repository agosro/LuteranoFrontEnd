import React, { useEffect, useMemo, useState, useRef } from "react";
import { Card, Button, Form, Row, Col, Table, Spinner, Alert, Badge, Accordion } from "react-bootstrap";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { BarChart3 } from 'lucide-react';
import AsyncAlumnoSelect from "../Components/Controls/AsyncAlumnoSelect";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";
import { useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { listarCursos, listarCursosPorDocente, listarCursosPorPreceptor } from "../Services/CursoService";
import { listarAlumnosConFiltros, listarAlumnosEgresados } from "../Services/AlumnoService";
// import { listarAlumnosPorCurso } from "../Services/HistorialCursoService";
import { obtenerInformeAnualAlumno } from "../Services/ReporteAnualAlumnoService";
import { listarMaterias } from "../Services/MateriaService";

export default function ReporteAnualAlumno() {
  const { user } = useAuth();
  const token = user?.token;
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const preselectedAlumnoId = location.state?.preselectedAlumnoId || searchParams.get('alumnoId');
  const autoGenerar = searchParams.get('auto') === 'true';

  // Filtros y selección
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [cursos, setCursos] = useState([]);
  const [cursoAnioSel, setCursoAnioSel] = useState("");
  const [divisionSel, setDivisionSel] = useState("");
  const [cursoId, setCursoId] = useState("");
  const [alumnoId, setAlumnoId] = useState(preselectedAlumnoId || "");
  const [alumnoOption, setAlumnoOption] = useState(null);

  // Egresados
  const [alumnos, setAlumnos] = useState([]);
  const [incluirEgresados, setIncluirEgresados] = useState(false);
  const [anioEgreso, setAnioEgreso] = useState(new Date().getFullYear());

  // Estado
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [todasLasMaterias, setTodasLasMaterias] = useState([]);
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

  // Cargar todas las materias para poder mostrar nombres de previas
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const lista = await listarMaterias(token);
        setTodasLasMaterias(lista || []);
      } catch {
        // noop
      }
    })();
  }, [token]);

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

  // Cargar alumno preseleccionado si viene del state o URL
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

  // Años de egreso disponibles
  const aniosEgresoDisponibles = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear + 1; y >= currentYear - 10; y--) {
      years.push(y);
    }
    return years;
  }, []);

  // Cargar alumnos egresados filtrados por año
  useEffect(() => {
    if (!incluirEgresados || !token) {
      setAlumnos([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        const lista = await listarAlumnosEgresados(token);
        if (!active) return;
        // Filtrar por año de egreso usando HistorialCurso fechaHasta
        const filtrados = (lista || []).filter(alumno => {
          const hist = (alumno.historialCursos || []).find(h => h.fechaHasta);
          if (!hist || !hist.fechaHasta) return false;
          const fechaHastaYear = new Date(hist.fechaHasta).getFullYear();
          return fechaHastaYear === anioEgreso;
        });
        setAlumnos(filtrados);
      } catch {
        setAlumnos([]);
      }
    })();
    return () => { active = false; };
  }, [incluirEgresados, anioEgreso, token]);

  // Forzar remontar el selector cuando cambian año/división/cursoId
  const alumnoSelectKey = React.useMemo(
    () => `alumno-${cursoAnioSel || 'any'}-${divisionSel || 'any'}-${cursoId || 'none'}`,
    [cursoAnioSel, divisionSel, cursoId]
  );

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

  // Auto-generar si viene de URL con auto=true
  useEffect(() => {
    if (autoGenerar && alumnoId && !data && !loading) {
      setTimeout(() => {
        onSubmit({ preventDefault: () => {} });
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerar, alumnoId]);

  const dto = data?.data; // ReporteAnualAlumnoDto
  const materias = useMemo(() => dto?.materias || [], [dto]);

  // Previas de años anteriores (basado en materiasPreviasIds del backend)
  const materiasPrevia = useMemo(() => {
    if (!Array.isArray(dto?.materiasPreviasIds) || dto.materiasPreviasIds.length === 0) return [];
    return dto.materiasPreviasIds
      .map(id => todasLasMaterias.find(m => m.id === id))
      .filter(Boolean);
  }, [dto, todasLasMaterias]);

  const cantPrevias = materiasPrevia.length;

  // KPIs y gráficos
  const kpisData = useMemo(() => {
    if (!materias || materias.length === 0) return null;

    // Extraer todas las notas PG válidas
    const pgList = materias.map(m => m.pg).filter(v => typeof v === 'number');
    const totalMaterias = materias.length;
    const aprobadas = materias.filter(m => (m.pg ?? 0) >= 6).length;
    const desaprobadas = totalMaterias - aprobadas;
    const porcentajeAprobacion = totalMaterias > 0 ? ((aprobadas / totalMaterias) * 100).toFixed(1) : 0;
    // Usar el promedio del backend si está disponible, sino calcular
    const promedio = dto?.promedioFinalCurso ?? (pgList.length ? (pgList.reduce((a,b) => a + b, 0) / pgList.length).toFixed(2) : null);
    const notaMinima = pgList.length ? Math.min(...pgList) : null;
    const notaMaxima = pgList.length ? Math.max(...pgList) : null;

    // Distribución de notas por rangos
    const distribucion = [
      { rango: '0-3', count: 0, color: '#dc3545' },
      { rango: '4-5', count: 0, color: '#ffc107' },
      { rango: '6-7', count: 0, color: '#17a2b8' },
      { rango: '8-9', count: 0, color: '#28a745' },
      { rango: '10', count: 0, color: '#20c997' }
    ];

    pgList.forEach(nota => {
      if (nota >= 0 && nota <= 3) distribucion[0].count++;
      else if (nota >= 4 && nota <= 5) distribucion[1].count++;
      else if (nota >= 6 && nota <= 7) distribucion[2].count++;
      else if (nota >= 8 && nota <= 9) distribucion[3].count++;
      else if (nota === 10) distribucion[4].count++;
    });

    // Datos para pie chart
    const pieData = [
      { name: 'Aprobadas', value: aprobadas, color: '#28a745' },
      { name: 'Desaprobadas', value: desaprobadas, color: '#dc3545' }
    ];

    // Comparación E1 vs E2
    const e1List = materias.map(m => m.e1).filter(v => typeof v === 'number');
    const e2List = materias.map(m => m.e2).filter(v => typeof v === 'number');
    const promedioE1 = e1List.length ? (e1List.reduce((a,b) => a + b, 0) / e1List.length).toFixed(2) : null;
    const promedioE2 = e2List.length ? (e2List.reduce((a,b) => a + b, 0) / e2List.length).toFixed(2) : null;

    const etapaComparacion = [
      { etapa: 'Etapa 1', promedio: promedioE1 ? parseFloat(promedioE1) : 0 },
      { etapa: 'Etapa 2', promedio: promedioE2 ? parseFloat(promedioE2) : 0 }
    ];

    return {
      totalMaterias,
      aprobadas,
      desaprobadas,
      porcentajeAprobacion,
      promedio,
      notaMinima,
      notaMaxima,
      distribucion,
      pieData,
      promedioE1,
      promedioE2,
      etapaComparacion
    };
  }, [materias, dto]);

  const exportCSV = () => {
    // Construir un CSV más completo: metadatos + tabla de materias + resumen de inasistencias y previas
    const lines = [];
    const alumnoNombre = `${dto?.apellido || ''}, ${dto?.nombre || ''}`.trim();
  const cursoLbl = dto?.curso ? `${dto.curso.anio ?? ''}${dto?.curso?.anio != null ? '°' : ''} ${dto.curso.division || ''}`.trim() : '';
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
      "PG","CO","EX","PFA"
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
          (r.pg ?? ""), (r.co ?? ""), (r.ex ?? ""), (r.notaFinal ?? "")
        ]);
      });
    }
    // Previas detalle
    lines.push([]);
    lines.push(["Previas (de años anteriores)"]);
    if (cantPrevias > 0) {
      materiasPrevia.forEach(m => lines.push([m.nombre || m.materiaNombre || ""]));
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
      body { 
        font-family: 'Segoe UI', Arial, sans-serif; 
        padding: 24px; 
        color: #212529;
      }
      h3 { 
        margin: 0 0 8px 0; 
        font-size: 22px;
        font-weight: 600;
        color: #0d6efd;
        border-bottom: 2px solid #0d6efd;
        padding-bottom: 6px;
      }
      .kpi-section {
        background: #f8f9fa;
        padding: 16px;
        border-radius: 6px;
        margin-bottom: 20px;
        border: 1px solid #dee2e6;
      }
      .kpi-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 12px;
        color: #495057;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }
      .kpi-card {
        background: white;
        padding: 10px;
        border-radius: 4px;
        border: 1px solid #dee2e6;
        text-align: center;
      }
      .kpi-label {
        font-size: 11px;
        color: #6c757d;
        margin-bottom: 4px;
      }
      .kpi-value {
        font-size: 18px;
        font-weight: 600;
        color: #212529;
      }
      .kpi-distribution {
        font-size: 12px;
        line-height: 1.8;
        color: #495057;
      }
      .kpi-dist-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 8px;
        background: white;
        border-radius: 3px;
        margin-bottom: 4px;
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        margin-bottom: 16px;
        font-size: 11px;
      }
      th, td { 
        border: 1px solid #dee2e6; 
        padding: 6px 8px; 
        text-align: left;
      }
      thead tr:first-child th { 
        background: #e9ecef; 
        font-weight: 600;
        color: #495057;
      }
      tbody tr:nth-child(even) {
        background: #f8f9fa;
      }
      .card { 
        border: 1px solid #dee2e6; 
        margin-bottom: 12px; 
        border-radius: 6px;
      }
      .card-header { 
        background: #e9ecef; 
        padding: 8px 12px; 
        font-weight: 600;
        border-bottom: 1px solid #dee2e6;
      }
      .card-body { 
        padding: 12px; 
      }
      .badge { 
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;
      }
      @media print {
        body { padding: 12px; }
        .kpi-section { page-break-inside: avoid; }
      }
    `;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte Anual de Alumno</title><style>${css}</style></head><body>`);
    
    // KPIs en formato texto
    if (kpisData) {
      win.document.write(`<div class="kpi-section">`);
      win.document.write(`<div class="kpi-title">📊 Análisis del Rendimiento</div>`);
      
      // Métricas principales
      win.document.write(`<div class="kpi-grid">`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">% Aprobación</div><div class="kpi-value">${kpisData.porcentajeAprobacion}%</div><div class="kpi-label">${kpisData.aprobadas}/${kpisData.totalMaterias}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Promedio General</div><div class="kpi-value">${kpisData.promedio ?? '-'}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Nota Máxima</div><div class="kpi-value">${kpisData.notaMaxima ?? '-'}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Nota Mínima</div><div class="kpi-value">${kpisData.notaMinima ?? '-'}</div></div>`);
      win.document.write(`</div>`);
      
      // Distribución y comparación de etapas
      win.document.write(`<div class="kpi-distribution">`);
      win.document.write(`<strong>Distribución de Notas:</strong><br>`);
      kpisData.distribucion.forEach(d => {
        win.document.write(`<div class="kpi-dist-item"><span>Rango ${d.rango}:</span><span><strong>${d.count}</strong> materias</span></div>`);
      });
      win.document.write(`<br><strong>Comparación por Etapas:</strong><br>`);
      win.document.write(`<div class="kpi-dist-item"><span>Etapa 1:</span><span><strong>${kpisData.promedioE1 ?? '-'}</strong></span></div>`);
      win.document.write(`<div class="kpi-dist-item"><span>Etapa 2:</span><span><strong>${kpisData.promedioE2 ?? '-'}</strong></span></div>`);
      if (kpisData.promedioE1 && kpisData.promedioE2) {
        const tendencia = parseFloat(kpisData.promedioE2) > parseFloat(kpisData.promedioE1) ? '↑ Mejoró' : parseFloat(kpisData.promedioE2) < parseFloat(kpisData.promedioE1) ? '↓ Bajó' : '→ Sin cambio';
        win.document.write(`<div class="kpi-dist-item"><span>Tendencia:</span><span><strong>${tendencia}</strong></span></div>`);
      }
      win.document.write(`</div>`);
      
      win.document.write(`</div>`);
    }
    
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
      <h2 className="mb-2">Informe Anual de Alumno</h2>
      <p className="text-muted mb-3">
        Este informe muestra el rendimiento escolar completo del alumno durante el año seleccionado, incluyendo calificaciones por materia, promedios por etapa, inasistencias y materias previas.
      </p>

      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={onSubmit}>
            <Row className="g-3">
              {!incluirEgresados && (
                <>
                  <Col md={2}>
                    <Form.Label>Año (opcional)</Form.Label>
                    <Form.Select value={cursoAnioSel} onChange={(e)=>setCursoAnioSel(e.target.value)}>
                      <option value="">Todos</option>
                      {aniosCursoOptions.map(an => (
                        <option key={an} value={an}>{an}</option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={2}>
                    <Form.Label>División (opcional)</Form.Label>
                    <Form.Select value={divisionSel} onChange={(e)=>setDivisionSel(e.target.value)} disabled={!cursoAnioSel}>
                      <option value="">Todas</option>
                      {divisionesOptions.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </Form.Select>
                  </Col>
                </>
              )}
              <Col md={2}>
                <Form.Label>Año</Form.Label>
                <Form.Select value={anio} onChange={(e) => setAnio(e.target.value)}>
                  {aniosPosibles.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={incluirEgresados ? 8 : 4}>
                <Form.Label>Alumno</Form.Label>
                <AsyncAlumnoSelect
                  key={alumnoSelectKey}
                  token={token}
                  value={alumnoOption}
                  onChange={(opt) => { setAlumnoOption(opt); setAlumnoId(opt?.value || ""); }}
                  cursoId={incluirEgresados ? "" : cursoId}
                  cursoAnio={incluirEgresados ? null : cursoAnioSel}
                  cursoDivision={incluirEgresados ? null : divisionSel}
                  alumnosExternos={incluirEgresados ? alumnos : null}
                />
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button type="submit" variant="primary" disabled={loading || !alumnoId} className="w-100">
                  {loading ? (<><Spinner size="sm" animation="border" className="me-2" /> Generando...</>) : "Generar reporte"}
                </Button>
              </Col>
              {!incluirEgresados && (cursoAnioSel || divisionSel || alumnoOption) && (
                <Col md={2} className="d-flex align-items-end">
                  <Button 
                    type="button" 
                    variant="outline-secondary" 
                    onClick={() => {
                      setCursoAnioSel("");
                      setDivisionSel("");
                      setAlumnoOption(null);
                      setAlumnoId("");
                    }}
                    className="w-100"
                  >
                    Limpiar filtros
                  </Button>
                </Col>
              )}
            </Row>
            <Row className="g-3 mt-2">
              <Col md={12}>
                <Form.Check 
                  type="checkbox"
                  label="Buscar egresados"
                  checked={incluirEgresados}
                  onChange={(e) => { 
                    setIncluirEgresados(e.target.checked);
                    if (!e.target.checked) {
                      setAlumnoOption(null);
                      setAlumnoId("");
                    }
                  }}
                  className="d-inline-block me-3"
                />
                {incluirEgresados && (
                  <>
                    <Form.Label className="small d-inline-block me-2 mb-0">Año de egreso:</Form.Label>
                    <Form.Select 
                      size="sm"
                      value={anioEgreso} 
                      onChange={(e)=>setAnioEgreso(Number(e.target.value))}
                      className="d-inline-block"
                      style={{ width: 'auto' }}
                    >
                      {aniosEgresoDisponibles.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </Form.Select>
                  </>
                )}
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

      {/* KPIs y Gráficos desplegables - FUERA del área de impresión */}
      {!loading && dto && !error && kpisData && (
        <Accordion className="mb-3">
          <Accordion.Item eventKey="0">
            <Accordion.Header>
              <BarChart3 size={18} className="me-2" />
              <strong>Análisis Detallado y Gráficos</strong>
            </Accordion.Header>
            <Accordion.Body>
              {/* KPIs en Cards */}
              <Row className="g-3 mb-4">
                <Col md={3}>
                  <Card className="h-100 border-primary">
                    <Card.Body className="text-center">
                      <div className="text-muted small mb-1">% Aprobación</div>
                      <div className="h2 mb-0 text-primary">{kpisData.porcentajeAprobacion}%</div>
                      <div className="small text-muted">{kpisData.aprobadas}/{kpisData.totalMaterias}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="h-100 border-info">
                    <Card.Body className="text-center">
                      <div className="text-muted small mb-1">Promedio General</div>
                      <div className="h2 mb-0 text-info">{kpisData.promedio ?? '-'}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="h-100 border-success">
                    <Card.Body className="text-center">
                      <div className="text-muted small mb-1">Nota Máxima</div>
                      <div className="h2 mb-0 text-success">{kpisData.notaMaxima ?? '-'}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="h-100 border-danger">
                    <Card.Body className="text-center">
                      <div className="text-muted small mb-1">Nota Mínima</div>
                      <div className="h2 mb-0 text-danger">{kpisData.notaMinima ?? '-'}</div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Gráficos */}
              <Row className="g-3">
                <Col md={6}>
                  <Card>
                    <Card.Body>
                      <h6 className="mb-3">Distribución de Notas</h6>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={kpisData.distribucion}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="rango" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" name="Cantidad de materias" fill="#0066cc">
                            {kpisData.distribucion.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card>
                    <Card.Body>
                      <h6 className="mb-3">Aprobadas vs Desaprobadas</h6>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={kpisData.pieData}
                            cx="50%"
                            cy="45%"
                            labelLine={false}
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {kpisData.pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [`${value} materias`, name]} />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value, entry) => `${value}: ${entry.payload.value} materias`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={12}>
                  <Card>
                    <Card.Body>
                      <h6 className="mb-3">Comparación de Promedios por Etapa</h6>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={kpisData.etapaComparacion} layout="horizontal">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="etapa" />
                          <YAxis domain={[0, 10]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="promedio" name="Promedio" fill="#0066cc" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="text-center mt-2 small text-muted">
                        <strong>E1:</strong> {kpisData.promedioE1 ?? '-'} · <strong>E2:</strong> {kpisData.promedioE2 ?? '-'}
                        {kpisData.promedioE1 && kpisData.promedioE2 && (
                          <span className={`ms-2 ${parseFloat(kpisData.promedioE2) > parseFloat(kpisData.promedioE1) ? 'text-success' : parseFloat(kpisData.promedioE2) < parseFloat(kpisData.promedioE1) ? 'text-danger' : 'text-muted'}`}>
                            {parseFloat(kpisData.promedioE2) > parseFloat(kpisData.promedioE1) ? '↑ Mejoró' : parseFloat(kpisData.promedioE2) < parseFloat(kpisData.promedioE1) ? '↓ Bajó' : '→ Sin cambio'}
                          </span>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
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
                      Curso: <strong>{dto?.curso ? `${dto.curso.anio ?? ''}${dto?.curso?.anio != null ? '°' : ''} ${dto.curso.division || ''}`.trim() : '-'}</strong>
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
          <Card className="mb-3 d-print-none">
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
                      Alumno: {dto.apellido}, {dto.nombre} {dto.dni ? `(DNI ${dto.dni})` : ''} · Curso: {dto?.curso ? `${dto.curso.anio ?? ''}${dto?.curso?.anio != null ? '°' : ''} ${dto.curso.division || ''}`.trim() : '-'} · Año: {dto.anio}
                    </div>
                  )}
                </div>
              </div>

              {/* Explicación de columnas - No se imprime */}
              <Alert variant="info" className="d-print-none small mb-3">
                <strong>Referencia de columnas:</strong>
                <ul className="mb-0 mt-2" style={{ columnCount: 2, columnGap: '2rem' }}>
                  <li><strong>N1-N4:</strong> Notas individuales de cada etapa</li>
                  <li><strong>E1/E2:</strong> Promedio de la Etapa 1 y 2</li>
                  <li><strong>PG:</strong> Promedio General del año</li>
                  <li><strong>CO:</strong> Nota de Coloquio (si aplica)</li>
                  <li><strong>EX:</strong> Nota de Examen Final (si aplica)</li>
                  <li><strong>PFA:</strong> Promedio Final Anual (promedia PG, coloquio o examen)</li>
                </ul>
              </Alert>

              <div>
                {Array.isArray(materias) && materias.length > 0 ? (
                  <Table striped bordered hover responsive size="sm">
                    <thead>
                      <tr>
                        <th>Materia</th>
                        <th colSpan={5} className="text-center">1° Etapa · Calificaciones</th>
                        <th colSpan={5} className="text-center">2° Etapa · Calificaciones</th>
                        <th>PG</th>
                        <th>CO</th>
                        <th>EX</th>
                        <th>PFA</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>N1</th><th>N2</th><th>N3</th><th>N4</th><th>E1</th>
                        <th>N1</th><th>N2</th><th>N3</th><th>N4</th><th>E2</th>
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
                            <td>{r.co ?? '-'}</td>
                            <td>{r.ex ?? '-'}</td>
                            <td>{r.notaFinal ?? '-'}</td>
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
            <div className="card-header"><strong>Previas (de años anteriores)</strong></div>
            <div className="card-body p-2 small">
              {cantPrevias > 0 ? (
                <ul className="mb-0">
                  {materiasPrevia.map((m,i) => (
                    <li key={i}>{m.nombre || m.materiaNombre || ""}</li>
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
