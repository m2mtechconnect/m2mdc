import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, X, Star } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface CustomQuestionsManagerProps {
  agentId: string;
}

export function CustomQuestionsManager({ agentId }: CustomQuestionsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const queryClient = useQueryClient();

  // Fetch custom questions
  const { data: customQuestions = [] } = useQuery({
    queryKey: ['custom-questions', agentId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('agent_custom_questions')
        .select('*')
        .eq('user_id', user.id)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Add custom question mutation
  const addQuestionMutation = useMutation({
    mutationFn: async (questionText: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('agent_custom_questions')
        .insert({
          user_id: user.id,
          agent_id: agentId,
          question_text: questionText,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-questions', agentId] });
      setNewQuestion("");
      toast.success("Question saved!");
    },
    onError: (error) => {
      toast.error(`Failed to save question: ${error.message}`);
    },
  });

  // Delete custom question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase
        .from('agent_custom_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-questions', agentId] });
      toast.success("Question removed!");
    },
    onError: (error) => {
      toast.error(`Failed to remove question: ${error.message}`);
    },
  });

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) {
      toast.error("Please enter a question");
      return;
    }
    addQuestionMutation.mutate(newQuestion.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Star className="h-4 w-4" />
          Manage Quick Actions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Custom Quick Actions</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Add new question */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Add a new quick action question:</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter your question..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddQuestion();
                  }
                }}
                maxLength={200}
              />
              <Button 
                onClick={handleAddQuestion}
                disabled={addQuestionMutation.isPending}
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* List of custom questions */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Your saved questions ({customQuestions.length})</p>
            {customQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No custom questions yet. Add one above!
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {customQuestions.map((q: any) => (
                  <div
                    key={q.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 group hover:bg-muted"
                  >
                    <p className="flex-1 text-sm truncate">{q.question_text}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => deleteQuestionMutation.mutate(q.id)}
                      disabled={deleteQuestionMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}