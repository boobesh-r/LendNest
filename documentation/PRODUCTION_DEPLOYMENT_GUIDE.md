# LendNest — Production Deployment & Operations Guide

This guide provides complete instructions for deploying LendNest to a secure, live production environment at minimum cost.

---

## 1. System Architecture & Stack Summary

- **Frontend:** React 19 + TypeScript + Vite Single-Page Application (SPA) with responsive CSS tokens.
- **Backend:** Node.js 22.x + Express 4.x REST API with TypeScript ESM.
- **Database:** SQLite 3 via Node.js native `node:sqlite` driver with Write-Ahead Logging (`WAL`) mode enabled.
- **Runtime Requirement:** **Node.js >= 22.5.0** (due to native `node:sqlite`).
- **Currency:** Indian Rupees (INR / `₹`) using `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.

---

## 2. Recommended Hosting Options & Cost Analysis

| Setup Option | Provider | Monthly Cost | Pros | Cons |
| :--- | :--- | :--- | :--- | :--- |
| **Option 1 (Recommended)**<br>Single Linux VPS with Docker & Caddy | Hetzner Cloud (CX22) or DigitalOcean Droplet | **$4 – $6 / month** (₹350 – ₹500/mo) | Complete control, lowest recurring cost, single server serves both SPA & API, fast SQLite NVMe speed | Requires basic Linux server maintenance |
| **Option 2**<br>Managed PaaS with Persistent Disk | Render.com or Railway.app | **$7 – $12 / month** (₹600 – ₹1,000/mo) | Zero Linux server management, automatic Git deployments | Persistent storage add-on required for SQLite |
| **Option 3**<br>Decoupled Jamstack + VPS/PaaS | Vercel / Cloudflare Pages (Frontend) + VPS (Backend) | **$0 (Frontend) + $5 (Backend)** | Global CDN edge caching for static assets | Requires managing two separate domains/subdomains and CORS configs |

---

## 3. Database Strategy: SQLite vs PostgreSQL

### Current Implementation: SQLite WAL Mode
- **Why it fits now:** With `PRAGMA journal_mode = WAL;`, concurrent readers never block writers, and writes complete in microseconds on NVMe SSDs.
- **Safety Measures Implemented:**
  - `BEGIN IMMEDIATE;` transactions eliminate concurrent double-booking race conditions.
  - Built-in point-in-time snapshot backup (`npm run db:backup` and `/api/admin/backup`) using non-blocking `VACUUM INTO`.
- **Scaling Threshold:** SQLite is rock-solid for up to **50,000–100,000 visits/month** on a single VPS.

### Migration Path to PostgreSQL
If your application scales to multiple load-balanced backend instances:
1. Deploy a managed PostgreSQL instance (e.g., Neon.tech free tier or Supabase).
2. Swap table queries with a query builder like Knex or Prisma.
3. Export existing data using `sqlite3 .dump` or an automated migration script.

---

## 4. Step-by-Step Deployment Procedure (Recommended VPS Setup)

### Step 1: Provision your Server
1. Launch an **Ubuntu 24.04 LTS VPS** (1 vCPU, 2GB RAM) on Hetzner, DigitalOcean, or Linode.
2. Point your domain's DNS `A` records to the VPS public IP address:
   - `lendnest.yourdomain.com` -> `YOUR_VPS_IP`

### Step 2: Install Docker & Docker Compose
Connect to your VPS via SSH and install Docker:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### Step 3: Clone Repository & Configure Environment
```bash
git clone https://github.com/your-username/lendnest.git /opt/lendnest
cd /opt/lendnest

# Generate a cryptographically secure 64-char JWT Secret
openssl rand -hex 32

# Create production .env file
cat << 'EOF' > .env
NODE_ENV=production
PORT=5000
JWT_SECRET=your_generated_64_char_secret_from_above
DATABASE_PATH=/app/database/lendnest.sqlite
FRONTEND_URL=https://lendnest.yourdomain.com
CORS_ORIGIN=https://lendnest.yourdomain.com
ENABLE_DEMO_SERVICES=false
EOF
```

### Step 4: Build & Launch with Docker Compose
```bash
docker compose up -d --build
```
Verify the container is healthy:
```bash
docker compose ps
curl http://localhost:5000/api/health
```

### Step 5: Configure Automatic SSL with Caddy (2 Minutes)
Caddy automatically provisions free Let's Encrypt SSL certificates and renews them:
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy -y
```

Edit `/etc/caddy/Caddyfile`:
```caddy
lendnest.yourdomain.com {
    reverse_proxy localhost:5000
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```
Your application is now live at `https://lendnest.yourdomain.com` with full HTTPS!

---

## 5. Automated Database Backups & Disaster Recovery

### Automated Daily Snapshot Cron Job
Add a cron job to backup the SQLite database every day at 03:00 AM:
```bash
sudo crontab -e
```
Add the line:
```cron
0 3 * * * docker exec lendnest_app node -e "const { db } = require('./dist/database.js'); db.exec(\"VACUUM INTO '/app/database/backup_\" + Date.now() + \".sqlite'\");" && find /var/lib/docker/volumes/lendnest_lendnest_data/_data/ -name "backup_*.sqlite" -mtime +14 -delete
```

### Restoring from Backup
To restore a snapshot:
```bash
docker compose stop lendnest
cp /path/to/backup_1730000000000.sqlite ./database/lendnest.sqlite
docker compose start lendnest
```

---

## 6. Pre-Launch Production Checklist

Before onboarding paying customers or public users:

1. [ ] **Domain & SSL:** Verify HTTPS is active and HTTP automatically redirects to HTTPS.
2. [ ] **JWT Secret:** Ensure `JWT_SECRET` in `.env` is 64+ random characters and not the default dev key.
3. [ ] **Payment Gateway Approval:** Connect a licensed Indian payment gateway (e.g., Razorpay, Cashfree, or Stripe India) for live INR processing.
4. [ ] **Transactional Email (SMTP):** Integrate Resend, Postmark, or SendGrid to send real booking confirmations and password reset links.
5. [ ] **Locker Hardware Relay:** If deploying physical lockers, connect the locker unlock webhook to real IoT relay hardware (e.g., ESP32 / Raspberry Pi relay board).
6. [ ] **Legal Policies:** Publish Terms of Service, Privacy Policy, Rental Agreement, and Cancellation/Refund Policy compliant with Indian IT & Consumer Protection laws.
7. [ ] **Backup Verification:** Run `npm run db:backup` and verify the snapshot file restores cleanly.

---

## 7. Summary of Unavoidable Costs

| Item | Estimated Annual Cost | Notes |
| :--- | :--- | :--- |
| **Custom Domain Name (`.com` / `.in`)** | ₹700 – ₹1,200 / year | Namecheap, Porkbun, or GoDaddy |
| **Cloud VPS Server** | ₹4,200 – ₹6,000 / year | Hetzner (€3.8/mo) or DigitalOcean ($4–$6/mo) |
| **SSL Certificate** | **₹0 (Free)** | Automated via Let's Encrypt / Caddy |
| **Payment Gateway Setup** | **₹0 setup fee** | Razorpay / Cashfree charge ~2% per successful transaction |
| **Transactional Email (Initial Tier)** | **₹0 (Free tier)** | Resend provides 3,000 free emails/month |
| **Total Starting Cost to Launch** | **~₹5,000 – ₹7,200 / year (~₹450 – ₹600/month)** | |
