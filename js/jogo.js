/* =========================================================
   Jogo "Mão Amiga" — primeiros socorros em crises epilépticas
   ========================================================= */
const ICONES = {
  alerta: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  pessoa: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="3"/><path d="M12 8v7M8 11h8M9 22l3-7 3 7"/></svg>`,
  relogio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>`,
  telefone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>`,
  coracao: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/></svg>`,
  dispositivo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="6" y="5" width="12" height="14" rx="3"/><path d="M9 5V2h6v3M9 19v3h6v-3M9 12h2l1-2 1 4 1-2h1"/></svg>`,
};

const SITUACOES = [
  {
    icone: "alerta",
    texto: "Seu celular vibra: “Natural Synergy – possível crise detectada”. Você está no cômodo ao lado. Qual é sua primeira atitude?",
    opcoes: [
      { t: "Ir imediatamente até a pessoa, mantendo a calma.", certa: true },
      { t: "Esperar alguns minutos para ver se o alerta some." },
      { t: "Responder a mensagem perguntando se está tudo bem." },
    ],
    explica: "O alerta existe para reduzir o tempo de resposta. Vá até a pessoa com calma: sua presença é o primeiro socorro.",
  },
  {
    icone: "pessoa",
    texto: "A pessoa está no chão, com o corpo se debatendo. Há uma cadeira e uma mesa de vidro bem perto dela.",
    opcoes: [
      { t: "Segurar os braços e as pernas para parar os movimentos." },
      { t: "Afastar os móveis e objetos que possam machucá-la.", certa: true },
      { t: "Levantar a pessoa e colocá-la sentada na cadeira." },
    ],
    explica: "Nunca contenha os movimentos: isso pode causar lesões. Afaste o que pode machucar e deixe a crise seguir.",
  },
  {
    icone: "pessoa",
    texto: "Alguém ao seu lado grita: “Coloca alguma coisa na boca dela, senão ela vai enrolar a língua!”",
    opcoes: [
      { t: "Colocar uma colher entre os dentes." },
      { t: "Puxar a língua com os dedos." },
      { t: "Não colocar nada na boca: a língua não enrola.", certa: true },
    ],
    explica: "É um mito! A língua não “enrola”. Colocar objetos ou dedos na boca pode quebrar dentes, ferir você e causar engasgo.",
  },
  {
    icone: "pessoa",
    texto: "A pessoa está de barriga para cima e há muita saliva saindo pela boca.",
    opcoes: [
      { t: "Virar a pessoa de lado, com cuidado.", certa: true },
      { t: "Dar água para ajudar a engolir." },
      { t: "Manter a pessoa de barriga para cima." },
    ],
    explica: "A posição lateral facilita a respiração e permite que a saliva escorra, evitando engasgo.",
  },
  {
    icone: "pessoa",
    texto: "A cabeça da pessoa está batendo no piso durante os movimentos.",
    opcoes: [
      { t: "Segurar a cabeça com força." },
      { t: "Colocar algo macio sob a cabeça, como um casaco ou almofada.", certa: true },
      { t: "Jogar água no rosto para ela acordar." },
    ],
    explica: "Proteger a cabeça com algo macio evita ferimentos sem impedir os movimentos.",
  },
  {
    icone: "relogio",
    texto: "Por que é importante olhar o relógio assim que a crise começa?",
    opcoes: [
      { t: "Não é importante, toda crise é igual." },
      { t: "Para saber a duração: se passar de 5 minutos, é emergência.", certa: true },
      { t: "Para saber a hora de dar o remédio pela boca durante a crise." },
    ],
    explica: "Crises que duram mais de 5 minutos (ou que se repetem sem recuperação) são emergências. A duração também ajuda o médico.",
  },
  {
    icone: "telefone",
    texto: "Já se passaram 6 minutos e a crise não parou.",
    opcoes: [
      { t: "Ligar para o SAMU (192) imediatamente.", certa: true },
      { t: "Esperar mais 10 minutos." },
      { t: "Levar a pessoa de carro sozinho enquanto ela se debate." },
    ],
    explica: "Mais de 5 minutos de crise exige socorro médico. Ligue 192 e continue ao lado da pessoa.",
  },
  {
    icone: "coracao",
    texto: "A crise acabou. A pessoa está acordando, confusa e cansada.",
    opcoes: [
      { t: "Oferecer comida para recuperar as energias." },
      { t: "Deixá-la sozinha para descansar." },
      { t: "Ficar ao lado, falar com calma e esperar ela se recuperar totalmente.", certa: true },
    ],
    explica: "Após a crise é comum ficar confuso e sonolento. Acolha, tranquilize e só ofereça comida ou água quando estiver totalmente consciente.",
  },
  {
    icone: "dispositivo",
    texto: "O Natural Synergy apitou, mas a pessoa estava apenas correndo e está bem. O que ela deve fazer?",
    opcoes: [
      { t: "Apertar o botão do dispositivo para cancelar o falso alarme.", certa: true },
      { t: "Desligar o dispositivo para sempre." },
      { t: "Ignorar o apito." },
    ],
    explica: "O botão cancela falsos alarmes em até 10 segundos, evitando preocupar os contatos à toa.",
  },
];

const TEMPO = 15;
const RODADAS = 8;
const $ = id => document.getElementById(id);
let rodadas = [], atual = 0, pontos = 0, acertos = 0, restante = TEMPO, timer = null;

function embaralhar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function mostrarTela(nome) {
  ["inicio", "pergunta", "final"].forEach(t => $("tela-" + t).hidden = t !== nome);
}

function lerRecorde() { try { return Number(localStorage.getItem("nv_recorde_jogo")) || 0; } catch { return 0; } }
function salvarRecorde(v) { try { localStorage.setItem("nv_recorde_jogo", v); } catch {} }
function mostrarRecorde() {
  const r = lerRecorde();
  $("recorde").textContent = r ? `Seu recorde: ${r} pontos` : "";
}

function comecar() {
  // A primeira situação (o alerta) sempre abre o jogo; as demais são sorteadas
  rodadas = [SITUACOES[0], ...embaralhar(SITUACOES.slice(1)).slice(0, RODADAS - 1)];
  atual = 0; pontos = 0; acertos = 0;
  mostrarTela("pergunta");
  mostrarPergunta();
}

function mostrarPergunta() {
  const s = rodadas[atual];
  $("hud-rodada").textContent = `Situação ${atual + 1}/${RODADAS}`;
  $("hud-pontos").textContent = `${pontos} pontos`;
  $("barra-progresso").style.width = (atual / RODADAS * 100) + "%";
  $("cena-icone").innerHTML = ICONES[s.icone];
  $("cena-texto").textContent = s.texto;
  $("explicacao").hidden = true;
  $("btn-proxima").hidden = true;

  const opcoes = $("opcoes");
  opcoes.innerHTML = "";
  embaralhar(s.opcoes).forEach(op => {
    const b = document.createElement("button");
    b.className = "opcao";
    b.textContent = op.t;
    b.dataset.certa = op.certa ? "1" : "";
    b.addEventListener("click", () => responder(b));
    opcoes.appendChild(b);
  });

  restante = TEMPO;
  atualizarTempo();
  clearInterval(timer);
  timer = setInterval(() => {
    restante--;
    atualizarTempo();
    if (restante <= 0) responder(null);
  }, 1000);
}

function atualizarTempo() {
  $("hud-tempo").textContent = `${Math.max(0, restante)} s`;
  const barra = $("barra-tempo");
  barra.style.width = (restante / TEMPO * 100) + "%";
  barra.style.background = restante <= 5 ? "var(--cuidado)" : "var(--sol)";
}

function responder(botao) {
  clearInterval(timer);
  const botoes = [...document.querySelectorAll(".opcao")];
  botoes.forEach(b => {
    b.disabled = true;
    if (b.dataset.certa) b.classList.add("certa");
  });
  const acertou = botao && botao.dataset.certa;
  if (botao && !acertou) botao.classList.add("errada");
  if (acertou) { acertos++; pontos += 100 + restante * 10; }

  const s = rodadas[atual];
  const exp = $("explicacao");
  exp.className = "explicacao aviso " + (acertou ? "info" : "perigo");
  exp.innerHTML = `<strong>${acertou ? "Isso mesmo!" : botao ? "Não é bem assim." : "O tempo acabou!"}</strong>${s.explica}`;
  exp.hidden = false;
  $("hud-pontos").textContent = `${pontos} pontos`;
  const ultima = atual === RODADAS - 1;
  $("btn-proxima").textContent = ultima ? "Ver resultado" : "Próxima";
  $("btn-proxima").hidden = false;
  $("btn-proxima").focus();
}

function finalizar() {
  mostrarTela("final");
  const recorde = lerRecorde();
  if (pontos > recorde) salvarRecorde(pontos);
  let titulo, texto;
  if (acertos === RODADAS) { titulo = "Mão Amiga nota 10!"; texto = "Você sabe exatamente o que fazer. Compartilhe esse conhecimento!"; }
  else if (acertos >= 5) { titulo = "Muito bem!"; texto = "Você está quase lá. Revise o guia para fixar os detalhes."; }
  else { titulo = "Vamos aprender juntos!"; texto = "Saber agir numa crise salva vidas. Confira o guia de primeiros socorros e tente de novo."; }
  $("final-titulo").textContent = titulo;
  $("final-texto").textContent = `Você acertou ${acertos} de ${RODADAS} situações. ${texto}`;
  $("final-pontos").textContent = `${pontos} pontos` + (pontos > recorde && recorde ? " · novo recorde!" : "");
}

$("btn-comecar").addEventListener("click", comecar);
$("btn-reiniciar").addEventListener("click", comecar);
$("btn-proxima").addEventListener("click", () => {
  atual++;
  if (atual >= RODADAS) finalizar(); else mostrarPergunta();
});
mostrarRecorde();
