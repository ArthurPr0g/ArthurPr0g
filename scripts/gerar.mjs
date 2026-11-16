// Gera todos os SVGs animados do perfil (assets/) e a "frase do dia" do README.
// Uso local:  GITHUB_TOKEN=$(gh auth token) node scripts/gerar.mjs
// No GitHub Actions roda todo dia (.github/workflows/perfil-vivo.yml).
// Sem token, o painel ao vivo mantém o arquivo atual e o resto é gerado normalmente.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = join(RAIZ, "assets");
const USUARIO = "ArthurPr0g";
const DESDE = "2021-09-08";
mkdirSync(ASSETS, { recursive: true });

// Paleta da Prog Soluções (+ acentos "fora da marca" só para status e gradientes)
const C = {
  ink: "#08080A", panel: "#0D0E13", surface: "#12141A", line: "#1E2230",
  text: "#F4F5F7", soft: "#C9CDD6", muted: "#A3A8B2", dim: "#5D626B",
  accent: "#81AAF7", accentStrong: "#B1D2FF", accentDark: "#3860AC",
  cyan: "#43D5DC", green: "#5FD37F", purple: "#62488C", violet: "#A68BF0",
  amber: "#F5C26B", pink: "#F07FB0",
};

// ---------- utilitários ----------
const n2 = (v) => +(+v).toFixed(2);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const salvar = (nome, conteudo) => writeFileSync(join(ASSETS, nome), conteudo);
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const b64 = (f) => readFileSync(join(RAIZ, "fontes", f)).toString("base64");
const FONTE = {
  sora: () => `@font-face{font-family:'Sora';src:url(data:font/woff2;base64,${b64("sora-latin.woff2")}) format('woff2');font-weight:100 800}`,
  mono: () => `@font-face{font-family:'JB';src:url(data:font/woff2;base64,${b64("jetbrains-mono-latin.woff2")}) format('woff2');font-weight:400 800}`,
};
const SORA = "Sora,'Segoe UI',system-ui,sans-serif";
const MONO = "JB,'JetBrains Mono',Consolas,monospace";
const MONO_W = 0.6; // largura de cada caractere da JetBrains Mono (em)

function svg(w, h, corpo, { fontes = [], titulo = "", css = "" } = {}) {
  const ff = fontes.map((f) => FONTE[f]()).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(titulo)}"><title>${esc(titulo)}</title><style>${ff}.s{font-family:${SORA}}.m{font-family:${MONO}}${css}</style>${corpo}</svg>\n`;
}
const EASE = `calcMode="spline" keyTimes="0;1" keySplines="0.22 1 0.36 1"`;

// Símbolo "P modular" da Prog (haste + arco), caixa original x 9.75..38.25, y 6..42
const ARCO = "M24.25 6H26.25A12 12 0 0 1 26.25 30H24.25A4 4 0 0 1 24.25 22H26.25A4 4 0 0 0 26.25 14H24.25A4 4 0 0 1 24.25 6Z";
function simboloP(x, y, escala, { haste = C.text, arco = C.accent, anim = false, atraso = 0.2 } = {}) {
  const t = `translate(${n2(x - 9.75 * escala)} ${n2(y - 6 * escala)}) scale(${escala})`;
  if (!anim) return `<g transform="${t}"><rect x="9.75" y="6" width="8" height="36" rx="4" fill="${haste}"/><path d="${ARCO}" fill="${arco}"/></g>`;
  return `<g transform="${t}">
<rect x="9.75" y="6" width="8" height="0" rx="4" fill="${haste}"><animate attributeName="height" from="0" to="36" dur="0.8s" begin="${atraso}s" fill="freeze" ${EASE}/></rect>
<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="${atraso + 0.5}s" fill="freeze"/><animateTransform attributeName="transform" type="translate" from="8 0" to="0 0" dur="0.8s" begin="${atraso + 0.5}s" fill="freeze" ${EASE}/><path d="${ARCO}" fill="${arco}"/></g>
</g>`;
}

// Texto digitado em loop (várias frases) com cursor piscando. Fonte mono.
function digitacao({ id, frases, x, y, tam, cor = C.text, porChar = 0.065, segura = 1.9, apaga = 0.025, pausa = 0.4 }) {
  const cw = tam * MONO_W;
  let t = 0.9;
  const passos = [];
  frases.forEach((f, i) => {
    for (let n = 1; n <= f.length; n++) { t += porChar; passos.push({ t, i, n }); }
    t += segura;
    for (let n = f.length - 1; n >= 0; n--) { t += apaga; passos.push({ t, i, n }); }
    t += pausa;
  });
  const T = n2(t);
  let defs = "", textos = "";
  frases.forEach((f, i) => {
    const meus = passos.filter((p) => p.i === i);
    const kt = [0, ...meus.map((p) => p.t / T)].map((v) => v.toFixed(4)).join(";");
    const vals = [0, ...meus.map((p) => n2(p.n * cw))].join(";");
    defs += `<clipPath id="${id}c${i}"><rect x="${x}" y="${y - tam}" height="${tam * 1.6}" width="0"><animate attributeName="width" values="${vals}" keyTimes="${kt}" dur="${T}s" calcMode="discrete" repeatCount="indefinite"/></rect></clipPath>`;
    textos += `<text x="${x}" y="${y}" class="m" font-size="${tam}" fill="${cor}" clip-path="url(#${id}c${i})" xml:space="preserve">${esc(f)}</text>`;
  });
  const kt = [0, ...passos.map((p) => p.t / T)].map((v) => v.toFixed(4)).join(";");
  const xs = [x, ...passos.map((p) => n2(x + p.n * cw + 2))].join(";");
  const cursor = `<rect x="${x}" y="${n2(y - tam * 0.82)}" width="${n2(tam * 0.55)}" height="${n2(tam * 1.05)}" rx="1.5" fill="${C.accent}"><animate attributeName="x" values="${xs}" keyTimes="${kt}" dur="${T}s" calcMode="discrete" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1s" calcMode="discrete" repeatCount="indefinite"/></rect>`;
  return { defs, corpo: textos + cursor };
}

