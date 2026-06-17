# Fix Turbo.json Schema Validation Warning

## Context

VS Code shows a warning on `turbo.json` line 2: "Unable to load schema from 'https://turbo.build/schema.json': Location is untrusted." This is a VS Code security feature that blocks remote JSON schema downloads by default.

## Solution

Create `.vscode/settings.json` to enable schema downloads and explicitly trust the Turbo schema URL.

## Implementation

Create new file: `.vscode/settings.json`

```json
{
  "json.schemaDownload.enable": true,
  "json.schemas": [
    {
      "fileMatch": ["turbo.json"],
      "url": "https://turbo.build/schema.json"
    }
  ]
}
```

## Verification

- Open `turbo.json` in VS Code
- The warning on line 2 should disappear
- Schema validation should now work (autocomplete, error checking)

## Notes

- This is a workspace-level setting (only affects this project)
- No changes to `turbo.json` itself
- No impact on builds or runtime
