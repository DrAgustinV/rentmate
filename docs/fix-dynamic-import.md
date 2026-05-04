# Fix Dynamic Import in validateTranslations.ts

Update the import statement to use dynamic `import()` without `.ts` extension:

```ts
// Before
import { translations } from './translations/index';

// After
const translations = await import('./translations/index');
```

This matches the app's dynamic import pattern and avoids extension requirements. The script will now resolve modules the same way as the running application.