import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Category,
  type Priority,
  type Status,
} from "@/lib/types";

const CATEGORY_STYLES: Record<Category, string> = {
  offert: "bg-amber-100 text-amber-800 ring-amber-200",
  bokning: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  konsultation: "bg-violet-100 text-violet-800 ring-violet-200",
  ovrigt: "bg-slate-100 text-slate-600 ring-slate-200",
};

const STATUS_STYLES: Record<Status, string> = {
  ny: "bg-brand-100 text-brand-800 ring-brand-200",
  obesvarad: "bg-rose-100 text-rose-700 ring-rose-200",
  besvarad: "bg-sky-100 text-sky-700 ring-sky-200",
  offert_skickad: "bg-amber-100 text-amber-800 ring-amber-200",
  bokad: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  ingen_affar: "bg-slate-100 text-slate-500 ring-slate-200",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  hog: "bg-rose-500",
  medel: "bg-amber-400",
  lag: "bg-slate-300",
};

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  return <Pill className={CATEGORY_STYLES[category]}>{CATEGORY_LABELS[category]}</Pill>;
}

export function StatusBadge({ status }: { status: Status }) {
  return <Pill className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Pill>;
}

export function PriorityDot({ priority }: { priority: Priority }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
      <span className={`h-2 w-2 rounded-full ${PRIORITY_STYLES[priority]}`} />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
