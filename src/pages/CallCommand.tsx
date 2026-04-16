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
import {
  ContextualTabsPortal,
  contextualTabListClassName,
  contextualTabListSidebarClassName,
  contextualTabTriggerClassName,
  contextualTabTriggerSidebarClassName,
} from "@/components/layout/contextualTabNav";

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
            <ContextualTabsPortal>
              <TabsList className={contextualTabListSidebarClassName()}>
                <TabsTrigger value="my-calls" className={contextualTabTriggerSidebarClassName()}>
                  My Call List
                </TabsTrigger>
                {canAdmin && (
                  <TabsTrigger value="master-leads" className={contextualTabTriggerSidebarClassName()}>
                    Master Leads
                  </TabsTrigger>
                )}
                {canAdmin && (
                  <TabsTrigger value="segments" className={contextualTabTriggerSidebarClassName()}>
                    Segments
                  </TabsTrigger>
                )}
                <TabsTrigger value="performance" className={contextualTabTriggerSidebarClassName()}>
                  Performance
                </TabsTrigger>
              </TabsList>
            </ContextualTabsPortal>
            <TabsList className={contextualTabListClassName("md:hidden")}>
              <TabsTrigger value="my-calls" className={contextualTabTriggerClassName()}>
                My Call List
              </TabsTrigger>
              {canAdmin && (
                <TabsTrigger value="master-leads" className={contextualTabTriggerClassName()}>
                  Master Leads
                </TabsTrigger>
              )}
              {canAdmin && (
                <TabsTrigger value="segments" className={contextualTabTriggerClassName()}>
                  Segments
                </TabsTrigger>
              )}
              <TabsTrigger value="performance" className={contextualTabTriggerClassName()}>
                Performance
              </TabsTrigger>
            </TabsList>
            <div className="min-w-0 flex-1 mt-4 md:mt-6">
            <TabsContent value="my-calls" className="mt-0">
              <MyCallList />
            </TabsContent>
            {canAdmin && (
              <TabsContent value="master-leads" className="mt-0">
                <MasterLeadsGrid />
              </TabsContent>
            )}
            {canAdmin && (
              <TabsContent value="segments" className="mt-0">
                <SegmentsTab />
              </TabsContent>
            )}
            <TabsContent value="performance" className="mt-0">
              <SetterPerformanceTab />
            </TabsContent>
            </div>
          </Tabs>
        </div>
      </PageWrapper>
    </AppLayout>
  );
}
