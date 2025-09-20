// galeria.js — Galeria paginada via JSONP
// Backend: GET /exec?acao=listar_publico&page=1&per_page=12&w=1024&callback=receberPagina
const URL_APPS = 'https://script.google.com/macros/s/AKfycbxv4Rb6DUduupTOQGl3KMFt6bcyJEvnj5GmKmIYOZSNoKSi1NiXUK9_xTOaioO3TUCWfQ/exec';

const elGrade     = document.getElementById('grade_fotos');
const elStatus    = document.getElementById('status');
const elBtnMais   = document.getElementById('btn_carregar');
const elContador  = document.getElementById('contador');

// Estado de paginação
let paginaAtual     = 0;    
const ITENS_POR_PAG = 3; 
const THUMB_W = 1024;    
let totalPaginas    = null;
let totalItens      = 0;
let itensMostrados  = 0;
let carregando      = false;

/**
 * Injeta um <script> JSONP para buscar a próxima página.
 */
function carregarProximaPagina() {
  if (carregando) return;
  if (totalPaginas !== null && paginaAtual >= totalPaginas) return;

  carregando = true;
  elBtnMais.disabled = true;
  elStatus.textContent = 'Carregando…';

  const proxima = paginaAtual + 1;
  const s = document.createElement('script');
  const qs = new URLSearchParams({
    acao: 'listar_publico',
    page: String(proxima),
    per_page: String(ITENS_POR_PAG),
    w: String(THUMB_W),         // ↓ peça thumbs menores
    callback: 'receberPagina'
  });
  s.src = `${URL_APPS}?${qs.toString()}`;
  s.onerror = () => {
    carregando = false;
    elStatus.textContent = 'Erro ao carregar a galeria.';
    elBtnMais.disabled = false;
  };
  document.body.appendChild(s);
}

/**
 * Callback JSONP chamado pelo Apps Script.
 * Recebe { ok, page, per_page, total, total_pages, itens:[{dataUrl, nome, ...}] }
 */
window.receberPagina = function(res) {
  carregando = false;

  if (!res || !res.ok) {
    elStatus.textContent = 'Não foi possível carregar a galeria.';
    elBtnMais.disabled = false;
    return;
  }

  // Atualiza estado vindo do backend
  paginaAtual   = res.page;
  totalPaginas  = res.total_pages;
  totalItens    = res.total;
  const itens   = Array.isArray(res.itens) ? res.itens : [];

  // Renderiza itens da página (append)
  for (const item of itens) {
    const card = document.createElement('article');
    card.className = 'card';

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = item.nome || 'Foto';
    img.src = item.dataUrl || ''; // usamos dataUrl sempre

    const meta = document.createElement('div');
    meta.className = 'meta';
    const nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = item.nome || 'foto';
    meta.appendChild(nome);

    card.appendChild(img);
    card.appendChild(meta);
    elGrade.appendChild(card);
  }

  // Atualiza contadores
  itensMostrados += itens.length;
  elStatus.textContent  = itensMostrados ? `Mostrando ${itensMostrados} de ${totalItens}` : 'Nenhuma foto publicada ainda.';
  elContador.textContent = totalPaginas > 1 ? `Página ${paginaAtual} de ${totalPaginas}` : '';

  // Habilita/oculta botão "Carregar mais"
  if (paginaAtual >= totalPaginas || itens.length === 0) {
    elBtnMais.disabled = true;
    elBtnMais.style.display = 'none';
  } else {
    elBtnMais.disabled = false;
    elBtnMais.style.display = '';
  }
};

// Eventos
elBtnMais.addEventListener('click', carregarProximaPagina);

// Carrega a primeira página ao abrir
document.addEventListener('DOMContentLoaded', carregarProximaPagina);
