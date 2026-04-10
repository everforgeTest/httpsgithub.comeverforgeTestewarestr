const fs = require('fs');

let env = {};
try {
  const res = fs.readFileSync('.env', 'utf8');
  res.split(/\?\
/).forEach((line) => {
    if (!line || line.trim().length === 0 || line.trim().startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx === -1) return;
    const key = line.substring(0, idx);
    const valRaw = line.substring(idx + 1);
    const val = valRaw;
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
      env[key] = val.slice(1, -1);
    } else {
      env[key] = val;
    }
  });
} catch (e) {
  // .env may not exist during some builds; fallback to empty
}

module.exports = env;
