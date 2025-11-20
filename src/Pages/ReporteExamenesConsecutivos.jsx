import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Alert, Table, Badge } from 'react-bootstrap';
import { FileText, AlertTriangle, Info, PieChart, ChevronDown, ChevronUp } from 'lucide-react';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import { useAuth } from '../Context/AuthContext';
import { listarCursos } from '../Services/CursoService';
import { listarMaterias } from '../Services/MateriaService';
import { porMateria, porCurso } from '../Services/ReporteExamenesConsecutivosService';
import { listarCalifPorMateria } from '../Services/CalificacionesService';
import { toast } from 'react-toastify';
import { useCicloLectivo } from "../Context/CicloLectivoContext.jsx";

// Componente para fila simple con todas las notas inline
const FilaExpandible = ({ caso, token, ambito, onCalificacionesLoaded }) => {
  const [calificaciones, setCalificaciones] = useState([]);
  const [loadingCalif, setLoadingCalif] = useState(false);

  useEffect(() => {
    const cargarCalificaciones = async () => {
      if (!caso.alumnoId || !caso.materiaId) return;
      try {
        setLoadingCalif(true);
        const data = await listarCalifPorMateria(token, caso.alumnoId, caso.materiaId);
        const califs = data?.calificaciones || data || [];
        const normalizadas = Array.isArray(califs) ? califs.map(c => ({
          ...c,
          numeroExamen: c.numeroNota || c.numeroExamen
        })) : [];
        setCalificaciones(normalizadas);
        // Notificar al padre sobre las calificaciones cargadas
        if (onCalificacionesLoaded) {
          onCalificacionesLoaded(caso.alumnoId, caso.materiaId, normalizadas);
        }
      } catch {
        setCalificaciones([]);
      } finally {
        setLoadingCalif(false);
      }
    };
    cargarCalificaciones();
  }, [caso.alumnoId, caso.materiaId, token, onCalificacionesLoaded]);

  // Identificar notas consecutivas desaprobadas
  const identificarConsecutivas = (califs) => {
    const sorted = [...califs].sort((a, b) => {
      if (a.etapa !== b.etapa) return a.etapa - b.etapa;
      return a.numeroExamen - b.numeroExamen;
    });

    const marcadas = sorted.map(c => ({ ...c, esConsecutivo: false }));
    
    for (let i = 1; i < marcadas.length; i++) {
      const actual = marcadas[i];
      const anterior = marcadas[i-1];
      
      if (actual.nota < 6 && anterior.nota < 6) {
        const sonConsecutivas = (anterior.etapa === actual.etapa && actual.numeroExamen === anterior.numeroExamen + 1) ||
                               (anterior.etapa === 1 && actual.etapa === 2 && anterior.numeroExamen === 4 && actual.numeroExamen === 1);
        
        if (sonConsecutivas) {
          actual.esConsecutivo = true;
          anterior.esConsecutivo = true;
        }
      }
    }

    return marcadas;
  };

  const califsConMarca = useMemo(() => identificarConsecutivas(calificaciones), [calificaciones]);
  
  const califsPlanas = useMemo(() => {
    const etapas = Object.keys(califsConMarca.reduce((acc, c) => {
      if (!acc[c.etapa]) acc[c.etapa] = [];
      acc[c.etapa].push(c);
      return acc;
    }, {})).sort((a, b) => Number(a) - Number(b));
    return etapas.flatMap(etapa => califsConMarca.filter(c => c.etapa === Number(etapa)));
  }, [califsConMarca]);

  return (
    <tr>
      <td>{caso.alumnoNombre}</td>
      <td className="text-center">
        <Badge 
          bg={caso.estadoRiesgo === 'EMERGENCIA' ? 'dark' : caso.estadoRiesgo === 'CRÍTICO' ? 'danger' : caso.estadoRiesgo === 'ALTO' ? 'warning' : 'info'}
          text={caso.estadoRiesgo === 'ALTO' || caso.estadoRiesgo === 'MEDIO' ? 'dark' : 'white'}
          className="px-2 py-1"
        >
          {caso.estadoRiesgo || 'N/A'}
        </Badge>
      </td>
      {ambito === 'curso' && <td>{caso.materiaNombre || '-'}</td>}
      {ambito === 'materia' && <td className="text-center">{caso.cursoStr}</td>}
      {ambito === 'materia' && (
        <td>
          {caso.docenteNombreCompleto === 'Sin asignar' ? (
            <span className="text-muted fst-italic">{caso.docenteNombreCompleto}</span>
          ) : (
            caso.docenteNombreCompleto || '-'
          )}
        </td>
      )}
      <td>
        {caso.cantidadConsecutivas > 0 ? (
          <span className="text-danger fw-bold">
            {caso.cantidadConsecutivas} examen{caso.cantidadConsecutivas > 1 ? 'es' : ''} consecutivo{caso.cantidadConsecutivas > 1 ? 's' : ''}
          </span>
        ) : (
          <span className="text-muted">Sin consecutivos</span>
        )}
      </td>
      {loadingCalif ? (
        <td colSpan="8" className="text-center">
          <Spinner animation="border" size="sm" />
        </td>
      ) : calificaciones.length === 0 ? (
        <td colSpan="8" className="text-center">
          <span className="text-muted small">Sin calificaciones</span>
        </td>
      ) : (
        califsPlanas.map((c, idx) => {
          const esConsecutivo = c.esConsecutivo || false;
          const bgColor = esConsecutivo ? '#dc3545' : '#fff';
          const textColor = esConsecutivo ? '#fff' : '#000';
          const borderColor = esConsecutivo ? '#c82333' : '#dee2e6';
          return (
            <td
              key={`cell-${idx}`}
              className="text-center"
              style={{
                backgroundColor: bgColor,
                color: textColor,
                fontWeight: esConsecutivo ? 'bold' : 'normal',
                border: `1px solid ${borderColor}`,
                padding: '8px',
                minWidth: '45px'
              }}
              title={`Etapa ${c.etapa} - Examen ${c.numeroExamen}: ${c.nota}`}
            >
              {c.nota}
            </td>
          );
        })
      )}
      <td className="text-center">
        <Button 
          size="sm" 
          variant="outline-secondary"
          onClick={() => {
            if (caso.alumnoId) {
              const url = `/reportes/notas-alumnos?alumnoId=${caso.alumnoId}&anio=${new Date().getFullYear()}&autoGenerate=true`;
              window.open(url, '_blank');
            }
          }}
          title="Ver reporte completo de notas"
        >
          <FileText size={14} />
        </Button>
      </td>
    </tr>
  );
};

