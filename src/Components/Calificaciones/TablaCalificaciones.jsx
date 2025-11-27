import { useMemo, useState } from "react";
import { Table, Button, Form, Stack, Spinner } from "react-bootstrap";
import ModalConfirmarEliminacion from "./ModalConfirmarEliminacion";

export default function TablaCalificaciones({ datos, materiaId, materiaCursoId, etapa, onGuardar, onEliminar, onGuardarTodos, notasFinales, modoEdicion, notasEnEdicion, onToggleEdicionNota, onDesbloquearColumna }) {
  const [notasEditadas, setNotasEditadas] = useState({});
  const [guardandoTodo, setGuardandoTodo] = useState(false);
  const [mostrarEliminar, setMostrarEliminar] = useState(false);
  const [objetivoEliminar, setObjetivoEliminar] = useState(null); // { alumnoId, numeroNota, califId, alumnoLabel }

  const handleNotaChange = (alumnoId, numeroNota, valor) => {
    // Validar que el valor esté entre 1 y 10, o vacío
    if (valor !== "" && (isNaN(Number(valor)) || Number(valor) < 1 || Number(valor) > 10)) {
      return; // No actualizar si está fuera del rango
    }
    setNotasEditadas((prev) => ({
      ...prev,
      [alumnoId]: {
        ...(prev[alumnoId] || {}),
        [numeroNota]: valor,
      },
    }));
  };

  // Función para verificar si una columna de notas está completamente vacía
  const columnaEstaVacia = (numeroNota) => {
    return datos.every((alumno) => {
      const existeNota = (alumno.calificaciones || []).find((c) => c.numeroNota === numeroNota);
      return !existeNota;
    });
  };

  // Función para verificar si una nota está bloqueada
  const estaBloqueada = (alumnoId, numeroNota) => {
    // Si la columna está completamente vacía, siempre está desbloqueada
    if (columnaEstaVacia(numeroNota)) return false;
    
    // Si no estamos en modo edición, todas están bloqueadas
    if (!modoEdicion) return true;
    
    // Si estamos en modo edición pero esta nota no está en el Set de notas a editar
    const notaId = `${alumnoId}-${numeroNota}`;
    return !notasEnEdicion.has(notaId);
  };

  const calcularPromedio = (notas) => {
    const nums = Object.values(notas)
      .map((v) => parseFloat(v))
      .filter((v) => !isNaN(v));
    if (nums.length === 0) return "-";
    const prom = nums.reduce((a, b) => a + b, 0) / nums.length;
    return prom.toFixed(2);
  };

  const construirPayloadsParaAlumno = (alumno) => {
    const notas = notasEditadas[alumno.id];
    if (!notas) return [];

    const hoy = new Date().toISOString().slice(0, 10); // yyyy-MM-dd
    const prevMap = (alumno.calificaciones || []).reduce((acc, c) => {
      acc[c.numeroNota] = c; // c.id disponible si existía
      return acc;
    }, {});

    return Object.entries(notas)
      .filter(([, valor]) => valor !== "" && !isNaN(Number(valor)))
      .map(([numeroNota, valor]) => {
        const prev = prevMap[numeroNota];
        if (prev?.id) {
          return {
            alumnoId: Number(alumno.id),
            materiaId: Number(materiaId),
            califId: Number(prev.id),
            nota: Number(valor),
            fecha: hoy,
            _tipo: "update",
          };
        }
        return {
          alumnoId: Number(alumno.id),
          materiaId: Number(materiaId),
          materiaCursoId: materiaCursoId ? Number(materiaCursoId) : undefined,
          nota: Number(valor),
          etapa: Number(etapa),
          numeroNota: Number(numeroNota),
          fecha: hoy,
          _tipo: "create",
        };
      });
  };

  const handleGuardarFila = (alumno) => {
    const payloads = construirPayloadsParaAlumno(alumno);

    onGuardar(alumno.id, payloads);
  };

  const lotes = useMemo(() => {
    // Construye payloads de todos los alumnos editados
    const result = [];
    for (const alumno of datos) {
      const p = construirPayloadsParaAlumno(alumno);
      if (p.length > 0) result.push({ alumnoId: alumno.id, payloads: p });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notasEditadas, datos, materiaId, materiaCursoId, etapa]);

  // Función para desbloquear toda una columna de notas
  const desbloquearColumna = (numeroNota) => {
    if (onDesbloquearColumna) {
      onDesbloquearColumna(numeroNota);
    }
  };

  const manejarGuardarTodos = async () => {
    if (!onGuardarTodos) return;
    if (lotes.length === 0) return;
    try {
      setGuardandoTodo(true);
      await onGuardarTodos(lotes);
    } finally {
      setGuardandoTodo(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-end mb-2">
        <Button
          variant="primary"
          size="sm"
          onClick={manejarGuardarTodos}
          disabled={guardandoTodo || lotes.length === 0}
        >
          {guardandoTodo ? (
            <><Spinner animation="border" size="sm" className="me-2" />Guardando...</>
          ) : (
            "Guardar todos"
          )}
        </Button>
      </div>
      <Table bordered hover responsive>
        <thead className="table-success text-center">
          <tr>
            <th>Alumno</th>
            <th 
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => desbloquearColumna(1)}
              title="Haz clic para desbloquear toda la columna"
            >
              Nota 1
            </th>
            <th 
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => desbloquearColumna(2)}
              title="Haz clic para desbloquear toda la columna"
            >
              Nota 2
            </th>
            <th 
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => desbloquearColumna(3)}
              title="Haz clic para desbloquear toda la columna"
            >
              Nota 3
            </th>
            <th 
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => desbloquearColumna(4)}
              title="Haz clic para desbloquear toda la columna"
            >
              Nota 4
            </th>
            <th>Promedio</th>
            {notasFinales && <th>NF</th>}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((alumno) => {
             const notasPrevias = alumno.calificaciones?.reduce((acc, n) => {
               acc[n.numeroNota] = n.nota;
               return acc;
             }, {}) || {};
             // BUGFIX: combinar previas con editadas, priorizando editadas
             const notasActuales = {
               ...notasPrevias,
               ...(notasEditadas[alumno.id] || {}),
             };
            const promedio = calcularPromedio(notasActuales);

            return (
              <tr key={alumno.id}>
                <td
                  style={{ cursor: modoEdicion ? 'pointer' : 'default' }}
                  onClick={() => {
                    // Al hacer clic en el nombre del alumno, desbloquear toda la fila
                    if (modoEdicion && onToggleEdicionNota) {
                      for (let n = 1; n <= 4; n++) {
                        const notaId = `${alumno.id}-${n}`;
                        if (notasEnEdicion.has(notaId)) {
                          // Ya está desbloqueada, no hacer nada
                        } else {
                          // Desbloquear
                          onToggleEdicionNota(notaId);
                        }
                      }
                    }
                  }}
                  title={modoEdicion ? 'Haz clic para desbloquear todas las notas de este alumno' : ''}
                >
                  {alumno.apellido} {alumno.nombre}
                </td>
                {[1, 2, 3, 4].map((n) => {
                  const prev = (alumno.calificaciones || []).find((c) => c.numeroNota === n);
                  const existeNota = !!prev;
                  const notaId = `${alumno.id}-${n}`;
                  // Directamente verificar si esta nota está en el set de notas para editar
                  const puedeEditar = modoEdicion && (notasEnEdicion.has(notaId) || columnaEstaVacia(n));
                  const columnaVacia = columnaEstaVacia(n);
                  
                  const handleInputClick = (e) => {
                    // Al hacer clic, si NO puede editar y estamos en modo edición, desbloquear
                    if (modoEdicion && !puedeEditar && onToggleEdicionNota) {
                      onToggleEdicionNota(notaId);
                      // Enfocarse después de desbloquear
                      setTimeout(() => {
                        e.target.focus();
                        e.target.select();
                      }, 0);
                    }
                  };
                  
                  return (
                    <td key={n}>
                      <Stack direction="horizontal" gap={2} className="justify-content-center">
                        <Form.Control
                          type="number"
                          min="1"
                          max="10"
                          value={notasActuales[n] || ""}
                          onChange={(e) => {
                            if (puedeEditar) {
                              handleNotaChange(alumno.id, n, e.target.value);
                            }
                          }}
                          onClick={handleInputClick}
                          disabled={!puedeEditar}
                          className="text-center"
                          style={{ 
                            width: 80,
                            cursor: modoEdicion && !puedeEditar && !columnaVacia ? 'pointer' : 'default',
                            backgroundColor: !puedeEditar && !columnaVacia ? '#f0f0f0' : 'white',
                            opacity: !puedeEditar && !columnaVacia ? 0.7 : 1,
                          }}
                          title={
                            columnaVacia 
                              ? 'Esta nota está vacía, puedes editarla siempre'
                              : modoEdicion && !puedeEditar
                                ? 'Haz clic para editar' 
                                : !puedeEditar
                                  ? 'Entra en modo edición para modificar' 
                                  : 'Editando'
                          }
                        />
                         {existeNota && onEliminar && puedeEditar && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            title="Eliminar calificación"
                            onClick={() => {
                              setObjetivoEliminar({
                                alumnoId: alumno.id,
                                numeroNota: n,
                                califId: prev.id,
                                alumnoLabel: `${alumno.apellido} ${alumno.nombre}`,
                              });
                              setMostrarEliminar(true);
                            }}
                          >
                            ×
                          </Button>
                        )}
                      </Stack>
                    </td>
                  );
                })}
                <td className="text-center fw-bold">{promedio}</td>
                {notasFinales && (
                  <td className="text-center">{(notasFinales[alumno.id] ?? notasFinales?.[String(alumno.id)]) ?? '-'}</td>
                )}
                <td className="text-center">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleGuardarFila(alumno)}
                    disabled={guardandoTodo}
                  >
                    Guardar
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <ModalConfirmarEliminacion
        mostrar={mostrarEliminar}
        onCerrar={() => setMostrarEliminar(false)}
        alumnoEtiqueta={objetivoEliminar?.alumnoLabel}
        numeroNota={objetivoEliminar?.numeroNota}
        onConfirmar={() => {
          if (objetivoEliminar) {
            onEliminar(objetivoEliminar.alumnoId, objetivoEliminar.numeroNota, objetivoEliminar.califId);
          }
          setMostrarEliminar(false);
        }}
      />
    </div>
  );
}
