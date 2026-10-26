/* ==========================================================================
   Transys Assistant — natural-language interface for the Transys website
   --------------------------------------------------------------------------
   Runs 100% in the visitor's browser: free, no API key, no server.
   Works on GitHub Pages as-is.

   Two engines:
   1. Quick mode  — built-in NLP (intent rules + BM25 search with synonym
                    expansion over the knowledge base). Instant, works in
                    every browser, no download.
   2. AI mode     — a small open-source LLM (Qwen / Llama via WebLLM) that
                    runs on the visitor's GPU (WebGPU). It answers in natural
                    language, grounded only in the same knowledge base (RAG).
                    First use downloads the model once (~0.4–1 GB); after
                    that it loads from the browser cache.

   USAGE — add ONE line before </body> on any page:
       <script type="module" src="transys-assistant.js"></script>
   Optional attributes on that tag:
       data-open="true"        start with the chat panel open
       data-autoload-ai="true" load the AI model automatically on WebGPU devices

   To update what the assistant knows, edit the KB array below.
   ========================================================================== */

/* ------------------------------ CONFIG ---------------------------------- */
export const CONFIG = {
  botName: "Transys Assistant",
  company: "Transys",
  siteUrl: "https://faizzeya.github.io/transys/",
  contactEmail: "faizulhaquezeya@gmail.com",
  accent: "#1557d4",
  // Models offered in AI mode (WebLLM prebuilt IDs). Smallest first.
  models: [
    { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen 2.5 · 0.5B (fast, ~400 MB)" },
    { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 · 1B (~900 MB)" },
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen 2.5 · 1.5B (best, ~1 GB)" },
  ],
  defaultModel: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
  webllmUrls: [
    "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm",
    "https://esm.run/@mlc-ai/web-llm",
  ],
  suggestions: [
    "What products do you make?",
    "Download Snooker Pro",
    "How much does Cerchen cost?",
    "Do you offer AI consulting?",
  ],
};

/* --------------------------- KNOWLEDGE BASE ------------------------------
   One entry per topic. Keep `text` factual — the AI only says what is here.
   type: company | product | service | person | contact
   ------------------------------------------------------------------------ */
const SITE = CONFIG.siteUrl;
export const KB = [
  {
    id: "about", type: "company", title: "About Transys",
    tags: ["company", "about", "who", "pakistan", "karachi", "research", "software house"],
    text: "Transys is a software and AI research company based in Karachi, Pakistan, founded and led by CEO Prof. Engr. Faiz ul Haque Zeya. Transys builds Windows software and games, natural-language AI applications, and provides AI consulting, research and training.",
    links: [{ label: "Transys home", url: SITE }],
  },
  {
    id: "ceo", type: "person", title: "Faiz ul Haque Zeya — Founder & CEO",
    tags: ["ceo", "founder", "owner", "faiz", "zeya", "professor", "author", "books", "team"],
    text: "Prof. Engr. Faiz ul Haque Zeya is the Founder and CEO of Transys. He is a Senior Associate Professor of Software Engineering at Bahria University Karachi Campus with over two decades of teaching, holds an MS in Computer Science from the University of Tulsa and also studied at San José State University. He has authored numerous books on AI and computer science, and specialises in agentic AI (LangChain, LangGraph, MCP, RAG), formal methods and Python/AI development.",
    links: [{ label: "faizzeya.com", url: "https://faizzeya.github.io/" }],
  },
  {
    id: "consulting", type: "service", title: "AI Consulting & Development",
    tags: ["ai", "consulting", "consultant", "agentic", "langchain", "langgraph", "mcp", "rag", "chatbot", "llm", "hire", "project", "custom", "development", "services"],
    text: "Transys offers AI consulting and custom development: agentic AI systems, RAG (retrieval-augmented generation) chatbots over company documents, LangChain/LangGraph workflows, MCP tool integrations, local/private LLM deployments with Ollama, and Python AI development. Contact Transys by email to discuss a project.",
    links: [{ label: "Email Transys", url: "mailto:" + CONFIG.contactEmail + "?subject=AI%20consulting%20enquiry" }],
  },
  {
    id: "training", type: "service", title: "Training & Research",
    tags: ["training", "teaching", "course", "workshop", "research", "books", "lectures", "devops", "formal methods", "services"],
    text: "Transys provides training and research in AI and software engineering, drawing on its CEO's 20+ years of university teaching and books on AI and computer science. Topics include agentic AI, RAG, DevOps, and formal methods in software engineering.",
    links: [{ label: "Email Transys", url: "mailto:" + CONFIG.contactEmail + "?subject=Training%20enquiry" }],
  },
  {
    id: "cerchen", type: "product", title: "Cerchen v3 — multi-engine search",
    tags: ["cerchen", "search", "engine", "google", "bing", "yahoo", "shareware", "windows", "price", "buy", "paid", "23"],
    text: "Cerchen v3 is a Windows multi-engine search app: Google, Yahoo and Bing open in separate tabs and one Search button queries them all. It is shareware priced at USD 23; the paid version adds various other search engines. To buy, email faizulhaquezeya@gmail.com.",
    links: [
      { label: "Download Cerchen3.zip", url: SITE + "Cerchen3.zip" },
      { label: "Screenshot", url: SITE + "cerchen.jpg" },
      { label: "Buy (email)", url: "mailto:" + CONFIG.contactEmail + "?subject=Buy%20Cerchen%20v3" },
    ],
  },
  {
    id: "snooker", type: "product", title: "Snooker Pro",
    tags: ["snooker", "pool", "billiards", "cue", "game", "freeware", "free", "windows", "microsoft store", "sports"],
    text: "Snooker Pro is an advanced snooker game for Windows, developed by Transys, Pakistan. It is freeware and is also being published on the Microsoft Store.",
    links: [
      { label: "Download Snooker20.zip", url: SITE + "Snooker20.zip" },
      { label: "Screenshot", url: SITE + "snooker.jpg" },
    ],
  },
  {
    id: "jet", type: "product", title: "JET Game",
    tags: ["jet", "game", "arcade", "shooter", "plane", "freeware", "free", "windows"],
    text: "JET Game is an arcade shooter for Windows (version 1.0). It is freeware.",
    links: [{ label: "Download JET.zip", url: SITE + "JET.zip" }],
  },
  {
    id: "grid", type: "product", title: "Grid — block puzzle game",
    tags: ["grid", "tetris", "block", "puzzle", "falling", "game", "freeware", "free", "windows", "levels"],
    text: "Grid is a Tetris-style falling-block puzzle game for Windows with advanced levels. It is freeware.",
    links: [{ label: "Download Grid.zip", url: SITE + "Grid.zip" }],
  },
  {
    id: "novastrike", type: "product", title: "Nova Strike",
    tags: ["nova", "strike", "space", "3d", "combat", "shooter", "game", "freeware", "free", "windows"],
    text: "Nova Strike is a 3D space combat game for Windows. It is freeware; the download link is on the Transys products page.",
    links: [{ label: "Transys products page", url: SITE + "index.html" }],
  },
  {
    id: "life", type: "product", title: "Cellular Automata — Conway's Game of Life",
    tags: ["cellular", "automata", "conway", "life", "simulation", "freeware", "free", "windows", "educational"],
    text: "Cellular Automata – Conway's Game of Life is a Windows program from Transys that simulates Conway's Game of Life. It is freeware.",
    links: [{ label: "Transys products page", url: SITE + "index.html" }],
  },
  {
    id: "househunt", type: "product", title: "HouseHunt AI",
    tags: ["househunt", "house", "home", "property", "real estate", "zameen", "zillow", "rent", "ai", "natural language", "ollama", "freeware", "windows"],
    text: "HouseHunt AI is a natural-language house search app: describe the home you want in plain words and it searches listings such as Zameen and Zillow. It runs locally with Ollama (private AI on your own PC) and is distributed as a Windows program.",
    links: [{ label: "Transys products page", url: SITE + "index.html" }],
  },
  {
    id: "sitesage", type: "product", title: "SiteSage (in development)",
    tags: ["sitesage", "website", "questions", "pdf", "documents", "crawl", "rag", "ai", "ollama", "desktop", "upcoming", "new"],
    text: "SiteSage is an upcoming desktop app from Transys: give it a website address and ask natural-language questions about that site and its PDFs and documents. It crawls the site and answers with fully local AI via Ollama, so data stays private. It is currently in development.",
    links: [{ label: "Ask about early access", url: "mailto:" + CONFIG.contactEmail + "?subject=SiteSage%20early%20access" }],
  },
  {
    id: "contact", type: "contact", title: "Contact Transys",
    tags: ["contact", "email", "reach", "phone", "address", "hire", "support", "buy", "order", "location", "youtube", "linkedin"],
    text: "Email Transys at faizulhaquezeya@gmail.com for purchases, support, AI consulting or training. Transys is based in Karachi, Pakistan. Faiz ul Haque Zeya also publishes AI explainer videos on YouTube and is active on LinkedIn.",
    links: [
      { label: "Email Transys", url: "mailto:" + CONFIG.contactEmail },
      { label: "faizzeya.com", url: "https://faizzeya.github.io/" },
    ],
  },
  {
    id: "assistant", type: "company", title: "About this assistant",
    tags: ["assistant", "chatbot", "how", "work", "llm", "webllm", "private", "privacy", "data"],
    text: "This assistant runs entirely in your browser. Quick mode uses built-in language processing to search the Transys knowledge base. AI mode runs a small open-source language model on your own device using WebGPU, so your questions are never sent to a server.",
    links: [],
  },
];

/* ------------------------------ NLP CORE --------------------------------- */
const STOP = new Set(("a an the is are was were be been am do does did of to in on for with at by from " +
  "and or but if then so i me my you your we our it its this that these those what which who whom how " +
  "can could would should will shall may might please tell about show give want need like know any some " +
  "there here have has had just also get much many").split(" "));
// keep some question words that matter
["who", "how", "much", "get"].forEach(w => STOP.delete(w));

const SYN = {
  download: ["install", "setup", "zip", "exe", "get", "link"],
  price: ["cost", "buy", "purchase", "pay", "paid", "license", "shareware", "much", "rate", "fee"],
  free: ["freeware", "gratis", "no cost"],
  game: ["play", "arcade", "gaming", "fun"],
  contact: ["email", "mail", "reach", "phone", "hire", "talk", "address"],
  ai: ["artificial", "intelligence", "llm", "agentic", "chatbot", "gpt", "machine", "learning", "nlp"],
  ceo: ["founder", "owner", "boss", "director", "head", "faiz", "zeya"],
  search: ["engine", "google", "bing", "yahoo", "browse"],
  snooker: ["pool", "billiard", "cue", "ball"],
  tetris: ["block", "puzzle", "brick"],
  consulting: ["consultant", "consultancy", "service", "help", "project", "custom", "develop"],
  house: ["home", "property", "apartment", "flat", "plot", "real", "estate", "rent"],
  space: ["galaxy", "star", "spaceship", "alien"],
  windows: ["pc", "desktop", "laptop", "computer"],
};

export function stem(w) {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}
export function tokenize(s) {
  return (s.toLowerCase().normalize("NFKD").match(/[a-z0-9]+/g) || [])
    .filter(w => w.length > 1 && !STOP.has(w)).map(stem);
}
const SYN_INDEX = (() => {
  const m = new Map();
  for (const [k, vs] of Object.entries(SYN)) {
    const all = [k, ...vs].flatMap(tokenize);
    for (const t of all) m.set(t, [...new Set([...(m.get(t) || []), ...all])]);
  }
  return m;
})();
function expand(tokens) {
  const w = new Map();
  for (const t of tokens) w.set(t, Math.max(w.get(t) || 0, 1));
  for (const t of tokens) for (const s of SYN_INDEX.get(t) || []) if (!w.has(s)) w.set(s, 0.5);
  return w;
}

// BM25 index
const docs = KB.map(d => {
  const toks = [...tokenize(d.title), ...tokenize(d.title), ...tokenize(d.tags.join(" ")),
    ...tokenize(d.tags.join(" ")), ...tokenize(d.text)];
  const tf = new Map(); toks.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
  return { d, tf, len: toks.length };
});
const avgLen = docs.reduce((a, x) => a + x.len, 0) / docs.length;
const df = new Map();
docs.forEach(x => x.tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1)));
const idf = t => Math.log(1 + (docs.length - (df.get(t) || 0) + 0.5) / ((df.get(t) || 0) + 0.5));

