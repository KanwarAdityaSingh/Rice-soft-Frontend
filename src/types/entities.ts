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
  email?: string;
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

// Permissions
export type PermissionAction = 'create' | 'read' | 'update' | 'delete';
export type PermissionSet = Record<PermissionAction, boolean>;
export type PermissionsEntityKey = 'salesman' | 'broker' | 'vendor' | 'leads' | 'riceCode';
export type PermissionsMap = Partial<Record<PermissionsEntityKey, PermissionSet>>;

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
  google_location_link?: string | null;
  created_at: string;
  updated_at: string;
  last_enquiry_date?: string;
  lead_id?: string | null;
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
  google_location_link?: string | null;
}

export interface UpdateVendorRequest extends Partial<CreateVendorRequest> {}

// Vendor Check Types
export interface VendorCheckResponse {
  exists: boolean;
  vendor: Vendor | null;
}

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
  aadhaar_number?: string;
  registration_number?: string;
}

export interface BrokerDetails {
  commission_rate?: number;
  specialization?: string;
  experience_years?: string;
}

export interface Broker {
  id: string;
  business_name: string;
  contact_person: string; // Legacy field, kept for backward compatibility
  email: string;
  phone: string; // Legacy field, kept for backward compatibility
  contact_persons?: ContactPerson[]; // New field with phones array
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
  contact_person?: string; // Optional for backward compatibility
  contact_persons?: ContactPerson[]; // New field with phones array
  email: string;
  phone: string; // Mandatory field, separate from contact_persons
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

export interface GSTLookupResponseData {
  gst_data: {
    gstin: string;
    legalName: string;
    tradeName: string;
    registrationDate: string;
    constitutionOfBusiness: string;
    taxpayerType: string;
    gstinStatus: string;
    lastUpdateDate: string;
    principalPlaceOfBusiness: {
      buildingName?: string;
      buildingNumber?: string;
      floorNumber?: string;
      street: string;
      location: string;
      district: string;
      city: string;
      state: string;
      pincode: string;
      latitude?: string;
      longitude?: string;
    };
    additionalPlacesOfBusiness?: any[];
    filingStatus?: any[];
  };
  mapped_data: {
    business_name: string;
    legal_name?: string;
    address: VendorAddress;
    business_details: Partial<VendorBusinessDetails>;
    registration_date?: string;
    status?: string;
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

export interface PANLookupResponseData {
  pan_data: {
    pan: string;
    name: string;
    category: string;
    status: string;
    lastUpdated?: string;
  };
  mapped_data: {
    business_name: string;
    address: VendorAddress;
    business_details: Partial<VendorBusinessDetails>;
    status?: string;
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

export interface ContactPerson {
  name: string;
  phones: string[];
}

export interface Lead {
  id: string;
  company_name: string;
  contact_person: string; // Legacy field, kept for backward compatibility
  email: string;
  phone: string; // Legacy field, kept for backward compatibility
  contact_persons?: ContactPerson[]; // New field with phones array
  address: LeadAddress;
  business_details: LeadBusinessDetails;
  is_existing_customer: boolean;
  lead_status: 'new' | 'contacted' | 'engaged' | 'converted' | 'rejected';
  customer_status: string | null;
  assigned_to: string | null;
  broker_id: string | null;
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
  salesman_latitude?: number | null;
  salesman_longitude?: number | null;
  google_location_link?: string | null;
}

export interface CreateLeadRequest {
  company_name: string;
  contact_persons: ContactPerson[];
  email: string;
  phone?: string;
  address?: Partial<LeadAddress>;
  business_details?: Partial<LeadBusinessDetails>;
  is_existing_customer?: boolean;
  lead_status?: 'new' | 'contacted' | 'engaged' | 'converted' | 'rejected';
  customer_status?: string | null;
  assigned_to?: string | null;
  broker_id?: string | null;
  notes?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  source?: string;
  estimated_value?: number;
  expected_close_date?: string;
  rice_code_id?: string | null;
  rice_type?: string | null;
  salesman_latitude?: number | null;
  salesman_longitude?: number | null;
  google_location_link?: string | null;
}

export interface UpdateLeadRequest extends Partial<CreateLeadRequest> {}

export interface LeadFilters {
  lead_status?: 'new' | 'contacted' | 'engaged' | 'converted' | 'rejected';
  assigned_to?: string;
  broker_id?: string;
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

// Pincode Lookup Types
export interface PostOffice {
  Name: string;
  Description?: string | null;
  BranchType: string;
  DeliveryStatus: string;
  Circle: string;
  District: string;
  Division: string;
  Region: string;
  Block: string;
  State: string;
  Country: string;
  Pincode: string;
}

export interface PincodeLookupData {
  pincode: string;
  status: string;
  message: string;
  postOffices: PostOffice[];
}

export interface PincodeLookupResponse {
  success: boolean;
  message: string;
  data: PincodeLookupData;
  timestamp?: string;
}

// Purchase Flow Types

// Transporter Types
export interface Transporter {
  id: string;
  business_name: string;
  contact_person: string;
  phone: string;
  email?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  gst_number?: string;
  pan_number?: string;
  vehicle_numbers?: string[];
  bank_details?: {
    bank_name?: string;
    ifsc_code?: string;
    account_number?: string;
    branch?: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTransporterRequest {
  business_name: string;
  contact_person: string;
  phone: string;
  email?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  gst_number?: string;
  pan_number?: string;
  vehicle_numbers?: string[];
  bank_details?: {
    bank_name?: string;
    ifsc_code?: string;
    account_number?: string;
    branch?: string;
  };
  is_active?: boolean;
}

export interface UpdateTransporterRequest extends Partial<CreateTransporterRequest> {}

// Sauda Types
export type SaudaType = 'xgodown' | 'for';
export type SaudaStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface Sauda {
  id: string;
  sauda_type: SaudaType;
  rice_quality: string;
  rice_code_id?: string | null;
  rate: number;
  broker_id?: string | null;
  broker_commission?: number;
  quantity: number;
  transporter_id?: string | null;
  transportation_cost?: number;
  cash_discount?: number;
  estimated_delivery_time: number;
  purchaser_id: string;
  cooked_rice_image_url?: string | null;
  uncooked_rice_image_url?: string | null;
  status: SaudaStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateSaudaRequest {
  sauda_type: SaudaType;
  rice_quality: string;
  rice_code_id?: string | null;
  rate: number;
  broker_id?: string | null;
  broker_commission?: number;
  quantity: number;
  transporter_id?: string | null;
  transportation_cost?: number;
  cash_discount?: number;
  estimated_delivery_time: number;
  purchaser_id: string;
  cooked_rice_image_url?: string | null;
  uncooked_rice_image_url?: string | null;
  status?: SaudaStatus;
}

export interface UpdateSaudaRequest extends Partial<CreateSaudaRequest> {}

// Inward Slip Pass Types
export type InwardSlipPassStatus = 'pending' | 'completed';

export interface InwardSlipLot {
  id: string;
  lot_number: string;
  item_name: string;
  no_of_bags: number;
  bag_weight: number;
  bill_weight: number;
  received_weight: number;
  bardana: string;
  rate: number;
  total_weight: number; // Auto-calculated: no_of_bags × bag_weight
  amount: number; // Auto-calculated: received_weight × rate
  created_at: string;
  updated_at: string;
}

export interface CreateInwardSlipLotRequest {
  lot_number: string;
  item_name: string;
  no_of_bags: number;
  bag_weight: number;
  bill_weight: number;
  received_weight: number;
  bardana: string;
  rate: number;
}

export interface UpdateInwardSlipLotRequest {
  lot_number?: string;
  item_name?: string;
  no_of_bags?: number;
  bag_weight?: number;
  bill_weight?: number;
  received_weight?: number;
  bardana?: string;
  rate?: number;
}

export interface InwardSlipPass {
  id: string;
  sauda_id: string;
  slip_number: string;
  date: string;
  vehicle_number: string;
  party_name: string;
  party_address: string;
  party_gst_number?: string | null;
  status: InwardSlipPassStatus;
  inward_slip_bill_image_url?: string | null;
  lots: InwardSlipLot[];
  created_at: string;
  updated_at: string;
}

export interface CreateInwardSlipPassRequest {
  sauda_id: string;
  slip_number: string;
  date: string;
  vehicle_number: string;
  party_name: string;
  party_address: string;
  party_gst_number?: string | null;
  status?: InwardSlipPassStatus;
  inward_slip_bill_image_url?: string | null;
  lots: CreateInwardSlipLotRequest[];
}

export interface UpdateInwardSlipPassRequest extends Partial<Omit<CreateInwardSlipPassRequest, 'lots'>> {
  lots?: CreateInwardSlipLotRequest[];
}

// Purchase Types
export type FreightStatus = 'PAID' | 'UNPAID' | 'PARTIAL';

export interface Purchase {
  id: string;
  vendor_id: string;
  sauda_id: string;
  broker_id?: string | null;
  broker_commission?: number;
  invoice_number?: string | null;
  invoice_date?: string | null;
  rate: number;
  total_weight?: number | null;
  total_amount?: number | null;
  igst_amount?: number | null;
  igst_percentage?: number | null;
  freight_status?: FreightStatus | null;
  truck_number?: string | null;
  transport_name?: string | null;
  goods_dispatched_from?: string | null;
  goods_dispatched_to?: string | null;
  purchase_date: string;
  expected_quantity?: number | null;
  notes?: string | null;
  transportation_bill_image_url?: string | null;
  purchase_bill_image_url?: string | null;
  bilti_image_url?: string | null;
  eway_bill_image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseRequest {
  vendor_id: string;
  sauda_id: string;
  broker_id?: string | null;
  broker_commission?: number;
  invoice_number?: string | null;
  invoice_date?: string | null;
  rate?: number;
  total_weight?: number | null;
  total_amount?: number | null;
  igst_amount?: number | null;
  igst_percentage?: number | null;
  freight_status?: FreightStatus | null;
  truck_number?: string | null;
  transport_name?: string | null;
  goods_dispatched_from?: string | null;
  goods_dispatched_to?: string | null;
  purchase_date: string;
  expected_quantity?: number | null;
  notes?: string | null;
}

export interface UpdatePurchaseRequest extends Partial<CreatePurchaseRequest> {}

// Payment Advice Types
export type PaymentAdviceStatus = 'pending' | 'completed' | 'failed';

export interface PaymentAdviceCharge {
  id: string;
  charge_name: string;
  charge_value: number;
  charge_type: 'percentage' | 'fixed';
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentAdviceChargeRequest {
  charge_name: string;
  charge_value: number;
  charge_type: 'percentage' | 'fixed';
}

export interface PaymentAdvice {
  id: string;
  purchase_id?: string | null;
  payer_id: string;
  recipient_id: string;
  sr_number?: string | null;
  party_name?: string | null;
  party_address?: string | null;
  broker_name?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  truck_number?: string | null;
  item?: string | null;
  total_bags?: number | null;
  due_date?: string | null;
  bill_weight?: number | null;
  kanta_weight?: number | null;
  final_weight?: number | null;
  rate?: number | null;
  amount: number;
  net_payable: number; // Auto-calculated: amount - SUM(charges.charge_value)
  date_of_payment: string;
  status: PaymentAdviceStatus;
  transaction_id?: string | null;
  payment_slip_image_url?: string | null;
  notes?: string | null;
  charges: PaymentAdviceCharge[];
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentAdviceRequest {
  purchase_id?: string | null;
  payer_id: string;
  recipient_id: string;
  sr_number?: string | null;
  party_name?: string | null;
  party_address?: string | null;
  broker_name?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  truck_number?: string | null;
  item?: string | null;
  total_bags?: number | null;
  due_date?: string | null;
  bill_weight?: number | null;
  kanta_weight?: number | null;
  final_weight?: number | null;
  rate?: number | null;
  amount: number;
  date_of_payment: string;
  status?: PaymentAdviceStatus;
  transaction_id?: string | null;
  payment_slip_image_url?: string | null;
  notes?: string | null;
  charges?: CreatePaymentAdviceChargeRequest[];
}

export interface UpdatePaymentAdviceRequest extends Partial<CreatePaymentAdviceRequest> {}

