/* =========================================================
   Painel do software — simulação do protótipo
   Em produção, as leituras viriam do ESP32 (HTTP/MQTT).
   ========================================================= */
const sessao = Auth.sessao() || { nome: "Usuário", email: "anon" };
const $ = id => document.getElementById(id);

const CONFIG = {
  limiteMov: 2.5,      // g
  confirmarSeg: 5,     // no firmware são 10 s; reduzido para a demonstração
  cancelarSeg: 10,
};

const estado = {
  modo: "normal",      // normal | crise
  fase: "monitorando", // monitorando | suspeita | contagem | alerta
  suspeitaSeg: 0,
  bpm: 76,
  mov: 0.4,
  historicoBpm: [],
  historicoMov: [],
  alertas: 0,
  falsos: 0,
  contagem: 0,
  timerContagem: null,
};

/* ---------------- Contatos (salvos por usuário) ---------------- */
const chaveContatos = "nv_contatos_" + sessao.email;
function lerContatos() {
  try { return JSON.parse(localStorage.getItem(chaveContatos)) || []; } catch { return []; }
}
function salvarContatos(lista) {
  try { localStorage.setItem(chaveContatos, JSON.stringify(lista)); } catch {}
}
function renderContatos() {
  const lista = lerContatos();
  $("lista-contatos").innerHTML = lista.length
    ? lista.map((c, i) => `
      <div class="contato-item">
        <div><strong>${escapar(c.nome)}</strong><small>${escapar(c.tel)} · contato de emergência</small></div>
        <button data-i="${i}" aria-label="Remover ${escapar(c.nome)}">remover</button>
      </div>`).join("")
    : `<p style="font-size:.9rem;color:var(--cuidado)">Nenhum contato cadastrado ainda.</p>`;
}
function escapar(t) {
  return String(t).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
$("lista-contatos").addEventListener("click", e => {
  const i = e.target.dataset.i;
  if (i === undefined) return;
  const lista = lerContatos();
  const [removido] = lista.splice(Number(i), 1);
  salvarContatos(lista);
  renderContatos();
  log(`Contato removido: ${removido.nome}`, "info");
});
$("form-contato").addEventListener("submit", e => {
  e.preventDefault();
  const nome = $("ct-nome").value.trim();
  const tel = $("ct-tel").value.trim();
  if (!nome || !tel) return;
  const lista = lerContatos();
  lista.push({ nome, tel });
  salvarContatos(lista);
  renderContatos();
  e.target.reset();
  log(`Contato cadastrado: ${nome} (${tel})`, "ok");
});

/* ---------------- Log ---------------- */
function log(texto, tipo = "") {
  const hora = new Date().toLocaleTimeString("pt-BR");
  const linha = document.createElement("div");
  linha.innerHTML = `<span class="t">[${hora}]</span><span class="${tipo}">${escapar(texto)}</span>`;
  const el = $("log");
  el.prepend(linha);
  while (el.children.length > 80) el.lastChild.remove();
}

/* ---------------- Buzzer (som opcional) ---------------- */
let audioCtx = null;
function bipe() {
  if (!$("som").checked) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const ganho = audioCtx.createGain();
    osc.frequency.value = 1800;
    ganho.gain.value = 0.08;
    osc.connect(ganho).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.18);
  } catch {}
}

/* ---------------- Componentes ---------------- */
function setHardware({ led, buzzer, botao }) {
  if (led !== undefined) $("hw-led").className = "led" + (led ? " on-" + led : "");
  if (buzzer !== undefined) {
    $("hw-buzzer").textContent = buzzer ? "tocando" : "desligado";
    $("hw-buzzer").style.color = buzzer ? "var(--cuidado)" : "";
  }
  if (botao !== undefined) $("hw-botao").textContent = botao;
}

function setEstadoGeral(tipo, titulo, desc) {
  const el = $("estado-geral");
  el.className = "p-12 estado-geral" + (tipo ? " " + tipo : "");
  $("estado-titulo").textContent = titulo;
  $("estado-desc").textContent = desc;
  $("estado-led").className = "led " + (tipo === "alerta" ? "on-vermelho" : tipo === "atencao" ? "" : "on-verde");
}

