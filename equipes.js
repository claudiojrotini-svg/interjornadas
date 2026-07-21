/* ==========================================================================
   INTERJORNADAS CASCAVEL — equipes.js
   CRUD de equipes: listagem em cards, modal de criação/edição, confirmação
   de exclusão e renderização de estatísticas por equipe.
   Depende de: app.js, ranking.js
   ========================================================================== */

'use strict';

/* ==========================================================================
   1. RENDERIZAÇÃO PRINCIPAL DA PÁGINA DE EQUIPES
   ========================================================================== */

function renderPaginaEquipes() {
  const root = document.getElementById('pageContentRoot');

  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="eyebrow">Gerenciamento</div>
        <h1>Equipes</h1>
        <p>Cadastre e gerencie as equipes participantes dos campeonatos.</p>
      </div>
      <div class="flex gap-3">
        <div class="filter-bar" style="margin:0">
          <select id="filtroModalidadeEquipes" class="form-control" style="width:140px">
            <option value="">Todas as modalidades</option>
            <option value="Futsal">Futsal</option>
            <option value="Vôlei">Vôlei</option>
          </select>
        </div>
        <button type="button" class="btn btn-primary" id="btnNovaEquipe">
          ➕ Nova Equipe
        </button>
      </div>
    </div>
    <div id="equipesList" class="card-grid"></div>
    <div id="equipesEmpty" class="hidden">
      <div class="empty-state">
        <div class="empty-icon">⚽</div>
        <h3>Nenhuma equipe cadastrada</h3>
        <p>Crie a primeira equipe clicando no botão acima.</p>
        <button class="btn btn-primary" onclick="abrirModalEquipe()">➕ Nova Equipe</button>
      </div>
    </div>
  `;

  document.getElementById('btnNovaEquipe').addEventListener('click', () => abrirModalEquipe());
  document.getElementById('filtroModalidadeEquipes').addEventListener('change', (e) => {
    renderListaEquipes(e.target.value);
  });

  renderListaEquipes();
}

function renderListaEquipes(filtroModalidade = '') {
  const equipes = DB.get(DB_KEYS.EQUIPES)
    .filter(e => !filtroModalidade || e.modalidade === filtroModalidade);

  const list = document.getElementById('equipesList');
  const empty = document.getElementById('equipesEmpty');

  if (!equipes.length) {
    list.innerHTML = '';
    list.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  list.classList.remove('hidden');
  empty.classList.add('hidden');

  list.innerHTML = equipes.map(equipe => {
    const stats = calcularEstatisticasEquipe(equipe.id);
    const jogadores = DB.get(DB_KEYS.JOGADORES).filter(j => j.equipeId === equipe.id);
    const streakHtml = stats.historico.map(r => {
      const labels = { win: 'V', draw: 'E', loss: 'D' };
      return `<span class="form-dot ${r}">${labels[r]}</span>`;
    }).join('');

    return `
      <div class="card card-hoverable entity-card" data-equipe-id="${equipe.id}">
        <div class="entity-card-actions">
          <button type="button" class="btn-icon btn-icon-sm" onclick="event.stopPropagation(); abrirModalEquipe('${equipe.id}')" title="Editar">✏️</button>
          <button type="button" class="btn-icon btn-icon-sm" onclick="event.stopPropagation(); confirmarExcluirEquipe('${equipe.id}')" title="Excluir" style="background:rgba(231,76,60,.15);color:var(--color-loss)">🗑️</button>
        </div>
        <div class="entity-card-top">
          ${renderBadgeEquipe(equipe, 64)}
          <div>
            <div class="entity-name">${escapeHtml(equipe.nome)}</div>
            <div class="entity-meta">${escapeHtml(equipe.modalidade || '')} · ${escapeHtml(equipe.responsavel || '')}</div>
            <div style="margin-top:6px">
              <span class="badge badge-${(equipe.modalidade || '').toLowerCase().replace('ô','o').replace('é','e')}">${escapeHtml(equipe.modalidade || '')}</span>
            </div>
          </div>
        </div>
        <div class="entity-stats-row">
          <div class="mini-stat"><strong>${stats.jogos}</strong><span>Jogos</span></div>
          <div class="mini-stat"><strong class="text-win">${stats.vitorias}</strong><span>Vitórias</span></div>
          <div class="mini-stat"><strong>${stats.pontos}</strong><span>Pontos</span></div>
          <div class="mini-stat"><strong>${jogadores.length}</strong><span>Atletas</span></div>
        </div>
        ${stats.historico.length ? `<div style="padding:0 var(--space-5) var(--space-4); display:flex; align-items:center; gap:8px"><span style="font-size:.7rem;color:var(--color-gray-400)">Forma:</span><div class="form-streak">${streakHtml}</div></div>` : ''}
      </div>
    `;
  }).join('');

  // Navega para detalhe ao clicar no card (mas não nos botões de ação)
  list.querySelectorAll('.entity-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `equipe-detalhe.html?id=${card.dataset.equipeId}`;
    });
  });
}

/* ==========================================================================
   2. MODAL DE CRIAÇÃO / EDIÇÃO DE EQUIPE
   ========================================================================== */

function abrirModalEquipe(id = null) {
  const equipe = id ? DB.findById(DB_KEYS.EQUIPES, id) : null;
  const titulo = equipe ? 'Editar Equipe' : 'Nova Equipe';

  const bodyHtml = `
    <div class="form-group">
      <label class="form-label">Logo da Equipe</label>
      <div class="upload-zone" id="logoUploadZone">
        <input type="file" id="logoInput" accept="image/*">
        <div id="logoPreviewWrap">
          ${equipe?.logo ? `<img src="${equipe.logo}" class="upload-zone-preview" id="logoPreview">` : `<div class="upload-icon">📷</div>`}
          <div style="font-size:.8rem;color:var(--color-gray-400)">
            ${equipe?.logo ? 'Clique para trocar' : 'Clique ou arraste a logo aqui'}
          </div>
        </div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Nome da Equipe <span class="required">*</span></label>
        <input type="text" id="eq_nome" class="form-control" value="${escapeHtml(equipe?.nome || '')}" placeholder="Ex: Falcões FC" maxlength="60" required>
        <span class="form-error">Campo obrigatório</span>
      </div>
      <div class="form-group">
        <label class="form-label">Responsável / Técnico</label>
        <input type="text" id="eq_responsavel" class="form-control" value="${escapeHtml(equipe?.responsavel || '')}" placeholder="Nome do responsável" maxlength="60">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Modalidade <span class="required">*</span></label>
        <select id="eq_modalidade" class="form-control" required>
          <option value="" disabled ${!equipe ? 'selected' : ''}>Selecione</option>
          <option value="Futsal" ${equipe?.modalidade === 'Futsal' ? 'selected' : ''}>⚽ Futsal</option>
          <option value="Vôlei" ${equipe?.modalidade === 'Vôlei' ? 'selected' : ''}>🏐 Vôlei</option>
        </select>
        <span class="form-error">Campo obrigatório</span>
      </div>
      <div class="form-group">
        <label class="form-label">Cidade</label>
        <input type="text" id="eq_cidade" class="form-control" value="${escapeHtml(equipe?.cidade || 'Cascavel')}" maxlength="60">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Cor Principal</label>
        <div class="color-input-wrap">
          <input type="color" id="eq_corPrincipal" value="${equipe?.corPrincipal || '#FFD400'}">
          <span id="eq_corPrincipalLabel">${equipe?.corPrincipal || '#FFD400'}</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Cor Secundária</label>
        <div class="color-input-wrap">
          <input type="color" id="eq_corSecundaria" value="${equipe?.corSecundaria || '#0D0D0D'}">
          <span id="eq_corSecundariaLabel">${equipe?.corSecundaria || '#0D0D0D'}</span>
        </div>
      </div>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-secondary" data-action="cancel">Cancelar</button>
    <button type="button" class="btn btn-primary" id="btnSalvarEquipe">
      💾 ${equipe ? 'Salvar Alterações' : 'Criar Equipe'}
    </button>
  `;

  const { overlay, close } = openModal({ title: titulo, bodyHtml, footerHtml, size: 'lg' });

  // Preview de logo em tempo real
  let logoBase64 = equipe?.logo || '';
  const logoInput = overlay.querySelector('#logoInput');
  logoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      showToast('Logo muito grande. Use imagens com menos de 500 KB.', 'error');
      return;
    }
    logoBase64 = await fileParaBase64(file);
    const wrap = overlay.querySelector('#logoPreviewWrap');
    wrap.innerHTML = `<img src="${logoBase64}" class="upload-zone-preview" id="logoPreview">
      <div style="font-size:.8rem;color:var(--color-gray-400)">Clique para trocar</div>`;
  });

  ['eq_corPrincipal', 'eq_corSecundaria'].forEach(id => {
    const input = overlay.querySelector(`#${id}`);
    const label = overlay.querySelector(`#${id}Label`);
    input.addEventListener('input', () => { label.textContent = input.value; });
  });

  overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);

  overlay.querySelector('#btnSalvarEquipe').addEventListener('click', async () => {
    const nome = overlay.querySelector('#eq_nome').value.trim();
    const modalidade = overlay.querySelector('#eq_modalidade').value;

    let valido = true;
    if (!nome) {
      overlay.querySelector('#eq_nome').classList.add('invalid');
      valido = false;
    }
    if (!modalidade) {
      overlay.querySelector('#eq_modalidade').classList.add('invalid');
      valido = false;
    }
    if (!valido) {
      overlay.querySelector('.modal-box').classList.add('shake');
      setTimeout(() => overlay.querySelector('.modal-box')?.classList.remove('shake'), 400);
      return;
    }

    const dados = {
      nome,
      modalidade,
      responsavel: overlay.querySelector('#eq_responsavel').value.trim(),
      cidade: overlay.querySelector('#eq_cidade').value.trim(),
      corPrincipal: overlay.querySelector('#eq_corPrincipal').value,
      corSecundaria: overlay.querySelector('#eq_corSecundaria').value,
      logo: logoBase64
    };

    if (equipe) {
      DB.update(DB_KEYS.EQUIPES, id, dados);
      showToast(`Equipe "${nome}" atualizada!`, 'success');
    } else {
      DB.insert(DB_KEYS.EQUIPES, dados);
      showToast(`Equipe "${nome}" criada!`, 'success');
    }

    close();
    renderListaEquipes(document.getElementById('filtroModalidadeEquipes')?.value || '');
  });
}

