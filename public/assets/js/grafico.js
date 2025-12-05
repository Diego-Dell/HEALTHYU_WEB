// =================== PANEL DE GRAFICOS (grafico.html) ===================
async function iniciarCuentaPaciente() {
  const panel = document.getElementById("panelPaciente");
  if (!panel) return; // No estamos en grafico.html

  const usuario = obtenerUsuario();
  if (!usuario) {
    window.location.href = "index.html";
    return;
  }

  const username = usuario.nombre_usuario;

  // Mostrar nombre rápido
  document.getElementById("pacienteUsername").textContent = "@" + username;

  if (usuario.nombre_completo)
    document.getElementById("pacienteNombre").textContent = usuario.nombre_completo;

  // Iniciales avatar
  const ini = (usuario.nombre_completo || username)
    .split(" ")
    .map(p => p[0].toUpperCase())
    .slice(0, 2)
    .join("");

  document.getElementById("avatarIniciales").textContent = ini;

  // ---- CONSULTAR SIGNOS DEL PACIENTE ----
  const r = await fetch(API_BASE + "/signos/paciente/" + username);
  const data = await r.json();
  const signos = data.signos || [];

  const info = document.getElementById("infoCantidadSignos");
  const zona = document.getElementById("zonaGraficos");
  const alerta = document.getElementById("sinSignosAlert");

  if (!signos.length) {
    alerta.classList.remove("d-none");
    zona.classList.add("d-none");
    info.textContent = "No hay registros aún.";
    return;
  }

  info.textContent = "Registros cargados: " + signos.length;

  const labels = signos.map(s => s.fecha + " " + (s.hora || ""));
  const ritmo = signos.map(s => s.ritmo_cardiaco);
  const temp = signos.map(s => s.temperatura);
  const oxi = signos.map(s => s.oxigenacion);

  // Colores Healthy U
  const root = getComputedStyle(document.documentElement);
  const c1 = root.getPropertyValue("--hu-primario").trim();
  const c2 = root.getPropertyValue("--hu-secundario").trim();
  const c3 = root.getPropertyValue("--hu-acento").trim();

  // ------ GRAFICO RITMO ------
  new Chart(document.getElementById("chartRitmo"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Ritmo cardíaco",
        data: ritmo,
        borderColor: c3,
        backgroundColor: c3 + "33",
        tension: 0.3,
        fill: true
      }]
    }
  });

  // ------ GRAFICO TEMPERATURA ------
  new Chart(document.getElementById("chartTemp"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Temperatura",
        data: temp,
        borderColor: c1,
        backgroundColor: c1 + "33",
        tension: 0.3,
        fill: true
      }]
    }
  });

  // ------ GRAFICO OXIGENACION ------
  new Chart(document.getElementById("chartOxi"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Oxigenación",
        data: oxi,
        borderColor: c2,
        backgroundColor: c2 + "33",
        tension: 0.3,
        fill: true
      }]
    }
  });
}
