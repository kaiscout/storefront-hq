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

export type AuditCoveragePage = {
  id: string;
  url: string;
  status_code?: number | null;
  page_title?: string | null;
  screenshot_url?: string | null;
  captured_at?: string | null;
  recorded_at: string;
  updated_at: string;
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

export function toAuditCoveragePages(rows: Record<string, unknown>[]) {
  return rows.map(
    (row): AuditCoveragePage => ({
      id: textValue(row.id),
      url: textValue(row.url),
      status_code: typeof row.status_code === 'number' ? row.status_code : null,
      page_title: typeof row.page_title === 'string' ? row.page_title : null,
      screenshot_url:
        typeof row.screenshot_url === 'string' ? row.screenshot_url : null,
      captured_at: typeof row.captured_at === 'string' ? row.captured_at : null,
      recorded_at: textValue(row.recorded_at),
      updated_at: textValue(row.updated_at),
    }),
  );
}

export function sortAuditCoveragePages<T extends AuditCoveragePage>(
  pages: T[],
) {
  return [...pages].sort((left, right) => left.url.localeCompare(right.url));
}

export function auditCoverageSummary(pages: AuditCoveragePage[]) {
  const summary = {
    total: pages.length,
    successful: 0,
    redirected: 0,
    clientError: 0,
    serverError: 0,
    unknown: 0,
    screenshots: 0,
  };
  for (const page of pages) {
    const status = page.status_code;
    if (status === null || status === undefined) summary.unknown += 1;
    else if (status >= 200 && status < 300) summary.successful += 1;
    else if (status >= 300 && status < 400) summary.redirected += 1;
    else if (status >= 400 && status < 500) summary.clientError += 1;
    else if (status >= 500) summary.serverError += 1;
    else summary.unknown += 1;
    if (page.screenshot_url) summary.screenshots += 1;
  }
  return summary;
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

// Human-entered action notes stay in the existing recommendation field so old
// evidence packs remain readable without a data migration or inferred facts.
export function findingActionBrief(finding: EvidenceFinding) {
  const sections = new Map<string, string[]>();
  let current = '';
  for (const line of finding.recommendation?.split('\n') ?? []) {
    const match = /^(Fix|Why it matters|Suggested owner|Effort|Retest):\s*(.*)$/i.exec(line);
    if (match) {
      current = match[1].toLowerCase();
      sections.set(current, [match[2]]);
    } else if (current) sections.get(current)?.push(line);
  }
  const note = (label: string) => sections.get(label.toLowerCase())?.join('\n').trim() || null;
  return {
    fix: note('Fix') || finding.recommendation || 'Recommendation not recorded.',
    impact: note('Why it matters') || 'Customer impact has not been assessed. Do not infer lost sales from this finding.',
    owner: note('Suggested owner') || 'Assign with the merchant / implementation team.',
    effort: note('Effort') || 'Not estimated — confirm with the implementer.',
    retest: note('Retest') || 'Acceptance check not yet recorded; repeat the captured steps after the proposed change.',
  };
}

export function topThreeFixes(findings: EvidenceFinding[]) {
  const seen = new Set<string>();
  return sortEvidenceFindings(findings).filter((finding) => {
    const key = `${finding.url.trim()}|${finding.title.trim().toLowerCase()}`;
    if (!finding.url.trim() || !finding.title.trim() || !finding.evidence.trim() ||
      !finding.recommendation?.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3).map((finding, index) => ({
    rank: index + 1,
    finding,
    ...findingActionBrief(finding),
  }));
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
  auditCoverage?: AuditCoveragePage[];
}) {
  const findingRows = [
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
  const priorityRows = [
    ['TOP THREE FIXES — START HERE'],
    ['Rank', 'Finding', 'Affected URL', 'Observed evidence', 'Fix', 'Why it matters (assessment)', 'Suggested owner', 'Effort', 'Acceptance check'],
    ...topThreeFixes(input.findings).map((item) => [
      item.rank, item.finding.title, item.finding.url, item.finding.evidence,
      item.fix, item.impact, item.owner, item.effort, item.retest,
    ]),
    ['Priority basis', 'Recorded severity, then URL/title. Not predicted revenue. Human review required.'],
    [],
    ['FULL FINDINGS'],
  ];
  const coverageRows = input.auditCoverage?.length
    ? [
        [],
        [],
        ['AUDIT COVERAGE APPENDIX'],
        [
          'Audited URL',
          'HTTP status',
          'Page title',
          'Screenshot',
          'Firecrawl capture/cache time',
          'Recorded at',
        ],
        ...sortAuditCoveragePages(input.auditCoverage).map((page) => [
          page.url,
          page.status_code,
          page.page_title,
          page.screenshot_url,
          page.captured_at,
          page.recorded_at,
        ]),
      ]
    : [];
  return [...metadata, ...priorityRows, ...findingRows, ...coverageRows]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');
}
