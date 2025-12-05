// ================= CONFIGURACIÓN API =================
const API_BASE = "http://localhost:4000/api";


// ================= UTILIDADES LOCALSTORAGE =================
function leerLS(clave, defecto) {
  const dato = localStorage.getItem(clave);
  return dato ? JSON.parse(dato) : (defecto ?? null);
}

function guardarLS(clave, valor) {
  localStorage.setItem(clave, JSON.stringify(valor));
}

// claves base
const CLAVE_USUARIO   = "hu_usuario";      // sesión
const CLAVE_CARRITO   = "hu_carrito";
const CLAVE_COMPRADOR = "hu_comprador";
const CLAVE_POSTS     = "hu_posts";
const CLAVE_NEWSLETTER = "hu_newsletter";


// ================= SESIÓN / USUARIO =================
function obtenerUsuario() {
  return leerLS(CLAVE_USUARIO, null);
}

function guardarUsuario(usuario) {
  guardarLS(CLAVE_USUARIO, usuario);
}

function estaLogueado() {
  return !!obtenerUsuario();
}

function logout() {
  // borrar usuario de sesión
  localStorage.removeItem(CLAVE_USUARIO);

  // refrescar elementos de la barra de navegación
  actualizarNavAuth();

  // volver al inicio
  window.location.href = "index.html";
}



// ================= TEMA CLARO / OSCURO =================
function aplicarTema(tema) {
  const cuerpo = document.body;

  if (tema === "dark") {
    cuerpo.classList.add("modo-oscuro");
  } else {
    cuerpo.classList.remove("modo-oscuro");
  }

  const botonTema = document.getElementById("themeToggle");
  if (botonTema) {
    if (tema === "dark") {
      botonTema.innerHTML = '<i class="bi bi-sun-fill me-1"></i> Claro';
    } else {
      botonTema.innerHTML = '<i class="bi bi-moon-stars-fill me-1"></i> Oscuro';
    }
  }

  localStorage.setItem("huTema", tema);
}

function iniciarTema() {
  const guardado = localStorage.getItem("huTema") || "light";
  aplicarTema(guardado);

  const botonTema = document.getElementById("themeToggle");
  if (botonTema) {
    botonTema.addEventListener("click", () => {
      const actual = localStorage.getItem("huTema") || "light";
      aplicarTema(actual === "light" ? "dark" : "light");
    });
  }
}


// ================= NAVBAR: BOTÓN ACCEDER / MI CUENTA =================
function actualizarNavAuth() {
  const usuario = obtenerUsuario();
  const btnLogin = document.getElementById("btnLoginNav");
  const navMenu  = document.querySelector(".menu-principal"); // UL del menú

  if (!btnLogin) return;

  // Buscar (si existe) el item de menú "Estadísticas"
  let itemEstadisticas = document.getElementById("navEstadisticas");

  if (usuario) {
    // ========== BOTÓN MI CUENTA ==========
    btnLogin.innerHTML = '<i class="bi bi-person-badge me-1"></i> Mi cuenta';
    btnLogin.classList.remove("btn-hu-accent");
    btnLogin.classList.add("btn-outline-primary");

    btnLogin.removeAttribute("data-bs-toggle");
    btnLogin.removeAttribute("data-bs-target");

    // El botón sigue yendo a cuenta.html (tu página de perfil)
    btnLogin.onclick = () => {
      window.location.href = "cuenta.html";
    };

    // ========== ITEM "ESTADÍSTICAS" EN EL MENÚ ==========
    if (navMenu && !itemEstadisticas) {
      itemEstadisticas = document.createElement("li");
      itemEstadisticas.className = "nav-item";
      itemEstadisticas.id = "navEstadisticas";

      itemEstadisticas.innerHTML = `
        <a class="nav-link" href="grafico.html" style="color: var(--text-main);">
          <i class="bi bi-graph-up-arrow me-1"></i>Estadísticas
        </a>
      `;

      navMenu.appendChild(itemEstadisticas);
    }
  } else {
    // ========== SIN SESIÓN ==========
    btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Acceder';
    btnLogin.classList.add("btn-hu-accent");
    btnLogin.classList.remove("btn-outline-primary");

    btnLogin.setAttribute("data-bs-toggle", "modal");
    btnLogin.setAttribute("data-bs-target", "#authModal");
    btnLogin.onclick = null;

    // Eliminar item "Estadísticas" si existía
    if (itemEstadisticas) {
      itemEstadisticas.remove();
    }
  }
}





