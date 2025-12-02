import { Mail, MapPin, Briefcase, TrendingUp, Navigation, UserCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { brokersAPI } from '../../../services/brokers.api';
import type { Lead, RiceCode, RiceType, Broker } from '../../../types/entities';

interface LeadInfoCardsProps {
  lead: Lead;
}

export function LeadInfoCards({ lead }: LeadInfoCardsProps) {
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [broker, setBroker] = useState<Broker | null>(null);

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

  useEffect(() => {
    const fetchBroker = async () => {
      if (!lead.broker_id) {
        setBroker(null);
        return;
      }
      try {
        const data = await brokersAPI.getBrokerById(lead.broker_id);
        setBroker(data);
      } catch (error) {
        console.error('Failed to fetch broker:', error);
        setBroker(null);
      }
    };
    fetchBroker();
  }, [lead.broker_id]);

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

  const hasLocation = lead.salesman_latitude && lead.salesman_longitude;
  
  // Convert lat/lng to numbers for calculations
  const lat = hasLocation ? Number(lead.salesman_latitude) : null;
  const lng = hasLocation ? Number(lead.salesman_longitude) : null;

  return (
    <>
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
            {lead.contact_persons && lead.contact_persons.length > 0 && (
              <div>
                <span className="text-muted-foreground">Contact Persons:</span>
                <div className="mt-1 space-y-1">
                  {lead.contact_persons.map((cp, idx) => (
                    <div key={idx} className="pl-2">
                      <div className="font-medium">{cp.name}</div>
                      {cp.phones && cp.phones.length > 0 && cp.phones.filter(p => p && p.trim()).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Phones: {cp.phones.filter(p => p && p.trim()).join(', ')}
                        </div>
                      )}
                      {cp.emails && cp.emails.length > 0 && cp.emails.filter(e => e && e.trim()).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Emails: {cp.emails.filter(e => e && e.trim()).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            {/* {lead.google_location_link && (
              <div className="pt-2">
                <a
                  href={lead.google_location_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs inline-flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Open Location in Google Maps
                </a>
              </div>
            )} */}
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

      {/* Broker Information */}
      {broker && (
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <UserCircle className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Broker Information</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Business Name:</span> {broker.business_name}
            </div>
            <div>
              <span className="text-muted-foreground">Contact Person:</span> {broker.contact_person}
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span> {broker.email}
            </div>
            <div>
              <span className="text-muted-foreground">Phone:</span> {broker.phone}
            </div>
            {broker.broker_details?.commission_rate && (
              <div>
                <span className="text-muted-foreground">Commission Rate:</span> {broker.broker_details.commission_rate}%
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* Salesperson Location Map */}
    {hasLocation && lat && lng && (
      <div className="mt-4 glass rounded-xl p-4 sm:p-6 border border-border/50">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Navigation className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base sm:text-lg">Salesperson Location</h3>
        </div>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Latitude:</span>
              <code className="bg-muted/50 px-2 py-1 rounded text-xs">
                {lat.toFixed(6)}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Longitude:</span>
              <code className="bg-muted/50 px-2 py-1 rounded text-xs">
                {lng.toFixed(6)}
              </code>
            </div>
          </div>
          
          {/* OpenStreetMap Embed - No API Key Required */}
          <div className="w-full h-[250px] sm:h-[350px] md:h-[400px] rounded-lg overflow-hidden border border-border/50">
            <iframe
              title="Salesperson Location Map"
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <MapPin className="h-4 w-4" />
              Open in Google Maps
            </a>
            <a
              href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Navigation className="h-4 w-4" />
              Open in OpenStreetMap
            </a>
          </div>
        </div>
      </div>
    )}
  </>
  );
}

