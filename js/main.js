/* =========================================================
   Natural Synergy — script compartilhado (menu, rodapé, login)
   Para trocar o nome do projeto, altere NOME_PROJETO abaixo.
   ========================================================= */
const NOME_PROJETO = { a: "Natural ", b: "Synergy" };

const LOGO_SVG = `
<svg viewBox="0 0 48 48" aria-hidden="true">
  <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#3fa66b"/><stop offset="1" stop-color="#1a9aa0"/></linearGradient></defs>
  <path d="M24 4C12 10 6 20 8 32c1.5 8 9 12 16 12s14.5-4 16-12C42 20 36 10 24 4z" fill="url(#lg)"/>
  <path d="M11 27h7l3-7 4 13 3-9 2 3h7" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const PAGINAS = [
  { href: "index.html", nome: "Home" },
  { href: "guia.html", nome: "Guia de uso" },
  { href: "vitrine.html", nome: "Vitrine técnica" },
  { href: "software.html", nome: "Software" },
  { href: "jogo.html", nome: "Jogo" },
  { href: "referencias.html", nome: "Referências" },
  { href: "sobre.html", nome: "Sobre nós" },
];

/* ---------------- Autenticação (demonstrativa, no navegador) ---------------- */
const Auth = {
  _ler(chave, padrao) {
    try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch { return padrao; }
  },
  _gravar(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* armazenamento indisponível */ }
  },
  usuarios() {
    const lista = this._ler("nv_usuarios", []);
    // Usuário de demonstração para a banca
    if (!lista.some(u => u.email === "demo@naturalsynergy.com")) {
      lista.push({ nome: "Usuário Demo", email: "demo@naturalsynergy.com", senha: "123456" });
    }
    return lista;
  },
  cadastrar(nome, email, senha) {
    const lista = this.usuarios();
    if (lista.some(u => u.email === email)) return "Este e-mail já está cadastrado.";
    lista.push({ nome, email, senha });
    this._gravar("nv_usuarios", lista);
    return null;
  },
  entrar(email, senha) {
    const u = this.usuarios().find(x => x.email === email && x.senha === senha);
    if (!u) return false;
    this._gravar("nv_sessao", { nome: u.nome, email: u.email });
    return true;
  },
  sair() {
    try { localStorage.removeItem("nv_sessao"); } catch {}
    location.href = "index.html";
  },
  sessao() { return this._ler("nv_sessao", null); },
  exigirLogin() {
    if (!this.sessao()) location.replace("login.html?voltar=" + encodeURIComponent(location.pathname.split("/").pop()));
  },
};

/* ---------------- Tema claro / escuro ---------------- */
// O tema inicial é aplicado por js/tema.js, no <head>.
const BOTAO_TEMA = `
  <button type="button" class="tema-toggle">
    <svg class="lua" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
    <svg class="sol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
  </button>`;

function ativarBotaoTema(botao) {
  if (!botao) return;
  const raiz = document.documentElement;
  const rotular = () => {
    const escuro = raiz.dataset.tema === "escuro";
    botao.setAttribute("aria-label", escuro ? "Ativar modo claro" : "Ativar modo escuro");
    botao.title = botao.getAttribute("aria-label");
  };
  rotular();
  botao.addEventListener("click", () => {
    raiz.dataset.tema = raiz.dataset.tema === "escuro" ? "claro" : "escuro";
    try { localStorage.setItem("nv_tema", raiz.dataset.tema); } catch { /* armazenamento indisponível */ }
    rotular();
  });
}

/* ---------------- Cabeçalho e rodapé ---------------- */
function montarCabecalho() {
  const alvo = document.getElementById("cabecalho");
  if (!alvo) return;
  const atual = location.pathname.split("/").pop() || "index.html";
  const sessao = Auth.sessao();
  const links = PAGINAS.map(p =>
    `<li><a href="${p.href}" class="${p.href === atual ? "ativo" : ""}">${p.nome}</a></li>`).join("");
  const conta = sessao
    ? `<li><a href="#" id="btn-sair" title="Sair">Sair (${sessao.nome.split(" ")[0]})</a></li>`
    : `<li><a href="login.html" class="btn-entrar ${atual === "login.html" ? "ativo" : ""}">Entrar</a></li>`;

  alvo.innerHTML = `
  <header class="topo">
    <div class="container">
      <a href="index.html" class="logo">${LOGO_SVG}<span>${NOME_PROJETO.a}<b>${NOME_PROJETO.b}</b></span></a>
      <button class="menu-toggle" aria-label="Abrir menu" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
      <ul class="menu">${links}${conta}</ul>
      ${BOTAO_TEMA}
    </div>
  </header>`;

  ativarBotaoTema(alvo.querySelector(".tema-toggle"));
  const toggle = alvo.querySelector(".menu-toggle");
  const menu = alvo.querySelector(".menu");
  toggle.addEventListener("click", () => {
    const aberto = menu.classList.toggle("aberto");
    toggle.setAttribute("aria-expanded", aberto);
  });
  const sair = document.getElementById("btn-sair");
  if (sair) sair.addEventListener("click", e => { e.preventDefault(); Auth.sair(); });
}

function montarRodape() {
  const alvo = document.getElementById("rodape");
  if (!alvo) return;
  const ano = new Date().getFullYear();
  alvo.innerHTML = `
  <footer class="rodape">
    <div class="container">
      <div>
        <a href="index.html" class="logo">${LOGO_SVG}<span>${NOME_PROJETO.a}<b>${NOME_PROJETO.b}</b></span></a>
        <p>Monitoramento de crises epilépticas com tecnologia acessível, cuidado humano e inspiração na natureza.</p>
      </div>
      <div>
        <h4>Projeto</h4>
        <a href="guia.html">Guia de uso</a>
        <a href="vitrine.html">Vitrine técnica</a>
        <a href="software.html">Software</a>
      </div>
      <div>
        <h4>Conteúdo</h4>
        <a href="jogo.html">Jogo educativo</a>
        <a href="referencias.html">Referências</a>
        <a href="sobre.html">Sobre nós</a>
      </div>
      <div>
        <h4>Emergência</h4>
        <p>SAMU: <strong style="color:#fff">192</strong><br>Bombeiros: <strong style="color:#fff">193</strong></p>
      </div>
      <div class="rodape-base">© ${ano} ${NOME_PROJETO.a}${NOME_PROJETO.b} · Trabalho de Conclusão de Curso. Este protótipo não substitui acompanhamento médico.</div>
    </div>
  </footer>`;
}

/* ---------------- Animação ao rolar ---------------- */
function ativarRevelar() {
  const itens = document.querySelectorAll(".revelar");
  if (!("IntersectionObserver" in window)) { itens.forEach(i => i.classList.add("visivel")); return; }
  const obs = new IntersectionObserver(entradas => {
    entradas.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visivel"); obs.unobserve(e.target); } });
  }, { threshold: .12 });
  itens.forEach(i => obs.observe(i));
}

document.addEventListener("DOMContentLoaded", () => {
  montarCabecalho();
  montarRodape();
  ativarRevelar();
  // Páginas sem cabeçalho (login) ganham o botão de tema no canto
  const ladoLogin = document.querySelector(".login-form-lado");
  if (ladoLogin) {
    ladoLogin.insertAdjacentHTML("afterbegin", BOTAO_TEMA);
    ativarBotaoTema(ladoLogin.querySelector(".tema-toggle"));
  }
});
