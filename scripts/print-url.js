const os = require("os");

const port = process.env.PORT || 3000;

function isIpv4(entry) {
  return entry.family === "IPv4" || entry.family === 4;
}

function getAllLocalAddresses() {
  const nets = os.networkInterfaces();
  const seen = new Set();
  const addresses = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (!isIpv4(net) || net.internal) continue;
      if (seen.has(net.address)) continue;
      seen.add(net.address);
      addresses.push({ name, address: net.address });
    }
  }

  return addresses;
}

const addresses = getAllLocalAddresses();

if (addresses.length === 0) {
  console.log("Mobile: no network address found — open /connect in the app");
} else {
  console.log("Mobile (same WiFi) — scan QR at http://localhost:" + port + "/connect");
  for (const item of addresses) {
    console.log("  " + item.name + ": http://" + item.address + ":" + port);
  }
}
