import { vi } from "vitest";

export const useRouter = vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }));
export const useSearchParams = vi.fn(() => ({ get: vi.fn(() => null) }));
export const usePathname = vi.fn(() => "/");
