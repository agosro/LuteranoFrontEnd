import { useState } from "react";
import TablaFiltro from "../Components/TablaFiltros";
import BotonCrear from "../Components/Botones/BotonCrear";
import ModalCrearEntidad from "../Components/Modals/ModalCrear";
import { useAuth } from "../Context/AuthContext";
import { crearAlumno } from "../Services/AlumnoService";
import { asignarMultiplesTutores } from "../Services/TutorAlumnoService";
import { buscarTutores } from "../Services/TutorService";
import { camposAlumno } from "../Entidades/camposAlumno";
import { toast } from "react-toastify";
import { inputLocalToBackendISO } from "../utils/fechas";
import { listarCursos } from "../Services/CursoService";
import { getTituloCurso } from "../utils/cursos";

export default function FiltroAlumnosPage() {
  const { user } = useAuth();

  const [modalCrearShow, setModalCrearShow] = useState(false);
  const [formDataCrear, setFormDataCrear] = useState({});
  const [cursosOptions, setCursosOptions] = useState([]);
  const [tutoresSeleccionadosCrear, setTutoresSeleccionadosCrear] = useState([]); // objetos tutor
  const [tutoresIdsSeleccionadosCrear, setTutoresIdsSeleccionadosCrear] = useState([]); // ids para enviar

  const abrirModalCrear = async () => {
    setFormDataCrear({});
    try {
      const lista = await listarCursos(user.token);
      const opts = (lista || []).map(c => ({ value: c.id, label: getTituloCurso(c) }));
      setCursosOptions(opts);
    } catch (e) {
      console.error("Error cargando cursos para creación de alumno:", e);
      setCursosOptions([]);
    }
    setModalCrearShow(true);
  };
  const cerrarModalCrear = () => { setFormDataCrear({}); setModalCrearShow(false); };

  const handleInputChangeCrear = (name, value) =>
    setFormDataCrear(prev => ({ ...prev, [name]: value }));

  const handleCreate = async (datos) => {
    try {
  const cursoIdSelRaw = typeof datos.cursoActual === 'object' ? datos.cursoActual?.id : datos.cursoActual;
  const cursoIdSel = cursoIdSelRaw ? Number(cursoIdSelRaw) : null;
      // Validación: curso obligatorio
      if (!cursoIdSel) {
        toast.error("El curso es obligatorio");
        return;
      }
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
        // ya no se envía tutor único; multi-tutores se asignan luego
        cursoActual: { id: Number(cursoIdSel) },
      };

  const respCrear = await crearAlumno(user.token, nuevoAlumno);
      toast.success("Alumno creado con éxito");

      // Si se seleccionaron tutores en el flujo de creación, asignarlos ahora
      const alumnoIdCreado = respCrear?.alumno?.id || respCrear?.id; // depende de respuesta backend
      if (alumnoIdCreado && tutoresIdsSeleccionadosCrear.length) {
        try {
          const respAsign = await asignarMultiplesTutores(user.token, alumnoIdCreado, tutoresIdsSeleccionadosCrear);
          if (respAsign.success) {
            toast.success(respAsign.message || 'Tutores asignados');
          } else {
            toast.warn(respAsign.message || 'Asignación parcial');
          }
        } catch (e) {
          toast.error(e.message || 'Error asignando tutores');
        }
      }

      // reset estados
      setTutoresSeleccionadosCrear([]);
      setTutoresIdsSeleccionadosCrear([]);
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
        campos={[
          ...camposAlumno(false, true).filter(c => c.name !== 'estado'),
          { name: "cursoActual", label: "Curso", type: "select", opciones: cursosOptions, required: true },
          {
            name: "tutores",
            label: "Tutores (opcional)",
            type: "async-multiselect",
            // loadOptions recibe input y devuelve promesa de opciones
            loadOptions: async (inputValue) => {
              const q = (inputValue || '').trim();
              if (q.length < 2) return [];
              try {
                const lista = await buscarTutores(q, user?.token);
                return lista.map(t => ({ value: t.id, label: `${t.apellido} ${t.nombre}`, data: t }));
              } catch {
                return [];
              }
            },
            onChangeSelected: (objs) => {
              setTutoresSeleccionadosCrear(objs);
              setTutoresIdsSeleccionadosCrear(objs.map(o => o.id));
            },
            selectedOptions: tutoresSeleccionadosCrear.map(t => ({ value: t.id, label: `${t.apellido} ${t.nombre}`, data: t }))
          }
        ]}
        formData={formDataCrear}
        onInputChange={handleInputChangeCrear}
        onSubmit={handleCreate}
        titulo="Crear Alumno"
      />

      {/* Chips visuales opcionales fuera del modal de creación (refuerzo) */}
      {modalCrearShow && tutoresSeleccionadosCrear.length > 0 && (
        <div style={{ position: 'fixed', left: '2rem', bottom: '2rem', zIndex: 1100 }} className="d-flex flex-wrap gap-2">
          {tutoresSeleccionadosCrear.map(t => (
            <span key={t.id} className="badge bg-info" style={{ fontSize: '0.75rem' }}>{t.apellido} {t.nombre}</span>
          ))}
        </div>
      )}
    </>
  );
}