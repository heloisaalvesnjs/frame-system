import { PagePlaceholder } from "@/components/page-placeholder";

export default function PacientesPage() {
  return (
    <PagePlaceholder
      title="Pacientes"
      description="Todos os leads e pacientes, com o estágio no funil e o resumo da IA."
      points={[
        "Estágio no funil: novo contato → qualificado → avaliando → marcado",
        "Resumo do que a IA sabe de cada um",
        "Origem, objetivo e histórico de conversas",
      ]}
    />
  );
}
