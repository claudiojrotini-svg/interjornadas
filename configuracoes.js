/* ==========================================================================
   INTERJORNADAS CASCAVEL — configuracoes.js
   Backup/restauração (JSON), uso de armazenamento, dados de demonstração
   e limpeza total dos dados.
   Depende de: app.js, ranking.js (exportarJSON / importarJSON)
   ========================================================================== */

'use strict';

function renderPaginaConfiguracoes() {
  const root = document.getElementById('pageContentRoot');

  const equipes = DB.get(DB_KEYS.EQUIPES).length;
  const jogadores = DB.get(DB_KEYS.JOGADORES).length;
  const campeonatos = DB.get(DB_KEYS.CAMPEONATOS).length;
  const partidas = DB.get(DB_KEYS.PARTIDAS).length;
  const tamanhoKB = calcularTamanhoArmazenamento();

  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="eyebrow">Sistema</div>
        <h1>Configurações</h1>
        <p>Backup, restauração e informações do sistema.</p>
      </div>
    </div>

    <div class="section-block">
      <h2 class="section-title">💾 Backup e Restauração</h2>
      <div class="card card-pad">
        <p style="font-size:.85rem;color:var(--color-gray-300);margin-bottom:16px">
          Exporte todos os dados (equipes, jogadores, campeonatos e partidas) em um arquivo JSON para guardar como backup, ou restaure um backup salvo anteriormente.
        </p>
        <div class="flex gap-3" style="flex-wrap:wrap">
          <button class="btn btn-primary" onclick="exportarJSON()">⬇️ Exportar Backup (JSON)</button>
          <label class="btn btn-secondary" style="cursor:pointer">
            ⬆️ Importar Backup (JSON)
            <input type="file" accept="application/json" style="display:none" id="importFileInput">
          </label>
        </div>
      </div>
    </div>

    <div class="section-block">
      <h2 class="section-title">📊 Uso de Armazenamento</h2>
      <div class="card card-pad">
        <div class="flex gap-5" style="flex-wrap:wrap">
          <div><div class="stat-number" style="font-size:1.3rem">${equipes}</div><div class="text-muted" style="font-size:.72rem">Equipes</div></div>
          <div><div class="stat-number" style="font-size:1.3rem">${jogadores}</div><div class="text-muted" style="font-size:.72rem">Jogadores</div></div>
          <div><div class="stat-number" style="font-size:1.3rem">${campeonatos}</div><div class="text-muted" style="font-size:.72rem">Campeonatos</div></div>
          <div><div class="stat-number" style="font-size:1.3rem">${partidas}</div><div class="text-muted" style="font-size:.72rem">Partidas</div></div>
          <div><div class="stat-number" style="font-size:1.3rem;color:var(--color-yellow)">${tamanhoKB} KB</div><div class="text-muted" style="font-size:.72rem">Usado neste navegador</div></div>
        </div>
        <p class="form-hint" style="margin-top:14px">Os dados ficam salvos apenas neste navegador (LocalStorage). Limpar o cache/dados do navegador apaga tudo — faça backups regularmente, especialmente antes de trocar de computador.</p>
      </div>
    </div>

    <div class="section-block">
      <h2 class="section-title">🌱 Dados de Demonstração</h2>
      <div class="card card-pad">
        <p style="font-size:.85rem;color:var(--color-gray-300);margin-bottom:16px">
          Restaura o sistema com as equipes, jogadores, campeonatos e partidas de exemplo usados para demonstração. Isso substitui todos os dados atuais.
        </p>
        <button class="btn btn-secondary" onclick="confirmarRestaurarDemo()">🌱 Restaurar Dados de Exemplo</button>
      </div>
    </div>

    <div class="section-block">
      <h2 class="section-title" style="color:var(--color-loss)">⚠️ Zona de Perigo</h2>
      <div class="card card-pad" style="border-color:rgba(231,76,60,.3)">
        <p style="font-size:.85rem;color:var(--color-gray-300);margin-bottom:16px">
          Remove permanentemente todas as equipes, jogadores, campeonatos e partidas. Esta ação não pode ser desfeita — exporte um backup antes, se necessário.
        </p>
        <button class="btn btn-danger" onclick="confirmarLimparTudo()">🗑️ Limpar Todos os Dados</button>
      </div>
    </div>

    <div class="section-block">
      <div class="card card-pad" style="text-align:center;background:var(--color-black-soft)">
        <div class="brand-mark" style="margin:0 auto 12px;width:44px;height:44px;font-size:1.2rem">IJ</div>
        <h3 style="text-transform:none">InterJornadas Cascavel</h3>
        <p class="text-muted" style="font-size:.8rem;margin-top:4px">Sistema de gerenciamento de campeonatos esportivos</p>
        <p class="text-muted" style="font-size:.72rem;margin-top:10px">HTML5 · CSS3 · JavaScript puro · LocalStorage · v1.0</p>
      </div>
    </div>
  `;

  document.getElementById('importFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    confirmAction({
      title: 'Restaurar Backup',
      message: `Importar "${file.name}"? Isso substituirá todos os dados atuais.`,
      confirmLabel: 'Sim, importar',
      onConfirm: () => importarJSON(file)
    });
    e.target.value = ''; // permite reimportar o mesmo arquivo depois, se necessário
  });
}

function confirmarRestaurarDemo() {
  confirmAction({
    title: 'Restaurar Dados de Exemplo',
    message: 'Isso substituirá todos os dados atuais pelos dados de demonstração. Deseja continuar?',
    confirmLabel: 'Sim, restaurar',
    onConfirm: () => {
      // Zera tudo e força o seed a rodar de novo do zero
      DB.set(DB_KEYS.EQUIPES, []);
      DB.set(DB_KEYS.JOGADORES, []);
      DB.set(DB_KEYS.CAMPEONATOS, []);
      DB.set(DB_KEYS.PARTIDAS, []);
      localStorage.removeItem(DB_PREFIX + DB_KEYS.SEED_VERSION);
      seedDatabaseIfNeeded();
      showToast('Dados de exemplo restaurados! Redirecionando...', 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 900);
    }
  });
}

function confirmarLimparTudo() {
  confirmAction({
    title: 'Limpar Todos os Dados',
    message: 'Tem certeza? TODAS as equipes, jogadores, campeonatos e partidas serão excluídos permanentemente.',
    confirmLabel: 'Sim, limpar tudo',
    onConfirm: () => {
      DB.set(DB_KEYS.EQUIPES, []);
      DB.set(DB_KEYS.JOGADORES, []);
      DB.set(DB_KEYS.CAMPEONATOS, []);
      DB.set(DB_KEYS.PARTIDAS, []);
      // Marca o seed como já executado para não repopular sozinho no próximo load
      localStorage.setItem(DB_PREFIX + DB_KEYS.SEED_VERSION, JSON.stringify(SEED_VERSION));
      showToast('Todos os dados foram removidos.', 'info');
      setTimeout(() => { window.location.href = 'index.html'; }, 700);
    }
  });
}

/**
 * Calcula o espaço aproximado (em KB) que os dados do sistema ocupam no
 * LocalStorage, somando o tamanho em caracteres de todas as chaves salvas.
 */
function calcularTamanhoArmazenamento() {
  let total = 0;
  Object.values(DB_KEYS).forEach(key => {
    const raw = localStorage.getItem(DB_PREFIX + key);
    if (raw) total += raw.length;
  });
  return (total / 1024).toFixed(1);
}
