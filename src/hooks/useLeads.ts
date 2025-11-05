import { useState, useEffect } from 'react';
import { leadsAPI } from '../services/leads.api';
import type { Lead, CreateLeadRequest, UpdateLeadRequest, LeadFilters } from '../types/entities';

export function useLeads(filters?: LeadFilters) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await leadsAPI.getAllLeads(filters);
      setLeads(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [JSON.stringify(filters)]);

  const createLead = async (data: CreateLeadRequest) => {
    try {
      const newLead = await leadsAPI.createLead(data);
      // Refetch all leads to ensure we have the latest data from the server
      await fetchLeads();
      return newLead;
    } catch (err: any) {
      throw err;
    }
  };

  const updateLead = async (id: string, data: UpdateLeadRequest) => {
    try {
      const updatedLead = await leadsAPI.updateLead(id, data);
      setLeads(leads.map((l) => (l.id === id ? updatedLead : l)));
      return updatedLead;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteLead = async (id: string) => {
    try {
      await leadsAPI.deleteLead(id);
      setLeads(leads.filter((l) => l.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return {
    leads,
    loading,
    error,
    createLead,
    updateLead,
    deleteLead,
    refetch: fetchLeads,
  };
}

