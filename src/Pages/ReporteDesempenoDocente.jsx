import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, Card, Row, Col, Form, Button, Spinner, Table, Badge, Alert, Accordion } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import { useAuth } from '../Context/AuthContext';
import AsyncDocenteSelect from '../Components/Controls/AsyncDocenteSelect';
import { listarCursos } from '../Services/CursoService';
import { listarMaterias } from '../Services/MateriaService';
import { listarMateriasDeCurso } from '../Services/MateriaCursoService';
import { reporteCompleto, reportePorDocente, reportePorCurso, reportePorMateria } from '../Services/ReporteDesempenoDocenteService';
import { toast } from 'react-toastify';
// Exportación a PDF: este reporte usará ventana de impresión, igual que otros reportes del sistema

export default function ReporteDesempenoDocente() {
  const { user } = useAuth();
  const token = user?.token;
  const [searchParams] = useSearchParams();
  const autoGenerar = searchParams.get('auto') === 'true';
  const docenteIdFromUrl = searchParams.get('docenteId');

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [cursos, setCursos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [materiasCurso, setMateriasCurso] = useState([]);
  const [cursoId, setCursoId] = useState('');
  const [materiaId, setMateriaId] = useState('');
  const [docenteOpt, setDocenteOpt] = useState(null);
  const [docenteId, setDocenteId] = useState(docenteIdFromUrl || '');
  const [modo, setModo] = useState('curso'); // 'curso' | 'materia' | 'docente' | 'anio'
  const [busquedaDocente, setBusquedaDocente] = useState('');
  const [cargando, setCargando] = useState(false);
  const [data, setData] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [cursosList, materiasList] = await Promise.all([
          listarCursos(token).catch(() => []),
          listarMaterias(token).catch(() => [])
        ]);
        setCursos(Array.isArray(cursosList) ? cursosList : []);
        setMaterias(Array.isArray(materiasList) ? materiasList : []);
      } catch {
        // silencioso
      }
    })();
  }, [token]);

  // Cargar materias del curso seleccionado
  useEffect(() => {
    if (!token || !cursoId) {
      setMateriasCurso([]);
      return;
    }
    (async () => {
      try {
        const lista = await listarMateriasDeCurso(token, cursoId);
        setMateriasCurso(Array.isArray(lista) ? lista : []);
      } catch {
        setMateriasCurso([]);
      }
    })();
  }, [token, cursoId]);

  // Ya no filtramos materias por curso, solo limpiamos selección si cambia el curso
  useEffect(() => {
    if (!cursoId) {
      setMateriaId('');
      setDocenteOpt(null);
      setDocenteId('');
    }
    // No tocamos setMaterias, siempre mostramos todas las materias
  }, [cursoId]);

  const generar = async () => {
    if (!anio || anio < 2000 || anio > 2100) {
      toast.error('Año inválido');
      return;
    }
    // Validar según modo
    if (modo === 'curso' && !cursoId) {
      toast.error('Seleccioná un curso');
      return;
    }
    if (modo === 'materia' && !materiaId) {
      toast.error('Seleccioná una materia');
      return;
    }
    if (modo === 'docente' && !docenteId) {
      toast.error('Seleccioná un docente');
      return;
    }
    setCargando(true);
    setData(null);
    try {
      let resp;
      if (modo === 'curso' && cursoId) {
        resp = await reportePorCurso(token, anio, Number(cursoId));
      } else if (modo === 'materia' && materiaId) {
        resp = await reportePorMateria(token, anio, Number(materiaId));
      } else if (modo === 'docente' && docenteId) {
        resp = await reportePorDocente(token, anio, Number(docenteId));
      } else if (modo === 'anio') {
        resp = await reporteCompleto(token, anio);
      } else {
        resp = await reporteCompleto(token, anio);
      }
      setData(resp);
      toast.success('Reporte generado');
    } catch (e) {
      toast.error(e?.message || 'No se pudo generar el reporte');
    } finally { setCargando(false); }
  };

  // ...existing code...

  // Auto-generar cuando viene de URL
  useEffect(() => {
    if (autoGenerar && docenteIdFromUrl && token && !data && !cargando) {
      generar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerar, docenteIdFromUrl, token]);

  // Opciones de materias según modo
  const materiasOpts = useMemo(() => {
    let arr = [];
    if (modo === 'curso' && cursoId) {
      arr = materiasCurso;
    } else if (modo === 'materia' && cursoId) {
      arr = materiasCurso;
    } else {
      arr = materias;
    }
    return arr.map((m) => ({
      value: m.id ?? m.materiaId ?? '',
      label: m.nombre ?? m.nombreMateria ?? `Materia ${m.id ?? ''}`,
    })).filter(o => o.value !== '');
  }, [materias, materiasCurso, cursoId, modo]);

  // Opciones de docentes según modo
  const docentesDeCurso = useMemo(() => {
    let docentesMap = new Map();
    let fuente = [];
    if (modo === 'curso' && cursoId) {
      fuente = materiasCurso;
    } else if (modo === 'materia' && materiaId && cursoId) {
      fuente = materiasCurso.filter(m => String(m.materiaId ?? m.id) === String(materiaId));
    } else if (modo === 'materia' && materiaId) {
      fuente = materias.filter(m => String(m.materiaId ?? m.id) === String(materiaId));
    } else if (modo === 'docente' && cursoId && materiaId) {
      fuente = materiasCurso.filter(m => String(m.materiaId ?? m.id) === String(materiaId));
    } else if (modo === 'docente' && cursoId) {
      fuente = materiasCurso;
    } else if (modo === 'docente' && materiaId) {
      fuente = materias.filter(m => String(m.materiaId ?? m.id) === String(materiaId));
    } else {
      fuente = materias;
    }
    fuente.forEach(m => {
      if (m.docente && m.docente.id) {
        docentesMap.set(m.docente.id, m.docente);
      }
    });
    let lista = Array.from(docentesMap.values());
    if (modo === 'docente' && busquedaDocente) {
      const q = busquedaDocente.toLowerCase();
      lista = lista.filter(d =>
        (d.nombre && d.nombre.toLowerCase().includes(q)) ||
        (d.apellido && d.apellido.toLowerCase().includes(q)) ||
        (d.dni && String(d.dni).includes(q))
      );
    }
    return lista;
  }, [cursoId, materiaId, materiasCurso, materias, modo, busquedaDocente]);

  const resultadosMateria = useMemo(() => {
    return Array.isArray(data?.resultadosPorMateria) ? data.resultadosPorMateria : [];
  }, [data]);

  const resultadosDocente = useMemo(() => {
    const top = Array.isArray(data?.resultadosPorDocente) ? data.resultadosPorDocente : [];
    if (top.length > 0) return top;
    // Recolectar de materias
    const col = [];
    for (const m of resultadosMateria) {
      if (Array.isArray(m?.resultadosPorDocente)) col.push(...m.resultadosPorDocente);
    }
    return col;
  }, [data, resultadosMateria]);

  // KPIs calculados
  const kpis = useMemo(() => {
    if (!data) return null;
    
    // Contadores para estados según backend: EXCELENTE (>=90), BUENO (>=75), REGULAR (>=60), PREOCUPANTE (<60)
    let excelentes = 0;
    let buenos = 0;
    let regulares = 0;
    let preocupantes = 0;
    let totalAprobacion = 0;
    let countAprobacion = 0;
    let totalPromedio = 0;
    let countPromedio = 0;
    
    // Contar desde resultadosDocente directo
    resultadosDocente.forEach(d => {
      const estado = d.estadoAnalisis?.toUpperCase();
      if (estado === 'EXCELENTE') excelentes++;
      else if (estado === 'BUENO') buenos++;
      else if (estado === 'REGULAR') regulares++;
      else if (estado === 'PREOCUPANTE') preocupantes++;
      
      if (typeof d.porcentajeAprobacion === 'number') {
        totalAprobacion += d.porcentajeAprobacion;
        countAprobacion++;
      }
      if (typeof d.promedioGeneral === 'number') {
        totalPromedio += d.promedioGeneral;
        countPromedio++;
      }
    });
    
    // Si no hay datos en resultadosDocente, contar desde resultadosMateria
    if (resultadosDocente.length === 0 && resultadosMateria.length > 0) {
      resultadosMateria.forEach(m => {
        if (Array.isArray(m.resultadosPorDocente)) {
          m.resultadosPorDocente.forEach(d => {
            const estado = d.estadoAnalisis?.toUpperCase();
            if (estado === 'EXCELENTE') excelentes++;
            else if (estado === 'BUENO') buenos++;
            else if (estado === 'REGULAR') regulares++;
            else if (estado === 'PREOCUPANTE') preocupantes++;
            
            if (typeof d.porcentajeAprobacion === 'number') {
              totalAprobacion += d.porcentajeAprobacion;
              countAprobacion++;
            }
            if (typeof d.promedioGeneral === 'number') {
              totalPromedio += d.promedioGeneral;
              countPromedio++;
            }
          });
        }
      });
    }
    
    const promedioAprobacion = countAprobacion > 0 ? totalAprobacion / countAprobacion : 0;
    const promedioGeneralTotal = countPromedio > 0 ? totalPromedio / countPromedio : 0;

    // Calcular conteos únicos correctamente (no confiar en el backend)
    const docentesUnicos = new Set(resultadosDocente.map(d => d.docenteId).filter(Boolean)).size;
    const materiasUnicas = new Set(resultadosDocente.map(d => d.materiaId).filter(Boolean)).size;
    const cursosUnicos = new Set(resultadosDocente.map(d => d.cursoId).filter(Boolean)).size;
    
    // Para alumnos, sumar totalAlumnos únicos por curso (no por fila)
    const alumnosPorCurso = new Map();
    resultadosDocente.forEach(d => {
      if (d.cursoId && typeof d.totalAlumnos === 'number') {
        if (!alumnosPorCurso.has(d.cursoId)) {
          alumnosPorCurso.set(d.cursoId, d.totalAlumnos);
        }
      }
    });
    const totalAlumnosUnicos = Array.from(alumnosPorCurso.values()).reduce((a, b) => a + b, 0);
    
    return {
      promedioAprobacion,
      promedioGeneralTotal,
      excelentes,
      buenos,
      regulares,
      preocupantes,
      totalRegistros: excelentes + buenos + regulares + preocupantes,
      // Usar conteos únicos calculados, no los del backend
      totalDocentes: docentesUnicos || data.totalDocentes,
      totalMaterias: materiasUnicas || resultadosMateria.length || data.totalMaterias,
      totalCursos: cursosUnicos || data.totalCursos,
      totalAlumnos: totalAlumnosUnicos || data.totalAlumnos
    };
  }, [data, resultadosDocente, resultadosMateria]);

  // Datos para gráficos con lógica de visibilidad según contexto
  const chartsData = useMemo(() => {
    if (!data || !resultadosDocente.length) return null;

    const totalRegistros = resultadosDocente.length;
    const docentesUnicos = new Set(resultadosDocente.map(d => d.docenteId || d.nombreCompletoDocente)).size;
    const materiasUnicas = new Set(resultadosDocente.map(d => d.materiaId || d.nombreMateria)).size;

    // Determinar si es vista de un solo docente
    const esDocenteUnico = docentesUnicos === 1;

    // 1. Top 10 Mejores Docentes por Promedio (BarChart horizontal) - Solo si hay 5+ docentes únicos
    let topDocentes = [];
    if (docentesUnicos >= 5) {
      topDocentes = [...resultadosDocente]
        .filter(d => typeof d.promedioGeneral === 'number')
        .sort((a, b) => b.promedioGeneral - a.promedioGeneral)
        .slice(0, 10)
        .map(d => ({
          nombre: (d.nombreCompletoDocente || `${d.apellidoDocente || ''} ${d.nombreDocente || ''}`).substring(0, 25),
          promedio: d.promedioGeneral,
          materia: (d.nombreMateria || '').substring(0, 15)
        }));
    }

    // 2. Comparación entre Docentes de la Misma Materia (BarChart) - Solo si hay 2+ docentes en una materia
    let comparacionDocentes = [];
    if (materiaId && totalRegistros >= 2 && docentesUnicos >= 2) {
      // Filtrado por materia específica, comparar docentes
      comparacionDocentes = [...resultadosDocente]
        .filter(d => typeof d.promedioGeneral === 'number')
        .sort((a, b) => b.promedioGeneral - a.promedioGeneral)
        .map(d => ({
          nombre: (d.nombreCompletoDocente || `${d.apellidoDocente || ''} ${d.nombreDocente || ''}`).substring(0, 20),
          promedio: d.promedioGeneral,
          aprobacion: d.porcentajeAprobacion
        }));
    }

    // 3. Rendimiento por Curso (si hay múltiples cursos y no hay filtro de curso) - Solo vista general
    let cursosData = [];
    if (!cursoId && totalRegistros >= 3 && !esDocenteUnico) {
      const cursoMap = new Map();
      resultadosDocente.forEach(d => {
        const curso = d.cursoCompleto || 'Sin curso';
        if (!cursoMap.has(curso)) {
          cursoMap.set(curso, { total: 0, sum: 0 });
        }
        const entry = cursoMap.get(curso);
        if (typeof d.promedioGeneral === 'number') {
          entry.sum += d.promedioGeneral;
          entry.total++;
        }
      });

      cursosData = Array.from(cursoMap.entries())
        .map(([curso, stats]) => ({
          curso: curso.substring(0, 15),
          promedio: stats.total > 0 ? (stats.sum / stats.total) : 0
        }))
        .filter(c => c.promedio > 0)
        .sort((a, b) => b.promedio - a.promedio)
        .slice(0, 10);
      
      // Solo mostrar si hay 2+ cursos diferentes
      if (cursosData.length < 2) cursosData = [];
    }

    // 4. Rendimiento por Materia del Docente (si es docente único)
    let materiasDocenteData = [];
    if (esDocenteUnico && materiasUnicas >= 2) {
      const materiaMap = new Map();
      resultadosDocente.forEach(d => {
        const materia = d.nombreMateria || 'Sin materia';
        if (!materiaMap.has(materia)) {
          materiaMap.set(materia, { total: 0, sum: 0 });
        }
        const entry = materiaMap.get(materia);
        if (typeof d.promedioGeneral === 'number') {
          entry.sum += d.promedioGeneral;
          entry.total++;
        }
      });

      materiasDocenteData = Array.from(materiaMap.entries())
        .map(([materia, stats]) => ({
          materia: materia.substring(0, 20),
          promedio: stats.total > 0 ? (stats.sum / stats.total) : 0
        }))
        .filter(m => m.promedio > 0)
        .sort((a, b) => b.promedio - a.promedio);
    }

    return {
      topDocentes,
      cursosData,
      comparacionDocentes,
      materiasDocenteData,
      totalRegistros,
      docentesUnicos,
      materiasUnicas,
      esDocenteUnico
    };
  }, [data, resultadosDocente, materiaId, cursoId]);

  const docenteRows = useMemo(() => {
    return (Array.isArray(resultadosDocente) ? resultadosDocente : []).map((d) => ({
      docente: d.nombreCompletoDocente || `${d.apellidoDocente || ''}, ${d.nombreDocente || ''}`,
      materia: d.nombreMateria || d.materiaNombre || '-',
      curso: d.cursoCompleto || '-',
      alumnos: d.totalAlumnos ?? '',
      aprobados: d.alumnosAprobados ?? '',
      desaprobados: d.alumnosDesaprobados ?? '',
      aprobacion: typeof d.porcentajeAprobacion === 'number' ? d.porcentajeAprobacion.toFixed(2) : '',
      promedio: typeof d.promedioGeneral === 'number' ? d.promedioGeneral.toFixed(2) : '',
      estado: d.estadoAnalisis || '',
    }));
  }, [resultadosDocente]);

  const exportCSV = () => {
    if (!docenteRows.length) {
      toast.info('No hay datos para exportar');
      return;
    }
    const headers = ['Docente', 'Materia', 'Curso', 'Alumnos', 'Aprobados', 'Desaprobados', '% Aprobación', 'Promedio', 'Estado'];
    const escape = (s) => (`${s ?? ''}`.includes(',') || `${s ?? ''}`.includes('"'))
      ? `"${`${s ?? ''}`.replace(/"/g, '""')}`
      : `${s ?? ''}`;
    const lines = [headers.join(',')].concat(docenteRows.map(r => [r.docente, r.materia, r.curso, r.alumnos, r.aprobados, r.desaprobados, r.aprobacion, r.promedio, r.estado].map(escape).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-desempeno-docente-${anio}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Imprimir / exportar a PDF vía diálogo de impresión del navegador
  const printOnly = () => {
    if (!printRef.current) { toast.info('No hay contenido para imprimir'); return; }
    const win = window.open('', '_blank');
    if (!win) return;
    
    const css = `
      @page { size: landscape; margin: 12mm; }
      body { 
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        padding: 16px; 
        color: #333;
        background: white;
      }
      h3 { 
        margin: 0 0 8px 0; 
        color: #0066cc;
        font-size: 22px;
        border-bottom: 3px solid #0066cc;
        padding-bottom: 8px;
      }
      h4 { 
        margin: 16px 0 12px 0; 
        color: #333;
        font-size: 16px;
        font-weight: 600;
      }
      h5 {
        margin: 12px 0 8px 0;
        font-size: 14px;
        font-weight: 600;
      }
      .filtros { 
        color: #666; 
        font-size: 11px; 
        margin-bottom: 16px;
        padding: 8px;
        background: #f8f9fa;
        border-left: 4px solid #0066cc;
      }
      .kpis-section {
        margin: 16px 0;
        page-break-inside: avoid;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 12px;
      }
      .kpi-card {
        border: 2px solid #ddd;
        border-radius: 6px;
        padding: 10px;
        text-align: center;
        background: #fafafa;
      }
      .kpi-card.primary { border-color: #0066cc; }
      .kpi-card.info { border-color: #17a2b8; }
      .kpi-card.success { border-color: #28a745; }
      .kpi-card.warning { border-color: #ffc107; }
      .kpi-card.danger { border-color: #dc3545; }
      .kpi-label {
        font-size: 10px;
        color: #666;
        margin-bottom: 4px;
      }
      .kpi-value {
        font-size: 20px;
        font-weight: bold;
        margin: 0;
      }
      .kpi-card.primary .kpi-value { color: #0066cc; }
      .kpi-card.info .kpi-value { color: #17a2b8; }
      .kpi-card.success .kpi-value { color: #28a745; }
      .kpi-card.warning .kpi-value { color: #ffc107; }
      .kpi-card.danger .kpi-value { color: #dc3545; }
      .context-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 16px;
      }
      .context-card {
        background: #e9ecef;
        padding: 6px;
        border-radius: 4px;
        text-align: center;
      }
      .context-label {
        font-size: 9px;
        color: #666;
      }
      .context-value {
        font-weight: bold;
        font-size: 13px;
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        margin: 12px 0;
        page-break-inside: auto;
      }
      thead { 
        display: table-header-group;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      th, td { 
        border: 1px solid #444; 
        padding: 6px 8px; 
        font-size: 10px;
        text-align: left;
      }
      th { 
        background: #2c3e50; 
        color: white;
        font-weight: 600;
      }
      tbody tr:nth-child(even) {
        background: #f8f9fa;
      }
      .badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: 600;
      }
      .badge-success { background: #28a745; color: white; }
      .badge-info { background: #17a2b8; color: white; }
      .badge-warning { background: #ffc107; color: #333; }
      .badge-danger { background: #dc3545; color: white; }
      .badge-secondary { background: #6c757d; color: white; }
      /* Mostrar accordions expandidos en impresión */
      .accordion-button { display: none !important; }
      .accordion-button::after { display: none !important; }
      .accordion-item { border: none !important; margin-bottom: 16px; }
      .accordion-header { 
        background: #e9ecef; 
        padding: 8px 12px;
        border-left: 4px solid #0066cc;
        margin-bottom: 8px;
        font-weight: 600;
        font-size: 13px;
      }
      .accordion-body { 
        display: block !important; 
        padding: 0 !important;
      }
      .accordion-collapse { display: block !important; }
      ul { margin: 8px 0; padding-left: 20px; }
      li { margin: 4px 0; font-size: 11px; }
      p { margin: 8px 0; font-size: 11px; line-height: 1.4; }
      .text-muted { color: #666 !important; }
      .small { font-size: 10px !important; }
      @media print {
        .d-print-none { display: none !important; }
      }
    `;
    
    const findMateriaLabel = () => (materiasOpts.find(o => String(o.value)===String(materiaId))?.label || 'Todas');
    const findDocenteLabel = () => docenteOpt?.label || 'Todos';
    const findCursoLabel = () => {
      const c = cursos.find(x => String(x.id) === String(cursoId));
      return c ? `${c.anio || ''}° ${c.division || ''}` : 'Todos';
    };
    const filtros = [
      `Año: ${anio}`,
      `Curso: ${cursoId ? findCursoLabel() : 'Todos'}`,
      `Materia: ${materiaId ? findMateriaLabel() : 'Todas'}`,
      `Docente: ${docenteId ? findDocenteLabel() : 'Todos'}`,
    ].join(' • ');
    
    // Información del docente si es único
    let docenteInfoHtml = '';
    if (chartsData?.esDocenteUnico && resultadosDocente.length > 0) {
      const d = resultadosDocente[0];
      const nombreCompleto = d.nombreCompletoDocente || `${d.apellidoDocente || ''}, ${d.nombreDocente || ''}`;
      const dni = d.dniDocente ? `DNI: ${d.dniDocente}` : '';
      const email = d.emailDocente ? `Email: ${d.emailDocente}` : '';
      docenteInfoHtml = `
        <div style="margin: 16px 0; padding: 12px; background: #e7f3ff; border: 1px solid #0066cc; border-radius: 4px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #0066cc;">${nombreCompleto}</h3>
          <div style="font-size: 12px; color: #333;">
            ${dni ? `<span style="margin-right: 16px;">${dni}</span>` : ''}
            ${email ? `<span>${email}</span>` : ''}
          </div>
        </div>
      `;
    }
    
    // Construir HTML de KPIs como texto simple
    let kpisHtml = '';
    if (kpis) {
      kpisHtml = `
        <div style="margin: 16px 0; padding: 12px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;">
          <h4 style="margin: 0 0 12px 0; font-size: 14px;">📊 Indicadores Clave de Desempeño</h4>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 11px;">
            <div><strong>% Aprobación Promedio:</strong> ${kpis.promedioAprobacion.toFixed(1)}%</div>
            <div><strong>Promedio General:</strong> ${kpis.promedioGeneralTotal.toFixed(2)}</div>
            <div><strong>Excelentes (≥90%):</strong> ${kpis.excelentes}</div>
            <div><strong>Buenos (≥75%):</strong> ${kpis.buenos}</div>
            <div><strong>Regulares (≥60%):</strong> ${kpis.regulares}</div>
            <div><strong>Preocupantes (&lt;60%):</strong> ${kpis.preocupantes}</div>
          </div>
          <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #dee2e6; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 10px;">
            <div><strong>Materias:</strong> ${kpis.totalMaterias ?? '-'}</div>
            <div><strong>Docentes:</strong> ${kpis.totalDocentes ?? '-'}</div>
            <div><strong>Alumnos:</strong> ${kpis.totalAlumnos ?? '-'}</div>
            <div><strong>Cursos:</strong> ${kpis.totalCursos ?? '-'}</div>
          </div>
        </div>
      `;
    }
    
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte de Desempeño Docente - ${anio}</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>Reporte de Desempeño Docente - Año ${anio}</h3>`);
    win.document.write(`<div class="filtros">📋 Filtros aplicados: ${filtros}</div>`);
    win.document.write(docenteInfoHtml);
    win.document.write(kpisHtml);
    win.document.write(`<div>${printRef.current.innerHTML}</div>`);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <Container className="py-4">
      <div className="mb-3">
        <Breadcrumbs />
        <div className="mt-2"><BackButton /></div>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-3">Reporte de desempeño docente</h3>
          
          <p className="text-muted small mb-3">
            Este reporte analiza el rendimiento académico de los docentes según los resultados de sus alumnos. 
            Incluye porcentajes de aprobación, promedios generales y estado de desempeño por materia y curso.
          </p>

          <Alert variant="warning" className="mb-3">
            <strong>⚠️ Recomendación:</strong> Si generás el reporte completo de todo el año puede demorar debido a la cantidad de datos. 
            Se recomienda filtrar por <strong>Curso</strong> o <strong>Materia</strong> para obtener resultados más rápidos y específicos.
          </Alert>

          {/* Filtros */}
          <Row className="g-3 align-items-end">
            <Col md={2} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Año</Form.Label>
                <Form.Control type="number" value={anio} onChange={(e)=>setAnio(Number(e.target.value))} />
              </Form.Group>
            </Col>
            <Col md={2} sm={6} xs={12}>
              <Form.Group>
                <Form.Label>Modo de reporte</Form.Label>
                <Form.Select value={modo} onChange={e => { setModo(e.target.value); setCursoId(''); setMateriaId(''); setDocenteOpt(null); setDocenteId(''); setBusquedaDocente(''); }}>
                  <option value="curso">Por curso</option>
                  <option value="materia">Por materia</option>
                  <option value="docente">Por docente</option>
                  <option value="anio">Por año</option>
                </Form.Select>
              </Form.Group>
            </Col>
            
            {/* MODO CURSO: solo select de curso */}
            {modo === 'curso' && (
              <Col md={3} sm={6} xs={12}>
                <Form.Group>
                  <Form.Label>Curso</Form.Label>
                  <Form.Select value={cursoId} onChange={(e)=>setCursoId(e.target.value)}>
                    <option value="">-- Seleccioná un curso --</option>
                    {cursos.map(c => (
                      <option key={c.id} value={c.id}>
                        {`${c.anio || ''}° ${c.division || ''}`.trim()}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            )}

            {/* MODO MATERIA: curso opcional + materia */}
            {modo === 'materia' && (
              <>
                <Col md={2} sm={6} xs={12}>
                  <Form.Group>
                    <Form.Label>Curso (opcional)</Form.Label>
                    <Form.Select value={cursoId} onChange={(e)=>setCursoId(e.target.value)}>
                      <option value="">-- Todos --</option>
                      {cursos.map(c => (
                        <option key={c.id} value={c.id}>
                          {`${c.anio || ''}° ${c.division || ''}`.trim()}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3} sm={6} xs={12}>
                  <Form.Group>
                    <Form.Label>Materia</Form.Label>
                    <Form.Select value={materiaId} onChange={(e)=>setMateriaId(e.target.value)}>
                      <option value="">-- Seleccioná una materia --</option>
                      {materiasOpts.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </>
            )}

            {/* MODO DOCENTE: curso opcional + materia opcional + AsyncDocenteSelect */}
            {modo === 'docente' && (
              <>
                <Col md={2} sm={6} xs={12}>
                  <Form.Group>
                    <Form.Label>Curso (opcional)</Form.Label>
                    <Form.Select value={cursoId} onChange={(e)=>setCursoId(e.target.value)}>
                      <option value="">-- Todos --</option>
                      {cursos.map(c => (
                        <option key={c.id} value={c.id}>
                          {`${c.anio || ''}° ${c.division || ''}`.trim()}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2} sm={6} xs={12}>
                  <Form.Group>
                    <Form.Label>Materia (opcional)</Form.Label>
                    <Form.Select value={materiaId} onChange={(e)=>setMateriaId(e.target.value)}>
                      <option value="">-- Todas --</option>
                      {materiasOpts.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4} sm={12} xs={12}>
                  <Form.Group>
                    <Form.Label>Docente</Form.Label>
                    <AsyncDocenteSelect
                      token={token}
                      value={docenteOpt}
                      onChange={(opt) => { setDocenteOpt(opt); setDocenteId(opt?.value || ''); }}
                      placeholder="Buscar docente por nombre o DNI"
                      docentesList={docentesDeCurso}
                    />
                  </Form.Group>
                </Col>
              </>
            )}

            {/* MODO AÑO: sin filtros adicionales */}
            {modo === 'anio' && (
              <Col md={3} sm={6} xs={12}>
                <Form.Text className="text-muted">Mostrará el reporte completo del año seleccionado</Form.Text>
              </Col>
            )}

            <Col md="auto" className="d-flex gap-2">
              <Button 
                type="button" 
                variant="primary" 
                disabled={cargando || (modo === 'curso' && !cursoId) || (modo === 'materia' && !materiaId) || (modo === 'docente' && !docenteId)}
                onClick={generar}
              >
                {cargando ? <><Spinner size="sm" animation="border" className="me-2"/>Generando...</> : "Generar"}
              </Button>
              <Button 
                type="button" 
                variant="outline-secondary" 
                disabled={cargando}
                onClick={() => { setModo('curso'); setCursoId(''); setMateriaId(''); setDocenteOpt(null); setDocenteId(''); setBusquedaDocente(''); setData(null); }}
              >
                Limpiar
              </Button>
            </Col>
          </Row>

          <Row className="mt-4 g-2">
            <Col md="auto">
              <Button variant="outline-secondary" onClick={exportCSV} disabled={cargando || !data}>Exportar CSV</Button>
            </Col>
            <Col md="auto">
              <Button variant="outline-secondary" onClick={printOnly} disabled={cargando || !data}>Imprimir / PDF</Button>
            </Col>
          </Row>

      {/* Resultados */}
      {data && (
        <div ref={printRef}>
          <hr />

          {/* Información del docente cuando se filtra por un único docente */}
          {chartsData?.esDocenteUnico && resultadosDocente.length > 0 && (
            <Card className="mb-4">
              <Card.Body>
                <Row>
                  <Col>
                    <h4 className="mb-2">{resultadosDocente[0]?.nombreCompletoDocente || `${resultadosDocente[0]?.apellidoDocente || ''}, ${resultadosDocente[0]?.nombreDocente || ''}`}</h4>
                    <div className="text-muted">
                      {resultadosDocente[0]?.dniDocente && <span className="me-3"><strong>DNI:</strong> {resultadosDocente[0].dniDocente}</span>}
                      {resultadosDocente[0]?.emailDocente && <span><strong>Email:</strong> {resultadosDocente[0].emailDocente}</span>}
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* KPIs visuales */}
          {kpis && (
            <Accordion className="mb-4 d-print-none">
              <Accordion.Item eventKey="0">
                <Accordion.Header>
                  <BarChart3 size={18} className="me-2" />
                  <strong>Indicadores Clave de Desempeño</strong>
                </Accordion.Header>
                <Accordion.Body>
                  <Row className="g-3 mb-4">
                    <Col md={3}>
                      <Card className="h-100 border-primary">
                        <Card.Body className="text-center">
                          <div className="text-muted small mb-1">% Aprobación Promedio</div>
                          <div className="h2 mb-0 text-primary">{kpis.promedioAprobacion.toFixed(1)}%</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="h-100 border-info">
                        <Card.Body className="text-center">
                          <div className="text-muted small mb-1">Promedio General</div>
                          <div className="h2 mb-0 text-info">{kpis.promedioGeneralTotal.toFixed(2)}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="h-100 border-success">
                        <Card.Body className="text-center">
                          <div className="text-muted small mb-1">Excelentes (≥90%)</div>
                          <div className="h2 mb-0 text-success">{kpis.excelentes}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="h-100 border-info">
                        <Card.Body className="text-center">
                          <div className="text-muted small mb-1">Buenos (≥75%)</div>
                          <div className="h2 mb-0 text-info">{kpis.buenos}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                  <Row className="g-3 mb-4">
                    <Col md={6}>
                      <Card className="h-100 border-warning">
                        <Card.Body className="text-center">
                          <div className="text-muted small mb-1">Regulares (≥60%)</div>
                          <div className="h2 mb-0 text-warning">{kpis.regulares}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card className="h-100 border-danger">
                        <Card.Body className="text-center">
                          <div className="text-muted small mb-1">Preocupantes (&lt;60%)</div>
                          <div className="h2 mb-0 text-danger">{kpis.preocupantes}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  {/* Información contextual */}
                  <Row className="g-3">
                    <Col md={3}>
                      <Card className="h-100 bg-light">
                        <Card.Body className="text-center py-2">
                          <div className="text-muted small">Materias</div>
                          <div className="fw-bold">{kpis.totalMaterias ?? '-'}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="h-100 bg-light">
                        <Card.Body className="text-center py-2">
                          <div className="text-muted small">Docentes</div>
                          <div className="fw-bold">{kpis.totalDocentes ?? '-'}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="h-100 bg-light">
                        <Card.Body className="text-center py-2">
                          <div className="text-muted small">Alumnos</div>
                          <div className="fw-bold">{kpis.totalAlumnos ?? '-'}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="h-100 bg-light">
                        <Card.Body className="text-center py-2">
                          <div className="text-muted small">Cursos</div>
                          <div className="fw-bold">{kpis.totalCursos ?? '-'}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  {/* Gráficos de análisis */}
                  {chartsData && (
                    <>
                      <hr className="my-4" />
                      <h5 className="mb-3">Análisis Comparativo</h5>
                      
                      <Row className="g-3 mb-3">
                        {/* Rendimiento por Materia del Docente - Solo cuando es docente único */}
                        {chartsData.materiasDocenteData.length > 0 && (
                          <Col md={chartsData.cursosData.length > 0 ? 6 : 12}>
                            <Card className="h-100">
                              <Card.Header><strong>Rendimiento del Docente por Materia</strong></Card.Header>
                              <Card.Body>
                                <ResponsiveContainer width="100%" height={280}>
                                  <BarChart data={chartsData.materiasDocenteData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="materia" angle={-20} textAnchor="end" height={60} />
                                    <YAxis domain={[0, 10]} />
                                    <Tooltip />
                                    <Bar dataKey="promedio" name="Promedio" fill="#0066cc" />
                                  </BarChart>
                                </ResponsiveContainer>
                                <div className="text-muted small mt-2">
                                  * Promedio de todas las divisiones donde dicta cada materia
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        )}

                        {/* Rendimiento por Curso - Solo si no hay filtro de curso y hay 2+ cursos */}
                        {chartsData.cursosData.length > 0 && (
                          <Col md={chartsData.materiasDocenteData.length > 0 ? 6 : 12}>
                            <Card className="h-100">
                              <Card.Header><strong>Promedio por Curso (Top 10)</strong></Card.Header>
                              <Card.Body>
                                <ResponsiveContainer width="100%" height={280}>
                                  <BarChart data={chartsData.cursosData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="curso" angle={-20} textAnchor="end" height={60} />
                                    <YAxis domain={[0, 10]} />
                                    <Tooltip />
                                    <Bar dataKey="promedio" name="Promedio" fill="#0066cc" />
                                  </BarChart>
                                </ResponsiveContainer>
                              </Card.Body>
                            </Card>
                          </Col>
                        )}
                      </Row>

                      {/* Comparación entre Docentes de la Misma Materia - Solo si hay materia filtrada y 2+ docentes */}
                      {chartsData.comparacionDocentes.length > 0 && (
                        <Row className="g-3 mb-3">
                          <Col>
                            <Card>
                              <Card.Header><strong>Comparación entre Docentes (Misma Materia)</strong></Card.Header>
                              <Card.Body>
                                <ResponsiveContainer width="100%" height={Math.max(250, chartsData.comparacionDocentes.length * 50)}>
                                  <BarChart data={chartsData.comparacionDocentes} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" domain={[0, 10]} />
                                    <YAxis type="category" dataKey="nombre" width={130} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="promedio" name="Promedio General" fill="#0066cc" />
                                    <Bar dataKey="aprobacion" name="% Aprobación (÷10)" fill="#28a745" />
                                  </BarChart>
                                </ResponsiveContainer>
                                <div className="text-muted small mt-2">
                                  * El % de Aprobación está dividido por 10 para mostrarse en la misma escala que el Promedio General (0-10)
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        </Row>
                      )}

                      {/* Top 10 Docentes - Solo si hay 5+ docentes únicos y NO hay filtro de docente individual */}
                      {chartsData.topDocentes.length > 0 && !docenteId && (
                        <Row className="g-3">
                          <Col>
                            <Card>
                              <Card.Header><strong>Top 10 Docentes con Mejor Promedio</strong></Card.Header>
                              <Card.Body>
                                <ResponsiveContainer width="100%" height={Math.max(300, chartsData.topDocentes.length * 40)}>
                                  <BarChart data={chartsData.topDocentes} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" domain={[0, 10]} />
                                    <YAxis type="category" dataKey="nombre" width={150} />
                                    <Tooltip 
                                      formatter={(value, name) => {
                                        if (name === 'promedio') return [value.toFixed(2), 'Promedio'];
                                        return [value, name];
                                      }}
                                      labelFormatter={(label) => {
                                        const item = chartsData.topDocentes.find(d => d.nombre === label);
                                        return item ? `${label} (${item.materia})` : label;
                                      }}
                                    />
                                    <Bar dataKey="promedio" name="Promedio" fill="#28a745" />
                                  </BarChart>
                                </ResponsiveContainer>
                              </Card.Body>
                            </Card>
                          </Col>
                        </Row>
                      )}
                    </>
                  )}
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          )}

          {resultadosMateria.length > 0 && (
                <>
                  <h4 className="mt-4">Resultados por materia</h4>
                  <Accordion alwaysOpen className="mt-2">
                    {resultadosMateria.map((m, ix) => (
                      <Accordion.Item eventKey={String(ix)} key={ix}>
                        <Accordion.Header>
                          <div className="w-100 d-flex justify-content-between">
                            <span><strong>{m.nombreMateria || m.materiaNombre || `Materia ${m.materiaId || ''}`}</strong></span>
                            <span className="text-muted">Aprobación prom.: {Number(m.promedioAprobacionMateria ?? 0).toFixed(2)}%</span>
                          </div>
                        </Accordion.Header>
                        <Accordion.Body>
                          <Table striped hover responsive size="sm" className="mb-3">
                            <thead>
                              <tr>
                                <th>Docente</th>
                                <th>Curso</th>
                                <th>Alumnos</th>
                                <th>Aprobados</th>
                                <th>Desaprobados</th>
                                <th>% Aprob.</th>
                                <th>Promedio</th>
                                <th>Estado</th>
                                <th className="d-print-none">Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(m.resultadosPorDocente || []).map((d, jx) => (
                                <tr key={jx}>
                                  <td>{d.nombreCompletoDocente || `${d.apellidoDocente || ''}, ${d.nombreDocente || ''}`}</td>
                                  <td>{d.cursoCompleto || '-'}</td>
                                  <td>{d.totalAlumnos ?? '-'}</td>
                                  <td>{d.alumnosAprobados ?? '-'}</td>
                                  <td>{d.alumnosDesaprobados ?? '-'}</td>
                                  <td>{typeof d.porcentajeAprobacion === 'number' ? `${d.porcentajeAprobacion.toFixed(2)}%` : '-'}</td>
                                  <td>{typeof d.promedioGeneral === 'number' ? d.promedioGeneral.toFixed(2) : '-'}</td>
                                  <td>
                                    {d.estadoAnalisis ? (
                                      <Badge bg={d.estadoAnalisis === 'EXCELENTE' ? 'success' : (d.estadoAnalisis === 'PREOCUPANTE' ? 'danger' : 'secondary')}>
                                        {d.estadoAnalisis}
                                      </Badge>
                                    ) : '-' }
                                  </td>
                                  <td className="d-print-none">
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={() => {
                                        if (d.cursoId && d.materiaId) {
                                          window.open(`/reportes/notas-por-curso?cursoId=${d.cursoId}&materiaId=${d.materiaId}`, '_blank');
                                        }
                                      }}
                                      disabled={!d.cursoId || !d.materiaId}
                                    >
                                      Ver notas
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>

                          <div className="small text-muted">
                            Total docentes: {m.totalDocentes ?? '-'} — Total alumnos: {m.totalAlumnos ?? '-'}
                          </div>
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                </>
              )}

              {resultadosDocente.length > 0 && resultadosMateria.length === 0 && (
                <>
                  <h4 className="mt-4">Resultados por docente</h4>
                  <Table striped hover responsive>
                    <thead>
                      <tr>
                        <th>Docente</th>
                        <th>Materia</th>
                        <th>Curso</th>
                        <th>Alumnos</th>
                        <th>Aprobados</th>
                        <th>Desaprobados</th>
                        <th>% Aprob.</th>
                        <th>Promedio</th>
                        <th>Estado</th>
                        <th className="d-print-none">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultadosDocente.map((d, idx) => (
                        <tr key={idx}>
                          <td>{d.nombreCompletoDocente || `${d.apellidoDocente || ''}, ${d.nombreDocente || ''}`}</td>
                          <td>{d.nombreMateria || '-'}</td>
                          <td>{d.cursoCompleto || '-'}</td>
                          <td>{d.totalAlumnos ?? '-'}</td>
                          <td>{d.alumnosAprobados ?? '-'}</td>
                          <td>{d.alumnosDesaprobados ?? '-'}</td>
                          <td>{typeof d.porcentajeAprobacion === 'number' ? `${d.porcentajeAprobacion.toFixed(2)}%` : '-'}</td>
                          <td>{typeof d.promedioGeneral === 'number' ? d.promedioGeneral.toFixed(2) : '-'}</td>
                          <td>
                            {d.estadoAnalisis ? (
                              <Badge bg={d.estadoAnalisis === 'EXCELENTE' ? 'success' : (d.estadoAnalisis === 'PREOCUPANTE' ? 'danger' : 'secondary')}>
                                {d.estadoAnalisis}
                              </Badge>
                            ) : '-' }
                          </td>
                          <td className="d-print-none">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                if (d.cursoId && d.materiaId) {
                                  window.open(`/reportes/notas-por-curso?cursoId=${d.cursoId}&materiaId=${d.materiaId}`, '_blank');
                                }
                              }}
                              disabled={!d.cursoId || !d.materiaId}
                            >
                              Ver notas
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
