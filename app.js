/* ==========================================================================
   INTERJORNADAS CASCAVEL — app.js
   Núcleo da aplicação: persistência (LocalStorage), toasts, modais,
   navegação da sidebar e funções utilitárias compartilhadas entre módulos.
   Este arquivo deve ser carregado ANTES de qualquer outro arquivo /js/*.js
   ========================================================================== */

'use strict';

/* ==========================================================================
   1. CAMADA DE PERSISTÊNCIA (LocalStorage)
   ========================================================================== */

/**
 * Namespace usado como prefixo de todas as chaves salvas no LocalStorage,
 * evitando colisão com outros sistemas rodando na mesma origem.
 */
const DB_PREFIX = 'interjornadas_';

/**
 * Nomes das "coleções" (equivalente a tabelas) que o sistema mantém.
 * Centralizar aqui evita strings soltas e erros de digitação pelo código.
 */
const DB_KEYS = {
  EQUIPES: 'equipes',
  JOGADORES: 'jogadores',
  CAMPEONATOS: 'campeonatos',
  PARTIDAS: 'partidas',
  CONFIG: 'config',
  SEED_VERSION: 'seed_version'
};

/**
 * Versão do seed de dados de demonstração. Se mudarmos a versão aqui,
 * o seed roda de novo mesmo que já exista dado salvo (útil em desenvolvimento).
 * Para reset manual, o usuário usa Configurações > Restaurar dados de exemplo.
 */
const SEED_VERSION = 1;

const DB = {
  /**
   * Lê uma coleção inteira do LocalStorage.
   * @param {string} key - uma das chaves de DB_KEYS
   * @returns {Array|Object} array (coleções) ou objeto (config), nunca null
   */
  get(key) {
    try {
      const raw = localStorage.getItem(DB_PREFIX + key);
      if (!raw) return key === DB_KEYS.CONFIG ? {} : [];
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[DB] Erro ao ler "${key}":`, err);
      return key === DB_KEYS.CONFIG ? {} : [];
    }
  },

  /**
   * Sobrescreve uma coleção inteira no LocalStorage.
   * @param {string} key
   * @param {Array|Object} value
   */
  set(key, value) {
    try {
      localStorage.setItem(DB_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[DB] Erro ao salvar "${key}":`, err);
      if (err.name === 'QuotaExceededError') {
        showToast('Armazenamento cheio. Remova fotos/logos grandes para liberar espaço.', 'error');
      }
      return false;
    }
  },

  /**
   * Adiciona um novo item a uma coleção (array), gerando id único.
   * @param {string} key
   * @param {Object} item - objeto sem id (id é gerado aqui)
   * @returns {Object} o item salvo, já com id
   */
  insert(key, item) {
    const list = this.get(key);
    const newItem = { ...item, id: generateId(), criadoEm: new Date().toISOString() };
    list.push(newItem);
    this.set(key, list);
    return newItem;
  },

  /**
   * Atualiza um item existente pelo id (merge raso).
   * @param {string} key
   * @param {string} id
   * @param {Object} patch - campos a atualizar
   * @returns {Object|null} item atualizado, ou null se não encontrado
   */
  update(key, id, patch) {
    const list = this.get(key);
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, atualizadoEm: new Date().toISOString() };
    this.set(key, list);
    return list[idx];
  },

  /**
   * Remove um item de uma coleção pelo id.
   * @param {string} key
   * @param {string} id
   * @returns {boolean} true se removido
   */
  remove(key, id) {
    const list = this.get(key);
    const filtered = list.filter(item => item.id !== id);
    const removed = filtered.length !== list.length;
    if (removed) this.set(key, filtered);
    return removed;
  },

  /**
   * Busca um item pelo id em uma coleção.
   * @param {string} key
   * @param {string} id
   * @returns {Object|undefined}
   */
  findById(key, id) {
    return this.get(key).find(item => item.id === id);
  }
};

/**
 * Gera um id único simples (timestamp + random), suficiente para uso local.
 * @returns {string}
 */
