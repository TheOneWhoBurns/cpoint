# Rental System - Implementation TODO

## Current State
- Basic SvelteKit app with Material Web components
- PostgreSQL + Drizzle ORM setup
- Operator shift login working
- Admin sections created but need fixes

---

## Schema Changes Needed

### productTypes table (categories)
Remove `codePrefix` and `attributes`. Add quantities for generic types:
```sql
CREATE TABLE product_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,                    -- "Surfboards", "Leashes"
    tracking_type TEXT NOT NULL,           -- "tracked" or "generic"
    total_quantity INTEGER DEFAULT 0,      -- for generic only
    available_quantity INTEGER DEFAULT 0,  -- for generic only
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### trackedItems table (individual items for tracked categories)
Keep as is:
```sql
CREATE TABLE tracked_items (
    id SERIAL PRIMARY KEY,
    product_type_id INTEGER REFERENCES product_types(id),
    code TEXT UNIQUE NOT NULL,       -- "SURF-001", store's identifier
    status TEXT DEFAULT 'available', -- "available", "rented", "blocked"
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### genericItems table - REMOVE
Generic quantities are now on productTypes directly. Delete this table.

### rentals table
Keep as is - stores items as JSONB array with pricing.

---

## Business Logic

### Categories (Equipment Types)
1. **Tracked category** (e.g., "Surfboards")
   - Each item is unique with its own code
   - Register items ONE BY ONE
   - Each item has status: available/rented/blocked
   - Example: Register SURF-001, SURF-002, SURF-003 individually

2. **Generic category** (e.g., "Leashes", "Wax")
   - Items are interchangeable, tracked by quantity
   - Register MULTIPLE at once ("add 8 leashes")
   - total_quantity and available_quantity on the category itself
   - Example: Leashes category has 8 total, 5 available

### Equipment Registration Flow
1. Create category: Enter name, select type (tracked/generic)
2. If tracked: Register items one by one with unique codes
3. If generic: Enter quantity to add (e.g., +8 leashes)

### Rental Flow
1. Create rental with:
   - Customer info (name, phone)
   - Equipment items (select from available)
   - Pricing (hourly rate optional, full day rate)
2. When rental created:
   - Tracked items: status -> "rented"
   - Generic items: decrement available_quantity
3. When rental completed:
   - Tracked items: status -> "available"
   - Generic items: increment available_quantity

---

## Files to Update

### 1. Schema: `src/lib/server/db/schema.ts`
- DONE: Removed codePrefix from productTypes
- DONE: Added totalQuantity, availableQuantity to productTypes
- DONE: Removed genericItems table
- TODO: Run `npx drizzle-kit push --force` to apply changes

### 2. Equipment API: `src/routes/api/equipment/+server.ts`
```typescript
// POST actions:
// - createCategory: {name, trackingType}
// - addTrackedItem: {categoryId, code} - for tracked categories
// - addGenericQuantity: {categoryId, quantity} - for generic categories

// Example createCategory:
if (action === 'createCategory') {
    const { name, trackingType } = body;
    const [created] = await db.insert(productTypes).values({
        name,
        trackingType,
        totalQuantity: 0,
        availableQuantity: 0
    }).returning();
    return json(created);
}

// Example addTrackedItem (for tracked categories only):
if (action === 'addTrackedItem') {
    const { categoryId, code } = body;
    // Verify category is tracked type
    const [created] = await db.insert(trackedItems).values({
        productTypeId: categoryId,
        code,
        status: 'available'
    }).returning();
    return json(created);
}

// Example addGenericQuantity (for generic categories only):
if (action === 'addGenericQuantity') {
    const { categoryId, quantity } = body;
    // Get current category
    const [cat] = await db.select().from(productTypes).where(eq(productTypes.id, categoryId));
    // Update quantities
    const [updated] = await db.update(productTypes).set({
        totalQuantity: cat.totalQuantity + quantity,
        availableQuantity: cat.availableQuantity + quantity
    }).where(eq(productTypes.id, categoryId)).returning();
    return json(updated);
}
```

### 3. Equipment Page: `src/routes/admin/equipment/+page.svelte`
UI should have:
1. **Create Category section:**
   - Name input
   - Type selector (tracked/generic radio buttons)
   - "Create Category" button

2. **Categories list** showing all categories with type

3. **Register Equipment section** (dynamic based on selected category):
   - If tracked category selected: Show code input, register one item
   - If generic category selected: Show quantity input, add multiple

### 4. Inventory Page: `src/routes/admin/inventory/+page.svelte`
Read-only view:
- List all tracked items with their codes and status
- List all generic categories with total/available quantities

### 5. Inventory Server: `src/routes/admin/inventory/+page.server.ts`
```typescript
export const load = async () => {
    const categories = await db.select().from(productTypes);
    const trackedItems = await db.select().from(trackedItems);
    return { categories, trackedItems };
};
```

### 6. Rentals API: `src/routes/api/rentals/+server.ts`
Update to handle new model:
- For tracked items: reference by trackedItem.id
- For generic items: reference by category.id with quantity

```typescript
// When creating rental, items array format:
items: [
    { type: 'tracked', itemId: 5, code: 'SURF-001', categoryName: 'Surfboards' },
    { type: 'generic', categoryId: 2, categoryName: 'Leashes', quantity: 1 }
]

// On rental create:
for (const item of items) {
    if (item.type === 'tracked') {
        await db.update(trackedItems)
            .set({ status: 'rented' })
            .where(eq(trackedItems.id, item.itemId));
    } else {
        await db.update(productTypes)
            .set({ availableQuantity: sql`available_quantity - ${item.quantity}` })
            .where(eq(productTypes.id, item.categoryId));
    }
}

// On rental complete (return equipment):
for (const item of rental.items) {
    if (item.type === 'tracked') {
        await db.update(trackedItems)
            .set({ status: 'available' })
            .where(eq(trackedItems.id, item.itemId));
    } else {
        await db.update(productTypes)
            .set({ availableQuantity: sql`available_quantity + ${item.quantity}` })
            .where(eq(productTypes.id, item.categoryId));
    }
}
```

### 7. Rentals Page: `src/routes/admin/rentals/+page.svelte`
Update equipment selection UI:
- Show available tracked items (status = 'available') grouped by category
- Show generic categories with available quantity
- Allow selecting tracked items individually
- Allow selecting generic items with quantity picker (max = availableQuantity)

---

## API Endpoints Summary

### Equipment
- `GET /api/equipment` - List all categories and tracked items
- `POST /api/equipment` with actions:
  - `createCategory`: {name, trackingType}
  - `addTrackedItem`: {categoryId, code}
  - `addGenericQuantity`: {categoryId, quantity}
- `PATCH /api/equipment` - Toggle category active status

### Rentals
- `GET /api/rentals` - List all rentals
- `POST /api/rentals` - Create rental {customer, items, pricing}
- `PATCH /api/rentals` - Complete rental {id, action: 'complete'}

---

## Testing Checklist

1. [ ] Create tracked category "Surfboards"
2. [ ] Register individual boards: SURF-001, SURF-002
3. [ ] Create generic category "Leashes"
4. [ ] Add 10 leashes to inventory
5. [ ] Verify inventory shows: 2 surfboards (available), 10 leashes
6. [ ] Create rental with SURF-001 + 1 leash, set $20/hr price
7. [ ] Verify SURF-001 status = rented, leashes available = 9
8. [ ] Complete rental
9. [ ] Verify SURF-001 status = available, leashes available = 10

---

## Commands

```bash
# Push schema changes
npx drizzle-kit push --force

# Run dev server
npm run dev

# View database
npx drizzle-kit studio
```
