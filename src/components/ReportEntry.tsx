import * as React from "react";
import { 
  ChevronRight, 
  Save, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  FileText, 
  Banknote, 
  Users, 
  CheckCircle2, 
  ShieldCheck,
  AlertCircle,
  Plus,
  Trash2,
  FileUp,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

// --- Types ---

type Step = "details" | "data-entry" | "attachments" | "review";
type Section = "activity" | "finance" | "enrolment" | "qa" | "special";

interface ReportEntryProps {
  onBack: () => void;
  onPreview: (data: any) => void;
}

// --- Constants ---

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", 
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", 
  "Taraba", "Yobe", "Zamfara"
];

const OFFICERS = [
  "SO (State Officer)", "ZD (Zonal Director)", "SDO (Strategic Dev Officer)", "HQ (Department Staff)", "AUDIT (Audit Team)"
];

// --- Components ---

const Stepper = ({ currentStep }: { currentStep: Step }) => {
  const steps: { id: Step; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "data-entry", label: "Data Entry" },
    { id: "attachments", label: "Attachments" },
    { id: "review", label: "Review" },
  ];

  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between max-w-3xl mx-auto relative">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-500" 
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted ? "bg-primary border-primary text-white" : 
                  isActive ? "bg-white border-primary text-primary shadow-lg shadow-primary/20" : 
                  "bg-white border-slate-200 text-slate-400"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <span>{idx + 1}</span>}
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? "text-primary" : "text-slate-400"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative">
        <img src="" alt="" />
        <div className="absolute"></div>
      </div>
    </div>
  );
};

