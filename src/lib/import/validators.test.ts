import { describe, it, expect, beforeEach } from 'vitest';
import { ParsedRow } from './csvParser';
import { validatePropertyRow, validateTenantRow, validateImport } from './validators';

function createEmptyRow(): ParsedRow {
  return {
    _rowNumber: 1,
    _errors: [],
    _warnings: [],
    title: '',
    country: '',
  };
}

describe('Import Validators', () => {
  describe('validatePropertyRow', () => {
    it('should add error when title is missing', () => {
      const row = createEmptyRow();
      validatePropertyRow(row);
      expect(row._errors).toContain('Title is required');
    });

    it('should add error when title exceeds 100 characters', () => {
      const row = createEmptyRow();
      row.title = 'a'.repeat(101);
      validatePropertyRow(row);
      expect(row._errors).toContain('Title must be less than 100 characters');
    });

    it('should add error when country is missing', () => {
      const row = createEmptyRow();
      row.title = 'Test Property';
      validatePropertyRow(row);
      expect(row._errors).toContain('Country is required');
    });

    it('should add error when country exceeds 100 characters', () => {
      const row = createEmptyRow();
      row.title = 'Test Property';
      row.country = 'a'.repeat(101);
      validatePropertyRow(row);
      expect(row._errors).toContain('Country must be less than 100 characters');
    });

    it('should add error when address exceeds 200 characters', () => {
      const row = createEmptyRow();
      row.title = 'Test Property';
      row.country = 'Germany';
      row.address = 'a'.repeat(201);
      validatePropertyRow(row);
      expect(row._errors).toContain('Address must be less than 200 characters');
    });

    it('should add error when city exceeds 100 characters', () => {
      const row = createEmptyRow();
      row.title = 'Test Property';
      row.country = 'Germany';
      row.city = 'a'.repeat(101);
      validatePropertyRow(row);
      expect(row._errors).toContain('City must be less than 100 characters');
    });

    it('should add error when state_province exceeds 100 characters', () => {
      const row = createEmptyRow();
      row.title = 'Test Property';
      row.country = 'Germany';
      row.state_province = 'a'.repeat(101);
      validatePropertyRow(row);
      expect(row._errors).toContain('State/Province must be less than 100 characters');
    });

    it('should add error when postal_code exceeds 20 characters', () => {
      const row = createEmptyRow();
      row.title = 'Test Property';
      row.country = 'Germany';
      row.postal_code = 'a'.repeat(21);
      validatePropertyRow(row);
      expect(row._errors).toContain('Postal code must be less than 20 characters');
    });

    it('should add error when description exceeds 1000 characters', () => {
      const row = createEmptyRow();
      row.title = 'Test Property';
      row.country = 'Germany';
      row.description = 'a'.repeat(1001);
      validatePropertyRow(row);
      expect(row._errors).toContain('Description must be less than 1000 characters');
    });

    it('should add warning when address is missing', () => {
      const row = createEmptyRow();
      row.title = 'Test Property';
      row.country = 'Germany';
      validatePropertyRow(row);
      expect(row._warnings).toContain('Address is recommended but optional');
    });

    it('should add warning when postal_code is missing', () => {
      const row = createEmptyRow();
      row.title = 'Test Property';
      row.country = 'Germany';
      validatePropertyRow(row);
      expect(row._warnings).toContain('Postal code is recommended but optional');
    });

    it('should pass with valid property data', () => {
      const row = createEmptyRow();
      row.title = 'Test Property';
      row.country = 'Germany';
      row.address = '123 Main St';
      row.city = 'Berlin';
      row.postal_code = '10115';
      validatePropertyRow(row);
      expect(row._errors).toHaveLength(0);
      expect(row._warnings).toHaveLength(0);
    });
  });

  describe('validateTenantRow', () => {
    const existingProperties = ['Property A', 'Property B'];

    it('should add error when property_title is missing', () => {
      const row = createEmptyRow();
      row.tenant_email = 'test@example.com';
      row.tenant_first_name = 'John';
      row.tenant_last_name = 'Doe';
      row.started_at = '2024-01-01';
      row.rent_amount = '1000';
      row.payment_day = '1';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._errors).toContain('Property title is required');
    });

    it('should add error when property_title not found in import', () => {
      const row = createEmptyRow();
      row.property_title = 'Unknown Property';
      row.tenant_email = 'test@example.com';
      row.tenant_first_name = 'John';
      row.tenant_last_name = 'Doe';
      row.started_at = '2024-01-01';
      row.rent_amount = '1000';
      row.payment_day = '1';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._errors).toContain('Property "Unknown Property" not found in import');
    });

    it('should add error when tenant_email is missing', () => {
      const row = createEmptyRow();
      row.property_title = 'Property A';
      row.tenant_first_name = 'John';
      row.tenant_last_name = 'Doe';
      row.started_at = '2024-01-01';
      row.rent_amount = '1000';
      row.payment_day = '1';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._errors).toContain('Tenant email is required');
    });

    it('should add error when tenant_email format is invalid', () => {
      const row = createEmptyRow();
      row.property_title = 'Property A';
      row.tenant_email = 'invalid-email';
      row.tenant_first_name = 'John';
      row.tenant_last_name = 'Doe';
      row.started_at = '2024-01-01';
      row.rent_amount = '1000';
      row.payment_day = '1';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._errors).toContain('Invalid email format');
    });

    it('should add error when tenant_first_name is missing', () => {
      const row = createEmptyRow();
      row.property_title = 'Property A';
      row.tenant_email = 'test@example.com';
      row.tenant_last_name = 'Doe';
      row.started_at = '2024-01-01';
      row.rent_amount = '1000';
      row.payment_day = '1';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._errors).toContain('Tenant first name is required');
    });

    it('should add error when tenant_last_name is missing', () => {
      const row = createEmptyRow();
      row.property_title = 'Property A';
      row.tenant_email = 'test@example.com';
      row.tenant_first_name = 'John';
      row.started_at = '2024-01-01';
      row.rent_amount = '1000';
      row.payment_day = '1';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._errors).toContain('Tenant last name is required');
    });

    it('should add warning when phone format may be invalid', () => {
      const row = createEmptyRow();
      row.property_title = 'Property A';
      row.tenant_email = 'test@example.com';
      row.tenant_first_name = 'John';
      row.tenant_last_name = 'Doe';
      row.tenant_phone = 'invalid-phone';
      row.started_at = '2024-01-01';
      row.rent_amount = '1000';
      row.payment_day = '1';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._warnings).toContain('Phone number format may be invalid (expected E.164 format)');
    });

    it('should add error when started_at is missing', () => {
      const row = createEmptyRow();
      row.property_title = 'Property A';
      row.tenant_email = 'test@example.com';
      row.tenant_first_name = 'John';
      row.tenant_last_name = 'Doe';
      row.rent_amount = '1000';
      row.payment_day = '1';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._errors).toContain('Start date is required');
    });

    it('should add error when started_at format is invalid', () => {
      const row = createEmptyRow();
      row.property_title = 'Property A';
      row.tenant_email = 'test@example.com';
      row.tenant_first_name = 'John';
      row.tenant_last_name = 'Doe';
      row.started_at = '01-01-2024';
      row.rent_amount = '1000';
      row.payment_day = '1';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._errors).toContain('Start date must be in YYYY-MM-DD format');
    });

    it('should add error when started_at is not a valid date', () => {
      const row = createEmptyRow();
      row.property_title = 'Property A';
      row.tenant_email = 'test@example.com';
      row.tenant_first_name = 'John';
      row.tenant_last_name = 'Doe';
      row.started_at = '2024-13-01';
      row.rent_amount = '1000';
      row.payment_day = '1';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._errors).toContain('Invalid start date');
    });

    it('should add error when ended_at is before started_at', () => {
      const row = createEmptyRow();
      row.property_title = 'Property A';
      row.tenant_email = 'test@example.com';
      row.tenant_first_name = 'John';
      row.tenant_last_name = 'Doe';
      row.started_at = '2024-06-01';
      row.ended_at = '2024-01-01';
      row.rent_amount = '1000';
      row.payment_day = '1';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._errors).toContain('End date must be after start date');
    });

    it('should add error when rent_amount is missing', () => {
      const row = createEmptyRow();
      row.property_title = 'Property A';
      row.tenant_email = 'test@example.com';
      row.tenant_first_name = 'John';
      row.tenant_last_name = 'Doe';
      row.started_at = '2024-01-01';
      row.payment_day = '1';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._errors).toContain('Rent amount is required');
    });

    it('should add error when rent_amount is not a positive number', () => {
      const row = createEmptyRow();
      row.property_title = 'Property A';
      row.tenant_email = 'test@example.com';
      row.tenant_first_name = 'John';
      row.tenant_last_name = 'Doe';
      row.started_at = '2024-01-01';
      row.rent_amount = '-100';
      row.payment_day = '1';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._errors).toContain('Rent amount must be a positive number');
    });

    it('should add error when rent_amount is zero', () => {
      const row = createEmptyRow();
      row.property_title = 'Property A';
      row.tenant_email = 'test@example.com';
      row.tenant_first_name = 'John';
      row.tenant_last_name = 'Doe';
      row.started_at = '2024-01-01';
      row.rent_amount = '0';
      row.payment_day = '1';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._errors).toContain('Rent amount must be a positive number');
    });

    it('should add error when payment_day is missing', () => {
      const row = createEmptyRow();
      row.property_title = 'Property A';
      row.tenant_email = 'test@example.com';
      row.tenant_first_name = 'John';
      row.tenant_last_name = 'Doe';
      row.started_at = '2024-01-01';
      row.rent_amount = '1000';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._errors).toContain('Payment day is required');
    });

    it('should add error when payment_day is out of range', () => {
      const row = createEmptyRow();
      row.property_title = 'Property A';
      row.tenant_email = 'test@example.com';
      row.tenant_first_name = 'John';
      row.tenant_last_name = 'Doe';
      row.started_at = '2024-01-01';
      row.rent_amount = '1000';
      row.payment_day = '32';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._errors).toContain('Payment day must be between 1 and 31');
    });

    it('should add warning for unsupported currency', () => {
      const row = createEmptyRow();
      row.property_title = 'Property A';
      row.tenant_email = 'test@example.com';
      row.tenant_first_name = 'John';
      row.tenant_last_name = 'Doe';
      row.started_at = '2024-01-01';
      row.rent_amount = '1000';
      row.payment_day = '1';
      row.currency = 'XYZ';
      validateTenantRow(row, existingProperties);
      expect(row._warnings.some(w => w.includes('Currency'))).toBe(true);
    });

    it('should pass with valid tenant data', () => {
      const row = createEmptyRow();
      row.property_title = 'Property A';
      row.tenant_email = 'test@example.com';
      row.tenant_first_name = 'John';
      row.tenant_last_name = 'Doe';
      row.started_at = '2024-01-01';
      row.rent_amount = '1000';
      row.payment_day = '1';
      row.currency = 'EUR';
      validateTenantRow(row, existingProperties);
      expect(row._errors).toHaveLength(0);
    });
  });

  describe('validateImport', () => {
    it('should detect duplicate property titles', () => {
      const rows: ParsedRow[] = [
        { _rowNumber: 1, _errors: [], _warnings: [], title: 'Property A', country: 'Germany' },
        { _rowNumber: 2, _errors: [], _warnings: [], title: 'Property B', country: 'France' },
        { _rowNumber: 3, _errors: [], _warnings: [], title: 'Property A', country: 'Spain' },
      ];
      validateImport(rows, 'properties');
      expect(rows[2]._errors).toContain('Duplicate property title: "Property A"');
    });

    it('should detect duplicate tenant emails per property', () => {
      const rows: ParsedRow[] = [
        {
          _rowNumber: 1,
          _errors: [],
          _warnings: [],
          title: 'Property A',
          country: 'Germany',
          property_title: 'Property A',
          tenant_email: 'tenant@example.com',
          tenant_first_name: 'John',
          tenant_last_name: 'Doe',
          started_at: '2024-01-01',
          rent_amount: '1000',
          payment_day: '1',
          currency: 'EUR',
        },
        {
          _rowNumber: 2,
          _errors: [],
          _warnings: [],
          title: 'Property B',
          country: 'France',
          property_title: 'Property A',
          tenant_email: 'tenant@example.com',
          tenant_first_name: 'Jane',
          tenant_last_name: 'Smith',
          started_at: '2024-01-01',
          rent_amount: '1000',
          payment_day: '1',
          currency: 'EUR',
        },
      ];
      validateImport(rows, 'properties_and_tenants');
      expect(rows[1]._errors).toContain('Duplicate tenant email for property "Property A"');
    });

    it('should validate properties when importType is properties', () => {
      const rows: ParsedRow[] = [
        { _rowNumber: 1, _errors: [], _warnings: [], title: '', country: '' },
      ];
      validateImport(rows, 'properties');
      expect(rows[0]._errors.length).toBeGreaterThan(0);
    });

    it('should validate tenants when importType is tenants_only', () => {
      const rows: ParsedRow[] = [
        {
          _rowNumber: 1,
          _errors: [],
          _warnings: [],
          property_title: '',
          tenant_email: 'invalid',
          tenant_first_name: '',
          tenant_last_name: '',
          started_at: '',
          rent_amount: '',
          payment_day: '',
          currency: 'EUR',
        },
      ];
      validateImport(rows, 'tenants_only');
      expect(rows[0]._errors.some(e => e.includes('Property title'))).toBe(true);
    });

    it('should allow same tenant email for different properties', () => {
      const rows: ParsedRow[] = [
        {
          _rowNumber: 1,
          _errors: [],
          _warnings: [],
          title: 'Property A',
          country: 'Germany',
          property_title: 'Property A',
          tenant_email: 'tenant@example.com',
          tenant_first_name: 'John',
          tenant_last_name: 'Doe',
          started_at: '2024-01-01',
          rent_amount: '1000',
          payment_day: '1',
          currency: 'EUR',
        },
        {
          _rowNumber: 2,
          _errors: [],
          _warnings: [],
          title: 'Property B',
          country: 'France',
          property_title: 'Property B',
          tenant_email: 'tenant@example.com',
          tenant_first_name: 'John',
          tenant_last_name: 'Doe',
          started_at: '2024-01-01',
          rent_amount: '1000',
          payment_day: '1',
          currency: 'EUR',
        },
      ];
      validateImport(rows, 'properties_and_tenants');
      expect(rows[0]._errors.filter(e => e.includes('Duplicate'))).toHaveLength(0);
      expect(rows[1]._errors.filter(e => e.includes('Duplicate'))).toHaveLength(0);
    });
  });
});