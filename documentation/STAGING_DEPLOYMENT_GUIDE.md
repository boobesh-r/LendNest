# LendNest — Staging Deployment & Local Docker Validation Guide

This guide provides end-to-end instructions for validating LendNest locally and preparing a staging deployment on a low-cost Linux VPS with Caddy HTTPS, without committing secrets, losing data, or incurring unexpected expenses.

---

## 1. Local Docker Validation on Windows

### Prerequisites
- **Docker Desktop for Windows** (with WSL 2 backend).
  - If Docker Desktop is **not yet installed**, follow Section 1.1 first to validate using Node.js without Docker.
  - Once Docker Desktop is installed and running, proceed to Section 1.2.

---

### 1.1 What Can Be Validated on Windows WITHOUT Docker Installed (Tested & Verified)
You can validate the full application stack directly using Node.js 22:

1. **Verify Backend & Frontend Compilation:**
   ```powershell
   npm run build
   ```
   *Expected:* Compiles backend ESM JavaScript into `backend/dist` and frontend SPA into `frontend/dist`. Both must succeed with Exit Code 0.

2. **Verify Full Automated Test Suite:**
   ```powershell
   npm test
   ```
   *Expected:* Runs 14 automated tests covering database persistence, date conflict prevention, INR pricing, QR locker engine, and demo payments. All 14 must pass.

3. **Verify Production Server & Static Frontend Delivery:**
   ```powershell
   cd backend
   $env:NODE_ENV="production"
   $env:PORT="5001"
   $env:JWT_SECRET="7f8d9a2b4c6e8013579bdf02468ace13579bdf02468ace13579bdf02468ace13"
   node dist/server.js
   ```
   Open `http://localhost:5001` in your browser. Verify that the React SPA loads and that `http://localhost:5001/api/health` returns `{"status":"healthy"}`.

4. **Verify Database Snapshot & Non-Destructive Backup:**
   ```powershell
   cd backend
   npm run db:backup
   ```
   *Expected:* Creates an online SQLite snapshot in `database/backups/lendnest-backup-*.sqlite` without locking readers or modifying live data.

---

### 1.2 Local Docker Build & Container Validation (Requires Docker Desktop)
*These steps can only be executed once Docker Desktop is installed and running on Windows:*

1. **Build the Production Docker Image:**
   In PowerShell at the project root (`f:\lendnest`):
   ```powershell
   docker build -t lendnest:staging .
   ```
   *What this validates:* Multi-stage build executes cleanly, compiling the frontend in Stage 1, compiling backend TypeScript in Stage 2, and packaging the lean Node 22 Alpine runner in Stage 3.

2. **Create a Test Volume & Run the Container Locally:**
   ```powershell
   docker run -d `
     --name lendnest_staging_test `
     -p 5000:5000 `
     -e NODE_ENV=production `
     -e JWT_SECRET="7f8d9a2b4c6e8013579bdf02468ace13579bdf02468ace13579bdf02468ace13" `
     -e DATABASE_PATH="/app/database/lendnest.sqlite" `
     -v lendnest_test_volume:/app/database `
     lendnest:staging
   ```

3. **Verify Container Status & Health Check:**
   ```powershell
   docker ps -f name=lendnest_staging_test
   docker exec lendnest_staging_test wget -qO- http://localhost:5000/api/health
   ```
   *Expected output:* `{"status":"healthy","platform":"LendNest Smart Rental & Sharing Platform",...}`

4. **Verify Static Frontend Delivery from Container:**
   Open `http://localhost:5000` in Google Chrome or Edge.
   *Expected:* The full LendNest React interface renders with INR (`₹`) prices, items catalog, and working navigation.

5. **Verify Data Persistence Across Container Deletion:**
   - Add a test item or register a test user through the UI at `http://localhost:5000`.
   - Delete the running container:
     ```powershell
     docker rm -f lendnest_staging_test
     ```
   - Re-launch a brand-new container mounting the **same volume**:
     ```powershell
     docker run -d `
       --name lendnest_staging_test2 `
       -p 5000:5000 `
       -e NODE_ENV=production `
       -e JWT_SECRET="7f8d9a2b4c6e8013579bdf02468ace13579bdf02468ace13579bdf02468ace13" `
       -e DATABASE_PATH="/app/database/lendnest.sqlite" `
       -v lendnest_test_volume:/app/database `
       lendnest:staging
     ```
   - Refresh `http://localhost:5000` and confirm your test user and items are still present.
   - Clean up test container and test volume when finished:
     ```powershell
     docker rm -f lendnest_staging_test2
     docker volume rm lendnest_test_volume
     ```

---

## 2. Docker Storage Persistence & Container Replacement Safety

### Where SQLite Data Lives
- **Inside the Container:** At `/app/database/lendnest.sqlite`.
- **On the Host Machine (Docker Named Volume):** In `docker-compose.yml`, the volume `lendnest_data` is mounted to `/app/database`.
- On Linux VPS hosts, Docker stores named volumes at `/var/lib/docker/volumes/lendnest_lendnest_data/_data/lendnest.sqlite`.

