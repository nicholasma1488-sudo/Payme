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
      className={`rounded-2xl border px-4 py-3 text-sm ${
        tone === "err"
          ? "border-rose/40 bg-rose/10 text-rose"
          : "border-moss/40 bg-moss/10 text-moss"
      }`}
    >
      {text}
    </div>
  );
}
