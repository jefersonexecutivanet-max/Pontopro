# Correções aplicadas — PontoPro

## Alterações

- A inicialização agora verifica se há token de sessão antes de consultar `/api/auth/me`, evitando a chamada sem autenticação quando o usuário está deslogado.
- Uma sessão inválida/expirada é removida do `sessionStorage` e a interface pede novo login; a autenticação do servidor não foi desativada.
- Corrigido o tipo dos campos de latitude e longitude no formulário de filiais: os inputs numéricos mantêm texto durante a digitação e são convertidos para número ao enviar o formulário.
- Corrigido o nome do plano de cadastro para **Prata**.
- O código-fonte atual não contém a referência `handleSimulateTestOfflinePunch`. O erro reportado corresponde a um bundle antigo/diferente do código-fonte recebido; por isso, o diretório `dist` não acompanha este pacote e deve ser reconstruído localmente.

## Instalação e verificação no Windows

Extraia o pacote numa pasta de trabalho. Preserve a pasta `data` da instalação atual, pois ela contém o banco local e a configuração do proprietário. Não substitua nem apague seus dados sem backup.

No terminal do VS Code, dentro da pasta do projeto, execute:

```powershell
npm ci
npm run lint
npm test
npm run build
npm start
```

Se `npm ci` falhar, guarde a mensagem completa e não apague `package-lock.json`.

## Sobre os HTTP 401

- `/api/auth/me` sem sessão é uma situação normal de usuário deslogado. O frontend agora evita essa chamada se não existir token.
- `/api/auth/login` com `401` significa que o servidor recusou matrícula/e-mail e senha/PIN. Não é seguro ignorar esse resultado ou desativar autenticação. Confira o tipo de acesso selecionado e use as credenciais correspondentes.
- O acesso do proprietário é separado: use **Acesso exclusivo do proprietário do PontoPro** na tela de login, e não o formulário de funcionário/administrador da empresa.
