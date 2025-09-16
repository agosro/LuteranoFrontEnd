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

## 🧑‍💻 Equipo de desarrollo

👩‍💻 Agostina Torres – Frontend 

👨‍💻 German Monti Rubio – Backend / Base de datos

👨‍💻 Rocio Cordoba – Backend 
