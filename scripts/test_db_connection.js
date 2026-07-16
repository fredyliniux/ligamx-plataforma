import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local file
const envPath = path.join(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ No se encontró el archivo .env.local.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length === 2) {
    envVars[parts[0].trim()] = parts[1].trim();
  }
});

const url = envVars['VITE_SUPABASE_URL'];
const key = envVars['VITE_SUPABASE_ANON_KEY'];

if (!url || !key) {
  console.error('❌ Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local.');
  process.exit(1);
}

console.log('Connecting to:', url);
const supabase = createClient(url, key);

async function testConnection() {
  console.log('\n--- 🚀 Probando Conexión a Supabase ---');

  // Test 1: Participants Table
  const { data: partData, error: partErr } = await supabase
    .from('participants')
    .select('id, name, nickname')
    .limit(1);

  if (partErr) {
    console.error('❌ Error consultando tabla "participants":', partErr.message);
  } else {
    console.log('✅ Tabla "participants" encontrada y accesible (columna "nickname" verificada).');
  }

  // Test 2: Matches Table
  const { data: matchData, error: matchErr } = await supabase
    .from('matches')
    .select('id')
    .limit(1);

  if (matchErr) {
    console.error('❌ Error consultando tabla "matches":', matchErr.message);
  } else {
    console.log('✅ Tabla "matches" encontrada y accesible.');
  }

  // Test 3: Registrations Table
  const { data: regData, error: regErr } = await supabase
    .from('quiniela_registrations')
    .select('id')
    .limit(1);

  if (regErr) {
    console.error('❌ Error consultando tabla "quiniela_registrations":', regErr.message);
  } else {
    console.log('✅ Tabla "quiniela_registrations" encontrada y accesible.');
  }

  // Test 4: Forecasts Table
  const { data: foreData, error: foreErr } = await supabase
    .from('forecasts')
    .select('id')
    .limit(1);

  if (foreErr) {
    console.error('❌ Error consultando tabla "forecasts":', foreErr.message);
  } else {
    console.log('✅ Tabla "forecasts" encontrada y accesible.');
  }

  console.log('\n--- Conclusión ---');
  if (partErr || matchErr || regErr || foreErr) {
    console.error('❌ Hubo errores en algunas consultas. Verifica que ejecutaste ligamx_setup.sql en la base de datos.');
  } else {
    console.log('🎉 ¡Felicidades! Todo funciona y la base de datos está lista para usarse.');
  }
}

testConnection();
