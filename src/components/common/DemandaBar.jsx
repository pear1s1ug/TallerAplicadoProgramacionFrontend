export default function DemandaBar({ nombre, inscritos, cupos, ratio }) {
  const porcentaje = Math.round(ratio * 100);

  const color = porcentaje >= 90
    ? "bg-red-500"
    : porcentaje >= 60
    ? "bg-amber-500"
    : "bg-emerald-500";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
          {nombre}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-2">
          {inscritos}/{cupos}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(porcentaje, 100)}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 text-right">
        {porcentaje}% ocupado
      </span>
    </div>
  );
}