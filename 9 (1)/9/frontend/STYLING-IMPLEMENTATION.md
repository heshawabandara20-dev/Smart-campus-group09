# Page Styling Implementation Guide

This document outlines how to apply the professional CSS styling from `pages.css` to each page in the Smart Campus Operations Hub.

## Pages Overview

### 1. LoginPage (`LoginPage.tsx`)

**Current State**: Uses inline styles with custom color scheme
**Recommended Changes**:
- Wrap entire login form in a `.page-container`
- Use `.card` for the login card wrapper
- Replace inline button styles with `.btn-primary` and `.btn-ghost`
- Use `.alert-success` and `.alert-danger` for messages
- Apply `.form-group` and labels for form inputs

**Structure Example**:
```tsx
<div class="page-container">
  <div class="card" style={{ maxWidth: '400px', margin: '0 auto' }}>
    <div class="card-header">
      <h2 class="modal-title">Welcome back</h2>
    </div>
    <div class="card-body">
      {/* Login form */}
      <button class="btn-primary">Sign in with Google</button>
    </div>
  </div>
</div>
```

**CSS Classes to Apply**:
- `.page-container` - Main container
- `.card` - Form card
- `.form-group` - Form fields
- `.btn-primary` - Google login button
- `.alert-success` / `.alert-danger` - Status messages
- `.badge` - If adding role indicators

---

### 2. RegisterPage (`RegisterPage.tsx`)

**Current State**: Similar to LoginPage with inline styles
**Recommended Changes**:
- Same structure as LoginPage
- Use form group styling for registration fields
- Add `.form-group` for each field (email, password, etc.)
- Use consistent button styling

**CSS Classes to Apply**:
- `.page-container` - Main container
- `.card` - Registration card
- `.form-group` - Registration form fields
- `.btn-primary` - Submit button
- `.alert-danger` - Error messages
- `.divider` - Using text divider between sections

---

### 3. Dashboard (`Dashboard.tsx`)

**Current State**: Routing page, minimal styling needed
**Recommended Changes**:
- If redirects immediately, no styling needed
- If displays a loading page: use `.page-container` with centered content

**CSS Classes to Apply**:
- `.page-container` - If showing content
- `.flex-center` - For centering spinner/loader

---

### 4. UserDashboard (`UserDashboard.tsx`)

**Current State**: Uses inline style definitions with custom components
**Recommended Changes** - Major refactor opportunity:

This page has many components that should use CSS classes:

1. **Page Layout**:
```tsx
// Replace root container
<div class="page-container">
  {/* Header */}
  <div class="page-header">
    <h1>Dashboard</h1>
    <div class="header-actions">
      <button class="btn-primary">New Booking</button>
      <button class="btn-primary">Create Ticket</button>
      <button class="btn-orange">Logout</button>
    </div>
  </div>
  
  {/* Notifications Alert */}
  {unread > 0 && (
    <div class="alert alert-info">
      <div class="alert-icon">ℹ</div>
      <div class="alert-content">
        <div class="alert-title">Unread Notifications</div>
        <div class="alert-message">You have {unread} unread notifications</div>
      </div>
    </div>
  )}
  
  {/* Content */}
  <div class="section">
    {/* Tabs styling */}
  </div>
</div>
```

2. **Tabs Section**:
```tsx
<div class="section">
  <div class="flex gap-md mb-lg">
    <button 
      class={`btn ${tab === 0 ? 'btn-primary' : 'btn-ghost'}`}
      onClick={() => setTab(0)}
    >
      Resources
    </button>
    <button 
      class={`btn ${tab === 1 ? 'btn-primary' : 'btn-ghost'}`}
      onClick={() => setTab(1)}
    >
      Bookings
    </button>
    <button 
      class={`btn ${tab === 2 ? 'btn-primary' : 'btn-ghost'}`}
      onClick={() => setTab(2)}
    >
      Tickets
    </button>
  </div>
</div>
```

