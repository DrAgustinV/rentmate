import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateTicketDialog } from "@/components/CreateTicketDialog";
import { TicketsList } from "@/components/TicketsList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const Tickets = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          properties (id, title),
          profiles!tickets_created_by_fkey (id, first_name, last_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('tickets.title')}</h1>
          <p className="text-muted-foreground">{t('tickets.description')}</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('tickets.newTicket')}
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="all">{t('tickets.all')}</TabsTrigger>
          <TabsTrigger value="open">{t('tickets.open')}</TabsTrigger>
          <TabsTrigger value="in_progress">{t('tickets.inProgress')}</TabsTrigger>
          <TabsTrigger value="resolved">{t('tickets.resolved')}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <TicketsList tickets={tickets || []} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="open" className="mt-6">
          <TicketsList
            tickets={tickets?.filter((t) => t.status === "open") || []}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="in_progress" className="mt-6">
          <TicketsList
            tickets={tickets?.filter((t) => t.status === "in_progress") || []}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="resolved" className="mt-6">
          <TicketsList
            tickets={tickets?.filter((t) => t.status === "resolved") || []}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
};

export default Tickets;