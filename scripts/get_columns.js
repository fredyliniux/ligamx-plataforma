import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env.local');
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

async function checkColumns() {
  const { data, error } = await supabase.from('matches').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Matches columns:', Object.keys(data[0] || {}));
  }
}
checkColumns();
