import React from 'react';

export default function Paginacion({ paginaActual, totalPaginas, onPaginaChange }) {
  return (
    <nav aria-label="Paginación">
      <ul className="pagination justify-content-center">
        <li className={`page-item ${paginaActual === 1 ? "disabled" : ""}`}>
          <button
            className="page-link"
            onClick={() => onPaginaChange(paginaActual - 1)}
            aria-label="Anterior"
          >
            &laquo;
          </button>
        </li>

        <li className="page-item disabled">
          <span className="page-link">
            Página {paginaActual} de {totalPaginas}
          </span>
        </li>

        <li className={`page-item ${paginaActual === totalPaginas ? "disabled" : ""}`}>
          <button
            className="page-link"
            onClick={() => onPaginaChange(paginaActual + 1)}
            aria-label="Siguiente"
          >
            &raquo;
          </button>
        </li>
      </ul>
    </nav>
  );
}