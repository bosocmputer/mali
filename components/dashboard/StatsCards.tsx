"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, ListTodo } from "lucide-react";
import { DashboardStats } from "@/types";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  stats: DashboardStats;
}

const cards = [
  {
    key: "totalTasks" as keyof DashboardStats,
    label: "งานทั้งหมด",
    icon: ListTodo,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    key: "submittedTasks" as keyof DashboardStats,
    label: "ยื่นแล้ว",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  {
    key: "processingTasks" as keyof DashboardStats,
    label: "กำลังดำเนินการ",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    key: "overdueTasks" as keyof DashboardStats,
    label: "เกินกำหนด",
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-100",
  },
];

function AnimatedNumber({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const duration = 600;
    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    }

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);

  return <>{display}</>;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key];
        const pct =
          stats.totalTasks > 0
            ? Math.round((value / stats.totalTasks) * 100)
            : 0;

        return (
          <Card
            key={card.key}
            className={cn("border", card.border, "shadow-sm")}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {card.label}
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    <AnimatedNumber target={value} />
                  </p>
                  {card.key !== "totalTasks" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {pct}% ของทั้งหมด
                    </p>
                  )}
                </div>
                <div className={cn("p-3 rounded-xl", card.bg)}>
                  <Icon className={cn("h-5 w-5", card.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
