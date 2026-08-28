// Complaint text is stored as blocks separated by blank lines, each starting with
// "Service: Issue" (optionally followed by "Describe: ..."), e.g. from the Job Card
// wizard's Service/Complaint Type step. This groups those issues by service so they
// can be displayed as "Service: Issue A, Issue B" instead of repeating the service name.
export type GroupedComplaint = { service: string; issues: string[] };

export function groupComplaintByService(complaint: string | null | undefined): GroupedComplaint[] {
  if (!complaint) return [];

  const groups: GroupedComplaint[] = [];
  const blocks = complaint.split(/\n\n+/);

  for (const block of blocks) {
    const firstLine = block.split("\n")[0]?.trim();
    if (!firstLine) continue;

    const match = firstLine.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;

    const [, service, issue] = match;
    if (service.trim() === "Common Description" || !issue.trim()) continue;

    const existing = groups.find((g) => g.service === service.trim());
    if (existing) {
      existing.issues.push(issue.trim());
    } else {
      groups.push({ service: service.trim(), issues: [issue.trim()] });
    }
  }

  return groups;
}

export function formatGroupedComplaint(complaint: string | null | undefined): string[] {
  return groupComplaintByService(complaint).map((g) => `${g.service}: ${g.issues.join(", ")}`);
}
