/* ==========================================================================
   INTERJORNADAS CASCAVEL — classificacao.js
   Funções de renderização de tabelas e rankings.
   Depende de: app.js, ranking.js
   ========================================================================== */

'use strict';

/* ==========================================================================
   PÁGINA CLASSIFICAÇÃO (classificacao.html)
   ========================================================================== */

function renderPaginaClassificacao() {
  const root = document.getElementById('pageContentRoot');
  const campeonatos = DB.get(DB_KEYS.CAMPEONATOS);

  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="eyebrow">Tabelas</div>
        <h1>Classificação</h1>
        <p>Tabelas atualizadas automaticamente com base nos resultados.</p>
      </div>
    </div>
    ${campeonatos.length
      ? campeonatos.map(c => `
          <div class="section-block">
            <div class="flex justify-between items-center mb-3">
              <h2 class="section-title">${escapeHtml(c.nome)} <span class="badge badge-${c.modalidade === 'Futsal' ? 'futsal' : 'volei'}">${c.modalidade}</span></h2>
              <button class="btn btn-sm btn-secondary" onclick="exportarClassificacaoPrint('${c.id}')">🖨️ Imprimir</button>
            </div>
            ${c.modalidade === 'Futsal'
              ? renderTabelaClassificacao(calcularClassificacaoFutsal(c.id), 'Futsal')
              : renderTabelaClassificacao(calcularClassificacaoVolei(c.id), 'Vôlei')}
          </div>
        `).join('')
      : `<div class="empty-state"><div class="empty-icon">📊</div><h3>Nenhum campeonato ativo</h3><p>Crie um campeonato para ver a tabela de classificação.</p><a href="campeonatos.html" class="btn btn-primary">🏆 Criar Campeonato</a></div>`}
  `;
}

/* ==========================================================================
   TABELA DE CLASSIFICAÇÃO — RENDERIZAÇÃO HTML
   ========================================================================== */

function renderTabelaClassificacao(dados, modalidade) {
  if (!dados.length) {
    return `<div class="card card-pad text-muted" style="font-size:.9rem">Nenhuma equipe ou partida registrada neste campeonato ainda.</div>`;
  }

  const colsFutsal = `<th class="table-center">J</th><th class="table-center">V</th><th class="table-center">E</th><th class="table-center">D</th><th class="table-center">GP</th><th class="table-center">GC</th><th class="table-center">SG</th><th class="table-center">Pts</th><th>Forma</th>`;
  const colsVolei  = `<th class="table-center">J</th><th class="table-center">V</th><th class="table-center">D</th><th class="table-center">SP</th><th class="table-center">SC</th><th class="table-center">SS</th><th class="table-center">Pts</th><th>Forma</th>`;

  const linhas = dados.map((t, i) => {
    const pos = i + 1;
    let posCell;
    if (pos === 1) posCell = `<span class="pos-medal gold">1</span>`;
    else if (pos === 2) posCell = `<span class="pos-medal silver">2</span>`;
    else if (pos === 3) posCell = `<span class="pos-medal bronze">3</span>`;
    else posCell = `<span style="font-family:var(--font-display);font-size:.9rem">${pos}</span>`;

    // Últimos 2 classificados = rebaixamento visual
    const isRelegation = i >= dados.length - 2 && dados.length > 3;
    const rowClass = i === 0 || i === 1 ? 'row-promo' : isRelegation ? 'row-relegation' : '';

    const streakHtml = (t.historico || []).map(r => {
      const label = { win: 'V', draw: 'E', loss: 'D' }[r] || r;
      return `<span class="form-dot ${r}">${label}</span>`;
    }).join('');

    const badgeEquipe = t.equipe?.logo
      ? `<img src="${t.equipe.logo}" class="table-badge-img">`
      : `<div style="width:28px;height:28px;border-radius:4px;background:${t.equipe?.corPrincipal || 'var(--color-gray-700)'}22;border:1px solid var(--color-gray-700);display:inline-flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:700">${iniciais(t.equipe?.nome || '?')}</div>`;

    if (modalidade === 'Futsal') {
      return `<tr class="${rowClass}">
        <td class="table-pos">${posCell}</td>
        <td><div class="table-team-cell">${badgeEquipe}<a href="equipe-detalhe.html?id=${t.equipeId}" style="font-weight:600">${escapeHtml(t.equipe?.nome || '—')}</a></div></td>
        <td class="table-center">${t.jogos}</td>
        <td class="table-center text-win">${t.vitorias}</td>
        <td class="table-center">${t.empates}</td>
        <td class="table-center text-loss">${t.derrotas}</td>
        <td class="table-center">${t.golsPro}</td>
        <td class="table-center">${t.golsContra}</td>
        <td class="table-center" style="color:${t.saldo >= 0 ? 'var(--color-win)' : 'var(--color-loss)'}">${t.saldo > 0 ? '+' : ''}${t.saldo}</td>
        <td class="table-center"><strong style="font-family:var(--font-display);font-size:1.05rem;color:var(--color-yellow)">${t.pontos}</strong></td>
        <td><div class="form-streak">${streakHtml}</div></td>
      </tr>`;
    }

    // Vôlei
    return `<tr class="${rowClass}">
      <td class="table-pos">${posCell}</td>
      <td><div class="table-team-cell">${badgeEquipe}<a href="equipe-detalhe.html?id=${t.equipeId}" style="font-weight:600">${escapeHtml(t.equipe?.nome || '—')}</a></div></td>
      <td class="table-center">${t.jogos}</td>
      <td class="table-center text-win">${t.vitorias}</td>
      <td class="table-center text-loss">${t.derrotas}</td>
      <td class="table-center">${t.setsPro}</td>
      <td class="table-center">${t.setsContra}</td>
      <td class="table-center" style="color:${t.saldoSets >= 0 ? 'var(--color-win)' : 'var(--color-loss)'}">${t.saldoSets > 0 ? '+' : ''}${t.saldoSets}</td>
      <td class="table-center"><strong style="font-family:var(--font-display);font-size:1.05rem;color:var(--color-yellow)">${t.pontos}</strong></td>
      <td><div class="form-streak">${streakHtml}</div></td>
    </tr>`;
  }).join('');

  const legendaHtml = `
    <div class="flex gap-4" style="font-size:.72rem;color:var(--color-gray-400);padding:10px 0 0">
      <span><span style="display:inline-block;width:10px;height:10px;background:var(--color-win);border-radius:2px"></span> Classificados</span>
      <span><span style="display:inline-block;width:10px;height:10px;background:var(--color-loss);border-radius:2px"></span> Eliminados</span>
      ${modalidade === 'Futsal' ? '<span>J=Jogos V=Vitórias E=Empates D=Derrotas GP=Gols Pró GC=Gols Contra SG=Saldo Pts=Pontos</span>' : '<span>J=Jogos V=Vitórias D=Derrotas SP=Sets Pró SC=Sets Contra SS=Saldo</span>'}
    </div>
  `;

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th style="width:40px">Pos</th>
          <th>Equipe</th>
          ${modalidade === 'Futsal' ? colsFutsal : colsVolei}
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    ${legendaHtml}
  `;
}

