export type CommitSummary = {
  hash: string;
  author: string;
  date: string;
  subject: string;
};

export function parseCommitLine(line: string): CommitSummary | null {
  const [hash, author, date, ...subjectParts] = line.split("\t");
  const subject = subjectParts.join("\t");

  if (!hash || !author || !date || !subject) {
    return null;
  }

  return { hash, author, date, subject };
}

export function parseGitLog(output: string): CommitSummary[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCommitLine)
    .filter((commit): commit is CommitSummary => commit !== null);
}
