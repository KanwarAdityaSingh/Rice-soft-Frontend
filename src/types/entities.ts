// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  phone: string | null;
  user_type: 'admin' | 'vendor' | 'salesman' | 'broker' | 'custom';
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  user_type: 'admin' | 'custom';
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  full_name?: string;
  phone?: string;
  user_type?: string;
  is_active?: boolean;
}

// Vendor Types
export interface VendorAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface VendorBusinessDetails {
  pan_number?: string;
  gst_number?: string;
  registration_number?: string;
  business_type?: string;
}

export interface VendorBankDetails {
  account_holder_name?: string;
  account_number?: string;
  ifsc_code?: string;
  bank_name?: string;
  branch?: string;
}

export interface Vendor {
  id: string;
  business_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: VendorAddress;
  business_details: VendorBusinessDetails;
  bank_details?: VendorBankDetails;
  type: 'purchaser' | 'seller' | 'both';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_enquiry_date?: string;
}

export interface CreateVendorRequest {
  business_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: VendorAddress;
  business_details: VendorBusinessDetails;
  bank_details?: VendorBankDetails;
  type: 'purchaser' | 'seller' | 'both';
  is_active?: boolean;
}

export interface UpdateVendorRequest extends Partial<CreateVendorRequest> {}

// Salesman Types
export interface Salesman {
  id: string;
  name: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSalesmanRequest {
  name: string;
  phone: string;
  email: string;
  is_active?: boolean;
}

export interface UpdateSalesmanRequest extends Partial<CreateSalesmanRequest> {}

// Broker Types
export interface BrokerAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface BrokerBusinessDetails {
  pan_number?: string;
  gst_number?: string;
  registration_number?: string;
}

export interface BrokerDetails {
  commission_rate?: number;
  specialization?: string;
  experience_years?: number;
}

export interface Broker {
  id: string;
  business_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: BrokerAddress;
  business_details: BrokerBusinessDetails;
  broker_details?: BrokerDetails;
  type: 'purchase' | 'sale' | 'both';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBrokerRequest {
  business_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: BrokerAddress;
  business_details: BrokerBusinessDetails;
  broker_details?: BrokerDetails;
  type: 'purchase' | 'sale' | 'both';
  is_active?: boolean;
}

export interface UpdateBrokerRequest extends Partial<CreateBrokerRequest> {}

// GST/PAN Lookup Types
export interface GSTLookupResponse {
  success: boolean;
  data: {
    gst_data: any;
    mapped_data: {
      business_name: string;
      address: VendorAddress;
      business_details: Partial<VendorBusinessDetails>;
    };
  };
}

export interface PANLookupResponse {
  success: boolean;
  data: {
    pan_data: any;
    mapped_data: {
      business_name: string;
      address: VendorAddress;
      business_details: Partial<VendorBusinessDetails>;
    };
  };
}

// Lead Types
export interface LeadAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface LeadBusinessDetails {
  pan_number?: string;
  gst_number?: string;
  industry?: string;
  company_size?: string;
  annual_revenue?: number;
  business_keyword?: string;
}

export interface Lead {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: LeadAddress;
  business_details: LeadBusinessDetails;
  is_existing_customer: boolean;
  lead_status: 'new' | 'contacted' | 'engaged' | 'converted' | 'rejected';
  customer_status: string | null;
  assigned_to: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  notes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source?: string;
  estimated_value?: number;
  expected_close_date?: string;
  revenue?: number;
  rice_code_id?: string | null;
  rice_type?: string | null;
}

export interface CreateLeadRequest {
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string;
  address?: Partial<LeadAddress>;
  business_details?: Partial<LeadBusinessDetails>;
  is_existing_customer?: boolean;
  lead_status?: 'new' | 'contacted' | 'engaged' | 'converted' | 'rejected';
  customer_status?: string | null;
  assigned_to?: string | null;
  notes?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  source?: string;
  estimated_value?: number;
  expected_close_date?: string;
  rice_code_id?: string | null;
  rice_type?: string | null;
}

export interface UpdateLeadRequest extends Partial<CreateLeadRequest> {}

export interface LeadFilters {
  lead_status?: 'new' | 'contacted' | 'engaged' | 'converted' | 'rejected';
  assigned_to?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  is_existing_customer?: boolean;
}

// Lead Event Types
export interface LeadEvent {
  id: string;
  lead_id: string;
  event_type: 'created' | 'status_changed' | 'assigned' | 'note_added' | 'call_made' | 'email_sent' | 'meeting_scheduled' | 'meeting_completed' | 'quote_sent' | 'converted' | 'rejected' | 'follow_up' | 'priority_changed' | 'value_updated' | 'close_date_updated';
  event_description?: string;
  created_by: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface CreateLeadEventRequest {
  lead_id: string;
  event_type: string;
  event_description?: string;
  metadata?: Record<string, any>;
}

// Lead Conversion Types
export interface LeadConversion {
  id: string;
  lead_id: string;
  vendor_id: string;
  broker_id?: string | null;
  conversion_date: string;
  conversion_value?: number;
  commission_rate?: number;
  commission_amount?: number;
  created_by: string;
  notes?: string;
}

export interface ConvertLeadToVendorRequest {
  lead_id: string;
  broker_id?: string | null;
  conversion_value?: number;
  commission_rate?: number;
  notes?: string;
}

export interface ConvertLeadRequest {
  lead_id: string;
  vendor_id: string;
  broker_id?: string | null;
  conversion_value?: number;
  commission_rate?: number;
  notes?: string;
}

// Lead Analytics Types
export interface LeadAnalytics {
  analytics: Array<{
    id: string;
    company_name: string;
    contact_person: string;
    email: string;
    lead_status: string;
    priority: string;
    estimated_value?: string | null;
    created_at: string;
    assigned_salesman?: string | null;
    created_by_user?: string;
    event_count?: string;
    actual_status?: string;
  }>;
  stats: {
    total_leads: string;
    new_leads: string;
    contacted_leads: string;
    engaged_leads: string;
    converted_leads: string;
    rejected_leads: string;
    high_priority_leads: string;
    urgent_leads: string;
    avg_estimated_value: string;
    total_estimated_value: string;
  };
}

// Leaderboard Types
export interface LeaderboardEntry {
  rank: number;
  salesperson_id: string;
  salesperson_name: string;
  salesperson_email: string;
  total_leads: number;
  converted_leads: number;
  conversion_rate: number; // percentage
  total_revenue: number; // currency minor units
  avg_deal_size: number; // currency minor units
  performance_score: number; // 0-100
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total_count: number;
  filters_applied: {
    time_range?: { start_date?: string | null; end_date?: string | null };
    sort_by?: 'total_leads' | 'conversion_rate' | 'total_revenue' | 'performance_score';
    sort_order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  };
  generated_at: string;
}

export interface LeaderboardFilters {
  start_date?: string | null;
  end_date?: string | null;
  sort_by?: 'total_leads' | 'conversion_rate' | 'total_revenue' | 'performance_score';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface TeamStats {
  total_salespeople: number;
  total_leads: number;
  total_conversions: number;
  overall_conversion_rate: number;
  total_revenue: number;
  avg_deal_size: number;
  top_performer: {
    name: string;
    conversion_rate: number;
    revenue: number;
  };
}

export interface SalespersonStats {
  salesperson_id: string;
  salesperson_name: string;
  salesperson_email: string;
  total_leads: number;
  new_leads: number;
  contacted_leads: number;
  engaged_leads: number;
  converted_leads: number;
  rejected_leads: number;
  conversion_rate: number;
  total_revenue: number;
  avg_deal_size: number;
  avg_conversion_time_days: number;
  high_priority_leads: number;
  urgent_leads: number;
}

export interface SalespersonDetailStats {
  salesperson_id: string;
  salesperson_name: string;
  salesperson_email: string;
  stats: SalespersonStats;
  monthly_trends: MonthlyTrend[];
  recent_activities: RecentActivity[];
}

export interface MonthlyTrend {
  month: string; // YYYY-MM
  leads: number;
  conversions: number;
  revenue: number;
  conversion_rate: number;
}

export interface RecentActivity {
  activity_type: 'lead_created' | 'lead_converted' | 'status_changed';
  description: string;
  timestamp: string;
  lead_id: string;
  lead_company: string;
}

// Rice Code Types
export interface RiceCode {
  rice_code_id: string;
  rice_code_name: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface RiceType {
  value: string;
  label: string;
}

