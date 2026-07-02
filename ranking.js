/* ==========================================================================
   INTERJORNADAS CASCAVEL — ranking.js
   Funções de cálculo de classificação, artilharia, assistências e MVP.
   Depende de: app.js
   ========================================================================== */

'use strict';

/* ==========================================================================
   1. CÁLCULO DA TABELA DE CLASSIFICAÇÃO (FUTSAL)
   ========================================================================== */

/**
 * Calcula a tabela de classificação completa de um campeonato de futsal,
 * baseando-se nos eventos de todas as partidas finalizadas.
 * @param {string} campeonatoId
 * @returns {Array} array de objetos de classificação, ordenados pelos critérios oficiais
 */
function calcularClassificacaoFutsal(campeonatoId) {
  const campeonato = DB.findById(DB_KEYS.CAMPEONATOS, campeonatoId);
  if (!campeonato) return [];

  const todasPartidas = DB.get(DB_KEYS.PARTIDAS);
  const todasEquipes = DB.get(DB_KEYS.EQUIPES);

  // Inicializa o objeto de pontos para cada equipe do campeonato
  const tabela = {};
  (campeonato.equipesIds || []).forEach(id => {
    const equipe = todasEquipes.find(e => e.id === id);
    tabela[id] = {
      equipeId: id,
      equipe,
      jogos: 0, vitorias: 0, empates: 0, derrotas: 0,
      golsPro: 0, golsContra: 0, saldo: 0, pontos: 0,
      historico: []           // últimos 5 resultados para o form streak
    };
  });

  // Processa cada partida finalizada
  const partidas = todasPartidas.filter(
    p => p.campeonatoId === campeonatoId && p.status === 'Finalizada' && p.modalidade === 'Futsal'
  );

  partidas.forEach(p => {
    const m = tabela[p.mandanteId];
    const v = tabela[p.visitanteId];
    if (!m || !v) return;

    const gm = Number(p.placarMandante) || 0;
    const gv = Number(p.placarVisitante) || 0;

    m.jogos++;  v.jogos++;
    m.golsPro += gm;  m.golsContra += gv;
    v.golsPro += gv;  v.golsContra += gm;

    if (gm > gv) {
      m.vitorias++; m.pontos += 3; m.historico.push('win');
      v.derrotas++;                 v.historico.push('loss');
    } else if (gm < gv) {
      v.vitorias++; v.pontos += 3; v.historico.push('win');
      m.derrotas++;                 m.historico.push('loss');
    } else {
      m.empates++; m.pontos += 1; m.historico.push('draw');
      v.empates++; v.pontos += 1; v.historico.push('draw');
    }
  });

  // Atualiza saldo e limita histórico aos últimos 5 jogos
  Object.values(tabela).forEach(t => {
    t.saldo = t.golsPro - t.golsContra;
    t.historico = t.historico.slice(-5);
  });

  // Ordena pelos critérios oficiais:
  // 1. Pontos  2. Vitórias  3. Saldo de gols  4. Gols Pró  5. Alfabético
  return Object.values(tabela).sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
    if (b.saldo !== a.saldo) return b.saldo - a.saldo;
    if (b.golsPro !== a.golsPro) return b.golsPro - a.golsPro;
    return (a.equipe?.nome || '').localeCompare(b.equipe?.nome || '', 'pt-BR');
  });
}

/* ==========================================================================
   2. CÁLCULO DA TABELA DE CLASSIFICAÇÃO (VÔLEI)
   ========================================================================== */

/**
 * Calcula a classificação de um campeonato de vôlei.
 * Critérios: pontos (vitória=3, derrota=0) > saldo de sets > sets pró > sets contra > alfabético
 */
function calcularClassificacaoVolei(campeonatoId) {
  const campeonato = DB.findById(DB_KEYS.CAMPEONATOS, campeonatoId);
  if (!campeonato) return [];

  const todasPartidas = DB.get(DB_KEYS.PARTIDAS);
  const todasEquipes = DB.get(DB_KEYS.EQUIPES);

  const tabela = {};
  (campeonato.equipesIds || []).forEach(id => {
    const equipe = todasEquipes.find(e => e.id === id);
    tabela[id] = {
      equipeId: id, equipe,
      jogos: 0, vitorias: 0, derrotas: 0,
      setsPro: 0, setsContra: 0, saldoSets: 0, pontos: 0,
      historico: []
    };
  });

  const partidas = todasPartidas.filter(
    p => p.campeonatoId === campeonatoId && p.status === 'Finalizada' && p.modalidade === 'Vôlei'
  );

  partidas.forEach(p => {
    const m = tabela[p.mandanteId];
    const v = tabela[p.visitanteId];
    if (!m || !v) return;

    const sm = Number(p.setsMandante) || 0;
    const sv = Number(p.setsVisitante) || 0;

    m.jogos++; v.jogos++;
    m.setsPro += sm; m.setsContra += sv;
    v.setsPro += sv; v.setsContra += sm;

    if (sm > sv) {
      m.vitorias++; m.pontos += 3; m.historico.push('win');
      v.derrotas++;                 v.historico.push('loss');
    } else {
      v.vitorias++; v.pontos += 3; v.historico.push('win');
      m.derrotas++;                 m.historico.push('loss');
    }
  });

  Object.values(tabela).forEach(t => {
    t.saldoSets = t.setsPro - t.setsContra;
    t.historico = t.historico.slice(-5);
  });

  return Object.values(tabela).sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
    if (b.saldoSets !== a.saldoSets) return b.saldoSets - a.saldoSets;
    if (b.setsPro !== a.setsPro) return b.setsPro - a.setsPro;
    return (a.equipe?.nome || '').localeCompare(b.equipe?.nome || '', 'pt-BR');
  });
}