// ---------- 1) HERO ----------
function hero() {
  const W = 900, H = 340, HOR = 238;
  const r = rng(7);
  let estrelas = "";
  for (let i = 0; i < 52; i++) {
    const x = n2(r() * W), y = n2(10 + r() * (HOR - 30)), rad = n2(0.3 + r() * 1.3);
    const d = n2(2 + r() * 4), b = n2(-r() * 5);
    estrelas += `<circle cx="${x}" cy="${y}" r="${rad}" fill="${r() > 0.75 ? C.violet : C.accentStrong}"><animate attributeName="opacity" values="0.1;0.9;0.1" dur="${d}s" begin="${b}s" repeatCount="indefinite"/></circle>`;
  }
  // chão em perspectiva (grade "synth" andando na direção de quem vê)
  let grade = "";
  for (let i = -14; i <= 14; i++) grade += `<line x1="${450 + i * 7}" y1="${HOR}" x2="${450 + i * 92}" y2="${H}"/>`;
  const N = 9, yk = (k) => n2(HOR + (H - HOR) * Math.pow(k / N, 2.2));
  for (let k = 0; k < N; k++) grade += `<line x1="0" x2="${W}" y1="${yk(k)}" y2="${yk(k)}"><animate attributeName="y1" values="${yk(k)};${yk(k + 1)}" dur="1.4s" repeatCount="indefinite"/><animate attributeName="y2" values="${yk(k)};${yk(k + 1)}" dur="1.4s" repeatCount="indefinite"/></line>`;

  // P montando + "planta" (círculo tracejado girando e guias)
  const px = 66, py = 70, esc_ = 3.6, cx = n2(px + 14.25 * esc_), cy = n2(py + 18 * esc_);
  const planta = `<g stroke="${C.accentStrong}" fill="none" opacity="0.35">
<circle cx="${cx}" cy="${cy}" r="86" stroke-dasharray="2 7" stroke-width="1.2"><animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="40s" repeatCount="indefinite"/></circle>
<circle cx="${cx}" cy="${cy}" r="100" stroke-dasharray="30 12 4 12" stroke-width="0.8" opacity="0.6"><animateTransform attributeName="transform" type="rotate" from="360 ${cx} ${cy}" to="0 ${cx} ${cy}" dur="60s" repeatCount="indefinite"/></circle>
<line x1="20" x2="210" y1="${py}" y2="${py}" stroke-dasharray="3 5" stroke-width="0.8"/>
<line x1="20" x2="210" y1="${n2(py + 36 * esc_)}" y2="${n2(py + 36 * esc_)}" stroke-dasharray="3 5" stroke-width="0.8"/>
</g>
<text x="${n2(cx + 64)}" y="${n2(py - 8)}" class="m" font-size="9" fill="${C.accentStrong}" opacity="0.55">48u</text>`;

  const tipo = digitacao({
    id: "h", x: 258, y: 214, tam: 19, cor: C.soft,
    frases: [
      "Product Owner que programa",
      "dev full-stack: Next.js + Supabase",
      "domador de IAs (com carinho)",
      "fundador da Prog Soluções",
      "transformo café em deploy",
    ],
  });

  const corpo = `<defs>
<clipPath id="moldura"><rect width="${W}" height="${H}" rx="22"/></clipPath>
<linearGradient id="nome" x1="0" y1="0" x2="460" y2="0" gradientUnits="userSpaceOnUse" spreadMethod="reflect">
<stop offset="0" stop-color="${C.text}"/><stop offset="0.35" stop-color="${C.accentStrong}"/><stop offset="0.6" stop-color="${C.accent}"/><stop offset="0.85" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.cyan}"/>
<animateTransform attributeName="gradientTransform" type="translate" values="0 0;460 0;0 0" dur="9s" repeatCount="indefinite"/></linearGradient>
<linearGradient id="horiz" x1="0" x2="1"><stop offset="0" stop-color="${C.cyan}" stop-opacity="0"/><stop offset="0.3" stop-color="${C.cyan}"/><stop offset="0.55" stop-color="${C.accent}"/><stop offset="0.8" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></linearGradient>
<linearGradient id="nevoa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.ink}"/><stop offset="0.55" stop-color="${C.ink}" stop-opacity="0.35"/><stop offset="1" stop-color="${C.ink}" stop-opacity="0"/></linearGradient>
<radialGradient id="aura"><stop offset="0" stop-color="${C.accent}" stop-opacity="0.45"/><stop offset="0.5" stop-color="${C.purple}" stop-opacity="0.18"/><stop offset="1" stop-color="${C.purple}" stop-opacity="0"/></radialGradient>
<radialGradient id="ceu" cx="0.5" cy="1" r="0.9"><stop offset="0" stop-color="#151A2E"/><stop offset="1" stop-color="${C.ink}"/></radialGradient>
<filter id="brilho" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
${tipo.defs}
</defs>
<g clip-path="url(#moldura)">
<rect width="${W}" height="${H}" fill="url(#ceu)"/>
${estrelas}
<g stroke="${C.accent}" stroke-width="1" opacity="0.5">${grade}</g>
<rect y="${HOR}" width="${W}" height="${H - HOR}" fill="url(#nevoa)"/>
<rect x="0" y="${HOR - 1}" width="${W}" height="2" fill="url(#horiz)"/>
<rect x="100" y="${HOR - 5}" width="700" height="10" fill="url(#horiz)" filter="url(#brilho)" opacity="0.7"><animate attributeName="opacity" values="0.45;0.85;0.45" dur="4s" repeatCount="indefinite"/></rect>
<circle cx="${cx}" cy="${cy}" r="120" fill="url(#aura)"><animate attributeName="r" values="105;130;105" dur="5s" repeatCount="indefinite"/></circle>
${planta}
${simboloP(px, py, esc_, { anim: true })}
<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.7s" begin="0.4s" fill="freeze"/>
<text x="258" y="96" class="m" font-size="15" fill="${C.accentStrong}"><tspan fill="${C.green}">&gt;</tspan> olá, mundo! eu sou o</text>
</g>
<g opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.8s" begin="0.6s" fill="freeze"/><animateTransform attributeName="transform" type="translate" from="0 10" to="0 0" dur="0.9s" begin="0.6s" fill="freeze" ${EASE}/>
<text x="254" y="166" class="s" font-size="66" font-weight="650" letter-spacing="-1.5" fill="url(#nome)">Arthur Prog</text>
</g>
<text x="258" y="214" class="m" font-size="19" fill="${C.accent}" opacity="0">$<animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="0.8s" fill="freeze"/></text>
<g transform="translate(24 0)">${tipo.corpo}</g>
<g transform="translate(${W - 214} 22)">
<rect width="190" height="28" rx="14" fill="${C.surface}" stroke="${C.line}"/>
<circle cx="16" cy="14" r="4" fill="${C.green}"/><circle cx="16" cy="14" r="4" fill="none" stroke="${C.green}"><animate attributeName="r" values="4;10" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.9;0" dur="1.8s" repeatCount="indefinite"/></circle>
<text x="30" y="18.5" class="m" font-size="11" fill="${C.soft}" letter-spacing="0.5">ONLINE · GOIÂNIA/GO</text>
</g>
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="21.5" fill="none" stroke="${C.line}"/>`;
  salvar("hero.svg", svg(W, H, corpo, { fontes: ["sora", "mono"], titulo: "Arthur Prog: Product Owner que programa, dev full-stack e domador de IAs" }));
}

