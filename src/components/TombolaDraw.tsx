import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Ticket, Team, TombolaStatus } from '../types';
import { Play, RotateCcw, AlertTriangle, ShieldCheck, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TombolaDrawProps {
  tombolaStatus: TombolaStatus | null;
  tickets: Ticket[];
  isAdmin: boolean;
  fetchData: () => Promise<void>;
}

export const TombolaDraw: React.FC<TombolaDrawProps> = ({
  tombolaStatus,
  tickets,
  isAdmin,
  fetchData
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Animation state
  const [drawInProgress, setDrawInProgress] = useState(false);
  const [animatedTickets, setAnimatedTickets] = useState<{ id: string; name: string; currentTeam: string; flag: string; finalized: boolean }[]>([]);

  // Demo Draw State
  const [tempAssignments, setTempAssignments] = useState<{ ticketId: string; teamName: string; flag: string }[] | null>(null);
  const [tempExtraAssignments, setTempExtraAssignments] = useState<{ [ticketId: string]: string[] } | null>(null);

  // Fetch teams from database
  useEffect(() => {
    const fetchTeams = async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true });
      if (!error && data) {
        setTeams(data);
      }
    };
    fetchTeams();
  }, []);

  const confirmedTickets = tickets.filter(t => t.payment_status === 'confirmed');

  // Perform Draw Logic
  const executeDraw = async () => {
    if (confirmedTickets.length === 0) {
      alert('No hay boletos confirmados (pagados) para realizar el sorteo.');
      return;
    }
    if (teams.length === 0) {
      alert('No se han cargado las selecciones en la base de datos.');
      return;
    }

    setDrawInProgress(true);
    
    // 1. Shuffling logic (Fisher-Yates)
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    const shuffledTickets = [...confirmedTickets].sort(() => Math.random() - 0.5);
    
    const assignments: { ticketId: string; teamName: string; flag: string }[] = [];
    const extraAssignments: { [ticketId: string]: string[] } = {};

    // Case A: Fewer tickets than teams (Redistribution of unsold teams)
    if (shuffledTickets.length <= shuffledTeams.length) {
      // 1. Assign 1 team to each ticket
      shuffledTickets.forEach((ticket, index) => {
        assignments.push({
          ticketId: ticket.id,
          teamName: shuffledTeams[index].name,
          flag: shuffledTeams[index].flag_emoji
        });
      });

      // 2. Redistribute remaining unsold teams among tickets randomly
      const unsoldTeams = shuffledTeams.slice(shuffledTickets.length);
      
      unsoldTeams.forEach((team) => {
        // Pick a random ticket from our assigned list
        const randomTicketIdx = Math.floor(Math.random() * shuffledTickets.length);
        const targetTicketId = shuffledTickets[randomTicketIdx].id;
        
        if (!extraAssignments[targetTicketId]) {
          extraAssignments[targetTicketId] = [];
        }
        extraAssignments[targetTicketId].push(`${team.flag_emoji} ${team.name}`);
      });
    } 
    // Case B: More tickets than teams (Duplicate teams as needed)
    else {
      shuffledTickets.forEach((ticket, index) => {
        // Loop back through teams
        const teamIdx = index % shuffledTeams.length;
        assignments.push({
          ticketId: ticket.id,
          teamName: shuffledTeams[teamIdx].name,
          flag: shuffledTeams[teamIdx].flag_emoji
        });
      });
    }

    // Prepare animated tickets state
    const initialAnimationState = confirmedTickets.map(t => {
      return {
        id: t.id,
        name: t.participants?.name || 'Invitado',
        currentTeam: '???',
        flag: '🎲',
        finalized: false
      };
    });
    setAnimatedTickets(initialAnimationState);

    // Run custom roulette animation loop
    let ticks = 0;
    const maxTicks = 30; // Number of cycles
    const interval = setInterval(() => {
      ticks += 1;
      
      setAnimatedTickets(prev => 
        prev.map(t => {
          if (t.finalized) return t;

          // Pick random team for the spin
          const randomTeam = teams[Math.floor(Math.random() * teams.length)];
          const finalMatch = assignments.find(a => a.ticketId === t.id);
          
          // Determine if we should lock this card
          // We lock them one by one to look cool
          const isTime = ticks >= maxTicks;
          
          if (isTime && finalMatch) {
            // Append extra teams if they won any in the redistribution
            let displayTeamName = finalMatch.teamName;
            if (extraAssignments[t.id]) {
              displayTeamName += ` + ${extraAssignments[t.id].join(' y ')}`;
            }
            return {
              ...t,
              currentTeam: displayTeamName,
              flag: finalMatch.flag,
              finalized: true
            };
          } else {
            return {
              ...t,
              currentTeam: randomTeam.name,
              flag: randomTeam.flag_emoji
            };
          }
        })
      );

      if (ticks >= maxTicks) {
        clearInterval(interval);
        showDemoResults(assignments, extraAssignments);
      }
    }, 100);
  };

  const showDemoResults = (
    assignments: { ticketId: string; teamName: string; flag: string }[],
    extraAssignments: { [ticketId: string]: string[] }
  ) => {
    setTempAssignments(assignments);
    setTempExtraAssignments(extraAssignments);
    setDrawInProgress(false);

    // Celebrate!
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const confInterval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(confInterval);
      }
      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
  };

  const saveDefinitiveDraw = async () => {
    if (!tempAssignments || !tempExtraAssignments) return;
    if (!window.confirm('¿Estás seguro de guardar estos resultados como DEFINITIVOS? Una vez guardados, se publicarán para todos los usuarios y no podrán cambiarse.')) return;
    
    setLoading(true);
    try {
      // 1. Save results to database (tickets table)
      for (const assignment of tempAssignments) {
        let finalTeamString = assignment.teamName;
        if (tempExtraAssignments[assignment.ticketId]) {
          finalTeamString += ` + ${tempExtraAssignments[assignment.ticketId].join(', ')}`;
        }

        const { error } = await supabase
          .from('tickets')
          .update({ assigned_team: finalTeamString })
          .eq('id', assignment.ticketId);

        if (error) throw error;
      }

      // 2. Update status in settings table
      const { error: settingsError } = await supabase
        .from('settings')
        .update({ value: { drawn: true, draw_date: new Date().toISOString(), drawn_by: 'Admin' } })
        .eq('key', 'tombola_status');

      if (settingsError) throw settingsError;

      alert('Sorteo guardado y publicado como DEFINITIVO.');
      setTempAssignments(null);
      setTempExtraAssignments(null);
      await fetchData();
    } catch (e: any) {
      alert(`Error al guardar resultados del sorteo: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Cancel / Reset Simulation
  const handleResetSimulation = () => {
    setTempAssignments(null);
    setTempExtraAssignments(null);
    setAnimatedTickets([]);
  };

  // Reset Sorteo (Only for testing or restarts)
  const handleResetDraw = async () => {
    if (!window.confirm('¿Estás seguro de reiniciar el sorteo? Esto borrará todas las selecciones asignadas.')) return;
    setLoading(true);
    try {
      const { error: resetTickets } = await supabase
        .from('tickets')
        .update({ assigned_team: null });
      
      if (resetTickets) throw resetTickets;

      const { error: resetStatus } = await supabase
        .from('settings')
        .update({ value: { drawn: false, draw_date: new Date().toISOString(), drawn_by: null } })
        .eq('key', 'tombola_status');

      if (resetStatus) throw resetStatus;

      setAnimatedTickets([]);
      setTempAssignments(null);
      setTempExtraAssignments(null);
      await fetchData();
    } catch (e: any) {
      alert(`Error al reiniciar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', padding: '10px 0', alignItems: 'center' }}>
      
      {/* 1. Header Information */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', padding: '30px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '28px', color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          🎲 Sorteo Tómbola en Vivo
        </h2>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 20px' }}>
          Asignación aleatoria de las 48 selecciones del Mundial a los participantes con boleto pagado y verificado.
        </p>

        {/* Status Indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', border: '1px solid var(--border-glass)' }}>
            Boletos Confirmados: <strong style={{ color: 'var(--primary)' }}>{confirmedTickets.length}</strong>
          </span>
          <span style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', border: '1px solid var(--border-glass)' }}>
            Selecciones Totales: <strong style={{ color: '#06b6d4' }}>{teams.length}</strong>
          </span>
          <span style={{ 
            background: tombolaStatus?.drawn ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
            color: tombolaStatus?.drawn ? 'var(--primary)' : '#fbbf24',
            padding: '8px 16px', 
            borderRadius: '20px', 
            fontSize: '14px', 
            border: '1px solid',
            borderColor: tombolaStatus?.drawn ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'
          }}>
            Estatus: <strong>{tombolaStatus?.drawn ? 'Realizado ✓' : 'Pendiente 🎲'}</strong>
          </span>
        </div>
      </div>

      {/* Sorteo Action Trigger */}
      {!tombolaStatus?.drawn && isAdmin && !drawInProgress && !tempAssignments && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={executeDraw}
            className="btn-gold animate-pulse-glow"
            style={{ padding: '16px 40px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <Play size={24} fill="currentColor" /> ¡Iniciar Sorteo en Vivo!
          </button>
          
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: '8px', maxWidth: '500px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <AlertTriangle size={16} /> 
              Se asignarán selecciones a los {confirmedTickets.length} boletos confirmados.
            </p>
            {confirmedTickets.length < teams.length && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Nota: Como hay {teams.length - confirmedTickets.length} selecciones sobrantes, éstas serán distribuidas al azar como selecciones adicionales gratuitas entre los participantes.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 3. Animation Grid / Results Screen */}
      {drawInProgress && (
        <div style={{ width: '100%', maxWidth: '1000px' }}>
          <h3 style={{ textAlign: 'center', color: '#fff', fontSize: '22px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <div style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '50%', animation: 'pulse-glow 1s infinite' }}></div>
            Mezclando y asignando selecciones...
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
            {animatedTickets.map((t) => (
              <div 
                key={t.id} 
                className="glass-panel"
                style={{ 
                  padding: '20px', 
                  textAlign: 'center',
                  border: t.finalized ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                  background: t.finalized ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.2)',
                  boxShadow: t.finalized ? '0 0 15px rgba(16, 185, 129, 0.1)' : 'none',
                  transform: t.finalized ? 'scale(1.03)' : 'scale(1)',
                  transition: 'all 0.3s ease'
                }}
              >
                <span style={{ fontSize: '36px', display: 'block', margin: '0 auto 10px', filter: t.finalized ? 'none' : 'grayscale(0.5)' }}>
                  {t.flag}
                </span>
                <h4 style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>{t.name}</h4>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: '700', 
                  color: t.finalized ? '#fff' : '#fbbf24', 
                  marginTop: '8px',
                  fontFamily: 'monospace'
                }}>
                  {t.currentTeam}
                </div>
                {t.finalized && (
                  <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600', display: 'block', marginTop: '4px' }}>
                    Asignado ✓
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Draw Completed / Simulated Results Grid */}
      {(tombolaStatus?.drawn || tempAssignments) && !drawInProgress && (
        <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Simulation Control Panel */}
          {tempAssignments && !tombolaStatus?.drawn && (
            <div className="glass-panel-glow animate-pulse-glow" style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(251, 191, 36, 0.05)',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              borderRadius: '12px',
              textAlign: 'center',
              width: '100%'
            }}>
              <h3 style={{ fontSize: '18px', color: '#fbbf24', margin: 0, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚠️ VISTA PREVIA DEL SORTEO (Simulación)
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, maxWidth: '650px', lineHeight: '1.4' }}>
                Estás viendo una simulación en tiempo real. La base de datos no se ha modificado y los participantes no pueden ver esto. Puedes simular otro sorteo o guardarlo como definitivo.
              </p>
              <div style={{ display: 'flex', gap: '15px', marginTop: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={executeDraw}
                  disabled={loading || drawInProgress}
                  className="btn-secondary"
                  style={{ padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <RotateCcw size={16} /> Volver a Sortear (Simular)
                </button>
                <button
                  onClick={handleResetSimulation}
                  disabled={loading || drawInProgress}
                  className="btn-secondary"
                  style={{ 
                    padding: '10px 20px', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    borderColor: 'rgba(239, 68, 68, 0.2)'
                  }}
                >
                  <RotateCcw size={16} /> Cancelar / Resetear Simulación
                </button>
                <button
                  onClick={saveDefinitiveDraw}
                  disabled={loading || drawInProgress}
                  className="btn-gold"
                  style={{ padding: '10px 24px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}
                >
                  <ShieldCheck size={16} /> Guardar Sorteo Definitivo
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '15px' }}>
            <h3 style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={22} style={{ color: '#fbbf24' }} /> {tombolaStatus?.drawn ? 'Resultados Oficiales del Sorteo' : 'Resultados de Simulación en Vivo'}
            </h3>
            {tombolaStatus?.drawn && isAdmin && (
              <button 
                onClick={handleResetDraw}
                disabled={loading}
                style={{ padding: '8px 16px', fontSize: '13px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                className="btn-secondary"
              >
                <RotateCcw size={14} /> Reiniciar Sorteo
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
            {confirmedTickets.map((t) => {
              let displayTeam = t.assigned_team;
              
              if (tempAssignments) {
                const tempAssign = tempAssignments.find(a => a.ticketId === t.id);
                if (tempAssign) {
                  displayTeam = tempAssign.teamName;
                  if (tempExtraAssignments && tempExtraAssignments[t.id]) {
                    displayTeam += ` + ${tempExtraAssignments[t.id].join(', ')}`;
                  }
                } else {
                  displayTeam = 'Sin selección';
                }
              }

              return (
                <div 
                  key={t.id} 
                  className="glass-panel-glow"
                  style={{ 
                    padding: '20px', 
                    textAlign: 'center',
                    background: 'rgba(13, 22, 15, 0.4)',
                    border: tempAssignments ? '1px dashed rgba(251, 191, 36, 0.3)' : '1px solid var(--border-glass)'
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '24px' }}>
                    🌍
                  </div>
                  <h4 style={{ fontSize: '16px', color: '#fff' }}>{t.participants?.name || 'Invitado'}</h4>
                  <div style={{ 
                    fontSize: '15px', 
                    fontWeight: '600', 
                    color: '#fbbf24', 
                    marginTop: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-glass)'
                  }}>
                    {displayTeam || 'Sin selección asignada'}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* If raffle hasn't happened yet and we are not admin */}
      {!tombolaStatus?.drawn && !isAdmin && !drawInProgress && !tempAssignments && (
        <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '48px' }}>⏳</div>
          <h3 style={{ fontSize: '22px' }}>El Sorteo Aún No Ha Comenzado</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            El sorteo en vivo se realizará el día **miércoles a las 10:00 p.m.** a través del enlace de Zoom / Facebook Live proporcionado. 
          </p>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              En cuanto el administrador inicie la transmisión y ejecute el sorteo desde el panel, las selecciones de cada boleto se revelarán aquí en tiempo real.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
