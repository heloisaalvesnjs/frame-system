"use client";

import { useEffect, useState } from "react";
import { api, ApiError, setSession, getStoredUser, type Nutritionist } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserIcon } from "lucide-react";
import { SectionGroup, PageHeader } from "@/components/section-group";

type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  bio: string | null;
};

export default function ConfiguracoesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const p = await api.get<Profile>("/api/nutritionists/profile");
      setProfile(p);
      setName(p.name ?? "");
      setPhone(p.phone ?? "");
      setSpecialty(p.specialty ?? "");
      setBio(p.bio ?? "");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.put<{ id: string; name: string; email: string }>(
        "/api/nutritionists/profile",
        { name, phone, specialty, bio }
      );
      const stored = getStoredUser();
      const token = window.localStorage.getItem("frame_token");
      if (stored && token) {
        setSession(token, { ...stored, name: updated.name } as Nutritionist);
      }
      setMessage("Perfil atualizado.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl text-sm text-muted-foreground">
        Carregando configurações...
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <PageHeader title="Configurações" description="Seu perfil e dados de contato." />

      {message && (
        <div className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-accent-foreground">
          {message}
        </div>
      )}

      <SectionGroup
        icon={UserIcon}
        title="Perfil"
        description={profile?.email}
      >
        <div className="p-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-name">Nome</Label>
              <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-phone">Telefone</Label>
              <Input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-specialty">Especialidade</Label>
              <Input
                id="profile-specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="profile-bio">Bio</Label>
              <Textarea id="profile-bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? "Salvando..." : "Salvar perfil"}
            </Button>
          </div>
        </div>
      </SectionGroup>
    </div>
  );
}
