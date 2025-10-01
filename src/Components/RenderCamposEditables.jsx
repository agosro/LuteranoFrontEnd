import React from "react";
import { isoToInputLocal } from "../utils/fechas";

export default function RenderCamposEditable({ campos, formData, setFormData }) {
  return (
    <form className="row g-3">
      {campos.map((campo) => (
        <div key={campo.name} className="col-md-6">
          <label className="form-label fw-bold">{campo.label}</label>

          {campo.type === "select" ? (
            <select
              className="form-control"
              value={formData[campo.name] || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, [campo.name]: e.target.value }))
              }
            >
              <option value="">Seleccionar...</option>
              {campo.opciones?.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          ) : campo.type === "date" ? (
            <input
              type="date"
              className="form-control"
              value={isoToInputLocal(formData[campo.name])}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, [campo.name]: e.target.value }))
              }
            />
          ) : (
            <input
              type={campo.type}
              className="form-control"
              value={formData[campo.name] || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, [campo.name]: e.target.value }))
              }
            />
          )}
        </div>
      ))}
    </form>
  );
}
