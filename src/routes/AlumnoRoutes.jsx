import { Routes, Route, Navigate } from "react-router-dom";
import AlumnoRamoScreen       from "../screens/alumno/AlumnoRamoScreen";
import AlumnoModifyRamoScreen from "../screens/alumno/AlumnoModifyRamoScreen";
import AlumnoHorarioScreen    from "../screens/alumno/AlumnoHorarioScreen";
import AlumnoPreferenciasScreen from "../screens/alumno/AlumnoPreferenciasScreen";

export default function AlumnoRoutes() {
  return (
    <Routes>
      <Route path="ramos"           element={<AlumnoRamoScreen />} />
      <Route path="horario"         element={<AlumnoHorarioScreen />} />
      <Route path="modificar-ramos" element={<AlumnoModifyRamoScreen />} />
      <Route path="preferencias" element={<AlumnoPreferenciasScreen />} />
      <Route path="*"               element={<Navigate to="ramos" replace />} />
    </Routes>
  );
}