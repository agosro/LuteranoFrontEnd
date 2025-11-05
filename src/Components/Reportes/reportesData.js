const reportes = [
  // 📑 Reportes de Alumnos
  {
    id: 1,
    titulo: "Legajo de Alumnos",
    descripcion: "Accedé a toda la información personal y académica de cada alumno en un solo lugar.",
    categoria: "Alumnos",
    ruta: "/reportes/legajo-alumno"
  },
  {
    id: 17,
    titulo: "Exámenes Consecutivos",
    descripcion: "Detectá alumnos que desaprobaron dos exámenes consecutivos y accedé a estadísticas y recomendaciones.",
    categoria: "Alumnos",
    ruta: "/reportes/examenes-consecutivos"
  },
  {
    id: 2,
    titulo: "Alumnos Libres",
    descripcion: "Identificá rápidamente qué estudiantes perdieron la regularidad y el motivo.",
    categoria: "Alumnos",
    ruta: "/reportes/alumnos-libres"
  },
  {
    id: 3,
    titulo: "Notas por Curso/Materia",
    descripcion: "Calificaciones por curso y materia (E1/E2, PG y estado) con filtros y exportación.",
    categoria: "Alumnos",
    ruta: "/reportes/notas-por-curso"
  },
  {
    id: 16,
    titulo: "Notas de un Alumno",
    descripcion: "Notas de un alumno individual: por materia o informe completo del año.",
    categoria: "Alumnos",
    ruta: "/reportes/notas-alumnos"
  },
  {
    id: 4,
    titulo: "Alumnos que rinden en Diciembre y Febrero",
    descripcion: "Revisá qué alumnos deben presentarse a mesas de examen final.",
    categoria: "Alumnos",
    ruta: "/reportes/rinden"
  },
  {
    id: 5,
    titulo: "Alumnos que llegan tarde regularmente",
    descripcion: "Detectá a los alumnos con reincidencias de llegadas tarde.",
    categoria: "Alumnos",
    ruta: "/reportes/tardanzas"
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
    descripcion: "Generá un informe completo con notas, inasistencias y conducta de todo el año.",
    categoria: "Alumnos",
    ruta: "/reportes/reporte-anual-alumno"
  },
  {
    id: 8,
    titulo: "Desempeño de Alumno",
    descripcion: "Hacé un seguimiento de la evolución académica de un alumno a lo largo de su trayectoria.",
    categoria: "Alumnos"
  },
  {
    id: 9,
    titulo: "Ranking de Alumnos",
    descripcion: "Conocé quiénes son los alumnos con mejores promedios y posiciones destacadas.",
    categoria: "Alumnos",
    ruta: "/reportes/ranking-alumnos"
  },
  {
    id: 10,
    titulo: "Alumnos con Asistencia Perfecta",
    descripcion: "Identificá a los estudiantes que no faltaron nunca en el período.",
    categoria: "Alumnos",
    ruta: "/reportes/asistencia-perfecta"
  },
  {
    id: 11,
    titulo: "Alumnos que Recuperan Etapa",
    descripcion: "Registrá qué alumnos aprobaron después de instancias de recuperación.",
    categoria: "Alumnos"
  },
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
    descripcion: "Revisá los horarios libres de los docentes para organizar clases o mesas.",
    categoria: "Docentes",
    ruta: "/reportes/disponibilidad-docente"
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
    descripcion: "Evaluá el trabajo docente con indicadores de asistencia y compromiso.",
    categoria: "Docentes"
    , ruta: "/reportes/desempeno-docente"
  }
];

export default reportes;