function generateId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/* ==========================================================================
   2. SEED DE DADOS DE DEMONSTRAÇÃO
   Roda apenas na primeira execução (ou quando SEED_VERSION muda), para que
   o sistema já abra com conteúdo de exemplo navegável.
   ========================================================================== */

function seedDatabaseIfNeeded() {
  const currentVersion = DB.get(DB_KEYS.SEED_VERSION);
  if (currentVersion === SEED_VERSION) return;

  const jaTemDados = DB.get(DB_KEYS.EQUIPES).length > 0;
  if (jaTemDados) {
    // Já existem dados reais do usuário: não sobrescrever, só marcar a versão.
    localStorage.setItem(DB_PREFIX + DB_KEYS.SEED_VERSION, JSON.stringify(SEED_VERSION));
    return;
  }

  const equipes = [
    { id: 'eq_falcoes', nome: 'Falcões FC', logo: '', corPrincipal: '#FFD400', corSecundaria: '#0D0D0D', modalidade: 'Futsal', responsavel: 'Marcos Silva' },
    { id: 'eq_furacao', nome: 'Furacão Futsal', logo: '', corPrincipal: '#5C9CFF', corSecundaria: '#0D0D0D', modalidade: 'Futsal', responsavel: 'Carla Mendes' },
    { id: 'eq_leoes', nome: 'Leões da Serra', logo: '', corPrincipal: '#E74C3C', corSecundaria: '#FFFFFF', modalidade: 'Futsal', responsavel: 'João Pedro' },
    { id: 'eq_aguias', nome: 'Águias Cascavel', logo: '', corPrincipal: '#2ECC71', corSecundaria: '#0D0D0D', modalidade: 'Futsal', responsavel: 'Renata Costa' },
    { id: 'eq_tornado', nome: 'Tornado Vôlei', logo: '', corPrincipal: '#FFD400', corSecundaria: '#5C9CFF', modalidade: 'Vôlei', responsavel: 'Felipe Araújo' },
    { id: 'eq_impacto', nome: 'Impacto Vôlei Clube', logo: '', corPrincipal: '#9B59B6', corSecundaria: '#FFFFFF', modalidade: 'Vôlei', responsavel: 'Beatriz Lima' }
  ].map(e => ({ ...e, criadoEm: new Date().toISOString() }));
  DB.set(DB_KEYS.EQUIPES, equipes);

  const nomesJogadores = {
    eq_falcoes: ['Lucas Ferreira', 'Bruno Alves', 'Diego Santos', 'Rafael Souza', 'Thiago Rocha'],
    eq_furacao: ['Gabriel Lima', 'Matheus Costa', 'André Pereira', 'Felipe Martins', 'Caio Ribeiro'],
    eq_leoes: ['Pedro Henrique', 'Vinícius Gomes', 'Eduardo Dias', 'Igor Barbosa', 'Leonardo Cruz'],
    eq_aguias: ['Daniel Oliveira', 'Rodrigo Nunes', 'Marcelo Teixeira', 'Júlio César', 'Otávio Ramos'],
    eq_tornado: ['Mariana Silva', 'Camila Reis', 'Fernanda Castro', 'Larissa Pinto', 'Juliana Moraes'],
    eq_impacto: ['Patrícia Santos', 'Aline Borges', 'Débora Carvalho', 'Vanessa Lopes', 'Sabrina Duarte']
  };

  const posicoesFutsal = ['Goleiro', 'Fixo', 'Ala', 'Ala', 'Pivô'];
  const posicoesVolei = ['Levantador', 'Ponteiro', 'Central', 'Oposto', 'Líbero'];

  const jogadores = [];
  Object.entries(nomesJogadores).forEach(([equipeId, nomes]) => {
    const equipe = equipes.find(e => e.id === equipeId);
    const posicoes = equipe.modalidade === 'Futsal' ? posicoesFutsal : posicoesVolei;
    nomes.forEach((nome, i) => {
      jogadores.push({
        id: generateId(),
        nome,
        apelido: nome.split(' ')[0],
        numero: i + 1,
        posicao: posicoes[i],
        equipeId,
        foto: '',
        dataNascimento: `${1995 + (i % 8)}-0${(i % 9) + 1}-1${i}`,
        altura: 165 + i * 3,
        peso: 60 + i * 4,
        status: 'Ativo',
        criadoEm: new Date().toISOString()
      });
    });
  });
  DB.set(DB_KEYS.JOGADORES, jogadores);

  const hoje = new Date();
  const fmtData = (d) => d.toISOString().slice(0, 10);
  const dataInicio = new Date(hoje); dataInicio.setDate(hoje.getDate() - 21);
  const dataFim = new Date(hoje); dataFim.setDate(hoje.getDate() + 21);

  const campeonatoFutsal = {
    id: 'camp_futsal_2026',
    nome: 'Copa InterJornadas Futsal 2026',
    modalidade: 'Futsal',
    temporada: '2026',
    dataInicio: fmtData(dataInicio),
    dataFim: fmtData(dataFim),
    descricao: 'Torneio municipal de futsal entre as equipes de Cascavel, disputado em pontos corridos.',
    logo: '',
    formato: 'Pontos corridos',
    equipesIds: ['eq_falcoes', 'eq_furacao', 'eq_leoes', 'eq_aguias'],
    status: 'Em andamento',
    criadoEm: new Date().toISOString()
  };

  const campeonatoVolei = {
    id: 'camp_volei_2026',
    nome: 'Liga InterJornadas Vôlei 2026',
    modalidade: 'Vôlei',
    temporada: '2026',
    dataInicio: fmtData(dataInicio),
    dataFim: fmtData(dataFim),
    descricao: 'Liga municipal de vôlei entre clubes de Cascavel.',
    logo: '',
    formato: 'Pontos corridos',
    equipesIds: ['eq_tornado', 'eq_impacto'],
    status: 'Em andamento',
    criadoEm: new Date().toISOString()
  };

  DB.set(DB_KEYS.CAMPEONATOS, [campeonatoFutsal, campeonatoVolei]);

  // Gera confrontos todos-contra-todos do campeonato de futsal (algumas já finalizadas, com eventos)
  const partidas = gerarPartidasTodosContraTodos(campeonatoFutsal, jogadores);
  partidas.push(...gerarPartidasVoleiDemo(campeonatoVolei, jogadores));
  DB.set(DB_KEYS.PARTIDAS, partidas);

  localStorage.setItem(DB_PREFIX + DB_KEYS.SEED_VERSION, JSON.stringify(SEED_VERSION));
}

