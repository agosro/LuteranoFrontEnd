import React from "react";
import Select from "react-select";
import { isoToInputLocal } from "../../utils/fechas";

export default function ModalCrearEntidad({
  show,
  onClose,
  onSubmit,
  campos = [], // default para evitar undefined
  titulo = "Crear",
  formData = {}, // default para evitar undefined
  onInputChange,
  onUsuarioChange,
}) {
  if (!show) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onInputChange(name, type === "checkbox" ? checked : value);
  };

  const handleSelectChange = (selectedOptions, name) => {
    if (name === "usuarioId" && onUsuarioChange) {
      const usuarioId = selectedOptions ? selectedOptions.value : "";
      onUsuarioChange(usuarioId);
    } else {
      onInputChange(
        name,
        selectedOptions
          ? Array.isArray(selectedOptions)
            ? selectedOptions.map((o) => o.value)
            : selectedOptions.value
          : ""
      );
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h5 className="mb-3">{titulo}</h5>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(formData);
          }}
        >
          {Array.isArray(campos) && campos.filter(Boolean).map(({ name, label, type, opciones, disabled, required }) => (
            <div className="mb-3" key={name}>
              <label htmlFor={name} className="form-label">
                {label}
                 {required && <span style={{ color: 'red' }}> *</span>}
              </label>

              {type === "multiselect" ? (
                <Select
                  isMulti
                  options={opciones || []}
                  value={opciones ? opciones.filter((opt) =>
                    formData[name]?.includes(opt.value)
                  ) : []}
                  onChange={(selected) => handleSelectChange(selected, name)}
                  classNamePrefix="react-select"
                  placeholder={`Seleccione ${label.toLowerCase()}...`}
                  isDisabled={disabled}
                />
              ) : type === "select" ? (
                <Select
                  options={opciones || []}
                  value={opciones ? opciones.find((opt) => opt.value === formData[name]) || null : null}
                  onChange={(selected) => handleSelectChange(selected, name)}
                  classNamePrefix="react-select"
                  placeholder={`Seleccione ${label.toLowerCase()}...`}
                  isDisabled={disabled}
                />
              ) : type === "date" ? (
                <input
                  id={name}
                  name={name}
                  type="date"
                  className="form-control"
                  value={isoToInputLocal(formData[name])}
                  onChange={handleChange}
                  required={required}
                  disabled={disabled}
                />
              ) : (
                <input
                  id={name}
                  name={name}
                  type={type || "text"}
                  className="form-control"
                  value={formData[name] || ""}
                  onChange={handleChange}
                  required={required}
                  disabled={disabled}
                />
              )}
            </div>
          ))}

          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
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