# CI/CD Translation Validation Setup

Add this step to your GitHub Actions workflow to validate translations during deployment:

```yaml
- name: Validate Translations
  run: |
    node src/lib/i18n/validateTranslations.ts
```

This will:
- Check for missing translation keys in Spanish
- Verify placeholder consistency between English and Spanish
- Fail the build if critical translation issues are found