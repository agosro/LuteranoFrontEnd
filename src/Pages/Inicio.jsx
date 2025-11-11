// src/Pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../Context/AuthContext";
// Dashboard inicial: evolucionará a estructura modular con tarjetas y charts.
// Mantener nombre de archivo y ruta '/inicio' según requerimiento.

// ✅ Services existentes
import { listarAlumnos, listarAlumnosEgresados, listarAlumnosExcluidos } from "../Services/AlumnoService";
import { listarDocentes } from "../Services/DocenteService";
import { listarCursos, listarCursosPorDocente, listarCursosPorPreceptor } from "../Services/CursoService";
import { listarReservas } from "../Services/ReservaService";
import { listarAsistenciaCursoPorFecha } from "../Services/AsistenciaAlumnoService";

import "bootstrap/dist/css/bootstrap.min.css";
import KpiCard from "../Components/Dashboard/KpiCard.jsx";
import ChartCard from "../Components/Dashboard/ChartCard.jsx";
import LoadingSkeleton from "../Components/Dashboard/LoadingSkeleton.jsx";
import SimplePie from "../Components/Dashboard/SimplePie.jsx";
import SimpleBar from "../Components/Dashboard/SimpleBar.jsx";
import useCachedFetch from "../Components/Dashboard/useCachedFetch.js";
import RefreshButton from "../Components/Dashboard/RefreshButton.jsx";

export default function Inicio() {
  const { user } = useAuth();
  const rol = user?.rol || "ROLE_ADMIN";

  return (
    <div className="container-fluid p-4">
      <WelcomeHeader user={user} />

      {rol === "ROLE_ADMIN" && <DashboardAdmin token={user?.token} />}
      {rol === "ROLE_DIRECTOR" && <DashboardDirector token={user?.token} />}
      {rol === "ROLE_DOCENTE" && (
        <DashboardDocente token={user?.token} idDocente={user?.docenteId} />
      )}
      {rol === "ROLE_PRECEPTOR" && (
        <DashboardPreceptor token={user?.token} idPreceptor={user?.preceptorId} />
      )}
      {rol === "ROLE_AUXILIAR" && <DashboardAuxiliar token={user?.token} />}
    </div>
  );
}

//
// 🔹 ADMIN
//
function DashboardAdmin({ token }) {
  const todayISO = new Date().toISOString().slice(0,10)
  const { data, loading, refresh } = useCachedFetch('adminDashboard', async () => {
    const [alumnos, egresados, excluidos, docentes, cursos] = await Promise.all([
      listarAlumnos(token),
      listarAlumnosEgresados(token).catch(() => []),
      listarAlumnosExcluidos(token).catch(() => []),
      listarDocentes(token),
      listarCursos(token),
    ])
    const activos = Math.max(alumnos.length - egresados.length - excluidos.length, 0)
    // Top por año (conteo de cursos por anio)
    const porAnio = new Map()
    for (const c of cursos) {
      const anio = c?.anio ?? 'N/D'
      porAnio.set(anio, (porAnio.get(anio) || 0) + 1)
    }
    const cursosPorAnio = Array.from(porAnio.entries())
      .sort((a,b)=>String(a[0]).localeCompare(String(b[0])))
      .map(([anio, count]) => ({ name: String(anio), value: count }))
    return {
      stats: { alumnos: alumnos.length, docentes: docentes.length, cursos: cursos.length },
      alumnosPie: [
        { name: 'Activos', value: activos },
        { name: 'Egresados', value: egresados.length },
        { name: 'Excluidos', value: excluidos.length },
      ],
      cursosDistribucion: cursosPorAnio
    }
  }, 5 * 60_000) // TTL 5 min

  if (loading || !data) return <LoadingSkeleton blocks={4} />;
  const { stats, alumnosPie, cursosDistribucion } = data

  return (
    <>
      <div className="row g-4 mb-4">
        <div className="col-md-3"><KpiCard title="Alumnos" value={stats.alumnos} /></div>
        <div className="col-md-3"><KpiCard title="Docentes" value={stats.docentes} color="#20c997" /></div>
        <div className="col-md-3"><KpiCard title="Cursos" value={stats.cursos} color="#6f42c1" /></div>
        <div className="col-md-3"><KpiCard title="Fecha" value={todayISO} color="#fd7e14" hint="Hoy" /></div>
      </div>
      <div className="row g-4">
        <Eventos />
        <div className="col-md-6">
          <ChartCard title="Alumnos por estado" right={<RefreshButton onClick={refresh} />}>
            <SimplePie data={alumnosPie || []} />
          </ChartCard>
        </div>
        <div className="col-md-6">
          <ChartCard title="Top cursos por tamaño" right={<small className="text-muted">(Top 10)</small>}>
            <SimpleBar data={cursosDistribucion} />
          </ChartCard>
        </div>
      </div>
    </>
  );
}

