# Role-Based Access Control (RBAC) & Permissions

## Overview

The ACT 2.0 platform implements a comprehensive **5-tier role system** with **40+ granular permissions**. Every user is assigned a role within each brand they belong to, and permissions are inherited hierarchically.

**Updated:** December 2025 - New role structure with quota management.

## User Roles

### 1. **Owner** (Highest Level)
**Full access to everything**

- ✅ All content operations (create, edit, delete, publish, review, approve)
- ✅ Full brand management (view, edit, delete brand)
- ✅ Complete user management (invite, edit, remove users)
- ✅ All workflow operations
- ✅ All document operations
- ✅ Analytics and exports
- ✅ Email sending and logs
- ✅ AI usage and model training

**Use Case:** Brand owner or primary account holder

---

### 2. **Admin** (Administrator)
**Can manage users and most content, but cannot delete brand**

- ✅ All content operations (create, edit, delete, publish, review, approve)
- ✅ Brand settings (view, edit)
- ✅ User management (invite, edit, remove users)
- ✅ All workflow operations
- ✅ All document operations
- ✅ Analytics and exports
- ✅ Email sending and logs
- ✅ AI usage and model training
- ❌ Cannot delete the brand

**Use Case:** Trusted team member with full operational control

---

### 3. **Editor** (Content Manager)
**Can create and edit content, manage documents**

- ✅ Content operations (view, create, edit, publish)
- ✅ Brand settings (view only)
- ✅ Users (view only)
- ✅ Workflows (view, execute)
- ✅ Documents (view, upload, edit)
- ✅ Analytics (view only)
- ✅ Email sending
- ✅ AI usage
- ❌ Cannot delete content
- ❌ Cannot manage users
- ❌ Cannot train AI models

**Use Case:** Content creators, marketing team members

---

### 4. **Reviewer** (Content Reviewer) ⭐
**Can view and review content, but not publish**

- ✅ Content (view, review, approve)
- ✅ Brand settings (view only)
- ✅ Users (view only)
- ✅ Workflows (view only)
- ✅ Documents (view only)
- ✅ Analytics (view only)
- ❌ Cannot create or edit content
- ❌ Cannot publish content
- ❌ Cannot manage documents
- ❌ Cannot send emails
- ❌ Cannot use AI features

**Use Case:** Quality assurance, compliance reviewers, stakeholders who need approval rights

---

### 5. **User** (Basic Access)
**Read-only access**

- ✅ Content (view only)
- ✅ Brand settings (view only)
- ✅ Documents (view only)
- ✅ Analytics (view only)
- ❌ Cannot create, edit, or delete anything
- ❌ No management capabilities

**Use Case:** External stakeholders, clients with view-only access

---

## Permission Matrix

| Permission | Owner | Admin | Editor | Reviewer | User |
|------------|-------|-------|--------|----------|------|
| **Content** |
| View content | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create content | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit content | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete content | ✅ | ✅ | ❌ | ❌ | ❌ |
| Publish content | ✅ | ✅ | ✅ | ❌ | ❌ |
| Review content | ✅ | ✅ | ❌ | ✅ | ❌ |
| Approve content | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Brand** |
| View brand | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit brand | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete brand | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Users** |
| View users | ✅ | ✅ | ✅ | ✅ | ❌ |
| Invite users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remove users | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Workflows** |
| View workflows | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create workflows | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit workflows | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete workflows | ✅ | ✅ | ❌ | ❌ | ❌ |
| Execute workflows | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Documents** |
| View documents | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload documents | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit documents | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete documents | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Analytics** |
| View analytics | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export analytics | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Email** |
| Send emails | ✅ | ✅ | ✅ | ❌ | ❌ |
| View email logs | ✅ | ✅ | ❌ | ❌ | ❌ |
| **AI** |
| Use AI features | ✅ | ✅ | ✅ | ❌ | ❌ |
| Train AI models | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Usage in Code

### Import Permissions

```typescript
import { 
  hasPermission, 
  requirePermission,
  isRoleAtLeast,
  getRoleName,
  type BrandRole,
  type Permission 
} from '@act/auth';
```

### Check Permissions

```typescript
// Check if user has specific permission
if (hasPermission(userRole, 'content:edit')) {
  // Allow editing
}

// Check if user has required role level
if (isRoleAtLeast(userRole, 'editor')) {
  // Allow editor-level actions
}

// Guard a function
function deleteContent(userRole: BrandRole) {
  if (!requirePermission(userRole, 'content:delete')) {
    throw new Error('Insufficient permissions');
  }
  // Proceed with deletion
}
```

