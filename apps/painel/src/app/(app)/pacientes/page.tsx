"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchIcon, UsersIcon } from "lucide-react";

type ClientRow = {
  id: string;
  name: string | null;
  phone: string;
  goal: string | null;
  appointment_count: number;
  completed_count: number;
  last_contact: string | null;
};

export default function PacientesPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function load(q: string) {
    setLoading(true);
    try {
      const query = q ? `?search=${encodeURIComponent(q)}` : "";
      const res = await api.get<{ clients: ClientRow[] }>(`/api/clients${query}`);
      setClients(res.clients);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar pacientes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todos os leads e pacientes que já falaram com a IA.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <UsersIcon className="size-4 text-primary" />
              {clients.length} {clients.length === 1 ? "paciente" : "pacientes"}
            </CardTitle>
            <CardDescription>Nome, telefone e histórico de consultas.</CardDescription>
          </div>
          <div className="relative w-56">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone"
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Consultas</TableHead>
                  <TableHead>Último contato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name ?? "Sem nome"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatPhone(c.phone)}</TableCell>
                    <TableCell>
                      {c.goal ? (
                        <Badge variant="outline">{c.goal}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.completed_count}/{c.appointment_count}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.last_contact
                        ? new Date(c.last_contact).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return phone;
}
