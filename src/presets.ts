export type DatePresetOptions = {
  since: string;
  week?: boolean;
  month?: boolean;
  now?: Date;
};

export function resolveSinceOption(options: DatePresetOptions): string {
  if (options.week && options.month) {
    throw new Error("Use either --week or --month, not both.");
  }

  if (options.week) {
    return formatDaysAgo(7);
  }

  if (options.month) {
    return formatDaysAgo(30);
  }

  return options.since;
}

function formatDaysAgo(days: number): string {
  return `${days} days ago`;
}
