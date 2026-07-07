import { MessageSquareIcon } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export default function AtendimentoPage() {
  return (
    <PagePlaceholder
      title="Atendimento"
      description="Inbox das conversas do WhatsApp, ao vivo."
      icon={<MessageSquareIcon className="size-5" />}
      points={[
        "Fila 'precisa de você': escalações que a IA passou para você",
        "Selo por conversa: IA · Humano · Copiloto",
        "Assumir e devolver o atendimento com um clique",
        "Histórico e resumo da IA por paciente",
      ]}
    />
  );
}
