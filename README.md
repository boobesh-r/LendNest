# 🌿 LendNest — Smart Rental & Sharing Platform
> **Tagline:** *Borrow Smart. Share More.*

LendNest is a modern full-stack web platform enabling communities to rent, lend, and share everyday items (electronics, power tools, sports equipment, appliances, travel gear) and reserve automated contactless smart storage lockers with dynamic QR passes.

---

## 📋 Table of Contents
1. [Tech Stack Overview](#1-tech-stack-overview)
2. [Project Architecture](#2-project-architecture)
3. [Quick Start Guide (Windows & VS Code)](#3-quick-start-guide-windows--vs-code)
4. [One-Click Startup Script (`RUN_LENDNEST.bat`)](#4-one-click-startup-script-run_lendnestbat)
5. [Demo Accounts](#5-demo-accounts)
6. [Core Features & Pages](#6-core-features--pages)
7. [Smart QR Locker Simulation & Architecture](#7-smart-qr-locker-simulation--architecture)
8. [Demo Payment Simulation](#8-demo-payment-simulation)
9. [Database Design & Seeding](#9-database-design--seeding)
10. [REST API Endpoints](#10-rest-api-endpoints)
11. [Troubleshooting Guide](#11-troubleshooting-guide)
12. [Future Hardware & Gateway Roadmap](#12-future-hardware--gateway-roadmap)

---

## 1. Tech Stack Overview

- **Frontend**: React 18+ with TypeScript, Vite bundler, responsive CSS design system (Plus Jakarta Sans typography, custom design tokens, dark accents), and Lucide React icons.
- **Backend**: Node.js LTS with Express and TypeScript, REST architecture, CORS enabled, and modular services.
- **Database**: SQLite using Node's native `node:sqlite` (`DatabaseSync`) with WAL mode enabled. Requires **zero external C++ compilation** or native build tools on Windows.
- **Security & Auth**: Password hashing using `bcryptjs`, signed JWT sessions, role-based authorization (User vs Administrator), server-side input validation, and date collision checks.
- **QR Generation**: SVG QR code generation rendered via `qrcode.react`.
- **Zero Cost**: Built entirely with free, open-source tools with zero paid API requirements.

---

## 2. Project Architecture

```
lendnest/
├── RUN_LENDNEST.bat                # Windows 1-click startup batch script
├── package.json                    # Root scripts (dev, build, seed, start)
├── README.md                       # Comprehensive guide & documentation
├── .env.example                    # Global environment template
├── .gitignore                      # Git ignore rules
│
├── backend/                        # Node.js + Express + TypeScript Backend
│   ├── .env                        # Local backend environment
│   ├── package.json                # Express & TS dependencies
│   ├── tsconfig.json               # Backend TypeScript configuration
│   └── src/
│       ├── server.ts               # Main Express HTTP server & route mounting
│       ├── config.ts               # Environment configuration
│       ├── database.ts             # SQLite connection & schema initialization
│       ├── seed.ts                 # Realistic database seed runner
│       ├── middleware/
│       │   ├── auth.ts             # JWT authentication & admin guard
│       │   └── errorHandler.ts     # Global API error handler
│       ├── controllers/
│       │   ├── authController.ts   # Registration, login, profile stats
│       │   ├── itemController.ts   # Item search, filters, CRUD
│       │   ├── bookingController.ts# Dates, conflict detection, bookings
│       │   ├── lockerController.ts # Smart locker reservation & QR unlock
│       │   ├── paymentController.ts# Demo payment simulation & refunds
│       │   └── adminController.ts  # Moderation stats & locker toggle
│       ├── services/
│       │   ├── lockerService.ts    # Locker unlock engine & hardware decoupling
│       │   └── paymentService.ts   # Payment simulation & gateway abstraction
│       └── routes/                 # Modular Express routers
│
├── frontend/                       # React + TypeScript + Vite Frontend
│   ├── index.html                  # HTML5 entry with Google Fonts & SEO
│   ├── vite.config.ts              # Vite configuration with API proxy
│   ├── tsconfig.json               # Frontend TypeScript configuration
│   └── src/
│       ├── main.tsx                # React DOM root
│       ├── App.tsx                 # App router, global modal & toast management
│       ├── index.css               # Modern CSS design system & variables
│       ├── api.ts                  # REST API client
│       ├── types.ts                # Shared TypeScript models
│       ├── components/
│       │   ├── Navbar.tsx          # Sticky navigation, logo & user menu
│       │   ├── Footer.tsx          # Brand footer & demo disclosure
│       │   ├── AuthModal.tsx       # Sign in / Register with 1-click demo login
│       │   ├── CheckoutModal.tsx   # Reservation review, payment, pickup code
│       │   └── Toast.tsx           # Toast alert notification container
│       └── pages/
│           ├── LandingPage.tsx     # Hero, search, categories, featured gear
│           ├── BrowsePage.tsx      # Keyword search, category/price filters
│           ├── ItemDetailsPage.tsx # Gallery, live date picker & cost preview
│           ├── AddListingPage.tsx  # Create/edit listing with photo presets
│           ├── MyBookingsPage.tsx  # Rentals, pickup codes & QR locker passes
│           ├── ProfilePage.tsx     # User bio, stats & listing management
│           ├── LockerPage.tsx      # Interactive Smart QR Locker simulator
│           └── AdminPage.tsx       # Admin overview, users & maintenance grid
│
├── database/                       # Persistent SQLite Database storage
│   └── lendnest.sqlite             # SQLite database file
│
└── documentation/                  # Deep-dive technical documentation
    ├── API_DOCUMENTATION.md        # Full REST API endpoint reference
    ├── LOCKER_SERVICE_ARCHITECTURE.md # IoT hardware controller guide
    └── PAYMENT_GATEWAY_INTEGRATION.md # Production Stripe / UPI setup
```

---

## 3. Quick Start Guide (Windows & VS Code)

### Prerequisites
1. **Node.js LTS (v20+ or v24+)**:
   - Verify in Windows PowerShell: `node -v`
   - If not installed, run:
     ```powershell
     winget install OpenJS.NodeJS.LTS
     ```
2. **VS Code**: Recommended editor for local inspection.

### Step-by-Step Setup

1. **Clone or Open Folder in VS Code**:
   Open `f:\lendnest` in VS Code or your terminal.

2. **Install Dependencies**:
   From the project root:
   ```powershell
   npm install
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```

3. **Initialize & Seed the Database**:
   Populate SQLite with realistic demo users, items, lockers, and bookings:
   ```powershell
   npm run seed
   ```

4. **Start the Application**:
   Run both backend and frontend concurrently:
   ```powershell
   npm run dev
   ```

5. **Open in Browser**:
   Navigate to **`http://localhost:5173`**.

---

## 4. One-Click Startup Script (`RUN_LENDNEST.bat`)

For the easiest Windows setup:
1. Double-click **`RUN_LENDNEST.bat`** in the project root folder.
2. The script will automatically:
   - Check your Node.js environment.
   - Install missing dependencies if needed.
   - Seed the SQLite database if it hasn't been created yet.
   - Launch the Backend API (port 5000) and Frontend (port 5173).
   - Launch your default web browser to `http://localhost:5173`.

---

## 5. Demo Accounts

The application includes pre-configured demo credentials. You can type them manually or click the **Fast Demo One-Click Sign In** buttons directly in the login modal:

| Role | Email | Password | Access & Features |
| :--- | :--- | :--- | :--- |
| 👑 **Administrator** | `admin@lendnest.com` | `Admin123!` | Admin Dashboard, locker maintenance toggles, user directory, system metrics |
| 🏡 **Host / Lender** | `sarah@lendnest.com` | `User123!` | Listed items owner (Sony Camera, Miter Saw, Paddleboard), earnings tracker |
| 🎒 **Renter** | `alex@lendnest.com` | `User123!` | Active reservations, pre-generated demo pickup code, QR locker pass |

---

## 6. Core Features & Pages

1. **Landing Page (`/`)**:
   - Bold hero section with headline *"Borrow Smart. Share More."*
   - Interactive search bar with instant keyword matching.
   - Quick category pills with icons (Electronics, Tools, Sports equipment, Books, Travel accessories, Home appliances, Other items).
   - Featured items grid with price/day and condition tags.
   - 3-step *How LendNest Works* visual guide.
   - Smart Locker feature showcase.

2. **Browse Items Page (`/browse`)**:
   - Real-time search by item title and description.
   - Multi-category filtering and location filter.
   - Max price/day slider ($5 to $100+).
   - Availability toggle (*Available items only*).
   - Sort dropdown (*Newly Listed*, *Price: Low to High*, *Price: High to Low*).

3. **Item Details Page (`/item-details`)**:
   - High-resolution equipment photo and specifications.
   - Verified host badge, location, and rating.
   - Interactive date picker with live rental duration and subtotal calculation.
   - Security deposit estimate and date conflict detection (prevents overlapping bookings).
   - Direct button to reserve the item.

4. **Add / Edit Listing Page (`/add-listing`)**:
   - Complete item creation form with validation (positive price, deposit, location).
   - Quick preset sample image buttons (Sony Camera, DJI Drone, Drill, SUP Board, Mountain Bike, Dyson Vacuum, Luggage) for instant 1-click photo population.
   - Live preview card updating in real time as you type.

5. **Booking & Checkout Modal**:
   - Item overview, rental dates, days count, and financial breakdown.
   - Refundable security deposit transparency notice.
   - Demo payment method selector (*Demo Credit Card*, *Demo UPI*, *Demo Wallet*).
   - Unique generated **Booking ID** and **DEMO Pickup Code** (e.g. `LN-PICK-7842`).

6. **My Bookings Page (`/my-bookings`)**:
   - Tabbed view: *Gear Rentals*, *Smart Lockers*, and *Incoming Requests for My Items*.
   - Prominent pickup code badge with one-click *Copy Code* button.
   - Rental cancellation with simulated deposit and payment refund.
   - Smart locker reservations with digital QR pass modal and simulated door unlock action.

7. **User Profile Page (`/profile`)**:
   - Member avatar, contact information, and verified status.
   - Statistics: Items listed, active rentals, and host earnings.
   - *My Listed Items* management grid: toggle availability, edit details, or delete listings.

8. **Smart Locker Simulation Page (`/lockers`)**:
   - Locker hub location selector (Central Metro, Tech Hub, Westlake Mall).
   - Locker size filter (Small, Medium, Large) with real-world dimensions guide.
   - Interactive visual locker bank grid (Available [green], Reserved [yellow], Occupied [blue], Maintenance [gray]).
   - Duration selector (2h, 4h, 8h, 24h, 48h) with live pricing.
   - **Interactive Hardware Unlock Simulator**:
     - Dynamic SVG QR code pass.
     - Token expiration tracking and maximum use limits.
     - Simulated electronic door latch animation (solenoid release sound effect indicator, visual door swinging open, internal LED status, package sensor detection).
     - Live locker access audit log table fetched from the database.

9. **Admin Dashboard (`/admin`)**:
   - Protected server-side and client-side (requires `role === 'admin'`).
   - Platform overview metrics: Total registered users, active listings, total bookings, lockers in maintenance, gross volume.
   - Locker moderation: 1-click toggle to place any locker into maintenance mode or return it to service.
   - User directory table with contact info and listing counts.
   - Platform bookings audit table.
   - Hardware access audit trail with timestamps and event details.

---

## 7. Smart QR Locker Simulation & Architecture

- **Token Security**: Tokens are generated on the backend using cryptographic randomness and stored with expiration dates and usage limits.
- **Backend Validation**: Scanned tokens are verified server-side against the SQLite database. Invalid or expired tokens are rejected, and an `ACCESS_DENIED` event is logged.
- **Hardware Decoupling**: The backend logic is encapsulated in `backend/src/services/lockerService.ts`. See [`documentation/LOCKER_SERVICE_ARCHITECTURE.md`](documentation/LOCKER_SERVICE_ARCHITECTURE.md) for details on connecting physical microcontrollers (ESP32/Raspberry Pi) via MQTT over TLS.

---

## 8. Demo Payment Simulation

- **Clear Demo Labelling**: All checkout screens feature prominent *Prototype Demo* badges.
- **Zero Real Banking Data**: No real credit card numbers, CVVs, or UPI PINs are collected or stored.
- **Complete Transaction Lifecycle**: Generates unique references (`TXN-DEMO-XXXXXX`) and handles states: `pending`, `paid`, and `refunded`.
- **Gateway Roadmap**: See [`documentation/PAYMENT_GATEWAY_INTEGRATION.md`](documentation/PAYMENT_GATEWAY_INTEGRATION.md) for the architecture to integrate production Stripe Elements or Razorpay UPI webhooks.

---

## 9. Database Design & Seeding

The SQLite database (`database/lendnest.sqlite`) includes:
- `users`: Accounts, roles, hashed passwords, avatars, contact details.
- `items`: Equipment listings, categories, daily prices, deposits, conditions.
- `bookings`: Reservations, dates, pricing, status, and unique pickup codes.
- `locker_locations`: Kiosk hubs, addresses, geographic coordinates.
- `lockers`: Compartments, sizes (Small, Medium, Large), rates, status.
- `locker_bookings`: Locker reservations, time windows, fees.
- `qr_tokens`: Dynamic access tokens, expiry timestamps, usage counters.
- `locker_access_logs`: Hardware door unlatch and security audit logs.
- `payments`: Simulated payment records, transaction references, methods, statuses.

To reset or re-seed data at any time:
```powershell
npm run seed
```

---

## 10. REST API Endpoints

Complete API documentation with payload examples is available in [`documentation/API_DOCUMENTATION.md`](documentation/API_DOCUMENTATION.md).

Quick summary of primary routes:
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in and get JWT token
- `GET  /api/auth/me` — Current user profile and stats
- `GET  /api/items` — Search and filter item listings
- `POST /api/items` — Publish equipment listing
- `POST /api/bookings` — Create gear reservation
- `GET  /api/bookings/my-bookings` — User reservations & pickup codes
- `GET  /api/lockers/locations` — Locker hubs
- `POST /api/lockers/book` — Reserve smart locker
- `POST /api/lockers/unlock-demo` — Validate QR token & simulate unlock
- `GET  /api/admin/stats` — Admin platform analytics
- `PUT  /api/admin/lockers/:id/status` — Admin maintenance toggle

---

## 11. Troubleshooting Guide

### 1. `node` is not recognized in terminal
- **Cause**: Node.js is not added to the system `PATH`.
- **Solution**: Restart your terminal or VS Code after installing Node.js LTS, or run:
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```

### 2. Port 5000 or Port 5173 already in use
- **Cause**: Another process or previous node server is listening on the port.
- **Solution**: In PowerShell, run:
  ```powershell
  Stop-Process -Name "node" -Force
  ```
  Then restart with `npm run dev`.

### 3. Database lock error (`database is locked`)
- **Cause**: Another application opened the SQLite file in exclusive write mode.
- **Solution**: The backend uses WAL mode (`PRAGMA journal_mode = WAL;`) by default. Ensure only one backend server instance is running.

---

## 12. Future Hardware & Gateway Roadmap

| Feature | Current MVP Implementation | Future Production Integration |
| :--- | :--- | :--- |
| **Locker Door Latch** | Software simulation with relay state echo and access audit logging | ESP32 microcontroller with 12V solenoid latch & optical package sensor |
| **Locker QR Scan** | Browser-rendered SVG pass with simulated scan trigger | Fixed-mount barcode scanner (e.g. Waveshare GM65) via UART |
| **Payments** | Simulated demo checkout (`demo_card`, `demo_upi`, `demo_wallet`) | Stripe Elements, Apple Pay, Google Pay, Razorpay UPI Webhooks |
| **Security Deposits** | Automatic simulated refund on booking cancellation | Stripe Partial Refund API (`stripe.refunds.create`) |
| **Notifications** | In-app toast notification system | SMS pickup alerts via Twilio and push notifications |

---

## 📄 License
This prototype is released under the **MIT License** for open-source evaluation and educational use.
