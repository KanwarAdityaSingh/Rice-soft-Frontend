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
  business_type?: string;
}

export interface VendorBankDetails {
  account_holder_name?: string;
  account_number?: string;
  ifsc_code?: string;
  bank_name?: string;
  branch?: string;
}

export interface ContactPerson {
  name: string;
  phones: string[];
  emails?: string[];
}

export interface Vendor {
  id: string;
  business_name: string;
  contact_persons: ContactPerson[];
  address: VendorAddress;
  business_details: VendorBusinessDetails;
  bank_details?: VendorBankDetails;
  type: 'purchaser' | 'seller' | 'both';
  is_active: boolean;
  google_location_link?: string | null;
  business_card_url?: string | null;
  created_at: string;
  updated_at: string;
  last_enquiry_date?: string | null;
  lead_id?: string | null;
  user_id?: string | null;
}

export interface CreateVendorRequest {
  business_name: string;
  contact_persons: ContactPerson[];
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

// Transporter Types
export interface TransporterAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface TransporterBankDetails {
  bank_name?: string;
  ifsc_code?: string;
  account_number?: string;
  branch?: string;
}

export interface Transporter {
  id: string;
  business_name: string;
  contact_persons: ContactPerson[];
  address: TransporterAddress;
  transport_type: 'registered' | 'unregistered';
  gst_number: string | null;
  pan_number: string | null;
  aadhar_number: string | null;
  vehicle_numbers: string[]; // Deprecated, kept for backward compatibility
  vehicle_ids: string[]; // NEW: Array of vehicle UUIDs
  bank_details?: TransporterBankDetails;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Vehicle Types - For vehicle management with Surepass integration
export interface Vehicle {
  id: string;
  vehicle_number: string;
  rc_number: string | null;
  owner_name: string | null;
  vehicle_class: string | null;
  fuel_type: string | null;
  maker_model: string | null;
  registration_date: string | null;
  insurance_validity: string | null;
  fitness_validity: string | null;
  permit_validity: string | null;
  challan_details: any[] | null;
  transporter_ids: string[];
  is_verified: boolean;
  verified_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateVehicleRequest {
  vehicle_number: string;
  rc_number?: string | null;
  owner_name?: string | null;
  vehicle_class?: string | null;
  fuel_type?: string | null;
  maker_model?: string | null;
  registration_date?: string | null;
  insurance_validity?: string | null;
  fitness_validity?: string | null;
  permit_validity?: string | null;
  challan_details?: any[] | null;
  transporter_ids?: string[];
  is_verified?: boolean;
  verified_at?: string | null;
  is_active?: boolean;
}

export interface UpdateVehicleRequest extends Partial<CreateVehicleRequest> {}

export interface VehicleVerificationResponse {
  vehicle_number: string;
  rc_number: string | null;
  owner_name: string | null;
  vehicle_class: string | null;
  fuel_type: string | null;
  maker_model: string | null;
  registration_date: string | null;
  insurance_validity: string | null;
  fitness_validity: string | null;
  permit_validity: string | null;
  challan_details: any[] | null;
}

export interface CreateTransporterRequest {
  business_name: string;
  contact_persons: ContactPerson[];
  address: TransporterAddress;
  transport_type: 'registered' | 'unregistered';
  gst_number?: string | null;
  pan_number?: string | null;
  aadhar_number?: string | null;
  vehicle_numbers?: string[]; // Deprecated, kept for backward compatibility
  vehicle_ids?: string[]; // NEW: Array of vehicle UUIDs to link
  bank_details?: TransporterBankDetails;
  is_active?: boolean;
}

export interface UpdateTransporterRequest extends Partial<CreateTransporterRequest> {}

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
  gst_number?: string;
  business_type: 'individual' | 'partnership' | 'company' | 'llp';
}

export interface BrokerBankDetails {
  account_holder_name?: string;
  account_number?: string;
  ifsc_code?: string;
  bank_name?: string;
  branch?: string;
}

export interface BrokerDetails {
  commission_rate?: number;
  specialization?: string;
  experience_years?: string;
}

export interface Broker {
  id: string;
  business_name?: string | null;
  contact_persons: ContactPerson[];
  address: BrokerAddress;
  business_details: BrokerBusinessDetails;
  bank_details?: BrokerBankDetails | null;
  broker_details?: BrokerDetails | null;
  type: 'purchase' | 'sale' | 'both';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBrokerRequest {
  business_name?: string;
  contact_persons: ContactPerson[];
  address: BrokerAddress;
  business_details: BrokerBusinessDetails;
  bank_details?: BrokerBankDetails;
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

// Shared Types for Discount/Commission
export type CashDiscountType = 'rupees' | 'percentage';
export type BrokerCommissionType = 'rupees' | 'percentage' | 'weight';

// Sauda Types
export interface Sauda {
  id: string;
  sauda_type: 'exgodown' | 'for';
  rice_code_id?: string | null;
  rice_type?: string | null;
  rate: number;
  broker_id?: string | null;
  broker_commission?: number | null;
  broker_commission_type?: BrokerCommissionType;
  cash_discount?: number | null;
  cash_discount_type?: CashDiscountType;
  quantity?: number | null;
  received_until_now: number;
  completion_percentage: number | null;
  estimated_delivery_time?: number | null;
  purchaser_id: string;
  cooked_rice_image_url?: string | null;
  uncooked_rice_image_url?: string | null;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  notes?: string | null;
  is_dana_required?: boolean; // Controls whether dana deduction is calculated in payment advice
  sauda_date?: string | null; // Date of the sauda in YYYY-MM-DD format
  created_at: string;
  updated_at: string;
}

export interface CreateSaudaRequest {
  sauda_type: 'exgodown' | 'for';
  rice_code_id?: string | null;
  rice_type?: string | null;
  rate: number;
  purchaser_id: string;
  broker_id?: string | null;
  broker_commission?: number | null;
  broker_commission_type?: BrokerCommissionType;
  cash_discount?: number | null;
  cash_discount_type?: CashDiscountType;
  quantity?: number | null;
  estimated_delivery_time?: number | null;
  cooked_rice_image_url?: string | null;
  uncooked_rice_image_url?: string | null;
  notes?: string | null;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  is_dana_required?: boolean; // Optional, defaults to true if not provided
  sauda_date?: string | null; // Date of the sauda in YYYY-MM-DD format
}

export interface UpdateSaudaRequest {
  sauda_type?: 'exgodown' | 'for';
  rice_code_id?: string | null;
  rice_type?: string | null;
  rate?: number;
  purchaser_id?: string;
  broker_id?: string | null;
  broker_commission?: number | null;
  broker_commission_type?: BrokerCommissionType;
  cash_discount?: number | null;
  cash_discount_type?: CashDiscountType;
  quantity?: number | null;
  estimated_delivery_time?: number | null;
  cooked_rice_image_url?: string | null;
  uncooked_rice_image_url?: string | null;
  notes?: string | null;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  is_dana_required?: boolean;
  sauda_date?: string | null; // Date of the sauda in YYYY-MM-DD format
}

export interface SaudaFilters {
  include_inactive?: boolean;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  sauda_type?: 'exgodown' | 'for';
  purchaser_id?: string;
}

// Inward Slip Pass Types
// Note: Weight fields have been moved to Kaanta entity.
// Note: vehicle_number replaced with vehicle_id (reference to Vehicle entity)
export interface OtherBill {
  name: string;
  url: string;
  uploaded_at: string;
}

export interface InwardSlipPass {
  id: string;
  sauda_ids: string[];
  slip_number: string;
  date: string;
  vehicle_id: string; // REQUIRED: UUID reference to vehicles table
  party_name: string;
  party_address?: string | null;
  party_gst_number?: string | null;
  party_pan_number?: string | null;
  transporter_id?: string | null;
  transportation_cost?: number | null;
  status: 'pending' | 'completed';
  other_bills?: OtherBill[];
  bill_pdf_url?: string | null;
  bill_number?: string | null; // Purchase bill number
  bill_date?: string | null; // Purchase bill date (YYYY-MM-DD)
  bilti_image_url?: string | null;
  bilti_pdf_url?: string | null;
  eway_bill_number?: string | null;
  eway_bill_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// Kaanta Types - Weighbridge measurement entity
// Each Kaanta represents a weighbridge measurement for a specific sauda within an ISP
// Creating a Kaanta automatically creates a Lot
export type BagType = 'jute' | 'pp';

export interface Kaanta {
  id: string;
  kaanta_id: string;
  sauda_id: string;
  inward_slip_pass_id: string;
  full_truck_weight: number;
  empty_truck_weight: number;
  kaanta_weight: number; // Auto-calculated: full_truck_weight - empty_truck_weight
  said_sent_weight?: number | null; // Weight mentioned in bill/said document (in kg)
  bag_weight: number;
  no_of_bags: number;
  bag_type: BagType;
  khaali_kaanta_parchi_url?: string | null;
  bhara_kaanta_parchi_url?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateKaantaRequest {
  sauda_id: string;
  inward_slip_pass_id: string;
  full_truck_weight: number;
  empty_truck_weight: number;
  said_sent_weight?: number | null; // Optional: Weight mentioned in bill/said document
  bag_weight: number;
  no_of_bags: number;
  bag_type: BagType;
}

export interface UpdateKaantaRequest {
  full_truck_weight?: number;
  empty_truck_weight?: number;
  said_sent_weight?: number | null;
  bag_weight?: number;
  no_of_bags?: number;
  bag_type?: BagType;
}

export interface CreateInwardSlipPassRequest {
  sauda_ids: string[];
  slip_number?: string; // Optional - auto-generated by backend
  date: string;
  vehicle_id: string; // REQUIRED: UUID reference to vehicles table
  party_name: string;
  party_address?: string | null;
  party_gst_number?: string | null;
  party_pan_number?: string | null;
  transporter_id?: string | null;
  transportation_cost?: number | null;
  notes?: string | null;
}

export interface UpdateInwardSlipPassRequest {
  sauda_ids?: string[];
  slip_number?: string;
  date?: string;
  vehicle_id?: string; // UUID reference to vehicles table
  party_name?: string;
  party_address?: string | null;
  party_gst_number?: string | null;
  party_pan_number?: string | null;
  transporter_id?: string | null;
  transportation_cost?: number | null;
  notes?: string | null;
}

// Lot Types
export interface Lot {
  id: string;
  sauda_id: string;
  lot_number: string;
  rice_code_id?: string | null;
  rice_type?: string | null;
  no_of_bags: number;
  bag_weight?: number | null;
  total_weight?: number | null;
  bill_weight: number;
  received_weight: number;
  rate: number;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLotRequest {
  sauda_id: string;
  lot_number: string;
  rice_code_id?: string | null;
  rice_type?: string | null;
  no_of_bags: number;
  bill_weight: number;
  received_weight: number;
  rate: number;
  bag_weight?: number | null;
}

export interface UpdateLotRequest {
  lot_number?: string;
  rice_code_id?: string | null;
  rice_type?: string | null;
  no_of_bags?: number;
  bill_weight?: number;
  received_weight?: number;
  rate?: number;
  bag_weight?: number | null;
}

// Purchase Summary Types - Real-time calculated summaries (replaces Purchase entity)
export interface PurchaseSummaryLotDetail {
  id: string;
  lot_number: string;
  rice_code_id?: string | null;
  rice_type?: string | null;
  no_of_bags: number;
  bill_weight: number;
  received_weight: number;
  rate: number;
  amount: number;
}

export interface PurchaseSummarySaudaDetail {
  id: string;
  sauda_type: 'exgodown' | 'for';
  rice_code_id?: string | null;
  rice_type?: string | null;
  rate: number;
  quantity?: number | null;
  received_until_now: number;
  completion_percentage: number | null;
  purchaser_id: string;
  broker_id?: string | null;
  broker_commission?: number | null;
  broker_commission_type?: BrokerCommissionType;
  cash_discount?: number | null;
  cash_discount_type?: CashDiscountType;
}

export interface PurchaseSummaryISPDetail {
  id: string;
  slip_number: string;
  date: string;
  vehicle_id: string;
  party_name: string;
  transportation_cost?: number | null;
}

// Purchase Summary for a single Sauda
export interface SaudaPurchaseSummary {
  sauda_id: string;
  
  // Aggregated counts
  total_lots: number;
  total_bags: number;
  total_weight: number;
  
  // Step-by-step calculation
  base_amount: number;
  cash_discount_amount: number;
  amount_after_discount: number;
  broker_commission_amount: number;
  amount_after_commission: number;
  transportation_cost: number;
  amount_after_transportation: number;
  igst_amount: number;
  final_total_amount: number;
  net_payable: number;
  
  // Metadata
  sauda_details: PurchaseSummarySaudaDetail;
  isp_details: PurchaseSummaryISPDetail[];
  lot_details: PurchaseSummaryLotDetail[];
}

// Purchase Summary for ISP (aggregates all saudas in that ISP)
export interface ISPPurchaseSummary {
  inward_slip_pass_id: string;
  
  // Aggregated totals across all saudas
  total_lots: number;
  total_bags: number;
  total_weight: number;
  base_amount: number;
  cash_discount_amount: number;
  amount_after_discount: number;
  broker_commission_amount: number;
  amount_after_commission: number;
  transportation_cost: number;
  amount_after_transportation: number;
  igst_amount: number;
  final_total_amount: number;
  net_payable: number;
  
  // Per-sauda breakdown
  saudas: Array<{
    sauda_id: string;
    sauda_details: PurchaseSummarySaudaDetail;
    total_lots: number;
    total_bags: number;
    total_weight: number;
    base_amount: number;
    cash_discount_amount: number;
    broker_commission_amount: number;
    final_total_amount: number;
    lot_details: PurchaseSummaryLotDetail[];
  }>;
  
  isp_details: PurchaseSummaryISPDetail;
}

// ============================================================================
// DEPRECATED: Purchase Types - Purchase entity has been removed from backend
// These types are kept for reference but should not be used in new code.
// Use PurchaseSummary APIs instead for real-time calculations.
// ============================================================================

/*
// Purchase Types
export interface Purchase {
  id: string;
  vendor_id: string;
  broker_id?: string | null;
  broker_commission?: number | null;
  broker_commission_type?: BrokerCommissionType;
  payment_advice_id?: string | null;
  cash_discount?: number | null;
  cash_discount_type?: CashDiscountType;
  transportation_cost?: number | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  rate?: number | null;
  total_weight: number;
  total_amount: number;
  igst_amount: number;
  igst_percentage: number;
  purchase_date: string;
  truck_number?: string | null;
  transport_name?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseRequest {
  vendor_id: string;
  purchase_date: string;
  sauda_ids?: string[];
  inward_slip_pass_ids?: string[];
  lot_ids?: string[];
  broker_id?: string | null;
  broker_commission?: number | null;
  broker_commission_type?: BrokerCommissionType;
  cash_discount?: number | null;
  cash_discount_type?: CashDiscountType;
  transportation_cost?: number | null;
  rate?: number | null;
  igst_percentage?: number | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  truck_number?: string | null;
  transport_name?: string | null;
  notes?: string | null;
}

export interface UpdatePurchaseRequest {
  vendor_id?: string;
  purchase_date?: string;
  broker_id?: string | null;
  broker_commission?: number | null;
  broker_commission_type?: BrokerCommissionType;
  cash_discount?: number | null;
  cash_discount_type?: CashDiscountType;
  transportation_cost?: number | null;
  rate?: number | null;
  igst_percentage?: number | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  truck_number?: string | null;
  transport_name?: string | null;
  notes?: string | null;
}

export interface LinkedEntitiesResponse {
  sauda_ids: string[];
  inward_slip_pass_ids: string[];
  lot_ids: string[];
}

export interface LinkSaudasRequest {
  sauda_ids: string[];
}

export interface LinkInwardSlipPassesRequest {
  inward_slip_pass_ids: string[];
}

export interface LinkLotsRequest {
  lot_ids: string[];
}
*/
// ============================================================================
// END DEPRECATED PURCHASE TYPES
// ============================================================================

// Payment Advice Types
// Updated: Now links to Sauda OR ISP instead of Purchase
export interface Charge {
  id: string;
  charge_name: string;
  charge_value: number;
  charge_type: 'fixed' | 'percentage';
}

export interface PaymentAdvice {
  id: string;
  // @deprecated - Use sauda_id or inward_slip_pass_id instead
  purchase_id?: string | null;
  // Link to a single sauda for payment
  sauda_id?: string | null;
  // Link to an ISP for payment (covers all saudas in that ISP)
  inward_slip_pass_id?: string | null;
  payer_id: string;
  recipient_id: string;
  amount: number;
  net_payable: number;
  date_of_payment: string;
  status: 'pending' | 'completed' | 'failed';
  transaction_id?: string | null;
  payment_slip_url?: string | null;
  bill_number?: string | null; // Purchase bill number from ISP
  bill_weight?: number | null; // Sum of said_sent_weight from kaantas
  kanta_weight?: number | null; // Sum of kaanta_weight from kaantas
  dana_deduction?: number | null; // Calculated as (said_sent_weight * 300/1000)/100
  final_weight?: number | null; // kaanta_weight - dana_deduction
  charges: Charge[];
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentAdviceRequest {
  // One of sauda_id or inward_slip_pass_id is required
  sauda_id?: string | null;
  inward_slip_pass_id?: string | null;
  payer_id: string;
  recipient_id: string;
  // Amount is optional - auto-calculated from summary if not provided
  amount?: number;
  date_of_payment: string;
  status?: 'pending' | 'completed' | 'failed';
  transaction_id?: string | null;
  bill_number?: string | null; // Purchase bill number from ISP
  charges?: Array<{
    charge_name: string;
    charge_value: number;
    charge_type: 'fixed' | 'percentage';
  }>;
}

export interface UpdatePaymentAdviceRequest {
  sauda_id?: string | null;
  inward_slip_pass_id?: string | null;
  payer_id?: string;
  recipient_id?: string;
  amount?: number;
  date_of_payment?: string;
  status?: 'pending' | 'completed' | 'failed';
  transaction_id?: string | null;
  bill_number?: string | null; // Purchase bill number from ISP
}

export interface AddChargeRequest {
  charge_name: string;
  charge_value: number;
  charge_type: 'fixed' | 'percentage';
}

export interface NetPayableResponse {
  net_payable: number;
}

// ============================================================================
// PRODUCTION & INVENTORY MANAGEMENT TYPES
// ============================================================================

// Recipe Types
export interface RecipeFormulaItem {
  lot_id: string;
  percentage: number;
}

export interface Recipe {
  id: string;
  recipe_name: string;
  formula: RecipeFormulaItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateRecipeRequest {
  recipe_name: string;
  formula: RecipeFormulaItem[];
}

export interface UpdateRecipeRequest {
  recipe_name?: string;
  formula?: RecipeFormulaItem[];
}

// Product Types
export interface Product {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  rice_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  brand?: string;
  rice_type?: string | null;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  brand?: string;
  rice_type?: string | null;
}

// Packaging Vendor Types
export interface PackagingVendor {
  id: string;
  name: string;
  contact_persons: ContactPerson[];
  address: VendorAddress;
  gst_number: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreatePackagingVendorRequest {
  name: string;
  contact_persons: ContactPerson[];
  address: VendorAddress;
  gst_number?: string | null;
}

export interface UpdatePackagingVendorRequest {
  name?: string;
  contact_persons?: ContactPerson[];
  address?: VendorAddress;
  gst_number?: string | null;
}

// Packaging Types
export type PacketType = 'PP Bag' | 'Jute Bag' | 'HDPE Bag';

export interface Packaging {
  id: string;
  product_id: string; // NEW: Packaging is now product-specific
  holding_capacity: number;
  packet_type: PacketType;
  packaging_vendor_id: string | null;
  ordered_weight: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePackagingRequest {
  product_id: string; // Required - packaging must belong to a product
  holding_capacity: number; // Must be 10, 25, or 50
  packet_type: PacketType;
  packaging_vendor_id?: string | null;
  ordered_weight?: number | null;
}

export interface UpdatePackagingRequest {
  holding_capacity?: number;
  packet_type?: PacketType;
  packaging_vendor_id?: string | null;
  ordered_weight?: number | null;
}

export interface AddPacketsInventoryRequest {
  packaging_id: string;
  available_quantity: number;
}

// Batch Types
export type BatchStatus = 'planned' | 'in_progress' | 'recipe_attached' | 'ready_to_pack' | 'packaged' | 'completed' | 'cancelled';

export interface Batch {
  id: string;
  batch_number: string;
  product_id: string | null;
  recipe_id: string;
  packaging_id: string | null;
  quantity: number;
  status: BatchStatus;
  created_at: string;
  updated_at: string;
}

export interface BatchProduct {
  id: string;
  batch_id: string;
  product_id: string;
  created_at: string;
  updated_at: string;
}

export interface BatchPackaging {
  id: string;
  batch_id: string;
  product_id: string;
  packaging_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface BatchWithDetails extends Batch {
  product?: {
    id: string;
    name: string;
  };
  recipe?: {
    id: string;
    recipe_name: string;
  };
  packaging?: {
    id: string;
    holding_capacity: number;
    packet_type: PacketType;
  };
  lot_usage?: BatchLotUsage[];
  rice_code_usage?: BatchRiceCodeUsage[];
  products?: BatchProduct[];
  packaging_list?: BatchPackaging[];
}

export interface BatchLotUsage {
  id: string;
  batch_id: string;
  lot_id: string;
  quantity_used: number;
  percentage_used: number;
  created_at: string;
  updated_at: string;
}

export interface BatchRiceCodeUsage {
  id: string;
  batch_id: string;
  rice_code_id: string;
  rice_type: string | null;
  total_quantity_used: number;
  created_at: string;
  updated_at: string;
}

// Packaging quantity entry for batch creation
export interface PackagingQuantity {
  weight: 10 | 25 | 50; // Must be exactly 10, 25, or 50
  quantity: number; // Quantity in kg for this packaging size
}

export interface CreateBatchRequest {
  recipe_id: string;
  quantity: number;
  status?: BatchStatus;
}

export interface UpdateBatchRequest {
  status?: BatchStatus;
  quantity?: number;
}

// Inventory Types
export interface FinishedGoodsInventory {
  id: string;
  product_id: string;
  batch_id: string;
  packaging_id: string;
  no_of_packets: number;
  total_weight: number;
  product?: {
    id: string;
    name: string;
  };
  batch?: {
    id: string;
    batch_number: string;
  };
  packaging?: {
    id: string;
    holding_capacity: number;
    packet_type: PacketType;
  };
}

export interface PacketsInventory {
  packaging_id: string;
  available_quantity: number;
  packaging?: {
    id: string;
    holding_capacity: number;
    packet_type: PacketType;
    packaging_vendor_id: string | null;
    ordered_weight: number | null;
  };
}

export interface LotsInventory {
  lot_id: string;
  available_quantity: number;
}

export interface BagsInventory {
  bag_type: 'jute' | 'pp';
  bag_capacity: number;
  filled_bags: number;
  empty_bags: number;
}

export interface InventorySummary {
  finished_goods: {
    total_packets: number;
    total_weight_kg: number;
    items: number;
  };
  packets: {
    total_empty_packets: number;
    types: number;
  };
  lots: {
    total_available_quantity_kg: number;
    active_lots: number;
  };
  bags: {
    total_filled_bags: number;
    total_empty_bags: number;
    types: number;
  };
}

export interface InventoryFilters {
  product_id?: string;
  batch_id?: string;
  bag_type?: 'jute' | 'pp';
  // Extended filters
  brands?: string[];
  product_ids?: string[];
  rice_types?: string[];
  holding_capacities?: number[];
  packet_types?: string[];
  vendor_ids?: string[];
  ordered_weight_range?: { min?: number; max?: number };
  batch_ids?: string[];
  min_quantity?: number;
  max_quantity?: number;
  bag_types?: ('jute' | 'pp')[];
  bag_capacities?: number[];
  search_text?: string;
}

// Hierarchical Inventory Types
export interface HierarchicalInventory {
  brand: string;
  products: {
    product_id: string;
    product_name: string;
    rice_type: string | null;
    packaging: {
      packaging_id: string;
      holding_capacity: number;
      packet_type: string;
      vendor: {
        id: string;
        name: string;
      } | null;
      finished_goods: {
        batch_id: string;
        batch_number: string;
        quantity: number;
        packets: number;
        weight: number;
      }[];
    }[];
  }[];
}

