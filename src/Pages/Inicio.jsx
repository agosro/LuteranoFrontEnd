// src/Pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { isoToDisplay } from "../utils/fechas";
import { useAuth } from "../Context/AuthContext";

// ✅ Services existentes
import { listarAlumnos } from "../Services/AlumnoService";
import { listarDocentes } from "../Services/DocenteService";
import { listarCursos } from "../Services/CursoService";
import { listarCursosPorDocente } from "../Services/CursoService"; 
import { listarCursosPorPreceptor } from "../Services/CursoService";

import "bootstrap/dist/css/bootstrap.min.css";

export default function Dashboard() {
  const { user } = useAuth();
  const rol = user?.rol || "ROLE_ADMIN";

  return (
    <div className="container-fluid p-4">
      <h2 className="mb-4">Bienvenido/a, {user?.name || "Usuario"} 👋</h2>

      {rol === "ROLE_ADMIN" && <DashboardAdmin token={user?.token} />}
      {rol === "ROLE_DOCENTE" && (
        <DashboardDocente token={user?.token} idDocente={user?.docenteId} />
      )}
      {rol === "ROLE_PRECEPTOR" && (
        <DashboardPreceptor token={user?.token} idPreceptor={user?.preceptorId} />
      )}
    </div>
  );
}

//
// 🔹 ADMIN
//
function DashboardAdmin({ token }) {
  const [stats, setStats] = useState({ alumnos: 0, docentes: 0, cursos: 0 });
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
        console.error("Error cargando dashboard Admin:", error);
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

//
// 🔹 DOCENTE
//
function DashboardDocente({ token, idDocente }) {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await listarCursosPorDocente(token, idDocente);
        setCursos(data);
      } catch (error) {
        console.error("Error cargando dashboard Docente:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [idDocente, token]);

  if (loading) return <p>Cargando datos...</p>;

  return (
    <>
      <div className="row g-4 mb-4">
        <Card titulo="Mis Cursos" valor={cursos.length} />
        <Card titulo="Clases Hoy" valor="2" /> {/* ejemplo */}
        <Card titulo="Exámenes por corregir" valor="5" /> {/* ejemplo */}
      </div>
      <div className="row g-4">
        <div className="col-md-12">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-info text-white">
              Mis Cursos Asignados
            </div>
            <ul className="list-group list-group-flush">
              {cursos.map((c, i) => (
                <li key={i} className="list-group-item">
                  {c.nombre} - {c.division}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

//
// 🔹 PRECEPTOR
//
function DashboardPreceptor({ token, idPreceptor }) {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await listarCursosPorPreceptor(token, idPreceptor);
        setCursos(data);
      } catch (error) {
        console.error("Error cargando dashboard Preceptor:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [idPreceptor, token]);

  if (loading) return <p>Cargando datos...</p>;

  const alumnosTotales = cursos.reduce(
    (acc, c) => acc + (c.alumnos?.length || 0),
    0
  );

  return (
    <>
      <div className="row g-4 mb-4">
        <Card titulo="Cursos a cargo" valor={cursos.length} />
        <Card titulo="Alumnos totales" valor={alumnosTotales} />
        <Card titulo="Inasistencias hoy" valor="12" /> {/* ejemplo */}
      </div>
      <div className="row g-4">
        <div className="col-md-12">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-warning text-dark">
              Cursos a mi cargo
            </div>
            <ul className="list-group list-group-flush">
              {cursos.map((c, i) => (
                <li key={i} className="list-group-item">
                  {c.nombre} - {c.division} ({c.alumnos?.length || 0} alumnos)
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

//
// 🔹 COMPONENTES REUTILIZABLES
//
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
              <strong>{isoToDisplay(evento.fecha)}</strong> - {evento.titulo}
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