// ---------- 2) TERMINAL "SOBRE MIM" ----------
function terminal() {
  const W = 900, PAD = 30, TAM = 14.5, LH = 25, cw = TAM * MONO_W, TOPO = 44;
  const linhas = [
    { tipo: "cmd", txt: "whoami" },
    { tipo: "out", seg: [["arthur araújo", C.accent], ["  // product owner que aprendeu a codar e não parou mais", C.dim]] },
    { tipo: "gap" },
    { tipo: "cmd", txt: "cat sobre.txt" },
    { tipo: "kv", k: "base", v: "Goiânia/GO, movido a café e pamonha" },
    { tipo: "kv", k: "empresa", v: "Prog Soluções: sites, sistemas e IA que trabalham por você" },
    { tipo: "kv", k: "superpoder", v: "transformar ideia bagunçada em produto no ar" },
    { tipo: "kv", k: "sidekick", v: "Lia, a IA que atende no WhatsApp enquanto eu programo" },
    { tipo: "kv", k: "bugs", v: "todos sob custódia. quase todos." },
    { tipo: "gap" },
    { tipo: "cmd", txt: "./ritual-diario --hoje" },
    { tipo: "bar", k: "café", p: 1, cor: C.amber, extra: "100%  não negociável" },
    { tipo: "bar", k: "deploys", p: 0.8, cor: C.green, extra: "80%" },
    { tipo: "bar", k: "paciência c/ CSS", p: 0.25, cor: C.pink, extra: "25%  (tá carregando...)" },
    { tipo: "gap" },
    { tipo: "cmd", txt: "echo $PROXIMO_PASSO" },
    { tipo: "out", seg: [["construindo o próximo projeto... e se for o seu? ", C.green], ["chama a Lia ;)", C.text]] },
    { tipo: "fim" },
  ];
  // linha do tempo
  let t = 0.6, y = TOPO + 34;
  for (const l of linhas) {
    if (l.tipo === "gap") { y += 10; continue; }
    l.y = y; y += LH;
    if (l.tipo === "cmd") { t += 0.5; l.t0 = t; t += l.txt.length * 0.07; l.t1 = t; t += 0.25; }
    else { t += l.tipo === "bar" ? 0.35 : 0.18; l.t0 = t; if (l.tipo === "bar") t += 0.5; }
  }
  const H = y + 6;
  const T = n2(t + 6);
  const k = (v) => (v / T).toFixed(4);
  const aparece = (t0) => `<animate attributeName="opacity" values="0;1" keyTimes="0;${k(t0)}" dur="${T}s" calcMode="discrete" repeatCount="indefinite"/>`;
  const PROMPT = [["arthur@prog", C.green], [":", C.dim], ["~", C.accent], ["$ ", C.dim]];
  const promptTxt = (x, yy) => { let s = "", cx = x; for (const [p, c] of PROMPT) { s += `<text x="${n2(cx)}" y="${yy}" fill="${c}" xml:space="preserve">${esc(p)}</text>`; cx += p.length * cw; } return s; };
  const PL = 15 * cw;

  let defs = "", corpo = "";
  linhas.forEach((l, i) => {
    if (l.tipo === "gap") return;
    if (l.tipo === "cmd") {
      const passos = [];
      for (let n = 1; n <= l.txt.length; n++) passos.push([l.t0 + (n - 1) * 0.07, n]);
      const kt = ["0", ...passos.map((p) => k(p[0]))].join(";");
      const vs = [0, ...passos.map((p) => n2(p[1] * cw))].join(";");
      defs += `<clipPath id="t${i}"><rect x="${PAD + PL}" y="${l.y - 16}" height="22" width="0"><animate attributeName="width" values="${vs}" keyTimes="${kt}" dur="${T}s" calcMode="discrete" repeatCount="indefinite"/></rect></clipPath>`;
      corpo += `<g opacity="0">${aparece(l.t0 - 0.45)}${promptTxt(PAD, l.y)}<text x="${n2(PAD + PL)}" y="${l.y}" fill="${C.text}" clip-path="url(#t${i})" xml:space="preserve">${esc(l.txt)}</text></g>`;
    } else if (l.tipo === "out") {
      let cx = PAD, s = "";
      for (const [p, c] of l.seg) { s += `<text x="${n2(cx)}" y="${l.y}" fill="${c}" xml:space="preserve">${esc(p)}</text>`; cx += p.length * cw; }
      corpo += `<g opacity="0">${aparece(l.t0)}${s}</g>`;
    } else if (l.tipo === "kv") {
      corpo += `<g opacity="0">${aparece(l.t0)}<text x="${PAD + 2 * cw}" y="${l.y}" fill="${C.accentStrong}" xml:space="preserve">${esc(l.k)}</text><text x="${n2(PAD + 15 * cw)}" y="${l.y}" fill="${C.soft}" xml:space="preserve">${esc(l.v)}</text></g>`;
    } else if (l.tipo === "bar") {
      const bx = n2(PAD + 20 * cw), bw = 230, w = n2(bw * l.p);
      corpo += `<g opacity="0">${aparece(l.t0)}<text x="${PAD + 2 * cw}" y="${l.y}" fill="${C.accentStrong}" xml:space="preserve">${esc(l.k)}</text>
<rect x="${bx}" y="${l.y - 11}" width="${bw}" height="13" rx="3" fill="#1A1D27"/>
<rect x="${bx}" y="${l.y - 11}" width="0" height="13" rx="3" fill="${l.cor}"><animate attributeName="width" values="0;0;${w};${w}" keyTimes="0;${k(l.t0)};${k(l.t0 + 0.9)};1" dur="${T}s" repeatCount="indefinite"/></rect>
<rect x="${bx}" y="${l.y - 11}" width="${bw}" height="13" fill="url(#blocos)"/>
<text x="${n2(bx + bw + 14)}" y="${l.y}" fill="${C.muted}" xml:space="preserve">${esc(l.extra)}</text></g>`;
    } else if (l.tipo === "fim") {
      corpo += `<g opacity="0">${aparece(l.t0)}${promptTxt(PAD, l.y)}<rect x="${n2(PAD + PL + 1)}" y="${l.y - 12}" width="${n2(cw)}" height="16" fill="${C.accent}"><animate attributeName="opacity" values="1;0" dur="1s" calcMode="discrete" repeatCount="indefinite"/></rect></g>`;
    }
  });

  const tudo = `<defs>
<clipPath id="moldura"><rect width="${W}" height="${H}" rx="18"/></clipPath>
<pattern id="blocos" width="11.5" height="13" patternUnits="userSpaceOnUse"><rect x="9.5" width="2" height="13" fill="${C.panel}"/></pattern>
<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#fff" opacity="0.025"/></pattern>
<linearGradient id="borda" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.accent}" stop-opacity="0.6"/><stop offset="0.5" stop-color="${C.line}"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0.5"/></linearGradient>
<radialGradient id="luz" cx="0.85" cy="0" r="0.7"><stop offset="0" stop-color="${C.accent}" stop-opacity="0.10"/><stop offset="1" stop-color="${C.accent}" stop-opacity="0"/></radialGradient>
${defs}
</defs>
<g clip-path="url(#moldura)">
<rect width="${W}" height="${H}" fill="${C.panel}"/>
<rect width="${W}" height="${H}" fill="url(#luz)"/>
<rect width="${W}" height="${TOPO}" fill="${C.surface}"/>
<line x1="0" x2="${W}" y1="${TOPO}" y2="${TOPO}" stroke="${C.line}"/>
<circle cx="24" cy="22" r="6" fill="#FF5F57"/><circle cx="44" cy="22" r="6" fill="#FEBC2E"/><circle cx="64" cy="22" r="6" fill="#28C840"/>
<text x="${W / 2}" y="26.5" text-anchor="middle" class="m" font-size="12" fill="${C.dim}">arthur@prog: ~/sobre-mim</text>
<g class="m" font-size="${TAM}"><g>${corpo}<animate attributeName="opacity" values="1;1;0" keyTimes="0;${k(T - 0.5)};1" dur="${T}s" repeatCount="indefinite"/></g></g>
<rect width="${W}" height="${H}" fill="url(#scan)"/>
</g>
<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="17.5" fill="none" stroke="url(#borda)" stroke-width="1.5"/>`;
  salvar("sobre.svg", svg(W, H, tudo, { fontes: ["mono"], titulo: "Terminal: whoami → Arthur Araújo, Product Owner que aprendeu a programar. Goiânia/GO, fundador da Prog Soluções." }));
}

