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

// The complete 17 Jornadas schedule of Apertura 2026
const allMatches = [
  // --- JORNADA 1 ---
  { jornada: 1, local_team: 'Necaxa', visitor_team: 'Atlante', match_date: '2026-07-16T19:00:00-06:00', status: 'pending' },
  { jornada: 1, local_team: 'Tijuana', visitor_team: 'Tigres UANL', match_date: '2026-07-16T21:00:00-06:00', status: 'pending' },
  { jornada: 1, local_team: 'Atlético de San Luis', visitor_team: 'Cruz Azul', match_date: '2026-07-17T19:00:00-06:00', status: 'pending' },
  { jornada: 1, local_team: 'León', visitor_team: 'Atlas', match_date: '2026-07-17T19:00:00-06:00', status: 'pending' },
  { jornada: 1, local_team: 'Juárez', visitor_team: 'Puebla', match_date: '2026-07-17T21:00:00-06:00', status: 'pending' },
  { jornada: 1, local_team: 'Pumas UNAM', visitor_team: 'Pachuca', match_date: '2026-07-18T17:00:00-06:00', status: 'pending' },
  { jornada: 1, local_team: 'Guadalajara', visitor_team: 'Toluca', match_date: '2026-07-18T19:00:00-06:00', status: 'pending' },
  { jornada: 1, local_team: 'Monterrey', visitor_team: 'Santos Laguna', match_date: '2026-07-18T19:00:00-06:00', status: 'pending' },
  { jornada: 1, local_team: 'Querétaro', visitor_team: 'América', match_date: '2026-07-18T21:00:00-06:00', status: 'pending' },

  // --- JORNADA 2 ---
  { jornada: 2, local_team: 'Cruz Azul', visitor_team: 'Puebla', match_date: '2026-07-21T19:00:00-06:00', status: 'pending' },
  { jornada: 2, local_team: 'Toluca', visitor_team: 'Pumas UNAM', match_date: '2026-07-21T21:00:00-06:00', status: 'pending' },
  { jornada: 2, local_team: 'Tigres UANL', visitor_team: 'Atlético de San Luis', match_date: '2026-07-24T19:00:00-06:00', status: 'pending' },
  { jornada: 2, local_team: 'Atlante', visitor_team: 'León', match_date: '2026-07-24T21:00:00-06:00', status: 'pending' },
  { jornada: 2, local_team: 'Tijuana', visitor_team: 'Guadalajara', match_date: '2026-07-24T21:00:00-06:00', status: 'pending' },
  { jornada: 2, local_team: 'Guadalajara', visitor_team: 'Juárez', match_date: '2026-07-25T17:00:00-06:00', status: 'pending' },
  { jornada: 2, local_team: 'Santos Laguna', visitor_team: 'Atlas', match_date: '2026-07-25T21:00:00-06:00', status: 'pending' },
  { jornada: 2, local_team: 'Necaxa', visitor_team: 'Monterrey', match_date: '2026-07-26T17:00:00-06:00', status: 'pending' },
  { jornada: 2, local_team: 'Pachuca', visitor_team: 'Querétaro', match_date: '2026-07-26T19:00:00-06:00', status: 'pending' },

  // --- JORNADA 3 ---
  { jornada: 3, local_team: 'Puebla', visitor_team: 'Guadalajara', match_date: '2026-07-31T19:00:00-06:00', status: 'pending' },
  { jornada: 3, local_team: 'Atlético de San Luis', visitor_team: 'Tijuana', match_date: '2026-07-31T21:00:00-06:00', status: 'pending' },
  { jornada: 3, local_team: 'Juárez', visitor_team: 'Pumas UNAM', match_date: '2026-07-31T21:00:00-06:00', status: 'pending' },
  { jornada: 3, local_team: 'Querétaro', visitor_team: 'Tigres UANL', match_date: '2026-08-01T17:00:00-06:00', status: 'pending' },
  { jornada: 3, local_team: 'León', visitor_team: 'Pachuca', match_date: '2026-08-01T19:00:00-06:00', status: 'pending' },
  { jornada: 3, local_team: 'Atlas', visitor_team: 'Monterrey', match_date: '2026-08-01T19:00:00-06:00', status: 'pending' },
  { jornada: 3, local_team: 'Cruz Azul', visitor_team: 'Atlante', match_date: '2026-08-01T21:00:00-06:00', status: 'pending' },
  { jornada: 3, local_team: 'América', visitor_team: 'Santos Laguna', match_date: '2026-08-02T17:00:00-06:00', status: 'pending' },
  { jornada: 3, local_team: 'Toluca', visitor_team: 'Necaxa', match_date: '2026-08-02T19:00:00-06:00', status: 'pending' },

  // --- JORNADA 4 ---
  { jornada: 4, local_team: 'Atlante', visitor_team: 'Toluca', match_date: '2026-08-15T17:00:00-06:00', status: 'pending' },
  { jornada: 4, local_team: 'Monterrey', visitor_team: 'Juárez', match_date: '2026-08-15T19:00:00-06:00', status: 'pending' },
  { jornada: 4, local_team: 'Atlas', visitor_team: 'Tigres UANL', match_date: '2026-08-15T21:00:00-06:00', status: 'pending' },
  { jornada: 4, local_team: 'Pumas UNAM', visitor_team: 'Querétaro', match_date: '2026-08-16T12:00:00-06:00', status: 'pending' },
  { jornada: 4, local_team: 'América', visitor_team: 'Atlético de San Luis', match_date: '2026-08-16T17:00:00-06:00', status: 'pending' },
  { jornada: 4, local_team: 'Santos Laguna', visitor_team: 'Guadalajara', match_date: '2026-08-16T19:00:00-06:00', status: 'pending' },
  { jornada: 4, local_team: 'Tijuana', visitor_team: 'Cruz Azul', match_date: '2026-08-16T21:00:00-06:00', status: 'pending' },
  { jornada: 4, local_team: 'Necaxa', visitor_team: 'León', match_date: '2026-08-17T19:00:00-06:00', status: 'pending' },
  { jornada: 4, local_team: 'Pachuca', visitor_team: 'Puebla', match_date: '2026-08-17T21:00:00-06:00', status: 'pending' },

  // --- JORNADA 5 ---
  { jornada: 5, local_team: 'Puebla', visitor_team: 'Santos Laguna', match_date: '2026-08-21T19:00:00-06:00', status: 'pending' },
  { jornada: 5, local_team: 'Juárez', visitor_team: 'América', match_date: '2026-08-21T21:00:00-06:00', status: 'pending' },
  { jornada: 5, local_team: 'Querétaro', visitor_team: 'Toluca', match_date: '2026-08-22T17:00:00-06:00', status: 'pending' },
  { jornada: 5, local_team: 'Guadalajara', visitor_team: 'Tijuana', match_date: '2026-08-22T17:00:00-06:00', status: 'pending' },
  { jornada: 5, local_team: 'León', visitor_team: 'Monterrey', match_date: '2026-08-22T19:00:00-06:00', status: 'pending' },
  { jornada: 5, local_team: 'Tigres UANL', visitor_team: 'Atlante', match_date: '2026-08-22T21:00:00-06:00', status: 'pending' },
  { jornada: 5, local_team: 'Cruz Azul', visitor_team: 'Atlas', match_date: '2026-08-22T21:00:00-06:00', status: 'pending' },
  { jornada: 5, local_team: 'Atlético de San Luis', visitor_team: 'Pachuca', match_date: '2026-08-23T17:00:00-06:00', status: 'pending' },
  { jornada: 5, local_team: 'Pumas UNAM', visitor_team: 'Necaxa', match_date: '2026-08-23T19:00:00-06:00', status: 'pending' },

  // --- JORNADA 6 ---
  { jornada: 6, local_team: 'Necaxa', visitor_team: 'Cruz Azul', match_date: '2026-08-28T19:00:00-06:00', status: 'pending' },
  { jornada: 6, local_team: 'Atlante', visitor_team: 'León', match_date: '2026-08-28T19:00:00-06:00', status: 'pending' },
  { jornada: 6, local_team: 'Tijuana', visitor_team: 'Pumas UNAM', match_date: '2026-08-28T21:00:00-06:00', status: 'pending' },
  { jornada: 6, local_team: 'Atlas', visitor_team: 'Querétaro', match_date: '2026-08-29T17:00:00-06:00', status: 'pending' },
  { jornada: 6, local_team: 'Pachuca', visitor_team: 'Guadalajara', match_date: '2026-08-29T17:00:00-06:00', status: 'pending' },
  { jornada: 6, local_team: 'América', visitor_team: 'Puebla', match_date: '2026-08-29T19:00:00-06:00', status: 'pending' },
  { jornada: 6, local_team: 'Santos Laguna', visitor_team: 'Tigres UANL', match_date: '2026-08-29T21:00:00-06:00', status: 'pending' },
  { jornada: 6, local_team: 'Toluca', visitor_team: 'Juárez', match_date: '2026-08-30T18:00:00-06:00', status: 'pending' },
  { jornada: 6, local_team: 'Monterrey', visitor_team: 'Atlético de San Luis', match_date: '2026-08-30T20:00:00-06:00', status: 'pending' },

  // --- JORNADA 7 ---
  { jornada: 7, local_team: 'Puebla', visitor_team: 'Toluca', match_date: '2026-09-04T19:00:00-06:00', status: 'pending' },
  { jornada: 7, local_team: 'Juárez', visitor_team: 'Pachuca', match_date: '2026-09-04T21:00:00-06:00', status: 'pending' },
  { jornada: 7, local_team: 'Atlético de San Luis', visitor_team: 'Guadalajara', match_date: '2026-09-05T17:00:00-06:00', status: 'pending' },
  { jornada: 7, local_team: 'Querétaro', visitor_team: 'Monterrey', match_date: '2026-09-05T17:00:00-06:00', status: 'pending' },
  { jornada: 7, local_team: 'Tigres UANL', visitor_team: 'Necaxa', match_date: '2026-09-05T19:00:00-06:00', status: 'pending' },
  { jornada: 7, local_team: 'América', visitor_team: 'Tijuana', match_date: '2026-09-05T19:00:00-06:00', status: 'pending' },
  { jornada: 7, local_team: 'Atlas', visitor_team: 'Atlante', match_date: '2026-09-05T21:00:00-06:00', status: 'pending' },
  { jornada: 7, local_team: 'Pumas UNAM', visitor_team: 'León', match_date: '2026-09-06T12:00:00-06:00', status: 'pending' },
  { jornada: 7, local_team: 'Cruz Azul', visitor_team: 'Santos Laguna', match_date: '2026-09-06T20:00:00-06:00', status: 'pending' },

  // --- JORNADA 8 ---
  { jornada: 8, local_team: 'Necaxa', visitor_team: 'Puebla', match_date: '2026-09-11T19:00:00-06:00', status: 'pending' },
  { jornada: 8, local_team: 'Atlante', visitor_team: 'Pachuca', match_date: '2026-09-11T21:00:00-06:00', status: 'pending' },
  { jornada: 8, local_team: 'Tijuana', visitor_team: 'Querétaro', match_date: '2026-09-11T21:00:00-06:00', status: 'pending' },
  { jornada: 8, local_team: 'León', visitor_team: 'Atlético de San Luis', match_date: '2026-09-12T17:00:00-06:00', status: 'pending' },
  { jornada: 8, local_team: 'Toluca', visitor_team: 'Atlas', match_date: '2026-09-12T19:00:00-06:00', status: 'pending' },
  { jornada: 8, local_team: 'Cruz Azul', visitor_team: 'América', match_date: '2026-09-12T19:00:00-06:00', status: 'pending' },
  { jornada: 8, local_team: 'Santos Laguna', visitor_team: 'Juárez', match_date: '2026-09-13T18:00:00-06:00', status: 'pending' },
  { jornada: 8, local_team: 'Guadalajara', visitor_team: 'Pumas UNAM', match_date: '2026-09-13T18:00:00-06:00', status: 'pending' },
  { jornada: 8, local_team: 'Monterrey', visitor_team: 'Tigres UANL', match_date: '2026-09-13T20:00:00-06:00', status: 'pending' },

  // --- JORNADA 9 ---
  { jornada: 9, local_team: 'Puebla', visitor_team: 'Atlante', match_date: '2026-09-18T19:00:00-06:00', status: 'pending' },
  { jornada: 9, local_team: 'Juárez', visitor_team: 'Tigres UANL', match_date: '2026-09-18T21:00:00-06:00', status: 'pending' },
  { jornada: 9, local_team: 'Atlas', visitor_team: 'Pumas UNAM', match_date: '2026-09-19T17:00:00-06:00', status: 'pending' },
  { jornada: 9, local_team: 'Atlético de San Luis', visitor_team: 'Necaxa', match_date: '2026-09-19T17:00:00-06:00', status: 'pending' },
  { jornada: 9, local_team: 'Monterrey', visitor_team: 'Cruz Azul', match_date: '2026-09-19T19:00:00-06:00', status: 'pending' },
  { jornada: 9, local_team: 'América', visitor_team: 'Guadalajara', match_date: '2026-09-19T21:00:00-06:00', status: 'pending' },
  { jornada: 9, local_team: 'Pachuca', visitor_team: 'Tijuana', match_date: '2026-09-20T18:00:00-06:00', status: 'pending' },
  { jornada: 9, local_team: 'Toluca', visitor_team: 'Santos Laguna', match_date: '2026-09-20T18:00:00-06:00', status: 'pending' },
  { jornada: 9, local_team: 'Querétaro', visitor_team: 'León', match_date: '2026-09-20T20:00:00-06:00', status: 'pending' },

  // --- JORNADA 10 ---
  { jornada: 10, local_team: 'Atlante', visitor_team: 'Monterrey', match_date: '2026-09-25T19:00:00-06:00', status: 'pending' },
  { jornada: 10, local_team: 'Tijuana', visitor_team: 'Atlas', match_date: '2026-09-25T21:00:00-06:00', status: 'pending' },
  { jornada: 10, local_team: 'Guadalajara', visitor_team: 'Querétaro', match_date: '2026-09-26T17:00:00-06:00', status: 'pending' },
  { jornada: 10, local_team: 'Santos Laguna', visitor_team: 'Pachuca', match_date: '2026-09-26T19:00:00-06:00', status: 'pending' },
  { jornada: 10, local_team: 'Tigres UANL', visitor_team: 'Puebla', match_date: '2026-09-26T19:00:00-06:00', status: 'pending' },
  { jornada: 10, local_team: 'Cruz Azul', visitor_team: 'Toluca', match_date: '2026-09-26T21:00:00-06:00', status: 'pending' },
  { jornada: 10, local_team: 'Pumas UNAM', visitor_team: 'Atlético de San Luis', match_date: '2026-09-27T12:00:00-06:00', status: 'pending' },
  { jornada: 10, local_team: 'León', visitor_team: 'Juárez', match_date: '2026-09-27T19:00:00-06:00', status: 'pending' },
  { jornada: 10, local_team: 'Necaxa', visitor_team: 'América', match_date: '2026-09-27T21:00:00-06:00', status: 'pending' },

  // --- JORNADA 11 ---
  { jornada: 11, local_team: 'Querétaro', visitor_team: 'Atlante', match_date: '2026-10-09T19:00:00-06:00', status: 'pending' },
  { jornada: 11, local_team: 'Puebla', visitor_team: 'León', match_date: '2026-10-09T19:00:00-06:00', status: 'pending' },
  { jornada: 11, local_team: 'Tigres UANL', visitor_team: 'Toluca', match_date: '2026-10-09T21:00:00-06:00', status: 'pending' },
  { jornada: 11, local_team: 'Juárez', visitor_team: 'Tijuana', match_date: '2026-10-10T17:00:00-06:00', status: 'pending' },
  { jornada: 11, local_team: 'Atlas', visitor_team: 'Guadalajara', match_date: '2026-10-10T19:00:00-06:00', status: 'pending' },
  { jornada: 11, local_team: 'América', visitor_team: 'Monterrey', match_date: '2026-10-10T21:00:00-06:00', status: 'pending' },
  { jornada: 11, local_team: 'Pachuca', visitor_team: 'Necaxa', match_date: '2026-10-11T17:00:00-06:00', status: 'pending' },
  { jornada: 11, local_team: 'Atlético de San Luis', visitor_team: 'Santos Laguna', match_date: '2026-10-11T17:00:00-06:00', status: 'pending' },
  { jornada: 11, local_team: 'Pumas UNAM', visitor_team: 'Cruz Azul', match_date: '2026-10-11T19:00:00-06:00', status: 'pending' },

  // --- JORNADA 12 ---
  { jornada: 12, local_team: 'Necaxa', visitor_team: 'Atlas', match_date: '2026-10-16T19:00:00-06:00', status: 'pending' },
  { jornada: 12, local_team: 'Atlante', visitor_team: 'Pumas UNAM', match_date: '2026-10-16T21:00:00-06:00', status: 'pending' },
  { jornada: 12, local_team: 'Tijuana', visitor_team: 'Puebla', match_date: '2026-10-16T21:00:00-06:00', status: 'pending' },
  { jornada: 12, local_team: 'Guadalajara', visitor_team: 'Tigres UANL', match_date: '2026-10-17T17:00:00-06:00', status: 'pending' },
  { jornada: 12, local_team: 'Santos Laguna', visitor_team: 'Querétaro', match_date: '2026-10-17T17:00:00-06:00', status: 'pending' },
  { jornada: 12, local_team: 'León', visitor_team: 'América', match_date: '2026-10-17T19:00:00-06:00', status: 'pending' },
  { jornada: 12, local_team: 'Toluca', visitor_team: 'Atlético de San Luis', match_date: '2026-10-17T19:00:00-06:00', status: 'pending' },
  { jornada: 12, local_team: 'Cruz Azul', visitor_team: 'Juárez', match_date: '2026-10-17T21:00:00-06:00', status: 'pending' },
  { jornada: 12, local_team: 'Monterrey', visitor_team: 'Pachuca', match_date: '2026-10-18T19:00:00-06:00', status: 'pending' },

  // --- JORNADA 13 ---
  { jornada: 13, local_team: 'Atlético de San Luis', visitor_team: 'Querétaro', match_date: '2026-10-20T19:00:00-06:00', status: 'pending' },
  { jornada: 13, local_team: 'Juárez', visitor_team: 'Atlante', match_date: '2026-10-20T19:00:00-06:00', status: 'pending' },
  { jornada: 13, local_team: 'Tigres UANL', visitor_team: 'León', match_date: '2026-10-20T21:00:00-06:00', status: 'pending' },
  { jornada: 13, local_team: 'Guadalajara', visitor_team: 'Necaxa', match_date: '2026-10-20T21:00:00-06:00', status: 'pending' },
  { jornada: 13, local_team: 'Puebla', visitor_team: 'Monterrey', match_date: '2026-10-21T19:00:00-06:00', status: 'pending' },
  { jornada: 13, local_team: 'Atlas', visitor_team: 'América', match_date: '2026-10-21T19:00:00-06:00', status: 'pending' },
  { jornada: 13, local_team: 'Toluca', visitor_team: 'Tijuana', match_date: '2026-10-21T19:00:00-06:00', status: 'pending' },
  { jornada: 13, local_team: 'Pachuca', visitor_team: 'Cruz Azul', match_date: '2026-10-21T21:00:00-06:00', status: 'pending' },
  { jornada: 13, local_team: 'Santos Laguna', visitor_team: 'Pumas UNAM', match_date: '2026-10-21T21:00:00-06:00', status: 'pending' },

  // --- JORNADA 14 ---
  { jornada: 14, local_team: 'Necaxa', visitor_team: 'Juárez', match_date: '2026-10-23T19:00:00-06:00', status: 'pending' },
  { jornada: 14, local_team: 'Atlante', visitor_team: 'Atlético de San Luis', match_date: '2026-10-23T21:00:00-06:00', status: 'pending' },
  { jornada: 14, local_team: 'León', visitor_team: 'Toluca', match_date: '2026-10-24T17:00:00-06:00', status: 'pending' },
  { jornada: 14, local_team: 'Monterrey', visitor_team: 'Guadalajara', match_date: '2026-10-24T19:00:00-06:00', status: 'pending' },
  { jornada: 14, local_team: 'Pumas UNAM', visitor_team: 'Tigres UANL', match_date: '2026-10-24T21:00:00-06:00', status: 'pending' },
  { jornada: 14, local_team: 'Atlas', visitor_team: 'Puebla', match_date: '2026-10-25T17:00:00-06:00', status: 'pending' },
  { jornada: 14, local_team: 'Cruz Azul', visitor_team: 'Pachuca', match_date: '2026-10-25T17:00:00-06:00', status: 'pending' },
  { jornada: 14, local_team: 'Querétaro', visitor_team: 'América', match_date: '2026-10-25T19:00:00-06:00', status: 'pending' },
  { jornada: 14, local_team: 'Tijuana', visitor_team: 'Santos Laguna', match_date: '2026-10-25T21:00:00-06:00', status: 'pending' },

  // --- JORNADA 15 ---
  { jornada: 15, local_team: 'Atlético de San Luis', visitor_team: 'Atlas', match_date: '2026-10-30T19:00:00-06:00', status: 'pending' },
  { jornada: 15, local_team: 'Juárez', visitor_team: 'Querétaro', match_date: '2026-10-30T19:00:00-06:00', status: 'pending' },
  { jornada: 15, local_team: 'Puebla', visitor_team: 'Pumas UNAM', match_date: '2026-10-30T21:00:00-06:00', status: 'pending' },
  { jornada: 15, local_team: 'Pachuca', visitor_team: 'Tigres UANL', match_date: '2026-10-31T17:00:00-06:00', status: 'pending' },
  { jornada: 15, local_team: 'Guadalajara', visitor_team: 'Atlante', match_date: '2026-10-31T19:00:00-06:00', status: 'pending' },
  { jornada: 15, local_team: 'Monterrey', visitor_team: 'Tijuana', match_date: '2026-10-31T19:00:00-06:00', status: 'pending' },
  { jornada: 15, local_team: 'Cruz Azul', visitor_team: 'Toluca', match_date: '2026-10-31T21:00:00-06:00', status: 'pending' },
  { jornada: 15, local_team: 'Santos Laguna', visitor_team: 'Necaxa', match_date: '2026-11-01T17:00:00-06:00', status: 'pending' },
  { jornada: 15, local_team: 'América', visitor_team: 'León', match_date: '2026-11-01T19:00:00-06:00', status: 'pending' },

  // --- JORNADA 16 ---
  { jornada: 16, local_team: 'Atlético de San Luis', visitor_team: 'Juárez', match_date: '2026-11-06T19:00:00-06:00', status: 'pending' },
  { jornada: 16, local_team: 'Necaxa', visitor_team: 'Tijuana', match_date: '2026-11-06T19:00:00-06:00', status: 'pending' },
  { jornada: 16, local_team: 'Atlante', visitor_team: 'Santos Laguna', match_date: '2026-11-06T21:00:00-06:00', status: 'pending' },
  { jornada: 16, local_team: 'Atlas', visitor_team: 'Pachuca', match_date: '2026-11-07T17:00:00-06:00', status: 'pending' },
  { jornada: 16, local_team: 'Tigres UANL', visitor_team: 'Cruz Azul', match_date: '2026-11-07T17:00:00-06:00', status: 'pending' },
  { jornada: 16, local_team: 'Toluca', visitor_team: 'Monterrey', match_date: '2026-11-07T19:00:00-06:00', status: 'pending' },
  { jornada: 16, local_team: 'Pumas UNAM', visitor_team: 'América', match_date: '2026-11-07T21:00:00-06:00', status: 'pending' },
  { jornada: 16, local_team: 'Querétaro', visitor_team: 'Puebla', match_date: '2026-11-08T18:00:00-06:00', status: 'pending' },
  { jornada: 16, local_team: 'León', visitor_team: 'Guadalajara', match_date: '2026-11-08T20:00:00-06:00', status: 'pending' },

  // --- JORNADA 17 ---
  { jornada: 17, local_team: 'Puebla', visitor_team: 'Atlético de San Luis', match_date: '2026-11-20T19:00:00-06:00', status: 'pending' },
  { jornada: 17, local_team: 'Juárez', visitor_team: 'Atlas', match_date: '2026-11-20T21:00:00-06:00', status: 'pending' },
  { jornada: 17, local_team: 'Tijuana', visitor_team: 'Atlante', match_date: '2026-11-20T21:00:00-06:00', status: 'pending' },
  { jornada: 17, local_team: 'Santos Laguna', visitor_team: 'León', match_date: '2026-11-21T17:00:00-06:00', status: 'pending' },
  { jornada: 17, local_team: 'Pachuca', visitor_team: 'Toluca', match_date: '2026-11-21T17:00:00-06:00', status: 'pending' },
  { jornada: 17, local_team: 'Pumas UNAM', visitor_team: 'Monterrey', match_date: '2026-11-21T19:00:00-06:00', status: 'pending' },
  { jornada: 17, local_team: 'Tigres UANL', visitor_team: 'América', match_date: '2026-11-21T21:00:00-06:00', status: 'pending' },
  { jornada: 17, local_team: 'Guadalajara', visitor_team: 'Cruz Azul', match_date: '2026-11-22T17:00:00-06:00', status: 'pending' },
  { jornada: 17, local_team: 'Querétaro', visitor_team: 'Necaxa', match_date: '2026-11-22T19:00:00-06:00', status: 'pending' }
];

async function seedMatches() {
  console.log('🧹 Limpiando partidos existentes en la base de datos...');
  const { error: deleteErr } = await supabase
    .from('matches')
    .delete()
    .neq('jornada', 0); // Delete everything

  if (deleteErr) {
    console.error('Error limpiando partidos viejos:', deleteErr.message);
    process.exit(1);
  }

  console.log(`🚀 Insertando ${allMatches.length} partidos oficiales para el Apertura 2026 (Jornadas 1 a 17)...`);
  const { data, error } = await supabase
    .from('matches')
    .insert(allMatches)
    .select();

  if (error) {
    console.error('❌ Error insertando partidos:', error.message);
  } else {
    console.log(`✅ ¡Se insertaron con éxito ${data.length} partidos oficiales para todas las jornadas (1 a 17)!`);
  }
}

seedMatches();