/* ==========================================================================
   3. RANKING DE ARTILHARIA (FUTSAL)
   ========================================================================== */

/**
 * Calcula o ranking de artilharia, opcionalmente filtrado por campeonato.
 * @param {string|null} campeonatoId - null = global
 * @returns {Array}
 */
function calcularArtilharia(campeonatoId = null) {
  const partidas = DB.get(DB_KEYS.PARTIDAS).filter(p => {
    if (p.modalidade !== 'Futsal') return false;
    if (p.status !== 'Finalizada') return false;
    if (campeonatoId && p.campeonatoId !== campeonatoId) return false;
    return true;
  });

  const jogadores = DB.get(DB_KEYS.JOGADORES);
  const equipes = DB.get(DB_KEYS.EQUIPES);
  const contagem = {};   // { jogadorId: { gols, jogosSet } }

  // Contabiliza gols por jogador
  partidas.forEach(p => {
    (p.eventos || []).forEach(ev => {
      if (ev.tipo !== 'gol') return;
      if (!contagem[ev.jogadorId]) contagem[ev.jogadorId] = { gols: 0, jogos: new Set() };
      contagem[ev.jogadorId].gols++;
      contagem[ev.jogadorId].jogos.add(p.id);
    });
  });

  return Object.entries(contagem)
    .map(([jogadorId, dados]) => {
      const jogador = jogadores.find(j => j.id === jogadorId);
      const equipe = equipes.find(e => e.id === jogador?.equipeId);
      const jogosCount = dados.jogos.size;
      return {
        jogador, equipe,
        gols: dados.gols,
        jogos: jogosCount,
        media: jogosCount > 0 ? (dados.gols / jogosCount).toFixed(2) : '0.00'
      };
    })
    .filter(r => r.jogador)
    .sort((a, b) => {
      if (b.gols !== a.gols) return b.gols - a.gols;
      return Number(b.media) - Number(a.media);
    });
}

/* ==========================================================================
   4. RANKING DE ASSISTÊNCIAS (FUTSAL)
   ========================================================================== */

function calcularAssistencias(campeonatoId = null) {
  const partidas = DB.get(DB_KEYS.PARTIDAS).filter(p => {
    if (p.modalidade !== 'Futsal') return false;
    if (p.status !== 'Finalizada') return false;
    if (campeonatoId && p.campeonatoId !== campeonatoId) return false;
    return true;
  });

  const jogadores = DB.get(DB_KEYS.JOGADORES);
  const equipes = DB.get(DB_KEYS.EQUIPES);
  const contagem = {};

  partidas.forEach(p => {
    (p.eventos || []).forEach(ev => {
      if (ev.tipo !== 'assistencia') return;
      if (!contagem[ev.jogadorId]) contagem[ev.jogadorId] = { assistencias: 0, jogos: new Set() };
      contagem[ev.jogadorId].assistencias++;
      contagem[ev.jogadorId].jogos.add(p.id);
    });
  });

  return Object.entries(contagem)
    .map(([jogadorId, dados]) => {
      const jogador = jogadores.find(j => j.id === jogadorId);
      const equipe = equipes.find(e => e.id === jogador?.equipeId);
      const jogosCount = dados.jogos.size;
      return {
        jogador, equipe,
        assistencias: dados.assistencias,
        jogos: jogosCount,
        media: jogosCount > 0 ? (dados.assistencias / jogosCount).toFixed(2) : '0.00'
      };
    })
    .filter(r => r.jogador)
    .sort((a, b) => {
      if (b.assistencias !== a.assistencias) return b.assistencias - a.assistencias;
      return Number(b.media) - Number(a.media);
    });
}

