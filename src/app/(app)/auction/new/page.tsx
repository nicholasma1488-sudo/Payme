"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Flash } from "@/components/Flash";

export default function NewListingPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).slice(0, 6);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let imagePaths: string[] = [];
      if (files.length) {
        const form = new FormData();
        files.forEach((f) => form.append("files", f));
        const up = await fetch("/api/upload", { method: "POST", body: form });
        const upData = await up.json();
        if (!up.ok) throw new Error(upData.error || "上传失败");
        imagePaths = upData.paths;
      }
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          pricePayme: Number(price),
          imagePaths,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上架失败");
      router.push("/auction");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4">
      <p className="text-xs uppercase tracking-[0.22em] text-copper">新拍卖</p>
      <h1 className="font-display text-4xl">拍张照，标个价</h1>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题"
        required
        className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="这是什么，为什么卖掉"
        rows={4}
        className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none"
      />
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="价格（Pay Me）"
        required
        inputMode="decimal"
        className="w-full rounded-2xl border border-line bg-paper px-4 py-3 font-mono outline-none"
      />
      <label className="block cursor-pointer rounded-2xl border border-dashed border-gold/40 bg-paper p-6 text-center text-sm text-muted">
        拍照或从相册选图
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="aspect-square rounded-xl object-cover" />
          ))}
        </div>
      )}
      <Flash text={error} tone="err" />
      <button disabled={busy} className="w-full rounded-2xl bg-gold py-3 text-sm font-medium text-[#1a1208]">
        {busy ? "上架中…" : "放到拍卖场"}
      </button>
    </form>
  );
}
