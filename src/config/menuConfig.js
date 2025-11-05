import {
  FaHome, FaUsers, FaBook, FaChalkboardTeacher,
  FaCog, FaDoorOpen, FaClipboardList, FaChartBar, FaCheckSquare
} from "react-icons/fa";

export const menuConfig = [
  {
    label: "Inicio",
    icon: FaHome,
    path: "/inicio",
    roles: ["ROLE_ADMIN", "ROLE_DOCENTE", "ROLE_PRECEPTOR"],
  },
  {
    label: "Personas",
    icon: FaUsers,
    roles: ["ROLE_ADMIN", "ROLE_PRECEPTOR"],
    subItems: [
      { label: "Usuarios", path: "/usuarios", roles: ["ROLE_ADMIN"] },
      { label: "Alumnos", path: "/alumnos", roles: ["ROLE_ADMIN", "ROLE_PRECEPTOR"] },
      { label: "Docentes", path: "/docentes", roles: ["ROLE_ADMIN"] },
      { label: "Tutores", path: "/tutores", roles: ["ROLE_ADMIN", "ROLE_PRECEPTOR"] },
      { label: "Preceptores", path: "/preceptores", roles: ["ROLE_ADMIN"] },
    ],
  },
  {
    label: "Académico",
    icon: FaBook,
    roles: ["ROLE_ADMIN", "ROLE_DOCENTE"],
    subItems: [
      { label: "Materias", path: "/materias", roles: ["ROLE_ADMIN"] },
      { label: "Cursos", path: "/cursos", roles: ["ROLE_ADMIN", "ROLE_DOCENTE"] },
      { label: "Calificaciones", path: "/calificaciones", roles: ["ROLE_DOCENTE","ROLE_ADMIN"] }, // 🆕
    ],
  },
  {
    label: "Organización",
    icon: FaChalkboardTeacher,
    roles: ["ROLE_ADMIN", "ROLE_PRECEPTOR"],
    subItems: [
      { label: "Horarios", path: "/horarios", roles: ["ROLE_ADMIN"] },
      { label: "Aulas", path: "/aulas", roles: ["ROLE_ADMIN"] },
    ],
  },
  {
    label: "Espacios Áulicos", // 🆕
    icon: FaDoorOpen,
    roles: ["ROLE_ADMIN", "ROLE_DOCENTE", "ROLE_PRECEPTOR"],
    subItems: [
      { label: "Reservar", path: "/espacios-aulicos/reservar", roles: ["ROLE_ADMIN","ROLE_DOCENTE","ROLE_PRECEPTOR"] },
      { label: "Mis Reservas", path: "/espacios-aulicos/mis-reservas", roles: ["ROLE_ADMIN","ROLE_DOCENTE","ROLE_PRECEPTOR"] },
      { label: "Gestionar Reservas", path: "/espacios-aulicos/gestionar", roles: ["ROLE_ADMIN"] },
    ],
  },
  {
    label: "Reportes",
    icon: FaChartBar, // 🆕
    path: "/reportes",
    roles: ["ROLE_ADMIN", "ROLE_PRECEPTOR"],
  },
  {
    label: "Asistencia",
    icon: FaCheckSquare, // 🆕
    roles: ["ROLE_ADMIN", "ROLE_DOCENTE", "ROLE_PRECEPTOR"],
    subItems: [
      { label: "Alumnos", path: "/asistencia/alumnos", roles: ["ROLE_PRECEPTOR","ROLE_ADMIN"] },
      { label: "Docentes", path: "/asistencia/docentes", roles: ["ROLE_ADMIN"] },
    ],
  },
  {
    label: "Mesa de examen",
    icon: FaClipboardList,
    roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR"],
    subItems: [
      { label: "Mesas", path: "/mesa-de-examen", roles: ["ROLE_ADMIN"] },
      { label: "Turnos de examen", path: "/turnos", roles: ["ROLE_ADMIN"] },
      { label: "Actas", path: "/actas", roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR"] },
    ],
  },
  {
    label: "Configuración",
    icon: FaCog,
    roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR"],
    subItems: [
      { label: "Ciclo lectivo", path: "/configuracion/ciclo-lectivo", roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR"] },
      { label: "Parámetros", path: "/configuracion", roles: ["ROLE_ADMIN"] },
      { label: "Importar Alumnos", path: "/configuracion/importar-alumnos", roles: ["ROLE_ADMIN"] },
      { label: "Importar Calificaciones", path: "/configuracion/importar-calificaciones", roles: ["ROLE_ADMIN"] },
      { label: "Gestionar Espacios", path: "/configuracion/espacios-aulicos", roles: ["ROLE_ADMIN"] },
      { label: "Promoción Masiva", path: "/configuracion/promocion-masiva", roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR"] },

    ],
  },
];
