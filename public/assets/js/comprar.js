// Lógica específica de la página de precios/comprar

let contadorCarrito = 0;

// Actualiza el numerito del carrito en el navbar
function actualizarBadgeCarrito() {
  const badge = document.getElementById("cartCount");
  if (badge) {
    badge.textContent = contadorCarrito;
  }
}

// Muestra mensaje debajo del primer plan (si existe #mensaje)
function mostrarMensajePrecios(texto, tipo = "success") {
  const contenedor = document.getElementById("mensaje");
  if (!contenedor) return;

  contenedor.className = "mt-3 text-" + (tipo === "error" ? "danger" : "success");
  contenedor.textContent = texto;

  setTimeout(() => {
    contenedor.textContent = "";
    contenedor.className = "mt-3";
  }, 2500);
}

// Inicializa los botones "Agregar al carrito"
function inicializarBotonesPlanes() {
  const botones = document.querySelectorAll(".btn-add-cart");
  if (!botones.length) return;

  botones.forEach((boton) => {
    boton.addEventListener("click", () => {
      const nombre = boton.getAttribute("data-name") || "Plan";
      const precio = boton.getAttribute("data-price") || "0";


      contadorCarrito += 1;
      actualizarBadgeCarrito();

      mostrarMensajePrecios(
        `${nombre} (Bs ${precio}) agregado al carrito.`,
        "success"
      );
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Funciones globales script principal
  if (typeof iniciarTema === "function") iniciarTema();
  if (typeof actualizarNavAuth === "function") actualizarNavAuth();

  inicializarBotonesPlanes();
  actualizarBadgeCarrito();
});