// ---------- 3) STACK EM ÓRBITA ----------
function stack() {
  const W = 900, H = 440, CX = 450, CY = 222;
  const orbitas = [
    { rx: 175, ry: 64, dur: 22, rev: false, itens: [["React", "#61DAFB"], ["Next.js", "#F4F5F7"], ["TypeScript", "#3178C6"]] },
    { rx: 300, ry: 116, dur: 34, rev: true, itens: [["Node.js", "#5FA04E"], ["Supabase", "#3ECF8E"], ["PostgreSQL", "#4F7BE0"], ["Tailwind", "#38BDF8"]] },
    { rx: 410, ry: 172, dur: 48, rev: false, itens: [["Python", "#FFD43B"], ["Claude Code", "#D97757"], ["Power BI", "#F2C811"], ["Vercel", "#F4F5F7"], ["Three.js", "#A68BF0"]] },
  ];
  let aneis = "", chips = "";
  orbitas.forEach((o, oi) => {
    const d = `M${CX - o.rx} ${CY}a${o.rx} ${o.ry} 0 1 1 ${2 * o.rx} 0a${o.rx} ${o.ry} 0 1 1 ${-2 * o.rx} 0`;
    aneis += `<path d="${d}" fill="none" stroke="url(#anel)" stroke-width="1.2" stroke-dasharray="${oi === 1 ? "1 0" : "4 6"}"/>`;
    o.itens.forEach(([nome, cor], i) => {
      const w = n2(nome.length * 13 * MONO_W + 40);
      const b = n2(-(i / o.itens.length) * o.dur);
      const kp = o.rev ? `keyPoints="1;0" keyTimes="0;1" calcMode="linear"` : "";
      // profundidade: atrás (topo da elipse) fica menor e mais apagado
      const op = o.rev ? "0.8;1;0.8;0.45;0.8" : "0.8;0.45;0.8;1;0.8";
      const sc = o.rev ? "0.94;1.06;0.94;0.82;0.94" : "0.94;0.82;0.94;1.06;0.94";
      chips += `<g><animateMotion dur="${o.dur}s" begin="${b}s" repeatCount="indefinite" path="${d}" ${kp}/>
<g><animate attributeName="opacity" values="${op}" dur="${o.dur}s" begin="${b}s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="scale" values="${sc}" dur="${o.dur}s" begin="${b}s" repeatCount="indefinite"/>
<rect x="${-w / 2}" y="-15" width="${w}" height="30" rx="15" fill="${C.surface}" stroke="${cor}" stroke-opacity="0.45"/>
<circle cx="${n2(-w / 2 + 16)}" cy="0" r="4.5" fill="${cor}"/><circle cx="${n2(-w / 2 + 16)}" cy="0" r="8" fill="${cor}" opacity="0.18"/>
<text x="${n2(-w / 2 + 28)}" y="4.6" class="m" font-size="13" fill="${C.text}">${esc(nome)}</text></g></g>`;
    });
  });
  const corpo = `<defs>
<clipPath id="moldura"><rect width="${W}" height="${H}" rx="22"/></clipPath>
<linearGradient id="anel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.accent}" stop-opacity="0.12"/><stop offset="1" stop-color="${C.accent}" stop-opacity="0.55"/></linearGradient>
<radialGradient id="nucleo"><stop offset="0" stop-color="${C.accent}" stop-opacity="0.5"/><stop offset="0.45" stop-color="${C.violet}" stop-opacity="0.15"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></radialGradient>
<radialGradient id="fundo" cx="0.5" cy="0.5" r="0.75"><stop offset="0" stop-color="#121729"/><stop offset="1" stop-color="${C.ink}"/></radialGradient>
</defs>
<g clip-path="url(#moldura)">
<rect width="${W}" height="${H}" fill="url(#fundo)"/>
${aneis}
<circle cx="${CX}" cy="${CY}" r="95" fill="url(#nucleo)"><animate attributeName="r" values="85;105;85" dur="4s" repeatCount="indefinite"/></circle>
${[0, 1.5].map((b) => `<circle cx="${CX}" cy="${CY}" r="40" fill="none" stroke="${C.accent}" stroke-width="1.2"><animate attributeName="r" values="40;120" dur="3s" begin="${b}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0" dur="3s" begin="${b}s" repeatCount="indefinite"/></circle>`).join("")}
${simboloP(CX - 28.5, CY - 36, 2)}
${chips}
<text x="26" y="34" class="m" font-size="12" fill="${C.muted}"><tspan fill="${C.accent}">//</tspan> sistema solar da stack</text>
<text x="${W - 26}" y="${H - 22}" text-anchor="end" class="m" font-size="12" fill="${C.dim}">tudo gira em torno de um P</text>
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="21.5" fill="none" stroke="${C.line}"/>`;
  salvar("stack.svg", svg(W, H, corpo, { fontes: ["mono"], titulo: "Stack: React, Next.js, TypeScript, Node.js, Supabase, PostgreSQL, Tailwind, Python, Claude Code, Power BI, Vercel e Three.js" }));
}

