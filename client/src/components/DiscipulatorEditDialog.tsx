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
import { Pencil, Save } from "lucide-react";
import { useEffect, useState } from "react";

export type DiscipulatorEditItem = {
  id: number;
  name: string;
  whatsapp?: string | null;
  notes?: string | null;
  status?: "active" | "inactive";
};

type DiscipulatorEditDialogProps = {
  item: DiscipulatorEditItem;
  onUpdate: (data: {
    id: number;
    name: string;
    whatsapp: string;
    status: "active" | "inactive";
    notes: string;
  }) => void;
};

export function DiscipulatorEditDialog({ item, onUpdate }: DiscipulatorEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item.name);
  const [whatsapp, setWhatsapp] = useState(item.whatsapp ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");

  useEffect(() => {
    if (!open) return;
    setName(item.name);
    setWhatsapp(item.whatsapp ?? "");
    setNotes(item.notes ?? "");
  }, [item, open]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedWhatsapp = whatsapp.trim();
    if (!trimmedName || !trimmedWhatsapp) return;

    onUpdate({
      id: item.id,
      name: trimmedName,
      whatsapp: trimmedWhatsapp,
      status: item.status === "inactive" ? "inactive" : "active",
      notes: notes.trim(),
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        className="min-h-10 rounded-xl border-[#d8dce1] bg-white px-3 text-xs text-[#18212f] hover:bg-[#f3eee7]"
        onClick={() => setOpen(true)}
      >
        <Pencil className="h-4 w-4 text-[#a16d3e]" />
        Editar cadastro
      </Button>
      <DialogContent className="overflow-hidden rounded-xl border-[#d8dce1] bg-[#fffdfb] p-0 sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-[#eee8e1] bg-[#f8f5ef] px-6 py-5 text-left">
            <DialogTitle className="font-serif text-2xl text-[#18212f]">Editar discipulador</DialogTitle>
            <DialogDescription className="text-[#68717d]">
              Atualize os dados de contato e as observações deste cadastro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-6 py-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`discipulator-name-${item.id}`}>Nome completo</Label>
                <Input
                  id={`discipulator-name-${item.id}`}
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="h-11 rounded-xl border-[#d8dce1] text-[#18212f]"
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`discipulator-whatsapp-${item.id}`}>WhatsApp</Label>
                <Input
                  id={`discipulator-whatsapp-${item.id}`}
                  value={whatsapp}
                  onChange={event => setWhatsapp(event.target.value)}
                  className="h-11 rounded-xl border-[#d8dce1] text-[#18212f]"
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`discipulator-notes-${item.id}`}>Observações e apelidos</Label>
                <textarea
                  id={`discipulator-notes-${item.id}`}
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  className="min-h-28 w-full resize-y rounded-xl border border-[#d8dce1] bg-white px-3 py-2.5 text-sm text-[#18212f] outline-none transition placeholder:text-[#9aa1aa] focus:border-[#b27b4b] focus:ring-2 focus:ring-[#b27b4b]/20"
                  placeholder="Ex.: Joãozinho, Jota"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-[#eee8e1] bg-white px-6 py-4">
            <Button type="button" variant="outline" className="rounded-xl border-[#d8dce1] text-[#18212f]" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="rounded-xl bg-[#18212f] text-white hover:bg-[#2e3a4d]">
              <Save className="h-4 w-4" />
              Salvar alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
