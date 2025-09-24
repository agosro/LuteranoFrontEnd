import './SideBar.css';
import { useAuth } from '../../Context/AuthContext';
import { Link } from 'react-router-dom';
import {
  FaHome, FaUsers, FaBook, FaChalkboardTeacher,
  FaTable, FaChartBar, FaDoorOpen, FaCaretDown, FaCaretUp, FaCog
} from 'react-icons/fa';
import { useState } from 'react';

export default function SidebarLayout() {
  const { user } = useAuth();

  // 🔹 Flags de roles
  const isAdmin = user?.rol === 'ROLE_ADMIN';
  const isDocente = user?.rol === 'ROLE_DOCENTE';
  const isPreceptor = user?.rol === 'ROLE_PRECEPTOR';

  const [openPersonas, setOpenPersonas] = useState(false);
  const [openAcademico, setOpenAcademico] = useState(false);
  const [openOrganizacion, setOpenOrganizacion] = useState(false);
  const [openEspacios, setOpenEspacios] = useState(false);
  const [openConfig, setOpenConfig] = useState(false);

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <nav
        className="bg-dark text-white p-3 d-flex flex-column"
        style={{ width: '250px', marginTop: '100px' }}
      >
        <ul className="nav flex-column">
          {/* Inicio */}
          <li className="nav-item mb-2">
            <Link className="nav-link text-white" to="/inicio">
              <FaHome className="me-2" /> Inicio
            </Link>
          </li>

          {/* Personas -> SOLO ADMIN */}
          {isAdmin && (
            <li className="nav-item mb-2">
              <button
                className="btn btn-toggle align-items-center text-white w-100 text-start"
                onClick={() => setOpenPersonas(!openPersonas)}
              >
                👥 Personas {openPersonas ? <FaCaretUp /> : <FaCaretDown />}
              </button>
              {openPersonas && (
                <ul className="nav flex-column ms-3 mt-2">
                  <li>
                    <Link className="nav-link text-white" to="/usuarios">
                      <FaUsers className="me-2" /> Usuarios
                    </Link>
                  </li>
                  <li>
                    <Link className="nav-link text-white" to="/alumnos">
                      <FaChalkboardTeacher className="me-2" /> Alumnos
                    </Link>
                  </li>
                  <li>
                    <Link className="nav-link text-white" to="/docentes">
                      <FaChalkboardTeacher className="me-2" /> Docentes
                    </Link>
                  </li>
                  <li>
                    <Link className="nav-link text-white" to="/preceptores">
                      <FaChalkboardTeacher className="me-2" /> Preceptores
                    </Link>
                  </li>
                  <li>
                    <Link className="nav-link text-white" to="/tutores">
                      <FaUsers className="me-2" /> Tutores
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          )}

          {/* Académico */}
          <li className="nav-item mb-2">
            <button
              className="btn btn-toggle align-items-center text-white w-100 text-start"
              onClick={() => setOpenAcademico(!openAcademico)}
            >
              📚 Académico {openAcademico ? <FaCaretUp /> : <FaCaretDown />}
            </button>
            {openAcademico && (
              <ul className="nav flex-column ms-3 mt-2">
                {/* Cursos/Materias -> SOLO ADMIN */}
                {isAdmin && (
                  <>
                    <li>
                      <Link className="nav-link text-white" to="/cursos">
                        <FaBook className="me-2" /> Cursos
                      </Link>
                    </li>
                    <li>
                      <Link className="nav-link text-white" to="/materias">
                        <FaBook className="me-2" /> Materias
                      </Link>
                    </li>
                    <li>
                      <Link className="nav-link text-white" to="/mesa-de-examen">
                        <FaTable className="me-2" /> Mesas de Examen
                      </Link>
                    </li>
                  </>
                )}

                {/* Calificaciones -> DOCENTE y ADMIN */}
                {(isAdmin || isDocente) && (
                  <li>
                    <Link className="nav-link text-white" to="/calificaciones">
                      <FaTable className="me-2" /> Calificaciones
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </li>

          {/* Organización */}
          <li className="nav-item mb-2">
            <button
              className="btn btn-toggle align-items-center text-white w-100 text-start"
              onClick={() => setOpenOrganizacion(!openOrganizacion)}
            >
              🏫 Organización {openOrganizacion ? <FaCaretUp /> : <FaCaretDown />}
            </button>
            {openOrganizacion && (
              <ul className="nav flex-column ms-3 mt-2">
                {/* Aulas -> SOLO ADMIN */}
                {isAdmin && (
                  <li>
                    <Link className="nav-link text-white" to="/aulas">
                      <FaDoorOpen className="me-2" /> Aulas
                    </Link>
                  </li>
                )}

                {/* Espacios Áulicos -> Reservar/Mis Reservas: ADMIN, DOCENTE, PRECEPTOR */}
                <li>
                  <button
                    className="btn btn-toggle align-items-center text-white w-100 text-start"
                    onClick={() => setOpenEspacios(!openEspacios)}
                  >
                    <div className="d-flex align-items-center">
                      <FaDoorOpen className="me-2" /> Espacios Áulicos
                    </div>
                    {openEspacios ? <FaCaretUp /> : <FaCaretDown />}
                  </button>
                  {openEspacios && (
                    <ul className="nav flex-column ms-3 mt-2">
                      {(isAdmin || isDocente || isPreceptor) && (
                        <>
                          <li>
                            <Link
                              className="nav-link text-white"
                              to="/espacios-aulicos/reservar"
                            >
                              Reservar
                            </Link>
                          </li>
                          <li>
                            <Link
                              className="nav-link text-white"
                              to="/espacios-aulicos/mis-reservas"
                            >
                              Mis Reservas
                            </Link>
                          </li>
                        </>
                      )}
                      {/* Gestionar -> SOLO ADMIN */}
                      {isAdmin && (
                        <li>
                          <Link
                            className="nav-link text-white"
                            to="/espacios-aulicos/gestionar"
                          >
                            Gestionar
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </li>

                {/* Asistencias -> PRECEPTOR y ADMIN */}
                {(isAdmin || isPreceptor) && (
                  <>
                    <li>
                      <Link
                        className="nav-link text-white"
                        to="/asistencia-docente"
                      >
                        <FaTable className="me-2" /> Asistencia Docente
                      </Link>
                    </li>
                    <li>
                      <Link
                        className="nav-link text-white"
                        to="/asistencia-alumno"
                      >
                        <FaTable className="me-2" /> Asistencia Alumno
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            )}
          </li>

          {/* Reportes -> ADMIN, DOCENTE, PRECEPTOR */}
          {(isAdmin || isDocente || isPreceptor) && (
            <li className="nav-item mb-2">
              <Link className="nav-link text-white" to="/reportes">
                <FaChartBar className="me-2" /> Reportes
              </Link>
            </li>
          )}

          {/* Configuración -> SOLO ADMIN */}
          {isAdmin && (
            <li className="nav-item mb-2">
              <button
                className="btn btn-toggle align-items-center text-white w-100 text-start"
                onClick={() => setOpenConfig(!openConfig)}
              >
                <FaCog className="me-2" /> Configuración{' '}
                {openConfig ? <FaCaretUp /> : <FaCaretDown />}
              </button>
              {openConfig && (
                <ul className="nav flex-column ms-3 mt-2">
                  <li className="nav-link text-white-50">Sin opciones aún</li>
                </ul>
              )}
            </li>
          )}
        </ul>
      </nav>

      <main className="flex-grow-1 p-3"></main>
    </div>
  );
}
