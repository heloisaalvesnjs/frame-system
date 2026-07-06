export function LocationBadge({ color, name }: { color: string; name: string }) {
  return (
    <span
      style={{ backgroundColor: color + "1F", color, borderColor: color + "40" }}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border leading-none truncate max-w-full"
    >
      <span style={{ backgroundColor: color }} className="size-1.5 rounded-full shrink-0" />
      {name}
    </span>
  );
}
