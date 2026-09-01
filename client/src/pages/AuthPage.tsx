import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function AuthPage({ mode = "login" }: { mode?: "login" | "register" | "recover" | "reset" }) {
  const [, navigate] = useLocation();
  const isRegister = mode === "register";
  const isRecover = mode === "recover";
  const isReset = mode === "reset";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const login = trpc.auth.login.useMutation({
    onSuccess: () => navigate("/"),
    onError: currentError => setError(currentError.message),
  });
  const register = trpc.auth.register.useMutation({
    onSuccess: () => setMessage("Cadastro recebido. Um administrador precisa aprovar sua conta antes do primeiro acesso."),
    onError: currentError => setError(currentError.message),
  });
  const recover = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: result => setMessage(result.message),
    onError: currentError => setError(currentError.message),
  });
  const reset = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setMessage("Senha redefinida. Você já pode entrar com a nova senha."),
    onError: currentError => setError(currentError.message),
  });
  const isPending = login.isPending || register.isPending || recover.isPending || reset.isPending;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (isRecover) {
      recover.mutate({ email });
    } else if (isReset) {
      const token = new URLSearchParams(window.location.search).get("token") ?? "";
      reset.mutate({ token, password, passwordConfirmation });
    } else if (isRegister) {
      register.mutate({ name, email, password, passwordConfirmation });
    } else {
      login.mutate({ email, password });
    }
  }

  return (
    <main className="min-h-screen bg-[#f2eee8] text-[#18212f] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)]">
      <section className="relative hidden overflow-hidden bg-[#18212f] px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(213,167,124,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(213,167,124,.18)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative flex items-center gap-3 text-sm font-semibold tracking-[0.12em] text-[#d5a77c] uppercase">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d5a77c]/40 bg-[#d5a77c]/10"><UsersRound className="h-5 w-5" /></div>
          Juventude Connect
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-semibold tracking-[0.18em] text-[#d5a77c] uppercase">Cuidado que continua</p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.05] tracking-tight xl:text-6xl">Cada nome importa. Cada presença também.</h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-[#c4ced8]">Um espaço claro para organizar discipulado, presença e os próximos gestos de cuidado com os jovens.</p>
        </div>
        <div className="relative flex items-center gap-3 text-sm text-[#c4ced8]"><ShieldCheck className="h-5 w-5 text-[#d5a77c]" /> Acesso protegido para a equipe da igreja Missionária Portais Eternos</div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <Card className="w-full max-w-md border-[#d8dce1] bg-white shadow-[0_22px_60px_rgba(24,33,47,0.12)]">
          <CardHeader className="space-y-3 pb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3eee7] text-[#a16d3e] lg:hidden"><UsersRound className="h-5 w-5" /></div>
            <p className="text-sm font-semibold tracking-[0.14em] text-[#a16d3e] uppercase">Juventude Connect</p>
            <CardTitle className="text-3xl tracking-tight">{isRegister ? "Crie seu acesso" : isRecover ? "Recupere seu acesso" : isReset ? "Defina uma nova senha" : "Bem-vindo de volta"}</CardTitle>
            <CardDescription className="text-base leading-6">{isRegister ? "Solicite uma conta para acompanhar sua carteira de discipulado." : isRecover ? "Enviaremos as instruções para o seu e-mail." : isReset ? "Escolha uma senha nova para continuar." : "Entre para cuidar melhor dos jovens e acompanhar cada jornada."}</CardDescription>
          </CardHeader>
          <CardContent>
            {message ? <div className="mb-5 flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-5 text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{message}</div> : null}
            {error ? <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700">{error}</div> : null}
            {!message ? <form className="space-y-4" onSubmit={submit}>
              {isRegister ? <div className="space-y-2"><Label htmlFor="name">Nome completo</Label><Input id="name" autoComplete="name" value={name} onChange={event => setName(event.target.value)} required /></div> : null}
              {!isReset ? <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></div> : null}
              {!isRecover ? <div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" type="password" autoComplete={isRegister || isReset ? "new-password" : "current-password"} minLength={8} value={password} onChange={event => setPassword(event.target.value)} required /></div> : null}
              {isRegister || isReset ? <div className="space-y-2"><Label htmlFor="passwordConfirmation">Confirme sua senha</Label><Input id="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} required /></div> : null}
              <Button className="h-11 w-full bg-[#18212f] text-white hover:bg-[#263448]" disabled={isPending} type="submit">{isPending ? "Aguarde..." : isRegister ? "Solicitar cadastro" : isRecover ? "Enviar instruções" : isReset ? "Redefinir senha" : "Entrar"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
            </form> : null}
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole className="h-4 w-4" /> Seus dados ficam protegidos no servidor.</div>
            {!isReset ? <p className="mt-6 text-center text-sm text-muted-foreground">{isRegister ? "Já possui uma conta? " : "Ainda não possui uma conta? "}<Link href={isRegister ? "/login" : "/cadastro"} className="font-semibold text-[#a16d3e] hover:underline">{isRegister ? "Entrar" : "Cadastre-se"}</Link></p> : null}
            {!isRegister && !isRecover && !isReset ? <p className="mt-3 text-center"><Link href="/recuperar-senha" className="text-sm font-semibold text-[#a16d3e] hover:underline">Esqueci minha senha</Link></p> : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
