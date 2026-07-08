import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <AuthForm mode="signup" />
      <p className="text-sm text-[var(--gray)]">
        已經有帳號了？{" "}
        <Link href="/login" className="font-bold text-[var(--blue)]">
          登入
        </Link>
      </p>
    </main>
  );
}
