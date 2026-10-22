# PontoPro — integração de assinaturas Asaas

## Planos iniciais

- Prata: R$ 149,90/mês, até 100 funcionários ativos.
- Ouro: R$ 399,90/mês, até 500 funcionários ativos.
- Diamante: R$ 699,90/mês, até 1.000 funcionários ativos.

Valores iniciais sugeridos; validar custos, tributos, tarifas e condições comerciais antes da produção.

## Estado desta integração

A implementação cria clientes e assinaturas pela API Asaas, mantém o estado no payload SQLite persistente, expõe uma tela Plano e Cobrança para administradores principais, limita novas contas de funcionário no servidor e aceita eventos de cobrança/assinatura via webhook. A assinatura começa como `pending`; ela não se torna `active` apenas porque foi criada. O webhook autenticado é o caminho para confirmar pagamento. O cancelamento é solicitado ao provedor e permanece `canceling` até a confirmação do webhook.

O sistema ainda usa armazenamento SQLite em uma única instância. Não publique em arquitetura serverless/multi-instância sem migrar billing, sessões e demais dados para banco compartilhado.

## Configuração segura

1. Crie conta Asaas e use o Sandbox primeiro: https://docs.asaas.com/
2. Configure no ambiente do servidor `ASAAS_ENVIRONMENT=sandbox`, `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN`. Não coloque credenciais no frontend, Git, ZIP público ou `.env.example`.
3. No painel Asaas, configure um webhook apontando para `https://SEU_DOMINIO/api/billing/webhook/asaas`, com o token do webhook igual a `ASAAS_WEBHOOK_TOKEN`. Habilite eventos de cobrança e assinatura.
4. Teste pagamento confirmado, vencido, assinatura inativada, duplicação do mesmo evento, falha de API, cancelamento e reenvio de webhook.
5. Só mude para `ASAAS_ENVIRONMENT=production` depois de validar domínio HTTPS, credenciais de produção, webhook real, logs e conciliação.

## Endpoints

- `GET /api/billing/plans`: catálogo público.
- `GET /api/billing/subscription`: assinatura da empresa autenticada (somente company_admin).
- `POST /api/billing/subscription`: cria assinatura, corpo `{ "plan": "prata|ouro|diamante", "billing_type": "BOLETO|CREDIT_CARD" }`.
- `POST /api/billing/subscription/cancel`: solicita cancelamento da assinatura atual.
- `POST /api/billing/webhook/asaas`: recebe eventos do Asaas; exige header `asaas-access-token`.
- `GET /api/owner/billing`: visão de assinaturas para o proprietário do SaaS.

## Segurança e limites

- A chave Asaas só é usada no servidor. O token do webhook é independente da chave de API.
- Webhooks repetidos são identificados pelo `id` do evento; o processamento é idempotente.
- Não considerar o redirecionamento de checkout nem a criação da assinatura como prova de pagamento.
- Novos funcionários são bloqueados no servidor quando o limite do plano é atingido; funcionários existentes não são apagados por upgrade/downgrade.
- Empresas legadas sem plano explícito usam temporariamente o limite Diamante para evitar bloquear cadastros existentes; atribua o plano comercial correto antes de migrar essas empresas para cobrança.
- O provedor pode ter regras, tarifas, análise cadastral e recursos diferentes por conta. Esta integração deve ser homologada no Sandbox e validada com o Asaas antes de cobrar clientes reais.
