"use client";

export function Flash({
  text,
  tone = "ok",
}: {
  text: string | null;
  tone?: "ok" | "err";
}) {
  if (!text) return null;
  return (
    <div
      className={`border px-3 py-2 font-mono text-xs ${
        tone === "err" ? "border-rose/50 bg-rose/10 text-rose" : "border-moss/50 bg-moss/10 text-moss"
      }`}
    >
      {text}
    </div>
  );
}
