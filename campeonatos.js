/* ==========================================================================
   INTERJORNADAS CASCAVEL — campeonatos.js
   CRUD de campeonatos, seleção de equipes, geração de rodadas e página de detalhe.
   Depende de: app.js, ranking.js
   ========================================================================== */

'use strict';

/* ==========================================================================
   CAMPEONATOS — LISTAGEM
   ========================================================================== */

function renderPaginaCampeonatos() {
  const root = document.getElementById('pageContentRoot');
  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="eyebrow">Gerenciamento</div>
        <h1>Campeonatos</h1>
        <p>Crie e gerencie os campeonatos de futsal e vôlei.</p>
      </div>
      <button class="btn btn-primary" onclick="abrirModalCampeonato()">🏆 Novo Campeonato</button>
    </div>
    <div id="campeonatosList" class="card-grid"></div>
    <div id="campeonatosEmpty" class="hidden">
      <div class="empty-state">
        <div class="empty-icon">🏆</div>
        <h3>Nenhum campeonato criado</h3>
        <p>Crie o primeiro campeonato clicando no botão acima.</p>
        <button class="btn btn-primary" onclick="abrirModalCampeonato()">🏆 Novo Campeonato</button>
      </div>
    </div>
  `;
  renderListaCampeonatos();
}

function renderListaCampeonatos() {
  const campeonatos = DB.get(DB_KEYS.CAMPEONATOS);
  const list = document.getElementById('campeonatosList');
  const empty = document.getElementById('campeonatosEmpty');

  if (!campeonatos.length) { list.classList.add('hidden'); empty.classList.remove('hidden'); return; }
  list.classList.remove('hidden'); empty.classList.add('hidden');

  const partidas = DB.get(DB_KEYS.PARTIDAS);
  const equipes = DB.get(DB_KEYS.EQUIPES);

  list.innerHTML = campeonatos.map(c => {
    const partsTotal = partidas.filter(p => p.campeonatoId === c.id).length;
    const partsFin = partidas.filter(p => p.campeonatoId === c.id && p.status === 'Finalizada').length;
    const progress = partsTotal > 0 ? Math.round((partsFin / partsTotal) * 100) : 0;
    const timesNomes = (c.equipesIds || []).slice(0, 3).map(id => equipes.find(e => e.id === id)?.nome || '').filter(Boolean);

    return `
      <div class="card card-hoverable entity-card" data-camp-id="${c.id}">
        <div class="entity-card-actions">
          <button class="btn-icon btn-icon-sm" onclick="event.stopPropagation();abrirModalCampeonato('${c.id}')" title="Editar">✏️</button>
          <button class="btn-icon btn-icon-sm" onclick="event.stopPropagation();confirmarExcluirCampeonato('${c.id}')" title="Excluir" style="background:rgba(231,76,60,.15);color:var(--color-loss)">🗑️</button>
        </div>
        <div class="entity-card-top">
          <div class="entity-badge-fallback" style="font-size:1.6rem">🏆</div>
          <div>
            <div class="entity-name">${escapeHtml(c.nome)}</div>
            <div class="entity-meta">${escapeHtml(c.temporada || '')} · ${escapeHtml(c.modalidade || '')}</div>
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
              <span class="badge badge-${c.modalidade === 'Futsal' ? 'futsal' : 'volei'}">${c.modalidade}</span>
              <span class="badge badge-${c.status === 'Em andamento' ? 'andamento' : c.status === 'Agendada' ? 'agendada' : 'finalizada'}">${c.status || 'Agendado'}</span>
            </div>
          </div>
        </div>
        <div style="padding:0 var(--space-5)">
          ${timesNomes.length ? `<p style="font-size:.78rem;color:var(--color-gray-400)">${escapeHtml(timesNomes.join(', '))}${(c.equipesIds||[]).length > 3 ? ` +${c.equipesIds.length - 3}` : ''}</p>` : ''}
          <div style="margin-top:12px">
            <div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--color-gray-400);margin-bottom:4px">
              <span>Progresso</span><span>${partsFin}/${partsTotal} partidas</span>
            </div>
            <div style="height:4px;background:var(--color-gray-700);border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${progress}%;background:var(--color-yellow);border-radius:99px;transition:width .5s"></div>
            </div>
          </div>
        </div>
        <div class="entity-stats-row">
          <div class="mini-stat"><strong>${(c.equipesIds||[]).length}</strong><span>Times</span></div>
          <div class="mini-stat"><strong>${partsTotal}</strong><span>Partidas</span></div>
          <div class="mini-stat"><strong>${partsFin}</strong><span>Finalizadas</span></div>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.entity-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `campeonato-detalhe.html?id=${card.dataset.campId}`;
    });
  });
}

/* ==========================================================================
   MODAL DE CRIAÇÃO / EDIÇÃO DE CAMPEONATO
   ========================================================================== */

