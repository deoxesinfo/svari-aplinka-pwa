/**
 * Mobile camera image budget. The private R2 API accepts at most 3 MiB full
 * and 512 KiB thumb. 1.6 MiB is a softer quality/cost target, not a format promise.
 */
export const PHOTO_MAX_BYTES=3*1024*1024;
export const PHOTO_TARGET_BYTES=Math.round(1.6*1024*1024);
export const THUMB_MAX_BYTES=512*1024;
export type EncodedVariant={blob:Blob;width:number;height:number;maxEdge:number};
/**
 * Preserve extra resolution only when the byte cost is reasonable.
 * A 2000 px candidate may be WebP while the safe iOS baseline is JPEG.
 */
export function choosePhotoVariant(
 baseline:EncodedVariant, larger?:EncodedVariant, medium?:EncodedVariant
):EncodedVariant{
 const maximum=Math.min(PHOTO_TARGET_BYTES,Math.max(300*1024,Math.floor(baseline.blob.size*1.35)));
 for(const variant of [larger,medium]){
  if(variant&&variant.maxEdge>baseline.maxEdge&&variant.blob.size<=maximum&&
     variant.blob.size<=PHOTO_MAX_BYTES)return variant;
 }
 return baseline;
}
