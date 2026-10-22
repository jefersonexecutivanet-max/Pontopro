# PontoPro: Plataforma de gestão de jornada

Documentos legais iniciais: [`docs/POLITICA_DE_PRIVACIDADE.md`](docs/POLITICA_DE_PRIVACIDADE.md) e [`docs/TERMOS_E_CONDICOES.md`](docs/TERMOS_E_CONDICOES.md). Os documentos também podem ser abertos pelos links no rodapé da aplicação. Complete a identificação do fornecedor e revise juridicamente antes da oferta comercial.

Aplicação full-stack React/TypeScript + Express para gestão de empresas, funcionários, jornadas, registros de ponto, correções, relatórios e sincronização offline. A interface foi mantida; a persistência local usa SQLite do Node.js e o sistema migra automaticamente o arquivo JSON antigo quando encontrado.

> **Limite importante:** esta entrega não constitui homologação REP-P, laudo de segurança, certificação jurídica ou garantia de conformidade com a Portaria MTP 671/2021/LGPD. Antes de usar para registros oficiais de trabalhadores, faça avaliação técnica/jurídica, teste em dispositivos reais e validação do leiaute de arquivos e comprovantes. Não habilitamos biometria falsa: a rota de cadastro biométrico responde indisponível até que WebAuthn/passkeys reais sejam integrados e verificados.

## Rodar localmente (Windows / VS Code)

Requisitos: Node.js **22.5 ou superior** (recomendado Node 24 LTS) e npm.

```powershell
npm install
npm run lint
npm test
npm run build
npm start
```

Abra `http://localhost:3000`. Não use a opção “Go Live” do Live Server; o backend Express atende a aplicação e a API.

## Primeiro acesso do proprietário

1. Na página de login, escolha **Acesso exclusivo do proprietário do PontoPro**.
2. Na primeira execução local, configure o e-mail do proprietário e uma senha com no mínimo 12 caracteres. Não há senha padrão.
3. Cadastre a empresa, CNPJ válido, endereço e coordenadas reais da matriz, além do primeiro administrador.
4. O administrador entra pela aba **Administrador da empresa** e cria os funcionários com credenciais individuais.

Em produção, a configuração inicial do proprietário deve ser feita por segredos do ambiente, porque a configuração via navegador é deliberadamente limitada ao próprio computador servidor:

- `NODE_ENV=production`
- `PONTOPRO_OWNER_EMAIL`: e-mail administrativo inicial
- `PONTOPRO_OWNER_PASSWORD`: senha forte com pelo menos 12 caracteres
- `PONTOPRO_DATA_DIR`: diretório persistente e protegido para os dados (opcional)
- `PORT`: porta de escuta (opcional)

No PowerShell, para testar o modo produção depois do build:

```powershell
$env:NODE_ENV = "production"
$env:PONTOPRO_OWNER_EMAIL = "seu-email-administrativo@dominio.com"
$env:PONTOPRO_OWNER_PASSWORD = "defina-uma-senha-forte-com-12-ou-mais-caracteres"
npm start
```

Não use valores de exemplo em produção. Cadastre segredos no painel seguro do provedor, não no Git nem no ZIP.

## Persistência, migração e backup

- Banco local: `data/pontopro.sqlite`; o estado da aplicação é gravado como payload JSON em uma linha SQLite, com transações e sincronização de escrita. É uma persistência robusta para uma única instância, não um esquema relacional para escalar horizontalmente.
- Se `data/pontopro.db.json` existir e o banco SQLite ainda estiver vazio, os dados são migrados automaticamente e o JSON antigo é preservado como `pontopro.db.json.migrated-backup`.
- O servidor cria snapshots locais diários em `data/backups/` e mantém até 30 arquivos diários. Isso não substitui backup externo; configure cópia criptografada para outro local e teste a restauração.
- **Hospedagem serverless/múltiplas instâncias:** SQLite local não é banco compartilhado. Antes de escalar horizontalmente ou usar Vercel Functions, implemente e valide o adaptador PostgreSQL gerenciado com transações e restrições de tenant. O arquivo SQL de referência não significa que essa integração esteja ativa.

## Segurança e papéis

- Dono: configura acesso inicial, cadastra empresas e suspende/reativa acessos.
- Administrador: gerencia a empresa autenticada.
- Gestor: funções de gestão limitadas; não pode criar administrador principal nem gerenciar filiais.
- Funcionário: acessa seus próprios registros e solicita correções.
- Auditor: somente leitura nas rotas permitidas.
- Senhas/PINs são armazenados com `scrypt`; as sessões atuais são tokens de portador em memória do processo, com expiração de 12 horas. Reiniciar o servidor encerra sessões. Para produção com várias instâncias, substituir por sessão compartilhada/revogável e revisar CSP, TLS, rotação de segredos, observabilidade e controles de abuso.

## Testes

```powershell
npm run lint
npm test
npm run build
```

A suíte cobre cálculos de jornada, licença, integridade/sincronização e validação de CNPJ. Esses testes unitários não substituem testes end-to-end, pen-test, teste de concorrência, teste de restauração nem auditoria regulatória.
