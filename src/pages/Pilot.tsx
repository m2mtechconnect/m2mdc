import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Play, Send, Calendar, Users, Target, Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DCCard, DCSectionHeader } from "@/components/dc-ui/DCCard";

export default function Pilot() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const initiativeTitle = searchParams.get('initiative') || 'AI Initiative';
  const initiativeId = searchParams.get('id') || '';

  const [formData, setFormData] = useState({
    projectName: initiativeTitle,
    department: '',
    teamSize: '',
    startDate: '',
    duration: '',
    objectives: '',
    successCriteria: '',
    budget: '',
    stakeholders: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Pilot Program Submitted",
      description: "Your pilot program request has been submitted successfully. Our team will reach out within 24 hours.",
    });
    setTimeout(() => navigate(-1), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => {
            navigate('/');
          }}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Recommendations
        </Button>

        <DCSectionHeader
          title="Launch Pilot Program"
          subtitle={`Start a small-scale pilot to validate ${initiativeTitle} before full deployment`}
          icon={<Rocket className="h-6 w-6" />}
        />

        <DCCard
          title="Pilot Program Setup"
          icon={<Play className="h-5 w-5" />}
          status="operational"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Info */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Project Information
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    placeholder="Enter project name"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select
                      value={formData.department}
                      onValueChange={(value) => setFormData({ ...formData, department: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="engineering">Engineering</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="sales">Sales & Marketing</SelectItem>
                        <SelectItem value="hr">Human Resources</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teamSize">Team Size</Label>
                    <Select
                      value={formData.teamSize}
                      onValueChange={(value) => setFormData({ ...formData, teamSize: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-5">1-5 people</SelectItem>
                        <SelectItem value="6-10">6-10 people</SelectItem>
                        <SelectItem value="11-20">11-20 people</SelectItem>
                        <SelectItem value="20+">20+ people</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Timeline */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Timeline
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Proposed Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Pilot Duration</Label>
                    <Select
                      value={formData.duration}
                      onValueChange={(value) => setFormData({ ...formData, duration: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4-weeks">4 weeks</SelectItem>
                        <SelectItem value="8-weeks">8 weeks</SelectItem>
                        <SelectItem value="12-weeks">12 weeks</SelectItem>
                        <SelectItem value="16-weeks">16 weeks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Objectives */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Objectives & Success Criteria
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="objectives">Pilot Objectives</Label>
                  <Textarea
                    id="objectives"
                    value={formData.objectives}
                    onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                    placeholder="What do you want to achieve with this pilot? (e.g., validate technical feasibility, measure user adoption, assess ROI)"
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="successCriteria">Success Criteria</Label>
                  <Textarea
                    id="successCriteria"
                    value={formData.successCriteria}
                    onChange={(e) => setFormData({ ...formData, successCriteria: e.target.value })}
                    placeholder="How will you measure success? (e.g., 80% user adoption, 30% efficiency improvement, positive feedback from 90% of users)"
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stakeholders">Key Stakeholders</Label>
                  <Input
                    id="stakeholders"
                    value={formData.stakeholders}
                    onChange={(e) => setFormData({ ...formData, stakeholders: e.target.value })}
                    placeholder="List key stakeholders (comma-separated)"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Estimated Budget</Label>
                  <Select
                    value={formData.budget}
                    onValueChange={(value) => setFormData({ ...formData, budget: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select budget range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10k-25k">$10,000 - $25,000</SelectItem>
                      <SelectItem value="25k-50k">$25,000 - $50,000</SelectItem>
                      <SelectItem value="50k-100k">$50,000 - $100,000</SelectItem>
                      <SelectItem value="100k+">$100,000+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </section>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" size="lg" className="flex-1">
                  <Send className="mr-2 h-4 w-4" />
                  Submit Pilot Request
                </Button>
                <Button type="button" size="lg" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Our team will review your pilot request and reach out within 24 hours to discuss next steps
              </p>
            </form>
        </DCCard>
      </div>
    </div>
  );
}