// ================== LOGIN / REGISTRO contra API ==================

// LOGIN
async function login(nombreUsuarioForzado = null, passForzado = null, silencioso = false) {
  const usuarioInput = document.getElementById("loginUser");
  const passInput    = document.getElementById("loginPass");
  const msg          = document.getElementById("loginMsg");

  const nombre_usuario =
    (nombreUsuarioForzado ?? (usuarioInput && usuarioInput.value.trim())) || "";
  const contrasena =
    (passForzado ?? (passInput && passInput.value.trim())) || "";

  if (!nombre_usuario || !contrasena) {
    if (!silencioso && msg) {
      msg.textContent = "Completa usuario y contraseña.";
      msg.className = "text-danger text-small";
    }
    return false;
  }

  try {
    const respuesta = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre_usuario, contrasena })
    });

    const data = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      if (!silencioso && msg) {
        msg.textContent = data.mensaje || "Usuario o contraseña incorrectos.";
        msg.className = "text-danger text-small";
      }
      return false;
    }

    // Se espera que la API devuelva { usuario: {...} }
    guardarUsuario(data.usuario || { nombre_usuario });

    if (!silencioso && msg) {
      msg.textContent = "";
    }

    actualizarNavAuth();

    // Cerrar modal
    const modalEl = document.getElementById("authModal");
    if (!silencioso && modalEl && window.bootstrap?.Modal?.getInstance) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    if (!silencioso) {
  window.location.href = "cuenta.html";
    }

    return true;
  } catch (err) {
    console.error("Error login:", err);
    if (!silencioso && msg) {
      msg.textContent = "No se pudo conectar con el servidor (API).";
      msg.className = "text-danger text-small";
    }
    return false;
  }
}

// REGISTRO (soporta formularios con registerUser ó registerName/registerEmail)
async function register() {
  const msg = document.getElementById("registerMsg");
  if (!msg) return;

  const inputUser   = document.getElementById("registerUser");   // index.html
  const inputName   = document.getElementById("registerName");   // manual/contacto
  const inputEmail  = document.getElementById("registerEmail");  // manual/contacto
  const passInput   = document.getElementById("registerPass");
  const pass2Input  = document.getElementById("registerPass2");

  if (!passInput || !pass2Input) return;

  let nombre_usuario = "";
  let nombre = "";
  let correo = "";

  if (inputUser) {
    // Caso index: el usuario escribe directamente su nombre de usuario
    nombre_usuario = inputUser.value.trim();
  } else if (inputName) {
    // Caso modal con nombre + correo
    nombre = inputName.value.trim();
  }

  if (inputEmail) {
    correo = inputEmail.value.trim();
    // Si no hay registerUser, usamos el correo para generar nombre_usuario
    if (!nombre_usuario && correo) {
      nombre_usuario = correo.split("@")[0];
    }
  }

  const contrasena  = passInput.value.trim();
  const contrasena2 = pass2Input.value.trim();

  // ===== Validaciones básicas =====
  if (!nombre_usuario || !contrasena || !contrasena2) {
    msg.textContent = "Completa todos los campos.";
    msg.className = "text-danger text-small";
    return;
  }

  if (contrasena !== contrasena2) {
    msg.textContent = "Las contraseñas no coinciden.";
    msg.className = "text-danger text-small";
    return;
  }

  if (contrasena.length < 6) {
    msg.textContent = "La contraseña debe tener al menos 6 caracteres.";
    msg.className = "text-danger text-small";
    return;
  }

  // ===== Armamos payload para la API =====
  const payload = {
    nombre_usuario,
    contrasena
  };

  // Si tu backend acepta estos campos, los mandamos también
  if (nombre) payload.nombre = nombre;
  if (correo) payload.correo = correo;

  try {
    const respuesta = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      msg.textContent = data.mensaje || "Error registrando usuario.";
      msg.className = "text-danger text-small";
      console.error("Error registro:", respuesta.status, data);
      return;
    }

    // Intentar login automático
    const ok = await login(nombre_usuario, contrasena, true);
    if (ok) {
      msg.textContent = "Cuenta creada correctamente. Redirigiendo a Mi Cuenta...";
      msg.className = "text-success text-small";

      const modalEl = document.getElementById("authModal");
      if (modalEl && window.bootstrap?.Modal?.getInstance) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }

      window.location.href = "cuenta.html";
    } else {
      msg.textContent = "Usuario creado. Inicia sesión con tus credenciales.";
      msg.className = "text-success text-small";
    }
  } catch (err) {
    console.error("Error de red en registro:", err);
    msg.textContent = "No se pudo conectar con el servidor (API).";
    msg.className = "text-danger text-small";
  }
}


