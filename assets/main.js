
/* ── Circuitopedia main.js ── */

// ── Barra de progreso de lectura ──────────────────────────────────────────
(function () {
  const article = document.getElementById('content');
  if (!article) return;

  const bar = document.createElement('div');
  bar.id = 'reading-progress';
  document.body.appendChild(bar);

  const btn = document.createElement('button');
  btn.id = 'back-to-top';
  btn.innerHTML = '↑';
  btn.setAttribute('aria-label', 'Volver arriba');
  document.body.appendChild(btn);
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  window.addEventListener('scroll', () => {
    const total = article.offsetHeight - window.innerHeight;
    const pct = total > 0 ? Math.min(100, (-article.getBoundingClientRect().top / total) * 100) : 0;
    bar.style.width = Math.max(0, pct) + '%';
    btn.classList.toggle('visible', window.scrollY > 380);
  }, { passive: true });
})();

// ── Tema oscuro/claro ──────────────────────────────────────────────────────
const themeBtn = document.getElementById('theme-btn');
const html = document.documentElement;

function aplicarTema(tema) {
  html.setAttribute('data-theme', tema);
  localStorage.setItem('liec-theme', tema);
  if (themeBtn) themeBtn.textContent = tema === 'dark' ? '☀️' : '🌙';
}

const temaGuardado = localStorage.getItem('liec-theme') ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
aplicarTema(temaGuardado);

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    aplicarTema(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
}

// ── Sidebar móvil ──────────────────────────────────────────────────────────
const sidebar   = document.getElementById('sidebar');
const menuBtn   = document.getElementById('menu-btn');
const overlay   = document.getElementById('sidebar-overlay');
const closeBtn  = document.getElementById('sidebar-close');

function abrirSidebar() {
  sidebar && sidebar.classList.add('open');
  overlay && overlay.classList.add('open');
}
function cerrarSidebar() {
  sidebar && sidebar.classList.remove('open');
  overlay && overlay.classList.remove('open');
}

menuBtn  && menuBtn.addEventListener('click', abrirSidebar);
overlay  && overlay.addEventListener('click', cerrarSidebar);
closeBtn && closeBtn.addEventListener('click', cerrarSidebar);

// Marcar enlace activo en sidebar
const currentPath = window.location.pathname.split('/').slice(-2).join('/');
document.querySelectorAll('.cap-list a').forEach(a => {
  const href = a.getAttribute('href');
  if (href && href.includes(currentPath.split('/').pop())) {
    a.classList.add('active');
    a.scrollIntoView({ block: 'nearest' });
  }
});

// ── Acordeón del sidebar ───────────────────────────────────────────────────
(function () {
  const volGroups = document.querySelectorAll('.vol-group');

  // Abrir solo el grupo que contiene el enlace activo (o cuya URL coincide)
  function abrirGrupoActivo() {
    const activeLink = document.querySelector('.cap-list a.active');
    if (activeLink) {
      activeLink.closest('.vol-group')?.classList.add('open');
      return;
    }
    // Fallback: comparar carpeta de la URL con el href del vol-title
    const seg = window.location.pathname.split('/').filter(Boolean);
    const carpetaActual = seg[seg.length - 2] || '';
    volGroups.forEach(group => {
      const title = group.querySelector('.vol-title');
      if (!title) return;
      const href = title.getAttribute('href') || '';
      const carpeta = href.replace('../', '').split('/')[0];
      if (carpeta && carpeta === carpetaActual) group.classList.add('open');
    });
  }

  // Clic en vol-title: siempre actúa como acordeón, nunca navega
  volGroups.forEach(group => {
    const title = group.querySelector('.vol-title');
    if (!title) return;
    title.addEventListener('click', (e) => {
      e.preventDefault();
      const yaAbierto = group.classList.contains('open');
      volGroups.forEach(g => g.classList.remove('open'));
      if (!yaAbierto) group.classList.add('open');
    });
  });

  abrirGrupoActivo();
})();