export function search(query, k = 4) {
  const q = expand(tokenize(query));
  const k1 = 1.4, b = 0.75;
  return docs.map(x => {
    let s = 0;
    q.forEach((wt, t) => {
      const f = x.tf.get(t); if (!f) return;
      s += wt * idf(t) * (f * (k1 + 1)) / (f + k1 * (1 - b + b * x.len / avgLen));
    });
    return { doc: x.d, score: s };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
}

// Rule-based intents (deterministic, used in both modes)
export function detectIntent(q) {
  const s = q.toLowerCase().trim();
  const words = s.split(/\s+/).length;
  if (words <= 4 && /^(hi|hello|hey|salam|salaam|assalam|aoa|hiya|good (morning|afternoon|evening))\b/.test(s)) return { name: "greet" };
  if (words <= 6 && /\b(thanks|thank you|thx|shukriya|jazakallah|great|awesome)\b/.test(s)) return { name: "thanks" };
  if (/\b(bye|goodbye|khuda hafiz|allah hafiz)\b/.test(s) && words <= 4) return { name: "bye" };
  const listy = /\b(list|all|which|what|show|available|range|catalog|catalogue)\b/.test(s) || words <= 3;
  if (listy && /\b(products?|apps?|applications?|software|programs?|games?|tools?|downloads?)\b/.test(s)) {
    const top = search(q, 1)[0];
    if (top && top.doc.type === "product" && top.score >= 8) return null; // a specific product was named
    return { name: "list", games: /\bgames?\b/.test(s), free: /\bfree(ware)?\b/.test(s), ai: /\bai\b/.test(s) };
  }
  if (/\b(services?|what do you do|what does transys do|offer)\b/.test(s) && !/\b(products?|games?)\b/.test(s)) return { name: "services" };
  return null;
}

export function listProducts(opt = {}) {
  let ps = KB.filter(d => d.type === "product");
  if (opt.games) ps = ps.filter(d => d.tags.includes("game"));
  if (opt.free) ps = ps.filter(d => d.tags.includes("freeware"));
  if (opt.ai) ps = ps.filter(d => d.tags.includes("ai"));
  if (!ps.length) ps = KB.filter(d => d.type === "product");
  const head = opt.games ? "Transys games" : opt.ai ? "Transys AI products" : opt.free ? "Free Transys software" : "Transys products";
  return {
    text: `**${head}:**\n` + ps.map(d => `- **${d.title}** — ${d.text.split(/(?<=\.)\s/)[0]}`).join("\n") +
      "\n\nAsk me about any of them, e.g. \u201cdownload " + ps[0].title.split(/\s[—-]\s|\s\(/)[0] + "\u201d.",
    links: ps.flatMap(d => d.links.filter(l => /download/i.test(l.label)).slice(0, 1)),
  };
}

export function quickAnswer(q) {
  const intent = detectIntent(q);
  if (intent) return intentAnswer(intent);
  const r = search(q, 3);
  if (!r.length || r[0].score < 2.5) {
    return {
      text: `I'm not sure about that. I can help with Transys products, downloads, prices, AI consulting and contact details.\nFor anything else, email **${CONFIG.contactEmail}**.`,
      links: [{ label: "Email Transys", url: "mailto:" + CONFIG.contactEmail }],
    };
  }
  const top = r[0].doc;
  let text = `**${top.title}**\n${top.text}`;
  const links = [...top.links];
  const second = r[1];
  if (second && second.score > 0.7 * r[0].score && second.doc.type === top.type) {
    text += `\n\nYou may also like **${second.doc.title}**.`;
    links.push(...second.doc.links.slice(0, 1));
  }
  return { text, links };
}

export function intentAnswer(intent) {
  switch (intent.name) {
    case "greet": return { text: `Hello! I'm the ${CONFIG.botName}. Ask me anything about Transys — our software, games, AI services, prices or how to get in touch.`, links: [] };
    case "thanks": return { text: "You're welcome! Anything else I can help with?", links: [] };
    case "bye": return { text: "Goodbye — thanks for visiting Transys!", links: [] };
    case "list": return listProducts(intent);
    case "services": {
      const s = KB.filter(d => d.type === "service");
      return { text: "**Transys services:**\n" + s.map(d => `- **${d.title}** — ${d.text}`).join("\n"), links: s.flatMap(d => d.links.slice(0, 1)).slice(0, 1) };
    }
  }
}

/* ------------------------------ LLM (WebLLM) ----------------------------- */
let engine = null, webllm = null, activeModel = null;

export async function hasWebGPU() {
  try { return !!(navigator.gpu && await navigator.gpu.requestAdapter()); } catch { return false; }
}
async function loadWebLLM() {
  if (webllm) return webllm;
  let err;
  for (const u of CONFIG.webllmUrls) { try { webllm = await import(u); return webllm; } catch (e) { err = e; } }
  throw err;
}
async function availableModels() {
  const lib = await loadWebLLM();
  const ids = new Set((lib.prebuiltAppConfig?.model_list || []).map(m => m.model_id));
  const ok = CONFIG.models.filter(m => ids.has(m.id));
  return ok.length ? ok : CONFIG.models;
}
async function loadModel(id, onProgress) {
  const lib = await loadWebLLM();
  if (engine) { try { await engine.unload(); } catch {} engine = null; }
  engine = await lib.CreateMLCEngine(id, { initProgressCallback: p => onProgress(p.progress || 0, p.text || "") });
  activeModel = id;
  return engine;
}

function systemPrompt(context) {
  return `You are ${CONFIG.botName}, the friendly website assistant for ${CONFIG.company}, a software and AI company in Karachi, Pakistan.
Answer the visitor's question using ONLY the facts in CONTEXT. Be concise: 1–4 short sentences, or a short bullet list.
If the answer is not in CONTEXT, say you don't know and suggest emailing ${CONFIG.contactEmail}. Never invent products, prices, links or facts.
Download and contact buttons are shown automatically below your reply, so you don't need to write out URLs.

CONTEXT:
${context}`;
}

/* -------------------------------- UI ------------------------------------- */
const esc = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function md(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+|mailto:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
    .replace(/^\s*[-*•]\s+(.*)$/gm, '<span class="li">$1</span>')
    .replace(/\n/g, "<br>")
    .replace(/<\/span><br>(?=<span class="li">)/g, "</span>");
}
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

const CSS = `
:host{all:initial}
*{box-sizing:border-box}
.wrap{--accent:${CONFIG.accent};--bg:#fff;--fg:#151922;--muted:#667085;--line:#e5e7ee;--bot:#f3f5f9;--shadow:0 18px 50px rgba(16,24,40,.22);
 font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--fg)}
@media (prefers-color-scheme:dark){.wrap{--bg:#151821;--fg:#e9ecf3;--muted:#98a2b3;--line:#2a2f3c;--bot:#1f2330;--shadow:0 18px 50px rgba(0,0,0,.5)}}
.fab{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:flex;align-items:center;gap:8px;border:0;cursor:pointer;
 background:var(--accent);color:#fff;font:600 15px system-ui,sans-serif;padding:14px 18px;border-radius:999px;box-shadow:var(--shadow)}
.fab:hover{filter:brightness(1.08)}
.fab svg{width:20px;height:20px}
.panel{position:fixed;right:20px;bottom:20px;z-index:2147483001;width:390px;height:min(620px,calc(100vh - 40px));display:none;flex-direction:column;
 background:var(--bg);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow);overflow:hidden}
.panel.open{display:flex}
@media (max-width:520px){.panel{right:0;bottom:0;width:100vw;height:100dvh;border-radius:0;border:0}.fab{right:16px;bottom:16px}}
header{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--accent);color:#fff}
.logo{width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.18);display:grid;place-items:center;font-weight:800}
.ttl{flex:1;min-width:0}.ttl b{display:block;font-size:15px}.ttl small{opacity:.88;font-size:12px}
.hbtn{background:rgba(255,255,255,.14);border:0;color:#fff;width:32px;height:32px;border-radius:9px;cursor:pointer;display:grid;place-items:center}
.hbtn:hover{background:rgba(255,255,255,.26)}
.hbtn svg{width:18px;height:18px}
.settings{display:none;padding:12px 14px;border-bottom:1px solid var(--line);background:var(--bot);font-size:13px}
.settings.open{display:block}
.settings label{display:block;color:var(--muted);margin-bottom:6px}
.settings select{width:100%;padding:8px;border-radius:9px;border:1px solid var(--line);background:var(--bg);color:var(--fg);font:inherit}
.row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.btn{border:1px solid var(--line);background:var(--bg);color:var(--fg);padding:8px 12px;border-radius:9px;cursor:pointer;font:600 13px system-ui,sans-serif}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.btn:disabled{opacity:.5;cursor:default}
.note{color:var(--muted);margin-top:8px;font-size:12px}
.prog{height:6px;background:var(--line);border-radius:9px;overflow:hidden;margin-top:10px;display:none}
.prog.on{display:block}.prog i{display:block;height:100%;width:0;background:var(--accent);transition:width .2s}
.msgs{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:10px}
.m{max-width:88%;padding:10px 13px;border-radius:14px;word-wrap:break-word}
.m.user{align-self:flex-end;background:var(--accent);color:#fff;border-bottom-right-radius:4px}
.m.bot{align-self:flex-start;background:var(--bot);border-bottom-left-radius:4px}
.m a{color:inherit}
.m .li{display:block;padding-left:14px;position:relative}.m .li:before{content:"•";position:absolute;left:2px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.chip{display:inline-flex;align-items:center;gap:4px;font:600 12.5px system-ui,sans-serif;padding:6px 10px;border-radius:999px;border:1px solid var(--accent);
 color:var(--accent);background:var(--bg);text-decoration:none;cursor:pointer}
.chip:hover{background:var(--accent);color:#fff}
.sugg{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px}
.tag{font-size:11px;color:var(--muted);margin-top:4px}
.typing{display:inline-flex;gap:4px}.typing i{width:6px;height:6px;border-radius:50%;background:var(--muted);animation:b 1s infinite}
.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}
@keyframes b{0%,80%,100%{opacity:.25}40%{opacity:1}}
form{display:flex;gap:8px;padding:10px;border-top:1px solid var(--line)}
input{flex:1;min-width:0;padding:11px 13px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--fg);font:15px system-ui,sans-serif;outline:none}
input:focus{border-color:var(--accent)}
.send,.mic{border:0;width:44px;border-radius:12px;cursor:pointer;display:grid;place-items:center}
.send{background:var(--accent);color:#fff}.mic{background:var(--bot);color:var(--fg)}
.mic.rec{background:#e5484d;color:#fff}
.send svg,.mic svg{width:20px;height:20px}
.foot{text-align:center;font-size:11px;color:var(--muted);padding:0 0 8px}
`;

const ICON = {
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/></svg>',
};

function mount(scriptEl) {
  const host = document.createElement("div");
  host.id = "transys-assistant";
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${CSS}</style>
  <div class="wrap">
    <button class="fab" aria-label="Open ${CONFIG.botName}">${ICON.chat}<span>Ask ${CONFIG.company}</span></button>
    <section class="panel" role="dialog" aria-label="${CONFIG.botName}">
      <header>
        <div class="logo">T</div>
        <div class="ttl"><b>${CONFIG.botName}</b><small class="mode">Quick mode · instant answers</small></div>
        <button class="hbtn gearb" title="AI settings" aria-label="AI settings">${ICON.gear}</button>
        <button class="hbtn closeb" title="Close" aria-label="Close">${ICON.close}</button>
      </header>
      <div class="settings">
        <label for="mdl">AI model (free, runs on your device)</label>
        <select id="mdl"></select>
        <div class="row">
          <button class="btn primary loadb">Enable AI mode</button>
          <button class="btn quickb">Use quick mode</button>
          <button class="btn clearb">Clear chat</button>
        </div>
        <div class="prog"><i></i></div>
        <div class="note status">AI mode downloads the model once, then it is cached. Needs a browser with WebGPU (Chrome, Edge, recent Safari).</div>
      </div>
      <div class="msgs" aria-live="polite"></div>
      <div class="sugg"></div>
      <form autocomplete="off">
        <input placeholder="Ask about products, prices, services…" aria-label="Your question" maxlength="500">
        <button type="button" class="mic" title="Speak" aria-label="Speak" hidden>${ICON.mic}</button>
        <button class="send" aria-label="Send">${ICON.send}</button>
      </form>
      <div class="foot">Runs privately in your browser · ${CONFIG.company}</div>
    </section>
  </div>`;

  const $ = s => root.querySelector(s);
  const panel = $(".panel"), fab = $(".fab"), msgs = $(".msgs"), input = $("input"), form = $("form"),
    send = $(".send"), mic = $(".mic"), settings = $(".settings"), sel = $("#mdl"), loadb = $(".loadb"),
    quickb = $(".quickb"), status = $(".status"), prog = $(".prog"), bar = $(".prog i"), modeEl = $(".mode"), sugg = $(".sugg");

  let useAI = false, busy = false, history = [];

  const open = () => { panel.classList.add("open"); fab.style.display = "none"; setTimeout(() => input.focus(), 50); };
  const close = () => { panel.classList.remove("open"); fab.style.display = ""; };
  fab.onclick = open; $(".closeb").onclick = close;
  $(".gearb").onclick = () => settings.classList.toggle("open");
  document.addEventListener("keydown", e => { if (e.key === "Escape" && panel.classList.contains("open")) close(); });

  function setMode() {
    const label = CONFIG.models.find(m => m.id === activeModel)?.label.split(" (")[0] || activeModel;
    modeEl.textContent = useAI && engine ? `AI mode · ${label}` : "Quick mode · instant answers";
  }

  function addMsg(role, text, links = [], tag = "") {
    const el = document.createElement("div");
    el.className = "m " + role;
    el.innerHTML = role === "user" ? esc(text) : md(text);
    if (links.length) appendLinks(el, links);
    if (tag) { const t = document.createElement("div"); t.className = "tag"; t.textContent = tag; el.appendChild(t); }
    msgs.appendChild(el); msgs.scrollTop = msgs.scrollHeight;
    return el;
  }
  function appendLinks(el, links) {
    const seen = new Set(), c = document.createElement("div"); c.className = "chips";
    for (const l of links) {
      if (seen.has(l.url)) continue; seen.add(l.url);
      const a = document.createElement("a"); a.className = "chip"; a.href = l.url; a.textContent = l.label;
      if (!l.url.startsWith("mailto:")) { a.target = "_blank"; a.rel = "noopener"; }
      c.appendChild(a);
    }
    el.appendChild(c);
  }
  function renderSuggestions() {
    sugg.innerHTML = "";
    for (const s of CONFIG.suggestions) {
      const b = document.createElement("button"); b.className = "chip"; b.type = "button"; b.textContent = s;
      b.onclick = () => ask(s); sugg.appendChild(b);
    }
  }
  function greet() {
    msgs.innerHTML = ""; history = [];
    addMsg("bot", `Hi! I'm the **${CONFIG.botName}**. Ask me in plain English about Transys software, games, AI services, prices or contact details.`);
    renderSuggestions();
  }

  async function ask(q) {
    q = q.trim(); if (!q || busy) return;
    sugg.innerHTML = "";
    addMsg("user", q); input.value = "";
    const intent = detectIntent(q);

    if (!useAI || !engine || intent) {
      const a = intent ? intentAnswer(intent) : quickAnswer(q);
      addMsg("bot", a.text, a.links);
      history.push({ role: "user", content: q }, { role: "assistant", content: a.text });
      return;
    }

    // AI mode: retrieve, then generate grounded answer
    busy = true; send.innerHTML = ICON.stop; send.setAttribute("aria-label", "Stop");
    const hits = search(q + " " + (history.filter(h => h.role === "user").slice(-1)[0]?.content || ""), 4);
    const ctxDocs = [...new Map([...hits.map(h => h.doc), KB[0]].map(d => [d.id, d])).values()];
    const context = ctxDocs.map(d => `## ${d.title}\n${d.text}`).join("\n\n");
    const el = addMsg("bot", ""); el.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    let out = "";
    try {
      const stream = await engine.chat.completions.create({
        messages: [{ role: "system", content: systemPrompt(context) }, ...history.slice(-6), { role: "user", content: q }],
        stream: true, temperature: 0.3, max_tokens: 350,
      });
      for await (const ch of stream) {
        out += ch.choices?.[0]?.delta?.content || "";
        el.innerHTML = md(out) || '<span class="typing"><i></i><i></i><i></i></span>';
        msgs.scrollTop = msgs.scrollHeight;
      }
    } catch (e) {
      console.error(e);
      const a = quickAnswer(q); out = a.text;
      el.innerHTML = md(out);
    }
    const strong = hits.filter(h => h.score >= 0.6 * (hits[0]?.score || 0) && h.score > 2.5).slice(0, 2);
    const links = strong.flatMap(h => h.doc.links);
    if (links.length) appendLinks(el, links);
    history.push({ role: "user", content: q }, { role: "assistant", content: out });
    busy = false; send.innerHTML = ICON.send; send.setAttribute("aria-label", "Send");
  }

  form.onsubmit = e => {
    e.preventDefault();
    if (busy && engine) { try { engine.interruptGenerate(); } catch {} return; }
    ask(input.value);
  };

  // Voice input (Web Speech API, where supported)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    mic.hidden = false;
    const rec = new SR(); rec.lang = "en-US"; rec.interimResults = true;
    let on = false;
    rec.onresult = e => { input.value = [...e.results].map(r => r[0].transcript).join(""); if (e.results[e.results.length - 1].isFinal) ask(input.value); };
    rec.onend = () => { on = false; mic.classList.remove("rec"); };
    mic.onclick = () => { if (on) { rec.stop(); return; } on = true; mic.classList.add("rec"); try { rec.start(); } catch { on = false; mic.classList.remove("rec"); } };
  }

  // AI model controls
  CONFIG.models.forEach(m => { const o = document.createElement("option"); o.value = m.id; o.textContent = m.label; sel.appendChild(o); });
  sel.value = store.get("transys-ai-model") || CONFIG.defaultModel;

  async function enableAI() {
    if (!(await hasWebGPU())) {
      status.textContent = "Your browser doesn't support WebGPU, so AI mode isn't available here. Quick mode still answers everything in the knowledge base.";
      loadb.disabled = true; return;
    }
    loadb.disabled = true; sel.disabled = true; prog.classList.add("on");
    status.textContent = "Loading AI engine…";
    try {
      const models = await availableModels();
      if (!models.some(m => m.id === sel.value)) sel.value = models[0].id;
      await loadModel(sel.value, (p, t) => { bar.style.width = Math.round(p * 100) + "%"; status.textContent = t.slice(0, 140); });
      useAI = true; store.set("transys-ai-model", sel.value); store.set("transys-ai-on", "1");
      status.textContent = "AI mode is on. Answers are generated on your device.";
      setMode(); setTimeout(() => settings.classList.remove("open"), 900);
    } catch (e) {
      console.error(e);
      status.textContent = "Couldn't load the AI model (" + (e.message || e) + "). Quick mode is still working.";
      useAI = false; setMode();
    } finally {
      loadb.disabled = false; sel.disabled = false; prog.classList.remove("on");
      loadb.textContent = engine ? "Switch model" : "Enable AI mode";
    }
  }
  loadb.onclick = enableAI;
  quickb.onclick = () => { useAI = false; store.set("transys-ai-on", "0"); setMode(); settings.classList.remove("open"); };
  $(".clearb").onclick = () => { greet(); settings.classList.remove("open"); };

  greet(); setMode();
  if (scriptEl?.dataset.open === "true") open();
  const auto = scriptEl?.dataset.autoloadAi === "true" || store.get("transys-ai-on") === "1";
  if (auto) hasWebGPU().then(ok => ok && enableAI());
}

if (typeof document !== "undefined") {
  const scriptEl = [...document.querySelectorAll("script[src]")].find(s => /transys-assistant\.js/.test(s.src));
  const go = () => mount(scriptEl);
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", go) : go();
}
