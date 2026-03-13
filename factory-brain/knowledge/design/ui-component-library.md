# UI Component Library — Copy-Paste Ready Templates

*Every component exactly as Apple designs them — ready to use in any SaaS.*

---

## Part 1: Buttons

### Primary Button (Main Action)
```typescript
<button className="
  bg-apple-primary text-white
  px-4 py-2 rounded-lg
  font-semibold text-sm
  hover:bg-apple-primary-dark
  active:scale-95
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-all duration-200
">
  Get Started
</button>
```

### Secondary Button (Alternative)
```typescript
<button className="
  bg-apple-surface text-apple-text-primary
  px-4 py-2 rounded-lg
  font-semibold text-sm
  border border-apple-border
  hover:bg-gray-100 dark:hover:bg-gray-900
  active:scale-95
  disabled:opacity-50
  transition-all duration-200
">
  Learn More
</button>
```

### Icon Button
```typescript
<button className="
  w-10 h-10
  rounded-lg
  flex items-center justify-center
  hover:bg-apple-surface
  active:bg-apple-border
  transition-colors duration-200
">
  🔍
</button>
```

---

## Part 2: Forms

### Text Input
```typescript
<input
  type="text"
  placeholder="Enter your email"
  className="
    w-full
    bg-white dark:bg-apple-dark-surface
    border border-apple-border dark:border-apple-dark-border
    rounded-lg px-3 py-2
    text-apple-text-primary dark:text-white
    placeholder:text-apple-text-tertiary
    focus:outline-none
    focus:ring-2 focus:ring-apple-primary focus:ring-offset-0
    hover:border-apple-text-secondary
    transition-all duration-200
  "
/>
```

### Select Dropdown
```typescript
<select className="
  w-full
  bg-white dark:bg-apple-dark-surface
  border border-apple-border dark:border-apple-dark-border
  rounded-lg px-3 py-2
  text-apple-text-primary dark:text-white
  focus:outline-none focus:ring-2 focus:ring-apple-primary
  hover:border-apple-text-secondary
  transition-all duration-200
  appearance-none
  cursor-pointer
">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

### Textarea
```typescript
<textarea
  placeholder="Type your message..."
  className="
    w-full
    bg-white dark:bg-apple-dark-surface
    border border-apple-border dark:border-apple-dark-border
    rounded-lg px-3 py-2
    text-apple-text-primary dark:text-white
    placeholder:text-apple-text-tertiary
    focus:outline-none
    focus:ring-2 focus:ring-apple-primary
    resize-none
    transition-all duration-200
  "
  rows="4"
/>
```

### Checkbox
```typescript
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    className="
      w-5 h-5
      rounded border-2 border-apple-border
      checked:border-apple-primary checked:bg-apple-primary
      focus:ring-2 focus:ring-apple-primary focus:ring-offset-2
      cursor-pointer
      transition-all duration-200
    "
  />
  <span className="text-body text-apple-text-primary">
    I agree to terms
  </span>
</label>
```

### Toggle Switch
```typescript
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    className="
      sr-only
      peer
    "
  />
  <div className="
    relative w-12 h-7
    bg-apple-text-quaternary peer-checked:bg-apple-success
    rounded-full
    transition-colors duration-200
    after:content-['']
    after:absolute after:top-1 after:left-1
    after:bg-white
    after:rounded-full
    after:w-5 after:h-5
    after:transition-transform duration-200
    peer-checked:after:translate-x-5
  " />
</label>
```

---

## Part 3: Cards & Containers

### Basic Card
```typescript
<div className="
  bg-white dark:bg-apple-dark-surface
  border border-apple-border dark:border-apple-dark-border
  rounded-xl p-6
  hover:shadow-elevation-1
  transition-all duration-200
">
  <h3 className="text-headline font-semibold mb-2">
    Card Title
  </h3>
  <p className="text-body text-apple-text-secondary">
    Card description goes here.
  </p>
</div>
```

### Elevated Card
```typescript
<div className="
  bg-white dark:bg-apple-dark-surface
  rounded-xl p-6
  shadow-elevation-1 hover:shadow-elevation-2
  transition-shadow duration-200
">
  {/* Content */}
</div>
```

### Card Grid
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map((item) => (
    <div key={item.id} className="
      bg-white dark:bg-apple-dark-surface
      border border-apple-border dark:border-apple-dark-border
      rounded-xl p-6
      hover:shadow-elevation-1
      transition-all duration-200
    ">
      {/* Card content */}
    </div>
  ))}
</div>
```

---

## Part 4: Navigation

### Top Navigation Bar
```typescript
<header className="
  border-b border-apple-border dark:border-apple-dark-border
  bg-white dark:bg-apple-dark-surface
  sticky top-0
  backdrop-blur-sm
  z-40
">
  <nav className="
    max-w-7xl mx-auto
    px-6 py-4
    flex justify-between items-center
  ">
    <h1 className="text-headline font-semibold">Logo</h1>
    <ul className="flex gap-8">
      {['Home', 'Features', 'Pricing', 'Blog'].map((item) => (
        <li key={item}>
          <a href="#" className="
            text-body text-apple-text-secondary
            hover:text-apple-text-primary
            transition-colors duration-200
          ">
            {item}
          </a>
        </li>
      ))}
    </ul>
  </nav>
</header>
```

