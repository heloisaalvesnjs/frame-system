import { PagePlaceholder } from "@/components/page-placeholder";

export default function AtendimentoPage() {
  return (
    <PagePlaceholder
      title="Atendimento"
      description="Conversas ao vivo — quem está com a IA, com humano ou aguardando você."
      points={[
        "Fila 'precisa de você': escalações que a IA passou para o David",
        "Selo por conversa: IA · Humano · Copiloto",
        "Assumir e devolver o atendimento com um clique",
        "Histórico e resumo da IA por paciente",
      ]}
    />
  );
}
