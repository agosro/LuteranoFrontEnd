import { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import TablaDetalle from "../Components/TablaDetalles";
import RenderCampos from "../Components/RenderCampos";
import RenderCamposEditable from "../Components/RenderCamposEditables";
import { camposDocente } from "../Entidades/camposDocente";
import { editarDocente, listarDocentes } from "../Services/DocenteService";
import { useAuth } from "../Context/AuthContext";
import { toast } from "react-toastify";
import { inputLocalToBackendISO } from "../utils/fechas";
import { Calendar, BarChart3 } from "lucide-react";

export default function DocenteDetalle() {
  const location = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const docenteState = location.state;
  const { user } = useAuth();

  const [docente, setDocente] = useState(docenteState || null);
  const [formData, setFormData] = useState(docenteState || {});
  const [loadingDocente, setLoadingDocente] = useState(true);

  // Cargar docente si no viene en el state
  useEffect(() => {
    const fetchDocente = async () => {
      if (!user?.token) return;
      try {
        setLoadingDocente(true);
        const lista = await listarDocentes(user.token);
        const d = (lista || []).find(x => String(x.id) === String(id)) || null;
        if (d) {
          setDocente(d);
          setFormData(d);
        } else if (docenteState) {
          setDocente(docenteState);
          setFormData(docenteState);
        } else {
          toast.error("Docente no encontrado");
          navigate("/docentes");
        }
      } catch (e) {
        console.error(e);
        toast.error(e.message || "Error cargando docente");
        if (docenteState) {
          setDocente(docenteState);
          setFormData(docenteState);
        }
      } finally {
        setLoadingDocente(false);
      }
    };
    fetchDocente();
  }, [user?.token, id, docenteState, navigate]);

  if (loadingDocente) return <p>Cargando...</p>;
  if (!docente) return <p>Docente no encontrado</p>;

  const handleSave = async () => {
    try {
      const payload = {
        id: formData.id,
        nombre: formData.nombre,
        apellido: formData.apellido,
        genero: formData.genero,
        tipoDoc: formData.tipoDoc,
        dni: formData.dni,
        email: formData.email,
        direccion: formData.direccion,
        telefono: formData.telefono,
        fechaNacimiento: inputLocalToBackendISO(formData.fechaNacimiento) || undefined,
        fechaIngreso: inputLocalToBackendISO(formData.fechaIngreso) || undefined,
      };

      await editarDocente(user.token, payload);
      toast.success("Docente actualizado con \u00e9xito");
    } catch (error) {
      if (error.data && error.data.errors) {
        Object.entries(error.data.errors).forEach(([campo, mensaje]) => {
          toast.error(`${campo}: ${mensaje}`);
        });
      } else {
        toast.error(error.message || "Error actualizando docente");
      }
    }
  };

  const handleCancel = () => {
    setFormData(docente);
  };

  return (
    <TablaDetalle
      titulo={`${docente.nombre} ${docente.apellido}`}
      subtitulo={`DNI: ${docente.dni}`}
      onSave={handleSave}
      onCancel={handleCancel}
      tabs={[
        {
        id: "datos",
        label: "Datos personales",
        content: (modoEditar) =>
            !modoEditar ? (
            // usuariosOptions=[], modoVista=true, modoEdicion=false, emailDisabled=false, incluirMateriasEnVista=false
            <RenderCampos campos={camposDocente([], true, false, false, false)} data={formData} />
            ) : (
            // En edición no hay 'dictados' en los campos → imposible editar materias
            <RenderCamposEditable
                campos={camposDocente([], false, true)}
                formData={formData}
                setFormData={setFormData}
            />
            ),
        },
        {
        id: "materias",
        label: "Materias asignadas",
        // 👇 Nunca editable: esta función ignora 'modoEditar'
        content: () =>
            docente.dictados?.length ? (
            <ul className="list-group">
                {docente.dictados.map((d) => (
                <li key={d.id} className="list-group-item">
                    {d.materiaNombre}{d.cursoNombre ? ` (${d.cursoNombre})` : ''}
                </li>
                ))}
            </ul>
            ) : (
            <p>Sin materias asignadas</p>
            ),
        },
        {
          id: "reportes",
          label: "Reportes",
          content: () => (
            <div>
              <div className="mb-3">
                <h6 className="mb-3 d-flex align-items-center gap-2">
                  <BarChart3 size={20} />
                  Generar reportes del docente
                </h6>
                <p className="text-muted small mb-3">
                  Los reportes se generan automáticamente al hacer clic en el botón.
                </p>
                <div className="d-flex gap-3 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-outline-primary d-flex align-items-center gap-2"
                    onClick={() => {
                      const url = `/reportes/disponibilidad-docente?docenteId=${docente.id}&auto=true`;
                      window.open(url, '_blank');
                    }}
                  >
                    <Calendar size={18} />
                    Disponibilidad Horaria
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-success d-flex align-items-center gap-2"
                    onClick={() => {
                      const url = `/reportes/desempeno-docente?docenteId=${docente.id}&auto=true`;
                      window.open(url, '_blank');
                    }}
                  >
                    <BarChart3 size={18} />
                    Desempeño Docente
                  </button>
                </div>
              </div>
              
              <hr className="my-4" />
              
              <div className="alert alert-info">
                <strong>💡 Tip:</strong> Los reportes se abrirán en una nueva pestaña y se generarán automáticamente con la información de <strong>{docente.nombre} {docente.apellido}</strong>.
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
