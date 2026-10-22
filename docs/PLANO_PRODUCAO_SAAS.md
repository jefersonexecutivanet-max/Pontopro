# PontoPro: preparação para SaaS comercial

## Estado honesto desta entrega

O projeto ainda usa `src/db/storage.ts` com arquivo JSON local e possui endpoints antigos que não estão todos protegidos por sessão e autorização. Portanto, **não está pronto para receber dados reais de jornada nem ser anunciado como REP-P homologado**. A migração PostgreSQL deste pacote prepara as tabelas de assinatura, sessões, PIN individual, passkeys, política de evidências, pedidos LGPD e eventos de segurança; ela ainda precisa ser conectada ao backend antes de ser considerada ativa.

## Ordem obrigatória de implementação

1. Substituir armazenamento JSON por PostgreSQL gerenciado e migrations versionadas. Em Vercel, não usar o disco efêmero para dados persistentes.
2. Implementar login seguro e sessões `HttpOnly`, `Secure` em HTTPS, `SameSite`, CSRF, expiração e revogação; remover `x-user-id` e a variável global de usuário como fonte de autenticação.
3. Proteger **cada** endpoint no servidor com RBAC e `company_id` obtido da sessão, nunca confiando em `companyId` fornecido pelo navegador. O proprietário só administra empresas/licenças; administradores ficam limitados à própria empresa; funcionários acessam apenas os próprios dados.
4. Implementar bootstrap seguro do proprietário por variáveis de ambiente/secrets e hashing resistente de senha. Não gravar senha inicial no código, ZIP, `.env.example` ou banco em texto puro.
5. Criar fluxos reais de cadastro de empresa, administrador inicial, funcionários e PIN individual, com limitação de tentativas, bloqueio temporário e auditoria.
6. Conectar políticas por empresa: foto de rosto/local/ambas, exigência de permissão GPS, retenção e notificações. A permissão de localização é obrigatória para marcar; se concedida mas as coordenadas estiverem indisponíveis, registrar localização como indisponível sem inventar coordenadas.
7. Implementar passkeys/WebAuthn reais com desafio de uso único, validação de origem/RP ID, chave pública e contador; não usar IDs biométricos simulados.
8. Implementar cobrança por provedor, webhooks assinados e idempotentes, período de avaliação, limite de funcionários e suspensão sem apagar dados.
9. Testar backup/restauração, sincronização offline sem duplicidade, múltiplas empresas simultâneas, permissões reais em dispositivos, relógio alterado e recuperação de falhas.
10. Realizar avaliação jurídica/técnica da Portaria MTP nº 671/2021 e da LGPD. O código e a exportação AFD não equivalem a homologação ou conformidade automática.

## Hospedagem econômica

- Interface: Vercel pode ser usada no nível gratuito dentro dos limites vigentes.
- Banco: escolher PostgreSQL gerenciado com plano gratuito disponível na data da implantação, observando suspensão por inatividade, limites, backups e política de retenção.
- API: adaptar para funções serverless compatíveis com Vercel ou usar um serviço Node persistente. O `server.ts` atual inicia Express/Vite na porta 3000 e não vira automaticamente uma função serverless.
- Não prometer gratuidade permanente. Revisar limites, custos e política de dados do fornecedor antes de cadastrar empresas reais.

## Variáveis

Copie `.env.example` para `.env` somente em desenvolvimento. Em produção, cadastre segredos no painel da hospedagem. Nunca envie senhas, `SESSION_SECRET` ou `DATABASE_URL` no Git ou no ZIP.
