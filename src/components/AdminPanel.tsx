import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Ticket, QuinielaRegistration, Match, BankDetails, Prices, Links } from '../types';
import { ShieldAlert, Check, Eye, Trash2, Plus, Save, Settings, FileText, X, RotateCcw, Upload, Calendar } from 'lucide-react';

interface AdminPanelProps {
  tickets: Ticket[];
  registrations: QuinielaRegistration[];
  matches: Match[];
  bankDetailsTombola: BankDetails | null;
  bankDetailsQuiniela: BankDetails | null;
  prices: Prices | null;
  links: Links | null;
  adminPin: string;
  fetchData: () => Promise<void>;
  isAdminMode: boolean;
  setIsAdminMode: (val: boolean) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  tickets,
  registrations,
  matches,
  bankDetailsTombola,
  bankDetailsQuiniela,
  prices,
  links,
  adminPin,
  fetchData,
  isAdminMode,
  setIsAdminMode
}) => {
  // Authentication State
  const [pinInput, setPinInput] = useState('');
  
  // Tab State
  const [activeSubTab, setActiveSubTab] = useState<'payments' | 'scores' | 'settings' | 'participants'>('payments');
  const [dbParticipants, setDbParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  
  // Settings Form State - Tombola
  const [tombolaBanco, setTombolaBanco] = useState('');
  const [tombolaCuenta, setTombolaCuenta] = useState('');
  const [tombolaClabe, setTombolaClabe] = useState('');
  const [tombolaTitular, setTombolaTitular] = useState('');
  const [zelle, setZelle] = useState('');
  const [zelleTitular, setZelleTitular] = useState('');
  const [zelleUsd, setZelleUsd] = useState(6);

  // Settings Form State - Quiniela
  const [quinielaBanco, setQuinielaBanco] = useState('');
  const [quinielaCuenta, setQuinielaCuenta] = useState('');
  const [quinielaClabe, setQuinielaClabe] = useState('');
  const [quinielaTitular, setQuinielaTitular] = useState('');

  const [priceTombola, setPriceTombola] = useState(100);
  const [priceQuiniela, setPriceQuiniela] = useState(100);
  const [zoomLink, setZoomLink] = useState('');

  // Match Form State (for adding matches)
  const [newLocalTeam, setNewLocalTeam] = useState('');
  const [newVisitorTeam, setNewVisitorTeam] = useState('');
  const [newJornada, setNewJornada] = useState(1);
  const [newMatchDate, setNewMatchDate] = useState('');

  // Match editing scores state
  const [matchScores, setMatchScores] = useState<{ [matchId: number]: { local: string; visitor: string; status: 'pending' | 'finished' } }>({});

  // Manual points state
  const [editablePoints, setEditablePoints] = useState<{ [regId: string]: string }>({});

  const [loading, setLoading] = useState(false);

  // Transcription State
  const [activeTranscriptionReg, setActiveTranscriptionReg] = useState<QuinielaRegistration | null>(null);
  const [transcriptionPredictions, setTranscriptionPredictions] = useState<{ [matchId: number]: 'L' | 'E' | 'V' }>({});
  const [loadingTranscription, setLoadingTranscription] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [manualImageFile, setManualImageFile] = useState<File | null>(null);
  const [creatingManualReg, setCreatingManualReg] = useState(false);
  const [cloningFaseFinal, setCloningFaseFinal] = useState(false);
  const [selectedJornada, setSelectedJornada] = useState(1);
  const [hasSetInitialJornada, setHasSetInitialJornada] = useState(false);

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

  // Authenticate PIN
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === adminPin) {
      setIsAdminMode(true);
      setPinInput('');
    } else {
      alert('PIN Incorrecto');
    }
  };

  // Populate settings form when loaded
  useEffect(() => {
    if (bankDetailsTombola) {
      setTombolaBanco(bankDetailsTombola.banco || '');
      setTombolaCuenta(bankDetailsTombola.cuenta || '');
      setTombolaClabe(bankDetailsTombola.clabe || '');
      setTombolaTitular(bankDetailsTombola.titular || '');
      setZelle(bankDetailsTombola.zelle || '');
      setZelleTitular(bankDetailsTombola.zelle_titular || '');
      setZelleUsd(bankDetailsTombola.zelle_usd || 6);
    }
    if (bankDetailsQuiniela) {
      setQuinielaBanco(bankDetailsQuiniela.banco || '');
      setQuinielaCuenta(bankDetailsQuiniela.cuenta || '');
      setQuinielaClabe(bankDetailsQuiniela.clabe || '');
      setQuinielaTitular(bankDetailsQuiniela.titular || '');
    }
    if (prices) {
      setPriceTombola(prices.ticket_tombola);
      setPriceQuiniela(prices.jornada_quiniela);
    }
    if (links) {
      setZoomLink(links.live_stream);
    }
  }, [bankDetailsTombola, bankDetailsQuiniela, prices, links]);

  // Populate matches scores editable state
  useEffect(() => {
    const initialScores: typeof matchScores = {};
    matches.forEach(m => {
      initialScores[m.id] = {
        local: m.score_local !== null ? String(m.score_local) : '',
        visitor: m.score_visitor !== null ? String(m.score_visitor) : '',
        status: m.status
      };
    });
    setMatchScores(initialScores);
  }, [matches]);
  // Populate registrations points editable state
  useEffect(() => {
    const initialPoints: typeof editablePoints = {};
    registrations.forEach(r => {
      initialPoints[r.id] = String(r.points);
    });
    setEditablePoints(initialPoints);
  }, [registrations]);

  // Fetch participants from database
  const fetchDbParticipants = async () => {
    setLoadingParticipants(true);
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setDbParticipants(data || []);
    } catch (e: any) {
      console.error('Error fetching participants:', e.message);
    } finally {
      setLoadingParticipants(false);
    }
  };

  useEffect(() => {
    if (isAdminMode) {
      fetchDbParticipants();
    }
  }, [isAdminMode, tickets, registrations]);

  // Helper stats for each participant
  const getParticipantStats = (participantId: string) => {
    const pTickets = tickets.filter(t => t.participant_id === participantId);
    const pRegs = registrations.filter(r => r.participant_id === participantId);
    return {
      ticketsCount: pTickets.length,
      confirmedTicketsCount: pTickets.filter(t => t.payment_status === 'confirmed').length,
      regsCount: pRegs.length,
      confirmedRegsCount: pRegs.filter(r => r.payment_status === 'confirmed').length
    };
  };

  // Delete participant in cascade
  const handleDeleteParticipant = async (participantId: string, participantName: string) => {
    const stats = getParticipantStats(participantId);
    const confirmMessage = 
      `¿Estás seguro de eliminar al participante "${participantName}"?\n\n` +
      `Esto borrará permanentemente:\n` +
      `- El participante\n` +
      `- Sus ${stats.ticketsCount} boletos de tómbola asociados\n` +
      `- Sus ${stats.regsCount} registros de quiniela y pronósticos asociados\n\n` +
      `Esta acción es totalmente irreversible. ¿Deseas continuar?`;
      
    if (!window.confirm(confirmMessage)) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participantId);
        
      if (error) throw error;
      alert(`Participante "${participantName}" eliminado con éxito.`);
      await fetchDbParticipants();
      await fetchData(); // Refresh parent state
    } catch (e: any) {
      alert(`Error al eliminar participante: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };
  // Approve Ticket Payment
  const approveTicket = async (ticketId: string) => {
    if (!window.confirm('¿Confirmar pago de este boleto para la tómbola?')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ payment_status: 'confirmed' })
        .eq('id', ticketId);
      
      if (error) throw error;
      await fetchData();
    } catch (e: any) {
      alert(`Error al confirmar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Approve Quiniela Payment
  const approveQuiniela = async (registrationId: string) => {
    if (!window.confirm('¿Confirmar pago de esta quiniela? Esto activará sus pronósticos en transparencia.')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('quiniela_registrations')
        .update({ payment_status: 'confirmed' })
        .eq('id', registrationId);
      
      if (error) throw error;
      await fetchData();
    } catch (e: any) {
      alert(`Error al confirmar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Reject/Delete Ticket Request
  const deleteTicketRequest = async (ticketId: string) => {
    if (!window.confirm('¿Rechazar y eliminar por completo esta solicitud de boleto?\n\nEsta acción borrará el registro permanentemente.')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);
      
      if (error) throw error;
      await fetchData();
    } catch (e: any) {
      alert(`Error al eliminar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Reject/Delete Quiniela Request
  const deleteQuinielaRequest = async (registrationId: string) => {
    if (!window.confirm('¿Rechazar y eliminar por completo esta solicitud de quiniela?\n\nEsta acción borrará el registro permanentemente.')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('quiniela_registrations')
        .delete()
        .eq('id', registrationId);
      
      if (error) throw error;
      await fetchData();
    } catch (e: any) {
      alert(`Error al eliminar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Save Match Score
  const saveMatchScore = async (matchId: number) => {
    const editState = matchScores[matchId];
    if (!editState) return;

    const localScore = editState.local === '' ? null : Number(editState.local);
    const visitorScore = editState.visitor === '' ? null : Number(editState.visitor);
    const status = editState.status;

    const matchObj = matches.find(m => m.id === matchId);
    const isKnockout = matchObj && matchObj.jornada >= 4;

    if (status === 'finished' && isKnockout && localScore !== null && visitorScore !== null && localScore === visitorScore) {
      alert('En la Fase de Eliminación (Jornada 4+), no puede haber empates. Por favor ingresa el marcador final (incluyendo penales o tiempos extra) para definir al ganador.');
      return;
    }

    let result: 'L' | 'E' | 'V' | null = null;
    if (status === 'finished' && localScore !== null && visitorScore !== null) {
      if (localScore > visitorScore) result = 'L';
      else if (localScore < visitorScore) result = 'V';
      else result = 'E';
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          score_local: localScore,
          score_visitor: visitorScore,
          status,
          result
        })
        .eq('id', matchId);

      if (error) throw error;
      alert('Partido guardado y puntos recalculados correctamente.');
      await fetchData();
    } catch (e: any) {
      alert(`Error al guardar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Save registration manual points
  const saveRegistrationPoints = async (regId: string) => {
    const ptsVal = editablePoints[regId];
    if (ptsVal === undefined || ptsVal === '') {
      alert('Ingresa una puntuación válida.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quiniela_registrations')
        .update({ points: Number(ptsVal) })
        .eq('id', regId);

      if (error) throw error;
      alert('Puntos de la quiniela guardados y actualizados.');
      await fetchData();
    } catch (e: any) {
      alert(`Error al guardar puntos: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Replace / Upload Quiniela Image
  const handleReplaceQuinielaImage = async (regId: string, file: File) => {
    if (!file) return;
    setLoading(true);
    try {
      // 1. Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `quinielas/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('quinielas')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('quinielas')
        .getPublicUrl(filePath);
      
      const newImageUrl = urlData.publicUrl;

      // 2. Update registration in database
      const { error: updateError } = await supabase
        .from('quiniela_registrations')
        .update({ quiniela_image_url: newImageUrl })
        .eq('id', regId);

      if (updateError) throw updateError;

      alert('Imagen de la quiniela actualizada con éxito.');
      await fetchData();
    } catch (e: any) {
      alert(`Error al reemplazar la imagen: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Open transcription modal
  const openTranscription = async (reg: QuinielaRegistration) => {
    setActiveTranscriptionReg(reg);
    setLoadingTranscription(true);
    try {
      const { data, error } = await supabase
        .from('forecasts')
        .select('*')
        .eq('registration_id', reg.id);
      
      if (error) throw error;
      
      const preds: { [matchId: number]: 'L' | 'E' | 'V' } = {};
      if (data) {
        data.forEach((f: any) => {
          preds[f.match_id] = f.prediction as 'L' | 'E' | 'V';
        });
      }
      setTranscriptionPredictions(preds);
    } catch (e: any) {
      alert(`Error al cargar los pronósticos del participante: ${e.message}`);
    } finally {
      setLoadingTranscription(false);
    }
  };

  // Save transcription predictions
  const saveTranscription = async () => {
    if (!activeTranscriptionReg) return;
    
    setLoading(true);
    try {
      const regMatches = matches.filter(m => m.jornada === activeTranscriptionReg.jornada).sort((a, b) => a.id - b.id);
      const totalMatches = regMatches.length;
      const predictedMatchesCount = Object.keys(transcriptionPredictions).filter(id => {
        const matchId = Number(id);
        const matchExists = regMatches.some(m => m.id === matchId);
        return matchExists && transcriptionPredictions[matchId];
      }).length;
      
      if (predictedMatchesCount < totalMatches) {
        if (!window.confirm(`Solo has llenado ${predictedMatchesCount} de ${totalMatches} partidos. ¿Deseas guardar los pronósticos de forma parcial?`)) {
          setLoading(false);
          return;
        }
      }

      const upsertData = Object.entries(transcriptionPredictions)
        .filter(([matchId]) => regMatches.some(m => m.id === Number(matchId)))
        .map(([matchId, prediction]) => ({
          registration_id: activeTranscriptionReg.id,
          match_id: Number(matchId),
          jornada: activeTranscriptionReg.jornada,
          prediction
        }));

      if (upsertData.length > 0) {
        const { error } = await supabase
          .from('forecasts')
          .upsert(upsertData, { onConflict: 'registration_id,match_id' });
          
        if (error) throw error;
      }
      
      alert('Pronósticos transcritos y guardados con éxito.');
      setActiveTranscriptionReg(null);
      await fetchData();
    } catch (e: any) {
      alert(`Error al guardar la transcripción: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Manual registration creation for knockout rounds J5+
  const handleCreateManualReg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipantId) {
      alert('Por favor, selecciona un participante.');
      return;
    }
    
    // Find the participant's Jornada 5 registration to copy receipt URL
    const j5Reg = registrations.find(
      r => r.participant_id === selectedParticipantId && r.jornada === 5 && r.payment_status === 'confirmed'
    );
    
    if (!j5Reg) {
      alert('Error: Este participante no tiene una inscripción confirmada en la Jornada 5.');
      return;
    }

    setCreatingManualReg(true);
    try {
      let quinielaImageUrl = null;

      // Upload manual quiniela image to storage if provided
      if (manualImageFile) {
        const quinielaExt = manualImageFile.name.split('.').pop();
        const quinielaName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${quinielaExt}`;
        const quinielaPath = `quinielas/${quinielaName}`;

        const { error: quinielaUploadError } = await supabase.storage
          .from('quinielas')
          .upload(quinielaPath, manualImageFile);

        if (quinielaUploadError) throw quinielaUploadError;

        const { data: quinielaUrlData } = supabase.storage
          .from('quinielas')
          .getPublicUrl(quinielaPath);
        
        quinielaImageUrl = quinielaUrlData.publicUrl;
      }

      // Create the registration directly as confirmed for selectedJornada!
      const { error: insertError } = await supabase
        .from('quiniela_registrations')
        .insert([{
          participant_id: selectedParticipantId,
          jornada: selectedJornada,
          payment_status: 'confirmed',
          payment_receipt_url: j5Reg.payment_receipt_url,
          quiniela_image_url: quinielaImageUrl
        }]);

      if (insertError) throw insertError;

      alert('Registro manual creado con éxito en la Jornada ' + selectedJornada + '. Ahora puedes transcribir sus pronósticos.');
      setSelectedParticipantId('');
      setManualImageFile(null);
      
      // Reset input element value
      const fileInput = document.getElementById('manual-quiniela-image') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      await fetchData();
    } catch (err: any) {
      alert(`Error al crear registro manual: ${err.message}`);
    } finally {
      setCreatingManualReg(false);
    }
  };

  // Clone confirmed J5 registrations to J6, J7 and J8 automatically
  const handleCloneFaseFinal = async () => {
    // 1. Find all registrations for Jornada 5 with payment_status = 'confirmed'
    const j5Regs = registrations.filter(r => r.jornada === 5 && r.payment_status === 'confirmed');
    if (j5Regs.length === 0) {
      alert('No se encontraron participantes confirmados en la Jornada 5 para habilitar.');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas habilitar automáticamente a los ${j5Regs.length} participantes de la Jornada 5 en las Jornadas 6, 7 y 8?`)) {
      return;
    }

    setCloningFaseFinal(true);
    try {
      let createdCount = 0;
      // We will clone for Jornadas 6, 7, and 8
      const targetJornadas = [6, 7, 8];

      for (const jor of targetJornadas) {
        // Find existing registrations for this jornada to avoid duplicates
        const existingJorRegs = registrations.filter(r => r.jornada === jor);
        const existingPartIds = new Set(existingJorRegs.map(r => r.participant_id));

        const toInsert = j5Regs
          .filter(r => !existingPartIds.has(r.participant_id))
          .map(r => ({
            participant_id: r.participant_id,
            jornada: jor,
            payment_status: 'confirmed',
            payment_receipt_url: r.payment_receipt_url,
            quiniela_image_url: null
          }));

        if (toInsert.length > 0) {
          const { error } = await supabase
            .from('quiniela_registrations')
            .insert(toInsert);

          if (error) throw error;
          createdCount += toInsert.length;
        }
      }

      alert(`¡Éxito! Se habilitaron automáticamente los participantes en las Jornadas 6, 7 y 8 (se crearon ${createdCount} registros).`);
      await fetchData();
    } catch (err: any) {
      alert(`Error al clonar participantes: ${err.message}`);
    } finally {
      setCloningFaseFinal(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Update Tombola bank details
      const { error: bankTomErr } = await supabase
        .from('settings')
        .upsert({ 
          key: 'bank_details_tombola',
          value: { 
            banco: tombolaBanco, 
            cuenta: tombolaCuenta, 
            clabe: tombolaClabe, 
            titular: tombolaTitular,
            zelle,
            zelle_titular: zelleTitular,
            zelle_usd: Number(zelleUsd)
          } 
        });
      if (bankTomErr) throw bankTomErr;

      // 2. Update Quiniela bank details
      const { error: bankQuinErr } = await supabase
        .from('settings')
        .upsert({ 
          key: 'bank_details_quiniela',
          value: { 
            banco: quinielaBanco, 
            cuenta: quinielaCuenta, 
            clabe: quinielaClabe, 
            titular: quinielaTitular 
          } 
        });
      if (bankQuinErr) throw bankQuinErr;

      // 3. Update prices
      const { error: priceErr } = await supabase
        .from('settings')
        .update({ value: { ticket_tombola: Number(priceTombola), jornada_quiniela: Number(priceQuiniela) } })
        .eq('key', 'prices');
      if (priceErr) throw priceErr;

      // 4. Update links
      const { error: linkErr } = await supabase
        .from('settings')
        .update({ value: { live_stream: zoomLink, rules: '' } })
        .eq('key', 'links');
      if (linkErr) throw linkErr;

      alert('Configuración actualizada con éxito.');
      await fetchData();
    } catch (e: any) {
      alert(`Error al guardar configuración: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add a new match
  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocalTeam || !newVisitorTeam || !newMatchDate) {
      alert('Completa todos los campos para agregar un partido.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('matches')
        .insert([{
          jornada: Number(newJornada),
          local_team: newLocalTeam.trim(),
          visitor_team: newVisitorTeam.trim(),
          match_date: new Date(newMatchDate).toISOString(),
          status: 'pending'
        }]);

      if (error) throw error;

      setNewLocalTeam('');
      setNewVisitorTeam('');
      setNewMatchDate('');
      alert('Partido agregado con éxito.');
      await fetchData();
    } catch (e: any) {
      alert(`Error al agregar partido: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete a match
  const handleDeleteMatch = async (matchId: number) => {
    if (!window.confirm('¿Seguro que deseas eliminar este partido?')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);
      if (error) throw error;
      await fetchData();
    } catch (e: any) {
      alert(`Error al eliminar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Reset all system data (Danger Zone)
  const handleResetSystem = async () => {
    const confirm1 = window.confirm(
      '¿Estás seguro de reiniciar TODO el sistema?\n\n' +
      'Esto borrará permanentemente todos los participantes, boletos vendidos, registros de quinielas y pronósticos, ' +
      'y restablecerá el sorteo de la tómbola y marcadores de partidos.\n\n' +
      'Esta acción no se puede deshacer.'
    );
    if (!confirm1) return;

    const confirm2 = window.prompt(
      'Para confirmar la eliminación total, por favor escribe la palabra "REINICIAR" en mayúsculas:'
    );
    if (confirm2 !== 'REINICIAR') {
      alert('Confirmación incorrecta. Operación cancelada.');
      return;
    }

    setLoading(true);
    try {
      // 1. Delete all participants (cascade deletes tickets, quiniela registrations and forecasts)
      const { error: partErr } = await supabase
        .from('participants')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (partErr) throw partErr;

      // 2. Reset matches results to pending
      const { error: matchesErr } = await supabase
        .from('matches')
        .update({ score_local: null, score_visitor: null, result: null, status: 'pending' })
        .neq('id', 0);
      if (matchesErr) throw matchesErr;

      // 3. Reset tombola status in settings
      const { error: tombolaErr } = await supabase
        .from('settings')
        .update({ value: { drawn: false, draw_date: null, drawn_by: null } })
        .eq('key', 'tombola_status');
      if (tombolaErr) throw tombolaErr;

      alert('¡Sistema reiniciado con éxito! Todos los datos de prueba han sido eliminados.');
      await fetchData();
    } catch (e: any) {
      alert(`Error al reiniciar el sistema: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Render Lock Screen helper function
  const renderLockScreen = () => (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', width: '100%' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '30px', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <ShieldAlert size={32} style={{ color: '#ef4444' }} />
        </div>
        <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Acceso Restringido</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Ingresa el PIN de administrador para acceder a esta sección de control.
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="password"
            placeholder="Escribe el PIN..."
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '18px' }}
            required
            autoFocus
          />
          <button type="submit" className="btn-primary" style={{ padding: '12px' }}>
            Autenticar Panel
          </button>
        </form>
      </div>
    </div>
  );

  if (!isAdminMode) {
    return renderLockScreen();
  }

  // Get Pending payments lists
  const pendingTickets = tickets.filter(t => t.payment_status === 'pending');
  const pendingQuinielas = registrations.filter(r => r.payment_status === 'pending');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', padding: '10px 0' }}>
      
      {/* Sub Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', gap: '10px' }}>
        <button
          onClick={() => setActiveSubTab('payments')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'payments' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeSubTab === 'payments' ? '#fff' : 'var(--text-secondary)',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          💳 Validar Pagos ({pendingTickets.length + pendingQuinielas.length})
        </button>
        <button
          onClick={() => setActiveSubTab('scores')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'scores' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeSubTab === 'scores' ? '#fff' : 'var(--text-secondary)',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          ⚽ Registrar Resultados ({matches.filter(m => m.status === 'pending').length} pendientes)
        </button>
        <button
          onClick={() => setActiveSubTab('settings')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'settings' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeSubTab === 'settings' ? '#fff' : 'var(--text-secondary)',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          ⚙ Ajustes y Partidos
        </button>
        <button
          onClick={() => setActiveSubTab('participants')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'participants' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeSubTab === 'participants' ? '#fff' : 'var(--text-secondary)',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          👥 Participantes ({dbParticipants.length})
        </button>
      </div>

      {/* SUB-VIEW: VALIDATE PAYMENTS */}
      {activeSubTab === 'payments' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
          
          {/* Phase Final Auto-Habilitar Banner */}
          <div className="glass-panel-glow" style={{ 
            gridColumn: '1 / -1', 
            padding: '20px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '15px', 
            background: 'linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(0,0,0,0.4) 100%)', 
            border: '1px solid rgba(6,182,212,0.2)',
            borderRadius: '12px'
          }}>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: 0 }}>⚡ Habilitar Fase Final Automáticamente (Jornadas 6, 7 y 8)</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Habilita a todos los participantes con pagos confirmados en los Cuartos de Final (Jornada 5) para participar en las Jornadas 6, 7 y 8 automáticamente.
              </p>
            </div>
            <button
              onClick={handleCloneFaseFinal}
              disabled={cloningFaseFinal}
              className="btn-primary"
              style={{ padding: '10px 20px', background: 'var(--primary)', color: '#fff', fontWeight: '600' }}
            >
              {cloningFaseFinal ? 'Procesando...' : 'Habilitar J6, J7 y J8'}
            </button>
          </div>

          {/* Tómbola Payments Column */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🎟 Boletos de Tómbola Pendientes</span>
              <span style={{ fontSize: '13px', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', padding: '2px 8px', borderRadius: '8px' }}>
                {pendingTickets.length} solicitudes
              </span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '500px', overflowY: 'auto' }}>
              {pendingTickets.length > 0 ? (
                pendingTickets.map((t) => (
                  <div key={t.id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: '15px' }}>{t.participants?.name}</strong>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Tel: {t.participants?.phone || '-'}
                      </div>
                      <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px' }}>
                        Boleto Individual
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {t.payment_receipt_url && (
                        <a 
                          href={t.payment_receipt_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '13px' }}
                          title="Ver Comprobante"
                        >
                          <Eye size={16} />
                        </a>
                      )}
                      <button
                        onClick={() => deleteTicketRequest(t.id)}
                        disabled={loading}
                        style={{ padding: '8px 12px', background: '#ef4444', color: '#fff', fontSize: '13px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={16} /> Rechazar
                      </button>
                      <button
                        onClick={() => approveTicket(t.id)}
                        disabled={loading}
                        className="btn-primary"
                        style={{ padding: '8px 12px', background: 'var(--primary)', color: '#fff', fontSize: '13px' }}
                      >
                        <Check size={16} /> Confirmar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>No hay boletos pendientes de validación.</p>
              )}
            </div>
          </div>

          {/* Quiniela Payments Column */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📝 Quinielas por Jornada Pendientes</span>
              <span style={{ fontSize: '13px', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', padding: '2px 8px', borderRadius: '8px' }}>
                {pendingQuinielas.length} registros
              </span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '500px', overflowY: 'auto' }}>
              {pendingQuinielas.length > 0 ? (
                pendingQuinielas.map((r) => (
                  <div key={r.id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: '15px' }}>{r.participants?.name}</strong>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Tel: {r.participants?.phone || '-'}
                      </div>
                      <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px' }}>
                        Jornada {r.jornada}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {r.payment_receipt_url && (
                        <a 
                          href={r.payment_receipt_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '13px' }}
                          title="Ver Comprobante"
                        >
                          <Eye size={16} />
                        </a>
                      )}
                      <button
                        onClick={() => deleteQuinielaRequest(r.id)}
                        disabled={loading}
                        style={{ padding: '8px 12px', background: '#ef4444', color: '#fff', fontSize: '13px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={16} /> Rechazar
                      </button>
                      <button
                        onClick={() => approveQuiniela(r.id)}
                        disabled={loading}
                        className="btn-primary"
                        style={{ padding: '8px 12px', background: 'var(--primary)', color: '#fff', fontSize: '13px' }}
                      >
                        <Check size={16} /> Confirmar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>No hay quinielas pendientes de validación.</p>
              )}
            </div>
          </div>

          {selectedJornada >= 5 && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} style={{ color: 'var(--primary)' }} />
                <span>Registro Manual (Fase Final J5+)</span>
              </h3>
              
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px', lineHeight: '1.4' }}>
                Permite registrar directamente a los participantes confirmados de los Cuartos de Final (Jornada 5) en la Jornada {selectedJornada}. El pago se marcará como confirmado automáticamente.
              </p>

              {(() => {
                // Get all participant IDs confirmed in Jornada 5
                const confirmedJ5PartIds = registrations
                  .filter(r => r.jornada === 5 && r.payment_status === 'confirmed')
                  .map(r => r.participant_id);

                // Get all participant IDs already registered in selectedJornada
                const registeredJornadaPartIds = registrations
                  .filter(r => r.jornada === selectedJornada)
                  .map(r => r.participant_id);

                // Filter available participants: confirmed in J5, but not yet registered in selectedJornada
                const availableParticipants = dbParticipants.filter(p => 
                  confirmedJ5PartIds.includes(p.id) && !registeredJornadaPartIds.includes(p.id)
                );

                return (
                  <form onSubmit={handleCreateManualReg} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Seleccionar Participante</label>
                      <select 
                        value={selectedParticipantId} 
                        onChange={(e) => setSelectedParticipantId(e.target.value)}
                        style={{ padding: '8px', width: '100%' }}
                        required
                      >
                        <option value="">-- Selecciona un participante --</option>
                        {availableParticipants.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Foto de Quiniela (Opcional)</label>
                      <input 
                        type="file" 
                        id="manual-quiniela-image"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setManualImageFile(e.target.files[0]);
                          }
                        }}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={creatingManualReg || !selectedParticipantId}
                      className="btn-primary" 
                      style={{ marginTop: '10px', padding: '10px', width: '100%', background: 'var(--primary)', color: '#fff', fontSize: '14px' }}
                    >
                      {creatingManualReg ? 'Registrando...' : `Habilitar en Jornada ${selectedJornada}`}
                    </button>
                  </form>
                );
              })()}
            </div>
          )}

        </div>
      )}

      {/* SUB-VIEW: RECORD MATCH RESULTS */}
      {activeSubTab === 'scores' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Jornada Selector */}
          <div className="glass-panel" style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Filtrar por Jornada:</span>
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

          <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚽ Capturar Marcadores de Partidos - Jornada {selectedJornada}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {(() => {
              const filteredMatches = matches.filter(m => m.jornada === selectedJornada).sort((a, b) => a.id - b.id);
              return filteredMatches.length > 0 ? (
                filteredMatches.map((match) => {
                const state = matchScores[match.id] || { local: '', visitor: '', status: 'pending' };

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
                    {/* Match Info & Jornada Tag */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minWidth: '150px' }}>
                      <span style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', fontSize: '12px', padding: '3px 8px', borderRadius: '4px', fontWeight: '700' }}>
                        Jor. {match.jornada}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {new Date(match.match_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    {/* Score Editor Form */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', flex: 1, minWidth: '250px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700', textAlign: 'right', flex: 1 }}>{match.local_team}</span>
                      
                      <input
                        type="number"
                        placeholder="0"
                        value={state.local}
                        onChange={(e) => setMatchScores(prev => ({
                          ...prev,
                          [match.id]: { ...prev[match.id], local: e.target.value }
                        }))}
                        style={{ width: '60px', padding: '8px', textAlign: 'center', fontSize: '16px', fontWeight: '700' }}
                      />

                      <span style={{ color: 'var(--text-muted)' }}>-</span>

                      <input
                        type="number"
                        placeholder="0"
                        value={state.visitor}
                        onChange={(e) => setMatchScores(prev => ({
                          ...prev,
                          [match.id]: { ...prev[match.id], visitor: e.target.value }
                        }))}
                        style={{ width: '60px', padding: '8px', textAlign: 'center', fontSize: '16px', fontWeight: '700' }}
                      />

                      <span style={{ fontSize: '15px', fontWeight: '700', flex: 1 }}>{match.visitor_team}</span>
                    </div>

                    {/* Status & Save Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <select
                        value={state.status}
                        onChange={(e) => setMatchScores(prev => ({
                          ...prev,
                          [match.id]: { ...prev[match.id], status: e.target.value as any }
                        }))}
                        style={{ width: '130px', padding: '8px' }}
                      >
                        <option value="pending">Pendiente</option>
                        <option value="finished">Finalizado</option>
                      </select>

                      <button
                        onClick={() => saveMatchScore(match.id)}
                        disabled={loading}
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                      >
                        <Save size={14} /> Guardar
                      </button>

                      <button
                        onClick={() => handleDeleteMatch(match.id)}
                        disabled={loading}
                        style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                        className="btn-secondary"
                        title="Eliminar Partido"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
            })
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>No hay partidos cargados para la Jornada {selectedJornada}.</p>
          );
        })()}
          </div>
        </div>
          
          {/* Section 2: Capture Manual Points */}
          <div className="glass-panel-glow" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🏆 Asignar Puntos de la Quiniela - Jornada {selectedJornada}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
              Revisa la imagen de la quiniela de cada participante confirmado, compara sus aciertos y asígnale su puntuación de forma manual. Sus puntos se sumarán automáticamente a la Tabla de Posiciones general.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 8px' }}>Participante</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center' }}>Jornada</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center' }}>Quiniela Rellena</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', width: '220px' }}>Puntos Obtenidos</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredRegistrations = registrations.filter(r => r.jornada === selectedJornada);
                    return filteredRegistrations.length > 0 ? (
                      filteredRegistrations.map((reg) => {
                      const ptsVal = editablePoints[reg.id] || '';
                      
                      return (
                        <tr key={reg.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '14px 8px' }}>
                            <strong style={{ color: '#fff', display: 'block' }}>{reg.participants?.name}</strong>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              Tel: {reg.participants?.phone || 'Sin número'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 8px', textAlign: 'center', fontWeight: '700' }}>
                            Jornada {reg.jornada}
                          </td>
                          <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                {reg.quiniela_image_url ? (
                                  <a 
                                    href={reg.quiniela_image_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn-secondary"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px' }}
                                  >
                                    <Eye size={14} /> Ver Imagen
                                  </a>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '4px' }}>Sin imagen</span>
                                )}
                                <button
                                  onClick={() => openTranscription(reg)}
                                  className="btn-secondary"
                                  style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    fontSize: '13px', 
                                    padding: '6px 12px',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    color: 'var(--primary)',
                                    borderColor: 'rgba(16, 185, 129, 0.2)' 
                                  }}
                                >
                                  <FileText size={14} /> Transcribir
                                </button>
                              </div>
                              
                              {/* Replace / Upload Image Button */}
                              <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
                                <button
                                  className="btn-secondary"
                                  style={{ 
                                    fontSize: '11px', 
                                    padding: '4px 8px', 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '4px',
                                    color: 'var(--text-secondary)'
                                  }}
                                >
                                  <Upload size={10} /> {reg.quiniela_image_url ? 'Sustituir Imagen' : 'Subir Imagen'}
                                </button>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleReplaceQuinielaImage(reg.id, e.target.files[0]);
                                    }
                                  }}
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
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <input
                                type="number"
                                placeholder="0"
                                value={ptsVal}
                                onChange={(e) => setEditablePoints(prev => ({
                                  ...prev,
                                  [reg.id]: e.target.value
                                }))}
                                style={{ width: '80px', padding: '8px', textAlign: 'center', fontSize: '16px', fontWeight: '700' }}
                              />
                              <button
                                onClick={() => saveRegistrationPoints(reg.id)}
                                disabled={loading}
                                className="btn-primary"
                                style={{ padding: '8px 14px', fontSize: '13px' }}
                              >
                                <Save size={14} /> Guardar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay quinielas registradas para la Jornada {selectedJornada}.
                      </td>
                    </tr>
                  );
                })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW: SETTINGS & MATCH CONFIG */}
      {activeSubTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
          
          {/* General Platform Settings Form */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} style={{ color: '#fbbf24' }} /> Ajustes de Pago y Enlaces
            </h3>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <h4 style={{ fontSize: '14px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cuentas de la Tómbola</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Banco Tómbola</label>
                <input type="text" value={tombolaBanco} onChange={(e) => setTombolaBanco(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Cuenta Tómbola</label>
                <input type="text" value={tombolaCuenta} onChange={(e) => setTombolaCuenta(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>CLABE Tómbola</label>
                <input type="text" value={tombolaClabe} onChange={(e) => setTombolaClabe(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Titular Tómbola</label>
                <input type="text" value={tombolaTitular} onChange={(e) => setTombolaTitular(e.target.value)} required />
              </div>
              
              <div style={{ borderTop: '1px dashed var(--border-glass)', paddingTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Zelle Celular</label>
                  <input type="text" value={zelle} onChange={(e) => setZelle(e.target.value)} placeholder="Ej. 3235575050" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Zelle Nombre</label>
                  <input type="text" value={zelleTitular} onChange={(e) => setZelleTitular(e.target.value)} placeholder="Ej. Fredy Reyes" />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Zelle Equivalente (USD)</label>
                <input type="number" value={zelleUsd} onChange={(e) => setZelleUsd(Number(e.target.value))} />
              </div>

              <h4 style={{ fontSize: '14px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '10px' }}>Cuenta de la Quiniela Regular</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Banco Quiniela</label>
                <input type="text" value={quinielaBanco} onChange={(e) => setQuinielaBanco(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Cuenta Quiniela</label>
                <input type="text" value={quinielaCuenta} onChange={(e) => setQuinielaCuenta(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>CLABE Quiniela</label>
                <input type="text" value={quinielaClabe} onChange={(e) => setQuinielaClabe(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Titular Quiniela</label>
                <input type="text" value={quinielaTitular} onChange={(e) => setQuinielaTitular(e.target.value)} required />
              </div>

              <h4 style={{ fontSize: '14px', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '10px' }}>Precios de Entrada</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Boleto Tómbola ($)</label>
                  <input type="number" value={priceTombola} onChange={(e) => setPriceTombola(Number(e.target.value))} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Jornada Quiniela ($)</label>
                  <input type="number" value={priceQuiniela} onChange={(e) => setPriceQuiniela(Number(e.target.value))} required />
                </div>
              </div>

              <h4 style={{ fontSize: '14px', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '10px' }}>Enlaces de Transmisión</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Enlace Live (Zoom / FB Live)</label>
                <input type="text" value={zoomLink} onChange={(e) => setZoomLink(e.target.value)} placeholder="https://..." />
              </div>

              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Guardar Configuración General
              </button>
            </form>
          </div>

          {/* Add Match Form */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} style={{ color: 'var(--primary)' }} /> Agregar Nuevo Partido
            </h3>

            <form onSubmit={handleAddMatch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Jornada</label>
                <select value={newJornada} onChange={(e) => setNewJornada(Number(e.target.value))} style={{ padding: '10px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <option key={num} value={num}>Jornada {num}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Equipo Local</label>
                <input 
                  type="text" 
                  value={newLocalTeam} 
                  onChange={(e) => setNewLocalTeam(e.target.value)} 
                  placeholder="Ej. Argentina"
                  required 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Equipo Visitante</label>
                <input 
                  type="text" 
                  value={newVisitorTeam} 
                  onChange={(e) => setNewVisitorTeam(e.target.value)} 
                  placeholder="Ej. Francia"
                  required 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Fecha y Hora del Partido</label>
                <input 
                  type="datetime-local" 
                  value={newMatchDate} 
                  onChange={(e) => setNewMatchDate(e.target.value)} 
                  required 
                  style={{ padding: '10px' }}
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Agregar Partido a la Quiniela
              </button>
            </form>
          </div>

          {/* Danger Zone: Reset System */}
          <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
              <ShieldAlert size={18} style={{ color: '#ef4444' }} /> Zona de Peligro: Reiniciar Sistema
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>
              Al hacer clic en el botón de abajo, se borrarán de forma definitiva todos los participantes, sus boletos, registros de quinielas, pronósticos, y se reiniciará el sorteo de la tómbola. Las configuraciones de precios y cuentas bancarias permanecerán intactas.
            </p>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '13px', color: '#fca5a5', marginBottom: '20px' }}>
              ⚠️ <strong>Advertencia:</strong> Esta acción no se puede deshacer. Se te solicitará escribir <strong>"REINICIAR"</strong> para confirmar la operación.
            </div>
            <button 
              type="button" 
              onClick={handleResetSystem} 
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '12px', 
                backgroundColor: '#ef4444', 
                color: '#fff', 
                fontWeight: '700', 
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
            >
              <RotateCcw size={16} /> Reiniciar Todo el Sistema
            </button>
          </div>

        </div>
      )}

      {/* SUB-VIEW: MANAGE PARTICIPANTS */}
      {activeSubTab === 'participants' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>👥 Control de Participantes</span>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Total: {dbParticipants.length} participantes registrados
            </span>
          </h3>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
            Listado completo de personas registradas en el sistema. Al eliminar un participante, se borrarán en cascada todos sus boletos de tómbola y registros de quiniela asociados.
          </p>

          {loadingParticipants ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Cargando participantes...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 8px' }}>Nombre</th>
                    <th style={{ padding: '12px 8px' }}>Teléfono</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center' }}>Boletos Tómbola</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center' }}>Registros Quiniela</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {dbParticipants.length > 0 ? (
                    dbParticipants.map((p) => {
                      const stats = getParticipantStats(p.id);
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '14px 8px', fontWeight: '600', color: '#fff' }}>
                            {p.name}
                          </td>
                          <td style={{ padding: '14px 8px', color: 'var(--text-secondary)' }}>
                            {p.phone || 'Sin teléfono'}
                          </td>
                          <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                            <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '13px' }}>
                              {stats.ticketsCount} boletos ({stats.confirmedTicketsCount} confirmados)
                            </span>
                          </td>
                          <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                            <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '13px' }}>
                              {stats.regsCount} quinielas ({stats.confirmedRegsCount} confirmadas)
                            </span>
                          </td>
                          <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleDeleteParticipant(p.id, p.name)}
                              disabled={loading}
                              style={{ 
                                padding: '6px 12px', 
                                background: 'rgba(239, 68, 68, 0.1)', 
                                color: '#ef4444', 
                                border: '1px solid rgba(239, 68, 68, 0.2)', 
                                borderRadius: '6px', 
                                cursor: 'pointer',
                                fontSize: '13px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#ef4444';
                                e.currentTarget.style.color = '#fff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                e.currentTarget.style.color = '#ef4444';
                              }}
                            >
                              <Trash2 size={14} /> Eliminar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay participantes registrados en el sistema.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Transcription Modal */}
      {activeTranscriptionReg && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel-glow" style={{
            width: '100%',
            maxWidth: '1200px',
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            borderRadius: '16px'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-glass)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '20px', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText style={{ color: 'var(--primary)' }} /> Transcribir Quiniela: {activeTranscriptionReg.participants?.name}
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Jornada {activeTranscriptionReg.jornada} • Registra las predicciones leyendo la imagen de la izquierda
                </span>
              </div>
              <button 
                onClick={() => setActiveTranscriptionReg(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content - Split Screen */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              
              {/* Left Column: Image Viewer */}
              <div style={{
                flex: 1,
                borderRight: '1px solid var(--border-glass)',
                background: '#0a0a0d',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px',
                overflow: 'auto',
                position: 'relative'
              }}>
                {activeTranscriptionReg.quiniela_image_url ? (
                  activeTranscriptionReg.quiniela_image_url.toLowerCase().endsWith('.pdf') ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <iframe 
                        src={activeTranscriptionReg.quiniela_image_url} 
                        style={{ width: '100%', height: 'calc(100% - 40px)', border: 'none', borderRadius: '8px' }}
                        title="Quiniela PDF"
                      />
                      <a 
                        href={activeTranscriptionReg.quiniela_image_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn-secondary"
                        style={{ textAlign: 'center', fontSize: '13px', padding: '8px', textDecoration: 'none' }}
                      >
                        Abrir PDF en pestaña nueva
                      </a>
                    </div>
                  ) : (
                    <img 
                      src={activeTranscriptionReg.quiniela_image_url} 
                      alt="Quiniela del participante" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%', 
                        objectFit: 'contain', 
                        borderRadius: '8px', 
                        boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                      }} 
                    />
                  )
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>No se subió imagen para esta quiniela.</p>
                )}
                <div style={{
                  position: 'absolute',
                  bottom: '15px',
                  background: 'rgba(0,0,0,0.7)',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-glass)'
                }}>
                  Tip: Abre la imagen en una pestaña nueva si necesitas más zoom.
                </div>
              </div>

              {/* Right Column: Interactive Prediction Form */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                background: '#0d0d12',
                overflow: 'hidden'
              }}>
                {loadingTranscription ? (
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
                    Cargando predicciones existentes...
                  </div>
                ) : (
                  <>
                    {/* Scrollable Match List */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {matches.filter(m => m.jornada === activeTranscriptionReg.jornada).sort((a, b) => a.id - b.id).map((match, idx) => {
                        const currentPred = transcriptionPredictions[match.id];
                        return (
                          <div 
                            key={match.id} 
                            style={{ 
                              background: 'rgba(255,255,255,0.02)', 
                              border: '1px solid var(--border-glass)', 
                              borderRadius: '10px', 
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '15px'
                            }}
                          >
                            {/* Match Teams Info */}
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '13px', color: 'var(--text-muted)', width: '24px' }}>{idx + 1}.</span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ fontSize: '14px', color: '#fff', fontWeight: '600' }}>
                                  {match.local_team} vs {match.visitor_team}
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {new Date(match.match_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} • {new Date(match.match_date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {/* [L] [E] [V] Selection Group */}
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {[
                                { key: 'L', label: 'Local' },
                                ...(match.jornada >= 4 ? [] : [{ key: 'E', label: 'Empate' }]),
                                { key: 'V', label: 'Visita' }
                              ].map(opt => {
                                const isSelected = currentPred === opt.key;
                                return (
                                  <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => setTranscriptionPredictions(prev => ({
                                      ...prev,
                                      [match.id]: opt.key as any
                                    }))}
                                    style={{
                                      padding: '8px 12px',
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      borderRadius: '6px',
                                      border: '1px solid',
                                      borderColor: isSelected ? 'var(--primary)' : 'var(--border-glass)',
                                      background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0,0,0,0.3)',
                                      color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                      minWidth: '65px'
                                    }}
                                  >
                                    {opt.key}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Form Actions Footer */}
                    <div style={{
                      padding: '16px 24px',
                      borderTop: '1px solid var(--border-glass)',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '12px',
                      background: 'rgba(0,0,0,0.2)'
                    }}>
                      <button 
                        type="button" 
                        onClick={() => setActiveTranscriptionReg(null)} 
                        className="btn-secondary"
                        style={{ padding: '10px 20px' }}
                      >
                        Cancelar
                      </button>
                      <button 
                        type="button" 
                        onClick={saveTranscription} 
                        disabled={loading}
                        className="btn-primary"
                        style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Save size={16} /> Guardar Pronósticos
                      </button>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
