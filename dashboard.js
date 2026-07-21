/* ==========================================================================
   INTERJORNADAS CASCAVEL — dashboard.js
   Tela inicial: cartões de estatística, destaques (artilheiro, assistências,
   MVP), próximas partidas, últimos resultados e gráficos (Canvas API puro,
   sem bibliotecas externas).
   Depende de: app.js, ranking.js
   ========================================================================== */

'use strict';

/* ==========================================================================
   RENDERIZAÇÃO PRINCIPAL
   ========================================================================== */

function renderPaginaDashboard() {
  const root = document.getElementById('pageContentRoot');

  const equipes = DB.get(DB_KEYS.EQUIPES);
  const jogadores = DB.get(DB_KEYS.JOGADORES);
  const campeonatos = DB.get(DB_KEYS.CAMPEONATOS);
  const partidas = DB.get(DB_KEYS.PARTIDAS);

  const artilheiro = calcularArtilharia()[0];
  const assistente = calcularAssistencias()[0];
  const mvpVolei = calcularRankingMVP()[0];

  const proximas = partidas
    .filter(p => p.status !== 'Finalizada')
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''))
    .slice(0, 5);

  const ultimosResultados = partidas
    .filter(p => p.status === 'Finalizada')
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
    .slice(0, 5);

  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="eyebrow">Visão Geral</div>
        <h1>Dashboard</h1>
        <p>Resumo em tempo real de equipes, jogadores, campeonatos e partidas.</p>
      </div>
    </div>

    <div class="stat-grid">
      <div class="card stat-card"><div class="stat-icon">⚽</div><div><div class="stat-value stat-number">${equipes.length}</div><div class="stat-label">Equipes</div></div></div>
      <div class="card stat-card"><div class="stat-icon">👤</div><div><div class="stat-value stat-number">${jogadores.length}</div><div class="stat-label">Jogadores</div></div></div>
      <div class="card stat-card"><div class="stat-icon">🏆</div><div><div class="stat-value stat-number">${campeonatos.length}</div><div class="stat-label">Campeonatos</div></div></div>
      <div class="card stat-card"><div class="stat-icon">📅</div><div><div class="stat-value stat-number">${partidas.length}</div><div class="stat-label">Partidas</div></div></div>
    </div>

    <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
      ${renderDestaqueCard('⚽', 'Artilheiro Geral', artilheiro, 'gols')}
      ${renderDestaqueCard('🎯', 'Líder de Assistências', assistente, 'assistencias')}
      ${renderDestaqueCard('🏆', 'MVP do Vôlei', mvpVolei, 'mvps')}
    </div>

    <div class="section-block" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5)">
      <div>
        <h2 class="section-title">Próximas Partidas</h2>
        ${renderListaPartidasDashboard(proximas, false)}
      </div>
      <div>
        <h2 class="section-title">Últimos Resultados</h2>
        ${renderListaPartidasDashboard(ultimosResultados, true)}
      </div>
    </div>

    <div class="section-block" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5)">
      <div class="card card-pad">
        <h3 class="section-title" style="font-size:.95rem">📊 Desempenho dos Times</h3>
        <canvas id="chartWDL" style="width:100%;height:220px;display:block"></canvas>
      </div>
      <div class="card card-pad">
        <h3 class="section-title" style="font-size:.95rem">⚽ Gols por Equipe</h3>
        <canvas id="chartGols" style="width:100%;height:220px;display:block"></canvas>
      </div>
    </div>
  `;

  desenharGraficosDashboard();
}

/* ==========================================================================
   CARTÕES DE DESTAQUE (artilheiro / assistências / MVP)
   ========================================================================== */

/**
 * Renderiza um cartão de destaque genérico para líderes de estatística.
 * @param {string} icon
 * @param {string} label
 * @param {Object} dado - resultado de calcularArtilharia()[0] / calcularAssistencias()[0] / calcularRankingMVP()[0]
 * @param {string} valorKey - 'gols' | 'assistencias' | 'mvps'
 */
function renderDestaqueCard(icon, label, dado, valorKey) {
  if (!dado || !dado.jogador) {
    return `
      <div class="card card-pad" style="text-align:center;display:flex;flex-direction:column;justify-content:center;min-height:88px">
        <div style="font-size:1.6rem">${icon}</div>
        <div class="text-muted" style="font-size:.78rem;margin-top:6px">${label}</div>
        <div class="text-muted" style="font-size:.72rem;margin-top:2px">Sem dados ainda</div>
      </div>`;
  }

  const j = dado.jogador;
  return `
    <a href="jogador-detalhe.html?id=${j.id}" class="card card-hoverable card-pad" style="display:flex;align-items:center;gap:14px;text-decoration:none">
      ${j.foto
        ? `<img src="${j.foto}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid var(--color-yellow);flex-shrink:0">`
        : `<div style="width:52px;height:52px;border-radius:50%;background:var(--color-gray-700);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);color:var(--color-yellow);flex-shrink:0">${iniciais(j.nome)}</div>`}
      <div style="flex:1;min-width:0">
        <div style="font-size:.66rem;text-transform:uppercase;color:var(--color-gray-400);letter-spacing:.04em">${icon} ${label}</div>
        <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.9rem;color:var(--color-white)">${escapeHtml(j.nome)}</div>
        <div class="text-muted" style="font-size:.72rem">${escapeHtml(dado.equipe?.nome || '—')}</div>
      </div>
      <div style="font-family:var(--font-display);font-size:1.7rem;color:var(--color-yellow);flex-shrink:0">${dado[valorKey]}</div>
    </a>`;
}

/* ==========================================================================
   LISTAS DE PARTIDAS (próximas / últimos resultados)
   ========================================================================== */

function renderListaPartidasDashboard(lista, finalizada) {
  if (!lista.length) {
    return `<div class="card card-pad text-muted" style="font-size:.85rem">${finalizada ? 'Nenhum resultado registrado ainda.' : 'Nenhuma partida agendada.'}</div>`;
  }

  const equipes = DB.get(DB_KEYS.EQUIPES);

  return `<div class="flex flex-col gap-3">
    ${lista.map(p => {
      const em = equipes.find(e => e.id === p.mandanteId);
      const ev = equipes.find(e => e.id === p.visitanteId);
      return `
        <a href="partida-ao-vivo.html?id=${p.id}" class="card card-hoverable" style="padding:12px 16px;display:flex;align-items:center;gap:10px;text-decoration:none">
          <div style="flex:1;display:flex;align-items:center;gap:8px;min-width:0;justify-content:flex-end">
            <span style="font-size:.78rem;font-weight:600;color:var(--color-white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(em?.nome || '—')}</span>
            ${em?.logo ? `<img src="${em.logo}" style="width:22px;height:22px;border-radius:4px;object-fit:cover;flex-shrink:0">` : ''}
          </div>
          <div style="flex-shrink:0;text-align:center;min-width:60px">
            ${finalizada
              ? `<span style="font-family:var(--font-display);color:var(--color-yellow)">${p.placarMandante}×${p.placarVisitante}</span>`
              : `<span style="font-size:.68rem;color:var(--color-gray-400)">${formatarData(p.data)}</span>`}
          </div>
          <div style="flex:1;display:flex;align-items:center;gap:8px;min-width:0">
            ${ev?.logo ? `<img src="${ev.logo}" style="width:22px;height:22px;border-radius:4px;object-fit:cover;flex-shrink:0">` : ''}
            <span style="font-size:.78rem;font-weight:600;color:var(--color-white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(ev?.nome || '—')}</span>
          </div>
        </a>`;
    }).join('')}
  </div>`;
}

/* ==========================================================================
   GRÁFICOS (Canvas API nativa — sem bibliotecas externas)
   ========================================================================== */

function desenharGraficosDashboard() {
  const equipes = DB.get(DB_KEYS.EQUIPES);
  const dadosEquipes = equipes
    .map(e => ({ nome: e.nome, ...calcularEstatisticasEquipe(e.id) }))
    .filter(d => d.jogos > 0)
    .sort((a, b) => b.jogos - a.jogos)
    .slice(0, 6);

  const canvasWDL = document.getElementById('chartWDL');
  const canvasGols = document.getElementById('chartGols');

  const redraw = () => {
    if (canvasWDL) desenharGraficoWDL(canvasWDL, dadosEquipes);
    if (canvasGols) desenharGraficoGols(canvasGols, dadosEquipes);
  };

  redraw();
  window.addEventListener('resize', debounce(redraw, 200));
  // Redesenha também quando a sidebar é recolhida/expandida (dispara 'resize' sintético)
}

/**
 * Gráfico de barras agrupadas: Vitórias / Empates / Derrotas por equipe.
 */
function desenharGraficoWDL(canvas, dados) {
  const ctx = configurarCanvas(canvas);
  const { w, h } = ctx._dims;
  ctx.clearRect(0, 0, w, h);

  if (!dados.length) {
    desenharGraficoVazio(ctx, w, h, 'Sem partidas finalizadas ainda');
    return;
  }

  const padding = { top: 22, right: 8, bottom: 30, left: 8 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const groupW = chartW / dados.length;
  const barW = Math.max(5, Math.min(18, groupW * 0.2));
  const maxVal = Math.max(1, ...dados.map(d => Math.max(d.vitorias, d.empates, d.derrotas)));
  const cores = { vitorias: '#2ECC71', empates: '#F2B705', derrotas: '#E74C3C' };

  dados.forEach((d, i) => {
    const cx = padding.left + i * groupW + groupW / 2;
    ['vitorias', 'empates', 'derrotas'].forEach((key, j) => {
      const val = d[key];
      const barH = (val / maxVal) * chartH;
      const x = cx - barW * 1.5 - 3 + j * (barW + 3);
      const y = padding.top + chartH - barH;
      ctx.fillStyle = cores[key];
      desenharBarraArredondada(ctx, x, y, barW, barH, 3);
    });

    ctx.fillStyle = '#8C8C8C';
    ctx.font = '10px Archivo, sans-serif';
    ctx.textAlign = 'center';
    const label = d.nome.length > 9 ? d.nome.slice(0, 8) + '…' : d.nome;
    ctx.fillText(label, cx, h - 10);
  });

  desenharLegendaCanvas(ctx, w, [
    { cor: cores.vitorias, texto: 'Vitórias' },
    { cor: cores.empates, texto: 'Empates' },
    { cor: cores.derrotas, texto: 'Derrotas' }
  ]);
}

/**
 * Gráfico de barras simples: total de gols pró por equipe, ordenado.
 */
function desenharGraficoGols(canvas, dados) {
  const ctx = configurarCanvas(canvas);
  const { w, h } = ctx._dims;
  ctx.clearRect(0, 0, w, h);

  if (!dados.length) {
    desenharGraficoVazio(ctx, w, h, 'Sem gols registrados ainda');
    return;
  }

  const ordenado = [...dados].sort((a, b) => b.golsPro - a.golsPro);
  const padding = { top: 16, right: 8, bottom: 30, left: 8 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const groupW = chartW / ordenado.length;
  const barW = Math.max(18, Math.min(46, groupW * 0.5));
  const maxVal = Math.max(1, ...ordenado.map(d => d.golsPro));

  ordenado.forEach((d, i) => {
    const cx = padding.left + i * groupW + groupW / 2;
    const barH = (d.golsPro / maxVal) * chartH;
    const x = cx - barW / 2;
    const y = padding.top + chartH - barH;

    ctx.fillStyle = '#FFD400';
    desenharBarraArredondada(ctx, x, y, barW, barH, 4);

    if (barH > 18) {
      ctx.fillStyle = '#0D0D0D';
      ctx.font = 'bold 11px Archivo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(d.golsPro), cx, y + 14);
    }

    ctx.fillStyle = '#8C8C8C';
    ctx.font = '10px Archivo, sans-serif';
    ctx.textAlign = 'center';
    const label = d.nome.length > 9 ? d.nome.slice(0, 8) + '…' : d.nome;
    ctx.fillText(label, cx, h - 10);
  });
}

/* ---- Helpers de desenho no Canvas ---- */

/**
 * Ajusta o canvas para renderização nítida em telas de alta densidade (retina)
 * e retorna o contexto 2D já escalado, com as dimensões lógicas em ctx._dims.
 */
function configurarCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width || canvas.parentElement.clientWidth || 300;
  const h = parseInt(canvas.style.height, 10) || 220;

  canvas.width = w * dpr;
  canvas.height = h * dpr;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx._dims = { w, h };
  return ctx;
}

function desenharBarraArredondada(ctx, x, y, w, h, r) {
  if (h <= 0) return;
  r = Math.max(0, Math.min(r, w / 2, h));
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, [r, r, 0, 0]);
  } else {
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  }
  ctx.fill();
}

function desenharGraficoVazio(ctx, w, h, texto) {
  ctx.fillStyle = '#8C8C8C';
  ctx.font = '13px Archivo, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, w / 2, h / 2);
  ctx.textBaseline = 'alphabetic';
}

function desenharLegendaCanvas(ctx, w, itens) {
  ctx.font = '10px Archivo, sans-serif';
  const totalWidth = itens.reduce((acc, it) => acc + ctx.measureText(it.texto).width + 26, 0);
  let x = w - totalWidth - 2;
  const y = 8;
  itens.forEach(it => {
    ctx.fillStyle = it.cor;
    ctx.fillRect(x, y, 8, 8);
    ctx.fillStyle = '#B3B3B3';
    ctx.textAlign = 'left';
    ctx.fillText(it.texto, x + 12, y + 8);
    x += ctx.measureText(it.texto).width + 26;
  });
}
