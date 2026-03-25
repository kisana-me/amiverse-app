import { CurrentAccountStatus } from "@/providers/CurrentAccountProvider";

export function runSignedInAction(
  currentAccountStatus: CurrentAccountStatus,
  openSignInModal: (open: boolean) => void,
  action: () => void,
) {
  if (currentAccountStatus !== "signed_in") {
    openSignInModal(true);
    return;
  }

  action();
}
