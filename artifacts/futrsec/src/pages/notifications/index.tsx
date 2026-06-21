import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import {
  Bell, Megaphone, CheckCheck, Check, Archive, ExternalLink,
  Briefcase, Award, CreditCard, GraduationCap, Calendar,
} from "lucide-react";
import { Link } from "wouter";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useArchiveNotification,
  type AppNotification,
} from "@/lib/notifications-api";

const TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "job", label: "Jobs" },
  { value: "placement", label: "Placement" },
  { value: "subscription", label: "Billing" },
  { value: "campus", label: "Campus" },
  { value: "system", label: "System" },
];

function iconForType(type: string): { Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; bg: string; color: string } {
  if (type.startsWith("job")) return { Icon: Briefcase, bg: "#EFF6FF", color: "#2563EB" };
  if (type.startsWith("placement") || type.startsWith("application")) return { Icon: Award, bg: "#F0FDF4", color: "#10B981" };
  if (type.startsWith("subscription") || type.startsWith("payment") || type.startsWith("trial")) return { Icon: CreditCard, bg: "#F5F3FF", color: "#7C3AED" };
  if (type.startsWith("campus")) return { Icon: Calendar, bg: "#FFF7ED", color: "#F97316" };
  if (type.startsWith("learning") || type.startsWith("course")) return { Icon: GraduationCap, bg: "#ECFEFF", color: "#0891B2" };
  return { Icon: Megaphone, bg: "#FEF3C7", color: "#D97706" };
}

function NotificationRow({ n, idx }: { n: AppNotification; idx: number }) {
  const markRead = useMarkNotificationRead();
  const archive = useArchiveNotification();
  const { Icon, bg, color } = iconForType(n.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: idx * 0.03 }}
    >
      <Card className={`border-border/60 ${n.isRead ? "bg-white" : "bg-primary/[0.03] border-primary/20"}`}>
        <CardContent className="p-4 flex gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
            <Icon className="h-[18px] w-[18px]" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm text-foreground">{n.title}</h3>
              {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
            <div className="flex items-center justify-between gap-2 mt-2">
              <p className="text-[10px] text-muted-foreground/60">
                {new Date(n.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
              <div className="flex items-center gap-1">
                {n.link && (
                  <Link href={n.link}>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1">
                      <ExternalLink className="h-3 w-3" />View
                    </Button>
                  </Link>
                )}
                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1"
                    onClick={() => markRead.mutate(n.id)}
                    disabled={markRead.isPending}
                  >
                    <Check className="h-3 w-3" />Read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] gap-1 text-muted-foreground"
                  onClick={() => archive.mutate(n.id)}
                  disabled={archive.isPending}
                >
                  <Archive className="h-3 w-3" />Archive
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState("");
  const { data, isLoading } = useNotifications(filter || undefined);
  const markAll = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <PageHeader
        icon={Bell}
        title="Notifications"
        subtitle="Updates on jobs, placement, billing and more"
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge className="bg-primary/10 text-primary border-primary/20">{unreadCount} new</Badge>
            )}
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
              >
                <CheckCheck className="h-4 w-4" />Mark all read
              </Button>
            )}
          </div>
        }
      />

      {/* Type filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-foreground text-background"
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <CardSkeleton key={i} rows={1} />)}</div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You're all caught up. New updates will appear here."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n, idx) => (
            <NotificationRow key={n.id} n={n} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
