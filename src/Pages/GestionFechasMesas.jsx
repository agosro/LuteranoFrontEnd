import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Form, Button, Alert, Spinner, Badge, Nav } from 'react-bootstrap';
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

  // Controles de distribución
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [turnosPorDia, setTurnosPorDia] = useState(3);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [intervaloMinutos, setIntervaloMinutos] = useState(120);

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

    // Agrupar por materia (cada grupo = 1 turno)
    const gruposPorMateria = new Map();
    mesas.forEach(mesa => {
      const key = mesa.materiaNombre;
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
    const turnosPorDiaArray = []; // Array de turnos: [{ fecha, hora, docentesOcupados: Set }]

    gruposConDocentes.forEach(grupo => {
      let asignado = false;
      
      // Intentar asignar en los días/turnos existentes
      for (let i = 0; i < turnosPorDiaArray.length && !asignado; i++) {
        const turno = turnosPorDiaArray[i];
        
        // Verificar si hay conflicto de docentes
        const hayConflicto = grupo.docentes.some(dId => turno.docentesOcupados.has(dId));
        
        if (!hayConflicto) {
          // No hay conflicto, asignar a este turno
          grupo.mesas.forEach(mesa => {
            mesasActualizadas.push({
              ...mesa,
              fecha: turno.fecha,
              hora: turno.hora
            });
          });
          
          // Agregar docentes de este grupo al turno
          grupo.docentes.forEach(dId => turno.docentesOcupados.add(dId));
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
        
        // Crear nuevo turno
        const nuevoTurno = {
          fecha,
          hora,
          docentesOcupados: new Set(grupo.docentes)
        };
        turnosPorDiaArray.push(nuevoTurno);
        
        // Asignar mesas al nuevo turno
        grupo.mesas.forEach(mesa => {
          mesasActualizadas.push({
            ...mesa,
            fecha,
            hora
          });
        });
      }
    });

    setMesas(mesasActualizadas);
    const diasUtilizados = new Set(turnosPorDiaArray.map(t => t.fecha)).size;
    toast.success(`Fechas distribuidas: ${turnosPorDiaArray.length} turnos en ${diasUtilizados} días (sin conflictos de docentes)`);
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
            <Col md={2} className="d-flex align-items-end">
              <Button 
                variant="primary" 
                onClick={distribuirFechas}
                className="w-100"
              >
                Distribuir por materia
              </Button>
            </Col>
          </Row>
          <Row className="g-2">
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
          </Row>
          <Alert variant="info" className="mt-3 mb-0" style={{fontSize: '.85rem'}}>
            <strong>Distribución por materia:</strong> Agrupa las mesas por materia. Cada materia = 1 turno.
            Todas las mesas de una misma materia van juntas (mismo día y hora). 
            <strong>Ejemplo con 3 turnos por día:</strong>
            <ul className="mb-0 mt-1">
              <li>Día 1 - 9:00hs: Matemática (3°A, 3°B, 3°C)</li>
              <li>Día 1 - 11:00hs: Historia (3°A, 3°B)</li>
              <li>Día 1 - 13:00hs: Lengua (3°A, 3°B, 3°C)</li>
              <li>Día 2 - 9:00hs: Física (3°A, 3°B)...</li>
            </ul>
          </Alert>
        </Card.Body>
      </Card>

      {/* Tabla de mesas */}
      {mesasFiltradas.length === 0 ? (
        <Alert variant="warning">No hay {tipoMesaActiva === 'EXAMEN' ? 'exámenes finales' : 'coloquios'} para gestionar</Alert>
      ) : (
        <>
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
                  const docentesDisponibles = docentesPorMesa.get(mesa.id) || [];
                  const maxDocentes = mesa.tipoMesa === 'COLOQUIO' ? 1 : 3;
                  
                  return (
                    <tr key={mesa.id}>
                      <td className={esPrimeraDeLaMateria ? 'fw-bold' : ''}>
                        {esPrimeraDeLaMateria ? mesa.materiaNombre : ''}
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
                        <Form.Select
                          size="sm"
                          multiple
                          value={mesa.docentesIds || []}
                          onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, opt => Number(opt.value));
                            if (selected.length > maxDocentes) {
                              toast.warn(`${mesa.tipoMesa === 'COLOQUIO' ? 'Coloquio solo permite 1 docente' : 'Máximo 3 docentes para examen final'}`);
                              return;
                            }
                            handleCambio(mesa.id, 'docentesIds', selected);
                          }}
                          style={{height: '70px'}}
                        >
                          {docentesDisponibles.map(d => {
                            const esDocenteMateria = d.daLaMateria;
                            const tieneConflicto = d.tieneConflictoHorario;
                            return (
                              <option 
                                key={d.id} 
                                value={d.id}
                                style={{
                                  fontWeight: esDocenteMateria ? 'bold' : 'normal',
                                  color: tieneConflicto ? '#dc3545' : (esDocenteMateria ? '#0d6efd' : 'inherit')
                                }}
                              >
                                {d.apellido}, {d.nombre} {esDocenteMateria ? '(Titular)' : ''} {tieneConflicto ? '⚠️' : ''}
                              </option>
                            );
                          })}
                        </Form.Select>
                        <Form.Text className="d-block" style={{fontSize: '0.75rem'}}>
                          {mesa.tipoMesa === 'COLOQUIO' ? 'Máx: 1 docente' : 'Máx: 3 docentes'} | Seleccionados: {(mesa.docentesIds || []).length}
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
    </Container>
  );
}
