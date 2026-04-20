# Professional Page Styling Guide

## Overview

The `pages.css` file provides a comprehensive, professional styling system for all pages in the Smart Campus Operations Hub. It includes a cohesive dark theme with semantic color system, responsive design, and reusable component styles.

## Design System

### Color Palette

**Primary Colors:**
- `--page-bg`: #0d1117 - Main background
- `--page-surface`: #161b22 - Card/surface background
- `--page-primary`: #58a6ff - Primary accent color
- `--page-text`: #e6edf3 - Primary text color
- `--page-text-secondary`: #8b949e - Secondary text color

**Status Colors:**
- `--page-success`: #3fb950 - Success/approved
- `--page-warning`: #d29922 - Warning/pending
- `--page-danger`: #f85149 - Danger/rejected/error

### Spacing Scale

```
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 12px
--spacing-lg: 16px
--spacing-xl: 24px
--spacing-2xl: 32px
--spacing-3xl: 48px
```

## Component Usage Examples

### Page Container

```html
<div class="page-container">
  <!-- Page content goes here -->
</div>
```

The page container provides:
- Full viewport height background
- Gradient background with subtle accent gradients
- Proper padding and overflow handling
- Z-index layering with decorative background elements

### Page Header

```html
<div class="page-header">
  <h1>Page Title</h1>
  <p class="subtitle">Descriptive subtitle</p>
  <div class="header-actions">
    <button class="btn-primary">Primary Action</button>
    <button class="btn-ghost">Secondary Action</button>
  </div>
</div>
```

### Cards & Panels

```html
<div class="card">
  <div class="card-header">
    <h3>Card Title</h3>
    <button class="btn-ghost">Action</button>
  </div>
  <div class="card-body">
    Card content goes here
  </div>
  <div class="card-footer">
    <button class="btn-primary">Save</button>
    <button class="btn-ghost">Cancel</button>
  </div>
</div>
```

### Forms

```html
<form>
  <div class="form-group">
    <label for="email">Email Address</label>
    <input type="email" id="email" placeholder="Enter email" />
  </div>

  <div class="form-group">
    <label for="message">Message</label>
    <textarea id="message" placeholder="Enter message"></textarea>
  </div>

  <div class="form-group">
    <label for="category">Category</label>
    <select id="category">
      <option>Select category</option>
      <option>Option 1</option>
      <option>Option 2</option>
    </select>
  </div>
</form>
```

### Buttons

```html
<!-- Primary Button -->
<button class="btn-primary">Primary Action</button>

<!-- Success Button -->
<button class="btn-success">Approve</button>

<!-- Danger Button -->
<button class="btn-danger">Delete</button>

<!-- Ghost Button -->
<button class="btn-ghost">Cancel</button>
```

### Badges

```html
<!-- Success Badge -->
<span class="badge badge-success">Approved</span>

<!-- Pending Badge -->
<span class="badge badge-pending">Pending</span>

<!-- Danger Badge -->
<span class="badge badge-danger">Rejected</span>

<!-- Info Badge -->
<span class="badge badge-info">New</span>
```

### Alerts

```html
<!-- Success Alert -->
<div class="alert alert-success">
  <div class="alert-icon">✓</div>
  <div class="alert-content">
    <div class="alert-title">Success</div>
    <div class="alert-message">Operation completed successfully</div>
  </div>
</div>

<!-- Error Alert -->
<div class="alert alert-danger">
  <div class="alert-icon">⚠</div>
  <div class="alert-content">
    <div class="alert-title">Error</div>
    <div class="alert-message">Something went wrong</div>
  </div>
</div>

<!-- Warning Alert -->
<div class="alert alert-warning">
  <div class="alert-icon">!</div>
  <div class="alert-content">
    <div class="alert-title">Warning</div>
    <div class="alert-message">Please review before proceeding</div>
  </div>
</div>

<!-- Info Alert -->
<div class="alert alert-info">
  <div class="alert-icon">ℹ</div>
  <div class="alert-content">
    <div class="alert-title">Information</div>
    <div class="alert-message">This is an informational message</div>
  </div>
</div>
```

### Tables

```html
<div class="table-wrapper">
  <table class="table">
    <thead>
      <tr>
        <th>Column 1</th>
        <th>Column 2</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Data 1</td>
        <td>Data 2</td>
        <td><span class="badge badge-success">Active</span></td>
        <td>
          <button class="btn-ghost">Edit</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Modals

```html
<div class="modal-overlay">
  <div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">Modal Title</h2>
      <button class="modal-close">×</button>
    </div>
    <div class="modal-body">
      Modal content goes here
    </div>
    <div class="modal-footer">
      <button class="btn-ghost">Cancel</button>
      <button class="btn-primary">Save</button>
    </div>
  </div>
</div>
```

### Sections

```html
<div class="section">
  <h2 class="section-title">Section Title</h2>
  <p class="section-subtitle">Optional description text</p>
  <!-- Section content -->
</div>

<div class="divider"></div>

<div class="section">
  <!-- Another section -->
</div>
```

### Grid Layouts

```html
<!-- Auto-responsive grid (3 columns on large screens, 1 on mobile) -->
<div class="grid">
  <div class="card">Item 1</div>
  <div class="card">Item 2</div>
  <div class="card">Item 3</div>