// ---------- 4) CARDS DE PROJETOS ----------
const PROJETOS = [
  { slug: "prog-imports", sigla: "PI", titulo: "Prog Imports", meta: "e-commerce + ERP · 2025", status: ["NO AR", C.green], cores: [C.accent, C.cyan],
    desc: ["Loja de tecnologia importada com gestão", "completa: estoque, vendas, financeiro e IA."], tags: ["Next.js", "Supabase", "IA"], cta: "visitar" },
  { slug: "lia", sigla: "Li", titulo: "Lia", meta: "atendente de IA · WhatsApp", status: ["NO AR", C.green], cores: [C.green, C.cyan],
    desc: ["Atende clientes no WhatsApp a qualquer hora,", "tira dúvidas e encaminha os pedidos."], tags: ["Claude", "WhatsApp", "Supabase"], cta: "falar com ela" },
  { slug: "prog-painel", sigla: "Pp", titulo: "prog-painel", meta: "open source · Claude Code", status: ["OPEN SOURCE", C.accent], cores: [C.violet, C.accent],
    desc: ["O painel lateral que faltava no Claude Code:", "agentes com avatar animado e limites."], tags: ["TypeScript", "Claude Code"], cta: "ver código" },
  { slug: "orbi", sigla: "Or", titulo: "Orbi", meta: "PWA pessoal · em uso diário", status: ["EM USO", C.cyan], cores: [C.amber, C.pink],
    desc: ["Meu segundo cérebro: agenda, tarefas,", "finanças, hábitos e treino num app só."], tags: ["React", "Supabase", "PWA"], cta: "ver case" },
  { slug: "vitaliti", sigla: "Vi", titulo: "VitaliTI", meta: "cliente · site + painel", status: ["NO AR", C.green], cores: [C.cyan, C.green],
    desc: ["Site institucional com painel de gestão", "protegido por login."], tags: ["HTML", "JavaScript", "Painel"], cta: "visitar" },
  { slug: "prog-world", sigla: "PW", titulo: "Prog World", meta: "jogo 3D no navegador", status: ["EM OBRA", C.amber], cores: [C.pink, C.violet],
    desc: ["Um mundo 3D com casa, carro e escritório,", "onde cada sala é um projeto meu."], tags: ["Three.js", "Rapier", "Vite"], cta: "ver mais" },
];
function card(p, idx) {
  const W = 440, H = 214;
  const [c1, c2] = p.cores;
  const [st, stc] = p.status;
  const stw = n2(st.length * 10 * MONO_W + 34);
  let tx = 24, tags = "";
  for (const t of p.tags) {
    const w = n2(t.length * 11 * MONO_W + 20);
    tags += `<rect x="${tx}" y="160" width="${w}" height="24" rx="12" fill="${C.surface}" stroke="${C.line}"/><text x="${n2(tx + w / 2)}" y="176" text-anchor="middle" class="m" font-size="11" fill="${C.muted}">${esc(t)}</text>`;
    tx += w + 8;
  }
  const corpo = `<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
<radialGradient id="luz" cx="0" cy="0" r="0.8"><stop offset="0" stop-color="${c1}" stop-opacity="0.16"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></radialGradient>
</defs>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="18" fill="${C.panel}"/>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="18" fill="url(#luz)"/>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="18" fill="none" stroke="${C.line}"/>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="18" fill="none" stroke="url(#g)" stroke-width="2" pathLength="1000" stroke-dasharray="160 840" stroke-linecap="round"><animate attributeName="stroke-dashoffset" from="1000" to="0" dur="7s" begin="${-idx * 1.3}s" repeatCount="indefinite"/></rect>
<rect x="24" y="24" width="46" height="46" rx="13" fill="url(#g)"/>
<text x="47" y="53.5" text-anchor="middle" class="s" font-size="17" font-weight="700" fill="${C.ink}">${esc(p.sigla)}</text>
<text x="84" y="45" class="s" font-size="21" font-weight="600" fill="${C.text}">${esc(p.titulo)}</text>
<text x="84" y="65" class="m" font-size="11" fill="${C.dim}">${esc(p.meta)}</text>
<g transform="translate(${n2(W - 24 - stw)} 24)"><rect width="${stw}" height="24" rx="12" fill="${stc}" fill-opacity="0.1" stroke="${stc}" stroke-opacity="0.35"/>
<circle cx="14" cy="12" r="3.5" fill="${stc}"><animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite"/></circle>
<text x="24" y="16" class="m" font-size="10" font-weight="600" letter-spacing="0.6" fill="${stc}">${esc(st)}</text></g>
<text class="s" font-size="14" fill="${C.soft}">${p.desc.map((l, i) => `<tspan x="24" y="${108 + i * 22}">${esc(l)}</tspan>`).join("")}</text>
${tags}
<text x="${W - 24}" y="176" text-anchor="end" class="m" font-size="12" fill="${c1}">${esc(p.cta)} -&gt;<animate attributeName="opacity" values="1;0.55;1" dur="2.4s" repeatCount="indefinite"/></text>`;
  salvar(`projeto-${p.slug}.svg`, svg(W, H, corpo, { fontes: ["sora", "mono"], titulo: `${p.titulo}: ${p.desc.join(" ")}` }));
}

