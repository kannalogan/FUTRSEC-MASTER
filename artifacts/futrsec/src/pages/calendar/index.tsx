import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TYPE_COLORS: Record<string, string> = {
  assignment: "#F97316", interview: "#8B5CF6", lab: "#10B981", other: "#2563EB",
};

export default function CalendarPage() {
  const [date, setDate] = useState(new Date());

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: () => apiFetch<any[]>("/api/calendar/events"),
  });

  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = date.toLocaleString("default", { month: "long", year: "numeric" });
  const today = new Date();

  const eventsByDay = new Map<number, typeof events>();
  events.forEach((e: any) => {
    const d = new Date(e.date);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      if (!eventsByDay.has(day)) eventsByDay.set(day, []);
      eventsByDay.get(day)!.push(e);
    }
  });

  const upcoming = [...events]
    .filter((e: any) => new Date(e.date) >= today)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Calendar" subtitle="Track deadlines, interviews, and milestones" icon={CalendarIcon} />

      <div className="bg-white border border-border/60 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-foreground">{monthName}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate(new Date(year, month - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDate(new Date())}>Today</Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate(new Date(year, month + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b bg-muted/20">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border/30 bg-muted/10" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dayEvents = eventsByDay.get(day) ?? [];
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            return (
              <div key={day} className={`min-h-[80px] border-b border-r border-border/30 p-1.5 ${isToday ? "bg-primary/5" : ""}`}>
                <div className={`text-xs font-medium h-5 w-5 flex items-center justify-center rounded-full mb-1 ${isToday ? "bg-primary text-white" : "text-foreground"}`}>{day}</div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((e: any) => (
                    <div key={e.id} className="text-[9px] truncate px-1 py-0.5 rounded text-white font-medium leading-tight" style={{ backgroundColor: TYPE_COLORS[e.type] ?? "#2563EB" }}>
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && <div className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 2}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <h3 className="text-sm font-semibold text-foreground mb-3">Upcoming Events</h3>
      {isLoading ? (
        <GridSkeleton cols={2} rows={1} />
      ) : upcoming.length === 0 ? (
        <EmptyState icon={CalendarIcon} title="No upcoming events" description="Assignments and interviews will appear here automatically." />
      ) : (
        <div className="space-y-2">
          {upcoming.map((e: any) => (
            <div key={e.id} className="flex items-center gap-3 bg-white border border-border/60 rounded-lg px-4 py-3">
              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[e.type] ?? "#2563EB" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize shrink-0">{e.type}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