</div>

<!-- Explicit 2-column grid -->
<div class="grid-2">
  <div class="card">Item 1</div>
  <div class="card">Item 2</div>
</div>

<!-- Explicit 3-column grid -->
<div class="grid-3">
  <div class="card">Item 1</div>
  <div class="card">Item 2</div>
  <div class="card">Item 3</div>
</div>
```

### Flexbox Utilities

```html
<!-- Basic flex row with gap -->
<div class="flex">
  <div class="card">Item 1</div>
  <div class="card">Item 2</div>
</div>

<!-- Flex column -->
<div class="flex flex-col">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- Space between -->
<div class="flex flex-between">
  <span>Label</span>
  <span>Value</span>
</div>

<!-- Center content -->
<div class="flex flex-center">
  <div>Centered content</div>
</div>
```

## Spacing & Margin Classes

### Margin Top
- `.mt-0`, `.mt-xs`, `.mt-sm`, `.mt-md`, `.mt-lg`, `.mt-xl`

### Margin Bottom
- `.mb-0`, `.mb-xs`, `.mb-sm`, `.mb-md`, `.mb-lg`, `.mb-xl`

### Padding
- `.p-0`, `.p-xs`, `.p-sm`, `.p-md`, `.p-lg`, `.p-xl`

### Gap (for flex/grid)
- `.gap-xs`, `.gap-sm`, `.gap-md`, `.gap-lg`, `.gap-xl`

## Border Radius

- `.rounded-sm` - 4px
- `.rounded-md` - 6px
- `.rounded-lg` - 8px
- `.rounded-xl` - 12px

## Shadow Utilities

- `.shadow-sm` - Small shadow
- `.shadow-md` - Medium shadow
- `.shadow-lg` - Large shadow
- `.shadow-xl` - Extra large shadow

## Text Utilities

- `.text-center` - Center align text
- `.text-muted` - Secondary text color
- `.text-small` - Smaller text (0.85rem)
- `.text-bold` - Bold text (600 weight)

## Visibility Utilities

- `.hidden` - Display none
- `.visible` - Display block
- `.pointer-events-none` - Disable pointer events
- `.cursor-pointer` - Pointer cursor

## Responsive Design

The CSS includes media queries for:

- **Large screens (> 1024px)**: Default styling
- **Tablets (≤ 1024px)**: Adjusted spacing and typography
- **Mobile (≤ 768px)**: Full responsive layout

### Mobile Adjustments

- Single column grids
- Full-width buttons
- Reduced padding and spacing
- Stacked flex layouts
- Optimized modal sizing

## Transitions

The system includes three transition speeds:

- `.transition-fast`: 0.15s (quick interactions)
- `.transition-base`: 0.3s (default animations)
- `.transition-slow`: 0.5s (emphasis animations)

## Dark Mode Support

All colors are optimized for dark mode. The color tokens in CSS variables ensure consistency across the entire application.

## Best Practices

1. **Always use semantic HTML**: Use `<button>` for buttons, `<label>` with inputs, etc.
2. **Combine classes**: Use utility classes to build components
3. **Maintain consistency**: Use the spacing and color scales consistently
4. **Test responsiveness**: Check mobile, tablet, and desktop views
5. **Accessibility**: Ensure proper contrast and ARIA labels
6. **Performance**: Limit custom styles; prefer CSS classes

## Example: Complete Page

```html
<div class="page-container">
  <!-- Header -->
  <div class="page-header">
    <h1>Bookings</h1>
    <p class="subtitle">Manage resource bookings and reservations</p>
    <div class="header-actions">
      <button class="btn-primary">New Booking</button>
      <button class="btn-ghost">Export</button>
    </div>
  </div>

  <!-- Alerts -->
  <div class="alert alert-info">
    <div class="alert-icon">ℹ</div>
    <div class="alert-content">
      <div class="alert-message">You have 3 pending approvals</div>
    </div>
  </div>

  <!-- Filters Section -->
  <div class="card mb-lg">
    <div class="card-header">
      <h3>Filters</h3>
    </div>
    <div class="grid-3">
      <div class="form-group">
        <label>Resource Type</label>
        <select>
          <option>All Types</option>
          <option>Lab</option>
          <option>Meeting Room</option>
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select>
          <option>All Status</option>
          <option>Pending</option>
          <option>Approved</option>
        </select>
      </div>
      <div class="form-group">
        <label>&nbsp;</label>
        <button class="btn-primary" style="width: 100%;">Apply Filters</button>
      </div>
    </div>
  </div>

  <!-- Table Section -->
  <div class="section">
    <h2 class="section-title">Bookings List</h2>
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Resource</th>
            <th>Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>#BK001</td>
            <td>Lab A</td>
            <td>2026-04-10</td>
            <td><span class="badge badge-pending">Pending</span></td>
            <td>
              <button class="btn-ghost">Review</button>
            </td>
          </tr>
          <tr>
            <td>#BK002</td>
            <td>Meeting Room B</td>
            <td>2026-04-12</td>
            <td><span class="badge badge-success">Approved</span></td>
            <td>
              <button class="btn-ghost">View</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
```

## Support

For issues or questions about the styling system, refer to the design tokens in `pages.css` or contact the development team.
