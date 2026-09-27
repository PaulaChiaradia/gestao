import Image from "next/image";

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Foto do usuário ou, sem foto, as iniciais do nome. */
export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={size}
        height={size}
        style={style}
        className="shrink-0 rounded-full object-cover ring-1 ring-border"
      />
    );
  }
  return (
    <span
      style={{ ...style, fontSize: Math.round(size * 0.38) }}
      className="flex shrink-0 items-center justify-center rounded-full bg-accent font-medium text-accent-foreground"
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}