// ── Lector de voz (TTS) ───────────────────────────────────────────────────
(function () {
  const content = document.getElementById('content');
  if (!content || !window.speechSynthesis) return;

  const synth = window.speechSynthesis;
  let paras = [], currentIdx = 0, speaking = false, paused = false, rate = 1;
  let selectedVoice = null;

  // UI: botón flotante
  const listenBtn = document.createElement('button');
  listenBtn.id = 'tts-btn';
  listenBtn.innerHTML = '<i class="ti ti-volume" aria-hidden="true"></i>';
  listenBtn.setAttribute('aria-label', 'Escuchar este capítulo');
  listenBtn.title = 'Escuchar';
  document.body.appendChild(listenBtn);

  // UI: barra reproductora
  const playerBar = document.createElement('div');
  playerBar.id = 'tts-bar';
  playerBar.setAttribute('role', 'region');
  playerBar.setAttribute('aria-label', 'Reproductor de voz');
  playerBar.innerHTML = `
    <span id="tts-label">0 / 0</span>
    <div class="tts-controls">
      <button id="tts-prev" aria-label="Párrafo anterior" title="Anterior">⏮</button>
      <button id="tts-play" aria-label="Pausar" title="Pausar">⏸</button>
      <button id="tts-next" aria-label="Párrafo siguiente" title="Siguiente">⏭</button>
      <button id="tts-stop" aria-label="Detener" title="Detener">⏹</button>
      <select id="tts-speed" aria-label="Velocidad de lectura">
        <option value="0.75">0.75×</option>
        <option value="1" selected>1×</option>
        <option value="1.25">1.25×</option>
        <option value="1.5">1.5×</option>
        <option value="2">2×</option>
      </select>
    </div>`;
  document.body.appendChild(playerBar);

  // Cargar voces en español
  function loadVoices() {
    const voices = synth.getVoices();
    selectedVoice =
      voices.find(v => v.lang === 'es-ES' && v.localService) ||
      voices.find(v => v.lang.startsWith('es') && v.localService) ||
      voices.find(v => v.lang.startsWith('es')) ||
      null;
  }
  loadVoices();
  synth.addEventListener('voiceschanged', loadVoices);

  // Mostrar/ocultar botón cuando el usuario baja suficiente
  const scrollHandler = () => {
    if (content && window.scrollY > 200) listenBtn.classList.add('visible');
    else if (!speaking) listenBtn.classList.remove('visible');
  };
  window.addEventListener('scroll', scrollHandler, { passive: true });

  // Extraer párrafos legibles del contenido
  function getParagraphs() {
    return Array.from(
      content.querySelectorAll('p, li, td, th, .content > h2, .content > h3')
    ).filter(el => {
      const t = el.textContent.trim();
      return t.length > 30 &&
        !el.closest('.chapter-nav') &&
        !el.closest('nav') &&
        !el.closest('.table-wrap td') || el.tagName === 'P';
    });
  }

  // Resaltar párrafo activo y hacer scroll suave
  function highlight(idx) {
    paras.forEach((p, i) => p.classList.toggle('speaking', i === idx));
    if (paras[idx]) {
      paras[idx].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    document.getElementById('tts-label').textContent =
      `${idx + 1} / ${paras.length}`;
  }

  // Chrome bug: cancela silenciosamente después de ~15s — keepalive
  let keepAlive;
  function startKeepAlive() {
    clearInterval(keepAlive);
    keepAlive = setInterval(() => {
      if (synth.speaking && !synth.paused) { synth.pause(); synth.resume(); }
    }, 10000);
  }
  function stopKeepAlive() { clearInterval(keepAlive); }

  // Hablar desde un índice
  function speakFrom(idx) {
    synth.cancel();
    currentIdx = idx;
    scheduleNext();
  }

  function scheduleNext() {
    // Pequeño timeout para que Chrome procese el cancel anterior
    setTimeout(speakCurrent, 50);
  }

  function speakCurrent() {
    if (!speaking || paused || currentIdx >= paras.length) {
      if (currentIdx >= paras.length) stopAll();
      return;
    }
    const text = paras[currentIdx].textContent.trim().replace(/\s+/g, ' ');
    if (!text) { currentIdx++; scheduleNext(); return; }

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = rate;
    utt.lang = 'es-ES';
    if (selectedVoice) utt.voice = selectedVoice;

    highlight(currentIdx);

    utt.onend = () => {
      if (speaking && !paused) { currentIdx++; scheduleNext(); }
    };
    utt.onerror = (e) => {
      if (e.error !== 'interrupted') { currentIdx++; scheduleNext(); }
    };

    synth.speak(utt);
    startKeepAlive();
  }

  function stopAll() {
    synth.cancel();
    stopKeepAlive();
    speaking = false;
    paused = false;
    paras.forEach(p => p.classList.remove('speaking'));
    playerBar.classList.remove('visible');
    listenBtn.classList.remove('active');
    listenBtn.innerHTML = '<i class="ti ti-volume" aria-hidden="true"></i>';
    document.getElementById('tts-play').textContent = '⏸';
  }

  // Botón principal: iniciar / detener
  listenBtn.addEventListener('click', () => {
    if (speaking) { stopAll(); return; }
    paras = getParagraphs();
    if (!paras.length) return;
    speaking = true;
    paused = false;
    playerBar.classList.add('visible');
    listenBtn.classList.add('active');
    listenBtn.innerHTML = '<i class="ti ti-volume-off" aria-hidden="true"></i>';
    speakFrom(0);
  });

  // Play / Pausa
  document.getElementById('tts-play').addEventListener('click', () => {
    if (!speaking) return;
    if (paused) {
      synth.resume();
      paused = false;
      document.getElementById('tts-play').innerHTML = '⏸';
      startKeepAlive();
    } else {
      synth.pause();
      paused = true;
      stopKeepAlive();
      document.getElementById('tts-play').innerHTML = '▶';
    }
  });

  document.getElementById('tts-stop').addEventListener('click', stopAll);

  document.getElementById('tts-prev').addEventListener('click', () => {
    if (!speaking) return;
    speakFrom(Math.max(0, currentIdx - 1));
  });

  document.getElementById('tts-next').addEventListener('click', () => {
    if (!speaking) return;
    speakFrom(Math.min(paras.length - 1, currentIdx + 1));
  });

  document.getElementById('tts-speed').addEventListener('change', (e) => {
    rate = parseFloat(e.target.value);
    if (speaking && !paused) speakFrom(currentIdx);
  });
})();

// ── Buscador ───────────────────────────────────────────────────────────────
const searchInput   = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
let searchIndex     = null;

// Detectar si estamos en raíz o en subdir
const isRoot = !window.location.pathname.match(/\/(DC|AC|Semi|Digital|Ref|Exper|Devel)\//);
const assetsBase = isRoot ? 'assets/' : '../assets/';

async function cargarIndice() {
  if (searchIndex) return;
  try {
    const resp = await fetch(assetsBase + 'search_index.json');
    searchIndex = await resp.json();
  } catch(e) { searchIndex = []; }
}

function buscar(query) {
  if (!searchIndex || !query.trim()) return [];
  const q = query.toLowerCase();
  return searchIndex.filter(item =>
    item.titulo.toLowerCase().includes(q) ||
    item.resumen.toLowerCase().includes(q)
  ).slice(0, 8);
}

function mostrarResultados(resultados, query) {
  if (!searchResults) return;
  if (!resultados.length) {
    searchResults.innerHTML = '<div class="search-result-item"><span>Sin resultados para "' + query + '"</span></div>';
  } else {
    searchResults.innerHTML = resultados.map(r => {
      const urlBase = isRoot ? '' : '../';
      return `<div class="search-result-item" onclick="location.href='${urlBase}${r.url}'">
        <strong>${r.titulo}</strong>
        <span>${r.resumen.substring(0,120)}…</span>
      </div>`;
    }).join('');
  }
  searchResults.classList.remove('hidden');
}

if (searchInput) {
  searchInput.addEventListener('focus', cargarIndice);
  searchInput.addEventListener('input', async (e) => {
    const q = e.target.value;
    if (!q.trim()) { searchResults && searchResults.classList.add('hidden'); return; }
    await cargarIndice();
    mostrarResultados(buscar(q), q);
  });
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && searchResults && !searchResults.contains(e.target)) {
      searchResults.classList.add('hidden');
    }
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') searchResults && searchResults.classList.add('hidden');
  });
}
