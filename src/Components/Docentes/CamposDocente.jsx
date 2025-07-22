import React from 'react';

export default function CamposDocente({ entidad, onChange, materias = [] }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...entidad, [name]: value });
  };

  return (
    <div className="grid gap-3">
      <input type="text" name="nombre" placeholder="Nombre" value={entidad.nombre || ''} onChange={handleChange} />
      <input type="text" name="apellido" placeholder="Apellido" value={entidad.apellido || ''} onChange={handleChange} />
      <input type="text" name="dni" placeholder="DNI" value={entidad.dni || ''} onChange={handleChange} />
      <input type="email" name="email" placeholder="Email" value={entidad.email || ''} onChange={handleChange} />
      <input type="text" name="telefono" placeholder="Teléfono" value={entidad.telefono || ''} onChange={handleChange} />
      <input type="text" name="direccion" placeholder="Dirección" value={entidad.direccion || ''} onChange={handleChange} />
      <input type="text" name="ciudad" placeholder="Ciudad" value={entidad.ciudad || ''} onChange={handleChange} />

      <label>Materias asignadas</label>
      <select name="materia" value={entidad.materia || ''} onChange={handleChange}>
        <option value="">Seleccionar materia</option>
        {materias.map((materia) => (
          <option key={materia.id} value={materia.id}>
            {materia.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
