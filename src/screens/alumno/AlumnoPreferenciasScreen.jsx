import { useEffect, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import { ALUMNO_NAV } from "../../config/navConfig";
import {
    getPeriodos,
    getPreferenciaAlumno,
    guardarPreferenciaAlumno,
    getAlumnoPorRut,
} from "../../api/inscripcionApiRequest";
import { getAsignaturasByCarrera, getProfesores } from "../../api/adminApiRequest";

const BLOQUES = [
    { value: "MANANA",     label: "Mañana (08:31 - 12:50)"    },
    { value: "TARDE",      label: "Tarde (13:01 - 19:00)"      },
    { value: "ANTES_21",   label: "Antes de las 21:00"         },
    { value: "DESPUES_21", label: "Después de las 21:00"       },
];

const CONCENTRACION = [
    { value: "CONCENTRADO",  label: "Concentrado (pocos días, más horas)" },
    { value: "DISTRIBUIDO",  label: "Distribuido (más días, menos horas)" },
];

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const selectClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-[#13131f] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300";

export default function AlumnoPreferenciasScreen() {
    const usuario  = JSON.parse(sessionStorage.getItem("usuario"));
    const idAlumno = usuario?.idEntidad;

    const [periodos, setPeriodos]               = useState([]);
    const [asignaturas, setAsignaturas]         = useState([]);
    const [profesores, setProfesores]           = useState([]);
    const [mensaje, setMensaje]                 = useState("");
    const [rutCompanero, setRutCompanero]       = useState("");
    const [companeroEncontrado, setCompaneroEncontrado] = useState(null);
    const [profPorAsignatura, setProfPorAsignatura]     = useState({});

    const [form, setForm] = useState({
        idPeriodo:            "",
        bloqueHorario:        "",
        concentracion:        "",
        diaSinClase:          "",
        idCompaneroPreferido: "",
        profesoresPreferidos: "{}",
    });

    useEffect(() => { cargarIniciales(); }, []);

    useEffect(() => {
        if (form.idPeriodo) cargarPreferencia();
    }, [form.idPeriodo]);

    const cargarIniciales = async () => {
        try {
            const [per, prof] = await Promise.all([getPeriodos(), getProfesores()]);
            if (Array.isArray(per))  setPeriodos(per);
            if (Array.isArray(prof)) setProfesores(prof);

            const asig = await getAsignaturasByCarrera(1); // TODO: carrera real del alumno
            if (Array.isArray(asig)) setAsignaturas(asig);
        } catch (e) { console.error(e); }
    };

    const cargarPreferencia = async () => {
        try {
            const data = await getPreferenciaAlumno(idAlumno, form.idPeriodo);
            if (data?.idPreferencia) {
                const profMap = JSON.parse(data.profesoresPreferidos ?? "{}");
                setProfPorAsignatura(profMap);
                setForm((prev) => ({
                    ...prev,
                    bloqueHorario:        data.bloqueHorario ?? "",
                    concentracion:        data.concentracion ?? "",
                    diaSinClase:          data.diaSinClase   ?? "",
                    idCompaneroPreferido: data.companeroPreferido?.idAlumno ?? "",
                    profesoresPreferidos: data.profesoresPreferidos ?? "{}",
                }));
                if (data.companeroPreferido) {
                    setCompaneroEncontrado(data.companeroPreferido);
                    setRutCompanero(data.companeroPreferido.usuario.rut);
                }
            } else {
                setForm((prev) => ({
                    ...prev,
                    bloqueHorario:        "",
                    concentracion:        "",
                    diaSinClase:          "",
                    idCompaneroPreferido: "",
                    profesoresPreferidos: "{}",
                }));
                setProfPorAsignatura({});
                setCompaneroEncontrado(null);
                setRutCompanero("");
            }
        } catch (e) { console.error(e); }
    };

    const handleProfesorPreferido = (idAsignatura, idProfesor) => {
        const updated = { ...profPorAsignatura, [idAsignatura]: idProfesor };
        setProfPorAsignatura(updated);
        setForm((prev) => ({ ...prev, profesoresPreferidos: JSON.stringify(updated) }));
    };

    const buscarCompanero = async () => {
        if (!rutCompanero.trim()) return;
        try {
            const data = await getAlumnoPorRut(rutCompanero.trim());
            if (data) {
                setCompaneroEncontrado(data);
                setForm((prev) => ({ ...prev, idCompaneroPreferido: data.idAlumno }));
            } else {
                setCompaneroEncontrado(null);
                setForm((prev) => ({ ...prev, idCompaneroPreferido: "" }));
                alert("Alumno no encontrado");
            }
        } catch (e) { console.error(e); }
    };

    const handleGuardar = async () => {
        if (!isFormValido()) return;
        try {
            await guardarPreferenciaAlumno(idAlumno, {
                idPeriodo:            parseInt(form.idPeriodo),
                bloqueHorario:        form.bloqueHorario,
                concentracion:        form.concentracion,
                diaSinClase:          form.diaSinClase || null,
                idCompaneroPreferido: form.idCompaneroPreferido ? parseInt(form.idCompaneroPreferido) : null,
                profesoresPreferidos: form.profesoresPreferidos,
            });
            setMensaje("Preferencias guardadas correctamente");
            setTimeout(() => setMensaje(""), 3000);
        } catch (e) { console.error(e); }
    };

    const isFormValido = () => form.idPeriodo && form.bloqueHorario && form.concentracion;

    return (
        <MainLayout navItems={ALUMNO_NAV}>
            <div className="flex-1 flex flex-col items-center justify-start p-6 gap-6">
                <div className="w-full max-w-2xl flex flex-col gap-6">

                    <header>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            Preferencias de Horario
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                            Declara tus preferencias para la asignación automática
                        </p>
                    </header>

                    {/* Periodo */}
                    <div className="rounded-2xl p-6 flex flex-col gap-4 shadow-sm bg-white dark:bg-[#1e1e2e]">
                        <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Periodo</p>
                        <select value={form.idPeriodo}
                            onChange={(e) => setForm({ ...form, idPeriodo: e.target.value })}
                            className={selectClass}>
                            <option value="">Selecciona un periodo...</option>
                            {periodos.map((p) => (
                                <option key={p.idPeriodo} value={p.idPeriodo}>{p.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {form.idPeriodo && (
                        <>
                            {/* Bloque horario */}
                            <div className="rounded-2xl p-6 flex flex-col gap-4 shadow-sm bg-white dark:bg-[#1e1e2e]">
                                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                    Bloque horario preferido
                                </p>
                                <div className="flex flex-col gap-2">
                                    {BLOQUES.map((b) => (
                                        <label key={b.value} className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="bloqueHorario"
                                                value={b.value}
                                                checked={form.bloqueHorario === b.value}
                                                onChange={(e) => setForm({ ...form, bloqueHorario: e.target.value })}
                                                className="w-4 h-4 accent-blue-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{b.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Concentración */}
                            <div className="rounded-2xl p-6 flex flex-col gap-4 shadow-sm bg-white dark:bg-[#1e1e2e]">
                                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                    Concentración de clases
                                </p>
                                <div className="flex flex-col gap-2">
                                    {CONCENTRACION.map((c) => (
                                        <label key={c.value} className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="concentracion"
                                                value={c.value}
                                                checked={form.concentracion === c.value}
                                                onChange={(e) => setForm({ ...form, concentracion: e.target.value })}
                                                className="w-4 h-4 accent-blue-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{c.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Día sin clase */}
                            <div className="rounded-2xl p-6 flex flex-col gap-4 shadow-sm bg-white dark:bg-[#1e1e2e]">
                                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                    Día sin clases preferido
                                </p>
                                <select value={form.diaSinClase}
                                    onChange={(e) => setForm({ ...form, diaSinClase: e.target.value })}
                                    className={selectClass}>
                                    <option value="">Sin preferencia</option>
                                    {DIAS.map((d) => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Profesor preferido por asignatura */}
                            <div className="rounded-2xl p-6 flex flex-col gap-4 shadow-sm bg-white dark:bg-[#1e1e2e]">
                                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                    Profesor preferido por asignatura
                                </p>
                                <div className="flex flex-col gap-3">
                                    {asignaturas.map((a) => (
                                        <div key={a.idAsignatura} className="flex items-center gap-3">
                                            <span className="text-sm text-gray-700 dark:text-gray-300 w-48 shrink-0">
                                                {a.nombre}
                                            </span>
                                            <select
                                                value={profPorAsignatura[a.idAsignatura] ?? ""}
                                                onChange={(e) => handleProfesorPreferido(a.idAsignatura, e.target.value)}
                                                className={selectClass}>
                                                <option value="">Sin preferencia</option>
                                                {profesores.map((p) => (
                                                    <option key={p.idProfesor} value={p.idProfesor}>
                                                        {p.usuario.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Compañero preferido */}
                            <div className="rounded-2xl p-6 flex flex-col gap-4 shadow-sm bg-white dark:bg-[#1e1e2e]">
                                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                    Compañero preferido
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={rutCompanero}
                                        onChange={(e) => setRutCompanero(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && buscarCompanero()}
                                        placeholder="RUT del compañero (ej: 12345678-0)"
                                        className={selectClass}
                                    />
                                    <button
                                        onClick={buscarCompanero}
                                        className="px-4 py-2 rounded-xl text-sm font-medium text-white
                                            bg-blue-500 hover:bg-blue-600 transition-colors shrink-0">
                                        Buscar
                                    </button>
                                </div>
                                {companeroEncontrado && (
                                    <p className="text-sm text-emerald-500">
                                        ✓ {companeroEncontrado.usuario.nombre}
                                    </p>
                                )}
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Esta preferencia es opcional.
                                </p>
                            </div>

                            {mensaje && (
                                <p className="text-sm text-emerald-500 font-medium">{mensaje}</p>
                            )}

                            <button
                                onClick={handleGuardar}
                                disabled={!isFormValido()}
                                className="w-full py-3 rounded-xl text-sm font-medium text-white
                                    bg-blue-500 hover:bg-blue-600 disabled:opacity-40
                                    disabled:cursor-not-allowed transition-colors">
                                Guardar preferencias
                            </button>
                        </>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}