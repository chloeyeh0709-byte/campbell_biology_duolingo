"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "發生錯誤，請再試一次");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-duo flex w-full max-w-sm flex-col gap-4 p-6">
      <h1 className="text-center text-2xl font-extrabold">
        {mode === "login" ? "登入" : "建立帳號"}
      </h1>
      {mode === "signup" && (
        <input
          className="rounded-xl border-2 border-[var(--border)] bg-transparent px-4 py-3 outline-none focus:border-[var(--blue)]"
          placeholder="暱稱（選填）"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      )}
      <input
        className="rounded-xl border-2 border-[var(--border)] bg-transparent px-4 py-3 outline-none focus:border-[var(--blue)]"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="rounded-xl border-2 border-[var(--border)] bg-transparent px-4 py-3 outline-none focus:border-[var(--blue)]"
        type="password"
        placeholder="密碼（至少 8 個字元）"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        required
      />
      {error && <p className="text-sm font-semibold text-[var(--red)]">{error}</p>}
      <button type="submit" disabled={loading} className="btn-duo-green">
        {loading ? "處理中…" : mode === "login" ? "登入" : "開始學習"}
      </button>
    </form>
  );
}
