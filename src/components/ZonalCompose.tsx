import * as React from "react";
import { 
  ArrowLeft, 
  Send, 
  Eye, 
  FileText, 
  Users, 
  Banknote, 
  ShieldCheck, 
  ChevronRight, 
  ChevronDown,
  Info,
  CheckCircle2,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface ZonalComposeProps {
  onBack: () => void;
  onForward: () => void;
}

const STATE_REPORTS = [
  { id: "REP-LAG-01", state: "Lagos", status: "Reviewed", revenue: "₦ 12.4M", enrolment: "1,240" },
  { id: "REP-OGU-01", state: "Ogun", status: "Reviewed", revenue: "₦ 8.2M", enrolment: "950" },
  { id: "REP-OYO-01", state: "Oyo", status: "Reviewed", revenue: "₦ 7.1M", enrolment: "820" },
];

export default function ZonalCompose({ onBack, onForward }: ZonalComposeProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [expandedReports, setExpandedReports] = React.useState<string[]>([]);

  const toggleReport = (id: string) => {
    setExpandedReports(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleForward = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Zonal Report Forwarded", {
        description: "The consolidated report has been sent to SDO/HQ.",
      });
      onForward();
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {/* Header & Breadcrumbs */}
      <div className="bg-white border-b border-border/50 px-8 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack}>Cancel</Button>
            <Button variant="outline" className="gap-2">
              <Eye className="w-4 h-4" /> Preview
            </Button>
            <Button 
              className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
              onClick={handleForward}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Forwarding..." : "Forward to SDO"} <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Left Column: State Reports Reference */}
          <div className="lg:col-span-4 border-r bg-white/50 overflow-y-auto p-6 hidden lg:block">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Linked State Reports</h3>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none">{STATE_REPORTS.length}</Badge>
              </div>
              
              <div className="space-y-3">
                {STATE_REPORTS.map((report) => (
                  <Card key={report.id} className="overflow-hidden border-slate-200 hover:border-primary/30 transition-all">
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                      onClick={() => toggleReport(report.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {report.state.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{report.state} State</p>
                          <p className="text-[10px] text-muted-foreground">{report.id}</p>
                        </div>
                      </div>
                      {expandedReports.includes(report.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <AnimatePresence>
                      {expandedReports.includes(report.id) && (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-0 space-y-3 border-t border-slate-100 bg-slate-50/50">
                            <div className="grid grid-cols-2 gap-2 pt-3">
                              <div className="p-2 bg-white rounded border text-center">
                                <p className="text-[9px] uppercase font-bold text-muted-foreground">Revenue</p>
                                <p className="text-xs font-bold">{report.revenue}</p>
                              </div>
                              <div className="p-2 bg-white rounded border text-center">
                                <p className="text-[9px] uppercase font-bold text-muted-foreground">Enrolment</p>
                                <p className="text-xs font-bold">{report.enrolment}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="w-full h-7 text-[10px] gap-1">
                              <FileText className="w-3 h-3" /> View Full Report
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ))}
              </div>

              <Card className="bg-blue-50 border-blue-100">
                <CardContent className="p-4 flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 leading-relaxed">
                    These reports have been marked as <strong>Reviewed</strong>. Their data is automatically aggregated into the Zonal KPIs below.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column: Compose Form */}
          <div className="lg:col-span-8 overflow-y-auto bg-white">
            <div className="p-8 max-w-3xl mx-auto space-y-8">
              {/* Tactical Summary */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-bold">Zonal Director Tactical Summary</Label>
                  <Badge variant="outline" className="text-primary border-primary/30">Required</Badge>
                </div>
                <div className="border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary transition-all shadow-sm">
                  <div className="bg-slate-50 border-b p-3 flex gap-2">
                    <Button variant="ghost" size="icon-sm" className="h-8 w-8 font-bold">B</Button>
                    <Button variant="ghost" size="icon-sm" className="h-8 w-8 italic">I</Button>
                    <Button variant="ghost" size="icon-sm" className="h-8 w-8 underline">U</Button>
                    <Separator orientation="vertical" className="h-5 my-auto" />
                    <Button variant="ghost" size="icon-sm" className="h-8 w-8">List</Button>
                    <Button variant="ghost" size="icon-sm" className="h-8 w-8">Link</Button>
                  </div>
                  <textarea 
                    className="w-full h-64 p-6 bg-white resize-none outline-none text-sm leading-relaxed"
                    placeholder="Provide a high-level tactical overview of the zone's performance, key challenges, and strategic recommendations for SDO/HQ..."
                  />
                </div>
              </div>

              <Separator />

              {/* Zonal KPIs */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">Aggregated Zonal KPIs</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  These values are auto-populated from state data. You can adjust them if manual corrections are needed.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="total-enrolment" className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" /> Total Enrolment
                    </Label>
                    <Input id="total-enrolment" type="number" defaultValue="3010" className="font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="complaints" className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-slate-400" /> Complaints Resolved
                    </Label>
                    <Input id="complaints" type="number" defaultValue="25" className="font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="finance" className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-slate-400" /> Finance Utilisation %
                    </Label>
                    <Input id="finance" type="number" defaultValue="78.5" className="font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compliance" className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-slate-400" /> Compliance Rate %
                    </Label>
                    <Input id="compliance" type="number" defaultValue="94.2" className="font-bold" />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-8 flex items-center justify-end gap-4">
                <Button variant="ghost" onClick={onBack}>Back to Review</Button>
                <Button 
                  className="bg-orange-action hover:bg-orange-600 h-12 px-8 font-bold gap-2 shadow-lg shadow-orange-500/20"
                  onClick={handleForward}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Forwarding..." : "Forward to SDO"} <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
