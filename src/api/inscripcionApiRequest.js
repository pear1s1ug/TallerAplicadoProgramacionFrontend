const BASE = import.meta.env.VITE_API_URL;

const headers = () => {
    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    return {
        "Content-Type": "application/json",
        "X-Tipo-Usuario": usuario.tipoUsuario ?? "",
    };
};

export const getAsignaturasDisponibles = (idAlumno) =>
    fetch(`${BASE}/alumnos/${idAlumno}/asignaturas-disponibles`, { headers: headers() })
        .then((r) => r.json());

export const getSeccionesByAsignatura = (idAsignatura) =>
    fetch(`${BASE}/secciones/asignatura/${idAsignatura}`, { headers: headers() })
        .then((r) => r.json());

export const getInscripcionesByAlumno = (idAlumno) =>
    fetch(`${BASE}/inscripciones/alumno/${idAlumno}`, { headers: headers() })
        .then((r) => r.json());

export const postInscribirMultiple = ({ idAlumno, idPeriodo, secciones }) =>
    fetch(`${BASE}/inscripciones/inscribir-multiple`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ idAlumno, idPeriodo, secciones }),
    }).then((r) => r.json());

export const actualizarHorario = ({ idAlumno, idPeriodo, secciones }) =>
    fetch(`${BASE}/inscripciones/actualizar-horario`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ idAlumno, idPeriodo, secciones }),
    }).then((r) => r.json());

export const getPeriodos = () =>
    fetch(`${BASE}/periodos`, { headers: headers() })
        .then((r) => r.json());

export const getPreferenciaAlumno = (idAlumno, idPeriodo) =>
    fetch(`${BASE}/preferencias/alumno/${idAlumno}/${idPeriodo}`, { headers: headers() })
        .then((r) => r.status === 204 ? null : r.json());

export const guardarPreferenciaAlumno = (idAlumno, data) =>
    fetch(`${BASE}/preferencias/alumno/${idAlumno}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(data),
    }).then((r) => r.json());

export const getAlumnoPorRut = (rut) =>
    fetch(`${BASE}/alumnos/rut/${rut}`, { headers: headers() })
        .then((r) => r.status === 404 ? null : r.json());