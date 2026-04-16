import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Archive, ArchiveRestore, Hammer, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";

export type JobHeaderActionsMenuProps = {
  /** Shown before the menu trigger (e.g. trade badges on desktop). */
  leading?: ReactNode;
  isMainJob: boolean;
  isArchived: boolean;
  canEditJob: boolean;
  canDeleteJob: boolean;
  unarchivePending?: boolean;
  onEditJob: () => void;
  onForgeTrades: () => void;
  onAddSubJob: () => void;
  onArchive: () => void;
  onUnarchive: () => void | Promise<void>;
  onDelete: () => void;
};

export function JobHeaderActionsMenu({
  leading,
  isMainJob,
  isArchived,
  canEditJob,
  canDeleteJob,
  unarchivePending = false,
  onEditJob,
  onForgeTrades,
  onAddSubJob,
  onArchive,
  onUnarchive,
  onDelete,
}: JobHeaderActionsMenuProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      {leading}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Job actions" type="button">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={onEditJob}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Job
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onForgeTrades}>
            <Hammer className="mr-2 h-4 w-4" />
            Forge Trades
          </DropdownMenuItem>
          {isMainJob && (
            <DropdownMenuItem onSelect={onAddSubJob}>
              <Plus className="mr-2 h-4 w-4" />
              Add Sub Job
            </DropdownMenuItem>
          )}
          {canEditJob && !isArchived && (
            <DropdownMenuItem onSelect={onArchive}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          )}
          {canEditJob && isArchived && (
            <DropdownMenuItem disabled={unarchivePending} onSelect={() => void onUnarchive()}>
              <ArchiveRestore className="mr-2 h-4 w-4" />
              Unarchive
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {canDeleteJob ? (
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled title="Only owners and executive admins can delete jobs.">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