### Why Data Survives Container Replacement
- Docker named volumes have a **decoupled lifecycle** from containers.
- When you execute:
  ```bash
  docker compose down
  docker compose pull (or git pull)
  docker compose up -d --build
  ```
  The old container is destroyed, a new container is instantiated with updated application code, and Docker **re-attaches the existing `lendnest_data` volume**.
- **Crucial Rule:** **NEVER** pass the `-v` flag to `docker compose down` (i.e. do NOT run `docker compose down -v`), as the `-v` flag instructs Docker to delete attached volumes.

---

## 3. Required Environment Variables

All configuration is managed through a single `.env` file on the server.

| Variable | Required in Production/Staging? | Default / Example Value | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | **YES** | `production` | Enforces production mode, hides demo credentials, and enables strict JWT checking. |
| `PORT` | **YES** | `5000` | Port Express listens on inside the container. |
| `JWT_SECRET` | **YES** | *64-character random hex* | Cryptographic signing key for user authentication tokens. Must be >= 32 characters. |
| `DATABASE_PATH` | **YES** | `/app/database/lendnest.sqlite` | Absolute path to SQLite database inside container volume. |
| `FRONTEND_URL` | **YES** | `https://staging.yourdomain.com` | Full HTTPS URL of your staging site (used for CORS and redirect security). |
| `CORS_ORIGIN` | **YES** | `https://staging.yourdomain.com` | Allowed origin for incoming API requests. |
| `ENABLE_DEMO_SERVICES` | **YES** | `true` (for staging) / `false` (for live) | Controls sandbox simulation banners and demo payment flows. |
| `FRONTEND_DIST` | **NO** (Auto-detected) | `/app/frontend/dist` | Directory where compiled React static assets reside. |

---

## 4. How to Generate `JWT_SECRET` Without Exposing or Committing It

Never commit your production `JWT_SECRET` to GitHub or paste it in chat. Generate it directly on your server so it writes straight into `.env`:

### On Linux VPS (Bash):
```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" >> /opt/lendnest/.env
```

### On Windows PowerShell (Using Node.js crypto):
```powershell
node -e "require('fs').appendFileSync('.env', 'JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex') + '\n')"
```
*Result:* A cryptographically secure 64-character random string is appended directly to `.env` without being echoed to the console screen or committed to version control.

---

## 5. Deploying Cleanly (No Demo Users / No Database Reset)

