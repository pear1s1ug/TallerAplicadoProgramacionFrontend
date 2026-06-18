const BASE = import.meta.env.VITE_API_URL;

const headers = () => {
    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    return {
        "Content-Type": "application/json",
        "X-Tipo-Usuario": usuario.tipoUsuario ?? "",
    };
};

export const getSeccionesByProfesor = (idProfesor) =>
    fetch(`${BASE}/secciones/profesor/${idProfesor}`, { headers: headers() })
        .then((r) => r.json());