// ---------- 5) TÍTULOS DE SEÇÃO (versão escura e clara) ----------
const TITULOS = [
  { id: "stack", num: "01", titulo: "minha stack", sub: "ferramentas que eu uso pra tirar ideia do papel" },
  { id: "projetos", num: "02", titulo: "coisas que construí", sub: "uns no ar, uns open source, um ainda em obra" },
  { id: "painel", num: "03", titulo: "painel ao vivo", sub: "se atualiza sozinho todo dia" },
];
function titulo(t, claro) {
  const W = 900, H = 64;
  const cTxt = claro ? "#1F2328" : C.text, cSub = claro ? "#59636E" : C.dim, cNum = claro ? C.accentDark : C.accent;
  const xLinha = n2(78 + t.titulo.length * 24 * 0.6 + 18);
  const corpo = `<defs><linearGradient id="l" x1="${xLinha}" x2="${W - 4}" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${cNum}"/><stop offset="1" stop-color="${cNum}" stop-opacity="0"/></linearGradient></defs>
<text x="2" y="34" class="m" font-size="14" font-weight="600" fill="${cNum}">// ${t.num}</text>
<text x="66" y="35" class="s" font-size="24" font-weight="600" fill="${cTxt}" letter-spacing="-0.3">${esc(t.titulo)}</text>
<line x1="${xLinha}" x2="${W - 4}" y1="28" y2="28" stroke="url(#l)" stroke-width="1.5"/>
<circle cx="${xLinha}" cy="28" r="3" fill="${cNum}"><animate attributeName="cx" values="${xLinha};${W - 60};${xLinha}" dur="6s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/><animate attributeName="opacity" values="1;0.2;1" dur="6s" repeatCount="indefinite"/></circle>
<text x="66" y="56" class="m" font-size="12" fill="${cSub}">${esc(t.sub)}</text>`;
  salvar(`titulo-${t.id}${claro ? "-claro" : ""}.svg`, svg(W, H, corpo, { fontes: ["sora", "mono"], titulo: `${t.num} ${t.titulo}` }));
}

// ---------- 6) BOTÕES DE CONTATO ----------
const BOTOES = [
  { id: "portfolio", rot: "Portfólio", sub: "cases e preços", cor: C.accent,
    icone: `<circle r="10" fill="none" stroke="${C.accent}" stroke-width="1.8"/><ellipse rx="4.5" ry="10" fill="none" stroke="${C.accent}" stroke-width="1.5"/><line x1="-10" x2="10" stroke="${C.accent}" stroke-width="1.5"/>` },
  { id: "linkedin", rot: "LinkedIn", sub: "a versão séria", cor: "#4A9BE8",
    icone: `<rect x="-10" y="-10" width="20" height="20" rx="4.5" fill="#0A66C2"/><text y="5" text-anchor="middle" class="s" font-size="12" font-weight="700" fill="#fff">in</text>` },
  { id: "instagram", rot: "Instagram", sub: "@prog.arthur", cor: "#E1306C",
    icone: `<defs><linearGradient id="ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#F58529"/><stop offset="0.5" stop-color="#DD2A7B"/><stop offset="1" stop-color="#8134AF"/></linearGradient></defs><rect x="-10" y="-10" width="20" height="20" rx="6" fill="none" stroke="url(#ig)" stroke-width="2"/><circle r="4.5" fill="none" stroke="url(#ig)" stroke-width="2"/><circle cx="5.6" cy="-5.6" r="1.3" fill="#DD2A7B"/>` },
  { id: "lia", rot: "Fale com a Lia", sub: "IA no WhatsApp", cor: "#25D366",
    icone: `<path d="M-9.5 9.5l1.6-5A10 10 0 1 1 -4.6 8.2z" fill="none" stroke="#25D366" stroke-width="1.9" stroke-linejoin="round"/><circle cx="-4" cy="-0.5" r="1.4" fill="#25D366"/><circle cx="0.5" cy="-0.5" r="1.4" fill="#25D366"/><circle cx="5" cy="-0.5" r="1.4" fill="#25D366"/>` },
];
function botao(b, i) {
  const W = 196, H = 54;
  const corpo = `<defs><clipPath id="c"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="27"/></clipPath>
<linearGradient id="brilho" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.13"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="26" fill="${C.panel}" stroke="${b.cor}" stroke-opacity="0.45"/>
<g clip-path="url(#c)"><rect x="-90" y="0" width="70" height="${H}" fill="url(#brilho)" transform="skewX(-20)"><animate attributeName="x" values="-90;-90;300" keyTimes="0;0.6;1" dur="5s" begin="${i * 0.6}s" repeatCount="indefinite"/></rect></g>
<g transform="translate(30 27)">${b.icone}</g>
<text x="54" y="25" class="s" font-size="14.5" font-weight="600" fill="${C.text}">${esc(b.rot)}</text>
<text x="54" y="41" class="m" font-size="10.5" fill="${C.dim}">${esc(b.sub)}</text>`;
  salvar(`botao-${b.id}.svg`, svg(W, H, corpo, { fontes: ["sora", "mono"], titulo: b.rot }));
}

