import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext.jsx';

import Login from '../Pages/Login.jsx';
import Inicio from '../Pages/Inicio.jsx';
import AlumnosLista from '../Pages/AlumnosLista.jsx';
import AlumnosFiltro from '../Pages/AlumnosFiltro.jsx';
import Docentes from '../Pages/Docentes.jsx';
import Usuarios from '../Pages/Usuarios.jsx';
import UsuarioDetalle from '../Pages/UsuarioDetalle.jsx';
import Preceptores from '../Pages/Preceptores.jsx';
import Materias from '../Pages/Materias.jsx';
import MateriaDetalle from '../Pages/MateriaDetalle.jsx';
import Cursos from '../Pages/Cursos.jsx';
import Aulas from '../Pages/Aulas.jsx';
import AulaDetalle from '../Pages/AulaDetalle.jsx';
import Tutores from '../Pages/Tutores.jsx';
import TutorDetalle from '../Pages/TutorDetalle.jsx';
import Mesas from '../Pages/Mesas.jsx';
import MesasHistorial from '../Pages/MesasHistorial.jsx';
import MesaGestion from '../Pages/MesaGestion.jsx';
import GestionFechasMesas from '../Pages/GestionFechasMesas.jsx';
import Turnos from '../Pages/Turnos.jsx';
import Reportes from '../Pages/Reportes.jsx';
import ReservarEspacio from '../Pages/Reservar.jsx';
import MisReservas from '../Pages/MisReservas.jsx';
import GestionarReservas from '../Pages/GestionarReservas.jsx';
import EspaciosAulicosGestion from '../Pages/EspaciosAulicosGestion.jsx';
import DashboardLayout from '../Layout/DashboardLayout.jsx';
import PrivateRoute from './PrivateRoute';
import AlumnoDetalle from '../Pages/AlumnoDetalle.jsx';
import DocenteDetalle from '../Pages/DocenteDetalle.jsx';
import PreceptorDetalle from '../Pages/PreceptorDetalle.jsx';
import CursoHorarios from '../Pages/CursoHorario.jsx';
import CursoDetalle from '../Pages/CursoDetalle.jsx';
import RoutePersistence from './RoutePersistance.jsx';
import Horarios from '../Pages/Horarios.jsx';
import ImportarAlumnos from '../Pages/ImportarAlumnos.jsx';
import Calificaciones from '../Pages/Calificaciones.jsx';
import ImportarCalificaciones from '../Pages/ImportarCalificaciones.jsx';
import ReporteNotasAlumnos from '../Pages/ReporteNotasAlumnos.jsx';
import ReporteNotasCursoMateria from '../Pages/ReporteNotasCursoMateria.jsx';
import ReporteLegajoAlumno from '../Pages/ReporteLegajoAlumno.jsx';
import ReporteAnualAlumno from '../Pages/ReporteAnualAlumno.jsx';
import ReporteHistorialAlumno from '../Pages/ReporteHistorialAlumno.jsx';
import ReporteAlumnosLibres from '../Pages/ReporteAlumnosLibres.jsx';
import AsistenciaAlumnos from '../Pages/AsistenciaAlumnos.jsx';
import AsistenciaDocentes from '../Pages/AsistenciaDocentes.jsx';
import ReporteTardanzas from '../Pages/ReporteTardanzas.jsx';
import ReporteRinde from '../Pages/ReporteRinde.jsx';
import ReporteAsistenciaPerfecta from '../Pages/ReporteAsistenciaPerfecta.jsx';
import ReporteDisponibilidadDocente from '../Pages/ReporteDisponibilidadDocente.jsx';
import Actas from '../Pages/Actas.jsx';
import PromocionMasiva from '../Pages/PromocionMasiva.jsx';
import ReporteDesempenoDocente from '../Pages/ReporteDesempenoDocente.jsx';
import ReporteRankingAlumnos from '../Pages/ReporteRankingAlumnos.jsx';
import ReporteExamenesConsecutivos from '../Pages/ReporteExamenesConsecutivos.jsx';
import ReporteInasistenciasDetalle from '../Pages/ReporteInasistenciasDetalle.jsx';
import ConfiguracionCicloLectivo from '../Pages/ConfiguracionCicloLectivo.jsx';
import ReactivarAlumnos from '../Pages/ReactivarAlumnos.jsx';

