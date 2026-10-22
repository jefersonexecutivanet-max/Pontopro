# Estado da implementação

## Incluído nesta versão

- Painel separado do proprietário com configuração inicial, login, cadastro de empresas, primeiro administrador e suspensão/reativação.
- Hashing de credenciais com `scrypt` e comparação em tempo constante.
- Sessões bearer com expiração e bloqueio temporário de tentativas de login.
- Validações de autorização por papel nos endpoints de gestão e consultas limitadas à empresa da sessão.
- CNPJ numérico e alfanumérico com validação dos dígitos verificadores.
- Persistência local SQLite transacional usando `node:sqlite` (estado serializado em uma linha, para instância única); migração do antigo arquivo JSON sem apagá-lo; snapshots locais diários com retenção limitada.
- Modo de produção serve `dist/` e exige configuração segura do proprietário via variáveis de ambiente se a conta ainda não existir.
- Rota biométrica não marca templates fictícios como cadastro real: retorna indisponível até integração WebAuthn validada.
- Testes unitários para regras de jornada, licença, sincronização e CNPJ.

## Limites que continuam exigindo trabalho técnico externo antes do uso comercial

1. **PostgreSQL multi-instância:** não integrado ao backend atual. SQLite é apropriado para uma única instância persistente, não para várias funções serverless ou múltiplos servidores gravando no mesmo arquivo.
2. **WebAuthn/passkeys:** a biometria real não está ativa. A interface/endpoint não devem ser apresentados como biometria implementada.
3. **Cobrança SaaS:** não há provedor de pagamentos, webhook de cobrança assinado, planos pagos ou reconciliação financeira implementados.
4. **Sessões distribuídas:** os tokens são mantidos em memória e expiram em 12 horas; não sobrevivem a reinicializações e não são compartilhados entre instâncias.
5. **Backup externo e recuperação:** os snapshots locais ajudam a recuperação no mesmo servidor, mas não substituem cópias externas, criptografadas e testadas.
6. **Conformidade legal:** exportações e comprovantes existentes são internos até validação do leiaute oficial, enquadramento do sistema, documentos e procedimentos exigidos pela Portaria MTP 671/2021. Nenhuma alegação de homologação/certificação é feita.
7. **LGPD:** precisa de definição jurídica de bases legais, finalidade, prazos de retenção, contratos controlador-operador, fluxo de direitos do titular, gestão de incidentes e avaliação de impacto para geolocalização/fotografias.
8. **Segurança operacional:** antes de dados reais, executar testes end-to-end em Chrome/Android/iOS, análise de dependências, teste de concorrência, recuperação de backups e pentest independente.

## Como verificar localmente

```powershell
npm install
npm run lint
npm test
npm run build
npm start
```

A compilação/testes precisam ser executados no ambiente de instalação com dependências instaladas. A existência de código ou de testes unitários não equivale à aprovação de todos os fluxos de produção.

## Verificações executadas neste ambiente

- Transpilação sintática de 44 arquivos TypeScript/TSX: sem diagnósticos sintáticos.
- Testes unitários de lógica: 31 passaram, 0 falharam.
- Teste de fumaça SQLite: criação atômica de empresa/filial/jornada/administrador/auditoria e persistência após reiniciar o processo passaram.
- Build Vite e typecheck completo: não foram confirmados neste ambiente porque as dependências npm não puderam ser instaladas aqui; execute `npm install`, `npm run lint`, `npm test` e `npm run build` na máquina de desenvolvimento antes de publicar.
