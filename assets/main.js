
/* ── LIEC main.js ── */

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
