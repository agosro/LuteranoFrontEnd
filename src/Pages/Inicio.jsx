// src/Pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../Context/AuthContext";

// 👇 importás tus services ya existentes
import { listarAlumnos } from "../Services/AlumnoService";
import { listarDocentes } from "../Services/DocenteService";
import { listarCursos } from "../Services/CursoService";

import "bootstrap/dist/css/bootstrap.min.css";

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role || "ROLE_ADMIN"; 

  return (
    <div className="container-fluid p-4">
      <h2 className="mb-4">Bienvenido/a, {user?.name || "Usuario"} 👋</h2>

      {role === "ROLE_ADMIN" && <DashboardAdmin token={user?.token} />}
    </div>
  );
}

// 🔹 Dashboard del ADMIN conectado al backend
function DashboardAdmin({ token }) {
  const [stats, setStats] = useState({
    alumnos: 0,
    docentes: 0,
    cursos: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const alumnos = await listarAlumnos(token);
        const docentes = await listarDocentes(token);
        const cursos = await listarCursos(token);

        setStats({
          alumnos: alumnos.length,
          docentes: docentes.length,
          cursos: cursos.length,
        });
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) return <p>Cargando datos...</p>;

  return (
    <>
      <div className="row g-4 mb-4">
        <Card titulo="Alumnos" valor={stats.alumnos} />
        <Card titulo="Docentes" valor={stats.docentes} />
        <Card titulo="Cursos" valor={stats.cursos} />
        <Card titulo="Reportes" valor="12" /> {/* fijo por ahora */}
      </div>
      <div className="row g-4">
        <Eventos />
        <Reportes />
      </div>
    </>
  );
}

// 🔹 Reutilizables
function Card({ titulo, valor }) {
  return (
    <div className="col-md-3">
      <div className="card text-center shadow-sm border-0">
        <div className="card-body">
          <h5 className="card-title">{titulo}</h5>
          <h3>{valor}</h3>
        </div>
      </div>
    </div>
  );
}

function Eventos() {
  const eventos = [
    { fecha: "2025-09-20", titulo: "Examen de Matemática 5to A" },
    { fecha: "2025-09-22", titulo: "Reunión Docente" },
    { fecha: "2025-09-25", titulo: "Entrega de Boletines" },
  ];

  return (
    <div className="col-md-6">
      <div className="card shadow-sm border-0">
        <div className="card-header bg-primary text-white">
          Próximos Eventos
        </div>
        <ul className="list-group list-group-flush">
          {eventos.map((evento, i) => (
            <li key={i} className="list-group-item">
              <strong>{evento.fecha}</strong> - {evento.titulo}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Reportes() {
  const reportes = [
    "Alumnos con bajo rendimiento",
    "Alumnos que llegan tarde regularmente",
    "Disponibilidad docente",
  ];

  return (
    <div className="col-md-6">
      <div className="card shadow-sm border-0">
        <div className="card-header bg-success text-white">
          Reportes Destacados
        </div>
        <ul className="list-group list-group-flush">
          {reportes.map((r, i) => (
            <li
              key={i}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              {r}
              <button className="btn btn-sm btn-outline-primary">Ver</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
