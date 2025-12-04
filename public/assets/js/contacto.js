

function inicializarFormularioContacto() {
  const form = document.getElementById("formContacto");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    alert("Mensaje enviado (simulado para la tarea).");

    form.reset();
  });
}

document.addEventListener("DOMContentLoaded", () => {

  if (typeof iniciarTema === "function") iniciarTema();
  if (typeof actualizarNavAuth === "function") actualizarNavAuth();

  inicializarFormularioContacto();
});
