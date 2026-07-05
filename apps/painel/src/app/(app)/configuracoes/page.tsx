import { PagePlaceholder } from "@/components/page-placeholder";

export default function ConfiguracoesPage() {
  return (
    <PagePlaceholder
      title="Configurações"
      description="Conta, WhatsApp e equipe."
      points={[
        "Perfil do nutricionista",
        "WhatsApp: status da conexão e QR Code",
        "Equipe: dar acesso para o David e recepção",
      ]}
    />
  );
}
