// src/routes/PrivateRoute.jsx
import { useAuth } from '../Context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

export default function PrivateRoute({ allowedRoles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.rol)) return <Navigate to="/inicio" />;

  return <Outlet />;
}
