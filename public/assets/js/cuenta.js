// public/assets/js/cuenta.js
// Depende de script.js (API_BASE, obtenerUsuario, logout, etc.)

// ================== UTILIDADES DOM ==================
function $(id) {
  return document.getElementById(id);
}

function setTexto(id, valor) {
  const el = $(id);
  if (el) el.textContent = valor ?? "";
}

// ================== CARGA INICIAL ==================
async function cargarDatosCuenta(usuario) {
  const msgPerfil = $("msgPerfil");
  if (msgPerfil) {
    msgPerfil.className = "text-muted text-small";
    msgPerfil.textContent = "Cargando datos...";
  }

  try {
    // GET /api/pacientes/datos/:usuario
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
    if ($("nombreUsuario")) $("nombreUsuario").value = u.nombre_usuario || "";
    if ($("ciPaciente")) $("ciPaciente").value = p.ci_paciente || "";
    if ($("estadoCuentaSelect"))
      $("estadoCuentaSelect").value = u.estado === 0 ? "0" : "1";

    // ==== Datos personales ====
    if ($("campoNombreCompleto"))
      $("campoNombreCompleto").value = p.nombre_completo || "";
    if ($("campoCorreo")) $("campoCorreo").value = p.correo || "";
    if ($("campoCelular")) $("campoCelular").value = p.celular || "";
    if ($("campoDireccion")) $("campoDireccion").value = p.direccion || "";

    // Fecha nacimiento (aseguramos formato yyyy-MM-dd)
    if ($("campoFechaNacimiento") && p.fecha_nacimiento) {
      const fecha = new Date(p.fecha_nacimiento);
      const yyyy = fecha.getFullYear();
      const mm = String(fecha.getMonth() + 1).padStart(2, "0");
      const dd = String(fecha.getDate()).padStart(2, "0");
      $("campoFechaNacimiento").value = `${yyyy}-${mm}-${dd}`;
    }

    // Sexo: en BD es bit (0/1); en el select:
    //  value="1" -> Femenino
    //  value="0" -> Masculino
    if ($("campoSexo")) {
      if (p.sexo === 0 || p.sexo === 1) {
        $("campoSexo").value = String(p.sexo);
      } else {
        $("campoSexo").value = "";
      }
    }

    // Tipo sangre y centro (si los devuelves en el API)
    if ($("campoTipoSangre") && p.id_tipo_sangre != null) {
      $("campoTipoSangre").value = String(p.id_tipo_sangre);
    }
    if ($("campoCentroSalud") && p.id_centro != null) {
      $("campoCentroSalud").value = String(p.id_centro);
    }

    // ==== Avatar / Foto de perfil ====
    // Si el backend envía foto_perfil como base64:
    if (p.foto_perfil) {
      const img = $("avatarImg");
      if (img) {
        img.src = `data:image/jpeg;base64,${p.foto_perfil}`;
      }
    }

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
  const msgPerfil = $("msgPerfil");
  if (msgPerfil) {
    msgPerfil.className = "text-muted text-small";
    msgPerfil.textContent = "Guardando datos...";
  }

  const ciPaciente = $("ciPaciente")?.value.trim() || "";
  const nombreCompleto = $("campoNombreCompleto")?.value.trim() || "";
  const correo = $("campoCorreo")?.value.trim() || "";
  const celular = $("campoCelular")?.value.trim() || "";
  const fechaNacimiento = $("campoFechaNacimiento")?.value || null;
  const direccion = $("campoDireccion")?.value.trim() || "";
  const sexoValor = $("campoSexo")?.value ?? "";
  const tipoSangre = $("campoTipoSangre")?.value || null;
  const idCentro = $("campoCentroSalud")?.value || null;

  if (!ciPaciente || !nombreCompleto || !correo || !celular || !direccion || sexoValor === "" || !fechaNacimiento) {
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
    fecha_nacimiento: fechaNacimiento,
    sexo: parseInt(sexoValor, 10), // 0 ó 1
    id_tipo_sangre: tipoSangre ? Number(tipoSangre) : null,
    id_centro: idCentro ? Number(idCentro) : null,
  };

  try {
    // PUT /api/pacientes/por-usuario/:nombreUsuario
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
  const passActual = $("passActual")?.value || "";
  const passNueva = $("passNueva")?.value || "";
  const passNueva2 = $("passNueva2")?.value || "";
  const msgPass = $("msgPassword");

  if (!passActual || !passNueva || !passNueva2) {
    if (msgPass) {
      msgPass.className = "text-danger text-small";
      msgPass.textContent = "Completa todos los campos de contraseña.";
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
    // PUT /api/pacientes/password
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
    if ($("passActual")) $("passActual").value = "";
    if ($("passNueva")) $("passNueva").value = "";
    if ($("passNueva2")) $("passNueva2").value = "";
  } catch (err) {
    console.error("Error en cambiarPassword:", err);
    if (msgPass) {
      msgPass.className = "text-danger text-small";
      msgPass.textContent = "Error en el servidor al cambiar la contraseña.";
    }
  }
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

  const btnActualizarPass = $("btnActualizarPass");
  if (btnActualizarPass) {
    btnActualizarPass.addEventListener("click", (e) => {
      e.preventDefault();
      cambiarPassword(usuario);
    });
  }

  const btnCerrarSesion = $("btnCerrarSesionCuenta");
  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener("click", (e) => {
      e.preventDefault();
      logout(); // viene de script.js
    });
  }
}

// ================== ARRANQUE ==================
document.addEventListener("DOMContentLoaded", () => {
  const usuario = obtenerUsuario(); // de script.js

  if (!usuario || !usuario.nombre_usuario) {
    alert("Debes iniciar sesión para acceder a Mi Cuenta.");
    window.location.href = "index.html";
    return;
  }

  inicializarEventosCuenta(usuario);
  cargarDatosCuenta(usuario);
});

// ... aquí va todo lo que ya tenías arriba (obtener usuario, etc.)

function rellenarPerfilConDatos(perfil) {
  // Campos normales que ya llenas
  const campoNombreCompleto = document.getElementById("campoNombreCompleto");
  const campoCorreo        = document.getElementById("campoCorreo");
  const campoCelular       = document.getElementById("campoCelular");
  const campoFechaNac      = document.getElementById("campoFechaNac");
  const campoDireccion     = document.getElementById("campoDireccion");
  const campoSexo          = document.getElementById("campoSexo");
  const campoTipoSangre    = document.getElementById("campoTipoSangre");
  const campoCentro        = document.getElementById("campoCentro");

  if (campoNombreCompleto) campoNombreCompleto.value = perfil.nombre_completo || "";
  if (campoCorreo)         campoCorreo.value        = perfil.correo || "";
  if (campoCelular)        campoCelular.value       = perfil.celular || "";
  if (campoFechaNac && perfil.fecha_nacimiento) {
    // asumiendo que viene como '2024-11-24T00:00:00.000Z' o similar
    campoFechaNac.value = perfil.fecha_nacimiento.substring(0, 10);
  }
  if (campoDireccion)      campoDireccion.value     = perfil.direccion || "";
  if (campoSexo && perfil.sexo !== null && perfil.sexo !== undefined) {
    campoSexo.value = perfil.sexo ? "1" : "0";
  }
  if (campoTipoSangre && perfil.id_tipo_sangre) {
    campoTipoSangre.value = String(perfil.id_tipo_sangre);
  }
  if (campoCentro && perfil.id_centro) {
    campoCentro.value = String(perfil.id_centro);
  }

  // ==== NUEVO: avatar y textos de cabecera ====
  const avatarImg          = document.getElementById("avatarPreview");
  const textoNombreCuenta  = document.getElementById("textoNombreCuenta");
  const textoCorreoCuenta  = document.getElementById("textoCorreoCuenta");

  if (textoNombreCuenta) {
    textoNombreCuenta.textContent = perfil.nombre_completo || perfil.nombre_usuario || "Tu nombre";
  }

  if (textoCorreoCuenta) {
    textoCorreoCuenta.textContent = perfil.correo || "";
  }

  // Si la API te manda la foto como base64 (Buffer -> toString('base64'))
  if (avatarImg && perfil.foto_perfil_base64) {
    avatarImg.src = `data:image/png;base64,${perfil.foto_perfil_base64}`;
  }
}

// Cuando se cargue la página y obtengas el perfil desde la API,
// llama a rellenarPerfilConDatos(perfil) como ya haces.

// ==== NUEVO: previsualizar la foto seleccionada desde el input ====
document.addEventListener("DOMContentLoaded", () => {
  const inputFoto  = document.getElementById("campoFotoPerfil");
  const avatarImg  = document.getElementById("avatarPreview");

  if (inputFoto && avatarImg) {
    inputFoto.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        avatarImg.src = ev.target.result; // data URL
      };
      reader.readAsDataURL(file);
    });
  }

  // aquí dejas lo que ya tenías: cargar usuario, pedir datos a la API, etc.
});