// ================= NEWSLETTER =================
function suscribirNewsletter() {
  const input = document.getElementById("newsletterEmail");
  const msg = document.getElementById("newsletterMsg");
  if (!input || !msg) return;

  const correo = input.value.trim();
  if (!correo) {
    msg.textContent = "Ingresa un correo válido.";
    msg.classList.remove("text-success");
    msg.classList.add("text-danger");
    return;
  }

  const lista = leerLS(CLAVE_NEWSLETTER, []);
  lista.push(correo);
  guardarLS(CLAVE_NEWSLETTER, lista);

  msg.textContent = "¡Gracias por suscribirte!";
  msg.classList.add("text-success");
  msg.classList.remove("text-danger");
  input.value = "";
}


// ================= CARRITO =================
function obtenerCarrito() {
  return leerLS(CLAVE_CARRITO, []);
}

function guardarCarrito(carrito) {
  guardarLS(CLAVE_CARRITO, carrito);
}

function actualizarContadorCarrito() {
  const carrito = obtenerCarrito();
  const total = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  const span1 = document.getElementById("cart-count"); // icono en pedido.html
  const span2 = document.getElementById("cartCount");  // icono en navbar general

  if (span1) span1.textContent = total;
  if (span2) span2.textContent = total;
}

// Página comprar.html (botones "Agregar al carrito")
function iniciarComprar() {
  const botones = document.querySelectorAll(".btn-add-cart");
  if (!botones.length) return;

  const mensajeDiv = document.getElementById("mensaje");

  botones.forEach((btn) => {
    btn.addEventListener("click", () => {
      const nombre = btn.getAttribute("data-name");
      const precio = parseFloat(btn.getAttribute("data-price") || "0");
      const carrito = obtenerCarrito();

      const encontrado = carrito.find(
        (p) => p.nombre === nombre && p.precio === precio
      );
      if (encontrado) {
        encontrado.cantidad += 1;
      } else {
        carrito.push({ nombre, precio, cantidad: 1 });
      }

      guardarCarrito(carrito);
      actualizarContadorCarrito();

      if (mensajeDiv) {
        mensajeDiv.className = "alert alert-success mt-3";
        mensajeDiv.textContent = "Producto agregado al carrito.";
        setTimeout(() => {
          mensajeDiv.className = "";
          mensajeDiv.textContent = "";
        }, 2000);
      }
    });
  });
}


// ================= DATOS DEL COMPRADOR (datos.html) =================
function obtenerComprador() {
  return leerLS(CLAVE_COMPRADOR, null);
}

function guardarComprador(comprador) {
  guardarLS(CLAVE_COMPRADOR, comprador);
}

function iniciarDatos() {
  const formulario = document.getElementById("form-datos");
  if (!formulario) return;

  const comprador = obtenerComprador();
  if (comprador) {
    formulario.nombre.value    = comprador.nombre || "";
    formulario.direccion.value = comprador.direccion || "";
    formulario.telefono.value  = comprador.telefono || "";
    formulario.correo.value    = comprador.correo || "";
    formulario.ubicacion.value = comprador.ubicacion || "";
  }

  formulario.addEventListener("submit", (e) => {
    e.preventDefault();

    const datos = {
      nombre:    formulario.nombre.value.trim(),
      direccion: formulario.direccion.value.trim(),
      telefono:  formulario.telefono.value.trim(),
      correo:    formulario.correo.value.trim(),
      ubicacion: formulario.ubicacion.value.trim(),
    };

    guardarComprador(datos);
    window.location.href = "pedido.html";
  });
}


