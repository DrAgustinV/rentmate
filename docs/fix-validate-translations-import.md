# Fix Module Import in validateTranslations.ts

Update the import statement in `src/lib/i18n/validateTranslations.ts` to include `.ts` extension:

```ts
// Before
import { translations } from './translations/index';

// After
import { translations } from './translations/index.ts';
```

This change ensures Node.js resolves the module correctly during script execution without modifying the original app code.