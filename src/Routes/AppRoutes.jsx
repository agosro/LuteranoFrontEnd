import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext.jsx';

import Login from '../Pages/Login.jsx';
import Inicio from '../Pages/Inicio.jsx';
import AlumnosLista from '../Pages/AlumnosLista.jsx';
import AlumnosFiltro from '../Pages/AlumnosFiltro.jsx';
import Docentes from '../Pages/Docentes.jsx';
import Usuarios from '../Pages/Usuarios.jsx';
import Preceptores from '../Pages/Preceptores.jsx';
import Materias from '../Pages/Materias.jsx';
import Cursos from '../Pages/Cursos.jsx';
import Aulas from '../Pages/Aulas.jsx';
import Tutores from '../Pages/Tutores.jsx';
import Mesas from '../Pages/Mesas.jsx';
import Reportes from '../Pages/Reportes.jsx';
import ReservarEspacio from '../Pages/Reservar.jsx';
import MisReservas from '../Pages/MisReservas.jsx';
import GestionarReservas from '../Pages/GestionarReservas.jsx';
import DashboardLayout from '../Layout/DashboardLayout.jsx';
import PrivateRoute from './PrivateRoute';
import MiPerfil from '../Pages/MiPerfil.jsx';

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
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route path="inicio" element={<Inicio />} />

        {/* Solo ADMIN puede ver lista de alumnos */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="alumnos" element={<AlumnosFiltro />} />
          <Route path="alumnos/lista" element={<AlumnosLista />} />
        </Route>

        {/* Docentes -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="docentes" element={<Docentes />} />
        </Route>

        {/* Usuarios -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="usuarios" element={<Usuarios />} />
        </Route>

        {/* Materias y Cursos -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="materias" element={<Materias />} />
          <Route path="cursos" element={<Cursos />} />
        </Route>

        {/* Aulas -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="aulas" element={<Aulas />} />
        </Route>

        {/* Tutores -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="tutores" element={<Tutores />} />
        </Route>

        {/* Preceptores -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="preceptores" element={<Preceptores />} />
        </Route>

        {/* Mesas de examen -> SOLO ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="mesa-de-examen" element={<Mesas />} />
        </Route>

        {/* Reportes -> ADMIN, DOCENTE, PRECEPTOR */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN', 'ROLE_DOCENTE', 'ROLE_PRECEPTOR']} />}>
          <Route path="reportes" element={<Reportes />} />
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
  );
}

export default AppRoutes;
