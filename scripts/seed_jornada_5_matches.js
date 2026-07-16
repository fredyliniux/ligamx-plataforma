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
  // Saturday, July 4
  { jornada: 5, local_team: 'Canadá', visitor_team: 'Marruecos', match_date: '2026-07-04 11:00:00-06', status: 'pending' },
  { jornada: 5, local_team: 'Paraguay', visitor_team: 'Francia', match_date: '2026-07-04 15:00:00-06', status: 'pending' },

  // Sunday, July 5
  { jornada: 5, local_team: 'Brasil', visitor_team: 'Noruega', match_date: '2026-07-05 14:00:00-06', status: 'pending' },
  { jornada: 5, local_team: 'México', visitor_team: 'Inglaterra', match_date: '2026-07-05 18:00:00-06', status: 'pending' },

  // Monday, July 6
  { jornada: 5, local_team: 'Portugal', visitor_team: 'España', match_date: '2026-07-06 13:00:00-06', status: 'pending' },
  { jornada: 5, local_team: 'Estados Unidos', visitor_team: 'Bélgica', match_date: '2026-07-06 18:00:00-06', status: 'pending' },

  // Tuesday, July 7
  { jornada: 5, local_team: 'Argentina', visitor_team: 'Egipto', match_date: '2026-07-07 10:00:00-06', status: 'pending' },
  { jornada: 5, local_team: 'Suiza', visitor_team: 'Colombia', match_date: '2026-07-07 14:00:00-06', status: 'pending' }
];

async function seed() {
  console.log('Cleaning existing matches for Jornada 5...');
  const { error: deleteError } = await supabase
    .from('matches')
    .delete()
    .eq('jornada', 5);

  if (deleteError) {
    console.error('Error cleaning existing matches:', deleteError.message);
    return;
  }

  console.log('Seeding 8 matches for Jornada 5...');
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
