/** Score a row as a likely header (labels) vs data. Higher = more header-like. */
export function scoreHeaderRow(cells: string[]): number {
  const values = cells.map((c) => String(c ?? '').trim());
  const nonEmpty = values.filter(Boolean);
  if (nonEmpty.length < 2) return -1;

  let score = nonEmpty.length * 2;
  for (const v of nonEmpty) {
    // Headers are usually short labels, not long prose or pure numbers.
    if (/^-?\d+(\.\d+)?$/.test(v) || /^[\d,.₹$€£¥%]+$/.test(v)) score -= 3;
    else if (/^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(v)) {
      score -= 2;
    } else if (v.length <= 40) score += 2;
    else score -= 1;
  }

  const unique = new Set(nonEmpty.map((v) => v.toLowerCase()));
  if (unique.size === nonEmpty.length) score += 2;
  return score;
}

/**
 * Pick the best header row among the first `lookAhead` rows (1-based index).
 * Prefers a label-like row that is followed by at least one non-empty data row.
 */
export function detectHeaderRowIndex(
  rows: string[][],
  lookAhead = 4,
): { headerRow: number; headers: string[]; confidence: 'high' | 'medium' | 'low' } {
  const limit = Math.min(lookAhead, rows.length);
  let bestIdx = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < limit; i++) {
    const row = (rows[i] ?? []).map(String);
    let score = scoreHeaderRow(row);
    const next = rows[i + 1];
    if (next && next.some((c) => String(c ?? '').trim())) score += 3;
    // Prefer earlier rows when tied.
    score -= i * 0.1;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  const headers = (rows[bestIdx] ?? []).map(String);
  const confidence =
    bestScore >= 10 ? 'high' : bestScore >= 4 ? 'medium' : 'low';

  return {
    headerRow: bestIdx + 1, // 1-based for Sheets
    headers,
    confidence,
  };
}