/* ==========================================================================
   3. EXCLUSÃO DE EQUIPE
   ========================================================================== */

function confirmarExcluirEquipe(id) {
  const equipe = DB.findById(DB_KEYS.EQUIPES, id);
  if (!equipe) return;

  confirmAction({
    title: 'Excluir Equipe',
    message: `Tem certeza que deseja excluir "${equipe.nome}"? Esta ação não pode ser desfeita.`,
    confirmLabel: 'Sim, excluir',
    onConfirm: () => {
      DB.remove(DB_KEYS.EQUIPES, id);
      showToast(`Equipe "${equipe.nome}" excluída.`, 'info');
      renderListaEquipes();
    }
  });
}

/* ==========================================================================
   4. PÁGINA DE DETALHE DE UMA EQUIPE (equipe-detalhe.html)
   ========================================================================== */

function renderPaginaDetalheEquipe() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const equipe = DB.findById(DB_KEYS.EQUIPES, id);
  const root = document.getElementById('pageContentRoot');

  if (!equipe) {
    root.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚽</div>
        <h3>Equipe não encontrada</h3>
        <p>A equipe solicitada não existe ou foi removida.</p>
        <a href="equipes.html" class="btn btn-primary">← Voltar às Equipes</a>
      </div>`;
    return;
  }

  const stats = calcularEstatisticasEquipe(id);
  const jogadores = DB.get(DB_KEYS.JOGADORES).filter(j => j.equipeId === id);

  const artilheiros = calcularArtilharia().filter(r => r.equipe?.id === id);
  const artilheiro = artilheiros[0];

  const partidas = DB.get(DB_KEYS.PARTIDAS).filter(
    p => (p.mandanteId === id || p.visitanteId === id) && p.status === 'Finalizada'
  ).slice(-5).reverse();

  const streakHtml = stats.historico.map(r => {
    const labels = { win: 'V', draw: 'E', loss: 'D' };
    return `<span class="form-dot ${r}">${labels[r]}</span>`;
  }).join('');

  root.innerHTML = `
    <!-- Cabeçalho da equipe -->
    <div class="card card-pad section-block" style="display:flex;align-items:center;gap:var(--space-6);flex-wrap:wrap;background:linear-gradient(135deg,${equipe.corPrincipal}18 0%,transparent 60%)">
      ${renderBadgeEquipe(equipe, 100)}
      <div style="flex:1;min-width:200px">
        <div class="eyebrow">${escapeHtml(equipe.modalidade || '')}</div>
        <h1 style="text-transform:none;font-size:2rem">${escapeHtml(equipe.nome)}</h1>
        ${equipe.responsavel ? `<p style="color:var(--color-gray-400);margin-top:4px">Responsável: ${escapeHtml(equipe.responsavel)}</p>` : ''}
        ${equipe.cidade ? `<p style="color:var(--color-gray-400)">📍 ${escapeHtml(equipe.cidade)}</p>` : ''}
        <div class="form-streak" style="margin-top:12px">${streakHtml}</div>
      </div>
      <div class="flex gap-3">
        <button class="btn btn-secondary" onclick="abrirModalEquipe('${id}')">✏️ Editar</button>
        <a href="equipes.html" class="btn btn-ghost">← Voltar</a>
      </div>
    </div>

    <!-- Estatísticas -->
    <div class="stat-grid section-block">
      <div class="card stat-card"><div class="stat-icon">🎮</div><div><div class="stat-value stat-number">${stats.jogos}</div><div class="stat-label">Jogos</div></div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:var(--color-win-bg);color:var(--color-win)">✓</div><div><div class="stat-value stat-number text-win">${stats.vitorias}</div><div class="stat-label">Vitórias</div></div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:var(--color-draw-bg);color:var(--color-draw)">—</div><div><div class="stat-value stat-number">${stats.empates}</div><div class="stat-label">Empates</div></div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:var(--color-loss-bg);color:var(--color-loss)">✕</div><div><div class="stat-value stat-number text-loss">${stats.derrotas}</div><div class="stat-label">Derrotas</div></div></div>
      <div class="card stat-card"><div class="stat-icon">⚽</div><div><div class="stat-value stat-number">${stats.golsPro}</div><div class="stat-label">Gols Pró</div></div></div>
      <div class="card stat-card"><div class="stat-icon">📊</div><div><div class="stat-value stat-number">${stats.aproveitamento}%</div><div class="stat-label">Aproveitamento</div></div></div>
    </div>

    <!-- Jogadores -->
    <div class="section-block">
      <div class="flex justify-between items-center mb-3">
        <h2 class="section-title">Atletas (${jogadores.length})</h2>
        <a href="jogadores.html" class="btn btn-sm btn-secondary">+ Adicionar atleta</a>
      </div>
      ${jogadores.length ? `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>#</th><th>Foto</th><th>Nome</th><th>Posição</th><th>Gols</th><th>Assist.</th>
            </tr></thead>
            <tbody>
              ${jogadores.map(j => {
                const est = calcularEstatisticasJogador(j.id);
                return `
                  <tr class="clickable" onclick="window.location.href='jogador-detalhe.html?id=${j.id}'">
                    <td class="table-center"><strong>${j.numero || '—'}</strong></td>
                    <td>
                      ${j.foto
                        ? `<img src="${j.foto}" style="width:32px;height:32px;border-radius:50%;object-fit:cover">`
                        : `<div style="width:32px;height:32px;border-radius:50%;background:var(--color-gray-700);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700">${iniciais(j.nome)}</div>`}
                    </td>
                    <td><strong>${escapeHtml(j.nome)}</strong>${j.apelido ? `<br><span class="text-muted" style="font-size:.75rem">${escapeHtml(j.apelido)}</span>` : ''}</td>
                    <td>${escapeHtml(j.posicao || '—')}</td>
                    <td class="table-center">${est.gols}</td>
                    <td class="table-center">${est.assistencias}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="card card-pad text-muted">Nenhum atleta cadastrado para esta equipe.</div>`}
    </div>

    <!-- Últimas partidas -->
    ${partidas.length ? `
      <div class="section-block">
        <h2 class="section-title">Últimas Partidas</h2>
        ${renderMiniPartidasList(partidas, id)}
      </div>
    ` : ''}
  `;
}

function renderMiniPartidasList(partidas, perspectiva = null) {
  const equipes = DB.get(DB_KEYS.EQUIPES);
  return `<div class="table-wrap"><table class="data-table"><thead><tr>
      <th>Data</th><th>Mandante</th><th></th><th>Placar</th><th></th><th>Visitante</th><th>Resultado</th>
    </tr></thead><tbody>
    ${partidas.map(p => {
      const em = equipes.find(e => e.id === p.mandanteId);
      const ev = equipes.find(e => e.id === p.visitanteId);
      let resultado = '—', corRes = '';
      if (perspectiva && p.status === 'Finalizada') {
        const isMandante = p.mandanteId === perspectiva;
        const gm = p.placarMandante; const gv = p.placarVisitante;
        if (gm > gv) resultado = isMandante ? 'Vitória' : 'Derrota';
        else if (gm < gv) resultado = isMandante ? 'Derrota' : 'Vitória';
        else resultado = 'Empate';
        corRes = resultado === 'Vitória' ? 'text-win' : resultado === 'Derrota' ? 'text-loss' : '';
      }
      return `<tr>
        <td>${formatarData(p.data)}</td>
        <td>${escapeHtml(em?.nome || '—')}</td>
        <td class="table-center">${escapeHtml(String(p.placarMandante ?? '—'))}</td>
        <td class="table-center" style="font-family:var(--font-display);color:var(--color-yellow)">×</td>
        <td class="table-center">${escapeHtml(String(p.placarVisitante ?? '—'))}</td>
        <td>${escapeHtml(ev?.nome || '—')}</td>
        <td><span class="${corRes}">${resultado}</span></td>
      </tr>`;
    }).join('')}
    </tbody></table></div>`;
}
