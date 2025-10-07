import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { obtenerCursoPorId } from "../Services/CursoService";
import { Button, Table, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";

import {
  getModulosConEstadoPorDia,
  getModulosLibresPorDia,
} from "../Services/ModuloService";
import { listarMateriasDeCurso } from "../Services/MateriaCursoService";
import { desasignarHorario } from "../Services/HorariosService";

import ModalAsignarHorario from "../Components/Horarios/ModalAsignarMateriaAHorario.jsx";
import ConfirmarEliminar from "../Components/Modals/ConfirmarEliminar.jsx";

// 🧭 Nuevos imports
import BackButton from "../Components/Botones/BackButton.jsx";
import Breadcrumbs from "../Components/Botones/Breadcrumbs.jsx";

import "../Components/tabla.css"; // acá pueden ir las animaciones

const DIAS_SEMANA = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"];

export default function CursoHorarios() {
  const { id } = useParams();
  const location = useLocation();
  // Parse snapshot / query synchronously to avoid initial flicker
  let initialCurso = location.state || {};
  try {
    if (location.search) {
      const sp = new URLSearchParams(location.search);
      if (sp.get('s')) {
        const decoded = JSON.parse(decodeURIComponent(atob(sp.get('s'))));
        initialCurso = { ...initialCurso, ...decoded };
      } else {
        const anioQ = sp.get('anio');
        const divisionQ = sp.get('division');
        if (anioQ || divisionQ) {
          initialCurso = { ...initialCurso, anio: initialCurso.anio || anioQ, division: initialCurso.division || divisionQ };
        }
      }
    }
  } catch {
    // ignore malformed snapshot
  }
  const [curso, setCurso] = useState(initialCurso);
  const { user } = useAuth();

  const [horarios, setHorarios] = useState({});
  const [loading, setLoading] = useState(true);
  // const [refreshKey, setRefreshKey] = useState(0); // removido: ya no se muestra clave de recarga

  const [showModal, setShowModal] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState("");
  const [modulosLibres, setModulosLibres] = useState([]);
  const [moduloPorDefecto, setModuloPorDefecto] = useState(null);
  const [materias, setMaterias] = useState([]);

  const [celdaAnimada, setCeldaAnimada] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState(null);

  // 🔹 Cargar horarios del curso (siempre por día para mantener formato homogéneo)
  const fetchHorarios = async () => {
    try {
      const dataPorDia = {};
      for (const dia of DIAS_SEMANA) {
        const resp = await getModulosConEstadoPorDia(user.token, id, dia);
        const modulosDia = resp.modulos || resp.modulosPorDia?.[dia] || [];
        dataPorDia[dia] = modulosDia;
      }
      setHorarios(dataPorDia);
  // setRefreshKey(k => k + 1); // ya no se usa visualmente
    } catch {
      // silenciado
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchHorarios("mount|cursoChange");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fallback fetch only once if still missing anio/division
  useEffect(() => {
    if ((!curso?.anio || !curso?.division) && user?.token && id) {
      (async () => {
        try {
          const data = await obtenerCursoPorId(user.token, id);
          const dto = data.cursoDto || data;
          setCurso(prev => ({
            ...prev,
            id: dto.id,
            anio: prev.anio || dto.anio || dto.anioCurso || dto.grado || "",
            division: prev.division || dto.division || dto.div || dto.seccion || "",
            nivel: prev.nivel || dto.nivel || dto.nivelEducativo || ""
          }));
        } catch {
          /* silent */
        }
      })();
    }
  }, [id, user, curso?.anio, curso?.division]);

  // � Memo: ordenes únicas (garantiza filas alineadas por orden, no por índice crudo)
  const ordenes = useMemo(() => {
    const set = new Set();
    DIAS_SEMANA.forEach(dia => {
      (horarios[dia] || []).forEach(slot => {
        if (slot?.modulo?.orden != null) set.add(slot.modulo.orden);
      });
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [horarios]);

  // �🔹 Abrir modal Asignar
  const handleAbrirModal = async (dia, moduloSeleccionado) => {
    setDiaSeleccionado(dia);
    setModuloPorDefecto(moduloSeleccionado);

    try {
      const libresResp = await getModulosLibresPorDia(user.token, id, dia);
      setModulosLibres(libresResp.modulos || []);

      const materiasCurso = await listarMateriasDeCurso(user.token, id);
      setMaterias(materiasCurso);

      // ✅ Validar que el módulo realmente figure como libre (puede verse libre porque slot.ocupado=false pero backend lo excluye)
      const libresIds = (libresResp.modulos || []).map(m => m.id);
      if (moduloSeleccionado && !libresIds.includes(moduloSeleccionado.id)) {
        toast.warn("Este módulo aparece libre en la grilla pero el backend no lo lista como disponible (posible conflicto global).");
        // Continuamos abriendo el modal para que veas el comportamiento al intentar asignar
      }

      setShowModal(true);
    } catch {
      // silenciado
    }
  };

  const handleCerrarModal = () => setShowModal(false);

  // 🔹 Cuando se asigna horario (update optimista)
  const handleHorarioAsignado = async (payload) => {
  const { dia, primerModuloId, moduloIds, materia, response } = payload; // materia ahora tiene materiaId
    try {
      setHorarios(prev => {
        const copia = { ...prev };
        const listaDia = [...(copia[dia] || [])];
        moduloIds.forEach(idModuloAsignado => {
          const idx = listaDia.findIndex(s => s.modulo.id === idModuloAsignado || s.modulo.orden === response?.horarioClaseModuloDto?.modulo?.orden);
          if (idx >= 0) {
            const original = listaDia[idx];
            listaDia[idx] = {
              ...original,
              ocupado: true,
              horario: original.horario || {
                diaSemana: dia,
                modulo: original.modulo,
                materiaCurso: {
                  materia: {
                    id: materia?.materiaId ?? materia?.id,
                    nombreMateria: materia?.nombreMateria
                  },
                  docente: materia?.docente || null
                }
              }
            };
          }
        });
        copia[dia] = listaDia;
        return copia;
      });
      setCeldaAnimada({ dia, moduloId: primerModuloId, tipo: "asignada" });
      setTimeout(() => setCeldaAnimada(null), 1200);
      // Refetch silencioso para reconciliar
      setTimeout(() => fetchHorarios("reconcile"), 400);
    } catch {
      // fallback silencioso
      fetchHorarios();
    } finally {
      setShowModal(false);
    }
  };

  // 🔹 Abrir modal de confirmación (quitar horario)
  const abrirModalEliminar = (dia, moduloId, materiaNombre, materiaId) => {
    setItemAEliminar({
      dia,
      moduloId,
      materiaNombre,
      materiaId,
    });
    setShowConfirm(true);
  };

  // 🔹 Confirmar eliminación
  const handleConfirmarEliminar = async () => {
    if (!itemAEliminar) return;
    const { dia, moduloId, materiaNombre, materiaId } = itemAEliminar;

    try {
      const slots = [{ dia, moduloId: Number(moduloId) }];
      await desasignarHorario(user.token, id, materiaId, slots);

      toast.info(`🗑️ ${materiaNombre} quitada del ${dia}`);

      await fetchHorarios();
      setCeldaAnimada({ dia, moduloId, tipo: "quitada" });
      setShowConfirm(false);
    } catch {
      // silenciado
      toast.error("Error al quitar horario");
    }
  };

  // 🔹 Desasignar todos los horarios del curso (masivo)
  const desasignarTodos = async () => {
    // Recolectar slots ocupados agrupados por materiaId
    const porMateria = new Map(); // materiaId -> [{dia, moduloId}]
    DIAS_SEMANA.forEach(dia => {
      (horarios[dia] || []).forEach(slot => {
        if (slot.ocupado) {
          const materiaId = slot.horario?.materiaCurso?.materia?.id;
            if (materiaId != null) {
              if (!porMateria.has(materiaId)) porMateria.set(materiaId, []);
              porMateria.get(materiaId).push({ dia, moduloId: slot.modulo.id });
            }
        }
      });
    });

    if (porMateria.size === 0) {
      toast.info("No hay horarios asignados para limpiar");
      return;
    }

    if (!window.confirm("¿Seguro que querés desasignar TODOS los horarios del curso? Esta acción no se puede deshacer.")) return;

    let errores = 0;
    for (const [materiaId, slots] of porMateria.entries()) {
      try {
        await desasignarHorario(user.token, id, materiaId, slots);
      } catch {
        errores++;
      }
    }
    if (errores === 0) {
      toast.success("Se limpiaron todos los horarios");
    } else {
      toast.warn(`Se limpiaron con errores (${errores} materia(s))`);
    }
    fetchHorarios();
  };

  // 🔹 Mostrar spinner si está cargando
  if (loading) {
    return (
      <div className="d-flex justify-content-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Antes se basaba en la longitud máxima; ahora usamos ordenes calculados
  // (el largo de ordenes se usa directamente al mapear)

  return (
    <div className="container mt-4">

      {/* 🧭 Breadcrumb arriba del todo */}
      <Breadcrumbs curso={curso}/>

      {/* 🔙 Botón volver debajo del breadcrumb */}
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <BackButton />
        <div className="d-flex gap-2">
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={fetchHorarios}
          >
            🔄 Recargar
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={desasignarTodos}
          >
            ♻️ Limpiar todos
          </Button>
        </div>
      </div>

      {/* Info alert removida */}

      <h2 className="mb-3 text-center" style={{minHeight: '2rem'}}>
        {curso?.anio && curso?.division ? (
          <>Horarios del curso {curso.anio}° {curso.division}</>
        ) : (
          <span className="text-muted" style={{fontWeight:400}}>Horarios del curso</span>
        )}
      </h2>

      <Table bordered hover responsive>
        <thead className="table-success text-center">
          <tr>
            <th>Módulo</th>
            {DIAS_SEMANA.map((dia) => (
              <th key={dia}>{dia}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordenes.map((orden) => {
            const lunesSlot = (horarios.LUNES || []).find(s => s.modulo.orden === orden);
            const horaLabel = lunesSlot ? `${lunesSlot.modulo.desde} - ${lunesSlot.modulo.hasta}` : `Módulo ${orden}`;
            return (
              <tr key={orden}>
                <td className="text-center">{horaLabel}</td>
                {DIAS_SEMANA.map(dia => {
                  const slot = (horarios[dia] || []).find(s => s.modulo.orden === orden);
                  if (!slot) return <td key={`${dia}-${orden}`}></td>;
                  const animada =
                    celdaAnimada &&
                    celdaAnimada.dia === dia &&
                    celdaAnimada.moduloId === slot.modulo.id
                      ? celdaAnimada.tipo
                      : "";
                  return (
                    <td
                      key={`${dia}-${orden}`}
                      className={`text-center ${slot.ocupado ? "table-danger" : "table-light"} celda-animada ${
                        animada === "asignada"
                          ? "celda-asignada"
                          : animada === "quitada"
                          ? "celda-quitada"
                          : ""
                      }`}
                    >
                      {slot.ocupado ? (
                        <div>
                          <strong>{slot.horario?.materiaCurso?.materia?.nombreMateria || "Materia"}</strong>
                          <br />
                          {slot.horario?.materiaCurso?.docente && (
                            <small>
                              {slot.horario.materiaCurso.docente.nombre} {slot.horario.materiaCurso.docente.apellido}
                            </small>
                          )}
                          <div className="mt-2">
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() =>
                                abrirModalEliminar(
                                  dia,
                                  slot.modulo.id,
                                  slot.horario?.materiaCurso?.materia?.nombreMateria,
                                  slot.horario?.materiaCurso?.materia?.id
                                )
                              }
                            >
                              Quitar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline-success"
                          onClick={() => handleAbrirModal(dia, slot.modulo)}
                        >
                          Asignar
                        </Button>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </Table>

      {/* 🔹 Modal Asignar */}
      <ModalAsignarHorario
        show={showModal}
        onClose={handleCerrarModal}
        token={user.token}
        cursoId={id}
        diaSeleccionado={diaSeleccionado}
        modulosLibres={modulosLibres}
        moduloPorDefecto={moduloPorDefecto}
        materias={materias}
        onHorarioAsignado={handleHorarioAsignado}
      />

      {/* 🔹 Modal Confirmar (tu componente reutilizable) */}
      <ConfirmarEliminar
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmarEliminar}
        item={{
          nombre: itemAEliminar?.materiaNombre,
          dia: itemAEliminar?.dia,
        }}
        tipo="horario"
      />
    </div>
  );
}
