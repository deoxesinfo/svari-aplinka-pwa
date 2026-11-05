import type { Address } from "./types";

/** Jobs can be created only for existing, non-archived, non-deleted addresses. */
export function isAvailableJobAddress(address: Address | null | undefined): address is Address {
  return Boolean(address && !address.archivedAt && !address.deletedAt);
}

/** Never preselect a deleted/archived address, even if suggested by the caller. */
export function selectDefaultJobAddressId(addresses: readonly Address[], preferredId?: string): string {
  if (preferredId && addresses.some(a => a.id === preferredId && isAvailableJobAddress(a))) return preferredId;
  return addresses.find(isAvailableJobAddress)?.id ?? "";
}
