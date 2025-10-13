import { FaEye, FaEdit, FaTrash } from "react-icons/fa";

export default function ActionButtons({ onView, onEdit, onDelete, extraButtons = [] }) {
  return (
    <div className="d-flex justify-content-center gap-2">
      {onView && (
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={onView}
          title="Ver"
        >
          <FaEye />
        </button>
      )}

      {onEdit && (
        <button
          className="btn btn-sm btn-outline-warning"
          onClick={onEdit}
          title="Editar"
        >
          <FaEdit />
        </button>
      )}

      {onDelete && (
        <button
          className="btn btn-sm btn-outline-danger"
          onClick={onDelete}
          title="Eliminar"
        >
          <FaTrash />
        </button>
      )}

      {extraButtons.map((btn, index) => {
        const className = `btn btn-sm ${btn.className || "btn-outline-info"}`;
        if (btn.disabled) {
          // Mostrar tooltip en el contenedor, no en el botón disabled
          return (
            <span key={index} className="d-inline-block" title={btn.title}>
              <button
                type="button"
                className={className}
                disabled
                tabIndex={-1}
                aria-disabled="true"
                onClick={(e) => e.preventDefault()}
              >
                {btn.icon}
              </button>
            </span>
          );
        }
        return (
          <button
            key={index}
            type="button"
            className={className}
            onClick={btn.onClick}
            title={btn.title}
          >
            {btn.icon}
          </button>
        );
      })}
    </div>
  );
}
