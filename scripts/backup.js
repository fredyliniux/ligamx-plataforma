import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

// Helper to parse .env.local file
function loadEnv() {
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: El archivo .env.local no existe en la raíz del proyecto.');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no se encontraron en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function fetchTable(tableName) {
  console.log(`📥 Descargando tabla: ${tableName}...`);
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) {
    throw new Error(`Error descargando la tabla ${tableName}: ${error.message}`);
  }
  console.log(`✅ ${data.length} registros obtenidos de ${tableName}.`);
  return data;
}

async function runBackup() {
  console.log('🏁 Iniciando respaldo de base de datos de Quiniela El Atorón...\n');
  try {
    const backupData = {
      timestamp: new Date().toISOString(),
      participants: await fetchTable('participants'),
      tickets: await fetchTable('tickets'),
      quiniela_registrations: await fetchTable('quiniela_registrations'),
      quiniela_forecasts: await fetchTable('quiniela_forecasts'),
      matches: await fetchTable('matches'),
      settings: await fetchTable('settings')
    };

    const backupsDir = path.resolve(__dirname, '../backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const timestampStr = new Date().toISOString().split('.')[0].replace(/[:T]/g, '-');
    const filename = `backup-${timestampStr}.json`;
    const outputPath = path.join(backupsDir, filename);

    fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`\n🎉 ¡Respaldo completado con éxito! Guardado en: backups/${filename}`);
  } catch (error) {
    console.error('\n❌ Falló el respaldo:', error.message);
    process.exit(1);
  }
}

runBackup();
