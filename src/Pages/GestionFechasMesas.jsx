import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Form, Button, Alert, Spinner, Badge, Nav, Modal, ListGroup, Pagination } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../Context/AuthContext';
import { actualizarMesa } from '../Services/MesaExamenService';
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
      
      // Cargar aulas de cursos (filtrar solo las que tienen curso asignado y están activas)
      const aulasData = await listarAulas(token);
      const aulasDeCursos = (aulasData || []).filter(aula => aula.activo && aula.cursoId);
      
      setAulas(aulasDeCursos);
      console.log('Aulas de cursos cargadas:', aulasDeCursos);

      // Cargar docentes disponibles y asignados para cada mesa
      const docentesMap = new Map();
      const mesasConDocentes = await Promise.all(
        mesasIniciales.map(async (mesa) => {
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
              materiaNombre: mesa.materiaNombre || 'Sin nombre'
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
              materiaNombre: mesa.materiaNombre || 'Sin nombre'
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
      // Asignar docentes adicionales a exámenes finales que ya tienen fecha/hora
      const mesasActualizadas = await Promise.all(mesas.map(async (mesa) => {
        // Solo procesar exámenes finales
        if (mesa.tipoMesa !== 'EXAMEN') {
          return mesa;
        }

        // Solo si tiene fecha y hora asignadas
        if (!mesa.fecha || !mesa.hora) {
          return mesa;
        }

        // Verificar si ya tiene 3 docentes asignados
        if (mesa.docentesIds && mesa.docentesIds.length >= 3) {
          return mesa; // Ya tiene todos los docentes
        }

        try {
          // Cargar docentes disponibles de esta mesa (backend verifica conflictos)
          const { listarDocentesDisponibles } = await import('../Services/MesaExamenDocenteService');
          const docentesDisponibles = await listarDocentesDisponibles(token, mesa.id);
          
          if (!docentesDisponibles || docentesDisponibles.length === 0) {
            return mesa;
          }

          // Obtener TODOS los titulares (pueden ser 1 o 2)
          const titulares = docentesDisponibles.filter(d => d.daLaMateria);
          const idsAsignados = new Set(mesa.docentesIds || []);
          
          // Asegurar que todos los titulares estén incluidos
          titulares.forEach(t => idsAsignados.add(t.id));
          
          // Calcular cuántos docentes adicionales necesitamos (total debe ser 3)
          const docentesNecesarios = 3 - idsAsignados.size;
          
          if (docentesNecesarios > 0) {
            // Seleccionar docentes aleatorios que NO tengan conflicto de horario
            const otrosDocentes = docentesDisponibles.filter(d => 
              !d.daLaMateria && 
              !idsAsignados.has(d.id) &&
              !d.tieneConflictoHorario // Backend ya verificó esto
            );

            // Mezclar y tomar los necesarios
            const otrosAleatorios = otrosDocentes
              .sort(() => Math.random() - 0.5)
              .slice(0, docentesNecesarios);
            
            otrosAleatorios.forEach(d => idsAsignados.add(d.id));
          }

          return {
            ...mesa,
            docentesIds: Array.from(idsAsignados)
          };
        } catch (error) {
          console.error(`Error asignando docentes a mesa ${mesa.id}:`, error);
          return mesa;
        }
      }));

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

    // Agrupar por materia y turno para exámenes finales, solo por materia+curso para coloquios
    const gruposPorMateria = new Map();
    // Filtrar solo las mesas del tipo activo (pestaña seleccionada)
    const mesasADistribuir = mesas.filter(m => m.tipoMesa === tipoMesaActiva);
    
    mesasADistribuir.forEach(mesa => {
      // Para exámenes finales: agrupar por materia + turno (se sincronizan entre divisiones)
      // Para coloquios: agrupar por materia + curso (cada curso es completamente independiente)
      let key;
      if (mesa.tipoMesa === 'EXAMEN') {
        // Examen final: todas las divisiones de la misma materia y turno van juntas
        key = `EXAMEN|${mesa.materiaNombre}|${mesa.turnoNombre || 'SIN_TURNO'}`;
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
        docentes: Array.from(docentesDelGrupo)
      };
    });

    // Algoritmo de distribución con verificación de conflictos
    const mesasActualizadas = [];
    const turnosPorDiaArray = []; // Array de turnos: [{ fecha, hora, docentesOcupados: Set, aulasOcupadas: Set }]

    gruposConDocentes.forEach(grupo => {
      let asignado = false;
      
      // Intentar asignar en los días/turnos existentes
      for (let i = 0; i < turnosPorDiaArray.length && !asignado; i++) {
        const turno = turnosPorDiaArray[i];
        
        // Verificar si hay conflicto de docentes
        const hayConflicto = grupo.docentes.some(dId => turno.docentesOcupados.has(dId));
        
        if (!hayConflicto) {
          // No hay conflicto, asignar a este turno
          // Buscar un aula disponible para este turno (solo si está habilitada la opción)
          const aulaDisponible = asignarAulasAleatorias 
            ? aulas.find(aula => !turno.aulasOcupadas.has(aula.id))
            : null;
          
          grupo.mesas.forEach(mesa => {
            mesasActualizadas.push({
              ...mesa,
              fecha: turno.fecha,
              hora: turno.hora,
              aulaId: aulaDisponible?.id || null,
              // Mantener los docentes que ya tiene asignados
              docentesIds: mesa.docentesIds
            });
          });
          
          // Agregar docentes de este grupo al turno
          grupo.docentes.forEach(dId => turno.docentesOcupados.add(dId));
          
          // Agregar aula al turno si se asignó
          if (asignarAulasAleatorias && aulaDisponible) {
            turno.aulasOcupadas.add(aulaDisponible.id);
          }
          
          asignado = true;
        }
      }
      
      // Si no se pudo asignar en turnos existentes, crear nuevo turno
      if (!asignado) {
        // Calcular día y turno
        const turnosCreados = turnosPorDiaArray.length;
        const diaParaNuevoTurno = Math.floor(turnosCreados / turnosPorDia);
        const turnoEnDia = turnosCreados % turnosPorDia;
        
        if (diaParaNuevoTurno >= diasDisponibles.length) {
          // No hay más días disponibles
          toast.warn('Se acabaron los días disponibles. Algunas mesas no tienen fecha asignada.');
          grupo.mesas.forEach(mesa => mesasActualizadas.push(mesa));
          return;
        }
        
        const fecha = diasDisponibles[diaParaNuevoTurno].toISOString().split('T')[0];
        
        // Calcular hora
        const [hh, mm] = horaInicio.split(':').map(Number);
        const horaBase = new Date();
        horaBase.setHours(hh, mm, 0, 0);
        horaBase.setMinutes(horaBase.getMinutes() + (turnoEnDia * intervaloMinutos));
        const hora = horaBase.toTimeString().substring(0, 5);
        
        // Buscar aula disponible (solo si está habilitada la opción)
        const aulasOcupadas = new Set();
        const aulaDisponible = asignarAulasAleatorias
          ? aulas.find(aula => !aulasOcupadas.has(aula.id))
          : null;
        
        // Crear nuevo turno
        const nuevoTurno = {
          fecha,
          hora,
          docentesOcupados: new Set(grupo.docentes),
          aulasOcupadas: (asignarAulasAleatorias && aulaDisponible) ? new Set([aulaDisponible.id]) : new Set()
        };
        turnosPorDiaArray.push(nuevoTurno);
        
        // Asignar mesas al nuevo turno
        grupo.mesas.forEach(mesa => {
          mesasActualizadas.push({
            ...mesa,
            fecha,
            hora,
            aulaId: aulaDisponible?.id || null,
            // Mantener los docentes que ya tiene asignados
            docentesIds: mesa.docentesIds
          });
        });
      }
    });

    // Combinar mesas actualizadas con las que no fueron distribuidas (del otro tipo)
    const mesasNoDistribuidas = mesas.filter(m => m.tipoMesa !== tipoMesaActiva);
    const todasLasMesas = [...mesasActualizadas, ...mesasNoDistribuidas];
    
    setMesas(todasLasMesas);
    
    const diasUtilizados = new Set(turnosPorDiaArray.map(t => t.fecha)).size;
    const cantidadGrupos = gruposConDocentes.length;
    const mesasExamen = mesasActualizadas.filter(m => m.tipoMesa === 'EXAMEN').length;
    const mesasColoquio = mesasActualizadas.filter(m => m.tipoMesa === 'COLOQUIO').length;
    const mesasConAula = mesasActualizadas.filter(m => m.aulaId).length;
    
    let detalles = [`${turnosPorDiaArray.length} turnos en ${diasUtilizados} días`];
    if (asignarAulasAleatorias) detalles.push(`${mesasConAula} aulas asignadas`);
    detalles.push(`${cantidadGrupos} grupos (${mesasExamen} ex., ${mesasColoquio} col.)`);
    
    toast.info(`Distribución calculada: ${detalles.join(' | ')}. Guardando en el servidor...`, { autoClose: 2000 });
    
    // Guardar automáticamente después de distribuir (modo silencioso)
    const guardadoExitoso = await guardarCambios(true);
    
    if (guardadoExitoso) {
      // Recargar datos para obtener docentes titulares asignados automáticamente por el backend
      toast.info('Recargando datos del servidor...', { autoClose: 1000 });
      
      setTimeout(async () => {
        await cargarDatos();
        toast.success(
          `✅ Fechas y horarios guardados correctamente. Los docentes titulares han sido asignados automáticamente.`,
          { autoClose: 4000 }
        );
      }, 1000);
    }
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
    if (mesa.fecha && mesa.hora && !docentesPorMesa.has(mesa.id)) {
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
      // Filtrar solo mesas que no están finalizadas
      const mesasAGuardar = mesas.filter(m => m.estado !== 'FINALIZADA');
      
      for (const mesa of mesasAGuardar) {
        try {
          // Calcular horaFin sumando 2 horas a horaInicio
          let horaInicio = null;
          let horaFin = null;
          if (mesa.hora) {
            horaInicio = mesa.hora;
            const [hh, mm] = mesa.hora.split(':').map(Number);
            const fecha = new Date();
            fecha.setHours(hh, mm, 0, 0);
            fecha.setHours(fecha.getHours() + 2); // Sumar 2 horas
            horaFin = fecha.toTimeString().substring(0, 5);
          }

          // Actualizar mesa
          await actualizarMesa(token, {
            id: mesa.id,
            fecha: mesa.fecha,
            horaInicio: horaInicio,
            horaFin: horaFin,
            aulaId: mesa.aulaId || null, // Asegurar que sea null y no undefined
            tipoMesa: mesa.tipoMesa,
            estado: mesa.estado
          });

          // Asignar docentes solo si la mesa tiene fecha y hora definidas
          if (mesa.docentesIds && mesa.docentesIds.length > 0) {
            if (mesa.fecha && mesa.hora) {
              await asignarDocentes(token, mesa.id, mesa.docentesIds);
            } else {
              console.warn(`Mesa ${mesa.id}: Docentes no guardados - Falta fecha: ${!mesa.fecha}, Falta hora: ${!mesa.hora}`);
            }
          }
        } catch (error) {
          errores.push(`Mesa ${mesa.id}: ${error.message}`);
        }
      }

      if (errores.length > 0) {
        toast.error(`Algunos cambios no se guardaron: ${errores.join(', ')}`);
      } else if (!silencioso) {
        toast.success('Todos los cambios se guardaron correctamente');
        setTimeout(() => {
          window.close();
        }, 1500);
      }
      
      return errores.length === 0;
    } catch (error) {
      toast.error('Error al guardar: ' + (error.message || 'Error desconocido'));
      return false;
    } finally {
      setGuardando(false);
    }
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
            <Col xs="auto">
              <Button 
                variant="success" 
                onClick={asignarDocentesAExamenes}
                disabled={mesas.filter(m => m.tipoMesa === 'EXAMEN' && m.fecha && m.hora).length === 0}
              >
                Asignar docentes aleatorios
              </Button>
            </Col>
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
              <li><strong>Conflictos de docentes:</strong> Se evitan detectando si un docente ya está asignado en otro horario.</li>
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
                  <th style={{width: '10%'}}>Hora</th>
                  <th style={{width: '15%'}}>Aula</th>
                  <th style={{width: '32%'}}>Docentes</th>
                  <th style={{width: '5%'}}>Tipo</th>
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
                        <Form.Select
                          size="sm"
                          value={mesa.aulaId || ''}
                          onChange={(e) => handleCambio(mesa.id, 'aulaId', e.target.value ? parseInt(e.target.value) : null)}
                        >
                          <option value="">Sin asignar</option>
                          {aulas.map(a => (
                            <option key={a.id} value={a.id}>{a.nombre}</option>
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
