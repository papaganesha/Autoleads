/**
 * Generate CSV content from leads data.
 * Returns CSV string ready for download.
 */
function generateLeadsCSV(leads) {
  if (!leads || leads.length === 0) {
    return 'No leads to export';
  }

  // CSV headers
  const headers = [
    'Name',
    'Category',
    'Address',
    'Phone',
    'Website',
    'Rating',
    'Reviews',
    'Temperature',
    'Score',
    'Instagram Handle',
    'Instagram Followers',
    'Status',
    'Created Date',
  ];

  // Transform leads to CSV rows
  const rows = leads.map((lead) => [
    `"${(lead.name || '').replace(/"/g, '""')}"`, // Escape quotes
    `"${(lead.category || '').replace(/"/g, '""')}"`,
    `"${(lead.address || '').replace(/"/g, '""')}"`,
    `"${(lead.phone || '').replace(/"/g, '""')}"`,
    `"${(lead.website || '').replace(/"/g, '""')}"`,
    lead.rating || '-',
    lead.user_rating_count || '0',
    lead.temperature || 'cold',
    lead.score || '0',
    lead.instagram?.handle ? `@${lead.instagram.handle}` : '-',
    lead.instagram?.followers || '-',
    lead.status || 'new',
    lead.created_at
      ? new Date(lead.created_at).toLocaleDateString('pt-BR')
      : '-',
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Generate filename for CSV export with timestamp.
 */
function generateFilename() {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14);
  return `autoleads-${timestamp}.csv`;
}

module.exports = {
  generateLeadsCSV,
  generateFilename,
};