// DIRECTOR: similar a Admin pero podría diferir en métricas (placeholder)
function DashboardDirector({ token }) {
  const { data, loading, refresh } = useCachedFetch('directorDashboard', async () => {
    const [alumnos, cursos, rs] = await Promise.all([
      listarAlumnos(token),
      listarCursos(token),
      listarReservas(token).catch(() => null),
    ])
    const lista = rs ? (Array.isArray(rs?.reservas) ? rs.reservas : Array.isArray(rs?.items) ? rs.items : Array.isArray(rs) ? rs : []) : []
    const pendientes = lista.filter(r => (r.estado || r.status || '').toUpperCase() === 'PENDIENTE').length
    return { stats: { alumnos: alumnos.length, cursos: cursos.length, reservasPendientes: pendientes }, reservas: lista.slice(0,5) }
  }, 3*60_000)

  if (loading || !data) return <LoadingSkeleton blocks={4} />;
  const { stats, reservas } = data

  return (
    <>
      <div className="row g-4 mb-4">
        <div className="col-md-3"><KpiCard title="Alumnos" value={stats.alumnos} /></div>
        <div className="col-md-3"><KpiCard title="Cursos" value={stats.cursos} color="#6f42c1" /></div>
        <div className="col-md-3"><KpiCard title="Reservas Pend." value={stats.reservasPendientes} color="#dc3545" /></div>
        <div className="col-md-3"><KpiCard title="Indicadores" value={'OK'} color="#20c997" hint="Demo" /></div>
      </div>
      <div className="row g-4">
        <Eventos />
        <div className="col-md-6">
          <ChartCard title="Reservas recientes" right={<RefreshButton onClick={refresh} />}>
            {reservas.length === 0 && <div className="text-muted">Sin reservas</div>}
            <ul className="list-group list-group-flush">
              {reservas.map((r,i) => (
                <li key={i} className="list-group-item" style={{fontSize:'0.8rem'}}>
                  {(r.aulaNombre || r.espacio || 'Aula')} - {(r.docenteNombre || r.usuarioNombre || 'Usuario')} - {(r.estado || r.status)}
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
      </div>
    </>
  )
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

  if (loading) return <LoadingSkeleton blocks={3} />;

  return (
    <>
      <div className="row g-4 mb-4">
        <div className="col-md-4"><KpiCard title="Mis Cursos" value={cursos.length} /></div>
        <div className="col-md-4"><KpiCard title="Clases Hoy" value="2" color="#20c997" /></div>
        <div className="col-md-4"><KpiCard title="Exámenes por corregir" value="5" color="#dc3545" /></div>
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
  const today = new Date().toISOString().slice(0,10)
  const { data, loading } = useCachedFetch(`preceptorDashboard-${idPreceptor}`, async () => {
    const cursos = await listarCursosPorPreceptor(token, idPreceptor)
    const alumnosTotales = cursos.reduce((acc,c)=>acc+(c.alumnos?.length||0),0)
    // Asistencia hoy por curso (best effort; si falla alguna se ignora)
    const asistenciaPorCurso = await Promise.all(cursos.map(c => listarAsistenciaCursoPorFecha(token, c.id, today).catch(()=>[])))
    const flat = asistenciaPorCurso.flat()
    const inasistenciasHoy = flat.filter(a => ['AUSENTE','TARDE'].includes(a.estado)).length
    return { cursos, alumnosTotales, inasistenciasHoy }
  }, 4*60_000)

  if (loading || !data) return <LoadingSkeleton blocks={3} />;
  const { cursos, alumnosTotales, inasistenciasHoy } = data

  return (
    <>
      <div className="row g-4 mb-4">
        <div className="col-md-4"><KpiCard title="Cursos a cargo" value={cursos.length} /></div>
        <div className="col-md-4"><KpiCard title="Alumnos totales" value={alumnosTotales} color="#6f42c1" /></div>
        <div className="col-md-4"><KpiCard title="Inasistencias hoy" value={inasistenciasHoy} color="#dc3545" hint="Ausentes + Tarde" /></div>
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

// AUXILIAR: foco en reservas, aulas (placeholder sin datos reales aún)
function DashboardAuxiliar({ token }) {
  const today = new Date().toISOString().slice(0,10)
  const { data, loading } = useCachedFetch('auxiliarDashboard', async () => {
    const rs = await listarReservas(token).catch(()=>null)
    const lista = rs ? (Array.isArray(rs?.reservas) ? rs.reservas : Array.isArray(rs?.items) ? rs.items : Array.isArray(rs) ? rs : []) : []
    const hoy = lista.filter(r => (r.fecha || r.dia || '').startsWith(today))
    const pendientes = lista.filter(r => (r.estado || r.status || '').toUpperCase()==='PENDIENTE').length
    // Aulas ocupadas estimadas = reservas aprobadas hoy
    const ocupadas = hoy.filter(r => (r.estado || r.status || '').toUpperCase()==='APROBADA').length
    return { ocupadas, hoyCount: hoy.length, pendientes }
  }, 2*60_000)
  if (loading || !data) return <LoadingSkeleton blocks={3} />
  const { ocupadas, hoyCount, pendientes } = data
  return (
    <>
      <div className="row g-4 mb-4">
        <div className="col-md-4"><KpiCard title="Aulas ocupadas" value={ocupadas} /></div>
        <div className="col-md-4"><KpiCard title="Reservas hoy" value={hoyCount} color="#6f42c1" /></div>
        <div className="col-md-4"><KpiCard title="Pendientes" value={pendientes} color="#dc3545" /></div>
      </div>
      <div className="row g-4">
        <Eventos />
        <Reportes />
      </div>
    </>
  )
}

//
// 🔹 COMPONENTES REUTILIZABLES
//
function WelcomeHeader({ user }) {
  const nombre = (user?.nombre || user?.name || user?.username || 'Usuario')
  const firstName = String(nombre).trim().split(' ')[0] || 'Usuario'
  const roleMap = {
    'ROLE_ADMIN': 'Administrador',
    'ROLE_DIRECTOR': 'Director',
    'ROLE_DOCENTE': 'Docente',
    'ROLE_PRECEPTOR': 'Preceptor',
    'ROLE_AUXILIAR': 'Auxiliar',
  }
  const rolLabel = roleMap[user?.rol] || 'Usuario'

  return (
    <div className="mb-4 p-3 rounded-3 border bg-white shadow-sm">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h3 className="mb-1">Hola, {firstName}</h3>
          <div className="text-muted" style={{maxWidth:'840px'}}>
            Tu panel con información clave según tu rol.
          </div>
        </div>
        <span className="badge text-bg-primary" style={{fontSize:'0.9rem'}}>{rolLabel}</span>
      </div>
    </div>
  )
}

function Eventos() {
  return (
    <div className="col-md-6">
      <ChartCard title="Próximos Eventos" right={<small className="opacity-75">(placeholder)</small>}>
        <div className="text-muted" style={{fontSize:'0.9rem'}}>
          Próximamente: listado dinámico de mesas, reuniones y entregas.
        </div>
      </ChartCard>
    </div>
  );
}

function Reportes() {
  const sample = [
    { name: 'Egresados', value: 10 },
    { name: 'Excluidos', value: 4 },
    { name: 'Activos', value: 120 },
  ]
  return (
    <div className="col-md-6">
      <ChartCard title="Distribución alumnos (demo)">
        <SimplePie data={sample} />
      </ChartCard>
    </div>
  );
}
