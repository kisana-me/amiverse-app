import { CurrentAccountStatus } from "@/providers/CurrentAccountProvider";

export function runSignedInAction(
  currentAccountStatus: CurrentAccountStatus,
  openSignInModal: () => void,
  action: () => void,
) {
  if (currentAccountStatus !== "signed_in") {
    openSignInModal();
    return;
  }

  action();
}
