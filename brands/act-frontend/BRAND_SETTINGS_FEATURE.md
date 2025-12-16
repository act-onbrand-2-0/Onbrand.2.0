# Brand Guidelines Settings Feature

## Overview
Added an expandable/collapsible settings view for brand guidelines on the dashboard, allowing users to view and edit their extracted brand guidelines in a structured, organized way.

## Features Implemented

### 1. **BrandGuidelinesSettings Component** (`components/brand/BrandGuidelinesSettings.tsx`)
- **Expandable Sections**: Each guideline category (Voice, Copy, Visual, Messaging) can be expanded/collapsed
- **Inline Editing**: Fields can be edited directly with hover-to-edit functionality
- **Auto-Save**: Changes are automatically saved after 1 second of inactivity (debounced)
- **Save Status Indicator**: Shows "Saving..." and "Changes saved" feedback
- **Visual Organization**:
  - Color swatches for brand colors
  - Typography specimens
  - Spacing guidelines in grid format
  - Do's and Don'ts with visual indicators
  - Word choices with strikethrough/highlight

### 2. **Dashboard Integration** (`app/dashboard/page.tsx`)
- **Tabbed Interface**: Switch between "View Settings" and "Upload New"
- **Modal View**: Settings open in a modal overlay
- **Real-time Updates**: Changes reflect immediately in the UI

### 3. **API Endpoint** (`app/api/brands/[brandId]/guidelines/update/route.ts`)
- **POST /api/brands/[brandId]/guidelines/update**
- Updates approved brand guidelines in Supabase
- Validates input and handles errors

## User Flow

1. **View Guidelines**:
   - Click "Brand Settings" or "View Details" on dashboard
   - Modal opens showing current guidelines
   - Default view is "View Settings" tab

2. **Edit Guidelines**:
   - Hover over any field to see edit icon
   - Click edit icon to enter edit mode
   - Make changes in input/textarea
   - Click "Save" or "Cancel"
   - Changes auto-save to database after 1 second

3. **Upload New Guidelines**:
   - Switch to "Upload New" tab
   - Upload PDF and extract new guidelines
   - Approve to replace current guidelines

## Component Structure

```
BrandGuidelinesSettings
├── Save Status Indicator
├── Voice & Personality (Expandable)
│   ├── Personality Traits (badges)
│   ├── Tone (editable)
│   ├── Write As (editable)
│   └── Audience Level (editable)
├── Copy Guidelines (Expandable)
│   ├── Do's (list)
│   ├── Don'ts (list)
│   ├── Word Choices (grid)
│   ├── Required Phrases (badges)
│   └── Banned Phrases (badges)
├── Visual Guidelines (Expandable)
│   ├── Colors (swatches)
│   ├── Typography (specimens)
│   ├── Spacing (grid)
│   └── Logo (rules)
└── Messaging (Expandable)
    ├── Brand Pillars (badges)
    ├── Value Proposition (editable)
    ├── Tagline (editable)
    └── Boilerplate (editable)
```

## Technical Details

### Auto-Save Implementation
- Uses `useEffect` with debouncing (1 second delay)
- Prevents excessive API calls during rapid editing
- Shows visual feedback during save process

### State Management
- Local state for immediate UI updates
- Callback to parent for database persistence
- Optimistic updates for better UX

### Styling
- Tailwind CSS for all styling
- Consistent color coding:
  - Green for "Do's" and positive items
  - Red for "Don'ts" and negative items
  - Blue for neutral/informational items
  - Purple for personality/brand traits

## Next Steps (Optional Enhancements)

1. **Add/Remove Items**: Allow users to add new rules, colors, etc.
2. **Bulk Edit Mode**: Edit multiple fields at once
3. **Version History**: Track changes over time
4. **Export**: Download guidelines as PDF or JSON
5. **Validation**: Add field validation for colors (hex format), etc.
6. **Search**: Search within guidelines
7. **Comparison View**: Compare current vs. previous versions

## Files Modified/Created

### Created:
- `components/brand/BrandGuidelinesSettings.tsx` - Main settings component
- `app/api/brands/[brandId]/guidelines/update/route.ts` - Update API endpoint
- `BRAND_SETTINGS_FEATURE.md` - This documentation

### Modified:
- `app/dashboard/page.tsx` - Added settings view integration
- `lib/ai/agent.ts` - Fixed AI SDK v5 compatibility issues
