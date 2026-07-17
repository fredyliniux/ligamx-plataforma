import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { QuinielaRegistration, BankDetails, Prices, Match } from '../types';
import { Search, Trophy, Calendar, Upload, CheckCircle2, Eye, Award, Users } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuinielaDashboardProps {
  bankDetails: BankDetails | null;
  prices: Prices | null;
  registrations: QuinielaRegistration[];
  matches: Match[];
  fetchData: () => Promise<void>;
  isAdmin?: boolean;
}

export const QuinielaDashboard: React.FC<QuinielaDashboardProps> = ({
  bankDetails: _bankDetails,
  prices: _prices,
  registrations,
  matches,
  fetchData,
  isAdmin: _isAdmin = false
}) => {
  // Navigation & Selector State
  const [selectedJornada, setSelectedJornada] = useState(1);
  const [hasSetInitialJornada, setHasSetInitialJornada] = useState(false);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'play' | 'transparency' | 'payment_info'>('leaderboard');

  // Auto-detect active jornada based on matches
  useEffect(() => {
    if (matches && matches.length > 0 && !hasSetInitialJornada) {
      const pendingMatches = matches.filter(m => m.status === 'pending');
      if (pendingMatches.length > 0) {
        const minPendingJornada = Math.min(...pendingMatches.map(m => m.jornada));
        setSelectedJornada(minPendingJornada);
      } else {
        const maxJornada = Math.max(...matches.map(m => m.jornada));
        setSelectedJornada(maxJornada);
      }
      setHasSetInitialJornada(true);
    }
  }, [matches, hasSetInitialJornada]);
  
  // Authentication & Form State
  const [loggedInUser, setLoggedInUser] = useState<any | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  
  // Custom Autocomplete / Select State for registered users
  const [allParticipants, setAllParticipants] = useState<any[]>([]);
  const [loadingAllParts, setLoadingAllParts] = useState(false);
  const [loginSearch, setLoginSearch] = useState('');
  const [selectedPartIdForLogin, setSelectedPartIdForLogin] = useState('');
  
  // Interactive Forecasts state
  const [userPredictions, setUserPredictions] = useState<{ [matchId: number]: 'L' | 'E' | 'V' }>({});
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Transparency State
  const [transparencyData, setTransparencyData] = useState<any[]>([]);
  const [loadingTransparency, setLoadingTransparency] = useState(false);

  // Auto-login from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ligamx_user');
    if (saved) {
      try {
        setLoggedInUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('ligamx_user');
      }
    }
  }, []);

  // Fetch all registered participants for the combobox selector
  useEffect(() => {
    const fetchAllParts = async () => {
      setLoadingAllParts(true);
      try {
        const { data, error } = await supabase
          .from('participants')
          .select('id, name, nickname')
          .order('name', { ascending: true });
        if (error) throw error;
        setAllParticipants(data || []);
      } catch (err) {
        console.error('Error fetching participants for dropdown:', err);
      } finally {
        setLoadingAllParts(false);
      }
    };
    fetchAllParts();
  }, [loggedInUser, isRegistering]);

  // Fetch/load user predictions for the selected jornada
  useEffect(() => {
    const loadPredictions = async () => {
      if (!loggedInUser) {
        setUserPredictions({});
        return;
      }

      try {
        // Find registration for the user in this jornada
        const { data: reg, error: regErr } = await supabase
          .from('quiniela_registrations')
          .select('id')
          .eq('participant_id', loggedInUser.id)
          .eq('jornada', selectedJornada)
          .maybeSingle();

        if (regErr) throw regErr;

        if (reg) {
          // Fetch existing predictions
          const { data: preds, error: predsErr } = await supabase
            .from('forecasts')
            .select('match_id, prediction')
            .eq('registration_id', reg.id);

          if (predsErr) throw predsErr;

          const map: { [matchId: number]: 'L' | 'E' | 'V' } = {};
          preds?.forEach(p => {
            map[p.match_id] = p.prediction as 'L' | 'E' | 'V';
          });
          setUserPredictions(map);
        } else {
          setUserPredictions({});
        }
      } catch (err: any) {
        console.error('Error loading predictions:', err.message);
      }
    };

    loadPredictions();
  }, [loggedInUser, selectedJornada]);

  const quinielaPrice = 50; // New flat price: 50 MXN (or 3 USD)
  
  // Deadline check:
  // - Límite de edición: Hora de inicio del primer partido de la jornada seleccionada
  // - EXCEPCIÓN JORNADA 1: Se permite llenar hasta el viernes 17 de Julio a las 19:00 h (inicio del resto de partidos)
  const selectedJornadaMatches = matches.filter(m => m.jornada === selectedJornada);
  let deadline = selectedJornadaMatches.length > 0
    ? new Date(Math.min(...selectedJornadaMatches.map(m => new Date(m.match_date).getTime())))
    : null;

  if (selectedJornada === 1) {
    deadline = new Date('2026-07-17T19:00:00-06:00'); // Viernes 17 de Julio, 7:00 PM
  }

  const isAfterDeadline = deadline ? (new Date() > deadline) : false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname) {
      setMessage({ type: 'error', text: 'Por favor, ingresa tu Nickname.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const { data: participant, error } = await supabase
        .from('participants')
        .select('*')
        .ilike('nickname', nickname.trim())
        .maybeSingle();

      if (error) throw error;

      if (!participant) {
        throw new Error('No se encontró ningún participante con ese Nickname. Regístrate si aún no tienes una cuenta.');
      }

      setLoggedInUser(participant);
      localStorage.setItem('ligamx_user', JSON.stringify(participant));
      setMessage({ type: 'success', text: `¡Bienvenido de vuelta, ${participant.name}!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !nickname) {
      setMessage({ type: 'error', text: 'Por favor, rellena los campos requeridos (Nombre y Nickname).' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const trimmedName = name.trim();
      const trimmedNickname = nickname.trim();

      // 1. Check if nickname is already taken
      const { data: existingNick, error: nickErr } = await supabase
        .from('participants')
        .select('id')
        .ilike('nickname', trimmedNickname)
        .maybeSingle();

      if (nickErr) throw nickErr;
      if (existingNick) {
        throw new Error('El nickname ingresado ya está en uso por otro participante.');
      }

      // 2. Check if name is already taken
      const { data: existingName, error: nameErr } = await supabase
        .from('participants')
        .select('id')
        .ilike('name', trimmedName)
        .maybeSingle();

      if (nameErr) throw nameErr;
      if (existingName) {
        // If name matches exactly, request last name (must contain a space)
        if (!trimmedName.includes(' ')) {
          throw new Error('El nombre ya está registrado. Por favor, ingresa tu nombre completo incluyendo tu apellido para poder registrarte.');
        }
      }

      // 3. Check if email is already taken (only if provided)
      if (email.trim()) {
        const { data: existingEmail, error: emailErr } = await supabase
          .from('participants')
          .select('id')
          .ilike('email', email.trim())
          .maybeSingle();

        if (emailErr) throw emailErr;
        if (existingEmail) {
          throw new Error('El correo electrónico ingresado ya está registrado por otro participante.');
        }
      }

      let receiptUrl = null;
      // 4. Upload payment receipt (optional)
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, receiptFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);
        
        receiptUrl = urlData.publicUrl;
      }

      // 5. Create participant in DB
      const { data: newPart, error: insertErr } = await supabase
        .from('participants')
        .insert([{
          name: trimmedName,
          nickname: trimmedNickname,
          email: email.trim() || null,
          phone: phone.trim() || null,
          payment_status: 'pending',
          payment_receipt_url: receiptUrl
        }])
        .select()
        .single();

      if (insertErr) throw insertErr;

      setLoggedInUser(newPart);
      localStorage.setItem('ligamx_user', JSON.stringify(newPart));
      setMessage({ type: 'success', text: '¡Registro exitoso! Tu cuenta ha sido creada. Puedes llenar tus pronósticos de inmediato.' });
      setIsRegistering(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem('ligamx_user');
    setUserPredictions({});
    setMessage(null);
  };

  const handleSaveForecasts = async () => {
    if (!loggedInUser) return;
    if (isAfterDeadline) {
      setMessage({ type: 'error', text: 'La jornada ya ha comenzado y se encuentra bloqueada para modificaciones.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      // 1. Get or create registration for this participant and selectedJornada
      let registrationId = '';
      const { data: existingReg, error: findRegErr } = await supabase
        .from('quiniela_registrations')
        .select('id')
        .eq('participant_id', loggedInUser.id)
        .eq('jornada', selectedJornada)
        .maybeSingle();

      if (findRegErr) throw findRegErr;

      if (existingReg) {
        registrationId = existingReg.id;
      } else {
        // Create registration
        const paymentStatus = loggedInUser.payment_status === 'confirmed' ? 'confirmed' : 'pending';

        const { data: newReg, error: insertRegErr } = await supabase
          .from('quiniela_registrations')
          .insert([{
            participant_id: loggedInUser.id,
            jornada: selectedJornada,
            payment_status: paymentStatus,
            payment_receipt_url: loggedInUser.payment_receipt_url
          }])
          .select()
          .single();

        if (insertRegErr) throw insertRegErr;
        registrationId = newReg.id;
      }

      // 2. Prepare forecast predictions to insert/upsert
      const forecastsToUpsert = Object.entries(userPredictions)
        .map(([matchIdStr, pred]) => {
          const matchId = Number(matchIdStr);
          return {
            registration_id: registrationId,
            match_id: matchId,
            jornada: selectedJornada,
            prediction: pred
          };
        });

      if (forecastsToUpsert.length > 0) {
        const { error: upsertErr } = await supabase
          .from('forecasts')
          .upsert(forecastsToUpsert, { onConflict: 'registration_id,match_id' });

        if (upsertErr) throw upsertErr;
      }

      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.6 }
      });

      setMessage({ type: 'success', text: '¡Tus pronósticos han sido guardados con éxito!' });
      await fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error al guardar tus pronósticos: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Fetch transparency details (all forecasts) from database
  const loadTransparencyData = async () => {
    setLoadingTransparency(true);
    try {
      const { data, error } = await supabase
        .from('quiniela_registrations')
        .select(`
          id,
          jornada,
          payment_status,
          points,
          participants (id, name, phone, nickname),
          forecasts (
            id,
            match_id,
            prediction
          )
        `)
        .eq('jornada', selectedJornada)
        .eq('payment_status', 'confirmed'); // only show confirmed ones

      if (error) throw error;
      setTransparencyData(data || []);
    } catch (e: any) {
      alert(`Error al cargar transparencias: ${e.message}`);
    } finally {
      setLoadingTransparency(false);
    }
  };

  // Generate a clean PDF print-out of the user's forecast sheet
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes (popups) para poder descargar el PDF.');
      return;
    }

    const sortedMatches = [...selectedJornadaMatches].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
    const matchRows = sortedMatches.map((match, idx) => {
      const pred = userPredictions[match.id] || 'Sin selección';
      let predText = 'Empate';
      if (pred === 'L') predText = `Local (${match.local_team})`;
      if (pred === 'V') predText = `Visitante (${match.visitor_team})`;

      return `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>${match.local_team}</strong> vs <strong>${match.visitor_team}</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #0066ff;">[ ${pred} ] - ${predText}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Quiniela Liga MX - Jornada ${selectedJornada}</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, Helvetica, sans-serif; padding: 30px; color: #222; line-height: 1.5; }
            .header-table { width: 100%; border: none; margin-bottom: 20px; }
            h2 { color: #0066ff; margin: 0 0 10px 0; border-bottom: 2px solid #0066ff; padding-bottom: 8px; font-size: 26px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f5f5f7; padding: 12px 10px; border: 1px solid #ddd; text-align: left; font-size: 14px; }
            td { padding: 12px 10px; border: 1px solid #ddd; font-size: 14px; }
            .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; borderRadius: 8px; margin-bottom: 20px; }
            .footer { text-align: center; font-size: 11px; color: #888; margin-top: 40px; border-top: 1px solid #eee; padding-top: 15px; }
          </style>
        </head>
        <body>
          <h2>🏆 Comprobante de Pronósticos - Liga MX</h2>
          <div class="info-box">
            <strong>Participante:</strong> ${loggedInUser?.name || 'Usuario'} (@${loggedInUser?.nickname || 'nickname'})<br>
            <strong>Jornada Seleccionada:</strong> Jornada ${selectedJornada}<br>
            <strong>Fecha de Registro:</strong> ${new Date().toLocaleString('es-MX')}<br>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">N°</th>
                <th>Encuentro</th>
                <th style="width: 250px; text-align: center;">Tu Pronóstico</th>
              </tr>
            </thead>
            <tbody>
              ${matchRows}
            </tbody>
          </table>
          <div class="footer">
            Generado automáticamente por la Plataforma Quiniela Liga MX.<br>
            <strong>Regla:</strong> Al registrar tu quiniela te comprometes a realizar el pago correspondiente ($50 MXN / $3 USD).
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    if (activeTab === 'transparency') {
      loadTransparencyData();
    }
  }, [activeTab, selectedJornada]);

  // Compile Leaderboard (Total Points from registrations)
  // We sum points grouped by participant_id
  
  const participantMap: { 
    [partId: string]: { 
      name: string; 
      nickname: string;
      phone: string; 
      totalPoints: number; 
      jornadaPoints: { [jornada: number]: number };
      confirmedJornadas: number[] 
    } 
  } = {};
  
  registrations.forEach(reg => {
    if (reg.payment_status === 'confirmed') {
      const partId = reg.participant_id;
      const partName = reg.participants?.name || 'Invitado';
      const partNickname = reg.participants?.nickname || '';
      const partPhone = reg.participants?.phone || '';
      
      if (!participantMap[partId]) {
        participantMap[partId] = {
          name: partName,
          nickname: partNickname,
          phone: partPhone,
          totalPoints: 0,
          jornadaPoints: {},
          confirmedJornadas: []
        };
      }
      
      participantMap[partId].totalPoints += reg.points;
      participantMap[partId].jornadaPoints[reg.jornada] = reg.points;
      participantMap[partId].confirmedJornadas.push(reg.jornada);
    }
  });

  const getAccumulatedPoints = (row: any, targetJornada: number) => {
    let sum = 0;
    for (let k = 1; k <= targetJornada; k++) {
      sum += row.jornadaPoints[k] || 0;
    }
    return sum;
  };

  const sortedLeaderboard = Object.values(participantMap)
    .filter(row => {
      // Must have participated in at least one confirmed jornada up to selectedJornada
      return row.confirmedJornadas.some(j => j <= selectedJornada);
    })
    .sort((a, b) => getAccumulatedPoints(b, selectedJornada) - getAccumulatedPoints(a, selectedJornada));

  const filteredLeaderboard = sortedLeaderboard.filter(row => 
    row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate Stats for the Selected Jornada
  const registrationsForJornada = registrations.filter(r => r.jornada === selectedJornada);
  const confirmedForJornada = registrationsForJornada.filter(r => r.payment_status === 'confirmed');
  const pendingForJornada = registrationsForJornada.filter(r => r.payment_status === 'pending');
  const accumulatedForJornada = confirmedForJornada.length * quinielaPrice;

  // Winners Podium Calculation for the Selected Jornada
  const hasFinishedMatches = selectedJornadaMatches.some(m => m.status === 'finished');
  const allMatchesFinished = selectedJornadaMatches.length > 0 && selectedJornadaMatches.every(m => m.status === 'finished');
  
  let maxJornadaPoints = 0;
  let jornadaWinners: { name: string; points: number }[] = [];
  
  if (hasFinishedMatches) {
    if (selectedJornada >= 5) {
      if (sortedLeaderboard.length > 0) {
        maxJornadaPoints = getAccumulatedPoints(sortedLeaderboard[0], selectedJornada);
        jornadaWinners = sortedLeaderboard
          .filter(row => getAccumulatedPoints(row, selectedJornada) === maxJornadaPoints)
          .map(row => ({
            name: row.name,
            points: maxJornadaPoints
          }));
      }
    } else {
      if (confirmedForJornada.length > 0) {
        maxJornadaPoints = Math.max(...confirmedForJornada.map(r => r.points), 0);
        jornadaWinners = confirmedForJornada
          .filter(r => r.points === maxJornadaPoints)
          .map(r => ({
            name: r.participants?.name || 'Invitado',
            points: r.points
          }));
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', padding: '10px 0' }}>
      
      {/* Tab Selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', gap: '10px' }}>
        <button
          onClick={() => setActiveTab('leaderboard')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'leaderboard' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'leaderboard' ? '#fff' : 'var(--text-secondary)',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          🏆 Tabla de Posiciones
        </button>
        <button
          onClick={() => setActiveTab('play')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'play' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'play' ? '#fff' : 'var(--text-secondary)',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          📝 Llenar Pronósticos
        </button>
        <button
          onClick={() => setActiveTab('transparency')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'transparency' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'transparency' ? '#fff' : 'var(--text-secondary)',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          👁 Transparencia Quinielas
        </button>
        <button
          onClick={() => setActiveTab('payment_info')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'payment_info' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'payment_info' ? '#fff' : 'var(--text-secondary)',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          💰 Datos de Depósito
        </button>
      </div>

      {/* Stats metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        
        {/* Metric: Selected Jornada Prize */}
        <div className="glass-panel-glow" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
            <Award size={32} style={{ color: '#fbbf24' }} />
          </div>
          <div>
            <p style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>Premio Jornada {selectedJornada}</p>
            <h3 style={{ fontSize: '26px', color: '#fbbf24', marginTop: '2px', marginBottom: 0, fontWeight: '700' }}>
              ${accumulatedForJornada.toLocaleString('es-MX')} MXN
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
              Basado en {confirmedForJornada.length} quinielas confirmadas
            </p>
          </div>
        </div>

        {/* Metric: Entry Price */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <Trophy size={32} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <p style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>Costo de Entrada</p>
            <h3 style={{ fontSize: '26px', color: '#ffffff', marginTop: '2px', marginBottom: 0, fontWeight: '700' }}>
              ${quinielaPrice} MXN
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
              Por participante en la Jornada {selectedJornada}
            </p>
          </div>
        </div>

        {/* Metric: Registration Status for Selected Jornada */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
            <Users size={32} style={{ color: '#06b6d4' }} />
          </div>
          <div>
            <p style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>Participantes (Jor. {selectedJornada})</p>
            <h3 style={{ fontSize: '26px', color: '#ffffff', marginTop: '2px', marginBottom: 0, fontWeight: '700' }}>
              {registrationsForJornada.length} registrados
            </h3>
            <div style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '2px', margin: 0 }}>
              <span style={{ color: 'var(--primary)' }}>● {confirmedForJornada.length} Confirmados</span>
              <span style={{ color: '#fbbf24' }}>● {pendingForJornada.length} Pendientes</span>
            </div>
          </div>
        </div>

      </div>

      {/* Selector de Jornada */}
      <div className="glass-panel" style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Seleccionar Jornada:</span>
          <select 
            value={selectedJornada} 
            onChange={(e) => setSelectedJornada(Number(e.target.value))}
            style={{ width: '130px', padding: '6px 12px' }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
              <option key={num} value={num}>Jornada {num}</option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '13px', color: '#fbbf24', background: 'rgba(251,191,36,0.08)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.15)' }}>
          {deadline ? (
            <>
              <strong>Límite Jornada {selectedJornada}:</strong> {(() => {
                const formatted = deadline.toLocaleString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return formatted.charAt(0).toUpperCase() + formatted.slice(1);
              })()} ({isAfterDeadline ? 'Cerrado ❌' : 'Abierto ⏳'})
            </>
          ) : (
            <strong>Sin límite establecido para Jornada {selectedJornada} ⏳</strong>
          )}
        </div>
      </div>

      {/* VIEW: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Winners Podium Card */}
          {hasFinishedMatches && jornadaWinners.length > 0 && (
            <div className="glass-panel-glow" style={{ 
              padding: '24px', 
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(0, 0, 0, 0.4) 100%)',
              border: '1px solid rgba(251, 191, 36, 0.25)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px 0 rgba(251, 191, 36, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '22px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#fbbf24', fontWeight: '700' }}>
                  <Award size={26} /> {selectedJornada >= 5 ? `Podio de Ganadores - Fase Final (J5 - J${selectedJornada})` : `Podio de Ganadores - Jornada ${selectedJornada}`}
                </h3>
                <span style={{ 
                  fontSize: '12px', 
                  background: allMatchesFinished ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)', 
                  color: allMatchesFinished ? 'var(--primary)' : '#fbbf24', 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontWeight: '700',
                  border: allMatchesFinished ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(251,191,36,0.3)'
                }}>
                  {allMatchesFinished ? '🏆 Ganadores Oficiales' : '⏳ Resultados Parciales'}
                </span>
              </div>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                {selectedJornada >= 5 
                  ? `Felicidades a los participantes con la puntuación acumulada más alta (J5 - J${selectedJornada}) con un total de ` 
                  : `Felicidades a los participantes con la puntuación más alta en la Jornada ${selectedJornada} con un total de `
                }
                <strong style={{ color: '#fbbf24' }}>{maxJornadaPoints} aciertos</strong>:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '5px' }}>
                {jornadaWinners.map((winner, idx) => (
                  <div key={idx} style={{ 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid var(--border-glass)', 
                    borderRadius: '12px', 
                    padding: '12px 20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    flex: '1 1 calc(33.333% - 15px)',
                    minWidth: '220px'
                  }}>
                    <span style={{ fontSize: '24px' }}>🥇</span>
                    <div>
                      <strong style={{ display: 'block', fontSize: '16px', color: '#fff' }}>
                        {winner.name}
                      </strong>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Puntuación: <strong style={{ color: 'var(--primary)' }}>{winner.points} pts</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={20} style={{ color: '#fbbf24' }} /> Tabla de Posiciones
              </h3>
              <div style={{ width: '250px', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Buscar participante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ padding: '8px 12px 8px 36px', fontSize: '14px' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 8px', width: '60px', textAlign: 'center' }}>Rango</th>
                    <th style={{ padding: '12px 8px' }}>Participante</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', width: '150px' }}>Pts Jornada {selectedJornada}</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', width: '180px', fontWeight: '700', color: 'var(--primary)' }}>Pts Acumulados</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.length > 0 ? (
                    filteredLeaderboard.map((row, index) => {
                      const isGold = index === 0;
                      const isSilver = index === 1;
                      const isBronze = index === 2;

                      return (
                        <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: isGold ? 'rgba(251,191,36,0.03)' : 'none' }}>
                          <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                            {isGold ? '🥇' : isSilver ? '🥈' : isBronze ? '🥉' : `${index + 1}`}
                          </td>
                          <td style={{ padding: '16px 8px' }}>
                            <strong style={{ color: isGold ? '#fbbf24' : '#fff', display: 'block' }}>{row.name}</strong>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{row.nickname}</span>
                          </td>
                          <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: '500', color: 'var(--text-secondary)' }}>
                            {row.jornadaPoints[selectedJornada] || 0} pts
                          </td>
                          <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: '700', color: 'var(--primary)', fontSize: '17px' }}>
                            {getAccumulatedPoints(row, selectedJornada)} pts
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Aún no hay participantes con pagos confirmados registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'play' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* USER NOT LOGGED IN */}
          {!loggedInUser ? (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              {!isRegistering ? (
                /* LOGIN FORM */
                <div className="glass-panel-glow" style={{ padding: '30px', maxWidth: '450px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ fontSize: '22px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', margin: 0, textAlign: 'center' }}>
                    🔑 Iniciar Sesión - Quiniela
                  </h3>
                  
                  {/* Segmented Toggles */}
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', paddingBottom: '4px', gap: '5px' }}>
                    <button 
                      type="button" 
                      onClick={() => { setIsRegistering(false); setMessage(null); }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: 'none',
                        border: 'none',
                        borderBottom: !isRegistering ? '2px solid var(--primary)' : '2px solid transparent',
                        color: !isRegistering ? '#fff' : 'var(--text-secondary)',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Usuario Registrado
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setIsRegistering(true); setMessage(null); }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: 'none',
                        border: 'none',
                        borderBottom: isRegistering ? '2px solid var(--primary)' : '2px solid transparent',
                        color: isRegistering ? '#fff' : 'var(--text-secondary)',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Usuario Nuevo
                    </button>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', margin: 0, lineHeight: '1.4' }}>
                    Busca tu nombre o elígelo de la lista para ingresar a tus pronósticos de la Jornada {selectedJornada}.
                  </p>

                  <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {/* Search filter input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>1. Buscar mi Nombre</label>
                      <input 
                        type="text" 
                        placeholder="Escribe tu nombre para filtrar..."
                        value={loginSearch}
                        onChange={(e) => setLoginSearch(e.target.value)}
                        style={{ padding: '10px', fontSize: '14px' }}
                      />
                    </div>

                    {/* Combobox select */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>2. Seleccionar mi Usuario</label>
                      {loadingAllParts ? (
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cargando lista...</span>
                      ) : (
                        <select 
                          value={selectedPartIdForLogin} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedPartIdForLogin(val);
                            const part = allParticipants.find(p => p.id === val);
                            if (part) {
                              setNickname(part.nickname);
                            } else {
                              setNickname('');
                            }
                          }}
                          required
                          style={{ padding: '10px', fontSize: '14px', background: 'rgba(0, 0, 0, 0.4)', color: '#fff', border: '1px solid var(--border-glass)', borderRadius: '8px' }}
                        >
                          <option value="">-- Selecciona tu nombre --</option>
                          {allParticipants
                            .filter(p => 
                              p.name.toLowerCase().includes(loginSearch.toLowerCase()) || 
                              p.nickname.toLowerCase().includes(loginSearch.toLowerCase())
                            )
                            .map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} (@{p.nickname})
                              </option>
                            ))
                          }
                        </select>
                      )}
                    </div>

                    {nickname && (
                      <div style={{ background: 'rgba(0, 102, 255, 0.05)', border: '1px solid rgba(0, 102, 255, 0.15)', padding: '10px', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Usuario seleccionado: <strong style={{ color: '#fff' }}>@{nickname}</strong>
                      </div>
                    )}

                    {message && (
                      <div style={{
                        padding: '10px',
                        borderRadius: '8px',
                        background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid',
                        borderColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                        color: message.type === 'success' ? '#10b981' : '#ef4444',
                        fontSize: '13px'
                      }}>
                        <span>{message.text}</span>
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={loading || !nickname}
                      className="btn-primary"
                      style={{ padding: '12px', fontSize: '15px', fontWeight: '700', marginTop: '5px' }}
                    >
                      {loading ? 'Validando...' : 'Entrar a mi Cuenta'}
                    </button>
                  </form>
                </div>
              ) : (
                /* REGISTRATION FORM */
                <div className="glass-panel-glow" style={{ padding: '30px', maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ fontSize: '22px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', margin: 0, textAlign: 'center' }}>
                    📝 Registro de Participante
                  </h3>

                  {/* Segmented Toggles */}
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', paddingBottom: '4px', gap: '5px' }}>
                    <button 
                      type="button" 
                      onClick={() => { setIsRegistering(false); setMessage(null); }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: 'none',
                        border: 'none',
                        borderBottom: !isRegistering ? '2px solid var(--primary)' : '2px solid transparent',
                        color: !isRegistering ? '#fff' : 'var(--text-secondary)',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Usuario Registrado
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setIsRegistering(true); setMessage(null); }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: 'none',
                        border: 'none',
                        borderBottom: isRegistering ? '2px solid var(--primary)' : '2px solid transparent',
                        color: isRegistering ? '#fff' : 'var(--text-secondary)',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Usuario Nuevo
                    </button>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', margin: 0, lineHeight: '1.4' }}>
                    Regístrate para participar en la jornada actual de la Liga MX. Si llenas tu quiniela te comprometes a pagar.
                  </p>

                  <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Nombre Completo</label>
                      <input 
                        type="text" 
                        placeholder="Ej. Pedro Pérez"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={{ padding: '10px', fontSize: '14px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Nickname único (@TuNick)</label>
                      <input 
                        type="text" 
                        placeholder="Ej. pedrito99 (sin espacios)"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        required
                        style={{ padding: '10px', fontSize: '14px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Correo Electrónico (Opcional)</label>
                      <input 
                        type="email" 
                        placeholder="Ej. pedro@correo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ padding: '10px', fontSize: '14px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Teléfono (WhatsApp - Opcional)</label>
                      <input 
                        type="tel" 
                        placeholder="Ej. 2221234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={{ padding: '10px', fontSize: '14px' }}
                      />
                    </div>
                    
                    {/* Bank Details */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <strong style={{ display: 'block', color: '#fff' }}>Costo de Inscripción: $50 MXN (o $3 USD)</strong>
                      
                      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '11px', display: 'block' }}>MÉXICO (Transferencia)</span>
                        <div>Banco: <strong>NU MÉXICO</strong></div>
                        <div>Cuenta: <strong>01011741555</strong></div>
                        <div>CLABE: <strong>638180010117415556</strong></div>
                        <div>Titular: <strong>MANUEL ALEJANDRO HERNÁNDEZ COMPEÁN</strong></div>
                      </div>

                      <div>
                        <span style={{ color: 'var(--accent)', fontWeight: '700', fontSize: '11px', display: 'block' }}>USA (Zelle)</span>
                        <div>Zelle: <strong>3235575050</strong></div>
                        <div>Titular: <strong>Fredy Reyes Sánchez</strong></div>
                        <div>Monto: <strong>$3.00 USD</strong></div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Comprobante de Transferencia (Opcional)</label>
                      <div style={{
                        border: '1px dashed var(--border-glass)',
                        borderRadius: '10px',
                        padding: '12px',
                        textAlign: 'center',
                        background: 'rgba(0,0,0,0.2)',
                        cursor: 'pointer',
                        position: 'relative'
                      }}>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleFileChange}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            opacity: 0,
                            cursor: 'pointer'
                          }}
                        />
                        <Upload size={20} style={{ color: 'var(--text-secondary)', margin: '0 auto 6px' }} />
                        <p style={{ fontSize: '13px', color: receiptFile ? 'var(--primary)' : 'var(--text-secondary)', margin: 0 }}>
                          {receiptFile ? `✓ ${receiptFile.name}` : 'Selecciona el comprobante (Foto o PDF)'}
                        </p>
                      </div>
                    </div>

                    {message && (
                      <div style={{
                        padding: '10px',
                        borderRadius: '8px',
                        background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid',
                        borderColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                        color: message.type === 'success' ? '#10b981' : '#ef4444',
                        fontSize: '13px'
                      }}>
                        <span>{message.text}</span>
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="btn-primary"
                      style={{ padding: '12px', fontSize: '15px', fontWeight: '700' }}
                    >
                      {loading ? 'Registrando...' : 'Registrarme y Jugar'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            /* USER LOGGED IN - SHOW INTERACTIVE FORECAST SHEET */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Profile Header */}
              <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sesión iniciada</span>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                    👤 {loggedInUser.name} <span style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: '500' }}>(@{loggedInUser.nickname})</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {loggedInUser.payment_status === 'confirmed' ? (
                    <span style={{ fontSize: '13px', background: 'rgba(16,185,129,0.15)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', fontWeight: '600' }}>
                      ✓ Inscripción Confirmada
                    </span>
                  ) : (
                    <span style={{ fontSize: '13px', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)', fontWeight: '600' }}>
                      ⏳ Pago Pendiente de Validación
                    </span>
                  )}
                  <button 
                    onClick={handleLogout}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>

              {/* Deadline Status Banner */}
              <div>
                {isAfterDeadline ? (
                  <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>🔒</span>
                    <div>
                      <strong style={{ display: 'block', fontSize: '15px' }}>Jornada Bloqueada</strong>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Esta jornada ya inició y no se permiten más modificaciones a tus pronósticos.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>🔓</span>
                    <div>
                      <strong style={{ display: 'block', fontSize: '15px' }}>Jornada Abierta</strong>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Puedes seleccionar y modificar tus pronósticos. Los cambios se bloquearán al iniciar el primer partido de la jornada.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Match Predictions Grid */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚽ Mis Pronósticos - Jornada {selectedJornada}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedJornadaMatches.length > 0 ? (
                    selectedJornadaMatches.sort((a, b) => a.id - b.id).map((match) => {
                      const currentPred = userPredictions[match.id];
                      
                      return (
                        <div 
                          key={match.id} 
                          style={{ 
                            background: 'rgba(0,0,0,0.2)', 
                            border: '1px solid var(--border-glass)', 
                            borderRadius: '12px', 
                            padding: '16px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '15px'
                          }}
                        >
                          {/* Match Info */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {new Date(match.match_date).toLocaleDateString('es-MX', { 
                                weekday: 'long', 
                                day: 'numeric', 
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })} h
                            </span>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>
                              {match.local_team} vs {match.visitor_team}
                            </div>
                          </div>

                          {/* Interactive Buttons [L] [E] [V] */}
                          <div style={{ display: 'flex', gap: '8px', minWidth: '240px', flex: '1 1 auto', maxWidth: '360px' }}>
                            {(['L', 'E', 'V'] as const).map((opt) => {
                              const isSelected = currentPred === opt;
                              let bg = 'rgba(255,255,255,0.02)';
                              let border = '1px solid var(--border-glass)';
                              let color = 'var(--text-secondary)';
                              
                              if (isSelected) {
                                bg = opt === 'E' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)';
                                border = opt === 'E' ? '1px solid #f59e0b' : '1px solid var(--primary)';
                                color = opt === 'E' ? '#fbbf24' : 'var(--primary)';
                              }

                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  disabled={isAfterDeadline}
                                  onClick={() => {
                                    setUserPredictions(prev => ({
                                      ...prev,
                                      [match.id]: opt
                                    }));
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: '10px 6px',
                                    background: bg,
                                    border: border,
                                    borderRadius: '8px',
                                    color: color,
                                    fontWeight: '700',
                                    cursor: isAfterDeadline ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    fontSize: '13px'
                                  }}
                                >
                                  {opt === 'L' ? 'Local (L)' : opt === 'E' ? 'Empate (E)' : 'Visita (V)'}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>
                      No hay partidos cargados para la Jornada {selectedJornada}.
                    </p>
                  )}
                </div>

                {message && (
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    marginTop: '20px',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid',
                    borderColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                    color: message.type === 'success' ? '#10b981' : '#ef4444',
                    fontSize: '14px'
                  }}>
                    <span>{message.text}</span>
                  </div>
                )}

                {/* Save Forecasts Button */}
                <button
                  type="button"
                  disabled={loading || isAfterDeadline || selectedJornadaMatches.length === 0}
                  onClick={handleSaveForecasts}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '16px',
                    fontWeight: '700',
                    marginTop: '20px',
                    cursor: (loading || isAfterDeadline || selectedJornadaMatches.length === 0) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isAfterDeadline 
                    ? '🔒 Jornada Bloqueada para Modificaciones' 
                    : loading 
                      ? 'Guardando Pronósticos...' 
                      : '💾 Guardar Pronósticos'
                  }
                </button>

                {/* Print/Save PDF Button */}
                {Object.keys(userPredictions).length > 0 && (
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="btn-secondary"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '15px',
                      fontWeight: '600',
                      marginTop: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    🖨️ Descargar PDF / Imprimir Pronósticos
                  </button>
                )}

              </div>

            </div>
          )}

        </div>
      )}

      {/* VIEW: TRANSPARENCY MODULE */}
      {activeTab === 'transparency' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '15px' }}>
            <h3 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={20} style={{ color: 'var(--accent)' }} /> Quinielas Recibidas (Jornada {selectedJornada})
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Para asegurar que no haya malos entendidos, aquí se muestran las predicciones ingresadas por TODOS los participantes con pago confirmado una vez vencido el límite de envío.
            </p>
          </div>

          {!isAfterDeadline ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔒</div>
              <h4 style={{ color: '#fff', fontSize: '18px' }}>Contenido Bloqueado Temporalmente</h4>
              <p style={{ maxWidth: '500px', margin: '8px auto 0', fontSize: '14px' }}>
                Las quinielas de los demás participantes se revelarán automáticamente en la fecha límite de esta jornada{' '}
                {deadline && (
                  <strong>
                    ({(() => {
                      const formatted = deadline.toLocaleString('es-MX', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
                    })()})
                  </strong>
                )}
                {' '}para evitar que se copien los pronósticos antes del cierre.
              </p>
            </div>
          ) : (
            <div>
              {loadingTransparency ? (
                <p style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)' }}>Cargando quinielas de participantes...</p>
              ) : transparencyData.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Search bar inside transparency tab */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="🔍 Buscar participante por nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        padding: '10px 14px',
                        fontSize: '14px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '8px',
                        color: '#fff',
                        width: '100%',
                        maxWidth: '300px'
                      }}
                    />
                  </div>

                  {/* Comparative Matrix Table */}
                  <div style={{ overflowX: 'auto', background: 'rgba(0, 0, 0, 0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '10px 8px', textAlign: 'left', minWidth: '150px' }}>Participante</th>
                          {selectedJornadaMatches.map((m, idx) => (
                            <th key={m.id} style={{ padding: '10px 8px', minWidth: '45px' }} title={`${m.local_team} vs ${m.visitor_team}`}>
                              P{idx + 1}
                            </th>
                          ))}
                          <th style={{ padding: '10px 8px', fontWeight: '700', color: 'var(--primary)', minWidth: '50px' }}>Puntos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transparencyData
                          .filter(reg => {
                            const name = reg.participants?.name || '';
                            const nick = reg.participants?.nickname || '';
                            return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                   nick.toLowerCase().includes(searchTerm.toLowerCase());
                          })
                          .map((reg) => (
                            <tr key={reg.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '12px 8px', textAlign: 'left' }}>
                                <strong style={{ color: '#fff', display: 'block' }}>{reg.participants?.name}</strong>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{reg.participants?.nickname || 'sin_nick'}</span>
                              </td>
                              {selectedJornadaMatches.map((match) => {
                                const forecast = reg.forecasts?.find((f: any) => f.match_id === match.id);
                                const predVal = forecast?.prediction || '-';
                                const isMatchFinished = match.status === 'finished';
                                const isCorrect = isMatchFinished && predVal === match.result;
                                
                                let cellColor = 'var(--text-secondary)';
                                let cellBg = 'transparent';
                                
                                if (isMatchFinished) {
                                  cellColor = isCorrect ? '#fff' : 'rgba(255, 255, 255, 0.2)';
                                  cellBg = isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.08)';
                                }

                                return (
                                  <td 
                                    key={match.id} 
                                    style={{ 
                                      padding: '12px 8px', 
                                      color: cellColor, 
                                      backgroundColor: cellBg, 
                                      fontWeight: '700',
                                      borderLeft: '1px solid rgba(255,255,255,0.02)',
                                      borderRight: '1px solid rgba(255,255,255,0.02)'
                                    }}
                                  >
                                    {predVal}
                                  </td>
                                );
                              })}
                              <td style={{ padding: '12px 8px', fontWeight: '700', color: 'var(--primary)', fontSize: '15px' }}>
                                {reg.points}
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>

                  {/* Leyenda y Partidos de la Jornada */}
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '16px' }}>
                    <h5 style={{ fontSize: '14px', color: '#fff', margin: '0 0 10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                      📋 Leyenda de Partidos (Jornada {selectedJornada})
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                      {selectedJornadaMatches.map((m, idx) => (
                        <div key={m.id} style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                          <span><strong>P{idx + 1}:</strong> {m.local_team} vs {m.visitor_team}</span>
                          {m.status === 'finished' ? (
                            <strong style={{ color: 'var(--primary)', marginLeft: '6px' }}>[{m.result}]</strong>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic', marginLeft: '6px' }}>Pendiente</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <p style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                  Aún no hay quinielas confirmadas (pagadas) para mostrar en esta jornada.
                </p>
              )}
            </div>
          )}

        </div>
      )}

      {/* VIEW: PAYMENT INFO TAB */}
      {activeTab === 'payment_info' && (
        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel-glow" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '22px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              💰 Cuentas de Pago - Quiniela
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* México Account */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '13px', display: 'block', marginBottom: '10px', textTransform: 'uppercase' }}>MÉXICO (Transferencia Bancaria)</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Monto por Jornada:</span>
                    <strong style={{ color: '#fff' }}>$50.00 MXN</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Banco:</span>
                    <strong style={{ color: '#fff' }}>NU MÉXICO</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Cuenta:</span>
                    <strong style={{ color: '#fff', letterSpacing: '0.5px' }}>01011741555</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>CLABE Interbancaria:</span>
                    <strong style={{ color: '#fff', letterSpacing: '0.5px' }}>638180010117415556</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Titular:</span>
                    <strong style={{ color: '#fff' }}>MANUEL ALEJANDRO HERNÁNDEZ COMPEÁN</strong>
                  </div>
                </div>
              </div>

              {/* USA Account */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                <span style={{ color: 'var(--accent)', fontWeight: '700', fontSize: '13px', display: 'block', marginBottom: '10px', textTransform: 'uppercase' }}>USA (Zelle)</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Monto por Jornada:</span>
                    <strong style={{ color: '#fbbf24' }}>$3.00 USD</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Zelle:</span>
                    <strong style={{ color: '#fff' }}>3235575050</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Titular:</span>
                    <strong style={{ color: '#fff' }}>Fredy Reyes Sánchez</strong>
                  </div>
                </div>
              </div>

              {/* Instructions and Rules */}
              <div style={{ background: 'rgba(0, 102, 255, 0.08)', border: '1px solid rgba(0, 102, 255, 0.15)', padding: '16px', borderRadius: '10px', fontSize: '14px', lineHeight: '1.6' }}>
                <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '6px' }}>📝 Validación del Pago:</strong>
                <p style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>
                  De preferencia, sube tu comprobante de pago al guardar tus pronósticos. Si no puedes subirlo en ese momento, puedes confirmarlo enviando un mensaje directamente a <strong>Manuel</strong> o <strong>Fredy</strong>. Se puede confirmar la participación por mensaje antes de realizar la transferencia física.
                </p>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  <strong>Regla de Compromiso:</strong> Al llenar una quiniela te comprometes a pagar.
                </p>
              </div>

              <div style={{ background: 'rgba(255, 59, 48, 0.08)', border: '1px solid rgba(255, 59, 48, 0.15)', padding: '16px', borderRadius: '10px', fontSize: '14px', lineHeight: '1.6' }}>
                <strong style={{ color: 'var(--secondary)', display: 'block', marginBottom: '6px' }}>⚠️ Regla de Pago Extemporáneo (Penalización):</strong>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Cualquier pago recibido de forma extemporánea (después del silbatazo inicial del primer partido de la jornada) se considera un <strong>foul</strong>. Si resultas ganador en esa semana, serás penalizado con el <strong>50% del premio acumulado</strong> de esa semana. El 50% restante se dejará para la bolsa de la siguiente semana. <em>Nota: Se aceptan excepciones bajo situaciones extraordinarias que te impidan realizar la transferencia bancaria a tiempo, siempre y cuando notifiques y confirmes tu participación por mensaje con Manuel o Fredy antes del inicio del primer partido.</em>
                </p>
              </div>

            </div>
          </div>
        </div>
      )}



      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel-glow" style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              background: 'rgba(16, 185, 129, 0.1)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 16px',
              border: '2px solid var(--primary)'
            }}>
              <CheckCircle2 size={36} style={{ color: 'var(--primary)' }} />
            </div>
            
            <h2 style={{ fontSize: '24px', color: '#fff', marginBottom: '8px' }}>¡Quiniela Recibida!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '24px', lineHeight: '1.5' }}>
              La foto de tu quiniela y tu comprobante de pago han sido enviados con éxito. El administrador confirmará tu pago pronto y tus puntos se actualizarán en la tabla de posiciones conforme avance la jornada.
            </p>
            
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="btn-primary" 
              style={{ width: '100%', padding: '12px' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
