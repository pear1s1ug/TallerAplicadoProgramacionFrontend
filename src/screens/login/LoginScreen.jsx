import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AccessibilityPanel from "../../components/common/AccessibilityPanel";
import { useInscripcion } from "../../context/InscripcionContext";
import WavesBackground from "../../components/common/WavesBackground";
import DarkModeToggle from "../../components/common/DarkModeToggle";
import { GraduationCap } from "lucide-react";

export default function LoginScreen() {
  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { limpiarInscripciones } = useInscripcion();

  const handleLogin = async (e) => {
    e.preventDefault();

    // comentario
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rut, password }),
      });

      if (!response.ok) {
        alert("RUT o contraseña incorrectos");
        return;
      }

      const usuario = await response.json();
      console.log(usuario);

      sessionStorage.setItem("usuario", JSON.stringify(usuario));
      limpiarInscripciones();
      navigate("/");

    } catch (error) {
      console.error(error);
      alert("Error conectando con el servidor");
    }
  };

  return (
    <>
      <main className="min-h-screen flex">

        {/* ── Lado izquierdo con animación ── */}
        <section
          className="hidden lg:flex w-1/2 flex-col items-center justify-center gap-6 relative"
          style={{ backgroundColor: "#1A2E4A" }}
        >
          <WavesBackground />

          <div className="relative z-10 flex flex-col items-center gap-6">
            <div
              className="w-24 h-24 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #3b82f6 0%, #0d9488 100%)" }}
            >
              <GraduationCap className="text-white w-12 h-12" />
            </div>
            <p className="text-white text-xl font-semibold">Nexus Materia</p>
          </div>
        </section>

        {/* ── Formulario ── */}
        <section className="flex flex-col items-center justify-center w-full lg:w-1/2 
          bg-white dark:bg-gray-900 px-12 transition-colors duration-300">

          <form onSubmit={handleLogin} className="w-full max-w-sm flex flex-col gap-5">

            {/* Toggle dark mode */}
            <div className="flex justify-end">
              <DarkModeToggle />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Accede a tu cuenta
            </h1>

            <section className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                RUT
              </label>
              <input
                type="text"
                placeholder="12.345.678-9"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                required
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm 
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                  placeholder:text-gray-400 dark:placeholder:text-gray-500
                  focus:outline-none focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-400
                  transition-colors duration-300"
              />
            </section>

            <section className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm 
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                  placeholder:text-gray-400 dark:placeholder:text-gray-500
                  focus:outline-none focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-400
                  transition-colors duration-300"
              />
            </section>

            <button
              type="submit"
              className="w-full py-3 text-white font-semibold rounded-lg 
                hover:opacity-70 transition-opacity duration-300"
              style={{ backgroundColor: "#1A2E4A" }}
            >
              Iniciar Sesión
            </button>

          </form>
        </section>

      </main>

      <AccessibilityPanel />
    </>
  );
}