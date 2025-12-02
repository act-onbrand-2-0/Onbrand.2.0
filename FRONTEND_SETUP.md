# Frontend Setup & Testing Guide

✅ **Login and Dashboard UI built from Figma design!**

---

## 🎨 What Was Built

### **1. Login Page** (`/login`)
- Split-screen design (hero image left, form right)
- Email/password authentication
- **GitHub OAuth** (connected to your backend)
- Google OAuth button (UI only, ready for integration)
- Error handling and loading states
- Pixel-perfect match to Figma design

### **2. Dashboard** (`/dashboard`)
- User information display (email)
- Brand display (ACT)
- Role badge with color coding
- **Quota usage visualization**
  - Prompt tokens (with progress bar)
  - Image generation (with progress bar)
  - Workflow executions (with progress bar)
- Quick action buttons
- Sign out functionality

### **3. Auth Flow**
- Root (`/`) → Redirects to `/login`
- `/login` → Login page
- GitHub OAuth → `/auth/callback` → `/dashboard`
- Protected dashboard (redirects to login if not authenticated)

---

## 🚀 How to Run

### **Step 1: Install Dependencies**

```bash
cd brands/act-frontend
pnpm install
```

### **Step 2: Start the Dev Server**

```bash
pnpm dev
```

The app will be available at **http://localhost:3000**

---

## 🧪 How to Test

### **Test 1: GitHub OAuth Flow**

1. Visit **http://localhost:3000**
2. You'll be redirected to `/login`
3. Click **"Github"** button
4. Authenticate with GitHub
5. You'll be redirected to `/dashboard`
6. Check that you see:
   - ✅ Your email
   - ✅ Brand: ACT
   - ✅ Role badge (should be "User" initially)
   - ✅ Quota usage (all at 0% if fresh)

**This tests:**
- ✅ GitHub OAuth integration
- ✅ User creation in Supabase
- ✅ Brand assignment (ACT)
- ✅ Role assignment
- ✅ Quota display

---

### **Test 2: Promote to Company Admin**

After signing in, promote yourself to Company Admin:

**Via Supabase SQL Editor:**
```sql
-- Find your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Promote to Company Admin
UPDATE public.brand_users
SET role = 'company_admin'
WHERE user_id = 'YOUR_USER_ID' AND brand_id = 'act';
```

Then refresh the dashboard - you should see **"Company Admin"** badge in purple!

---

### **Test 3: Quota Display**

The dashboard shows three quota types:
- **Prompt Tokens**: For AI chat
- **Image Generation**: For AI images
- **Workflow Executions**: For n8n automations

**To test quota visualization:**

```sql
-- Add some usage
UPDATE public.brand_quotas
SET 
  prompt_tokens_used = 50000,
  image_generation_used = 50,
  workflow_executions_used = 200
WHERE brand_id = 'act';
```

Refresh the dashboard - you should see progress bars!

---

### **Test 4: Sign Out**

1. Click **"Sign Out"** button in header
2. You should be redirected to `/login`
3. Session should be cleared

---

## 🎨 What the Design Looks Like

### **Login Page**
```
┌─────────────────┬─────────────────┐
│                 │  Welcome back   │
│                 │                 │
│   Hero Image    │  Email input    │
│   (Robot 3D)    │  Password input │
│                 │  [Forgot pwd?]  │
│   Dark BG       │  [Sign in]      │
│                 │                 │
│                 │  Or continue:   │
│                 │  [Google][Github]│
│                 │                 │
│                 │  Sign up link   │
└─────────────────┴─────────────────┘
```

### **Dashboard**
```
Header: [ACT 2.0]              [Sign Out]

Welcome back!
Here's your account overview

┌──────────┬──────────┬──────────┐
│ User Info│  Brand   │   Role   │
│ email@.. │   ACT    │ [Badge]  │
└──────────┴──────────┴──────────┘

Quota Usage
┌────────────────────────────────┐
│ Prompt Tokens  [===========   ]│
│ Images         [===           ]│
│ Workflows      [=====         ]│
└────────────────────────────────┘

Quick Actions
[Start Chat] [Generate] [Upload] [Settings]
```

---

## 🎯 What Each Page Tests

