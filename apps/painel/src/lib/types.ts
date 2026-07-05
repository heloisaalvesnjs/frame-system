export type Location = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  color: string;
  modality: "presencial" | "online" | "ambos";
  sort_order: number;
};

export type AvailabilityDay = {
  day_of_week: number;
  label: string;
  is_active: boolean;
  start_time: string;
  end_time: string;
  slot_duration: number;
  break_start: string | null;
  break_end: string | null;
  location_id: string | null;
};

export type BlockedDate = {
  id: string;
  blocked_date: string;
  reason: string | null;
};

export type DateLocationOverride = {
  id: string;
  date: string;
  location_id: string | null;
  location_name: string | null;
  modality: string | null;
  color: string | null;
};
