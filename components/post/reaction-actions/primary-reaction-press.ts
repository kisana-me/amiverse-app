export type OpenEmojiMenu = (open: boolean) => void;

export function handlePrimaryReactionPress(openEmojiMenu: OpenEmojiMenu) {
  openEmojiMenu(true);
}
