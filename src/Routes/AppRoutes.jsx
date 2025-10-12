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
import Tutores from '../Pages/Tutores.jsx';
import TutorDetalle from '../Pages/TutorDetalle.jsx';
import Mesas from '../Pages/Mesas.jsx';
import Reportes from '../Pages/Reportes.jsx';
import ReservarEspacio from '../Pages/Reservar.jsx';
import MisReservas from '../Pages/MisReservas.jsx';
import GestionarReservas from '../Pages/GestionarReservas.jsx';
import DashboardLayout from '../Layout/DashboardLayout.jsx';
import PrivateRoute from './PrivateRoute';
import MiPerfil from '../Pages/MiPerfil.jsx';
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
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="alumnos" element={<AlumnosFiltro />} />
          <Route path="alumnos/lista" element={<AlumnosLista />} />
          <Route path="alumnos/:id" element={<AlumnoDetalle />} />
        </Route>

        {/* Docentes -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="docentes" element={<Docentes />} />
          <Route path="docentes/:id" element={<DocenteDetalle />} />
        </Route>

        {/* Usuarios -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="usuarios/:id" element={<UsuarioDetalle />} />
        </Route>

        {/* Materias y Cursos -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="materias" element={<Materias />} />
          <Route path="materias/:id" element={<MateriaDetalle />} />
          <Route path="cursos" element={<Cursos />} />
          <Route path="cursos/:id" element={<CursoDetalle />} />
          <Route path="/cursos/:id/horarios" element={<CursoHorarios />} />
          <Route path="/horarios" element={<Horarios />} />
        </Route>

        {/* Aulas -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="aulas" element={<Aulas />} />
        </Route>

        {/* Tutores -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="tutores" element={<Tutores />} />
          <Route path="tutores/:id" element={<TutorDetalle />} />
        </Route>

        {/* Preceptores -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="preceptores" element={<Preceptores />} />
          <Route path="preceptores/:id" element={<PreceptorDetalle />} />
        </Route>

        {/* Mesas de examen -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="mesa-de-examen" element={<Mesas />} />
        </Route>

        {/* Reportes -> ADMIN, DOCENTE, PRECEPTOR */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DOCENTE', 'ROLE_PRECEPTOR']} />}>
          <Route path="reportes" element={<Reportes />} />
          <Route path="reportes/legajo-alumno" element={<ReporteLegajoAlumno />} />
          <Route path="reportes/notas-alumnos" element={<ReporteNotasAlumnos />} />
          <Route path="reportes/notas-por-curso" element={<ReporteNotasCursoMateria />} />
        </Route>

        {/* Calificaciones -> ADMIN, DOCENTE, */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DOCENTE']} />}>
          <Route path="calificaciones" element={<Calificaciones />} />
        </Route>

        {/* Configuracion -> ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="configuracion/importar-alumnos" element={<ImportarAlumnos />} />
          <Route path="configuracion/importar-calificaciones" element={<ImportarCalificaciones />} />
        </Route>

        {/* Espacios Áulicos */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DOCENTE', 'ROLE_PRECEPTOR']} />}>
          <Route path="espacios-aulicos/reservar" element={<ReservarEspacio />} />
          <Route path="espacios-aulicos/mis-reservas" element={<MisReservas />} />
        </Route>
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="espacios-aulicos/gestionar" element={<GestionarReservas />} />
        </Route>
        
        {/* Mi perfil-> ADMIN, DOCENTE, PRECEPTOR */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DOCENTE', 'ROLE_PRECEPTOR']} />}>
          <Route path="mi-perfil" element={<MiPerfil />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/inicio" />} />
    </Routes>
  </>
  );
}

export default AppRoutes;
