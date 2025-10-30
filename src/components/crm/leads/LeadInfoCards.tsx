import { Mail, Phone, MapPin, Briefcase, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import type { Lead, RiceCode, RiceType } from '../../../types/entities';

interface LeadInfoCardsProps {
  lead: Lead;
}

export function LeadInfoCards({ lead }: LeadInfoCardsProps) {
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);

  useEffect(() => {
    const fetchRiceCodes = async () => {
      try {
        const data = await riceCodesAPI.getAllRiceCodes();
        setRiceCodes(data);
      } catch (error) {
        console.error('Failed to fetch rice codes:', error);
      }
    };
    fetchRiceCodes();
  }, []);

  useEffect(() => {
    const fetchRiceTypes = async () => {
      try {
        const data = await riceCodesAPI.getRiceTypes();
        setRiceTypes(data);
      } catch (error) {
        console.error('Failed to fetch rice types:', error);
      }
    };
    fetchRiceTypes();
  }, []);

  const getRiceCodeName = (riceCodeId: string | null | undefined): string | null => {
    if (!riceCodeId) return null;
    const riceCode = riceCodes.find((rc) => rc.rice_code_id === riceCodeId);
    return riceCode ? riceCode.rice_code_name : null;
  };

  const getRiceTypeLabel = (riceTypeValue: string | null | undefined): string | null => {
    if (!riceTypeValue) return null;
    const riceType = riceTypes.find((rt) => rt.value === riceTypeValue);
    return riceType ? riceType.label : null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Contact Information */}
      <div className="glass rounded-xl p-4 border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Contact Information</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Email:</span> {lead.email}
          </div>
          <div>
            <span className="text-muted-foreground">Phone:</span> {lead.phone}
          </div>
          <div>
            <span className="text-muted-foreground">Contact:</span> {lead.contact_person}
          </div>
        </div>
      </div>

      {/* Address */}
      {lead.address && (
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Address</h3>
          </div>
          <div className="space-y-1 text-sm">
            <div>{lead.address.street}</div>
            <div>
              {lead.address.city}, {lead.address.state} {lead.address.pincode}
            </div>
            <div>{lead.address.country}</div>
          </div>
        </div>
      )}

      {/* Business Details */}
      {lead.business_details && (
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Business Details</h3>
          </div>
          <div className="space-y-2 text-sm">
            {lead.business_details.pan_number && (
              <div>
                <span className="text-muted-foreground">PAN:</span> {lead.business_details.pan_number}
              </div>
            )}
            {lead.business_details.gst_number && (
              <div>
                <span className="text-muted-foreground">GST:</span> {lead.business_details.gst_number}
              </div>
            )}
            {lead.business_details.industry && (
              <div>
                <span className="text-muted-foreground">Industry:</span> {lead.business_details.industry}
              </div>
            )}
            {lead.business_details.annual_revenue && (
              <div>
                <span className="text-muted-foreground">Annual Revenue:</span> ₹{lead.business_details.annual_revenue.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lead Details */}
      <div className="glass rounded-xl p-4 border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Lead Details</h3>
        </div>
        <div className="space-y-2 text-sm">
          {lead.source && (
            <div>
              <span className="text-muted-foreground">Source:</span> {lead.source}
            </div>
          )}
          {lead.rice_code_id && (
            <div>
              <span className="text-muted-foreground">Rice Code:</span>{' '}
              {getRiceCodeName(lead.rice_code_id) || lead.rice_code_id}
            </div>
          )}
          {lead.rice_type && (
            <div>
              <span className="text-muted-foreground">Rice Type:</span>{' '}
              {getRiceTypeLabel(lead.rice_type) || lead.rice_type}
            </div>
          )}
          {lead.estimated_value && (
            <div>
              <span className="text-muted-foreground">Estimated Value:</span> ₹{lead.estimated_value.toLocaleString()}
            </div>
          )}
          {lead.expected_close_date && (
            <div>
              <span className="text-muted-foreground">Expected Close:</span> {new Date(lead.expected_close_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