### How LendNest Handles Startup
1. When LendNest starts, `initDatabase()` in [`database.ts`](file:///f:/lendnest/backend/src/database.ts) runs:
   ```sql
   CREATE TABLE IF NOT EXISTS users (...);
   CREATE TABLE IF NOT EXISTS items (...);
   ...
   ```
2. **`initDatabase()` DOES NOT insert any users, items, or demo data.** It only ensures tables exist.
3. The demo seed script ([`seed.ts`](file:///f:/lendnest/backend/src/seed.ts)) is **never called on server startup**. It can only be called manually via `npm run seed`.
4. Furthermore, [`seed.ts`](file:///f:/lendnest/backend/src/seed.ts#L5-L11) has an automated production safety lock:
   ```typescript
   if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
     console.error('SECURITY BLOCKED: Refusing to seed database in production mode!');
     return;
   }
   ```
   Even if someone accidentally triggers `npm run seed` in production, execution is blocked.

### Option A: Clean Deployment (Empty Production Database)
Simply start the container with an empty volume. SQLite creates `lendnest.sqlite` with all tables ready, and the platform starts with 0 users and 0 items. You register the first real admin user through the UI.

### Option B: Migrating an Existing Local Database to Staging (First-Time Setup Only)
> ⚠️ **CRITICAL OVERWRITE WARNING:** The copy command below directly replaces `/app/database/lendnest.sqlite` inside the Docker volume. Only execute this command during the **initial first-time setup** or as an intentional disaster-recovery restore. Running this on an active staging or production server that already has user accounts, listings, or bookings will permanently overwrite the active database. Always verify whether data already exists, and take a backup snapshot first before importing.

If you are performing a first-time setup and want to copy your existing local database (`f:\lendnest\database\lendnest.sqlite`) to the staging VPS:
1. Transfer the database file to your server via `scp`:
   ```bash
   scp f:\lendnest\database\lendnest.sqlite user@your-vps-ip:/tmp/lendnest.sqlite
   ```
2. On the VPS, create the dedicated volume `lendnest_data` (explicitly matching `name: lendnest_data` in `docker-compose.yml`) and copy the file into it before starting the container:
   ```bash
   docker volume create lendnest_data
   docker run --rm -v lendnest_data:/app/database -v /tmp:/transfer alpine cp /transfer/lendnest.sqlite /app/database/lendnest.sqlite
   rm /tmp/lendnest.sqlite
   ```
3. Start the container (`docker compose up -d`). Your existing items and users are immediately available.

---

## 6. Staging Deployment Checklist (Linux VPS + Caddy HTTPS)

### Phase 1: Server Provisioning & Hardening
- [ ] Deploy Ubuntu 24.04 LTS VPS (1 vCPU, 2GB RAM on Hetzner CX22 or DigitalOcean Droplet).
- [ ] Configure SSH key authentication (disable password authentication in `/etc/ssh/sshd_config`).
- [ ] Configure UFW Firewall:
  ```bash
  sudo ufw allow OpenSSH
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```
- [ ] Point staging DNS record:
  - Type `A`: `staging.yourdomain.com` -> `VPS_PUBLIC_IP`
  - *(Alternative without custom domain: Use a free `nip.io` domain, e.g. `lendnest.YOUR_IP.nip.io`)*

### Phase 2: Install Docker & Caddy
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy -y
```

### Phase 3: Clone Code & Configure Staging `.env`
```bash
sudo git clone https://github.com/your-username/lendnest.git /opt/lendnest
cd /opt/lendnest

# Create staging .env file
sudo tee .env > /dev/null << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_PATH=/app/database/lendnest.sqlite
FRONTEND_URL=https://staging.yourdomain.com
CORS_ORIGIN=https://staging.yourdomain.com
ENABLE_DEMO_SERVICES=true
EOF

# Append secure random JWT_SECRET directly without echoing
sudo bash -c 'echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env'
```

### Phase 4: Configure Caddy for Automatic HTTPS
Edit `/etc/caddy/Caddyfile`:
```caddy
staging.yourdomain.com {
    reverse_proxy localhost:5000
}
```
Reload Caddy:
```bash
sudo systemctl reload caddy
```

### Phase 5: Launch Container
```bash
cd /opt/lendnest
sudo docker compose up -d --build
```
Verify health:
```bash
curl https://staging.yourdomain.com/api/health
```

---

## 7. Safe Rollback & Database Backup Procedure

### Safe Pre-Deployment Backup
Always take a snapshot before pulling new code or rebuilding containers:
```bash
# Trigger point-in-time snapshot directly inside the running container
sudo docker exec lendnest_app node -e "require('./dist/utils/backup.js').createDatabaseBackup()"

# Copy the snapshot safely out of the volume onto the host filesystem
sudo docker cp lendnest_app:/app/database/backups /opt/lendnest/backups_host
```

### Immediate Rollback Procedure (If New Deployment Has Issues)
1. **Rollback Container Image / Git Commit:**
   ```bash
   cd /opt/lendnest
   git checkout <PREVIOUS_STABLE_COMMIT_OR_TAG>
   sudo docker compose up -d --build
   ```
2. **Restore Database from Snapshot (If Data Was Altered):**
   ```bash
   # Stop the container
   sudo docker compose stop lendnest

   # Restore database from previous snapshot
   sudo docker run --rm -v lendnest_data:/app/database -v /opt/lendnest/backups_host:/backups alpine cp /backups/lendnest-backup-TIMESTAMP.sqlite /app/database/lendnest.sqlite

   # Restart the container
   sudo docker compose start lendnest
   ```

---

## 8. Summary of Estimated Recurring Costs

| Component | Provider | Billing Frequency | Cost (USD) | Cost (INR) |
| :--- | :--- | :--- | :--- | :--- |
| **Cloud VPS Server** | Hetzner Cloud (CX22) / DigitalOcean | Monthly | **$4.00 – $6.00 / mo** | **₹350 – ₹500 / mo** |
| **SSL / HTTPS Certificates** | Let's Encrypt via Caddy | Continuous | **$0.00 (Free)** | **₹0** |
| **Domain Name (Optional for Staging)** | Porkbun / Namecheap | Annual | **~$8.00 – $10.00 / yr** | **~₹700 – ₹850 / yr** |
| *(Free Staging Alternative)* | `nip.io` or `duckdns.org` | Never | **$0.00 (Free)** | **₹0** |
| **Total Estimated Staging Cost** | — | Monthly | **~$4.00 – $6.00 / mo** | **~₹350 – ₹500 / mo** |

---

## 9. Exact Next Actions to Take (In Order)

1. **Step 1 (Local):** If you wish to test Docker locally on Windows, install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) and run the local container validation commands from Section 1.2.
2. **Step 2 (Git):** Push your current LendNest repository to your private GitHub or GitLab repository (`git add .`, `git commit -m "chore: staging production configuration"`, `git push`).
3. **Step 3 (Hosting):** Create an account on Hetzner Cloud (or DigitalOcean) and spin up a 1 vCPU, 2GB RAM Ubuntu 24.04 server (~$4/month).
4. **Step 4 (DNS):** Point `staging.yourdomain.com` (or free `nip.io`) to your server IP.
5. **Step 5 (Deploy):** Follow Phase 2 through Phase 5 in Section 6 to clone, set `.env`, and launch `docker compose up -d --build`.
