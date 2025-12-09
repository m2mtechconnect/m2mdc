import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Zap, Check, AlertCircle } from "lucide-react";
import { FieldMapper } from "./FieldMapper";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { emitCatalogUpdate } from "@/hooks/useWorkflowSync";

interface ZapierConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appName: string;
  appIcon: string;
}

const zapTemplates = [
  { id: "1", name: "New Record → Index", trigger: "New Record", action: "Index Content" },
  { id: "2", name: "New Item → Create Task", trigger: "New Item", action: "Create Task" },
  { id: "3", name: "New Message → Notify", trigger: "New Message", action: "Send Notification" },
  { id: "4", name: "Updated Record → Sync", trigger: "Updated Record", action: "Sync Data" },
  { id: "5", name: "New Ticket → Alert", trigger: "New Ticket", action: "Create Alert" },
];

export function ZapierConnectModal({
  open,
  onOpenChange,
  appName,
  appIcon,
}: ZapierConnectModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [schedule, setSchedule] = useState("on-event");
  const [isConnecting, setIsConnecting] = useState(false);

  const filteredTemplates = zapTemplates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save integration to database
      const provider = appName.toLowerCase().replace(/\s+/g, "_");
      const { error } = await supabase.from("integrations").upsert({
        user_id: user.id,
        provider,
        name: appName,
        category: "Business Tools",
        status: "connected",
        connect_method: "zapier",
        config: {
          template: zapTemplates?.find(t => t.id === selectedTemplate)?.name,
          schedule,
        },
        last_sync: new Date().toISOString(),
      });

      if (error) throw error;

      // Emit catalog update event for workflow sync
      emitCatalogUpdate('integration', provider, appName);

      toast.success(`${appName} connected successfully!`);
      onOpenChange(false);
      // Reset
      setStep(1);
      setSelectedTemplate("");
      setSearchQuery("");
    } catch (error) {
      console.error("Connection error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset on close
    setTimeout(() => {
      setStep(1);
      setSelectedTemplate("");
      setSearchQuery("");
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{appIcon}</span>
            <DialogTitle className="text-h3">Connect {appName} via Zapier</DialogTitle>
          </div>
          <DialogDescription>
            Connect {appName} without code. Follow the 3-step wizard to set up your integration.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((num) => (
            <div key={num} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-smooth ${
                  step >= num
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted bg-background"
                }`}
              >
                {step > num ? <Check className="h-5 w-5" /> : num}
              </div>
              {num < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 transition-smooth ${
                    step > num ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Pick Template */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="template-search">Search Zap Templates</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="template-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., 'New Record', 'Create Task'..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`p-4 cursor-pointer transition-smooth hover:border-primary ${
                    selectedTemplate === template.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-body font-medium mb-2">{template.name}</h4>
                      <div className="flex items-center gap-2 text-caption text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {template.trigger}
                        </Badge>
                        <Zap className="h-3 w-3" />
                        <Badge variant="outline" className="text-xs">
                          {template.action}
                        </Badge>
                      </div>
                    </div>
                    {selectedTemplate === template.id && (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedTemplate}
                className="glow-yellow"
              >
                Next: Auth & Map Fields
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Auth & Field Mapping */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-body font-medium mb-1">OAuth Authentication Required</p>
                <p className="text-caption text-muted-foreground">
                  You'll be redirected to {appName} to authorize access. This allows Zapier to
                  connect securely.
                </p>
              </div>
            </div>

            <FieldMapper appName={appName} />

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={() => setStep(3)} className="glow-yellow">
                  Next: Schedule & Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Schedule & Save */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="schedule">Trigger Cadence</Label>
              <Select value={schedule} onValueChange={setSchedule}>
                <SelectTrigger id="schedule" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="on-event">On Event (Real-time)</SelectItem>
                  <SelectItem value="5min">Every 5 Minutes</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-caption text-muted-foreground mt-2">
                How often should we check for new data from {appName}?
              </p>
            </div>

            <div>
              <Label>Destination</Label>
              <div className="mt-2 space-y-2">
                <Card className="p-4 border-primary ring-2 ring-primary">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-body font-medium mb-1">Index & Search</h4>
                      <p className="text-caption text-muted-foreground">
                        Make content searchable with AI-powered retrieval and grounding
                      </p>
                    </div>
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                </Card>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-body font-medium mb-3">Preview Configuration</h4>
              <div className="space-y-2 text-caption">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">App:</span>
                  <span className="font-medium">{appName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Template:</span>
                  <span className="font-medium">
                    {zapTemplates?.find((t) => t.id === selectedTemplate)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Schedule:</span>
                  <span className="font-medium">
                    {schedule === "on-event"
                      ? "Real-time"
                      : schedule === "5min"
                      ? "Every 5 min"
                      : schedule === "hourly"
                      ? "Hourly"
                      : "Daily"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destination:</span>
                  <span className="font-medium">Index & Search</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="glow-yellow min-w-[180px]"
                >
                  {isConnecting ? (
                    <>
                      <Zap className="mr-2 h-4 w-4 animate-pulse" />
                      Connecting...
                    </>
                  ) : (
                    <>Create & Activate Zap</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
