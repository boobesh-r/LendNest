# 📡 LendNest — REST API Documentation

Base URL: `http://localhost:5000/api`

All protected endpoints require an HTTP `Authorization` header formatted as:
```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. Authentication Endpoints

### Register New User
- **Endpoint**: `POST /auth/register`
- **Body**:
  ```json
  {
    "name": "Alex Rivera",
    "email": "alex@lendnest.com",
    "password": "User123!",
    "phone": "+1 555-0199",
    "location": "Seattle, WA"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "Account created successfully!",
    "token": "eyJhbGciOi...",
    "user": {
      "id": 3,
      "name": "Alex Rivera",
      "email": "alex@lendnest.com",
      "role": "user",
      "location": "Seattle, WA"
    }
  }
  ```

### User Login
- **Endpoint**: `POST /auth/login`
- **Body**:
  ```json
  {
    "email": "admin@lendnest.com",
    "password": "Admin123!"
  }
  ```
- **Response**: `200 OK` (Returns JWT token and user info)

### Get Current User Profile & Statistics
- **Endpoint**: `GET /auth/me`
- **Auth**: Required
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "user": {
      "id": 2,
      "name": "Sarah Jenkins",
      "email": "sarah@lendnest.com",
      "role": "user",
      "stats": {
        "itemsListed": 4,
        "activeBookings": 1,
        "activeLockers": 0,
        "totalEarnings": 171.0
      }
    }
  }
  ```

---

## 2. Item Listings Endpoints

### Browse & Search Items
- **Endpoint**: `GET /items`
- **Query Parameters**:
  - `search` (string): Keyword matching in title or description.
  - `category` (string): e.g., "Electronics", "Tools", "Sports equipment".
  - `maxPrice` (number): Daily rate threshold.
  - `location` (string): Geographic filter.
  - `availableOnly` (boolean): `true` to filter items available for rent.
  - `sort` (string): `newest`, `price_asc`, `price_desc`.
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "count": 19,
    "items": [...]
  }
  ```

### Get Single Item Details
- **Endpoint**: `GET /items/:id`
- **Response**: `200 OK` (includes owner credentials and upcoming booked dates)

### Create Item Listing
- **Endpoint**: `POST /items`
- **Auth**: Required
- **Body**:
  ```json
  {
    "title": "Sony Alpha A7 IV Camera",
    "description": "33MP Full frame mirrorless camera",
    "category": "Electronics",
    "price_per_day": 45.0,
    "deposit": 200.0,
    "location": "Seattle, WA",
    "image_url": "https://...",
    "item_condition": "Like New"
  }
  ```

### Edit Item Listing
- **Endpoint**: `PUT /items/:id`
- **Auth**: Required (Owner or Admin)

### Delete Item Listing
- **Endpoint**: `DELETE /items/:id`
- **Auth**: Required (Owner or Admin)

---

## 3. Item Bookings Endpoints

### Create Reservation
- **Endpoint**: `POST /bookings`
- **Auth**: Required
- **Body**:
  ```json
  {
    "item_id": 1,
    "start_date": "2026-10-15",
    "end_date": "2026-10-18",
    "renter_notes": "Will pickup at 10 AM",
    "payment_method": "demo_card"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "Rental booking confirmed!",
    "booking": {
      "id": 14,
      "total_days": 3,
      "rental_price": 135.0,
      "deposit_amount": 200.0,
      "total_amount": 335.0,
      "pickup_code": "LN-PICK-7842",
      "status": "confirmed"
    },
    "payment": {
      "transactionRef": "TXN-DEMO-873210-ITEM",
      "status": "paid",
      "isDemo": true
    }
  }
  ```

### My Bookings History
- **Endpoint**: `GET /bookings/my-bookings`
- **Auth**: Required
- **Returns**: User's item rentals, locker reservations, and incoming reservations for items they own.

### Cancel Booking
- **Endpoint**: `POST /bookings/:id/cancel`
- **Auth**: Required
- **Response**: Issues simulated refund and updates status to `cancelled`.

---

## 4. Smart QR Locker Endpoints

### List Locker Locations
- **Endpoint**: `GET /lockers/locations`
- **Response**: Locations with coordinates and total/available locker counts.

### List Lockers
- **Endpoint**: `GET /lockers/lockers?locationId=1&size=Medium`

### Reserve Smart Locker
- **Endpoint**: `POST /lockers/book`
- **Auth**: Required
- **Body**:
  ```json
  {
    "locker_id": 3,
    "duration_hours": 4,
    "payment_method": "demo_card"
  }
  ```
- **Response**: Returns unique QR Token string `LNQR-3-...` and marks locker status as `reserved`.

### Unlock Locker Demo
- **Endpoint**: `POST /lockers/unlock-demo`
- **Auth**: Required
- **Body**:
  ```json
  {
    "token": "LNQR-3-D4A2B1-M7..."
  }
  ```
- **Response**: Validates token expiration and maximum uses, increments usage count, records audit log in database, and returns simulated hardware feedback.

---

## 5. Admin Portal Endpoints

All admin endpoints require an active token from a user with `role === 'admin'`.

- `GET /admin/stats`: Aggregate system metrics (users, listings, revenue, locker utilization).
- `GET /admin/users`: User directory with listings count and bookings count.
- `GET /admin/bookings`: Full audit list of all platform reservations.
- `GET /admin/lockers`: Status of every locker across all locations.
- `PUT /admin/lockers/:id/status`: Toggle locker between `available` and `maintenance`.
- `GET /admin/access-logs`: Full audit history of locker door events.
