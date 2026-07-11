import { normalizeLocationColor } from "@/lib/location-palette";

export function LocationBadge({ color, name }: { color: string; name: string }) {
  const c = normalizeLocationColor(color);
  return (
    <span
      style={{ backgroundColor: c + "1F", color: c, borderColor: c + "40" }}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border leading-none truncate max-w-full"
    >
      <span style={{ backgroundColor: c }} className="size-1.5 rounded-full shrink-0" />
      {name}
    </span>
  );
}
