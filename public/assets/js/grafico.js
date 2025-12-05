// grafico.js
// Usa API_BASE y obtenerUsuario() definidos en script.js

// ================== CARGAR PACIENTE DEL USUARIO LOGUEADO ==================
async function cargarPacienteActual() {
  const usuario = obtenerUsuario();

  if (!usuario) {
    // Si alguien entra directo sin login → lo mandamos al inicio
    window.location.href = "index.html";
    return null;
  }

  // La API de pacientes recibe id_usuario
  const idUsuario = usuario.id_usuario;
  if (!idUsuario) {
    console.error("El usuario guardado no tiene id_usuario:", usuario);
    return null;
  }

  try {
    const resp = await fetch(
      `${API_BASE}/pacientes/por-usuario/${encodeURIComponent(idUsuario)}`
    );

    if (!resp.ok) {
      console.error("Error al obtener paciente:", await resp.text());
      return null;
    }

    const data = await resp.json();
    // según tu backend: { paciente: { ... } }
    return { usuario, paciente: data.paciente };
  } catch (err) {
    console.error("Error de red obteniendo paciente:", err);
    return null;
  }
}

// ================== RELLENAR TARJETA SUPERIOR ==================
function rellenarTarjetaPaciente(usuario, paciente) {
  const nombreEl   = document.getElementById("pacienteNombre");
  const userEl     = document.getElementById("pacienteUsername");
  const correoEl   = document.getElementById("pacienteCorreo");
  const avatarBox  = document.getElementById("avatarBox");
  const avatarText = document.getElementById("avatarIniciales");

  if (nombreEl) {
    nombreEl.textContent =
      (paciente && paciente.nombre_completo) ||
      usuario.nombre_usuario ||
      "Paciente sin nombre";
  }

  if (userEl) {
    userEl.textContent = "@" + (usuario.nombre_usuario || "usuario");
  }

  if (correoEl) {
    correoEl.textContent = (paciente && paciente.correo) || "Sin correo";
  }

  // Foto de perfil si viene en base64 (campo foto_base64 del backend)
  if (avatarBox) {
    if (paciente && paciente.foto_base64) {
      // Reemplazamos las iniciales por la imagen
      avatarBox.innerHTML = "";
      const img = document.createElement("img");
      img.src = `data:image/jpeg;base64,${paciente.foto_base64}`;
      img.alt = "Foto de perfil";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.borderRadius = "50%";
      avatarBox.appendChild(img);
    } else if (avatarText) {
      // Sin foto → iniciales
      const base =
        (paciente && paciente.nombre_completo) ||
        usuario.nombre_usuario ||
        "HU";
      const partes = base.trim().split(" ");
      let ini = "";
      if (partes[0]) ini += partes[0][0].toUpperCase();
      if (partes[1]) ini += partes[1][0].toUpperCase();
      avatarText.textContent = ini || "HU";
    }
  }
}

// ==================== GRÁFICOS ====================

function crearGraficoLineal(ctx, label, labels, data, color) {
  if (!ctx || !window.Chart) return;

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label,
          data,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          borderColor: color,
          backgroundColor: color + "33",
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 6 } },
      },
    },
  });
}

async function cargarSignosYGraficar(ci_paciente) {
  if (!ci_paciente) return;

  try {
    // ⚠️ Ajusta esta ruta al endpoint real que tengas para signos:
    const resp = await fetch(
      `${API_BASE}/signos/paciente/${encodeURIComponent(ci_paciente)}`
    );

    if (!resp.ok) {
      console.warn("No se pudieron obtener signos:", await resp.text());
      return;
    }

    const data = await resp.json();
    const signos = data.signos || [];
    if (!signos.length) return;

    const labels = signos.map((s) => s.fecha); // ajusta al campo exacto que tengas
    const ritmo = signos.map((s) => s.ritmo_cardiaco ?? s.ritmo ?? null);
    const temp  = signos.map((s) => s.temperatura ?? null);
    const oxi   = signos.map((s) => s.oxigenacion ?? null);

    const rootStyles = getComputedStyle(document.documentElement);
    const c1 =
      rootStyles.getPropertyValue("--hu-primario").trim() || "#002454";
    const c2 =
      rootStyles.getPropertyValue("--hu-secundario").trim() || "#624695";
    const c3 =
      rootStyles.getPropertyValue("--hu-acento").trim() || "#8873f0";

    const ctxRitmo = document.getElementById("chartRitmo");
    const ctxTemp  = document.getElementById("chartTemp");
    const ctxOxi   = document.getElementById("chartOxi");

    crearGraficoLineal(ctxRitmo, "Ritmo cardíaco (bpm)", labels, ritmo, c3);
    crearGraficoLineal(ctxTemp, "Temperatura (°C)", labels, temp, c1);
    crearGraficoLineal(ctxOxi, "Oxigenación (%)", labels, oxi, c2);
  } catch (err) {
    console.error("Error cargando signos:", err);
  }
}

// ==================== INICIALIZACIÓN ====================

document.addEventListener("DOMContentLoaded", async () => {
  // Solo ejecutamos si estamos en grafico.html (existe la tarjeta)
  const tarjeta = document.getElementById("pacienteNombre");
  if (!tarjeta) return;

  const data = await cargarPacienteActual();
  if (!data) return;

  const { usuario, paciente } = data;
  rellenarTarjetaPaciente(usuario, paciente);

  if (paciente && paciente.ci_paciente) {
    cargarSignosYGraficar(paciente.ci_paciente);
  }
});
