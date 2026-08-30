import { Suspense } from "react";
import { ChatClient } from "./ui";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="text-muted">打开聊天…</div>}>
      <ChatClient />
    </Suspense>
  );
}