3. **Cards**:
```tsx
<div class="card">
  <div class="card-header">
    <h3>Resources</h3>
    <button class="btn-primary">New Resource</button>
  </div>
  <div class="card-body">
    {/* Content */}
  </div>
</div>
```

4. **Modals**:
Replace inline modal styles with:
```tsx
<div class="modal-overlay">
  <div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">Create Booking</h2>
      <button class="modal-close" onClick={onClose}>×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Resource</label>
        <select>...</select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost">Cancel</button>
      <button class="btn-primary">Create</button>
    </div>
  </div>
</div>
```

5. **Tables**:
Use `.table-wrapper` and `.table` classes

6. **Badges**:
Replace with `.badge` classes:
```tsx
<span class="badge badge-success">Approved</span>
<span class="badge badge-pending">Pending</span>
<span class="badge badge-danger">Rejected</span>
```

---

### 5. AdminDashboard (`AdminDashboard.tsx`)

**Current State**: Similar structure to UserDashboard
**Recommended Changes**:
- Apply same CSS class refactoring as UserDashboard
- Use table styling for admin-specific lists
- Add management-specific buttons with appropriate styles
- Use alert styling for admin alerts and notifications

**CSS Classes to Apply**:
- `.page-container`, `.page-header`
- `.card`, `.card-header`, `.card-body`, `.card-footer`
- `.table-wrapper`, `.table`
- `.modal-overlay`, `.modal`
- `.form-group`, `.badge`
- `.alert` variants
- `.btn-*` variants

---

### 6. Placeholder Pages (`AdminDashboardPlaceholder.tsx`, `UserDashboardPlaceholder.tsx`)

**Current State**: Minimal content
**Recommended Changes**:
- Use `.page-container` with centered message
- Use `.card` for placeholder content
- Use `.btn-ghost` for action links

---

## Migration Priority

**Phase 1 (High Priority)**:
1. LoginPage
2. RegisterPage
3. UserDashboard (major refactor)

**Phase 2 (Medium Priority)**:
4. AdminDashboard
5. Dashboard

**Phase 3 (Low Priority)**:
6. Placeholder pages

## Quick Implementation Steps

1. **Import the CSS**: Already added to `main.tsx`
2. **Replace Inline Styles**: 
   - Search for `style={{` patterns
   - Replace with appropriate CSS classes
   - Keep complex styles inline if needed
3. **Test Responsiveness**: Verify on mobile, tablet, desktop
4. **Check Consistency**: Ensure all pages follow the same pattern

## Benefits of Migration

- ✅ Consistent professional appearance
- ✅ Easier maintenance and updates
- ✅ Better performance (CSS classes vs inline styles)
- ✅ Responsive design built-in
- ✅ Dark theme support
- ✅ Improved developer experience
- ✅ Smaller component file sizes

## Example Conversion

**Before (Inline Styles)**:
```tsx
const styles: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', display: 'flex', ... },
  card: { background: '#161b22', border: '1px solid ...', ... }
};

return <div style={styles.root}>
  <div style={styles.card}>Content</div>
</div>
```

**After (CSS Classes)**:
```tsx
return <div class="page-container">
  <div class="card">Content</div>
</div>
```

## Testing Checklist

- [ ] Page displays correctly on desktop (1920px+)
- [ ] Page displays correctly on tablet (768px - 1024px)
- [ ] Page displays correctly on mobile (320px - 768px)
- [ ] All buttons are interactive and styled correctly
- [ ] Form inputs are properly styled and focused
- [ ] Modals are properly centered and styled
- [ ] Tables are responsive and readable
- [ ] Badges display correct colors for status
- [ ] Alerts are clearly visible and styled
- [ ] No console errors related to styling

## Next Steps

1. Review the `CSS-GUIDE.md` for detailed component examples
2. Start with LoginPage as a simple test case
3. Migrate UserDashboard for the best ROI
4. Follow up with AdminDashboard
5. Test thoroughly across devices

---

For questions or issues with styling, refer to `CSS-GUIDE.md` or check `pages.css` for the design tokens.
