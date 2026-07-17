import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Analytics } from '@vercel/analytics/react';
import { QuinielaDashboard } from './components/QuinielaDashboard';
import { AdminPanel } from './components/AdminPanel';
import type { QuinielaRegistration, Match, BankDetails, Prices, Links } from './types';
import { Compass, Trophy, ShieldAlert } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'quiniela' | 'admin'>('quiniela');
  
  // Database State
  const [registrations, setRegistrations] = useState<QuinielaRegistration[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  
  // Settings State
  const [bankDetailsQuiniela, setBankDetailsQuiniela] = useState<BankDetails | null>(null);
  const [prices, setPrices] = useState<Prices | null>(null);
  const [links, setLinks] = useState<Links | null>(null);

  // App UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Configuration check
  const isSupabaseConfigured = 
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder';

  const adminPin = import.meta.env.VITE_ADMIN_PIN || '2026';

  const fetchData = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Fetch registrations with participants and forecasts
      const { data: regsData, error: regsErr } = await supabase
        .from('quiniela_registrations')
        .select(`
          id,
          participant_id,
          jornada,
          payment_status,
          payment_receipt_url,
          points,
          created_at,
          participants (id, name, phone, nickname),
          forecasts (id, match_id, prediction)
        `)
        .order('created_at', { ascending: false });

      if (regsErr) throw regsErr;
      const formattedRegs = (regsData || []).map((r: any) => ({
        ...r,
        participants: Array.isArray(r.participants) ? r.participants[0] : r.participants
      }));
      setRegistrations(formattedRegs as QuinielaRegistration[]);

      // 2. Fetch matches
      const { data: matchesData, error: matchesErr } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: true });

      if (matchesErr) throw matchesErr;
      setMatches(matchesData || []);

      // 3. Fetch settings
      const { data: settingsData, error: settingsErr } = await supabase
        .from('settings')
        .select('*');

      if (settingsErr) throw settingsErr;
      
      if (settingsData) {
        settingsData.forEach((item) => {
          if (item.key === 'bank_details_quiniela') setBankDetailsQuiniela(item.value);
          if (item.key === 'prices') setPrices(item.value);
          if (item.key === 'links') setLinks(item.value);
        });
        
        // Fallback for legacy key
        const legacyBank = settingsData.find(item => item.key === 'bank_details');
        const quinielaBank = settingsData.find(item => item.key === 'bank_details_quiniela');
        if (legacyBank && !quinielaBank) setBankDetailsQuiniela(legacyBank.value);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al cargar datos desde Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Show config guidelines if credentials are missing
  if (!isSupabaseConfigured) {
    return (
      <div style={{ maxWidth: '750px', margin: '60px auto', padding: '0 20px' }}>
        <div className="glass-panel-glow" style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '2px solid #fbbf24' }}>
            <ShieldAlert size={40} style={{ color: '#fbbf24' }} />
          </div>
          
          <h1 style={{ fontSize: '32px', margin: '0' }}>Quiniela El Atorón</h1>
          <h2 style={{ fontSize: '20px', color: '#fbbf24', margin: '0' }}>Configuración de Supabase Requerida</h2>
          
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '15px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
            <p>
              ¡Hola! Para que la plataforma funcione, necesitamos conectar la aplicación con tu proyecto de Supabase <strong>fzgpcklsopdtbezzepnx</strong>. Sigue estos sencillos pasos:
            </p>
            
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                Abre tu panel de control de Supabase en <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>supabase.com</a> y entra a tu proyecto.
              </li>
              <li>
                Ve to **Project Settings** (el icono de engranaje), selecciona **API** y copia tu **URL** y tu **anon public key**.
              </li>
              <li>
                Abre el archivo <code style={{ color: '#fff' }}>.env.local</code> en la raíz de este proyecto y pega las credenciales:
                <pre style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '6px', fontSize: '13px', marginTop: '6px', color: '#10b981', overflowX: 'auto' }}>
{`VITE_SUPABASE_URL=https://fzgpcklsopdtbezzepnx.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_public_key_aqui
VITE_ADMIN_PIN=2026`}
                </pre>
              </li>
              <li>
                Ve al **SQL Editor** en tu panel de Supabase, crea una **New Query**, copia todo el contenido del archivo <a href="file:///Users/fredyreyes/.gemini/antigravity/scratch/mundial-plataforma/supabase_setup.sql" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>supabase_setup.sql</a> y haz clic en **Run**. ¡Esto creará las tablas y buckets de fotos automáticamente!
              </li>
              <li>
                Recarga esta página web para empezar a jugar.
              </li>
            </ol>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '10px', border: '1px solid var(--border-glass)', fontSize: '13px', color: 'var(--text-secondary)' }}>
            ¿Tienes dudas? Puedes consultar los archivos locales creados en el directorio scratch.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Analytics />
      {isAdminMode && (
        <div style={{
          background: 'linear-gradient(to right, #b45309, #d97706)',
          color: '#fff',
          padding: '10px 20px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '700',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}>
          <span>🛠️ MODO ADMINISTRADOR ACTIVO</span>
          <button 
            onClick={() => setIsAdminMode(false)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '700',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            Volver a Modo Usuario
          </button>
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '0 20px' }}>
        
        {/* 1. Header */}
        <header style={{ padding: '30px 10px 20px 10px', borderBottom: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: 'rgba(0, 102, 255, 0.1)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(0, 102, 255, 0.2)', fontWeight: '600' }}>
            <span>🏆</span> QUINIELA LIGA MX
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 8vw, 42px)', margin: '5px 0', fontWeight: '800', letterSpacing: '-0.03em', background: 'linear-gradient(to right, #ffffff, #0066ff, #ff3b30)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'center' }}>
            Quiniela Liga MX
          </h1>
          <p style={{ fontSize: 'clamp(14px, 4vw, 16px)', color: 'var(--text-secondary)', maxWidth: '600px', lineHeight: '1.5' }}>
            Registra tus pronósticos en pantalla por cada jornada, edítalos hasta el inicio del primer partido y sigue la tabla de posiciones en tiempo real.
          </p>
        </header>

        {/* 2. Global Navigation */}
        <nav style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '10px', 
          margin: '20px 0', 
          padding: '6px', 
          background: 'rgba(255,255,255,0.02)', 
          border: '1px solid var(--border-glass)', 
          borderRadius: '14px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          maxWidth: '100%',
          width: '100%'
        }}>
          <button
            onClick={() => setActiveTab('quiniela')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              background: activeTab === 'quiniela' ? 'linear-gradient(135deg, #0066ff 0%, #0044cc 100%)' : 'transparent',
              color: activeTab === 'quiniela' ? '#fff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'quiniela' ? '0 4px 12px rgba(0, 102, 255, 0.2)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Trophy size={16} /> Quiniela por Jornadas
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              background: activeTab === 'admin' ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: activeTab === 'admin' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'admin' ? '1px solid var(--border-glass)' : '1px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <Compass size={16} /> Administración
          </button>
        </nav>

        {/* 3. Main Views Content */}
        <main style={{ flex: 1, marginBottom: '50px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-glow)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin-slow 1s linear infinite', margin: '0 auto 16px' }}></div>
              <p style={{ color: 'var(--text-secondary)' }}>Cargando datos de la plataforma...</p>
            </div>
          ) : error ? (
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <p style={{ color: '#ef4444', fontWeight: 'bold' }}>⚠️ {error}</p>
              <button onClick={fetchData} className="btn-secondary" style={{ marginTop: '16px' }}>Reintentar Carga</button>
            </div>
          ) : (
            <>
              {activeTab === 'quiniela' && (
                <QuinielaDashboard
                  bankDetails={bankDetailsQuiniela}
                  prices={prices}
                  registrations={registrations}
                  matches={matches}
                  fetchData={fetchData}
                  isAdmin={isAdminMode}
                />
              )}

              {activeTab === 'admin' && (
                <AdminPanel
                  tickets={[]}
                  registrations={registrations}
                  matches={matches}
                  bankDetailsTombola={null}
                  bankDetailsQuiniela={bankDetailsQuiniela}
                  prices={prices}
                  links={links}
                  adminPin={adminPin}
                  fetchData={fetchData}
                  isAdminMode={isAdminMode}
                  setIsAdminMode={setIsAdminMode}
                />
              )}
            </>
          )}
        </main>

        {/* 4. Footer */}
        <footer style={{ padding: '30px 0', borderTop: '1px solid var(--border-glass)', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          <p>© 2026 Quiniela Liga MX - Transparencia y diversión garantizadas.</p>
          <p style={{ marginTop: '4px' }}>Construido con React, TypeScript y Supabase.</p>
        </footer>

      </div>
    </>
  );
}

export default App;
