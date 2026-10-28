/* ==========================================================
 * config.js — configurações centrais (edite aqui)
 * ATENÇÃO: tudo neste arquivo é público para quem abrir o site.
 * Para gerar outro hash de senha, no console do navegador:
 *   crypto.subtle.digest('SHA-256', new TextEncoder().encode('nova-senha'))
 *     .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('')))
 * ========================================================== */
window.CONFIG = {
  ADMIN_USER: 'admin',
  // SHA-256 da senha. Padrão de teste: "admin123" — TROQUE antes de publicar.
  ADMIN_PASS_SHA256: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  // Segredo usado para assinar (HMAC) os tokens. TROQUE por uma string longa e aleatória.
  TOKEN_SECRET: 'troque-este-segredo-por-algo-longo-e-aleatorio-9f3a1c',
  // Opções de validade exibidas no painel
  TOKEN_DURATIONS: [
    { label: '1 hora', minutes: 60 },
    { label: '24 horas', minutes: 1440 },
    { label: '7 dias', minutes: 10080 }
  ]
};