/**
 * Gera a rodada completa de confrontos todos-contra-todos (ida) para um
 * campeonato de futsal, já simulando algumas partidas finalizadas com
 * eventos de gol/assistência/cartão para popular o dashboard e rankings.
 */
function gerarPartidasTodosContraTodos(campeonato, todosJogadores) {
  const times = campeonato.equipesIds;
  const partidas = [];
  let rodada = 1;
  const hoje = new Date();

  for (let i = 0; i < times.length; i++) {
    for (let j = i + 1; j < times.length; j++) {
      const dataPartida = new Date(hoje);
      dataPartida.setDate(hoje.getDate() - 14 + rodada * 3);

      const partida = {
        id: generateId(),
        campeonatoId: campeonato.id,
        modalidade: 'Futsal',
        rodada,
        mandanteId: times[i],
        visitanteId: times[j],
        data: dataPartida.toISOString().slice(0, 10),
        hora: '19:30',
        local: 'Ginásio Municipal de Cascavel',
        status: rodada <= 4 ? 'Finalizada' : 'Agendada',
        placarMandante: 0,
        placarVisitante: 0,
        eventos: [],
        cronometroSegundos: 0,
        criadoEm: new Date().toISOString()
      };

      if (partida.status === 'Finalizada') {
        simularEventosPartidaFutsal(partida, todosJogadores);
      }

      partidas.push(partida);
      rodada++;
    }
  }
  return partidas;
}

/**
 * Preenche uma partida de futsal com eventos simulados (gols, assistências,
 * cartões) de forma determinística o suficiente para parecer um jogo real.
 */
