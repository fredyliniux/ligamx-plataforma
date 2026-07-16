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
  // Tuesday, July 14
  { jornada: 7, local_team: 'Francia', visitor_team: 'España', match_date: '2026-07-14 13:00:00-06', status: 'pending' },

  // Wednesday, July 15
  { jornada: 7, local_team: 'Inglaterra', visitor_team: 'Argentina', match_date: '2026-07-15 13:00:00-06', status: 'pending' }
];

async function seed() {
  console.log('Cleaning existing matches for Jornada 7...');
  const { error: deleteError } = await supabase
    .from('matches')
    .delete()
    .eq('jornada', 7);

  if (deleteError) {
    console.error('Error cleaning existing matches:', deleteError.message);
    return;
  }

  console.log('Seeding 2 matches for Jornada 7...');
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
