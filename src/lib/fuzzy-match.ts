export interface FuzzyMatch {
  indexes: number[];
  score: number;
}

export function fuzzyMatch(text: string, query: string): FuzzyMatch | null {
  const haystack = text.toLocaleLowerCase();
  const needle = query.toLocaleLowerCase().replace(/\s+/g, "");
  if (!needle) return { indexes: [], score: 0 };

  const indexes: number[] = [];
  let cursor = 0;
  let score = 0;

  for (const character of needle) {
    const index = haystack.indexOf(character, cursor);
    if (index === -1) return null;

    const previous = indexes.at(-1);
    score += previous === undefined ? index : index - previous - 1;
    indexes.push(index);
    cursor = index + 1;
  }

  return { indexes, score };
}

export function fuzzyScore(text: string, query: string): number | null {
  return fuzzyMatch(text, query)?.score ?? null;
}
