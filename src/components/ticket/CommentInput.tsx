import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { commentSchema } from "@/lib/validations";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";

interface TicketContext {
  title: string;
  type: string;
  priority: string;
  description: string;
  recentComments?: Array<{ comment: string }>;
}

interface CommentInputProps {
  ticketId: string;
  isManager: boolean;
  ticketContext?: TicketContext;
}

export const CommentInput = ({ ticketId, isManager, ticketContext }: CommentInputProps) => {
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const queryClient = useQueryClient();

  const handleGenerateResponse = async () => {
    if (!ticketContext) {
      toast.error(t('ai.noTicketContext'));
      return;
    }
    
    setGeneratingResponse(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'comment_response',
          data: {
            ticketTitle: ticketContext.title,
            ticketType: ticketContext.type,
            ticketPriority: ticketContext.priority,
            ticketDescription: ticketContext.description,
            recentComments: ticketContext.recentComments?.slice(-5)
          }
        }
      });
      
      if (error) throw error;
      if (data?.text) {
        setComment(data.text);
        toast.success(t('ai.responseGenerated'));
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error(t('ai.generationError'));
    } finally {
      setGeneratingResponse(false);
    }
  };

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("ticket_comments")
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          comment: comment.trim(),
          is_internal: isInternal,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-comments", ticketId] });
      setComment("");
      setIsInternal(false);
    },
    onError: (error: any) => {
      toast.error("Error", {
        description: "Failed to add comment. Please try again.",
      });
      console.error("Error adding comment:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      commentSchema.parse({ comment, isInternal });
      addCommentMutation.mutate();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error("Validation Error", {
          description: error.errors[0].message,
        });
      }
    }
  };

  const { t } = useLanguage();

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-4 border-t">
      <Textarea
        placeholder={t('placeholders.addComment')}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="min-h-[80px] resize-none"
      />
      <div className="flex items-center justify-between">
        {isManager && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="internal"
              checked={isInternal}
              onCheckedChange={(checked) => setIsInternal(checked as boolean)}
            />
            <Label htmlFor="internal" className="text-sm text-muted-foreground cursor-pointer">
              Internal note (only visible to managers)
            </Label>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {isManager && ticketContext && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateResponse}
              disabled={generatingResponse}
            >
              {generatingResponse ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {t('ai.draft')}
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={!comment.trim() || addCommentMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            {addCommentMutation.isPending ? t('common.loading') : t('tickets.send')}
          </Button>
        </div>
      </div>
    </form>
  );
};
