export type Assistant = {
  id: string;
  name: string;
  tone: string;
  greeting_message: string | null;
  farewell_message: string | null;
  is_active: boolean;
  ai_paused: boolean;
  ai_24h: boolean;
  frases_proibidas: string[] | null;
  frases_preferidas: string[] | null;
};
