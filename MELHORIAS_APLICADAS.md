# PontoPro: melhorias aplicadas e validação

## Alterações realizadas

1. **Sincronização offline com resolução parcial:** a fila local agora remove somente registros que o servidor confirma como armazenados ou já existentes. Erros permanecem na fila para nova tentativa e diagnóstico.
2. **Proteção contra duplicidade no lote:** o servidor trata uma única marcação por chave de idempotência durante cada lote.
3. **Validação de registros sincronizados:** valida empresa, funcionário pertencente à empresa, estabelecimento e tipo de marcação antes de gravar.
4. **Fila local mais segura:** falhas de gravação em `localStorage` são propagadas para a interface, evitando afirmar que a marcação ficou salva quando não ficou. A inclusão local também evita duplicar a mesma chave de idempotência.
5. **Recuperação de fila malformada:** quando o JSON da fila está corrompido, o sistema tenta preservar uma cópia para diagnóstico em vez de apagar silenciosamente o conteúdo original.
6. **Feedback de sincronização:** o painel diferencia conclusão total de sincronização parcial e informa quantos registros continuam pendentes.
7. **Data local no painel:** o filtro de registros do dia usa o calendário local do dispositivo, evitando divergências perto da meia-noite UTC.
8. **Indicadores do dashboard:** funcionários inativos não entram no total de ativos/ausentes. O indicador de atraso usa a jornada e a tolerância cadastradas, em vez de presumir que todos entram às 08:00.
9. **Arquivos ausentes restaurados:** arquivos de domínio e hook que estavam dentro do ZIP original incorporado foram recuperados para completar os imports do projeto.

## Validação

- O ZIP foi reaberto e a estrutura de arquivos foi conferida.
- A execução de `npm run lint` não pôde validar o projeto: o ambiente não tem as dependências instaladas (`vite/client` ausente) e a instalação de dependências excedeu o tempo disponível.
- Portanto, build e testes completos permanecem **não verificados**. Rode `npm install`, `npm run lint` e `npm run build` no seu computador antes de usar.

## Pendências críticas antes de produção

Este pacote ainda precisa de uma auditoria de segurança completa. A implementação atual apresenta sinais de protótipo, incluindo autenticação sem validação efetiva de senha no endpoint de login e endpoints que não demonstram autorização de sessão consistente. Não use dados reais de funcionários nem comercialize como sistema legalmente homologado até corrigir e testar autenticação, autorização no servidor, isolamento multiempresa, proteção de dados e requisitos aplicáveis ao REP-P/Portaria MTP 671/2021.
10. **Geolocalização sem coordenadas inventadas:** removi a posição padrão fictícia e o fallback que copiava as coordenadas da filial como se fossem do funcionário. Sem leitura real, o status agora é indisponível.
11. **Captura de foto sem biometria simulada:** a câmera captura uma imagem real quando disponível; removi o score facial fixo e a mensagem falsa de prova de vida. A imagem não equivale a reconhecimento facial.
12. **Validações no registro de ponto:** o endpoint de marcação confere vínculo funcionário/empresa, tipo de evento, data/hora e estabelecimento. A sincronização offline calcula o status geográfico com as coordenadas disponíveis em vez de marcar todos como dentro da cerca.
13. **Declarações regulatórias corrigidas:** removi números de INPI e mensagens de homologação/ICP-Brasil não comprovados. O termo técnico agora é um rascunho de revisão, e as exportações são identificadas como pendentes de validação oficial.
14. **Datas do dashboard:** os registros são comparados usando a data local do evento, evitando divergência de dia causada pela conversão UTC.
