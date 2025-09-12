import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./tabla.css"; // estilo compartido con tabla

export default function FiltroGenerico({ campos = [], rutaDestino, botonCrear }) {
  const navigate = useNavigate();

  // Estado inicial vacío para cada campo
  const inicialState = campos.reduce((acc, campo) => ({ ...acc, [campo.name]: "" }), {});
  const [filtros, setFiltros] = useState(inicialState);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros({ ...filtros, [name]: value });
  };

  // Al tocar "Listar", enviamos los filtros por state
  const handleListar = () => {
    navigate(rutaDestino, { state: { filtros } });
  };

  const handleReset = () => {
    setFiltros(inicialState);
  };

  return (
    <div className="tabla-visual-externa">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">Filtros</h2>
          {botonCrear && <div>{botonCrear}</div>}
        </div>

        <div className="row g-3 mb-4">
          {campos.map((campo) => (
            <div key={campo.name} className="col-md-4">
              <label className="form-label fw-bold">{campo.label}</label>
              {campo.type === "select" ? (
                <select
                  name={campo.name}
                  value={filtros[campo.name]}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Seleccionar {campo.label}</option>
                  {campo.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={campo.type || "text"}
                  name={campo.name}
                  placeholder={campo.label}
                  value={filtros[campo.name]}
                  onChange={handleChange}
                  className="form-control"
                />
              )}
            </div>
          ))}
        </div>

        <div className="d-flex gap-2">
          <button onClick={handleListar} className="btn btn-primary">
            Listar
          </button>
          <button onClick={handleReset} className="btn btn-secondary">
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}