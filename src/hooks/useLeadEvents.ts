import { useState, useEffect } from 'react';
import { leadsAPI } from '../services/leads.api';
import type { LeadEvent, CreateLeadEventRequest } from '../types/entities';

export function useLeadEvents(leadId: string | null) {
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    if (!leadId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await leadsAPI.getLeadEvents(leadId);
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [leadId]);

  const addEvent = async (data: CreateLeadEventRequest) => {
    try {
      const newEvent = await leadsAPI.addLeadEvent(data);
      setEvents([newEvent, ...events]);
      return newEvent;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    events,
    loading,
    error,
    addEvent,
    refetch: fetchEvents,
  };
}

