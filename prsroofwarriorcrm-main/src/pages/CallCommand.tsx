// MOBILE-PORT-READY – maps 1:1 to React Native
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageWrapper } from "@/components/PageWrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/usePermissions";
import { MyCallList } from "@/components/callsetter/MyCallList";
import { MasterLeadsGrid } from "@/components/callsetter/MasterLeadsGrid";
import { SegmentsTab } from "@/components/callsetter/SegmentsTab";
import { SetterPerformanceTab } from "@/components/callsetter/SetterPerformanceTab";

export default function CallCommand() {
  const [tab, setTab] = useState("my-calls");
  const { isOwnerOrAdmin, isManager } = usePermissions();
  const canAdmin = isOwnerOrAdmin || isManager;

  return (
    <AppLayout>
      <PageWrapper>
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-foreground">⚔️ Call Command</h1>
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full flex flex-wrap gap-1">
              <TabsTrigger value="my-calls" className="min-h-[44px]">My Call List</TabsTrigger>
              {canAdmin && <TabsTrigger value="master-leads" className="min-h-[44px]">Master Leads</TabsTrigger>}
              {canAdmin && <TabsTrigger value="segments" className="min-h-[44px]">Segments</TabsTrigger>}
              <TabsTrigger value="performance" className="min-h-[44px]">Performance</TabsTrigger>
            </TabsList>
            <TabsContent value="my-calls"><MyCallList /></TabsContent>
            {canAdmin && <TabsContent value="master-leads"><MasterLeadsGrid /></TabsContent>}
            {canAdmin && <TabsContent value="segments"><SegmentsTab /></TabsContent>}
            <TabsContent value="performance"><SetterPerformanceTab /></TabsContent>
          </Tabs>
        </div>
      </PageWrapper>
    </AppLayout>
  );
}
