import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import {
  PlayCircle,
  Calculator,
  MessageSquare,
  BookOpen,
  Video,
  FileText,
  Mail,
  Info,
  DollarSign,
  Headphones,
} from "lucide-react";

// Validation Schema
const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  message: z.string().trim().max(2000, "Message must be less than 2000 characters").optional(),
});

const helpSections = [
  {
    title: "Getting Started",
    icon: PlayCircle,
    items: [
      "Build Your First AI System (5 min video)",
      "Understanding ROI Metrics",
      "Connecting Your Tech Stack",
      "Setting Up Team Permissions",
    ],
  },
  {
    title: "User Guides",
    icon: BookOpen,
    items: [
      "No-Code Builder Tutorial",
      "Analytics Dashboard Guide",
      "Compliance & Audit Best Practices",
      "Integration Configuration",
    ],
  },
  {
    title: "Templates",
    icon: FileText,
    items: [
      "Healthcare Compliance Template",
      "Manufacturing Quality Control",
      "Marketing Automation Setup",
      "Finance Reporting Workflows",
    ],
  },
];

export default function Help() {
  // ROI Calculator State
  const [manualHours, setManualHours] = useState(40);
  const [hourlyCost, setHourlyCost] = useState(75);
  const [automationPercent, setAutomationPercent] = useState(60);
  const [timeline, setTimeline] = useState(12);

  // Contact Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ROI Calculations (live updating)
  const timeSavedWeek = (manualHours * automationPercent) / 100;
  const annualSavings = manualHours * hourlyCost * (automationPercent / 100) * 52;
  const totalManualCost = manualHours * hourlyCost * 52;
  const roi = totalManualCost > 0 ? (annualSavings / totalManualCost) * 100 : 0;

  // Contact Form Submission
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate input
      const validatedData = contactSchema.parse({ name, email, message });

      // Submit to Supabase
      const { error } = await supabase.from("contact_expert_logs").insert({
        name: validatedData.name,
        email: validatedData.email,
        message: validatedData.message || "",
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Supabase error:", error);
        toast.error("Failed to send message. Please try again.");
        return;
      }

      toast.success("Thanks! Our team will reach out shortly.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors?.[0];
        toast.error(firstError?.message || 'Validation error');
      } else {
        console.error("Contact form error:", error);
        toast.error("An error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-display font-bold mb-2 text-gradient-hero">
              Learning Hub
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Resources, tutorials, and expert support to accelerate your AI transformation
            </p>
          </div>

          {/* Featured Quickstart */}
          <Card className="glass-panel p-6 md:p-8 mb-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/20 mb-4">
                <PlayCircle className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
                🎓 Build Your First AI System
              </h2>
              <p className="text-muted-foreground mb-6">
                5-minute quickstart guide to deploying your first AI workflow
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button className="glow-yellow font-semibold">
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Watch Tutorial
                </Button>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Documentation
                </Button>
              </div>
            </div>
          </Card>

          {/* 4-Section Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Section 1: Quickstart & Tutorials */}
            <Card className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary">
                  <PlayCircle className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-lg">Getting Started</h3>
              </div>
              <ul className="space-y-3 mb-4">
                {helpSections[0].items.map((item, idx) => (
                  <li key={idx}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-smooth flex items-start gap-2"
                    >
                      <span className="text-secondary mt-1">•</span>
                      <span>{item}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="w-full">
                View All Tutorials
              </Button>
            </Card>

            {/* Section 2: Guides & Templates */}
            <Card className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary">
                  <BookOpen className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-lg">📘 User Guides</h3>
              </div>
              <ul className="space-y-3 mb-4">
                {helpSections[1].items.map((item, idx) => (
                  <li key={idx}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-smooth flex items-start gap-2"
                    >
                      <span className="text-secondary mt-1">•</span>
                      <span>{item}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <div className="pt-3 border-t border-border">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">🧩 Templates</h4>
                </div>
                <ul className="space-y-2 mb-4">
                  {helpSections[2].items.map((item, idx) => (
                    <li key={idx}>
                      <a
                        href="#"
                        className="text-xs text-muted-foreground hover:text-foreground transition-smooth flex items-start gap-2"
                      >
                        <span className="text-secondary mt-0.5">•</span>
                        <span>{item}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                View All Resources
              </Button>
            </Card>

            {/* Section 3: ROI Calculator */}
            <Card className="glass-panel p-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/20 mb-3">
                  <Calculator className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display font-bold text-xl mb-1">ROI Calculator</h3>
                <p className="text-xs text-muted-foreground">
                  Estimate your AI automation ROI in real-time
                </p>
              </div>

              <div className="space-y-5">
                {/* Manual Hours */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium flex items-center gap-1">
                      Manual Hours/Week
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Current weekly hours spent on manual tasks</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                    <span className="text-sm font-bold text-primary">{manualHours}h</span>
                  </div>
                  <Slider
                    value={[manualHours]}
                    onValueChange={(val) => setManualHours(val[0])}
                    min={1}
                    max={168}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Hourly Cost */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium flex items-center gap-1">
                      Hourly Cost ($)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Average loaded cost per hour (salary + benefits)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                    <span className="text-sm font-bold text-primary">${hourlyCost}</span>
                  </div>
                  <Slider
                    value={[hourlyCost]}
                    onValueChange={(val) => setHourlyCost(val[0])}
                    min={20}
                    max={500}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* Automation Percentage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium flex items-center gap-1">
                      Expected Automation (%)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Percentage of tasks that can be automated</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                    <span className="text-sm font-bold text-primary">{automationPercent}%</span>
                  </div>
                  <Slider
                    value={[automationPercent]}
                    onValueChange={(val) => setAutomationPercent(val[0])}
                    min={10}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* Timeline */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium flex items-center gap-1">
                      Project Timeline (months)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Expected implementation and ROI realization period</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                    <span className="text-sm font-bold text-primary">{timeline}mo</span>
                  </div>
                  <Slider
                    value={[timeline]}
                    onValueChange={(val) => setTimeline(val[0])}
                    min={1}
                    max={36}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Live Results */}
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Annual Savings = (Manual Hours × Hourly Cost × Automation % × 52)
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg md:text-xl font-display font-bold text-primary mb-1">
                      ${Math.round(annualSavings).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Annual Savings</p>
                  </div>
                  <div>
                    <p className="text-lg md:text-xl font-display font-bold text-secondary mb-1">
                      {Math.round(roi)}%
                    </p>
                    <p className="text-xs text-muted-foreground">ROI</p>
                  </div>
                  <div>
                    <p className="text-lg md:text-xl font-display font-bold mb-1">
                      {Math.round(timeSavedWeek)}h
                    </p>
                    <p className="text-xs text-muted-foreground">Time Saved/Week</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Section 4: Expert Consultation */}
            <Card className="glass-panel p-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/20 mb-3">
                  <Headphones className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display font-bold text-xl mb-1">🤝 Need Expert Guidance?</h3>
                <p className="text-xs text-muted-foreground">
                  Book a consultation with our AI specialists
                </p>
              </div>

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="bg-input border-border"
                    maxLength={100}
                    required
                    aria-label="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@company.com"
                    className="bg-input border-border"
                    maxLength={255}
                    required
                    aria-label="Your email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Message <span className="text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Tell us about your needs..."
                    className="bg-input border-border resize-none"
                    maxLength={2000}
                    aria-label="Your message"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 glow-yellow font-semibold"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Sending..." : "Contact Expert"}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1">
                    <Video className="h-4 w-4 mr-2" />
                    Schedule Demo
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
