import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, UserRound, X } from "lucide-react";
import { useState } from "react";

export function ProfilePhoto({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const dimensions = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-20 w-20" : "h-12 w-12";
  return (
    <>
      <button
        type="button"
        className={`${dimensions} relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e9eef3] text-[#536a7f]`}
        onClick={() => src && setOpen(true)}
        aria-label={src ? `Ampliar foto de ${name}` : `Sem foto de ${name}`}
      >
        {src ? <img src={src} alt={`Foto de ${name}`} className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}
        {src && <Camera className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-white/90 p-0.5 text-[#536a7f]" />}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-w-3xl items-center justify-center border-0 bg-black/90 p-4">
          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar foto" className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          {src && <img src={src} alt={`Foto ampliada de ${name}`} className="max-h-[80vh] max-w-full object-contain" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
