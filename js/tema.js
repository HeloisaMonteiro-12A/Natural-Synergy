/* =========================================================
   Natural Synergy — tema claro / escuro
   Carregado no <head> para aplicar o tema antes da página
   aparecer (evita o "piscar" branco no modo escuro).
   ========================================================= */
(function () {
  let salvo = null;
  try { salvo = localStorage.getItem("nv_tema"); } catch { /* armazenamento indisponível */ }
  const sistemaEscuro = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.tema = salvo || (sistemaEscuro ? "escuro" : "claro");
})();
