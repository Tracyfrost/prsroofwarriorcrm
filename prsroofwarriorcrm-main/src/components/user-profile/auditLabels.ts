export function formatAuditActionLabel(action: string, entityType: string, details: unknown): string {
  const d = details as Record<string, unknown> | null;
  switch (action) {
    case "user_created":
      return "User account created";
    case "profile_updated":
      return `Profile updated${Array.isArray(d?.updated_fields) ? ` (${(d.updated_fields as string[]).join(", ")})` : ""}`;
    case "role_change":
      return `Role set to ${String(d?.role ?? "").replace(/_/g, " ")}`;
    case "hierarchy_update":
      return "Hierarchy / commission updated";
    case "verify_user":
      return "Marked verified";
    case "unverify_user":
      return "Verification removed";
    case "activate_user":
      return "Account activated";
    case "deactivate_user":
      return "Account deactivated";
    case "toggle_must_change_password":
      return "Must-change password flag updated";
    case "edit_user_contact":
      return "Contact info updated";
    case "soft_delete_user":
      return "Account deactivated (deleted)";
    case "create-user":
      return "User created (admin)";
    case "reset-user-password":
      return "Password reset";
    default:
      break;
  }
  if (action === "edit_user_contact" && d?.email) {
    return "Updated contact info";
  }
  if (action === "soft_delete_user") {
    return "Account deactivated";
  }
  return `${action.replace(/_/g, " ")} (${entityType})`;
}
