import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, Row, Col, Form, Button, Table, Spinner, Alert, Badge, Accordion } from "react-bootstrap";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { useAuth } from "../Context/AuthContext";
import { listarCursos, listarCursosPorDocente, listarCursosPorPreceptor } from "../Services/CursoService";
import { listarMateriasDeCurso } from "../Services/MateriaCursoService";
import { resumenNotasCursoPorAnio } from "../Services/ReporteNotasService";
import Breadcrumbs from "../Components/Botones/Breadcrumbs";
import BackButton from "../Components/Botones/BackButton";
import Estadisticas from "../Components/Reportes/Estadisticas";
import { useCicloLectivo } from "../Context/CicloLectivoContext.jsx";
import { obtenerNotaFinalSimple } from "../Services/NotaFinalService";

// Esta página implementa el reporte estilo R3 del documento: muestra por curso y materia,
// calificaciones por etapa (4 columnas por etapa), E1/E2 promedios, PG, PFA (uso PG), Estado.

export default function ReporteNotasCursoMateria() {
  const { user } = useAuth();
  const token = user?.token;
  const { cicloLectivo } = useCicloLectivo();
  const [searchParams] = useSearchParams();

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [periodo, setPeriodo] = useState("Todos"); // E1, E2, Todos
  const [cursoId, setCursoId] = useState("");
  const [materiasSeleccionadas, setMateriasSeleccionadas] = useState([]); // array de IDs
  const [vista, setVista] = useState("materia"); // materia | alumno | plana
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("Todos"); // Todos | Aprobado | Desaprobado
  const [cursos, setCursos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const printRef = useRef(null);
  const [nfMap, setNfMap] = useState({}); // { [alumnoId]: number|null }

  // Cargar cursos según rol
  useEffect(() => {
    let active = true;
    async function loadCursos() {
      try {
        setError("");
        let lista = [];
        if (user?.rol === "ROLE_DOCENTE" && user?.docenteId) {
          lista = await listarCursosPorDocente(token, user.docenteId);
        } else if (user?.rol === "ROLE_PRECEPTOR" && user?.preceptorId) {
          lista = await listarCursosPorPreceptor(token, user.preceptorId);
        } else {
          lista = await listarCursos(token);
        }
        if (active) setCursos(lista);
      } catch (e) {
        if (active) setError(e.message || "Error al cargar cursos");
      }
    }
    if (token) loadCursos();
    return () => { active = false; };
  }, [token, user]);

  // Cargar materias al seleccionar curso
  useEffect(() => {
    let active = true;
    async function loadMaterias() {
      try {
        setMaterias([]);
        setMateriasSeleccionadas([]);
        if (!cursoId) return;
        const lista = await listarMateriasDeCurso(token, cursoId);
        if (active) setMaterias(lista);
      } catch (e) {
        if (active) setError(e.message || "Error al cargar materias");
      }
    }
    if (token) loadMaterias();
    return () => { active = false; };
  }, [token, cursoId]);

  // Auto-cargar desde URL params
  useEffect(() => {
    const paramCursoId = searchParams.get('cursoId');
    const paramMateriaId = searchParams.get('materiaId');
    if (paramCursoId) {
      setCursoId(paramCursoId);
      if (paramMateriaId) {
        // Esperar a que las materias se carguen y luego seleccionar
        const checkAndLoad = async () => {
          // Pequeño delay para que se carguen las materias primero
          await new Promise(resolve => setTimeout(resolve, 500));
          setMateriasSeleccionadas([paramMateriaId]);
          // Auto-generar el reporte
          if (token && paramCursoId) {
            try {
              setLoading(true);
              const res = await resumenNotasCursoPorAnio(token, paramCursoId, anio);
              setData(res);
              if (res?.code && res.code < 0) setError(res.mensaje || "Error en el reporte");
            } catch (err) {
              setError(err.message || "Error al generar reporte");
            } finally {
              setLoading(false);
            }
          }
        };
        checkAndLoad();
      }
    }
  }, [searchParams, token, anio]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setData(null);
    if (!cursoId) { setError("Seleccioná un curso"); return; }
    if (materiasSeleccionadas.length === 0) { setError("Seleccioná al menos una materia"); return; }
    try {
      setLoading(true);
      // Traemos todo el curso; luego filtramos materia si está elegida
  const res = await resumenNotasCursoPorAnio(token, cursoId, anio);
      setData(res);
      if (res?.code && res.code < 0) setError(res.mensaje || "Error en el reporte");
    } catch (err) {
      setError(err.message || "Error al generar reporte");
    } finally {
      setLoading(false);
    }
  };

  const collator = useMemo(() => new Intl.Collator("es-AR", { sensitivity: "base" }), []);
  const alumnos = useMemo(() => {
    let list = data?.alumnos || [];
    if (materiasSeleccionadas.length > 0) {
      list = list.map(a => ({
        ...a,
        materias: (a.materias || []).filter(m => materiasSeleccionadas.includes(String(m.materiaId)))
      }));
    }
    // Orden por apellido, nombre
    return list.sort((a,b) => {
      const ap = collator.compare(a.apellido || "", b.apellido || "");
      if (ap !== 0) return ap;
      return collator.compare(a.nombre || "", b.nombre || "");
    });
  }, [data, materiasSeleccionadas, collator]);

  const materiasCurso = materias.map(m => ({ id: m.materiaId ?? m.id, nombre: m.nombreMateria ?? m.nombre }));

  // Labels auxiliares
  const cursoLabel = useMemo(() => {
    if (data?.curso?.nombre) return data.curso.nombre;
    const c = cursos.find(c => String(c.id) === String(cursoId));
    return c ? (c.nombre || `${c.anio ?? ''} ${c.division ?? ''} ${c.nivel ?? ''}`.trim()) : String(cursoId || '');
  }, [data, cursos, cursoId]);

  const materiaLabel = useMemo(() => {
    if (materiasSeleccionadas.length === 0) return 'Ninguna';
    if (materiasSeleccionadas.length === materiasCurso.length) return 'Todas';
    if (materiasSeleccionadas.length === 1) {
      const m = materiasCurso.find(x => String(x.id) === String(materiasSeleccionadas[0]));
      return m?.nombre || String(materiasSeleccionadas[0]);
    }
    return `${materiasSeleccionadas.length} materias`;
  }, [materiasCurso, materiasSeleccionadas]);

  // Filas planas alumno-materia y filtros
  const filas = useMemo(() => {
    const list = [];
    for (const a of alumnos) {
      for (const m of a.materias || []) {
        list.push({
          alumno: a,
          m,
          alumnoNombre: `${a.apellido || ''} ${a.nombre || ''}`.trim(),
          alumnoDni: a.dni || "",
          materiaNombre: m.materiaNombre || "",
        });
      }
    }
    return list;
  }, [alumnos]);

  // Cargar Nota Final por alumno solo cuando hay una materia seleccionada
  useEffect(() => {
    if (!token) return;
    // Solo hacemos NF cuando hay una única materia seleccionada
    if (materiasSeleccionadas.length !== 1) { setNfMap({}); return; }
    // Construimos la lista de alumnoIds visibles en este momento
    const alumnoIds = alumnos.map(a => a.id).filter(Boolean);
    if (alumnoIds.length === 0) { setNfMap({}); return; }
    let cancelled = false;
    const run = async () => {
      const results = {};
      const pool = 6;
      let idx = 0;
      async function worker() {
        while (idx < alumnoIds.length) {
          const i = idx++;
          const aid = alumnoIds[i];
          try {
            const resp = await obtenerNotaFinalSimple(token, aid, Number(materiasSeleccionadas[0]), Number(anio));
            results[aid] = typeof resp?.notaFinal === 'number' ? resp.notaFinal : (resp?.notaFinal ?? null);
          } catch {
            results[aid] = null;
          }
          if (cancelled) return;
        }
      }
      const workers = Array.from({ length: Math.min(pool, alumnoIds.length) }, () => worker());
      await Promise.all(workers);
      if (!cancelled) setNfMap(results);
    };
    run();
    return () => { cancelled = true; };
  }, [token, alumnos, materiasSeleccionadas, anio]);

  const normalizar = (s) => (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filasFiltradas = useMemo(() => {
    let list = filas;
    if (estado !== "Todos") {
      list = list.filter(r => {
        const pg = r?.m?.pg;
        let aprobado;
        if (typeof pg === "number") aprobado = pg >= 6;
        else {
          const est = normalizar(r?.m?.estado);
          aprobado = est ? est.includes("apro") : false;
        }
        return estado === "Aprobado" ? aprobado : !aprobado;
      });
    }
    const q = normalizar(busqueda).trim();
    if (q) {
      list = list.filter(r => {
        const nom = normalizar(r.alumnoNombre);
        const dni = (r.alumnoDni || "").toString();
        return nom.includes(q) || dni.includes(q);
      });
    }
    return list;
  }, [filas, estado, busqueda]);

  // Estadísticas rápidas del curso (sobre filas filtradas)
  const pgList = filasFiltradas.map(f => f.m.pg).filter(v => typeof v === 'number');
  const totalFilas = filasFiltradas.length; // alumno-materia visibles
  const aprobadas = filasFiltradas.filter(f => (f.m.pg ?? 0) >= 6).length;
  const desaprobadas = totalFilas - aprobadas;
  const promedioGeneralCurso = pgList.length ? Math.round((pgList.reduce((a,b)=>a+b,0)/pgList.length)*10)/10 : null;

  // KPIs y gráficos
  const kpisData = useMemo(() => {
    if (!filasFiltradas.length) return null;

    // Distribución por rangos de notas
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
      { name: 'Aprobados', value: aprobadas, color: '#28a745' },
      { name: 'Desaprobados', value: desaprobadas, color: '#dc3545' }
    ];

    const notaMinima = pgList.length ? Math.min(...pgList) : null;
    const notaMaxima = pgList.length ? Math.max(...pgList) : null;
    const porcentajeAprobacion = totalFilas > 0 ? ((aprobadas / totalFilas) * 100).toFixed(1) : 0;

    // Comparación E1 vs E2 (solo cuando hay una materia seleccionada y período = Todos)
    let comparacionEtapas = null;
    if (materiasSeleccionadas.length === 1 && periodo === 'Todos') {
      const e1Values = filasFiltradas.map(f => f.m.e1).filter(v => typeof v === 'number');
      const e2Values = filasFiltradas.map(f => f.m.e2).filter(v => typeof v === 'number');
      
      if (e1Values.length > 0 || e2Values.length > 0) {
        const promedioE1 = e1Values.length > 0 ? (e1Values.reduce((a,b) => a+b, 0) / e1Values.length).toFixed(2) : 0;
        const promedioE2 = e2Values.length > 0 ? (e2Values.reduce((a,b) => a+b, 0) / e2Values.length).toFixed(2) : 0;
        
        const aprobadosE1 = e1Values.filter(v => v >= 6).length;
        const aprobadosE2 = e2Values.filter(v => v >= 6).length;
        
        comparacionEtapas = {
          promedios: [
            { etapa: 'Etapa 1', promedio: Number(promedioE1) },
            { etapa: 'Etapa 2', promedio: Number(promedioE2) }
          ],
          aprobacion: [
            { etapa: 'Etapa 1', aprobados: aprobadosE1, desaprobados: e1Values.length - aprobadosE1 },
            { etapa: 'Etapa 2', aprobados: aprobadosE2, desaprobados: e2Values.length - aprobadosE2 }
          ]
        };
      }
    }

    return {
      distribucion,
      pieData,
      notaMinima,
      notaMaxima,
      porcentajeAprobacion,
      totalAlumnos: totalFilas,
      aprobados: aprobadas,
      desaprobados: desaprobadas,
      promedio: promedioGeneralCurso,
      comparacionEtapas
    };
  }, [filasFiltradas, pgList, aprobadas, desaprobadas, totalFilas, promedioGeneralCurso, materiasSeleccionadas, periodo]);

  const e1Cols = periodo !== 'E2' ? 5 : 0;
  const e2Cols = periodo !== 'E1' ? 5 : 0;
  const showNF = materiasSeleccionadas.length === 1; // mostramos NF solo cuando hay materia específica
  const totalCols = 4 + e1Cols + e2Cols + 5 + (showNF ? 1 : 0); // +NF opcional

  const printOnlyTable = () => {
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
      .sub { 
        margin: 0 0 16px 0; 
        color: #6c757d; 
        font-size: 13px;
        line-height: 1.6;
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
      .fw-bold { 
        margin-top: 20px; 
        margin-bottom: 10px; 
        font-weight: 600;
        font-size: 14px;
        color: #495057;
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
      @media print {
        body { padding: 12px; }
        .kpi-section { page-break-inside: avoid; }
      }
    `;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte de Notas</title><style>${css}</style></head><body>`);
    const titulo = `${cursoLabel || 'Curso'} · Año ${data?.anio || anio}`;
    const sub = `Materia: ${materiaLabel}  |  Período: ${periodo}  |  Estado: ${estado}`;
    win.document.write(`<h3>${titulo}</h3>`);
    win.document.write(`<div class="sub">${sub}</div>`);
    
    // KPIs en formato texto
    if (kpisData) {
      win.document.write(`<div class="kpi-section">`);
      win.document.write(`<div class="kpi-title">📊 Análisis Detallado</div>`);
      
      // Métricas principales
      win.document.write(`<div class="kpi-grid">`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">% Aprobación</div><div class="kpi-value">${kpisData.porcentajeAprobacion}%</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Promedio</div><div class="kpi-value">${kpisData.promedio ?? '-'}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Nota Máxima</div><div class="kpi-value">${kpisData.notaMaxima ?? '-'}</div></div>`);
      win.document.write(`<div class="kpi-card"><div class="kpi-label">Nota Mínima</div><div class="kpi-value">${kpisData.notaMinima ?? '-'}</div></div>`);
      win.document.write(`</div>`);
      
      // Distribución
      win.document.write(`<div class="kpi-distribution">`);
      win.document.write(`<strong>Distribución de Notas:</strong><br>`);
      kpisData.distribucion.forEach(d => {
        win.document.write(`<div class="kpi-dist-item"><span>Rango ${d.rango}:</span><span><strong>${d.count}</strong> alumnos</span></div>`);
      });
      win.document.write(`</div>`);
      
      win.document.write(`</div>`);
    }
    
    win.document.write(printRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const exportCSV = () => {
    if (!filasFiltradas || filasFiltradas.length === 0) return;
    const header = [
      "Nro Doc","Apellido","Nombre","Materia",
      "E1 N1","E1 N2","E1 N3","E1 N4","E1",
      "E2 N1","E2 N2","E2 N3","E2 N4","E2",
      "PG",
      ...(materiasSeleccionadas.length === 1 ? ["NF"] : []),
      "Estado"
    ]; 
    const rows = [];
    for (const r of filasFiltradas) {
      const a = r.alumno; const m = r.m;
      const e1 = Array.isArray(m.e1Notas) ? m.e1Notas : [];
      const e2 = Array.isArray(m.e2Notas) ? m.e2Notas : [];
      const base = [
        a.dni||"", a.apellido||"", a.nombre||"",
        m.materiaNombre||"",
        e1[0]??"", e1[1]??"", e1[2]??"", e1[3]??"",
        m.e1??"",
        e2[0]??"", e2[1]??"", e2[2]??"", e2[3]??"",
        m.e2??"",
        m.pg??"",
      ];
      if (materiasSeleccionadas.length === 1) base.push(nfMap[a.id] ?? "");
      base.push(m.estado??"");
      rows.push(base);
    }
    const csv = [header, ...rows].map(r => r.map(v => '"' + String(v ?? "").replace(/"/g,'""') + '"').join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
  const slug = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]/g, '');
    const nombre = `reporte_notas_${slug(cursoLabel)}_${anio}_${slug(materiaLabel)}_${slug(periodo)}_${slug(estado)}.csv`;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mt-4">
      <div className="mb-1"><Breadcrumbs /></div>
      <div className="mb-2"><BackButton /></div>
      <h2 className="mb-2">Notas por Curso y Materia</h2>
      <p className="text-muted mb-3">
        Este reporte muestra las calificaciones detalladas por etapa (E1 y E2), promedio general (PG) y estado de los alumnos para las materias seleccionadas del curso elegido.
      </p>
      <div className="mb-3">
        {cicloLectivo?.id ? (
          <Badge bg="secondary">Ciclo lectivo: {String(cicloLectivo?.nombre || cicloLectivo?.id)}</Badge>
        ) : (
          <Alert variant="warning" className="py-1 px-2 mb-0">Seleccioná un ciclo lectivo en Configuración &gt; Ciclo lectivo</Alert>
        )}
      </div>
      <Card className="mb-3">
        <Card.Body>
          <Form onSubmit={onSubmit}>
            <Row className="g-3">
              <Col md={4}>
                <Form.Label>Curso</Form.Label>
                <Form.Select value={cursoId} onChange={(e)=>setCursoId(e.target.value)}>
                  <option value="">Seleccioná un curso</option>
                  {cursos.map(c => (
                    <option key={c.id} value={c.id}>{`${c.anio || ''} ${c.division || ''}`.trim()}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label className="d-flex justify-content-between align-items-center">
                  <span>Materias</span>
                  <div className="d-flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline-secondary" 
                      onClick={() => setMateriasSeleccionadas(materiasCurso.map(m => String(m.id)))}
                      disabled={!cursoId || materiasCurso.length === 0}
                    >
                      Todas
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline-secondary" 
                      onClick={() => setMateriasSeleccionadas([])}
                      disabled={!cursoId || materiasSeleccionadas.length === 0}
                    >
                      Ninguna
                    </Button>
                  </div>
                </Form.Label>
                <div 
                  className="border rounded p-2" 
                  style={{ maxHeight: '120px', overflowY: 'auto', backgroundColor: cursoId ? '#fff' : '#e9ecef' }}
                >
                  {!cursoId && (
                    <div className="text-muted small">Seleccioná un curso primero</div>
                  )}
                  {cursoId && materiasCurso.length === 0 && (
                    <div className="text-muted small">No hay materias disponibles</div>
                  )}
                  {cursoId && materiasCurso.map(m => (
                    <Form.Check
                      key={m.id}
                      type="checkbox"
                      id={`materia-${m.id}`}
                      label={m.nombre}
                      checked={materiasSeleccionadas.includes(String(m.id))}
                      onChange={(e) => {
                        const id = String(m.id);
                        if (e.target.checked) {
                          setMateriasSeleccionadas([...materiasSeleccionadas, id]);
                        } else {
                          setMateriasSeleccionadas(materiasSeleccionadas.filter(x => x !== id));
                        }
                      }}
                    />
                  ))}
                </div>
                <Form.Text className="text-muted">
                  {materiasSeleccionadas.length > 0 ? `${materiasSeleccionadas.length} seleccionada(s)` : 'Seleccioná al menos una materia'}
                </Form.Text>
              </Col>
              <Col md={2}>
                <Form.Label>Año</Form.Label>
                <Form.Select value={anio} onChange={(e)=>setAnio(e.target.value)}>
                  {[-1,0,1].map(off => {
                    const y = new Date().getFullYear() + off; return <option key={y} value={y}>{y}</option>;
                  })}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label>Período</Form.Label>
                <Form.Select value={periodo} onChange={(e)=>setPeriodo(e.target.value)}>
                  <option value="Todos">Todos</option>
                  <option value="E1">Etapa 1</option>
                  <option value="E2">Etapa 2</option>
                </Form.Select>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button 
                  type="submit" 
                  variant="primary" 
                  disabled={loading || !cursoId || materiasSeleccionadas.length === 0}
                >
                  {loading ? <><Spinner size="sm" animation="border" className="me-2"/>Generando...</> : "Generar"}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && data && !error && (
        <Card>
          <Card.Body>
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-3 gap-2">
              <div>
                <h5 className="mb-1">{data?.curso?.nombre || "Curso"} · Año {data?.anio}</h5>
                <div className="text-muted small">Total de alumnos: {data?.total}</div>
              </div>
              <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2">
                <Form.Control
                  placeholder="Buscar alumno (nombre, apellido, DNI)"
                  value={busqueda}
                  onChange={(e)=>setBusqueda(e.target.value)}
                  style={{ minWidth: 260 }}
                />
                <Form.Select value={vista} onChange={(e)=>setVista(e.target.value)} style={{ minWidth: 180 }}>
                  <option value="materia">Vista: Por materia</option>
                  <option value="alumno">Vista: Por alumno</option>
                  <option value="plana">Vista: Plana</option>
                </Form.Select>
                <Form.Select value={estado} onChange={(e)=>setEstado(e.target.value)} style={{ minWidth: 180 }}>
                  <option value="Todos">Estado: Todos</option>
                  <option value="Aprobado">Aprobado</option>
                  <option value="Desaprobado">Desaprobado</option>
                </Form.Select>
              </div>
            </div>

            {/* Estadísticas rápidas */}
            <div className="mb-3">
              <Estadisticas
                items={[
                  { label: "Filas (alumno·materia)", value: totalFilas },
                  { label: "Aprobadas", value: aprobadas, variant: "success" },
                  { label: "Desaprobadas", value: desaprobadas, variant: "danger" },
                  { label: "Promedio General", value: promedioGeneralCurso ?? "-" },
                ]}
              />
            </div>

            {/* KPIs y Gráficos desplegables - Solo con una materia seleccionada */}
            {kpisData && data && materiasSeleccionadas.length === 1 && (
              <Accordion className="mb-3 d-print-none">
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
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="h-100 border-info">
                          <Card.Body className="text-center">
                            <div className="text-muted small mb-1">Promedio</div>
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
                      <Col md={7}>
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
                                <Bar dataKey="count" name="Cantidad de alumnos" fill="#0066cc">
                                  {kpisData.distribucion.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={5}>
                        <Card>
                          <Card.Body>
                            <h6 className="mb-3">Aprobados vs Desaprobados</h6>
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
                                <Tooltip formatter={(value, name) => [`${value} alumnos`, name]} />
                                <Legend 
                                  verticalAlign="bottom" 
                                  height={36}
                                  formatter={(value, entry) => `${value}: ${entry.payload.value} alumnos`}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    {/* Comparación E1 vs E2 - Solo cuando hay una materia y período = Todos */}
                    {kpisData.comparacionEtapas && (
                      <Row className="g-3 mt-3">
                        <Col md={6}>
                          <Card>
                            <Card.Body>
                              <h6 className="mb-3">Comparación de Promedios: Etapa 1 vs Etapa 2</h6>
                              <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={kpisData.comparacionEtapas.promedios}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="etapa" />
                                  <YAxis domain={[0, 10]} />
                                  <Tooltip />
                                  <Legend />
                                  <Bar dataKey="promedio" name="Promedio" fill="#0066cc" />
                                </BarChart>
                              </ResponsiveContainer>
                              <div className="text-muted small mt-2 text-center">
                                Comparación del rendimiento promedio entre ambas etapas
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                        <Col md={6}>
                          <Card>
                            <Card.Body>
                              <h6 className="mb-3">Comparación de Aprobación: Etapa 1 vs Etapa 2</h6>
                              <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={kpisData.comparacionEtapas.aprobacion}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="etapa" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Bar dataKey="aprobados" name="Aprobados" fill="#28a745" stackId="a" />
                                  <Bar dataKey="desaprobados" name="Desaprobados" fill="#dc3545" stackId="a" />
                                </BarChart>
                              </ResponsiveContainer>
                              <div className="text-muted small mt-2 text-center">
                                Cantidad de alumnos aprobados/desaprobados por etapa
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            )}

            {/* Acciones de exportación fuera del header y del área imprimible */}
            <div className="d-flex justify-content-end gap-2 mb-3">
              <Button variant="outline-secondary" onClick={exportCSV}>Exportar CSV</Button>
              <Button variant="outline-secondary" onClick={printOnlyTable}>Imprimir / PDF</Button>
            </div>

            {/* Contenido imprimible por vista */}
            <div ref={printRef}>
              {vista === 'plana' && (
                <Table striped bordered hover responsive size="sm">
                  <thead>
                    <tr>
                      <th>Nro Doc</th>
                      <th>Apellido</th>
                      <th>Nombre</th>
                      <th>Materia</th>
                      {periodo !== 'E2' && <th colSpan={5} className="text-center">Calificaciones Etapa 1</th>}
                      {periodo !== 'E1' && <th colSpan={5} className="text-center">Calificaciones Etapa 2</th>}
                      <th>PG</th>
                      {showNF && <th>NF</th>}
                      <th>CO</th>
                      <th>EX</th>
                      <th>PFA</th>
                      <th>Estado</th>
                    </tr>
                    <tr>
                      <th colSpan={4}></th>
                      {periodo !== 'E2' && (<>
                        <th>N1</th><th>N2</th><th>N3</th><th>N4</th><th>E1</th>
                      </>)}
                      {periodo !== 'E1' && (<>
                        <th>N1</th><th>N2</th><th>N3</th><th>N4</th><th>E2</th>
                      </>)}
                      <th></th>
                      {showNF && <th></th>}
                      <th></th>
                      <th></th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasFiltradas.length === 0 && (
                      <tr><td colSpan={totalCols} className="text-center text-muted">Sin datos</td></tr>
                    )}
                    {filasFiltradas.map((r, idx) => {
                      const a = r.alumno; const m = r.m;
                      const e1 = Array.isArray(m.e1Notas) ? m.e1Notas : [];
                      const e2 = Array.isArray(m.e2Notas) ? m.e2Notas : [];
                      return (
                        <tr key={`pl-${idx}`}>
                          <td>{a.dni||""}</td>
                          <td>{a.apellido||""}</td>
                          <td>{a.nombre||""}</td>
                          <td>{m.materiaNombre||""}</td>
                          {periodo !== 'E2' && (<>
                            <td>{e1[0]??"-"}</td><td>{e1[1]??"-"}</td><td>{e1[2]??"-"}</td><td>{e1[3]??"-"}</td><td><Badge bg="light" text="dark">{m.e1??"-"}</Badge></td>
                          </>)}
                          {periodo !== 'E1' && (<>
                            <td>{e2[0]??"-"}</td><td>{e2[1]??"-"}</td><td>{e2[2]??"-"}</td><td>{e2[3]??"-"}</td><td><Badge bg="light" text="dark">{m.e2??"-"}</Badge></td>
                          </>)}
                          <td><Badge bg={m.pg>=6?"success":"danger"}>{m.pg??"-"}</Badge></td>
                          {showNF && <td><Badge bg="secondary">{nfMap[a.id] ?? '-'}</Badge></td>}
                          <td></td>
                          <td></td>
                          <td>{m.pg ?? "-"}</td>
                          <td>{m.estado??"-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}

              {vista === 'alumno' && (
                <div className="d-flex flex-column gap-3">
                  {(() => {
                    // group by alumno
                    const map = new Map();
                    for (const r of filasFiltradas) {
                      const key = (r.alumno?.dni || r.alumno?.id || r.alumnoNombre);
                      if (!map.has(key)) map.set(key, { alumno: r.alumno, filas: [] });
                      map.get(key).filas.push(r);
                    }
                    const grupos = Array.from(map.values()).sort((x,y)=>{
                      const ap = collator.compare(x.alumno?.apellido||"", y.alumno?.apellido||"");
                      if (ap!==0) return ap; return collator.compare(x.alumno?.nombre||"", y.alumno?.nombre||"");
                    });
                    if (grupos.length===0) return <div className="text-center text-muted">Sin datos</div>;
                    return grupos.map((g, gi) => (
                      <div key={`ga-${gi}`}>
                        <div className="fw-bold mb-2">{g.alumno?.apellido || ''} {g.alumno?.nombre || ''} · DNI {g.alumno?.dni || '-'}</div>
                        <Table striped bordered hover responsive size="sm">
                          <thead>
                            <tr>
                              <th>Materia</th>
                              {periodo !== 'E2' && <th colSpan={5} className="text-center">Calificaciones Etapa 1</th>}
                              {periodo !== 'E1' && <th colSpan={5} className="text-center">Calificaciones Etapa 2</th>}
                              <th>PG</th>
                              {showNF && <th>NF</th>}
                              <th>CO</th>
                              <th>EX</th>
                              <th>PFA</th>
                              <th>Estado</th>
                            </tr>
                            <tr>
                              <th></th>
                              {periodo !== 'E2' && (<>
                                <th>N1</th><th>N2</th><th>N3</th><th>N4</th><th>E1</th>
                              </>)}
                              {periodo !== 'E1' && (<>
                                <th>N1</th><th>N2</th><th>N3</th><th>N4</th><th>E2</th>
                              </>)}
                              <th></th>
                              {showNF && <th></th>}
                              <th></th><th></th><th></th><th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.filas.map((r, rIdx) => {
                              const m = r.m; const e1 = Array.isArray(m.e1Notas) ? m.e1Notas : []; const e2 = Array.isArray(m.e2Notas) ? m.e2Notas : [];
                              return (
                                <tr key={`ga-${gi}-r-${rIdx}`}>
                                  <td>{m.materiaNombre||""}</td>
                                  {periodo !== 'E2' && (<>
                                    <td>{e1[0]??"-"}</td><td>{e1[1]??"-"}</td><td>{e1[2]??"-"}</td><td>{e1[3]??"-"}</td><td><Badge bg="light" text="dark">{m.e1??"-"}</Badge></td>
                                  </>)}
                                  {periodo !== 'E1' && (<>
                                    <td>{e2[0]??"-"}</td><td>{e2[1]??"-"}</td><td>{e2[2]??"-"}</td><td>{e2[3]??"-"}</td><td><Badge bg="light" text="dark">{m.e2??"-"}</Badge></td>
                                  </>)}
                                  <td><Badge bg={m.pg>=6?"success":"danger"}>{m.pg??"-"}</Badge></td>
                                  {showNF && <td><Badge bg="secondary">{nfMap[g.alumno?.id] ?? '-'}</Badge></td>}
                                  <td></td><td></td><td>{m.pg ?? "-"}</td><td>{m.estado ?? "-"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {vista === 'materia' && (
                <div className="d-flex flex-column gap-3">
                  {(() => {
                    // group by materia
                    const map = new Map();
                    for (const r of filasFiltradas) {
                      const key = r.m?.materiaId || r.m?.materiaNombre || r.materiaNombre;
                      if (!map.has(key)) map.set(key, { materiaId: r.m?.materiaId, nombre: r.m?.materiaNombre || r.materiaNombre || '-', filas: [] });
                      map.get(key).filas.push(r);
                    }
                    const grupos = Array.from(map.values()).sort((x,y)=> collator.compare(x.nombre||"", y.nombre||""));
                    if (grupos.length===0) return <div className="text-center text-muted">Sin datos</div>;
                    return grupos.map((g, gi) => (
                      <div key={`gm-${gi}`}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="fw-bold">Materia: {g.nombre}</div>
                          {materiasSeleccionadas.length > 1 && g.materiaId && (
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => {
                                const url = `/reportes/notas-por-curso?cursoId=${cursoId}&materiaId=${g.materiaId}&anio=${anio}`;
                                window.open(url, '_blank');
                              }}
                            >
                              <BarChart3 size={16} className="me-1" />
                              Ver Gráficos
                            </Button>
                          )}
                        </div>
                        <Table striped bordered hover responsive size="sm">
                          <thead>
                            <tr>
                              <th>Nro Doc</th>
                              <th>Apellido</th>
                              <th>Nombre</th>
                              {periodo !== 'E2' && <th colSpan={5} className="text-center">Calificaciones Etapa 1</th>}
                              {periodo !== 'E1' && <th colSpan={5} className="text-center">Calificaciones Etapa 2</th>}
                              <th>PG</th>
                              {showNF && <th>NF</th>}
                              <th>CO</th>
                              <th>EX</th>
                              <th>PFA</th>
                              <th>Estado</th>
                            </tr>
                            <tr>
                              <th colSpan={3}></th>
                              {periodo !== 'E2' && (<>
                                <th>N1</th><th>N2</th><th>N3</th><th>N4</th><th>E1</th>
                              </>)}
                              {periodo !== 'E1' && (<>
                                <th>N1</th><th>N2</th><th>N3</th><th>N4</th><th>E2</th>
                              </>)}
                              <th></th>
                              {showNF && <th></th>}
                              <th></th><th></th><th></th><th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.filas.sort((r1,r2)=>{
                              const a1 = r1.alumno; const a2 = r2.alumno;
                              const ap = collator.compare(a1?.apellido||"", a2?.apellido||"");
                              if (ap!==0) return ap; return collator.compare(a1?.nombre||"", a2?.nombre||"");
                            }).map((r, rIdx) => {
                              const a = r.alumno; const m = r.m; const e1 = Array.isArray(m.e1Notas) ? m.e1Notas : []; const e2 = Array.isArray(m.e2Notas) ? m.e2Notas : [];
                              return (
                                <tr key={`gm-${gi}-r-${rIdx}`}>
                                  <td>{a.dni||""}</td>
                                  <td>{a.apellido||""}</td>
                                  <td>{a.nombre||""}</td>
                                  {periodo !== 'E2' && (<>
                                    <td>{e1[0]??"-"}</td><td>{e1[1]??"-"}</td><td>{e1[2]??"-"}</td><td>{e1[3]??"-"}</td><td><Badge bg="light" text="dark">{m.e1??"-"}</Badge></td>
                                  </>)}
                                  {periodo !== 'E1' && (<>
                                    <td>{e2[0]??"-"}</td><td>{e2[1]??"-"}</td><td>{e2[2]??"-"}</td><td>{e2[3]??"-"}</td><td><Badge bg="light" text="dark">{m.e2??"-"}</Badge></td>
                                  </>)}
                                  <td><Badge bg={m.pg>=6?"success":"danger"}>{m.pg??"-"}</Badge></td>
                                  {showNF && <td><Badge bg="secondary">{nfMap[a.id] ?? '-'}</Badge></td>}
                                  <td></td><td></td><td>{m.pg ?? "-"}</td><td>{m.estado ?? "-"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
