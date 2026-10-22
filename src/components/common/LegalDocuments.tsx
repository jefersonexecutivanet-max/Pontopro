import React from 'react';
import { X, ShieldCheck, FileText } from 'lucide-react';

export type LegalDocumentType = 'privacy' | 'terms';

interface LegalDocumentsProps {
  type: LegalDocumentType;
  onClose: () => void;
  onChangeType: (type: LegalDocumentType) => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-6">
    <h3 className="mb-2 text-base font-semibold text-slate-900">{title}</h3>
    <div className="space-y-2 text-sm leading-6 text-slate-600">{children}</div>
  </section>
);

export const LegalDocuments: React.FC<LegalDocumentsProps> = ({ type, onClose, onChangeType }) => {
  const isPrivacy = type === 'privacy';
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="legal-document-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-slate-100 p-2 text-slate-700">{isPrivacy ? <ShieldCheck size={20} /> : <FileText size={20} />}</div>
            <div>
              <h2 id="legal-document-title" className="text-lg font-semibold text-slate-950">{isPrivacy ? 'Política de Privacidade' : 'Termos e Condições de Uso'}</h2>
              <p className="mt-1 text-xs text-slate-500">PontoPro · versão 1.0 · 22 de outubro de 2026</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar documento" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><X size={18} /></button>
        </header>
        <nav className="flex gap-2 border-b border-slate-200 px-5 py-3 sm:px-7" aria-label="Documentos legais">
          <button type="button" onClick={() => onChangeType('privacy')} aria-pressed={isPrivacy} className={`rounded-md border px-3 py-2 text-sm font-medium ${isPrivacy ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Política de Privacidade</button>
          <button type="button" onClick={() => onChangeType('terms')} aria-pressed={!isPrivacy} className={`rounded-md border px-3 py-2 text-sm font-medium ${!isPrivacy ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Termos de Uso</button>
        </nav>
        <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {isPrivacy ? (
            <>
              <p className="mb-6 text-sm leading-6 text-slate-600">Esta política explica como os dados tratados pelo PontoPro devem ser utilizados no controle de jornada. A empresa empregadora que cadastra seus trabalhadores é, em regra, responsável por definir as finalidades e a base legal do tratamento dos dados de seus funcionários. O operador responsável pelo fornecimento do PontoPro deve ser identificado antes da disponibilização comercial do serviço.</p>
              <Section title="1. Responsáveis pelo tratamento"><p>A empresa que utiliza o sistema deve informar aos seus trabalhadores sua razão social, CNPJ e canal de contato para assuntos de privacidade. O fornecedor do PontoPro também deve preencher sua identificação empresarial e contato de privacidade antes de colocar o serviço em operação comercial. Esses dados de identificação não foram presumidos neste documento.</p></Section>
              <Section title="2. Dados que podem ser tratados"><p>Conforme os recursos habilitados e a configuração da empresa, o sistema pode tratar nome, matrícula, e-mail, identificador de acesso, vínculo empresarial, escala de trabalho, marcações de ponto, horários, solicitações de correção, registros de auditoria e comprovantes relacionados às marcações.</p><p>Quando o recurso correspondente estiver habilitado e houver base legal adequada, podem ser tratados dados de localização do dispositivo e fotografia associada à marcação. A fotografia é uma evidência visual e não deve ser descrita como reconhecimento facial biométrico. Dados de localização e imagem exigem informação clara aos trabalhadores e controles de acesso compatíveis com sua finalidade.</p></Section>
              <Section title="3. Finalidades e bases legais"><p>Os dados são utilizados para registrar e administrar jornadas, calcular horários, permitir a revisão de ocorrências, emitir relatórios, manter trilhas de auditoria, proteger contas e atender obrigações legais. A empresa empregadora deve determinar e documentar a base legal aplicável a cada finalidade, observando a Lei nº 13.709/2018 (LGPD), as normas trabalhistas e os princípios de necessidade e transparência.</p></Section>
              <Section title="4. Armazenamento, acesso e segurança"><p>O sistema possui armazenamento local no servidor configurado e pode manter uma fila local de registros pendentes de sincronização no navegador para uso em condições de conectividade limitada. A arquitetura e os serviços de hospedagem escolhidos pela empresa influenciam onde os dados ficam armazenados. A empresa deve restringir o acesso por função, proteger credenciais, manter cópias de segurança e controlar o ambiente de hospedagem.</p><p>Nenhum sistema pode prometer segurança absoluta. Não divulgue senhas, PINs ou dados pessoais em chamados públicos. Incidentes devem ser encaminhados aos responsáveis pelo sistema e pela empresa para avaliação e tratamento.</p></Section>
              <Section title="5. Compartilhamento e transferências"><p>O acesso aos dados deve ser limitado às pessoas autorizadas da empresa e aos prestadores necessários para operar a infraestrutura escolhida. O compartilhamento com terceiros, a contratação de fornecedores e eventuais transferências internacionais devem ser avaliados, documentados e informados quando aplicável. Não se afirma aqui que exista integração com um fornecedor externo específico.</p></Section>
              <Section title="6. Retenção e descarte"><p>Os registros de jornada podem estar sujeitos a prazos legais de guarda. A empresa empregadora deve definir e documentar os períodos de retenção aplicáveis, manter os registros necessários e eliminar ou anonimizar dados quando a finalidade e as obrigações legais permitirem. Cópias de segurança também precisam de política de retenção e descarte.</p></Section>
              <Section title="7. Direitos dos titulares"><p>O titular pode solicitar confirmação de tratamento, acesso, correção e, quando aplicável, anonimização, bloqueio, eliminação, portabilidade e informações sobre compartilhamentos, conforme a LGPD. O pedido deve ser direcionado à empresa responsável pelo tratamento. A eliminação pode ser limitada por obrigações legais de conservação ou outras bases legais válidas.</p></Section>
              <Section title="8. Cookies e armazenamento no dispositivo"><p>O navegador pode armazenar informações técnicas necessárias à sessão e à fila de sincronização offline. Antes de implantar ferramentas de análise, publicidade ou rastreamento, o responsável deve atualizar esta política para descrever os recursos efetivamente utilizados.</p></Section>
              <Section title="9. Alterações e contato"><p>Esta política deve ser revisada quando houver alteração relevante no sistema ou nas práticas de tratamento. Antes da publicação externa, preencher os dados oficiais do fornecedor do PontoPro e os canais de contato de privacidade, além de confirmar a configuração real de hospedagem, backups, sincronização e retenção.</p></Section>
            </>
          ) : (
            <>
              <p className="mb-6 text-sm leading-6 text-slate-600">Estes termos estabelecem condições gerais de uso do PontoPro, sistema destinado ao apoio do registro e da administração de jornada. A empresa que contrata ou instala o sistema deve comunicar suas regras internas aos usuários e verificar a adequação do sistema às necessidades e obrigações legais aplicáveis.</p>
              <Section title="1. Acesso e contas"><p>O acesso deve ser realizado com credenciais individuais fornecidas pela empresa ou pelo administrador autorizado. Cada usuário é responsável por manter suas credenciais em sigilo, encerrar sessões em dispositivos compartilhados e comunicar suspeitas de uso indevido. É proibido utilizar a conta de outra pessoa ou tentar contornar permissões.</p></Section>
              <Section title="2. Uso permitido"><p>O sistema deve ser utilizado para finalidades legítimas de registro, consulta e administração de jornada. O usuário não deve inserir dados falsos, manipular registros, interferir na disponibilidade do serviço, tentar acessar dados de outra empresa ou utilizar o sistema para violar direitos de terceiros.</p></Section>
              <Section title="3. Responsabilidades da empresa empregadora"><p>A empresa é responsável pela exatidão dos dados cadastrais, pela configuração de jornadas e permissões, pela comunicação aos trabalhadores, pela análise das solicitações de correção, pela guarda dos documentos e pela definição das bases legais para tratamento de dados pessoais. Deve também avaliar se a solução e sua configuração atendem às normas trabalhistas e regulamentares aplicáveis.</p></Section>
              <Section title="4. Registros, localização e evidências"><p>Quando habilitados, os recursos de localização dependem das permissões do dispositivo e da disponibilidade dos serviços de localização. A utilização offline pode manter registros pendentes para sincronização posterior, conforme a configuração técnica. O usuário deve conferir os comprovantes e informar divergências à empresa. Uma fotografia não equivale, por si só, a reconhecimento facial biométrico nem comprova identidade de forma conclusiva.</p></Section>
              <Section title="5. Disponibilidade e manutenção"><p>O funcionamento pode ser afetado por conexão de rede, dispositivo, navegador, configuração do servidor, atualizações ou indisponibilidade de infraestrutura. A empresa deve manter o ambiente operacional, realizar cópias de segurança e verificar periodicamente a integridade dos dados. Recursos que dependam de serviços externos só estarão disponíveis quando esses serviços estiverem configurados e funcionando.</p></Section>
              <Section title="6. Conformidade legal"><p>A disponibilização destes termos não constitui certificação de conformidade trabalhista ou regulatória. Antes de utilizar o sistema oficialmente para controle de ponto, a empresa deve validar os requisitos legais aplicáveis, os documentos técnicos exigidos, os procedimentos de fiscalização e a adequação da implementação à sua operação.</p></Section>
              <Section title="7. Suspensão e encerramento"><p>O acesso pode ser suspenso por segurança, inadimplência quando houver contratação com essa condição, uso indevido ou encerramento da relação contratual, respeitados os direitos dos usuários e as obrigações de conservação dos registros. O encerramento deve prever a exportação e a retenção dos dados necessários, conforme contrato e legislação aplicável.</p></Section>
              <Section title="8. Propriedade intelectual e alterações"><p>O software, sua identidade visual e seus materiais são protegidos pelas regras de propriedade intelectual aplicáveis. O fornecedor deve informar mudanças relevantes nas funcionalidades e nos termos. Alterações que afetem o tratamento de dados devem ser refletidas na Política de Privacidade.</p></Section>
              <Section title="9. Suporte, identificação e vigência"><p>O canal oficial de suporte, a identificação jurídica do fornecedor, as condições comerciais, os preços quando aplicáveis e a data de vigência devem ser informados no contrato ou na proposta comercial. Esses dados precisam ser preenchidos antes da oferta pública do serviço. Questões não tratadas serão avaliadas conforme a legislação brasileira aplicável.</p></Section>
            </>
          )}
          <p className="mt-8 border-t border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Nota de publicação: estes documentos são uma base inicial e precisam de revisão jurídica e operacional. Antes da oferta comercial, complete a identificação e os contatos oficiais do fornecedor, confirme as práticas reais de hospedagem, sincronização, backup e retenção, e valide os procedimentos conforme a LGPD e a legislação trabalhista aplicável.</p>
        </div>
        <footer className="flex justify-end border-t border-slate-200 px-5 py-3 sm:px-7">
          <button type="button" onClick={onClose} className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Fechar</button>
        </footer>
      </section>
    </div>
  );
};
