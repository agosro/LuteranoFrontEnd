import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
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
  const curso = location.state || {};
  const { user } = useAuth();

  const [horarios, setHorarios] = useState({});
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState("");
  const [modulosLibres, setModulosLibres] = useState([]);
  const [moduloPorDefecto, setModuloPorDefecto] = useState(null);
  const [materias, setMaterias] = useState([]);

  const [celdaAnimada, setCeldaAnimada] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState(null);

  // 🔹 Cargar horarios del curso
  const fetchHorarios = async () => {
    try {
      const dataPorDia = {};
      for (const dia of DIAS_SEMANA) {
        const resp = await getModulosConEstadoPorDia(user.token, id, dia);
        dataPorDia[dia] = resp.modulos || [];
      }
      setHorarios(dataPorDia);
    } catch (error) {
      console.error("Error al obtener horarios:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHorarios();
  }, [id]);

  // 🔹 Abrir modal Asignar
  const handleAbrirModal = async (dia, moduloSeleccionado) => {
    setDiaSeleccionado(dia);
    setModuloPorDefecto(moduloSeleccionado);

    try {
      const libresResp = await getModulosLibresPorDia(user.token, id, dia);
      setModulosLibres(libresResp.modulos || []);

      const materiasCurso = await listarMateriasDeCurso(user.token, id);
      setMaterias(materiasCurso);

      setShowModal(true);
    } catch (e) {
      console.error("Error al abrir modal:", e);
    }
  };

  const handleCerrarModal = () => setShowModal(false);

  // 🔹 Cuando se asigna horario
  const handleHorarioAsignado = async (dia, moduloId) => {
    await fetchHorarios();
    setCeldaAnimada({ dia, moduloId, tipo: "asignada" });
    setShowModal(false);
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
    } catch (error) {
      console.error("Error al quitar horario:", error);
      toast.error("Error al quitar horario");
    }
  };

  // 🔹 Mostrar spinner si está cargando
  if (loading) {
    return (
      <div className="d-flex justify-content-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  const maxModulos = Math.max(
    0,
    ...Object.values(horarios).map((arr) => arr.length || 0)
  );

  return (
    <div className="container mt-4">

      {/* 🧭 Breadcrumb arriba del todo */}
      <Breadcrumbs curso={curso}/>

      {/* 🔙 Botón volver debajo del breadcrumb */}
      <div className="mb-3">
        <BackButton />
      </div>

      <h2 className="mb-3 text-center">
        Horarios del curso {curso.anio}° {curso.division}
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
          {[...Array(maxModulos)].map((_, index) => (
            <tr key={index}>
              <td className="text-center">
                {horarios.LUNES?.[index]?.modulo?.desde
                  ? `${horarios.LUNES[index].modulo.desde} - ${horarios.LUNES[index].modulo.hasta}`
                  : `Módulo ${index + 1}`}
              </td>
              {DIAS_SEMANA.map((dia) => {
                const slot = horarios[dia]?.[index];
                if (!slot) return <td key={dia}></td>;

                const animada =
                  celdaAnimada &&
                  celdaAnimada.dia === dia &&
                  celdaAnimada.moduloId === slot.modulo.id
                    ? celdaAnimada.tipo
                    : "";

                return (
                  <td
                    key={dia}
                    className={`text-center ${
                      slot.ocupado ? "table-danger" : "table-light"
                    } celda-animada ${
                      animada === "asignada"
                        ? "celda-asignada"
                        : animada === "quitada"
                        ? "celda-quitada"
                        : ""
                    }`}
                  >
                    {slot.ocupado ? (
                      <div>
                        <strong>
                          {slot.horario?.materiaCurso?.materia?.nombreMateria ||
                            "Materia"}
                        </strong>
                        <br />
                        {slot.horario?.materiaCurso?.docente && (
                          <small>
                            {slot.horario.materiaCurso.docente.nombre}{" "}
                            {slot.horario.materiaCurso.docente.apellido}
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
                                slot.horario?.materiaCurso?.materia
                                  ?.nombreMateria,
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
          ))}
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
