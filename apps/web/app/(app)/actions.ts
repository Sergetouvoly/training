"use server";
// Refs: SPEC.md §9 US-1.1
import { signOut } from "../../auth";

export async function doSignOut() {
  await signOut({ redirectTo: "/login" });
}
