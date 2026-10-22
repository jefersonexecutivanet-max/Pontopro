# Correção de dependências do PontoPro

Foi corrigida a versão direta do `esbuild` no `package.json` de `^0.25.0` para `^0.28.2`, compatível com o peer dependency opcional declarado pelo Vite 8 (`^0.27.0 || ^0.28.0`).

## Instalação no Windows PowerShell

Abra o PowerShell nesta pasta e execute:

```powershell
npm install
npm run lint
npm run build
npm start
```

Se existir um `node_modules` de uma instalação anterior que falhou, feche o servidor e remova-o antes de tentar novamente:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
```

Não use `--force` ou `--legacy-peer-deps` como primeira solução: isso pode ocultar incompatibilidades reais.

A correção do `package.json` resolve o conflito de versões identificado no log fornecido, mas o build e os testes precisam ser executados no ambiente do usuário para confirmar a instalação completa.
