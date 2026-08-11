const fs = require("fs");
const path = require("path");
const os = require("os");

const tomlPath = path.join(os.homedir(), "AppData", "Roaming", "xdg.config", ".wrangler", "config", "default.toml");
const toml = fs.readFileSync(tomlPath, "utf8");
const match = toml.match(/oauth_token\s*=\s*"([^"]+)"/);
const token = match[1];
const zoneId = "5ed3652548a0e8c430910c4090b02357";

fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    type: "CNAME",
    name: "www",
    content: "personalweb-bkl.pages.dev",
    proxied: true,
    ttl: 1,
  }),
})
  .then((r) => r.json())
  .then((j) => console.log(JSON.stringify(j, null, 2)))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
