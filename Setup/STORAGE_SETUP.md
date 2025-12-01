# Supabase Storage Setup - Brand Isolation

## Overview

Supabase Storage is configured with **brand-specific isolation**. Each brand's files are stored in separate folders within shared buckets, with RLS policies enforcing access control.

## Storage Structure

```
bucket-name/
├── act/                    # Brand: ACT
│   ├── documents/
│   │   ├── brand-guide.pdf
│   │   └── marketing-plan.pdf
│   ├── images/
│   │   ├── logo.png
│   │   └── hero-image.jpg
│   ├── logos/
│   └── training/
│       ├── product-1.jpg
│       └── product-2.jpg
│
└── globex/                 # Brand: Globex
    ├── documents/
    ├── images/
    └── logos/
```

**Pattern:** `{bucket}/{brand_id}/{category}/{filename}`

---

## Storage Buckets

### 1. **brand-documents** (Private)
**Purpose:** PDFs and documents for RAG processing

- **Max Size:** 50MB per file
- **Allowed Types:** PDF, DOC, DOCX, TXT, MD
- **Public:** No (requires authentication)
- **Categories:** `documents`, `exports`

**Use Cases:**
- Brand guidelines
- Marketing documents
- Reports
- Content briefs

---

### 2. **brand-images** (Public)
**Purpose:** Public-facing images for web display

- **Max Size:** 10MB per file
- **Allowed Types:** JPEG, PNG, GIF, WEBP, SVG
- **Public:** Yes (readable by anyone)
- **Categories:** `images`, `temp`

**Use Cases:**
- Website images
- Social media assets
- Public marketing materials

---

### 3. **brand-assets** (Private)
**Purpose:** Brand identity assets (logos, fonts, design files)

- **Max Size:** 50MB per file
- **Allowed Types:** Images, ZIP, fonts (TTF, OTF, WOFF, WOFF2)
- **Public:** No
- **Categories:** `logos`, `fonts`

**Use Cases:**
- Logo files
- Brand fonts
- Design system assets
- Style guides

---

### 4. **training-data** (Private)
**Purpose:** Images for LoRA model training

- **Max Size:** 10MB per image
- **Allowed Types:** JPEG, PNG, WEBP
- **Public:** No
- **Categories:** `training`

**Use Cases:**
- Product images for LoRA training
- Brand-specific visual training data

---

### 5. **generated-content** (Private)
**Purpose:** AI-generated images and exports

- **Max Size:** 20MB per file
- **Allowed Types:** JPEG, PNG, WEBP, PDF, TXT
- **Public:** No
- **Categories:** `generated`, `exports`

**Use Cases:**
- AI-generated images
- Content exports
- Generated reports

---

## Access Control (RLS Policies)

### Permission Matrix

| Bucket | View | Upload | Update | Delete |
|--------|------|--------|--------|--------|
| **brand-documents** | All users | All users | Editors+ | Admins+ |
| **brand-images** | Anyone (public) | All users | Editors+ | Admins+ |
| **brand-assets** | All users | All users | Editors+ | Admins+ |
| **training-data** | All users | All users | - | Admins+ |
| **generated-content** | All users | Service role | - | Admins+ |

**Rules:**
- Users can only access files from brands they belong to
- File path must start with their `brand_id`
- Public bucket (`brand-images`) is readable by anyone
- Service role can upload to `generated-content` for AI outputs

---

## Usage Examples

### Upload a File

```typescript
import { uploadBrandFile } from '@act/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

// Upload a document
const result = await uploadBrandFile(supabase, {
  bucket: 'brand-documents',
  brandId: 'act',
  category: 'documents',
  file: myFile,
  fileName: 'brand-guide.pdf', // Optional
});

if (result.error) {
  console.error('Upload failed:', result.error);
} else {
  console.log('Uploaded to:', result.path);
  // Path: act/documents/brand-guide.pdf
}
```

### Upload Multiple Files

```typescript
import { uploadBrandFiles } from '@act/auth';

const results = await uploadBrandFiles(supabase, {
  bucket: 'training-data',
  brandId: 'act',
  category: 'training',
  files: [file1, file2, file3],
});

results.forEach((result, index) => {
  if (result.error) {
    console.error(`File ${index} failed:`, result.error);
  } else {
    console.log(`File ${index} uploaded:`, result.path);
  }
});
```

### Get Public URL (for public buckets)

```typescript
// For brand-images (public bucket)
const result = await uploadBrandFile(supabase, {
  bucket: 'brand-images',
  brandId: 'act',
  category: 'images',
  file: imageFile,
});

// URL is automatically included for public buckets
console.log('Public URL:', result.url);
// Use this URL in <img src={result.url} />
```

### Get Signed URL (for private buckets)

```typescript
import { getSignedUrl } from '@act/auth';

// For private files, get a temporary signed URL
const { url, error } = await getSignedUrl(
  supabase,
  'brand-documents',
  'act/documents/brand-guide.pdf',
  3600 // Valid for 1 hour
);

if (!error) {
  console.log('Signed URL:', url);
  // Use this URL to download or display the file
}
```

