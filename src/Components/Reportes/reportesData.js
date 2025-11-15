const reportes = [
  // 📑 Reportes de Alumnos
  {
    id: 1,
    titulo: "Legajo de Alumnos",
    descripcion: "Consultá el historial académico completo de un alumno: notas, asistencias, conducta y trayectoria año por año.",
    categoria: "Alumnos",
    ruta: "/reportes/legajo-alumno",
    roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR"] // ReporteHistorialAlumnoController
  },
  {
    id: 18,
    titulo: "Historial Académico Completo",
    descripcion: "Visualizá la trayectoria completa de un alumno: evolución de promedios, materias aprobadas/desaprobadas, tendencia académica y análisis por ciclo lectivo.",
    categoria: "Alumnos",
    ruta: "/reportes/historial-alumno",
    roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR"] // ReporteHistorialAlumnoController
  },
  {
    id: 17,
    titulo: "Exámenes Consecutivos",
    descripcion: "Lista de alumnos que desaprobaron dos instancias de evaluación consecutivas, con filtros por curso y materia.",
    categoria: "Alumnos",
    ruta: "/reportes/examenes-consecutivos",
    roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR", "ROLE_DOCENTE"] // ReporteExamenesConsecutivosController - endpoint /materia permite DOCENTE
  },
  {
    id: 2,
    titulo: "Alumnos Libres",
    descripcion: "Identificá qué alumnos perdieron la regularidad por inasistencias o desaprobación, con detalles de cada materia.",
    categoria: "Alumnos",
    ruta: "/reportes/alumnos-libres",
    roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR"] // ReporteLibresController
  },
  {
    id: 3,
    titulo: "Notas por Curso/Materia",
    descripcion: "Visualizá las calificaciones de todos los alumnos de un curso por materia: etapas, promedios, estado y nota final.",
    categoria: "Alumnos",
    ruta: "/reportes/notas-por-curso",
    roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR", "ROLE_DOCENTE"] // ReporteNotasController
  },
  {
    id: 16,
    titulo: "Notas de un Alumno",
    descripcion: "Consultá las notas de un alumno específico por materia o generá un informe completo de todas sus calificaciones.",
    categoria: "Alumnos",
    ruta: "/reportes/notas-alumnos",
    roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR"] // ReporteNotasController
  },
  {
    id: 4,
    titulo: "Alumnos que rinden en Diciembre y Febrero",
    descripcion: "Lista de alumnos que deben rendir mesas de examen final con detalle de materias pendientes por curso.",
    categoria: "Alumnos",
    ruta: "/reportes/rinden",
    roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR"] // ReporteRindeController
  },
  {
    id: 5,
    titulo: "Alumnos que llegan tarde regularmente",
    descripcion: "Reporte de alumnos con tardanzas reiteradas, incluyendo cantidad total y fechas de llegadas tarde.",
    categoria: "Alumnos",
    ruta: "/reportes/tardanzas",
    roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR"] // ReporteTardanzaController
  },
  // {
  //   id: 6,
  //   titulo: "Alumnos con Bajo Rendimiento",
  //   descripcion: "Visualizá a los estudiantes con promedios bajos que necesitan apoyo escolar.",
  //   categoria: "Alumnos"
  // },
  {
    id: 7,
    titulo: "Informe Anual de Alumno",
    descripcion: "Informe académico completo del año: notas por etapa, promedios, asistencias, materias previas y conducta.",
    categoria: "Alumnos",
    ruta: "/reportes/reporte-anual-alumno",
    roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR"] // ReporteAnualController
  },
  // {
  //   id: 8,
  //   titulo: "Desempeño de Alumno",
  //   descripcion: "Hacé un seguimiento de la evolución académica de un alumno a lo largo de su trayectoria.",
  //   categoria: "Alumnos"
  // },
  {
    id: 9,
    titulo: "Ranking de Alumnos",
    descripcion: "Ordenamiento de alumnos por promedio general, mostrando los mejores rendimientos académicos por curso.",
    categoria: "Alumnos",
    ruta: "/reportes/ranking-alumnos",
    roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR"] // ReporteRankingAlumnoController
  },
  {
    id: 10,
    titulo: "Alumnos con Asistencia Perfecta",
    descripcion: "Lista de alumnos sin inasistencias ni tardanzas en el período seleccionado, organizados por curso.",
    categoria: "Alumnos",
    ruta: "/reportes/asistencia-perfecta",
    roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR"] // ReporteAsistenciaPerfectaController
  },
  // {
  //   id: 11,
  //   titulo: "Alumnos que Recuperan Etapa",
  //   descripcion: "Registrá qué alumnos aprobaron después de instancias de recuperación.",
  //   categoria: "Alumnos",
  //   roles: ["ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_PRECEPTOR"] // Sin backend aún
  // },
  // {
  //   id: 12,
  //   titulo: "Inasistencia de Alumnos",
  //   descripcion: "Consultá las faltas de cada alumno y detectá casos con riesgo de abandono.",
  //   categoria: "Alumnos"
  // },

  // 👩‍🏫 Reportes de Docentes
  {
    id: 13,
    titulo: "Disponibilidad Docente",
    descripcion: "Grilla semanal con los horarios ocupados y libres de un docente, mostrando materias y cursos asignados.",
    categoria: "Docentes",
    ruta: "/reportes/disponibilidad-docente",
    roles: ["ROLE_ADMIN", "ROLE_DIRECTOR"] // ⚠️ SOLO ADMIN/DIRECTOR - ReporteDisponibilidadController
  },
  // {
  //   id: 14,
  //   titulo: "Carga Horaria Docente",
  //   descripcion: "Visualizá la cantidad de horas asignadas a cada docente.",
  //   categoria: "Docentes"
  // },
  {
    id: 15,
    titulo: "Desempeño Docente",
    descripcion: "Análisis del rendimiento docente basado en resultados de alumnos: porcentajes de aprobación, promedios y estado.",
    categoria: "Docentes",
    ruta: "/reportes/desempeno-docente",
    roles: ["ROLE_ADMIN", "ROLE_DIRECTOR"] // ⚠️ SOLO ADMIN/DIRECTOR - ReporteDesempenoDocenteController
  }
];

export default reportes;
