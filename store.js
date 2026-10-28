/* ==========================================================
 * store.js — camada de dados (leitura e atualização do JSON)
 * Ordem de leitura: localStorage (edições do admin) → data/data.json → SEED embutido.
 * O SEED garante funcionamento ao abrir o index.html direto do disco (file://),
 * onde fetch() é bloqueado pelo navegador.
 * ========================================================== */
const Store = (() => {
  const KEY = 'dash.data.v1';
  const SEED = {
    kpis: [
      { label: 'Receita no mês', value: 'R$ 128,4 mil', delta: 8.2 },
      { label: 'Novos clientes', value: '312', delta: 3.1 },
      { label: 'Taxa de conversão', value: '4,6%', delta: -0.4 },
      { label: 'Tickets abertos', value: '27', delta: -12.0 }
    ],
    revenueByMonth: [
      { m: 'Mai', v: 82 }, { m: 'Jun', v: 91 }, { m: 'Jul', v: 88 },
      { m: 'Ago', v: 104 }, { m: 'Set', v: 119 }, { m: 'Out', v: 128 }
    ],
    recent: [
      { cliente: 'Alfa Logística', plano: 'Business', valor: 4200, status: 'Pago' },
      { cliente: 'Beta Saúde', plano: 'Starter', valor: 890, status: 'Pendente' },
      { cliente: 'Gama Educação', plano: 'Enterprise', valor: 12800, status: 'Pago' }
    ]
  };
  let cache = null;

  /** Carrega os dados (com cache em memória). */
  async function load() {
    if (cache) return cache;
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) return (cache = JSON.parse(saved));
    } catch { /* JSON corrompido: ignora e segue */ }
    try {
      const res = await fetch('data/data.json', { cache: 'no-store' });
      if (res.ok) return (cache = await res.json());
    } catch { /* offline ou file:// */ }
    return (cache = structuredClone(SEED));
  }

  /** Substitui todos os dados e persiste. */
  function save(data) {
    cache = data;
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  /** Atualização imutável: update(d => { d.kpis[0].value = '10' }) */
  function update(mutator) {
    const next = structuredClone(cache);
    mutator(next);
    save(next);
    return next;
  }

  /** Descarta edições locais e volta ao data/data.json. */
  function reset() {
    localStorage.removeItem(KEY);
    cache = null;
  }

  return { load, save, update, reset, get data() { return cache; } };
})();
