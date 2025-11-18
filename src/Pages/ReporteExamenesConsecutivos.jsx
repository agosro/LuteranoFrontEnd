import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Alert, Table, Badge, Collapse } from 'react-bootstrap';
import { FileText, AlertTriangle, Info, BarChart3, PieChart, ChevronDown, ChevronUp } from 'lucide-react';
import Breadcrumbs from '../Components/Botones/Breadcrumbs';
import BackButton from '../Components/Botones/BackButton';
import { useAuth } from '../Context/AuthContext';
import { listarCursos } from '../Services/CursoService';
import { listarMaterias } from '../Services/MateriaService';
import { porMateria, porCurso } from '../Services/ReporteExamenesConsecutivosService';
import { listarCalifPorMateria } from '../Services/CalificacionesService';
import { toast } from 'react-toastify';
import { useCicloLectivo } from "../Context/CicloLectivoContext.jsx";

// Componente para renderizar mini-grilla de notas con consecutivos marcados
const GrillaNotas = ({ caso }) => {
  // Intentar usar detalleNotasConsecutivas si existe
  if (caso?.detalleNotasConsecutivas && caso.detalleNotasConsecutivas.length > 0) {
    const notas = caso.detalleNotasConsecutivas;
    const totalConsecutivos = caso.cantidadConsecutivas || 0;

    // Agrupar por etapa para mejor visualización
    const notasPorEtapa = notas.reduce((acc, nota) => {
      if (!acc[nota.etapa]) acc[nota.etapa] = [];
      acc[nota.etapa].push(nota);
      return acc;
    }, {});

    return (
      <div className="d-flex flex-column gap-2">
        {Object.entries(notasPorEtapa).map(([etapa, notasEtapa]) => (
          <div key={etapa}>
            <div className="text-muted fw-bold" style={{ fontSize: '10px', marginBottom: '4px' }}>
              Etapa {etapa}
            </div>
            <div className="d-flex flex-wrap gap-1">
              {notasEtapa.map((nota, idx) => {
                const esDesaprobado = nota.nota < 4;
                const esConsecutivo = nota.esConsecutivo || false;
                
                return (
                  <div 
                    key={idx}
                    className={`badge ${esConsecutivo ? 'bg-danger' : esDesaprobado ? 'bg-secondary' : 'bg-success'}`}
                    style={{ fontSize: '11px', minWidth: '32px', padding: '4px 6px' }}
                    title={`Etapa ${nota.etapa} - Examen ${nota.numero}: ${nota.nota}${esConsecutivo ? ' (Consecutivo)' : ''}`}
                  >
                    Ex{nota.numero}: {nota.nota}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {totalConsecutivos > 0 && (
          <div className="d-flex align-items-center gap-2 mt-1">
            <AlertTriangle size={14} className="text-danger" />
            <span className="text-danger small fw-bold">
              {totalConsecutivos} consecutivo{totalConsecutivos > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Parsear desde descripcionConsecutivo o construir desde datos disponibles
  const totalConsecutivos = caso.cantidadConsecutivas || 0;
  const notas = [];
  
  // Parsear desde descripcionConsecutivo si existe
  if (caso.descripcionConsecutivo) {
    // Formato: "Etapa 1: Examen 1 (nota: 2), Examen 2 (nota: 5), ... - X consecutivos"
    const partes = caso.descripcionConsecutivo.split(' - ')[0]; // Remover "X consecutivos"
    const etapas = partes.split(/Etapa \d+:/).filter(s => s.trim());
    
    etapas.forEach((etapaStr, etapaIdx) => {
      const etapaNum = etapaIdx + 1;
      // Buscar todos los "Examen X (nota: Y)"
      const regex = /Examen (\d+) \(nota: (\d+)\)/g;
      let match;
      while ((match = regex.exec(etapaStr)) !== null) {
        notas.push({
          etapa: etapaNum,
          numero: parseInt(match[1]),
          nota: parseInt(match[2])
        });
      }
    });
  } else {
    // Construir desde campos individuales disponibles
    if (caso.etapaPrimeraNota && caso.numeroPrimeraNota && caso.primeraNota !== undefined) {
      notas.push({
        etapa: caso.etapaPrimeraNota,
        numero: caso.numeroPrimeraNota,
        nota: caso.primeraNota
      });
    }
    if (caso.etapaSegundaNota && caso.numeroSegundaNota && caso.segundaNota !== undefined) {
      notas.push({
        etapa: caso.etapaSegundaNota,
        numero: caso.numeroSegundaNota,
        nota: caso.segundaNota
      });
    }
  }

  if (notas.length === 0) {
    return <span className="text-muted small">{caso.detalleExamenes || 'Sin detalle disponible'}</span>;
  }

  // Identificar consecutivos: notas desaprobadas (<4) en secuencia
  const notasOrdenadas = [...notas].sort((a, b) => {
    if (a.etapa !== b.etapa) return a.etapa - b.etapa;
    return a.numero - b.numero;
  });

  // Marcar consecutivos basándonos en la cantidad total
  for (let i = 0; i < notasOrdenadas.length; i++) {
    if (notasOrdenadas[i].nota < 4) {
      if (i > 0 && notasOrdenadas[i - 1].nota < 4) {
        notasOrdenadas[i].esConsecutivo = true;
        notasOrdenadas[i - 1].esConsecutivo = true;
      }
    }
  }

  // Agrupar por etapa
  const notasPorEtapa = notasOrdenadas.reduce((acc, nota) => {
    if (!acc[nota.etapa]) acc[nota.etapa] = [];
    acc[nota.etapa].push(nota);
    return acc;
  }, {});

  return (
    <div className="d-flex flex-column gap-2">
      {Object.entries(notasPorEtapa).map(([etapa, notasEtapa]) => (
        <div key={etapa}>
          <div className="text-muted fw-bold" style={{ fontSize: '10px', marginBottom: '4px' }}>
            Etapa {etapa}
          </div>
          <div className="d-flex flex-wrap gap-1">
            {notasEtapa.map((nota, idx) => {
              const esDesaprobado = nota.nota < 4;
              const esConsecutivo = nota.esConsecutivo || false;
              
              return (
                <div 
                  key={idx}
                  className={`badge ${esConsecutivo ? 'bg-danger' : esDesaprobado ? 'bg-secondary' : 'bg-success'}`}
                  style={{ fontSize: '11px', minWidth: '32px', padding: '4px 6px' }}
                  title={`Etapa ${nota.etapa} - Examen ${nota.numero}: ${nota.nota}${esConsecutivo ? ' (Consecutivo)' : ''}`}
                >
                  Ex{nota.numero}: {nota.nota}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {totalConsecutivos > 0 && (
        <div className="d-flex align-items-center gap-2 mt-1">
          <AlertTriangle size={14} className="text-danger" />
          <span className="text-danger small fw-bold">
            {totalConsecutivos} consecutivo{totalConsecutivos > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

// Componente para fila expandible con detalle completo
const FilaExpandible = ({ caso, token, ambito }) => {
  const [expanded, setExpanded] = useState(false);
  const [calificaciones, setCalificaciones] = useState([]);
  const [loadingCalif, setLoadingCalif] = useState(false);

  const cargarCalificaciones = async () => {
    if (!caso.alumnoId || !caso.materiaId) return;
    try {
      setLoadingCalif(true);
      const data = await listarCalifPorMateria(token, caso.alumnoId, caso.materiaId);
      setCalificaciones(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Error al cargar calificaciones');
      setCalificaciones([]);
    } finally {
      setLoadingCalif(false);
    }
  };

  const handleToggle = () => {
    if (!expanded && calificaciones.length === 0) {
      cargarCalificaciones();
    }
    setExpanded(!expanded);
  };

  // Identificar notas consecutivas desaprobadas
  const identificarConsecutivas = (califs) => {
    const sorted = [...califs].sort((a, b) => {
      if (a.etapa !== b.etapa) return a.etapa - b.etapa;
      return a.numeroExamen - b.numeroExamen;
    });

    const marcadas = sorted.map(c => ({ ...c, esConsecutivo: false }));
    
    for (let i = 1; i < marcadas.length; i++) {
      if (marcadas[i].nota < 4 && marcadas[i-1].nota < 4) {
        marcadas[i].esConsecutivo = true;
        marcadas[i-1].esConsecutivo = true;
      }
    }

    return marcadas;
  };

  const califsConMarca = useMemo(() => identificarConsecutivas(calificaciones), [calificaciones]);
  
  // Agrupar por etapa
  const califsPorEtapa = useMemo(() => {
    return califsConMarca.reduce((acc, c) => {
      if (!acc[c.etapa]) acc[c.etapa] = [];
      acc[c.etapa].push(c);
      return acc;
    }, {});
  }, [califsConMarca]);

  // Calcular puntaje y causa descriptiva
  const puntajeCausa = useMemo(() => {
    const puntaje = caso.puntajeRiesgo || 0;
    const consecutivos = caso.cantidadConsecutivas || 0;
    const causa = consecutivos > 0 ? `${consecutivos} examen${consecutivos > 1 ? 'es' : ''} consecutivo${consecutivos > 1 ? 's' : ''}` : 'Evaluando';
    return { puntaje, causa };
  }, [caso]);

  return (
    <>
      <tr>
        <td><strong>{caso.alumnoNombre}</strong></td>
        <td className="text-center">
          <div className="d-flex flex-column gap-1 align-items-center">
            <Badge 
              bg={caso.estadoRiesgo === 'EMERGENCIA' ? 'dark' : caso.estadoRiesgo === 'CRÍTICO' ? 'danger' : caso.estadoRiesgo === 'ALTO' ? 'warning' : 'info'}
              text={caso.estadoRiesgo === 'ALTO' || caso.estadoRiesgo === 'MEDIO' ? 'dark' : 'white'}
            >
              {caso.estadoRiesgo || 'N/A'}
            </Badge>
            <div className="small text-muted">
              Puntaje: <strong>{puntajeCausa.puntaje}</strong>
            </div>
          </div>
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
          <div className="d-flex flex-column gap-1">
            <GrillaNotas caso={caso} />
            <div className="small text-muted">
              <strong>Causa:</strong> {puntajeCausa.causa}
            </div>
          </div>
        </td>
        <td className="text-center">
          <div className="d-flex gap-1 justify-content-center">
            <Button 
              size="sm" 
              variant={expanded ? "primary" : "outline-primary"}
              onClick={handleToggle}
              title="Ver detalle completo de notas"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
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
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan="100%">
            <Collapse in={expanded}>
              <div className="p-3 bg-light">
                <h6 className="mb-3">Detalle completo de calificaciones</h6>
                {loadingCalif ? (
                  <div className="text-center py-3">
                    <Spinner animation="border" size="sm" /> Cargando calificaciones...
                  </div>
                ) : calificaciones.length === 0 ? (
                  <Alert variant="info" className="mb-0">No hay calificaciones registradas para esta materia</Alert>
                ) : (
                  <div>
                    {Object.entries(califsPorEtapa).map(([etapa, califs]) => (
                      <div key={etapa} className="mb-3">
                        <div className="fw-bold mb-2">Etapa {etapa}</div>
                        <div className="d-flex flex-wrap gap-2">
                          {califs.map((c, idx) => (
                            <div
                              key={idx}
                              className={`badge ${c.esConsecutivo ? 'bg-danger' : c.nota < 4 ? 'bg-secondary' : 'bg-success'} p-2`}
                              style={{ fontSize: '13px', minWidth: '80px' }}
                              title={c.esConsecutivo ? 'Examen consecutivo desaprobado' : ''}
                            >
                              <div>Examen {c.numeroExamen}</div>
                              <div className="fw-bold">Nota: {c.nota}</div>
                              {c.esConsecutivo && (
                                <div className="mt-1 small">
                                  <AlertTriangle size={12} /> Consecutivo
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 small text-muted">
                      <Badge bg="danger" className="me-2">Rojo</Badge> Exámenes consecutivos desaprobados | 
                      <Badge bg="secondary" className="mx-2">Gris</Badge> Desaprobado | 
                      <Badge bg="success" className="mx-2">Verde</Badge> Aprobado
                    </div>
                  </div>
                )}
              </div>
            </Collapse>
          </td>
        </tr>
      )}
    </>
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
  
  const [filtroDivision, setFiltroDivision] = useState('');
  const [ordenAlfabetico, setOrdenAlfabetico] = useState(false);
  const [showGraficos, setShowGraficos] = useState(false);
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

  const casos = useMemo(() => Array.isArray(data?.casosDetectados) ? data.casosDetectados : [], [data]);
  
  // Preparar casos para tabla - incluir información de alumno en cada fila
  const casosParaTabla = useMemo(() => {
    const rank = (r) => (r === 'EMERGENCIA' ? 4 : r === 'CRÍTICO' ? 3 : r === 'ALTO' ? 2 : r === 'MEDIO' ? 1 : 0);
    
    // Aplicar filtro de división si existe
    let filtered = casos;
    if (ambito === 'materia' && filtroDivision) {
      filtered = casos.filter(c => c.division === filtroDivision);
    }
    
    const mapped = filtered.map(c => {
      const nombre = c?.nombreCompleto || `${c?.alumnoApellido || ''}, ${c?.alumnoNombre || ''}`.trim();
      const curso = `${c?.anio ? c.anio + '°' : ''} ${c?.division ?? ''}`.trim() || c?.cursoNombre || '-';
      
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
        riesgoRank: rank(c?.estadoRiesgo)
      };
    });
    
    // Ordenar: primero por nivel de riesgo (mayor a menor), luego alfabéticamente por alumno
    return mapped.sort((a, b) => {
      if (ordenAlfabetico) {
        return a.alumnoNombre.localeCompare(b.alumnoNombre, 'es', { sensitivity: 'base' });
      }
      if (b.riesgoRank !== a.riesgoRank) return b.riesgoRank - a.riesgoRank;
      return a.alumnoNombre.localeCompare(b.alumnoNombre, 'es', { sensitivity: 'base' });
    });
  }, [casos, ambito, filtroDivision, ordenAlfabetico]);
  
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
    const amb = ambito === 'materia' ? `Materia: ${materiaNombreActual || materias.find(m=>String(m.value)===String(materiaId))?.label || materiaId}` : `Curso: ${cursos.find(c=>String(c.value)===String(cursoId))?.label || cursoId}`;
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
            {/* Sistema de Clasificación - Colapsable */}
            <Card className="mb-3">
              <Card.Header 
                className="d-flex justify-content-between align-items-center" 
                style={{ cursor: 'pointer' }}
                onClick={() => setShowGraficos(!showGraficos)}
              >
                <div className="d-flex align-items-center gap-2">
                  <BarChart3 size={20} className="text-primary" />
                  <strong>Sistema de Clasificación Inteligente por Materia</strong>
                </div>
                {showGraficos ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </Card.Header>
              {showGraficos && (
                <Card.Body className="py-3">
                  <div className="d-flex align-items-center gap-4 flex-wrap mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <Badge bg="dark" className="px-3">EMERGENCIA</Badge>
                      <span className="text-muted">80+ puntos</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <Badge bg="danger" className="px-3">CRÍTICO</Badge>
                      <span className="text-muted">60-79 puntos</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <Badge bg="warning" text="dark" className="px-3">ALTO</Badge>
                      <span className="text-muted">40-59 puntos</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <Badge bg="info" text="dark" className="px-3">MEDIO</Badge>
                      <span className="text-muted">&lt;40 puntos</span>
                    </div>
                  </div>
                  <div className="text-muted small d-flex align-items-start gap-2">
                    <Info size={16} className="mt-1 flex-shrink-0" />
                    <span>La clasificación considera múltiples factores por materia: cantidad de secuencias, persistencia temporal, gravedad de notas y patrones entre etapas.</span>
                  </div>
                </Card.Body>
              )}
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
                    <span><Badge bg="danger" className="me-1">4</Badge>Consecutivo desaprobado</span>
                    <span><Badge bg="secondary" className="me-1">4</Badge>Desaprobado</span>
                    <span><Badge bg="success" className="me-1">7</Badge>Aprobado</span>
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
              <Card.Body className="p-0">
                {casosParaTabla.length === 0 ? (
                  <div className="text-center text-muted py-4">Sin casos detectados</div>
                ) : (
                  <div className="table-responsive">
                    <Table striped hover className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: '20%' }}>Alumno</th>
                          <th style={{ width: '12%' }} className="text-center">Riesgo</th>
                          {ambito === 'curso' && <th style={{ width: '15%' }}>Materia</th>}
                          {ambito === 'materia' && <th style={{ width: '10%' }} className="text-center">Curso</th>}
                          {ambito === 'materia' && <th style={{ width: '15%' }}>Docente</th>}
                          <th>Detalle de exámenes desaprobados</th>
                          <th style={{ width: '10%' }} className="text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {casosParaTabla.map((c, idx) => (
                          <FilaExpandible key={idx} caso={c} token={token} ambito={ambito} />
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