/* ---------------- Gráficos (canvas) ---------------- */
function desenharGrafico(canvas, dados, { min, max, limite, cor, corLimite }) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const y = v => h - 8 - ((v - min) / (max - min)) * (h - 16);
  const x = i => (i / 59) * w;

  // grade
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--grade-grafico").trim(); ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const yy = 8 + i * (h - 16) / 4; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke(); }

  // limite
  ctx.setLineDash([6, 5]); ctx.strokeStyle = corLimite; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, y(limite)); ctx.lineTo(w, y(limite)); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = corLimite; ctx.font = "12px Nunito Sans, sans-serif";
  ctx.fillText("limite " + limite, 6, y(limite) - 6);

  if (dados.length < 2) return;
  const inicio = 60 - dados.length;
  // área
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, cor + "55"); grad.addColorStop(1, cor + "00");
  ctx.beginPath(); ctx.moveTo(x(inicio), h);
  dados.forEach((v, i) => ctx.lineTo(x(inicio + i), y(v)));
  ctx.lineTo(x(59), h); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
  // linha
  ctx.beginPath();
  dados.forEach((v, i) => i ? ctx.lineTo(x(inicio + i), y(v)) : ctx.moveTo(x(inicio + i), y(v)));
  ctx.strokeStyle = cor; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.stroke();
}

function desenhar() {
  const limiteBpm = Number($("limite").value);
  desenharGrafico($("graf-bpm"), estado.historicoBpm, { min: 50, max: 170, limite: limiteBpm, cor: "#1a9aa0", corLimite: "#e86a5c" });
  desenharGrafico($("graf-mov"), estado.historicoMov, { min: 0, max: 4.5, limite: CONFIG.limiteMov, cor: "#3fa66b", corLimite: "#e86a5c" });
}

/* ---------------- Leituras simuladas ---------------- */
function aproximar(atual, alvo, passo, ruido) {
  return atual + (alvo - atual) * passo + (Math.random() - 0.5) * ruido;
}

function lerSensores() {
  if (estado.modo === "crise") {
    estado.bpm = aproximar(estado.bpm, 145, 0.25, 6);
    estado.mov = Math.max(0, 2.6 + Math.random() * 1.6);
  } else {
    estado.bpm = aproximar(estado.bpm, 76, 0.2, 4);
    estado.mov = aproximar(estado.mov, 0.4, 0.4, 0.3);
    estado.mov = Math.max(0.05, estado.mov);
  }
  estado.historicoBpm.push(estado.bpm);
  estado.historicoMov.push(estado.mov);
  if (estado.historicoBpm.length > 60) { estado.historicoBpm.shift(); estado.historicoMov.shift(); }
}

function atualizarIndicadores() {
  const limiteBpm = Number($("limite").value);
  const bpm = Math.round(estado.bpm);
  $("v-bpm").textContent = bpm;
  $("v-mov").textContent = estado.mov.toFixed(2).replace(".", ",");

  const bpmAlto = bpm > limiteBpm;
  const movAlto = estado.mov > CONFIG.limiteMov;
  estiloChip($("chip-bpm"), bpmAlto, bpmAlto ? "alto" : "normal");
  estiloChip($("chip-mov"), movAlto, movAlto ? "intenso" : "estável");

  $("v-rssi").textContent = -55 - Math.round(Math.random() * 6);
}
function estiloChip(el, alerta, texto) {
  el.textContent = texto;
  el.style.background = alerta ? "var(--tinta-alerta)" : "var(--tinta-ok)";
  el.style.color = alerta ? "var(--alerta-texto)" : "var(--destaque-texto)";
}

/* ---------------- Detecção ---------------- */
function detectar() {
  if (estado.fase === "contagem" || estado.fase === "alerta") return;
  const suspeita = estado.bpm > Number($("limite").value) && estado.mov > CONFIG.limiteMov;

  if (!suspeita) {
    if (estado.fase === "suspeita") log("Leituras normalizadas. Suspeita descartada.", "ok");
    estado.suspeitaSeg = 0;
    estado.fase = "monitorando";
    setEstadoGeral("", "Monitorando normalmente", "Batimentos e movimentos dentro do esperado.");
    setHardware({ led: "verde", buzzer: false });
    return;
  }

  estado.suspeitaSeg++;
  if (estado.fase !== "suspeita") log("Padrão suspeito: BPM e movimento acima do limite.", "alerta");
  estado.fase = "suspeita";
  setEstadoGeral("atencao", "Analisando padrão suspeito…",
    `Confirmando em ${CONFIG.confirmarSeg - estado.suspeitaSeg + 1} s (BPM e movimento elevados ao mesmo tempo).`);

  if (estado.suspeitaSeg >= CONFIG.confirmarSeg) iniciarContagem("Possível crise detectada");
}

