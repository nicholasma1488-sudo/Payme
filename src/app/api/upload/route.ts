import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { jsonError, requireUser } from "@/lib/auth";
import { uploadsDir } from "@/lib/db";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) throw new Error("请先拍一张或选一张照片");
    const dir = uploadsDir();
    const paths: string[] = [];
    for (const file of files.slice(0, 6)) {
      if (!ALLOWED.has(file.type)) throw new Error("只接受图片");
      if (file.size > 6 * 1024 * 1024) throw new Error("单张图片不要超过 6MB");
      const ext =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : file.type === "image/gif"
              ? "gif"
              : "jpg";
      const name = `${crypto.randomUUID()}.${ext}`;
      const buf = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(path.join(dir, name), buf);
      paths.push(name);
    }
    return NextResponse.json({ paths });
  } catch (error) {
    return jsonError(error);
  }
}
