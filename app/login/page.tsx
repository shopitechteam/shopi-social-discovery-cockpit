"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { ADMIN_LOGIN } from "@/graphql/operations";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
      toast.error(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary-soft">
            <ShieldCheck className="size-6 text-primary-strong" />
          </div>
          <CardTitle className="text-xl">Shopi Admin</CardTitle>
          <CardDescription>Staff sign in — admin accounts only</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@shopi.co.ke"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
