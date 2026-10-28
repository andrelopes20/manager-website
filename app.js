/* ==========================================================
 * app.js — roteamento, widgets e telas
 * Fluxo de boot:
 *   1) URL tem ?token=&exp=  → valida → convidado (somente leitura)
 *   2) Sessão de admin ativa → admin
 *   3) Caso contrário        → tela de login
 * ========================================================== */
(() => {
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = ts => new Date(ts).toLocaleString('pt-BR');

  let role = null;          // 'admin' | 'guest'
  let current = 'overview';

  /* ---------- Registro de widgets ----------
   * Para adicionar um gráfico/métrica novo: inclua um objeto aqui.
   * span = colunas do grid (1–12). render(data) devolve HTML. */
  const WIDGETS = [
    { id: 'kpis', span: 0, render: d => d.kpis.map(k => `
        <article class="card span-3">
          <span class="muted">${esc(k.label)}</span>
          <div class="kpi__value">${esc(k.value)}</div>
          <span class="${k.delta >= 0 ? 'up' : 'down'}">${k.delta >= 0 ? '+' : ''}${k.delta.toLocaleString('pt-BR')}% vs. mês anterior</span>
        </article>`).join('') },
    { id: 'revenue', span: 8, title: 'Receita por mês (R$ mil)', render: d => barChart(d.revenueByMonth) },
    { id: 'slot-a', span: 4, title: 'Próximo gráfico', render: () => '<div class="slot">Slot livre: adicione um widget em WIDGETS</div>' },
    { id: 'recent', span: 12, title: 'Últimas cobranças', render: d => `
        <div class="table-wrap"><table>
          <thead><tr><th>Cliente</th><th>Plano</th><th>Valor</th><th>Status</th></tr></thead>
          <tbody>${d.recent.map(r => `<tr><td>${esc(r.cliente)}</td><td>${esc(r.plano)}</td><td>${brl(r.valor)}</td><td>${esc(r.status)}</td></tr>`).join('')}</tbody>
        </table></div>` }
  ];

  /** Gráfico de barras em SVG puro (troque por Chart.js/ECharts quando quiser). */
  function barChart(rows) {
    if (!rows.length) return '<p class="muted">Sem dados.</p>';
    const W = 560, H = 200, pad = 24, max = Math.max(...rows.map(r => r.v));
    const bw = (W - pad * 2) / rows.length;
    const bars = rows.map((r, i) => {
      const h = (r.v / max) * (H - pad * 2), x = pad + i * bw + bw * .15;
      return `<rect x="${x}" y="${H - pad - h}" width="${bw * .7}" height="${h}" rx="4"><title>${esc(r.m)}: ${r.v}</title></rect>
              <text x="${x + bw * .35}" y="${H - 6}" text-anchor="middle">${esc(r.m)}</text>`;
    }).join('');
    return `<svg class="bars" viewBox="0 0 ${W} ${H}" role="img" aria-label="Receita por mês" width="100%">${bars}</svg>`;
  }

  /* ---------- Telas ---------- */
  const VIEWS = {
    overview: { title: 'Visão geral', render: () => `<div class="grid">${renderWidgets()}</div>` },
    reports: {
      title: 'Relatórios',
      render: () => `<div class="grid">${['Vendas', 'Usuários', 'Operação', 'Financeiro'].map(t =>
        `<article class="card slot span-6"><div><h3>${t}</h3><p>Espaço reservado para gráficos e métricas.</p></div></article>`).join('')}</div>`
    },
    admin: { title: 'Administração', adminOnly: true, render: renderAdmin, after: bindAdmin }
  };

  function renderWidgets() {
    const d = Store.data;
    return WIDGETS.map(w => w.span === 0 ? w.render(d)
      : `<article class="card span-${w.span}"><h3>${esc(w.title)}</h3>${w.render(d)}</article>`).join('');
  }

  function renderAdmin() {
    const opts = CONFIG.TOKEN_DURATIONS.map(o => `<option value="${o.minutes}">${esc(o.label)}</option>`).join('');
    return `
      <article class="card">
        <h3>Gerar link de acesso temporário</h3>
        <p class="muted">Quem abrir o link vê os dashboards (sem o painel de administração) até o link expirar.</p>
        <div class="row">
          <label>Validade <select id="dur">${opts}</select></label>
          <button id="gen" class="btn btn--primary">Gerar link</button>
        </div>
        <div id="gen-out" hidden class="row" style="margin-top:.8rem">
          <input id="gen-url" readonly aria-label="Link gerado">
          <button id="copy" class="btn">Copiar</button>
        </div>
        <ul id="links" class="link-list"></ul>
      </article>
      <article class="card">
        <h3>Dados dos dashboards (JSON)</h3>
        <p class="muted">Edições ficam no localStorage deste navegador. Para publicar para todos, copie o JSON para <code>data/data.json</code> e faça commit.</p>
        <textarea id="json" spellcheck="false" aria-label="Editor de dados">${esc(JSON.stringify(Store.data, null, 2))}</textarea>
        <p id="json-msg" class="muted" role="status"></p>
        <div class="row"><button id="save" class="btn btn--primary">Salvar dados</button><button id="reset" class="btn">Restaurar data.json</button></div>
      </article>`;
  }

  /* Histórico local de links gerados (só para conveniência do admin) */
  const LINKS_KEY = 'dash.links';
  const getLinks = () => { try { return JSON.parse(localStorage.getItem(LINKS_KEY)) || []; } catch { return []; } };

  function paintLinks() {
    const ul = $('#links'); if (!ul) return;
    ul.innerHTML = getLinks().map(l => `<li><code>${esc(l.url)}</code><span class="${Date.now() > l.exp ? 'down' : 'up'}">${Date.now() > l.exp ? 'expirado' : 'até ' + fmtDate(l.exp)}</span></li>`).join('');
  }

  function bindAdmin() {
    paintLinks();
    $('#gen').onclick = async () => {
      const link = await Auth.createShareLink(Number($('#dur').value));
      localStorage.setItem(LINKS_KEY, JSON.stringify([link, ...getLinks()].slice(0, 8)));
      $('#gen-url').value = link.url; $('#gen-out').hidden = false; paintLinks();
    };
    $('#copy').onclick = async () => {
      try { await navigator.clipboard.writeText($('#gen-url').value); $('#copy').textContent = 'Copiado'; }
      catch { $('#gen-url').select(); }
    };
    $('#save').onclick = () => {
      try { Store.save(JSON.parse($('#json').value)); $('#json-msg').textContent = 'Dados salvos.'; }
      catch (e) { $('#json-msg').textContent = 'JSON inválido: ' + e.message; }
    };
    $('#reset').onclick = async () => { Store.reset(); await Store.load(); go('admin'); };
  }

  /* ---------- Navegação ---------- */
  function go(id) {
    const v = VIEWS[id]; if (!v || (v.adminOnly && role !== 'admin')) return;
    current = id;
    $('#view-title').textContent = v.title;
    $('#view').innerHTML = v.render();
    v.after && v.after();
    $('#nav').querySelectorAll('.nav-item').forEach(b =>
      b.dataset.id === id ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
    $('#sidebar').classList.remove('open');
  }

  async function startApp() {
    await Store.load();
    $('#login-view').hidden = true; $('#app-view').hidden = false;
    $('#role-badge').textContent = role === 'admin' ? 'Administrador' : 'Convidado';
    $('#nav').innerHTML = Object.entries(VIEWS).filter(([, v]) => !v.adminOnly || role === 'admin')
      .map(([id, v]) => `<button class="nav-item" data-id="${id}">${esc(v.title)}</button>`).join('');
    go('overview');
  }

  function showLogin(msg) {
    $('#app-view').hidden = true; $('#login-view').hidden = false;
    const err = $('#login-error'); err.hidden = !msg; err.textContent = msg || '';
  }

  /* ---------- Eventos globais ---------- */
  $('#nav').addEventListener('click', e => { const b = e.target.closest('.nav-item'); if (b) go(b.dataset.id); });
  $('#menu-btn').onclick = () => $('#sidebar').classList.toggle('open');
  $('#logout').onclick = () => { Auth.logout(); location.href = location.pathname; };
  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (await Auth.loginAdmin($('#login-user').value.trim(), $('#login-pass').value)) { role = 'admin'; startApp(); }
    else showLogin('Usuário ou senha incorretos.');
  });

  /* ---------- Boot ---------- */
  (async function boot() {
    if (!window.crypto?.subtle) return showLogin('Abra o site via HTTPS ou localhost (Web Crypto indisponível).');
    const p = new URLSearchParams(location.search);
    if (p.has('token')) {
      const r = await Auth.verifyToken(p.get('token'), p.get('exp'));
      if (r.ok) { role = 'guest'; return startApp(); }
      return showLogin(r.reason);
    }
    if (Auth.isAdminSession()) { role = 'admin'; return startApp(); }
    showLogin();
  })();
})();
