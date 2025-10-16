# Email Template Variables

Available variables for email templates:

- `{{propertyTitle}}` - Name of the property
- `{{propertyAddress}}` - Full address of the property (optional)
- `{{propertyAddressBlock}}` - Formatted address block (auto-populated if address exists)
- `{{managerName}}` - Name of the property manager
- `{{invitationLink}}` - URL to accept the invitation
- `{{expirationDate}}` - When the invitation expires (formatted)

## Usage

Simply use the variable name wrapped in double curly braces in your HTML template.

Example:
```html
<p>Hello! {{managerName}} has invited you to {{propertyTitle}}</p>
```

## Editing Templates

1. Edit the `.html` files directly in any HTML editor
2. Maintain the `{{variable}}` placeholders where you want dynamic content
3. Deploy changes by pushing to your repository

## Supported Languages

- `en` - English (invitation-en.html)
- `es` - Spanish (invitation-es.html)

To add a new language, create a new file `invitation-{language-code}.html` following the same structure.
