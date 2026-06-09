import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/dateUtils";
import { EmptyState } from "@/components/EmptyState";
import { MessageSquare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  if (comments.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title={t("tickets.commentsEmpty")}
        size="compact"
      />
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
