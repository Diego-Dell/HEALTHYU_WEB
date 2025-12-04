// public/assets/js/cuenta.js

// Depende de script.js (API_BASE, obtenerUsuario, logout, etc.)

function $(id) {
  return document.getElementById(id);
}

function setTexto(id, valor) {
  const el = $(id);
  if (el) el.textContent = valor ?? "";
}

// guardamos la foto actual en base64 (sin el prefijo data:)
let fotoActualBase64 = null;

// ================== CARGA INICIAL ==================
async function cargarDatosCuenta(usuario) {
  const msgPerfil = $("mensajePerfil");
  if (msgPerfil) {
    msgPerfil.className = "text-muted text-small";
    msgPerfil.textContent = "Cargando datos...";
  }

  try {
    const resp = await fetch(
      `${API_BASE}/pacientes/datos/${encodeURIComponent(
        usuario.nombre_usuario
      )}`
    );

    if (!resp.ok) {
      if (msgPerfil) {
        msgPerfil.className = "text-danger text-small";
        msgPerfil.textContent =
          "No se pudieron cargar los datos del paciente.";
      }
      return;
    }

    const data = await resp.json();
    const u = data.usuario || {};
    const p = data.paciente || {};

    // ==== Datos de acceso ====
    if ($("campoNombreUsuario"))
      $("campoNombreUsuario").value = u.nombre_usuario || "";

    if ($("campoCiPaciente"))
      $("campoCiPaciente").value =
        p.ci_paciente != null ? String(p.ci_paciente) : "";

    // ==== Datos personales ====
    if ($("campoNombreCompleto"))
      $("campoNombreCompleto").value = p.nombre_completo || "";

    if ($("campoCorreo")) $("campoCorreo").value = p.correo || "";

    if ($("campoCelular")) $("campoCelular").value = p.celular || "";

    if ($("campoDireccion")) $("campoDireccion").value = p.direccion || "";

    // Fecha nacimiento -> id correcto: campoFechaNac
    if ($("campoFechaNac") && p.fecha_nacimiento) {
      const fecha = new Date(p.fecha_nacimiento);
      if (!isNaN(fecha.getTime())) {
        const yyyy = fecha.getFullYear();
        const mm = String(fecha.getMonth() + 1).padStart(2, "0");
        const dd = String(fecha.getDate()).padStart(2, "0");
        $("campoFechaNac").value = `${yyyy}-${mm}-${dd}`;
      }
    }

    // Sexo (puede venir como bit 0/1 o boolean)
    if ($("campoSexo")) {
      if (p.sexo === 0 || p.sexo === 1) {
        $("campoSexo").value = String(p.sexo);
      } else if (typeof p.sexo === "boolean") {
        $("campoSexo").value = p.sexo ? "1" : "0";
      } else {
        $("campoSexo").value = "";
      }
    }

    // Tipo de sangre & centro
    if ($("campoTipoSangre") && p.id_tipo_sangre != null) {
      $("campoTipoSangre").value = String(p.id_tipo_sangre);
    }
    if ($("campoCentro") && p.id_centro != null) {
      $("campoCentro").value = String(p.id_centro);
    }

    // ==== Avatar y textos ====
    const avatar = $("avatarPreview");
    if (avatar) {
      if (p.foto_perfil) {
        // viene en base64 desde el backend
        fotoActualBase64 = p.foto_perfil;
        avatar.src = `data:image/jpeg;base64,${p.foto_perfil}`;
      } else {
        avatar.src = "../IMAGENES/avatar_default.png";
        fotoActualBase64 = null;
      }
    }

    setTexto("textoNombreCuenta", p.nombre_completo || u.nombre_usuario || "Tu nombre");
    setTexto("textoCorreoCuenta", p.correo || "tu@correo.com");

    if (msgPerfil) {
      msgPerfil.className = "text-success text-small";
      msgPerfil.textContent = "Datos cargados correctamente.";
    }
  } catch (err) {
    console.error("Error en cargarDatosCuenta:", err);
    if (msgPerfil) {
      msgPerfil.className = "text-danger text-small";
      msgPerfil.textContent =
        "Error en el servidor al obtener los datos del paciente.";
    }
  }
}

