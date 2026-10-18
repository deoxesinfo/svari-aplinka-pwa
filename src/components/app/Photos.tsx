import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Camera, ImagePlus, Loader2, Trash2, ZoomIn, ZoomOut, ImageOff, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { addPhotoMeta, removePhoto, setPhotoTag, useAppState } from "@/lib/store";
import { isQuotaError, processImage, putPhotoBlobs, usePhotoUrl } from "@/lib/photos";
import { fmtDateTime } from "@/lib/dates";
import { PHOTO_TAG_LABEL, type PhotoMeta, type PhotoTag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Confirm } from "./ui-bits";

export function Thumb({ photo, onClick }: { photo: PhotoMeta; onClick: () => void }) {
  const { url, missing } = usePhotoUrl(photo.id, "thumb");
  return (
    <button
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-lg border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Peržiūrėti nuotrauką"
    >
      {url ? (
        <img src={url} alt="" loading="lazy" className="size-full object-cover transition-transform group-hover:scale-105" />
      ) : (
        <div className="grid size-full place-items-center text-muted-foreground">
          {missing ? <ImageOff className="size-5" /> : <Loader2 className="size-5 animate-spin" />}
        </div>
      )}
      {photo.tag && <span className="absolute bottom-1 left-1 rounded-md bg-slate-900/80 px-2 py-0.5 text-[11px] font-semibold text-white">{PHOTO_TAG_LABEL[photo.tag]}</span>}
    </button>
  );
}

