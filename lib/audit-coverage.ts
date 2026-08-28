export const auditPageUpsertSql = `INSERT INTO audit_pages (
  id, lead_id, url, status_code, page_title, screenshot_url, captured_at
) VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(lead_id, url) DO UPDATE SET
  status_code = COALESCE(excluded.status_code, audit_pages.status_code),
  page_title = COALESCE(NULLIF(excluded.page_title, ''), audit_pages.page_title),
  screenshot_url = COALESCE(excluded.screenshot_url, audit_pages.screenshot_url),
  captured_at = COALESCE(excluded.captured_at, audit_pages.captured_at),
  updated_at = datetime('now')`;
