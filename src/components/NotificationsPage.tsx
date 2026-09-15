import * as React from "react";
import {
  Bell, ArrowLeft, CheckCircle2, FileText, AlertCircle,
  Send, Flag, RefreshCw, Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { notificationsApi } from "@/lib/api";

interface Notification {
  id: number;
  title: string;
  body?: string | null;
  created_at?: string;
  read: boolean;
  type: "report" | "approval" | "directive" | "alert";
  link?: string | null;
}

const TYPE_STYLE: Record<string, { icon: React.ReactNode; dot: string }> = {
  report:    { icon: <FileText className="w-4 h-4" />,      dot: "bg-blue-500"    },
  approval:  { icon: <CheckCircle2 className="w-4 h-4" />,  dot: "bg-emerald-500" },
  directive: { icon: <Flag className="w-4 h-4" />,         dot: "bg-amber-500"   },
  alert:     { icon: <AlertCircle className="w-4 h-4" />,  dot: "bg-rose-500"    },
};

function timeAgo(iso?: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

interface Props {
  onBack: () => void;
}

export default function NotificationsPage({ onBack }: Props) {
  const [items, setItems] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const unread = items.filter((n) => !n.read).length;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.list();
      setItems((res.data || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        created_at: n.created_at,
        read: !!n.read,
        type: (n.type || "alert") as Notification["type"],
        link: n.link,
      })));
    } catch (err: any) {
      toast.error("Failed to load notifications", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err: any) {
      toast.error("Failed to mark notifications read", { description: err.message });
    }
  };

  const markRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      /* ignore */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="relative z-10 flex flex-col h-full"
    >
      <div className="bg-white border-b border-[#d4e8dc] px-8 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Notifications</h2>
            {unread > 0 && <p className="text-xs text-slate-500">{unread} unread</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unread === 0} className="gap-2 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> Mark all read
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-8 space-y-3">
          {loading ? (
            <div className="py-16 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardContent className="py-16 flex flex-col items-center gap-3 text-slate-400">
                <Bell className="w-10 h-10 opacity-30" />
                <p className="text-sm font-medium">No notifications yet</p>
              </CardContent>
            </Card>
          ) : (
            items.map((n, i) => {
              const style = TYPE_STYLE[n.type] || TYPE_STYLE.alert;
              return (
                <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all hover:shadow-sm ${
                      n.read
                        ? "bg-white border-[#d4e8dc]"
                        : "bg-[#f0fdf7] border-[#25a872]/30 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        n.read ? "bg-slate-100 text-slate-500" : "bg-[#e8f5ee] text-[#145c3f]"
                      }`}>
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold truncate ${n.read ? "text-slate-700" : "text-slate-900"}`}>
                            {n.title}
                          </p>
                          {!n.read && <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                          <Send className="w-3 h-3" /> {timeAgo(n.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
