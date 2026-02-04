# Page Refactor Inventory

Complete functionality inventory of `src/routes/+page.svelte` before refactor.

## Imports

- `shiftStore` from `$lib/stores/shift`
- `themeStore`, `type Theme` from `$lib/stores/theme`
- `invalidateAll` from `$app/navigation`
- `untrack` from `svelte`
- Material Web: filled-button, outlined-button, filled-tonal-button, outlined-text-field, icon-button, checkbox, radio, outlined-select, select-option
- `ConfirmModal` from `$lib/components/ConfirmModal.svelte`
- `CloseRentalModal` from `$lib/components/CloseRentalModal.svelte`
- `EditRentalModal` from `$lib/components/EditRentalModal.svelte`
- `GuideSelector` from `$lib/components/GuideSelector.svelte`
- `flatpickr` + CSS

## State Variables

### Props
- `data` (from `$props()`) - server-loaded page data containing: products, trackedItems, categories, rentals, previousShiftRentals, guides, storeProducts, tourProducts, tourBookings, reservations

### Close Rental
- `closeRentalModalOpen`: boolean
- `selectedRentalToClose`: any

### Edit Rental
- `editRentalModalOpen`: boolean
- `selectedRentalToEdit`: any

### Shift
- `confirmEndShift`: boolean
- `showShiftSummary`: boolean
- `shiftSummary`: object | null (shiftStartedAt, rentalsCount, rentalsCash, rentalsCredit, rentalsUnpaid, activeRentalsCount, storeSalesCount, storeSalesTotal, tourBookingsCount, tourRevenue, tourCost, totalCash, totalCredit, totalRevenue)
- `cashCounted`: string
- `checklistItems`: Array<{id, label}>
- `closeChecklist`: Record<number, boolean>

### Store Sale
- `showStoreSaleModal`: boolean
- `selectedStoreProductId`: number | null
- `saleQuantity`: number (default 1)
- `saleError`: string

### Tour Booking
- `showTourBookingModal`: boolean
- `selectedTourProductId`: number | null
- `tourPax`: number (default 1)
- `tourActivityDate`: string
- `tourSelectedGuideId`: number | null
- `tourError`: string
- `showCloseTourModal`: boolean
- `selectedTourBookingToClose`: any
- `tourCloseCost`: string
- `tourCloseError`: string
- `confirmDeleteTourBooking`: boolean
- `pendingDeleteTourBookingId`: number | null

### Reservation
- `showReservationModal`: boolean
- `reservationProductId`: number | null
- `reservationTrackedItems`: Record<number, number[]>
- `reservationIncludedGenericItems`: Record<number, boolean>
- `reservationSearchQueries`: Record<number, string>
- `reservationQuantity`: number (default 1)
- `reservationCustomerName`, `reservationCustomerHotel`, `reservationCustomerPhone`, `reservationReason`: string
- `reservationFrom`, `reservationUntil`: string
- `reservationGuideId`: number | null
- `reservationFromInput`, `reservationUntilInput`: HTMLInputElement | null
- `reservationFromPicker`, `reservationUntilPicker`: flatpickr.Instance | null

### Theme
- `currentTheme`: Theme (default 'system')

### Conflict Override
- `showConflictModal`: boolean
- `conflictData`: any[]
- `conflictPasscode`: string
- `conflictPasscodeError`: string
- `pendingRentalPayload`: any

### Reservation-to-Rental
- `fromReservationId`: number | null

### Rental Form
- `showForm`: boolean
- `selectedProductId`: number | null
- `selectedTrackedItems`: Record<number, number[]>
- `includedGenericItems`: Record<number, boolean>
- `customerName`, `customerHotel`, `customerPhone`, `customerId`: string
- `rentalType`: string (default 'hourly')
- `rentalQuantity`: number (default 1)
- `selectedGuideId`: number | null
- `loading`: boolean
- `error`: string
- `searchQueries`: Record<number, string>

### Flatpickr (Tour)
- `activityDateInput`: HTMLInputElement | null
- `activityDatePicker`: flatpickr.Instance | null

## Derived Values

- `reservationProduct`: finds product by reservationProductId from data.products
- `reservationEquipment`: equipment array from reservationProduct
- `cashDifference`: () => number | null (cashCounted - shiftSummary.totalCash)
- `allChecklistComplete`: all checklist items checked or none exist
- `selectedProduct`: finds product by selectedProductId from data.products
- `productEquipment`: equipment array from selectedProduct
- `productPricing`: pricing object from selectedProduct
- `selectedStoreProduct`: finds store product by selectedStoreProductId
- `hasHourlyOption`: boolean from productPricing.hourly
- `selectedTourProduct`: finds tour product by selectedTourProductId

## Effects

- Theme subscription: subscribes to themeStore, sets currentTheme
- Product form init: when selectedProductId changes, calls initProductForm
- Reservation product form init: when reservationProductId changes, calls initReservationProductForm

