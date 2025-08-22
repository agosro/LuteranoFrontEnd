import { FaEye, FaEdit, FaTrash } from 'react-icons/fa';

export default function ActionButtons({ onView, onEdit, onDelete, extraButtons = [] }) {
  return (
    <div className="d-flex justify-content-center gap-2">
      <button className="btn btn-sm btn-outline-primary" onClick={onView} title="Ver">
        <FaEye />
      </button>
      <button className="btn btn-sm btn-outline-warning" onClick={onEdit} title="Editar">
        <FaEdit />
      </button>
      <button className="btn btn-sm btn-outline-danger" onClick={onDelete} title="Eliminar">
        <FaTrash />
      </button>

       {extraButtons.map((btn, index) => (
        <button
          key={index}
          className="btn btn-sm btn-outline-info"
          onClick={btn.onClick}
          title={btn.title}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}
