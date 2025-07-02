import { useAuth } from '../../Context/AuthContext';
import { Link } from 'react-router-dom';
import {
  FaHome, FaUsers, FaBook, FaChalkboardTeacher,
  FaTable, FaChartBar, FaDoorOpen
} from 'react-icons/fa';

export default function Sidebar() {
  const { user } = useAuth();

  const isAdmin = user?.rol === 'ROLE_ADMIN';
  const isDocente = user?.rol === 'docente';

  return (
    <div className="bg-dark text-white p-3 vh-100" style={{ width: '250px' }}>
      <ul className="nav flex-column">
        <li className="nav-item">
          <Link className="nav-link text-white" to="/inicio">
            <FaHome className="me-2" /> Inicio
          </Link>
        </li>

        {/* Alumnos */}
        <li className="nav-item">
          <span className="nav-link text-white">
            <FaUsers className="me-2" /> Alumnos
          </span>
          <ul className="nav flex-column ms-3">
            <li>
              <Link className="nav-link text-white" to="/alumnos/cargar">
                Cargar calificaciones
              </Link>
            </li>
            {isAdmin && (
              <li>
                <Link className="nav-link text-white" to="/alumnos/lista">
                  Lista de alumnos
                </Link>
              </li>
            )}
          </ul>
        </li>

        {/* Docentes */}
        <li className="nav-item">
          <Link className="nav-link text-white" to="/docentes">
            <FaChalkboardTeacher className="me-2" /> Docentes
          </Link>
        </li>

        {/* Usuarios */}
        {isAdmin && (
          <li className="nav-item">
            <Link className="nav-link text-white" to="/usuarios">
              <FaUsers className="me-2" /> Usuarios
            </Link>
          </li>
        )}

        {/* Cursos */}
        <li className="nav-item">
          <Link className="nav-link text-white" to="/cursos">
            <FaBook className="me-2" /> Cursos
          </Link>
        </li>

        {/* Materias */}
        <li className="nav-item">
          <Link className="nav-link text-white" to="/materias">
            <FaBook className="me-2" /> Materias
          </Link>
        </li>

        {/* Mesas de Examen */}
        {isAdmin && (
          <li className="nav-item">
            <Link className="nav-link text-white" to="/mesa-de-examen">
              <FaTable className="me-2" /> Mesas de Examen
            </Link>
          </li>
        )}

        {/* Reportes */}
        {isAdmin && (
          <li className="nav-item">
            <Link className="nav-link text-white" to="/reportes">
              <FaChartBar className="me-2" /> Reportes
            </Link>
          </li>
        )}

        {/* Espacio Áulico */}
        <li className="nav-item">
          <Link className="nav-link text-white" to="/espacios-aulicos">
            <FaDoorOpen className="me-2" /> Espacios Áulicos
          </Link>
        </li>
      </ul>
    </div>
  );
}
