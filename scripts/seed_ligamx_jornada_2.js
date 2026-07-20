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
    jornada: 2,
    local_team: 'América',
    visitor_team: 'Querétaro',
    match_date: '2026-07-24T19:00:00-06:00',
    status: 'pending'
  },
  {
    jornada: 2,
    local_team: 'Mazatlán',
    visitor_team: 'Atlético de San Luis',
    match_date: '2026-07-24T21:00:00-06:00',
    status: 'pending'
  },
  {
    jornada: 2,
    local_team: 'Tijuana',
    visitor_team: 'Guadalajara',
    match_date: '2026-07-24T21:00:00-06:00',
    status: 'pending'
  },
  {
    jornada: 2,
    local_team: 'Atlas',
    visitor_team: 'Tigres UANL',
    match_date: '2026-07-24T21:05:00-06:00',
    status: 'pending'
  },
  {
    jornada: 2,
    local_team: 'Necaxa',
    visitor_team: 'Puebla',
    match_date: '2026-07-25T17:00:00-06:00',
    status: 'pending'
  },
  {
    jornada: 2,
    local_team: 'León',
    visitor_team: 'Pachuca',
    match_date: '2026-07-25T17:00:00-06:00',
    status: 'pending'
  },
  {
    jornada: 2,
    local_team: 'Toluca',
    visitor_team: 'Juárez',
    match_date: '2026-07-25T19:00:00-06:00',
    status: 'pending'
  },
  {
    jornada: 2,
    local_team: 'Santos Laguna',
    visitor_team: 'Pumas UNAM',
    match_date: '2026-07-25T19:05:00-06:00',
    status: 'pending'
  },
  {
    jornada: 2,
    local_team: 'Monterrey',
    visitor_team: 'Cruz Azul',
    match_date: '2026-07-25T21:00:00-06:00',
    status: 'pending'
  }
];

async function seedMatches() {
  console.log('Seeding Liga MX Jornada 2 Matches...');

  // Delete existing Jornada 2 matches to avoid duplicate runs
  const { error: deleteErr } = await supabase
    .from('matches')
    .delete()
    .eq('jornada', 2);

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
    console.log(`✅ Successfully seeded ${data.length} matches for Liga MX Jornada 2!`);
  }
}

seedMatches();
