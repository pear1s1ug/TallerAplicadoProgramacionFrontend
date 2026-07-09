import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import MainLayout from "../../layouts/MainLayout";
import CrudLayout from "../../layouts/CrudLayout";
import CrudSection from "../../components/common/CrudSection";
import CrudTable from "../../components/common/CrudTable";
import CrudTableRow from "../../components/common/CrudTableRow";
import { ADMIN_NAV } from "../../config/navConfig";
import {
    getSecciones,
    getAlumnosInscritos,
    getAsignaturas,
    getProfesores,
    getSalas,
    getSedes,
    getJornadas,
    getModalidades,
    getHorarios,
    crearSeccionConHorarios,
    actualizarSeccionConHorarios,
    eliminarSeccionConHorarios,
} from "../../api/adminApiRequest";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const COLUMNS = [
    { label: "Asignatura" },
    { label: "Profesor"   },
    { label: "Sala",      width: "120px" },
    { label: "Jornada",   width: "100px" },
    { label: "Cupos",     width: "80px"  },
    { label: "Inscritos", width: "80px"  },
    { label: "Acciones",  width: "100px" },
];

const FORM_INITIAL = {
    cupos: "",
    idAsignatura: "",
    idProfesor: "",
    idSala: "",
    idSede: "",
    idJornada: "",
    idModalidad: "",
    idHorarios: [],
};

