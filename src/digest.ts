import type { RepositoryActivity } from "./git.js";
import type { CommitSummary } from "./parser.js";

export type DigestCommit = CommitSummary & {
  repo?: string;
};

export type CountItem = {
  name: string;
  count: number;
};

export type ActivityDigest = {
  totalCommits: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  commitsByAuthor: CountItem[];
  commitsByRepo: CountItem[];
  mostActiveDay: CountItem | null;
  recentHighlights: string[];
};

export type BuildDigestOptions = {
  today?: string;
};

export function buildDigest(
  commits: DigestCommit[],
  options: BuildDigestOptions = {},
): ActivityDigest {
  const dates = [...new Set(commits.map((commit) => commit.date))].sort();

  return {
    totalCommits: commits.length,
    activeDays: dates.length,
    currentStreak: calculateCurrentStreak(dates, options.today ?? getTodayDate()),
    longestStreak: calculateLongestStreak(dates),
    commitsByAuthor: countBy(commits, (commit) => commit.author),
    commitsByRepo: countBy(
      commits.filter((commit) => commit.repo),
      (commit) => commit.repo ?? "",
    ),
    mostActiveDay: getMostActiveWeekday(commits),
    recentHighlights: getRecentHighlights(commits),
  };
}

export function buildDigestFromActivity(
  activity: RepositoryActivity[],
  options: BuildDigestOptions = {},
): ActivityDigest {
  return buildDigest(
    activity.flatMap((repo) =>
      repo.commits.map((commit) => ({
        ...commit,
        repo: repo.name,
      })),
    ),
    options,
  );
}

function calculateCurrentStreak(sortedDates: string[], today: string): number {
  if (sortedDates.length === 0) {
    return 0;
  }

  const dateSet = new Set(sortedDates);

  if (!dateSet.has(today)) {
    return 0;
  }

  const descendingDates = [...sortedDates].reverse();
  let streak = 1;

  for (let index = 1; index < descendingDates.length; index += 1) {
    if (daysBetween(descendingDates[index], descendingDates[index - 1]) !== 1) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function calculateLongestStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) {
    return 0;
  }

  let current = 1;
  let longest = 1;

  for (let index = 1; index < sortedDates.length; index += 1) {
    if (daysBetween(sortedDates[index - 1], sortedDates[index]) === 1) {
      current += 1;
    } else {
      current = 1;
    }

    longest = Math.max(longest, current);
  }

  return longest;
}

function countBy<T>(items: T[], getName: (item: T) => string): CountItem[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    const name = getName(item);

    if (!name) {
      continue;
    }

    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function getMostActiveWeekday(commits: DigestCommit[]): CountItem | null {
  const [mostActiveDay] = countBy(commits, (commit) => getWeekdayName(commit.date));
  return mostActiveDay ?? null;
}

function getRecentHighlights(commits: DigestCommit[]): string[] {
  const highlights: string[] = [];
  const seen = new Set<string>();

  for (const commit of commits) {
    const subject = commit.repo ? `[${commit.repo}] ${commit.subject}` : commit.subject;

    if (seen.has(subject)) {
      continue;
    }

    highlights.push(subject);
    seen.add(subject);

    if (highlights.length === 5) {
      break;
    }
  }

  return highlights;
}

function daysBetween(startDate: string, endDate: string): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parseDate(endDate).getTime() - parseDate(startDate).getTime()) / millisecondsPerDay);
}

function getWeekdayName(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(parseDate(date));
}

function parseDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

function getTodayDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
