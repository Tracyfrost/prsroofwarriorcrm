import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useWhiteLabelDefaults } from "@/hooks/useWhiteLabel";

const DEFAULT_PHRASES: Record<string, string> = {
  submit: "Claim Victory!",
  create_job: "Forge the Mission!",
  create_customer: "Recruit Ally!",
  assign: "Deploy Team!",
  save: "Secure the Intel!",
  delete: "Eliminate Target!",
  edit: "Modify Orders!",
  add_sub_job: "Spawn Sub-Mission!",
  login: "Enter the War Room!",
  signup: "Forge Your Empire!",
  add_appointment: "Schedule Deployment!",
  add_commission: "Claim War Spoils!",
  search: "Scan the Battlefield!",
  export: "Extract Intel!",
  upload: "Deploy Asset!",
  // Nav
  nav_dashboard: "Go to Command Center dashboard",
  nav_customers: "View and manage customers",
  nav_jobs: "View and manage jobs (Operations)",
  nav_jobs_only: "Jobs list view only",
  nav_financials: "View main financials",
  nav_production: "View production board and items",
  nav_appointments: "View and manage appointments",
  nav_commissions: "View commissions",
  nav_reports: "View reports",
  nav_inventory: "View inventory (Arsenal)",
  nav_sitecam: "View SiteCam media",
  nav_battle_ledger: "View Battle Ledger",
  nav_lead_arsenal: "Lead packages and distribution",
  nav_call_command: "Call setter and lead lists",
  nav_manager: "Officer / Manager hub",
  nav_settings: "App and team settings",
  close_sidebar: "Close menu",
  open_menu: "Open menu",
  sign_out: "Sign out of your account",
  // Job detail
  back_to_jobs: "Return to jobs list",
  back_to_main_job: "Return to parent main job",
  forge_trades: "Edit trade types for this job",
  add_sub_job_btn: "Create a sub job under this main job",
  delete_job: "Soft-delete this job (removes from listings)",
  main_job_chip: "View main job",
  sub_job_chip: "Switch to this sub job",
  view_job: "Open this job",
  // Jobs page
  new_job: "Create a new job",
  view_board: "Show jobs as board (columns by status)",
  view_table: "Show jobs as table",
  // Customer
  add_job_btn: "Create a new job for this customer",
  edit_customer: "Edit customer details",
  // Production
  export_csv: "Download production list as CSV",
  view_board_production: "Board view",
  view_list_production: "List view",
  // Generic
  cancel: "Cancel",
  optional: "Optional field",
  required: "Required",
  initial_status: "Starting status for the new job",
  notes_field: "Optional notes for this job",
  claim_number_field: "Insurance claim number (main jobs only)",
};

interface BattleTooltipProps {
  /** Key matching a phrase in the tooltip config */
  phraseKey: string;
  /** Fallback if key not found */
  fallback?: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

export function BattleTooltip({ phraseKey, fallback, children, side = "top" }: BattleTooltipProps) {
  const { tooltipPhrases } = useWhiteLabelDefaults();
  const phrase = tooltipPhrases?.[phraseKey] || fallback || DEFAULT_PHRASES[phraseKey] || "Execute!";

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          className="border-accent/30 bg-popover font-display text-xs uppercase tracking-wider"
        >
          ⚔ {phrase}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { DEFAULT_PHRASES };