## Functions

### Theme
- `resolvedIsDark(theme)`: returns boolean for dark mode check

### Reservation
- `getFilteredTrackedItemsForReservation(categoryId)`: filters tracked items by category + search
- `initReservationProductForm(product)`: resets reservation form state for product
- `initReservationFlatpickr()`: creates flatpickr instances for from/until inputs
- `destroyReservationFlatpickr()`: destroys flatpickr instances
- `openReservationModal()`: resets all reservation state, opens modal
- `closeReservationModal()`: closes modal, destroys flatpickr
- `createReservation()`: POST /api/reservations
- `cancelReservation(id)`: PATCH /api/reservations {id, action:'cancel'}
- `startRentalFromReservation(reservation)`: pre-fills rental form from reservation data
- `formatReservationDate(date)`: formats date for display
- `isReservationExpired(until)`: checks if reservation expired

### Tour
- `initFlatpickr()`: creates flatpickr for activity date
- `destroyFlatpickr()`: destroys tour flatpickr
- `openTourBookingModal()`: resets tour state, opens modal
- `closeTourBookingModal()`: closes modal, destroys flatpickr
- `createTourBooking()`: POST /api/tour-bookings
- `promptCloseTourBooking(booking)`: opens close tour modal
- `executeCloseTourBooking()`: PATCH /api/tour-bookings {id, action:'close', cost}
- `promptDeleteTourBooking(id)`: sets pending delete, opens confirm
- `executeDeleteTourBooking()`: DELETE /api/tour-bookings {id}

### Shift
- `handleEndShift()`: GET /api/shifts/summary + GET /api/closing-checklist, opens shift summary
- `formatShiftDuration(startedAt)`: returns "Xh Ym" string
- `executeEndShift()`: POST /api/shifts/close - downloads Excel or opens Google Sheet

### Store
- `createStoreSale()`: POST /api/store-sales

### Rental
- `verifyGuidePin(guideId, pin)`: POST /api/guides/verify
- `initProductForm(product)`: resets tracked items, generics, search queries
- `getFilteredTrackedItems(categoryId)`: filters available tracked items
- `getCategoryAvailability(categoryId)`: returns available quantity
- `resetForm()`: resets entire rental form
- `createRental()`: POST /api/rentals (handles 409 conflict)
- `overrideConflictAndCreateRental()`: POST /api/rentals with override params
- `promptCloseRental(id)`: opens close rental modal
- `promptEditRental(id)`: opens edit rental modal
- `executeEditRental(updateData)`: PATCH /api/rentals {id, action:'edit', ...}
- `executeCloseRental(returnData)`: PATCH /api/rentals {id, action:'close', returnData}
- `getElapsedTime(startedAt)`: returns "Xh Ym" elapsed string

## Template Sections

1. Logged-in shell (`{#if $shiftStore.isLoggedIn}`)
   - Header: title, error display, theme toggle, operator badge, End Shift button
   - Action bar: New Rental, New Reservation, Store Sale (if products), Tour Booking (if products), stat badges
   - Active Rentals section: grid of rental cards
   - Reservations section (if any): grid of reservation cards
   - Previous Shift Rentals section: grid of completed rental cards
   - Tour Bookings section (if any): grid of tour cards
2. Not logged in: login prompt card with link to /login
3. Modals: Create Rental, Shift Summary, Store Sale, Tour Booking, Close Tour, Conflict Override, Create Reservation
4. External components: ConfirmModal (delete tour), ConfirmModal (end shift), CloseRentalModal, EditRentalModal

## Types Used

- `EquipmentItem`: { type: string; itemId?: number; categoryId?: number; name: string; quantity?: number }
- `Pricing`: { hourly?: number; fullDay?: number }
- `Theme`: imported from '$lib/stores/theme'

## Component Extraction Plan

### Card Components (presentational)
- RentalCard: active rental display with customer, items, elapsed time, edit/close actions
- ReservationCard: reservation display with customer, items, dates, cancel/start actions
- TourBookingCard: tour booking with product, pax, dates, price, delete/close actions
- PreviousRentalCard: completed rental with customer, items, times, price

### Modal Components (own state)
- CreateRentalModal: rental form state, equipment selection, customer form
- StoreSaleModal: selectedStoreProductId, saleQuantity, saleError
- TourBookingModal: tour form state, flatpickr
- CloseTourBookingModal: tourCloseCost, tourCloseError
- CreateReservationModal: all reservation form state, flatpickr
- ConflictOverrideModal: conflictPasscode, conflictPasscodeError
- ShiftSummaryModal: cashCounted, closeChecklist, checklistItems

### Layout Components (events up)
- AppHeader: title, live shift timer, operator, theme toggle, end shift
- ActionBar: action buttons row
- TabStrip: tab navigation (Active | Reservations | Tours | History)

### Page-level coordination remains in +page.svelte
- data prop, tab state, loading/error, modal open/close orchestration, API call functions
