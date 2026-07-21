/* ==========================================================================
   INTERJORNADAS CASCAVEL — jogadores.js
   CRUD de jogadores, ficha individual, gestão de fotos.
   Depende de: app.js, ranking.js
   ========================================================================== */

'use strict';

/* ==========================================================================
   JOGADORES — LISTAGEM
   ========================================================================== */

function renderPaginaJogadores() {
  const root = document.getElementById('pageContentRoot');
  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="eyebrow">Gerenciamento</div>
        <h1>Jogadores</h1>
        <p>Cadastre e gerencie todos os atletas do sistema.</p>
      </div>
      <button type="button" class="btn btn-primary" onclick="abrirModalJogador()">➕ Novo Jogador</button>
    </div>
    <div class="filter-bar">
      <select id="filtroEquipeJog" class="form-control">
        <option value="">Todas as equipes</option>
        ${DB.get(DB_KEYS.EQUIPES).map(e => `<option value="${e.id}">${escapeHtml(e.nome)}</option>`).join('')}
      </select>
      <select id="filtroPosicaoJog" class="form-control">
        <option value="">Todas as posições</option>
        ${['Goleiro','Fixo','Ala','Pivô','Levantador','Ponteiro','Central','Oposto','Líbero']
          .map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
    </div>
    <div class="table-wrap"><table class="data-table" id="tabelaJogadores">
      <thead><tr>
        <th>#</th><th>Foto</th><th>Nome</th><th>Apelido</th><th>Equipe</th><th>Posição</th><th>Idade</th><th>Gols</th><th>Assist.</th><th>Ações</th>
      </tr></thead>
      <tbody id="jogadoresBody"></tbody>
    </table></div>
    <div id="jogadoresEmpty" class="hidden">
      <div class="empty-state">
        <div class="empty-icon">👤</div>
        <h3>Nenhum jogador cadastrado</h3>
        <p>Crie o primeiro jogador clicando no botão acima.</p>
        <button class="btn btn-primary" onclick="abrirModalJogador()">➕ Novo Jogador</button>
      </div>
    </div>
  `;

  document.getElementById('filtroEquipeJog').addEventListener('change', renderTabelaJogadores);
  document.getElementById('filtroPosicaoJog').addEventListener('change', renderTabelaJogadores);
  renderTabelaJogadores();
}

function renderTabelaJogadores() {
  const equipeFilter = document.getElementById('filtroEquipeJog')?.value || '';
  const posicaoFilter = document.getElementById('filtroPosicaoJog')?.value || '';
  const equipes = DB.get(DB_KEYS.EQUIPES);

  let jogadores = DB.get(DB_KEYS.JOGADORES);
  if (equipeFilter) jogadores = jogadores.filter(j => j.equipeId === equipeFilter);
  if (posicaoFilter) jogadores = jogadores.filter(j => j.posicao === posicaoFilter);

  const tbody = document.getElementById('jogadoresBody');
  const empty = document.getElementById('jogadoresEmpty');

  if (!jogadores.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = jogadores.map(j => {
    const equipe = equipes.find(e => e.id === j.equipeId);
    const est = calcularEstatisticasJogador(j.id);
    return `
      <tr class="clickable" onclick="window.location.href='jogador-detalhe.html?id=${j.id}'">
        <td class="table-center"><strong>${j.numero || '—'}</strong></td>
        <td>
          ${j.foto
            ? `<img src="${j.foto}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;">`
            : `<div style="width:34px;height:34px;border-radius:50%;background:var(--color-gray-700);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;">${iniciais(j.nome)}</div>`}
        </td>
        <td><strong>${escapeHtml(j.nome)}</strong></td>
        <td>${escapeHtml(j.apelido || '—')}</td>
        <td>
          <div class="table-team-cell">
            ${equipe?.logo ? `<img src="${equipe.logo}" class="table-badge-img">` : `<div style="width:24px;height:24px;border-radius:4px;background:${equipe?.corPrincipal || 'var(--color-gray-700)'}22;border:1px solid var(--color-gray-700);display:inline-flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:700">${iniciais(equipe?.nome || '?')}</div>`}
            ${escapeHtml(equipe?.nome || '—')}
          </div>
        </td>
        <td>${escapeHtml(j.posicao || '—')}</td>
        <td>${calcularIdade(j.dataNascimento)}</td>
        <td class="table-center">${est.gols}</td>
        <td class="table-center">${est.assistencias}</td>
        <td onclick="event.stopPropagation()">
          <div class="flex gap-2">
            <button class="btn-icon btn-icon-sm" onclick="abrirModalJogador('${j.id}')" title="Editar">✏️</button>
            <button class="btn-icon btn-icon-sm" onclick="confirmarExcluirJogador('${j.id}')" title="Excluir" style="background:rgba(231,76,60,.15);color:var(--color-loss)">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function abrirModalJogador(id = null) {
  const jog = id ? DB.findById(DB_KEYS.JOGADORES, id) : null;
  const equipes = DB.get(DB_KEYS.EQUIPES);

  const bodyHtml = `
    <div class="form-group" style="text-align:center">
      <div class="upload-zone" style="max-width:200px;margin:0 auto">
        <input type="file" id="fotoJogInput" accept="image/*">
        ${jog?.foto
          ? `<img src="${jog.foto}" class="upload-zone-preview" id="fotoJogPreview">`
          : `<div class="upload-icon">👤</div>`}
        <div style="font-size:.8rem;color:var(--color-gray-400)">${jog?.foto ? 'Trocar foto' : 'Adicionar foto'}</div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Nome Completo <span class="required">*</span></label>
        <input type="text" id="jog_nome" class="form-control" value="${escapeHtml(jog?.nome || '')}" required maxlength="80">
        <span class="form-error">Campo obrigatório</span>
      </div>
      <div class="form-group">
        <label class="form-label">Apelido</label>
        <input type="text" id="jog_apelido" class="form-control" value="${escapeHtml(jog?.apelido || '')}" maxlength="40">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Equipe <span class="required">*</span></label>
        <select id="jog_equipe" class="form-control" required>
          <option value="" disabled ${!jog ? 'selected' : ''}>Selecione</option>
          ${equipes.map(e => `<option value="${e.id}" ${jog?.equipeId === e.id ? 'selected' : ''}>${escapeHtml(e.nome)}</option>`).join('')}
        </select>
        <span class="form-error">Campo obrigatório</span>
      </div>
      <div class="form-group">
        <label class="form-label">Posição</label>
        <select id="jog_posicao" class="form-control">
          <option value="">Selecione</option>
          ${['Goleiro','Fixo','Ala','Pivô','Levantador','Ponteiro','Central','Oposto','Líbero']
            .map(p => `<option value="${p}" ${jog?.posicao === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row-3">
      <div class="form-group">
        <label class="form-label">Nº Camisa</label>
        <input type="number" id="jog_numero" class="form-control" value="${jog?.numero || ''}" min="1" max="99">
      </div>
      <div class="form-group">
        <label class="form-label">Dt. Nascimento</label>
        <input type="date" id="jog_nascimento" class="form-control" value="${jog?.dataNascimento || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select id="jog_status" class="form-control">
          <option value="Ativo" ${jog?.status !== 'Inativo' ? 'selected' : ''}>Ativo</option>
          <option value="Inativo" ${jog?.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
        </select>
      </div>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-secondary" data-action="cancel">Cancelar</button>
    <button type="button" class="btn btn-primary" id="btnSalvarJog">💾 ${jog ? 'Salvar' : 'Criar Jogador'}</button>
  `;

  const { overlay, close } = openModal({ title: jog ? 'Editar Jogador' : 'Novo Jogador', bodyHtml, footerHtml, size: 'lg' });

  let fotoBase64 = jog?.foto || '';
  overlay.querySelector('#fotoJogInput').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 400 * 1024) { showToast('Foto muito grande. Use menos de 400 KB.', 'error'); return; }
    fotoBase64 = await fileParaBase64(file);
    const wrap = overlay.querySelector('.upload-zone'); wrap.innerHTML = `<input type="file" id="fotoJogInput" accept="image/*"><img src="${fotoBase64}" class="upload-zone-preview"><div style="font-size:.8rem;color:var(--color-gray-400)">Trocar foto</div>`;
  });

  overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
  overlay.querySelector('#btnSalvarJog').addEventListener('click', () => {
    const nome = overlay.querySelector('#jog_nome').value.trim();
    const equipeId = overlay.querySelector('#jog_equipe').value;
    if (!nome) { overlay.querySelector('#jog_nome').classList.add('invalid'); return; }
    if (!equipeId) { overlay.querySelector('#jog_equipe').classList.add('invalid'); return; }

    const dados = {
      nome, equipeId,
      apelido: overlay.querySelector('#jog_apelido').value.trim(),
      posicao: overlay.querySelector('#jog_posicao').value,
      numero: Number(overlay.querySelector('#jog_numero').value) || null,
      dataNascimento: overlay.querySelector('#jog_nascimento').value,
      status: overlay.querySelector('#jog_status').value,
      foto: fotoBase64
    };

    if (jog) { DB.update(DB_KEYS.JOGADORES, id, dados); showToast('Jogador atualizado!', 'success'); }
    else { DB.insert(DB_KEYS.JOGADORES, dados); showToast('Jogador criado!', 'success'); }
    close();
    renderTabelaJogadores();
  });
}

function confirmarExcluirJogador(id) {
  const j = DB.findById(DB_KEYS.JOGADORES, id); if (!j) return;
  confirmAction({ title: 'Excluir Jogador', message: `Excluir "${j.nome}"? Esta ação não pode ser desfeita.`, confirmLabel: 'Sim, excluir',
    onConfirm: () => { DB.remove(DB_KEYS.JOGADORES, id); showToast('Jogador excluído.', 'info'); renderTabelaJogadores(); }
  });
}

/* ==========================================================================
   DETALHE DO JOGADOR
   ========================================================================== */

function renderPaginaDetalheJogador() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const jog = DB.findById(DB_KEYS.JOGADORES, id);
  const root = document.getElementById('pageContentRoot');
  if (!jog) { root.innerHTML = `<div class="empty-state"><div class="empty-icon">👤</div><h3>Jogador não encontrado</h3><a href="jogadores.html" class="btn btn-primary mt-5">← Voltar</a></div>`; return; }

  const equipe = DB.findById(DB_KEYS.EQUIPES, jog.equipeId);
  const est = calcularEstatisticasJogador(id);

  root.innerHTML = `
    <div class="card card-pad section-block" style="display:flex;align-items:center;gap:var(--space-6);flex-wrap:wrap">
      ${jog.foto
        ? `<img src="${jog.foto}" style="width:110px;height:110px;border-radius:50%;object-fit:cover;border:3px solid var(--color-yellow)">`
        : `<div style="width:110px;height:110px;border-radius:50%;background:var(--color-gray-700);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:2.2rem;color:var(--color-yellow)">${iniciais(jog.nome)}</div>`}
      <div style="flex:1;min-width:200px">
        ${jog.numero ? `<div style="font-family:var(--font-display);font-size:3rem;color:var(--color-yellow);line-height:1">#${jog.numero}</div>` : ''}
        <h1 style="text-transform:none;font-size:1.8rem">${escapeHtml(jog.nome)}</h1>
        ${jog.apelido ? `<p class="text-muted">"${escapeHtml(jog.apelido)}"</p>` : ''}
        <div class="flex gap-3 mt-3">
          ${equipe ? `<a href="equipe-detalhe.html?id=${equipe.id}" class="badge" style="background:${equipe.corPrincipal}22;color:${equipe.corPrincipal}">${escapeHtml(equipe.nome)}</a>` : ''}
          ${jog.posicao ? `<span class="badge badge-futsal">${escapeHtml(jog.posicao)}</span>` : ''}
          ${jog.status === 'Inativo' ? `<span class="badge" style="background:var(--color-loss-bg);color:var(--color-loss)">Inativo</span>` : ''}
        </div>
      </div>
      <div class="flex gap-3">
        <button class="btn btn-secondary" onclick="abrirModalJogador('${id}')">✏️ Editar</button>
        <a href="jogadores.html" class="btn btn-ghost">← Voltar</a>
      </div>
    </div>

    <div class="stat-grid section-block">
      <div class="card stat-card"><div class="stat-icon">🎮</div><div><div class="stat-value stat-number">${est.jogos}</div><div class="stat-label">Jogos</div></div></div>
      <div class="card stat-card"><div class="stat-icon">⚽</div><div><div class="stat-value stat-number">${est.gols}</div><div class="stat-label">Gols</div></div></div>
      <div class="card stat-card"><div class="stat-icon">🎯</div><div><div class="stat-value stat-number">${est.assistencias}</div><div class="stat-label">Assistências</div></div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:rgba(242,183,5,.12);color:var(--color-card-yellow)">🟨</div><div><div class="stat-value stat-number">${est.amarelos}</div><div class="stat-label">Amarelos</div></div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:var(--color-loss-bg);color:var(--color-loss)">🟥</div><div><div class="stat-value stat-number">${est.vermelhos}</div><div class="stat-label">Vermelhos</div></div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:rgba(255,212,0,.12);color:var(--color-yellow)">🏆</div><div><div class="stat-value stat-number">${est.mvps}</div><div class="stat-label">MVPs</div></div></div>
    </div>

    <div class="card card-pad section-block">
      <h3 class="section-title">Médias</h3>
      <div class="flex gap-5">
        <div><div class="stat-number" style="font-size:1.4rem">${est.mediaGols}</div><div class="text-muted" style="font-size:.75rem">Gols/jogo</div></div>
        <div><div class="stat-number" style="font-size:1.4rem">${est.mediaAssistencias}</div><div class="text-muted" style="font-size:.75rem">Assist./jogo</div></div>
        ${jog.dataNascimento ? `<div><div class="stat-number" style="font-size:1.4rem">${calcularIdade(jog.dataNascimento)}</div><div class="text-muted" style="font-size:.75rem">Anos (${formatarData(jog.dataNascimento)})</div></div>` : ''}
      </div>
    </div>
  `;
}
