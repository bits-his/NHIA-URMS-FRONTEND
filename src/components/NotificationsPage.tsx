import * as React from "react";
import {
  Bell, ArrowLeft, CheckCircle2, FileText, AlertCircle,
  Send, Flag, RefreshCw,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: number;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: "report" | "approval" | "directive" | "alert";
}

const TYPE_STYLE: Record<Notification["type"], { icon: React.ReactNode; dot: string }> = {
  report:    { icon: <FileText className="w-4 h-4" />,      dot: "bg-blue-500"    },
  approval:  { icon: <CheckCircle2 className="w-4 h-4" />,  dot: "bg-emerald-500" },
  directive: { icon: <Flag className="w-4 h-4" />,         dot: "bg-amber-500"   },
  alert:     { icon: <AlertCircle className="w-4 h-4" />,  dot: "bg-rose-500"    },
};

const INITIAL: Notification[] = [
  { id: 1, title: "Report submitted for review",  body: "Lagos State Office submitted the January monthly finance report.", time: "2 hrs ago",  read: false, type: "report"    },
  { id: 2, title: "Report approved",              body: "Your annual report NHIA-AR-2025-00012 was approved by the zonal coordinator.", time: "5 hrs ago",  read: false, type: "approval"  },
  { id: 3, title: "Submission reminder",        body: "February programmes monthly report is due in 3 days.", time: "1 day ago",  read: true,  type: "alert"     },
  { id: 4, title: "Report forwarded to SDO",      body: "Kano State annual report has been forwarded for final review.", time: "2 days ago", read: true,  type: "report"    },
  { id: 5, title: "New directive issued",       body: "DG-CEO issued a directive on quarterly reporting deadlines.", time: "3 days ago", read: true,  type: "directive" },
];

interface Props {
  onBack: () => void;
}

export default function NotificationsPage({ onBack }: Props) {
  const [items, setItems] = React.useState(INITIAL);
  const unread = items.filter(n => !n.read).length;

  const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: number) => setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="relative z-10 flex flex-col h-full"
    >
      <div className="bg-white border-b border-[#d4e8dc] px-8 py-4 flex items-center justify-end sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unread === 0} className="gap-2 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> Mark all read
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-8 space-y-3">
          {items.length === 0 ? (
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardContent className="py-16 flex flex-col items-center gap-3 text-slate-400">
                <Bell className="w-10 h-10 opacity-30" />
                <p className="text-sm font-medium">No notifications yet</p>
              </CardContent>
            </Card>
          ) : (
            items.map((n, i) => {
              const style = TYPE_STYLE[n.type];
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
                          <Send className="w-3 h-3" /> {n.time}
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