| Page | Tests |
|------|-------|
| **Login** | GitHub OAuth, Supabase auth, error handling |
| **Dashboard** | User data, brand assignment, role display, quota tracking |
| **Auth Callback** | OAuth flow, session creation, redirect |

---

## 📦 Dependencies Added

```json
{
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.1.0",
  "lucide-react": "^0.294.0",
  "class-variance-authority": "^0.7.0",
  "tailwindcss-animate": "^1.0.7"
}
```

---

## 🎨 Design System

### **Colors**
- Primary: Black (`#000000`)
- Background: White (`#FFFFFF`)
- Text: Gray-900
- Borders: Gray-300
- Focus: Black ring

### **Role Badge Colors**
```typescript
company_admin: Purple (bg-purple-100, text-purple-800)
owner: Blue (bg-blue-100, text-blue-800)
creator: Green (bg-green-100, text-green-800)
reviewer: Yellow (bg-yellow-100, text-yellow-800)
user: Gray (bg-gray-100, text-gray-800)
```

### **Quota Progress Colors**
- Green: < 70% used
- Yellow: 70-90% used
- Red: > 90% used

---

## 🔧 Configuration Files

### **Tailwind CSS** (`tailwind.config.ts`)
- Using Tailwind CSS v4
- shadcn/ui compatible
- Dark mode support
- Custom animations

### **shadcn/ui** (`components.json`)
- Configured for Next.js App Router
- RSC enabled
- TypeScript support
- CSS variables for theming

### **Global Styles** (`app/globals.css`)
- shadcn/ui CSS variables
- Light/dark theme support
- Proper HSL color values

---

## 🚨 Common Issues

### **Issue: Module not found errors**

```bash
cd brands/act-frontend
pnpm install
```

### **Issue: GitHub OAuth not working**

Check:
1. ✅ GitHub OAuth is configured in Supabase Dashboard
2. ✅ Callback URL is set to `http://localhost:3000/auth/callback`
3. ✅ Environment variables are correct

### **Issue: Quota not displaying**

Check:
1. ✅ User is assigned to ACT brand in `brand_users`
2. ✅ Quota exists for ACT brand in `brand_quotas`
3. ✅ Migration `20251201141400_update_roles_and_add_quotas.sql` applied

---

## 🎯 Next Steps

Now that you have a working login and dashboard:

### **Option 1: Add Chat Interface**
Build the chat UI to test:
- Conversation storage
- Message storage
- Quota deduction
- AI integration

### **Option 2: Add File Upload**
Build file upload to test:
- Supabase Storage
- Brand isolation
- Asset management

### **Option 3: Add More Features**
- User management (for admins)
- Quota top-up UI (for company admins)
- Settings page
- Analytics dashboard

---

## 📸 Screenshots

### **Login Page**
- Left: Dark background with 3D robot hero image
- Right: Clean white form with GitHub/Google OAuth

### **Dashboard**
- Header: ACT 2.0 logo + Sign Out button
- User cards: Email, Brand (ACT), Role badge
- Quota section: 3 progress bars with percentages
- Quick actions: 4 button tiles

---

## ✅ Checklist

Before testing, ensure:

- [ ] Dependencies installed (`pnpm install`)
- [ ] Dev server running (`pnpm dev`)
- [ ] Supabase URL and keys in `.env.local`
- [ ] GitHub OAuth configured in Supabase
- [ ] Database migrations applied
- [ ] ACT brand exists in database
- [ ] Quota exists for ACT brand

---

## 🎉 What Works Right Now

✅ **GitHub OAuth** - Users can sign in with GitHub  
✅ **Brand Assignment** - Auto-assigned to ACT  
✅ **Role Display** - Shows current role with color-coded badge  
✅ **Quota Display** - Shows token/image/workflow usage  
✅ **Responsive Design** - Works on desktop and mobile  
✅ **Loading States** - Shows loading during auth  
✅ **Error Handling** - Displays auth errors  
✅ **Sign Out** - Properly clears session  

---

## 🔗 Useful URLs

- **Frontend**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/dashboard
- **Supabase**: https://supabase.com/dashboard/project/pyvobennsmzyvtaceopn
- **GitHub**: https://github.com/act-onbrand-2-0/Onbrand.2.0

---

**Your frontend is ready to test! 🚀**

Start the dev server and visit http://localhost:3000 to see the Figma design come to life!
