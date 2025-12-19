-- Add PowerPoint MIME types to project-files bucket
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/pdf',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]
WHERE id = 'project-files';
