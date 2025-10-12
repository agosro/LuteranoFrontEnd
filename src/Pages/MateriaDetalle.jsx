import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import TablaDetalle from "../Components/TablaDetalles";
import RenderCampos from "../Components/RenderCampos";
import RenderCamposEditable from "../Components/RenderCamposEditables";
import { useAuth } from "../Context/AuthContext";
import { camposMateria } from "../Entidades/camposMateria";
import { listarMaterias, actualizarMateria } from "../Services/MateriaService";
import { listarCursos } from "../Services/CursoService";
import { listarCursosDeMateria, asignarDocente, desasignarDocente } from "../Services/MateriaCursoService";
import { getTituloCurso } from "../utils/cursos";
import ModalSeleccionSimple from "../Components/Modals/ModalSeleccionSimple";

export default function MateriaDetalle() {
  const location = useLocation();
  const { id } = useParams();
  const materiaState = location.state;
  const { user } = useAuth();

  const [materia, setMateria] = useState(materiaState || null);
  const [formData, setFormData] = useState(materiaState || {});
  const [loading, setLoading] = useState(true);

  // Cursos y docente por curso
  const [cursos, setCursos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]); // [{cursoId, docente}]
  const [modalAsignar, setModalAsignar] = useState({ open: false, cursoId: null });

  // Cargar materia completa de la lista (como en otras vistas de detalle)
  useEffect(() => {
    const fetchMateria = async () => {
      if (!user?.token) return;
      try {
        setLoading(true);
        const lista = await listarMaterias(user.token);
        const m = (lista || []).find((x) => String(x.id) === String(id)) || null;
        if (m) {
          setMateria(m);
          setFormData(m);
        } else if (materiaState) {
          // fallback a lo que venía por state
          setMateria(materiaState);
          setFormData(materiaState);
        }
      } catch (e) {
        toast.error(e.message || "Error cargando materia");
      } finally {
        setLoading(false);
      }
    };
    fetchMateria();
  }, [id, user?.token, materiaState]);

  // Cargar cursos y asignaciones de la materia
  const cargarCursosYAsignaciones = async (token, materiaId) => {
    try {
      const [allCursos, cursosMateria] = await Promise.all([
        listarCursos(token),
        listarCursosDeMateria(token, materiaId),
      ]);
      setCursos(allCursos || []);
      setAsignaciones(Array.isArray(cursosMateria) ? cursosMateria : []);
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Error cargando cursos de la materia");
    }
  };

  useEffect(() => {
    if (user?.token && id) {
      cargarCursosYAsignaciones(user.token, id);
    }
  }, [user?.token, id]);

  const handleSave = async () => {
    try {
      const payload = {
        id: formData.id,
        nombreMateria: formData.nombreMateria,
        descripcion: formData.descripcion,
        nivel: formData.nivel,
      };
      await actualizarMateria(user.token, payload);
      toast.success("Materia actualizada con éxito");
      // refrescar datos base
      const lista = await listarMaterias(user.token);
      const updated = (lista || []).find((x) => String(x.id) === String(id));
      if (updated) {
        setMateria(updated);
        setFormData(updated);
      }
    } catch (e) {
      toast.error(e.message || "Error al actualizar materia");
    }
  };

  const handleCancel = () => {
    if (materia) setFormData(materia);
  };

  const cursosRender = useMemo(() => {
    if (!Array.isArray(asignaciones) || asignaciones.length === 0) return [];
    return asignaciones.map((mc) => {
      const curso = (cursos || []).find((c) => c.id === mc.cursoId);
      const docentes = Array.isArray(mc.docentes) && mc.docentes.length
        ? mc.docentes
        : (mc.docente ? [mc.docente] : []);
      return {
        cursoId: mc.cursoId,
        cursoNombre: curso ? getTituloCurso(curso) : `Curso ${mc.cursoId}`,
        docentes,
        docente: docentes[0] || null,
        docenteNombre: docentes.length ? docentes.map(d => `${d.nombre} ${d.apellido}`).join(", ") : "Sin docente",
      };
    });
  }, [asignaciones, cursos]);

  const titulo = materia ? materia.nombreMateria : "Materia";
  const subtitulo = materia?.nivel ? `Nivel: ${materia.nivel}` : "";

  // En "Datos de la materia" no mostramos curso/docente; eso queda en la pestaña Cursos
  const camposDatosMateria = useMemo(
    () => camposMateria(true).filter((c) => c.name !== "cursoNombre" && c.name !== "docenteNombre"),
    []
  );

  return (
    <>
      <TablaDetalle
        titulo={titulo}
        subtitulo={subtitulo}
        onSave={handleSave}
        onCancel={handleCancel}
        tabs={[
          {
            id: "datos",
            label: "Datos de la materia",
            content: (modoEditar) =>
              !modoEditar ? (
                loading ? (
                  <p>Cargando datos de la materia...</p>
                ) : (
                  <RenderCampos campos={camposDatosMateria} data={formData} />
                )
              ) : (
                <RenderCamposEditable
                  campos={camposMateria(false)}
                  formData={formData}
                  setFormData={setFormData}
                />
              ),
          },
          {
            id: "cursos",
            label: "Cursos",
            content: () => (
              <div className="card p-3 shadow-sm">
                {cursosRender.length === 0 ? (
                  <p>Esta materia no está asignada a ningún curso.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>Curso</th>
                          <th>Docente(s)</th>
                          <th style={{ width: 180 }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cursosRender.map((row) => (
                          <tr key={row.cursoId}>
                            <td>{row.cursoNombre}</td>
                            <td>{row.docenteNombre}</td>
                            <td>
                              <button
                                className="btn btn-outline-primary btn-sm me-2"
                                onClick={() => setModalAsignar({ open: true, cursoId: row.cursoId })}
                              >
                                {row.docente ? "Cambiar docente" : "Asignar docente"}
                              </button>
                              {row.docente && (
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={async () => {
                                    try {
                                      await desasignarDocente(user.token, id, row.cursoId);
                                      toast.success("Docente desasignado");
                                      await cargarCursosYAsignaciones(user.token, id);
                                    } catch (e) {
                                      toast.error(e.message || "Error desasignando docente");
                                    }
                                  }}
                                >
                                  Quitar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Modal asignar/cambiar docente para un curso de esta materia */}
      {modalAsignar.open && (
        <ModalSeleccionSimple
          show={modalAsignar.open}
          onClose={() => setModalAsignar({ open: false, cursoId: null })}
          titulo={`Asignar docente • ${materia?.nombreMateria}`}
          entidad={{ id }}
          campoAsignado="docente"
          obtenerOpciones={async (token) => {
            const { listarDocentes } = await import("../Services/DocenteService");
            const lista = await listarDocentes(token);
            return (lista || []).map((d) => ({ value: d.id, label: `${d.nombre} ${d.apellido}` }));
          }}
          onAsignar={async (token, docenteId, materiaId) => {
            await asignarDocente(token, materiaId, modalAsignar.cursoId, docenteId);
          }}
          onDesasignar={async (token, materiaId) => {
            await desasignarDocente(token, materiaId, modalAsignar.cursoId);
          }}
          token={user?.token}
          onActualizar={async () => {
            await cargarCursosYAsignaciones(user.token, id);
          }}
        />
      )}
    </>
  );
}
