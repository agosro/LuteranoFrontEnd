import { useAuth } from '../Context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

export default function PrivateRoute({ allowedRoles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;

  // 🔹 ahora validamos con user.rol
  if (!allowedRoles.includes(user.rol)) {
    return <Navigate to="/inicio" />;
  }

  return <Outlet />;
}