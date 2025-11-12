import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Alert, Table, Badge, ListGroup } from 'react-bootstrap';
import { ChevronRight, ChevronDown, FileText } from 'lucide-react';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import { useAuth } from '../Context/AuthContext';
import { listarCursos } from '../Services/CursoService';
import { listarMaterias } from '../Services/MateriaService';
import { institucional, porMateria, porCurso, resumen as resumenSvc } from '../Services/ReporteExamenesConsecutivosService';
import { toast } from 'react-toastify';
import { useCicloLectivo } from "../Context/CicloLectivoContext.jsx";

export default function ReporteExamenesConsecutivos() {
  const { user } = useAuth();
  const token = user?.token;
  const rol = user?.rol;
  const { cicloLectivo } = useCicloLectivo();

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [ambito, setAmbito] = useState('institucional'); // institucional | materia | curso | resumen
  const [cursos, setCursos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [cursoId, setCursoId] = useState('');
  const [materiaId, setMateriaId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const printRef = useRef(null);
  const isInitialMount = useRef(true);
  
  // Filtros para casos detectados (solo cuando ambito === 'materia')
  const [filtroDivision, setFiltroDivision] = useState('');
  const [ordenAlfabetico, setOrdenAlfabetico] = useState(false);

  // Leer parámetros de URL al cargar y generar reporte automáticamente
  useEffect(() => {
    if (!isInitialMount.current) return;
    isInitialMount.current = false;
    
    const params = new URLSearchParams(window.location.search);
    if (!params.has('autoGenerate')) return;
    
    if (params.has('ambito')) setAmbito(params.get('ambito'));
    if (params.has('materiaId')) setMateriaId(params.get('materiaId'));
    if (params.has('cursoId')) setCursoId(params.get('cursoId'));
    if (params.has('anio')) setAnio(Number(params.get('anio')));
    
    // Marcar para generar en el próximo render
    setTimeout(() => {
      document.getElementById('btn-generar-reporte')?.click();
    }, 200);
  }, []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [cs, ms] = await Promise.all([
          listarCursos(token).catch(() => []),
          listarMaterias(token).catch(() => [])
        ]);
        setCursos((cs || []).map(c => ({
          value: c.id,
          label: `${c.anio ? c.anio + '°' : ''} ${c.division ?? ''}`.trim(),
          raw: c
        })));
        setMaterias((ms || []).map(m => ({
          value: m.id ?? m.materiaId ?? m.codigo ?? '',
          label: m.nombre ?? m.nombreMateria ?? m.descripcion ?? `Materia ${m.id ?? m.materiaId ?? ''}`,
          raw: m
        })).filter(o => o.value !== ''));
      } catch {
        // ignore
      }
    })();
  }, [token]);

  // Ambitos permitidos según rol
  const allowed = useMemo(() => ({
    institucional: ['ROLE_ADMIN','ROLE_DIRECTOR','ROLE_PRECEPTOR'].includes(rol),
    materia: ['ROLE_ADMIN','ROLE_DIRECTOR','ROLE_PRECEPTOR','ROLE_DOCENTE'].includes(rol),
    curso: ['ROLE_ADMIN','ROLE_DIRECTOR','ROLE_PRECEPTOR'].includes(rol),
    resumen: ['ROLE_ADMIN','ROLE_DIRECTOR'].includes(rol),
  }), [rol]);

  // Asegurar que el ámbito seleccionado sea válido para el rol actual
  useEffect(() => {
    if (!allowed[ambito]) {
      const order = ['institucional','materia','curso','resumen'];
      const firstAllowed = order.find(a => allowed[a]);
      if (firstAllowed) setAmbito(firstAllowed);
    }
  }, [allowed, ambito]);

  const onGenerar = async () => {
    setError(''); setData(null);
    if (!anio || anio < 2000 || anio > 2100) { setError('Año inválido'); return; }
    if (ambito === 'curso' && !cursoId) { setError('Seleccioná un curso'); return; }
    if (ambito === 'materia' && !materiaId) { setError('Seleccioná una materia'); return; }
    try {
      setLoading(true);
      let res;
      if (ambito === 'institucional') res = await institucional(token, Number(anio));
      else if (ambito === 'materia') res = await porMateria(token, Number(materiaId), Number(anio));
      else if (ambito === 'curso') res = await porCurso(token, Number(cursoId), Number(anio));
      else res = await resumenSvc(token, Number(anio));
      setData(res);
    } catch (e) {
      setError(e?.message || 'Error al generar el reporte');
    } finally { setLoading(false); }
  };

  const casos = useMemo(() => Array.isArray(data?.casosDetectados) ? data.casosDetectados : [], [data]);
  const [expanded, setExpanded] = useState(new Set());
  
  // Aplicar filtros a los casos cuando el ámbito es 'materia'
  const casosFiltrados = useMemo(() => {
    if (ambito !== 'materia') return casos;
    
    return casos.filter(c => {
      if (filtroDivision && c.division !== filtroDivision) return false;
      return true;
    });
  }, [casos, ambito, filtroDivision]);
  
  const groupedCasos = useMemo(() => {
    const map = new Map();
    const rank = (r) => (r === 'CRÍTICO' ? 3 : r === 'ALTO' ? 2 : r === 'MEDIO' ? 1 : 0);
    casosFiltrados.forEach((c) => {
      const nombre = c?.nombreCompleto || `${c?.alumnoApellido || ''}, ${c?.alumnoNombre || ''}`.trim();
      const key = c?.alumnoId ?? nombre;
      let g = map.get(key);
      if (!g) {
        g = { key, nombre, casos: [], materias: new Set(), cursos: new Set(), maxR: 0 };
        map.set(key, g);
      }
      g.casos.push(c);
      if (c?.materiaNombre) g.materias.add(c.materiaNombre);
  const cursoBasic = `${c?.anio ? c.anio + '°' : ''} ${c?.division ?? ''}`.trim();
  const cursoStr = cursoBasic || c?.cursoNombre || '';
      if (cursoStr) g.cursos.add(cursoStr);
      g.maxR = Math.max(g.maxR, rank(c?.estadoRiesgo));
    });
    const label = (n) => (n === 3 ? 'CRÍTICO' : n === 2 ? 'ALTO' : n === 1 ? 'MEDIO' : null);
    const grupos = Array.from(map.values()).map(g => ({
      ...g,
      materias: Array.from(g.materias),
      cursos: Array.from(g.cursos),
      maxRiesgoLabel: label(g.maxR)
    }));
    
    // Ordenar alfabéticamente si está activado
    if (ordenAlfabetico) {
      return grupos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    }
    
    return grupos;
  }, [casosFiltrados, ordenAlfabetico]);
  const toggleGroup = (key) => setExpanded(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  
  // Obtener opciones únicas de división para los filtros (solo cuando ambito === 'materia')
  const opcionesDivision = useMemo(() => {
    const divisiones = new Set();
    casos.forEach(c => { if (c.division) divisiones.add(c.division); });
    return Array.from(divisiones).sort();
  }, [casos]);
  
  // Obtener nombre de la materia actual (cuando ambito === 'materia')
  const materiaNombreActual = useMemo(() => {
    if (ambito !== 'materia' || casos.length === 0) return null;
    return casos[0]?.materiaNombre || materias.find(m => String(m.value) === String(materiaId))?.label || null;
  }, [ambito, casos, materias, materiaId]);
  
  // Obtener año del curso (cuando ambito === 'materia')
  const anioActual = useMemo(() => {
    if (ambito !== 'materia' || casos.length === 0) return null;
    return casos[0]?.anio || null;
  }, [ambito, casos]);
  
  // Agrupar instancias por curso/división cuando ambito === 'materia'
  const instanciasPorCurso = useMemo(() => {
    if (ambito !== 'materia' || casos.length === 0) return [];
    
    const map = new Map();
    casos.forEach(c => {
      const cursoKey = `${c.anio}°${c.division}`;
      if (!map.has(cursoKey)) {
        map.set(cursoKey, {
          curso: cursoKey,
          anio: c.anio,
          division: c.division,
          instancias: 0,
          alumnos: new Set(),
          // TODO: Backend debe agregar docenteNombre y docenteId en el DTO
          docente: c.docenteNombre || 'Sin asignar' 
        });
      }
      const grupo = map.get(cursoKey);
      grupo.instancias++;
      grupo.alumnos.add(c.alumnoId);
    });
    
    return Array.from(map.values())
      .map(g => ({ ...g, alumnosUnicos: g.alumnos.size }))
      .sort((a, b) => b.instancias - a.instancias);
  }, [ambito, casos]);
  
  // Recalcular resumen por materia desde los casos detectados (frontend)
  const resumenPorMateriaCalculado = useMemo(() => {
    const materiaMap = new Map();
    const rank = (r) => (r === 'CRÍTICO' ? 3 : r === 'ALTO' ? 2 : r === 'MEDIO' ? 1 : 0);
    
    // Recorrer todos los casos y agrupar por materia
    casos.forEach(c => {
      const matId = c?.materiaId || c?.materiaNombre || 'sin-materia';
      const matNombre = c?.materiaNombre || 'Sin nombre';
      const alumnoId = c?.alumnoId || c?.nombreCompleto || `${c?.alumnoApellido}, ${c?.alumnoNombre}`;
      
      if (!materiaMap.has(matId)) {
        materiaMap.set(matId, {
          materiaId: matId,
          materiaNombre: matNombre,
          instancias: [],
          alumnosRiesgo: new Map() // key: alumnoId, value: nivel de riesgo máximo
        });
      }
      
      const mat = materiaMap.get(matId);
      mat.instancias.push(c);
      
      // Actualizar el nivel de riesgo máximo del alumno
      const currentRank = rank(c?.estadoRiesgo);
      const existingRank = rank(mat.alumnosRiesgo.get(alumnoId));
      if (currentRank > existingRank) {
        mat.alumnosRiesgo.set(alumnoId, c?.estadoRiesgo);
      }
    });
    
    // Calcular resumen final
    return Array.from(materiaMap.values()).map(m => {
      const alumnosCriticos = Array.from(m.alumnosRiesgo.values()).filter(r => r === 'CRÍTICO').length;
      const alumnosAltos = Array.from(m.alumnosRiesgo.values()).filter(r => r === 'ALTO').length;
      const alumnosMedios = Array.from(m.alumnosRiesgo.values()).filter(r => r === 'MEDIO').length;
      
      return {
        materiaId: m.materiaId,
        materiaNombre: m.materiaNombre,
        totalAlumnos: m.alumnosRiesgo.size,
        totalInstancias: m.instancias.length,
        alumnosCriticos,
        alumnosAltos,
        alumnosMedios
      };
    }).sort((a, b) => b.totalInstancias - a.totalInstancias);
  }, [casos]);
  
  // Usar el calculado en frontend si hay casos, sino el del backend
  const resumenPorMateriaBackend = useMemo(() => Array.isArray(data?.resumenPorMateria) ? data.resumenPorMateria : [], [data]);
  const resumenPorMateria = casos.length > 0 ? resumenPorMateriaCalculado : resumenPorMateriaBackend;

  const exportCSV = () => {
    try {
      const lines = [];
      // encabezado/metadata
      lines.push(['Ciclo lectivo', anio]);
      if (ambito === 'curso') {
        const cur = cursos.find(c => String(c.value) === String(cursoId))?.label || cursoId;
        lines.push(['Ámbito', `Curso ${cur}`]);
      } else if (ambito === 'materia') {
        const mat = materias.find(m => String(m.value) === String(materiaId))?.label || materiaId;
        lines.push(['Ámbito', `Materia ${mat}`]);
      } else {
        lines.push(['Ámbito', ambito === 'institucional' ? 'Institucional' : 'Resumen ejecutivo']);
      }
      if (typeof data?.totalAlumnosEnRiesgo !== 'undefined') lines.push(['Total alumnos en riesgo', data.totalAlumnosEnRiesgo]);
      if (typeof data?.totalMateriasAfectadas !== 'undefined') lines.push(['Total materias afectadas', data.totalMateriasAfectadas]);
      if (typeof data?.totalCursosAfectados !== 'undefined') lines.push(['Total cursos afectados', data.totalCursosAfectados]);
      if (typeof data?.casosCriticos !== 'undefined') lines.push(['Casos críticos', data.casosCriticos]);
      if (typeof data?.casosAltos !== 'undefined') lines.push(['Casos altos', data.casosAltos]);
      if (typeof data?.casosMedios !== 'undefined') lines.push(['Casos medios', data.casosMedios]);

      lines.push([]);
      if (resumenPorMateria.length) {
        lines.push(['Resumen por materia']);
        lines.push(['Materia','Alumnos','Instancias','Críticos','Altos','Medios']);
        resumenPorMateria.forEach(r => lines.push([
          r.materiaNombre || '-', 
          r.totalAlumnos ?? r.totalCasos ?? '', 
          r.totalInstancias ?? r.totalCasos ?? '', 
          r.alumnosCriticos ?? r.casosCriticos ?? '', 
          r.alumnosAltos ?? r.casosAltos ?? '', 
          r.alumnosMedios ?? r.casosMedios ?? ''
        ]));
        lines.push([]);
      }

      // Detalle de casos (usar groupedCasos para exportar agrupados por alumno)
      lines.push(['Casos detectados - Por alumno']);
      lines.push(['Alumno','Materia','Curso','Exámenes consecutivos desaprobados']);
      groupedCasos.forEach(g => {
        g.casos.forEach((c, idx) => {
          const alumno = idx === 0 ? g.nombre : ''; // Solo mostrar nombre en la primera fila
          const mat = c.materiaNombre || '-';
          const curso = `${c.anio ? c.anio + '°' : ''} ${c.division ?? ''}`.trim() || c.cursoNombre || '';
          const etapa1 = c.etapaPrimeraNota;
          const num1 = c.numeroPrimeraNota;
          const nota1 = c.primeraNota;
          const etapa2 = c.etapaSegundaNota;
          const num2 = c.numeroSegundaNota;
          const nota2 = c.segundaNota;
          
          const detalleExamenes = etapa1 === etapa2 
            ? `Etapa ${etapa1}: Examen ${num1} (nota: ${nota1}) y Examen ${num2} (nota: ${nota2})`
            : `Etapa ${etapa1} - Examen ${num1} (nota: ${nota1}) | Etapa ${etapa2} - Examen ${num2} (nota: ${nota2})`;
          
          lines.push([alumno, mat, curso, detalleExamenes]);
        });
      });

      const csv = lines.map(cols => (Array.isArray(cols) ? cols : [cols]).map(v => '"'+String(v ?? '').replace(/"/g,'""')+'"').join(',')).join('\n');
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `reporte_examenes_consecutivos_${ambito}_${anio}.csv`; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error('No se pudo exportar CSV'); }
  };

  const printOnly = () => {
    if (!printRef.current) { toast.info('No hay contenido para imprimir'); return; }
    const win = window.open('', '_blank'); if (!win) return;
    const css = `
      @page { size: landscape; margin: 14mm; }
      body { font-family: Arial, sans-serif; padding: 10px; font-size: 11px; }
      h3 { margin: 0 0 10px 0; font-size: 18px; }
      .sub { color: #555; font-size: 12px; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; page-break-inside: auto; }
      th, td { border: 1px solid #333; padding: 4px 6px; font-size: 10px; }
      thead th { background: #f0f0f0; font-weight: bold; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      .card { border: 1px solid #ddd; margin-bottom: 10px; padding: 8px; page-break-inside: avoid; }
      .card-header { font-weight: bold; background: #f8f9fa; padding: 6px; margin-bottom: 6px; border-bottom: 1px solid #ddd; }
      .badge { padding: 2px 6px; font-size: 9px; border-radius: 3px; font-weight: bold; display: inline-block; }
      .badge.bg-danger { background: #dc3545; color: white; }
      .badge.bg-warning { background: #ffc107; color: black; }
      .badge.bg-info { background: #0dcaf0; color: black; }
      .badge.bg-secondary { background: #6c757d; color: white; }
      .text-muted { color: #6c757d; }
      .text-center { text-align: center; }
      .h4 { font-size: 16px; margin: 0; }
      .small { font-size: 10px; }
      .shadow-sm { box-shadow: none !important; }
      .d-none-print { display: none !important; }
    `;
    const amb = ambito === 'institucional' ? 'Institucional' : ambito === 'materia' ? `Materia: ${materiaNombreActual || materias.find(m=>String(m.value)===String(materiaId))?.label || materiaId}` : ambito === 'curso' ? `Curso: ${cursos.find(c=>String(c.value)===String(cursoId))?.label || cursoId}` : 'Resumen ejecutivo';
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Exámenes consecutivos desaprobados</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>Exámenes consecutivos desaprobados</h3>`);
    win.document.write(`<div class="sub">Año: ${anio} · Ámbito: ${amb}</div>`);
    
    // Clonar el contenido y ocultar elementos interactivos
    const clone = printRef.current.cloneNode(true);
    // Ocultar checkboxes, botones de filtro, etc
    clone.querySelectorAll('input[type="checkbox"], button, .btn, select').forEach(el => el.style.display = 'none');
    
    win.document.write(`<div>${clone.innerHTML}</div>`);
    win.document.write('</body></html>');
    win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div className="container mt-4">
      <div className="mb-1"><Breadcrumbs /></div>
      <div className="mb-2"><BackButton /></div>
      <h2 className="mb-1">Exámenes consecutivos desaprobados</h2>
      <p className="text-muted mb-3">
        Este reporte identifica alumnos en riesgo académico de no promover debido a exámenes consecutivos desaprobados{['ROLE_ADMIN', 'ROLE_DIRECTOR'].includes(rol) && ', permitiendo detectar patrones y casos que se repiten en materias específicas'}, facilitando la intervención temprana del equipo docente.
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
          <Row className="g-3 align-items-end">
            <Col md={3} sm={6} xs={12}>
              <Form.Label>Ámbito</Form.Label>
              <Form.Select value={ambito} onChange={(e)=>setAmbito(e.target.value)}>
                {allowed.institucional && <option value="institucional">Institucional</option>}
                {allowed.materia && <option value="materia">Por materia</option>}
                {allowed.curso && <option value="curso">Por curso</option>}
                {allowed.resumen && <option value="resumen">Resumen ejecutivo</option>}
              </Form.Select>
            </Col>
            <Col md={2} sm={6} xs={12}>
              <Form.Label>Año</Form.Label>
              <Form.Control type="number" value={anio} onChange={(e)=>setAnio(Number(e.target.value))} />
            </Col>
            {ambito === 'materia' && (
              <Col md={4} sm={6} xs={12}>
                <Form.Label>Materia</Form.Label>
                <Form.Select value={materiaId} onChange={(e)=>setMateriaId(e.target.value)}>
                  <option value="">Seleccione</option>
                  {materias.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </Form.Select>
              </Col>
            )}
            {ambito === 'curso' && (
              <Col md={3} sm={6} xs={12}>
                <Form.Label>Curso</Form.Label>
                <Form.Select value={cursoId} onChange={(e)=>setCursoId(e.target.value)}>
                  <option value="">Seleccione</option>
                  {cursos.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </Form.Select>
              </Col>
            )}
            <Col md="auto">
              <Button id="btn-generar-reporte" onClick={onGenerar} disabled={loading}>{loading ? <Spinner size="sm" /> : 'Generar'}</Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {!error && data && (
        <>
          <div className="d-flex justify-content-end gap-2 mb-3">
            <Button size="sm" variant="outline-secondary" onClick={exportCSV}>Exportar CSV</Button>
            <Button size="sm" variant="outline-secondary" onClick={printOnly}>Imprimir / PDF</Button>
          </div>

          <div ref={printRef}>
            {/* Banner de interpretación del riesgo */}
            <Card className="mb-3">
              <Card.Body className="py-2">
                <div className="fw-semibold mb-2">Niveles de riesgo (según promedio de ambas notas):</div>
                <div className="d-flex align-items-center gap-4 flex-wrap">
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg="danger">CRÍTICO</Badge>
                    <span className="text-muted">Promedio ≤ 4.0</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg="warning" text="dark">ALTO</Badge>
                    <span className="text-muted">Promedio ≤ 5.0</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg="info" text="dark">MEDIO</Badge>
                    <span className="text-muted">Promedio entre 5.1 y 6.9</span>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Título de la materia cuando ambito === 'materia' */}
            {ambito === 'materia' && materiaNombreActual && (
              <Card className="mb-3 border-primary">
                <Card.Body className="text-center py-3">
                  <h3 className="mb-1">{materiaNombreActual}</h3>
                  {anioActual && <div className="text-muted">Año: {anioActual}°</div>}
                </Card.Body>
              </Card>
            )}

            {/* Banner de distribución por curso/docente cuando ambito === 'materia' */}
            {ambito === 'materia' && instanciasPorCurso.length > 1 && (
              <Card className="mb-3 border-warning">
                <Card.Header className="bg-warning bg-opacity-10">
                  <strong>Distribución por curso y profesor</strong>
                  <div className="small text-muted">Analizar si hay diferencias significativas entre divisiones</div>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered hover responsive size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>Curso</th>
                        <th>Profesor a cargo</th>
                        <th className="text-center">Alumnos afectados</th>
                        <th className="text-center">Instancias detectadas</th>
                        <th className="text-center">Promedio por alumno</th>
                      </tr>
                    </thead>
                    <tbody>
                      {instanciasPorCurso.map((g, idx) => (
                        <tr key={idx} className={g.instancias > (instanciasPorCurso[0]?.instancias * 0.7) ? 'table-warning' : ''}>
                          <td><strong>{g.curso}</strong></td>
                          <td>
                            {g.docente === 'Sin asignar' ? (
                              <span className="text-muted fst-italic">{g.docente}</span>
                            ) : (
                              g.docente
                            )}
                          </td>
                          <td className="text-center">{g.alumnosUnicos}</td>
                          <td className="text-center"><Badge bg="secondary">{g.instancias}</Badge></td>
                          <td className="text-center">{(g.instancias / g.alumnosUnicos).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {instanciasPorCurso.some(g => g.docente === 'Sin asignar') && (
                    <Alert variant="info" className="mt-3 mb-0 py-2 small">
                      <strong>Nota:</strong> La información de docentes debe ser agregada por el backend. Contactar al equipo técnico.
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            )}

            {/* KPIs */}
            <Row className="g-3 mb-3">
              {typeof data.totalAlumnosEnRiesgo !== 'undefined' && (
                <Col md={3} sm={6}><Card className="text-center"><Card.Body><div className="text-muted small">Alumnos en riesgo</div><div className="h4 m-0">{data.totalAlumnosEnRiesgo}</div></Card.Body></Card></Col>
              )}
              {typeof data.totalMateriasAfectadas !== 'undefined' && ambito !== 'materia' && (
                <Col md={3} sm={6}><Card className="text-center"><Card.Body><div className="text-muted small">Materias afectadas</div><div className="h4 m-0">{data.totalMateriasAfectadas}</div></Card.Body></Card></Col>
              )}
              {typeof data.totalCursosAfectados !== 'undefined' && ambito !== 'materia' && (
                <Col md={3} sm={6}><Card className="text-center"><Card.Body><div className="text-muted small">Cursos afectados</div><div className="h4 m-0">{data.totalCursosAfectados}</div></Card.Body></Card></Col>
              )}
              {(typeof data.casosCriticos !== 'undefined' || typeof data.casosAltos !== 'undefined' || typeof data.casosMedios !== 'undefined') && (
                <Col md={3} sm={6}><Card className="text-center"><Card.Body>
                  <div className="text-muted small mb-1">Riesgo</div>
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    {typeof data.casosCriticos !== 'undefined' && <Badge bg="danger">Críticos: {data.casosCriticos}</Badge>}
                    {typeof data.casosAltos !== 'undefined' && <Badge bg="warning" text="dark">Altos: {data.casosAltos}</Badge>}
                    {typeof data.casosMedios !== 'undefined' && <Badge bg="info" text="dark">Medios: {data.casosMedios}</Badge>}
                  </div>
                </Card.Body></Card></Col>
              )}
            </Row>

            {/* Resumen por materia */}
            {resumenPorMateria.length > 0 && (
              <Card className="mb-3">
                <Card.Header><strong>Resumen por materia</strong> <span className="text-muted small">(hacé clic en la materia para ver el detalle en nueva pestaña)</span></Card.Header>
                <Card.Body className="p-0">
                  <Table striped hover responsive size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>Materia</th>
                        <th className="text-end">Alumnos</th>
                        <th className="text-end">Instancias</th>
                        <th className="text-end">Críticos</th>
                        <th className="text-end">Altos</th>
                        <th className="text-end">Medios</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenPorMateria.map((r, idx) => (
                        <tr key={idx} style={{ cursor: r.materiaId ? 'pointer' : 'default' }}>
                          <td>
                            {r.materiaId ? (
                              <Button 
                                variant="link" 
                                className="p-0 text-start text-decoration-none"
                                onClick={() => {
                                  const url = `${window.location.pathname}?ambito=materia&materiaId=${r.materiaId}&anio=${anio}&autoGenerate=true`;
                                  window.open(url, '_blank');
                                }}
                              >
                                {r.materiaNombre || '-'}
                              </Button>
                            ) : (
                              r.materiaNombre || '-'
                            )}
                          </td>
                          <td className="text-end">{r.totalAlumnos ?? r.totalCasos ?? '-'}</td>
                          <td className="text-end">{r.totalInstancias ?? r.totalCasos ?? '-'}</td>
                          <td className="text-end">{r.alumnosCriticos ?? r.casosCriticos ?? '-'}</td>
                          <td className="text-end">{r.alumnosAltos ?? r.casosAltos ?? '-'}</td>
                          <td className="text-end">{r.alumnosMedios ?? r.casosMedios ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}

            {/* Casos detectados */}
            <Card className="mb-3">
              <Card.Header className="d-flex justify-content-between align-items-center flex-wrap">
                <div>
                  <strong>Casos detectados</strong> <span className="text-muted small">({groupedCasos.length} {groupedCasos.length === 1 ? 'alumno' : 'alumnos'})</span>
                </div>
                <div className="d-flex gap-2 align-items-center mt-2 mt-md-0 flex-wrap">
                  {ambito === 'materia' && casos.length > 0 && opcionesDivision.length > 0 && (
                    <>
                      <Form.Label className="mb-0 me-1 small">División:</Form.Label>
                      <Form.Select size="sm" style={{ width: '100px' }} value={filtroDivision} onChange={(e) => setFiltroDivision(e.target.value)}>
                        <option value="">Todas</option>
                        {opcionesDivision.map(d => (<option key={d} value={d}>{d}</option>))}
                      </Form.Select>
                      {filtroDivision && (
                        <Button size="sm" variant="outline-secondary" onClick={() => setFiltroDivision('')}>
                          Limpiar
                        </Button>
                      )}
                      <span className="text-muted mx-2">|</span>
                    </>
                  )}
                  <Form.Check 
                    type="checkbox"
                    id="orden-alfabetico"
                    label="Orden alfabético"
                    checked={ordenAlfabetico}
                    onChange={(e) => setOrdenAlfabetico(e.target.checked)}
                    className="small"
                  />
                </div>
              </Card.Header>
              <Card.Body>
                {groupedCasos.length === 0 && (
                  <div className="text-center text-muted py-3">Sin resultados</div>
                )}
                {groupedCasos.map((g, gi) => (
                  <Card key={g.key ?? gi} className="mb-3 shadow-sm">
                    <Card.Header className="d-flex justify-content-between align-items-center" style={{ cursor: 'pointer' }}>
                      <div onClick={() => toggleGroup(g.key)} style={{ flex: 1 }}>
                        <strong>{g.nombre}</strong>
                        {g.maxRiesgoLabel && (
                          <Badge 
                            bg={g.maxRiesgoLabel === 'CRÍTICO' ? 'danger' : g.maxRiesgoLabel === 'ALTO' ? 'warning' : 'info'} 
                            text={g.maxRiesgoLabel === 'ALTO' || g.maxRiesgoLabel === 'MEDIO' ? 'dark' : undefined} 
                            className="ms-2"
                          >
                            {g.maxRiesgoLabel}
                          </Badge>
                        )}
                        <div className="text-muted small mt-1">
                          {g.casos.length} {g.casos.length === 1 ? 'instancia' : 'instancias'} · {g.materias.length} {g.materias.length === 1 ? 'materia' : 'materias'} · {g.cursos.length} {g.cursos.length === 1 ? 'curso' : 'cursos'}
                        </div>
                      </div>
                      <div className="d-flex gap-2 align-items-center">
                        <Button 
                          size="sm" 
                          variant="outline-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Obtener alumnoId del primer caso
                            const alumnoIdValue = g.casos[0]?.alumnoId;
                            if (alumnoIdValue) {
                              // Abrir en nueva pestaña pasando parámetros por URL
                              const url = `/reportes/notas-alumnos?alumnoId=${alumnoIdValue}&anio=${anio}&autoGenerate=true`;
                              window.open(url, '_blank');
                            }
                          }}
                          title="Ver reporte de notas del alumno"
                        >
                          <FileText size={16} className="me-1" />
                          Ver notas
                        </Button>
                        <div onClick={() => toggleGroup(g.key)}>
                          {expanded.has(g.key) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </div>
                      </div>
                    </Card.Header>
                    {expanded.has(g.key) && (
                      <Card.Body>
                        <Table striped hover responsive size="sm" className="mb-0">
                          <thead>
                            <tr>
                              <th>Materia</th>
                              <th>Curso</th>
                              <th>Exámenes consecutivos desaprobados</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.casos.map((c, ci) => {
                              const etapa1 = c.etapaPrimeraNota;
                              const num1 = c.numeroPrimeraNota;
                              const nota1 = c.primeraNota;
                              const etapa2 = c.etapaSegundaNota;
                              const num2 = c.numeroSegundaNota;
                              const nota2 = c.segundaNota;
                              
                              const detalleExamenes = etapa1 === etapa2 
                                ? `Etapa ${etapa1}: Examen ${num1} (nota: ${nota1}) y Examen ${num2} (nota: ${nota2})`
                                : `Etapa ${etapa1} - Examen ${num1} (nota: ${nota1}) | Etapa ${etapa2} - Examen ${num2} (nota: ${nota2})`;
                              
                              return (
                                <tr key={ci}>
                                  <td>{c.materiaNombre || '-'}</td>
                                  <td>{`${c.anio ? c.anio + '°' : ''} ${c.division ?? ''}`.trim() || c.cursoNombre || '-'}</td>
                                  <td className="small">{detalleExamenes}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </Card.Body>
                    )}
                  </Card>
                ))}
              </Card.Body>
            </Card>
          </div>
        </>
      )}

      {loading && (
        <div className="d-flex align-items-center"><Spinner animation="border" className="me-2" /> Cargando datos...</div>
      )}
    </div>
  );
}