/* ==========================================================================
   5. RANKING DE CARTÕES (FUTSAL)
   ========================================================================== */

function calcularRankingCartoes(campeonatoId = null) {
  const partidas = DB.get(DB_KEYS.PARTIDAS).filter(p => {
    if (p.modalidade !== 'Futsal') return false;
    if (p.status !== 'Finalizada') return false;
    if (campeonatoId && p.campeonatoId !== campeonatoId) return false;
    return true;
  });

  const jogadores = DB.get(DB_KEYS.JOGADORES);
  const equipes = DB.get(DB_KEYS.EQUIPES);
  const contagem = {};

  partidas.forEach(p => {
    (p.eventos || []).forEach(ev => {
      if (ev.tipo !== 'cartao_amarelo' && ev.tipo !== 'cartao_vermelho') return;
      if (!contagem[ev.jogadorId]) contagem[ev.jogadorId] = { amarelos: 0, vermelhos: 0 };
      if (ev.tipo === 'cartao_amarelo') contagem[ev.jogadorId].amarelos++;
      else contagem[ev.jogadorId].vermelhos++;
    });
  });

  return Object.entries(contagem)
    .map(([jogadorId, dados]) => {
      const jogador = jogadores.find(j => j.id === jogadorId);
      const equipe = equipes.find(e => e.id === jogador?.equipeId);
      return { jogador, equipe, ...dados };
    })
    .filter(r => r.jogador)
    .sort((a, b) => b.vermelhos !== a.vermelhos ? b.vermelhos - a.vermelhos : b.amarelos - a.amarelos);
}

/* ==========================================================================
   6. RANKING DE MVP (VÔLEI)
   ========================================================================== */

function calcularRankingMVP(campeonatoId = null) {
  const partidas = DB.get(DB_KEYS.PARTIDAS).filter(p => {
    if (p.modalidade !== 'Vôlei') return false;
    if (p.status !== 'Finalizada') return false;
    if (campeonatoId && p.campeonatoId !== campeonatoId) return false;
    return p.mvpJogadorId;
  });

  const jogadores = DB.get(DB_KEYS.JOGADORES);
  const equipes = DB.get(DB_KEYS.EQUIPES);
  const contagem = {};

  partidas.forEach(p => {
    const id = p.mvpJogadorId;
    if (!contagem[id]) contagem[id] = { mvps: 0, jogos: 0 };
    contagem[id].mvps++;
    contagem[id].jogos++;
  });

  return Object.entries(contagem)
    .map(([jogadorId, dados]) => {
      const jogador = jogadores.find(j => j.id === jogadorId);
      const equipe = equipes.find(e => e.id === jogador?.equipeId);
      return { jogador, equipe, ...dados };
    })
    .filter(r => r.jogador)
    .sort((a, b) => b.mvps - a.mvps);
}

/* ==========================================================================
   7. ESTATÍSTICAS CONSOLIDADAS DE UM JOGADOR
   Usadas na ficha do jogador (jogador-detalhe.html)
   ========================================================================== */

function calcularEstatisticasJogador(jogadorId) {
  const partidas = DB.get(DB_KEYS.PARTIDAS).filter(p => p.status === 'Finalizada');
  let gols = 0, assistencias = 0, amarelos = 0, vermelhos = 0, jogos = 0, mvps = 0;
  const jogosSet = new Set();

  partidas.forEach(p => {
    let participou = false;
    (p.eventos || []).forEach(ev => {
      if (ev.jogadorId !== jogadorId) return;
      participou = true;
      if (ev.tipo === 'gol') gols++;
      if (ev.tipo === 'assistencia') assistencias++;
      if (ev.tipo === 'cartao_amarelo') amarelos++;
      if (ev.tipo === 'cartao_vermelho') vermelhos++;
    });
    if (participou) jogosSet.add(p.id);
    if (p.mvpJogadorId === jogadorId) mvps++;
  });

  jogos = jogosSet.size;
  return {
    jogos,
    gols,
    assistencias,
    amarelos,
    vermelhos,
    mvps,
    mediaGols: jogos > 0 ? (gols / jogos).toFixed(2) : '0.00',
    mediaAssistencias: jogos > 0 ? (assistencias / jogos).toFixed(2) : '0.00'
  };
}

/* ==========================================================================
   8. ESTATÍSTICAS CONSOLIDADAS DE UMA EQUIPE
   ========================================================================== */

