import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { UserCircle, Settings, LogOut } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface UserMenuProps {
  email: string;
  isManager: boolean;
  onSignOut: () => void;
}

export function UserMenu({ email, isManager, onSignOut }: UserMenuProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-white hover:text-white hover:bg-white/20"
          aria-label={t('header.myAccount')}
        >
          <UserCircle className="h-5 w-5" />
          <span className="text-sm">{email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t('header.myAccount')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/account")}>
          <UserCircle className="mr-2 h-4 w-4" />
          {t('account.profile')}
        </DropdownMenuItem>
        {isManager && (
          <DropdownMenuItem onClick={() => navigate("/configuration")}>
            <Settings className="mr-2 h-4 w-4" />
            {t('configuration.title')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          {t('header.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
