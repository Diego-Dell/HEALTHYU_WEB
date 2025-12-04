
const API_BLOG = `${API_BASE}/blog`; 

let listaPosts = [];

function normalizarPost(p, indice) {
  return {
    id: p.id || p.id_post || p.idPost || indice,
    titulo: p.titulo || p.asunto || `Publicación ${indice + 1}`,
    contenido: p.contenido || p.descripcion || "",
    autor:
      p.autor ||
      p.nombre_autor ||
      p.nombre_completo ||
      p.nombre ||
      "Autor",
    fecha:
      p.fecha ||
      p.fecha_publicacion ||
      new Date().toLocaleDateString("es-BO")
  };
}

async function cargarPostsDesdeServidor() {
  const respuesta = await fetch(`${API_BLOG}/listar`);
  if (!respuesta.ok) {
    throw new Error("No se pudieron cargar las publicaciones del blog.");
  }
  const datos = await respuesta.json();
  listaPosts = datos.map((p, i) => normalizarPost(p, i));
  return listaPosts;
}

//  la función mostrarPosts del script.js
async function mostrarPosts(filtroTexto = "") {
  const contenedor = document.getElementById("blogPosts");
  if (!contenedor) return;

  try {
    if (!listaPosts.length) {
      await cargarPostsDesdeServidor();
    }

    const texto = filtroTexto.trim().toLowerCase();
    const filtrados = texto
      ? listaPosts.filter(
          (p) =>
            p.titulo.toLowerCase().includes(texto) ||
            p.contenido.toLowerCase().includes(texto)
        )
      : listaPosts;

    renderizarListaPosts(filtrados);
  } catch (error) {
    console.error(error);
    contenedor.innerHTML =
      '<div class="col-12"><div class="alert alert-danger">No se pudieron cargar las publicaciones del blog.</div></div>';
  }
}

// Diseño tipo portada
function renderizarListaPosts(lista) {
  const contenedor = document.getElementById("blogPosts");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (!lista.length) {
    contenedor.innerHTML =
      '<div class="col-12"><div class="alert alert-info mb-0">No se encontraron publicaciones para ese criterio.</div></div>';
    return;
  }

  const postsOrdenados = [...lista].reverse();
  const principal = postsOrdenados[0];
  const destacados = postsOrdenados.slice(1);

  // Columna izquierda: destacado grande
  const colPrincipal = document.createElement("div");
  colPrincipal.className = "col-lg-8";

  const tarjetaPrincipal = document.createElement("article");
  tarjetaPrincipal.className =
    "hu-card p-4 h-100 d-flex flex-column shadow-sm";

  const etiqueta = document.createElement("p");
  etiqueta.className =
    "text-uppercase text-muted fw-semibold mb-1 text-small";
  etiqueta.textContent = "Destacado";

  const titulo = document.createElement("h2");
  titulo.className = "fw-bold mb-2";
  titulo.textContent = principal.titulo;
  titulo.style.cursor = "pointer";
  titulo.addEventListener("click", () => verPost(principal.id));

  const meta = document.createElement("p");
  meta.className = "text-muted text-small mb-3";
  meta.textContent = `Por ${principal.autor} · ${principal.fecha}`;

  const resumen = document.createElement("p");
  resumen.className = "lead mb-3";
  const textoResumido =
    principal.contenido.length > 260
      ? principal.contenido.substring(0, 260) + "…"
      : principal.contenido;
  resumen.textContent = textoResumido;

  const botonLeer = document.createElement("button");
  botonLeer.className = "btn btn-primary btn-sm align-self-start";
  botonLeer.textContent = "Leer más";
  botonLeer.addEventListener("click", () => verPost(principal.id));

  tarjetaPrincipal.append(etiqueta, titulo, meta, resumen, botonLeer);
  colPrincipal.appendChild(tarjetaPrincipal);

  // Columna derecha: recientes
  const colLateral = document.createElement("div");
  colLateral.className = "col-lg-4";

  const encabezadoLateral = document.createElement("h3");
  encabezadoLateral.className = "h5 fw-bold mb-3";
  encabezadoLateral.textContent = "Artículos recientes";

  const listaLateral = document.createElement("div");
  listaLateral.className = "d-flex flex-column gap-3";

  if (!destacados.length) {
    const aviso = document.createElement("p");
    aviso.className = "text-muted text-small mb-0";
    aviso.textContent =
      "Cuando haya más publicaciones, aparecerán aquí como lista rápida.";
    listaLateral.appendChild(aviso);
  } else {
    destacados.forEach((post) => {
      const item = document.createElement("article");
      item.className = "d-flex gap-3 align-items-start hu-card-mini";
      item.style.cursor = "pointer";
      item.addEventListener("click", () => verPost(post.id));

      const mini = document.createElement("div");
      mini.className = "rounded-3 bg-hu-soft flex-shrink-0";
      mini.style.width = "90px";
      mini.style.height = "60px";

      const cuerpo = document.createElement("div");
      const t = document.createElement("h4");
      t.className = "h6 mb-1";
      t.textContent = post.titulo;

      const m = document.createElement("p");
      m.className = "text-muted text-small mb-0";
      m.textContent = post.fecha;

      cuerpo.append(t, m);
      item.append(mini, cuerpo);
      listaLateral.appendChild(item);
    });
  }

  colLateral.append(encabezadoLateral, listaLateral);

  contenedor.append(colPrincipal, colLateral);
}

// Abre el modal con el post completo
function verPost(id) {
  const post = listaPosts.find((p) => p.id === id);
  if (!post) return;

  const tituloEl = document.getElementById("modalTituloPost");
  const metaEl = document.getElementById("modalMetaPost");
  const contenidoEl = document.getElementById("modalContenidoPost");
  const modalEl = document.getElementById("modalPostBlog");

  if (!tituloEl || !metaEl || !contenidoEl || !modalEl) return;

  tituloEl.textContent = post.titulo;
  metaEl.textContent = `Por ${post.autor} · ${post.fecha}`;

  const texto = String(post.contenido || "");
  contenidoEl.innerHTML = texto
    .split("\n")
    .map((linea) => `<p class="mb-2">${linea}</p>`)
    .join("");

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// Inicialización específica del blog
document.addEventListener("DOMContentLoaded", () => {
  const buscador = document.getElementById("blogSearch");
  if (buscador) {
    buscador.addEventListener("input", () => mostrarPosts(buscador.value));
  }
  mostrarPosts();
});
