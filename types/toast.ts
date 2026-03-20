export type ToastType = {
  message: string;
  detail?: string;
  status: "show" | "hide";
  date: number;
  /** Total lifetime in ms (excluding any paused time) */
  durationMs: number;
  /** Remaining lifetime in ms (excluding any paused time) */
  remainingMs: number;
  /** Whether countdown is currently paused (hover/touch) */
  paused: boolean;
};
