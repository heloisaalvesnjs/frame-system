import { PagePlaceholder } from "@/components/page-placeholder";

export default function AgendaPage() {
  return (
    <PagePlaceholder
      title="Agenda"
      description="As consultas marcadas pela IA e por você, por dia e por cidade."
      points={[
        "Visão semanal e mensal das consultas",
        "Consultas criadas pela IA aparecem aqui automaticamente",
        "Remarcar e cancelar direto no calendário",
      ]}
    />
  );
}
