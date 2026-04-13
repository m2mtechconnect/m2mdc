import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  GraduationCap,
  Activity,
  Compass,
  Layers,
  RefreshCw,
  UserCog,
  Users,
  Wrench,
  Shield,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { DCCard, DCSectionHeader } from "@/components/dc-ui/DCCard";
import { DCKPITile } from "@/components/dc-ui/DCKPITile";
import { useTour } from "@/context/TourContext";
import { tourRegistry, TourId, tourRoutes } from "@/tours/tourRegistry";

// Tour icon mapping - matches HelpMenu styling
const tourIcons: Record<TourId, React.ReactNode> = {
  studioIntro: <Compass className="h-4 w-4" />,
  overview: <BookOpen className="h-4 w-4" />,
  simulation: <Activity className="h-4 w-4" />,
  blueprint: <Layers className="h-4 w-4" />,
  role_executive: <UserCog className="h-4 w-4" />,
  role_manager: <Users className="h-4 w-4" />,
  role_engineer: <Wrench className="h-4 w-4" />,
  role_security_admin: <Shield className="h-4 w-4" />,
};

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { startTour, resetAllTours, isTourSeen } = useTour();
  
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <DCSectionHeader
            title="Learning Hub"
            subtitle="Resources, tutorials, and expert support to accelerate your AI transformation"
            icon={<GraduationCap className="h-6 w-6" />}
          />

          {/* Featured Quickstart */}
          <DCCard
            title="🎓 Build Your First AI System"
            subtitle="5-minute quickstart guide to deploying your first AI workflow"
            icon={<PlayCircle className="h-6 w-6" />}
            status="operational"
            className="mb-8"
          >
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
          </DCCard>

          {/* 4-Section Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Simulation Tutorial Card */}
            <DCCard
              title="How to Use the Data Centre Simulation"
              subtitle="Learn how to run scenarios and interpret KPI deltas"
              icon={<Activity className="h-5 w-5" />}
              status="operational"
              className="lg:col-span-2"
            >
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Master the simulation engine to test cooling failures, GPU spikes, sovereignty violations, and more. 
                  Understand how KPI deltas help you evaluate the impact of different scenarios on your data centre operations.
                </p>
                <div className="flex gap-2 flex-shrink-0">
                  <Button onClick={() => navigate('/data-centre-twin?view=simulation&mode=guided')} className="gap-2">
                    <PlayCircle className="h-4 w-4" />
                    Open Simulation
                  </Button>
                  <Button variant="outline">
                    Read Documentation
                  </Button>
                </div>
              </div>
            </DCCard>
          </div>

          {/* Guided Tours Section */}
          <DCCard
            title="Guided Tours"
            subtitle="Interactive walkthroughs to learn the platform"
            icon={<Compass className="h-5 w-5" />}
            status="operational"
            className="mb-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {(Object.keys(tourRegistry) as TourId[]).map((tourId) => {
                const tour = tourRegistry[tourId];
                const seen = isTourSeen(tourId);
                return (
                  <button
                    key={tourId}
                    onClick={() => {
                      navigate(tourRoutes[tourId]);
                      setTimeout(() => startTour(tourId), 300);
                    }}
                    className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-primary">{tourIcons[tourId]}</span>
                      <span className="font-medium text-sm">{tour.name}</span>
                      {seen && (
                        <span className="text-xs text-muted-foreground ml-auto">✓</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {tour.description}
                    </p>
                    <div className="mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Start tour →
                    </div>
                  </button>
                );
              })}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetAllTours}
              className="gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset All Tours
            </Button>
          </DCCard>

          {/* Original 4-Section Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Section 1: Quickstart & Tutorials */}
            <DCCard
              title="Getting Started"
              icon={<PlayCircle className="h-5 w-5" />}
              status="operational"
            >
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
            </DCCard>

            {/* Section 2: Guides & Templates */}
            <DCCard 
              title="📘 User Guides" 
              icon={<BookOpen className="h-5 w-5" />}
              status="operational"
            >
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
            </DCCard>

            {/* Section 3: ROI Calculator */}
            <DCCard 
              title="ROI Calculator"
              subtitle="Estimate your AI automation ROI in real-time"
              icon={<Calculator className="h-5 w-5" />}
              status="operational"
            >
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
            </DCCard>

            {/* Section 4: Expert Consultation */}
            <DCCard 
              title="🤝 Need Expert Guidance?"
              subtitle="Book a consultation with our AI specialists"
              icon={<Headphones className="h-5 w-5" />}
              status="operational"
            >
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
            </DCCard>
          </div>
        </div>
      </div>
  );
}
