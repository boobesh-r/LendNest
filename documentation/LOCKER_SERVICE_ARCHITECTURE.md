# 🔐 LendNest — Smart Locker Service Architecture & Hardware Integration

This document outlines the design of the **LendNest Smart Locker Service** (`backend/src/services/lockerService.ts`), the security safeguards preventing token exploitation, and the implementation pathway for integrating physical locker hardware.

---

## 1. Architectural Philosophy: Hardware Decoupling

In the LendNest architecture, web browsers and mobile apps never communicate directly with locker hardware. All operations flow through the **LockerService module**, which acts as a secure intermediary:

```
[User Phone / Web App]
         │ (HTTPS / QR Display)
         ▼
[LendNest REST Backend]
         │ (Token Validation & Access Audit DB)
         ▼
[Locker Service Controller]
         │ (MQTT over TLS / WebSockets)
         ▼
[Physical Locker Controller] (ESP32 / Raspberry Pi)
         │ (GPIO Relay Trigger)
         ▼
[12V Solenoid Door Latch + Reed Sensor]
```

### Advantages of this architecture:
1. **Zero Secret Exposure**: QR codes never contain hardware pin codes, door relay keys, or physical lock combinations.
2. **Revocation & Expiry**: QR tokens expire automatically based on reservation duration or when usage limits are exceeded.
3. **Audit Trail**: Every access attempt (success or denial) is recorded in the `locker_access_logs` database table.

---

## 2. QR Token Generation & Verification Protocol

When a user reserves a locker:
1. A cryptographically random token is generated: `LNQR-<LockerBookingId>-<HexEntropy>-<Timestamp>`.
2. An expiration timestamp (`expires_at`) is written to `qr_tokens`.
3. Usage count is tracked (`used_count = 0`, `max_uses = 15` to allow deposit and collection).
4. Validation checks executed on scan:
   - Does token exist in database?
   - Is status equal to `active`?
   - Is `Date.now() < expires_at`?
   - Is `used_count < max_uses`?
   - Is the associated locker booking active?

If any check fails, access is blocked and an `ACCESS_DENIED` event is logged.

---

## 3. Physical Hardware Integration Pathway

To transition from the local software simulation to physical kiosks:

### A. Recommended Hardware Components
1. **Central Kiosk Unit**:
   - Raspberry Pi 4 (Compute Module or SBC) running Linux kiosk agent.
   - 7-inch or 10-inch Touchscreen + Waveshare Fixed Mount Barcode / QR Scanner (UART/USB).
   - 12V 10A DC Power Supply Unit.
2. **Compartment Controllers**:
   - 16-Channel or 32-Channel Modbus RS485 Relay Board (e.g., Waveshare Modbus RTU Relay).
   - 12V DC Solenoid Door Lock with status switch (monitors whether the door is physically ajar or closed).
   - Internal LED strip per compartment for user visibility.

### B. Controller Communication Protocol (MQTT over TLS)
The locker kiosk connects to the backend via an MQTT broker (e.g., AWS IoT Core, HiveMQ, or Mosquitto):

- **Kiosk Scans QR Code**:
  Kiosk publishes to `lendnest/lockers/{location_id}/scans`:
  ```json
  {
    "scanner_id": "STATION-SEATTLE-01",
    "scanned_token": "LNQR-3-D4A2B1-M7..."
  }
  ```

- **Backend Validates & Issues Command**:
  Backend verifies token with `LockerService.validateToken()` and publishes to `lendnest/lockers/{location_id}/commands`:
  ```json
  {
    "locker_number": "CM-103",
    "relay_channel": 3,
    "action": "PULSE_UNLATCH",
    "pulse_ms": 3000
  }
  ```

- **Kiosk Microcontroller Executes**:
  The ESP32 or Raspberry Pi triggers relay channel 3 for 3000 milliseconds to release the solenoid latch, reads the door sensor, and reports confirmation:
  ```json
  {
    "locker_number": "CM-103",
    "status": "DOOR_OPENED",
    "timestamp": 1776001200
  }
  ```

---

## 4. Hardware Simulation Mode (Included in MVP)

In this prototype, the full verification chain executes against the SQLite database:
- Generates dynamic SVG QR codes directly in the browser.
- Submits token to `/api/lockers/unlock-demo`.
- Records door unlatch event in database.
- Simulates hardware state feedback (`pinRelayState: HIGH`, `reedSwitchContact: OPEN`, `opticalSensorStatus: PACKAGE_DETECTED`).