function simularEventosPartidaFutsal(partida, todosJogadores) {
  const jogadoresMandante = todosJogadores.filter(j => j.equipeId === partida.mandanteId);
  const jogadoresVisitante = todosJogadores.filter(j => j.equipeId === partida.visitanteId);

  const golsMandante = (partida.id.charCodeAt(0) % 4);
  const golsVisitante = (partida.id.charCodeAt(1) % 3);

  for (let g = 0; g < golsMandante; g++) {
    const autor = jogadoresMandante[g % jogadoresMandante.length];
    const assistente = jogadoresMandante[(g + 1) % jogadoresMandante.length];
    partida.eventos.push({
      id: generateId(), tipo: 'gol', timeId: partida.mandanteId,
      jogadorId: autor.id, minuto: 5 + g * 7, timestamp: new Date().toISOString()
    });
    if (assistente.id !== autor.id) {
      partida.eventos.push({
        id: generateId(), tipo: 'assistencia', timeId: partida.mandanteId,
        jogadorId: assistente.id, minuto: 5 + g * 7, timestamp: new Date().toISOString()
      });
    }
  }
  for (let g = 0; g < golsVisitante; g++) {
    const autor = jogadoresVisitante[g % jogadoresVisitante.length];
    partida.eventos.push({
      id: generateId(), tipo: 'gol', timeId: partida.visitanteId,
      jogadorId: autor.id, minuto: 8 + g * 9, timestamp: new Date().toISOString()
    });
  }

  // Um cartão amarelo de exemplo
  if (jogadoresVisitante.length) {
    partida.eventos.push({
      id: generateId(), tipo: 'cartao_amarelo', timeId: partida.visitanteId,
      jogadorId: jogadoresVisitante[jogadoresVisitante.length - 1].id, minuto: 30, timestamp: new Date().toISOString()
    });
  }

  partida.placarMandante = golsMandante;
  partida.placarVisitante = golsVisitante;
}

/**
 * Gera partidas de demonstração de vôlei (com sets e MVP) entre os dois
 * clubes de exemplo.
 */
function gerarPartidasVoleiDemo(campeonato, todosJogadores) {
  const [timeA, timeB] = campeonato.equipesIds;
  if (!timeA || !timeB) return [];
  const jogadoresA = todosJogadores.filter(j => j.equipeId === timeA);

  const hoje = new Date();
  const dataPartida = new Date(hoje); dataPartida.setDate(hoje.getDate() - 5);

  const partida = {
    id: generateId(),
    campeonatoId: campeonato.id,
    modalidade: 'Vôlei',
    rodada: 1,
    mandanteId: timeA,
    visitanteId: timeB,
    data: dataPartida.toISOString().slice(0, 10),
    hora: '20:00',
    local: 'Ginásio Municipal de Cascavel',
    status: 'Finalizada',
    sets: [
      { mandante: 25, visitante: 18 },
      { mandante: 22, visitante: 25 },
      { mandante: 25, visitante: 20 }
    ],
    setsMandante: 2,
    setsVisitante: 1,
    mvpJogadorId: jogadoresA[0] ? jogadoresA[0].id : null,
    eventos: [],
    criadoEm: new Date().toISOString()
  };

  return [partida];
}

/* ==========================================================================
   3. SISTEMA DE TOASTS
   ========================================================================== */

/**
 * Exibe uma notificação toast no canto inferior direito.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration - ms antes de sumir automaticamente
 */
