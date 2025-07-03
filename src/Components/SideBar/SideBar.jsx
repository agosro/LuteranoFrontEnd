import React, { useState } from 'react';
import './SideBar.css'
import { useAuth } from '../../Context/AuthContext';
import { Link } from 'react-router-dom';
import {
  FaHome, FaUsers, FaBook, FaChalkboardTeacher,
  FaTable, FaChartBar, FaDoorOpen, FaCaretDown, FaCaretUp
} from 'react-icons/fa';

export default function SidebarLayout() {
  const { user } = useAuth();

  const isAdmin = user?.rol === 'ROLE_ADMIN';
  const isDocente = user?.rol === 'docente';

  const [alumnosOpen, setAlumnosOpen] = useState(false);
  const toggleAlumnos = () => setAlumnosOpen(!alumnosOpen);

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav className="bg-dark text-white p-3 d-flex flex-column" style={{ width: '250px', marginTop: '100px'}}>
        <ul className="nav flex-column">
          <li className="nav-item mb-2" >
            <Link className="nav-link text-white" to="/inicio">
              <FaHome className="me-2" /> Inicio
            </Link>
          </li>

           {/* Usuarios */}
          {isAdmin && (
            <li className="nav-item mb-2" >
              <Link className="nav-link text-white" to="/usuarios">
                <FaUsers className="me-2" /> Usuarios
              </Link>
            </li>
          )}
          {/* Menú desplegable ALUMNOS */}
          <li className="nav-item mb-2">
            <button
              onClick={toggleAlumnos}
              className="btn btn-link nav-link text-white d-flex align-items-center w-100"
              type="button"
              aria-expanded={alumnosOpen}
              style={{ gap: '0.5rem' }}
            >
              <span>
                <FaUsers className="me-2" />
                Alumnos
              </span>
              {alumnosOpen ? <FaCaretUp /> : <FaCaretDown />}
            </button>
            {alumnosOpen && (
              <ul className="nav flex-column ms-3">
                {isAdmin && (
                  <li>
                    <Link className="nav-link text-white" to="/alumnos/lista">
                      Lista de alumnos
                    </Link>
                  </li>
                )}
                <li>
                  <Link className="nav-link text-white" to="/alumnos/cargar">
                    Cargar calificaciones
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/* Docentes */}
          <li className="nav-item mb-2" >
            <Link className="nav-link text-white" to="/docentes">
              <FaChalkboardTeacher className="me-2" /> Docentes
            </Link>
          </li>


          {/* Cursos */}
          <li className="nav-item mb-2" >
            <Link className="nav-link text-white" to="/cursos">
              <FaBook className="me-2" /> Cursos
            </Link>
          </li>

          {/* Materias */}
          <li className="nav-item mb-2" >
            <Link className="nav-link text-white" to="/materias">
              <FaBook className="me-2" /> Materias
            </Link>
          </li>

          {/* Mesas de Examen */}
          {isAdmin && (
            <li className="nav-item mb-2">
              <Link className="nav-link text-white" to="/mesa-de-examen">
                <FaTable className="me-2" /> Mesas de Examen
              </Link>
            </li>
          )}

          {/* Reportes */}
          {isAdmin && (
            <li className="nav-item mb-2">
              <Link className="nav-link text-white" to="/reportes">
                <FaChartBar className="me-2" /> Reportes
              </Link>
            </li>
          )}

          {/* Espacio Áulico */}
          <li className="nav-item mb-2">
            <Link className="nav-link text-white" to="/espacios-aulicos">
              <FaDoorOpen className="me-2" /> Espacios Áulicos
            </Link>
          </li>
        </ul>
      </nav>

      {/* Contenido principal */}
      <main className="flex-grow-1 p-3">
      </main>
    </div>
  );
}