export default function ReporteExamenesConsecutivos() {
  const { user } = useAuth();
  const token = user?.token;
  const rol = user?.rol;
  const { cicloLectivo } = useCicloLectivo();

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [ambito, setAmbito] = useState('materia'); // materia | curso
  const [cursos, setCursos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [cursoId, setCursoId] = useState('');
  const [materiaId, setMateriaId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const printRef = useRef(null);
  const isInitialMount = useRef(true);
  
  const [filtroDivision, setFiltroDivision] = useState("");
  const [filtroRiesgo, setFiltroRiesgo] = useState("");
  const [excluirConTodasNotas, setExcluirConTodasNotas] = useState(false);
  const [excluirAprobados, setExcluirAprobados] = useState(false);
  const [excluirE1Aprobada, setExcluirE1Aprobada] = useState(false);
  const [excluirE2Aprobada, setExcluirE2Aprobada] = useState(false);
  const [ordenAlfabetico, setOrdenAlfabetico] = useState(false);
  const [showComparativa, setShowComparativa] = useState(false);
  const [showResumenMaterias, setShowResumenMaterias] = useState(ambito === 'curso');

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
          value: m.id,
          label: m.nombreMateria || m.descripcion || `Materia ${m.id}`,
          raw: m
        })).filter(o => o.value));
      } catch {
        // ignore
      }
    })();
  }, [token]);

  // Ambitos permitidos según rol
  const allowed = useMemo(() => ({
    materia: ['ROLE_ADMIN','ROLE_DIRECTOR','ROLE_PRECEPTOR','ROLE_DOCENTE'].includes(rol),
    curso: ['ROLE_ADMIN','ROLE_DIRECTOR','ROLE_PRECEPTOR'].includes(rol),
  }), [rol]);

  // Asegurar que el ámbito seleccionado sea válido para el rol actual
  useEffect(() => {
    if (!allowed[ambito]) {
      const order = ['materia','curso'];
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
      if (ambito === 'materia') res = await porMateria(token, Number(materiaId), Number(anio));
      else if (ambito === 'curso') res = await porCurso(token, Number(cursoId), Number(anio));
      setData(res);
    } catch (e) {
      setError(e?.message || 'Error al generar el reporte');
    } finally { setLoading(false); }
  };

  // Estado para almacenar calificaciones de todos los alumnos
  const [calificacionesPorAlumno, setCalificacionesPorAlumno] = useState({});

  const handleCalificacionesLoaded = useCallback((alumnoId, materiaId, califs) => {
    const key = `${alumnoId}-${materiaId}`;
    setCalificacionesPorAlumno(prev => ({
      ...prev,
      [key]: califs
    }));
  }, []);

  const casos = useMemo(() => Array.isArray(data?.casosDetectados) ? data.casosDetectados : [], [data]);
  
  // Preparar casos para tabla - incluir información de alumno en cada fila
  const casosParaTabla = useMemo(() => {
    const rank = (r) => (r === 'EMERGENCIA' ? 4 : r === 'CRÍTICO' ? 3 : r === 'ALTO' ? 2 : r === 'MEDIO' ? 1 : 0);
    
    // Aplicar filtros
    let filtered = casos;
    
    // Filtro por división
    if (ambito === 'materia' && filtroDivision) {
      filtered = filtered.filter(c => c.division === filtroDivision);
    }
    
    // Filtro por nivel de riesgo
    if (filtroRiesgo) {
      filtered = filtered.filter(c => c.estadoRiesgo === filtroRiesgo);
    }
    
    const mapped = filtered.map(c => {
      const nombre = c?.nombreCompleto || `${c?.alumnoApellido || ''}, ${c?.alumnoNombre || ''}`.trim();
      const curso = `${c?.anio ? c.anio + '°' : ''} ${c?.division ?? ''}`.trim() || c?.cursoNombre || '-';
      const key = `${c.alumnoId}-${c.materiaId}`;
      const califs = calificacionesPorAlumno[key] || [];
      
      // Calcular si tiene todas las notas (8 notas: 4 E1 + 4 E2)
      const notasE1 = califs.filter(cal => cal.etapa === 1).length;
      const notasE2 = califs.filter(cal => cal.etapa === 2).length;
      const tieneTodasNotas = notasE1 === 4 && notasE2 === 4;
      
      // Calcular promedio de cada etapa si tiene las 4 notas
      let promedioAprobado = false;
      let aproboE1 = false;
      let aproboE2 = false;
      let tieneE1Completa = false;
      let tieneE2Completa = false;
      
      if (notasE1 === 4) {
        tieneE1Completa = true;
        const sumE1 = califs.filter(cal => cal.etapa === 1 && typeof cal.nota === 'number').reduce((sum, cal) => sum + cal.nota, 0);
        const promE1 = sumE1 / 4;
        aproboE1 = promE1 >= 6;
      }
      
      if (notasE2 === 4) {
        tieneE2Completa = true;
        const sumE2 = califs.filter(cal => cal.etapa === 2 && typeof cal.nota === 'number').reduce((sum, cal) => sum + cal.nota, 0);
        const promE2 = sumE2 / 4;
        aproboE2 = promE2 >= 6;
      }
      
      // Si tiene todas las notas y ambas etapas aprobadas
      if (tieneTodasNotas && aproboE1 && aproboE2) {
        promedioAprobado = true;
      }
      
      // Construir descripción de exámenes
      const detalleExamenes = c.descripcionConsecutivo || (() => {
        const etapa1 = c.etapaPrimeraNota;
        const num1 = c.numeroPrimeraNota;
        const nota1 = c.primeraNota;
        const etapa2 = c.etapaSegundaNota;
        const num2 = c.numeroSegundaNota;
        const nota2 = c.segundaNota;
        
        return etapa1 === etapa2 
          ? `Etapa ${etapa1}: Examen ${num1} (nota: ${nota1}) y Examen ${num2} (nota: ${nota2})`
          : `Etapa ${etapa1} Ex.${num1} (${nota1}) | Etapa ${etapa2} Ex.${num2} (${nota2})`;
      })();
      
      return {
        ...c,
        alumnoNombre: nombre,
        cursoStr: curso,
        detalleExamenes,
        riesgoRank: rank(c?.estadoRiesgo),
        tieneTodasNotas,
        promedioAprobado,
        tieneE1Completa,
        tieneE2Completa,
        aproboE1,
        aproboE2
      };
    });
    
    // Aplicar filtros de exclusión
    let resultado = mapped;
    if (excluirConTodasNotas) {
      resultado = resultado.filter(c => !c.tieneTodasNotas);
    }
    if (excluirAprobados) {
      resultado = resultado.filter(c => !c.promedioAprobado);
    }
    if (excluirE1Aprobada) {
      // Excluir si aprobó E1 (aunque E2 esté incompleta, ya no está en riesgo en E1)
      resultado = resultado.filter(c => !c.aproboE1);
    }
    if (excluirE2Aprobada) {
      // Excluir si aprobó E2 (aunque E1 esté incompleta, ya no está en riesgo en E2)
      resultado = resultado.filter(c => !c.aproboE2);
    }
    
    // Ordenar: primero por nivel de riesgo (mayor a menor), luego alfabéticamente por alumno
    return resultado.sort((a, b) => {
      if (ordenAlfabetico) {
        return a.alumnoNombre.localeCompare(b.alumnoNombre, 'es', { sensitivity: 'base' });
      }
      if (b.riesgoRank !== a.riesgoRank) return b.riesgoRank - a.riesgoRank;
      return a.alumnoNombre.localeCompare(b.alumnoNombre, 'es', { sensitivity: 'base' });
    });
  }, [casos, ambito, filtroDivision, filtroRiesgo, excluirConTodasNotas, excluirAprobados, excluirE1Aprobada, excluirE2Aprobada, ordenAlfabetico, calificacionesPorAlumno]);
  
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
          docente: c.docenteNombreCompleto || 'Sin asignar' 
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
  
  // Detectar si hay múltiples docentes diferentes
  const tieneMultiplesDocentes = useMemo(() => {
    if (ambito !== 'materia' || instanciasPorCurso.length === 0) return false;
    const docentesUnicos = new Set(instanciasPorCurso.map(g => g.docente).filter(d => d !== 'Sin asignar'));
    return docentesUnicos.size > 1;
  }, [ambito, instanciasPorCurso]);
  
  // Recalcular resumen por materia desde los casos detectados (frontend)
  const resumenPorMateriaCalculado = useMemo(() => {
    const materiaMap = new Map();
    const rank = (r) => (r === 'EMERGENCIA' ? 4 : r === 'CRÍTICO' ? 3 : r === 'ALTO' ? 2 : r === 'MEDIO' ? 1 : 0);
    
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
      const alumnosEmergencia = Array.from(m.alumnosRiesgo.values()).filter(r => r === 'EMERGENCIA').length;
      const alumnosCriticos = Array.from(m.alumnosRiesgo.values()).filter(r => r === 'CRÍTICO').length;
      const alumnosAltos = Array.from(m.alumnosRiesgo.values()).filter(r => r === 'ALTO').length;
      const alumnosMedios = Array.from(m.alumnosRiesgo.values()).filter(r => r === 'MEDIO').length;
      
      return {
        materiaId: m.materiaId,
        materiaNombre: m.materiaNombre,
        totalAlumnos: m.alumnosRiesgo.size,
        totalInstancias: m.instancias.length,
        alumnosEmergencia,
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
      if (typeof data?.casosEmergencia !== 'undefined') lines.push(['Casos emergencia', data.casosEmergencia]);
      if (typeof data?.casosEmergencia !== 'undefined') lines.push(['Casos emergencia', data.casosEmergencia]);
      if (typeof data?.casosCriticos !== 'undefined') lines.push(['Casos críticos', data.casosCriticos]);
      if (typeof data?.casosAltos !== 'undefined') lines.push(['Casos altos', data.casosAltos]);
      if (typeof data?.casosMedios !== 'undefined') lines.push(['Casos medios', data.casosMedios]);

      lines.push([]);
      if (resumenPorMateria.length) {
        lines.push(['Resumen por materia']);
        lines.push(['Materia','Alumnos','Instancias','Emergencia','Críticos','Altos','Medios']);
        resumenPorMateria.forEach(r => lines.push([
          r.materiaNombre || '-', 
          r.totalAlumnos ?? r.totalCasos ?? '', 
          r.totalInstancias ?? r.totalCasos ?? '', 
          r.alumnosEmergencia ?? r.casosEmergencia ?? '', 
          r.alumnosCriticos ?? r.casosCriticos ?? '', 
          r.alumnosAltos ?? r.casosAltos ?? '', 
          r.alumnosMedios ?? r.casosMedios ?? ''
        ]));
        lines.push([]);
      }

      // Detalle de casos
      lines.push(['Casos detectados']);
      lines.push(['Alumno','Nivel Riesgo','Materia','Curso','Docente','Notas de exámenes','Consecutivos']);
      casosParaTabla.forEach(c => {
        // Construir string de notas para CSV
        let notasStr = '';
        if (c.detalleNotasConsecutivas && c.detalleNotasConsecutivas.length > 0) {
          notasStr = c.detalleNotasConsecutivas.map(n => 
            `E${n.etapa}Ex${n.numero}:${n.nota}${n.esConsecutivo ? '*' : ''}`
          ).join(' | ');
        } else {
          notasStr = c.detalleExamenes || '-';
        }
        
        lines.push([
          c.alumnoNombre,
          c.estadoRiesgo || '-',
          c.materiaNombre || '-',
          c.cursoStr,
          c.docenteNombreCompleto || 'Sin asignar',
          notasStr,
          c.cantidadConsecutivas || '-'
        ]);
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
      @page { size: landscape; margin: 12mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; font-size: 10px; color: #000; line-height: 1.2; }
      h3 { font-size: 16px; margin: 0 0 5px 0; font-weight: bold; }
      .header-info { font-size: 9px; color: #333; margin-bottom: 12px; padding: 8px; background: #f5f5f5; border-bottom: 2px solid #333; }
      .materia-titulo { text-align: center; font-size: 14px; font-weight: bold; margin: 15px 0 10px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 9px; }
      th { background: #e0e0e0; color: #000; font-weight: bold; padding: 4px; text-align: left; border: 1px solid #999; }
      th.text-center { text-align: center; }
      td { padding: 4px; border: 1px solid #999; }
      td.text-center { text-align: center; }
      tbody tr:nth-child(odd) { background: #fafafa; }
      tbody tr:nth-child(even) { background: #fff; }
      .badge { display: inline-block; padding: 2px 5px; font-size: 8px; border-radius: 2px; font-weight: bold; }
      .badge.bg-dark { background: #212529; color: white; }
      .badge.bg-danger { background: #dc3545; color: white; }
      .badge.bg-warning { background: #ffc107; color: #000; }
      .badge.bg-info { background: #0dcaf0; color: #000; }
      .text-danger { color: #dc3545; font-weight: bold; }
      .text-muted { color: #666; }
      .fw-bold { font-weight: bold; }
      /* Ocultar todo lo que no sea tabla */
      .card-header, .d-flex, .alert, .row, .form-check, button, input, select { display: none !important; }
      .card { border: none; padding: 0; margin: 10px 0; }
      .card-body { padding: 0; }
      .table-responsive { width: 100%; }
      /* Estilos especiales para etapas */
      [style*="backgroundColor: #e3f2fd"] { background-color: #f0f0f0 !important; }
      [style*="backgroundColor: #f3e5f5"] { background-color: #f0f0f0 !important; }
    `;
    
    const amb = ambito === 'materia' ? `Materia: ${materiaNombreActual || materias.find(m=>String(m.value)===String(materiaId))?.label || materiaId}` : `Curso: ${cursos.find(c=>String(c.value)===String(cursoId))?.label || cursoId}`;
    
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Exámenes consecutivos desaprobados</title><style>${css}</style></head><body>`);
    win.document.write(`<h3>Exámenes consecutivos desaprobados</h3>`);
    win.document.write(`<div class="header-info">Año: ${anio} · Ámbito: ${amb}</div>`);
    
    // Clonar el contenido
    const clone = printRef.current.cloneNode(true);
    
    // Remover TODO excepto el card de casos detectados
    const allCards = clone.querySelectorAll('.card');
    allCards.forEach(card => {
      const headerText = card.querySelector('.card-header')?.textContent || '';
      if (!headerText.includes('Casos detectados')) {
        card.remove();
      }
    });
    
    // Remover el header del card de casos para dejar solo la tabla
    clone.querySelectorAll('.card-header').forEach(header => header.remove());
    
    // Remover divs de filtros (d-flex con checkboxes)
    clone.querySelectorAll('.d-flex.gap-3').forEach(div => {
      if (div.querySelector('input[type="checkbox"]')) {
        div.remove();
      }
    });
    
    // Remover información descriptiva antes de la tabla
    clone.querySelectorAll('.d-flex.gap-3.mb-3').forEach(div => div.remove());
    clone.querySelectorAll('.d-flex.gap-2').forEach(div => div.remove());
    
    // Eliminar todos los elementos interactivos
    clone.querySelectorAll('input, button, .btn, select, .alert').forEach(el => el.remove());
    
    // Limpiar estilos inline conflictivos en tabla
    clone.querySelectorAll('th, td').forEach(cell => {
      // Remover solo ciertos estilos inline pero mantener texto-align
      const style = cell.getAttribute('style') || '';
      if (style.includes('backgroundColor')) {
        cell.style.backgroundColor = '#f0f0f0';
      }
      if (style.includes('color: rgb')) {
        cell.style.color = '#000';
      }
    });
    
    win.document.write(`<div>${clone.innerHTML}</div>`);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div className="container mt-4">
      <div className="mb-1"><Breadcrumbs /></div>
      <div className="mb-2"><BackButton /></div>
      <h2 className="mb-1">Exámenes consecutivos desaprobados</h2>
      <p className="text-muted mb-3">
        Este reporte identifica alumnos en riesgo académico de no promover debido a exámenes consecutivos desaprobados{['ROLE_ADMIN', 'ROLE_DIRECTOR'].includes(rol) && ', permitiendo detectar patrones y casos que se repiten en materias específicas'}, facilitando la intervención temprana del equipo docente.
      </p>

      {/* Explicación del Sistema de Clasificación */}
      <Alert variant="info" className="mb-3">
        <Alert.Heading className="h6 mb-3 d-flex align-items-center gap-2">
          <Info size={20} />
          ¿Cómo se Determina el Nivel de Riesgo?
        </Alert.Heading>
        <p className="mb-2 small">
          El sistema analiza <strong>todos los casos de exámenes consecutivos desaprobados por materia</strong> y calcula un puntaje considerando múltiples factores:
        </p>
        <Row className="mb-3">
          <Col md={6}>
            <div className="small">
              <strong>Factores Evaluados:</strong>
              <ul className="mt-1 mb-2 ps-3">
                <li><strong>Secuencia más larga:</strong> 5+ consecutivos (+50 pts), 4 consecutivos (+40 pts), 3 consecutivos (+25 pts), 2 consecutivos (+15 pts)</li>
                <li><strong>Persistencia:</strong> 3+ secuencias (+30 pts), 2 secuencias (+20 pts)</li>
                <li><strong>Gravedad notas:</strong> Promedio ≤2.5 (+20 pts), ≤3.5 (+15 pts), ≤4.5 (+10 pts), {'>'} 4.5 (+5 pts)</li>
                <li><strong>Patrón entre etapas:</strong> Dificultades en múltiples etapas (+15 pts)</li>
              </ul>
            </div>
          </Col>
          <Col md={6}>
            <div className="small">
              <strong>Clasificación Final:</strong>
              <ul className="mt-1 mb-2 ps-3">
                <li><span className="badge bg-dark text-white">EMERGENCIA</span> 80+ puntos: Falla sistemática que requiere intervención inmediata</li>
                <li><span className="badge bg-danger text-white">CRÍTICO</span> 60-79 puntos: Dificultad grave que requiere apoyo urgente</li>
                <li><span className="badge bg-warning text-dark">ALTO</span> 40-59 puntos: Problema persistente que necesita seguimiento</li>
                <li><span className="badge bg-info text-white">MEDIO</span> &lt;40 puntos: Dificultad puntual para monitorear</li>
              </ul>
            </div>
          </Col>
        </Row>
        <div className="small text-muted">
          <strong>Ejemplo:</strong> Un alumno con 2 secuencias de 2 consecutivos en diferentes etapas de Matemática obtendría: 15 (secuencia) + 20 (persistencia) + 10 (notas) + 15 (etapas) = 60 puntos → <span className="badge bg-danger text-white">CRÍTICO</span>
        </div>
      </Alert>


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
                {allowed.materia && <option value="materia">Por materia</option>}
                {allowed.curso && <option value="curso">Por curso</option>}
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


            {/* Título de la materia cuando ambito === 'materia' */}
            {ambito === 'materia' && materiaNombreActual && (
              <Card className="mb-3 border-primary">
                <Card.Body className="text-center py-3">
                  <h3 className="mb-1">{materiaNombreActual}</h3>
                  {anioActual && <div className="text-muted">Año: {anioActual}°</div>}
                </Card.Body>
              </Card>
            )}

            {/* Análisis comparativo - Solo cuando hay más de un curso */}
            {ambito === 'materia' && instanciasPorCurso.length > 1 && (
              <Card className="mb-3 border-warning">
                <Card.Header 
                  className="bg-warning bg-opacity-10 d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShowComparativa(!showComparativa)}
                >
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <PieChart size={20} />
                      <strong>Análisis Comparativo {tieneMultiplesDocentes ? 'por División y Docente' : 'por División'}</strong>
                    </div>
                    <div className="small text-muted">
                      {tieneMultiplesDocentes 
                        ? 'Identificar diferencias significativas entre cursos y docentes para la misma materia'
                        : 'Identificar diferencias significativas entre divisiones'
                      }
                    </div>
                  </div>
                  {showComparativa ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </Card.Header>
                {showComparativa && (
                  <Card.Body>
                    <Table striped bordered hover responsive size="sm" className="mb-3">
                      <thead>
                        <tr>
                          <th>Curso</th>
                          {tieneMultiplesDocentes && <th>Docente a cargo</th>}
                          <th className="text-center">Alumnos afectados</th>
                          <th className="text-center">Total casos</th>
                          <th className="text-center">Casos/Alumno</th>
                          <th className="text-center">Análisis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {instanciasPorCurso.map((g, idx) => {
                          const promedioGeneral = instanciasPorCurso.reduce((sum, item) => sum + (item.instancias / item.alumnosUnicos), 0) / instanciasPorCurso.length;
                          const promedioCurso = g.instancias / g.alumnosUnicos;
                          const desviacion = ((promedioCurso - promedioGeneral) / promedioGeneral) * 100;
                          const esAlto = promedioCurso > promedioGeneral * 1.3;
                          const esBajo = promedioCurso < promedioGeneral * 0.7;
                          
                          return (
                            <tr key={idx} className={esAlto ? 'table-danger' : esBajo ? 'table-success' : ''}>
                              <td><strong>{g.curso}</strong></td>
                              {tieneMultiplesDocentes && (
                                <td>
                                  {g.docente === 'Sin asignar' ? (
                                    <span className="text-danger fst-italic">{g.docente}</span>
                                  ) : (
                                    g.docente
                                  )}
                                </td>
                              )}
                              <td className="text-center">{g.alumnosUnicos}</td>
                              <td className="text-center"><Badge bg={esAlto ? 'danger' : 'secondary'}>{g.instancias}</Badge></td>
                              <td className="text-center"><strong>{promedioCurso.toFixed(1)}</strong></td>
                              <td className="text-center">
                                {esAlto && <Badge bg="danger">+{Math.abs(desviacion).toFixed(0)}% sobre promedio</Badge>}
                                {esBajo && <Badge bg="success">{Math.abs(desviacion).toFixed(0)}% bajo promedio</Badge>}
                                {!esAlto && !esBajo && <span className="text-muted">Normal</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="table-light">
                          <td colSpan={tieneMultiplesDocentes ? "2" : "1"}><strong>Promedio general</strong></td>
                          <td className="text-center"><strong>{(instanciasPorCurso.reduce((sum, g) => sum + g.alumnosUnicos, 0) / instanciasPorCurso.length).toFixed(1)}</strong></td>
                          <td className="text-center"><strong>{(instanciasPorCurso.reduce((sum, g) => sum + g.instancias, 0) / instanciasPorCurso.length).toFixed(1)}</strong></td>
                          <td className="text-center"><strong>{(instanciasPorCurso.reduce((sum, g) => sum + (g.instancias / g.alumnosUnicos), 0) / instanciasPorCurso.length).toFixed(1)}</strong></td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </Table>
                    
                    {/* Alerta cuando hay diferencias significativas */}
                    {instanciasPorCurso.some(g => (g.instancias / g.alumnosUnicos) > (instanciasPorCurso.reduce((sum, item) => sum + (item.instancias / item.alumnosUnicos), 0) / instanciasPorCurso.length) * 1.3) && (
                      <Alert variant="danger" className="mb-2 py-2 small d-flex align-items-start gap-2">
                        <AlertTriangle size={18} className="flex-shrink-0 mt-1" />
                        <div>
                          <strong>Diferencias significativas detectadas:</strong> Algunos cursos tienen tasas de desaprobación considerablemente más altas que el promedio. Se recomienda revisar las metodologías de evaluación y estrategias didácticas.
                        </div>
                      </Alert>
                    )}
                    
                    {instanciasPorCurso.some(g => g.docente === 'Sin asignar') && (
                      <Alert variant="warning" className="mb-0 py-2 small d-flex align-items-start gap-2">
                        <Info size={18} className="flex-shrink-0 mt-1" />
                        <div><strong>Nota:</strong> Algunos cursos no tienen docente asignado para esta materia.</div>
                      </Alert>
                    )}
                  </Card.Body>
                )}
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
              {(typeof data.casosEmergencia !== 'undefined' || typeof data.casosCriticos !== 'undefined' || typeof data.casosAltos !== 'undefined' || typeof data.casosMedios !== 'undefined') && (
                <Col md={3} sm={6}><Card className="text-center"><Card.Body>
                  <div className="text-muted small mb-1">Riesgo</div>
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    {typeof data.casosEmergencia !== 'undefined' && <Badge bg="dark">Emergencia: {data.casosEmergencia}</Badge>}
                    {typeof data.casosCriticos !== 'undefined' && <Badge bg="danger">Críticos: {data.casosCriticos}</Badge>}
                    {typeof data.casosAltos !== 'undefined' && <Badge bg="warning" text="dark">Altos: {data.casosAltos}</Badge>}
                    {typeof data.casosMedios !== 'undefined' && <Badge bg="info" text="dark">Medios: {data.casosMedios}</Badge>}
                  </div>
                </Card.Body></Card></Col>
              )}
            </Row>

            {/* Resumen por materia - Colapsable cuando es por curso */}
            {resumenPorMateria.length > 0 && ambito === 'curso' && (
              <Card className="mb-3">
                <Card.Header 
                  className="d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShowResumenMaterias(!showResumenMaterias)}
                >
                  <div>
                    <strong>Resumen por materia</strong> 
                    <span className="text-muted small ms-2">(hacé clic en la materia para ver el detalle en nueva pestaña)</span>
                  </div>
                  {showResumenMaterias ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </Card.Header>
                {showResumenMaterias && (
                  <Card.Body className="p-0">
                    <Table striped hover responsive size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th>Materia</th>
                          <th className="text-end">Alumnos</th>
                          <th className="text-end">Instancias</th>
                          <th className="text-end">Emerg.</th>
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
                            <td className="text-end">{r.alumnosEmergencia ?? r.casosEmergencia ?? '-'}</td>
                            <td className="text-end">{r.alumnosCriticos ?? r.casosCriticos ?? '-'}</td>
                            <td className="text-end">{r.alumnosAltos ?? r.casosAltos ?? '-'}</td>
                            <td className="text-end">{r.alumnosMedios ?? r.casosMedios ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                )}
              </Card>
            )}

            {/* Tabla directa de casos detectados */}
            <Card className="mb-3">
              <Card.Header className="d-flex justify-content-between align-items-center flex-wrap">
                <div>
                  <strong>Casos detectados</strong> <span className="text-muted small">({casosParaTabla.length} {casosParaTabla.length === 1 ? 'caso' : 'casos'})</span>
                  <div className="mt-1 d-flex gap-3 small text-muted">
                    <span><Badge bg="danger" className="me-1">Rojo</Badge>Consecutivo desaprobado</span>
                  </div>
                </div>
                <div className="d-flex gap-2 align-items-center mt-2 mt-md-0 flex-wrap">
                  {ambito === 'materia' && casos.length > 0 && opcionesDivision.length > 0 && (
                    <>
                      <Form.Label className="mb-0 me-1 small">División:</Form.Label>
                      <Form.Select size="sm" style={{ width: '100px' }} value={filtroDivision} onChange={(e) => setFiltroDivision(e.target.value)}>
                        <option value="">Todas</option>
                        {opcionesDivision.map(d => (<option key={d} value={d}>{d}</option>))}
                      </Form.Select>
                      <span className="text-muted mx-1">|</span>
                    </>
                  )}
                  <Form.Label className="mb-0 me-1 small">Riesgo:</Form.Label>
                  <Form.Select size="sm" style={{ width: '130px' }} value={filtroRiesgo} onChange={(e) => setFiltroRiesgo(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="EMERGENCIA">EMERGENCIA</option>
                    <option value="CRÍTICO">CRÍTICO</option>
                    <option value="ALTO">ALTO</option>
                    <option value="MEDIO">MEDIO</option>
                  </Form.Select>
                  <span className="text-muted mx-1">|</span>
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
              <Card.Body className="p-3">
                <div className="d-flex gap-3 mb-3 flex-wrap align-items-center">
                  <Form.Check 
                    type="checkbox"
                    id="excluir-todas-notas"
                    label="Excluir con todas las notas cargadas (8/8)"
                    checked={excluirConTodasNotas}
                    onChange={(e) => setExcluirConTodasNotas(e.target.checked)}
                    className="small"
                  />
                  <span className="text-muted">|</span>
                  <Form.Check 
                    type="checkbox"
                    id="excluir-e1-aprobada"
                    label="Excluir si aprobó Etapa 1 (ya no está en riesgo de E1)"
                    checked={excluirE1Aprobada}
                    onChange={(e) => setExcluirE1Aprobada(e.target.checked)}
                    className="small text-primary"
                  />
                  <Form.Check 
                    type="checkbox"
                    id="excluir-e2-aprobada"
                    label="Excluir si aprobó Etapa 2 (ya no está en riesgo de E2)"
                    checked={excluirE2Aprobada}
                    onChange={(e) => setExcluirE2Aprobada(e.target.checked)}
                    className="small text-info"
                  />
                  <span className="text-muted">|</span>
                  <Form.Check 
                    type="checkbox"
                    id="excluir-aprobados"
                    label="Excluir si aprobó materia completa (ambas E)"
                    checked={excluirAprobados}
                    onChange={(e) => setExcluirAprobados(e.target.checked)}
                    className="small text-success fw-bold"
                  />
                  {(filtroDivision || filtroRiesgo || excluirConTodasNotas || excluirE1Aprobada || excluirE2Aprobada || excluirAprobados) && (
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={() => {
                        setFiltroDivision('');
                        setFiltroRiesgo('');
                        setExcluirConTodasNotas(false);
                        setExcluirE1Aprobada(false);
                        setExcluirE2Aprobada(false);
                        setExcluirAprobados(false);
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </div>
                {casosParaTabla.length === 0 ? (
                  <div className="text-center text-muted py-4">Sin casos detectados</div>
                ) : (
                  <div className="table-responsive">
                    <Table bordered hover className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Alumno</th>
                          <th rowSpan="2" className="text-center" style={{ verticalAlign: 'middle' }}>Riesgo</th>
                          {ambito === 'curso' && <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Materia</th>}
                          {ambito === 'materia' && <th rowSpan="2" className="text-center" style={{ verticalAlign: 'middle' }}>Curso</th>}
                          {ambito === 'materia' && <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Docente</th>}
                          <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Motivo</th>
                          <th colSpan="4" className="text-center" style={{ backgroundColor: '#e3f2fd', borderBottom: '2px solid #90caf9' }}>Etapa 1</th>
                          <th colSpan="4" className="text-center" style={{ backgroundColor: '#f3e5f5', borderBottom: '2px solid #ce93d8' }}>Etapa 2</th>
                          <th rowSpan="2" className="text-center" style={{ verticalAlign: 'middle' }}>Acciones</th>
                        </tr>
                        <tr>
                          <th className="text-center" style={{ fontSize: '0.9rem', padding: '6px', backgroundColor: '#e3f2fd' }}>N1</th>
                          <th className="text-center" style={{ fontSize: '0.9rem', padding: '6px', backgroundColor: '#e3f2fd' }}>N2</th>
                          <th className="text-center" style={{ fontSize: '0.9rem', padding: '6px', backgroundColor: '#e3f2fd' }}>N3</th>
                          <th className="text-center" style={{ fontSize: '0.9rem', padding: '6px', backgroundColor: '#e3f2fd' }}>N4</th>
                          <th className="text-center" style={{ fontSize: '0.9rem', padding: '6px', backgroundColor: '#f3e5f5' }}>N1</th>
                          <th className="text-center" style={{ fontSize: '0.9rem', padding: '6px', backgroundColor: '#f3e5f5' }}>N2</th>
                          <th className="text-center" style={{ fontSize: '0.9rem', padding: '6px', backgroundColor: '#f3e5f5' }}>N3</th>
                          <th className="text-center" style={{ fontSize: '0.9rem', padding: '6px', backgroundColor: '#f3e5f5' }}>N4</th>
                        </tr>
                      </thead>
                      <tbody>
                        {casosParaTabla.map((c, idx) => (
                          <FilaExpandible key={idx} caso={c} token={token} ambito={ambito} onCalificacionesLoaded={handleCalificacionesLoaded} />
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
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
