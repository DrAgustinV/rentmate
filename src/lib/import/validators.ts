import { ParsedRow } from './csvParser';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_CODES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD'];

export function validatePropertyRow(row: ParsedRow): void {
  // Required fields
  if (!row.title || row.title.length === 0) {
    row._errors.push('Title is required');
  } else if (row.title.length > 100) {
    row._errors.push('Title must be less than 100 characters');
  }

  if (!row.country || row.country.length === 0) {
    row._errors.push('Country is required');
  } else if (row.country.length > 100) {
    row._errors.push('Country must be less than 100 characters');
  }

  // Optional field validations
  if (row.address && row.address.length > 200) {
    row._errors.push('Address must be less than 200 characters');
  }

  if (row.city && row.city.length > 100) {
    row._errors.push('City must be less than 100 characters');
  }

  if (row.state_province && row.state_province.length > 100) {
    row._errors.push('State/Province must be less than 100 characters');
  }

  if (row.postal_code && row.postal_code.length > 20) {
    row._errors.push('Postal code must be less than 20 characters');
  }

  if (row.description && row.description.length > 1000) {
    row._errors.push('Description must be less than 1000 characters');
  }

  // Warnings for missing optional fields
  if (!row.address) {
    row._warnings.push('Address is recommended but optional');
  }
  if (!row.postal_code) {
    row._warnings.push('Postal code is recommended but optional');
  }
}

export function validateTenantRow(row: ParsedRow, existingProperties: string[]): void {
  // Required: property reference
  if (!row.property_title || row.property_title.length === 0) {
    row._errors.push('Property title is required');
  } else if (!existingProperties.includes(row.property_title)) {
    row._errors.push(`Property "${row.property_title}" not found in import`);
  }

  // Required: tenant email
  if (!row.tenant_email || row.tenant_email.length === 0) {
    row._errors.push('Tenant email is required');
  } else if (!EMAIL_REGEX.test(row.tenant_email)) {
    row._errors.push('Invalid email format');
  }

  // Required: tenant name
  if (!row.tenant_first_name || row.tenant_first_name.length === 0) {
    row._errors.push('Tenant first name is required');
  }
  if (!row.tenant_last_name || row.tenant_last_name.length === 0) {
    row._errors.push('Tenant last name is required');
  }

  // Optional: phone
  if (row.tenant_phone && !PHONE_REGEX.test(row.tenant_phone)) {
    row._warnings.push('Phone number format may be invalid (expected E.164 format)');
  }

  // Required: started_at
  if (!row.started_at || row.started_at.length === 0) {
    row._errors.push('Start date is required');
  } else if (!ISO_DATE_REGEX.test(row.started_at)) {
    row._errors.push('Start date must be in YYYY-MM-DD format');
  } else {
    const startDate = new Date(row.started_at);
    if (isNaN(startDate.getTime())) {
      row._errors.push('Invalid start date');
    }
  }

  // Optional: ended_at
  if (row.ended_at && row.ended_at.length > 0) {
    if (!ISO_DATE_REGEX.test(row.ended_at)) {
      row._errors.push('End date must be in YYYY-MM-DD format');
    } else {
      const endDate = new Date(row.ended_at);
      const startDate = new Date(row.started_at || '');
      if (isNaN(endDate.getTime())) {
        row._errors.push('Invalid end date');
      } else if (startDate && endDate <= startDate) {
        row._errors.push('End date must be after start date');
      }
    }
  }

  // Required: rent_amount
  if (!row.rent_amount || row.rent_amount.length === 0) {
    row._errors.push('Rent amount is required');
  } else {
    const amount = parseFloat(row.rent_amount);
    if (isNaN(amount) || amount <= 0) {
      row._errors.push('Rent amount must be a positive number');
    }
  }

  // Required: payment_day
  if (!row.payment_day || row.payment_day.length === 0) {
    row._errors.push('Payment day is required');
  } else {
    const day = parseInt(row.payment_day, 10);
    if (isNaN(day) || day < 1 || day > 31) {
      row._errors.push('Payment day must be between 1 and 31');
    }
  }

  // Required: currency
  if (!row.currency || row.currency.length === 0) {
    row._errors.push('Currency is required');
  } else if (!CURRENCY_CODES.includes(row.currency.toUpperCase())) {
    row._warnings.push(`Currency "${row.currency}" may not be supported. Supported: ${CURRENCY_CODES.join(', ')}`);
  }
}

export function validateImport(rows: ParsedRow[], importType: string): void {
  const propertyTitles = new Set<string>();
  const tenantEmails = new Map<string, Set<string>>();

  rows.forEach(row => {
    // Validate based on import type
    if (importType === 'properties' || importType === 'properties_and_tenants') {
      validatePropertyRow(row);
      
      // Check for duplicate property titles
      if (row.title) {
        if (propertyTitles.has(row.title)) {
          row._errors.push(`Duplicate property title: "${row.title}"`);
        }
        propertyTitles.add(row.title);
      }
    }

    if (importType === 'tenants_only' || importType === 'properties_and_tenants') {
      const existingProperties = Array.from(propertyTitles);
      validateTenantRow(row, existingProperties);

      // Check for duplicate tenant emails per property
      const propTitle = row.property_title || row.title || '';
      if (row.tenant_email && propTitle) {
        if (!tenantEmails.has(propTitle)) {
          tenantEmails.set(propTitle, new Set());
        }
        if (tenantEmails.get(propTitle)!.has(row.tenant_email)) {
          row._errors.push(`Duplicate tenant email for property "${propTitle}"`);
        }
        tenantEmails.get(propTitle)!.add(row.tenant_email);
      }
    }
  });
}
