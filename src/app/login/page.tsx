import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <AuthForm mode="login" />
      <p className="text-sm text-[var(--gray)]">
        還沒有帳號？{" "}
        <Link href="/signup" className="font-bold text-[var(--blue)]">
          註冊
        </Link>
      </p>
    </main>
  );
}
