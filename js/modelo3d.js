/* =========================================================
   Natural Synergy — Modelo 3D interativo do protótipo
   Manguito preto no antebraço + protoboard com ESP32,
   buzzer, LED, botão e sensores ligados por jumpers.
   Unidades: 1 = 1 cm (aprox.)
   ========================================================= */
(function () {
  const palco = document.getElementById("visor3d-palco");
  if (!palco) return;

  if (typeof THREE === "undefined" || !THREE.OrbitControls) {
    palco.insertAdjacentHTML("beforeend", '<p class="visor3d-erro">Não foi possível carregar o modelo 3D. Verifique a conexão com a internet e recarregue a página.</p>');
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    palco.insertAdjacentHTML("beforeend", '<p class="visor3d-erro">Seu navegador não suporta WebGL, necessário para exibir o modelo 3D.</p>');
    return;
  }

  const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Cena, câmera e luzes ---------------- */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  palco.prepend(renderer.domElement);

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
  const POS_INICIAL = new THREE.Vector3(-8, 17, 29);
  const ALVO_INICIAL = new THREE.Vector3(0, 1, 0);
  camera.position.copy(POS_INICIAL);

  const controles = new THREE.OrbitControls(camera, renderer.domElement);
  controles.target.copy(ALVO_INICIAL);
  controles.enableDamping = true;
  controles.enablePan = false;
  controles.minDistance = 8;
  controles.maxDistance = 70;
  controles.autoRotate = !reduzMovimento;
  controles.autoRotateSpeed = 0.8;

  cena.add(new THREE.HemisphereLight(0xe6fbff, 0x0d2230, 0.85));
  const sol = new THREE.DirectionalLight(0xffffff, 1.0);
  sol.position.set(12, 28, 14);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  Object.assign(sol.shadow.camera, { left: -26, right: 26, top: 20, bottom: -20, near: 1, far: 80 });
  cena.add(sol);
  const contraLuz = new THREE.PointLight(0x3ce0c7, 0.5, 80);
  contraLuz.position.set(-14, 8, -16);
  cena.add(contraLuz);

  const chao = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: 0.35 }));
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = -4.6;
  chao.receiveShadow = true;
  cena.add(chao);

  /* ---------------- Utilitários ---------------- */
  function mat(cor, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({ color: cor, roughness: 0.6, metalness: 0 }, extra));
  }
  function malha(geo, material, pai, x, y, z) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    m.receiveShadow = true;
    pai.add(m);
    return m;
  }
  const caixa = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cilindro = (r, h, seg) => new THREE.CylinderGeometry(r, r, h, seg || 20);

  const MAT = {
    metal: mat(0xc9ccd1, { metalness: 0.9, roughness: 0.3 }),
    ouro: mat(0xd4af37, { metalness: 0.9, roughness: 0.35 }),
    preto: mat(0x1b1b1b, { roughness: 0.5 }),
    pele: mat(0xd9a88a, { roughness: 0.75 })
  };

  // Textura de tecido (malha) para o manguito
  function texturaTecido() {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "#141414";
    g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 4) {
      for (let x = 0; x < 128; x += 4) {
        const v = 16 + Math.random() * 14;
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.fillRect(x, y, 3, 3);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 6);
    return t;
  }
  const tecido = texturaTecido();
  MAT.tecido = mat(0x9a9a9a, { map: tecido, bumpMap: tecido, bumpScale: 0.03, roughness: 0.95, side: THREE.DoubleSide });

  /* ---------------- Antebraço e manguito ---------------- */
  // O antebraço fica deitado no eixo X: cotovelo em -13, punho em +13.
  const ACHATA = 0.82;               // seção do braço é oval (mais baixa que larga)
  const R_COTOVELO = 4.0, R_PUNHO = 3.1, COMPR = 26;
  const raio = x => R_COTOVELO + (R_PUNHO - R_COTOVELO) * (x + COMPR / 2) / COMPR;
  const INCLINACAO = Math.atan(ACHATA * (R_PUNHO - R_COTOVELO) / COMPR);

  const modelo = new THREE.Group();
  cena.add(modelo);

  const pecas = [];   // componentes clicáveis
  function registrar(grupo, dados) {
    grupo.userData.peca = dados;
    dados.grupo = grupo;
    dados.base = grupo.position.clone();
    pecas.push(dados);
    return dados;
  }

  function tuboBraco(rPunho, rCotovelo, comp, material, aberto) {
    const g = new THREE.CylinderGeometry(rPunho, rCotovelo, comp, 64, 1, aberto);
    g.rotateZ(-Math.PI / 2);         // topo do cilindro (+Y) vai para o punho (+X)
    g.scale(1, ACHATA, 1);
    return new THREE.Mesh(g, material);
  }

  // Braço (pele) por dentro do manguito, mão e cotovelo
  const braco = new THREE.Group();
  modelo.add(braco);
  const antebraco = tuboBraco(R_PUNHO - 0.15, R_COTOVELO - 0.15, COMPR + 1, MAT.pele);
  braco.add(antebraco);
  const cotovelo = tuboBraco(R_COTOVELO - 0.1, R_COTOVELO + 0.1, 4, MAT.pele);
  cotovelo.position.x = -COMPR / 2 - 2;
  braco.add(cotovelo);
  const pontaCotovelo = new THREE.Mesh(new THREE.SphereGeometry(R_COTOVELO + 0.1, 32, 16), MAT.pele);
  pontaCotovelo.scale.set(0.45, ACHATA, 1);
  pontaCotovelo.position.x = -COMPR / 2 - 4;
  braco.add(pontaCotovelo);
  const punho = tuboBraco(2.7, R_PUNHO - 0.15, 2.4, MAT.pele);
  punho.position.x = COMPR / 2 + 1.2;
  braco.add(punho);
  const palma = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), MAT.pele);
  palma.scale.set(3.2, 1.15, 2.7);
  palma.position.set(COMPR / 2 + 4.6, -0.2, 0);
  braco.add(palma);
  [-1.65, -0.55, 0.55, 1.65].forEach((z, i) => {
    const comp = i === 0 || i === 3 ? 2.6 : 3.1;
    const dedo = new THREE.Mesh(cilindro(0.42, comp, 16), MAT.pele);
    dedo.rotation.z = -Math.PI / 2;
    dedo.position.set(COMPR / 2 + 7.3 + comp / 2, -0.35, z);
    braco.add(dedo);
    const ponta = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 8), MAT.pele);
    ponta.position.set(COMPR / 2 + 7.3 + comp, -0.35, z);
    braco.add(ponta);
  });
  const polegar = new THREE.Mesh(cilindro(0.5, 2.6, 16), MAT.pele);
  polegar.rotation.set(Math.PI / 2, 0, -0.5);
  polegar.position.set(COMPR / 2 + 4.2, 0, -3.2);
  braco.add(polegar);
  braco.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // Manguito: tecido preto aberto nas pontas, com barra nas extremidades
  const manguito = new THREE.Group();
  modelo.add(manguito);
  const capa = tuboBraco(R_PUNHO, R_COTOVELO, COMPR, MAT.tecido, true);
  capa.castShadow = capa.receiveShadow = true;
  manguito.add(capa);
  [[-COMPR / 2, R_COTOVELO], [COMPR / 2, R_PUNHO]].forEach(([x, r]) => {
    const g = new THREE.TorusGeometry(r + 0.02, 0.2, 12, 64);
    g.rotateY(Math.PI / 2);
    g.scale(1, ACHATA, 1);
    const barra = new THREE.Mesh(g, mat(0x222222, { roughness: 0.9 }));
    barra.position.x = x;
    barra.castShadow = true;
    manguito.add(barra);
  });
  registrar(manguito, {
    id: "manguito", nome: "Manguito",
    desc: "Peça de tecido preto que cobre todo o antebraço, do punho até perto do cotovelo. Serve de base para a protoboard e mantém os sensores firmes junto ao corpo.",
    ancora: new THREE.Vector3(-8, 3.6, 2.6)
  });

  /* ---------------- Protoboard ---------------- */
  const placa = new THREE.Group();
  placa.position.set(0, ACHATA * raio(0), 0);
  placa.rotation.z = INCLINACAO;
  modelo.add(placa);

  // Área reforçada do manguito onde a protoboard é presa
  const reforco = malha(caixa(16, 1.7, 4.8), MAT.tecido, modelo, 0, placa.position.y - 0.55, 0);
  reforco.rotation.z = INCLINACAO;
  reforco.userData.peca = pecas[0];

  const PASSO = 0.254;              // 0,1 polegada entre furos
  const TOPO = 1.3;                 // altura da face de cima da protoboard
  const LINHA_Z = {
    a: -1.397, b: -1.143, c: -0.889, d: -0.635, e: -0.381,
    f: 0.381, g: 0.635, h: 0.889, i: 1.143, j: 1.397,
    gnd: -2.15, vcc: 2.404
  };
  const furoX = col => -7.874 + col * PASSO;
  const furo = (col, linha) => new THREE.Vector3(furoX(col), TOPO, LINHA_Z[linha]);

  const protoboard = new THREE.Group();
  placa.add(protoboard);
  malha(caixa(16.5, 1.0, 5.6), mat(0xf1f0ea, { roughness: 0.8 }), protoboard, 0, 0.8, 0);
  malha(caixa(16.2, 0.02, 0.32), mat(0xd6d4cb), protoboard, 0, TOPO + 0.001, 0);
  [[-2.65, 0xd63c3c], [-1.88, 0x2e64c9], [1.88, 0x2e64c9], [2.65, 0xd63c3c]].forEach(([z, cor]) => {
    malha(caixa(15.4, 0.005, 0.04), mat(cor), protoboard, 0, TOPO + 0.003, z);
  });

  // Furos (uma única malha instanciada para ficar leve)
  const posFuros = [];
  for (let c = 0; c < 63; c++) "abcdefghij".split("").forEach(l => posFuros.push([furoX(c), LINHA_Z[l]]));
  for (let g = 0; g < 10; g++) {
    for (let k = 0; k < 5; k++) {
      const x = -7.4 + (g * 6 + k) * PASSO;
      [-2.404, -2.15, 2.15, 2.404].forEach(z => posFuros.push([x, z]));
    }
  }
  const furos = new THREE.InstancedMesh(caixa(0.09, 0.012, 0.09), mat(0x3a3a3a), posFuros.length);
  const aux = new THREE.Object3D();
  posFuros.forEach(([x, z], i) => {
    aux.position.set(x, TOPO, z);
    aux.updateMatrix();
    furos.setMatrixAt(i, aux.matrix);
  });
  protoboard.add(furos);
  registrar(protoboard, {
    id: "protoboard", nome: "Protoboard",
    desc: "Placa de ensaio presa em cima do manguito. O ESP32 e os componentes são encaixados nos furos e ligados por jumpers, sem precisar de solda, o que facilita testar e ajustar o circuito.",
    ancora: new THREE.Vector3(6.5, 1.6, 2.6), explode: 0.4
  });

  /* ---------------- ESP32 ---------------- */
  function texturaModulo() {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "#b9bcc2"; g.fillRect(0, 0, 256, 128);
    g.fillStyle = "#3a3d42";
    g.font = "bold 30px sans-serif"; g.textAlign = "center";
    g.fillText("ESP-WROOM-32", 128, 60);
    g.font = "18px sans-serif";
    g.fillText("Wi-Fi · Bluetooth", 128, 92);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  const esp = new THREE.Group();
  esp.position.copy(furo(23, "e")).setZ(0);
  placa.add(esp);
  [-1.143, 1.143].forEach(z => malha(caixa(15 * PASSO, 0.25, 0.25), MAT.preto, esp, 0, 0.125, z));
  malha(caixa(5.2, 0.16, 2.6), mat(0x161616, { roughness: 0.45 }), esp, 0, 0.33, 0);
  malha(caixa(2.55, 0.08, 1.8), mat(0x1d2a33), esp, 1.2, 0.45, 0);
  const tampaModulo = mat(0xb9bcc2, { metalness: 0.7, roughness: 0.35, map: texturaModulo() });
  const lateralModulo = mat(0xb9bcc2, { metalness: 0.8, roughness: 0.3 });
  malha(caixa(1.75, 0.25, 1.6), [lateralModulo, lateralModulo, tampaModulo, lateralModulo, lateralModulo, lateralModulo], esp, 0.75, 0.615, 0);
  // antena impressa
  malha(caixa(0.06, 0.01, 1.2), MAT.ouro, esp, 2.2, 0.495, 0);
  malha(caixa(0.5, 0.01, 0.06), MAT.ouro, esp, 1.95, 0.495, 0.57);
  malha(caixa(0.6, 0.3, 0.75), MAT.metal, esp, -2.45, 0.56, 0);                 // micro USB
  [-0.85, 0.85].forEach(z => {
    malha(caixa(0.4, 0.14, 0.3), MAT.metal, esp, -1.95, 0.48, z);                 // botões EN / BOOT
    malha(cilindro(0.08, 0.1, 10), MAT.preto, esp, -1.95, 0.58, z);
  });
  malha(caixa(0.45, 0.18, 0.35), MAT.preto, esp, -1.2, 0.5, 0);                  // regulador
  const ledEnergia = malha(caixa(0.14, 0.07, 0.09), mat(0xff3b30, { emissive: 0xff2010, emissiveIntensity: 1.2 }), esp, -1.45, 0.45, 0.75);
  const ledAzul = malha(caixa(0.14, 0.07, 0.09), mat(0x3a7bff, { emissive: 0x2a6bff, emissiveIntensity: 0 }), esp, -1.45, 0.45, -0.75);
  registrar(esp, {
    id: "esp32", nome: "ESP32",
    desc: "Microcontrolador com Wi-Fi e Bluetooth: o “cérebro” do protótipo. Lê os sensores, decide se há risco de crise, aciona o buzzer e o LED e envia o alerta pela internet.",
    pino: "Alimentado pelo cabo USB · 3V3 e GND nas trilhas da protoboard",
    ancora: new THREE.Vector3(0, 1.0, 0), explode: 2.2
  });
  ledEnergia.castShadow = ledAzul.castShadow = false;

  /* ---------------- Buzzer ---------------- */
  const buzzer = new THREE.Group();
  buzzer.position.copy(furo(40, "c"));
  placa.add(buzzer);
  malha(cilindro(0.6, 0.95, 32), mat(0x161616, { roughness: 0.4 }), buzzer, 0, 0.475, 0);
  malha(cilindro(0.1, 0.02, 12), mat(0x050505), buzzer, 0, 0.955, 0);
  registrar(buzzer, {
    id: "buzzer", nome: "Buzzer",
    desc: "Emite um som de alerta para avisar quem está por perto assim que uma possível crise é detectada.",
    pino: "GPIO 25 · saída digital",
    ancora: new THREE.Vector3(0, 1.1, 0), explode: 1.6
  });

  /* ---------------- LED ---------------- */
  const led = new THREE.Group();
  led.position.copy(furo(47, "c"));
  placa.add(led);
  [-PASSO, PASSO].forEach(x => malha(cilindro(0.025, 0.5, 6), MAT.metal, led, x, 0.25, 0));
  const matLed = mat(0x47d66b, { transparent: true, opacity: 0.88, roughness: 0.2, emissive: 0x2fd65a, emissiveIntensity: 0.8 });
  malha(cilindro(0.29, 0.08, 24), matLed, led, 0, 0.54, 0);
  malha(cilindro(0.25, 0.42, 24), matLed, led, 0, 0.79, 0);
  const domo = malha(new THREE.SphereGeometry(0.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), matLed, led, 0, 1.0, 0);
  domo.castShadow = false;
  const luzLed = new THREE.PointLight(0x47d66b, 0.6, 4);
  luzLed.position.set(0, 1.2, 0);
  led.add(luzLed);
  registrar(led, {
    id: "led", nome: "LED",
    desc: "Indicador visual do estado do protótipo: aceso durante o monitoramento normal e piscando rápido quando um alerta é disparado.",
    pino: "GPIO 26 · com resistor de 220 Ω",
    ancora: new THREE.Vector3(0, 1.3, 0), explode: 1.8
  });

  // Resistor do LED (entre a perna do LED e o GND)
  const resistor = new THREE.Group();
  resistor.position.copy(furo(48, "a"));
  placa.add(resistor);
  const corpo = malha(cilindro(0.1, 0.42, 16), mat(0xd9b98c), resistor, 0, 0.32, -0.38);
  corpo.rotation.x = Math.PI / 2;
  [0xa0522d, 0x111111, 0xa0522d].forEach((cor, i) => {
    const faixa = malha(cilindro(0.105, 0.04, 16), mat(cor), resistor, 0, 0.32, -0.5 + i * 0.1);
    faixa.rotation.x = Math.PI / 2;
  });
  [0, -0.753].forEach(z => malha(cilindro(0.02, 0.32, 6), MAT.metal, resistor, 0, 0.16, z));
  const perna = malha(cilindro(0.02, 0.75, 6), MAT.metal, resistor, 0, 0.32, -0.377);
  perna.rotation.x = Math.PI / 2;
  registrar(resistor, {
    id: "resistor", nome: "Resistor 220 Ω",
    desc: "Limita a corrente que passa pelo LED, evitando que ele queime.",
    ancora: new THREE.Vector3(0, 0.6, -0.4), explode: 1.2
  });

  /* ---------------- Botão ---------------- */
  const botao = new THREE.Group();
  botao.position.copy(furo(45, "g"));
  placa.add(botao);
  malha(caixa(0.6, 0.35, 0.6), MAT.preto, botao, 0, 0.175, 0);
  malha(caixa(0.62, 0.02, 0.62), MAT.metal, botao, 0, 0.36, 0);
  malha(cilindro(0.17, 0.18, 20), mat(0x2b2b2b), botao, 0, 0.46, 0);
  registrar(botao, {
    id: "botao", nome: "Botão",
    desc: "Toque rápido cancela um falso alarme. Segurar por 3 segundos envia um pedido de ajuda manual.",
    pino: "GPIO 27 · INPUT_PULLUP (outra perna no GND)",
    ancora: new THREE.Vector3(0, 0.8, 0), explode: 1.6
  });

  /* ---------------- Sensores (presos ao manguito) ---------------- */
  // Ponto na superfície do manguito: ângulo 0 = em cima, ±π = embaixo, negativo = lado -Z
  const naPele = (x, ang, folga) => {
    const r = raio(x) + (folga || 0);
    return new THREE.Vector3(x, ACHATA * r * Math.cos(ang), r * Math.sin(ang));
  };

  // MPU6050 (acelerômetro + giroscópio) perto do cotovelo, em cima do manguito
  const XM = -11;
  const mpu = new THREE.Group();
  mpu.position.copy(naPele(XM, 0, 0.05));
  mpu.rotation.z = INCLINACAO;
  modelo.add(mpu);
  malha(caixa(2.1, 0.16, 1.6), mat(0x1f4fbf, { roughness: 0.45 }), mpu, 0, 0.08, 0);
  malha(caixa(0.45, 0.1, 0.45), MAT.preto, mpu, -0.2, 0.21, 0);
  malha(caixa(0.25, 0.25, 8 * PASSO), MAT.preto, mpu, 0.9, 0.29, 0);
  for (let k = 0; k < 8; k++) malha(caixa(0.06, 0.4, 0.06), MAT.ouro, mpu, 0.9, 0.45, -3.5 * PASSO + k * PASSO);
  registrar(mpu, {
    id: "mpu", nome: "Sensor de movimento (MPU6050)",
    desc: "Acelerômetro e giroscópio que identificam movimentos rítmicos e intensos, típicos de crises tônico-clônicas.",
    pino: "I²C · SDA GPIO 21 / SCL GPIO 22",
    ancora: new THREE.Vector3(0, 0.7, 0), explode: 2.6
  });

  // Sensor de batimentos (MAX30102) na parte de baixo do punho
  const XS = 9.5;
  const max = new THREE.Group();
  max.position.copy(naPele(XS, Math.PI, 0.02));
  max.rotation.x = Math.PI;       // face óptica voltada para a pele
  modelo.add(max);
  malha(caixa(1.4, 0.12, 1.4), mat(0x6c3483, { roughness: 0.45 }), max, 0, 0.06, 0);
  malha(caixa(0.55, 0.1, 0.32), MAT.preto, max, 0, 0.17, -0.1);
  malha(caixa(0.3, 0.02, 0.18), mat(0xff4a3a, { emissive: 0xff2a1a, emissiveIntensity: 0.9 }), max, 0, 0.23, -0.1);
  for (let k = 0; k < 4; k++) malha(caixa(0.06, 0.3, 0.06), MAT.ouro, max, -1.5 * PASSO + k * PASSO, 0.27, 0.55);
  registrar(max, {
    id: "max", nome: "Sensor de batimentos",
    desc: "Sensor óptico (ex.: MAX30102) que mede a frequência cardíaca encostado na pele, na parte de baixo do punho. Uma subida brusca de BPM é comum durante crises.",
    pino: "I²C · SDA GPIO 21 / SCL GPIO 22",
    ancora: new THREE.Vector3(0, -0.9, 0), explode: -2.6
  });

  /* ---------------- Jumpers e cabo USB ---------------- */
  const fios = new THREE.Group();
  modelo.add(fios);
  const matsFio = [];
  modelo.updateMatrixWorld(true);
  const naModelo = v => modelo.worldToLocal(placa.localToWorld(v.clone()));
  const CIMA = new THREE.Vector3(0, 1, 0);

  function fio(pontos, cor, raioFio, pai, ponteiras) {
    const curva = new THREE.CatmullRomCurve3(pontos, false, "catmullrom", 0.5);
    const material = mat(cor, { roughness: 0.45, transparent: true });
    matsFio.push(material);
    const tubo = malha(new THREE.TubeGeometry(curva, 80, raioFio || 0.045, 8, false), material, pai || fios);
    if (ponteiras) {
      // capa preta do conector dupont na ponta solta
      const fim = curva.getPoint(1), tangente = curva.getTangent(1);
      const capaDupont = malha(caixa(0.22, 0.22, 0.6), mat(0x111111, { transparent: true }), pai || fios);
      matsFio.push(capaDupont.material);
      capaDupont.position.copy(fim).addScaledVector(tangente, -0.3);
      capaDupont.lookAt(fim);
    }
    return tubo;
  }
  // Jumper em arco entre dois furos da protoboard
  function arco(a, b, altura) {
    const meio = a.clone().lerp(b, 0.5).addScaledVector(CIMA, altura);
    return [a, a.clone().addScaledVector(CIMA, 0.35), meio, b.clone().addScaledVector(CIMA, 0.35), b];
  }
  const naPlaca = (pts, cor, alt) => fio(arco(...pts, alt).map(naModelo), cor);

  naPlaca([furo(28, "a"), furo(39, "a")], 0xf4d03f, 1.1);     // GPIO 25 → buzzer
  naPlaca([furo(41, "a"), furo(41, "gnd")], 0x222222, 0.3);   // buzzer → GND
  naPlaca([furo(29, "a"), furo(46, "a")], 0x3fa66b, 1.4);     // GPIO 26 → LED
  naPlaca([furo(27, "j"), furo(44, "j")], 0x2e86de, 1.0);     // GPIO 27 → botão
  naPlaca([furo(46, "j"), furo(46, "gnd")], 0x8e44ad, 1.6);   // botão → GND
  naPlaca([furo(16, "a"), furo(14, "gnd")], 0x222222, 0.4);   // GND do ESP32
  naPlaca([furo(16, "j"), furo(14, "vcc")], 0xd63c3c, 0.6);   // 3V3 do ESP32

  // ESP32 → MPU6050 (VCC, GND, SCL, SDA)
  modelo.updateMatrixWorld(true);
  const pinosMpu = [-1.5, -0.5, 0.5, 1.5].map(k => mpu.localToWorld(new THREE.Vector3(0.9, 0.65, k * PASSO)));
  [0xd63c3c, 0x222222, 0xf4d03f, 0x3fa66b].forEach((cor, i) => {
    const a = naModelo(furo(18 + i, "j"));
    const fim = modelo.worldToLocal(pinosMpu[i]);
    fio([
      a, a.clone().addScaledVector(CIMA, 0.5),
      new THREE.Vector3(-8.6, a.y + 2.2, 1.9 + i * 0.12),
      fim.clone().add(new THREE.Vector3(1.0, 0.9, 0)),
      fim
    ], cor, 0.045, fios, true);
  });

  // ESP32 → sensor de batimentos, contornando o manguito pelo lado -Z
  const pinosMax = [0, 1, 2, 3].map(k => modelo.worldToLocal(max.localToWorld(new THREE.Vector3(-1.5 * PASSO + k * PASSO, 0.45, 0.55))));
  [0xd63c3c, 0x222222, 0x9b59b6, 0xecf0f1].forEach((cor, i) => {
    const a = naModelo(furo(24 + i, "a"));
    const d = i * 0.07;
    fio([
      a, a.clone().addScaledVector(CIMA, 0.6),
      naPele(6.5 + d, -1.15, 0.9 + d),
      naPele(8.2 + d, -1.9, 0.3 + d),
      naPele(9.0 + d, -2.6, 0.25 + d),
      pinosMax[i].clone().add(new THREE.Vector3(0, 0, -0.8)),
      pinosMax[i]
    ], cor, 0.045, fios, true);
  });

  // Cabo USB de alimentação
  const cabo = new THREE.Group();
  modelo.add(cabo);
  const usb = naModelo(new THREE.Vector3(furoX(23) - 2.75, TOPO + 0.56, 0));
  const plugue = malha(caixa(1.2, 0.5, 0.8), mat(0x1a1a1a), cabo);
  plugue.position.copy(usb).add(new THREE.Vector3(-0.6, 0, 0));
  plugue.rotation.z = INCLINACAO;
  fio([
    usb.clone().add(new THREE.Vector3(-1.1, 0, 0)),
    usb.clone().add(new THREE.Vector3(-2.6, 0.4, 0.4)),
    new THREE.Vector3(-8.0, 4.3, 3.6),
    new THREE.Vector3(-9.0, 0.5, 6.4),
    new THREE.Vector3(-10.5, -4.3, 8.5),
    new THREE.Vector3(-16, -4.45, 11)
  ], 0x161616, 0.14, cabo);
  registrar(cabo, {
    id: "cabo", nome: "Cabo USB",
    desc: "Alimenta o ESP32 e permite gravar o programa a partir do computador. No uso final pode ser trocado por uma bateria.",
    ancora: null, explode: 0
  });

  modelo.position.x = -1.5;

  /* ---------------- Rótulos (HTML sobre o canvas) ---------------- */
  pecas.forEach(p => {
    if (!p.ancora) return;
    p.rotulo = document.createElement("span");
    p.rotulo.className = "visor3d-rotulo";
    p.rotulo.textContent = p.nome;
    p.rotulo.hidden = true;
    palco.appendChild(p.rotulo);
  });

  /* ---------------- Interface ---------------- */
  const $ = id => document.getElementById(id);
  const lista = $("visor3d-lista");
  const detalhe = $("visor3d-detalhe");
  const btnCrise = $("visor3d-crise"), btnExplodir = $("visor3d-explodir"),
        btnNomes = $("visor3d-nomes"), btnGirar = $("visor3d-girar"), btnResetar = $("visor3d-resetar");
  const status = $("visor3d-status"), bpmEl = $("visor3d-bpm");

  pecas.forEach(p => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = p.nome.replace(/ \(.*\)/, "");
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => selecionar(p, true));
    p.botao = b;
    li.appendChild(b);
    lista.appendChild(li);
  });

  const estado = { crise: false, explodir: false, nomes: false, explodeT: 0, bpm: 76, selecionada: null };
  btnGirar.setAttribute("aria-pressed", String(controles.autoRotate));

  function alternar(btn, chave) {
    estado[chave] = !estado[chave];
    btn.setAttribute("aria-pressed", String(estado[chave]));
  }
  btnCrise.addEventListener("click", () => {
    alternar(btnCrise, "crise");
    btnCrise.textContent = estado.crise ? "Parar simulação" : "Simular crise";
    status.className = "chip " + (estado.crise ? "chip-alerta" : "chip-ok");
    status.innerHTML = '<span class="ponto"></span> ' + (estado.crise ? "Alerta: possível crise" : "Monitorando");
  });
  btnExplodir.addEventListener("click", () => alternar(btnExplodir, "explodir"));
  btnNomes.addEventListener("click", () => {
    alternar(btnNomes, "nomes");
    pecas.forEach(p => { if (p.rotulo) p.rotulo.hidden = !estado.nomes; });
  });
  btnGirar.addEventListener("click", () => {
    controles.autoRotate = !controles.autoRotate;
    btnGirar.setAttribute("aria-pressed", String(controles.autoRotate));
  });
  btnResetar.addEventListener("click", () => {
    selecionar(null);
    voo = { pos: POS_INICIAL.clone(), alvo: ALVO_INICIAL.clone() };
  });

  /* ---------------- Seleção ---------------- */
  const destaque = new THREE.BoxHelper(undefined, 0x3ce0c7);
  destaque.visible = false;
  cena.add(destaque);
  let voo = null;   // animação suave da câmera até uma peça

  function centroDe(p) {
    return new THREE.Box3().setFromObject(p.grupo).getCenter(new THREE.Vector3());
  }

  function selecionar(p, focar) {
    estado.selecionada = p;
    pecas.forEach(q => q.botao.setAttribute("aria-pressed", String(q === p)));
    if (!p) {
      destaque.visible = false;
      detalhe.innerHTML = "<h4>Escolha uma peça</h4><p>Clique em um componente no modelo ou na lista acima para ver a função dele no protótipo.</p>";
      return;
    }
    destaque.setFromObject(p.grupo);
    destaque.visible = true;
    detalhe.innerHTML = `<h4>${p.nome}</h4><p>${p.desc}</p>` + (p.pino ? `<p class="pino">${p.pino}</p>` : "");
    if (focar && p.id !== "manguito") {
      const alvo = centroDe(p);
      const dir = camera.position.clone().sub(controles.target).normalize();
      const dist = p.id === "protoboard" || p.id === "cabo" ? 22 : 12;
      voo = { alvo, pos: alvo.clone().addScaledVector(dir, dist) };
    }
  }

  const raycaster = new THREE.Raycaster();
  const ponteiro = new THREE.Vector2();
  function pecaNoPonto(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ponteiro.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ponteiro, camera);
    const hits = raycaster.intersectObjects(modelo.children, true);
    for (const h of hits) {
      if (h.object.material && h.object.material.opacity === 0) continue;
      let o = h.object;
      while (o && !o.userData.peca) o = o.parent;
      if (o) return o.userData.peca;
      if (braco.children.includes(h.object)) return null;
    }
    return null;
  }

  let inicioToque = null;
  renderer.domElement.addEventListener("pointerdown", ev => {
    inicioToque = { x: ev.clientX, y: ev.clientY };
    controles.autoRotate = false;
    btnGirar.setAttribute("aria-pressed", "false");
    voo = null;
  });
  renderer.domElement.addEventListener("pointerup", ev => {
    if (!inicioToque) return;
    const moveu = Math.hypot(ev.clientX - inicioToque.x, ev.clientY - inicioToque.y);
    inicioToque = null;
    if (moveu < 6) selecionar(pecaNoPonto(ev), false);
  });
  renderer.domElement.addEventListener("pointermove", ev => {
    if (inicioToque || ev.pointerType !== "mouse") return;
    renderer.domElement.style.cursor = pecaNoPonto(ev) ? "pointer" : "";
  });

  /* ---------------- Tamanho ---------------- */
  function redimensionar() {
    const w = palco.clientWidth, h = palco.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  if ("ResizeObserver" in window) new ResizeObserver(redimensionar).observe(palco);
  else window.addEventListener("resize", redimensionar);
  redimensionar();

  /* ---------------- Ondas sonoras do buzzer ---------------- */
  const ondas = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.04, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0xe86a5c, transparent: true, opacity: 0 }));
    m.rotation.x = Math.PI / 2;
    m.position.y = 1.1;
    buzzer.add(m);
    return m;
  });

  /* ---------------- Animação ---------------- */
  const relogio = new THREE.Clock();
  const projetado = new THREE.Vector3();
  let visivel = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(e => { visivel = e[0].isIntersecting; }).observe(palco);
  }

  function animar() {
    requestAnimationFrame(animar);
    if (!visivel) return;
    const dt = Math.min(relogio.getDelta(), 0.05);
    const t = relogio.elapsedTime;

    // Separar peças
    estado.explodeT += ((estado.explodir ? 1 : 0) - estado.explodeT) * Math.min(1, dt * 5);
    const e = estado.explodeT;
    placa.position.y = ACHATA * raio(0) + 2.6 * e;
    pecas.forEach(p => {
      if (p.explode) p.grupo.position.y = p.base.y + p.explode * e;
    });
    matsFio.forEach(m => { m.opacity = 1 - Math.min(1, e * 2.5); m.visible = m.opacity > 0.01; });
    fios.visible = cabo.visible = e < 0.4;

    // Simulação de crise: tremor, BPM subindo, LED e buzzer em alerta
    const alvoBpm = estado.crise ? 138 : 76;
    estado.bpm += (alvoBpm - estado.bpm) * Math.min(1, dt * 0.8);
    const bpmMostrado = Math.round(estado.bpm + Math.sin(t * 1.3) * 1.5);
    if (bpmEl.textContent !== String(bpmMostrado)) bpmEl.textContent = bpmMostrado;

    if (estado.crise && !reduzMovimento) {
      modelo.rotation.x = Math.sin(t * 38) * 0.015 + Math.sin(t * 23) * 0.01;
      modelo.position.y = Math.sin(t * 31) * 0.12;
    } else {
      modelo.rotation.x *= 0.85;
      modelo.position.y *= 0.85;
    }

    const pisca = estado.crise ? (Math.sin(t * 22) > 0 ? 1 : 0) : 1;
    matLed.emissiveIntensity = estado.crise ? pisca * 2.2 : 0.8;
    luzLed.intensity = estado.crise ? pisca * 1.4 : 0.6;
    ledAzul.material.emissiveIntensity = estado.crise ? (Math.sin(t * 9) > 0 ? 2 : 0) : (Math.sin(t * 2) > 0.7 ? 1.5 : 0);

    ondas.forEach((o, i) => {
      if (!estado.crise) { o.material.opacity = 0; return; }
      const f = (t * 1.4 + i / 3) % 1;
      o.scale.setScalar(1 + f * 2.2);
      o.position.y = 1.1 + f * 0.8;
      o.material.opacity = (1 - f) * 0.8;
    });

    // Câmera indo até a peça escolhida
    if (voo) {
      const k = Math.min(1, dt * 3);
      controles.target.lerp(voo.alvo, k);
      camera.position.lerp(voo.pos, k);
      if (camera.position.distanceTo(voo.pos) < 0.05) voo = null;
    }
    controles.update();

    if (estado.selecionada) destaque.setFromObject(estado.selecionada.grupo);

    // Rótulos
    if (estado.nomes) {
      const w = palco.clientWidth, h = palco.clientHeight;
      pecas.forEach(p => {
        if (!p.rotulo) return;
        p.grupo.localToWorld(projetado.copy(p.ancora));
        projetado.project(camera);
        const fora = projetado.z > 1 || Math.abs(projetado.x) > 1.05 || Math.abs(projetado.y) > 1.05;
        p.rotulo.hidden = fora;
        p.rotulo.style.left = ((projetado.x + 1) / 2) * w + "px";
        p.rotulo.style.top = ((1 - projetado.y) / 2) * h + "px";
      });
    }

    renderer.render(cena, camera);
  }
  animar();
})();