export default function ReportEntry({ onBack, onPreview }: ReportEntryProps) {
  const [currentStep, setCurrentStep] = React.useState<Step>("details");
  const [activeSection, setActiveSection] = React.useState<Section>("activity");
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSaveDraft = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Draft saved successfully", {
        description: "Your progress has been auto-saved to the cloud.",
      });
    }, 800);
  };

  const handleContinue = () => {
    if (currentStep === "details") setCurrentStep("data-entry");
    else if (currentStep === "data-entry") setCurrentStep("attachments");
    else if (currentStep === "attachments") setCurrentStep("review");
    else {
      toast.success("Report ready for submission");
      onPreview({});
    }
  };

  const handleBack = () => {
    if (currentStep === "details") onBack();
    else if (currentStep === "data-entry") setCurrentStep("details");
    else if (currentStep === "attachments") setCurrentStep("data-entry");
    else if (currentStep === "review") setCurrentStep("attachments");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {/* Header */}
      <div className="bg-white border-b border-border/50 px-8 py-4 flex items-center justify-between sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleSaveDraft} disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Draft"}
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20" onClick={handleContinue}>
            {currentStep === "review" ? "Submit Report" : "Continue"} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto p-8 space-y-8">
          {/* Stepper */}
          <Stepper currentStep={currentStep} />

          <AnimatePresence mode="wait">
            {currentStep === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Report Basic Information</CardTitle>
                    <CardDescription>Define the scope and period for this submission.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="state">Reporting State</Label>
                      <Select defaultValue="Lagos">
                        <SelectTrigger id="state">
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent>
                          {NIGERIAN_STATES.map(state => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="officer">Reporting Officer</Label>
                      <Select defaultValue="SO (State Officer)">
                        <SelectTrigger id="officer">
                          <SelectValue placeholder="Select Officer" />
                        </SelectTrigger>
                        <SelectContent>
                          {OFFICERS.map(officer => (
                            <SelectItem key={officer} value={officer}>{officer}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="period">Reporting Period</Label>
                      <Select defaultValue="oct-2023">
                        <SelectTrigger id="period">
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oct-2023">October 2023</SelectItem>
                          <SelectItem value="sep-2023">September 2023</SelectItem>
                          <SelectItem value="aug-2023">August 2023</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Report Type</Label>
                      <Select defaultValue="monthly">
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly Operations Report</SelectItem>
                          <SelectItem value="quarterly">Quarterly Performance Review</SelectItem>
                          <SelectItem value="annual">Annual Summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <Info className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-primary">Unified Data Entry</p>
                      <p className="text-xs text-primary/80 leading-relaxed">
                        This form replaces the previous paper-based Activity, Finance, and Enrolment formats. 
                        Data entered here will be automatically aggregated for Zonal and HQ review.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === "data-entry" && (
              <motion.div
                key="data-entry"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as Section)} className="w-full">
                  <TabsList className="grid grid-cols-5 w-full h-12 bg-slate-100 p-1">
                    <TabsTrigger value="activity" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Activity</span>
                    </TabsTrigger>
                    <TabsTrigger value="finance" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <Banknote className="w-4 h-4" /> <span className="hidden sm:inline">Finance</span>
                    </TabsTrigger>
                    <TabsTrigger value="enrolment" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <Users className="w-4 h-4" /> <span className="hidden sm:inline">Enrolment</span>
                    </TabsTrigger>
                    <TabsTrigger value="qa" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <ShieldCheck className="w-4 h-4" /> <span className="hidden sm:inline">QA</span>
                    </TabsTrigger>
                    <TabsTrigger value="special" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <AlertCircle className="w-4 h-4" /> <span className="hidden sm:inline">Special</span>
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-6">
                    <TabsContent value="activity" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Operational Activities</CardTitle>
                          <CardDescription>Record key metrics for the reporting period.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="sensitization">Sensitization Programs</Label>
                              <Input id="sensitization" type="number" placeholder="0" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="advocacy">Advocacy Visits</Label>
                              <Input id="advocacy" type="number" placeholder="0" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="stakeholders">Stakeholder Meetings</Label>
                              <Input id="stakeholders" type="number" placeholder="0" />
                            </div>
                          </div>
                          <Separator />
                          <div className="space-y-2">
                            <Label htmlFor="narrative">Activity Narrative</Label>
                            <div className="border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-primary transition-all">
                              <div className="bg-slate-50 border-b p-2 flex gap-2">
                                <Button variant="ghost" size="icon-sm" className="h-7 w-7 font-bold">B</Button>
                                <Button variant="ghost" size="icon-sm" className="h-7 w-7 italic">I</Button>
                                <Button variant="ghost" size="icon-sm" className="h-7 w-7 underline">U</Button>
                                <Separator orientation="vertical" className="h-4 my-auto" />
                                <Button variant="ghost" size="icon-sm" className="h-7 w-7">List</Button>
                              </div>
                              <textarea 
                                id="narrative"
                                className="w-full h-40 p-4 bg-white resize-none outline-none text-sm leading-relaxed"
                                placeholder="Provide a detailed narrative of activities performed during this period..."
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="finance" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Financial Summary</CardTitle>
                          <CardDescription>Revenue and expenditure details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="revenue">Total Revenue Generated (₦)</Label>
                              <Input id="revenue" type="number" placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="expenditure">Total Expenditure (₦)</Label>
                              <Input id="expenditure" type="number" placeholder="0.00" />
                            </div>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                            <p className="text-xs text-muted-foreground text-center italic">
                              Note: All financial figures must match the bank reconciliation statement attached in the next step.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="enrolment" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Enrolment Statistics</CardTitle>
                          <CardDescription>New and existing member data.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="new-enrolment">New Enrolments</Label>
                            <Input id="new-enrolment" type="number" placeholder="0" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="renewals">Renewals</Label>
                            <Input id="renewals" type="number" placeholder="0" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="total-active">Total Active Members</Label>
                            <Input id="total-active" type="number" placeholder="0" />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="qa" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Quality Assurance</CardTitle>
                          <CardDescription>Facility inspections and complaints.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="inspections">Facilities Inspected</Label>
                            <Input id="inspections" type="number" placeholder="0" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="complaints">Complaints Resolved</Label>
                            <Input id="complaints" type="number" placeholder="0" />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="special" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Special Events & Challenges</CardTitle>
                          <CardDescription>Record any unusual occurrences or bottlenecks.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="special-narrative">Description</Label>
                            <textarea 
                              id="special-narrative"
                              className="w-full h-32 p-3 border rounded-md bg-background resize-none focus:ring-2 focus:ring-primary outline-none text-sm"
                              placeholder="Describe any special events, challenges, or recommendations..."
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </div>
                </Tabs>
              </motion.div>
            )}

            {currentStep === "attachments" && (
              <motion.div
                key="attachments"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Supporting Documents</CardTitle>
                    <CardDescription>Upload necessary files to validate your report data.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center space-y-4 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-primary/10 transition-colors">
                        <FileUp className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-700">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground">PDF, JPG, PNG or DOCX (max. 10MB per file)</p>
                      </div>
                      <Button variant="outline" size="sm">Select Files</Button>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" /> Uploaded Files (2)
                      </h4>
                      <div className="space-y-2">
                        {[
                          { name: "Bank_Statement_Oct23.pdf", size: "1.2 MB" },
                          { name: "Enrolment_Summary_Lagos.xlsx", size: "850 KB" }
                        ].map((file) => (
                          <div key={file.name} className="flex items-center justify-between p-3 bg-white border rounded-lg group hover:border-primary/30 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{file.name}</p>
                                <p className="text-[10px] text-muted-foreground">{file.size}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === "review" && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card className="border-l-4 border-l-primary">
                  <CardHeader>
                    <CardTitle>Final Review</CardTitle>
                    <CardDescription>Please verify all information before final submission.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Basic Info</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Period:</span>
                            <span className="font-medium">October 2023</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">State:</span>
                            <span className="font-medium">Lagos State</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Financials</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Revenue:</span>
                            <span className="font-medium">₦ 12,450,000.00</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Expenditure:</span>
                            <span className="font-medium">₦ 8,200,000.00</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Activity Summary</h4>
                      <p className="text-sm leading-relaxed text-slate-700 bg-slate-50 p-4 rounded-lg border">
                        During the month of October, the Lagos state office conducted 5 sensitization programs across 3 local governments. 
                        We also held a major stakeholder meeting with the State Ministry of Health to discuss the roll-out of the new 
                        enrolment drive. Challenges included logistics for remote areas, but overall targets were met.
                      </p>
                    </div>

                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-800 leading-relaxed">
                        By clicking "Submit Report", you certify that the information provided is accurate and complete to the best of your knowledge. 
                        Submitted reports will be locked for editing and sent to the Zonal Director for review.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Navigation Bar */}
          <div className="flex items-center justify-between pt-8">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Previous
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={handleSaveDraft} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Draft"}
              </Button>
              <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={handleContinue}>
                {currentStep === "review" ? "Submit Report" : "Continue"} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
