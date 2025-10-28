import { Mail, Phone, MapPin, Briefcase, TrendingUp } from 'lucide-react';
import type { Lead } from '../../../types/entities';

interface LeadInfoCardsProps {
  lead: Lead;
}

export function LeadInfoCards({ lead }: LeadInfoCardsProps) {
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

