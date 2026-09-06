import * as React from "react";
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  FileText, 
  Banknote, 
  Users, 
  ShieldCheck, 
  Calendar,
  MapPin,
  User,
  Send
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface ReportPreviewProps {
  onBack: () => void;
  onEditSection: (section: string) => void;
  onSubmit: () => void;
}

export default function ReportPreview({ onBack, onEditSection, onSubmit }: ReportPreviewProps) {
  const [isConfirmed, setIsConfirmed] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleFinalSubmit = () => {
    if (!isConfirmed) {
      toast.error("Please confirm the declaration before submitting.");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Report submitted successfully", {
        description: "Status changed to 'Pending Zonal Review'.",
      });
      onSubmit();
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {/* Header */}
      <div className="bg-white border-b border-border/50 px-8 py-4 flex items-center justify-end sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>Back to Edit</Button>
          <Button 
            className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit to Zonal Office"} <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-8 space-y-8">
          {/* Warning Banner (Mocked) */}
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-destructive">Required Information Missing</p>
              <p className="text-xs text-destructive/80 leading-relaxed">
                The following fields are empty: <span className="font-bold">Special Events Narrative</span>. 
                Please ensure all mandatory fields are filled before submitting.
              </p>
            </div>
          </div>

          {/* Basic Info Card */}
          <Card className="overflow-hidden">
            <div className="bg-slate-50 border-b px-6 py-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Basic Information
              </h3>
              <Button variant="ghost" size="sm" onClick={() => onEditSection("details")} className="h-8 text-primary gap-1">
                <Edit3 className="w-3 h-3" /> Edit
              </Button>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">State</p>
                  <p className="text-sm font-medium flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" /> Lagos State</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Officer</p>
                  <p className="text-sm font-medium flex items-center gap-1"><User className="w-3 h-3 text-primary" /> SO (State Officer)</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Period</p>
                  <p className="text-sm font-medium">October 2023</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Summaries */}
          <div className="space-y-6">
            <SummaryCard 
              title="Activity Report" 
              icon={<FileText className="w-4 h-4" />} 
              onEdit={() => onEditSection("activity")}
            >
              <div className="grid grid-cols-3 gap-4 mb-4">
                <StatItem label="Sensitizations" value="5" />
                <StatItem label="Advocacy Visits" value="2" />
                <StatItem label="Stakeholder Mtgs" value="1" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Narrative Summary</p>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  During the month of October, the Lagos state office conducted 5 sensitization programs across 3 local governments. 
                  We also held a major stakeholder meeting with the State Ministry of Health...
                </p>
              </div>
            </SummaryCard>

            <SummaryCard 
              title="Financial Summary" 
              icon={<Banknote className="w-4 h-4" />} 
              onEdit={() => onEditSection("finance")}
            >
              <div className="grid grid-cols-2 gap-4">
                <StatItem label="Total Revenue" value="₦ 12,450,000.00" />
                <StatItem label="Total Expenditure" value="₦ 8,200,000.00" />
              </div>
            </SummaryCard>

            <SummaryCard 
              title="Enrolment Data" 
              icon={<Users className="w-4 h-4" />} 
              onEdit={() => onEditSection("enrolment")}
            >
              <div className="grid grid-cols-3 gap-4">
                <StatItem label="New Enrolments" value="1,240" />
                <StatItem label="Renewals" value="850" />
                <StatItem label="Active Members" value="45,200" />
              </div>
            </SummaryCard>

            <SummaryCard 
              title="Quality Assurance" 
              icon={<ShieldCheck className="w-4 h-4" />} 
              onEdit={() => onEditSection("qa")}
            >
              <div className="grid grid-cols-2 gap-4">
                <StatItem label="Inspections" value="12" />
                <StatItem label="Complaints Resolved" value="8" />
              </div>
            </SummaryCard>
          </div>

          {/* Declaration */}
          <Card className="bg-slate-900 text-white border-none shadow-xl">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div 
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-all shrink-0 mt-1 ${isConfirmed ? 'bg-primary border-primary' : 'border-white/30'}`}
                  onClick={() => setIsConfirmed(!isConfirmed)}
                >
                  {isConfirmed && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium leading-relaxed">
                    I, <span className="text-primary font-bold underline decoration-primary/30 underline-offset-4">SO (State Officer)</span>, 
                    hereby declare that the information provided in this report for the period of 
                    <span className="font-bold"> October 2023</span> is accurate, complete, and has been verified 
                    against supporting documentation.
                  </p>
                  <p className="text-[10px] text-white/50 uppercase tracking-widest">
                    Timestamp: {new Date().toLocaleString()} • IP: 192.168.1.45
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  className="flex-1 bg-primary hover:bg-primary/90 text-white h-12 font-bold gap-2"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Confirm & Submit to Zone"} <Send className="w-4 h-4" />
                </Button>
                <Button variant="outline" className="flex-1 bg-transparent border-white/20 hover:bg-white/10 text-white h-12" onClick={onBack}>
                  Back to Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

function SummaryCard({ title, icon, children, onEdit }: { title: string, icon: React.ReactNode, children: React.ReactNode, onEdit: () => void }) {
  return (
    <Card className="group hover:border-primary/30 transition-all">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <div className="p-1.5 bg-slate-100 rounded text-slate-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            {icon}
          </div>
          {title}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 text-xs text-muted-foreground hover:text-primary">
          Edit
        </Button>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">{label}</p>
      <p className="text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
