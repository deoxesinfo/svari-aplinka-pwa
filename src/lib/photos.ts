import { useEffect, useState } from "react";
import { downloadR2Photo } from "./r2-photos";
import { choosePhotoVariant, PHOTO_MAX_BYTES, THUMB_MAX_BYTES, type EncodedVariant } from "./photo-quality";

const DB_NAME = "svari-aplinka-demo-photos";
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("full")) db.createObjectStore("full");
        if (!db.objectStoreNames.contains("thumb")) db.createObjectStore("thumb");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx(mode: IDBTransactionMode, fn: (full: IDBObjectStore, thumb: IDBObjectStore) => void) {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(["full", "thumb"], mode);
        fn(t.objectStore("full"), t.objectStore("thumb"));
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error ?? new Error("abort"));
      }),
  );
}

export const putPhotoBlobs = (id: string, full: Blob, thumb: Blob) =>
  tx("readwrite", (f, t) => {
    f.put(full, id);
    t.put(thumb, id);
  });

export const deletePhotoBlobs = (id: string) =>
  tx("readwrite", (f, t) => {
    f.delete(id);
    t.delete(id);
  });

export const clearPhotoBlobs = () =>
  tx("readwrite", (f, t) => {
    f.clear();
    t.clear();
  });

export async function getPhotoBlob(id: string, kind: "full" | "thumb"): Promise<Blob | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(kind, "readonly").objectStore(kind).get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
}

export function isQuotaError(e: unknown): boolean {
  const n = (e as { name?: string })?.name ?? "";
  return n === "QuotaExceededError" || n === "NS_ERROR_DOM_QUOTA_REACHED";
}

export function usePhotoUrl(id: string, kind: "full" | "thumb", organizationId?: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let revoked = false;
    let u: string | null = null;
    setUrl(null);
    setMissing(false);
    (organizationId ? downloadR2Photo(organizationId,id,kind) : getPhotoBlob(id, kind))
      .then((b) => {
        if (revoked) return;
        if (!b) return setMissing(true);
        u = URL.createObjectURL(b);
        setUrl(u);
      })
      .catch(() => setMissing(true));
    return () => {
      revoked = true;
      if (u) URL.revokeObjectURL(u);
    };
  }, [id, kind, organizationId]);
  return { url, missing };
}

type Source = { el: CanvasImageSource; w: number; h: number; close?: () => void };

async function loadSource(file: File): Promise<Source> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return { el: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
    } catch {
      // iOS WebKit can reject imageOrientation even when native image decoding works.
      try {
        const bmp = await createImageBitmap(file);
        return { el: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
      } catch {
        /* fall through to the HTMLImageElement decoder */
      }
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Nepavyko nuskaityti nuotraukos"));
    img.src = url;
  });
  return { el: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

function render(src: Source, max: number) {
  const scale = Math.min(1, max / Math.max(src.w, src.h));
  const w = Math.round(src.w * scale);
  const h = Math.round(src.h * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(src.el, 0, 0, w, h);
  return c;
}

function canvasBlob(c: HTMLCanvasElement, type: string, q: number) {
  return new Promise<Blob | null>((r) => c.toBlob(r, type, q));
}

async function encode(c: HTMLCanvasElement, q: number): Promise<Blob> {
  // JPEG is the most reliably supported canvas encoder for iPhone/WebKit cameras.
  // The private R2 API validates both JPEG and WebP; other browsers still prefer WebP.
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) {
    const first = await canvasBlob(c, "image/jpeg", q);
    if (first?.type === "image/jpeg") return first;
  }
  const webp = await canvasBlob(c, "image/webp", q);
  if (webp?.type === "image/webp") return webp;
  const jpg = await canvasBlob(c, "image/jpeg", q);
  if (jpg?.type === "image/jpeg") return jpg;
  throw new Error("Nepavyko užkoduoti nuotraukos kaip WebP/JPEG");
}

/**
 * Preserve small surface defects without wasting R2 storage:
 * JPEG 1600px safe iOS baseline, 2000px WebP if the browser supports it
 * AND fits a 35% relative / 1.6MiB absolute budget. Otherwise try 1800px.
 * Always enforce actual Worker 3MiB full + 512KiB thumbnail limits.
 */
export async function processImage(file:File){
 let src:Source|undefined;
 try{
  src=await loadSource(file);
  const edge=Math.max(src.w,src.h);
  const variant=async(max:number,quality:number,webpPreferred=false):Promise<EncodedVariant>=>{
   const canvas=render(src!,max);
   let blob:Blob;
   if(webpPreferred){
    const webp=await canvasBlob(canvas,"image/webp",quality);
    blob=webp?.type==="image/webp"?webp:await encode(canvas,quality);
   }else{
    blob=await encode(canvas,quality);
   }
   return {blob,width:canvas.width,height:canvas.height,maxEdge:Math.max(canvas.width,canvas.height)};
  };
  let baseline=await variant(1600,0.84);
  // Large noisy phone images need a quality fallback, never original file bytes.
  if(baseline.blob.size>PHOTO_MAX_BYTES)baseline=await variant(1600,0.70);
  if(baseline.blob.size>PHOTO_MAX_BYTES)baseline=await variant(1600,0.56);
  if(baseline.blob.size>PHOTO_MAX_BYTES)throw new Error("Nuotrauka per didelė net suspaudus");
  let selected=baseline;
  if(edge>1600){
   // WebP usually preserves more pixels at lower byte cost. iPhone keeps JPEG
   // fallback when WebP encoding is unsupported or returns an incorrect MIME.
   const hi=await variant(2000,0.84,true);
   if(hi.blob.size<=Math.min(Math.round(1.6*1024*1024),Math.max(300*1024,baseline.blob.size*1.35))){
    selected=choosePhotoVariant(baseline,hi);
   }else{
    const medium=await variant(1800,0.84,true);
    selected=choosePhotoVariant(baseline,hi,medium);
   }
  }
  const thumbCanvas=render(src,400);
  let thumb=await encode(thumbCanvas,0.70);
  if(thumb.size>THUMB_MAX_BYTES)thumb=await encode(thumbCanvas,0.5);
  if(thumb.size>THUMB_MAX_BYTES)throw new Error("Miniatiūra per didelė net suspaudus");
  return {full:selected.blob,thumb,width:selected.width,height:selected.height};
 }catch(err){
  if(err instanceof Error&&/per didelė|per didelė net|Nepavyko užkoduoti/.test(err.message))throw err;
  throw new Error("Nepavyko atidaryti ar sumažinti šios nuotraukos telefone.");
 }finally{src?.close?.();}
}
