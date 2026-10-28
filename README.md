# Painel de Dashboards (site estático)

## Testar localmente
    python3 -m http.server 8000     # depois abra http://localhost:8000
(Web Crypto exige HTTPS ou localhost; abrir o index.html direto do disco não funciona.)

Login de teste: `admin` / `admin123` — troque em `js/config.js` (hash + TOKEN_SECRET).

## Publicar
GitHub Pages: suba a pasta e ative Pages. Vercel: importe o repositório (sem build).

## Estrutura
- `js/config.js` credenciais e segredo · `js/store.js` leitura/atualização dos dados
- `js/auth.js` login e tokens assinados · `js/app.js` telas e registro de widgets
