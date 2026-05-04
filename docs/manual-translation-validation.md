# Manual Translation Validation

Run this command for ad-hoc checks:
```bash
node src/lib/i18n/validateTranslations.ts
```

This will:
- Check for missing Spanish translation keys
- Verify placeholder consistency between languages
- Log warnings for any inconsistencies