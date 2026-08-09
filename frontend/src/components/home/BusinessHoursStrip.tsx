import { useMemo } from "react";
import { getWeekScheduleRows } from "@/lib/weekSchedule";
import type { BusinessHours } from "@/api/modules/settings";

interface BusinessHoursStripProps {
  businessHours?: BusinessHours;
}

export function BusinessHoursStrip({ businessHours }: BusinessHoursStripProps) {
  const rows = useMemo(() => getWeekScheduleRows(businessHours), [businessHours]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 lg:justify-start">
      {rows.map((row) => (
        <span
          key={row.key}
          className={[
            "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
            row.isToday ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted/40 text-muted-foreground",
          ].join(" ")}
          aria-label={`${row.dayLabel} ${row.isOpen ? `${row.open} a ${row.close}` : "cerrado"}`}
        >
          <span className="mr-1.5">{row.dayShortLabel}</span>
          {row.isOpen ? (
            <span className="tabular-nums">{row.open}–{row.close}</span>
          ) : (
            <span className="opacity-70">Cerrado</span>
          )}
        </span>
      ))}
    </div>
  );
}
