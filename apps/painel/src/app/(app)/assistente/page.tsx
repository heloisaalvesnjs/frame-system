"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Assistant } from "@/lib/assistant-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BotIcon, SendIcon, SparklesIcon } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export default function AssistentePage() {
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [tone, setTone] = useState("");
  const [greeting, setGreeting] = useState("");
  const [farewell, setFarewell] = useState("");
  const [preferidas, setPreferidas] = useState("");
  const [proibidas, setProibidas] = useState("");
  const [ai24h, setAi24h] = useState(true);
  const [aiPaused, setAiPaused] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  async function load() {
    setLoading(true);
    try {
      const { assistant: a } = await api.get<{ assistant: Assistant | null }>("/api/assistants");
      if (a) {
        setAssistant(a);
        setName(a.name ?? "");
        setTone(a.tone ?? "");
        setGreeting(a.greeting_message ?? "");
        setFarewell(a.farewell_message ?? "");
        setPreferidas((a.frases_preferidas ?? []).join("\n"));
        setProibidas((a.frases_proibidas ?? []).join("\n"));
        setAi24h(a.ai_24h ?? true);
        setAiPaused(a.ai_paused ?? false);
      }
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao carregar assistente");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await api.post("/api/assistants", {
        name,
        tone,
        greeting_message: greeting,
        farewell_message: farewell,
        frases_preferidas: linesToArray(preferidas),
        frases_proibidas: linesToArray(proibidas),
        ai_24h: ai24h,
        ai_paused: aiPaused,
      });
      setMessage("Salvo! A Daniela já usa isso na próxima mensagem.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function sendTestMessage() {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput };
    const nextHistory = [...chatHistory, userMsg];
    setChatHistory(nextHistory);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await api.post<{ response: string }>("/api/assistants/test", {
        message: userMsg.content,
        history: chatHistory,
      });
      setChatHistory([...nextHistory, { role: "assistant", content: res.response }]);
    } catch (err) {
      setChatHistory([
        ...nextHistory,
        { role: "assistant", content: err instanceof ApiError ? `Erro: ${err.message}` : "Erro ao testar" },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function resetTest() {
    await api.post("/api/assistants/test", { message: "", reset: true });
    setChatHistory([]);
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl text-sm text-muted-foreground">
        Carregando assistente...
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assistente (IA)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure {assistant?.name || "sua assistente"} de ponta a ponta — o que você muda
          aqui vale no próximo atendimento.
        </p>
      </div>

      {message && (
        <div className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-accent-foreground">
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BotIcon className="size-4 text-primary" />
            Identidade
          </CardTitle>
          <CardDescription>Nome, tom de voz e as mensagens de abertura e fechamento.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assistant-name">Nome da assistente</Label>
              <Input id="assistant-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assistant-tone">Tom de voz</Label>
              <Input
                id="assistant-tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="acolhedor, direto, animado..."
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assistant-greeting">Mensagem de boas-vindas</Label>
            <Textarea
              id="assistant-greeting"
              rows={3}
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assistant-farewell">Mensagem de despedida</Label>
            <Textarea
              id="assistant-farewell"
              rows={2}
              value={farewell}
              onChange={(e) => setFarewell(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jeito de falar</CardTitle>
          <CardDescription>Uma frase por linha.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="preferidas">Frases que sempre usa</Label>
            <Textarea
              id="preferidas"
              rows={5}
              value={preferidas}
              onChange={(e) => setPreferidas(e.target.value)}
              placeholder={"Bacana\nQue ótimo\nPerfeito"}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proibidas">Frases proibidas</Label>
            <Textarea
              id="proibidas"
              rows={5}
              value={proibidas}
              onChange={(e) => setProibidas(e.target.value)}
              placeholder={"barato\ndieta relâmpago"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ligar e desligar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Atender 24 horas</p>
              <p className="text-sm text-muted-foreground">
                Se desligado, respeita os horários definidos em Disponibilidade.
              </p>
            </div>
            <Switch checked={ai24h} onCheckedChange={setAi24h} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Pausar a IA completamente</p>
              <p className="text-sm text-muted-foreground">
                Nenhuma mensagem é respondida automaticamente enquanto estiver pausada.
              </p>
            </div>
            <Switch checked={aiPaused} onCheckedChange={setAiPaused} />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SparklesIcon className="size-4 text-primary" />
            Testar atendimento
          </CardTitle>
          <CardDescription>
            Converse com a IA usando as configurações atuais — não afeta pacientes reais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-72 flex-col gap-3 overflow-y-auto rounded-md border border-border bg-muted/40 p-3">
            {chatHistory.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Mande uma mensagem como se fosse um paciente, por exemplo &quot;oi&quot;.
              </p>
            )}
            {chatHistory.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "self-end bg-primary text-primary-foreground"
                    : "self-start bg-card text-card-foreground border border-border"
                }`}
              >
                {m.content}
              </div>
            ))}
            {chatLoading && (
              <div className="self-start rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                Digitando...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendTestMessage();
            }}
            placeholder="Digite como um paciente..."
          />
          <Button onClick={sendTestMessage} disabled={chatLoading}>
            <SendIcon />
          </Button>
          <Button variant="outline" onClick={resetTest}>
            Reiniciar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
