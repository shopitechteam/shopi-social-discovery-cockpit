"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { ADMIN_LOGIN } from "@/graphql/operations";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function readableError(error: unknown): string {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors[0]?.message ?? "Login failed";
  }

  if (ServerError.is(error)) {
    try {
      const parsed = JSON.parse(error.bodyText) as {
        errors?: Array<{ message?: string }>;
      };
      const message = parsed.errors?.[0]?.message;
      if (message) return message;
    } catch {
      // Fall through to the generic message below.
    }
  }

  if (error instanceof Error) return error.message;
  return "Login failed";
}

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [adminLogin, { loading }] = useMutation(ADMIN_LOGIN);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data } = await adminLogin({ variables: { input: { email, password } } });
      if (!data?.adminLogin) throw new Error("Login failed");
      setAuth(data.adminLogin);
      toast.success("Welcome back");
      router.replace("/");
    } catch (err) {
      toast.error(readableError(err));
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(140deg,#fff6fb_0%,#fffdf9_48%,#fff4e8_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-12%] h-72 w-72 rounded-full bg-[rgba(216,20,112,0.18)] blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-4%] h-80 w-80 rounded-full bg-[rgba(255,159,64,0.16)] blur-3xl" />
        <div className="absolute left-[45%] top-[16%] h-44 w-44 rounded-full bg-[rgba(74,58,167,0.10)] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
          <section className="hidden rounded-4xl border border-white/60 bg-white/55 p-10 shadow-[0_28px_90px_rgba(190,15,96,0.12)] backdrop-blur-xl lg:flex lg:flex-col lg:justify-between">
            <div>
           

              <div className="mt-10 max-w-xl space-y-6">
               
                <div className="space-y-4">
                  <h1 className="text-5xl font-bold leading-[1.02] tracking-tight text-foreground">
                    Run Shopi with a calmer, sharper admin cockpit.
                  </h1>
                  <p className="max-w-lg text-[17px] leading-8 text-muted">
                    Sign in to review posts, operate sellers, moderate risk, and monitor platform health from one secure workspace.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.6rem] border border-white/70 bg-white/82 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-strong">
                  Security
                </p>
                <p className="mt-3 text-[15px] leading-7 text-foreground">
                  Admin sign-in is rate limited and now locks after repeated failed password attempts.
                </p>
              </div>
              <div className="rounded-[1.6rem] border border-white/70 bg-white/82 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-strong">
                  Control
                </p>
                <p className="mt-3 text-[15px] leading-7 text-foreground">
                  Approvals, users, sellers, analytics, and moderation queues stay together in one place.
                </p>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center">
            <Card className="w-full max-w-xl rounded-[2rem] border-white/70 bg-white/88 shadow-[0_28px_90px_rgba(29,19,38,0.14)] backdrop-blur-xl">
              <CardHeader className="space-y-6 px-7 pb-0 pt-8 sm:px-9 sm:pt-10">
                <div className="flex items-center justify-between gap-4 lg:hidden">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary-strong transition-opacity hover:opacity-80"
                  >
                    <ArrowLeft className="size-4" />
                    Home
                  </Link>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-soft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary-strong">
                    Admin only
                  </div>
                </div>

                <div className="mx-auto flex size-16 items-center justify-center rounded-[1.4rem] bg-[linear-gradient(135deg,#d81470_0%,#be0f60_48%,#ff9f40_100%)] shadow-[0_16px_36px_rgba(216,20,112,0.24)]">
                  <ShieldCheck className="size-8 text-white" />
                </div>

                <div className="space-y-3 text-center">
                  <CardTitle className="text-3xl font-bold tracking-tight sm:text-[2rem]">
                    Shopi Admin Sign In
                  </CardTitle>
                  <CardDescription className="mx-auto max-w-md text-[15px] leading-7 text-muted sm:text-base">
                    Staff-only access for people managing growth, moderation, creators, and operations.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="px-7 pb-8 pt-8 sm:px-9 sm:pb-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-sm font-semibold sm:text-[15px]">
                      Work email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@shopi.co.ke"
                      className="h-12 rounded-2xl px-4 text-[15px]"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="password" className="text-sm font-semibold sm:text-[15px]">
                        Password
                      </Label>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
                        <LockKeyhole className="size-3.5" />
                        Secure access
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="h-12 rounded-2xl px-4 pr-12 text-[15px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-muted transition-colors hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="h-12 w-full rounded-2xl text-[15px]" loading={loading}>
                    Sign in to admin
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
