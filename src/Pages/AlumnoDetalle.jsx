import { useState } from "react";
import { useLocation } from "react-router-dom";
import TablaDetalle from "../Components/TablaDetalles";
import RenderCampos from "../Components/RenderCampos";
import { camposAlumno } from "../Entidades/camposAlumno";
import { editarAlumno } from "../Services/AlumnoService";
import { useAuth } from "../Context/AuthContext";
import { toast } from "react-toastify";
import RenderCamposEditable from "../Components/RenderCamposEditables";
import { inputLocalToBackendISO } from "../utils/fechas";

export default function AlumnoDetalle() {
  const location = useLocation();
  const alumno = location.state;
  const { user } = useAuth();

  const [formData, setFormData] = useState(alumno || {});

  if (!alumno) return <p>Cargando...</p>;

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

      await editarAlumno(user.token, payload);
      toast.success("Alumno actualizado con éxito");
    } catch (error) {
      toast.error(error.message || "Error actualizando alumno");
    }
  };

  const handleCancel = () => {
    setFormData(alumno); // descartar cambios
  };

  return (
    <TablaDetalle
      titulo={`${alumno.nombre} ${alumno.apellido}`}
      subtitulo={`DNI: ${alumno.dni}`}
      onSave={handleSave}
      onCancel={handleCancel}
      tabs={[
        {
          id: "datos",
          label: "Datos personales",
          content: (modoEditar) =>
            !modoEditar ? (
              <RenderCampos campos={camposAlumno(true)} data={formData} />
            ) : (
              <RenderCamposEditable
                campos={camposAlumno(false, true)} // 👈 modo edición
                formData={formData}
                setFormData={setFormData}
              />
            ),
        },
        {
          id: "historial",
          label: "Historial de cursos",
          content: () =>
            alumno.historial?.length ? (
              <ul className="list-group">
                {alumno.historial.map((c) => (
                  <li key={c.id} className="list-group-item">
                    {c.nombre} ({c.cicloLectivo})
                  </li>
                ))}
              </ul>
            ) : (
              <p>No tiene historial</p>
            ),
        },
      ]}
    />
  );
}