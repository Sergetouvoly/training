export default function NextAuth(_config: unknown) {
  return { handlers: {}, auth: async () => null, signIn: async () => {}, signOut: async () => {} };
}
export const signIn = async () => {};
export const signOut = async () => {};
