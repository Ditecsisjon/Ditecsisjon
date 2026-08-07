// Läser in .env i process.env (utan externa beroenden).
// Importeras FÖRST i server.js så att alla andra moduler ser variablerna.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  const text = fs.readFileSync(path.join(root, '.env'), 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch {
  // Ingen .env-fil – helt ok, då körs SMS i testläge.
}