// ================== GUARDAR DATOS PACIENTE ==================
async function guardarDatosPaciente(usuario) {
  const msgPerfil = $("mensajePerfil");
  if (msgPerfil) {
    msgPerfil.className = "text-muted text-small";
    msgPerfil.textContent = "Guardando datos...";
  }

  const ciPaciente = $("campoCiPaciente")?.value.trim() || "";
  const nombreCompleto = $("campoNombreCompleto")?.value.trim() || "";
  const correo = $("campoCorreo")?.value.trim() || "";
  const celular = $("campoCelular")?.value.trim() || "";
  const fechaNacimiento = $("campoFechaNac")?.value || null;
  const direccion = $("campoDireccion")?.value.trim() || "";
  const sexoValor = $("campoSexo")?.value ?? "";
  const tipoSangre = $("campoTipoSangre")?.value || null;
  const idCentro = $("campoCentro")?.value || "";

  // Validar obligatorios
  if (
    !ciPaciente ||
    !nombreCompleto ||
    !correo ||
    !celular ||
    !direccion ||
    sexoValor === "" ||
    !fechaNacimiento
  ) {
    if (msgPerfil) {
      msgPerfil.className = "text-danger text-small";
      msgPerfil.textContent = "Faltan datos obligatorios del paciente.";
    }
    return;
  }

  const body = {
    ci_paciente: Number(ciPaciente),
    nombre_completo: nombreCompleto,
    correo,
    celular,
    direccion,
    fecha_nacimiento: fechaNacimiento, // yyyy-MM-dd
    sexo: parseInt(sexoValor, 10), // 0 ó 1
    id_tipo_sangre: tipoSangre ? Number(tipoSangre) : null,
    id_centro: idCentro ? Number(idCentro) : 1,
    foto_perfil: fotoActualBase64 || null,
  };

  try {
    const resp = await fetch(
      `${API_BASE}/pacientes/por-usuario/${encodeURIComponent(
        usuario.nombre_usuario
      )}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      if (msgPerfil) {
        msgPerfil.className = "text-danger text-small";
        msgPerfil.textContent =
          data.mensaje || "Error guardando datos del paciente.";
      }
      return;
    }

    if (msgPerfil) {
      msgPerfil.className = "text-success text-small";
      msgPerfil.textContent =
        data.mensaje || "Datos de paciente guardados correctamente.";
    }
  } catch (err) {
    console.error("Error en guardarDatosPaciente:", err);
    if (msgPerfil) {
      msgPerfil.className = "text-danger text-small";
      msgPerfil.textContent = "Error en el servidor al guardar los datos.";
    }
  }
}

// ================== CAMBIAR CONTRASEÑA ==================
async function cambiarPassword(usuario) {
  const passActual = $("campoPassActual")?.value || "";
  const passNueva = $("campoPassNueva")?.value || "";
  const passNueva2 = $("campoPassRepetir")?.value || "";
  const msgPass = $("mensajePass");

  if (!passActual || !passNueva || !passNueva2) {
    if (msgPass) {
      msgPass.className = "text-danger text-small";
      msgPass.textContent = "Completa todos los campos de contraseña.";
    }
    return;
  }

  if (passNueva.length < 6) {
    if (msgPass) {
      msgPass.className = "text-danger text-small";
      msgPass.textContent = "La nueva contraseña debe tener al menos 6 caracteres.";
    }
    return;
  }

  if (passNueva !== passNueva2) {
    if (msgPass) {
      msgPass.className = "text-danger text-small";
      msgPass.textContent = "La nueva contraseña no coincide.";
    }
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/pacientes/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre_usuario: usuario.nombre_usuario,
        actual: passActual,
        nueva: passNueva,
      }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      if (msgPass) {
        msgPass.className = "text-danger text-small";
        msgPass.textContent =
          data.mensaje || "No se pudo actualizar la contraseña.";
      }
      return;
    }

    if (msgPass) {
      msgPass.className = "text-success text-small";
      msgPass.textContent = data.mensaje || "Contraseña actualizada.";
    }

    // Limpiar campos
    $("campoPassActual").value = "";
    $("campoPassNueva").value = "";
    $("campoPassRepetir").value = "";
  } catch (err) {
    console.error("Error en cambiarPassword:", err);
    if (msgPass) {
      msgPass.className = "text-danger text-small";
      msgPass.textContent = "Error en el servidor al cambiar la contraseña.";
    }
  }
}

// ================== FOTO DE PERFIL (FRONT) ==================
function inicializarFoto() {
  const inputFoto = $("campoFotoPerfil");
  if (!inputFoto) return;

  inputFoto.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result; // data:image/...
      if (typeof result === "string") {
        const partes = result.split(",");
        fotoActualBase64 = partes.length > 1 ? partes[1] : partes[0];

        const avatar = $("avatarPreview");
        if (avatar) {
          avatar.src = result; // vista previa inmediata
        }
      }
    };
    reader.readAsDataURL(file);
  });
}

// ================== INICIALIZAR EVENTOS ==================
function inicializarEventosCuenta(usuario) {
  const formPerfil = $("formPerfil");
  if (formPerfil) {
    formPerfil.addEventListener("submit", (e) => {
      e.preventDefault();
      guardarDatosPaciente(usuario);
    });
  }

  const btnCambiarPass = $("btnCambiarPass");
  if (btnCambiarPass) {
    btnCambiarPass.addEventListener("click", (e) => {
      e.preventDefault();
      cambiarPassword(usuario);
    });
  }

  inicializarFoto();
}

// ================== ARRANQUE ==================
document.addEventListener("DOMContentLoaded", () => {
  const usuario = obtenerUsuario(); // viene de script.js

  if (!usuario || !usuario.nombre_usuario) {
    alert("Debes iniciar sesión para acceder a Mi Cuenta.");
    window.location.href = "index.html";
    return;
  }

  if ($("campoNombreUsuario")) {
    $("campoNombreUsuario").value = usuario.nombre_usuario;
  }

  inicializarEventosCuenta(usuario);
  cargarDatosCuenta(usuario);
});
