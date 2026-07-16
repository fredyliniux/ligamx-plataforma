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
const supabase = createClient(url, key);

const matches = [
  {
    jornada: 1,
    local_team: 'Necaxa',
    visitor_team: 'Atlante',
    match_date: '2026-07-16T19:00:00-06:00', // Jueves 16 de Julio 19:00 h
    status: 'pending'
  },
  {
    jornada: 1,
    local_team: 'Tijuana',
    visitor_team: 'Tigres UANL',
    match_date: '2026-07-16T21:10:00-06:00', // Jueves 16 de Julio 21:10 h
    status: 'pending'
  },
  {
    jornada: 1,
    local_team: 'Atlético de San Luis',
    visitor_team: 'Cruz Azul',
    match_date: '2026-07-17T19:00:00-06:00', // Viernes 17 de Julio 19:00 h
    status: 'pending'
  },
  {
    jornada: 1,
    local_team: 'León',
    visitor_team: 'Atlas',
    match_date: '2026-07-17T19:00:00-06:00', // Viernes 17 de Julio 19:00 h
    status: 'pending'
  },
  {
    jornada: 1,
    local_team: 'Juárez',
    visitor_team: 'Puebla',
    match_date: '2026-07-17T21:00:00-06:00', // Viernes 17 de Julio 21:00 h
    status: 'pending'
  },
  {
    jornada: 1,
    local_team: 'Pumas UNAM',
    visitor_team: 'Pachuca',
    match_date: '2026-07-18T17:00:00-06:00', // Sábado 18 de Julio 17:00 h
    status: 'pending'
  },
  {
    jornada: 1,
    local_team: 'Monterrey',
    visitor_team: 'Santos Laguna',
    match_date: '2026-07-18T19:05:00-06:00', // Sábado 18 de Julio 19:05 h
    status: 'pending'
  },
  {
    jornada: 1,
    local_team: 'Guadalajara',
    visitor_team: 'Toluca',
    match_date: '2026-07-18T19:07:00-06:00', // Sábado 18 de Julio 19:07 h
    status: 'pending'
  },
  {
    jornada: 1,
    local_team: 'Querétaro',
    visitor_team: 'América',
    match_date: '2026-07-18T21:10:00-06:00', // Sábado 18 de Julio 21:10 h
    status: 'pending'
  }
];

async function seedMatches() {
  console.log('Seeding Liga MX Jornada 1 Matches...');

  // Delete existing Jornada 1 matches to avoid duplicate runs
  const { error: deleteErr } = await supabase
    .from('matches')
    .delete()
    .eq('jornada', 1);

  if (deleteErr) {
    console.error('Error cleaning old matches:', deleteErr.message);
    process.exit(1);
  }

  const { data, error } = await supabase
    .from('matches')
    .insert(matches)
    .select();

  if (error) {
    console.error('Error seeding matches:', error.message);
  } else {
    console.log(`✅ Successfully seeded ${data.length} matches for Liga MX Jornada 1!`);
  }
}

seedMatches();
