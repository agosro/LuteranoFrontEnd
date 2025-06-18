import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext.jsx'

import Login from '../Pages/Login.jsx'
import Dashboard from '../pages/Dashboard';
import Inicio from '../pages/Inicio';
import Alumnos from '../pages/Alumnos';
import Docentes from '../pages/Docentes';
import Usuarios from '../pages/Usuarios';
import Mesas from '../pages/Mesas';

function AppRoutes() {
    const { user } = useAuth();

    if (!user) {
        return <Routes><Route path="*" element={<Navigate to="/login" />} /></Routes>;
    }

    return (
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />}>
            <Route index element={<Inicio />} />
            <Route path="alumnos" element={<Alumnos />} />

            {user.rol === 'ADMIN' && (
            <>
                <Route path="docentes" element={<Docentes />} />
                <Route path="usuarios" element={<Usuarios />} />
            </>
    )}

        {user.rol === 'DOCENTE' && (
            <Route path="mesas" element={<Mesas />} />
        )}
        </Route>
    </Routes>
    );
}

export default AppRoutes;