function Lightbox({ photo, gallery, onNavigate, onClose }: { photo: PhotoMeta; gallery: PhotoMeta[]; onNavigate: (id: string) => void; onClose: () => void }) {
  const { addresses, jobs, photos } = useAppState();
  const [zoom, setZoom] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const full = usePhotoUrl(photo.id, "full");
  const index = gallery.findIndex(p => p.id === photo.id);
  const previous = index > 0 ? gallery[index - 1] : undefined;
  const next = index >= 0 && index < gallery.length - 1 ? gallery[index + 1] : undefined;
  const current = photos.find((p) => p.id === photo.id) ?? photo;
  const adr = addresses.find((a) => a.id === photo.addressId);
  const job = jobs.find((j) => j.id === photo.jobId);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl gap-3 p-3 sm:p-4">
        <DialogTitle className="pr-8 text-base">{adr?.street ?? "Nuotrauka"}</DialogTitle>
        <DialogDescription className="-mt-2 text-xs">
          {fmtDateTime(photo.createdAt)} · {(photo.size / 1024).toFixed(0)} KB {photo.width ? `· ${photo.width}×${photo.height}` : ""}
        </DialogDescription>
        <div className={cn("max-h-[70vh] overflow-auto rounded-md bg-muted", zoom ? "cursor-zoom-out" : "cursor-zoom-in")} onClick={() => setZoom((z) => !z)}>
          {full.url ? (
            <img src={full.url} alt="Darbo nuotrauka" className={cn("mx-auto", zoom ? "max-w-none w-[200%]" : "max-h-[70vh] w-auto object-contain")} />
          ) : (
            <div className="grid h-64 place-items-center text-sm text-muted-foreground">{full.missing ? "Nuotrauka nerasta šiame įrenginyje" : "Kraunama…"}</div>
          )}
        </div>
        {gallery.length > 1 && <nav aria-label="Nuotraukų navigacija" className="flex items-center justify-center gap-3 rounded-lg border bg-background p-2">
          <Button type="button" variant="outline" size="sm" aria-label="Ankstesnė nuotrauka" disabled={!previous} onClick={() => previous && onNavigate(previous.id)}>
            <ChevronLeft className="size-4" /> Ankstesnė
          </Button>
          <span className="min-w-12 text-center text-sm font-medium tabular-nums">{index + 1} / {gallery.length}</span>
          <Button type="button" variant="outline" size="sm" aria-label="Kita nuotrauka" disabled={!next} onClick={() => next && onNavigate(next.id)}>
            Kita <ChevronRight className="size-4" />
          </Button>
        </nav>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2 text-sm">
            {job && <Link to="/darbai/$jobId" params={{ jobId: job.id }} className="text-primary hover:underline" onClick={onClose}>Atidaryti darbą</Link>}
            {adr && <Link to="/adresai/$addressId" params={{ addressId: adr.id }} className="text-primary hover:underline" onClick={onClose}>Adresas</Link>}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-1 text-xs text-muted-foreground">Žyma
              <select aria-label="Nuotraukos žyma" className="rounded-md border border-input bg-card p-2 text-sm" value={current.tag ?? ""} onChange={(e) => setPhotoTag(photo.id, e.target.value ? e.target.value as PhotoTag : undefined)}>
                <option value="">Be žymos</option>
                {Object.entries(PHOTO_TAG_LABEL).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
              </select>
            </label>
            <Button variant="outline" size="sm" onClick={() => setZoom((z) => !z)}>
              {zoom ? <ZoomOut /> : <ZoomIn />} {zoom ? "Sumažinti" : "Padidinti"}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setConfirm(true)}><Trash2 /> Ištrinti</Button>
          </div>
        </div>
        <Confirm
          open={confirm}
          onOpenChange={setConfirm}
          title="Ištrinti nuotrauką?"
          text="Nuotrauka bus negrįžtamai pašalinta iš šio įrenginio."
          onConfirm={async () => {
            await removePhoto(photo.id);
            toast.success("Nuotrauka ištrinta");
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function PhotoGrid({ photos, empty = "Nuotraukų dar nėra." }: { photos: PhotoMeta[]; empty?: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = photos.find(p => p.id === openId);
  if (!photos.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {photos.map((p) => <Thumb key={p.id} photo={p} onClick={() => setOpenId(p.id)} />)}
      </div>
      {selected && <Lightbox photo={selected} gallery={photos} onNavigate={setOpenId} onClose={() => setOpenId(null)} />}
    </>
  );
}

export function PhotoUploader({ addressId, jobId }: { addressId: string; jobId?: string }) {
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [tag, setTag] = useState<PhotoTag>("po");
  const { photos } = useAppState();
  const count = photos.filter((photo) => photo.jobId === jobId && !!jobId).length;
  const remaining = jobId ? Math.max(0, 15 - count) : Infinity;

  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    if (busy > 0) return;
    const incoming = Array.from(files).filter((f) => f.type.startsWith("image/") || f.type === "");
    if (incoming.length > remaining) toast.warning(`Vienam darbui leidžiama iki 15 nuotraukų. Liko vietų: ${remaining === Infinity ? "neribota" : remaining}.`);
    const list = incoming.slice(0, remaining);
    if (!list.length) return;
    setBusy(list.length);
    let ok = 0;
    for (const f of list) {
      try {
        const r = await processImage(f);
        const id = crypto.randomUUID();
        await putPhotoBlobs(id, r.full, r.thumb);
        addPhotoMeta({ id, addressId, jobId, tag, createdAt: new Date().toISOString(), width: r.width, height: r.height, size: r.full.size, type: r.full.type });
        ok++;
      } catch (e) {
        toast.error(isQuotaError(e) ? "Įrenginio atmintis pilna – ištrinkite senas nuotraukas." : "Nepavyko išsaugoti nuotraukos.");
        if (isQuotaError(e)) break;
      } finally {
        setBusy((b) => b - 1);
      }
    }
    setBusy(0);
    if (ok) toast.success(ok === 1 ? "Nuotrauka išsaugota šiame įrenginyje" : `Išsaugota nuotraukų: ${ok}`);
    if (cam.current) cam.current.value = "";
    if (gal.current) gal.current.value = "";
  };

  return (
    <div className="space-y-3">
      {jobId && <div className="flex items-center justify-between text-sm"><span className="font-medium">Darbo nuotraukos</span><span className="text-muted-foreground">{count}/15</span></div>}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Naujų nuotraukų žyma:</span>
        {Object.entries(PHOTO_TAG_LABEL).map(([k, label]) => <button key={k} type="button" onClick={() => setTag(k as PhotoTag)} aria-pressed={tag === k} className={`rounded-lg border px-3 py-2 text-sm ${tag === k ? "border-primary bg-primary/10 text-primary font-semibold" : "border-input text-muted-foreground"}`}>{label}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" size="lg" className="h-14 text-base" onClick={() => cam.current?.click()} disabled={busy > 0 || remaining === 0}>
          <Camera className="!size-5" /> Fotografuoti
        </Button>
        <Button type="button" size="lg" variant="outline" className="h-14 text-base" onClick={() => gal.current?.click()} disabled={busy > 0 || remaining === 0}>
          <ImagePlus className="!size-5" /> Įkelti nuotraukas
        </Button>
      </div>
      <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handle(e.target.files)} />
      <input ref={gal} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handle(e.target.files)} />
      {remaining === 0 && <p className="text-sm font-medium text-amber-700">Pasiektas 15 nuotraukų limitas. Norėdami pridėti naują, pirmiausia pašalinkite nereikalingą.</p>}
      {busy > 0 ? (
        <p className="flex items-center gap-2 text-sm text-primary" role="status">
          <Loader2 className="size-4 animate-spin" /> Apdorojama nuotraukų: {busy}…
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Nuotraukos sumažinamos iki 1600 px, konvertuojamos į WebP (jei įmanoma) ir saugomos tik šioje naršyklėje. Jos nesinchronizuojamos.</p>
      )}
    </div>
  );
}