### List Files

```typescript
import { listBrandFiles } from '@act/auth';

// List all documents for ACT brand
const { files, error } = await listBrandFiles(
  supabase,
  'brand-documents',
  'act',
  'documents'
);

files.forEach(file => {
  console.log('File:', file.name, 'Size:', file.metadata.size);
});
```

### Download a File

```typescript
import { downloadBrandFile } from '@act/auth';

const { data, error } = await downloadBrandFile(
  supabase,
  'brand-documents',
  'act/documents/brand-guide.pdf'
);

if (!error && data) {
  // Create a download link
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'brand-guide.pdf';
  a.click();
}
```

### Delete a File

```typescript
import { deleteBrandFile } from '@act/auth';

const { success, error } = await deleteBrandFile(
  supabase,
  'brand-documents',
  'act/documents/old-file.pdf'
);

if (success) {
  console.log('File deleted successfully');
}
```

### Validate Before Upload

```typescript
import { validateFile } from '@act/auth';

const validation = validateFile(file, {
  maxSizeMB: 10,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
});

if (!validation.valid) {
  alert(validation.error);
  return;
}

// Proceed with upload
await uploadBrandFile(/* ... */);
```

### Check Storage Usage

```typescript
import { getBrandStorageUsage } from '@act/auth';

const { sizeBytes, fileCount, error } = await getBrandStorageUsage(
  supabase,
  'act'
);

const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
console.log(`Brand uses ${sizeMB}MB across ${fileCount} files`);
```

---

## API Route Example

Create a file upload API route:

```typescript
// app/api/upload/route.ts
import { createClient } from '@supabase/supabase-js';
import { uploadBrandFile } from '@act/auth';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  // Get user from session
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const authHeader = req.headers.get('authorization');
  const { data: { user } } = await supabase.auth.getUser(
    authHeader?.replace('Bearer ', '') || ''
  );

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Get form data
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const brandId = formData.get('brandId') as string;
  const bucket = formData.get('bucket') as string;
  const category = formData.get('category') as string;

  // Upload file
  const result = await uploadBrandFile(supabase, {
    bucket,
    brandId,
    category,
    file,
  });

  if (result.error) {
    return new Response(JSON.stringify({ error: result.error.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({
    path: result.path,
    url: result.url,
  }));
}
```

---

## File Organization Best Practices

### 1. Use Descriptive Categories

```
✅ Good:
act/documents/brand-guidelines-2025.pdf
act/images/hero-homepage.jpg
act/logos/logo-primary.svg

❌ Bad:
act/file1.pdf
act/img.jpg
act/logo.png
```

### 2. Include Dates for Versioning

```
act/documents/brand-guide-2025-01.pdf
act/documents/brand-guide-2025-02.pdf
```

### 3. Use Meaningful Filenames

```
✅ Good: product-hero-desktop-2x.jpg
❌ Bad: img_1234.jpg
```

### 4. Organize by Purpose

```
act/
├── documents/          # Reference documents
├── images/            # Public images
├── logos/             # Brand identity
│   ├── primary/
│   ├── secondary/
│   └── variations/
└── training/          # LoRA training data
    ├── products/
    └── lifestyle/
```

---

## Storage Limits

| Bucket | Max File Size | Max Total Storage |
|--------|---------------|-------------------|
| brand-documents | 50MB | Unlimited |
| brand-images | 10MB | Unlimited |
| brand-assets | 50MB | Unlimited |
| training-data | 10MB | Unlimited |
| generated-content | 20MB | Unlimited |

**Note:** Supabase free tier includes 1GB storage. Upgrade for more.

---

## Security Features

### 1. **Brand Isolation**
- Users can only access files from their brands
- RLS policies enforce isolation at database level

### 2. **Role-Based Access**
- Reviewers: View only
- Editors: View, upload, update
- Admins: View, upload, update, delete

### 3. **Private by Default**
- Only `brand-images` is public
- All other buckets require authentication

### 4. **Signed URLs**
- Temporary access to private files
- Configurable expiration time

---

## Troubleshooting

### File Upload Fails

1. **Check file size:** Ensure file is under limit
2. **Check file type:** Verify MIME type is allowed
3. **Check permissions:** User must belong to brand
4. **Check path:** Ensure path starts with brand_id

### Can't Access File

1. **Verify user belongs to brand**
2. **Check file path format:** `{brand_id}/{category}/{filename}`
3. **For private files:** Use signed URLs
4. **Check RLS policies:** Ensure policies are applied

### Storage Usage High

1. Delete old/unused files
2. Compress images before upload
3. Use appropriate file formats
4. Implement file retention policies

---

## Migration Applied

✅ **Migration:** `20251201141300_create_storage_buckets.sql`  
✅ **Buckets Created:** 5 buckets with RLS policies  
✅ **Brand Isolation:** Enforced via RLS  
✅ **Status:** Production ready

---

**Your storage system is now configured with complete brand isolation! 📁**
