import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Form, Button, Alert, Spinner, Badge, Nav, Modal, ListGroup, Pagination } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../Context/AuthContext';
import { actualizarMesa, obtenerMesa } from '../Services/MesaExamenService';
import { listarDocentesAsignados, asignarDocentes } from '../Services/MesaExamenDocenteService';
import { listarAulas } from '../Services/AulaService';

export default function GestionFechasMesas() {
  const { user } = useAuth();
  const token = user?.token;
  const location = useLocation();
  
  // Los datos pueden venir por location.state o por postMessage
  const [mesasIniciales, setMesasIniciales] = useState(location.state?.mesas || []);

  const [mesas, setMesas] = useState([]);
  const [docentesPorMesa, setDocentesPorMesa] = useState(new Map()); // Map<mesaId, docentes[]>
  const [aulas, setAulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [tipoMesaActiva, setTipoMesaActiva] = useState('EXAMEN'); // 'EXAMEN' o 'COLOQUIO'

  // Modal de selección de docentes
  const [showModalDocentes, setShowModalDocentes] = useState(false);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [docentesSeleccionados, setDocentesSeleccionados] = useState([]);

  // Controles de distribución
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [turnosPorDia, setTurnosPorDia] = useState(3);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [intervaloMinutos, setIntervaloMinutos] = useState(120);
  const [asignarAulasAleatorias, setAsignarAulasAleatorias] = useState(true);

  // Paginación y filtros
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina] = useState(20);
  const [busqueda, setBusqueda] = useState('');
  const [filtroMateria, setFiltroMateria] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroHora, setFiltroHora] = useState('');
  const [filtroDocente, setFiltroDocente] = useState('');

  // Escuchar mensajes de la ventana padre
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin === window.location.origin && event.data.mesas) {
        setMesasIniciales(event.data.mesas);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (mesasIniciales.length > 0) {
      cargarDatos();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesasIniciales]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Filtrar solo mesas con estado CREADA (excluir finalizadas)
      const mesasCreadas = mesasIniciales.filter(m => m.estado === 'CREADA');
      
      if (mesasCreadas.length === 0) {
        toast.warn('No hay mesas en estado CREADA para gestionar');
        setLoading(false);
        return;
      }
      
      // Cargar todas las aulas disponibles desde el backend
      // NOTA: No filtrar por cursoId/activo aquí, para mantener consistencia con MesaGestion
      const aulasData = await listarAulas(token).catch(() => []);
      const listaAulas = Array.isArray(aulasData) ? aulasData : [];
      setAulas(listaAulas);
      console.log('Aulas cargadas:', listaAulas);
      console.log('Mesas CREADAS a gestionar:', mesasCreadas.length);

      // Cargar docentes disponibles y asignados para cada mesa
      const docentesMap = new Map();
      const mesasConDocentes = await Promise.all(
        mesasCreadas.map(async (mesa) => {
          try {
            // Solo cargar docentes asignados inicialmente
            const docentesAsignados = await listarDocentesAsignados(token, mesa.id).catch(() => []);
            
            // No cargamos docentes disponibles aquí porque la mesa puede no tener horario aún
            // Se cargarán bajo demanda cuando se abra el modal
            docentesMap.set(mesa.id, []);
            
            const cursoAnio = mesa.curso && mesa.curso.anio ? mesa.curso.anio : '';
            const cursoDivision = mesa.curso && mesa.curso.division ? mesa.curso.division : '';
            return {
              ...mesa,
              fecha: mesa.fecha || '',
              hora: mesa.horaInicio || '09:00', // Usar horaInicio del backend
              horaFin: mesa.horaFin || null,
              aulaId: mesa.aulaId || null,
              docentesIds: docentesAsignados && docentesAsignados.map ? docentesAsignados.map(d => d.id) : [],
              cursoAnio: cursoAnio,
              cursoDivision: cursoDivision,
              materiaNombre: mesa.materiaNombre || 'Sin nombre',
              turnoId: mesa.turnoId
            };
          } catch {
            const cursoAnio = mesa.curso && mesa.curso.anio ? mesa.curso.anio : '';
            const cursoDivision = mesa.curso && mesa.curso.division ? mesa.curso.division : '';
            return {
              ...mesa,
              fecha: mesa.fecha || '',
              hora: mesa.horaInicio || '09:00', // Usar horaInicio del backend
              horaFin: mesa.horaFin || null,
              aulaId: mesa.aulaId || null,
              docentesIds: [],
              cursoAnio: cursoAnio,
              cursoDivision: cursoDivision,
              materiaNombre: mesa.materiaNombre || 'Sin nombre',
              turnoId: mesa.turnoId
            };
          }
        })
      );

      // Agrupar por materia
      const agrupadas = agruparPorMateria(mesasConDocentes);
      setMesas(agrupadas);
      setDocentesPorMesa(docentesMap);
    } catch (error) {
      toast.error('Error al cargar datos: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const agruparPorMateria = (mesasList) => {
    const grupos = new Map();
    mesasList.forEach(mesa => {
      const key = mesa.materiaNombre;
      if (!grupos.has(key)) {
        grupos.set(key, []);
      }
      grupos.get(key).push(mesa);
    });
    
    // Convertir a array plano ordenado por materia
    const resultado = [];
    Array.from(grupos.entries()).sort().forEach(([, mesasGrupo]) => {
      mesasGrupo.forEach(mesa => resultado.push(mesa));
    });
    return resultado;
  };

  const asignarDocentesAExamenes = async () => {
    try {
      // Agrupar mesas de examen final por materia + AÑO (todas las divisiones del mismo año van juntas)
      // Ej: Matemática 1°A, 1°B, 1°C → todos comparten docentes
      const gruposPorMateriaYAnio = new Map();
      
      mesas.forEach(mesa => {
        if (mesa.tipoMesa === 'EXAMEN' && mesa.fecha && mesa.hora) {
          // Usar AÑO para agrupar, no TURNO
          const key = `${mesa.materiaNombre}|AÑO_${mesa.cursoAnio}`;
          if (!gruposPorMateriaYAnio.has(key)) {
            gruposPorMateriaYAnio.set(key, []);
          }
          gruposPorMateriaYAnio.get(key).push(mesa);
        }
      });

      // Para cada grupo, asignar los MISMOS docentes a todas las mesas del grupo
      const docentesPorGrupo = new Map(); // key -> [docenteIds]
      
      for (const [key, mesasDelGrupo] of gruposPorMateriaYAnio.entries()) {
        // Tomar la primera mesa del grupo como referencia
        const mesaReferencia = mesasDelGrupo[0];
        
        // Si ya tiene 3 docentes, usar esos para todo el grupo
        if (mesaReferencia.docentesIds && mesaReferencia.docentesIds.length >= 3) {
          docentesPorGrupo.set(key, mesaReferencia.docentesIds);
          continue;
        }
        
        try {
          // Cargar docentes disponibles para esta mesa
          const { listarDocentesDisponibles } = await import('../Services/MesaExamenDocenteService');
          const docentesDisponibles = await listarDocentesDisponibles(token, mesaReferencia.id);
          
          if (!docentesDisponibles || docentesDisponibles.length === 0) {
            console.warn(`Grupo ${key}: No hay docentes disponibles`);
            continue;
          }

          // Obtener TODOS los titulares
          const titulares = docentesDisponibles.filter(d => d.daLaMateria);
          const idsAsignados = new Set(mesaReferencia.docentesIds || []);
          
          // Asegurar que todos los titulares estén incluidos
          titulares.forEach(t => idsAsignados.add(t.id));
          
          // Calcular cuántos docentes adicionales necesitamos (total debe ser 3)
          const docentesNecesarios = 3 - idsAsignados.size;
          
          if (docentesNecesarios > 0) {
            // Seleccionar docentes aleatorios que NO tengan conflicto de horario
            const otrosDocentes = docentesDisponibles.filter(d => 
              !d.daLaMateria && 
              !idsAsignados.has(d.id) &&
              !d.tieneConflictoHorario
            );

            // Mezclar y tomar los necesarios
            const otrosAleatorios = otrosDocentes
              .sort(() => Math.random() - 0.5)
              .slice(0, docentesNecesarios);
            
            otrosAleatorios.forEach(d => idsAsignados.add(d.id));
          }

          // Guardar estos docentes para todo el grupo
          docentesPorGrupo.set(key, Array.from(idsAsignados));
          
          console.log(`Grupo ${key}: ${mesasDelGrupo.length} mesas compartirán ${idsAsignados.size} docentes`);
        } catch (error) {
          console.error(`Error asignando docentes al grupo ${key}:`, error);
        }
      }
      
      // Actualizar todas las mesas con los docentes de su grupo
      const mesasActualizadas = mesas.map(mesa => {
        if (mesa.tipoMesa === 'EXAMEN' && mesa.fecha && mesa.hora) {
          // Usar la MISMA clave (AÑO) que se usó en la agrupación
          const key = `${mesa.materiaNombre}|AÑO_${mesa.cursoAnio}`;
          const docentesDelGrupo = docentesPorGrupo.get(key);
          
          if (docentesDelGrupo && docentesDelGrupo.length === 3) {
            return {
              ...mesa,
              docentesIds: docentesDelGrupo
            };
          }
        }
        return mesa;
      });

      setMesas(mesasActualizadas);
      
      const mesasConDocentes = mesasActualizadas.filter(m => 
        m.tipoMesa === 'EXAMEN' && m.docentesIds && m.docentesIds.length > 1
      ).length;
      
      toast.success(`Docentes asignados a ${mesasConDocentes} exámenes finales. Recuerde guardar los cambios.`);
    } catch (error) {
      toast.error('Error al asignar docentes: ' + error.message);
    }
  };

  const distribuirFechas = async () => {
    if (!fechaInicio || !fechaFin) {
      toast.warn('Debe especificar fecha de inicio y fin');
      return;
    }

    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T00:00:00');
    
    if (inicio > fin) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha de fin');
      return;
    }

    const diasDisponibles = [];
    let current = new Date(inicio);
    while (current <= fin) {
      const diaSemana = current.getDay(); // 0 = domingo, 6 = sábado
      if (diaSemana !== 0 && diaSemana !== 6) {
        // Solo agregar días de lunes a viernes
        diasDisponibles.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    if (diasDisponibles.length === 0) {
      toast.error('No hay días hábiles disponibles en el rango especificado (solo de lunes a viernes)');
      return;
    }

    // Agrupar por materia y año para exámenes finales (las Matemática 1°A, 1°B, 1°C comparten fecha/hora/docentes)
    // Para coloquios: agrupar por materia + curso (cada curso es completamente independiente)
    const gruposPorMateria = new Map();
    // Filtrar solo las mesas del tipo activo (pestaña seleccionada)
    const mesasADistribuir = mesas.filter(m => m.tipoMesa === tipoMesaActiva);
    
    if (mesasADistribuir.length === 0) {
      toast.warn(`No hay mesas de tipo ${tipoMesaActiva} para distribuir`);
      return;
    }
    
    mesasADistribuir.forEach(mesa => {
      // Para exámenes finales: agrupar por materia + año (1°, 2°, 3°, etc)
      // Todas las divisiones de Matemática 1° (1°A, 1°B, 1°C) comparten fecha, hora y docentes
      // Para coloquios: agrupar por materia + curso (cada curso es completamente independiente)
      let key;
      if (mesa.tipoMesa === 'EXAMEN') {
        // Examen final: todas las divisiones de la misma materia y año van juntas
        key = `EXAMEN|${mesa.materiaNombre}|AÑO_${mesa.cursoAnio}`;
      } else {
        // Coloquio: cada curso maneja su mesa por separado (fecha y jurado independientes)
        key = `COLOQUIO|${mesa.materiaNombre}|${mesa.cursoAnio}${mesa.cursoDivision}`;
      }
      
      if (!gruposPorMateria.has(key)) {
        gruposPorMateria.set(key, []);
      }
      gruposPorMateria.get(key).push(mesa);
    });

    // Obtener docentes de cada grupo
    const gruposConDocentes = Array.from(gruposPorMateria.entries()).map(([materia, mesasGrupo]) => {
      // Recolectar todos los docentes asignados en este grupo
      const docentesDelGrupo = new Set();
      mesasGrupo.forEach(mesa => {
        (mesa.docentesIds || []).forEach(dId => docentesDelGrupo.add(dId));
      });
      return {
        materia,
        mesas: mesasGrupo,
        docentes: Array.from(docentesDelGrupo),
        anio: mesasGrupo[0]?.cursoAnio,
        materiaNombre: mesasGrupo[0]?.materiaNombre
      };
    });
    
    // VALIDACIÓN PREVIA: Verificar que hay suficiente capacidad
    const gruposNecesarios = gruposConDocentes.length;
    const turnosTotalesDisponibles = diasDisponibles.length * turnosPorDia;
    
    if (gruposNecesarios > turnosTotalesDisponibles) {
      toast.error(
        `⚠️ No hay suficiente capacidad:\n\n` +
        `• Grupos a distribuir: ${gruposNecesarios}\n` +
        `• Días disponibles: ${diasDisponibles.length}\n` +
        `• Turnos por día: ${turnosPorDia}\n` +
        `• Capacidad total: ${turnosTotalesDisponibles} turnos\n\n` +
        `Soluciones:\n` +
        `1. Aumentar turnos por día (actualmente ${turnosPorDia})\n` +
        `2. Ampliar rango de fechas (${diasDisponibles.length} días hábiles)\n` +
        `3. Reducir intervalo entre turnos`,
        { autoClose: 10000 }
      );
      return;
    }

    // Algoritmo de distribución con verificación de conflictos
    const mesasActualizadas = [];
    const turnosPorDia_Map = new Map(); // Map<fecha, turno[]> para organizar por día
    // Ocupación de aulas por fecha+hora y por aula: Map<"fecha|hora", Map<aulaId, claveGrupo>>
    const aulasOcupadasGlobal = new Map();
    // Preferencia de aula por materia (misma materia en distintos años usa siempre la misma aula)
    const aulaPreferidaPorMateria = new Map(); // materiaNombre -> aulaId
    let indiceAulaRR = 0; // round-robin para variedad entre materias

    // Preferencia: separar días por año (misma cohorte en días distintos)
    const aniosPresentes = Array.from(new Set(gruposConDocentes.map(g => g.anio))).filter(Boolean);
    const aniosOrdenados = aniosPresentes.sort((a,b)=> Number(a)-Number(b));
    const inicioPorAnio = new Map(); // anio -> índice de día inicial sugerido
    const diasUsadosPorAnio = new Map(); // anio -> Set<fecha>
    aniosOrdenados.forEach((anio, idx) => {
      inicioPorAnio.set(anio, idx % Math.max(1, diasDisponibles.length));
      diasUsadosPorAnio.set(anio, new Set());
    });

    gruposConDocentes.forEach((grupo, idx) => {
      // Encontrar el próximo slot disponible (priorizando separar días por año)
      const anioGrupo = grupo.anio;
      let diaIndexBase = inicioPorAnio.has(anioGrupo) ? inicioPorAnio.get(anioGrupo) : 0;
      let diaIndex = diaIndexBase;
      let turnoEnDia = 0;
      let encontrado = false;
      const fechasEvitadas = diasUsadosPorAnio.get(anioGrupo) || new Set();
      
      // 1) Intentar encontrar un día NO usado aún por este año
      let recorridos = 0;
      while (recorridos < diasDisponibles.length && !encontrado) {
        const fecha = diasDisponibles[diaIndex].toISOString().split('T')[0];
        const turnosEnEsteDia = turnosPorDia_Map.get(fecha) || [];
        const diaNoUsadoPorAnio = !fechasEvitadas.has(fecha);

        // Si este día no fue usado por el año y tiene cupo, usarlo
        if (diaNoUsadoPorAnio && turnosEnEsteDia.length < turnosPorDia) {
          turnoEnDia = turnosEnEsteDia.length;
          encontrado = true;
        } else {
          // Probar el próximo día (round-robin simple)
          diaIndex = (diaIndex + 1) % diasDisponibles.length;
          recorridos++;
        }
      }
      
      // 2) Si no se encontró día distinto, permitir mismo día pero distinto turno
      if (!encontrado) {
        let i = 0;
        while (i < diasDisponibles.length && !encontrado) {
          const fecha = diasDisponibles[i].toISOString().split('T')[0];
          const turnosEnEsteDia = turnosPorDia_Map.get(fecha) || [];
          if (turnosEnEsteDia.length < turnosPorDia) {
            turnoEnDia = turnosEnEsteDia.length;
            diaIndex = i;
            encontrado = true;
            break;
          }
          i++;
        }
      }

      // Verificar que encontramos un slot
      if (!encontrado || diaIndex >= diasDisponibles.length) {
        toast.error(`Se acabaron los días disponibles después de asignar ${idx} de ${gruposConDocentes.length} grupos`);
        // Agregar las mesas sin fecha
        grupo.mesas.forEach(mesa => mesasActualizadas.push(mesa));
        return;
      }
      
      const fecha = diasDisponibles[diaIndex].toISOString().split('T')[0];
      
      // Calcular hora para este turno
      const [hh, mm] = horaInicio.split(':').map(Number);
      const horaBase = new Date();
      horaBase.setHours(hh, mm, 0, 0);
      horaBase.setMinutes(horaBase.getMinutes() + (turnoEnDia * intervaloMinutos));
      const hora = horaBase.toTimeString().substring(0, 5);
      
      // Calcular hora fin (suma 2 horas a la hora inicio)
      const horaFinBase = new Date(horaBase);
      horaFinBase.setHours(horaFinBase.getHours() + 2);
      const horaFin = horaFinBase.toTimeString().substring(0, 5);
      
      // Buscar aula disponible: debe estar libre en esta FECHA y HORA
      const claveHorario = `${fecha}|${hora}`;
      const ocupacionEnHorario = aulasOcupadasGlobal.get(claveHorario) || new Map();
      
      let aulaDisponible = null;
      if (asignarAulasAleatorias && Array.isArray(aulas) && aulas.length > 0) {
        const matNombre = grupo.materiaNombre || (grupo.mesas[0]?.materiaNombre);
        const preferidaId = matNombre ? aulaPreferidaPorMateria.get(matNombre) : null;

        // 1) Si hay preferida para esta materia y está libre, usarla
        if (preferidaId && !ocupacionEnHorario.has(Number(preferidaId))) {
          aulaDisponible = aulas.find(a => Number(a.id) === Number(preferidaId)) || null;
        }

        // 2) Si no hay preferida o está ocupada, elegir por round-robin la primera libre
        if (!aulaDisponible) {
          const start = indiceAulaRR % aulas.length;
          for (let k = 0; k < aulas.length; k++) {
            const idxAula = (start + k) % aulas.length;
            const aula = aulas[idxAula];
            if (!ocupacionEnHorario.has(Number(aula.id))) {
              aulaDisponible = aula;
              // Si no había preferida para esta materia, fijarla ahora para garantizar consistencia futura
              if (matNombre && !preferidaId) {
                aulaPreferidaPorMateria.set(matNombre, Number(aula.id));
                indiceAulaRR = (idxAula + 1) % aulas.length; // avanzar RR para variedad
              }
              break;
            }
          }
        }
      }
      
      // Registrar aula como ocupada en este horario (fecha+hora)
      if (aulaDisponible) {
        if (!aulasOcupadasGlobal.has(claveHorario)) {
          aulasOcupadasGlobal.set(claveHorario, new Map());
        }
        // Registrar que el aula está ocupada por este grupo (materia+año) en esa fecha/hora
        aulasOcupadasGlobal.get(claveHorario).set(Number(aulaDisponible.id), grupo.materia);
      }
      
      // Crear nuevo turno
      const nuevoTurno = {
        fecha,
        hora,
        docentesOcupados: new Set(grupo.docentes),
        aulasOcupadas: (aulaDisponible) ? new Set([Number(aulaDisponible.id)]) : new Set()
      };
      
      // Agregar turno al mapa de días
      if (!turnosPorDia_Map.has(fecha)) {
        turnosPorDia_Map.set(fecha, []);
      }
      turnosPorDia_Map.get(fecha).push(nuevoTurno);

      // Marcar el día como usado por este año (preferencia de separación)
      if (!fechasEvitadas.has(fecha)) {
        fechasEvitadas.add(fecha);
        diasUsadosPorAnio.set(anioGrupo, fechasEvitadas);
        // Avanzar el índice base de este anio para próximas asignaciones
        const cantAnios = Math.max(1, aniosOrdenados.length);
        inicioPorAnio.set(anioGrupo, (diaIndexBase + cantAnios) % Math.max(1, diasDisponibles.length));
      }
      
      // Asignar mesas a este nuevo turno
      grupo.mesas.forEach(mesa => {
        mesasActualizadas.push({
          ...mesa,
          fecha,
          hora,
          horaFin,
          aulaId: aulaDisponible ? Number(aulaDisponible.id) : null,
          docentesIds: mesa.docentesIds
        });
      });
      
      console.log(`Grupo ${idx} (${grupo.materia}, ${anioGrupo}°) → ${fecha} ${hora} Aula: ${aulaDisponible ? (aulaDisponible.nombre || aulaDisponible.nombreAula || aulaDisponible.id) : 'SIN AULA'} (turno ${turnoEnDia + 1}/${turnosPorDia} del día ${diaIndex + 1}/${diasDisponibles.length})`);
    });

    // Combinar mesas actualizadas con las que no fueron distribuidas (del otro tipo)
    const mesasNoDistribuidas = mesas.filter(m => m.tipoMesa !== tipoMesaActiva);
    const todasLasMesas = [...mesasActualizadas, ...mesasNoDistribuidas];
    
    setMesas(todasLasMesas);
    
    // Calcular estadísticas de distribución
    const turnosTotales = Array.from(turnosPorDia_Map.values()).reduce((sum, turnos) => sum + turnos.length, 0);
    const diasUtilizados = turnosPorDia_Map.size;
    const cantidadGrupos = gruposConDocentes.length;
    const mesasExamen = mesasActualizadas.filter(m => m.tipoMesa === 'EXAMEN').length;
    const mesasColoquio = mesasActualizadas.filter(m => m.tipoMesa === 'COLOQUIO').length;
    const mesasConAula = mesasActualizadas.filter(m => m.aulaId).length;
    
    let detalles = [`${turnosTotales} turnos en ${diasUtilizados} días`];
    if (asignarAulasAleatorias) detalles.push(`${mesasConAula} aulas asignadas`);
    detalles.push(`${cantidadGrupos} grupos (${mesasExamen} ex., ${mesasColoquio} col.)`);
    
    toast.success(`✅ Distribución: ${detalles.join(' | ')}
    
Próximos pasos:
1️⃣ Asignar docentes aleatorios
2️⃣ Guardar cambios`, { autoClose: 6000 });
  };

  const handleCambio = (mesaId, campo, valor) => {
    setMesas(prev => prev.map(m => 
      m.id === mesaId ? { ...m, [campo]: valor } : m
    ));
  };

  const abrirModalDocentes = async (mesa) => {
    setMesaSeleccionada(mesa);
    setDocentesSeleccionados(mesa.docentesIds || []);
    setShowModalDocentes(true);

    // Cargar docentes disponibles si la mesa tiene fecha y hora
    // Nota: antes no cargaba porque el mapa tenía clave con [] desde cargarDatos.
    // Ahora cargamos si la lista actual está vacía.
    const listaActual = docentesPorMesa.get(mesa.id) || [];
    if (mesa.fecha && mesa.hora && listaActual.length === 0) {
      try {
        const { listarDocentesDisponibles } = await import('../Services/MesaExamenDocenteService');
        const docentes = await listarDocentesDisponibles(token, mesa.id);
        setDocentesPorMesa(prev => new Map(prev).set(mesa.id, docentes || []));
      } catch (error) {
        console.error('Error cargando docentes disponibles:', error);
        setDocentesPorMesa(prev => new Map(prev).set(mesa.id, []));
      }
    }
  };

  const cerrarModalDocentes = () => {
    setShowModalDocentes(false);
    setMesaSeleccionada(null);
    setDocentesSeleccionados([]);
  };

  const toggleDocente = (docenteId) => {
    const maxDocentes = mesaSeleccionada?.tipoMesa === 'COLOQUIO' ? 1 : 3;
    
    if (docentesSeleccionados.includes(docenteId)) {
      setDocentesSeleccionados(prev => prev.filter(id => id !== docenteId));
    } else {
      if (docentesSeleccionados.length >= maxDocentes) {
        toast.warn(`${mesaSeleccionada?.tipoMesa === 'COLOQUIO' ? 'Coloquio solo permite 1 docente' : 'Máximo 3 docentes para examen final'}`);
        return;
      }
      setDocentesSeleccionados(prev => [...prev, docenteId]);
    }
  };

  const confirmarDocentes = () => {
    if (mesaSeleccionada) {
      handleCambio(mesaSeleccionada.id, 'docentesIds', docentesSeleccionados);
      toast.success('Docentes actualizados');
      cerrarModalDocentes();
    }
  };

  const guardarCambios = async (silencioso = false) => {
    try {
      setGuardando(true);

      const errores = [];
      const advertencias = [];
      
      // Filtrar solo mesas con estado CREADA (excluir finalizadas)
      const mesasAGuardar = mesas.filter(m => m.estado === 'CREADA');
      
      // Validación previa: verificar docentes solo cuando haya fecha/hora
      for (const mesa of mesasAGuardar) {
        // Solo validar docentes si hay fecha y hora definidas (condición para asignar jurado)
        if (mesa.fecha && mesa.fecha.trim() !== '' && mesa.hora && mesa.hora.trim() !== '') {
          if (mesa.tipoMesa === 'EXAMEN' && mesa.docentesIds.length !== 3) {
            advertencias.push(`Mesa ${mesa.id} (${mesa.materiaNombre} - ${mesa.cursoAnio}° ${mesa.cursoDivision}): Examen requiere 3 docentes, tiene ${mesa.docentesIds.length}`);
          }
          if (mesa.tipoMesa === 'COLOQUIO' && mesa.docentesIds.length !== 1) {
            advertencias.push(`Mesa ${mesa.id} (${mesa.materiaNombre} - ${mesa.cursoAnio}° ${mesa.cursoDivision}): Coloquio requiere 1 docente, tiene ${mesa.docentesIds.length}`);
          }
        }
      }
      
      // Si hay advertencias, mostrarlas y NO guardar
      if (advertencias.length > 0 && !silencioso) {
        toast.error(`⚠️ No se puede guardar por falta de docentes:\n\n${advertencias.join('\n')}\n\nUsa "Asignar docentes aleatorios" primero.`, { autoClose: 8000 });
        setGuardando(false);
        return false;
      }
      
      // Proceder a guardar (permitir guardar aula aunque no tenga fecha/hora)
      for (const mesa of mesasAGuardar) {
        try {
          // Construir payload solo con campos presentes
          const updatePayload = { id: mesa.id };
          if (mesa.fecha && mesa.fecha.trim() !== '') updatePayload.fecha = mesa.fecha;
          if (mesa.hora && mesa.hora.trim() !== '') updatePayload.horaInicio = mesa.hora;
          // Respetar horaFin si el usuario la definió; si no, calcular sólo si hay horaInicio
          if (mesa.horaFin && mesa.horaFin.trim() !== '') {
            updatePayload.horaFin = mesa.horaFin;
          } else if (updatePayload.horaInicio) {
            try {
              const [hh, mm] = updatePayload.horaInicio.split(':').map(Number);
              const fechaTmp = new Date();
              fechaTmp.setHours(hh, mm, 0, 0);
              fechaTmp.setHours(fechaTmp.getHours() + 2);
              updatePayload.horaFin = fechaTmp.toTimeString().substring(0, 5);
            } catch {
              console.warn(`Mesa ${mesa.id}: no se pudo calcular horaFin automáticamente`);
            }
          }
          if (mesa.aulaId) updatePayload.aulaId = Number(mesa.aulaId);
          // No enviar tipoMesa/estado aquí; no cambian en esta vista
          
          // Si no hay nada para actualizar, continuar
          if (Object.keys(updatePayload).length === 1) {
            console.warn(`Mesa ${mesa.id}: Sin cambios para actualizar`);
          } else {
            console.log(`Guardando mesa ${mesa.id}:`, updatePayload);
            const mesaActualizada = await actualizarMesa(token, updatePayload);
            try {
              sincronizarEstadoLocalConMesa(mesaActualizada, mesa.docentesIds);
            } catch (e) {
              console.warn('No se pudo sincronizar UI localmente:', e);
            }
          }

          // Asignar docentes solo si:
          // 1. Tiene docentes asignados
          // 2. Tiene fecha y hora definidas
          // 3. Para exámenes finales, DEBE tener exactamente 3 docentes
          // 4. Para coloquios, DEBE tener exactamente 1 docente
          if (mesa.docentesIds && mesa.docentesIds.length > 0 && mesa.fecha && mesa.hora) {
            // Para exámenes finales, validar que tenga exactamente 3 docentes
            if (mesa.tipoMesa === 'EXAMEN') {
              if (mesa.docentesIds.length !== 3) {
                console.warn(`Mesa ${mesa.id} (EXAMEN): Tiene ${mesa.docentesIds.length} docentes, se requieren 3. Se omite asignación.`);
                continue;
              }
            }
            
            // Para coloquios, validar que tenga exactamente 1 docente
            if (mesa.tipoMesa === 'COLOQUIO') {
              if (mesa.docentesIds.length !== 1) {
                console.warn(`Mesa ${mesa.id} (COLOQUIO): Tiene ${mesa.docentesIds.length} docentes, se requiere 1. Se omite asignación.`);
                continue;
              }
            }
            
            console.log(`Asignando ${mesa.docentesIds.length} docentes a mesa ${mesa.id}`);
            await asignarDocentes(token, mesa.id, mesa.docentesIds);
            // Tras asignación, refrescar la mesa base para tomar datos normalizados y propagar docentes
            try {
              const mRefrescada = await obtenerMesa(token, mesa.id);
              sincronizarEstadoLocalConMesa(mRefrescada, mesa.docentesIds);
            } catch (e) {
              console.warn('No se pudo refrescar mesa luego de asignar docentes:', e);
            }
          }
        } catch (error) {
          console.error(`Error procesando mesa ${mesa.id}:`, error);
          errores.push(`Mesa ${mesa.id}: ${error.message}`);
        }
      }

      if (errores.length > 0) {
        toast.error(`Algunos cambios no se guardaron: ${errores.join('; ')}`);
      } else if (!silencioso) {
        toast.success('✅ Todos los cambios se guardaron correctamente. Recargando...');
        
        // Notificar a la ventana padre que recargue los datos
        if (window.opener && window.opener.location.origin === window.location.origin) {
          try {
            window.opener.postMessage({ action: 'reload-mesas' }, window.location.origin);
          } catch (e) {
            console.error('Error enviando mensaje a ventana padre:', e);
          }
        }
        
        // Cerrar después de 2 segundos
        setTimeout(() => {
          window.close();
        }, 2000);
      }
      
      return errores.length === 0;
    } catch (error) {
      console.error('Error general en guardarCambios:', error);
      toast.error('Error al guardar: ' + (error.message || 'Error desconocido'));
      return false;
    } finally {
      setGuardando(false);
    }
  };

  // Guardado individual por fila
  const [filasGuardando, setFilasGuardando] = useState(new Set());

  const guardarFila = async (mesa) => {
    try {
      setFilasGuardando(prev => new Set(prev).add(mesa.id));

      const advertencias = [];
      if (mesa.fecha && mesa.fecha.trim() !== '' && mesa.hora && mesa.hora.trim() !== '') {
        if (mesa.tipoMesa === 'EXAMEN' && (mesa.docentesIds?.length || 0) !== 3) {
          advertencias.push('Examen requiere 3 docentes');
        }
        if (mesa.tipoMesa === 'COLOQUIO' && (mesa.docentesIds?.length || 0) !== 1) {
          advertencias.push('Coloquio requiere 1 docente');
        }
      }

      if (advertencias.length) {
        toast.warn(`Mesa ${mesa.id}: ${advertencias.join(' | ')}`);
      }

      const updatePayload = { id: mesa.id };
      if (mesa.fecha && mesa.fecha.trim() !== '') updatePayload.fecha = mesa.fecha;
      if (mesa.hora && mesa.hora.trim() !== '') updatePayload.horaInicio = mesa.hora;
      if (mesa.horaFin && mesa.horaFin.trim() !== '') {
        updatePayload.horaFin = mesa.horaFin;
      } else if (updatePayload.horaInicio) {
        try {
          const [hh, mm] = updatePayload.horaInicio.split(':').map(Number);
          const fechaTmp = new Date();
          fechaTmp.setHours(hh, mm, 0, 0);
          fechaTmp.setHours(fechaTmp.getHours() + 2);
          updatePayload.horaFin = fechaTmp.toTimeString().substring(0, 5);
        } catch {
          console.warn(`Mesa ${mesa.id}: no se pudo calcular horaFin automáticamente`);
        }
      }
      if (mesa.aulaId) updatePayload.aulaId = Number(mesa.aulaId);

      if (Object.keys(updatePayload).length > 1) {
        const mesaActualizada = await actualizarMesa(token, updatePayload);
        try {
          sincronizarEstadoLocalConMesa(mesaActualizada, mesa.docentesIds);
        } catch (e) {
          console.warn('No se pudo sincronizar UI localmente:', e);
        }
      }

      if (mesa.docentesIds && mesa.fecha && mesa.hora) {
        const cant = mesa.tipoMesa === 'COLOQUIO' ? 1 : 3;
        if (mesa.docentesIds.length === cant) {
          await asignarDocentes(token, mesa.id, mesa.docentesIds);
          try {
            const mRefrescada = await obtenerMesa(token, mesa.id);
            sincronizarEstadoLocalConMesa(mRefrescada, mesa.docentesIds);
          } catch (e) {
            console.warn('No se pudo refrescar mesa luego de asignar docentes:', e);
          }
        }
      }

      toast.success(`Mesa ${mesa.id} guardada`);
      // Notificar al padre para que refresque la lista (para próximas aperturas)
      if (window.opener && window.opener.location.origin === window.location.origin) {
        try {
          window.opener.postMessage({ action: 'reload-mesas' }, window.location.origin);
        } catch (e) {
          console.warn('No se pudo notificar a la ventana padre para recargar:', e);
        }
      }
    } catch (e) {
      toast.error(`Mesa ${mesa.id}: ${e.message}`);
    } finally {
      setFilasGuardando(prev => {
        const next = new Set(prev);
        next.delete(mesa.id);
        return next;
      });
    }
  };

  // Sincroniza en memoria las filas impactadas por la actualización/sincronización backend
  const formatearHora = (h) => {
    if (!h) return '';
    const s = String(h);
    return s.length >= 5 ? s.substring(0, 5) : s;
  };

  const sincronizarEstadoLocalConMesa = (mesaSrv, docentesIdsOpt) => {
    if (!mesaSrv) return;
    const fecha = mesaSrv.fecha || '';
    const hora = formatearHora(mesaSrv.horaInicio);
    const horaFin = formatearHora(mesaSrv.horaFin);
    const aulaId = mesaSrv.aulaId || null;
    const materiaNombre = mesaSrv.materiaNombre;
    const turnoId = mesaSrv.turnoId;
    const tipo = mesaSrv.tipoMesa || 'EXAMEN';
    const docentesIds = Array.isArray(docentesIdsOpt) ? docentesIdsOpt : undefined;

    setMesas(prev => prev.map(m => {
      // Si es EXAMEN, la sincronización backend afecta a todas las divisiones de misma materia+turno
      const esMismoGrupoExamen = tipo === 'EXAMEN' && m.tipoMesa === 'EXAMEN' && m.materiaNombre === materiaNombre && m.turnoId === turnoId;
      const esMismaMesa = Number(m.id) === Number(mesaSrv.id);
      if (esMismoGrupoExamen || esMismaMesa) {
        const updated = { ...m, fecha, hora, horaFin, aulaId };
        if (docentesIds) updated.docentesIds = docentesIds;
        return updated;
      }
      return m;
    }));
  };

  // Filtrar mesas por tipo, búsqueda y filtros adicionales
  const mesasFiltradas = useMemo(() => {
    let resultado = mesas.filter(m => m.tipoMesa === tipoMesaActiva);

    // Filtro de búsqueda (materia o curso)
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase();
      resultado = resultado.filter(m => 
        m.materiaNombre?.toLowerCase().includes(busquedaLower) ||
        `${m.cursoAnio}° ${m.cursoDivision}`.toLowerCase().includes(busquedaLower)
      );
    }

    // Filtro por materia
    if (filtroMateria) {
      resultado = resultado.filter(m => m.materiaNombre === filtroMateria);
    }

    // Filtro por fecha
    if (filtroFecha) {
      resultado = resultado.filter(m => m.fecha === filtroFecha);
    }

    // Filtro por hora
    if (filtroHora) {
      resultado = resultado.filter(m => m.hora === filtroHora);
    }

    // Filtro por docente
    if (filtroDocente) {
      const docentesPorMesaArray = docentesPorMesa[filtroDocente] || [];
      resultado = resultado.filter(m => 
        docentesPorMesaArray.some(d => d.mesaExamenId === m.id)
      );
    }

    return resultado;
  }, [mesas, tipoMesaActiva, busqueda, filtroMateria, filtroFecha, filtroHora, filtroDocente, docentesPorMesa]);

  // Paginación
  const totalPaginas = Math.ceil(mesasFiltradas.length / itemsPorPagina);
  const mesasPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    return mesasFiltradas.slice(inicio, fin);
  }, [mesasFiltradas, paginaActual, itemsPorPagina]);

  // Obtener listas únicas para los filtros
  const materiasUnicas = useMemo(() => 
    [...new Set(mesas.filter(m => m.tipoMesa === tipoMesaActiva).map(m => m.materiaNombre))].sort(),
    [mesas, tipoMesaActiva]
  );

  const fechasUnicas = useMemo(() => 
    [...new Set(mesas.filter(m => m.tipoMesa === tipoMesaActiva && m.fecha).map(m => m.fecha))].sort(),
    [mesas, tipoMesaActiva]
  );

  const horasUnicas = useMemo(() => 
    [...new Set(mesas.filter(m => m.tipoMesa === tipoMesaActiva && m.hora).map(m => m.hora))].sort(),
    [mesas, tipoMesaActiva]
  );

  const totalExamen = mesas.filter(m => m.tipoMesa === 'EXAMEN').length;
  const totalColoquio = mesas.filter(m => m.tipoMesa === 'COLOQUIO').length;

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="mt-3">Cargando datos...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-3">
      <Row className="mb-3">
        <Col>
          <h3>Gestión Centralizada de Fechas y Docentes</h3>
          <p className="text-muted">
            Total: {mesas.length} mesas ({totalExamen} exámenes finales, {totalColoquio} coloquios) | 
            Materias únicas: {new Set(mesas.map(m => m.materiaNombre)).size}
          </p>
        </Col>
        <Col xs="auto">
          <Button variant="outline-secondary" onClick={() => window.close()}>
            Cerrar
          </Button>
        </Col>
      </Row>

      {/* Alerta sobre filtrado de mesas CREADAS */}
      <Alert variant="warning" className="mb-3">
        <Alert.Heading as="h6">⚠️ Solo mesas en estado CREADA</Alert.Heading>
        <p className="mb-0" style={{fontSize: '.9rem'}}>
          Esta vista gestiona únicamente mesas en estado <strong>CREADA</strong>. Las mesas finalizadas no se muestran ni se pueden modificar.
        </p>
      </Alert>

      {/* Alerta informativa sobre sincronización */}
      <Alert variant="info" className="mb-3">
        <Alert.Heading as="h6">ℹ️ Sincronización automática</Alert.Heading>
        <p className="mb-1" style={{fontSize: '.9rem'}}>
          <strong>Exámenes finales:</strong> Las mesas de la misma materia y turno (ej: Inglés I de 1°A, 1°B, 1°C en FEBRERO 2026) 
          comparten automáticamente fecha, horario, aula y jurado. Al modificar una, se sincronizan todas.
        </p>
        <p className="mb-0" style={{fontSize: '.9rem'}}>
          <strong>Coloquios:</strong> Cada curso maneja su mesa de forma independiente.
        </p>
      </Alert>

      {/* Pestañas para separar tipo de mesa */}
      <Nav variant="tabs" className="mb-3">
        <Nav.Item>
          <Nav.Link 
            active={tipoMesaActiva === 'EXAMEN'}
            onClick={() => setTipoMesaActiva('EXAMEN')}
          >
            Exámenes Finales ({totalExamen})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={tipoMesaActiva === 'COLOQUIO'}
            onClick={() => setTipoMesaActiva('COLOQUIO')}
          >
            Coloquios ({totalColoquio})
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Controles de distribución */}
      <Card className="mb-3">
        <Card.Header className="fw-bold">Distribución Automática</Card.Header>
        <Card.Body>
          <Row className="g-3 mb-3">
            <Col md={2}>
              <Form.Group>
                <Form.Label>Fecha Inicio</Form.Label>
                <Form.Control 
                  type="date" 
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Fecha Fin</Form.Label>
                <Form.Control 
                  type="date" 
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Turnos por día</Form.Label>
                <Form.Control 
                  type="number" 
                  min="1"
                  value={turnosPorDia}
                  onChange={(e) => setTurnosPorDia(parseInt(e.target.value) || 1)}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Hora inicio</Form.Label>
                <Form.Control 
                  type="time" 
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Intervalo (min)</Form.Label>
                <Form.Control 
                  type="number" 
                  min="15"
                  step="15"
                  value={intervaloMinutos}
                  onChange={(e) => setIntervaloMinutos(parseInt(e.target.value) || 60)}
                />
              </Form.Group>
            </Col>
          </Row>
          <Row className="g-2">
            <Col xs="auto">
              <Button 
                variant="primary" 
                onClick={distribuirFechas}
              >
                Distribuir fechas y horarios
              </Button>
            </Col>
            {tipoMesaActiva === 'EXAMEN' && (
              <Col xs="auto">
                <Button 
                  variant="success" 
                  onClick={asignarDocentesAExamenes}
                  disabled={mesas.filter(m => m.tipoMesa === 'EXAMEN' && m.fecha && m.hora).length === 0}
                >
                  Asignar docentes aleatorios
                </Button>
              </Col>
            )}
            <Col xs="auto" className="ms-auto">
              <Form.Check 
                type="checkbox"
                id="asignarAulas"
                label="Asignar aulas aleatorias"
                checked={asignarAulasAleatorias}
                onChange={(e) => setAsignarAulasAleatorias(e.target.checked)}
              />
            </Col>
          </Row>
          <Alert variant="info" className="mt-3 mb-0" style={{fontSize: '.85rem'}}>
            <strong>¿Cómo funciona la distribución automática?</strong>
            <ul className="mb-1 mt-2">
              <li><strong>Exámenes finales (EXAMEN):</strong> Se sincronizan automáticamente por materia + turno.
                Las divisiones comparten fecha, hora, aula y jurado.</li>
              <li><strong>Coloquios (COLOQUIO):</strong> Cada curso es independiente (no se sincronizan).</li>
              <li><strong>Conflictos de docentes:</strong> Se evitan verificando que un docente NO esté asignado a otra mesa <strong>en el mismo día Y misma hora</strong>. Un docente puede tener múltiples mesas el mismo día, pero en horarios diferentes.</li>
              <li><strong>Pasos recomendados:</strong>
                <ul className="mb-0 mt-1">
                  <li><strong>1. Distribuir por materia:</strong> Asigna fechas y horarios a todas las mesas evitando conflictos.</li>
                  <li><strong>2. Asignar docentes aleatorios:</strong> Agrega 2 docentes adicionales al titular en exámenes finales (solo para mesas con horario definido).</li>
                  <li><strong>3. Ajustar manualmente:</strong> Modificá docentes específicos según necesidades.</li>
                </ul>
              </li>
            </ul>
          </Alert>
        </Card.Body>
      </Card>

      {/* Botón de guardar cambios - Posición destacada */}
      <div className="d-flex justify-content-center mb-3">
        <Button
          variant="success"
          size="lg"
          onClick={guardarCambios}
          disabled={guardando}
          className="px-5"
        >
          {guardando ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Guardando...
            </>
          ) : (
            '💾 Guardar todos los cambios'
          )}
        </Button>
      </div>

      {/* Búsqueda y Filtros */}
      <Card className="mb-3">
        <Card.Header className="fw-bold">🔍 Búsqueda y Filtros</Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Buscar por materia o curso</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ej: Matemática, 1° A..."
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setPaginaActual(1);
                  }}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Filtrar por materia</Form.Label>
                <Form.Select
                  value={filtroMateria}
                  onChange={(e) => {
                    setFiltroMateria(e.target.value);
                    setPaginaActual(1);
                  }}
                >
                  <option value="">Todas las materias</option>
                  {materiasUnicas.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Filtrar por fecha</Form.Label>
                <Form.Select
                  value={filtroFecha}
                  onChange={(e) => {
                    setFiltroFecha(e.target.value);
                    setPaginaActual(1);
                  }}
                >
                  <option value="">Todas las fechas</option>
                  {fechasUnicas.map(f => (
                    <option key={f} value={f}>{f || '(Sin fecha)'}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Filtrar por hora</Form.Label>
                <Form.Select
                  value={filtroHora}
                  onChange={(e) => {
                    setFiltroHora(e.target.value);
                    setPaginaActual(1);
                  }}
                >
                  <option value="">Todas las horas</option>
                  {horasUnicas.map(h => (
                    <option key={h} value={h}>{h || '(Sin hora)'}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Button
                variant="outline-secondary"
                className="w-100"
                onClick={() => {
                  setBusqueda('');
                  setFiltroMateria('');
                  setFiltroFecha('');
                  setFiltroHora('');
                  setFiltroDocente('');
                  setPaginaActual(1);
                }}
              >
                Limpiar filtros
              </Button>
            </Col>
          </Row>
          {(busqueda || filtroMateria || filtroFecha || filtroHora || filtroDocente) && (
            <Alert variant="info" className="mt-3 mb-0" style={{fontSize: '.9rem'}}>
              Mostrando {mesasFiltradas.length} de {mesas.filter(m => m.tipoMesa === tipoMesaActiva).length} mesas
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Tabla de mesas */}
      {mesasFiltradas.length === 0 ? (
        <Alert variant="warning">No hay {tipoMesaActiva === 'EXAMEN' ? 'exámenes finales' : 'coloquios'} para gestionar</Alert>
      ) : (
        <>
          {tipoMesaActiva === 'EXAMEN' && (
            <Alert variant="warning" className="mb-3" style={{fontSize: '.85rem'}}>
              <strong>⚠️ Recordatorio:</strong> Al modificar fecha, horario, aula o docentes de un examen final, 
              se sincronizarán automáticamente todas las divisiones de esa materia (ej: 1°A, 1°B, 1°C).
            </Alert>
          )}
          <div style={{overflowX: 'auto'}}>
            <Table bordered hover size="sm">
              <thead className="table-light">
                <tr>
                  <th style={{width: '18%'}}>Materia</th>
                  <th style={{width: '8%'}}>Curso</th>
                  <th style={{width: '12%'}}>Fecha</th>
                  <th style={{width: '8%'}}>Hora inicio</th>
                  <th style={{width: '8%'}}>Hora fin</th>
                  <th style={{width: '15%'}}>Aula</th>
                  <th style={{width: '32%'}}>Docentes</th>
                  <th style={{width: '5%'}}>Tipo</th>
                  <th style={{width: '9%'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {mesasPaginadas.map((mesa) => {
                  // Para calcular si es primera de la materia, necesitamos el índice en mesasFiltradas
                  const idxEnFiltradas = mesasFiltradas.findIndex(m => m.id === mesa.id);
                  const esPrimeraDeLaMateria = idxEnFiltradas === 0 || mesasFiltradas[idxEnFiltradas - 1].materiaNombre !== mesa.materiaNombre;
                  const maxDocentes = mesa.tipoMesa === 'COLOQUIO' ? 1 : 3;
                  const esExamenFinal = mesa.tipoMesa === 'EXAMEN';
                  const rowStyle = esExamenFinal && esPrimeraDeLaMateria ? { borderTop: '2px solid #0d6efd' } : {};
                  
                  return (
                    <tr key={mesa.id} style={rowStyle}>
                      <td className={esPrimeraDeLaMateria ? 'fw-bold' : ''}>
                        {esPrimeraDeLaMateria ? (
                          <>
                            {mesa.materiaNombre}
                            {esExamenFinal && <Badge bg="primary" className="ms-2" style={{fontSize: '.7rem'}}>SINCRONIZADO</Badge>}
                          </>
                        ) : ''}
                      </td>
                      <td>{mesa.cursoAnio}° {mesa.cursoDivision}</td>
                      <td>
                        <Form.Control 
                          type="date" 
                          size="sm"
                          value={mesa.fecha || ''} 
                          onChange={(e) => handleCambio(mesa.id, 'fecha', e.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Control 
                          type="time" 
                          size="sm"
                          value={mesa.hora || ''} 
                          onChange={(e) => handleCambio(mesa.id, 'hora', e.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Control 
                          type="time" 
                          size="sm"
                          value={mesa.horaFin || ''} 
                          onChange={(e) => handleCambio(mesa.id, 'horaFin', e.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={mesa.aulaId || ''}
                          onChange={(e) => handleCambio(mesa.id, 'aulaId', e.target.value ? parseInt(e.target.value) : null)}
                        >
                          <option value="">Sin asignar</option>
                          {aulas.map(a => (
                            <option key={a.id} value={a.id}>{a.nombre || a.nombreAula || `Aula ${a.id}`}</option>
                          ))}
                        </Form.Select>
                      </td>
                      <td>
                        <div className="d-grid">
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => abrirModalDocentes(mesa)}
                          >
                            📋 Seleccionar ({(mesa.docentesIds || []).length}/{maxDocentes})
                          </Button>
                        </div>
                        <Form.Text className="d-block mt-1 text-center" style={{fontSize: '0.75rem'}}>
                          {mesa.tipoMesa === 'COLOQUIO' ? 'Máx: 1 docente (titular)' : 'Máx: 3 (al menos 1 titular)'}
                        </Form.Text>
                      </td>
                      <td>
                        <Badge bg={mesa.tipoMesa === 'COLOQUIO' ? 'info' : 'primary'} className="w-100">
                          {mesa.tipoMesa === 'COLOQUIO' ? 'COL' : 'EXA'}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-grid">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => guardarFila(mesa)}
                            disabled={filasGuardando.has(mesa.id)}
                          >
                            {filasGuardando.has(mesa.id) ? (
                              <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Guardando...
                              </>
                            ) : (
                              'Guardar'
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="d-flex justify-content-center align-items-center mt-3 gap-3">
              <div className="text-muted" style={{fontSize: '.9rem'}}>
                Página {paginaActual} de {totalPaginas} 
                {' • '}
                Mostrando {((paginaActual - 1) * itemsPorPagina) + 1} - {Math.min(paginaActual * itemsPorPagina, mesasFiltradas.length)} de {mesasFiltradas.length}
              </div>
              <Pagination className="mb-0">
                <Pagination.First 
                  onClick={() => setPaginaActual(1)} 
                  disabled={paginaActual === 1}
                />
                <Pagination.Prev 
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))} 
                  disabled={paginaActual === 1}
                />
                
                {/* Mostrar páginas cercanas */}
                {[...Array(totalPaginas)].map((_, i) => {
                  const numPagina = i + 1;
                  // Mostrar primera, última, actual y 2 a cada lado
                  if (
                    numPagina === 1 || 
                    numPagina === totalPaginas ||
                    (numPagina >= paginaActual - 2 && numPagina <= paginaActual + 2)
                  ) {
                    return (
                      <Pagination.Item
                        key={numPagina}
                        active={numPagina === paginaActual}
                        onClick={() => setPaginaActual(numPagina)}
                      >
                        {numPagina}
                      </Pagination.Item>
                    );
                  } else if (numPagina === paginaActual - 3 || numPagina === paginaActual + 3) {
                    return <Pagination.Ellipsis key={numPagina} disabled />;
                  }
                  return null;
                })}

                <Pagination.Next 
                  onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} 
                  disabled={paginaActual === totalPaginas}
                />
                <Pagination.Last 
                  onClick={() => setPaginaActual(totalPaginas)} 
                  disabled={paginaActual === totalPaginas}
                />
              </Pagination>
            </div>
          )}

          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button 
              variant="secondary" 
              onClick={() => window.close()}
              disabled={guardando}
            >
              Cerrar
            </Button>
          </div>
        </>
      )}

      {/* Modal de Selección de Docentes */}
      <Modal show={showModalDocentes} onHide={cerrarModalDocentes} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Seleccionar Docentes - {mesaSeleccionada?.materiaNombre} ({mesaSeleccionada?.cursoAnio}° {mesaSeleccionada?.cursoDivision})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {mesaSeleccionada && (
            <>
              <Alert variant="info" className="mb-3">
                <strong>{mesaSeleccionada.tipoMesa === 'COLOQUIO' ? 'Coloquio:' : 'Examen final:'}</strong>
                {' '}Máximo {mesaSeleccionada.tipoMesa === 'COLOQUIO' ? '1 docente' : '3 docentes'}.
                {' '}{mesaSeleccionada.tipoMesa === 'COLOQUIO' ? 'Debe ser titular de la materia.' : 'Al menos uno debe ser titular de la materia.'}
              </Alert>
              
              <div className="mb-2">
                <strong>Docentes seleccionados: {docentesSeleccionados.length} / {mesaSeleccionada.tipoMesa === 'COLOQUIO' ? 1 : 3}</strong>
              </div>

              <ListGroup>
                {(docentesPorMesa.get(mesaSeleccionada.id) || []).map(docente => {
                  const estaSeleccionado = docentesSeleccionados.includes(docente.id);
                  const esDocenteMateria = docente.daLaMateria;
                  const tieneConflicto = docente.tieneConflictoHorario;
                  
                  return (
                    <ListGroup.Item 
                      key={docente.id}
                      action
                      onClick={() => toggleDocente(docente.id)}
                      active={estaSeleccionado}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div className="d-flex align-items-center">
                        <Form.Check 
                          type="checkbox"
                          checked={estaSeleccionado}
                          onChange={() => {}}
                          className="me-3"
                        />
                        <div>
                          <strong>{docente.apellido}, {docente.nombre}</strong>
                          {esDocenteMateria && (
                            <Badge bg="primary" className="ms-2">Titular</Badge>
                          )}
                          {tieneConflicto && (
                            <Badge bg="danger" className="ms-2">⚠️ Conflicto horario</Badge>
                          )}
                          {docente.nombreMateria && !esDocenteMateria && (
                            <div className="text-muted" style={{fontSize: '.85rem'}}>
                              Dicta: {docente.nombreMateria}
                            </div>
                          )}
                          {tieneConflicto && docente.detalleConflicto && (
                            <div className="text-danger" style={{fontSize: '.85rem'}}>
                              {docente.detalleConflicto}
                            </div>
                          )}
                        </div>
                      </div>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>

              {(docentesPorMesa.get(mesaSeleccionada.id) || []).length === 0 && (
                <Alert variant="warning" className="mt-3">
                  No hay docentes disponibles para esta mesa. Verifique que la mesa tenga fecha y horario asignados.
                </Alert>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrarModalDocentes}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={confirmarDocentes}>
            Confirmar Selección
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
