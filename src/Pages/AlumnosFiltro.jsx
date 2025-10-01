import { useState } from "react";
import TablaFiltro from "../Components/TablaFiltros";
import BotonCrear from "../Components/Botones/BotonCrear";
import ModalCrearEntidad from "../Components/Modals/ModalCrear";
import { useAuth } from "../Context/AuthContext";
import { crearAlumno } from "../Services/AlumnoService";
import { camposAlumno } from "../Entidades/camposAlumno";
import { toast } from "react-toastify";
import { inputLocalToBackendISO } from "../utils/fechas";

export default function FiltroAlumnosPage() {
  const { user } = useAuth();

  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [formDataCrear, setFormDataCrear] = useState({});

  const abrirModalCrear = () => { setFormDataCrear({}); setModalCrearShow(true); };
  const cerrarModalCrear = () => { setFormDataCrear({}); setModalCrearShow(false); };

  const handleInputChangeCrear = (name, value) =>
    setFormDataCrear(prev => ({ ...prev, [name]: value }));

  const handleCreate = async (datos) => {
    try {
      const nuevoAlumno = {
        nombre: datos.nombre,
        apellido: datos.apellido,
        genero: datos.genero,
        tipoDoc: datos.tipoDoc,
        dni: datos.dni,
        email: datos.email,
        direccion: datos.direccion,
        telefono: datos.telefono,
  fechaNacimiento: inputLocalToBackendISO(datos.fechaNacimiento) || undefined,
  fechaIngreso: inputLocalToBackendISO(datos.fechaIngreso) || undefined,
        ...(datos.tutor?.id && { tutor: { id: datos.tutor.id } }),
        ...(datos.cursoActual?.id && { cursoActual: { id: datos.cursoActual.id } }),
      };

      await crearAlumno(user.token, nuevoAlumno);
      toast.success("Alumno creado con éxito");
      cerrarModalCrear();
    } catch (error) {
      toast.error(error.message || "Error creando alumno");
    }
  };

  // La función handleListar ya no es necesaria aquí, ya que TablaFiltro la maneja internamente.
  // const handleListar = (filtros) => {
  //   navigate("/alumnos/lista", { state: { filtros } });
  // };

  const campos = [
    { name: "nombre", label: "Nombre" },
    { name: "apellido", label: "Apellido" },
    { name: "dni", label: "DNI", type: "number" },
    { name: "anio", label: "Año", type: "select", options: [
      { value: "1", label: "1°" },
      { value: "2", label: "2°" },
      { value: "3", label: "3°" },
      { value: "4", label: "4°" },
      { value: "5", label: "5°" },
      { value: "6", label: "6°" },
    ] },
    { name: "division", label: "División", type: "select", options: [
      { value: "A", label: "A" },
      { value: "B", label: "B" },
    ] },
  ];

  return (
    <>
      <TablaFiltro
        campos={campos}
        rutaDestino="/alumnos/lista"
        botonCrear={<BotonCrear texto="Crear Alumno" onClick={abrirModalCrear} />}
      />

      <ModalCrearEntidad
        show={modalCrearShow}
        onClose={cerrarModalCrear}
        campos={camposAlumno(false, true)}
        formData={formDataCrear}
        onInputChange={handleInputChangeCrear}
        onSubmit={handleCreate}
        titulo="Crear Alumno"
      />
    </>
  );
}