import { useEffect, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import { PROFESOR_NAV } from "../../config/navConfig";
import { getPeriodos } from "../../api/inscripcionApiRequest";
import { getHorarios, getAsignaturas } from "../../api/adminApiRequest";

const BASE = import.meta.env.VITE_API_URL;
const headers = () => {
    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    return {
        "Content-Type": "application/json",
        "X-Tipo-Usuario": usuario.tipoUsuario ?? "",
    };
};

const guardarDisponibilidad = (idProfesor, data) =>
    fetch(`${BASE}/disponibilidad-profesor/${idProfesor}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(data),
    }).then((r) => r.text());

const getDisponibilidad = (idProfesor, idPeriodo) =>
    fetch(`${BASE}/disponibilidad-profesor/${idProfesor}/${idPeriodo}`, { headers: headers() })
        .then((r) => r.json());

const actualizarMaxSecciones = (idProfesor, maxSecciones) =>
    fetch(`${BASE}/profesores/${idProfesor}/max-secciones`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ maxSecciones }),
    }).then((r) => r.text());

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const selectClass = "border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-[#13131f] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300";

export default function ProfesorDisponibilidadScreen() {
    const usuario    = JSON.parse(sessionStorage.getItem("usuario"));
    const idProfesor = usuario?.idEntidad;

    const [periodos, setPeriodos]         = useState([]);
    const [horarios, setHorarios]         = useState([]);
    const [asignaturas, setAsignaturas]   = useState([]);
    const [idPeriodo, setIdPeriodo]       = useState("");
    const [idAsignatura, setIdAsignatura] = useState("");
    const [maxSecciones, setMaxSecciones] = useState(1);
    const [rangosPorDia, setRangosPorDia] = useState(
        Object.fromEntries(DIAS.map((d) => [d, { desde: "", hasta: "" }]))
    );
    const [mensaje, setMensaje] = useState("");

    useEffect(() => { cargarIniciales(); }, []);
    useEffect(() => { if (idPeriodo) cargarDisponibilidad(); }, [idPeriodo]);

    const cargarIniciales = async () => {
        try {
            const [per, hor, asig] = await Promise.all([
                getPeriodos(),
                getHorarios(),
                getAsignaturas(),
            ]);
            if (Array.isArray(per))  setPeriodos(per);
            if (Array.isArray(hor))  setHorarios(hor);
            if (Array.isArray(asig)) setAsignaturas(asig);
        } catch (e) { console.error(e); }
    };

    const cargarDisponibilidad = async () => {
        try {
            const data = await getDisponibilidad(idProfesor, idPeriodo);
            if (!Array.isArray(data) || data.length === 0) return;

            const nuevosRangos = Object.fromEntries(DIAS.map((d) => [d, { desde: "", hasta: "" }]));

            DIAS.forEach((dia) => {
                const bloquesDia = data
                    .filter((d) => d.diaSemana === dia)
                    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

                if (bloquesDia.length > 0) {
                    nuevosRangos[dia] = {
                        desde: bloquesDia[0].horaInicio,
                        hasta: bloquesDia[bloquesDia.length - 1].horaInicio,
                    };
                }
            });

            setRangosPorDia(nuevosRangos);

            // restaurar asignatura si ya estaba guardada
            if (data[0]?.asignatura?.idAsignatura) {
                setIdAsignatura(data[0].asignatura.idAsignatura);
            }
        } catch (e) { console.error(e); }
    };

    const horariosPorDia = (dia) =>
        horarios.filter((h) => h.diaSemana === dia).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

    const estaEnRango = (dia, horaInicio) => {
        const { desde, hasta } = rangosPorDia[dia];
        if (!desde || !hasta) return false;
        return horaInicio >= desde && horaInicio <= hasta;
    };

    const calcularIdHorarios = () => {
        const ids = [];
        DIAS.forEach((dia) => {
            const { desde, hasta } = rangosPorDia[dia];
            if (!desde || !hasta) return;
            horariosPorDia(dia).forEach((h) => {
                if (h.horaInicio >= desde && h.horaInicio <= hasta) {
                    ids.push(h.idHorario);
                }
            });
        });
        return ids;
    };

    const totalBloques = calcularIdHorarios().length;

    const handleGuardar = async () => {
        if (!idPeriodo || !idAsignatura) return;
        const idHorarios = calcularIdHorarios();
        if (idHorarios.length < 5 || idHorarios.length > 30) return;
        try {
            const msg = await guardarDisponibilidad(idProfesor, {
                idPeriodo:    parseInt(idPeriodo),
                idAsignatura: parseInt(idAsignatura),
                idHorarios,
            });
            await actualizarMaxSecciones(idProfesor, maxSecciones);
            setMensaje(msg);
            setTimeout(() => setMensaje(""), 3000);
        } catch (e) { console.error(e); }
    };

    const botonDeshabilitado = totalBloques < 5 || totalBloques > 30 || !idPeriodo || !idAsignatura;

    return (
        <MainLayout navItems={PROFESOR_NAV}>
            <div className="flex-1 flex flex-col p-6 gap-6">

                <header>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        Disponibilidad Horaria
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                        Declara tu disponibilidad para el periodo
                    </p>
                </header>

                <div className="flex gap-4 items-end flex-wrap">
                    <div className="w-48">
                        <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Periodo</p>
                        <select value={idPeriodo}
                            onChange={(e) => setIdPeriodo(e.target.value)}
                            className={selectClass}>
                            <option value="">Selecciona...</option>
                            {periodos.map((p) => (
                                <option key={p.idPeriodo} value={p.idPeriodo}>{p.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-56">
                        <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Asignatura</p>
                        <select value={idAsignatura}
                            onChange={(e) => setIdAsignatura(e.target.value)}
                            className={selectClass}>
                            <option value="">Selecciona...</option>
                            {asignaturas.map((a) => (
                                <option key={a.idAsignatura} value={a.idAsignatura}>{a.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-48">
                        <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">
                            Máximo de secciones
                        </p>
                        <input
                            type="number"
                            min={1}
                            max={6}
                            value={maxSecciones}
                            onChange={(e) => setMaxSecciones(parseInt(e.target.value))}
                            className={selectClass}
                        />
                    </div>
                </div>

                {idPeriodo && (
                    <>
                        <div className="rounded-2xl shadow-sm overflow-x-auto bg-white dark:bg-[#1e1e2e]">
                            <table className="text-xs w-full border-collapse">
                                <thead>
                                    <tr className="bg-[#1A2E4A] dark:bg-[#0a0a12]">
                                        <th className="px-3 py-3 text-left text-white font-semibold w-24">Hora</th>
                                        {DIAS.map((d) => (
                                            <th key={d} className="px-3 py-3 text-center text-white font-semibold">{d}</th>
                                        ))}
                                    </tr>
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <td className="px-3 py-2 text-gray-400 text-xs">Rango</td>
                                        {DIAS.map((dia) => (
                                            <td key={dia} className="px-2 py-2">
                                                <div className="flex flex-col gap-1">
                                                    <select
                                                        value={rangosPorDia[dia].desde}
                                                        onChange={(e) => setRangosPorDia((prev) => ({
                                                            ...prev,
                                                            [dia]: { ...prev[dia], desde: e.target.value }
                                                        }))}
                                                        className="border border-gray-200 dark:border-gray-700 rounded-lg px-1 py-1 text-xs bg-white dark:bg-[#13131f] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                                        <option value="">Desde</option>
                                                        {horariosPorDia(dia).map((h) => (
                                                            <option key={h.idHorario} value={h.horaInicio}>
                                                                {h.horaInicio.slice(0, 5)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={rangosPorDia[dia].hasta}
                                                        onChange={(e) => setRangosPorDia((prev) => ({
                                                            ...prev,
                                                            [dia]: { ...prev[dia], hasta: e.target.value }
                                                        }))}
                                                        className="border border-gray-200 dark:border-gray-700 rounded-lg px-1 py-1 text-xs bg-white dark:bg-[#13131f] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                                        <option value="">Hasta</option>
                                                        {horariosPorDia(dia)
                                                            .filter((h) => !rangosPorDia[dia].desde || h.horaInicio >= rangosPorDia[dia].desde)
                                                            .map((h) => (
                                                                <option key={h.idHorario} value={h.horaInicio}>
                                                                    {h.horaInicio.slice(0, 5)}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {horariosPorDia("Lunes").map((h, i) => (
                                        <tr key={i} className="border-t border-gray-100 dark:border-gray-700 h-8">
                                            <td className="px-3 py-1 text-gray-500 dark:text-gray-400">
                                                {h.horaInicio.slice(0, 5)}
                                            </td>
                                            {DIAS.map((dia) => {
                                                const bloque = horarios.find(
                                                    (hh) => hh.diaSemana === dia && hh.horaInicio === h.horaInicio
                                                );
                                                if (!bloque) return <td key={dia} className="border-l border-gray-100 dark:border-gray-700" />;
                                                const enRango = estaEnRango(dia, bloque.horaInicio);
                                                return (
                                                    <td key={dia}
                                                        className={`border-l border-gray-100 dark:border-gray-700 transition-colors duration-150
                                                            ${enRango ? "bg-blue-100 dark:bg-blue-900/30" : ""}`}
                                                    />
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            {totalBloques} bloques seleccionados
                            {totalBloques < 5 && " — mínimo 5"}
                            {totalBloques > 30 && " — máximo 30"}
                        </p>

                        {!idAsignatura && (
                            <p className="text-xs text-amber-500">Selecciona una asignatura antes de guardar.</p>
                        )}

                        {mensaje && (
                            <p className="text-sm text-emerald-500 font-medium">{mensaje}</p>
                        )}

                        <button
                            onClick={handleGuardar}
                            disabled={botonDeshabilitado}
                            className="w-48 py-2 rounded-xl text-sm font-medium text-white
                                bg-blue-500 hover:bg-blue-600 disabled:opacity-40
                                disabled:cursor-not-allowed transition-colors">
                            Guardar disponibilidad
                        </button>
                    </>
                )}
            </div>
        </MainLayout>
    );
}