// ================= UTILIDADES LOCALSTORAGE =================
function leerLS(clave, defecto) {
  const dato = localStorage.getItem(clave);
  return dato ? JSON.parse(dato) : (defecto ?? null);
}

function guardarLS(clave, valor) {
  localStorage.setItem(clave, JSON.stringify(valor));
}

// claves base
const CLAVE_USUARIO = "hu_usuario";
const CLAVE_SESION = "hu_sesion_activa";
const CLAVE_CARRITO = "hu_carrito";
const CLAVE_COMPRADOR = "hu_comprador";
const CLAVE_POSTS = "hu_posts";
const CLAVE_NEWSLETTER = "hu_newsletter";

// ================= USUARIO / SESIÓN =================
function obtenerUsuario() {
  return leerLS(CLAVE_USUARIO, null);
}

function guardarUsuario(usuario) {
  guardarLS(CLAVE_USUARIO, usuario);
}

function estaLogueado() {
  return localStorage.getItem(CLAVE_SESION) === "true";
}

function establecerSesion(activa) {
  localStorage.setItem(CLAVE_SESION, activa ? "true" : "false");
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

// ================= NAVBAR: ACCEDER / MI CUENTA =================
function actualizarNavUsuario() {
  const botonLogin = document.getElementById("btnLoginNav");
  const usuario = obtenerUsuario();
  const logueado = estaLogueado() && usuario;

  // Si no existe el botón en esta página, nada que hacer
  if (!botonLogin) return;

  if (logueado) {
    // Reemplaza el botón "Acceder" por un link "Mi Cuenta"
    botonLogin.outerHTML = `
      <a href="cuenta.html" class="btn btn-hu-accent btn-sm boton-acceder" id="btnCuentaNav">
        <i class="bi bi-person-circle me-1"></i>
        Mi Cuenta
      </a>
    `;
  }
}

// ================= AUTENTICACIÓN (MODAL) =================
function register() {
  const nombre = document.getElementById("registerName");
  const correo = document.getElementById("registerEmail");
  const pass = document.getElementById("registerPass");
  const pass2 = document.getElementById("registerPass2");
  const msg = document.getElementById("registerMsg");

  if (!nombre || !correo || !pass || !pass2 || !msg) return;

  const n = nombre.value.trim();
  const e = correo.value.trim();
  const p1 = pass.value.trim();
  const p2 = pass2.value.trim();

  if (!n || !e || !p1 || !p2) {
    msg.textContent = "Completa todos los campos.";
    msg.classList.remove("text-success");
    msg.classList.add("text-danger");
    return;
  }

  if (p1 !== p2) {
    msg.textContent = "Las contraseñas no coinciden.";
    msg.classList.remove("text-success");
    msg.classList.add("text-danger");
    return;
  }

  const nuevoUsuario = {
    nombre: n,
    correo: e,
    password: p1,
    username: n // si quieres otro username, aquí lo cambias
  };

  guardarUsuario(nuevoUsuario);
  establecerSesion(true);

  msg.textContent = "Usuario registrado correctamente.";
  msg.classList.remove("text-danger");
  msg.classList.add("text-success");

  setTimeout(() => {
    const modalEl = document.getElementById("authModal");
    if (modalEl && window.bootstrap) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
    actualizarNavUsuario();
    actualizarPermisosBlog();
  }, 800);
}

function login() {
  const usuarioInput = document.getElementById("loginUser");
  const passInput = document.getElementById("loginPass");
  const msg = document.getElementById("loginMsg");

  if (!usuarioInput || !passInput || !msg) return;

  const guardado = obtenerUsuario();
  const u = usuarioInput.value.trim();
  const p = passInput.value.trim();

  if (!guardado) {
    msg.textContent = "No existe usuario registrado en este equipo.";
    return;
  }

  const coincideUsuario =
    u === guardado.username || u === guardado.correo;

  if (coincideUsuario && p === guardado.password) {
    establecerSesion(true);
    msg.textContent = "";

    const modalEl = document.getElementById("authModal");
    if (modalEl && window.bootstrap) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    actualizarNavUsuario();
    actualizarPermisosBlog();
  } else {
    msg.textContent = "Usuario o contraseña incorrectos.";
  }
}

function logout() {
  establecerSesion(false);
  // Mantenemos los datos del usuario para poder volver a iniciar sesión
  window.location.href = "index.html";
}

// ================= NEWSLETTER (SI LO USAS EN INDEX) =================
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

  const span1 = document.getElementById("cart-count");
  const span2 = document.getElementById("cartCount");

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

// ================= DATOS DEL COMPRADOR =================
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
    formulario.nombre.value = comprador.nombre || "";
    formulario.direccion.value = comprador.direccion || "";
    formulario.telefono.value = comprador.telefono || "";
    formulario.correo.value = comprador.correo || "";
    formulario.ubicacion.value = comprador.ubicacion || "";
  }

  formulario.addEventListener("submit", (e) => {
    e.preventDefault();

    const datos = {
      nombre: formulario.nombre.value.trim(),
      direccion: formulario.direccion.value.trim(),
      telefono: formulario.telefono.value.trim(),
      correo: formulario.correo.value.trim(),
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

// ================= BLOG =================
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
  const usuario = obtenerUsuario();
  const logueado = estaLogueado() && usuario;

  if (contenedorFormulario) {
    contenedorFormulario.style.display = logueado ? "block" : "none";
  }
}

function crearPost() {
  const usuario = obtenerUsuario();
  const logueado = estaLogueado() && usuario;

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
  const nuevo = {
    titulo,
    contenido,
    autor: usuario.username || usuario.nombre || "Usuario",
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

// ================= PERFIL / CUENTA =================
function iniciarPerfil() {
  const caja = document.getElementById("profileBox");
  if (!caja) return;

  const usuario = obtenerUsuario();
  const logueado = estaLogueado() && usuario;

  const nombreEl = document.getElementById("profileUsername");
  const correoEl = document.getElementById("profileEmail");
  const postsEl = document.getElementById("profilePostsCount");
  const temaEl = document.getElementById("profileTheme");

  if (!logueado) {
    caja.innerHTML =
      '<div class="alert alert-warning">Debes iniciar sesión para ver tu perfil.</div>';
    return;
  }

  const posts = obtenerPosts().filter(
    (p) => p.autor === (usuario.username || usuario.nombre)
  );

  if (nombreEl) nombreEl.textContent = usuario.username || usuario.nombre;
  if (correoEl) correoEl.textContent = usuario.correo || "";
  if (postsEl) postsEl.textContent = posts.length.toString();
  if (temaEl)
    temaEl.textContent =
      localStorage.getItem("huTema") === "dark" ? "Oscuro" : "Claro";
}

// ================= INICIALIZACIÓN GLOBAL =================
document.addEventListener("DOMContentLoaded", () => {
  iniciarTema();
  actualizarNavUsuario();
  actualizarContadorCarrito();

  iniciarComprar();
  iniciarDatos();
  iniciarPedido();
  iniciarBlog();
  iniciarPerfil();
});
