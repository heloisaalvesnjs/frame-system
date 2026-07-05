import { PagePlaceholder } from "@/components/page-placeholder";

export default function DisponibilidadePage() {
  return (
    <PagePlaceholder
      title="Disponibilidade"
      description="Onde e quando o David atende — a IA só oferece o que estiver liberado aqui."
      points={[
        "\"Não vou atender neste dia\" com um clique (bloqueia a data)",
        "\"Mudar a data X para Y\" arrastando no calendário",
        "Definir a cidade de atendimento de cada dia",
        "Horários por dia da semana, pausa de almoço e duração da consulta",
      ]}
    />
  );
}
