import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Loader, Globe, MessageCircle, Instagram, Facebook, Search } from 'lucide-react';
import api from '../api/client';
import ScoreBadge from '../components/ScoreBadge';
import PipelineAnalyticsRail from '../components/PipelineAnalyticsRail';
import { LEAD_STATUSES, LEAD_STATUS_STYLES } from '../utils/constants';
import { generateWhatsAppLink } from '../utils/helpers';

export default function OutreachKanbanPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/leads', { params: { limit: 1000 } });
        const data = res.data?.data || res.data || [];
        setLeads(data);
      } catch (err) {
        setError('Erro ao carregar leads.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const leadId = draggableId;
    const newStatus = destination.droppableId;

    // Find the lead to get its old status
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const oldStatus = lead.status;

    // Optimistic update
    const updatedLeads = leads.map((l) =>
      l.id === leadId ? { ...l, status: newStatus } : l
    );
    setLeads(updatedLeads);

    // Make API call
    try {
      await api.patch(`/leads/${leadId}/status`, {
        status: newStatus,
        notes: `Status changed from ${oldStatus} to ${newStatus}`,
      });
    } catch (err) {
      // Revert on failure
      const revertedLeads = leads.map((l) =>
        l.id === leadId ? { ...l, status: oldStatus } : l
      );
      setLeads(revertedLeads);
      alert('Erro ao atualizar status. Tente novamente.');
      console.error(err);
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (l.name || '').toLowerCase().includes(q) || (l.address || '').toLowerCase().includes(q);
  });

  const totalDeals = leads.length;
  const convertedCount = leads.filter((l) => l.status === 'converted').length;
  const conversionRate = totalDeals > 0 ? Math.round((convertedCount / totalDeals) * 100) : 0;
  const hotLeadsCount = leads.filter((l) => {
    const scoreData = Array.isArray(l.lead_scores) ? l.lead_scores[0] : l.lead_scores;
    return scoreData?.temperature === 'hot';
  }).length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader className="h-5 w-5 animate-spin text-accent-purple" />
          Carregando leads...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-6 text-center">
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      </div>
    );
  }


  return (
    <div className="w-full px-4 py-6 sm:py-8">
      {/* Hero panel with title, search, metrics and charts */}
      <div className="mb-6 rounded-lg border border-surface-border bg-surface p-4 sm:p-6">
        {/* Title row */}
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Customer Pipelines</h1>
            <p className="mt-1 text-sm text-gray-400">
              {leads.length} leads • Arraste entre colunas para atualizar status
            </p>
          </div>

          <div className="relative w-full sm:w-72 lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou endereço..."
              className="w-full rounded-lg border border-surface-border bg-surface-alt py-2 pl-9 pr-3 text-sm text-gray-200 placeholder-gray-400 outline-none transition-colors focus:border-accent-purple/60 focus:ring-1 focus:ring-accent-purple/40"
            />
          </div>
        </div>

        {/* Metrics + charts band */}
        <div className="flex flex-col gap-4 border-t border-surface-border pt-5 lg:flex-row lg:items-stretch">
          {/* 3 metric mini-cards */}
          <div className="grid grid-cols-3 gap-3 lg:w-64 lg:shrink-0">
            <div className="flex flex-col justify-center rounded-lg border border-surface-border bg-surface-alt px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Total Deals</p>
              <p className="mt-0.5 text-lg font-semibold text-white">{totalDeals}</p>
            </div>
            <div className="flex flex-col justify-center rounded-lg border border-surface-border bg-surface-alt px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Conversão</p>
              <p className="mt-0.5 text-lg font-semibold text-accent-green">{conversionRate}%</p>
            </div>
            <div className="flex flex-col justify-center rounded-lg border border-surface-border bg-surface-alt px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Leads Quentes</p>
              <p className="mt-0.5 text-lg font-semibold text-accent-orange">{hotLeadsCount}</p>
            </div>
          </div>

          {/* Charts */}
          <PipelineAnalyticsRail leads={leads} />
        </div>
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 pb-4" style={{ minWidth: 'min-content' }}>
              {LEAD_STATUSES.map((statusObj) => {
                const statusLeads = filteredLeads.filter((l) => l.status === statusObj.value);
                const colors = LEAD_STATUS_STYLES[statusObj.value] || LEAD_STATUS_STYLES.new;

                return (
                  <Droppable key={statusObj.value} droppableId={statusObj.value}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex min-w-[300px] max-w-[300px] flex-col rounded-lg border bg-surface transition-shadow ${
                          snapshot.isDraggingOver ? `border-transparent ring-2 ${colors.ring}/60` : 'border-surface-border'
                        }`}
                      >
                        <div className={`h-1 w-full rounded-t-lg ${colors.bar}`} />
                        <div className="flex items-center justify-between px-4 pt-3 pb-2">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${colors.bar}`} />
                            <h3 className={`text-sm font-semibold ${colors.text}`}>{statusObj.label}</h3>
                          </div>
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-gray-400">
                            {statusLeads.length}
                          </span>
                        </div>
                        <div className="flex-1 space-y-3 px-3 pb-3">
                          {statusLeads.map((lead, index) => {
                            const igData = Array.isArray(lead.instagram_data)
                              ? lead.instagram_data[0]
                              : lead.instagram_data;
                            const scoreData = Array.isArray(lead.lead_scores)
                              ? lead.lead_scores[0]
                              : lead.lead_scores;

                            return (
                              <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`group rounded-lg border border-surface-border bg-surface-alt p-3 shadow-sm transition-all hover:border-white/10 ${
                                      snapshot.isDragging ? `scale-[1.02] shadow-xl ring-2 ${colors.ring}/70` : ''
                                    }`}
                                  >
                                    <div className="mb-3 flex items-start gap-3">
                                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${colors.bar}`}>
                                        {(lead.name || '?').charAt(0).toUpperCase()}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-white">{lead.name}</p>
                                        {lead.address && <p className="truncate text-xs text-gray-500">{lead.address}</p>}
                                      </div>
                                    </div>

                                    <div className="mb-3 flex items-center gap-1.5 border-t border-white/5 pt-2.5">
                                      <div
                                        className={`flex h-6 w-6 items-center justify-center rounded-md ${
                                          lead.website
                                            ? 'bg-accent-cyan/15 text-accent-cyan ring-1 ring-accent-cyan/30'
                                            : 'bg-white/5 text-gray-500'
                                        }`}
                                        title={lead.website ? 'Com site' : 'Sem site'}
                                      >
                                        <Globe className="h-3.5 w-3.5" />
                                      </div>
                                      <div
                                        className={`flex h-6 w-6 items-center justify-center rounded-md ${
                                          lead.phone
                                            ? 'bg-accent-green/15 text-accent-green ring-1 ring-accent-green/30'
                                            : 'bg-white/5 text-gray-500'
                                        }`}
                                        title={lead.phone ? 'Com WhatsApp' : 'Sem WhatsApp'}
                                      >
                                        <MessageCircle className="h-3.5 w-3.5" />
                                      </div>
                                      <div
                                        className={`flex h-6 w-6 items-center justify-center rounded-md ${
                                          igData?.handle
                                            ? 'bg-pink-400/15 text-pink-400 ring-1 ring-pink-400/30'
                                            : 'bg-white/5 text-gray-500'
                                        }`}
                                        title={igData?.handle ? `@${igData.handle}` : 'Sem Instagram'}
                                      >
                                        <Instagram className="h-3.5 w-3.5" />
                                      </div>
                                      <div
                                        className={`flex h-6 w-6 items-center justify-center rounded-md ${
                                          lead.facebook_url
                                            ? 'bg-blue-400/15 text-blue-400 ring-1 ring-blue-400/30'
                                            : 'bg-white/5 text-gray-500'
                                        }`}
                                        title={lead.facebook_url ? 'Com Facebook' : 'Sem Facebook'}
                                      >
                                        <Facebook className="h-3.5 w-3.5" />
                                      </div>
                                    </div>

                                    <div className="mb-3">
                                      <ScoreBadge
                                        temperature={scoreData?.temperature}
                                        score={scoreData?.total_score}
                                      />
                                    </div>

                                    {lead.phone && (
                                      <a
                                        href={generateWhatsAppLink(lead.phone, `Olá ${lead.name}, tudo bem?`)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full rounded-md bg-accent-green/90 px-2 py-1.5 text-center text-xs font-medium text-white transition-colors hover:bg-accent-green"
                                      >
                                        Abrir WhatsApp
                                      </a>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
      </div>
    </div>
  );
}
