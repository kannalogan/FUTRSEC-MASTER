import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Megaphone } from "lucide-react";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  read: boolean;
}
interface NotificationsData {
  notifications: Notification[];
  unreadCount: number;
}

export default function NotificationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: () => apiFetch<NotificationsData>("/api/notifications"),
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <PageHeader
        icon={Bell}
        title="Notifications"
        subtitle="Announcements and updates from FUTRSEC"
        actions={data && data.unreadCount > 0 ? <Badge className="bg-primary/10 text-primary border-primary/20">{data.unreadCount} new</Badge> : undefined}
      />

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <CardSkeleton key={i} rows={1} />)}</div>
      ) : !data || data.notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up. New announcements will appear here." />
      ) : (
        <div className="space-y-2">
          {data.notifications.map((n, idx) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
            >
              <Card className={`border-border/60 ${n.read ? "bg-white" : "bg-primary/[0.03] border-primary/20"}`}>
                <CardContent className="p-4 flex gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Megaphone className="h-[18px] w-[18px] text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm text-foreground">{n.title}</h3>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                      {new Date(n.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
