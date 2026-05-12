"use client";
import dynamic from "next/dynamic";
import type { Module } from "@elearning/api-client";

const AdminModuleEditor = dynamic(
  () => import("./AdminModuleEditor").then((m) => m.AdminModuleEditor),
  { ssr: false },
);

export function AdminModuleEditorClient({ module }: { readonly module: Module }) {
  return <AdminModuleEditor module={module} />;
}
