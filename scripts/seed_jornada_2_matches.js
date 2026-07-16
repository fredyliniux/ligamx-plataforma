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
  // June 18 - Groups A & B
  { jornada: 2, local_team: 'México', visitor_team: 'Corea del Sur', match_date: '2026-06-18 12:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Chequia', visitor_team: 'Sudáfrica', match_date: '2026-06-18 15:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Canadá', visitor_team: 'Catar', match_date: '2026-06-18 18:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Suiza', visitor_team: 'Bosnia y Herzegovina', match_date: '2026-06-18 21:00:00+00', status: 'pending' },

  // June 19 - Groups C & D
  { jornada: 2, local_team: 'Brasil', visitor_team: 'Haití', match_date: '2026-06-19 12:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Escocia', visitor_team: 'Marruecos', match_date: '2026-06-19 15:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Estados Unidos', visitor_team: 'Australia', match_date: '2026-06-19 18:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Turquía', visitor_team: 'Paraguay', match_date: '2026-06-19 21:00:00+00', status: 'pending' },

  // June 20 - Groups E & F
  { jornada: 2, local_team: 'Alemania', visitor_team: 'Costa de Marfil', match_date: '2026-06-20 12:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Ecuador', visitor_team: 'Curazao', match_date: '2026-06-20 15:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Países Bajos', visitor_team: 'Suecia', match_date: '2026-06-20 18:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Túnez', visitor_team: 'Japón', match_date: '2026-06-20 21:00:00+00', status: 'pending' },

  // June 21 - Groups G & H
  { jornada: 2, local_team: 'Bélgica', visitor_team: 'Irán', match_date: '2026-06-21 12:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Nueva Zelanda', visitor_team: 'Egipto', match_date: '2026-06-21 15:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'España', visitor_team: 'Arabia Saudita', match_date: '2026-06-21 18:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Uruguay', visitor_team: 'Cabo Verde', match_date: '2026-06-21 21:00:00+00', status: 'pending' },

  // June 22 - Groups I & J
  { jornada: 2, local_team: 'Francia', visitor_team: 'Irak', match_date: '2026-06-22 12:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Noruega', visitor_team: 'Senegal', match_date: '2026-06-22 15:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Argentina', visitor_team: 'Austria', match_date: '2026-06-22 18:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Jordania', visitor_team: 'Argelia', match_date: '2026-06-22 21:00:00+00', status: 'pending' },

  // June 23 - Groups K & L
  { jornada: 2, local_team: 'Colombia', visitor_team: 'R.D. Congo', match_date: '2026-06-23 12:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Portugal', visitor_team: 'Uzbekistán', match_date: '2026-06-23 15:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Inglaterra', visitor_team: 'Ghana', match_date: '2026-06-23 18:00:00+00', status: 'pending' },
  { jornada: 2, local_team: 'Panamá', visitor_team: 'Croacia', match_date: '2026-06-23 21:00:00+00', status: 'pending' }
];

async function seed() {
  console.log('Cleaning existing matches for Jornada 2...');
  const { error: deleteError } = await supabase
    .from('matches')
    .delete()
    .eq('jornada', 2);

  if (deleteError) {
    console.error('Error cleaning existing matches:', deleteError.message);
    return;
  }

  console.log('Seeding 24 matches for Jornada 2...');
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
