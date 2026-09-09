import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { CheckCircle2, Loader2, Phone, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

function digits(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatPhone(value: string) {
  const normalized = digits(value);
  if (normalized.length <= 2) return normalized;
  if (normalized.length <= 6) return `(${normalized.slice(0, 2)}) ${normalized.slice(2)}`;
  if (normalized.length <= 10) return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 6)}-${normalized.slice(6)}`;
  return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 7)}-${normalized.slice(7)}`;
}

export default function YouthRegistrationPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const normalizedWhatsapp = digits(whatsapp);
  const validPhone = /^\d{10,11}$/.test(normalizedWhatsapp);
  const discipulatorsQuery = trpc.discipulators.list.useQuery(undefined, { enabled: Boolean(user?.role === "discipulator") });
  const phoneCheck = trpc.youths.checkWhatsapp.useQuery(
    { whatsapp: normalizedWhatsapp },
    { enabled: Boolean(user?.role === "discipulator" && validPhone), staleTime: 1000, refetchOnWindowFocus: false }
  );
  const createYouth = trpc.youths.createForDiscipulator.useMutation({
    onSuccess: () => {
      setMessage("Jovem cadastrado com sucesso.");
      setName("");
      setBirthDate("");
      setWhatsapp("");
    },
    onError: currentError => setError(currentError.message),
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== "discipulator" || !user.discipulatorId)) navigate("/");
  }, [loading, navigate, user]);

  const responsible = discipulatorsQuery.data?.[0]?.name ?? "seu cadastro de discipulador";
  const duplicate = phoneCheck.data?.exists === true;
  const checking = validPhone && phoneCheck.isFetching;
  const canSubmit = Boolean(name.trim() && birthDate && validPhone && !duplicate && !checking && !createYouth.isPending);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!canSubmit) return;
    createYouth.mutate({ name: name.trim(), birthDate, whatsapp: normalizedWhatsapp, discipleshipStartDate: birthDate });
  }

  if (loading || !user || user.role !== "discipulator") return null;

  return (
    <main className="min-h-screen bg-[#f2eee8] px-5 py-10 text-[#18212f] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#a16d3e]">Juventude Connect</p><h1 className="mt-2 font-serif text-3xl">Cadastrar jovem</h1></div>
          <Link href="/" className="text-sm font-semibold text-[#a16d3e] hover:underline">Voltar ao painel</Link>
        </div>
        <Card className="border-[#d8dce1] bg-white shadow-[0_22px_60px_rgba(24,33,47,0.08)]">
          <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-[#a16d3e]" /> Novo cadastro</CardTitle><CardDescription>O jovem será vinculado automaticamente a {responsible}.</CardDescription></CardHeader>
          <CardContent>
            {message && <div className="mb-5 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />{message}</div>}
            {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <form className="space-y-5" onSubmit={submit}>
              <div className="space-y-2"><Label htmlFor="youth-name">Nome completo</Label><Input id="youth-name" value={name} onChange={event => setName(event.target.value)} required autoFocus /></div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="youth-birth-date">Data de nascimento</Label><Input id="youth-birth-date" type="date" value={birthDate} onChange={event => setBirthDate(event.target.value)} required /></div>
                <div className="space-y-2"><Label htmlFor="youth-whatsapp">Telefone com DDD</Label><div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-[#8a929d]" /><Input id="youth-whatsapp" className="pl-9" inputMode="numeric" value={formatPhone(whatsapp)} onChange={event => setWhatsapp(event.target.value)} placeholder="(31) 99999-9999" required /></div>{whatsapp && !validPhone && <p className="text-xs text-[#a94f3f]">Digite DDD + número, com 10 ou 11 dígitos.</p>}{checking && <p className="text-xs text-[#68717d]">Verificando telefone...</p>}{duplicate && <p className="text-sm font-semibold text-[#b25e50]">Jovem {phoneCheck.data?.name} já cadastrado no sistema.</p>}</div>
              </div>
              <Button className="h-11 w-full bg-[#18212f] text-white hover:bg-[#2e3a4d]" disabled={!canSubmit} type="submit">{createYouth.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Cadastrar jovem"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}