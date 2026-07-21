/* ==========================================================================
   INTERJORNADAS CASCAVEL — partidas.js
   CRUD de partidas + tela ao vivo (cronômetro, placar, eventos, vôlei com sets).
   Depende de: app.js, ranking.js
   ========================================================================== */

'use strict';

/* ==========================================================================
   PARTIDAS — LISTAGEM GERAL
   ========================================================================== */

function renderPaginaPartidas() {
  const root = document.getElementById('pageContentRoot');
  const campeonatos = DB.get(DB_KEYS.CAMPEONATOS);

  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="eyebrow">Gerenciamento</div>
        <h1>Partidas</h1>
        <p>Cadastre partidas avulsas ou acesse as criadas pelos campeonatos.</p>
      </div>
      <button class="btn btn-primary" onclick="abrirModalNovaPartida()">📅 Nova Partida</button>
    </div>
    <div class="filter-bar">
      <select id="filtroCampPartidas" class="form-control">
        <option value="">Todos os campeonatos</option>
        ${campeonatos.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('')}
      </select>
      <select id="filtroStatusPartidas" class="form-control">
        <option value="">Todos os status</option>
        <option value="Agendada">Agendada</option>
        <option value="Em andamento">Em andamento</option>
        <option value="Finalizada">Finalizada</option>
      </select>
    </div>
    <div id="partidasListWrap"></div>
  `;

  document.getElementById('filtroCampPartidas').addEventListener('change', renderListaPartidas);
  document.getElementById('filtroStatusPartidas').addEventListener('change', renderListaPartidas);
  renderListaPartidas();
}

function renderListaPartidas() {
  const filtroCamp = document.getElementById('filtroCampPartidas')?.value || '';
  const filtroStatus = document.getElementById('filtroStatusPartidas')?.value || '';
  const equipes = DB.get(DB_KEYS.EQUIPES);
  const campeonatos = DB.get(DB_KEYS.CAMPEONATOS);

  let partidas = DB.get(DB_KEYS.PARTIDAS);
  if (filtroCamp) partidas = partidas.filter(p => p.campeonatoId === filtroCamp);
  if (filtroStatus) partidas = partidas.filter(p => p.status === filtroStatus);
  partidas = partidas.sort((a, b) => {
    const order = { 'Em andamento': 0, 'Agendada': 1, 'Finalizada': 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return (a.data || '').localeCompare(b.data || '');
  });

  const wrap = document.getElementById('partidasListWrap');
  if (!partidas.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><h3>Nenhuma partida encontrada</h3><p>Ajuste os filtros ou crie uma nova partida.</p><button class="btn btn-primary" onclick="abrirModalNovaPartida()">📅 Nova Partida</button></div>`;
    return;
  }

  wrap.innerHTML = `<div class="table-wrap">
    <table class="data-table"><thead><tr>
      <th>Data</th><th>Campeonato</th><th>Rod.</th><th>Mandante</th><th>Placar</th><th>Visitante</th><th>Status</th><th>Ações</th>
    </tr></thead><tbody>
      ${partidas.map(p => {
        const em = equipes.find(e => e.id === p.mandanteId);
        const ev = equipes.find(e => e.id === p.visitanteId);
        const camp = campeonatos.find(c => c.id === p.campeonatoId);
        const placar = p.status !== 'Agendada'
          ? `<span style="font-family:var(--font-display)">${p.placarMandante} × ${p.placarVisitante}</span>`
          : '<span style="color:var(--color-gray-400)">vs</span>';
        return `<tr>
          <td style="white-space:nowrap">${formatarData(p.data)}${p.hora ? ` <span style="color:var(--color-gray-400)">${p.hora.slice(0,5)}</span>` : ''}</td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8rem">${escapeHtml(camp?.nome || '—')}</td>
          <td class="table-center">${p.rodada || '—'}</td>
          <td><div class="table-team-cell">
            ${em?.logo ? `<img src="${em.logo}" class="table-badge-img">` : ''}
            <span>${escapeHtml(em?.nome || '—')}</span>
          </div></td>
          <td class="table-center">${placar}</td>
          <td><div class="table-team-cell">
            ${ev?.logo ? `<img src="${ev.logo}" class="table-badge-img">` : ''}
            <span>${escapeHtml(ev?.nome || '—')}</span>
          </div></td>
          <td><span class="badge badge-${p.status === 'Finalizada' ? 'finalizada' : p.status === 'Em andamento' ? 'andamento' : 'agendada'}">${p.status}</span></td>
          <td>
            <div class="flex gap-2">
              <a href="partida-ao-vivo.html?id=${p.id}" class="btn btn-sm ${p.status === 'Em andamento' ? 'btn-primary' : 'btn-secondary'}" title="Abrir partida">
                ${p.status === 'Finalizada' ? '👁' : p.status === 'Em andamento' ? '🔴' : '▶'}
              </a>
              <button class="btn-icon btn-icon-sm" onclick="confirmarExcluirPartida('${p.id}')" title="Excluir" style="background:rgba(231,76,60,.15);color:var(--color-loss)">🗑️</button>
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody></table>
  </div>`;
}

function abrirModalNovaPartida() {
  const campeonatos = DB.get(DB_KEYS.CAMPEONATOS);
  const equipes = DB.get(DB_KEYS.EQUIPES);
  const bodyHtml = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Campeonato <span class="required">*</span></label>
        <select id="p_camp" class="form-control" required>
          <option value="" disabled selected>Selecione</option>
          ${campeonatos.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('')}
        </select>
        <span class="form-error">Campo obrigatório</span>
      </div>
      <div class="form-group">
        <label class="form-label">Rodada</label>
        <input type="number" id="p_rodada" class="form-control" min="1" value="1">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Time Mandante <span class="required">*</span></label>
        <select id="p_mandante" class="form-control" required>
          <option value="" disabled selected>Selecione</option>
          ${equipes.map(e => `<option value="${e.id}">${escapeHtml(e.nome)}</option>`).join('')}
        </select>
        <span class="form-error">Campo obrigatório</span>
      </div>
      <div class="form-group">
        <label class="form-label">Time Visitante <span class="required">*</span></label>
        <select id="p_visitante" class="form-control" required>
          <option value="" disabled selected>Selecione</option>
          ${equipes.map(e => `<option value="${e.id}">${escapeHtml(e.nome)}</option>`).join('')}
        </select>
        <span class="form-error">Campo obrigatório</span>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Data</label>
        <input type="date" id="p_data" class="form-control" value="${new Date().toISOString().slice(0,10)}">
      </div>
      <div class="form-group">
        <label class="form-label">Hora</label>
        <input type="time" id="p_hora" class="form-control" value="19:30">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Local</label>
      <input type="text" id="p_local" class="form-control" value="Ginásio Municipal de Cascavel" maxlength="100">
    </div>
  `;
  const footerHtml = `<button class="btn btn-secondary" data-action="cancel">Cancelar</button><button class="btn btn-primary" id="btnSalvarPartida">📅 Criar Partida</button>`;
  const { overlay, close } = openModal({ title: 'Nova Partida', bodyHtml, footerHtml });
  overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
  overlay.querySelector('#btnSalvarPartida').addEventListener('click', () => {
    const campId = overlay.querySelector('#p_camp').value;
    const mandanteId = overlay.querySelector('#p_mandante').value;
    const visitanteId = overlay.querySelector('#p_visitante').value;
    if (!campId || !mandanteId || !visitanteId || mandanteId === visitanteId) {
      showToast('Preencha campeonato e dois times distintos.', 'error'); return;
    }
    const camp = DB.findById(DB_KEYS.CAMPEONATOS, campId);
    const partida = {
      campeonatoId: campId, modalidade: camp?.modalidade || 'Futsal',
      rodada: Number(overlay.querySelector('#p_rodada').value) || 1,
      mandanteId, visitanteId,
      data: overlay.querySelector('#p_data').value,
      hora: overlay.querySelector('#p_hora').value,
      local: overlay.querySelector('#p_local').value.trim(),
      status: 'Agendada', placarMandante: 0, placarVisitante: 0,
      eventos: [], cronometroSegundos: 0,
      sets: [], setsMandante: 0, setsVisitante: 0
    };
    const nova = DB.insert(DB_KEYS.PARTIDAS, partida);
    showToast('Partida criada!', 'success');
    close();
    renderListaPartidas();
    setTimeout(() => { window.location.href = `partida-ao-vivo.html?id=${nova.id}`; }, 600);
  });
}

