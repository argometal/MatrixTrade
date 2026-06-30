# Mobile connect

Access MatrixTrade from phone on the same network.

## Flow

1. PC: run `start.bat`
2. Open `http://localhost:3000/connect` (or dashboard → **Show QR codes**)
3. Scan any QR — one per local IP (WiFi, Ethernet, VPN, etc.)
4. Try next QR if one fails

## Technical

- Dev server binds `0.0.0.0:3000`
- QR = PNG generated server-side per URL
- Copy URL button per card

## Firewall

If phone cannot connect, run `allow-firewall.bat` as Administrator (Windows).

## Use on phone

- View dashboard and trades
- **Copy Full Context** → paste into ChatGPT mobile

No editing required on phone for basic handoff workflow.