// Componente que redirije preceptores directamente a la lista de alumnos
function AlumnosFiltroOrLista() {
  const { user } = useAuth();
  
  // Si es preceptor, mostrar la lista directamente
  if (user?.rol === "ROLE_PRECEPTOR") {
    return <AlumnosLista />;
  }
  
  // Si no es preceptor, mostrar el filtro
  return <AlumnosFiltro />;
}

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <>
    <RoutePersistence />

    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        {/* Ruta index: cuando estamos exactamente en '/' redirigimos a /inicio */}
        <Route index element={<Navigate to="inicio" replace />} />
        <Route path="inicio" element={<Inicio />} />

        {/* Solo ADMIN puede ver lista de alumnos */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DIRECTOR', 'ROLE_PRECEPTOR']} />}>
          <Route path="alumnos" element={<AlumnosFiltroOrLista />} />
          <Route path="alumnos/lista" element={<AlumnosLista />} />
          <Route path="alumnos/:id" element={<AlumnoDetalle />} />
        </Route>

        {/* Docentes -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DIRECTOR']} />}>
          <Route path="docentes" element={<Docentes />} />
          <Route path="docentes/:id" element={<DocenteDetalle />} />
        </Route>

        {/* Usuarios -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DIRECTOR']} />}>
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="usuarios/:id" element={<UsuarioDetalle />} />
        </Route>

        {/* Materias, Cursos y Turnos -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="materias" element={<Materias />} />
          <Route path="materias/:id" element={<MateriaDetalle />} />
          <Route path="cursos" element={<Cursos />} />
          <Route path="cursos/:id" element={<CursoDetalle />} />
          <Route path="/cursos/:id/horarios" element={<CursoHorarios />} />
          <Route path="/horarios" element={<Horarios />} />
          <Route path="turnos" element={<Turnos />} />
        </Route>

        {/* Aulas -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DIRECTOR']} />}>
          <Route path="aulas" element={<Aulas />} />
          <Route path="aulas/:id" element={<AulaDetalle />} />
        </Route>

        {/* Tutores -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DIRECTOR', 'ROLE_PRECEPTOR']} />}>
          <Route path="tutores" element={<Tutores />} />
          <Route path="tutores/:id" element={<TutorDetalle />} />
        </Route>

        {/* Preceptores -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DIRECTOR']} />}>
          <Route path="preceptores" element={<Preceptores />} />
          <Route path="preceptores/:id" element={<PreceptorDetalle />} />
        </Route>

        {/* Mesas de examen -> SOLO ADMIN y DIRECTOR (historial también PRECEPTOR para consulta) */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DIRECTOR']} />}>
          <Route path="mesa-de-examen" element={<Mesas />} />
          <Route path="mesa-de-examen/:mesaId/gestionar" element={<MesaGestion />} />
          <Route path="mesa-de-examen/gestion-fechas" element={<GestionFechasMesas />} />
        </Route>
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DIRECTOR', 'ROLE_PRECEPTOR']} />}>
          <Route path="mesa-de-examen/historial" element={<MesasHistorial />} />
        </Route>

        {/* Reportes -> ADMIN, DOCENTE, PRECEPTOR, DIRECTOR */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DOCENTE', 'ROLE_PRECEPTOR', 'ROLE_DIRECTOR']} />}>
          <Route path="reportes" element={<Reportes />} />
          <Route path="reportes/legajo-alumno" element={<ReporteLegajoAlumno />} />
          <Route path="reportes/notas-alumnos" element={<ReporteNotasAlumnos />} />
          <Route path="reportes/notas-por-curso" element={<ReporteNotasCursoMateria />} />
          <Route path="reportes/reporte-anual-alumno" element={<ReporteAnualAlumno />} />
          <Route path="reportes/tardanzas" element={<ReporteTardanzas />} />
          <Route path="reportes/rinden" element={<ReporteRinde />} />
          <Route path="reportes/alumnos-libres" element={<ReporteAlumnosLibres />} />
          <Route path="reportes/asistencia-perfecta" element={<ReporteAsistenciaPerfecta />} />
          <Route path="reportes/disponibilidad-docente" element={<ReporteDisponibilidadDocente />} />
          <Route path="reportes/historial-alumno" element={<ReporteHistorialAlumno />} />
          <Route path="reportes/inasistencias-detalle" element={<ReporteInasistenciasDetalle />} />
        </Route>

        {/* Desempeño docente -> ADMIN, DIRECTOR, PRECEPTOR (según backend) */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DIRECTOR', 'ROLE_PRECEPTOR']} />}>
          <Route path="reportes/desempeno-docente" element={<ReporteDesempenoDocente />} />
        </Route>

        {/* Ranking de alumnos -> ADMIN, DIRECTOR, PRECEPTOR, DOCENTE */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DIRECTOR', 'ROLE_PRECEPTOR', 'ROLE_DOCENTE']} />}>
          <Route path="reportes/ranking-alumnos" element={<ReporteRankingAlumnos />} />
        </Route>

        {/* Exámenes consecutivos -> ADMIN, DIRECTOR, PRECEPTOR, DOCENTE (algunas vistas pueden requerir más permisos) */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DIRECTOR', 'ROLE_PRECEPTOR', 'ROLE_DOCENTE']} />}>
          <Route path="reportes/examenes-consecutivos" element={<ReporteExamenesConsecutivos />} />
        </Route>

        {/* Actas -> ADMIN, DIRECTOR, PRECEPTOR */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DIRECTOR', 'ROLE_PRECEPTOR']} />}>
          <Route path="actas" element={<Actas />} />
        </Route>

        {/* Asistencia -> ADMIN, PRECEPTOR (alumnos). Docentes -> ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_PRECEPTOR']} />}>
          <Route path="asistencia/alumnos" element={<AsistenciaAlumnos />} />
        </Route>
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DIRECTOR', 'ROLE_AUXILIAR']} />}>
          <Route path="asistencia/docentes" element={<AsistenciaDocentes />} />
        </Route>

        {/* Calificaciones -> ADMIN, DOCENTE, */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DOCENTE']} />}>
          <Route path="calificaciones" element={<Calificaciones />} />
        </Route>

        {/* Configuracion general */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="configuracion/importar-alumnos" element={<ImportarAlumnos />} />
          <Route path="configuracion/importar-calificaciones" element={<ImportarCalificaciones />} />
          {/* Gestionar espacios áulicos -> ADMIN, DIRECTOR, AUXILIAR */}
          <Route path="configuracion/espacios-aulicos" element={<EspaciosAulicosGestion />} />
          {/* Reactivar alumnos excluidos */}
          <Route path="configuracion/reactivar-alumnos" element={<ReactivarAlumnos />} />
        </Route>

        {/* Habilitar acceso a Gestionar Espacios para DIRECTOR y AUXILIAR también */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_DIRECTOR', 'ROLE_AUXILIAR']} />}>
          <Route path="configuracion/espacios-aulicos" element={<EspaciosAulicosGestion />} />
        </Route>

        {/* Ciclo lectivo -> ADMIN, DIRECTOR, PRECEPTOR (listar y seleccionar). Crear solo se habilita en UI para ADMIN/DIRECTOR */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DIRECTOR', 'ROLE_PRECEPTOR']} />}>
          <Route path="configuracion/ciclo-lectivo" element={<ConfiguracionCicloLectivo />} />
        </Route>

        {/* Promoción masiva -> ADMIN, DIRECTOR, PRECEPTOR (simulación). La ejecución real se valida en UI */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DIRECTOR']} />}>
          <Route path="configuracion/promocion-masiva" element={<PromocionMasiva />} />
        </Route>

        {/* Espacios Áulicos */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DOCENTE', 'ROLE_PRECEPTOR']} />}>
          <Route path="espacios-aulicos/reservar" element={<ReservarEspacio />} />
          <Route path="espacios-aulicos/mis-reservas" element={<MisReservas />} />
        </Route>
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="espacios-aulicos/gestionar" element={<GestionarReservas />} />
        </Route>
        
      </Route>

      <Route path="*" element={<Navigate to="/inicio" />} />
    </Routes>
  </>
  );
}

export default AppRoutes;