### In React Components

```typescript
import { hasPermission } from '@act/auth';

function ContentEditor({ userRole }: { userRole: BrandRole }) {
  const canEdit = hasPermission(userRole, 'content:edit');
  const canPublish = hasPermission(userRole, 'content:publish');
  const canDelete = hasPermission(userRole, 'content:delete');

  return (
    <div>
      {canEdit && <button>Edit</button>}
      {canPublish && <button>Publish</button>}
      {canDelete && <button>Delete</button>}
    </div>
  );
}
```

### In API Routes

```typescript
import { requirePermission } from '@act/auth';

export async function POST(req: Request) {
  const { userRole } = await getUserFromSession();
  
  // Require specific permission
  if (!requirePermission(userRole, 'content:create')) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Proceed with content creation
}
```

---

## Database Setup

### Brand Users Table

```sql
CREATE TABLE public.brand_users (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  brand_id TEXT REFERENCES public.brands(id),
  role TEXT CHECK (role IN ('owner', 'admin', 'editor', 'reviewer', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, brand_id)
);
```

### Row Level Security (RLS)

All tables enforce brand isolation:

```sql
-- Users can only access data from brands they belong to
CREATE POLICY "Brand isolation"
  ON public.content FOR ALL
  USING (
    brand_id IN (
      SELECT brand_id FROM public.brand_users 
      WHERE user_id = auth.uid()
    )
  );
```

---

## User Management

### Inviting Users

```typescript
import { canManageUser } from '@act/auth';

async function inviteUser(
  inviterRole: BrandRole,
  newUserRole: BrandRole,
  email: string
) {
  // Check if inviter can manage the target role
  if (!canManageUser(inviterRole, newUserRole)) {
    throw new Error('Cannot invite users with equal or higher role');
  }
  
  // Send invitation
  await sendInvitation(email, newUserRole);
}
```

### Changing User Roles

```typescript
// Only users with higher roles can change other users' roles
if (canManageUser(currentUserRole, targetUserRole)) {
  await updateUserRole(targetUserId, newRole);
}
```

---

## Best Practices

### 1. **Always Check Permissions**
```typescript
// ❌ Bad
function deleteContent() {
  // Delete without checking
}

// ✅ Good
function deleteContent(userRole: BrandRole) {
  if (!hasPermission(userRole, 'content:delete')) {
    throw new Error('Insufficient permissions');
  }
  // Delete
}
```

### 2. **Use Role Hierarchy**
```typescript
// Check if user is at least an editor
if (isRoleAtLeast(userRole, 'editor')) {
  // Allow editor-level actions
}
```

### 3. **Implement UI Guards**
```typescript
// Hide UI elements based on permissions
{hasPermission(userRole, 'users:invite') && (
  <button>Invite User</button>
)}
```

### 4. **Protect API Routes**
```typescript
// Always verify permissions in API routes
export async function DELETE(req: Request) {
  const { userRole } = await getUser();
  
  if (!requirePermission(userRole, 'content:delete')) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Proceed
}
```

---

## Common Scenarios

### Content Approval Workflow

1. **Editor** creates content → Status: Draft
2. **Reviewer** reviews content → Status: Under Review
3. **Reviewer** approves content → Status: Approved
4. **Editor/Admin** publishes content → Status: Published

### User Invitation Flow

1. **Admin/Owner** invites user with specific role
2. User receives email invitation
3. User signs up and is auto-assigned to brand with role
4. User can only perform actions allowed by their role

### Document Management

1. **Editor** uploads brand documents
2. **Reviewer** can view but not edit
3. **Admin** can edit and delete
4. **Owner** has full control

---

## Troubleshooting

### User Can't Access Feature

1. Check user's role in `brand_users` table
2. Verify permission is granted to that role
3. Check RLS policies are correctly applied
4. Verify user is assigned to the correct brand

### Permission Denied Errors

```typescript
// Log permission checks for debugging
if (!hasPermission(userRole, 'content:edit')) {
  console.error('Permission denied:', {
    userRole,
    requiredPermission: 'content:edit',
    availablePermissions: getRolePermissions(userRole)
  });
}
```

---

## Summary

✅ **5 distinct roles** with clear permission boundaries  
✅ **Reviewer role** for approval workflows  
✅ **Granular permissions** for all features  
✅ **Role hierarchy** for easy permission checks  
✅ **Type-safe** permission system  
✅ **Database-enforced** via RLS  
✅ **Easy to use** utilities and guards  

**Your RBAC system is production-ready with proper separation of concerns!** 🔐
