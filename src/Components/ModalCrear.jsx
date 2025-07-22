import React, { useState, useEffect } from "react";

export default function ModalCrearEntidad({ show, onClose, onSubmit, campos = [], titulo = "Crear" }) {
  const [formData, setFormData] = useState({});

  // Solo cuando 'show' cambie (no formData), setea estado inicial
  useEffect(() => {
    if (show) {
      const initialData = {};
      campos.forEach(({ name, default: def }) => {
        initialData[name] = def || "";
      });
      setFormData(initialData);
    }
  }, [show, campos]); // NO poner formData aquí

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.3)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1050,
        padding: "1rem",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "8px",
          boxShadow: "0 0 10px rgba(0,0,0,0.25)",
          maxWidth: "500px",
          width: "100%",
        }}
      >
        <h5 className="mb-3">{titulo}</h5>

        <form onSubmit={handleSubmit}>
          {campos.map(({ name, label, type, opciones }) => (
            <div className="mb-3" key={name}>
              <label htmlFor={name} className="form-label">{label}</label>

              {type === "select" ? (
                <select
                  id={name}
                  name={name}
                  className="form-select"
                  value={formData[name] || ""}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccione...</option>
                  {opciones && opciones.map(opt =>
                    typeof opt === "object" ? (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ) : (
                      <option key={opt} value={opt}>{opt}</option>
                    )
                  )}
                </select>
              ) : (
                <input
                  id={name}
                  name={name}
                  type={type}
                  className="form-control"
                  value={formData[name] || ""}
                  onChange={handleChange}
                  required
                />
              )}
            </div>
          ))}

          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
