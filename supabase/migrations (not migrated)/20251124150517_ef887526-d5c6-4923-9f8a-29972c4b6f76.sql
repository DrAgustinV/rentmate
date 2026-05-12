-- Migrate existing country names to ISO codes
UPDATE properties 
SET country = CASE 
  WHEN country = 'Austria' THEN 'AT'
  WHEN country = 'Belgium' THEN 'BE'
  WHEN country = 'France' THEN 'FR'
  WHEN country = 'Germany' THEN 'DE'
  WHEN country = 'Greece' THEN 'GR'
  WHEN country = 'Italy' THEN 'IT'
  WHEN country = 'Netherlands' THEN 'NL'
  WHEN country = 'Poland' THEN 'PL'
  WHEN country = 'Portugal' THEN 'PT'
  WHEN country = 'Spain' THEN 'ES'
  WHEN country = 'United Kingdom' THEN 'GB'
  WHEN country = 'United States' THEN 'US'
  ELSE country
END
WHERE country IS NOT NULL;