// ================= PÁGINA PEDIDO =================
function iniciarPedido() {
  const cuerpoTabla = document.getElementById("tabla-carrito");
  const totalSpan = document.getElementById("total-pagar");
  const datosDiv = document.getElementById("datos-comprador");
  const btnFinalizar = document.getElementById("btn-finalizar");

  if (!cuerpoTabla || !totalSpan) return;

  function renderizarPedido() {
    const carrito = obtenerCarrito();
    cuerpoTabla.innerHTML = "";
    let total = 0;

    if (!carrito.length) {
      const fila = document.createElement("tr");
      const celda = document.createElement("td");
      celda.colSpan = 5;
      celda.className = "text-center";
      celda.textContent =
        'Tu carrito está vacío. Agrega el sistema desde "Comprar sistema".';
      fila.appendChild(celda);
      cuerpoTabla.appendChild(fila);
    } else {
      carrito.forEach((item, indice) => {
        const fila = document.createElement("tr");

        const tdNombre = document.createElement("td");
        tdNombre.textContent = item.nombre;

        const tdCantidad = document.createElement("td");
        tdCantidad.className = "text-center";
        tdCantidad.textContent = item.cantidad;

        const tdPrecio = document.createElement("td");
        tdPrecio.className = "text-end";
        tdPrecio.textContent = "Bs " + item.precio.toFixed(2);

        const subtotal = item.precio * item.cantidad;
        const tdSubtotal = document.createElement("td");
        tdSubtotal.className = "text-end";
        tdSubtotal.textContent = "Bs " + subtotal.toFixed(2);
        total += subtotal;

        const tdAccion = document.createElement("td");
        tdAccion.className = "text-end";
        const botonEliminar = document.createElement("button");
        botonEliminar.className = "btn btn-sm btn-outline-danger";
        botonEliminar.textContent = "Eliminar";
        botonEliminar.addEventListener("click", () => {
          const c = obtenerCarrito();
          c.splice(indice, 1);
          guardarCarrito(c);
          renderizarPedido();
          actualizarContadorCarrito();
        });
        tdAccion.appendChild(botonEliminar);

        fila.append(tdNombre, tdCantidad, tdPrecio, tdSubtotal, tdAccion);
        cuerpoTabla.appendChild(fila);
      });
    }

    totalSpan.textContent = total.toFixed(2);
  }

  renderizarPedido();

  if (datosDiv) {
    const comprador = obtenerComprador();
    if (comprador) {
      datosDiv.innerHTML = `
        <p class="mb-1"><strong>Nombre:</strong> ${comprador.nombre}</p>
        <p class="mb-1"><strong>Teléfono:</strong> ${comprador.telefono}</p>
        <p class="mb-1"><strong>Correo:</strong> ${comprador.correo}</p>
        <p class="mb-0"><strong>Ubicación:</strong> ${comprador.ubicacion}</p>
      `;
    } else {
      datosDiv.innerHTML =
        '<p class="text-muted">Aún no registraste tus datos. Completa el formulario en "Datos del comprador".</p>';
    }
  }

  if (btnFinalizar) {
    btnFinalizar.addEventListener("click", () => {
      const carrito = obtenerCarrito();
      if (!carrito.length) {
        alert("Tu carrito está vacío.");
        return;
      }
      alert("¡Gracias por tu compra de Healthy U!");
      guardarCarrito([]);
      actualizarContadorCarrito();
      window.location.href = "index.html";
    });
  }
}


// ================= BLOG LOCAL (si lo sigues usando) =================
function obtenerPosts() {
  return leerLS(CLAVE_POSTS, []);
}

function guardarPosts(posts) {
  guardarLS(CLAVE_POSTS, posts);
}

function renderizarListaPosts(items) {
  const contenedor = document.getElementById("blogPosts");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (!items.length) {
    contenedor.innerHTML =
      '<div class="col-12"><div class="alert alert-info">Aún no hay publicaciones. Usa el formulario de arriba para crear la primera.</div></div>';
    return;
  }

  items.forEach(({ post, indice }) => {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4";

    const tarjeta = document.createElement("div");
    tarjeta.className = "card hu-card h-100";

    const cuerpo = document.createElement("div");
    cuerpo.className = "card-body d-flex flex-column";

    const titulo = document.createElement("h5");
    titulo.className = "card-title fw-bold";
    titulo.textContent = post.titulo;

    const parrafo = document.createElement("p");
    parrafo.className = "card-text text-muted flex-grow-1";
    const resumen =
      post.contenido.length > 140
        ? post.contenido.substring(0, 140) + "…"
        : post.contenido;
    parrafo.textContent = resumen;

    const info = document.createElement("p");
    info.className = "text-small text-muted mb-2";
    info.textContent = `Por ${post.autor} · ${post.fecha}`;

    const botonLeer = document.createElement("button");
    botonLeer.className = "btn btn-outline-primary btn-sm align-self-start";
    botonLeer.textContent = "Leer más";
    botonLeer.addEventListener("click", () => verPost(indice));

    cuerpo.append(titulo, parrafo, info, botonLeer);
    tarjeta.appendChild(cuerpo);
    col.appendChild(tarjeta);
    contenedor.appendChild(col);
  });
}