function abrirModalCampeonato(id = null) {
  const camp = id ? DB.findById(DB_KEYS.CAMPEONATOS, id) : null;
  const equipes = DB.get(DB_KEYS.EQUIPES);

  const bodyHtml = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Nome do Campeonato <span class="required">*</span></label>
        <input type="text" id="camp_nome" class="form-control" value="${escapeHtml(camp?.nome || '')}" maxlength="80" required>
        <span class="form-error">Campo obrigatório</span>
      </div>
      <div class="form-group">
        <label class="form-label">Modalidade <span class="required">*</span></label>
        <select id="camp_modalidade" class="form-control" required>
          <option value="" disabled ${!camp ? 'selected' : ''}>Selecione</option>
          <option value="Futsal" ${camp?.modalidade === 'Futsal' ? 'selected' : ''}>⚽ Futsal</option>
          <option value="Vôlei" ${camp?.modalidade === 'Vôlei' ? 'selected' : ''}>🏐 Vôlei</option>
        </select>
        <span class="form-error">Campo obrigatório</span>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Temporada</label>
        <input type="text" id="camp_temporada" class="form-control" value="${escapeHtml(camp?.temporada || new Date().getFullYear())}" maxlength="20">
      </div>
      <div class="form-group">
        <label class="form-label">Formato</label>
        <select id="camp_formato" class="form-control">
          ${['Pontos corridos', 'Grupos', 'Mata-mata', 'Grupos + Mata-mata']
            .map(f => `<option value="${f}" ${camp?.formato === f ? 'selected' : ''}>${f}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Data Início</label>
        <input type="date" id="camp_dataInicio" class="form-control" value="${camp?.dataInicio || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Data Fim</label>
        <input type="date" id="camp_dataFim" class="form-control" value="${camp?.dataFim || ''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Descrição</label>
      <textarea id="camp_descricao" class="form-control">${escapeHtml(camp?.descricao || '')}</textarea>
    </div>

    <div class="form-group">
      <label class="form-label">Equipes Participantes</label>
      <div class="select-grid" id="equipesSelector">
        ${equipes.length
          ? equipes.map(e => `
            <label class="select-team-item ${(camp?.equipesIds || []).includes(e.id) ? 'checked' : ''}">
              <input type="checkbox" name="camp_equipes" value="${e.id}" ${(camp?.equipesIds || []).includes(e.id) ? 'checked' : ''}>
              ${e.logo ? `<img src="${e.logo}" alt="">` : `<div style="width:28px;height:28px;border-radius:4px;background:${e.corPrincipal}22;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:700">${iniciais(e.nome)}</div>`}
              <span>${escapeHtml(e.nome)}</span>
            </label>
          `).join('')
          : `<p class="text-muted" style="font-size:.85rem">Nenhuma equipe cadastrada ainda.</p>`}
      </div>
    </div>
    ${!camp ? `
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:.85rem">
          <input type="checkbox" id="gerarPartidas" checked style="accent-color:var(--color-yellow);width:16px;height:16px">
          Gerar confrontos (todos contra todos) automaticamente ao criar
        </label>
      </div>
    ` : ''}
  `;

  const footerHtml = `
    <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
    <button class="btn btn-primary" id="btnSalvarCamp">💾 ${camp ? 'Salvar Alterações' : 'Criar Campeonato'}</button>
  `;

  const { overlay, close } = openModal({ title: camp ? 'Editar Campeonato' : 'Novo Campeonato', bodyHtml, footerHtml, size: 'lg' });

  // Atualiza visual dos checkboxes de times
  overlay.querySelectorAll('.select-team-item input').forEach(chk => {
    chk.addEventListener('change', () => chk.closest('.select-team-item').classList.toggle('checked', chk.checked));
  });

  overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
  overlay.querySelector('#btnSalvarCamp').addEventListener('click', () => {
    const nome = overlay.querySelector('#camp_nome').value.trim();
    const modalidade = overlay.querySelector('#camp_modalidade').value;
    if (!nome) { overlay.querySelector('#camp_nome').classList.add('invalid'); return; }
    if (!modalidade) { overlay.querySelector('#camp_modalidade').classList.add('invalid'); return; }

    const equipesIds = [...overlay.querySelectorAll('input[name="camp_equipes"]:checked')].map(c => c.value);

    const dados = {
      nome, modalidade,
      temporada: overlay.querySelector('#camp_temporada').value.trim(),
      formato: overlay.querySelector('#camp_formato').value,
      dataInicio: overlay.querySelector('#camp_dataInicio').value,
      dataFim: overlay.querySelector('#camp_dataFim').value,
      descricao: overlay.querySelector('#camp_descricao').value.trim(),
      equipesIds,
      status: 'Em andamento'
    };

    if (camp) {
      DB.update(DB_KEYS.CAMPEONATOS, id, dados);
      showToast('Campeonato atualizado!', 'success');
    } else {
      const novoCamp = DB.insert(DB_KEYS.CAMPEONATOS, dados);
      const gerarChk = overlay.querySelector('#gerarPartidas');
      if (gerarChk?.checked && equipesIds.length >= 2) {
        gerarConfrontosAutomaticos(novoCamp.id, equipesIds, modalidade);
      }
      showToast('Campeonato criado!', 'success');
    }
    close();
    renderListaCampeonatos();
  });
}

/**
 * Gera confrontos todos-contra-todos (ida simples) para o campeonato recém-criado.
 */
function gerarConfrontosAutomaticos(campeonatoId, equipesIds, modalidade) {
  const hoje = new Date();
  let rodada = 1;
  const partidas = [];

  for (let i = 0; i < equipesIds.length; i++) {
    for (let j = i + 1; j < equipesIds.length; j++) {
      const dataP = new Date(hoje);
      dataP.setDate(hoje.getDate() + rodada * 7);

      const partida = {
        campeonatoId, modalidade,
        rodada,
        mandanteId: equipesIds[i],
        visitanteId: equipesIds[j],
        data: dataP.toISOString().slice(0, 10),
        hora: '19:30',
        local: 'Ginásio Municipal de Cascavel',
        status: 'Agendada',
        placarMandante: 0,
        placarVisitante: 0,
        eventos: [],
        cronometroSegundos: 0
      };

      if (modalidade === 'Vôlei') {
        partida.sets = [];
        partida.setsMandante = 0;
        partida.setsVisitante = 0;
      }

      partidas.push(partida);
      rodada++;
    }
  }

  const todas = DB.get(DB_KEYS.PARTIDAS);
  const inseridas = partidas.map(p => ({ ...p, id: generateId(), criadoEm: new Date().toISOString() }));
  DB.set(DB_KEYS.PARTIDAS, [...todas, ...inseridas]);
  showToast(`${inseridas.length} confrontos gerados automaticamente!`, 'success');
}

function confirmarExcluirCampeonato(id) {
  const c = DB.findById(DB_KEYS.CAMPEONATOS, id); if (!c) return;
  confirmAction({
    title: 'Excluir Campeonato',
    message: `Excluir "${c.nome}" e todas as suas partidas? Esta ação não pode ser desfeita.`,
    confirmLabel: 'Sim, excluir',
    onConfirm: () => {
      DB.remove(DB_KEYS.CAMPEONATOS, id);
      const partidas = DB.get(DB_KEYS.PARTIDAS).filter(p => p.campeonatoId !== id);
      DB.set(DB_KEYS.PARTIDAS, partidas);
      showToast('Campeonato excluído.', 'info');
      renderListaCampeonatos();
    }
  });
}

/* ==========================================================================
   DETALHE DO CAMPEONATO
   ========================================================================== */

function renderPaginaDetalheCampeonato() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const camp = DB.findById(DB_KEYS.CAMPEONATOS, id);
  const root = document.getElementById('pageContentRoot');
  if (!camp) {
    root.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><h3>Campeonato não encontrado</h3><a href="campeonatos.html" class="btn btn-primary mt-5">← Voltar</a></div>`;
    return;
  }

  root.innerHTML = `
    <div class="card card-pad section-block" style="display:flex;gap:var(--space-6);align-items:flex-start;flex-wrap:wrap">
      <div style="font-size:3.5rem">🏆</div>
      <div style="flex:1;min-width:200px">
        <div class="eyebrow">${escapeHtml(camp.modalidade)} · ${escapeHtml(camp.temporada || '')}</div>
        <h1 style="text-transform:none;font-size:1.8rem">${escapeHtml(camp.nome)}</h1>
        ${camp.descricao ? `<p style="color:var(--color-gray-400);margin-top:6px">${escapeHtml(camp.descricao)}</p>` : ''}
        <div class="flex gap-3 mt-3">
          <span class="badge badge-${camp.modalidade === 'Futsal' ? 'futsal' : 'volei'}">${camp.modalidade}</span>
          <span class="badge badge-andamento">${camp.status || 'Em andamento'}</span>
          ${camp.formato ? `<span class="badge badge-agendada">${camp.formato}</span>` : ''}
        </div>
      </div>
      <div class="flex gap-3">
        <button class="btn btn-secondary" onclick="abrirModalCampeonato('${id}')">✏️ Editar</button>
        <a href="campeonatos.html" class="btn btn-ghost">← Voltar</a>
      </div>
    </div>

    <!-- Abas -->
    <div class="tabs" id="campTabs">
      <button class="tab-item active" data-tab="tabela">📊 Classificação</button>
      <button class="tab-item" data-tab="partidas">📅 Partidas</button>
      <button class="tab-item" data-tab="artilharia">⚽ Artilharia</button>
      ${camp.modalidade === 'Futsal' ? `<button class="tab-item" data-tab="assistencias">🎯 Assistências</button>` : `<button class="tab-item" data-tab="mvp">🏆 MVP</button>`}
    </div>
    <div id="campTabContent"></div>
  `;

  // Controle de abas
  const tabs = root.querySelectorAll('.tab-item');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderCampTab(tab.dataset.tab, camp);
    });
  });

  renderCampTab('tabela', camp);
}

function renderCampTab(tab, camp) {
  const content = document.getElementById('campTabContent');

  if (tab === 'tabela') {
    if (camp.modalidade === 'Futsal') {
      const dados = calcularClassificacaoFutsal(camp.id);
      content.innerHTML = renderTabelaClassificacao(dados, 'Futsal');
    } else {
      const dados = calcularClassificacaoVolei(camp.id);
      content.innerHTML = renderTabelaClassificacao(dados, 'Vôlei');
    }
    // Botão de exportar
    content.insertAdjacentHTML('beforeend', `
      <div class="flex gap-3 mt-5">
        <button class="btn btn-secondary" onclick="exportarClassificacaoPrint('${camp.id}')">🖨️ Imprimir / PDF</button>
        <button class="btn btn-secondary" onclick="exportarJSON()">💾 Exportar dados</button>
      </div>
    `);
  } else if (tab === 'partidas') {
    const partidas = DB.get(DB_KEYS.PARTIDAS)
      .filter(p => p.campeonatoId === camp.id)
      .sort((a, b) => a.rodada - b.rodada);
    content.innerHTML = partidas.length
      ? renderTabelaPartidasCampeonato(partidas)
      : `<div class="card card-pad text-muted">Nenhuma partida cadastrada.</div>`;
  } else if (tab === 'artilharia') {
    const dados = calcularArtilharia(camp.id);
    content.innerHTML = renderTabelaRankingArtilharia(dados);
  } else if (tab === 'assistencias') {
    const dados = calcularAssistencias(camp.id);
    content.innerHTML = renderTabelaRankingAssistencias(dados);
  } else if (tab === 'mvp') {
    const dados = calcularRankingMVP(camp.id);
    content.innerHTML = renderTabelaRankingMVP(dados);
  }
}

function renderTabelaPartidasCampeonato(partidas) {
  const equipes = DB.get(DB_KEYS.EQUIPES);
  const grupos = {};
  partidas.forEach(p => {
    if (!grupos[p.rodada]) grupos[p.rodada] = [];
    grupos[p.rodada].push(p);
  });

  return Object.entries(grupos).map(([rodada, ps]) => `
    <div class="section-block">
      <h3 class="section-title" style="font-size:.85rem;color:var(--color-gray-400)">Rodada ${rodada}</h3>
      <div class="table-wrap">
        <table class="data-table"><thead><tr>
          <th>Data</th><th>Mandante</th><th>Placar</th><th>Visitante</th><th>Local</th><th>Status</th><th></th>
        </tr></thead><tbody>
          ${ps.map(p => {
            const em = equipes.find(e => e.id === p.mandanteId);
            const ev = equipes.find(e => e.id === p.visitanteId);
            const placar = p.status === 'Finalizada' || p.status === 'Em andamento'
              ? `<span style="font-family:var(--font-display)">${p.placarMandante} × ${p.placarVisitante}</span>`
              : '—';
            return `<tr>
              <td>${formatarData(p.data)} ${p.hora ? p.hora.slice(0,5) : ''}</td>
              <td><div class="table-team-cell">
                ${em?.logo ? `<img src="${em.logo}" class="table-badge-img">` : ''}
                ${escapeHtml(em?.nome || '—')}
              </div></td>
              <td class="table-center">${placar}</td>
              <td><div class="table-team-cell">
                ${ev?.logo ? `<img src="${ev.logo}" class="table-badge-img">` : ''}
                ${escapeHtml(ev?.nome || '—')}
              </div></td>
              <td style="font-size:.78rem;color:var(--color-gray-400)">${escapeHtml(p.local || '—')}</td>
              <td><span class="badge badge-${p.status === 'Finalizada' ? 'finalizada' : p.status === 'Em andamento' ? 'andamento' : 'agendada'}">${p.status}</span></td>
              <td><a href="partida-ao-vivo.html?id=${p.id}" class="btn btn-sm ${p.status === 'Em andamento' ? 'btn-primary' : 'btn-secondary'}">
                ${p.status === 'Finalizada' ? '👁 Ver' : p.status === 'Em andamento' ? '🔴 Ao Vivo' : '▶ Iniciar'}
              </a></td>
            </tr>`;
          }).join('')}
        </tbody></table>
      </div>
    </div>
  `).join('');
}