function iniciarContagem(motivo) {
  estado.fase = "contagem";
  estado.contagem = CONFIG.cancelarSeg;
  log(`${motivo}. LED e buzzer acionados. Aguardando cancelamento (${CONFIG.cancelarSeg} s).`, "alerta");
  setEstadoGeral("alerta", motivo, "Aguardando cancelamento pelo botão antes de enviar o alerta.");
  $("modal-contagem").hidden = false;
  $("modal-enviado").hidden = true;
  $("contagem").textContent = estado.contagem;
  $("modal").hidden = false;

  let ledLigado = true;
  setHardware({ led: "vermelho", buzzer: true });
  bipe();
  estado.timerContagem = setInterval(() => {
    estado.contagem--;
    $("contagem").textContent = estado.contagem;
    ledLigado = !ledLigado;
    setHardware({ led: ledLigado ? "vermelho" : false });
    bipe();
    if (estado.contagem <= 0) {
      clearInterval(estado.timerContagem);
      enviarAlerta(motivo);
    }
  }, 1000);
}

function enviarAlerta(motivo) {
  estado.fase = "alerta";
  estado.alertas++;
  $("v-alertas").textContent = estado.alertas;
  setHardware({ led: "vermelho", buzzer: true });
  setEstadoGeral("alerta", "Alerta enviado", "Contatos notificados. Aguardando confirmação de que a situação está controlada.");

  const contatos = lerContatos();
  const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const destinos = [`${sessao.nome} (usuário)`, ...contatos.map(c => `${c.nome} (${c.tel})`)];

  log(`ALERTA ENVIADO: ${motivo}`, "alerta");
  destinos.forEach(d => log(`  → notificação enviada para ${d}`, "info"));
  if (!contatos.length) log("Atenção: nenhum contato de emergência cadastrado.", "alerta");

  $("enviado-para").textContent = "Notificação enviada para: " + destinos.join(", ") + ".";
  $("msg-preview").innerHTML =
    `<strong>🚨 Natural Synergy – Pedido de ajuda</strong><br>
     ${escapar(motivo)} em <strong>${escapar(sessao.nome)}</strong> às ${hora}.<br>
     Último BPM: ${Math.round(estado.bpm)}.<br>
     Vá até a pessoa ou ligue para o SAMU (192).`;
  $("modal-contagem").hidden = true;
  $("modal-enviado").hidden = false;
  $("modal").hidden = false;
}

function voltarAoNormal() {
  clearInterval(estado.timerContagem);
  estado.modo = "normal";
  estado.fase = "monitorando";
  estado.suspeitaSeg = 0;
  $("modal").hidden = true;
  setHardware({ led: "verde", buzzer: false, botao: "solto" });
  setEstadoGeral("", "Monitorando normalmente", "Batimentos e movimentos dentro do esperado.");
}

/* ---------------- Botões ---------------- */
$("btn-crise").addEventListener("click", () => {
  if (estado.modo === "crise") return;
  estado.modo = "crise";
  log("Simulação iniciada: padrão de crise tônico-clônica.", "info");
});

$("btn-sos").addEventListener("click", () => {
  if (estado.fase === "contagem" || estado.fase === "alerta") return;
  setHardware({ botao: "pressionado (3 s)" });
  log("Botão pressionado por 3 s: pedido de ajuda manual (SOS).", "alerta");
  setTimeout(() => setHardware({ botao: "solto" }), 1200);
  bipe();
  enviarAlerta("Pedido de ajuda manual (SOS)");
});

$("btn-normal").addEventListener("click", () => {
  log("Simulação encerrada. Leituras voltando ao normal.", "ok");
  voltarAoNormal();
});

$("btn-cancelar").addEventListener("click", () => {
  estado.falsos++;
  $("v-falsos").textContent = estado.falsos;
  setHardware({ botao: "toque rápido" });
  log("Botão pressionado: falso alarme cancelado pelo usuário.", "ok");
  voltarAoNormal();
  setTimeout(() => setHardware({ botao: "solto" }), 1200);
});

$("btn-encerrar").addEventListener("click", () => {
  log("Situação marcada como controlada. Monitoramento retomado.", "ok");
  voltarAoNormal();
});

$("limite").addEventListener("input", e => {
  $("v-limite").textContent = e.target.value;
  desenhar();
});

/* ---------------- Início ---------------- */
$("nome-usuario").textContent = sessao.nome.split(" ")[0];
$("usuario-alerta").textContent = sessao.nome;
renderContatos();
setHardware({ led: "verde", buzzer: false });
log("ESP32 iniciado. Conectado ao Wi-Fi.", "ok");
log("Sensores de batimentos e movimento calibrados.", "ok");

// Pré-preenche alguns segundos de histórico
for (let i = 0; i < 20; i++) lerSensores();
atualizarIndicadores();
desenhar();

setInterval(() => {
  lerSensores();
  atualizarIndicadores();
  detectar();
  desenhar();
  if (Math.random() < 0.02) $("v-bat").textContent = Math.max(5, Number($("v-bat").textContent) - 1);
}, 1000);

window.addEventListener("resize", desenhar);
