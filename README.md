# TripMapperApp

Plan Tesla trips and Supercharger stops from a phone or desktop, then send the route to the car with Tesla Fleet API.

## Tesla developer portal setup

Do this at [developer.tesla.com](https://developer.tesla.com/) before local credentials will work. Official onboarding: [What is Fleet API](https://developer.tesla.com/docs/fleet-api/getting-started/what-is-fleet-api).

### 1. Tesla account

1. Create or use a Tesla account with a **verified email**.
2. Turn on **multi-factor authentication**.
3. Sign in at [developer.tesla.com](https://developer.tesla.com/).

### 2. Create the application

1. Open **Get Started** / **Submit Request** and create an application.
2. Application name must be unique (this repo uses **TripMapperApp**). Duplicate names are often auto-rejected.
3. Fill legal/business details. Individuals typically use their own name and address.
4. Describe the app: connect a Tesla vehicle, read charge/location stats, plan trips and charging stops, send destinations to in-car navigation.

**Grant type:** choose **Authorization Code and Machine-to-Machine**.
Authorization Code is for the vehicle owner login. Machine-to-Machine is for partner registration (domain + public key).

**Allowed Origin URL(s)** — HTTPS production domain, for example:

- `https://tripmapper.example.com`

The hostname Tesla registers later must match the **root domain** of these origins (subdomains are allowed).

**Redirect URI(s)** — must match the app exactly, including scheme and path:

- Production: `https://tripmapper.example.com/api/auth/tesla/callback`
- Local (only if Tesla accepts it on your app): `http://localhost:3000/api/auth/tesla/callback`

Tesla generally expects **HTTPS** for production. Localhost HTTP is often rejected; use a tunnel (ngrok, Cloudflare Tunnel) and register that HTTPS callback instead.

**Scopes to enable** (only what this app needs):

| Portal label | Scope | Why |
| --- | --- | --- |
| Sign in with Tesla | `openid` | Tesla login |
| Refresh Tokens | `offline_access` | Stay signed in |
| Vehicle Information | `vehicle_device_data` | Charge, nearby Superchargers, vehicle details |
| Vehicle Location | `vehicle_location` | Map the car |
| Vehicle Commands | `vehicle_cmds` | Wake, send navigation |
| Vehicle Charging Management | `vehicle_charging_cmds` | Charging history / charge commands later |

Do not enable energy or enterprise scopes unless you use them.

5. Submit and wait for email approval. Unapproved apps cannot complete OAuth.
6. After approval, open the app and copy **Client ID** and **Client Secret**. Treat the secret like a password.

Personal use currently includes a small monthly usage credit; Fleet API is otherwise pay-per-request (data, wakes, commands). See Tesla’s billing page on the developer portal.

### 3. Domain, keys, and partner registration

Tesla will not honor Fleet API calls until the domain is registered **in each region** you use (NA / EU / CN).

1. Point a hostname you control at this app (or a static host for the PEM only).
2. In this repo:

   ```bash
   npm run tesla:keys
   ```

   That writes `keys/private-key.pem` (never upload this) and copies the public key to:

   `public/.well-known/appspecific/com.tesla.3p.public-key.pem`

3. Deploy or serve the public key at **exactly**:

   `https://YOUR_DOMAIN/.well-known/appspecific/com.tesla.3p.public-key.pem`

   Checks Tesla cares about:

   - HTTP **200**, not 301/302/308
   - Body starts with `-----BEGIN PUBLIC KEY-----`
   - No HTML, no auth wall, no trailing-slash redirect

   ```bash
   curl -sSI https://YOUR_DOMAIN/.well-known/appspecific/com.tesla.3p.public-key.pem
   curl -sS https://YOUR_DOMAIN/.well-known/appspecific/com.tesla.3p.public-key.pem | head
   ```

4. Put credentials in `.env.local` (see `.env.example`). Set `TESLA_APP_DOMAIN` to the hostname only, then:

   ```bash
   TESLA_APP_DOMAIN=your-domain.com bash scripts/register-partner.sh
   ```

   Repeat with `TESLA_FLEET_API_BASE` for EU/CN if needed:

   - NA: `https://fleet-api.prd.na.vn.cloud.tesla.com`
   - EU: `https://fleet-api.prd.eu.vn.cloud.tesla.com`
   - CN: `https://fleet-api.prd.cn.vn.cloud.tesla.com`

Docs: [Partner tokens](https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens), [Register](https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints).

### 4. User OAuth and virtual key

1. Owner opens **Connect Tesla** (`/api/auth/tesla`).
2. Tesla redirects to `/api/auth/tesla/callback` with a `code`.
3. Reading stats works after consent. **Sending navigation** also needs the app virtual key on the car.
4. After the owner grants `vehicle_device_data`, `vehicle_cmds`, or `vehicle_location`, open:

   `https://tesla.com/_ak/YOUR_DOMAIN`

   optionally `?vin=VIN`. Approve the key in the Tesla mobile app. Remove it later from the car **Locks** screen.

Commands are signed with `keys/private-key.pem`. Newer vehicles reject unsigned commands. The next step after this baseline is Tesla’s [vehicle-command proxy](https://github.com/teslamotors/vehicle-command). Pre-2021 S/X and some fleet vehicles are exceptions.

## Local app setup

This machine did not have Node.js when the project was created. Install **Node 22+**, then:

```bash
cd ~/Projects/TripMapperApp
cp .env.example .env.local
# paste Client ID / Secret / redirect URI / session secret
npm install
npm run tesla:keys
npm run dev
```

Open `http://localhost:3000` on the computer, or the same URL from Chrome on an Android phone on your network.

## Android

The same Next.js app is the Android app. Tesla OAuth must return to an **HTTPS origin you registered**, so phones should use the deployed site (or an HTTPS tunnel), not a custom `tripmapper://` scheme.

### Run in Chrome (fastest)

1. Deploy or tunnel the app over HTTPS.
2. On the phone, open that URL in Chrome.
3. Use **Connect Tesla** as on desktop.
4. Chrome may show **Install app** / **Add to Home screen**. That installs a standalone PWA (home-screen icon, no browser chrome). The in-app **Install TripMapper on this phone** button uses the same prompt when Chrome offers it.

Register the HTTPS redirect URI on developer.tesla.com:

`https://YOUR_DOMAIN/api/auth/tesla/callback`

### Build a sideloadable APK (Capacitor)

The Android project wraps the **hosted** Next.js site in a WebView so login cookies and Tesla redirects stay on that origin.

```bash
npm install
python3 scripts/generate-icons.py
export CAPACITOR_SERVER_URL=https://YOUR_DOMAIN
npx cap add android    # first time only
npx cap sync android
npx cap open android   # Android Studio: Run on a device or emulator
```

Install Android Studio and an SDK. Set `CAPACITOR_SERVER_URL` in the environment (or `.env.local`) to the same value as `TESLA_APP_ORIGIN`.

`allowNavigation` includes `auth.tesla.com` so the Tesla login page can open inside the app, then return to `/api/auth/tesla/callback`.

## What Tesla API does *not* replace

Fleet API does not expose the full in-car trip planner. This app:

- Reads live vehicle + nearby Superchargers
- Lets you pick a destination in the app
- Sends that destination (or waypoints) to the car with `navigation_request` / `navigation_waypoints_request`

A smarter multi-stop energy model can be added later; Tesla still computes the driving path once the car receives the destination.

Useful endpoints already wired:

- `GET /api/1/vehicles`
- `POST /api/1/vehicles/{vin}/wake_up`
- `GET /api/1/vehicles/{vin}/vehicle_data`
- `GET /api/1/vehicles/{vin}/nearby_charging_sites`
- `POST /api/1/vehicles/{vin}/command/navigation_request`
- `POST /api/1/vehicles/{vin}/command/navigation_waypoints_request`

## Portal field cheat sheet for TripMapperApp

Copy these into developer.tesla.com while creating the app (swap in your real domain):

- **App name:** TripMapperApp
- **Grant type:** Authorization Code and Machine-to-Machine
- **Allowed origin:** `https://YOUR_DOMAIN` (same origin for desktop, Android PWA, and Capacitor)
- **Redirect URI:** `https://YOUR_DOMAIN/api/auth/tesla/callback`
- **Scopes:** Sign in, Refresh Tokens, Vehicle Information, Vehicle Location, Vehicle Commands, Vehicle Charging Management
