import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Plus, Send, UserRound } from "lucide-react";
import { useState } from "react";

type DiscipulatorOption = { id: number; name: string };

const dialogContentClass =
  "overflow-hidden rounded-xl border-[#d8dce1] bg-[#fffdfb] p-0 sm:max-w-lg";
const inputClass = "h-11 rounded-xl border-[#d8dce1] text-[#18212f]";
const footerClass = "border-t border-[#eee8e1] bg-white px-6 py-4";

function DialogActions({ onCancel }: { onCancel: () => void }) {
  return (
    <DialogFooter className={footerClass}>
      <Button
        type="button"
        variant="outline"
        className="rounded-xl border-[#d8dce1] text-[#18212f]"
        onClick={onCancel}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        className="rounded-xl bg-[#18212f] text-white hover:bg-[#2e3a4d]"
      >
        Salvar
      </Button>
    </DialogFooter>
  );
}

export function YouthCreateDialog({
  discipulators,
  onCreate,
}: {
  discipulators: DiscipulatorOption[];
  onCreate: (data: {
    name: string;
    birthDate: string;
    whatsapp: string;
    discipulatorId: number | null;
    discipleshipStartDate: string;
    relationshipStatus: "active";
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [discipulatorId, setDiscipulatorId] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate({
      name: name.trim(),
      birthDate,
      whatsapp: whatsapp.trim(),
      discipulatorId: discipulatorId ? Number(discipulatorId) : null,
      discipleshipStartDate: new Date().toISOString().slice(0, 10),
      relationshipStatus: "active",
    });
    setOpen(false);
    setName("");
    setBirthDate("");
    setWhatsapp("");
    setDiscipulatorId("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full justify-center rounded-full bg-[#18212f] text-white hover:bg-[#2e3a4d] sm:w-auto"
      >
        <Plus className="h-4 w-4" />
        Adicionar jovem
      </Button>
      <DialogContent className={dialogContentClass}>
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-[#eee8e1] bg-[#f8f5ef] px-6 py-5 text-left">
            <DialogTitle className="font-serif text-2xl text-[#18212f]">
              Adicionar jovem
            </DialogTitle>
            <DialogDescription className="text-[#68717d]">
              Cadastre os dados principais para iniciar o acompanhamento.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 px-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="new-youth-name">Nome completo</Label>
              <Input id="new-youth-name" value={name} onChange={event => setName(event.target.value)} className={inputClass} required autoFocus />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-youth-birth-date">Data de nascimento</Label>
                <Input id="new-youth-birth-date" type="date" value={birthDate} onChange={event => setBirthDate(event.target.value)} className={inputClass} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-youth-whatsapp">WhatsApp</Label>
                <Input id="new-youth-whatsapp" value={whatsapp} onChange={event => setWhatsapp(event.target.value)} className={inputClass} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-youth-discipulator">Discipulador</Label>
              <select id="new-youth-discipulator" value={discipulatorId} onChange={event => setDiscipulatorId(event.target.value)} className="h-11 w-full rounded-xl border border-[#d8dce1] bg-white px-3 text-sm text-[#18212f]">
                <option value="">Sem discipulador por enquanto</option>
                {discipulators.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
          </div>
          <DialogActions onCancel={() => setOpen(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function YouthWhatsappEditDialog({
  current,
  onUpdate,
}: {
  current: string;
  onUpdate: (whatsapp: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [whatsapp, setWhatsapp] = useState(current);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onUpdate(whatsapp.trim());
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="ghost" size="icon" title="Editar WhatsApp" onClick={() => { setWhatsapp(current); setOpen(true); }}>
        <Pencil className="h-4 w-4" />
      </Button>
      <DialogContent className={dialogContentClass}>
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-[#eee8e1] bg-[#f8f5ef] px-6 py-5 text-left">
            <DialogTitle className="font-serif text-2xl text-[#18212f]">Editar WhatsApp</DialogTitle>
            <DialogDescription className="text-[#68717d]">Atualize o número de contato deste jovem.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-6">
            <Label htmlFor="edit-youth-whatsapp">WhatsApp</Label>
            <Input id="edit-youth-whatsapp" value={whatsapp} onChange={event => setWhatsapp(event.target.value)} className={`${inputClass} mt-2`} placeholder="(00) 00000-0000" autoFocus />
          </div>
          <DialogActions onCancel={() => setOpen(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function YouthReassignDialog({
  youthName,
  currentId,
  discipulators,
  onReassign,
}: {
  youthName: string;
  currentId?: number | null;
  discipulators: DiscipulatorOption[];
  onReassign: (discipulatorId: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [discipulatorId, setDiscipulatorId] = useState(currentId ? String(currentId) : "");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onReassign(discipulatorId ? Number(discipulatorId) : null);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="ghost" size="icon" title="Corrigir discipulador" onClick={() => { setDiscipulatorId(currentId ? String(currentId) : ""); setOpen(true); }}>
        <UserRound className="h-4 w-4 text-[#536a7f]" />
      </Button>
      <DialogContent className={dialogContentClass}>
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-[#eee8e1] bg-[#f8f5ef] px-6 py-5 text-left">
            <DialogTitle className="font-serif text-2xl text-[#18212f]">Corrigir discipulador</DialogTitle>
            <DialogDescription className="text-[#68717d]">Escolha o responsável atual por {youthName}.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-6"><Label htmlFor="reassign-youth">Discipulador</Label><select id="reassign-youth" value={discipulatorId} onChange={event => setDiscipulatorId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#d8dce1] bg-white px-3 text-sm text-[#18212f]"><option value="">Sem discipulador</option>{discipulators.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <DialogActions onCancel={() => setOpen(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DiscipulatorCreateDialog({
  onCreate,
}: {
  onCreate: (data: { name: string; whatsapp: string; status: "active"; notes: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate({ name: name.trim(), whatsapp: whatsapp.trim(), status: "active", notes: notes.trim() });
    setOpen(false);
    setName("");
    setWhatsapp("");
    setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)} className="w-full justify-center rounded-full bg-[#18212f] text-white hover:bg-[#2e3a4d] sm:w-auto">
        <Plus className="h-4 w-4" /> Novo discipulador
      </Button>
      <DialogContent className={dialogContentClass}>
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-[#eee8e1] bg-[#f8f5ef] px-6 py-5 text-left">
            <DialogTitle className="font-serif text-2xl text-[#18212f]">Novo discipulador</DialogTitle>
            <DialogDescription className="text-[#68717d]">Cadastre a pessoa responsável pelo acompanhamento.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 px-6 py-6">
            <div className="space-y-2"><Label htmlFor="new-discipulator-name">Nome completo</Label><Input id="new-discipulator-name" value={name} onChange={event => setName(event.target.value)} className={inputClass} required autoFocus /></div>
            <div className="space-y-2"><Label htmlFor="new-discipulator-whatsapp">WhatsApp</Label><Input id="new-discipulator-whatsapp" value={whatsapp} onChange={event => setWhatsapp(event.target.value)} className={inputClass} placeholder="(00) 00000-0000" required /></div>
            <div className="space-y-2"><Label htmlFor="new-discipulator-notes">Observações e apelidos</Label><textarea id="new-discipulator-notes" value={notes} onChange={event => setNotes(event.target.value)} className="min-h-24 w-full resize-y rounded-xl border border-[#d8dce1] bg-white px-3 py-2.5 text-sm text-[#18212f] outline-none focus:border-[#b27b4b] focus:ring-2 focus:ring-[#b27b4b]/20" /></div>
          </div>
          <DialogActions onCancel={() => setOpen(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AccountLinkDialog({
  accountName,
  currentId,
  discipulators,
  onLink,
}: {
  accountName: string;
  currentId?: number | null;
  discipulators: DiscipulatorOption[];
  onLink: (discipulatorId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [discipulatorId, setDiscipulatorId] = useState(currentId ? String(currentId) : "");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!discipulatorId) return;
    onLink(Number(discipulatorId));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" className="rounded-xl" onClick={() => { setDiscipulatorId(currentId ? String(currentId) : ""); setOpen(true); }}>
        <UserRound className="h-4 w-4" /> Vincular discipulador
      </Button>
      <DialogContent className={dialogContentClass}>
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-[#eee8e1] bg-[#f8f5ef] px-6 py-5 text-left">
            <DialogTitle className="font-serif text-2xl text-[#18212f]">Vincular discipulador</DialogTitle>
            <DialogDescription className="text-[#68717d]">Escolha o responsável pela conta de {accountName}.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-6"><Label htmlFor="link-discipulator">Discipulador</Label><select id="link-discipulator" value={discipulatorId} onChange={event => setDiscipulatorId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#d8dce1] bg-white px-3 text-sm text-[#18212f]" required><option value="">Selecione uma pessoa</option>{discipulators.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <DialogActions onCancel={() => setOpen(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TemplateSendDialog({
  title,
  description,
  defaultValue,
  onSend,
}: {
  title: string;
  description: string;
  defaultValue: string;
  onSend: (templateName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [templateName, setTemplateName] = useState(defaultValue);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!templateName.trim()) return;
    onSend(templateName.trim());
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => { setTemplateName(defaultValue); setOpen(true); }} className="w-full justify-center rounded-xl bg-[#b27b4b] text-white hover:bg-[#936038] sm:w-auto">
        <Send className="h-4 w-4" /> Enviar mensagem
      </Button>
      <DialogContent className={dialogContentClass}>
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-[#eee8e1] bg-[#f8f5ef] px-6 py-5 text-left"><DialogTitle className="font-serif text-2xl text-[#18212f]">{title}</DialogTitle><DialogDescription className="text-[#68717d]">{description}</DialogDescription></DialogHeader>
          <div className="px-6 py-6"><Label htmlFor="template-name">Nome do template aprovado</Label><Input id="template-name" value={templateName} onChange={event => setTemplateName(event.target.value)} className={`${inputClass} mt-2`} required autoFocus /></div>
          <DialogActions onCancel={() => setOpen(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
