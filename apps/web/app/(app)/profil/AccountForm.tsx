"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "loading" | "success" | "error";

export function AccountForm({ displayName }: { readonly displayName: string }) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [nameStatus, setNameStatus] = useState<Status>("idle");
  const [pwdStatus, setPwdStatus] = useState<Status>("idle");
  const [pwdError, setPwdError] = useState("");

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === displayName) return;
    setNameStatus("loading");
    const res = await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: name.trim() }),
    });
    setNameStatus(res.ok ? "success" : "error");
    if (res.ok) router.refresh();
  }

  async function savePwd(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");
    if (newPwd.length < 8) { setPwdError("Le mot de passe doit faire au moins 8 caractères."); return; }
    if (newPwd !== confirmPwd) { setPwdError("Les mots de passe ne correspondent pas."); return; }
    setPwdStatus("loading");
    const res = await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
    });
    if (res.ok) {
      setPwdStatus("success");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } else {
      const body = await res.json().catch(() => ({}));
      setPwdError(body.error ?? "Erreur lors du changement de mot de passe.");
      setPwdStatus("error");
    }
  }

  return (
    <div className="space-y-5">

      {/* Nom affiché */}
      <form onSubmit={saveName} className="rounded-xl border border-surface-warm bg-white p-5">
        <h3 className="mb-4 text-sm font-bold text-primary-deep">Nom affiché</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="display-name" className="mb-1 block text-xs font-medium text-ink-soft">
              Nom affiché
            </label>
            <input
              id="display-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameStatus("idle"); }}
              className="w-full rounded-lg border border-surface-warm bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-surface-dark dark:border-surface-warm-dark dark:text-ink-dark"
              required
              minLength={1}
              maxLength={80}
            />
          </div>
          <button
            type="submit"
            disabled={nameStatus === "loading" || !name.trim() || name.trim() === displayName}
            className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-deep disabled:opacity-50"
          >
            {nameStatus === "loading" ? "…" : "Enregistrer"}
          </button>
        </div>
        {nameStatus === "success" && (
          <p className="mt-2 text-xs font-medium text-green-700" role="status">Nom mis à jour.</p>
        )}
        {nameStatus === "error" && (
          <p className="mt-2 text-xs font-medium text-red-600" role="alert">Erreur lors de la mise à jour.</p>
        )}
      </form>

      {/* Mot de passe */}
      <form onSubmit={savePwd} className="rounded-xl border border-surface-warm bg-white p-5">
        <h3 className="mb-4 text-sm font-bold text-primary-deep">Changer le mot de passe</h3>
        <div className="space-y-3">
          {[
            { id: "current-pwd", label: "Mot de passe actuel", value: currentPwd, set: setCurrentPwd },
            { id: "new-pwd",     label: "Nouveau mot de passe", value: newPwd,     set: setNewPwd },
            { id: "confirm-pwd", label: "Confirmer le nouveau", value: confirmPwd, set: setConfirmPwd },
          ].map(({ id, label, value, set }) => (
            <div key={id}>
              <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-soft">{label}</label>
              <input
                id={id}
                type="password"
                value={value}
                onChange={(e) => { set(e.target.value); setPwdStatus("idle"); setPwdError(""); }}
                className="w-full rounded-lg border border-surface-warm bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
                autoComplete={id === "current-pwd" ? "current-password" : "new-password"}
              />
            </div>
          ))}
        </div>

        {pwdError && (
          <p className="mt-2 text-xs font-medium text-red-600" role="alert">{pwdError}</p>
        )}
        {pwdStatus === "success" && (
          <p className="mt-2 text-xs font-medium text-green-700" role="status">Mot de passe mis à jour.</p>
        )}

        <button
          type="submit"
          disabled={pwdStatus === "loading"}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-deep disabled:opacity-50"
        >
          {pwdStatus === "loading" ? "Mise à jour…" : "Changer le mot de passe"}
        </button>
      </form>
    </div>
  );
}