export default function AdminSeccionesScreen() {
    const [secciones, setSecciones]     = useState([]);
    const [inscritos, setInscritos]     = useState({});
    const [asignaturas, setAsignaturas] = useState([]);
    const [profesores, setProfesores]   = useState([]);
    const [salas, setSalas]             = useState([]);
    const [sedes, setSedes]             = useState([]);
    const [jornadas, setJornadas]       = useState([]);
    const [modalidades, setModalidades] = useState([]);
    const [horarios, setHorarios]       = useState([]);
    const [form, setForm]               = useState(FORM_INITIAL);
    const [editandoId, setEditandoId]   = useState(null);
    const [mensaje, setMensaje]         = useState("");

    useEffect(() => { cargarTodo(); }, []);

    const cargarTodo = async () => {
        try {
            const [sec, asig, prof, sal, sed, jor, mod, hor] = await Promise.all([
                getSecciones(),
                getAsignaturas(),
                getProfesores(),
                getSalas(),
                getSedes(),
                getJornadas(),
                getModalidades(),
                getHorarios(),
            ]);
            if (Array.isArray(sec)) {
                setSecciones(sec);
                const counts = await Promise.all(
                    sec.map((s) =>
                        getAlumnosInscritos(s.idSeccion).then((c) => ({ id: s.idSeccion, count: c }))
                    )
                );
                const map = {};
                counts.forEach(({ id, count }) => { map[id] = count; });
                setInscritos(map);
            }
            if (Array.isArray(asig)) setAsignaturas(asig);
            if (Array.isArray(prof)) setProfesores(prof);
            if (Array.isArray(sal))  setSalas(sal);
            if (Array.isArray(sed))  setSedes(sed);
            if (Array.isArray(jor))  setJornadas(jor);
            if (Array.isArray(mod))  setModalidades(mod);
            if (Array.isArray(hor))  setHorarios(hor);
        } catch (e) { console.error(e); }
    };

    const esBloquePermitido = (horario) => {
        if (!form.idJornada) return true;
        const hora = horario.horaInicio.slice(0, 5);
        if (parseInt(form.idJornada) === 1) return hora < "19:00";
        if (parseInt(form.idJornada) === 2) return hora >= "19:00";
        return true;
    };

    const toggleHorario = (id) => {
        setForm((prev) => ({
            ...prev,
            idHorarios: prev.idHorarios.includes(id)
                ? prev.idHorarios.filter((h) => h !== id)
                : [...prev.idHorarios, id],
        }));
    };

    const buildPayload = () => ({
        cupos:        parseInt(form.cupos),
        idAsignatura: parseInt(form.idAsignatura),
        idProfesor:   parseInt(form.idProfesor),
        idSala:       parseInt(form.idSala),
        idSede:       parseInt(form.idSede),
        idJornada:    parseInt(form.idJornada),
        idModalidad:  parseInt(form.idModalidad),
        idHorarios:   form.idHorarios,
    });

    const isFormValido = () =>
        form.idAsignatura && form.idProfesor && form.idSala &&
        form.idSede && form.idJornada && form.idModalidad &&
        form.cupos && form.idHorarios.length > 0;

    const mostrarMensaje = (msg) => {
        setMensaje(msg);
        setTimeout(() => setMensaje(""), 3000);
    };

    const handleCrear = async () => {
        if (!isFormValido()) return;
        await crearSeccionConHorarios(buildPayload());
        setForm(FORM_INITIAL);
        mostrarMensaje("Sección creada correctamente");
        await cargarTodo();
    };

    const handleEditar = (s) => {
        setEditandoId(s.idSeccion);
        setForm({
            cupos:        s.cupos,
            idAsignatura: s.asignatura.idAsignatura,
            idProfesor:   s.profesor.idProfesor,
            idSala:       s.sala.idSala,
            idSede:       s.sede.idSede,
            idJornada:    s.jornada.idJornada,
            idModalidad:  s.modalidad.idModalidad,
            idHorarios:   s.horarios.map((h) => h.horario.idHorario),
        });
    };

    const handleGuardar = async () => {
        if (!isFormValido()) return;
        await actualizarSeccionConHorarios(editandoId, buildPayload());
        setEditandoId(null);
        setForm(FORM_INITIAL);
        mostrarMensaje("Sección actualizada correctamente");
        await cargarTodo();
    };

    const handleCancelar = () => {
        setEditandoId(null);
        setForm(FORM_INITIAL);
    };

    const handleEliminar = async (id) => {
      try {
          const respuesta = await eliminarSeccionConHorarios(id);

          console.log(respuesta);

          if (respuesta === "Sección eliminada") {
              mostrarMensaje("Sección eliminada correctamente");
              await cargarTodo();
          } else {
              mostrarMensaje(respuesta);
          }

      } catch (error) {
          console.error(error);
          mostrarMensaje("Error eliminando sección");
      }
   };

    const horariosPorDia = (dia) => horarios.filter((h) => h.diaSemana === dia);

    const selectClass = "border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-[#13131f] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300";

    return (
        <MainLayout navItems={ADMIN_NAV}>
            <CrudLayout title="Secciones" subtitle="Gestión de secciones">

                <CrudSection title={editandoId ? "Editar sección" : "Nueva sección"}>
                    <div className="grid grid-cols-3 gap-3">
                        <select value={form.idAsignatura}
                            onChange={(e) => setForm({ ...form, idAsignatura: e.target.value })}
                            className={selectClass}>
                            <option value="">Asignatura...</option>
                            {asignaturas.map((a) => <option key={a.idAsignatura} value={a.idAsignatura}>{a.nombre}</option>)}
                        </select>

                        <select value={form.idProfesor}
                            onChange={(e) => setForm({ ...form, idProfesor: e.target.value })}
                            className={selectClass}>
                            <option value="">Profesor...</option>
                            {profesores.map((p) => <option key={p.idProfesor} value={p.idProfesor}>{p.usuario.nombre}</option>)}
                        </select>

                        <select value={form.idSala}
                            onChange={(e) => setForm({ ...form, idSala: e.target.value })}
                            className={selectClass}>
                            <option value="">Sala...</option>
                            {salas.map((s) => <option key={s.idSala} value={s.idSala}>{s.nombre}</option>)}
                        </select>

                        <select value={form.idSede}
                            onChange={(e) => setForm({ ...form, idSede: e.target.value })}
                            className={selectClass}>
                            <option value="">Sede...</option>
                            {sedes.map((s) => <option key={s.idSede} value={s.idSede}>{s.nombre}</option>)}
                        </select>

                        <select value={form.idJornada}
                            onChange={(e) => setForm({ ...form, idJornada: e.target.value, idHorarios: [] })}
                            className={selectClass}>
                            <option value="">Jornada...</option>
                            {jornadas.map((j) => <option key={j.idJornada} value={j.idJornada}>{j.nombre}</option>)}
                        </select>

                        <select value={form.idModalidad}
                            onChange={(e) => setForm({ ...form, idModalidad: e.target.value })}
                            className={selectClass}>
                            <option value="">Modalidad...</option>
                            {modalidades.map((m) => <option key={m.idModalidad} value={m.idModalidad}>{m.nombre}</option>)}
                        </select>

                        <input
                            type="number"
                            value={form.cupos}
                            onChange={(e) => setForm({ ...form, cupos: e.target.value })}
                            placeholder="Cupos"
                            className={selectClass}
                        />
                    </div>

                    <div className="mt-4 overflow-x-auto">
                        <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">
                            Horarios — {form.idHorarios.length} seleccionados
                        </p>
                        <table className="text-xs w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="px-2 py-1 text-left text-gray-400 w-24">Hora</th>
                                    {DIAS.map((d) => (
                                        <th key={d} className="px-2 py-1 text-center text-gray-400">{d}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {horariosPorDia("Lunes").map((h, i) => (
                                    <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                                        <td className="px-2 py-1 text-gray-500 dark:text-gray-400">
                                            {h.horaInicio.slice(0, 5)}
                                        </td>
                                        {DIAS.map((dia) => {
                                            const bloque = horarios.find(
                                                (hh) => hh.diaSemana === dia && hh.horaInicio === h.horaInicio
                                            );
                                            if (!bloque) return <td key={dia} />;
                                            const permitido = esBloquePermitido(bloque);
                                            return (
                                                <td key={dia} className="px-2 py-1 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={form.idHorarios.includes(bloque.idHorario)}
                                                        onChange={() => toggleHorario(bloque.idHorario)}
                                                        disabled={!permitido}
                                                        className="w-4 h-4 accent-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {mensaje && (
                        <p className="text-sm text-emerald-500 font-medium mt-2">{mensaje}</p>
                    )}

                    <div className="flex gap-2 mt-4">
                        {editandoId ? (
                            <>
                                <button onClick={handleGuardar} disabled={!isFormValido()}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                    Guardar cambios
                                </button>
                                <button onClick={handleCancelar}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-[#1e1e2e] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    Cancelar
                                </button>
                            </>
                        ) : (
                            <button onClick={handleCrear} disabled={!isFormValido()}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                Crear sección
                            </button>
                        )}
                    </div>
                </CrudSection>

                <CrudTable columns={COLUMNS} empty="No hay secciones registradas.">
                    {secciones.map((s) => (
                        <CrudTableRow key={s.idSeccion} columns={COLUMNS}>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{s.asignatura.nombre}</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{s.profesor.usuario.nombre}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{s.sala.nombre}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{s.jornada.nombre}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{s.cupos}</span>
                            <span className={`text-sm font-medium ${inscritos[s.idSeccion] >= s.cupos ? "text-red-500" : "text-emerald-500"}`}>
                                {inscritos[s.idSeccion] ?? "—"}
                            </span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleEditar(s)}
                                    className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleEliminar(s.idSeccion)}
                                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </CrudTableRow>
                    ))}
                </CrudTable>

            </CrudLayout>
        </MainLayout>
    );
}