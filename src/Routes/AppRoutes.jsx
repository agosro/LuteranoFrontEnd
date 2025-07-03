import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext.jsx';

import Login from '../Pages/Login.jsx';
import Inicio from '../Pages/Inicio.jsx';
import AlumnosLista from '../Pages/Alumnos.jsx';
import Docentes from '../Pages/Docentes.jsx';
import Usuarios from '../Pages/Usuarios.jsx';
import Materias from '../Pages/Materias.jsx';
import Cursos from '../Pages/Cursos.jsx';
import Mesas from '../Pages/Mesas.jsx';
import Reportes from '../Pages/Reportes.jsx';
import EspaciosAulicos from '../Pages/EspaciosAulicos.jsx';

import DashboardLayout from '../Layout/DashboardLayout.jsx';
import PrivateRoute from './PrivateRoute';

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

      {/* Layout con sidebar + header + footer */}
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Inicio />} />
        <Route path="inicio" element={<Inicio />} />


        {/* Solo ADMIN puede ver lista de alumnos */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="alumnos/lista" element={<AlumnosLista />} />
        </Route>

        {/* Docentes */}
        <Route path="docentes" element={<Docentes />} />

        {/* Usuarios solo ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="usuarios" element={<Usuarios />} />
        </Route>

        {/* Materias y Cursos, acceso libre */}
        <Route path="materias" element={<Materias />} />
        <Route path="cursos" element={<Cursos />} />

        {/* Mesas de examen solo ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="mesa-de-examen" element={<Mesas />} />
        </Route>

        {/* Reportes solo ADMIN */}
        <Route element={<PrivateRoute allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="reportes" element={<Reportes />} />
        </Route>

        {/* Espacios Áulicos libre */}
        <Route path="espacios-aulicos" element={<EspaciosAulicos />} />
      </Route>

      <Route path="*" element={<Navigate to="/inicio" />} />
    </Routes>
  );
}

export default AppRoutes;