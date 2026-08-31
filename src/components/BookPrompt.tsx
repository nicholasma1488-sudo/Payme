"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const DISMISS_KEY = "payme_book_prompt_dismissed";

export function BookPrompt({ show }: { show: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!show || pathname === "/book") {
      setOpen(false);
      return;
    }
    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY) === "1") {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [show, pathname]);

  if (!open) return null;

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="panel w-full max-w-md p-6">
        <p className="font-mono text-xs text-gold">CASH · @admin</p>
        <h2 className="mt-2 text-2xl font-semibold">账户还没有 Ᵽ</h2>
        <p className="mt-3 text-sm text-muted">
          新账户余额是 0。要不要预约和 @admin 当面现金兑换？选一个空闲时段，已被预约的时间不能再选，只能改其他时间或明天。
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            className="btn flex-1 py-2.5 text-sm"
            onClick={() => {
              dismiss();
              router.push("/book");
            }}
          >
            预约兑换
          </button>
          <button className="btn-ghost flex-1 py-2.5 text-sm" onClick={dismiss}>
            稍后再说
          </button>
        </div>
      </div>
    </div>
  );
}
