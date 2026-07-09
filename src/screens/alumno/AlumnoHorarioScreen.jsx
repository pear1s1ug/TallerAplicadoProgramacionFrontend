import { useEffect, useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Download } from "lucide-react";
import HorarioTable from "../../components/common/HorarioTable";
import MainLayout from "../../layouts/MainLayout";
import HorarioLayout from "../../layouts/HorarioLayout";
import { ALUMNO_NAV } from "../../config/navConfig";
import { getInscripcionesByAlumno, getSeccionesByAsignatura } from "../../api/inscripcionApiRequest";
import { getEstiloRamo, DIA_MAP } from "../../config/ramosConfig";

export default function AlumnoHorarioScreen() {
  const usuario = JSON.parse(sessionStorage.getItem("usuario"));
  const idAlumno = usuario?.idEntidad;
  const tablaRef = useRef(null);

  const [inscripciones, setInscripciones] = useState([]);
  const [secciones, setSecciones] = useState({});

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    if (!idAlumno) return;
    try {
      const data = await getInscripcionesByAlumno(idAlumno);
      if (!Array.isArray(data)) return;
      setInscripciones(data);
      await Promise.all(data.map((i) => cargarSeccion(i.idAsignatura, i.idSeccion)));
    } catch (e) { console.error(e); }
  };

  const cargarSeccion = async (idAsignatura, idSeccion) => {
    try {
      const data = await getSeccionesByAsignatura(idAsignatura);
      const seccion = data.find((s) => s.idSeccion === idSeccion);
      if (seccion) setSecciones((prev) => ({ ...prev, [idSeccion]: seccion }));
    } catch (e) { console.error(e); }
  };

  // ── Horario (CORREGIDO) ───────────────────────────────────────────────────
  // FIX: el span ya no se calcula dividiendo minutos por 60 (lo que daba
  // valores fraccionarios como 0.65 para bloques de 39 min, y eso rompía
  // el rowSpan en HTML — rowspan="0" hace que la celda se expanda hasta
  // el final de la tabla, desalineando todas las columnas siguientes).
  // Ahora el span se calcula contando cuántas filas reales (horas únicas)
  // cubre el bloque.
  const buildHorario = () => {
    const norm = (s) => s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const minutos = (hhmm) => {
      const [h, m] = hhmm.split(":").map(Number);
      return h * 60 + m;
    };

    // 1️⃣ Primera pasada: recolectar los bloques crudos, sin span todavía
    const bloquesRaw = [];

    inscripciones.forEach((inscripcion) => {
      const seccion = secciones[inscripcion.idSeccion];
      if (!seccion) return;

      seccion.horarios.forEach((h) => {
        const dia = DIA_MAP[norm(h.horario.diaSemana)];
        if (!dia) return;

        bloquesRaw.push({
          dia,
          horaInicio: h.horario.horaInicio.slice(0, 5),
          horaFin: h.horario.horaFin.slice(0, 5),
          ramo: inscripcion.nombreAsignatura,
          sala: seccion.sala.nombre,
          seccion: seccion.idSeccion,
          estilo: getEstiloRamo(inscripcion.idAsignatura),
        });
      });
    });

    // 2️⃣ Horas únicas que realmente existen, ordenadas cronológicamente
    const horasUnicas = [...new Set(bloquesRaw.map((b) => b.horaInicio))]
      .sort((a, b) => minutos(a) - minutos(b));

    // 3️⃣ Segunda pasada: armamos bloques[hora][dia] con el span correcto
    const bloques = {};

    bloquesRaw.forEach((b) => {
      const finMin = minutos(b.horaFin);
      const indiceInicio = horasUnicas.indexOf(b.horaInicio);

      let span = 1;
      for (let i = indiceInicio + 1; i < horasUnicas.length; i++) {
        if (minutos(horasUnicas[i]) < finMin) span++;
        else break;
      }

      if (!bloques[b.horaInicio]) bloques[b.horaInicio] = { hora: b.horaInicio };

      bloques[b.horaInicio][b.dia] = {
        ramo: b.ramo,
        sala: b.sala,
        seccion: b.seccion,
        inicio: b.horaInicio,
        fin: b.horaFin,
        span,
        estilo: b.estilo,
      };
    });

    return Object.values(bloques).sort((a, b) => a.hora.localeCompare(b.hora));
  };

const exportarPDF = async () => {
  if (!tablaRef.current) return;

  // Clonar el elemento y posicionarlo fuera de la vista
  const clone = tablaRef.current.cloneNode(true);
  clone.style.position = "fixed";
  clone.style.top = "-9999px";
  clone.style.left = "-9999px";
  clone.style.width = tablaRef.current.offsetWidth + "px";

  // Forzar estilos claros solo en el clon
  clone.style.backgroundColor = "#ffffff";
  clone.style.color = "#000000";

  // Quitar clases dark del clon sin tocar el DOM real
  clone.classList.remove("dark");
  clone.querySelectorAll("[class]").forEach((el) => {
    el.classList.forEach((cls) => {
      if (cls.startsWith("dark:")) el.classList.remove(cls);
    });
  });

  document.body.appendChild(clone);

  const canvas = await html2canvas(clone, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  document.body.removeChild(clone); // ← limpiamos el clon

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const fecha = new Date().toLocaleDateString("es-CL", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  pdf.setFontSize(16);
  pdf.setTextColor(26, 46, 74);
  pdf.text("Nexus Materia — Horario Semanal", 14, 16);

  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(`Alumno: ${usuario?.nombre ?? "—"}`, 14, 24);
  pdf.text(`Generado el: ${fecha}`, 14, 30);

  const imgWidth = pdfWidth - 28;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 14, 36, imgWidth,
    Math.min(imgHeight, pdfHeight - 46));

  pdf.save(`horario_${usuario?.nombre?.replace(/\s+/g, "_") ?? "alumno"}.pdf`);
};

  const rows = buildHorario();

  return (
    <MainLayout navItems={ALUMNO_NAV}>
      <HorarioLayout
        title="Mi Horario"
        subtitle="Tus clases inscritas"
        right={
          <div className="flex flex-col gap-3">

            {/* Encabezado con botón exportar */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {usuario?.nombre}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date().toLocaleDateString("es-CL", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric"
                  })}
                </p>
              </div>
              <button
                onClick={exportarPDF}
                disabled={rows.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                  text-white bg-blue-500 hover:bg-blue-600
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar PDF
              </button>
            </div>

            {/* Tabla con ref para captura */}
            <section
              ref={tablaRef}
              className="rounded-2xl p-4 shadow-sm overflow-x-auto
                bg-white dark:bg-[#1e1e2e] transition-colors duration-300"
            >
              {rows.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-12">
                  No tienes ramos inscritos aún.
                </p>
              ) : (
                <HorarioTable rows={rows} />
              )}
            </section>

          </div>
        }
      />
    </MainLayout>
  );
}
