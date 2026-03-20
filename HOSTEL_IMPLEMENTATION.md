# Hostel Section — Web Analysis & Mobile Implementation Guide

## Table of Contents
1. [Web App: Full Flow Overview](#1-web-app-full-flow-overview)
2. [Web App: Page-by-Page Breakdown](#2-web-app-page-by-page-breakdown)
3. [Web App: All API Calls](#3-web-app-all-api-calls)
4. [Mobile App: Current State](#4-mobile-app-current-state)
5. [Mobile App: What's Missing](#5-mobile-app-whats-missing)
6. [Mobile Implementation Plan](#6-mobile-implementation-plan)
7. [Screen-by-Screen Build Guide](#7-screen-by-screen-build-guide)
8. [Navigation Changes Required](#8-navigation-changes-required)
9. [Types & Hooks Required](#9-types--hooks-required)

---

## 1. Web App: Full Flow Overview

```
/hostels  (Landing — date picker + stay type tabs)
    │
    └──► /hostels/search?checkIn=&checkOut=&people=&location=&stayType=
              (Search Results — room cards with meal options + add to cart)
                    │
                    └──► /hostels/booking/:hostelId
                              (Booking Summary + Guest Form — calls POST /bookings/cart)
                                    │
                                    └──► /hostels/payment/:bookingId
                                              (Razorpay payment — 25% or 100%)
                                                    │
                                                    └──► /bookings  (on success)
                                                    └──► /hostels/confirmed/:id  (alt)
```

**State passed between screens:**
- URL search params → between landing and search
- `sessionStorage.hostelBookingData` → from search to booking summary
- `sessionStorage.cartPaymentData` → from booking summary to payment

---

## 2. Web App: Page-by-Page Breakdown

---

### Page 1: `/hostels` — Landing Page

**File:** `app/hostels/page.js`

**Purpose:** Entry point for hostel discovery. User selects stay type, location, and dates.

**State:**
```js
stayType         // "hostel" | "workstation"
checkInDate      // default: today
checkOutDate     // default: tomorrow
location         // hardcoded "Chikkamagaluru" (readonly)
trendingHostels  // top 3 fetched from GET /api/hostels on mount
```

**API calls:**
| Endpoint | Method | When | Purpose |
|----------|--------|------|---------|
| `GET /api/hostels` | GET | on mount | Load up to 3 trending hostels |

**Validation rules:**
- Location required
- Check-in required
- Check-out required
- Check-out must be after check-in
- Workstation stay type: minimum 7 nights enforced

**On search submit:** Navigates to:
```
/hostels/search?location=Chikkamagaluru&checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&people=1&stayType=hostel
```

**UI sections:**
- Orange hero banner with background image
- Stay Type tabs: `Hostels` | `Workstation`
- Read-only location input (Chikkamagaluru)
- Date pickers: Check-in / Check-out (calendar component)
- "Why Choose Us?" — 3-column feature grid
- Trending Hostels grid (up to 3 `HostelCard` components)
- Bottom CTA section

---

### Page 2: `/hostels/search` — Search Results

**File:** `app/hostels/search/page.js`

**Purpose:** Displays available rooms. User adds rooms to cart per meal option, then proceeds.

**URL params consumed:** `checkIn`, `checkOut`, `people`, `location`, `stayType`

**State:**
```js
hostels[]           // available hostel objects with rooms[] and pricing
cart[]              // hostelItems from backend cart
addingToCart        // loading flag per room
```

**API calls:**
| Endpoint | Method | When | Purpose |
|----------|--------|------|---------|
| `GET /api/hostels/available` | GET | on mount | Fetch available hostels |
| `GET /api/cart/details` | GET | on mount | Load existing cart |
| `POST /api/cart/hostels` | POST | on "Add" tap | Add room to cart |
| `PUT /api/cart/hostels/:itemId` | PUT | on qty change | Update cart item quantity |
| `DELETE /api/cart/hostels/:itemId` | DELETE | on remove | Remove cart item |

**Request body for add-to-cart:**
```json
{
  "hostelId": "abc123",
  "roomType": "dormitory",
  "mealOption": "bedOnly",
  "quantity": 1,
  "checkIn": "2026-03-20",
  "checkOut": "2026-03-21",
  "isWorkstation": false
}
```

**Price calculation (client-side):**
```js
subtotal = sum of cart hostelItems[i].totalPrice
gst      = subtotal × 0.05
total    = subtotal + gst
```

**On "Proceed" button:**
1. Saves `hostelBookingData` to `sessionStorage`:
```json
{
  "hostelId": "...",
  "checkIn": "2026-03-20",
  "checkOut": "2026-03-21",
  "people": 1,
  "stayType": "hostel",
  "selectedRooms": [{
    "roomType": "dormitory",
    "mealOption": "bedOnly",
    "quantity": 1,
    "pricePerNight": 450,
    "numberOfNights": 1,
    "totalPrice": 450,
    "hostelId": "...",
    "hostelName": "Happy Go Hostel"
  }],
  "pricing": {
    "basePrice": 450,
    "taxes": 22.5,
    "total": 472.5,
    "gstPercentage": 5
  },
  "nights": 1
}
```
2. Navigates to `/hostels/booking/:hostelId`

**UI sections:**
- Search criteria bar at top with "Modify Search" button
- Image gallery with lightbox modal
- For each hostel: image carousel, amenity chips
- Per hostel: room rows, each with 3 meal-option sub-rows:
  - `Bed Only` — price + `Add` button
  - `Bed + Breakfast` — price + `Add` button
  - `All Meals` — price + `Add` button
- Each `Add` becomes a `+/-` stepper once added
- "Beds remaining" badge (green < 5, orange < 10, red = 0)
- Amenities section
- Static guidelines section (check-in 1 PM / check-out 10 AM)
- Bottom sticky summary (mobile) / sidebar (desktop)
- "Proceed to Book" button

---

### Page 3: `/hostels/[id]` — Hostel Detail Page

**File:** `app/hostels/[id]/page.js`

**Purpose:** Alternative detail view (single hostel). Used when user taps a trending hostel card on the landing page.

**URL params:** `id` (hostel ID), query: `checkIn`, `checkOut`, `people`, `stayType`

**API calls:**
| Endpoint | Method | When | Purpose |
|----------|--------|------|---------|
| `GET /api/hostels/:id?checkIn=&checkOut=&people=&stayType=` | GET | on mount | Load hostel with pricing |

**State:**
```js
hostel                // full hostel object with rooms and pricing
selectedRooms         // { [roomId]: { quantity, priceOption } }
currentImageIndex     // hero carousel index
showAllImages         // boolean
```

**On "Proceed" button:** Same as search results — saves `hostelBookingData` → navigates to `/hostels/booking/:hostelId`

**UI:**
- Hero image with prev/next navigation arrows
- "View all X photos" button
- Hostel name, address, description
- Booking dates summary card
- Room cards with quantity selector per price option
- Tabs: Amenities | Guidelines | Policies
- "Getting Here" section with phone/email
- Sticky price summary sidebar with savings badge

---

### Page 4: `/hostels/booking/[id]` — Booking Summary & Guest Form

**File:** `app/hostels/booking/[id]/page.js`

**Purpose:** Full booking summary + guest details form. Submits to unified cart checkout.

**Data sources on mount:**
- `sessionStorage.hostelBookingData` → for selected rooms / pricing
- `GET /api/cart/details` → for full cart (bikes + hostels combined)
- `GET /api/hostels/:id` → for hostel display (name, image, policies)

**State:**
```js
hostel            // hostel object (display only)
bookingData       // parsed from sessionStorage.hostelBookingData
cartData          // full cart from API
guestDetails      // { name, email, mobile, specialRequests }
agreedToTerms     // boolean
errors            // form validation errors
```

**Form fields:**
- First Name + Last Name (split inputs, merged on submit as `name`)
- Phone (+91 prefix, 10 digits)
- Email
- Special Requests (optional textarea)

**Validation:** All fields except specialRequests required; terms must be accepted.

**On submit — API call:**
| Endpoint | Method | Body |
|----------|--------|------|
| `POST /api/bookings/cart` | POST | see below |

```json
{
  "guestDetails": {
    "name": "Full Name",
    "email": "user@example.com",
    "phone": "9999999999"
  },
  "specialRequests": "...",
  "partialPaymentPercentage": 25
}
```

**Response shape:**
```json
{
  "success": true,
  "data": {
    "paymentGroupId": "group_abc",
    "bookings": [
      { "bookingId": "book_1", "type": "hostel" },
      { "bookingId": "book_2", "type": "bike" }
    ],
    "totalAmount": 996.45,
    "partialAmount": 249,
    "remainingAmount": 747.45,
    "razorpay": { "orderId": "order_xyz", "amount": 24900 }
  }
}
```

**After success:**
1. Saves `cartPaymentData` to sessionStorage:
```json
{
  "paymentGroupId": "group_abc",
  "totalAmount": 996.45,
  "partialAmount": 249,
  "remainingAmount": 747.45,
  "bookings": [...],
  "razorpay": { "orderId": "order_xyz", "amount": 24900 }
}
```
2. Navigates to `/hostels/payment/:hostelBookingId`

**UI sections:**
- Hostel summary card (image, name, location, dates, guests)
- Selected rooms list with price per room breakdown
- Bikes in cart section (if any)
- Guest details form
- Property guidelines (from `hostel.policies.checkIn[]`)
- Sticky price summary sidebar
- "Pay only 25% now" info card
- "Proceed to Pay" button

---

### Page 5: `/hostels/payment/[id]` — Payment Page

**File:** `app/hostels/payment/[id]/page.js`

> **Note:** This is the same page as the general `payment/[id]` page — the hostel version is identical in logic. See the `payment/[id]` analysis in the CheckoutScreen documentation.

**Key points:**
- Reads `cartPaymentData` from `sessionStorage` OR constructs it from `GET /api/bookings/:id`
- Supports partial (25%), full (100%), or remaining (75%) payment
- Opens Razorpay modal
- On success → `POST /api/payments/cart/verify` (combined) or `POST /api/payments/booking/:id/verify` (single)
- Navigates to `/bookings` on success

---

### Page 6: `/hostels/confirmed/[id]` — Confirmation

**File:** `app/hostels/confirmed/[id]/page.js`

**API calls:**
| Endpoint | Method | When |
|----------|--------|------|
| `GET /api/bookings/:id` | GET | on mount |

**UI:**
- Green animated checkmark + booking ID with copy button
- Yellow "Remaining Payment Required" alert if `paymentStatus === "partial"`
- Hostel info card (image, name, location, contact)
- Room type, meal option, beds, status
- Check-in / check-out with times
- Guest info (name, email, phone, special requests)
- Important instructions (ID proof requirements)
- Sticky payment summary sidebar (base price, GST, total, paid, remaining)
- "Pay Remaining" button
- "View All Bookings" button

---

## 3. Web App: All API Calls

### Hostel Data APIs (no auth required)
| Method | Endpoint | Params | Response |
|--------|----------|--------|----------|
| GET | `/api/hostels` | — | `{ data: Hostel[] }` |
| GET | `/api/hostels/available` | `checkIn, checkOut, people, location, stayType` | `{ data: Hostel[] }` with pricing |
| GET | `/api/hostels/:id` | `checkIn, checkOut, people, stayType` | `{ data: Hostel }` with rooms |

### Cart APIs (auth required)
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/cart/details` | — | Full cart with bike + hostel items |
| POST | `/api/cart/hostels` | `hostelId, roomType, mealOption, quantity, checkIn, checkOut, isWorkstation` | Updated cart |
| PUT | `/api/cart/hostels/:itemId` | `quantity` | Updated cart |
| DELETE | `/api/cart/hostels/:itemId` | — | Updated cart |

### Booking APIs (auth required)
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/bookings/cart` | `guestDetails, specialRequests, partialPaymentPercentage` | `{ paymentGroupId, bookings[], totalAmount, partialAmount, razorpay }` |
| GET | `/api/bookings/:id` | — | Full booking with `paymentSummary` |

### Payment APIs (auth required)
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/payments/booking/:id` | `{ paymentType: "partial"/"full"/"remaining" }` | `{ id, amount, currency }` Razorpay order |
| POST | `/api/payments/booking/:id/verify` | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` | `{ success: true }` |
| POST | `/api/payments/cart/verify` | `{ paymentGroupId, razorpay_order_id, razorpay_payment_id, razorpay_signature }` | `{ success: true }` |

### Hostel Object Shape (from API)
```ts
{
  _id: string
  name: string
  images: string[]
  location: string
  address: string
  description: string
  amenities: { name: string; icon?: string }[]
  pricing: {
    roomType: 'dormitory' | 'private'
    mealOption: 'bedOnly' | 'bedAndBreakfast' | 'bedBreakfastAndDinner'
    pricePerNight: number
    pricePerPerson: number
  }[]
  checkInTime: string   // e.g. "13:00"
  checkOutTime: string  // e.g. "10:00"
  rating?: number
  reviewCount?: number
  policies?: {
    checkIn: string[]
    checkOut: string[]
    general: string[]
  }
  rooms?: {            // present on /available and /hostels/:id
    roomType: string
    availableBeds: number
    totalBeds: number
    pricing: { mealOption, pricePerNight, totalPrice }[]
  }[]
}
```

---

## 4. Mobile App: Current State

### What EXISTS in the mobile app

| File | Status | Notes |
|------|--------|-------|
| `src/types/hostel.types.ts` | ✅ Complete | Types defined but `rooms[]` and `policies` missing |
| `src/hooks/useHostels.ts` | ✅ Complete | `GET /hostels` |
| `src/hooks/useAvailableHostels.ts` | ✅ Complete | `GET /hostels/available` |
| `src/hooks/useHostelDetail.ts` | ✅ Complete | `GET /hostels/:id` |
| `src/components/hostels/HostelCard.tsx` | ✅ Complete | Vertical + horizontal variants |
| `src/components/cart/CartHostelItem.tsx` | ✅ Complete | Used in CartScreen |
| `src/screens/hostels/HostelDetailScreen.tsx` | ⚠️ Partial | Only single room type + meal selection. Missing: image lightbox, tabs (Amenities/Guidelines/Policies), per-meal-option rows like web |
| `src/navigation/types.ts` | ⚠️ Partial | `HostelDetail` param exists. Missing: `HostelSearch`, `HostelLanding`, `HostelBooking` |

### What DOES NOT EXIST

| Missing Screen | Web Equivalent |
|----------------|----------------|
| `HostelLandingScreen` | `/hostels` |
| `HostelSearchScreen` | `/hostels/search` |
| `HostelBookingScreen` | `/hostels/booking/[id]` |
| `HostelConfirmedScreen` | `/hostels/confirmed/[id]` |

The `HostelTab` in `MainTabs` currently shows `ExploreScreen` which has a basic hostel list — but the full end-to-end flow is incomplete.

---

## 5. Mobile App: What's Missing

### Missing Screens (in order of user journey)

#### 1. HostelLandingScreen
- Stay type toggle (Hostel / Workstation)
- Date pickers (check-in / check-out) using `@react-native-community/datetimepicker`
- Trending hostels section (3 cards from `useHostels`)
- Navigate to `HostelSearch` on submit

#### 2. HostelSearchScreen
- Fetch from `GET /api/hostels/available` via `useAvailableHostels`
- Load cart via `GET /api/cart/details` via `useCart`
- Per room type + meal option rows with `+/-` stepper
- **Cart mutations:** `POST /cart/hostels`, `PUT /cart/hostels/:id`, `DELETE /cart/hostels/:id`
- Proceed button → navigate to `HostelBooking`

#### 3. HostelBookingScreen (Booking Summary + Guest Form)
- Display hostel summary from params
- Display cart data from `GET /api/cart/details`
- Guest details form (react-hook-form + zod)
- Submit to `POST /api/bookings/cart`
- Navigate to `PaymentProcessing` (existing screen — already handles hostel bookings)

#### 4. HostelConfirmedScreen (Optional — BookingSuccessScreen may cover this)
- Fetch `GET /api/bookings/:id`
- Show green success, booking ID, hostel details
- "Pay Remaining" button if partially paid
- "View All Bookings" button

### Missing Type Fields
```ts
// Add to Hostel interface in hostel.types.ts:
rooms?: {
  roomType: RoomType
  availableBeds: number
  totalBeds: number
  pricing: {
    mealOption: MealOption
    pricePerNight: number
    totalPrice: number
  }[]
}[]
policies?: {
  checkIn: string[]
  checkOut: string[]
  general: string[]
}
```

### Missing Navigation Params
```ts
// Add to MainStackParamList in navigation/types.ts:
HostelLanding: undefined
HostelSearch: {
  checkIn: string
  checkOut: string
  people: number
  location?: string
  stayType?: 'hostel' | 'workstation'
}
HostelBooking: {
  hostelId: string
  hostelName: string
  hostelImage?: string
  checkIn: string
  checkOut: string
  people: number
  nights: number
}
HostelConfirmed: { bookingId: string }
```

### Missing Cart API Mutations (hooks/useCart.ts or inline)
```ts
// POST /cart/hostels
addHostelToCart(data: {
  hostelId: string
  roomType: RoomType
  mealOption: MealOption
  quantity: number
  checkIn: string
  checkOut: string
  isWorkstation?: boolean
})

// PUT /cart/hostels/:itemId
updateHostelCartItem(itemId: string, quantity: number)

// DELETE /cart/hostels/:itemId  
removeHostelFromCart(itemId: string)
```

---

## 6. Mobile Implementation Plan

### Priority Order

```
Phase 1: HostelLandingScreen     ← Entry point
Phase 2: HostelSearchScreen      ← Core functionality (room selection + cart)
Phase 3: HostelBookingScreen     ← Guest form + booking creation
Phase 4: HostelDetailScreen      ← Upgrade existing screen with web parity
Phase 5: HostelConfirmedScreen   ← Post-payment confirmation (optional if BookingSuccess covers it)
```

---

## 7. Screen-by-Screen Build Guide

---

### Phase 1: HostelLandingScreen

**File to create:** `src/screens/hostels/HostelLandingScreen.tsx`

**Logic:**
```tsx
const [stayType, setStayType] = useState<'hostel' | 'workstation'>('hostel')
const [checkIn, setCheckIn] = useState(today)
const [checkOut, setCheckOut] = useState(tomorrow)
const { data: trendingHostels } = useHostels()

const handleSearch = () => {
  // Validate dates
  if (!checkIn || !checkOut) return showError()
  if (stayType === 'workstation' && nights < 7) return showError('Min 7 nights for workstation')
  navigation.navigate('HostelSearch', { checkIn, checkOut, people: 1, location: 'Chikkamagaluru', stayType })
}
```

**UI structure:**
```
<Hero Banner (orange bg)>
  <StayType Tabs>  Hostel | Workstation
  <Location Input> (readonly - "Chikkamagaluru")
  <DatePicker> Check-in
  <DatePicker> Check-out
  <Search Button>

<Trending Hostels Section>
  {trendingHostels.slice(0, 3).map(h => <HostelCard ... />)}
```

**Date picker:** Use `@react-native-community/datetimepicker` (already in dependencies).

---

### Phase 2: HostelSearchScreen

**File to create:** `src/screens/hostels/HostelSearchScreen.tsx`

**Logic:**
```tsx
// Route params
const { checkIn, checkOut, people, location, stayType } = route.params

// Data fetching
const { data: hostels } = useAvailableHostels({ checkIn, checkOut, people, location, stayType })
const { data: cart, refetch: refetchCart } = useQuery({ queryKey: ['cart'], queryFn: fetchCart })

// Cart mutations
const addToCartMutation = useMutation({
  mutationFn: (data) => api.post('/cart/hostels', data),
  onSuccess: () => queryClient.invalidateQueries(['cart'])
})
const updateCartMutation = useMutation({
  mutationFn: ({ itemId, quantity }) => api.put(`/cart/hostels/${itemId}`, { quantity }),
  onSuccess: () => queryClient.invalidateQueries(['cart'])
})
const removeFromCartMutation = useMutation({
  mutationFn: (itemId) => api.delete(`/cart/hostels/${itemId}`),
  onSuccess: () => queryClient.invalidateQueries(['cart'])
})

// Get current cart quantity for a meal option
const getCartItem = (hostelId, roomType, mealOption) =>
  cart?.hostelItems?.find(i => i.hostel?._id === hostelId && i.roomType === roomType && i.mealOption === mealOption)

// Proceed to booking
const handleProceed = () => {
  const firstHostel = hostels?.[0]
  navigation.navigate('HostelBooking', {
    hostelId: firstHostel._id,
    hostelName: firstHostel.name,
    hostelImage: firstHostel.images?.[0],
    checkIn, checkOut, people,
    nights: calcNights(checkIn, checkOut)
  })
}
```

**UI structure (per hostel):**
```
<SearchCriteriaBar>
  <Hostel Images Carousel>
  <Hostel Name + Location>
  <Amenity chips (horizontal scroll)>

  {MEAL_OPTIONS.map(meal => (
    <MealOptionRow key={meal.value}>
      <MealLabel>  (e.g. "Bed Only")
      <Price>  ₹X/night
      <QuantityControl>  // Add button → stepper
        // If cartItem exists: show [−] qty [+]
        // Else: show [Add] button
    </MealOptionRow>
  ))}

  <Guidelines Section>

<StickyBottomBar>
  {cart.hostelItems.length > 0 && (
    <PriceSummary>  Subtotal + GST + Total
    <ProceedButton> Proceed to Book
  )}
```

**Beds badge logic:**
```tsx
const bedsLeft = room.availableBeds
const badgeColor = bedsLeft === 0 ? '#ef4444' : bedsLeft < 5 ? '#f97316' : '#22c55e'
const badgeText = bedsLeft === 0 ? 'Fully Booked' : `${bedsLeft} beds left`
```

---

### Phase 3: HostelBookingScreen

**File to create:** `src/screens/hostels/HostelBookingScreen.tsx`

**Logic:**
```tsx
// Route params
const { hostelId, hostelName, hostelImage, checkIn, checkOut, people, nights } = route.params

// Fetch full cart (includes hostel + bike items combined)
const { data: cart } = useQuery({ queryKey: ['cart'], queryFn: fetchCart })
// Fetch hostel for policies display
const { data: hostel } = useHostelDetail(hostelId, { checkIn, checkOut, people })

// Form (react-hook-form + zod)
const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().length(10).regex(/^\d+$/),
  specialRequests: z.string().optional(),
  agreeTerms: z.literal(true)
})

// Submit mutation
const bookingMutation = useMutation({
  mutationFn: async (formData) => {
    const res = await api.post('/bookings/cart', {
      guestDetails: { name: formData.name, email: formData.email, phone: formData.phone },
      specialRequests: formData.specialRequests || '',
      partialPaymentPercentage: 25  // always partial from hostel flow
    })
    return res.data.data
  },
  onSuccess: (data) => {
    navigation.navigate('PaymentProcessing', {
      razorpayOrderId: data.razorpay.orderId,
      razorpayAmount: data.razorpay.amount,
      razorpayCurrency: 'INR',
      paymentGroupId: data.paymentGroupId,
      bookingId: data.bookings?.[0]?.bookingId,
      paymentType: 'partial',
      guestName: formData.name,
      guestEmail: formData.email,
      guestPhone: formData.phone,
      payNowRupees: data.partialAmount
    })
  }
})
```

**Price calculation:**
```tsx
const hostelSubtotal = cart?.hostelItems?.reduce((sum, i) => sum + i.totalPrice, 0) ?? 0
const bikeSubtotal = cart?.bikeItems?.reduce((sum, i) => sum + i.totalPrice, 0) ?? 0
const gst = (hostelSubtotal + bikeSubtotal) * 0.05
const total = hostelSubtotal + bikeSubtotal + gst
const partialAmount = Math.ceil(total * 0.25)
```

**UI structure:**
```
<ScreenHeader title="Booking Summary" />

<ScrollView>
  {/* Hostel Summary Card */}
  <HostelSummaryCard>
    Image | Name, Location, Dates, Guests

  {/* Selected Rooms */}
  <Card title="Selected Rooms">
    {cart.hostelItems.map(item => (
      <RoomRow> roomType · mealOption · qty · price

  {/* Bikes in Cart (if any) */}
  {cart.bikeItems.length > 0 && (
    <Card title="Bikes">
      {cart.bikeItems.map(item => <BikeRow>)}

  {/* Guest Details Form */}
  <Card title="Guest Details">
    <Input name /> <Input email /> <Input phone />
    <Input specialRequests multiline />

  {/* Property Guidelines */}
  {hostel?.policies?.checkIn && (
    <Card title="Property Guidelines">
      {hostel.policies.checkIn.map(rule => <GuidelineRow />)}

  {/* Price Summary */}
  <PriceSummary>
    Hostel Subtotal | Bike Subtotal | GST (5%) | Total
    "Pay only 25% now = ₹{partialAmount}"

  {/* Terms + Submit */}
  <TermsCheckbox />
  <PayButton title={`Pay ₹${partialAmount} Now`} />
</ScrollView>
```

---

### Phase 4: Upgrade HostelDetailScreen

**File:** `src/screens/hostels/HostelDetailScreen.tsx` (already exists, needs upgrade)

**Current gaps vs web:**
1. Currently shows single room type + meal option selectors → Change to per-meal-option rows like search results
2. Add tabs: Amenities | Guidelines | Policies
3. Image gallery needs prev/next arrows (currently just paginated FlatList)
4. Add "beds remaining" badge

**Changes needed:**
```tsx
// Replace single roomType + mealOption selectors with:
{MEAL_OPTIONS.map(mealOption => {
  const pricing = hostel.pricing?.find(p => p.roomType === activeRoomType && p.mealOption === mealOption.value)
  return (
    <MealOptionRow key={mealOption.value}>
      <Text>{mealOption.label}</Text>
      <Text>₹{pricing?.pricePerNight}/night</Text>
      <QuantityControl ... />
    </MealOptionRow>
  )
})}

// Add tabs
const [activeTab, setActiveTab] = useState<'amenities' | 'guidelines' | 'policies'>('amenities')
```

---

### Phase 5: HostelConfirmedScreen (Optional)

**File to create:** `src/screens/hostels/HostelConfirmedScreen.tsx`

> If `BookingSuccessScreen` already shows enough information, this screen may not be needed. Check if the current success screen shows hostel-specific details. If not, create this screen.

**Logic:**
```tsx
const { bookingId } = route.params
const { data: booking } = useBookingDetail(bookingId)
```

**UI:**
- Green animated check
- Booking ID with copy button
- Hostel info (image, name, dates, room type, meal option)
- Guest info
- Payment summary (paid, remaining)
- "Pay Remaining" button (if paymentStatus === 'partial')
- "View All Bookings" button

---

## 8. Navigation Changes Required

### Add to `src/navigation/types.ts`

```ts
export type MainStackParamList = {
  // ... existing params ...
  
  // NEW - Hostel flow
  HostelLanding: undefined;
  HostelSearch: {
    checkIn: string;
    checkOut: string;
    people: number;
    location?: string;
    stayType?: 'hostel' | 'workstation';
  };
  HostelBooking: {
    hostelId: string;
    hostelName: string;
    hostelImage?: string;
    checkIn: string;
    checkOut: string;
    people: number;
    nights: number;
  };
  HostelConfirmed: {
    bookingId: string;
  };
};
```

### Add to `src/navigation/MainStack.tsx`

```tsx
import HostelLandingScreen from '../screens/hostels/HostelLandingScreen';
import HostelSearchScreen from '../screens/hostels/HostelSearchScreen';
import HostelBookingScreen from '../screens/hostels/HostelBookingScreen';
import HostelConfirmedScreen from '../screens/hostels/HostelConfirmedScreen';

// Inside Stack.Navigator:
<Stack.Screen name="HostelLanding" component={HostelLandingScreen} />
<Stack.Screen name="HostelSearch" component={HostelSearchScreen} />
<Stack.Screen name="HostelBooking" component={HostelBookingScreen} />
<Stack.Screen name="HostelConfirmed" component={HostelConfirmedScreen} />
```

### Update `HostelTab` in `src/navigation/MainTabs.tsx`

Currently `HostelTab` renders `ExploreScreen`. Change it to render `HostelLandingScreen` so the hostel tab directly leads into the hostel flow.

---

## 9. Types & Hooks Required

### Update `src/types/hostel.types.ts`

```ts
// Add these missing interfaces:

export interface HostelRoom {
  roomType: RoomType;
  availableBeds: number;
  totalBeds: number;
  pricing: {
    mealOption: MealOption;
    pricePerNight: number;
    totalPrice: number;    // pricePerNight × nights
  }[];
}

export interface HostelPolicies {
  checkIn: string[];
  checkOut: string[];
  general: string[];
}

// Update Hostel interface to include:
export interface Hostel {
  // ... existing fields ...
  rooms?: HostelRoom[];           // present on /available and /hostels/:id
  policies?: HostelPolicies;      // present on /hostels/:id detail
  isWorkstation?: boolean;
}
```

### New Cart Mutations (inline or in `src/hooks/useCart.ts`)

```ts
// Add hostel to cart
export function useAddHostelToCart() {
  return useMutation({
    mutationFn: (data: {
      hostelId: string;
      roomType: RoomType;
      mealOption: MealOption;
      quantity: number;
      checkIn: string;
      checkOut: string;
      isWorkstation?: boolean;
    }) => api.post('/cart/hostels', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}

// Update hostel cart item quantity
export function useUpdateHostelCartItem() {
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.put(`/cart/hostels/${itemId}`, { quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}

// Remove hostel from cart
export function useRemoveHostelFromCart() {
  return useMutation({
    mutationFn: (itemId: string) => api.delete(`/cart/hostels/${itemId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}
```

---

## Summary Table

| Feature | Web Status | Mobile Status | Action Required |
|---------|-----------|--------------|-----------------|
| Hostel Landing Page | ✅ Done | ❌ Missing | Create `HostelLandingScreen` |
| Search / Room Selection | ✅ Done | ❌ Missing | Create `HostelSearchScreen` |
| Hostel Detail View | ✅ Done | ⚠️ Partial | Upgrade `HostelDetailScreen` |
| Guest Form + Book | ✅ Done | ❌ Missing | Create `HostelBookingScreen` |
| Payment (25%/100%) | ✅ Done | ✅ Exists | `PaymentProcessingScreen` already handles it |
| Booking Confirmation | ✅ Done | ⚠️ Partial | `BookingSuccessScreen` exists; upgrade or create `HostelConfirmedScreen` |
| Cart (add/update/remove) | ✅ Done | ⚠️ Cart exists but hostel mutations missing | Add 3 mutations to `useCart.ts` |
| Types | ✅ Done | ⚠️ Missing `rooms[]` and `policies` | Update `hostel.types.ts` |
| Navigation params | ✅ Done | ⚠️ Missing 4 routes | Update `navigation/types.ts` and `MainStack.tsx` |
