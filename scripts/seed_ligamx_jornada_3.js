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
    jornada: 3,
    local_team: 'Puebla',
    visitor_team: 'Santos Laguna',
    match_date: '2026-07-31T19:00:00-06:00', // Viernes 31 de Julio 19:00 h
    status: 'pending'
  },
  {
    jornada: 3,
    local_team: 'Querétaro',
    visitor_team: 'Cruz Azul',
    match_date: '2026-07-31T21:00:00-06:00', // Viernes 31 de Julio 21:00 h
    status: 'pending'
  },
  {
    jornada: 3,
    local_team: 'Tijuana',
    visitor_team: 'Guadalajara',
    match_date: '2026-07-31T21:05:00-06:00', // Viernes 31 de Julio 21:05 h
    status: 'pending'
  },
  {
    jornada: 3,
    local_team: 'Tigres UANL',
    visitor_team: 'Toluca',
    match_date: '2026-08-01T17:00:00-06:00', // Sábado 1 de Agosto 17:00 h
    status: 'pending'
  },
  {
    jornada: 3,
    local_team: 'América',
    visitor_team: 'Necaxa',
    match_date: '2026-08-01T19:00:00-06:00', // Sábado 1 de Agosto 19:00 h
    status: 'pending'
  },
  {
    jornada: 3,
    local_team: 'Atlas',
    visitor_team: 'Pachuca',
    match_date: '2026-08-01T21:05:00-06:00', // Sábado 1 de Agosto 21:05 h
    status: 'pending'
  },
  {
    jornada: 3,
    local_team: 'Pumas UNAM',
    visitor_team: 'León',
    match_date: '2026-08-02T17:00:00-06:00', // Domingo 2 de Agosto 17:00 h
    status: 'pending'
  },
  {
    jornada: 3,
    local_team: 'Atlético de San Luis',
    visitor_team: 'Monterrey',
    match_date: '2026-08-02T17:00:00-06:00', // Domingo 2 de Agosto 17:00 h
    status: 'pending'
  },
  {
    jornada: 3,
    local_team: 'Juárez',
    visitor_team: 'Mazatlán',
    match_date: '2026-08-02T19:00:00-06:00', // Domingo 2 de Agosto 19:00 h
    status: 'pending'
  }
];

async function seedMatches() {
  console.log('Seeding official Liga MX Jornada 3 Matches from ligamx.net...');

  // Delete existing Jornada 3 matches to avoid duplicate runs
  const { error: deleteErr } = await supabase
    .from('matches')
    .delete()
    .eq('jornada', 3);

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
    console.log(`✅ Successfully seeded ${data.length} official matches for Liga MX Jornada 3!`);
  }
}

seedMatches();
