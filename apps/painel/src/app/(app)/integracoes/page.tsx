"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageCircleIcon, RefreshCcwIcon, Loader2Icon } from "lucide-react";

type WhatsappStatus = {
  status: string;
  phone?: string | null;
  connected_at?: string | null;
};

const STATUS_LABEL: Record<string, { label: string; dotClass: string }> = {
  connected: { label: "Conectado", dotClass: "bg-primary" },
  connecting: { label: "Conectando...", dotClass: "bg-amber-500" },
  disconnected: { label: "Desconectado", dotClass: "bg-destructive" },
};

export default function IntegracoesPage() {
  const [wa, setWa] = useState<WhatsappStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<WhatsappStatus>("/api/whatsapp/status");
      setWa(res);
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const statusInfo = wa ? STATUS_LABEL[wa.status] ?? STATUS_LABEL.disconnected : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conexões que fazem o atendimento da IA funcionar de ponta a ponta.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <MessageCircleIcon className="size-4" />
            </span>
            <div>
              <CardTitle className="text-base">WhatsApp</CardTitle>
              <CardDescription>
                Número usado pela IA para conversar com os pacientes.
              </CardDescription>
            </div>
          </div>
          <Button size="icon-sm" variant="outline" onClick={refresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <RefreshCcwIcon />
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Verificando conexão...</p>
          ) : (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1.5">
                <span className={`size-1.5 rounded-full ${statusInfo?.dotClass ?? "bg-muted-foreground"}`} />
                {statusInfo?.label ?? "Desconhecido"}
              </Badge>
              {wa?.phone && (
                <span className="text-sm text-muted-foreground">{wa.phone}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona por trás</CardTitle>
          <CardDescription>
            Você não precisa configurar nada aqui — é só para saber o que está de pé.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">n8n</strong> — recebe cada mensagem, decide
            se é dúvida, agendamento ou algo pra você, e já lê tudo que está configurado aqui
            no painel (planos, disponibilidade, base de conhecimento) em tempo real.
          </p>
          <p>
            <strong className="text-foreground">Claude (IA)</strong> — o modelo que gera as
            respostas da Daniela.
          </p>
          <p>
            <strong className="text-foreground">Google Calendar</strong> e{" "}
            <strong className="text-foreground">Asaas (PIX)</strong> — configuráveis em breve
            nesta tela.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
