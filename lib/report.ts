export type EvidenceFinding = {
  id: string;
  url: string;
  referring_url?: string | null;
  title: string;
  severity: string;
  category: string;
  evidence: string;
  recommendation?: string | null;
  screenshot_url?: string | null;
  status_code?: number | null;
  found_at: string;
};

function textValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function toEvidenceFindings(rows: Record<string, unknown>[]) {
  return rows.map(
    (row): EvidenceFinding => ({
      id: textValue(row.id),
      url: textValue(row.url),
      referring_url:
        typeof row.referring_url === 'string' ? row.referring_url : null,
      title: textValue(row.title),
      severity: textValue(row.severity),
      category: textValue(row.category),
      evidence: textValue(row.evidence),
      recommendation:
        typeof row.recommendation === 'string' ? row.recommendation : null,
      screenshot_url:
        typeof row.screenshot_url === 'string' ? row.screenshot_url : null,
      status_code: typeof row.status_code === 'number' ? row.status_code : null,
      found_at: textValue(row.found_at),
    }),
  );
}

const severityOrder = new Map([
  ['critical', 0],
  ['high', 1],
  ['medium', 2],
  ['low', 3],
]);

export function sortEvidenceFindings<T extends EvidenceFinding>(findings: T[]) {
  return [...findings].sort((left, right) => {
    const severity =
      (severityOrder.get(left.severity.toLowerCase()) ?? 9) -
      (severityOrder.get(right.severity.toLowerCase()) ?? 9);
    if (severity) return severity;
    return (
      left.url.localeCompare(right.url) || left.title.localeCompare(right.title)
    );
  });
}

export function evidenceSummary(findings: EvidenceFinding[]) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, other: 0 };
  for (const finding of findings) {
    const severity = finding.severity.toLowerCase();
    if (severity in counts) counts[severity as keyof typeof counts] += 1;
    else counts.other += 1;
  }
  return counts;
}

export function isEvidencePackReady(
  findings: EvidenceFinding[],
  requiredFindings: number,
) {
  const complete = findings.filter(
    (finding) =>
      finding.url.trim() &&
      finding.title.trim() &&
      finding.evidence.trim() &&
      finding.recommendation?.trim(),
  );
  return {
    ready: complete.length >= requiredFindings,
    complete: complete.length,
    required: requiredFindings,
    missing: Math.max(0, requiredFindings - complete.length),
  };
}

function csvCell(value: string | number | null | undefined) {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function evidencePackCsv(input: {
  companyName: string;
  storeUrl?: string | null;
  findings: EvidenceFinding[];
}) {
  const rows = [
    [
      'Priority',
      'Severity',
      'Category',
      'Finding',
      'Affected URL',
      'Referring URL',
      'HTTP status',
      'Evidence',
      'Recommendation',
      'Screenshot',
      'Observed at',
    ],
    ...sortEvidenceFindings(input.findings).map((finding, index) => [
      index + 1,
      finding.severity,
      finding.category,
      finding.title,
      finding.url,
      finding.referring_url,
      finding.status_code,
      finding.evidence,
      finding.recommendation,
      finding.screenshot_url,
      finding.found_at,
    ]),
  ];
  const metadata = [
    ['Storefront', input.companyName],
    ['Store URL', input.storeUrl ?? ''],
    ['Generated at', new Date().toISOString()],
    [],
  ];
  return [...metadata, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');
}
