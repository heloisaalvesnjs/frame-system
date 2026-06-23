import Link from 'next/link'

export const metadata = { title: 'Termos de Uso — Frame System' }

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-ui-bg text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12">
          <Link href="/login" className="text-brand-400 hover:text-brand-300 text-sm mb-8 inline-block">
            ← Voltar
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: '#013F32' }}>
              <img src="/logo.svg" alt="Frame System" className="w-7 h-7 object-contain" />
            </div>
            <span className="text-white font-semibold text-lg">Frame System</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Termos de Uso</h1>
          <p className="text-white/40 text-sm">Última atualização: junho de 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-white/70 text-sm leading-relaxed">

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">1. Sobre o Frame System</h2>
            <p>
              O Frame System é uma plataforma de recepcionista virtual para nutricionistas, oferecida por
              Heloisa Alves dos Anjos, CPF 194.275.027-70, com sede em Vitória/ES, Brasil
              ("Frame System", "nós" ou "nosso").
            </p>
            <p className="mt-3">
              Ao criar uma conta e utilizar nossa plataforma, você concorda com estes Termos de Uso.
              Se você não concordar, não utilize o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">2. Elegibilidade</h2>
            <p>
              O Frame System é destinado exclusivamente a nutricionistas e profissionais de saúde
              legalmente habilitados para o exercício da profissão no Brasil. Ao se cadastrar, você
              declara que possui habilitação profissional vigente e que utilizará a plataforma em
              conformidade com a legislação aplicável e as normas do Conselho Federal de Nutricionistas (CFN).
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">3. Cadastro e Aprovação</h2>
            <p>
              O acesso à plataforma está sujeito à aprovação manual pelo administrador do sistema.
              Ao solicitar cadastro, você concorda em fornecer informações verdadeiras e atualizadas.
              Reservamo-nos o direito de recusar ou cancelar cadastros a qualquer momento, sem obrigação
              de justificativa.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">4. Uso da Plataforma</h2>
            <p>Você concorda em utilizar o Frame System exclusivamente para fins lícitos e profissionais. É vedado:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Compartilhar credenciais de acesso com terceiros</li>
              <li>Utilizar a plataforma para envio de spam ou mensagens não autorizadas</li>
              <li>Tentar acessar dados de outros usuários ou burlar mecanismos de segurança</li>
              <li>Usar a IA integrada para substituir diagnósticos médicos ou conduta clínica obrigatória</li>
              <li>Reproduzir, copiar ou revender qualquer parte da plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">5. Inteligência Artificial</h2>
            <p>
              O Frame System utiliza inteligência artificial para automatizar comunicações com pacientes.
              O conteúdo gerado pela IA é de responsabilidade do nutricionista que configurou o assistente.
              Você deve revisar e configurar adequadamente as mensagens automáticas, garantindo que estejam
              em conformidade com as normas éticas da profissão e com a legislação vigente.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">6. Pagamento e Assinatura</h2>
            <p>
              O Frame System é oferecido mediante assinatura. Os valores, planos e condições de pagamento
              são apresentados no momento da contratação. O não pagamento poderá resultar na suspensão
              ou cancelamento do acesso. Não realizamos reembolsos de períodos já utilizados, salvo
              disposição legal em contrário.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">7. Disponibilidade e Suporte</h2>
            <p>
              Nos esforçamos para manter o serviço disponível continuamente, mas não garantimos
              disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência.
              O suporte é prestado pelo canal <a href="mailto:suporte@framesystem.com.br" className="text-brand-400 hover:text-brand-300">suporte@framesystem.com.br</a>.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">8. Propriedade Intelectual</h2>
            <p>
              Todos os direitos sobre a plataforma, sua interface, código, marca e conteúdo são de
              titularidade do Frame System. O uso da plataforma não transfere nenhum direito de
              propriedade intelectual ao usuário.
            </p>
            <p className="mt-3">
              Os dados inseridos pelos usuários (informações de pacientes, configurações, etc.) permanecem
              de propriedade do respectivo nutricionista.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">9. Limitação de Responsabilidade</h2>
            <p>
              O Frame System é uma ferramenta de apoio administrativo e comunicação. Não somos
              responsáveis por decisões clínicas tomadas com base no uso da plataforma, nem por
              eventuais falhas de comunicação com pacientes decorrentes de configurações inadequadas
              do assistente virtual.
            </p>
            <p className="mt-3">
              Nossa responsabilidade é limitada ao valor pago pelo usuário no mês em que ocorreu o dano.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">10. Rescisão</h2>
            <p>
              Você pode cancelar sua conta a qualquer momento. O Frame System pode suspender ou
              encerrar sua conta em caso de violação destes termos. Após o cancelamento, seus dados
              serão retidos por 90 dias e então excluídos permanentemente, salvo obrigação legal de
              retenção maior.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">11. Alterações nos Termos</h2>
            <p>
              Podemos atualizar estes Termos periodicamente. Alterações relevantes serão comunicadas
              por e-mail com antecedência mínima de 15 dias. O uso continuado da plataforma após esse
              prazo implica aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">12. Lei Aplicável</h2>
            <p>
              Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da Comarca de
              Vitória/ES para dirimir quaisquer controvérsias, com renúncia a qualquer outro.
            </p>
          </section>

          <section className="border-t border-white/10 pt-8">
            <p className="text-white/30 text-xs">
              Dúvidas? Entre em contato:{' '}
              <a href="mailto:suporte@framesystem.com.br" className="text-brand-400 hover:text-brand-300">
                suporte@framesystem.com.br
              </a>
            </p>
            <p className="text-white/30 text-xs mt-2">
              Veja também nossa{' '}
              <Link href="/privacidade" className="text-brand-400 hover:text-brand-300">
                Política de Privacidade
              </Link>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