/* ==========================================================================
   PÁGINA DE RANKINGS (rankings.html)
   ========================================================================== */

function renderPaginaRankings() {
  const root = document.getElementById('pageContentRoot');
  const campeonatos = DB.get(DB_KEYS.CAMPEONATOS);

  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="eyebrow">Estatísticas</div>
        <h1>Rankings</h1>
        <p>Artilheiros, líderes de assistências, cartões e MVPs.</p>
      </div>
    </div>
    <div class="filter-bar">
      <select id="filtroRankCamp" class="form-control">
        <option value="">🌍 Geral (todos os campeonatos)</option>
        ${campeonatos.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('')}
      </select>
    </div>
    <div class="tabs" id="rankTabs">
      <button class="tab-item active" data-tab="artilharia">⚽ Artilharia</button>
      <button class="tab-item" data-tab="assistencias">🎯 Assistências</button>
      <button class="tab-item" data-tab="cartoes">🟨 Cartões</button>
      <button class="tab-item" data-tab="mvp">🏆 MVP Vôlei</button>
    </div>
    <div id="rankTabContent"></div>
  `;

  const tabs = root.querySelectorAll('.tab-item');
  const selectCamp = root.querySelector('#filtroRankCamp');

  function renderTab(tab) {
    const campId = selectCamp.value || null;
    const content = document.getElementById('rankTabContent');
    if (tab === 'artilharia') content.innerHTML = renderTabelaRankingArtilharia(calcularArtilharia(campId));
    else if (tab === 'assistencias') content.innerHTML = renderTabelaRankingAssistencias(calcularAssistencias(campId));
    else if (tab === 'cartoes') content.innerHTML = renderTabelaRankingCartoes(calcularRankingCartoes(campId));
    else if (tab === 'mvp') content.innerHTML = renderTabelaRankingMVP(calcularRankingMVP(campId));
  }

  let tabAtual = 'artilharia';
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      tabAtual = tab.dataset.tab;
      renderTab(tabAtual);
    });
  });

  selectCamp.addEventListener('change', () => renderTab(tabAtual));
  renderTab('artilharia');
}

/* ==========================================================================
   RENDERIZAÇÃO DAS TABELAS DE RANKING
   ========================================================================== */

function renderTabelaRankingArtilharia(dados) {
  if (!dados.length) return `<div class="card card-pad text-muted">Nenhum gol registrado ainda.</div>`;
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Pos</th><th>Foto</th><th>Jogador</th><th>Equipe</th><th class="table-center">Jogos</th><th class="table-center">⚽ Gols</th><th class="table-center">Média</th></tr></thead>
    <tbody>
      ${dados.map((r, i) => `<tr class="clickable" onclick="window.location.href='jogador-detalhe.html?id=${r.jogador?.id}'">
        <td class="table-pos">${renderPosMedal(i + 1)}</td>
        <td>${r.jogador?.foto ? `<img src="${r.jogador.foto}" style="width:34px;height:34px;border-radius:50%;object-fit:cover">` : `<div style="width:34px;height:34px;border-radius:50%;background:var(--color-gray-700);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700">${iniciais(r.jogador?.nome)}</div>`}</td>
        <td><strong>${escapeHtml(r.jogador?.nome || '—')}</strong></td>
        <td>${escapeHtml(r.equipe?.nome || '—')}</td>
        <td class="table-center">${r.jogos}</td>
        <td class="table-center"><strong style="font-family:var(--font-display);font-size:1.1rem;color:var(--color-yellow)">${r.gols}</strong></td>
        <td class="table-center">${r.media}</td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function renderTabelaRankingAssistencias(dados) {
  if (!dados.length) return `<div class="card card-pad text-muted">Nenhuma assistência registrada ainda.</div>`;
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Pos</th><th>Foto</th><th>Jogador</th><th>Equipe</th><th class="table-center">Jogos</th><th class="table-center">🎯 Assist.</th><th class="table-center">Média</th></tr></thead>
    <tbody>
      ${dados.map((r, i) => `<tr class="clickable" onclick="window.location.href='jogador-detalhe.html?id=${r.jogador?.id}'">
        <td class="table-pos">${renderPosMedal(i + 1)}</td>
        <td>${r.jogador?.foto ? `<img src="${r.jogador.foto}" style="width:34px;height:34px;border-radius:50%;object-fit:cover">` : `<div style="width:34px;height:34px;border-radius:50%;background:var(--color-gray-700);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700">${iniciais(r.jogador?.nome)}</div>`}</td>
        <td><strong>${escapeHtml(r.jogador?.nome || '—')}</strong></td>
        <td>${escapeHtml(r.equipe?.nome || '—')}</td>
        <td class="table-center">${r.jogos}</td>
        <td class="table-center"><strong style="font-family:var(--font-display);font-size:1.1rem;color:var(--color-yellow)">${r.assistencias}</strong></td>
        <td class="table-center">${r.media}</td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function renderTabelaRankingCartoes(dados) {
  if (!dados.length) return `<div class="card card-pad text-muted">Nenhum cartão registrado ainda.</div>`;
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Pos</th><th>Jogador</th><th>Equipe</th><th class="table-center">🟨 Amarelos</th><th class="table-center">🟥 Vermelhos</th></tr></thead>
    <tbody>
      ${dados.map((r, i) => `<tr>
        <td class="table-pos">${i + 1}</td>
        <td><strong>${escapeHtml(r.jogador?.nome || '—')}</strong></td>
        <td>${escapeHtml(r.equipe?.nome || '—')}</td>
        <td class="table-center"><span style="color:var(--color-card-yellow);font-weight:700">${r.amarelos}</span></td>
        <td class="table-center"><span style="color:var(--color-loss);font-weight:700">${r.vermelhos}</span></td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function renderTabelaRankingMVP(dados) {
  if (!dados.length) return `<div class="card card-pad text-muted">Nenhum MVP registrado ainda.</div>`;
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Pos</th><th>Foto</th><th>Jogador</th><th>Equipe</th><th class="table-center">Jogos</th><th class="table-center">🏆 MVPs</th></tr></thead>
    <tbody>
      ${dados.map((r, i) => `<tr class="clickable" onclick="window.location.href='jogador-detalhe.html?id=${r.jogador?.id}'">
        <td class="table-pos">${renderPosMedal(i + 1)}</td>
        <td>${r.jogador?.foto ? `<img src="${r.jogador.foto}" style="width:34px;height:34px;border-radius:50%;object-fit:cover">` : `<div style="width:34px;height:34px;border-radius:50%;background:var(--color-gray-700);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700">${iniciais(r.jogador?.nome)}</div>`}</td>
        <td><strong>${escapeHtml(r.jogador?.nome || '—')}</strong></td>
        <td>${escapeHtml(r.equipe?.nome || '—')}</td>
        <td class="table-center">${r.jogos}</td>
        <td class="table-center"><strong style="font-family:var(--font-display);font-size:1.1rem;color:var(--color-yellow)">${r.mvps}</strong></td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function renderPosMedal(pos) {
  if (pos === 1) return `<span class="pos-medal gold">1</span>`;
  if (pos === 2) return `<span class="pos-medal silver">2</span>`;
  if (pos === 3) return `<span class="pos-medal bronze">3</span>`;
  return `<span style="font-family:var(--font-display);font-size:.9rem">${pos}</span>`;
}
