# RX Wheel

Visual medication schedule planner. A React web app that places equally-spaced doses around a 24-hour clock.

Live at: **rxwheel.com**

## Quick start (local dev)

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`.

## Build for production

```bash
npm run build
```

Outputs to `dist/`. Upload that folder's contents to your web server.

## Project structure

```
rxwheel/
├── public/                  Static assets served as-is
│   ├── manifest.json        PWA manifest
│   ├── robots.txt           Search engine instructions
│   └── sitemap.xml          Sitemap for search engines
├── src/
│   ├── App.jsx              The whole app — single React component
│   ├── main.jsx             React entry point
│   └── index.css            Tailwind directives + base styles
├── index.html               HTML shell with all SEO metadata
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── deploy.sh                rsync build to droplet (edit IP first)
├── nginx.conf               nginx config to install on droplet
└── README.md
```

## Icons you still need to create

The metadata in `index.html` and `manifest.json` references these — make them and put in `public/`:

| Filename | Size | Purpose |
|---|---|---|
| favicon.png | 32×32 | Browser tab |
| apple-touch-icon.png | 180×180 | iOS home screen |
| icon-192.png | 192×192 | PWA (Android) |
| icon-512.png | 512×512 | PWA (large) |
| og-image.png | 1200×630 | Link preview on social/messaging |

The og-image is the most important — controls how your link looks when someone shares it. Use the wheel logo on the dark slate background `#020617` with the wordmark next to it.

## Deploy to DigitalOcean droplet

### One-time droplet setup

SSH in and install nginx + Let's Encrypt:

```bash
ssh root@YOUR_DROPLET_IP
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx ufw
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
mkdir -p /var/www/rxwheel
```

Point your DNS at the droplet (in your domain registrar):
- A record: `@` → droplet IP
- A record: `www` → droplet IP

Wait for DNS to propagate (5–30 min). Test with `dig rxwheel.com`.

Upload the nginx config:

```bash
# On your local machine:
scp nginx.conf root@YOUR_DROPLET_IP:/etc/nginx/sites-available/rxwheel

# Then SSH in:
ssh root@YOUR_DROPLET_IP
ln -s /etc/nginx/sites-available/rxwheel /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

Get HTTPS:

```bash
certbot --nginx -d rxwheel.com -d www.rxwheel.com
```

### Each deploy

1. Edit `deploy.sh` once to set your `DROPLET_HOST` (your droplet IP)
2. `chmod +x deploy.sh` once
3. After that: `./deploy.sh` builds and uploads in one command

## After launch

1. [Google Search Console](https://search.google.com/search-console) → add property → submit `https://rxwheel.com/sitemap.xml`
2. [Bing Webmaster Tools](https://www.bing.com/webmasters) → same
3. Test the link preview at [opengraph.xyz](https://www.opengraph.xyz)
4. Run [PageSpeed Insights](https://pagespeed.web.dev) to verify performance

## App features (for reference)

- Visual 24-hour clock with day (amber) / night (indigo) arcs
- Up to 5 medications, each with unique color and concentric ring
- Drag any dot to shift schedule (snaps to 5 min)
- 12h / 24h toggle
- Edit medication names
- Swipe medication card left to delete
- Schedule summary with Copy button
- Add to Calendar (.ics export with daily-recurring events + reminders)
- Restore code: copy/paste to save and restore your schedule
- Mobile-first responsive design
- Works offline once loaded (no API calls)
