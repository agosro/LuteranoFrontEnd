import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Form, Button, Alert, Spinner, Badge, Nav, Modal, ListGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../Context/AuthContext';
import { actualizarMesa } from '../Services/MesaExamenService';
import { listarDocentesAsignados, listarDocentesDisponibles, asignarDocentes } from '../Services/MesaExamenDocenteService';
import { listarEspaciosAulicos } from '../Services/EspacioAulicoService';

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
  const [asignarDocentesAleatorios, setAsignarDocentesAleatorios] = useState(true);

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
  }, [mesasIniciales]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar docentes y aulas
      const aulasData = await listarEspaciosAulicos(token);
      
      setAulas(aulasData || []);
      console.log('Aulas cargadas:', aulasData);

      // Cargar docentes disponibles y asignados para cada mesa
      const docentesMap = new Map();
      const mesasConDocentes = await Promise.all(
        mesasIniciales.map(async (mesa) => {
          try {
            const [docentesAsignados, docentesDisponibles] = await Promise.all([
              listarDocentesAsignados(token, mesa.id),
              listarDocentesDisponibles(token, mesa.id)
            ]);
            
            docentesMap.set(mesa.id, docentesDisponibles || []);
            
            const cursoAnio = mesa.curso && mesa.curso.anio ? mesa.curso.anio : '';
            const cursoDivision = mesa.curso && mesa.curso.division ? mesa.curso.division : '';
            return {
              ...mesa,
              fecha: mesa.fecha || '',
              hora: mesa.hora || '09:00',
              aulaId: mesa.aulaId || null,
              docentesIds: docentesAsignados && docentesAsignados.map ? docentesAsignados.map(d => d.id) : [],
              cursoAnio: cursoAnio,
              cursoDivision: cursoDivision,
              materiaNombre: mesa.materiaNombre || 'Sin nombre'
            };
          } catch (error) {
            const cursoAnio = mesa.curso && mesa.curso.anio ? mesa.curso.anio : '';
            const cursoDivision = mesa.curso && mesa.curso.division ? mesa.curso.division : '';
            return {
              ...mesa,
              fecha: mesa.fecha || '',
              hora: mesa.hora || '09:00',
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
    Array.from(grupos.entries()).sort().forEach(([materia, mesasGrupo]) => {
      mesasGrupo.forEach(mesa => resultado.push(mesa));
    });
    return resultado;
  };

  const asignarDocentesAleatoriamente = (mesas, docentesDisponibles) => {
    // Para exámenes finales: siempre incluir el titular + 2 aleatorios
    // El titular se encuentra en el grupo de docentes disponibles
    
    if (!Array.isArray(docentesDisponibles) || docentesDisponibles.length === 0) {
      return [];
    }

    // Seleccionar el titular (primer docente, que es el de la materia)
    const titular = docentesDisponibles[0];
    
    // Si solo hay un docente (el titular), devolverlo solo
    if (docentesDisponibles.length === 1) {
      return [titular];
    }

    // Seleccionar 2 docentes aleatorios adicionales (excluyendo el titular)
    const doctoresAleatorios = docentesDisponibles.slice(1);
    const docSeleccionados = [titular];

    for (let i = 0; i < Math.min(2, doctoresAleatorios.length); i++) {
      const indiceAleatorio = Math.floor(Math.random() * doctoresAleatorios.length);
      docSeleccionados.push(doctoresAleatorios[indiceAleatorio]);
      doctoresAleatorios.splice(indiceAleatorio, 1);
    }

    return docSeleccionados;
  };

  const distribuirFechas = () => {
    if (!fechaInicio || !fechaFin) {
      toast.warn('Debe especificar fecha de inicio y fin');
      return;
    }

    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T00:00:00');
    
    if (inicio > fin) {
      toast.error('La fecha de inicio debe ser anterior a la fecha de fin');
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
    mesas.forEach(mesa => {
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
            // Asignar docentes aleatorios si es EXAMEN y la opción está habilitada
            const docentesAsignados = asignarDocentesAleatorios && mesa.tipoMesa === 'EXAMEN'
              ? asignarDocentesAleatoriamente(grupo.mesas, grupo.docentes)
              : mesa.docentesIds;
            
            mesasActualizadas.push({
              ...mesa,
              fecha: turno.fecha,
              hora: turno.hora,
              aulaId: aulaDisponible?.id || null,
              docentesIds: docentesAsignados
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
          // Asignar docentes aleatorios si es EXAMEN y la opción está habilitada
          const docentesAsignados = asignarDocentesAleatorios && mesa.tipoMesa === 'EXAMEN'
            ? asignarDocentesAleatoriamente(grupo.mesas, grupo.docentes)
            : mesa.docentesIds;
          
          mesasActualizadas.push({
            ...mesa,
            fecha,
            hora,
            aulaId: aulaDisponible?.id || null,
            docentesIds: docentesAsignados
          });
        });
      }
    });

    setMesas(mesasActualizadas);
    const diasUtilizados = new Set(turnosPorDiaArray.map(t => t.fecha)).size;
    const cantidadGrupos = gruposConDocentes.length;
    const mesasExamen = mesasActualizadas.filter(m => m.tipoMesa === 'EXAMEN').length;
    const mesasColoquio = mesasActualizadas.filter(m => m.tipoMesa === 'COLOQUIO').length;
    const mesasConAula = mesasActualizadas.filter(m => m.aulaId).length;
    
    let detalles = [`${turnosPorDiaArray.length} turnos en ${diasUtilizados} días`];
    if (asignarAulasAleatorias) detalles.push(`${mesasConAula} aulas asignadas`);
    detalles.push(`${cantidadGrupos} grupos (${mesasExamen} ex., ${mesasColoquio} col.)`);
    
    toast.success(
      `Distribución completa: ${detalles.join(' | ')}`,
      { autoClose: 5000 }
    );
  };

  const aplicarMismaFecha = () => {
    if (!fechaInicio || !horaInicio) {
      toast.warn('Debe especificar fecha y hora');
      return;
    }

    setMesas(prev => prev.map(m => ({
      ...m,
      fecha: fechaInicio,
      hora: horaInicio
    })));
    toast.success('Fecha y hora aplicada a todas las mesas');
  };

  const distribuirHoras = () => {
    if (!horaInicio) {
      toast.warn('Debe especificar hora de inicio');
      return;
    }

    const grupos = new Map();
    mesas.forEach(mesa => {
      const key = mesa.fecha + '|' + mesa.materiaNombre;
      if (!grupos.has(key)) {
        grupos.set(key, []);
      }
      grupos.get(key).push(mesa);
    });

    const mesasActualizadas = [];
    Array.from(grupos.entries()).forEach(([key, grupoMesas]) => {
      const [fecha] = key.split('|');
      if (!fecha) {
        grupoMesas.forEach(m => mesasActualizadas.push(m));
        return;
      }

      // Misma hora para todas las mesas del mismo grupo (misma fecha y materia)
      const [hh, mm] = horaInicio.split(':').map(Number);
      const horaBase = new Date();
      horaBase.setHours(hh, mm, 0, 0);

      grupoMesas.forEach(mesa => {
        const horaFormato = horaBase.toTimeString().substring(0, 5);
        mesasActualizadas.push({
          ...mesa,
          hora: horaFormato
        });
      });
    });

    setMesas(mesasActualizadas);
    toast.success('Horas distribuidas');
  };

  const handleCambio = (mesaId, campo, valor) => {
    setMesas(prev => prev.map(m => 
      m.id === mesaId ? { ...m, [campo]: valor } : m
    ));
  };

  const abrirModalDocentes = (mesa) => {
    setMesaSeleccionada(mesa);
    setDocentesSeleccionados(mesa.docentesIds || []);
    setShowModalDocentes(true);
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

  const guardarCambios = async () => {
    try {
      setGuardando(true);

      const errores = [];
      for (const mesa of mesas) {
        try {
          // Actualizar mesa
          await actualizarMesa(token, {
            id: mesa.id,
            fecha: mesa.fecha,
            hora: mesa.hora,
            aulaId: mesa.aulaId,
            tipoMesa: mesa.tipoMesa,
            estado: mesa.estado
          });

          // Asignar docentes
          if (mesa.docentesIds && mesa.docentesIds.length > 0) {
            await asignarDocentes(token, mesa.id, mesa.docentesIds);
          }
        } catch (error) {
          errores.push(`Mesa ${mesa.id}: ${error.message}`);
        }
      }

      if (errores.length > 0) {
        toast.error(`Algunos cambios no se guardaron: ${errores.join(', ')}`);
      } else {
        toast.success('Todos los cambios se guardaron correctamente');
        setTimeout(() => {
          window.close();
        }, 1500);
      }
    } catch (error) {
      toast.error('Error al guardar: ' + (error.message || 'Error desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="mt-3">Cargando datos...</p>
      </Container>
    );
  }

  // Filtrar mesas por tipo
  const mesasFiltradas = mesas.filter(m => m.tipoMesa === tipoMesaActiva);
  const totalExamen = mesas.filter(m => m.tipoMesa === 'EXAMEN').length;
  const totalColoquio = mesas.filter(m => m.tipoMesa === 'COLOQUIO').length;

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
                className="w-100"
              >
                Distribuir por materia
              </Button>
            </Col>
            <Col xs="auto">
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={aplicarMismaFecha}
              >
                Aplicar misma fecha a todas
              </Button>
            </Col>
            <Col xs="auto">
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={distribuirHoras}
              >
                Distribuir horas
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
            <Col xs="auto">
              <Form.Check 
                type="checkbox"
                id="asignarDocentes"
                label="Asignar docentes aleatorios (EXAMEN)"
                checked={asignarDocentesAleatorios}
                onChange={(e) => setAsignarDocentesAleatorios(e.target.checked)}
                title="Solo para exámenes finales. El titular siempre se asigna."
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
              <li><strong>Opciones de asignación:</strong>
                <ul className="mb-0 mt-1">
                  <li><strong>Aulas aleatorias:</strong> Asigna una aula por turno, rotando entre disponibles.</li>
                  <li><strong>Docentes aleatorios (EXAMEN):</strong> Agrega 2 docentes aleatorios + el titular (que siempre está).</li>
                </ul>
              </li>
            </ul>
          </Alert>
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
                {mesasFiltradas.map((mesa, idx) => {
                  const esPrimeraDeLaMateria = idx === 0 || mesasFiltradas[idx - 1].materiaNombre !== mesa.materiaNombre;
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

          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button 
              variant="secondary" 
              onClick={() => window.close()}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button 
              variant="success" 
              onClick={guardarCambios}
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                'Guardar todos los cambios'
              )}
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