// ---------- 7) RODAPÉ ----------
function rodape() {
  const W = 900, H = 170;
  const onda = (amp, y0, per) => {
    let d = `M0 ${y0}`;
    for (let x = 0; x < 2 * W; x += per) d += ` q${per / 4} ${-amp} ${per / 2} 0 t${per / 2} 0`;
    return d + ` V${H} H0Z`;
  };
  const corpo = `<defs><clipPath id="moldura"><rect width="${W}" height="${H}" rx="22"/></clipPath>
<linearGradient id="o1" x1="0" x2="1"><stop offset="0" stop-color="${C.cyan}"/><stop offset="0.5" stop-color="${C.accent}"/><stop offset="1" stop-color="${C.violet}"/></linearGradient>
<linearGradient id="txt" x1="0" x2="1"><stop offset="0" stop-color="${C.accentStrong}"/><stop offset="1" stop-color="${C.violet}"/></linearGradient></defs>
<g clip-path="url(#moldura)">
<rect width="${W}" height="${H}" fill="${C.panel}"/>
<path d="${onda(14, 128, 300)}" fill="url(#o1)" opacity="0.18"><animateTransform attributeName="transform" type="translate" values="0 0;-600 0" dur="14s" repeatCount="indefinite"/></path>
<path d="${onda(10, 140, 225)}" fill="url(#o1)" opacity="0.32"><animateTransform attributeName="transform" type="translate" values="-450 0;0 0" dur="10s" repeatCount="indefinite"/></path>
<path d="${onda(7, 152, 180)}" fill="url(#o1)" opacity="0.55"><animateTransform attributeName="transform" type="translate" values="0 0;-540 0" dur="8s" repeatCount="indefinite"/></path>
${simboloP(W / 2 - 9, 26, 0.65)}
<text x="${W / 2}" y="82" text-anchor="middle" class="s" font-size="22" font-weight="600" fill="url(#txt)">valeu pela visita! volta sempre :)</text>
<text x="${W / 2}" y="106" text-anchor="middle" class="m" font-size="12" fill="${C.muted}">feito com café, Claude Code e uma pitada de caos · Goiânia/GO</text>
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="21.5" fill="none" stroke="${C.line}"/>`;
  salvar("rodape.svg", svg(W, H, corpo, { fontes: ["sora", "mono"], titulo: "Valeu pela visita! Feito com café, Claude Code e uma pitada de caos." }));
}

// ---------- 8) PAINEL AO VIVO (dados do GitHub) ----------
async function buscarDados() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) return null;
  const query = `query($u:String!){user(login:$u){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;
  const r = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "perfil-gerador" },
    body: JSON.stringify({ query, variables: { u: USUARIO } }),
  });
  const j = await r.json();
  const cal = j?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) { console.warn("GraphQL sem calendário:", JSON.stringify(j).slice(0, 300)); return null; }
  const dias = cal.weeks.flatMap((w) => w.contributionDays).map((d) => ({ data: d.date, n: d.contributionCount }));
  dias.sort((a, b) => a.data.localeCompare(b.data));
  const ultimos = dias.slice(-30);
  return {
    total: cal.totalContributions,
    mes: ultimos.reduce((s, d) => s + d.n, 0),
    ativos: dias.filter((d) => d.n > 0).length,
    recorde: Math.max(0, ...dias.map((d) => d.n)),
    ultimos,
  };
}

function digitosRolando(valor, x, y, tam, cor, atraso) {
  const s = String(valor);
  const dw = tam * 0.64, lh = tam * 1.15;
  let out = "";
  [...s].forEach((ch, j) => {
    const cx = n2(x + j * dw + dw / 2);
    if (!/\d/.test(ch)) { out += `<text x="${cx}" y="${y}" text-anchor="middle" class="s" font-size="${tam}" font-weight="600" fill="${cor}">${esc(ch)}</text>`; return; }
    const d = +ch, seq = [...Array(10).keys(), ...Array(d + 1).keys()];
    const fim = n2(-(seq.length - 1) * lh);
    out += `<g><animateTransform attributeName="transform" type="translate" from="0 0" to="0 ${fim}" dur="${n2(1.3 + j * 0.25)}s" begin="${atraso}s" fill="freeze" ${EASE}/>${seq.map((v, k) => `<text x="${cx}" y="${n2(y + k * lh)}" text-anchor="middle" class="s" font-size="${tam}" font-weight="600" fill="${cor}">${v}</text>`).join("")}</g>`;
  });
  return out;
}

function painel(dados) {
  const W = 900, H = 330, PAD = 24, GAP = 14;
  const agora = new Date();
  const quando = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(agora).replace(",", " às");
  const diasGit = Math.floor((agora - new Date(DESDE + "T00:00:00-03:00")) / 864e5);
  const tiles = [
    ["contribuições no último ano", dados.total, C.accentStrong],
    ["nos últimos 30 dias", dados.mes, C.green],
    ["dias ativos no ano", dados.ativos, C.violet],
    ["recorde num dia só", dados.recorde, C.amber],
  ];
  const tw = (W - 2 * PAD - 3 * GAP) / 4, th = 92;
  let corpo = "", defs = "";
  tiles.forEach(([rot, val, cor], i) => {
    const x = n2(PAD + i * (tw + GAP)), y = 50;
    defs += `<clipPath id="tc${i}"><rect x="${x}" y="${y + 43}" width="${n2(tw)}" height="38"/></clipPath>`;
    corpo += `<rect x="${x}" y="${y}" width="${n2(tw)}" height="${th}" rx="14" fill="${C.surface}" stroke="${C.line}"/>
