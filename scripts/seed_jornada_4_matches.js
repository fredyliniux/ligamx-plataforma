import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length === 2) {
    env[parts[0].trim()] = parts[1].trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const matchesToInsert = [
  // June 28
  { jornada: 4, local_team: 'Sudáfrica', visitor_team: 'Canadá', match_date: '2026-06-28 13:00:00-06', status: 'pending' },

  // June 29
  { jornada: 4, local_team: 'Brasil', visitor_team: 'Japón', match_date: '2026-06-29 11:00:00-06', status: 'pending' },
  { jornada: 4, local_team: 'Alemania', visitor_team: 'Paraguay', match_date: '2026-06-29 14:30:00-06', status: 'pending' },
  { jornada: 4, local_team: 'Países Bajos', visitor_team: 'Marruecos', match_date: '2026-06-29 19:00:00-06', status: 'pending' },

  // June 30
  { jornada: 4, local_team: 'Costa de Marfil', visitor_team: 'Noruega', match_date: '2026-06-30 11:00:00-06', status: 'pending' },
  { jornada: 4, local_team: 'Francia', visitor_team: 'Suecia', match_date: '2026-06-30 15:00:00-06', status: 'pending' },
  { jornada: 4, local_team: 'México', visitor_team: 'Ecuador', match_date: '2026-06-30 19:00:00-06', status: 'pending' },

  // July 1
  { jornada: 4, local_team: 'Inglaterra', visitor_team: 'R.D. Congo', match_date: '2026-07-01 10:00:00-06', status: 'pending' },
  { jornada: 4, local_team: 'Bélgica', visitor_team: 'Senegal', match_date: '2026-07-01 14:00:00-06', status: 'pending' },
  { jornada: 4, local_team: 'Estados Unidos', visitor_team: 'Bosnia y Herzegovina', match_date: '2026-07-01 18:00:00-06', status: 'pending' },

  // July 2
  { jornada: 4, local_team: 'España', visitor_team: 'Austria', match_date: '2026-07-02 13:00:00-06', status: 'pending' },
  { jornada: 4, local_team: 'Portugal', visitor_team: 'Croacia', match_date: '2026-07-02 17:00:00-06', status: 'pending' },
  { jornada: 4, local_team: 'Suiza', visitor_team: 'Argelia', match_date: '2026-07-02 21:00:00-06', status: 'pending' },

  // July 3
  { jornada: 4, local_team: 'Australia', visitor_team: 'Egipto', match_date: '2026-07-03 12:00:00-06', status: 'pending' },
  { jornada: 4, local_team: 'Argentina', visitor_team: 'Cabo Verde', match_date: '2026-07-03 16:00:00-06', status: 'pending' },
  { jornada: 4, local_team: 'Colombia', visitor_team: 'Ghana', match_date: '2026-07-03 19:30:00-06', status: 'pending' }
];

async function seed() {
  console.log('Cleaning existing matches for Jornada 4...');
  const { error: deleteError } = await supabase
    .from('matches')
    .delete()
    .eq('jornada', 4);

  if (deleteError) {
    console.error('Error cleaning existing matches:', deleteError.message);
    return;
  }

  console.log('Seeding 16 matches for Jornada 4...');
  const { data, error } = await supabase
    .from('matches')
    .insert(matchesToInsert)
    .select();

  if (error) {
    console.error('Error inserting matches:', error.message);
  } else {
    console.log('Successfully inserted matches:', data.length);
    data.forEach(m => {
      console.log(`- Match ${m.id} (Jor. ${m.jornada}): ${m.local_team} vs ${m.visitor_team} on ${m.match_date}`);
    });
  }
}

seed();
