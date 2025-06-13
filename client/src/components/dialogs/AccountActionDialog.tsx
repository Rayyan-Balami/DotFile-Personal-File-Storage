import {
  useBulkPermanentDeleteUsers,
  useBulkRestoreUsers,
  useBulkSoftDeleteUsers,
} from "@/api/user/user.query";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useDialogStore } from "@/stores/useDialogStore";
import { getErrorMessage } from "@/utils/apiErrorHandler";
import { toast } from "sonner";

export type AccountActionType = "soft-delete" | "restore" | "permanent-delete";

const actionConfigs = {
  "soft-delete": {
    confirmText: "Soft Delete",
    confirmVariant: "default" as const,
    confirmClass: "bg-yellow-600 hover:bg-yellow-700 text-white",
    getDescription: (name: string, email: string, label: string) =>
      `Are you sure you want to soft delete this ${label.toLowerCase()} (${name} - ${email})? They can be restored later.`,
  },
  restore: {
    confirmText: "Restore",
    confirmVariant: "default" as const,
    confirmClass: "bg-green-600 hover:bg-green-700 text-white",
    getDescription: (name: string, email: string, label: string) =>
      `Are you sure you want to restore this ${label.toLowerCase()} (${name} - ${email})? They will be moved back to active status.`,
  },
  "permanent-delete": {
    confirmText: "Delete Permanently",
    confirmVariant: "destructive" as const,
    confirmClass: "",
    getDescription: (name: string, email: string, label: string) =>
      `Are you sure you want to permanently delete this ${label.toLowerCase()} (${name} - ${email})? This action cannot be undone and will remove all their data.`,
  },
};

export function AccountActionDialog() {
  const {
    accountActionDialogOpen,
    accountActionAccount: account,
    accountActionType: actionType,
    accountActionAccountType: accountType,
    closeAccountActionDialog,
  } = useDialogStore();

  const softDelete = useBulkSoftDeleteUsers();
  const restore = useBulkRestoreUsers();
  const permanentDelete = useBulkPermanentDeleteUsers();

  if (!account) return null;

  const label = accountType === "admin" ? "Admin" : "User";
  const config = actionConfigs[actionType];

  const handleAction = async () => {
    try {
      const mutation =
        actionType === "soft-delete"
          ? softDelete
          : actionType === "restore"
            ? restore
            : permanentDelete;

      const result = await mutation.mutateAsync([account.id]);
      const { summary } = result.data;

      const pastTense =
        actionType === "soft-delete"
          ? "soft deleted"
          : actionType === "restore"
            ? "restored"
            : "permanently deleted";

      const verb = pastTense.split(" ")[0];

      if (summary.successful > 0) {
        toast.success(`${label} ${pastTense} successfully`);
      } else {
        toast.error(`Failed to ${verb} ${label.toLowerCase()}`);
      }

      closeAccountActionDialog();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const isPending =
    softDelete.isPending || restore.isPending || permanentDelete.isPending;

  return (
    <ResponsiveDialog
      open={accountActionDialogOpen}
      onOpenChange={closeAccountActionDialog}
      title={`${config.confirmText} ${label}`}
      description={config.getDescription(account.name, account.email, label)}
      contentClassName="max-h-[80svh] max-md:-mt-8.5 gap-0"
      headerClassName={`p-6 max-md:pt-8 pb-4 md:p-8 md:pb-6 border-b bg-muted ${
        actionType === "permanent-delete" ? "*:text-destructive" : ""
      }`}
      bodyClassName="p-6 md:p-8 gap-8"
    >
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={closeAccountActionDialog}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant={config.confirmVariant}
          className={config.confirmClass}
          onClick={handleAction}
          loading={isPending}
          disabled={isPending}
        >
          {config.confirmText}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
