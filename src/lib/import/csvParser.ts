export interface ParsedProperty {
  title: string;
  address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country: string;
  description?: string;
}

export interface ParsedTenant {
  property_title: string;
  tenant_email: string;
  tenant_first_name: string;
  tenant_last_name: string;
  tenant_phone?: string;
  started_at: string;
  ended_at?: string;
  rent_amount: string;
  payment_day: string;
  currency: string;
}

export interface ParsedRow extends ParsedProperty, Partial<ParsedTenant> {
  _rowNumber: number;
  _errors: string[];
  _warnings: string[];
}

export function parseCSV(csvText: string): ParsedRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  const headers = parseCSVLine(lines[0]);
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || values.every(v => !v.trim())) continue;

    const row: Record<string, string | number | string[]> = { _rowNumber: i + 1, _errors: [], _warnings: [] };
    headers.forEach((header, index) => {
      const key = header.trim().toLowerCase();
      row[key] = values[index]?.trim() || '';
    });
    rows.push(row as ParsedRow);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

export function detectImportType(rows: ParsedRow[]): 'properties' | 'properties_and_tenants' | 'tenants_only' {
  if (rows.length === 0) return 'properties';

  const firstRow = rows[0];
  const hasPropertyFields = 'title' in firstRow && 'country' in firstRow;
  const hasTenantFields = 'tenant_email' in firstRow && 'rent_amount' in firstRow;

  if (hasPropertyFields && hasTenantFields) {
    return 'properties_and_tenants';
  } else if (hasTenantFields) {
    return 'tenants_only';
  } else {
    return 'properties';
  }
}

export function groupByProperty(rows: ParsedRow[]): Map<string, ParsedRow[]> {
  const grouped = new Map<string, ParsedRow[]>();
  
  rows.forEach(row => {
    const key = row.property_title || row.title || 'unknown';
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(row);
  });
  
  return grouped;
}
