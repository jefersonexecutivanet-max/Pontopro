# PontoPro: versão consolidada 2.5.0

## Implementado nesta versão

- Painel do proprietário separado do login de empresa/funcionário, com primeiro acesso, login, cadastro de empresa e administrador inicial, suspensão e reativação de empresa.
- Senhas/PINs armazenados com `scrypt`; tokens de sessão bearer expiram em 12 horas e tentativas de login são limitadas temporariamente.
- Controle adicional de permissões por papel nos endpoints de cadastro de funcionários, filiais, correções, relatórios e licença.
- Respostas de empresa para usuários da empresa ocultam a chave interna de licença.
- CNPJ numérico e alfanumérico validado; horários do arquivo exportado formatados explicitamente no fuso `America/Sao_Paulo`.
- Persistência local em SQLite usando transações para salvar o estado, migração do JSON anterior sem apagar o arquivo original e snapshots locais diários com retenção limitada.
- Criação inicial de empresa, filial, jornada, administrador e auditoria em uma única gravação transacional.
- Servidor em modo produção serve `dist/` e exige credenciais iniciais do proprietário via segredos de ambiente quando a conta ainda não existe.
- Cadastro biométrico fictício removido da interface e bloqueado no servidor até implementação e verificação de WebAuthn/passkeys reais.
- Removida a função de inserir marcações offline falsas de demonstração.
- Testes unitários para regras de jornada, hash interno, sincronização, licença e CNPJ.

## Verificações realizadas

- Transpilação sintática de 44 arquivos TypeScript/TSX: nenhum diagnóstico sintático.
- Testes unitários executados: 31 passaram, 0 falharam.
- Teste de persistência SQLite: criação atômica de empresa/filial/jornada/administrador/auditoria e preservação após reinício passaram.
- O build Vite e o typecheck completo não puderam ser executados neste ambiente porque a instalação das dependências npm não foi concluída. Execute `npm install`, `npm run lint`, `npm test` e `npm run build` na máquina onde o sistema será instalado.

## Limitações que impedem afirmar que está pronto para comercialização

1. O armazenamento atual é um payload serializado em SQLite para **uma única instância persistente**. O adaptador PostgreSQL compartilhado para serverless/múltiplas instâncias não está conectado.
2. Sessões são mantidas em memória do processo; reiniciar o servidor encerra as sessões e várias instâncias não compartilham sessões.
3. WebAuthn/passkeys não está ativo. O sistema usa foto de evidência, não reconhecimento facial.
4. Planos comerciais, cobrança recorrente, integração com gateway de pagamento, webhooks e reconciliação não estão implementados.
5. Snapshots de backup são locais. Backup externo criptografado e teste de restauração precisam ser configurados.
6. A exportação AFD e os comprovantes contêm implementações internas e não foram validados contra todos os requisitos oficiais aplicáveis. SHA-256 interno não é assinatura digital ICP-Brasil nem homologação REP-P.
7. Conformidade com a Portaria MTP 671/2021, LGPD, bases legais, retenção de fotos/GPS, documentos técnicos e procedimentos trabalhistas exige validação técnica e jurídica especializada.
8. Testes de ponta a ponta, pen-test, concorrência, dispositivos reais, recuperação de falhas e monitoramento de produção ainda precisam ser executados.

**Não cadastre dados reais de empregados nem comercialize a plataforma como REP-P homologado até resolver as limitações acima.**


## Revisão visual e documentos legais (22/10/2026)

- Login com texto direto sobre o que o sistema faz, sem alegação de certificação ou métricas promocionais.
- Removidos gradientes da interface e animações pulsantes decorativas; botões que usavam formato de pílula passaram a ter cantos discretamente arredondados.
- Removida a indicação de “100% cadastrados” e alterado o estado de integridade para uma descrição do resultado efetivamente verificado.
- Incluídos documentos de Política de Privacidade e Termos e Condições no rodapé do login e na área autenticada, além de versões Markdown em `docs/`.
- Os documentos legais são uma base inicial, não um parecer jurídico. Antes da publicação comercial, preencher os dados oficiais do fornecedor, confirmar práticas reais de tratamento e hospedagem e obter revisão jurídica.
- Validação desta revisão: transpilação sintática de 44 arquivos TS/TSX sem diagnósticos e 31 testes unitários aprovados. A compilação Vite e a checagem completa de tipos não foram executadas nesta sessão porque as dependências do projeto não estão instaladas no ambiente de trabalho.


## Integração inicial de assinaturas (Asaas — Sandbox)

Foi adicionada uma integração de servidor para assinatura recorrente com Asaas, catálogo de planos, painel Plano e Cobrança para administradores principais, painel interno de status para o proprietário, endpoint de webhook com token independente, deduplicação de eventos, cancelamento e limite de funcionários validado no backend. A integração usa boleto nesta etapa; cartão não é habilitado sem fluxo seguro de captura e homologação.

Planos: Prata R$ 149,90/100 funcionários; Ouro R$ 399,90/500; Diamante R$ 699,90/1.000. A assinatura fica pendente até confirmação por webhook. Configure `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` e `ASAAS_ENVIRONMENT=sandbox` em ambiente seguro. `BILLING_ENFORCEMENT_ENABLED` permanece `false` por padrão e só deve ser ativado após testes ponta a ponta e configuração HTTPS/webhook.

Validação pendente nesta entrega: `npm ci`, lint, testes completos e build precisam ser executados no ambiente do projeto; a instalação de dependências não terminou neste ambiente. Testar no Sandbox eventos duplicados, pagamentos confirmados/em atraso, cancelamento, erro do provedor, limites em concorrência e recuperação após reinício. Não considerar pronto para cobrança real até a validação operacional e comercial.
