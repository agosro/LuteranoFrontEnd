# 📚 Sistema de Gestión Escolar

Este proyecto es un **Sistema de Gestión Escolar** desarrollado con **React (frontend)** y **Spring Boot (backend)**.  
El objetivo es brindar una solución integral para instituciones educativas, permitiendo gestionar alumnos, docentes, preceptores, materias, calificaciones, reportes y usuarios con distintos roles.

---

## 🚀 Tecnologías utilizadas

### 🔹 Frontend
- React + Vite ⚡
- React Router DOM
- Context API (autenticación y roles)
- Bootstrap / CSS
- React Icons
- React Toastify

### 🔹 Backend
- Spring Boot
- Spring Data JPA
- Spring Security con JWT
- MySQL
- Lombok
- Validation

---

## ✨ Funcionalidades principales

- **Gestión de Usuarios**  
  Creación, edición y eliminación de usuarios con roles (`ROLE_ADMIN`, `ROLE_DOCENTE`, `ROLE_PRECEPTOR`, etc.).

- **Gestión de Docentes**  
  Administración de datos personales, contacto, materias asignadas, disponibilidad y desempeño.

- **Gestión de Alumnos**  
  Registro de información académica y personal, tutor, legajo y regularidad.

- **Gestión de Materias y Cursos**  
  Creación de materias, asignación de docentes y organización de cursos/divisiones.

- **Preceptores**  
  Asignación de preceptores a cursos y seguimiento de alumnos.

- **Reportes Académicos**  
  - Legajo de alumnos  
  - Alumnos libres  
  - Notas por período y materia  
  - Asistencia y llegadas tarde  
  - Ranking de alumnos  
  - Informe anual de desempeño docente  
  - Carga horaria docente  
  - Y más...

- **Autenticación y Seguridad**  
  Login con JWT y control de accesos según el rol.

---

## 📂 Estructura del proyecto

```plaintext
/frontend
├── src
│ ├── Components
│ ├── Context
│ ├── Pages
│ ├── Routes
│ ├── Services
│ ├── App.jsx
│ └── main.jsx
```
---

## 🔐 Configuración de entorno (.env)

El frontend utiliza variables de entorno cargadas por **Vite**. Para evitar hardcodear URLs y facilitar despliegues se centralizó el acceso a la API con un proxy y un `httpClient`.

### Archivos

| Archivo | Se trackea en git | Uso |
|---------|-------------------|-----|
| `.env.example` | Sí | Plantilla de referencia. No contiene secretos. |
| `.env.local` | No | Desarrollo local (se carga automáticamente). |
| `.env` | No | Deploy en servidores / CI (build con valores de producción). |

### Pasos para desarrollo local
1. Copiar el archivo de ejemplo:
   ```bash
   cp .env.example .env.local
   ```
2. Ajustar la URL del backend si no es `http://localhost:8080`:
   ```env
   VITE_API_URL=http://localhost:8080
   ```
3. Iniciar el backend (Spring Boot) en el puerto configurado.
4. Correr el frontend con Vite; las peticiones se hacen a rutas que comienzan con `/api` y el **proxy de desarrollo** las redirige automáticamente a `VITE_API_URL`.

### ¿Cómo funciona el proxy?
En `vite.config.js` se configuró:

```js
server: {
  proxy: {
    '/api': {
      target: process.env.VITE_API_URL, // cargado vía loadEnv
      changeOrigin: true,
      secure: false,
    }
  }
}
```

Durante el build de producción el `httpClient` elimina el prefijo `/api` y llama directamente a la URL base (`VITE_API_URL`). Esto evita CORS en desarrollo y mantiene URLs limpias en producción.

### Agregar nuevas variables
Definí la clave en `.env.example` y luego replicala en tu `.env.local` o entorno de deploy. Ejemplo:
```env
VITE_FEATURE_FLAG_REPORTES=true
```
En código: `import.meta.env.VITE_FEATURE_FLAG_REPORTES`.

### Buenas prácticas
- Nunca commitear `.env` reales (se ignoran en `.gitignore`).
- Mantener actualizado `.env.example` para que cualquiera pueda iniciar rápido.
- Usar solo el prefijo `VITE_` (requisito de Vite para exponer la variable al código del cliente).
- Evitar secretos sensibles (tokens privados) en el frontend; usar el backend como intermediario.

### Token y autenticación
El `httpClient` obtiene el token desde `localStorage.user.token` y lo agrega como `Authorization: Bearer ...`. Ante un `401` limpia sesión y redirige a `/login`.

---

## 🧑‍💻 Equipo de desarrollo

👩‍💻 Agostina Torres – Frontend 

👨‍💻 German Monti Rubio – Backend / Base de datos

👨‍💻 Rocio Cordoba – Backend 
