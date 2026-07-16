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
  // June 24
  { jornada: 3, local_team: 'Chequia', visitor_team: 'México', match_date: '2026-06-24 11:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Sudáfrica', visitor_team: 'Corea del Sur', match_date: '2026-06-24 11:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Suiza', visitor_team: 'Canadá', match_date: '2026-06-24 14:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Bosnia y Herzegovina', visitor_team: 'Catar', match_date: '2026-06-24 14:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Escocia', visitor_team: 'Brasil', match_date: '2026-06-24 19:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Marruecos', visitor_team: 'Haití', match_date: '2026-06-24 19:00:00-06', status: 'pending' },

  // June 25
  { jornada: 3, local_team: 'Turquía', visitor_team: 'Estados Unidos', match_date: '2026-06-25 11:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Paraguay', visitor_team: 'Australia', match_date: '2026-06-25 11:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Curazao', visitor_team: 'Costa de Marfil', match_date: '2026-06-25 14:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Ecuador', visitor_team: 'Alemania', match_date: '2026-06-25 19:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Japón', visitor_team: 'Suecia', match_date: '2026-06-25 19:00:00-06', status: 'pending' },

  // June 26
  { jornada: 3, local_team: 'Túnez', visitor_team: 'Países Bajos', match_date: '2026-06-26 11:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Egipto', visitor_team: 'Irán', match_date: '2026-06-26 11:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Nueva Zelanda', visitor_team: 'Bélgica', match_date: '2026-06-26 14:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Cabo Verde', visitor_team: 'Arabia Saudita', match_date: '2026-06-26 14:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Uruguay', visitor_team: 'España', match_date: '2026-06-26 14:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Noruega', visitor_team: 'Francia', match_date: '2026-06-26 14:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Senegal', visitor_team: 'Irak', match_date: '2026-06-26 19:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Argelia', visitor_team: 'Austria', match_date: '2026-06-26 11:00:00-06', status: 'pending' },

  // June 27
  { jornada: 3, local_team: 'Jordania', visitor_team: 'Argentina', match_date: '2026-06-27 11:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Colombia', visitor_team: 'Portugal', match_date: '2026-06-27 14:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'R.D. Congo', visitor_team: 'Uzbekistán', match_date: '2026-06-27 19:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Panamá', visitor_team: 'Inglaterra', match_date: '2026-06-27 19:00:00-06', status: 'pending' },
  { jornada: 3, local_team: 'Croacia', visitor_team: 'Ghana', match_date: '2026-06-27 19:00:00-06', status: 'pending' }
];

async function seed() {
  console.log('Cleaning existing matches for Jornada 3...');
  const { error: deleteError } = await supabase
    .from('matches')
    .delete()
    .eq('jornada', 3);

  if (deleteError) {
    console.error('Error cleaning existing matches:', deleteError.message);
    return;
  }

  console.log('Seeding 24 matches for Jornada 3...');
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
