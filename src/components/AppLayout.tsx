import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AppTopNav } from "./AppTopNav";
import { useWhiteLabelDefaults } from "@/hooks/useWhiteLabel";
import { MainNavList } from "@/components/sidebar/MainNavItems";
import { SidebarUserFooter } from "@/components/sidebar/SidebarUserFooter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarContextualNavProvider } from "@/components/layout/SidebarContextualNav";

function CloseMobileNavOnNavigate() {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();
  useEffect(() => {
    setOpenMobile(false);
  }, [location.pathname, setOpenMobile]);
  return null;
}

function SidebarMainNavSection() {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <MainNavList
      className="min-h-0 flex-1"
      onNavigate={isMobile ? () => setOpenMobile(false) : undefined}
    />
  );
}

function SidebarBrandedFooter() {
  return <SidebarUserFooter compact={false} />;
}

function SidebarBrandHeader() {
  const { companyName } = useWhiteLabelDefaults();
  return (
    <div className="px-4 py-3">
      <p className="truncate font-display text-sm font-bold uppercase tracking-wide text-sidebar-accent-foreground">
        {companyName}
      </p>
      <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-sidebar-muted">Command CRM</p>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <SidebarContextualNavProvider>
        <CloseMobileNavOnNavigate />
        <Sidebar collapsible="icon" mobileOnly>
          <SidebarHeader className="border-b border-sidebar-border p-0">
            <SidebarBrandHeader />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMainNavSection />
            <SidebarSeparator />
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border p-0">
            <SidebarBrandedFooter />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <AppTopNav />
          <div className="min-w-0 flex-1 overflow-x-hidden">
            <div className="p-4 sm:p-6 lg:p-8 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
          </div>
        </SidebarInset>
      </SidebarContextualNavProvider>
    </SidebarProvider>
  );
}
