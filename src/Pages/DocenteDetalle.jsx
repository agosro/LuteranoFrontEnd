import { useState } from "react";
import { useLocation } from "react-router-dom";
import TablaDetalle from "../Components/TablaDetalles";
import RenderCampos from "../Components/RenderCampos";
import RenderCamposEditable from "../Components/RenderCamposEditables";
import { camposDocente } from "../Entidades/camposDocente";
import { editarDocente } from "../Services/DocenteService"; // 👈 tu service
import { useAuth } from "../Context/AuthContext";
import { toast } from "react-toastify";
import { inputLocalToBackendISO } from "../utils/fechas";

export default function DocenteDetalle() {
  const location = useLocation();
  const docente = location.state;
  const { user } = useAuth();

  const [formData, setFormData] = useState(docente || {});

  if (!docente) return <p>Cargando...</p>;

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
      toast.success("Docente actualizado con éxito");
    } catch (error) {
      toast.error(error.message || "Error actualizando docente");
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
                    {d.materiaNombre} ({d.cursoNombre})
                </li>
                ))}
            </ul>
            ) : (
            <p>Sin materias asignadas</p>
            ),
        },
      ]}
    />
  );
}