<rect x="${n2(x + 16)}" y="${y + 14}" width="22" height="3" rx="1.5" fill="${cor}"/>
<text x="${n2(x + 16)}" y="${y + 34}" class="m" font-size="10.5" fill="${C.muted}">${esc(rot)}</text>
<g clip-path="url(#tc${i})">${digitosRolando(val, x + 16, y + 72, 32, C.text, n2(0.3 + i * 0.2))}</g>`;
  });
  // barras dos últimos 30 dias
  const bx = PAD, by = 172, bh = 92, bwTot = W - 2 * PAD;
  const n = dados.ultimos.length || 1, larg = bwTot / n, max = Math.max(1, ...dados.ultimos.map((d) => d.n));
  let barras = "";
  dados.ultimos.forEach((d, i) => {
    const h = d.n ? Math.max(4, (d.n / max) * bh) : 2;
    const x = n2(bx + i * larg + 2), w = n2(larg - 4), y = n2(by + bh - h);
    const hoje = i === n - 1;
    barras += `<rect x="${x}" y="${by + bh}" width="${w}" height="0" rx="3" fill="${hoje ? C.accentStrong : d.n ? "url(#barra)" : C.line}"><animate attributeName="height" from="0" to="${n2(h)}" dur="0.9s" begin="${n2(0.4 + i * 0.035)}s" fill="freeze" ${EASE}/><animate attributeName="y" from="${by + bh}" to="${y}" dur="0.9s" begin="${n2(0.4 + i * 0.035)}s" fill="freeze" ${EASE}/></rect>`;
  });
  const ini = dados.ultimos[0]?.data?.split("-").reverse().slice(0, 2).join("/") ?? "";
  const fim = dados.ultimos.at(-1)?.data?.split("-").reverse().slice(0, 2).join("/") ?? "";
  const tudo = `<defs><clipPath id="moldura"><rect width="${W}" height="${H}" rx="22"/></clipPath>
<linearGradient id="barra" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${C.accentDark}"/><stop offset="1" stop-color="${C.accent}"/></linearGradient>${defs}</defs>
<g clip-path="url(#moldura)"><rect width="${W}" height="${H}" fill="${C.panel}"/>
<text x="${PAD}" y="32" class="m" font-size="12" fill="${C.muted}"><tspan fill="${C.accent}">//</tspan> painel de bordo · github.com/${USUARIO}</text>
<g transform="translate(${W - PAD - 92} 18)"><rect width="92" height="22" rx="11" fill="${C.green}" fill-opacity="0.1" stroke="${C.green}" stroke-opacity="0.35"/><circle cx="13" cy="11" r="3.5" fill="${C.green}"><animate attributeName="opacity" values="1;0.2;1" dur="1.4s" repeatCount="indefinite"/></circle><text x="23" y="15" class="m" font-size="10" font-weight="600" fill="${C.green}" letter-spacing="0.6">AO VIVO</text></g>
${corpo}
<text x="${PAD}" y="${by - 10}" class="m" font-size="10.5" fill="${C.muted}">contribuições nos últimos 30 dias (${ini} a ${fim})</text>
<text x="${W - PAD}" y="${by - 10}" text-anchor="end" class="m" font-size="10.5" fill="${C.dim}">pico: ${max}</text>
<line x1="${bx}" x2="${W - PAD}" y1="${by + bh + 0.5}" y2="${by + bh + 0.5}" stroke="${C.line}"/>
${barras}
<text x="${PAD}" y="${H - 20}" class="m" font-size="10.5" fill="${C.dim}">atualizado em ${esc(quando)} (Brasília) · ${diasGit.toLocaleString("pt-BR")} dias de GitHub</text>
<text x="${W - PAD}" y="${H - 20}" text-anchor="end" class="m" font-size="10.5" fill="${C.dim}">hoje: <tspan fill="${C.accentStrong}">${dados.ultimos.at(-1)?.n ?? 0}</tspan></text>
</g><rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="21.5" fill="none" stroke="${C.line}"/>`;
  salvar("painel.svg", svg(W, H, tudo, { fontes: ["sora", "mono"], titulo: `Painel ao vivo: ${dados.total} contribuições no último ano, ${dados.mes} nos últimos 30 dias` }));
}

// ---------- 9) FRASE DO DIA (README) ----------
const FRASES = [
  "Funciona na minha máquina. A gente só precisa mandar minha máquina pro cliente.",
  "Não é bug, é uma funcionalidade surpresa.",
  "Café entra, código sai. Às vezes o contrário.",
  "Deploy na sexta? Só se a coragem estiver em dia.",
  "Todo sistema grande começou como um 'é rapidinho'.",
  "A IA escreve, eu reviso, o cliente sorri. Trabalho em equipe.",
  "Commit pequeno, alegria grande.",
  "Se compilou de primeira, desconfie.",
  "Meu código não tem bugs. Tem easter eggs não documentados.",
  "Planilha não é sistema. Mas foi assim que todo sistema nasceu.",
  "Produto bom é aquele que o usuário nem percebe que usa.",
  "O melhor código é o que eu não precisei escrever.",
  "Hoje é dia de transformar 'e se...' em 'tá no ar'.",
  "Primeiro faz funcionar, depois faz bonito, depois faz rápido.",
  "Backlog infinito, café também.",
  "Nenhum CSS foi centralizado sem sofrimento.",
  "Cliente feliz é o melhor teste automatizado.",
  "A Lia atende, eu codo, o café segura as pontas.",
  "Ideia sem prazo é só um sonho com Wi-Fi.",
  "Refatorar é dar um banho no código.",
  "Git push e uma oração. Funciona 9 em cada 10 vezes.",
  "Sistema bom é aquele que deixa o dono tirar férias.",
  "Documentar é deixar um bilhete pro meu eu do futuro.",
  "Simples é difícil. Por isso vale tanto.",
  "Toda automação começa com alguém cansado de copiar e colar.",
  "Dashboard bonito não paga conta. Dashboard certo sim.",
  "Se tem tela de login, tem história pra contar.",
  "Pamonha, café e um terminal aberto: combo goiano de produtividade.",
  "Quem testa em produção vive emoções que o QA nunca vai entender.",
  "O cronograma é otimista. Eu também.",
];
function fraseDoDia() {
  const arq = join(RAIZ, "README.md");
  if (!existsSync(arq)) return;
  const hoje = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()) + "T12:00:00Z");
  const diaDoAno = Math.floor((hoje - Date.UTC(hoje.getUTCFullYear(), 0, 0)) / 864e5);
  const frase = FRASES[(diaDoAno * 7) % FRASES.length];
  const readme = readFileSync(arq, "utf8");
  const novo = readme.replace(/<!-- FRASE:INICIO -->[\s\S]*?<!-- FRASE:FIM -->/, `<!-- FRASE:INICIO -->\n<p align="center"><sub>FRASE DO DIA</sub><br/><em>"${frase}"</em></p>\n<!-- FRASE:FIM -->`);
  if (novo !== readme) writeFileSync(arq, novo);
}

// ---------- execução ----------
hero();
terminal();
stack();
PROJETOS.forEach(card);
TITULOS.forEach((t) => { titulo(t, false); titulo(t, true); });
BOTOES.forEach(botao);
rodape();
const dados = await buscarDados();
if (dados) painel(dados);
else if (!existsSync(join(ASSETS, "painel.svg"))) painel({ total: 0, mes: 0, ativos: 0, recorde: 0, ultimos: [] });
else console.warn("Sem token: painel.svg mantido como está.");
fraseDoDia();
console.log("SVGs gerados em assets/", dados ? `(painel: ${dados.total} no ano, ${dados.mes} em 30 dias)` : "");
