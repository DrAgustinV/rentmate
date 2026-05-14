import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/dateUtils";

interface Comment {
  id: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

interface CommentsListProps {
  comments: Comment[];
}

export const CommentsList = ({ comments }: CommentsListProps) => {
  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No comments yet. Start the conversation!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => {
        const initials = `${comment.profiles.first_name?.[0] || ""}${comment.profiles.last_name?.[0] || ""}`.toUpperCase() || comment.profiles.email?.[0]?.toUpperCase() || '?';
        
        return (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {comment.profiles.first_name} {comment.profiles.last_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(comment.created_at)}
                </span>
                {comment.is_internal && (
                  <Badge variant="secondary" className="text-xs">Internal</Badge>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap text-foreground">{comment.comment}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
