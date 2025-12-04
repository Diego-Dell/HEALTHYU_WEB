// manual.js

document.addEventListener("DOMContentLoaded", () => {
  // Inicializar tema y nav (mismas funciones globales que usas en otras páginas)
  if (typeof iniciarTema === "function") iniciarTema();
  if (typeof actualizarNavAuth === "function") actualizarNavAuth();
  if (typeof actualizarCarritoNav === "function") actualizarCarritoNav();

  // Manejo del login del modal del manual
  const formLogin = document.getElementById("formLoginManual");
  if (formLogin) {
    formLogin.addEventListener("submit", (e) => {
      e.preventDefault();
      if (typeof login === "function") {
        login();
      }
    });
  }

  // Manejo del registro del modal del manual
  const formRegister = document.getElementById("formRegisterManual");
  if (formRegister) {
    formRegister.addEventListener("submit", (e) => {
      e.preventDefault();
      if (typeof register === "function") {
        register();
      }
    });
  }
});
