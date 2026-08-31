import { Suspense } from "react";
import { BookClient } from "./ui";

export default function BookPage() {
  return (
    <Suspense fallback={<div className="text-muted">打开预约…</div>}>
      <BookClient />
    </Suspense>
  );
}
