"use client";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  LineElement, PointElement, Filler,
  Tooltip, Legend,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  LineElement, PointElement, Filler,
  Tooltip, Legend,
);

const PRIMARY   = "#1a6c7a";
const DEEP      = "#153243";
const SOFT      = "#f3f9fb";
const WARM      = "#dddddd";
const VIOLET    = "#7c3aed";
const AMBER     = "#d97706";
const GREEN     = "#16a34a";
const RED       = "#dc2626";
const BLUE      = "#2563eb";

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

// ── Répartition des rôles utilisateurs (Doughnut) ────────────────────────────
export function RolesChart({ data }: {
  readonly data: { label: string; value: number; color: string }[];
}) {
  return (
    <Doughnut
      data={{
        labels: data.map((d) => d.label),
        datasets: [{
          data: data.map((d) => d.value),
          backgroundColor: data.map((d) => d.color),
          borderWidth: 2,
          borderColor: "#fff",
        }],
      }}
      options={{
        ...baseOptions,
        plugins: {
          legend: {
            display: true,
            position: "bottom" as const,
            labels: { boxWidth: 12, padding: 16, font: { size: 12 } },
          },
        },
        cutout: "65%",
      }}
    />
  );
}

// ── Modules publiés vs brouillons (Bar horizontal) ───────────────────────────
export function ModulesStatusChart({ published, draft }: {
  readonly published: number;
  readonly draft: number;
}) {
  return (
    <Bar
      data={{
        labels: ["Publiés", "Brouillons"],
        datasets: [{
          data: [published, draft],
          backgroundColor: [GREEN + "cc", WARM],
          borderRadius: 8,
          borderSkipped: false,
        }],
      }}
      options={{
        ...baseOptions,
        indexAxis: "y" as const,
        scales: {
          x: { grid: { color: WARM }, ticks: { font: { size: 11 } } },
          y: { grid: { display: false }, ticks: { font: { size: 12, weight: "bold" } } },
        },
      }}
    />
  );
}

// ── Progression moyenne des apprenants par parcours (Bar) ────────────────────
export function LearnersProgressChart({ labels, values }: {
  readonly labels: string[];
  readonly values: number[];
}) {
  return (
    <Bar
      data={{
        labels,
        datasets: [{
          label: "Progression %",
          data: values,
          backgroundColor: PRIMARY + "cc",
          borderRadius: 8,
          borderSkipped: false,
        }],
      }}
      options={{
        ...baseOptions,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            min: 0, max: 100,
            grid: { color: WARM },
            ticks: { callback: (v: any) => v + "%", font: { size: 11 } },
          },
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
      }}
    />
  );
}

// ── État des stamps (Doughnut vert/orange/rouge) ──────────────────────────────
export function StampsStateChart({ green, orange, red }: {
  readonly green: number;
  readonly orange: number;
  readonly red: number;
}) {
  const total = green + orange + red;
  if (total === 0) return (
    <div className="flex items-center justify-center h-full text-sm text-ink-soft">Aucun stamp</div>
  );
  return (
    <Doughnut
      data={{
        labels: ["Valides", "À revoir", "Expirés"],
        datasets: [{
          data: [green, orange, red],
          backgroundColor: [GREEN + "cc", AMBER + "cc", RED + "cc"],
          borderWidth: 2,
          borderColor: "#fff",
        }],
      }}
      options={{
        ...baseOptions,
        plugins: {
          legend: {
            display: true,
            position: "bottom" as const,
            labels: { boxWidth: 12, padding: 14, font: { size: 12 } },
          },
        },
        cutout: "60%",
      }}
    />
  );
}

// ── Activité par rôle — bar groupée ──────────────────────────────────────────
export function ActivityByRoleChart({ labels, values }: {
  readonly labels: string[];
  readonly values: number[];
}) {
  const COLORS = [DEEP, PRIMARY, BLUE, VIOLET, AMBER];
  return (
    <Bar
      data={{
        labels,
        datasets: [{
          data: values,
          backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length] + "cc"),
          borderRadius: 8,
          borderSkipped: false,
        }],
      }}
      options={{
        ...baseOptions,
        scales: {
          y: { grid: { color: WARM }, ticks: { font: { size: 11 } }, beginAtZero: true },
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
      }}
    />
  );
}

// ── Formateur : leçons par module (Bar) ──────────────────────────────────────
export function LessonsPerModuleChart({ labels, values }: {
  readonly labels: string[];
  readonly values: number[];
}) {
  return (
    <Bar
      data={{
        labels,
        datasets: [{
          label: "Leçons",
          data: values,
          backgroundColor: PRIMARY + "bb",
          borderRadius: 6,
          borderSkipped: false,
        }],
      }}
      options={{
        ...baseOptions,
        scales: {
          y: { grid: { color: WARM }, ticks: { font: { size: 11 } }, beginAtZero: true },
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 30 } },
        },
      }}
    />
  );
}

// ── Manager : taux validation par membre (Bar horizontal) ────────────────────
export function TeamValidationChart({ labels, values }: {
  readonly labels: string[];
  readonly values: number[];
}) {
  return (
    <Bar
      data={{
        labels,
        datasets: [{
          data: values,
          backgroundColor: values.map((v) =>
            v >= 80 ? GREEN + "cc" : v >= 50 ? AMBER + "cc" : RED + "cc"
          ),
          borderRadius: 6,
          borderSkipped: false,
        }],
      }}
      options={{
        ...baseOptions,
        indexAxis: "y" as const,
        scales: {
          x: {
            min: 0, max: 100,
            grid: { color: WARM },
            ticks: { callback: (v: any) => v + "%", font: { size: 11 } },
          },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
      }}
    />
  );
}
