// Shared session mapping for n8n session IDs to frontend session IDs
// Using a simple file-based storage since in-memory doesn't work across processes
import fs from 'fs';
import path from 'path';

const MAPPING_FILE = path.join(process.cwd(), '.session-mappings.json');

function loadMappings(): Record<string, string> {
  try {
    if (fs.existsSync(MAPPING_FILE)) {
      const data = fs.readFileSync(MAPPING_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load session mappings:', error);
  }
  return {};
}

function saveMappings(mappings: Record<string, string>) {
  try {
    fs.writeFileSync(MAPPING_FILE, JSON.stringify(mappings, null, 2));
  } catch (error) {
    console.error('Failed to save session mappings:', error);
  }
}

export function setSessionMapping(n8nSessionId: string, frontendSessionId: string) {
  const mappings = loadMappings();
  mappings[n8nSessionId] = frontendSessionId;
  saveMappings(mappings);
  console.log(`Mapped n8n session ${n8nSessionId} -> frontend session ${frontendSessionId}`);
}

export function getSessionMapping(n8nSessionId: string): string | undefined {
  const mappings = loadMappings();
  return mappings[n8nSessionId];
}

export function getAllMappings(): Array<[string, string]> {
  const mappings = loadMappings();
  return Object.entries(mappings);
}