function showToast(message, type = 'info', duration = 3200) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-text"></span>
  `;
  toast.querySelector('.toast-text').textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/* ==========================================================================
   4. SISTEMA DE MODAIS (genérico e reutilizável)
   ========================================================================== */

/**
 * Abre um modal a partir de um template HTML interno, injetando o conteúdo
 * fornecido. Cuida de overlay, fechar com ESC, clique fora e botão de fechar.
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.bodyHtml
 * @param {string} [opts.footerHtml]
 * @param {string} [opts.size] - '' | 'lg' | 'sm'
 * @param {Function} [opts.onClose]
 * @returns {{overlay: HTMLElement, close: Function}}
 */
function openModal({ title, bodyHtml, footerHtml = '', size = '', onClose = null }) {
  closeAllModals();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box ${size ? 'modal-' + size : ''}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="modal-header">
        <h3>${escapeHtml(title)}</h3>
        <button type="button" class="modal-close" aria-label="Fechar">✕</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => overlay.remove(), 250);
    document.removeEventListener('keydown', escHandler);
    if (onClose) onClose();
  }

  function escHandler(e) {
    if (e.key === 'Escape') close();
  }

  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', escHandler);

  // Pequeno timeout para garantir a transição de entrada (CSS transition).
  requestAnimationFrame(() => overlay.classList.add('open'));

  return { overlay, close };
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
  document.body.style.overflow = '';
}

/**
 * Abre um modal de confirmação padronizado (excluir, etc).
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.confirmLabel]
 * @param {Function} opts.onConfirm
 */
function confirmAction({ title = 'Confirmar ação', message, confirmLabel = 'Excluir', onConfirm }) {
  const bodyHtml = `
    <div style="text-align:center;">
      <div class="confirm-icon">⚠</div>
      <p style="color: var(--color-gray-300); font-size: 0.9rem;">${escapeHtml(message)}</p>
    </div>
  `;
  const footerHtml = `
    <button type="button" class="btn btn-secondary" data-action="cancel">Cancelar</button>
    <button type="button" class="btn btn-danger" data-action="confirm">${escapeHtml(confirmLabel)}</button>
  `;

  const { overlay, close } = openModal({ title, bodyHtml, footerHtml, size: 'sm' });

  overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
  overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
    onConfirm();
    close();
  });
}

/* ==========================================================================
   5. NAVEGAÇÃO / SIDEBAR
   ========================================================================== */

const NAV_ITEMS = [
  { href: 'index.html', icon: '🏠', label: 'Dashboard', match: ['index.html', ''] },
  { href: 'equipes.html', icon: '⚽', label: 'Equipes', match: ['equipes.html'] },
  { href: 'jogadores.html', icon: '👤', label: 'Jogadores', match: ['jogadores.html'] },
  { href: 'campeonatos.html', icon: '🏆', label: 'Campeonatos', match: ['campeonatos.html'] },
  { href: 'partidas.html', icon: '📅', label: 'Partidas', match: ['partidas.html'] },
  { href: 'classificacao.html', icon: '📊', label: 'Classificação', match: ['classificacao.html'] },
  { href: 'rankings.html', icon: '🥇', label: 'Rankings', match: ['rankings.html'] },
  { href: 'configuracoes.html', icon: '⚙', label: 'Configurações', match: ['configuracoes.html'] }
];

/**
 * Constrói o shell de layout (sidebar + topbar) dentro de #app-shell-root.
 * Cada página HTML só precisa ter <div id="app-shell-root" class="app-shell"></div>
 * (um único elemento, que já É o container flex) e chamar initLayout({...}) no final
 * do body, depois de carregar todos os scripts. IMPORTANTE: não aninhar
 * #app-shell-root dentro de outra .app-shell — a sidebar e a main-area
 * precisam ser filhas DIRETAS do container flex para o layout funcionar.
 * @param {Object} opts
 * @param {string} opts.pageTitle
 * @param {string} [opts.pageSubtitle]
 */
function initLayout({ pageTitle, pageSubtitle = '' }) {
  const currentPage = window.location.pathname.split('/').pop();

  const navHtml = NAV_ITEMS.map(item => {
    const isActive = item.match.includes(currentPage);
    return `
      <a href="${item.href}" class="nav-item ${isActive ? 'active' : ''}">
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
      </a>
    `;
  }).join('');

  const shellHtml = `
    <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="brand-mark">IJ</div>
        <div class="brand-text">
          <strong>InterJornadas</strong>
          <span>CASCAVEL</span>
        </div>
      </div>
      <nav class="sidebar-nav">${navHtml}</nav>
      <div class="sidebar-footer">
        <button type="button" class="collapse-btn" id="collapseBtn">
          <span id="collapseIcon">⮜</span>
          <span id="collapseLabel">Recolher menu</span>
        </button>
      </div>
    </aside>

    <div class="main-area">
      <header class="topbar">
        <button type="button" class="topbar-menu-toggle" id="mobileMenuToggle" aria-label="Abrir menu">☰</button>
        <div class="page-title-block">
          <h1>${escapeHtml(pageTitle)}</h1>
        </div>
        <div class="topbar-search">
          <span class="search-icon">🔍</span>
          <input type="text" id="globalSearchInput" class="form-control" placeholder="Buscar equipes, jogadores, campeonatos...">
          <div id="globalSearchResults"></div>
        </div>
        <div class="topbar-actions">
          <span class="badge badge-futsal" title="Dados salvos localmente neste navegador">💾 Local</span>
        </div>
      </header>
      <main class="page-content page-view" id="pageContentRoot"></main>
    </div>
  `;

  document.getElementById('app-shell-root').innerHTML = shellHtml;
  document.title = `${pageTitle} — InterJornadas Cascavel`;

  setupSidebarBehavior();
  setupGlobalSearch();
}

function setupSidebarBehavior() {
  const sidebar = document.getElementById('sidebar');
  const collapseBtn = document.getElementById('collapseBtn');
  const collapseIcon = document.getElementById('collapseIcon');
  const collapseLabel = document.getElementById('collapseLabel');
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const backdrop = document.getElementById('sidebarBackdrop');

  const isCollapsed = localStorage.getItem(DB_PREFIX + 'sidebar_collapsed') === 'true';
  if (isCollapsed) {
    sidebar.classList.add('collapsed');
    collapseIcon.textContent = '⮞';
    collapseLabel.textContent = 'Expandir menu';
  }

  collapseBtn.addEventListener('click', () => {
    const collapsed = sidebar.classList.toggle('collapsed');
    collapseIcon.textContent = collapsed ? '⮞' : '⮜';
    collapseLabel.textContent = collapsed ? 'Expandir menu' : 'Recolher menu';
    localStorage.setItem(DB_PREFIX + 'sidebar_collapsed', String(collapsed));
    // A largura da área principal muda com a sidebar; avisa gráficos/Canvas
    // que dependam de 'resize' (ex: dashboard.js) para se redesenharem.
    setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
  });

  mobileToggle.addEventListener('click', () => {
    sidebar.classList.add('mobile-open');
    backdrop.classList.add('open');
  });

  backdrop.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    backdrop.classList.remove('open');
  });
}

/* ==========================================================================
   6. BUSCA GLOBAL INSTANTÂNEA
   ========================================================================== */

function setupGlobalSearch() {
  const input = document.getElementById('globalSearchInput');
  const resultsBox = document.getElementById('globalSearchResults');
  if (!input || !resultsBox) return;

  resultsBox.style.cssText = `
    position: absolute; top: calc(100% + 8px); left: 0; right: 0;
    background: var(--color-gray-900); border: 1px solid var(--color-gray-700);
    border-radius: var(--radius-md); box-shadow: var(--shadow-modal);
    max-height: 360px; overflow-y: auto; display: none; z-index: 200;
  `;

  input.addEventListener('input', debounce(() => {
    const term = input.value.trim().toLowerCase();
    if (term.length < 2) {
      resultsBox.style.display = 'none';
      return;
    }
    const results = performGlobalSearch(term);
    renderGlobalSearchResults(results, resultsBox);
  }, 180));

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2) resultsBox.style.display = 'block';
  });

  document.addEventListener('click', (e) => {
    if (!resultsBox.contains(e.target) && e.target !== input) {
      resultsBox.style.display = 'none';
    }
  });
}

function performGlobalSearch(term) {
  const equipes = DB.get(DB_KEYS.EQUIPES).filter(e => e.nome.toLowerCase().includes(term));
  const jogadores = DB.get(DB_KEYS.JOGADORES).filter(j => j.nome.toLowerCase().includes(term) || (j.apelido || '').toLowerCase().includes(term));
  const campeonatos = DB.get(DB_KEYS.CAMPEONATOS).filter(c => c.nome.toLowerCase().includes(term));
  return { equipes, jogadores, campeonatos };
}

function renderGlobalSearchResults({ equipes, jogadores, campeonatos }, container) {
  const total = equipes.length + jogadores.length + campeonatos.length;
  if (total === 0) {
    container.innerHTML = `<div style="padding: var(--space-4); font-size: 0.85rem; color: var(--color-gray-400);">Nenhum resultado encontrado.</div>`;
    container.style.display = 'block';
    return;
  }

  const section = (label, items, hrefFn) => {
    if (!items.length) return '';
    const rows = items.slice(0, 4).map(it => `
      <a href="${hrefFn(it)}" style="display:flex; align-items:center; gap:10px; padding: 10px 16px; font-size: 0.85rem; color: var(--color-white); transition: background 150ms;" onmouseover="this.style.background='var(--color-gray-800)'" onmouseout="this.style.background='transparent'">
        ${it.nome}
      </a>
    `).join('');
    return `<div style="padding: 8px 16px 2px; font-size: 0.68rem; text-transform: uppercase; letter-spacing: .05em; color: var(--color-yellow);">${label}</div>${rows}`;
  };

  container.innerHTML =
    section('Equipes', equipes, e => `equipe-detalhe.html?id=${e.id}`) +
    section('Jogadores', jogadores, j => `jogador-detalhe.html?id=${j.id}`) +
    section('Campeonatos', campeonatos, c => `campeonato-detalhe.html?id=${c.id}`);
  container.style.display = 'block';
}

/* ==========================================================================
   7. HELPERS UTILITÁRIOS GERAIS
   ========================================================================== */

/**
 * Evita disparar uma função repetidamente em sequência rápida (ex: digitação).
 */
function debounce(fn, wait = 200) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Escapa caracteres HTML para evitar quebra de layout/XSS ao injetar texto
 * vindo de inputs do usuário diretamente em innerHTML.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formata uma data ISO (yyyy-mm-dd) para o padrão brasileiro dd/mm/yyyy.
 */
function formatarData(isoDate) {
  if (!isoDate) return '—';
  const [ano, mes, dia] = isoDate.split('-');
  return `${dia}/${mes}/${ano}`;
}

/**
 * Calcula a idade atual a partir de uma data de nascimento ISO.
 */
function calcularIdade(isoDate) {
  if (!isoDate) return '—';
  const nascimento = new Date(isoDate);
  if (isNaN(nascimento)) return '—';
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade;
}

/**
 * Converte um arquivo de imagem (input file) para uma string base64 (data URL),
 * que é como salvamos logos/fotos no LocalStorage (já que não há servidor).
 * @param {File} file
 * @returns {Promise<string>}
 */
function fileParaBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Retorna as iniciais de um nome (até 2 letras), usadas como fallback visual
 * quando uma equipe/jogador não possui logo/foto cadastrada.
 */
function iniciais(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Gera o HTML de um "badge" de equipe (logo ou fallback com iniciais),
 * reutilizado em cards, tabelas e telas de detalhe.
 * @param {Object} equipe
 * @param {number} size - tamanho em px
 */
function renderBadgeEquipe(equipe, size = 64) {
  if (!equipe) {
    return `<div class="entity-badge-fallback" style="width:${size}px;height:${size}px;font-size:${size * 0.32}px;">?</div>`;
  }
  if (equipe.logo) {
    return `<img src="${equipe.logo}" alt="Escudo ${escapeHtml(equipe.nome)}" class="entity-badge-img" style="width:${size}px;height:${size}px;">`;
  }
  return `<div class="entity-badge-fallback" style="width:${size}px;height:${size}px;font-size:${size * 0.32}px;background:${equipe.corPrincipal ? hexToFallbackBg(equipe.corPrincipal) : ''}">${iniciais(equipe.nome)}</div>`;
}

function hexToFallbackBg(hex) {
  return `${hex}22`; // leve transparência sobre a cor principal da equipe
}

/* ==========================================================================
   8. INICIALIZAÇÃO GLOBAL
   Executa em toda página que carrega este script.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  seedDatabaseIfNeeded();
});
