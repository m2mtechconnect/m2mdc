import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, X, TrendingUp, FileText, BarChart3, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SmartSuggestions() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState(0);
  const navigate = useNavigate();

  const suggestions = [
    {
      text: "You've connected marketing data — would you like to summarize last quarter's campaigns?",
      actions: [
        { label: "Analyze data", action: () => navigate("/analytics") },
        { label: "Build report assistant", action: () => navigate("/builder?template=marketing") },
      ],
      icon: TrendingUp,
    },
    {
      text: "Your compliance systems are active. Want to generate an audit report?",
      actions: [
        { label: "View compliance", action: () => navigate("/compliance") },
        { label: "Export report", action: () => navigate("/compliance?action=export") },
      ],
      icon: FileText,
    },
    {
      text: "ROI increased 110% this quarter. Share these insights with your team?",
      actions: [
        { label: "View analytics", action: () => navigate("/analytics") },
        { label: "Invite teammate", action: () => navigate("/teams") },
      ],
      icon: BarChart3,
    },
  ];

  useEffect(() => {
    // Show suggestion after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isVisible || suggestions.length === 0) return;

    // Rotate suggestions every 15 seconds
    const interval = setInterval(() => {
      setCurrentSuggestion((prev) => (prev + 1) % suggestions.length);
    }, 15000);

    return () => clearInterval(interval);
  }, [isVisible, suggestions.length]);

  if (!isVisible) return null;

  const suggestion = suggestions[currentSuggestion];

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <Card className="glass-panel p-4 w-80 border-primary/30 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary flex-shrink-0">
            <Lightbulb className="h-5 w-5 text-primary-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm font-semibold">💡 Smart Suggestion</p>
              <button
                onClick={() => setIsVisible(false)}
                className="text-muted-foreground hover:text-foreground transition-smooth"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-3">{suggestion.text}</p>

            <div className="flex flex-col gap-2">
              {suggestion.actions.map((action, idx) => (
                <Button
                  key={idx}
                  variant={idx === 0 ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    action.action();
                    setIsVisible(false);
                  }}
                  className={idx === 0 ? "glow-yellow text-xs" : "text-xs"}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1 mt-3">
          {suggestions.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentSuggestion
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
