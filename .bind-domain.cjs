const fs = require("fs");
const path = require("path");
const os = require("os");

const tomlPath = path.join(os.homedir(), "AppData", "Roaming", "xdg.config", ".wrangler", "config", "default.toml");
const toml = fs.readFileSync(tomlPath, "utf8");
const match = toml.match(/oauth_token\s*=\s*"([^"]+)"/);
if (!match) {
  console.error("no token found");
  process.exit(1);
}
const token = match[1];
const accountId = "6a638c3c2047a3ce064af7e4febb0ead";
const project = "personalweb";
const domain = "www.zhouhaoze.com";

fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${project}/domains`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ name: domain }),
})
  .then((r) => r.json())
  .then((j) => {
    console.log(JSON.stringify(j, null, 2));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
