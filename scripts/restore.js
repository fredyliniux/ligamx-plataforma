import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

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

const args = process.argv.slice(2);
const backupFile = args.find(arg => !arg.startsWith('-'));
const force = args.includes('--yes') || args.includes('-y');

if (!backupFile) {
  console.error('❌ Error: Por favor especifica el archivo de backup a restaurar.');
  console.log('Ejemplo: node scripts/restore.js backups/backup-2026-06-10-14-30-00.json');
  process.exit(1);
}

const backupPath = path.resolve(process.cwd(), backupFile);
if (!fs.existsSync(backupPath)) {
  console.error(`❌ Error: El archivo de backup no existe: ${backupFile}`);
  process.exit(1);
}

// Load backup data
let backupData;
try {
  const content = fs.readFileSync(backupPath, 'utf8');
  backupData = JSON.parse(content);
} catch (e) {
  console.error('❌ Error: El archivo no es un JSON válido:', e.message);
  process.exit(1);
}

// Validate backup structure
const requiredKeys = ['participants', 'tickets', 'quiniela_registrations', 'quiniela_forecasts', 'matches', 'settings'];
const missingKeys = requiredKeys.filter(key => !(key in backupData));
if (missingKeys.length > 0) {
  console.error('❌ Error: El archivo de backup no es compatible. Faltan las llaves:', missingKeys.join(', '));
  process.exit(1);
}

async function runRestore() {
  console.log('⚠️ ADVERTENCIA: Esta operación borrará todos los datos actuales de la base de datos y los reemplazará con los del respaldo.');
  console.log(`Archivo a restaurar: ${backupFile}`);
  console.log(`Fecha del respaldo: ${backupData.timestamp || 'Desconocida'}\n`);

  if (!force) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('¿Estás seguro de que deseas continuar? Escribe "SI" para confirmar: ', resolve);
    });
    rl.close();

    if (answer.trim().toUpperCase() !== 'SI') {
      console.log('❌ Operación cancelada por el usuario.');
      process.exit(0);
    }
  }

  console.log('\n🏁 Iniciando restauración de datos...\n');
  try {
    // 1. Clear current database tables
    console.log('🧹 Limpiando base de datos actual...');
    
    // Clear participants (cascade deletes tickets, quiniela registrations, forecasts)
    const { error: clearPartError } = await supabase
      .from('participants')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (clearPartError) throw new Error(`Error limpiando participants: ${clearPartError.message}`);

    // Clear matches
    const { error: clearMatchesError } = await supabase
      .from('matches')
      .delete()
      .neq('id', 0);
    if (clearMatchesError) throw new Error(`Error limpiando matches: ${clearMatchesError.message}`);

    // Clear settings
    const { error: clearSettingsError } = await supabase
      .from('settings')
      .delete()
      .neq('key', '');
    if (clearSettingsError) throw new Error(`Error limpiando settings: ${clearSettingsError.message}`);

    console.log('✅ Base de datos limpia con éxito.');

    // 2. Insert backup data in hierarchical order
    
    // 2a. Insert participants
    if (backupData.participants.length > 0) {
      console.log(`📤 Restaurando ${backupData.participants.length} participantes...`);
      const { error } = await supabase.from('participants').insert(backupData.participants);
      if (error) throw new Error(`Error insertando participantes: ${error.message}`);
    }

    // 2b. Insert tickets
    if (backupData.tickets.length > 0) {
      console.log(`📤 Restaurando ${backupData.tickets.length} boletos de tómbola...`);
      const { error } = await supabase.from('tickets').insert(backupData.tickets);
      if (error) throw new Error(`Error insertando boletos: ${error.message}`);
    }

    // 2c. Insert quiniela registrations
    if (backupData.quiniela_registrations.length > 0) {
      console.log(`📤 Restaurando ${backupData.quiniela_registrations.length} registros de quiniela...`);
      const { error } = await supabase.from('quiniela_registrations').insert(backupData.quiniela_registrations);
      if (error) throw new Error(`Error insertando registros de quiniela: ${error.message}`);
    }

    // 2d. Insert quiniela forecasts
    if (backupData.quiniela_forecasts.length > 0) {
      console.log(`📤 Restaurando ${backupData.quiniela_forecasts.length} pronósticos de quiniela...`);
      const { error } = await supabase.from('quiniela_forecasts').insert(backupData.quiniela_forecasts);
      if (error) throw new Error(`Error insertando pronósticos: ${error.message}`);
    }

    // 2e. Insert matches
    if (backupData.matches.length > 0) {
      console.log(`📤 Restaurando ${backupData.matches.length} partidos...`);
      const { error } = await supabase.from('matches').insert(backupData.matches);
      if (error) throw new Error(`Error insertando partidos: ${error.message}`);
    }

    // 2f. Insert settings
    if (backupData.settings.length > 0) {
      console.log(`📤 Restaurando ${backupData.settings.length} configuraciones de la plataforma...`);
      const { error } = await supabase.from('settings').insert(backupData.settings);
      if (error) throw new Error(`Error insertando configuraciones: ${error.message}`);
    }

    console.log('\n🎉 ¡Restauración completada con éxito! La base de datos está restablecida.');
  } catch (error) {
    console.error('\n❌ Falló la restauración:', error.message);
    process.exit(1);
  }
}

runRestore();