function actualizarPermisosBlog() {
  const contenedorFormulario = document.getElementById("postFormContainer");
  const logueado = estaLogueado();

  if (contenedorFormulario) {
    contenedorFormulario.style.display = logueado ? "block" : "none";
  }
}

function crearPost() {
  const usuario = obtenerUsuario();
  const logueado = !!usuario;

  if (!logueado) {
    alert("Debes iniciar sesión para crear una publicación.");
    return;
  }

  const inputTitulo = document.getElementById("postTitulo");
  const inputContenido = document.getElementById("postContenido");
  if (!inputTitulo || !inputContenido) return;

  const titulo = inputTitulo.value.trim();
  const contenido = inputContenido.value.trim();
  if (!titulo || !contenido) return;

  const posts = obtenerPosts();
  const autorNombre =
    usuario.nombre_usuario ||
    usuario.username ||
    usuario.nombre ||
    "Usuario";

  const nuevo = {
    titulo,
    contenido,
    autor: autorNombre,
    fecha: new Date().toLocaleString(),
  };

  posts.push(nuevo);
  guardarPosts(posts);

  inputTitulo.value = "";
  inputContenido.value = "";
  mostrarPosts();
}

function verPost(indice) {
  const posts = obtenerPosts();
  const post = posts[indice];
  if (!post) return;

  alert(
    post.titulo +
      "\n\n" +
      post.contenido +
      "\n\nAutor: " +
      post.autor +
      " · " +
      post.fecha
  );
}

function mostrarPosts(filtroTexto) {
  const posts = obtenerPosts();
  const items = [];

  posts.forEach((p, idx) => {
    if (!filtroTexto) {
      items.push({ post: p, indice: idx });
    } else {
      const q = filtroTexto.toLowerCase();
      if (
        p.titulo.toLowerCase().includes(q) ||
        p.contenido.toLowerCase().includes(q)
      ) {
        items.push({ post: p, indice: idx });
      }
    }
  });

  renderizarListaPosts(items);
}

function iniciarBlog() {
  const contenedorPosts = document.getElementById("blogPosts");
  if (!contenedorPosts) return;

  const buscador = document.getElementById("blogSearch");

  if (buscador) {
    buscador.addEventListener("input", () => {
      const texto = buscador.value.trim();
      mostrarPosts(texto);
    });
  }

  actualizarPermisosBlog();
  mostrarPosts();
}


// ================= PERFIL / CUENTA (BÁSICO, si usas profileBox) =================
function iniciarPerfil() {
  const caja = document.getElementById("profileBox");
  if (!caja) return;

  const usuario = obtenerUsuario();

  const nombreEl = document.getElementById("profileUsername");
  const correoEl = document.getElementById("profileEmail");
  const postsEl  = document.getElementById("profilePostsCount");
  const temaEl   = document.getElementById("profileTheme");

  if (!usuario) {
    caja.innerHTML =
      '<div class="alert alert-warning">Debes iniciar sesión para ver tu perfil.</div>';
    return;
  }

  const posts = obtenerPosts().filter(
    (p) =>
      p.autor ===
      (usuario.nombre_usuario || usuario.username || usuario.nombre)
  );

  if (nombreEl) nombreEl.textContent =
    usuario.nombre_usuario || usuario.username || usuario.nombre || "";
  if (correoEl) correoEl.textContent = usuario.correo || "";
  if (postsEl)  postsEl.textContent = posts.length.toString();
  if (temaEl)
    temaEl.textContent =
      localStorage.getItem("huTema") === "dark" ? "Oscuro" : "Claro";
}


// ================= INICIALIZACIÓN GLOBAL =================
document.addEventListener("DOMContentLoaded", () => {
  iniciarTema();
  actualizarNavAuth();
  actualizarContadorCarrito();
  iniciarComprar();
  iniciarDatos();
  iniciarPedido();
  iniciarBlog();
  iniciarPerfil();
});

document.addEventListener("DOMContentLoaded", () => {
  actualizarNavAuth();
  iniciarCuentaPaciente();  
});
