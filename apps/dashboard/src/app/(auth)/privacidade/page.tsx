import Link from 'next/link'

export const metadata = { title: 'Política de Privacidade — Frame System' }

export default function PrivacidadePage() {
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
          <h1 className="text-3xl font-bold text-white mb-2">Política de Privacidade</h1>
          <p className="text-white/40 text-sm">Última atualização: junho de 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-white/70 text-sm leading-relaxed">

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">1. Controladora dos Dados</h2>
            <p>
              A controladora dos dados pessoais tratados pelo Frame System é:
            </p>
            <div className="mt-3 bg-white/5 rounded-xl p-4 space-y-1 text-white/60">
              <p><strong className="text-white/80">Nome:</strong> Heloisa Alves dos Anjos</p>
              <p><strong className="text-white/80">CPF:</strong> 194.275.027-70</p>
              <p><strong className="text-white/80">Localização:</strong> Vitória/ES, Brasil</p>
              <p><strong className="text-white/80">E-mail (DPO):</strong>{' '}
                <a href="mailto:suporte@framesystem.com.br" className="text-brand-400 hover:text-brand-300">
                  suporte@framesystem.com.br
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">2. Dados que Coletamos</h2>

            <h3 className="text-white/90 font-medium mb-2">2.1 Dados dos Nutricionistas (usuários)</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Nome completo, e-mail e senha (autenticação)</li>
              <li>Telefone/WhatsApp pessoal e profissional</li>
              <li>Especialidade e bio profissional</li>
              <li>Dados de uso e configurações da plataforma</li>
            </ul>

            <h3 className="text-white/90 font-medium mb-2 mt-4">2.2 Dados dos Pacientes</h3>
            <p className="mb-2">
              Os pacientes são cadastrados pelos nutricionistas. Coletamos:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Nome, telefone e e-mail</li>
              <li>Data de nascimento e gênero</li>
              <li>
                <strong className="text-yellow-400">Dados sensíveis de saúde</strong>: histórico alimentar,
                objetivos nutricionais, peso, altura, condições clínicas relevantes informadas no atendimento
              </li>
              <li>Histórico de conversas com o assistente virtual</li>
              <li>Histórico de consultas e agendamentos</li>
            </ul>

            <h3 className="text-white/90 font-medium mb-2 mt-4">2.3 Dados de Uso</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Logs de acesso e atividade na plataforma</li>
              <li>Endereço IP e informações do dispositivo</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">3. Finalidade e Base Legal (LGPD)</h2>
            <div className="space-y-3">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="font-medium text-white/80">Prestação do serviço contratado</p>
                <p className="text-xs mt-1">Base: execução de contrato (Art. 7º, V, LGPD)</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="font-medium text-white/80">Comunicação com pacientes via WhatsApp</p>
                <p className="text-xs mt-1">Base: legítimo interesse do responsável pelo tratamento (Art. 7º, IX, LGPD) e consentimento do paciente gerenciado pelo nutricionista</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="font-medium text-white/80">Dados sensíveis de saúde dos pacientes</p>
                <p className="text-xs mt-1 text-yellow-400/80">Base: tutela da saúde, exclusivamente por profissional de saúde habilitado (Art. 11, II, f, LGPD). O nutricionista é o responsável pelo consentimento do paciente.</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="font-medium text-white/80">Envio de e-mails transacionais</p>
                <p className="text-xs mt-1">Base: execução de contrato e legítimo interesse (Art. 7º, V e IX, LGPD)</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">4. Compartilhamento com Terceiros</h2>
            <p>Compartilhamos dados apenas com os seguintes fornecedores de tecnologia, estritamente necessários para a operação do serviço:</p>
            <div className="mt-3 space-y-2">
              {[
                { nome: 'Anthropic', uso: 'Processamento de IA para o assistente virtual', local: 'EUA' },
                { nome: 'Evolution API / WhatsApp', uso: 'Envio e recebimento de mensagens WhatsApp', local: 'Brasil (VPS própria)' },
                { nome: 'Resend', uso: 'Envio de e-mails transacionais', local: 'EUA' },
                { nome: 'PostgreSQL (VPS própria)', uso: 'Armazenamento de dados', local: 'Brasil' },
              ].map(item => (
                <div key={item.nome} className="bg-white/5 rounded-xl p-3 flex justify-between items-start gap-4">
                  <div>
                    <p className="font-medium text-white/80 text-xs">{item.nome}</p>
                    <p className="text-white/40 text-xs mt-0.5">{item.uso}</p>
                  </div>
                  <span className="text-xs text-white/30 shrink-0">{item.local}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-white/50">
              Não vendemos, alugamos ou compartilhamos dados pessoais com terceiros para fins comerciais ou de marketing.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">5. Retenção dos Dados</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Dados de contas ativas: mantidos enquanto a conta estiver ativa</li>
              <li>Após cancelamento: 90 dias para eventual recuperação, depois excluídos</li>
              <li>Dados de saúde de pacientes: excluídos junto com a conta do nutricionista</li>
              <li>Logs de segurança: até 6 meses</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">6. Seus Direitos (LGPD)</h2>
            <p>Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong className="text-white/80">Acesso</strong> — saber quais dados temos sobre você</li>
              <li><strong className="text-white/80">Correção</strong> — corrigir dados incompletos ou inexatos</li>
              <li><strong className="text-white/80">Eliminação</strong> — solicitar exclusão dos seus dados</li>
              <li><strong className="text-white/80">Portabilidade</strong> — receber seus dados em formato estruturado</li>
              <li><strong className="text-white/80">Revogação do consentimento</strong> — quando o tratamento se basear em consentimento</li>
              <li><strong className="text-white/80">Informação</strong> — sobre com quem compartilhamos seus dados</li>
            </ul>
            <p className="mt-3">
              Para exercer seus direitos, entre em contato:{' '}
              <a href="mailto:suporte@framesystem.com.br" className="text-brand-400 hover:text-brand-300">
                suporte@framesystem.com.br
              </a>. Responderemos em até 15 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">7. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo:
              criptografia de senhas (bcrypt), comunicação via HTTPS, tokens JWT com expiração,
              e acesso restrito ao banco de dados. Em caso de incidente de segurança que possa
              afetar seus dados, notificaremos conforme exigido pela LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">8. Cookies</h2>
            <p>
              Utilizamos apenas cookies estritamente necessários para autenticação e funcionamento
              da plataforma. Não utilizamos cookies de rastreamento ou publicidade.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">9. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta Política periodicamente. Alterações serão comunicadas por e-mail
              com antecedência mínima de 15 dias. A versão mais recente estará sempre disponível em{' '}
              <Link href="/privacidade" className="text-brand-400 hover:text-brand-300">
                app.framesystem.com.br/privacidade
              </Link>.
            </p>
          </section>

          <section className="border-t border-white/10 pt-8">
            <p className="text-white/30 text-xs">
              Encarregado (DPO): Heloisa Alves dos Anjos —{' '}
              <a href="mailto:suporte@framesystem.com.br" className="text-brand-400 hover:text-brand-300">
                suporte@framesystem.com.br
              </a>
            </p>
            <p className="text-white/30 text-xs mt-2">
              Veja também nossos{' '}
              <Link href="/termos" className="text-brand-400 hover:text-brand-300">
                Termos de Uso
              </Link>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
