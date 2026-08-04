# Upload foundation

Use `features/media/media.service.ts` for low-level binary validation and storage operations.
Use `lib/upload/upload.service.ts` when a feature needs an upload lifecycle:

1. validate in the feature or media service;
2. upload the new object;
3. persist metadata in the feature repository;
4. delete the previous object, when replacing;
5. log cleanup failures without failing the already-persisted business operation.

`UploadResult` is the shared metadata shape for orchestration:

- `url`
- `storagePath`
- `bucket`
- `contentType`
- `size`
- `filename`

Legacy URL-only records should pass a `null`/missing `storagePath`; cleanup will be skipped.
