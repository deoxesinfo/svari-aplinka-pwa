import { useEffect, useState } from "react";
import { downloadR2Photo } from "./r2-photos";

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
      /* fall through */
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
  const webp = await canvasBlob(c, "image/webp", q);
  if (webp && webp.type === "image/webp") return webp;
  const jpg = await canvasBlob(c, "image/jpeg", q);
  if (jpg) return jpg;
  throw new Error("Nepavyko apdoroti nuotraukos");
}

/** Resize to max 1600px, convert to WebP (JPEG fallback) and make a 400px thumbnail. */
export async function processImage(file: File) {
  try {
    const src = await loadSource(file);
    const full = await encode(render(src, 1600), 0.82);
    const thumbCanvas = render(src, 400);
    const thumb = await encode(thumbCanvas, 0.7);
    const w = Math.min(1600, src.w), h = src.h;
    const scale = Math.min(1, 1600 / Math.max(src.w, src.h));
    src.close?.();
    return { full, thumb, width: Math.round(src.w * scale) || w, height: Math.round(h * scale) };
  } catch {
    // Never store the uncompressed original when conversion fails.
    throw new Error("Nepavyko suspausti nuotraukos. Pabandykite kitą failą.");
  }
}