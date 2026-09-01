import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { DiscipulatorEditDialog } from "@/components/DiscipulatorEditDialog";
import {
  formatBirthdayDate,
  isBirthdayToday,
  isBirthdayWithinNextDays,
  sortUpcomingBirthdays,
} from "@shared/birthday";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Cake,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  HeartHandshake,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  Settings2,
  Sparkles,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const fallbackYouth = [
  {
    id: 1,
    name: "Gabriel Almeida",
    birthDate: "2004-08-19",
    discipulatorName: "João Martins",
    whatsapp: "(11) 99821-2210",
    relationshipStatus: "active",
  },
  {
    id: 2,
    name: "Mariana Costa",
    birthDate: "2006-08-23",
    discipulatorName: "Ana Paula",
    whatsapp: "(11) 99751-7720",
    relationshipStatus: "active",
  },
  {
    id: 3,
    name: "Lucas Ferreira",
    birthDate: "2003-08-27",
    discipulatorName: "João Martins",
    whatsapp: "(11) 99142-0804",
    relationshipStatus: "active",
  },
  {
    id: 4,
    name: "Beatriz Lima",
    birthDate: "2007-09-02",
    discipulatorName: "Rafael Souza",
    whatsapp: "(11) 99601-5448",
    relationshipStatus: "active",
  },
];
const fallbackDiscipulators = [
  {
    id: 1,
    name: "João Martins",
    whatsapp: "(11) 99888-1000",
    status: "active",
    youthCount: 12,
  },
  {
    id: 2,
    name: "Ana Paula",
    whatsapp: "(11) 99731-3002",
    status: "active",
    youthCount: 9,
  },
  {
    id: 3,
    name: "Rafael Souza",
    whatsapp: "(11) 99111-4030",
    status: "active",
    youthCount: 7,
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}
function formatDate(date?: string | Date | null) {
  return formatBirthdayDate(date);
}

export default function Home() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [sort, setSort] = useState<"name" | "birthday">("name");
  const [discipulatorFilter, setDiscipulatorFilter] = useState("");
  const [presenceDate, setPresenceDate] = useState("2026-08-19");
  const [eventType, setEventType] = useState("Sedentos +20");
  const [absenceCount, setAbsenceCount] = useState(0);
  const [presenceSummary, setPresenceSummary] = useState<any>(null);
  const [birthdayTemplate, setBirthdayTemplate] = useState(
    "Olá, {{nome}}! Hoje é um dia muito especial. Que Deus abençoe seus sonhos, sua caminhada e tudo aquilo que Ele preparou para você. Feliz aniversário! 🎉"
  );
  const [absenceTemplate, setAbsenceTemplate] = useState(
    "Olá, {{discipulador}}. O seu discípulo {{discipulo}} faltou ao culto de hoje, {{data}}. Procure saber como ele está e entre em contato com ele."
  );
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [whatsappBusinessId, setWhatsappBusinessId] = useState("");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState<
    "enabled" | "disabled"
  >("disabled");
  const [reportPeriod, setReportPeriod] = useState("custom");
  const [reportStartDate, setReportStartDate] = useState("2026-08-01");
  const [reportEndDate, setReportEndDate] = useState("2026-08-19");
  const [reportEventType, setReportEventType] = useState("");
  const [reportDiscipulatorId, setReportDiscipulatorId] = useState("");
  const [reportYouthId, setReportYouthId] = useState("");
  const [lowFrequencyThreshold, setLowFrequencyThreshold] = useState("60");
  const [maxConsecutiveAbsences, setMaxConsecutiveAbsences] = useState("2");
  const dashboard = trpc.dashboard.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const youthsQuery = trpc.youths.list.useQuery(
    {
      search,
      discipulatorId: discipulatorFilter
        ? Number(discipulatorFilter)
        : undefined,
      ageMin: ageMin ? Number(ageMin) : undefined,
      ageMax: ageMax ? Number(ageMax) : undefined,
      sort,
    },
    { enabled: Boolean(user) }
  );
  const discipulatorsQuery = trpc.discipulators.list.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const accountsQuery = trpc.accounts.list.useQuery(undefined, {
    enabled: Boolean(user && user.role === "admin"),
  });
  const attendanceQuery = trpc.attendance.list.useQuery(
    { eventDate: presenceDate, eventType },
    { enabled: Boolean(user) }
  );
  const attendanceSummaryQuery = trpc.attendance.summary.useQuery(
    { eventDate: presenceDate, eventType },
    { enabled: Boolean(user) }
  );
  const settingsQuery = trpc.settings.get.useQuery(undefined, {
    enabled: Boolean(user && user.role === "admin"),
  });
  const whatsappStatusQuery = trpc.settings.status.useQuery(undefined, {
    enabled: Boolean(user && user.role === "admin"),
  });
  const absencesQuery = trpc.absences.list.useQuery(undefined, {
    enabled: Boolean(user && user.role === "admin"),
  });
  const absenceSummaryQuery = trpc.absences.summary.useQuery(undefined, {
    enabled: Boolean(user && user.role === "admin"),
  });
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, {
    enabled: Boolean(user && user.role === "admin"),
  });
  const reportInput = useMemo(
    () => ({
      startDate: reportStartDate,
      endDate: reportEndDate,
      eventType: reportEventType || undefined,
      discipulatorId: reportDiscipulatorId
        ? Number(reportDiscipulatorId)
        : undefined,
      youthId: reportYouthId ? Number(reportYouthId) : undefined,
      lowFrequencyThreshold: Math.min(
        100,
        Math.max(1, Number(lowFrequencyThreshold) || 60)
      ),
      maxConsecutiveAbsences: Math.min(
        20,
        Math.max(1, Number(maxConsecutiveAbsences) || 2)
      ),
    }),
    [
      reportStartDate,
      reportEndDate,
      reportEventType,
      reportDiscipulatorId,
      reportYouthId,
      lowFrequencyThreshold,
      maxConsecutiveAbsences,
    ]
  );
  const reportsQuery = trpc.reports.get.useQuery(reportInput, {
    enabled: Boolean(user),
  });
  const markAbsence = trpc.attendance.markAbsence.useMutation({
    onSuccess: result => {
      setAbsenceCount(value => value + 1);
      setPresenceSummary((current: any) => ({
        ...(current ?? {}),
        last: result,
      }));
      toast.success(result.notification);
      attendanceQuery.refetch();
      absencesQuery.refetch();
      notificationsQuery.refetch();
      absenceSummaryQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const sendAbsenceNotification = trpc.notifications.send.useMutation({
    onSuccess: () => {
      toast.success("Notificação enviada pelo WhatsApp Business.");
      notificationsQuery.refetch();
      absenceSummaryQuery.refetch();
    },
    onError: error => {
      toast.error(error.message);
      notificationsQuery.refetch();
      absenceSummaryQuery.refetch();
    },
  });
  const prepareBirthday = trpc.messages.prepareBirthday.useMutation({
    onSuccess: result =>
      result.duplicate
        ? toast.info("A mensagem de hoje já foi registrada para este jovem.")
        : toast.success("Mensagem preparada. Agora confirme o envio manual."),
  });
  const sendBirthday = trpc.messages.sendBirthday.useMutation({
    onSuccess: () => toast.success("Mensagem enviada pelo WhatsApp Business."),
    onError: error => toast.error(error.message),
  });
  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => toast.success("Configurações salvas com segurança."),
  });
  const createDiscipulator = trpc.discipulators.create.useMutation({
    onSuccess: () => {
      toast.success("Discipulador cadastrado.");
      discipulatorsQuery.refetch();
    },
  });
  const updateDiscipulator = trpc.discipulators.update.useMutation({
    onSuccess: () => {
      toast.success("Cadastro do discipulador atualizado.");
      discipulatorsQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const createYouth = trpc.youths.create.useMutation({
    onSuccess: () => {
      toast.success("Jovem cadastrado.");
      youthsQuery.refetch();
    },
  });
  const bulkCreateYouth = trpc.youths.bulkCreate.useMutation({
    onSuccess: result => {
      toast.success(`${result.imported} jovens importados.`);
      youthsQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const updateWhatsapp = trpc.youths.updateWhatsapp.useMutation({
    onSuccess: () => {
      toast.success("WhatsApp atualizado.");
      youthsQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const reassignYouth = trpc.youths.reassign.useMutation({
    onSuccess: () => {
      toast.success("Discipulador atualizado.");
      youthsQuery.refetch();
      discipulatorsQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const linkAccount = trpc.accounts.linkDiscipulator.useMutation({
    onSuccess: () => {
      toast.success("Conta vinculada ao discipulador.");
      accountsQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const updateAliases = trpc.discipulators.updateAliases.useMutation({
    onSuccess: result => {
      toast.success(`${result.linked} jovens vinculados pelos apelidos.`);
      discipulatorsQuery.refetch();
      youthsQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const updateFollowUp = trpc.attendance.updateFollowUp.useMutation({
    onSuccess: () => {
      toast.success("Status de acompanhamento atualizado.");
      dashboard.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const data = dashboard.data ?? {
    youthCount: 28,
    activeYouthCount: 24,
    discipulatorCount: 6,
    birthdays: [fallbackYouth[0]],
    upcoming: fallbackYouth.slice(1),
    pendingFollowUps: 4,
    lastEvent: { eventDate: "2026-08-16", eventType: "Culto de celebração" },
    recentAbsences: [
      {
        id: 1,
        youth: "Gabriel Almeida",
        discipulator: "João Martins",
        status: "pending",
      },
    ],
  };
  const youths = youthsQuery.data?.length ? youthsQuery.data : fallbackYouth;
  const discipulators = discipulatorsQuery.data?.length
    ? discipulatorsQuery.data
    : fallbackDiscipulators;
  const attendance = attendanceQuery.data?.length
    ? attendanceQuery.data
    : youths.map(youth => ({
        youthId: youth.id,
        name: youth.name,
        attendanceId: undefined,
        status: undefined,
        followUpId: undefined,
        followUpStatus: undefined,
      }));
  const rawPage = location.replace(/^\//, "");
  const page =
    rawPage === "admin" || rawPage === "painel"
      ? "dashboard"
      : rawPage || "dashboard";
  const absenceSummary = absenceSummaryQuery.data ?? {
    total: 0,
    pending: 0,
    sending: 0,
    sent: 0,
    error: 0,
    cancelled: 0,
  };
  const filtered = useMemo(
    () =>
      youths.filter(youth =>
        youth.name.toLowerCase().includes(search.toLowerCase())
      ),
    [search, youths]
  );

  useEffect(() => {
    if (settingsQuery.data) {
      setBirthdayTemplate(
        settingsQuery.data.birthdayTemplate ?? birthdayTemplate
      );
      setAbsenceTemplate(settingsQuery.data.absenceTemplate ?? absenceTemplate);
      setWhatsappPhoneId(settingsQuery.data.whatsappPhoneNumberId ?? "");
      setWhatsappBusinessId(settingsQuery.data.whatsappBusinessAccountId ?? "");
      setWhatsappToken(settingsQuery.data.whatsappToken ?? "");
      setWhatsappEnabled(settingsQuery.data.whatsappEnabled ?? "disabled");
    }
  }, [settingsQuery.data]);
  const saveSettings = () =>
    updateSettings.mutate({
      birthdayTemplate,
      absenceTemplate,
      whatsappEnabled,
      whatsappPhoneNumberId: whatsappPhoneId,
      whatsappBusinessAccountId: whatsappBusinessId,
      whatsappToken,
    });
  const handleManualBirthday = (youthId: number) => {
    prepareBirthday.mutate(
      { youthId },
      {
        onSuccess: result => {
          if (result.duplicate) return;
          const templateName = window.prompt(
            "Nome exato do template aprovado na Meta",
            "aniversario_jovem"
          );
          if (templateName)
            sendBirthday.mutate({
              youthId,
              templateName,
              languageCode: "pt_BR",
            });
        },
      }
    );
    toast.info("Preparando mensagem para revisão...");
  };

  if (!user) return <Landing />;
  return (
    <DashboardLayout>
      <div className="min-h-screen overflow-x-hidden bg-[#f7f8fa] text-[#18212f] -m-4 px-3 py-4 sm:p-5 md:p-8">
        <div className="mx-auto max-w-[1440px] space-y-7">
          <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9a6b3f]">
                Cuidado & acompanhamento
              </p>
              <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
                Olá, {user?.name?.split(" ")[0] ?? "admin"}.
              </h1>
              <p className="mt-2 text-sm text-[#6c7480]">
                Uma visão sensível do que precisa da sua atenção hoje.
              </p>
            </div>
            <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
              <div className="hidden rounded-full border border-[#e3e5e8] bg-white px-4 py-2 text-xs text-[#727b88] md:block">
                19 de agosto de 2026
              </div>
              <Button
                onClick={() => setLocation("/presenca")}
                className="w-full justify-center rounded-full bg-[#b27b4b] px-5 text-white shadow-lg shadow-[#b27b4b]/20 hover:bg-[#936038] sm:w-auto"
              >
                <ClipboardCheck className="mr-2 h-4 w-4" /> Registrar presença
              </Button>
            </div>
          </header>
          <select
            aria-label="Navegação principal"
            value={page}
            onChange={event =>
              setLocation(
                event.target.value === "dashboard"
                  ? "/"
                  : `/${event.target.value}`
              )
            }
            className="h-11 w-full rounded-xl border border-[#e3e5e8] bg-white px-3 text-sm font-medium text-[#18212f] sm:hidden"
          >
            <option value="dashboard">Visão geral</option>
            <option value="jovens">Jovens</option>
            <option value="discipuladores">Discipuladores</option>
            <option value="presenca">Presença</option>
            <option value="faltas">Faltas</option>
            <option value="notificacoes">
              Notificações
              {absenceSummary.pending > 0 ? ` (${absenceSummary.pending})` : ""}
            </option>
            <option value="relatorios">Relatórios</option>
            <option value="aniversarios">Aniversários</option>
            <option value="mensagens">Mensagens</option>
            <option value="configuracoes">Configurações</option>
          </select>
          <nav className="hidden gap-1 overflow-x-auto border-b border-[#e3e5e8] pb-1 text-sm sm:flex">
            {[
              ["dashboard", "Visão geral"],
              ["jovens", "Jovens"],
              ["discipuladores", "Discipuladores"],
              ["presenca", "Presença"],
              ["faltas", "Faltas"],
              ["notificacoes", "Notificações"],
              ["relatorios", "Relatórios"],
              ["aniversarios", "Aniversários"],
              ["mensagens", "Mensagens"],
              ["configuracoes", "Configurações"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() =>
                  setLocation(key === "dashboard" ? "/" : `/${key}`)
                }
                className={`whitespace-nowrap rounded-t-lg px-3 py-2.5 transition-colors ${page === key ? "border-b-2 border-[#b27b4b] font-semibold text-[#18212f]" : "text-[#8b929c] hover:text-[#18212f]"}`}
              >
                {label}
                {key === "notificacoes" && absenceSummary.pending > 0 ? (
                  <span className="ml-1 rounded-full bg-[#c56f57] px-1.5 py-0.5 text-[10px] text-white">
                    {absenceSummary.pending}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
          {page === "dashboard" && (
            <Dashboard
              data={data}
              youths={youths}
              onBirthday={handleManualBirthday}
              onNavigate={setLocation}
              absenceSummary={absenceSummary}
              onUpdateFollowUp={(id: number, status: string) =>
                updateFollowUp.mutate({ id, status: status as any })
              }
            />
          )}
          {page === "jovens" && (
            <YouthPage
              onReassign={(id: number, discipulatorId: number | null) =>
                reassignYouth.mutate({ id, discipulatorId })
              }
              youths={filtered}
              search={search}
              setSearch={setSearch}
              ageMin={ageMin}
              setAgeMin={setAgeMin}
              ageMax={ageMax}
              setAgeMax={setAgeMax}
              sort={sort}
              setSort={setSort}
              discipulatorFilter={discipulatorFilter}
              setDiscipulatorFilter={setDiscipulatorFilter}
              discipulators={discipulators}
              onBirthday={handleManualBirthday}
              onEditWhatsapp={(id: number, current: string) =>
                updateWhatsapp.mutate({
                  id,
                  whatsapp:
                    window.prompt("WhatsApp do jovem", current) ?? current,
                })
              }
              onCreate={() => {
                const name = window.prompt("Nome completo do jovem");
                if (name)
                  createYouth.mutate({
                    name,
                    birthDate:
                      window.prompt("Data de nascimento (AAAA-MM-DD)") ??
                      "2000-01-01",
                    whatsapp: window.prompt("WhatsApp") ?? "",
                    discipulatorId: Number(
                      window.prompt("ID do discipulador") ?? 1
                    ),
                    discipleshipStartDate: new Date()
                      .toISOString()
                      .slice(0, 10),
                    relationshipStatus: "active",
                  });
              }}
              onImport={(file: File) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const lines = String(reader.result)
                    .split(/\\r?\\n/)
                    .filter(Boolean);
                  const rows = lines
                    .slice(1)
                    .map(line => line.split(","))
                    .filter(
                      parts =>
                        parts.length >= 3 &&
                        parts[0].trim() &&
                        parts[1].trim() &&
                        parts[2].trim()
                    )
                    .map(parts => ({
                      name: parts[0].trim(),
                      birthDate: parts[1].trim(),
                      whatsapp: parts[2].trim(),
                      discipulatorId: Number(parts[3] || 1),
                      discipleshipStartDate: new Date()
                        .toISOString()
                        .slice(0, 10),
                      relationshipStatus: "active" as const,
                    }));
                  bulkCreateYouth.mutate({ rows });
                };
                reader.readAsText(file);
              }}
            />
          )}
          {page === "discipuladores" && (
            <DiscipulatorsPage
              discipulators={discipulators}
              accounts={accountsQuery.data ?? []}
              onUpdate={(item: any) => updateDiscipulator.mutate(item)}
              onUpdateAliases={(id: number, aliases: string[]) =>
                updateAliases.mutate({ id, aliases })
              }
              onLinkAccount={(userId: number, discipulatorId: number) =>
                linkAccount.mutate({ userId, discipulatorId })
              }
              onCreate={() => {
                const name = window.prompt("Nome completo do discipulador");
                if (name)
                  createDiscipulator.mutate({
                    name,
                    whatsapp: window.prompt("WhatsApp") ?? "",
                    status: "active",
                  });
              }}
            />
          )}
          {page === "presenca" && (
            <AttendancePage
              date={presenceDate}
              setDate={setPresenceDate}
              eventType={eventType}
              setEventType={setEventType}
              attendance={attendance}
              onToggle={(youthId: number, absent: boolean) =>
                markAbsence.mutate({
                  eventDate: presenceDate,
                  eventType,
                  youthId,
                  absent,
                })
              }
              absenceCount={absenceCount}
              summary={presenceSummary}
              serviceSummary={attendanceSummaryQuery.data}
              onOpenNotifications={() => setLocation("/notificacoes")}
              onOpenAbsences={() => setLocation("/faltas")}
            />
          )}
          {page === "faltas" && (
            <AbsencesPage
              rows={absencesQuery.data ?? []}
              summary={absenceSummary}
              onOpenNotifications={() => setLocation("/notificacoes")}
            />
          )}
          {page === "notificacoes" && (
            <NotificationsPage
              rows={notificationsQuery.data ?? []}
              onSend={(id: number) => {
                const template = window.prompt(
                  "Nome exato do template aprovado para falta",
                  "notificacao_falta"
                );
                if (template)
                  sendAbsenceNotification.mutate({
                    id,
                    templateName: template,
                    languageCode: "pt_BR",
                  });
              }}
            />
          )}
          {page === "relatorios" && (
            <ReportsPage
              report={reportsQuery.data}
              loading={reportsQuery.isLoading}
              period={reportPeriod}
              setPeriod={setReportPeriod}
              startDate={reportStartDate}
              setStartDate={setReportStartDate}
              endDate={reportEndDate}
              setEndDate={setReportEndDate}
              eventType={reportEventType}
              setEventType={setReportEventType}
              discipulatorId={reportDiscipulatorId}
              setDiscipulatorId={setReportDiscipulatorId}
              youthId={reportYouthId}
              setYouthId={setReportYouthId}
              lowFrequencyThreshold={lowFrequencyThreshold}
              setLowFrequencyThreshold={setLowFrequencyThreshold}
              maxConsecutiveAbsences={maxConsecutiveAbsences}
              setMaxConsecutiveAbsences={setMaxConsecutiveAbsences}
              discipulators={discipulators}
              youths={youths}
              onRefresh={() => reportsQuery.refetch()}
            />
          )}
          {page === "aniversarios" && (
            <CalendarPage youths={youths} onBirthday={handleManualBirthday} />
          )}
          {page === "mensagens" && <MessagesPage />}
          {page === "configuracoes" && (
            <SettingsPage
              whatsappStatus={whatsappStatusQuery.data}
              birthday={birthdayTemplate}
              setBirthday={setBirthdayTemplate}
              absence={absenceTemplate}
              setAbsence={setAbsenceTemplate}
              whatsappPhoneId={whatsappPhoneId}
              setWhatsappPhoneId={setWhatsappPhoneId}
              whatsappBusinessId={whatsappBusinessId}
              setWhatsappBusinessId={setWhatsappBusinessId}
              whatsappToken={whatsappToken}
              setWhatsappToken={setWhatsappToken}
              whatsappEnabled={whatsappEnabled}
              setWhatsappEnabled={setWhatsappEnabled}
              settings={settingsQuery.data}
              onSave={saveSettings}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Landing() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f7f8fa] px-4 py-4 text-[#18212f] sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full min-w-0 max-w-6xl flex-col justify-between overflow-hidden rounded-[2rem] bg-[#1d2a39] p-5 text-white shadow-2xl sm:min-h-[calc(100vh-4rem)] sm:p-8 md:p-14">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#d5a77c] text-[#1d2a39]">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <span className="font-serif text-lg leading-tight sm:text-xl">
              Controle Jovens Sedentos
            </span>
          </div>
          <span className="rounded-full border border-white/15 px-3 py-2 text-center text-xs text-[#bdc9d4] sm:px-4">
            Painel administrativo
          </span>
        </div>
        <div className="grid min-w-0 gap-8 py-10 sm:gap-12 sm:py-16 md:grid-cols-[1.05fr_.95fr] md:items-center">
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#d5a77c]">
              Cuidado que acompanha
            </p>
            <h1 className="max-w-full break-words font-serif text-[clamp(2.75rem,13vw,4.5rem)] leading-[1.04] md:max-w-xl md:text-7xl">
              Nenhum jovem passa despercebido.
            </h1>
            <p className="mt-7 max-w-lg break-words text-base leading-7 text-[#c4ced8]">
              Um espaço elegante e seguro para organizar discipulado, presença,
              aniversários e os próximos gestos de cuidado.
            </p>
            <Button
              onClick={() => startLogin()}
              className="mt-8 w-full justify-center rounded-full bg-[#d5a77c] px-6 py-6 text-[#1d2a39] hover:bg-[#e2b58c] sm:w-fit"
            >
              Entrar no painel <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="relative min-w-0">
            <div className="absolute -inset-5 rounded-[2rem] bg-[#d5a77c]/10 blur-2xl" />
            <Card className="relative min-w-0 overflow-hidden border-white/10 bg-white/10 text-white backdrop-blur">
              <CardContent className="space-y-5 p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#bdc9d4]">
                      Visão de hoje
                    </p>
                    <p className="mt-2 font-serif text-3xl">Acompanhamento</p>
                  </div>
                  <Sparkles className="h-6 w-6 text-[#d5a77c]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-3xl font-semibold">24</p>
                    <p className="mt-1 text-xs text-[#bdc9d4]">jovens ativos</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-3xl font-semibold">04</p>
                    <p className="mt-1 text-xs text-[#bdc9d4]">pedem atenção</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-[#d5a77c] p-4 text-[#1d2a39]">
                  <p className="text-sm font-semibold">
                    Hoje é dia de celebrar
                  </p>
                  <p className="mt-1 text-xs opacity-75">
                    Aniversários, presença e cuidado em um só lugar.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="flex flex-col gap-2 break-words text-xs text-[#95a6b5] md:flex-row md:items-center md:justify-between">
          <span>Dados protegidos e acesso por autenticação.</span>
          <span>Feito para caminhar junto.</span>
        </div>
      </div>
    </div>
  );
}

function ClipboardIcon() {
  return <ClipboardCheck className="mr-2 h-4 w-4" />;
}

function Dashboard({
  data,
  youths,
  onBirthday,
  onNavigate,
  absenceSummary,
  onUpdateFollowUp,
}: {
  data: any;
  youths: any[];
  onBirthday: (id: number) => void;
  onNavigate: (path: string) => void;
  absenceSummary: any;
  onUpdateFollowUp: (id: number, status: string) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [
            "Jovens ativos",
            data.activeYouthCount,
            Users,
            "+8% este mês",
            "text-[#547d6a]",
          ],
          [
            "Discipuladores",
            data.discipulatorCount,
            HeartHandshake,
            "rede ativa",
            "text-[#a16d3e]",
          ],
          [
            "Aniversários no mês",
            data.upcoming?.length ?? 5,
            CalendarDays,
            "2 nesta semana",
            "text-[#6e7697]",
          ],
          [
            "Acompanhamento",
            data.pendingFollowUps,
            CircleAlert,
            "pedem atenção",
            "text-[#b25e50]",
          ],
        ].map(([label, value, Icon, detail, color]: any) => (
          <Card
            key={label}
            className="border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-[#858d97]">{label}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight">
                    {value}
                  </p>
                  <p className="mt-2 text-xs text-[#a0a6ae]">{detail}</p>
                </div>
                <div className={`rounded-2xl bg-[#f7f4ef] p-3 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
      <button
        type="button"
        onClick={() => onNavigate("/notificacoes")}
        className="w-full text-left"
      >
        <Card className="border-0 bg-[#1d2a39] text-white shadow-[0_8px_30px_rgba(26,34,47,0.12)] transition hover:-translate-y-0.5 hover:bg-[#243548]">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#d5a77c] p-3 text-[#1d2a39]">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="font-serif text-xl">Notificações de faltas</p>
                <p className="mt-1 text-xs text-[#bdc9d4]">
                  Faltas registradas com discipulador e status de envio.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4 sm:gap-4">
              <div>
                <p className="text-xl font-semibold">{absenceSummary.total}</p>
                <p className="text-[10px] text-[#bdc9d4]">faltas</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-[#f3c98d]">
                  {absenceSummary.pending}
                </p>
                <p className="text-[10px] text-[#bdc9d4]">pendentes</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-[#9bd0ad]">
                  {absenceSummary.sent}
                </p>
                <p className="text-[10px] text-[#bdc9d4]">enviadas</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-[#f0a38f]">
                  {absenceSummary.error}
                </p>
                <p className="text-[10px] text-[#bdc9d4]">erros</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </button>
      <section className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
        <Card className="border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-serif text-2xl">
                Acompanhamento necessário
              </CardTitle>
              <p className="mt-1 text-sm text-[#8a929d]">
                Presenças que pedem uma conversa cuidadosa.
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => onNavigate("/presenca")}
              className="text-xs text-[#a16d3e]"
            >
              Ver tudo <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.recentAbsences?.length
              ? data.recentAbsences
              : [
                  {
                    youth: "Gabriel Almeida",
                    discipulator: "João Martins",
                    createdAt: "2026-08-17",
                    status: "pending",
                  },
                  {
                    youth: "Mariana Costa",
                    discipulator: "Ana Paula",
                    createdAt: "2026-08-16",
                    status: "contacted",
                  },
                ]
            ).map((item: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-2xl border border-[#eef0f2] px-4 py-3 transition hover:bg-[#fbfaf8]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f0e6dc] text-xs font-semibold text-[#966438]">
                    {initials(item.youth)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {item.youth}
                    </p>
                    <p className="truncate text-xs text-[#8b929c]">
                      → {item.discipulator} · {formatDate(item.createdAt)}
                    </p>
                  </div>
                </div>
                <select
                  aria-label={`Status do acompanhamento de ${item.youth}`}
                  value={item.status ?? "pending"}
                  disabled={!item.followUpId}
                  onChange={event => {
                    if (item.followUpId)
                      onUpdateFollowUp(item.followUpId, event.target.value);
                  }}
                  className="h-9 max-w-[150px] rounded-full border border-[#eadfce] bg-white px-3 text-xs font-medium text-[#9b5d4c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="pending">Pendente</option>
                  <option value="contacted">Contatado</option>
                  <option value="talked">Conversou</option>
                  <option value="justification">Justificativa recebida</option>
                  <option value="resolved">Resolvido</option>
                </select>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-0 bg-[#1d2a39] text-white shadow-[0_8px_30px_rgba(26,34,47,0.12)]">
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.18em] text-[#bdc9d4]">
              Hoje
            </p>
            <CardTitle className="mt-2 font-serif text-3xl font-normal">
              Um gesto pode mudar uma jornada.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Separator className="mb-5 bg-white/15" />
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-semibold">
                  {data.birthdays?.length ?? 1}
                </p>
                <p className="mt-1 text-sm text-[#bdc9d4]">
                  aniversariante hoje
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-[#d5a77c]" />
            </div>
            {data.birthdays?.[0] && (
              <Button
                onClick={() => onBirthday(data.birthdays[0].id)}
                className="mt-6 w-full rounded-xl bg-[#d5a77c] text-[#1d2a39] hover:bg-[#e2b58c]"
              >
                <MessageCircle className="mr-2 h-4 w-4" /> Preparar mensagem
              </Button>
            )}
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <BirthdayList
          youths={data.upcoming?.length ? data.upcoming : youths.slice(0, 4)}
          onBirthday={onBirthday}
        />
        <Card className="border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif text-2xl">
                  Último encontro
                </CardTitle>
                <p className="mt-1 text-sm text-[#8a929d]">
                  {data.lastEvent
                    ? `${data.lastEvent.eventType} · ${formatDate(data.lastEvent.eventDate)}`
                    : "Nenhum culto registrado"}
                </p>
              </div>
              <span className="rounded-full bg-[#edf5f0] px-3 py-1 text-xs font-medium text-[#4f8069]">
                Concluído
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f6f8f7] p-4">
                <p className="text-2xl font-semibold">
                  {data.lastEventCounts?.present ?? 0}
                </p>
                <p className="mt-1 text-xs text-[#85908a]">presentes</p>
              </div>
              <div className="rounded-2xl bg-[#fff5ef] p-4">
                <p className="text-2xl font-semibold text-[#b5674e]">
                  {data.lastEventCounts?.absent ?? 0}
                </p>
                <p className="mt-1 text-xs text-[#a58b80]">faltas</p>
              </div>
              <div className="rounded-2xl bg-[#f4f3f8] p-4">
                <p className="text-2xl font-semibold text-[#73749a]">
                  {data.lastEventCounts?.unmarked ?? 0}
                </p>
                <p className="mt-1 text-xs text-[#8f90a7]">sem marcação</p>
              </div>
            </div>
            <Button
              onClick={() => onNavigate("/presenca")}
              variant="outline"
              className="mt-5 w-full rounded-xl border-[#e3e5e8]"
            >
              Abrir controle de presença{" "}
              <ChevronRight className="ml-auto h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function BirthdayList({
  youths,
  onBirthday,
}: {
  youths: any[];
  onBirthday: (id: number) => void;
}) {
  return (
    <Card className="border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-serif text-2xl">
            Próximos aniversários
          </CardTitle>
          <p className="mt-1 text-sm text-[#8a929d]">
            Celebre cada pessoa no tempo certo.
          </p>
        </div>
        <CalendarDays className="h-5 w-5 text-[#b27b4b]" />
      </CardHeader>
      <CardContent className="space-y-1">
        {youths.slice(0, 5).map((youth: any, index: number) => {
          const today = isBirthdayToday(youth.birthDate);
          return (
            <div
              key={youth.id ?? index}
              className={`group flex items-center justify-between rounded-2xl px-3 py-3 transition ${today ? "border border-[#e6b77c] bg-[#fff5e8] shadow-[0_8px_20px_rgba(207,142,67,0.12)]" : "hover:bg-[#fbfaf8]"}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold ${today ? "bg-[#e6b77c] text-[#5c3a1f]" : "bg-[#e9eef3] text-[#536a7f]"}`}
                >
                  {today ? <Cake className="h-5 w-5" /> : initials(youth.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{youth.name}</p>
                    {today && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#d28b42] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        <Cake className="h-3 w-3" /> Hoje
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs ${today ? "font-semibold text-[#9a6538]" : "text-[#8b929c]"}`}
                  >
                    {formatDate(youth.birthDate)}
                    {today ? " · aniversário hoje" : ""}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => onBirthday(youth.id)}
                variant="ghost"
                className="opacity-0 transition group-hover:opacity-100"
                aria-label={`Preparar mensagem para ${youth.name}`}
              >
                <MessageCircle className="h-4 w-4 text-[#a16d3e]" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function YouthPage({
  youths,
  search,
  setSearch,
  ageMin,
  setAgeMin,
  ageMax,
  setAgeMax,
  sort,
  setSort,
  discipulatorFilter,
  setDiscipulatorFilter,
  discipulators,
  onBirthday,
  onEditWhatsapp,
  onReassign,
  onCreate,
  onImport,
}: any) {
  return (
    <Card className="border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]">
      <CardHeader>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <CardTitle className="font-serif text-3xl">
              Jovens cadastrados
            </CardTitle>
            <p className="mt-1 text-sm text-[#8a929d]">
              Uma visão completa de cada pessoa acompanhada.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[#dfe3e7] bg-white px-4 py-2 text-sm font-medium">
              <span>Importar CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) onImport(file);
                }}
              />
            </label>
            <Button
              onClick={onCreate}
              className="w-full justify-center rounded-full bg-[#18212f] text-white hover:bg-[#2e3a4d] sm:w-auto"
            >
              Adicionar jovem
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <div className="relative w-full min-w-0 flex-1 sm:min-w-[240px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[#9ba2ab]" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por nome..."
              className="rounded-xl border-[#e5e7ea] pl-9"
            />
          </div>
          <Input
            value={ageMin}
            onChange={event => setAgeMin(event.target.value)}
            placeholder="Idade mín."
            inputMode="numeric"
            className="w-full rounded-xl border-[#e5e7ea] sm:w-28"
          />
          <Input
            value={ageMax}
            onChange={event => setAgeMax(event.target.value)}
            placeholder="Idade máx."
            inputMode="numeric"
            className="w-full rounded-xl border-[#e5e7ea] sm:w-28"
          />
          <select
            value={discipulatorFilter}
            onChange={event => setDiscipulatorFilter(event.target.value)}
            className="h-10 w-full rounded-xl border border-[#e5e7ea] bg-white px-3 text-sm text-[#68717d] sm:w-auto"
          >
            <option value="">Todos os discipuladores</option>
            {discipulators.map((item: any) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={event =>
              setSort(event.target.value as "name" | "birthday")
            }
            className="h-10 w-full rounded-xl border border-[#e5e7ea] bg-white px-3 text-sm text-[#68717d] sm:w-auto"
          >
            <option value="name">Ordenar por nome</option>
            <option value="birthday">Ordenar por aniversário</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-[#eef0f2] text-xs uppercase tracking-wider text-[#9aa1aa]">
              <tr>
                <th className="pb-3 font-medium">Jovem</th>
                <th className="pb-3 font-medium">Aniversário</th>
                <th className="pb-3 font-medium">Discipulador</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {youths.map((youth: any) => (
                <tr
                  key={youth.id}
                  className="border-b border-[#f0f1f3] last:border-0"
                >
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0e6dc] text-xs font-semibold text-[#966438]">
                        {initials(youth.name)}
                      </div>
                      <div>
                        <p className="font-semibold">{youth.name}</p>
                        <p className="text-xs text-[#9299a2]">
                          {youth.whatsapp}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-[#68717d]">
                    {formatDate(youth.birthDate)}
                  </td>
                  <td className="py-4 text-[#68717d]">
                    {youth.discipulatorName ?? "—"}
                  </td>
                  <td className="py-4">
                    <Badge className="border-0 bg-[#edf5f0] text-[#4f8069]">
                      Ativo
                    </Badge>
                  </td>
                  <td className="py-4 text-right">
                    <Button
                      onClick={() => onBirthday(youth.id)}
                      variant="ghost"
                      size="icon"
                    >
                      <MessageCircle className="h-4 w-4 text-[#a16d3e]" />
                    </Button>
                    <Button
                      onClick={() =>
                        onEditWhatsapp(youth.id, youth.whatsapp ?? "")
                      }
                      variant="ghost"
                      size="icon"
                      title="Editar WhatsApp"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => {
                        const selected = window.prompt(
                          "ID do novo discipulador (deixe vazio para remover)",
                          youth.discipulatorId
                            ? String(youth.discipulatorId)
                            : ""
                        );
                        if (selected !== null)
                          onReassign(
                            youth.id,
                            selected.trim() ? Number(selected) : null
                          );
                      }}
                      variant="ghost"
                      size="icon"
                      title="Corrigir discipulador"
                    >
                      <UserRound className="h-4 w-4 text-[#536a7f]" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscipulatorsPage({
  discipulators,
  accounts,
  onUpdate,
  onUpdateAliases,
  onLinkAccount,
  onCreate,
}: any) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a16d3e]">
            Rede de cuidado
          </p>
          <h2 className="mt-2 font-serif text-3xl">Discipuladores</h2>
          <p className="mt-1 text-sm text-[#8a929d]">
            Pessoas responsáveis por caminhar de perto.
          </p>
        </div>
        <Button
          onClick={onCreate}
          className="w-full justify-center rounded-full bg-[#18212f] text-white hover:bg-[#2e3a4d] sm:w-auto"
        >
          Novo discipulador
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {discipulators.map((item: any) => (
          <Card
            key={item.id}
            className="border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9eef3] font-semibold text-[#536a7f]">
                    {initials(item.name)}
                  </div>
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-[#9299a2]">
                      {item.whatsapp || "WhatsApp não informado"}
                    </p>
                  </div>
                </div>
                <Badge className="border-0 bg-[#edf5f0] text-[#4f8069]">
                  Ativo
                </Badge>
              </div>
              <Separator className="my-5" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#8b929c]">Discípulos vinculados</span>
                <span className="font-semibold">{item.youthCount ?? 0}</span>
              </div>
              <div className="mt-3 rounded-xl bg-[#f8f5ef] px-3 py-2 text-xs text-[#675746]">
                {item.notes || "Sem apelidos cadastrados"}
              </div>
              <div className="mt-3 rounded-xl border border-[#eef0f2] bg-white px-3 py-2 text-xs leading-5 text-[#68717d]">
                <span className="font-semibold text-[#18212f]">
                  Discípulos:
                </span>{" "}
                {item.youthNames || "Nenhum discípulo vinculado"}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <DiscipulatorEditDialog item={item} onUpdate={onUpdate} />
                <Button
                  variant="outline"
                  className="min-h-10 rounded-xl border-[#d8dce1] bg-white px-3 text-xs text-[#18212f] hover:bg-[#f3eee7]"
                >
                  Acompanhamento <ChevronRight className="ml-auto h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">
            Acessos dos discipuladores
          </CardTitle>
          <p className="text-sm text-[#8a929d]">
            Cada pessoa entra com a própria conta OAuth. Vincule o usuário ao
            discipulador correspondente.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {accounts.length ? (
            accounts.map((account: any) => (
              <div
                key={account.id}
                className="flex flex-col gap-3 rounded-2xl border border-[#eef0f2] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold">
                    {account.name || "Usuário sem nome"}
                  </p>
                  <p className="text-xs text-[#9299a2]">
                    {account.email || "E-mail não informado"} ·{" "}
                    {account.role === "admin"
                      ? "Administrador"
                      : account.discipulatorId
                        ? "Discipulador vinculado"
                        : "Aguardando vínculo"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    const selected = window.prompt(
                      "ID do discipulador para esta conta",
                      account.discipulatorId
                        ? String(account.discipulatorId)
                        : ""
                    );
                    if (selected !== null)
                      onLinkAccount(account.id, Number(selected));
                  }}
                >
                  Vincular discipulador
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#8a929d]">
              Nenhuma conta autenticada adicional encontrada ainda. Peça ao
              discipulador para entrar uma vez e atualize esta tela.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
function AttendancePage({
  date,
  setDate,
  eventType,
  setEventType,
  attendance,
  onToggle,
  absenceCount,
  summary,
  serviceSummary,
  onOpenNotifications,
  onOpenAbsences,
}: any) {
  const cultos = [
    { name: "Sedentos +20", day: "Sexta-feira", weekday: 5 },
    { name: "Culto Sedentos", day: "Sábado", weekday: 6 },
    { name: "Cultos de Domingo", day: "Domingo", weekday: 0 },
  ];
  const selectCulto = (culto: any) => {
    setEventType(culto.name);
    const selectedDate = new Date(`${date}T12:00:00`);
    const delta = (culto.weekday - selectedDate.getDay() + 7) % 7;
    selectedDate.setDate(selectedDate.getDate() + delta);
    setDate(selectedDate.toISOString().slice(0, 10));
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a16d3e]">
            Registro explícito
          </p>
          <h2 className="mt-2 font-serif text-3xl">Presença</h2>
          <p className="mt-1 text-sm text-[#8a929d]">
            Escolha o culto, a data e marque somente quem faltou.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full rounded-xl border-[#e3e5e8] bg-white text-[#18212f] sm:w-auto"
          />
          {cultos.map(culto => (
            <Button
              key={culto.name}
              onClick={() => selectCulto(culto)}
              className={`w-full justify-center rounded-xl border px-3 text-sm sm:w-auto ${eventType === culto.name ? "border-[#b27b4b] bg-[#b27b4b] text-white hover:bg-[#936038]" : "border-[#d8dce1] bg-white text-[#18212f] hover:bg-[#f3eee7]"}`}
            >
              {culto.name}
              <span className="ml-1 text-[10px] opacity-75">· {culto.day}</span>
            </Button>
          ))}
        </div>
      </div>
      {summary?.last && (
        <Card className="border border-[#eadfce] bg-[#fffaf4]">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#7d572f]">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-semibold">Presença registrada!</p>
              </div>
              <p className="mt-2 text-sm text-[#6c5845]">
                A falta de <strong>{summary.last.youthName}</strong> gerou uma
                notificação para{" "}
                <strong>
                  {summary.last.discipulatorName ??
                    "Discipulador não cadastrado"}
                </strong>
                .
              </p>
              <p className="mt-1 text-xs text-[#8a929d]">
                Status:{" "}
                {statusLabel(summary.last.notificationStatus ?? "error")}
                {summary.last.recipient
                  ? ` · WhatsApp ${summary.last.recipient}`
                  : " · Não há destinatário cadastrado"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={onOpenNotifications}
                className="rounded-xl bg-[#18212f] text-white hover:bg-[#2c3c4f]"
              >
                Ver notificações
              </Button>
              <Button
                onClick={onOpenAbsences}
                variant="outline"
                className="rounded-xl border-[#d8dce1] bg-white text-[#18212f]"
              >
                Ir para faltas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <ServiceSummary
        summary={serviceSummary}
        eventType={eventType}
        eventDate={date}
      />
      <Card className="border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-serif text-2xl">{eventType}</CardTitle>
            <p className="mt-1 text-sm text-[#8a929d]">
              {formatDate(date)} · {attendance.length} jovens ativos
            </p>
          </div>
          <Badge className="border-0 bg-[#fff3e9] text-[#a16d3e]">
            {absenceCount} marcações nesta sessão
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {attendance.map((person: any) => (
            <div
              key={person.youthId}
              className="flex items-center justify-between rounded-2xl border border-[#eef0f2] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0e6dc] text-xs font-semibold text-[#966438]">
                  {initials(person.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{person.name}</p>
                  <p className="text-xs text-[#9299a2]">
                    {person.followUpStatus === "pending"
                      ? "Acompanhamento pendente"
                      : person.status === "present"
                        ? "Presente"
                        : "Sem marcação"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-pressed={person.status === "absent"}
                aria-label={
                  person.status === "absent"
                    ? `Desmarcar falta de ${person.name}`
                    : `Marcar falta de ${person.name}`
                }
                onClick={() =>
                  onToggle(person.youthId, person.status !== "absent")
                }
                className={`group/absence inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-left text-xs font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b27b4b] focus-visible:ring-offset-2 active:scale-[0.97] ${person.status === "absent" ? "border-[#c56f57] bg-[#fff0e9] text-[#a94f3f] shadow-[0_5px_16px_rgba(197,111,87,0.18)]" : "border-[#dfe3e7] bg-white text-[#68717d] hover:border-[#b27b4b] hover:bg-[#fffaf4] hover:text-[#9a6538]"}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-200 ${person.status === "absent" ? "border-[#c56f57] bg-[#c56f57] text-white" : "border-[#cfd5da] bg-[#f7f8fa] text-transparent group-hover/absence:border-[#b27b4b]"}`}
                >
                  <Check
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${person.status === "absent" ? "scale-100" : "scale-75"}`}
                  />
                </span>
                <span>
                  {person.status === "absent"
                    ? "Falta registrada"
                    : "Marcar falta"}
                </span>
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ServiceSummary({ summary, eventType, eventDate }: any) {
  const totals = summary?.totals ?? {
    active: 0,
    present: 0,
    absent: 0,
    unmarked: 0,
    notifications: 0,
  };
  const absentRows = (summary?.rows ?? []).filter(
    (row: any) => row.status === "absent"
  );
  return (
    <Card className="border border-[#e7ddd0] bg-[#fffaf4] shadow-[0_8px_30px_rgba(26,34,47,0.03)]">
      <CardHeader>
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a16d3e]">
              Histórico por culto
            </p>
            <CardTitle className="font-serif text-2xl">
              Resumo do Culto
            </CardTitle>
            <p className="mt-1 text-sm text-[#8a929d]">
              {eventType} · {formatDate(eventDate)}
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#7d572f]">
            Atualiza ao marcar presença
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-xl bg-white p-3">
            <p className="text-2xl font-semibold">{totals.active}</p>
            <p className="text-xs text-[#8a929d]">ativos</p>
          </div>
          <div className="rounded-xl bg-[#edf5f0] p-3">
            <p className="text-2xl font-semibold text-[#4f8069]">
              {totals.present}
            </p>
            <p className="text-xs text-[#6c8878]">presentes</p>
          </div>
          <div className="rounded-xl bg-[#fff0e9] p-3">
            <p className="text-2xl font-semibold text-[#b25e50]">
              {totals.absent}
            </p>
            <p className="text-xs text-[#996c62]">faltantes</p>
          </div>
          <div className="rounded-xl bg-white p-3">
            <p className="text-2xl font-semibold text-[#73749a]">
              {totals.unmarked}
            </p>
            <p className="text-xs text-[#8a929d]">sem marcação</p>
          </div>
          <div className="rounded-xl bg-[#f4f0e8] p-3">
            <p className="text-2xl font-semibold text-[#9a6b3f]">
              {totals.notifications}
            </p>
            <p className="text-xs text-[#8a929d]">notificações</p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[#eef0f2] text-xs uppercase tracking-wider text-[#9aa1aa]">
              <tr>
                <th className="px-4 py-3 font-medium">Faltante</th>
                <th className="px-4 py-3 font-medium">Discipulador</th>
                <th className="px-4 py-3 font-medium">WhatsApp</th>
                <th className="px-4 py-3 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {absentRows.length ? (
                absentRows.map((row: any) => (
                  <tr
                    key={row.youthId}
                    className="border-b border-[#f0f1f3] last:border-0"
                  >
                    <td className="px-4 py-3 font-semibold">{row.youthName}</td>
                    <td className="px-4 py-3 text-[#68717d]">
                      {row.discipulatorName ?? "Discipulador não encontrado"}
                    </td>
                    <td className="px-4 py-3 text-[#68717d]">
                      {row.recipient ?? "Não cadastrado"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          row.notificationStatus === "sent"
                            ? "border-0 bg-[#edf5f0] text-[#4f8069]"
                            : row.notificationStatus === "error"
                              ? "border-0 bg-[#fff0e9] text-[#b25e50]"
                              : "border-0 bg-[#fff5e8] text-[#9a6b3f]"
                        }
                      >
                        {row.notificationStatus
                          ? statusLabel(row.notificationStatus)
                          : "Sem notificação"}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-[#8a929d]"
                  >
                    Nenhuma falta registrada neste culto.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarPage({ youths, onBirthday }: any) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const upcoming = sortUpcomingBirthdays(youths).slice(0, 5);
  const byDay = (day: number) =>
    youths.filter((youth: any) => {
      const raw =
        youth.birthDate instanceof Date
          ? `${String(youth.birthDate.getMonth() + 1).padStart(2, "0")}-${String(youth.birthDate.getDate()).padStart(2, "0")}`
          : String(youth.birthDate).slice(5, 10);
      return (
        raw ===
        `${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      );
    });
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) =>
    index < firstDay ? null : index - firstDay + 1
  );
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a16d3e]">
          Agenda de celebrações
        </p>
        <h2 className="mt-2 font-serif text-3xl">Aniversários</h2>
        <p className="mt-1 text-sm text-[#8a929d]">
          Próximos aniversários a partir de hoje · {youths.length} pessoas no
          acompanhamento
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <Card className="border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]">
          <CardContent className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Mês anterior"
                onClick={() => setCursor(new Date(year, month - 1, 1))}
              >
                ‹
              </Button>
              <p className="font-serif text-xl capitalize">{monthLabel}</p>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Próximo mês"
                onClick={() => setCursor(new Date(year, month + 1, 1))}
              >
                ›
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-[#9299a2]">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
                <div key={index} className="pb-2 font-semibold">
                  {day}
                </div>
              ))}
              {cells.map((day, index) => {
                const people = day ? byDay(day) : [];
                const isToday =
                  day === new Date().getDate() &&
                  month === new Date().getMonth() &&
                  year === new Date().getFullYear();
                return (
                  <div
                    key={`${year}-${month}-${index}`}
                    className={`relative min-h-16 rounded-xl border p-2 text-left ${isToday ? "border-[#b27b4b] bg-[#fff5ed]" : people.some((person: any) => isBirthdayWithinNextDays(person.birthDate, 7)) ? "border-[#e6b77c] bg-[#fffaf0]" : "border-[#f0f1f3]"}`}
                  >
                    <span
                      className={
                        isToday ? "font-bold text-[#a16d3e]" : "text-[#68717d]"
                      }
                    >
                      {day ?? ""}
                    </span>
                    {people.length > 0 && (
                      <span className="absolute bottom-2 left-2 right-2 truncate rounded-md bg-[#eadbcc] px-1 py-0.5 text-[9px] font-semibold text-[#855a36]">
                        {people[0].name.split(" ")[0]}
                        {people.length > 1 ? ` +${people.length - 1}` : ""}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-[#1d2a39] text-white shadow-[0_8px_30px_rgba(26,34,47,0.12)]">
          <CardHeader>
            <CardTitle className="font-serif text-2xl font-normal">
              Próximos a celebrar
            </CardTitle>
            <p className="text-xs text-[#bdc9d4]">
              Em ordem cronológica a partir de hoje
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map((youth: any) => {
              const today = isBirthdayToday(youth.birthDate);
              const soon = isBirthdayWithinNextDays(youth.birthDate, 7);
              return (
                <div
                  key={youth.id}
                  className={`flex items-center justify-between rounded-xl px-3 py-3 ${today ? "border border-[#d89a55] bg-[#a8713d]" : soon ? "border border-[#b98750] bg-[#8b633d]/60" : "bg-white/5"}`}
                >
                  <div className="flex items-center gap-2">
                    {today && <Cake className="h-4 w-4 text-[#ffdca8]" />}
                    <div>
                      <p className="text-sm font-medium">
                        {youth.name}
                        {today ? " · Hoje" : soon ? " · Próximos 7 dias" : ""}
                      </p>
                      <p className="text-xs text-[#bdc9d4]">
                        {formatDate(youth.birthDate)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => onBirthday(youth.id)}
                    variant="ghost"
                    size="icon"
                    aria-label={`Preparar mensagem para ${youth.name}`}
                  >
                    <Send className="h-4 w-4 text-[#d5a77c]" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LegacyCalendarPage({ youths, onBirthday }: any) {
  const upcoming = sortUpcomingBirthdays(youths).slice(0, 5);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a16d3e]">
          Agenda de celebrações
        </p>
        <h2 className="mt-2 font-serif text-3xl">Aniversários</h2>
        <p className="mt-1 text-sm text-[#8a929d]">
          Agosto de 2026 · {youths.length} pessoas no acompanhamento
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <Card className="border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]">
          <CardContent className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <Button variant="ghost" size="icon">
                ‹
              </Button>
              <p className="font-serif text-xl">Agosto 2026</p>
              <Button variant="ghost" size="icon">
                ›
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-[#9299a2]">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
                <div key={index} className="pb-2 font-semibold">
                  {day}
                </div>
              ))}
              {Array.from({ length: 31 }, (_, index) => index + 1).map(day => {
                const birthday = youths.find(
                  (y: any) =>
                    new Date(y.birthDate).getDate() === day &&
                    new Date(y.birthDate).getMonth() === 7
                );
                return (
                  <div
                    key={day}
                    className={`relative min-h-16 rounded-xl border p-2 text-left ${day === 19 ? "border-[#b27b4b] bg-[#fff5ed]" : "border-[#f0f1f3]"}`}
                  >
                    <span
                      className={
                        day === 19
                          ? "font-bold text-[#a16d3e]"
                          : "text-[#68717d]"
                      }
                    >
                      {day}
                    </span>
                    {birthday && (
                      <span className="absolute bottom-2 left-2 right-2 truncate rounded-md bg-[#eadbcc] px-1 py-0.5 text-[9px] font-semibold text-[#855a36]">
                        {birthday.name.split(" ")[0]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-[#1d2a39] text-white shadow-[0_8px_30px_rgba(26,34,47,0.12)]">
          <CardHeader>
            <CardTitle className="font-serif text-2xl font-normal">
              Próximos a celebrar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map((youth: any) => (
              <div
                key={youth.id}
                className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{youth.name}</p>
                  <p className="text-xs text-[#bdc9d4]">
                    {formatDate(youth.birthDate)}
                  </p>
                </div>
                <Button
                  onClick={() => onBirthday(youth.id)}
                  variant="ghost"
                  size="icon"
                >
                  <Send className="h-4 w-4 text-[#d5a77c]" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function statusLabel(status: string) {
  return (
    (
      {
        pending: "Pendente",
        sending: "Enviando",
        sent: "Enviada",
        error: "Erro",
        cancelled: "Cancelada",
      } as Record<string, string>
    )[status] ?? status
  );
}
function statusClass(status: string) {
  return status === "sent"
    ? "bg-[#edf5f0] text-[#4f8069]"
    : status === "error"
      ? "bg-[#fff0e9] text-[#a94f3f]"
      : status === "cancelled"
        ? "bg-[#f0f1f3] text-[#68717d]"
        : "bg-[#fff3e9] text-[#a16d3e]";
}
function AbsencesPage({ rows, summary, onOpenNotifications }: any) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const filteredRows = rows.filter(
    (row: any) =>
      `${row.youthName} ${row.discipulatorName ?? ""} ${row.eventType}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (statusFilter === "all" ||
        (row.notificationStatus ?? "error") === statusFilter)
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a16d3e]">
            Rastreabilidade
          </p>
          <h2 className="mt-2 font-serif text-3xl">Faltas</h2>
          <p className="mt-1 text-sm text-[#8a929d]">
            Cada falta gera acompanhamento e uma notificação visível.
          </p>
        </div>
        <Button
          onClick={onOpenNotifications}
          className="w-full justify-center rounded-xl bg-[#18212f] text-white hover:bg-[#2c3c4f] sm:w-auto"
        >
          <Bell className="mr-2 h-4 w-4" /> Ver notificações
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-0 bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-[#8a929d]">Faltas registradas</p>
            <p className="mt-2 text-2xl font-semibold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-[#8a929d]">Notificações pendentes</p>
            <p className="mt-2 text-2xl font-semibold text-[#a16d3e]">
              {summary.pending}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-[#8a929d]">Com erro</p>
            <p className="mt-2 text-2xl font-semibold text-[#a94f3f]">
              {summary.error}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar jovem, discipulador ou culto..."
              className="min-w-0 flex-1 rounded-xl border-[#e3e5e8]"
            />
            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
              className="h-10 w-full rounded-xl border border-[#e3e5e8] bg-white px-3 text-sm text-[#68717d] sm:w-auto"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="sent">Enviadas</option>
              <option value="error">Com erro</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
          <p className="text-xs text-[#8a929d]">
            {filteredRows.length} de {rows.length} faltas
          </p>
          <div className="space-y-3 sm:hidden">
            {filteredRows.length ? (
              filteredRows.map((row: any) => (
                <div
                  key={row.attendanceId}
                  className="rounded-2xl border border-[#eef0f2] bg-[#fcfcfb] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.youthName}</p>
                      <p className="mt-1 text-xs text-[#68717d]">
                        {row.eventType} · {formatDate(row.eventDate)}
                      </p>
                    </div>
                    <Badge className="w-fit shrink-0 border-0 bg-[#fff0e9] text-[#a94f3f]">
                      Faltou
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs">
                    <p>
                      <span className="text-[#9aa1aa]">Discipulador:</span>{" "}
                      <span className="font-medium text-[#4d5662]">
                        {row.discipulatorName ?? "Não cadastrado"}
                      </span>
                    </p>
                    <p>
                      <span className="text-[#9aa1aa]">Notificação:</span>{" "}
                      <Badge
                        className={`ml-1 border-0 ${statusClass(row.notificationStatus ?? "error")}`}
                      >
                        {row.notificationStatus
                          ? statusLabel(row.notificationStatus)
                          : "Sem registro"}
                      </Badge>
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#dfe3e7] p-8 text-center text-sm text-[#8a929d]">
                Nenhuma falta registrada ainda.
              </div>
            )}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[1.2fr_1fr_1fr_110px_110px_140px] border-b border-[#eef0f2] px-5 py-3 text-[11px] uppercase tracking-wider text-[#9aa1aa]">
                <span>Discípulo</span>
                <span>Discipulador</span>
                <span>Culto</span>
                <span>Data</span>
                <span>Status</span>
                <span>Notificação</span>
              </div>
              {filteredRows.length ? (
                filteredRows.map((row: any) => (
                  <div
                    key={row.attendanceId}
                    className="grid grid-cols-[1.2fr_1fr_1fr_110px_110px_140px] items-center border-b border-[#f2f3f4] px-5 py-4 text-sm last:border-0"
                  >
                    <span className="font-semibold">{row.youthName}</span>
                    <span className="text-[#68717d]">
                      {row.discipulatorName ?? "Não cadastrado"}
                    </span>
                    <span className="text-[#68717d]">{row.eventType}</span>
                    <span className="text-[#68717d]">
                      {formatDate(row.eventDate)}
                    </span>
                    <Badge className="w-fit border-0 bg-[#fff0e9] text-[#a94f3f]">
                      Faltou
                    </Badge>
                    <Badge
                      className={`w-fit border-0 ${statusClass(row.notificationStatus ?? "error")}`}
                    >
                      {row.notificationStatus
                        ? statusLabel(row.notificationStatus)
                        : "Sem registro"}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-[#8a929d]">
                  Nenhuma falta registrada ainda.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
function NotificationsPage({ rows, onSend }: any) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a16d3e]">
          Fila de cuidado
        </p>
        <h2 className="mt-2 font-serif text-3xl">Notificações de faltas</h2>
        <p className="mt-1 text-sm text-[#8a929d]">
          Revise quem será notificado, a mensagem e o resultado do envio.
        </p>
      </div>
      <div className="space-y-3">
        {rows.length ? (
          rows.map((row: any) => (
            <Card
              key={row.id}
              className="border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]"
            >
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div className="min-w-0">
                    <p className="break-words font-semibold">
                      {row.youthName}{" "}
                      <span className="font-normal text-[#9299a2]">
                        →{" "}
                        {row.discipulatorName ?? "Discipulador não encontrado"}
                      </span>
                    </p>
                    <p className="mt-1 break-words text-xs text-[#8a929d]">
                      {row.eventType} · {formatDate(row.eventDate)} · WhatsApp:{" "}
                      {row.recipient ?? "não informado"}
                    </p>
                  </div>
                  <Badge
                    className={`w-fit shrink-0 border-0 ${statusClass(row.status)}`}
                  >
                    {statusLabel(row.status)}
                  </Badge>
                </div>
                <div className="break-words rounded-xl bg-[#f7f8fa] p-4 text-sm leading-6 text-[#4d5662]">
                  {row.body}
                </div>
                {row.error && (
                  <div className="flex items-start gap-2 rounded-xl bg-[#fff0e9] p-3 text-xs text-[#a94f3f]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {row.error}
                  </div>
                )}
                <div className="flex flex-col justify-between gap-3 text-xs text-[#8a929d] md:flex-row md:items-center">
                  <span className="break-words">
                    {row.sentAt
                      ? `Enviada em ${new Date(row.sentAt).toLocaleString("pt-BR")}`
                      : "Ainda não enviada"}
                    {row.providerMessageId
                      ? ` · ID ${row.providerMessageId}`
                      : ""}
                  </span>
                  {(row.status === "pending" || row.status === "error") &&
                    row.recipient && (
                      <Button
                        onClick={() => onSend(row.id)}
                        className="w-full justify-center rounded-xl bg-[#b27b4b] text-white hover:bg-[#936038] sm:w-auto"
                      >
                        <Send className="mr-2 h-4 w-4" /> Enviar mensagem
                      </Button>
                    )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-0 bg-white">
            <CardContent className="p-8 text-center text-sm text-[#8a929d]">
              Nenhuma notificação foi criada ainda.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
function MessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a16d3e]">
          Comunicação responsável
        </p>
        <h2 className="mt-2 font-serif text-3xl">Histórico de mensagens</h2>
        <p className="mt-1 text-sm text-[#8a929d]">
          Tudo que foi preparado ou enviado, com rastreabilidade.
        </p>
      </div>
      <Card className="border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]">
        <CardContent className="p-0">
          <div className="grid grid-cols-[1fr_140px_140px] border-b border-[#eef0f2] px-5 py-3 text-xs uppercase tracking-wider text-[#9aa1aa]">
            <span>Mensagem</span>
            <span>Tipo</span>
            <span>Status</span>
          </div>
          {[
            {
              name: "Gabriel Almeida",
              type: "Aniversário",
              status: "Pendente",
              time: "Hoje, 09:42",
            },
            {
              name: "Mariana Costa",
              type: "Falta no culto",
              status: "Enviada",
              time: "Ontem, 21:10",
            },
            {
              name: "Lucas Ferreira",
              type: "Falta no culto",
              status: "Enviada",
              time: "16 ago, 19:35",
            },
          ].map(item => (
            <div
              key={item.name + item.type}
              className="grid grid-cols-[1fr_140px_140px] items-center border-b border-[#f2f3f4] px-5 py-4 text-sm last:border-0"
            >
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-[#9aa1aa]">{item.time}</p>
              </div>
              <span className="text-[#6e7783]">{item.type}</span>
              <Badge
                className={
                  item.status === "Enviada"
                    ? "w-fit border-0 bg-[#edf5f0] text-[#4f8069]"
                    : "w-fit border-0 bg-[#fff3e9] text-[#a16d3e]"
                }
              >
                {item.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPage({
  whatsappStatus,
  birthday,
  setBirthday,
  absence,
  setAbsence,
  whatsappPhoneId,
  setWhatsappPhoneId,
  whatsappBusinessId,
  setWhatsappBusinessId,
  whatsappToken,
  setWhatsappToken,
  whatsappEnabled,
  setWhatsappEnabled,
  settings,
  onSave,
}: any) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a16d3e]">
          Governança do cuidado
        </p>
        <h2 className="mt-2 font-serif text-3xl">Configurações</h2>
        <p className="mt-1 text-sm text-[#8a929d]">
          Personalize mensagens e mantenha a integração sob controle.
        </p>
      </div>
      <Tabs defaultValue="mensagens" className="space-y-5">
        <TabsList className="grid w-full grid-cols-1 gap-1 rounded-xl bg-white p-1 sm:grid-cols-3">
          <TabsTrigger value="mensagens" className="rounded-lg">
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="rounded-lg">
            WhatsApp Business
          </TabsTrigger>
          <TabsTrigger value="acesso" className="rounded-lg">
            Acesso e privacidade
          </TabsTrigger>
        </TabsList>
        <TabsContent value="mensagens" className="grid gap-6 lg:grid-cols-2">
          <Card className="border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">
                Mensagem de aniversário
              </CardTitle>
              <p className="text-sm text-[#8a929d]">
                Use <strong>{`{{nome}}`}</strong> e{" "}
                <strong>{`{{idade}}`}</strong> para personalizar.
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
                className="min-h-36 rounded-xl border-[#e3e5e8]"
              />
              <Button
                onClick={onSave}
                className="mt-4 min-h-11 rounded-full bg-[#18212f] px-5 font-semibold text-white shadow-sm hover:bg-[#2e3a4d]"
              >
                Salvar mensagem
              </Button>
            </CardContent>
          </Card>
          <Card className="border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">
                Notificação de falta
              </CardTitle>
              <p className="text-sm text-[#8a929d]">
                Enviada ao discipulador após o registro explícito da falta.
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={absence}
                onChange={e => setAbsence(e.target.value)}
                className="min-h-36 rounded-xl border-[#e3e5e8]"
              />
              <Button
                onClick={onSave}
                className="mt-4 min-h-11 rounded-full bg-[#18212f] px-5 font-semibold text-white shadow-sm hover:bg-[#2e3a4d]"
              >
                Salvar mensagem
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="whatsapp">
          <Card className="max-w-3xl border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">
                Integração oficial
              </CardTitle>
              <p className="text-sm text-[#8a929d]">
                As credenciais ficam apenas no servidor. O envio de aniversário
                continua manual.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border border-[#eadfce] bg-[#fffaf4] p-4 text-sm leading-6 text-[#604a31]">
                <CircleAlert className="mr-2 inline h-4 w-4" /> O sistema já
                possui o adaptador oficial da Meta, mas só envia depois que você
                informar o phone number ID, o business account ID, um token
                válido e um template aprovado no WhatsApp Manager. O envio de
                aniversário é sempre manual: prepare a mensagem em
                Aniversários/Mensagens e confirme o envio.
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>ID do número de telefone</Label>
                  <Input
                    value={whatsappPhoneId}
                    onChange={e => setWhatsappPhoneId(e.target.value)}
                    className="mt-2 rounded-xl text-[#18212f]"
                    placeholder="phone_number_id"
                  />
                </div>
                <div>
                  <Label>ID da conta WhatsApp Business</Label>
                  <Input
                    value={whatsappBusinessId}
                    onChange={e => setWhatsappBusinessId(e.target.value)}
                    className="mt-2 rounded-xl text-[#18212f]"
                    placeholder="business_account_id"
                  />
                </div>
              </div>
              <div>
                <Label>Token de acesso</Label>
                <Input
                  type="password"
                  value={whatsappToken}
                  onChange={e => setWhatsappToken(e.target.value)}
                  className="mt-2 rounded-xl text-[#18212f]"
                  placeholder="Token da Meta armazenado no servidor"
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[#eef0f2] p-4">
                <div>
                  <p className="font-medium">
                    Status:{" "}
                    {whatsappStatus?.configured
                      ? "credenciais preenchidas"
                      : "aguardando configuração"}
                  </p>
                  <p className="text-xs text-[#8b929c]">
                    {whatsappStatus?.configured
                      ? "O servidor encontrou os três campos mínimos."
                      : `Faltam: ${(whatsappStatus?.missingFields ?? ["credenciais"]).join(", ")}.`}
                  </p>
                </div>
                <Switch
                  checked={whatsappEnabled === "enabled"}
                  onCheckedChange={checked =>
                    setWhatsappEnabled(checked ? "enabled" : "disabled")
                  }
                />
              </div>
              <Button
                onClick={onSave}
                className="min-h-11 rounded-full bg-[#18212f] px-5 font-semibold text-white shadow-sm hover:bg-[#2e3a4d]"
              >
                Salvar configuração
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="acesso">
          <Card className="max-w-3xl border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)]">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">
                Acesso e privacidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[#68717d]">
              <p>
                Administradores visualizam todos os jovens. Discipuladores devem
                visualizar somente os discípulos vinculados a eles.
              </p>
              <div className="flex items-center justify-between rounded-xl border border-[#eef0f2] p-4">
                <span>Registrar logs de alterações</span>
                <Switch checked />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[#eef0f2] p-4">
                <span>Exigir confirmação para exclusões</span>
                <Switch checked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportsPage({
  report,
  loading,
  period,
  setPeriod,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  eventType,
  setEventType,
  discipulatorId,
  setDiscipulatorId,
  youthId,
  setYouthId,
  lowFrequencyThreshold,
  setLowFrequencyThreshold,
  maxConsecutiveAbsences,
  setMaxConsecutiveAbsences,
  discipulators,
  youths,
  onRefresh,
}: any) {
  const [sort, setSort] = useState("frequencyDesc");
  const summary = report?.summary;
  const ranking = [...(report?.ranking ?? [])].sort((a: any, b: any) =>
    sort === "frequencyAsc"
      ? (a.frequency ?? 101) - (b.frequency ?? 101)
      : sort === "absences"
        ? b.absent - a.absent
        : sort === "name"
          ? a.youthName.localeCompare(b.youthName)
          : (b.frequency ?? -1) - (a.frequency ?? -1)
  );
  const exportRows = [
    ["Jovem", "Discipulador", "Presenças", "Faltas", "Frequência"],
    ...ranking.map((row: any) => [
      row.youthName,
      row.discipulatorName ?? "",
      row.present,
      row.absent,
      row.frequency === null ? "" : `${row.frequency}%`,
    ]),
  ];
  const exportCsv = () => {
    const csv = exportRows
      .map(row =>
        row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(";")
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["\\ufeff" + csv], { type: "text/csv;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-jovens-${startDate}-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportExcel = () => {
    const table = `<table>${exportRows.map(row => `<tr>${row.map(value => `<td>${String(value).replaceAll("<", "&lt;")}</td>`).join("")}</tr>`).join("")}</table>`;
    const url = URL.createObjectURL(
      new Blob([`<html><meta charset="utf-8"><body>${table}</body></html>`], {
        type: "application/vnd.ms-excel",
      })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-jovens-${startDate}-${endDate}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportPdf = () => window.print();
  const formatPercent = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : `${value}%`;
  const individual = youthId
    ? ranking.find((row: any) => String(row.youthId) === String(youthId))
    : null;
  const individualDiscipulator = discipulatorId
    ? (report?.discipulators ?? []).find(
        (item: any) => String(item.discipulatorId) === String(discipulatorId)
      )
    : null;
  const changePeriod = (value: string) => {
    setPeriod(value);
    if (value === "custom") return;
    const end = new Date(`${endDate}T12:00:00`);
    const start = new Date(end);
    if (value === "monthly") start.setDate(1);
    else start.setDate(start.getDate() - 14);
    setStartDate(start.toISOString().slice(0, 10));
  };
  return (
    <div id="reports-print-area" className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a16d3e]">
            Gestão baseada em dados reais
          </p>
          <h2 className="mt-2 font-serif text-3xl">Relatórios e indicadores</h2>
          <p className="mt-1 text-sm text-[#8a929d]">
            Acompanhe frequência, faltas e o cuidado dos discipuladores sem
            números estimados.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={onRefresh}
            variant="outline"
            className="min-h-11 rounded-xl border-[#d8dce1] bg-white text-[#18212f]"
          >
            Gerar relatório
          </Button>
          <Button
            onClick={exportCsv}
            disabled={!ranking.length}
            className="min-h-11 rounded-xl bg-[#18212f] text-white hover:bg-[#2d3b4b]"
          >
            Exportar CSV
          </Button>
          <Button
            onClick={exportExcel}
            disabled={!ranking.length}
            variant="outline"
            className="min-h-11 rounded-xl border-[#d8dce1] bg-white text-[#18212f]"
          >
            Exportar Excel
          </Button>
          <Button
            onClick={exportPdf}
            variant="outline"
            className="min-h-11 rounded-xl border-[#d8dce1] bg-white text-[#18212f]"
          >
            Imprimir / PDF
          </Button>
        </div>
      </div>
      <Card className="border-0 bg-white shadow-[0_8px_30px_rgba(26,34,47,0.04)] print:hidden">
        <CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-7">
          <div>
            <Label>Tipo de relatório</Label>
            <select
              value={period}
              onChange={e => changePeriod(e.target.value)}
              className="mt-2 h-10 w-full rounded-xl border border-[#e3e5e8] bg-white px-3 text-sm text-[#18212f]"
            >
              <option value="fortnightly">Quinzenal</option>
              <option value="monthly">Mensal</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          <div>
            <Label>Data inicial</Label>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="mt-2 rounded-xl text-[#18212f]"
            />
          </div>
          <div>
            <Label>Data final</Label>
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="mt-2 rounded-xl text-[#18212f]"
            />
          </div>
          <div>
            <Label>Culto/evento</Label>
            <select
              value={eventType}
              onChange={e => setEventType(e.target.value)}
              className="mt-2 h-10 w-full rounded-xl border border-[#e3e5e8] bg-white px-3 text-sm text-[#18212f]"
            >
              <option value="">Todos os cultos</option>
              <option>Sedentos +20</option>
              <option>Culto Sedentos</option>
              <option>Cultos de Domingo</option>
            </select>
          </div>
          <div>
            <Label>Discipulador</Label>
            <select
              value={discipulatorId}
              onChange={e => setDiscipulatorId(e.target.value)}
              className="mt-2 h-10 w-full rounded-xl border border-[#e3e5e8] bg-white px-3 text-sm text-[#18212f]"
            >
              <option value="">Todos</option>
              {discipulators.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Jovem</Label>
            <select
              value={youthId}
              onChange={e => setYouthId(e.target.value)}
              className="mt-2 h-10 w-full rounded-xl border border-[#e3e5e8] bg-white px-3 text-sm text-[#18212f]"
            >
              <option value="">Todos</option>
              {youths.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Frequência mínima (%)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={lowFrequencyThreshold}
              onChange={e => setLowFrequencyThreshold(e.target.value)}
              className="mt-2 rounded-xl text-[#18212f]"
            />
          </div>
          <div>
            <Label>Faltas consecutivas</Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={maxConsecutiveAbsences}
              onChange={e => setMaxConsecutiveAbsences(e.target.value)}
              className="mt-2 rounded-xl text-[#18212f]"
            />
          </div>
          <div className="flex items-end">
            <p className="rounded-xl bg-[#fffaf4] p-3 text-xs leading-5 text-[#7d572f]">
              {report?.enoughData
                ? "Dados suficientes para tendência."
                : "Ainda não há dados suficientes para afirmar uma tendência."}
            </p>
          </div>
        </CardContent>
      </Card>
      {loading ? (
        <Card className="border-0 bg-white">
          <CardContent className="p-8 text-center text-sm text-[#8a929d]">
            Calculando indicadores reais…
          </CardContent>
        </Card>
      ) : (
        <>
          {summary && (
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {[
                ["Frequência média", formatPercent(summary.frequency)],
                ["Presença média", summary.averagePresence],
                ["Faltas", summary.absences],
                ["Jovens ativos", summary.activeYouth],
                ["Novos jovens", summary.newYouth],
                ["Acompanhadas", formatPercent(summary.followUpRate)],
              ].map(([label, value]) => (
                <Card key={label} className="border-0 bg-white">
                  <CardContent className="p-4">
                    <p className="text-xs text-[#8a929d]">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[#18212f]">
                      {value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </section>
          )}
          {report?.movement && (
            <Card className="border-0 bg-white">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">
                  Movimentação do período
                </CardTitle>
                <p className="text-sm text-[#8a929d]">
                  Categorias calculadas a partir dos registros reais.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Novos", report.movement.newYouth],
                  ["Recorrentes", report.movement.recurrent],
                  ["Faltas consecutivas", report.movement.consecutive],
                  ["Ausentes prolongados", report.movement.prolongedAbsence],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[#f7f8fa] p-4">
                    <p className="text-xs text-[#8a929d]">{label}</p>
                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {report?.comparison && (
            <Card className="border-0 bg-[#1d2a39] text-white">
              <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[#bdc9d4]">
                    Comparação com período equivalente
                  </p>
                  <p className="mt-2 font-serif text-xl">
                    {report.comparison.previous.startDate} a{" "}
                    {report.comparison.previous.endDate}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm text-[#bdc9d4]">
                    Frequência atual{" "}
                    {formatPercent(report.comparison.currentFrequency)} ·
                    anterior{" "}
                    {formatPercent(report.comparison.previousFrequency)}
                  </p>
                  <p
                    className={`mt-1 text-2xl font-semibold ${report.comparison.direction === "growth" ? "text-[#9bd0ad]" : report.comparison.direction === "decline" ? "text-[#f0a38f]" : "text-[#f3c98d]"}`}
                  >
                    {report.comparison.delta === null
                      ? "Sem comparação"
                      : `${report.comparison.delta > 0 ? "+" : ""}${report.comparison.delta}% · ${report.comparison.direction === "growth" ? "Crescimento" : report.comparison.direction === "decline" ? "Queda" : "Estabilidade"}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 bg-white">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">
                  Frequência por culto
                </CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {report?.events?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={report.events}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" />
                      <XAxis dataKey="eventDate" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="present"
                        stroke="#b27b4b"
                        strokeWidth={3}
                        name="Presentes"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-[#8a929d]">
                    Nenhum culto registrado no período.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border-0 bg-white">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">
                  Presença x falta
                </CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {report?.events?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.events}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" />
                      <XAxis dataKey="eventDate" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="present"
                        fill="#6e9a82"
                        name="Presentes"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="absent"
                        fill="#c56f57"
                        name="Faltantes"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-[#8a929d]">
                    Nenhum registro de presença ou falta no período.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 bg-white">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">
                  Evolução mensal
                </CardTitle>
                <p className="text-sm text-[#8a929d]">
                  Só mostramos tendência quando existem cultos reais no período.
                </p>
              </CardHeader>
              <CardContent className="h-56">
                {report?.enoughMonthlyData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={report.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="frequency"
                        stroke="#6e9a82"
                        strokeWidth={3}
                        name="Frequência %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-[#8a929d]">
                    Sem dados suficientes para evolução mensal.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border-0 bg-white">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">
                  Relatório individual
                </CardTitle>
                <p className="text-sm text-[#8a929d]">
                  Selecione um jovem no filtro para analisar sua frequência.
                </p>
              </CardHeader>
              <CardContent>
                {individual ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-lg font-semibold">
                        {individual.youthName}
                      </p>
                      <p className="text-sm text-[#8a929d]">
                        Discipulador:{" "}
                        {individual.discipulatorName ?? "não informado"}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-[#f6f8f7] p-3">
                        <p className="text-xl font-semibold">
                          {individual.present}
                        </p>
                        <p className="text-xs text-[#85908a]">presenças</p>
                      </div>
                      <div className="rounded-xl bg-[#fff5ef] p-3">
                        <p className="text-xl font-semibold text-[#b5674e]">
                          {individual.absent}
                        </p>
                        <p className="text-xs text-[#a58b80]">faltas</p>
                      </div>
                    </div>
                    <p className="text-sm text-[#68717d]">
                      Frequência:{" "}
                      <strong>{formatPercent(individual.frequency)}</strong> ·
                      Última presença:{" "}
                      <strong>
                        {individual.lastPresence
                          ? formatDate(individual.lastPresence)
                          : "não registrada"}
                      </strong>{" "}
                      · Total de cultos:{" "}
                      <strong>{individual.history?.length ?? 0}</strong> ·
                      Faltas consecutivas:{" "}
                      <strong>{individual.consecutiveAbsences ?? 0}</strong>
                    </p>
                    {individual.history?.length ? (
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={individual.history.map((item: any) => ({
                              ...item,
                              presence: item.status === "present" ? 100 : 0,
                            }))}
                          >
                            <XAxis dataKey="eventDate" tick={{ fontSize: 9 }} />
                            <YAxis domain={[0, 100]} hide />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="presence"
                              stroke="#b27b4b"
                              strokeWidth={3}
                              dot={{ r: 3 }}
                              name="Presença"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-[#8a929d]">
                    Nenhum jovem selecionado.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
          <section className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
            <Card className="border-0 bg-white">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="font-serif text-2xl">
                    Ranking de frequência
                  </CardTitle>
                  <p className="mt-1 text-sm text-[#8a929d]">
                    Ordene os jovens por frequência ou necessidade de cuidado.
                  </p>
                </div>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="h-10 rounded-xl border border-[#e3e5e8] bg-white px-3 text-sm text-[#18212f]"
                >
                  <option value="frequencyDesc">Maior frequência</option>
                  <option value="frequencyAsc">Menor frequência</option>
                  <option value="absences">Mais faltas</option>
                  <option value="name">Nome</option>
                </select>
              </CardHeader>
              <CardContent className="space-y-2">
                {ranking.length ? (
                  ranking.slice(0, 30).map((row: any) => (
                    <div
                      key={row.youthId}
                      className="flex flex-col gap-2 rounded-xl border border-[#eef0f2] p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold">{row.youthName}</p>
                        <p className="text-xs text-[#8a929d]">
                          {row.discipulatorName ?? "Sem discipulador"} ·{" "}
                          {row.present} presenças · {row.absent} faltas
                        </p>
                      </div>
                      <Badge
                        className={`w-fit border-0 ${row.frequency !== null && row.frequency < 60 ? "bg-[#fff0e9] text-[#a94f3f]" : "bg-[#edf5f0] text-[#4f8069]"}`}
                      >
                        {formatPercent(row.frequency)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#8a929d]">
                    Sem registros reais para o filtro selecionado.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border-0 bg-[#fffaf4]">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">Atenção</CardTitle>
                <p className="text-sm text-[#8a929d]">
                  Jovens com baixa frequência ou faltas repetidas.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {report?.alerts?.length ? (
                  report.alerts.map((alert: any) => (
                    <div
                      key={alert.youthId}
                      className="rounded-xl border border-[#eadfce] bg-white p-3"
                    >
                      <p className="text-sm font-semibold">{alert.youthName}</p>
                      <p className="mt-1 text-xs text-[#8a929d]">
                        {alert.discipulatorName ?? "Sem discipulador"} ·{" "}
                        {alert.message} · {formatPercent(alert.frequency)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#8a929d]">
                    Nenhum alerta calculado para o período.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
          {individualDiscipulator && (
            <Card className="border-0 bg-[#1d2a39] text-white">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">
                  Histórico individual do discipulador
                </CardTitle>
                <p className="text-sm text-[#bdc9d4]">
                  Linha do tempo da carteira de{" "}
                  {individualDiscipulator.discipulatorName} no período
                  selecionado.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-[#bdc9d4]">Frequência média</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {formatPercent(individualDiscipulator.frequency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#bdc9d4]">Faltas</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {individualDiscipulator.absent}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#bdc9d4]">Acompanhamentos</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {individualDiscipulator.followUps}
                    </p>
                  </div>
                </div>
                {individualDiscipulator.history?.length ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={individualDiscipulator.history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#435261" />
                        <XAxis
                          dataKey="eventDate"
                          tick={{ fontSize: 10, fill: "#bdc9d4" }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: "#bdc9d4" }}
                        />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="frequency"
                          stroke="#e2b47d"
                          strokeWidth={3}
                          dot={{ r: 3 }}
                          name="Frequência %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-[#bdc9d4]">
                    Ainda não há histórico suficiente para este discipulador.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          <Card className="border-0 bg-white">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">
                Desempenho por discipulador
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report?.discipulators?.length ? (
                report.discipulators.map((item: any) => (
                  <div
                    key={item.discipulatorId}
                    className="rounded-xl border border-[#eef0f2] p-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">{item.discipulatorName}</p>
                        <p className="text-xs text-[#8a929d]">
                          {item.disciples} discípulos · {item.absent} faltas ·{" "}
                          {item.followUps} acompanhamentos registrados
                        </p>
                      </div>
                      <Badge className="w-fit border-0 bg-[#f7f4ef] text-[#7d572f]">
                        {formatPercent(item.frequency)}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 border-t border-[#f0f1f3] pt-3">
                      {item.youthRows?.map((youth: any) => (
                        <div
                          key={youth.youthId}
                          className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="font-medium text-[#3d4652]">
                            {youth.youthName}
                          </span>
                          <span className="text-[#8a929d]">
                            {youth.present} presenças · {youth.absent} faltas ·
                            última presença{" "}
                            {youth.lastPresence
                              ? formatDate(youth.lastPresence)
                              : "não registrada"}{" "}
                            ·{" "}
                            {youth.followUpStatus === "pending"
                              ? "Pendente"
                              : (youth.followUpStatus ?? "Sem acompanhamento")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#8a929d]">
                  Sem discipuladores com registros no período.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
