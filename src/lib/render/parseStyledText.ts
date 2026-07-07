import type { StyledTextRun } from "./types";

const markerPattern = /(\*_([^*_]+)_\*|_\*([^*_]+)\*_|\*([^*]+)\*|_([^_]+)_)/g;

export function parseStyledText(input: string): StyledTextRun[] {
  if (!input.trim()) return [];
  const runs: StyledTextRun[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = markerPattern.exec(input)) !== null) {
    if (match.index > lastIndex) runs.push({ text: input.slice(lastIndex, match.index) });
    if (match[2] || match[3]) runs.push({ text: match[2] ?? match[3], accent: true, italic: true });
    else if (match[4]) runs.push({ text: match[4], accent: true });
    else if (match[5]) runs.push({ text: match[5], italic: true });
    lastIndex = markerPattern.lastIndex;
  }
  if (lastIndex < input.length) runs.push({ text: input.slice(lastIndex) });
  return mergeAdjacentRuns(runs).filter((run) => run.text.length > 0);
}

function mergeAdjacentRuns(runs: StyledTextRun[]): StyledTextRun[] {
  return runs.reduce<StyledTextRun[]>((acc, run) => {
    const prev = acc.at(-1);
    if (prev && Boolean(prev.accent) === Boolean(run.accent) && Boolean(prev.italic) === Boolean(run.italic)) prev.text += run.text;
    else acc.push({ ...run });
    return acc;
  }, []);
}
