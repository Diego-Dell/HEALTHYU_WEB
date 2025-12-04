

document.addEventListener("DOMContentLoaded", () => {
  if (typeof iniciarTema === "function") iniciarTema();
  if (typeof actualizarNavAuth === "function") actualizarNavAuth();
  if (typeof actualizarCarritoNav === "function") actualizarCarritoNav();

  // ====== LOGIN ======
  const formLogin = document.getElementById("formLogin");
  if (formLogin) {
    formLogin.addEventListener("submit", (e) => {
      e.preventDefault();
      if (typeof login === "function") {
        login();
      }
    });
  }

  // ====== REGISTRO ======
  const formRegister = document.getElementById("formRegister");
  if (formRegister) {
    formRegister.addEventListener("submit", (e) => {
      e.preventDefault();
      if (typeof register === "function") {
        register();
      }
    });
  }

  // ====== Opcional: pausar el video cuando se cierra el modal ======
  const videoModal = document.getElementById("videoModal");
  if (videoModal) {
    videoModal.addEventListener("hidden.bs.modal", () => {
      const iframe = videoModal.querySelector("iframe");
      if (iframe) {
        const src = iframe.getAttribute("src");
        iframe.setAttribute("src", src); // reinicia el video
      }
    });
  }
});
