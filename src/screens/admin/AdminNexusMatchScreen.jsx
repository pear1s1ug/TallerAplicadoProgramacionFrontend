import { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import MainLayout from "../../layouts/MainLayout";
import { ADMIN_NAV } from "../../config/navConfig";
import ClusterGraph from "../../components/common/ClusterGraph";
import {
    getCarreras,
    getProfesores,
    getSalas,
    ejecutarFase1,
    ejecutarFase2,
    ejecutarFase3,
    persistirFase1,
    getSeccionesNexusTemp,
} from "../../api/adminApiRequest";
import { getPeriodos } from "../../api/inscripcionApiRequest";

const BASE = import.meta.env.VITE_API_URL;
const headers = () => {
    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    return { "Content-Type": "application/json", "X-Tipo-Usuario": usuario.tipoUsuario ?? "" };
};

const getDisponibilidadPorPeriodo = (idPeriodo) =>
    fetch(`${BASE}/disponibilidad-profesor/periodo/${idPeriodo}`, { headers: headers() })
        .then((r) => r.json());

const getPreferenciasPorPeriodo = (idPeriodo) =>
    fetch(`${BASE}/preferencias/periodo/${idPeriodo}`, { headers: headers() })
        .then((r) => r.json());

const getSeccionesPorPeriodo = () =>
    fetch(`${BASE}/secciones`, { headers: headers() })
        .then((r) => r.json());

const TAB_CLASS = (activo) =>
    `px-4 py-2 text-sm font-medium rounded-t-xl transition-colors ${activo
        ? "bg-white dark:bg-[#1e1e2e] text-blue-500 border-b-2 border-blue-500"
        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
    }`;

const InfoBox = ({ texto }) => (
    <div className="rounded-2xl p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
        <p className="text-xs font-semibold uppercase text-blue-500 mb-2">¿Qué hace esta fase?</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{texto}</p>
    </div>
);

const INFO_F1 = "A partir de la disponibilidad horaria declarada por los profesores, el sistema genera todas las combinaciones válidas de secciones posibles para el semestre. Cada sección candidata cumple con la distribución de 5 bloques semanales en exactamente 2 días (mínimo 2 bloques por día, máximo 3), tiene una sala compatible asignada y respeta los cupos configurados. Técnicamente, este proceso aplica combinatoria sobre los bloques disponibles por profesor para construir el espacio de oferta académica factible antes de conocer las preferencias de los alumnos.";
const INFO_F2 = "Con la oferta académica generada y las preferencias declaradas por los alumnos, el sistema calcula un score de compatibilidad para cada par alumno-sección. El score es una suma ponderada de cuatro dimensiones: bloque horario (40%), concentración de clases (25%), profesor preferido (20%) y día sin clase (15%). Adicionalmente, se aplica el algoritmo de detección de comunidades Louvain sobre la red social de preferencias de compañero para identificar clusters de afinidad.";
const INFO_F3 = "El solver resuelve un problema de programación lineal entera (ILP) que asigna a cada alumno exactamente una sección por asignatura, maximizando la satisfacción colectiva. Las restricciones garantizan que ninguna sección supere su cupo máximo, que las secciones sin alumnos suficientes no se abran, y que ningún alumno quede con un score inferior al umbral θ configurado.";

function calcularSubjornada(dias) {
    // inferir subjornada desde el primer dia disponible en la seccion temp
    // sin bloques reales, usamos jornada como fallback
    return dias;
}

export default function AdminNexusMatchScreen() {
    const [tab, setTab] = useState(1);
    const [periodos, setPeriodos] = useState([]);
    const [carreras, setCarreras] = useState([]);
    const [idPeriodo, setIdPeriodo] = useState("");
    const [idCarrera, setIdCarrera] = useState("");

    const [tabClusters, setTabClusters] = useState("lista");

    const [cupoMinimo, setCupoMinimo] = useState(5);
    const [cupoMaximo, setCupoMaximo] = useState(20);
    const [resultadoF1, setResultadoF1] = useState(null);
    const [loadingF1, setLoadingF1] = useState(false);
    const [alertaF1, setAlertaF1] = useState("");

    const [resultadoF2, setResultadoF2] = useState(null);
    const [loadingF2, setLoadingF2] = useState(false);
    const [alertaF2, setAlertaF2] = useState("");

    const [theta, setTheta] = useState(0.40);
    const [resultadoF3, setResultadoF3] = useState(null);
    const [loadingF3, setLoadingF3] = useState(false);
    const [alertaF3, setAlertaF3] = useState("");
    const [busquedaAlumno, setBusquedaAlumno] = useState("");
    const [horarioAlumno, setHorarioAlumno] = useState(null);

    useEffect(() => { cargarIniciales(); }, []);

    // al cambiar de periodo, intentar recuperar secciones temp ya persistidas
    useEffect(() => {
        if (!idPeriodo) return;
        getSeccionesNexusTemp(idPeriodo).then((data) => {
            if (Array.isArray(data) && data.length > 0) setResultadoF1(data);
        });
    }, [idPeriodo]);

    const cargarIniciales = async () => {
        const [per, car] = await Promise.all([getPeriodos(), getCarreras()]);
        if (Array.isArray(per)) setPeriodos(per);
        if (Array.isArray(car)) setCarreras(car);
    };

    const handleFase1 = async () => {
        if (!idPeriodo) return;
        setLoadingF1(true);
        setAlertaF1("");
        try {
            const [profesores, salas, disponibilidades, seccionesBackend] = await Promise.all([
                getProfesores(),
                getSalas(),
                getDisponibilidadPorPeriodo(idPeriodo),
                getSeccionesPorPeriodo(),
            ]);

            // mapa idProfesor -> Set de idAsignaturas desde secciones reales del backend
            const profesorAsignaturas = {};
            seccionesBackend.forEach((s) => {
                if (!profesorAsignaturas[s.profesor.idProfesor])
                    profesorAsignaturas[s.profesor.idProfesor] = new Set();
                profesorAsignaturas[s.profesor.idProfesor].add(s.asignatura.idAsignatura);
            });

            const profesoresPayload = profesores
                .map((p) => ({
                    idProfesor: p.idProfesor,
                    idAsignatura: disponibilidades.find((d) => d.profesor.idProfesor === p.idProfesor)?.asignatura?.idAsignatura ?? 0,
                    maxSecciones: p.maxSecciones ?? 2,
                    disponibilidad: disponibilidades
                        .filter((d) => d.profesor.idProfesor === p.idProfesor)
                        .map((d) => ({
                            idHorario: d.idDisponibilidad,
                            diaSemana: d.diaSemana,
                            horaInicio: d.horaInicio,
                            horaFin: d.horaFin,
                        })),
                }))
                .filter((p) => p.disponibilidad.length > 0);

            const salasPayload = salas.map((s) => ({
                idSala: s.idSala,
                nombre: s.nombre,
                tipo: s.tipo,
                capacidad: s.capacidad,
                tienePc: s.tienePc,
            }));

            const resultado = await ejecutarFase1({
                profesores: profesoresPayload,
                salas: salasPayload,
                cupoMaximo,
                cupoMinimo,
            });

            console.log("resultado fase1", resultado);

            if (!Array.isArray(resultado) || resultado.length === 0) {
                setAlertaF1("⚠️ No se generaron secciones posibles. Revisa la disponibilidad de los profesores.");
                setLoadingF1(false);
                return;
            }

            // persistir en db con idAsignatura real cruzando con secciones del backend
            // si el profesor no tiene secciones en backend se usa 0 como fallback
            const seccionesParaPersistir = resultado.map((s) => ({
                idProfesor: s.idProfesor,
                idAsignatura: s.idAsignatura,
                idSala: s.idSala,
                jornada: s.jornada,
                dias: s.dias,
            }));

            console.log("seccionesParaPersistir", JSON.stringify(seccionesParaPersistir, null, 2));


            await persistirFase1({
                idPeriodo: parseInt(idPeriodo),
                secciones: seccionesParaPersistir,
            });

            console.log("persistido ok");

            // recargar desde db para tener los ids reales asignados por la db
            const seccionesTemp = await getSeccionesNexusTemp(idPeriodo);
            setResultadoF1(seccionesTemp);

        } catch (e) {
            setAlertaF1("❌ Error al conectar con Nexus Match.");
            console.error(e);
        }
        setLoadingF1(false);
    };

    const handleFase2 = async () => {
        if (!idPeriodo || !resultadoF1) return;
        setLoadingF2(true);
        setAlertaF2("");
        try {
            const [preferencias, seccionesTemp] = await Promise.all([
                getPreferenciasPorPeriodo(idPeriodo),
                getSeccionesNexusTemp(idPeriodo),
            ]);

            // reconstruir payload desde secciones persistidas en db
            const seccionesPayload = seccionesTemp.map((s) => ({
                idSeccion: s.id,
                idProfesor: s.idProfesor,
                idAsignatura: s.idAsignatura,  // ahora es real
                jornada: s.jornada,
                subjornada: s.jornada === "DIURNA" ? "MANANA" : "ANTES_21",
                dias: s.dias.split(","),
            }));

            const preferenciasPayload = preferencias.map((p) => ({
                idAlumno: p.alumno.idAlumno,
                jornada: p.alumno.jornada?.nombre ?? "DIURNA",
                bloqueHorario: p.bloqueHorario,
                concentracion: p.concentracion,
                diaSinClase: p.diaSinClase,
                idCompaneroPreferido: p.companeroPreferido?.idAlumno ?? null,
                profesoresPreferidos: p.profesoresPreferidos,
            }));

            const resultado = await ejecutarFase2({
                secciones: seccionesPayload,
                preferencias: preferenciasPayload,
            });

            const conteo = resultado.clusters.reduce((acc, c) => {
                acc[c.cluster] = (acc[c.cluster] ?? 0) + 1;
                return acc;
            }, {});
            console.log("clusters con mas de 1 alumno:",
                Object.entries(conteo).filter(([, v]) => v > 1)
            );

            setResultadoF2(resultado);

            if (preferenciasPayload.length === 0) {
                setAlertaF2("⚠️ No hay preferencias declaradas para este periodo.");
                return;
            }

            const demanda = resultado?.demandaPorSeccion ?? {};
            const sobredemandadas = Object.entries(demanda)
                .filter(([, v]) => v > cupoMaximo)
                .map(([k]) => k);

            if (sobredemandadas.length > 0) {
                setAlertaF2(`⚠️ Las secciones ${sobredemandadas.join(", ")} tienen demanda mayor al cupo máximo. Considera abrir más secciones.`);
            }
        } catch (e) {
            setAlertaF2("❌ Error al conectar con Nexus Match.");
            console.error(e);
        }
        setLoadingF2(false);
    };

    const handleFase3 = async () => {
        if (!idPeriodo || !resultadoF2) return;
        setLoadingF3(true);
        setAlertaF3("");
        try {
            const seccionesTemp = await getSeccionesNexusTemp(idPeriodo);

            // secciones con idAsignatura real desde db, ids coherentes con los scores
            const seccionesPayload = seccionesTemp.map((s) => ({
                idSeccion: s.id,
                idAsignatura: s.idAsignatura,
                cupoMaximo,
                cupoMinimo,
            }));

            const resultado = await ejecutarFase3({
                scores: resultadoF2.scores,
                clusters: resultadoF2.clusters,
                secciones: seccionesPayload,
                alumnos: [...new Set(resultadoF2.scores.map((s) => s.idAlumno))],
                theta,
            });

            setResultadoF3(resultado);

            if (!resultado.exitoso) {
                setAlertaF3(`❌ ${resultado.mensaje}`);
            } else {
                const partes = [];
                if (resultado.alumnosBajoTheta?.length > 0)
                    partes.push(`⚠️ ${resultado.alumnosBajoTheta.length} alumnos quedaron bajo θ = ${theta}. Considera relajar el umbral.`);
                if (resultado.seccionesNoAbiertas?.length > 0)
                    partes.push(`⚠️ ${resultado.seccionesNoAbiertas.length} secciones no alcanzaron el cupo mínimo y no se abrirán.`);
                if (partes.length > 0) setAlertaF3(partes.join(" "));
            }
        } catch (e) {
            setAlertaF3("❌ Error al conectar con Nexus Match.");
            console.error(e);
        }
        setLoadingF3(false);
    };

    const buscarHorarioAlumno = () => {
        if (!resultadoF3 || !busquedaAlumno) return;
        const idAlumno = parseInt(busquedaAlumno);
        const asignaciones = resultadoF3.asignaciones.filter((a) => a.idAlumno === idAlumno);
        if (asignaciones.length === 0) {
            setHorarioAlumno(null);
            setAlertaF3("⚠️ Alumno no encontrado en la asignación.");
            return;
        }
        setHorarioAlumno(asignaciones);
    };

    const exportarExcel = async () => {
        if (!resultadoF1) return;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Oferta Académica");

        worksheet.columns = [
            { header: "ID Profesor", key: "idProfesor", width: 15 },
            { header: "ID Asignatura", key: "idAsignatura", width: 15 },
            { header: "ID Sala", key: "idSala", width: 10 },
            { header: "Jornada", key: "jornada", width: 15 },
            { header: "Días", key: "dias", width: 20 },
        ];

        worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        worksheet.getRow(1).fill = {
            type: "pattern", pattern: "solid",
            fgColor: { argb: "FF1A2E4A" },
        };

        resultadoF1.forEach((s) => {
            worksheet.addRow({
                idProfesor: s.idProfesor,
                idAsignatura: s.idAsignatura,
                idSala: s.idSala,
                jornada: s.jornada,
                dias: s.dias,
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), "oferta_academica.xlsx");
    };

    const selectClass = "border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-[#13131f] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300";

    return (
        <MainLayout navItems={ADMIN_NAV}>
            <div className="flex-1 flex flex-col p-6 gap-4">

                <header>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Nexus Match</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Optimización de horarios</p>
                </header>

                <div className="flex gap-4">
                    <div className="w-48">
                        <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Periodo</p>
                        <select value={idPeriodo} onChange={(e) => setIdPeriodo(e.target.value)} className={selectClass}>
                            <option value="">Selecciona...</option>
                            {periodos.map((p) => <option key={p.idPeriodo} value={p.idPeriodo}>{p.nombre}</option>)}
                        </select>
                    </div>
                    <div className="w-48">
                        <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Carrera</p>
                        <select value={idCarrera} onChange={(e) => setIdCarrera(e.target.value)} className={selectClass}>
                            <option value="">Selecciona...</option>
                            {carreras.map((c) => <option key={c.idCarrera} value={c.idCarrera}>{c.nombre}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
                    {[1, 2, 3].map((t) => (
                        <button key={t} onClick={() => setTab(t)} className={TAB_CLASS(tab === t)}>
                            Fase {t}
                        </button>
                    ))}
                </div>

                {/* FASE 1 */}
                {tab === 1 && (
                    <div className="flex flex-col gap-4">
                        <InfoBox texto={INFO_F1} />

                        <div className="rounded-2xl p-6 flex flex-col gap-4 shadow-sm bg-white dark:bg-[#1e1e2e]">
                            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Parámetros</p>
                            <div className="flex gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Cupo mínimo</p>
                                    <input type="number" value={cupoMinimo}
                                        onChange={(e) => setCupoMinimo(parseInt(e.target.value))}
                                        className={selectClass} style={{ width: 120 }} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Cupo máximo</p>
                                    <input type="number" value={cupoMaximo}
                                        onChange={(e) => setCupoMaximo(parseInt(e.target.value))}
                                        className={selectClass} style={{ width: 120 }} />
                                </div>
                            </div>
                            <button onClick={handleFase1} disabled={!idPeriodo || loadingF1}
                                className="w-48 py-2 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                {loadingF1 ? "Generando..." : "Generar oferta académica"}
                            </button>
                        </div>

                        {alertaF1 && <p className="text-sm text-amber-500 font-medium">{alertaF1}</p>}

                        {resultadoF1 && (
                            <div className="rounded-2xl p-6 flex flex-col gap-4 shadow-sm bg-white dark:bg-[#1e1e2e]">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                        Oferta generada — {resultadoF1.length} secciones posibles
                                    </p>
                                    <button onClick={exportarExcel}
                                        className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors">
                                        Exportar Excel
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="text-xs w-full border-collapse">
                                        <thead>
                                            <tr className="bg-[#1A2E4A] text-white">
                                                <th className="px-3 py-2 text-left">Profesor</th>
                                                <th className="px-3 py-2 text-left">Asignatura</th>
                                                <th className="px-3 py-2 text-left">Sala</th>
                                                <th className="px-3 py-2 text-left">Jornada</th>
                                                <th className="px-3 py-2 text-left">Días</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resultadoF1.map((s) => (
                                                <tr key={s.id} className="border-t border-gray-100 dark:border-gray-700">
                                                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{s.idProfesor}</td>
                                                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{s.idAsignatura}</td>
                                                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{s.idSala}</td>
                                                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{s.jornada}</td>
                                                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{s.dias}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* FASE 2 */}
                {tab === 2 && (
                    <div className="flex flex-col gap-4">
                        <InfoBox texto={INFO_F2} />

                        <div className="rounded-2xl p-6 flex flex-col gap-4 shadow-sm bg-white dark:bg-[#1e1e2e]">
                            {!resultadoF1 && (
                                <p className="text-sm text-amber-500">⚠️ Debes ejecutar la Fase 1 primero.</p>
                            )}
                            <button onClick={handleFase2} disabled={!idPeriodo || !resultadoF1 || loadingF2}
                                className="w-48 py-2 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                {loadingF2 ? "Calculando..." : "Calcular scores"}
                            </button>
                        </div>

                        {alertaF2 && <p className="text-sm text-amber-500 font-medium">{alertaF2}</p>}

                        {resultadoF2 && (
                            <>
                                <div className="rounded-2xl p-6 flex flex-col gap-3 shadow-sm bg-white dark:bg-[#1e1e2e]">
                                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                        Demanda estimada por sección
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {Object.entries(resultadoF2.demandaPorSeccion).map(([idSeccion, demanda]) => (
                                            <div key={idSeccion} className="flex items-center justify-between text-sm">
                                                <span className="text-gray-700 dark:text-gray-300">Sección {idSeccion}</span>
                                                <span className={`font-medium ${demanda > cupoMaximo ? "text-red-500" : "text-emerald-500"}`}>
                                                    {demanda} alumnos estimados
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* clusters con tabs */}
                                <div className="rounded-2xl shadow-sm bg-white dark:bg-[#1e1e2e]">
                                    <div className="flex gap-1 px-4 pt-4 border-b border-gray-100 dark:border-gray-700">
                                        <button
                                            onClick={() => setTabClusters("lista")}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${tabClusters === "lista"
                                                ? "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-100"
                                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                                }`}
                                        >
                                            Lista
                                        </button>
                                        <button
                                            onClick={() => setTabClusters("grafo")}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${tabClusters === "grafo"
                                                ? "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-100"
                                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                                }`}
                                        >
                                            Grafo
                                        </button>
                                    </div>

                                    <div className="p-4">
                                        <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-3">
                                            Clusters de afinidad — {resultadoF2.clusters.length} alumnos
                                        </p>

                                        {tabClusters === "lista" && (
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(
                                                    resultadoF2.clusters.reduce((acc, c) => {
                                                        acc[c.cluster] = [...(acc[c.cluster] ?? []), c.idAlumno];
                                                        return acc;
                                                    }, {})
                                                ).map(([cluster, alumnos]) => (
                                                    <div key={cluster} className="rounded-xl px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-xs text-blue-700 dark:text-blue-300">
                                                        Cluster {cluster}: alumnos {alumnos.join(", ")}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {tabClusters === "grafo" && (
                                            <ClusterGraph
                                                clusters={resultadoF2.clusters}
                                                scores={resultadoF2.scores}
                                            />
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* FASE 3 */}
                {tab === 3 && (
                    <div className="flex flex-col gap-4">
                        <InfoBox texto={INFO_F3} />

                        <div className="rounded-2xl p-6 flex flex-col gap-4 shadow-sm bg-white dark:bg-[#1e1e2e]">
                            {!resultadoF2 && (
                                <p className="text-sm text-amber-500">⚠️ Debes ejecutar la Fase 2 primero.</p>
                            )}
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Umbral θ (satisfacción mínima)</p>
                                <input type="number" step="0.05" min="0" max="1" value={theta}
                                    onChange={(e) => setTheta(parseFloat(e.target.value))}
                                    className={selectClass} style={{ width: 120 }} />
                            </div>
                            <button onClick={handleFase3} disabled={!idPeriodo || !resultadoF2 || loadingF3}
                                className="w-48 py-2 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                {loadingF3 ? "Asignando..." : "Correr asignación"}
                            </button>
                        </div>

                        {alertaF3 && <p className="text-sm text-amber-500 font-medium">{alertaF3}</p>}

                        {resultadoF3 && (
                            <>
                                <div className="rounded-2xl p-6 flex flex-col gap-3 shadow-sm bg-white dark:bg-[#1e1e2e]">
                                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                        Resumen de asignación
                                    </p>
                                    <div className="flex gap-6">
                                        <div>
                                            <p className="text-xs text-gray-400">Satisfacción promedio</p>
                                            <p className="text-2xl font-bold text-blue-500">
                                                {(resultadoF3.satisfaccionPromedio * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Alumnos bajo θ</p>
                                            <p className={`text-2xl font-bold ${resultadoF3.alumnosBajoTheta?.length > 0 ? "text-red-500" : "text-emerald-500"}`}>
                                                {resultadoF3.alumnosBajoTheta?.length ?? 0}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Secciones no abiertas</p>
                                            <p className="text-2xl font-bold text-amber-500">
                                                {resultadoF3.seccionesNoAbiertas?.length ?? 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl p-6 flex flex-col gap-3 shadow-sm bg-white dark:bg-[#1e1e2e]">
                                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                        Buscar horario de alumno
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={busquedaAlumno}
                                            onChange={(e) => setBusquedaAlumno(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && buscarHorarioAlumno()}
                                            placeholder="ID del alumno"
                                            className={selectClass}
                                            style={{ width: 200 }}
                                        />
                                        <button onClick={buscarHorarioAlumno}
                                            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors">
                                            Buscar
                                        </button>
                                    </div>

                                    {horarioAlumno && (
                                        <div className="flex flex-col gap-2 mt-2">
                                            <p className="text-xs text-gray-500">
                                                Satisfacción promedio: {(horarioAlumno.reduce((acc, a) => acc + a.score, 0) / horarioAlumno.length * 100).toFixed(1)}%
                                            </p>
                                            <div className="flex flex-col gap-1">
                                                {horarioAlumno.map((a) => (
                                                    <div key={a.idSeccion} className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-700 dark:text-gray-300">Sección {a.idSeccion}</span>
                                                        <span className={`font-medium ${a.score >= theta ? "text-emerald-500" : "text-red-500"}`}>
                                                            Score: {(a.score * 100).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </MainLayout>
    );
}