import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Ticket, BankDetails, Prices, TombolaStatus } from '../types';
import { Search, QrCode, Upload, User, Phone, Ticket as TicketIcon, CheckCircle2, AlertCircle, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TombolaDashboardProps {
  bankDetails: BankDetails | null;
  prices: Prices | null;
  tombolaStatus: TombolaStatus | null;
  tickets: Ticket[];
  fetchData: () => Promise<void>;
}

export const TombolaDashboard: React.FC<TombolaDashboardProps> = ({
  bankDetails,
  prices,
  tombolaStatus,
  tickets,
  fetchData
}) => {
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ticketCount, setTicketCount] = useState(1);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const ticketPrice = prices?.ticket_tombola || 100;
  
  // Calculate Stats
  const confirmedTickets = tickets.filter(t => t.payment_status === 'confirmed');
  const totalAccumulated = confirmedTickets.length * ticketPrice;
  const totalPending = tickets.filter(t => t.payment_status === 'pending');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !receiptFile) {
      setMessage({ type: 'error', text: 'Por favor completa todos los campos requeridos y sube tu comprobante.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // 1. Upload receipt to Supabase Storage
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
      
      const receiptUrl = urlData.publicUrl;

      // 2. Check if participant already exists or create new one
      let participantId = '';
      const { data: existingParticipant, error: findError } = await supabase
        .from('participants')
        .select('id')
        .ilike('name', name.trim())
        .maybeSingle();

      if (findError) throw findError;

      if (existingParticipant) {
        participantId = existingParticipant.id;
      } else {
        const { data: newParticipant, error: insertPartError } = await supabase
          .from('participants')
          .insert([{ name: name.trim(), phone: phone.trim() || null }])
          .select()
          .single();

        if (insertPartError) throw insertPartError;
        participantId = newParticipant.id;
      }

      // 3. Create N tickets for this participant
      const ticketsToInsert = Array.from({ length: ticketCount }).map(() => ({
        participant_id: participantId,
        payment_status: 'pending',
        payment_receipt_url: receiptUrl
      }));

      const { error: insertTicketsError } = await supabase
        .from('tickets')
        .insert(ticketsToInsert);

      if (insertTicketsError) throw insertTicketsError;

      // Success actions
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      setName('');
      setPhone('');
      setTicketCount(1);
      setReceiptFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      setShowSuccessModal(true);
      await fetchData();
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: `Error al procesar el registro: ${error.message || error}` });
    } finally {
      setLoading(false);
    }
  };

  // Filter tickets for list

  // Group tickets by participant name to show in the registration overview cleanly
  const participantGroups: { [key: string]: { tickets: Ticket[]; confirmedCount: number; pendingCount: number; teams: string[] } } = {};
  
  tickets.forEach(ticket => {
    const pName = ticket.participants?.name || 'Invitado';
    if (!participantGroups[pName]) {
      participantGroups[pName] = {
        tickets: [],
        confirmedCount: 0,
        pendingCount: 0,
        teams: []
      };
    }
    participantGroups[pName].tickets.push(ticket);
    if (ticket.payment_status === 'confirmed') {
      participantGroups[pName].confirmedCount += 1;
      if (ticket.assigned_team) {
        participantGroups[pName].teams.push(ticket.assigned_team);
      }
    } else {
      participantGroups[pName].pendingCount += 1;
    }
  });

  const filteredParticipantNames = Object.keys(participantGroups).filter(pName => 
    pName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participantGroups[pName].teams.some(team => team.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', padding: '10px 0' }}>
      
      {/* 1. Stats and Countdown Row */}
      <div className="grid-cols-auto-fit">
        
        {/* Metric: Accumulated Prize */}
        <div className="glass-panel-glow" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
            <Award size={36} className="text-amber-400" style={{ color: '#fbbf24' }} />
          </div>
          <div>
            <p style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Premio Acumulado</p>
            <h3 style={{ fontSize: '32px', color: '#fbbf24', marginTop: '4px' }}>
              ${totalAccumulated.toLocaleString('es-MX')} MXN
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Basado en {confirmedTickets.length} boletos pagados
            </p>
          </div>
        </div>

        {/* Metric: Tickets Status */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <TicketIcon size={36} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <p style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Boletos Vendidos</p>
            <h3 style={{ fontSize: '32px', color: '#ffffff', marginTop: '4px' }}>
              {tickets.length} boletos
            </h3>
            <div style={{ display: 'flex', gap: '10px', fontSize: '12px', marginTop: '4px' }}>
              <span style={{ color: 'var(--primary)' }}>● {confirmedTickets.length} Confirmados</span>
              <span style={{ color: '#fbbf24' }}>● {totalPending.length} Pendientes</span>
            </div>
          </div>
        </div>

        {/* Metric: Event Info */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
            <QrCode size={36} style={{ color: '#06b6d4' }} />
          </div>
          <div>
            <p style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Sorteo En Vivo</p>
            <h3 style={{ fontSize: '18px', color: '#ffffff', marginTop: '8px', lineHeight: '1.4' }}>
              {tombolaStatus?.drawn ? '¡Sorteo Realizado!' : 'Miércoles 10 de Junio - 10:00 PM'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {tombolaStatus?.drawn ? 'Consulta tus selecciones abajo.' : 'Transmisión vía Zoom / Facebook Live'}
            </p>
          </div>
        </div>

      </div>

      {/* 2. Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
        
        {/* Left Side: Registration Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Bank Instructions Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
              <QrCode size={20} style={{ color: '#fbbf24' }} /> Datos de Pago
            </h3>
            {bankDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 -4px 0', lineHeight: '1.4' }}>
                  El pago para la tómbola se puede realizar a <strong>cualquiera</strong> de las siguientes opciones:
                </p>
                
                {/* Opción 1: BBVA */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    Opción 1: BBVA (México)
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Banco:</span>
                    <strong style={{ color: '#fff' }}>{bankDetails.banco}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Cuenta:</span>
                    <strong style={{ color: '#fff', letterSpacing: '0.5px' }}>{bankDetails.cuenta}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>CLABE:</span>
                    <strong style={{ color: '#fff', letterSpacing: '0.5px' }}>{bankDetails.clabe}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Titular:</span>
                    <strong style={{ color: '#fff' }}>{bankDetails.titular}</strong>
                  </div>
                </div>

                {/* Opción 2: Zelle */}
                {bankDetails.zelle && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                      Opción 2: Zelle (EE. UU.)
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Zelle:</span>
                      <strong style={{ color: '#fff' }}>{bankDetails.zelle}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Nombre:</span>
                      <strong style={{ color: '#fff' }}>{bankDetails.zelle_titular}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Equivalente:</span>
                      <strong style={{ color: '#fbbf24' }}>${bankDetails.zelle_usd} USD</strong>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Costo Boleto:</span>
                  <strong style={{ color: '#fbbf24' }}>${ticketPrice} MXN</strong>
                </div>
                
                <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '13px', color: '#fbbf24', lineHeight: '1.4' }}>
                    <strong>Concepto:</strong> Escribe tu <strong>Nombre Completo</strong> al realizar la transferencia electrónica para que podamos validar tu depósito.
                  </p>
                </div>
              </div>
            ) : (
              <p>Cargando datos de transferencia...</p>
            )}
            {/* Registration Form */}
          {tombolaStatus?.drawn ? (
            <div className="glass-panel-glow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px', color: '#fbbf24' }}>
                <AlertCircle size={20} /> Tómbola Cerrada
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                🔒 El sorteo de la tómbola oficial ha finalizado. Las selecciones asignadas son definitivas. Consulta tus selecciones abajo en la lista o en la sección de Sorteo en Vivo.
              </p>
            </div>
          ) : (
            <div className="glass-panel-glow" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                <TicketIcon size={20} style={{ color: 'var(--primary)' }} /> Comprar Boletos
              </h3>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={16} /> Nombre Completo del Participante
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={16} /> Teléfono (WhatsApp) - Opcional
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej. 2221234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Cantidad de Boletos (Hasta 5 por persona)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setTicketCount(num)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: ticketCount === num ? 'var(--primary)' : 'var(--border-glass)',
                          background: ticketCount === num ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0,0,0,0.3)',
                          color: ticketCount === num ? 'var(--primary)' : '#fff',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'right', marginTop: '2px' }}>
                    Total a transferir: <strong style={{ color: '#fbbf24' }}>${ticketCount * ticketPrice} MXN</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Upload size={16} /> Comprobante de Transferencia (Foto/PDF)
                  </label>
                  <div style={{
                    border: '1px dashed var(--border-glass)',
                    borderRadius: '10px',
                    padding: '15px',
                    textAlign: 'center',
                    background: 'rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    position: 'relative'
                  }}>
                    <input
                      type="file"
                      id="file-upload"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      required
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
                    <Upload size={24} style={{ color: 'var(--text-secondary)', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '14px', color: receiptFile ? 'var(--primary)' : 'var(--text-secondary)' }}>
                      {receiptFile ? `✓ ${receiptFile.name}` : 'Selecciona o arrastra el archivo'}
                    </p>
                  </div>
                </div>

                {message && (
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid',
                    borderColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                    color: message.type === 'success' ? '#10b981' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px'
                  }}>
                    {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{message.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{ width: '100%', padding: '14px' }}
                >
                  {loading ? 'Subiendo comprobante...' : `Registrar y Enviar Solicitud`}
                </button>
              </form>
            </div>
          )}

          </div>

        </div>

        {/* Right Side: Search and List of Registrations */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '15px' }}>
            <h3 style={{ fontSize: '20px' }}>Participantes Registrados</h3>
            <span style={{ fontSize: '14px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px', color: 'var(--text-secondary)' }}>
              {filteredParticipantNames.length} Personas
            </span>
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Buscar por participante o selección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '44px' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          </div>

          {/* Table / List */}
          <div style={{ overflowX: 'auto', maxHeight: '550px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 8px' }}>Nombre</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Boletos</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Estatus Pago</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Selecciones Asignadas</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipantNames.length > 0 ? (
                  filteredParticipantNames.map((pName) => {
                    const group = participantGroups[pName];
                    const hasPending = group.pendingCount > 0;
                    const hasConfirmed = group.confirmedCount > 0;
                    const totalGroupTickets = group.tickets.length;

                    return (
                      <tr key={pName} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', verticalAlign: 'middle' }}>
                        <td style={{ padding: '16px 8px' }}>
                          <strong style={{ color: '#fff', display: 'block' }}>{pName}</strong>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {group.tickets[0].participants?.phone || ''}
                          </span>
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'center', fontWeight: '600' }}>
                          {totalGroupTickets}
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                          {hasPending && !hasConfirmed ? (
                            <span className="badge badge-pending">Pendiente ({group.pendingCount})</span>
                          ) : hasPending && hasConfirmed ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                              <span className="badge badge-confirmed">Confirmado ({group.confirmedCount})</span>
                              <span className="badge badge-pending" style={{ fontSize: '10px' }}>Pendiente ({group.pendingCount})</span>
                            </div>
                          ) : (
                            <span className="badge badge-confirmed">Confirmado</span>
                          )}
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                          {tombolaStatus?.drawn ? (
                            group.teams.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                                {group.teams.map((team, idx) => {
                                  // Find if there's an emoji for the team (can look in tickets or hardcode a fallback)
                                  return (
                                    <span key={idx} style={{ 
                                      background: 'rgba(16, 185, 129, 0.1)', 
                                      color: 'var(--primary)', 
                                      padding: '3px 8px', 
                                      borderRadius: '6px', 
                                      fontSize: '13px', 
                                      border: '1px solid rgba(16, 185, 129, 0.15)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontWeight: '600'
                                    }}>
                                      {team}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Sin asignar (Pago pendiente)</span>
                            )
                          ) : (
                            <span style={{ 
                              color: '#fbbf24', 
                              background: 'rgba(251, 191, 36, 0.05)', 
                              padding: '2px 8px', 
                              borderRadius: '6px', 
                              fontSize: '12px',
                              border: '1px solid rgba(251, 191, 36, 0.1)' 
                            }}>
                              Sorteo en vivo 🎲
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No se encontraron participantes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel-glow" style={{ padding: '32px', textAlign: 'center', position: 'relative' }}>
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
            
            <h2 style={{ fontSize: '24px', color: '#fff', marginBottom: '8px' }}>¡Registro Exitoso!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '24px', lineHeight: '1.5' }}>
              Hemos recibido tu comprobante de pago y tus datos. Los administradores confirmarán tu transferencia a la brevedad y tus boletos aparecerán como <strong>Confirmados</strong>.
            </p>
            
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="btn-primary" 
              style={{ width: '100%', padding: '12px' }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
