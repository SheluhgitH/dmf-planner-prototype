export function isWebGPUSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "gpu" in navigator;
}
