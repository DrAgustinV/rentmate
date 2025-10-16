import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { commentSchema } from "@/lib/validations";
import { z } from "zod";

interface CommentInputProps {
  ticketId: string;
  isManager: boolean;
}

export const CommentInput = ({ ticketId, isManager }: CommentInputProps) => {
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const queryClient = useQueryClient();

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

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-4 border-t">
      <Textarea
        placeholder="Add a comment..."
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
        <Button
          type="submit"
          size="sm"
          disabled={!comment.trim() || addCommentMutation.isPending}
          className="ml-auto"
        >
          <Send className="h-4 w-4 mr-2" />
          {addCommentMutation.isPending ? "Sending..." : "Send"}
        </Button>
      </div>
    </form>
  );
};
