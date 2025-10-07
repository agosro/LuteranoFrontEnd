import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Breadcrumbs({ curso }) {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  const esHorarioCurso =
    pathnames.includes("cursos") && pathnames.includes("horario");

  return (
    <nav aria-label="breadcrumb" className="mb-2">
      <ol className="breadcrumb m-0 p-0">
        <li className="breadcrumb-item">
          <Link to="/inicio">Inicio</Link>
        </li>

        {esHorarioCurso ? (
          <>
            <li className="breadcrumb-item">
              <Link to="/cursos">Cursos</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Horario {curso?.anio}°{curso?.division}
            </li>
          </>
        ) : (
          pathnames.map((name, index) => {
            const routeTo = "/" + pathnames.slice(0, index + 1).join("/");
            const isLast = index === pathnames.length - 1;
            return isLast ? (
              <li
                key={index}
                className="breadcrumb-item active"
                aria-current="page"
              >
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </li>
            ) : (
              <li key={index} className="breadcrumb-item">
                <Link to={routeTo}>
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </Link>
              </li>
            );
          })
        )}
      </ol>
    </nav>
  );
}