function calcularEstatisticasEquipe(equipeId) {
  const partidas = DB.get(DB_KEYS.PARTIDAS).filter(
    p => p.status === 'Finalizada' && (p.mandanteId === equipeId || p.visitanteId === equipeId)
  );

  let v = 0, e = 0, d = 0, gp = 0, gc = 0, pts = 0;
  const historico = [];

  partidas.forEach(p => {
    const isMandante = p.mandanteId === equipeId;
    const gm = isMandante ? p.placarMandante : p.placarVisitante;
    const gc_ = isMandante ? p.placarVisitante : p.placarMandante;
    gp += Number(gm) || 0;
    gc += Number(gc_) || 0;
    if (gm > gc_) { v++; pts += 3; historico.push('win'); }
    else if (gm < gc_) { d++; historico.push('loss'); }
    else { e++; pts += 1; historico.push('draw'); }
  });

  const jogos = partidas.length;
  return {
    jogos, vitorias: v, empates: e, derrotas: d,
    golsPro: gp, golsContra: gc, saldo: gp - gc, pontos: pts,
    aproveitamento: jogos > 0 ? Math.round((pts / (jogos * 3)) * 100) : 0,
    historico: historico.slice(-5)
  };
}

/* ==========================================================================
   9. EXPORTAÇÃO PARA PDF / IMPRESSÃO
   ========================================================================== */

/**
 * Exporta a tabela de classificação de um campeonato como janela de impressão.
 * Não requer biblioteca externa — usa CSS print + window.print().
 * @param {string} campeonatoId
 */
function exportarClassificacaoPrint(campeonatoId) {
  const campeonato = DB.findById(DB_KEYS.CAMPEONATOS, campeonatoId);
  if (!campeonato) return;

  const classif = campeonato.modalidade === 'Futsal'
    ? calcularClassificacaoFutsal(campeonatoId)
    : calcularClassificacaoVolei(campeonatoId);

  const linhas = classif.map((t, i) => `
    <tr>
      <td>${i + 1}°</td>
      <td>${t.equipe?.nome || '—'}</td>
      <td>${t.jogos}</td>
      <td>${t.vitorias}</td>
      ${campeonato.modalidade === 'Futsal' ? `<td>${t.empates}</td>` : ''}
      <td>${t.derrotas}</td>
      ${campeonato.modalidade === 'Futsal' ? `<td>${t.golsPro}</td><td>${t.golsContra}</td><td>${t.saldo > 0 ? '+' : ''}${t.saldo}</td>` : `<td>${t.setsPro}</td><td>${t.setsContra}</td><td>${t.saldoSets > 0 ? '+' : ''}${t.saldoSets}</td>`}
      <td><strong>${t.pontos}</strong></td>
    </tr>
  `).join('');

  const headers = campeonato.modalidade === 'Futsal'
    ? '<th>Pos</th><th>Time</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>Pts</th>'
    : '<th>Pos</th><th>Time</th><th>J</th><th>V</th><th>D</th><th>SP</th><th>SC</th><th>SS</th><th>Pts</th>';

  const html = `
    <html><head><title>${campeonato.nome} — Classificação</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 13px; color: #000; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      p { color: #555; margin-bottom: 16px; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #111; color: #FFD400; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; }
      td { padding: 8px; border-bottom: 1px solid #ddd; }
      tr:nth-child(even) td { background: #f5f5f5; }
    </style></head>
    <body>
      <h1>${campeonato.nome}</h1>
      <p>Modalidade: ${campeonato.modalidade} &nbsp;|&nbsp; Temporada: ${campeonato.temporada || '—'} &nbsp;|&nbsp; Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>
      <table><thead><tr>${headers}</tr></thead><tbody>${linhas}</tbody></table>
    </body></html>
  `;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}

/**
 * Exporta os dados em JSON para backup/restauração.
 */
function exportarJSON() {
  const backup = {
    versao: SEED_VERSION,
    exportadoEm: new Date().toISOString(),
    equipes: DB.get(DB_KEYS.EQUIPES),
    jogadores: DB.get(DB_KEYS.JOGADORES),
    campeonatos: DB.get(DB_KEYS.CAMPEONATOS),
    partidas: DB.get(DB_KEYS.PARTIDAS)
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interjornadas-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exportado com sucesso!', 'success');
}

/**
 * Importa um backup JSON e restaura todos os dados.
 * @param {File} file
 */
function importarJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const dados = JSON.parse(e.target.result);
      if (!dados.equipes || !dados.jogadores) throw new Error('Arquivo inválido');
      DB.set(DB_KEYS.EQUIPES, dados.equipes || []);
      DB.set(DB_KEYS.JOGADORES, dados.jogadores || []);
      DB.set(DB_KEYS.CAMPEONATOS, dados.campeonatos || []);
      DB.set(DB_KEYS.PARTIDAS, dados.partidas || []);
      showToast('Dados restaurados com sucesso! Recarregando...', 'success');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      showToast('Erro ao importar: arquivo inválido ou corrompido.', 'error');
    }
  };
  reader.readAsText(file);
}
