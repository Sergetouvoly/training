export function useSession() {
  return { data: null, status: "unauthenticated", update: async () => null };
}
