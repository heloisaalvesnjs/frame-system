import { PagePlaceholder } from "@/components/page-placeholder";

export default function AssistentePage() {
  return (
    <PagePlaceholder
      title="Assistente (IA)"
      description="Configure a Daniela de ponta a ponta — o que você muda aqui vale no próximo atendimento."
      points={[
        "Identidade: nome, tom de voz, saudação e despedida",
        "Frases que sempre usa e frases proibidas",
        "Serviços e preços apresentados nos planos",
        "Base de conhecimento: formulário que enriquece a IA sobre o David",
        "Regras clínicas e o que sempre encaminhar para humano",
        "Testar o atendimento antes de ligar",
        "Ligar/desligar a IA e modo copiloto (aprovar respostas)",
      ]}
    />
  );
}
