"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Network } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AppLogo } from "@/components/layout/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/auth";
import { isDemoBuild } from "@/lib/runtime";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      await login(values.email, values.password);
      toast.success("Selamat datang kembali");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Belum dapat masuk");
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex h-[68px] max-w-[1160px] items-center justify-between px-4 sm:px-6">
        <AppLogo />
        <Button asChild variant="ghost">
          <Link href="/">Kembali</Link>
        </Button>
      </header>
      <section className="mx-auto grid max-w-[1160px] items-center gap-10 px-4 py-8 sm:px-6 lg:min-h-[calc(100vh-68px)] lg:grid-cols-[.9fr_1.1fr] lg:py-12">
        <div className="hidden lg:block">
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-accent text-primary">
            <Network className="h-6 w-6" />
          </span>
          <h1 className="mt-6 max-w-md text-[38px] font-medium leading-tight tracking-[-.045em]">
            Satu ruang untuk membaca hubungan pembayaran lintas PSP.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
            Masuk untuk memeriksa kasus, membaca evidence graph, dan merekam
            keputusan investigasi.
          </p>
          <ul className="mt-7 space-y-3 text-sm">
            {[
              "Kasus prioritas berbasis evidence",
              "Graph merchant, payment, dan payer alias",
              "Keputusan dan provenance tercatat",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-primary">
                  <Check className="h-3 w-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="mx-auto w-full max-w-[520px] rounded-lg border bg-card p-5 surface-raised sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-technical text-[11px] tracking-[.1em] text-muted-foreground">RUANG INVESTIGASI</p>
              <h2 className="mt-2 text-2xl font-medium tracking-[-.035em]">
                Masuk ke FinGraph
              </h2>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {isDemoBuild
              ? "Gunakan email dan kata sandi akun demo yang diberikan untuk membuka ruang sesuai peran."
              : "Gunakan akun yang diberikan administrator."}
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                className="h-12"
                {...register("email")}
              />
              {errors.email && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                className="h-12"
                {...register("password")}
              />
              {errors.password && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full text-[15px]"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Masuk
            </Button>
          </form>
          {isDemoBuild && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Belum punya akun merchant?{" "}
              <Link
                href="/register"
                className="font-medium text-primary hover:underline"
              >
                Daftar usaha
              </Link>
            </p>
          )}
          {isDemoBuild && (
            <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
              Kredensial demo hanya untuk penggunaan lokal.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