### Breadcrumbs
```typescript
<nav className="flex items-center gap-2 text-caption text-apple-text-secondary">
  <a href="/" className="hover:text-apple-text-primary">Home</a>
  <span>/</span>
  <a href="/products" className="hover:text-apple-text-primary">Products</a>
  <span>/</span>
  <span className="text-apple-text-primary">Details</span>
</nav>
```

---

## Part 5: Modals & Dialogs

### Alert Dialog
```typescript
<div className="
  fixed inset-0
  bg-black/50 backdrop-blur-sm
  flex items-center justify-center
  z-50
">
  <div className="
    bg-white dark:bg-apple-dark-surface
    rounded-2xl
    p-8
    max-w-md w-full mx-4
    shadow-elevation-4
  ">
    <h2 className="text-title font-semibold mb-2">
      Confirm Action?
    </h2>
    <p className="text-body text-apple-text-secondary mb-6">
      This action cannot be undone.
    </p>
    <div className="flex gap-4">
      <button className="
        flex-1
        bg-apple-surface text-apple-text-primary
        py-2 px-4 rounded-lg
        hover:bg-gray-100
        transition-colors
      ">
        Cancel
      </button>
      <button className="
        flex-1
        bg-apple-danger text-white
        py-2 px-4 rounded-lg
        hover:bg-red-600
        transition-colors
      ">
        Delete
      </button>
    </div>
  </div>
</div>
```

---

## Part 6: Lists & Tables

### Simple List
```typescript
<ul className="space-y-2">
  {items.map((item) => (
    <li key={item.id} className="
      bg-white dark:bg-apple-dark-surface
      border border-apple-border dark:border-apple-dark-border
      rounded-lg px-4 py-3
      flex justify-between items-center
      hover:bg-apple-surface dark:hover:bg-apple-dark-border
      transition-colors duration-200
    ">
      <span>{item.name}</span>
      <span className="text-apple-text-tertiary">{item.date}</span>
    </li>
  ))}
</ul>
```

### Data Table
```typescript
<table className="w-full">
  <thead className="border-b border-apple-border">
    <tr>
      <th className="text-left py-3 px-4 font-semibold text-apple-text-primary">
        Name
      </th>
      <th className="text-left py-3 px-4 font-semibold text-apple-text-primary">
        Email
      </th>
      <th className="text-left py-3 px-4 font-semibold text-apple-text-primary">
        Status
      </th>
    </tr>
  </thead>
  <tbody>
    {rows.map((row) => (
      <tr key={row.id} className="
        border-b border-apple-border
        hover:bg-apple-surface
        transition-colors
      ">
        <td className="py-4 px-4">{row.name}</td>
        <td className="py-4 px-4">{row.email}</td>
        <td className="py-4 px-4">
          <span className={`
            px-3 py-1 rounded-full text-caption font-semibold
            ${row.status === 'active' 
              ? 'bg-green-100 text-apple-success'
              : 'bg-gray-100 text-apple-text-tertiary'
            }
          `}>
            {row.status}
          </span>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## Part 7: Loading & Empty States

### Skeleton Loader
```typescript
<div className="space-y-4">
  {[...Array(3)].map((_, i) => (
    <div key={i} className="
      bg-apple-surface dark:bg-apple-dark-border
      rounded-lg h-12
      animate-pulse
    " />
  ))}
</div>
```

### Empty State
```typescript
<div className="
  text-center
  py-16
  px-4
">
  <div className="text-6xl mb-4">📭</div>
  <h3 className="text-title font-semibold mb-2">
    No items yet
  </h3>
  <p className="text-body text-apple-text-secondary mb-6">
    Create your first item to get started.
  </p>
  <button className="
    bg-apple-primary text-white
    px-6 py-2 rounded-lg
    font-semibold
    hover:bg-apple-primary-dark
    transition-colors
  ">
    Create Item
  </button>
</div>
```

---

## Part 8: Copy-Paste Hero Section

```typescript
export function HeroSection() {
  return (
    <section className="bg-white py-24 md:py-48">
      <div className="max-w-4xl mx-auto text-center px-4">
        <h1 className="
          text-5xl md:text-6xl lg:text-7xl
          font-bold
          text-apple-text-primary
          mb-6
          tracking-tight
          leading-tight
        ">
          The future of work is here
        </h1>
        
        <p className="
          text-xl md:text-2xl
          text-apple-text-secondary
          mb-12
          leading-relaxed
        ">
          Powerful tools designed to work beautifully together.
        </p>
        
        <div className="flex gap-4 justify-center flex-wrap">
          <button className="
            bg-apple-primary text-white
            px-8 py-3 rounded-lg
            font-semibold
            hover:bg-apple-primary-dark
            active:scale-95
            transition-all duration-200
          ">
            Get Started Free
          </button>
          
          <button className="
            bg-apple-surface text-apple-text-primary
            border border-apple-border
            px-8 py-3 rounded-lg
            font-semibold
            hover:bg-gray-100
            transition-colors
          ">
            Watch Demo
          </button>
        </div>
      </div>
    </section>
  )
}
```

---

**Every SaaS factory-generated should use these components for pixel-perfect, professional appearance.**