function confirmarExcluirPartida(id) {
  const p = DB.findById(DB_KEYS.PARTIDAS, id); if (!p) return;
  confirmAction({ title: 'Excluir Partida', message: 'Excluir esta partida e todos os seus eventos?', confirmLabel: 'Sim, excluir',
    onConfirm: () => { DB.remove(DB_KEYS.PARTIDAS, id); showToast('Partida excluída.', 'info'); renderListaPartidas(); }
  });
}

/* ==========================================================================
   TELA DA PARTIDA AO VIVO (partida-ao-vivo.html)
   ========================================================================== */

let _cronometroInterval = null;

function renderPaginaPartidaAoVivo() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const root = document.getElementById('pageContentRoot');
  const partida = DB.findById(DB_KEYS.PARTIDAS, id);

  if (!partida) {
    root.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><h3>Partida não encontrada</h3><a href="partidas.html" class="btn btn-primary mt-5">← Voltar</a></div>`;
    return;
  }

  const em = DB.findById(DB_KEYS.EQUIPES, partida.mandanteId) || { nome: '—', logo: '' };
  const ev = DB.findById(DB_KEYS.EQUIPES, partida.visitanteId) || { nome: '—', logo: '' };

  root.innerHTML = `
    <!-- Cabeçalho do placar -->
    <div class="card card-pad section-block" style="background:linear-gradient(135deg,var(--color-black-soft) 0%,#1a1a2e 100%)">
      <div class="match-live-scoreboard flex items-center justify-between gap-4" style="flex-wrap:nowrap;min-height:140px">
        <!-- Time mandante -->
        <div style="flex:1;text-align:center;min-width:0">
          ${renderBadgeEquipe(em, 72)}
          <div style="font-family:var(--font-display);font-size:1rem;margin-top:8px;overflow:hidden;text-overflow:ellipsis">${escapeHtml(em.nome)}</div>
          <span class="badge" style="background:${em.corPrincipal || 'var(--color-gray-700)'}22;color:${em.corPrincipal || 'var(--color-gray-300)'};margin-top:4px">Mandante</span>
        </div>

        <!-- Placar central -->
        <div class="match-live-score" style="text-align:center;flex-shrink:0">
          <div id="scoreboard" style="font-family:var(--font-display);font-size:3.5rem;letter-spacing:-.02em;line-height:1;display:flex;align-items:center;gap:16px">
            <span id="placarMandante" style="color:var(--color-yellow)">${partida.placarMandante}</span>
            <span style="color:var(--color-gray-600)">×</span>
            <span id="placarVisitante" style="color:var(--color-yellow)">${partida.placarVisitante}</span>
          </div>
          <div id="cronometroDisplay" style="font-family:var(--font-display);font-size:1.1rem;color:var(--color-gray-300);margin-top:8px ${partida.status === 'Em andamento' ? ';' : ''}">
            ${partida.modalidade === 'Vôlei' ? `Sets: <span id="setsMandante">${partida.setsMandante||0}</span> × <span id="setsVisitante">${partida.setsVisitante||0}</span>` : `<span id="timerDisplay" class="${partida.status === 'Em andamento' ? 'timer-running' : ''}">${formatarCronometro(partida.cronometroSegundos || 0)}</span>`}
          </div>
          <div style="margin-top:10px">
            <span class="badge ${partida.status === 'Em andamento' ? 'badge-live' : partida.status === 'Finalizada' ? 'badge-finalizada' : 'badge-agendada'}" id="statusBadge">${partida.status}</span>
          </div>
        </div>

        <!-- Time visitante -->
        <div style="flex:1;text-align:center;min-width:0">
          ${renderBadgeEquipe(ev, 72)}
          <div style="font-family:var(--font-display);font-size:1rem;margin-top:8px;overflow:hidden;text-overflow:ellipsis">${escapeHtml(ev.nome)}</div>
          <span class="badge" style="background:var(--color-gray-700);color:var(--color-gray-300);margin-top:4px">Visitante</span>
        </div>
      </div>

      <!-- Controles -->
      <div class="flex justify-between items-center" style="margin-top:var(--space-5);border-top:1px solid var(--color-gray-700);padding-top:var(--space-4)">
        <div class="flex gap-3">
          <a href="partidas.html" class="btn btn-ghost btn-sm">← Voltar</a>
          <span style="font-size:.8rem;color:var(--color-gray-400)">${formatarData(partida.data)} ${partida.hora ? partida.hora.slice(0,5) : ''} · ${escapeHtml(partida.local || '')}</span>
        </div>
        <div class="flex gap-3" id="controles">
          ${renderControlesPartida(partida)}
        </div>
      </div>
    </div>

    <!-- Seção específica por modalidade -->
    <div id="secaoEspecifica">
      ${partida.modalidade === 'Vôlei'
        ? renderSecaoSets(partida)
        : ''}
    </div>

    <!-- Painel de jogadores / eventos -->
    <div id="painelJogadores">
      ${renderPainelInferior(partida, em, ev)}
    </div>
  `;

  if (partida.status === 'Em andamento' && partida.modalidade === 'Futsal') {
    iniciarCronometro(partida);
  }
}

function renderControlesPartida(partida) {
  if (partida.modalidade === 'Futsal') {
    if (partida.status === 'Agendada') {
      return `<button class="btn btn-primary" onclick="controlarPartida('iniciar', '${partida.id}')">▶ Iniciar</button>`;
    }
    if (partida.status === 'Em andamento') {
      return `
        <button class="btn btn-secondary" onclick="controlarPartida('pausar', '${partida.id}')">⏸ Pausar</button>
        <button class="btn btn-danger" onclick="controlarPartida('finalizar', '${partida.id}')">⏹ Finalizar</button>
      `;
    }
    return `<span class="badge badge-finalizada">Encerrada</span>`;
  }
  // Vôlei
  if (partida.status === 'Agendada') {
    return `<button class="btn btn-primary" onclick="controlarPartida('iniciar', '${partida.id}')">▶ Iniciar</button>`;
  }
  if (partida.status === 'Em andamento') {
    return `<button class="btn btn-danger" onclick="abrirModalFinalizarVolei('${partida.id}')">⏹ Finalizar e Escolher MVP</button>`;
  }
  return `<span class="badge badge-finalizada">Encerrada</span>`;
}

function controlarPartida(acao, partidaId) {
  const partida = DB.findById(DB_KEYS.PARTIDAS, partidaId);
  if (!partida) return;

  if (acao === 'iniciar') {
    DB.update(DB_KEYS.PARTIDAS, partidaId, { status: 'Em andamento' });
    showToast('Partida iniciada!', 'success');
    renderPaginaPartidaAoVivo();
    if (partida.modalidade === 'Futsal') iniciarCronometro(DB.findById(DB_KEYS.PARTIDAS, partidaId));
  } else if (acao === 'pausar') {
    pararCronometro();
    DB.update(DB_KEYS.PARTIDAS, partidaId, { cronometroSegundos: _segundosAtual });
    showToast('Partida pausada.', 'info');
    document.getElementById('controles').innerHTML = `
      <button class="btn btn-primary" onclick="controlarPartida('retomar', '${partidaId}')">▶ Retomar</button>
      <button class="btn btn-danger" onclick="controlarPartida('finalizar', '${partidaId}')">⏹ Finalizar</button>
    `;
    const timerDisplay = document.querySelector('#timerDisplay');
    if (timerDisplay) timerDisplay.classList.remove('timer-running');
  } else if (acao === 'retomar') {
    const p = DB.findById(DB_KEYS.PARTIDAS, partidaId);
    document.getElementById('controles').innerHTML = `
      <button class="btn btn-secondary" onclick="controlarPartida('pausar', '${partidaId}')">⏸ Pausar</button>
      <button class="btn btn-danger" onclick="controlarPartida('finalizar', '${partidaId}')">⏹ Finalizar</button>
    `;
    const timerDisplay = document.querySelector('#timerDisplay');
    if (timerDisplay) timerDisplay.classList.add('timer-running');
    iniciarCronometro(p);
  } else if (acao === 'finalizar') {
    confirmAction({
      title: 'Finalizar Partida',
      message: `Finalizar a partida? O placar atual é ${partida.placarMandante} × ${partida.placarVisitante}.`,
      confirmLabel: 'Sim, finalizar',
      onConfirm: () => {
        pararCronometro();
        DB.update(DB_KEYS.PARTIDAS, partidaId, { status: 'Finalizada', cronometroSegundos: _segundosAtual || partida.cronometroSegundos });
        showToast('Partida finalizada!', 'success');
        renderPaginaPartidaAoVivo();
      }
    });
  }
}

/* ---- Cronômetro ---- */
let _segundosAtual = 0;

function iniciarCronometro(partida) {
  pararCronometro();
  _segundosAtual = partida.cronometroSegundos || 0;
  _cronometroInterval = setInterval(() => {
    _segundosAtual++;
    const display = document.getElementById('timerDisplay');
    if (display) display.textContent = formatarCronometro(_segundosAtual);
    // Salva a cada 30s para não perder em caso de reload
    if (_segundosAtual % 30 === 0) DB.update(DB_KEYS.PARTIDAS, partida.id, { cronometroSegundos: _segundosAtual });
  }, 1000);
}

function pararCronometro() {
  if (_cronometroInterval) { clearInterval(_cronometroInterval); _cronometroInterval = null; }
}

function formatarCronometro(segundos) {
  const m = Math.floor(segundos / 60).toString().padStart(2, '0');
  const s = (segundos % 60).toString().padStart(2, '0');
  return `${m}<span class="timer-colon">:</span>${s}`;
}

/* ---- Decide o que mostrar na parte inferior, de acordo com a modalidade ---- */

function renderPainelInferior(partida, em, ev) {
  if (partida.modalidade === 'Vôlei') {
    if (partida.status === 'Finalizada') return renderMvpFinalCard(partida);
    // Durante o jogo de vôlei, a pontuação é feita pelo painel de sets acima;
    // não faz sentido mostrar botões de gol/cartão (exclusivos do futsal).
    return `<div class="card card-pad text-muted" style="font-size:.85rem;text-align:center">
      🏐 Utilize o painel de sets acima para registrar a pontuação. Ao finalizar, você poderá escolher o MVP da partida.
    </div>`;
  }
  // Futsal
  return partida.status !== 'Finalizada'
    ? renderPainelEventos(partida, em, ev)
    : renderResumoEventos(partida, em, ev);
}

/**
 * Card de destaque do MVP exibido quando uma partida de vôlei é finalizada.
 */
function renderMvpFinalCard(partida) {
  if (!partida.mvpJogadorId) {
    return `<div class="card card-pad text-muted">Nenhum MVP foi selecionado para esta partida.</div>`;
  }
  const jogador = DB.findById(DB_KEYS.JOGADORES, partida.mvpJogadorId);
  if (!jogador) {
    return `<div class="card card-pad text-muted">O MVP selecionado não foi encontrado (pode ter sido removido).</div>`;
  }
  const equipe = DB.findById(DB_KEYS.EQUIPES, jogador.equipeId);
  return `<div class="card card-pad" style="display:flex;align-items:center;gap:16px;background:linear-gradient(135deg,rgba(255,212,0,.08),transparent)">
    ${jogador.foto
      ? `<img src="${jogador.foto}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--color-yellow)">`
      : `<div style="width:64px;height:64px;border-radius:50%;background:var(--color-gray-700);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:1.4rem;color:var(--color-yellow)">${iniciais(jogador.nome)}</div>`}
    <div>
      <div class="eyebrow">🏆 MVP da Partida</div>
      <div style="font-family:var(--font-display);font-size:1.2rem;text-transform:none">${escapeHtml(jogador.nome)}</div>
      <div class="text-muted" style="font-size:.8rem">${escapeHtml(equipe?.nome || '—')}</div>
    </div>
  </div>`;
}

/* ---- Painel de eventos por jogador (futsal) ---- */

function renderPainelEventos(partida, em, ev) {
  const jogadores = DB.get(DB_KEYS.JOGADORES);
  const jogM = jogadores.filter(j => j.equipeId === partida.mandanteId);
  const jogV = jogadores.filter(j => j.equipeId === partida.visitanteId);

  const renderLista = (jogs, timeId) => jogs.map(j => {
    const gols = (partida.eventos || []).filter(e => e.tipo === 'gol' && e.jogadorId === j.id).length;
    const asis = (partida.eventos || []).filter(e => e.tipo === 'assistencia' && e.jogadorId === j.id).length;
    const am = (partida.eventos || []).filter(e => e.tipo === 'cartao_amarelo' && e.jogadorId === j.id).length;
    const vm = (partida.eventos || []).filter(e => e.tipo === 'cartao_vermelho' && e.jogadorId === j.id).length;
    return `
      <div class="card" style="padding:12px 14px;display:flex;align-items:center;gap:10px">
        ${j.foto ? `<img src="${j.foto}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0">` : `<div style="width:36px;height:36px;border-radius:50%;background:var(--color-gray-700);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;flex-shrink:0">${iniciais(j.nome)}</div>`}
        <div style="flex:1;min-width:0">
          <div style="font-size:.82rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${j.numero ? `<span style="color:var(--color-yellow)">#${j.numero}</span> ` : ''}${escapeHtml(j.apelido || j.nome)}</div>
          <div style="display:flex;gap:8px;margin-top:2px;font-size:.7rem;color:var(--color-gray-400)">
            ${gols ? `<span>⚽${gols}</span>` : ''}${asis ? `<span>🎯${asis}</span>` : ''}${am ? `<span>🟨${am}</span>` : ''}${vm ? `<span>🟥${vm}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end">
          <button class="btn btn-sm btn-primary" style="padding:4px 8px;font-size:.72rem" onclick="registrarEvento('${partida.id}','${j.id}','${timeId}','gol')">⚽ Gol</button>
          <button class="btn btn-sm btn-secondary" style="padding:4px 8px;font-size:.72rem" onclick="registrarEvento('${partida.id}','${j.id}','${timeId}','assistencia')">🎯 Assist.</button>
          <button class="btn btn-sm" style="padding:4px 8px;font-size:.72rem;background:rgba(242,183,5,.15);color:var(--color-card-yellow);border:1px solid rgba(242,183,5,.3)" onclick="registrarEvento('${partida.id}','${j.id}','${timeId}','cartao_amarelo')">🟨</button>
          <button class="btn btn-sm" style="padding:4px 8px;font-size:.72rem;background:rgba(231,76,60,.1);color:var(--color-loss);border:1px solid rgba(231,76,60,.3)" onclick="registrarEvento('${partida.id}','${j.id}','${timeId}','cartao_vermelho')">🟥</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="match-players-cols" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5)">
      <div>
        <h3 class="section-title" style="color:${em.corPrincipal||'var(--color-yellow)'}">⚽ ${escapeHtml(em.nome)}</h3>
        ${jogM.length ? renderLista(jogM, partida.mandanteId) : `<p class="text-muted" style="font-size:.85rem">Nenhum atleta cadastrado para este time.</p>`}
      </div>
      <div>
        <h3 class="section-title" style="color:${ev.corPrincipal||'var(--color-gray-300)'}">⚽ ${escapeHtml(ev.nome)}</h3>
        ${jogV.length ? renderLista(jogV, partida.visitanteId) : `<p class="text-muted" style="font-size:.85rem">Nenhum atleta cadastrado para este time.</p>`}
      </div>
    </div>
  `;
}

/**
 * Registra um evento (gol, assistência, cartão) na partida, atualiza o placar
 * e dispara animação de feedback. Tudo em tempo real sem reload.
 */
function registrarEvento(partidaId, jogadorId, timeId, tipo) {
  const partida = DB.findById(DB_KEYS.PARTIDAS, partidaId);
  if (!partida || partida.status !== 'Em andamento') {
    showToast('A partida não está em andamento.', 'error'); return;
  }

  const evento = {
    id: generateId(), tipo, timeId, jogadorId,
    minuto: Math.floor((_segundosAtual || partida.cronometroSegundos || 0) / 60),
    timestamp: new Date().toISOString()
  };

  const patch = { eventos: [...(partida.eventos || []), evento] };

  // Atualiza placar se for gol
  if (tipo === 'gol') {
    if (timeId === partida.mandanteId) patch.placarMandante = (partida.placarMandante || 0) + 1;
    else patch.placarVisitante = (partida.placarVisitante || 0) + 1;
  }

  DB.update(DB_KEYS.PARTIDAS, partidaId, patch);
  const atualizada = DB.findById(DB_KEYS.PARTIDAS, partidaId);

  // Atualiza placar na tela sem reload
  const elM = document.getElementById('placarMandante');
  const elV = document.getElementById('placarVisitante');
  if (elM) { elM.textContent = atualizada.placarMandante; elM.classList.add('score-pulse'); setTimeout(() => elM.classList.remove('score-pulse'), 400); }
  if (elV) { elV.textContent = atualizada.placarVisitante; elV.classList.add('score-pulse'); setTimeout(() => elV.classList.remove('score-pulse'), 400); }

  // Re-renderiza o painel de jogadores para atualizar contadores
  const em = DB.findById(DB_KEYS.EQUIPES, atualizada.mandanteId);
  const ev = DB.findById(DB_KEYS.EQUIPES, atualizada.visitanteId);
  const painel = document.getElementById('painelJogadores');
  if (painel) painel.innerHTML = renderPainelEventos(atualizada, em || {}, ev || {});

  const labels = { gol: 'Gol registrado! ⚽', assistencia: 'Assistência registrada! 🎯', cartao_amarelo: 'Cartão amarelo. 🟨', cartao_vermelho: 'Cartão vermelho. 🟥' };
  showToast(labels[tipo] || 'Evento registrado.', tipo === 'gol' ? 'success' : 'info');
}

/* ---- Resumo de eventos (partida finalizada) ---- */

function renderResumoEventos(partida, em, ev) {
  const jogadores = DB.get(DB_KEYS.JOGADORES);
  const eventos = partida.eventos || [];
  if (!eventos.length) return `<div class="card card-pad text-muted">Nenhum evento registrado nesta partida.</div>`;

  const rows = eventos.sort((a, b) => (a.minuto || 0) - (b.minuto || 0)).map(ev_ => {
    const jog = jogadores.find(j => j.id === ev_.jogadorId);
    const time = ev_.timeId === partida.mandanteId ? em : ev;
    const icons = { gol: '⚽', assistencia: '🎯', cartao_amarelo: '🟨', cartao_vermelho: '🟥' };
    return `<tr>
      <td>${ev_.minuto != null ? `${ev_.minuto}'` : '—'}</td>
      <td>${icons[ev_.tipo] || ev_.tipo}</td>
      <td>${escapeHtml(jog?.nome || '—')}</td>
      <td>${escapeHtml(time?.nome || '—')}</td>
    </tr>`;
  }).join('');

  return `<div class="section-block">
    <h2 class="section-title">Eventos da Partida</h2>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Min.</th><th>Evento</th><th>Jogador</th><th>Time</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

/* ---- Vôlei: painel de sets ---- */

function renderSecaoSets(partida) {
  if (partida.status === 'Finalizada' || partida.status === 'Agendada') {
    const sets = partida.sets || [];
    if (!sets.length) return '';
    const linhas = sets.map((s, i) => `<tr><td>Set ${i+1}</td><td class="table-center"><strong>${s.mandante}</strong></td><td class="table-center">×</td><td class="table-center"><strong>${s.visitante}</strong></td></tr>`).join('');
    return `<div class="card card-pad section-block"><h3 class="section-title">Sets</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Set</th><th>Mandante</th><th></th><th>Visitante</th></tr></thead><tbody>${linhas}</tbody></table></div></div>`;
  }

  // Em andamento: permitir adicionar set
  const sets = partida.sets || [];
  const linhas = sets.map((s, i) => `<tr><td>Set ${i+1}</td><td class="table-center">${s.mandante}</td><td class="table-center">×</td><td class="table-center">${s.visitante}</td></tr>`).join('');

  return `<div class="card card-pad section-block">
    <h3 class="section-title">Sets — Mandante ${partida.setsMandante||0} × ${partida.setsVisitante||0} Visitante</h3>
    ${sets.length ? `<div class="table-wrap" style="margin-bottom:16px"><table class="data-table"><thead><tr><th>Set</th><th>Mandante</th><th></th><th>Visitante</th></tr></thead><tbody>${linhas}</tbody></table></div>` : ''}
    <div class="flex gap-3 items-center flex-wrap">
      <input type="number" id="setM" min="0" max="99" placeholder="Pts Mandante" class="form-control" style="width:140px">
      <span style="color:var(--color-gray-400)">×</span>
      <input type="number" id="setV" min="0" max="99" placeholder="Pts Visitante" class="form-control" style="width:140px">
      <button class="btn btn-primary" onclick="adicionarSet('${partida.id}')">+ Adicionar Set</button>
    </div>
  </div>`;
}

function adicionarSet(partidaId) {
  const partida = DB.findById(DB_KEYS.PARTIDAS, partidaId); if (!partida) return;
  const pts_m = parseInt(document.getElementById('setM')?.value);
  const pts_v = parseInt(document.getElementById('setV')?.value);
  if (isNaN(pts_m) || isNaN(pts_v) || pts_m < 0 || pts_v < 0) { showToast('Insira pontuações válidas.', 'error'); return; }

  const sets = [...(partida.sets || []), { mandante: pts_m, visitante: pts_v }];
  let sm = 0, sv = 0;
  sets.forEach(s => { if (s.mandante > s.visitante) sm++; else sv++; });

  DB.update(DB_KEYS.PARTIDAS, partidaId, { sets, setsMandante: sm, setsVisitante: sv });
  const el_sm = document.getElementById('setsMandante');
  const el_sv = document.getElementById('setsVisitante');
  if (el_sm) el_sm.textContent = sm;
  if (el_sv) el_sv.textContent = sv;

  // Recarrega seção de sets
  const secao = document.getElementById('secaoEspecifica');
  const atualizada = DB.findById(DB_KEYS.PARTIDAS, partidaId);
  if (secao) secao.innerHTML = renderSecaoSets(atualizada);
  showToast(`Set adicionado: ${pts_m} × ${pts_v}`, 'success');
}

function abrirModalFinalizarVolei(partidaId) {
  const partida = DB.findById(DB_KEYS.PARTIDAS, partidaId); if (!partida) return;
  const jogadores = DB.get(DB_KEYS.JOGADORES);
  const todos = jogadores.filter(j => j.equipeId === partida.mandanteId || j.equipeId === partida.visitanteId);

  const bodyHtml = `
    <p style="font-size:.9rem;color:var(--color-gray-300);margin-bottom:16px">Selecione o MVP desta partida:</p>
    <select id="mvpJogadorId" class="form-control">
      <option value="">— Nenhum MVP —</option>
      ${todos.map(j => `<option value="${j.id}">${escapeHtml(j.nome)} (${DB.findById(DB_KEYS.EQUIPES, j.equipeId)?.nome || '—'})</option>`).join('')}
    </select>
  `;
  const footerHtml = `<button class="btn btn-secondary" data-action="cancel">Cancelar</button><button class="btn btn-primary" id="btnConfirmarMVP">🏆 Finalizar Partida</button>`;

  const { overlay, close } = openModal({ title: 'Finalizar Partida de Vôlei', bodyHtml, footerHtml, size: 'sm' });
  overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
  overlay.querySelector('#btnConfirmarMVP').addEventListener('click', () => {
    const mvpId = overlay.querySelector('#mvpJogadorId').value;
    DB.update(DB_KEYS.PARTIDAS, partidaId, { status: 'Finalizada', mvpJogadorId: mvpId || null });
    showToast('Partida de vôlei finalizada!', 'success');
    close();
    renderPaginaPartidaAoVivo();
  });
}
