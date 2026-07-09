const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const generarHoras = (rows) => {
  return rows
    .map((r) => r?.hora)
    .filter(Boolean)
    .sort((a, b) => {
      const [ah, am] = a.split(":").map(Number);
      const [bh, bm] = b.split(":").map(Number);
      return (ah * 60 + am) - (bh * 60 + bm);
    });
};

export default function HorarioTable({ rows = [] }) {

  const HORAS = generarHoras(rows);

  const rowMap = {};
  rows.forEach((r) => { rowMap[r.hora] = r; });

  const ocupadas = {};

  return (
    <table className="w-full text-xs border-collapse table-fixed">

      <thead>
        <tr className="bg-[#1A2E4A] dark:bg-[#0a0a12] transition-colors duration-300">
          <th className="px-4 py-3 text-left text-white font-semibold w-20">
            Hora
          </th>
          {DIAS.map((d) => (
            <th
              key={d}
              className="px-4 py-3 text-center text-white font-semibold"
            >
              {d}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {HORAS.map((hora, rowIndex) => {

          const row = rowMap[hora] || {};

          return (
            <tr key={hora} className="h-20">

              <td className="border px-2 py-2 font-medium
                border-gray-200 dark:border-gray-700
                bg-gray-50 dark:bg-[#13131f]
                text-gray-700 dark:text-gray-300
                transition-colors duration-300">
                {hora}
              </td>

              {DIAS.map((dia) => {

                const ocupadoKey = `${dia}-${rowIndex}`;

                if (ocupadas[ocupadoKey]) return null;

                const bloque = row[dia];

                if (!bloque) {
                  return (
                    <td
                      key={dia}
                      className="border border-gray-200 dark:border-gray-700
                        dark:bg-[#1e1e2e] transition-colors duration-300"
                    />
                  );
                }

                for (let i = 1; i < bloque.span; i++) {
                  ocupadas[`${dia}-${rowIndex + i}`] = true;
                }

                return (
                  <td
                    key={dia}
                    rowSpan={bloque.span}
                    className={`
                      border border-gray-200 dark:border-gray-700
                      ${bloque.estilo?.bg}
                      ${bloque.estilo?.darkBg}
                      ${bloque.estilo?.text}
                      ${bloque.estilo?.darkText}
                      align-top p-2
                      transition-colors duration-300
                    `}
                  >
                    <div className="font-semibold">
                      {bloque.ramo}
                    </div>
                    <div className="text-xs mt-1 opacity-80">
                      Sección {bloque.seccion}
                    </div>
                    <div className="text-xs mt-1">
                      {bloque.inicio} - {bloque.fin}
                    </div>
                    <div className="text-xs opacity-70">
                      {bloque.sala}
                    </div>
                  </td>
                );

              })}

            </tr>
          );

        })}
      </tbody>

    </table>
  );
}