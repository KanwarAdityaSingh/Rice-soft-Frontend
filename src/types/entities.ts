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

export interface SurepassApiResponse<TData = unknown> {
  data?: TData;
  status_code: number;
  success: boolean;
  message: string | null;
  message_code?: string;
}

export interface SurepassVerificationSnapshot {
  provider: 'surepass';
  verified_at: string;
  raw: SurepassApiResponse;
  mapped?: unknown;
}

export type PersistableEntityType =
  | 'vendor'
  | 'sales_party'
  | 'broker'
  | 'transporter'
  | 'driver'
  | 'vehicle';

export interface KycPersistContext {
  entity_type: PersistableEntityType;
  entity_id: string;
}

/** Stored on vendors, brokers, transporters (JSONB column). */
export interface EntityKycVerificationDetails {
  pan?: SurepassVerificationSnapshot;
  pan_comprehensive?: SurepassVerificationSnapshot;
  gstin_by_pan?: SurepassVerificationSnapshot;
  pan_contact?: SurepassVerificationSnapshot;
  gst?: SurepassVerificationSnapshot;
  gst_advanced?: SurepassVerificationSnapshot;
  aadhaar?: SurepassVerificationSnapshot;
  bank?: SurepassVerificationSnapshot;
  driving_license?: SurepassVerificationSnapshot;
  emails?: Record<string, SurepassVerificationSnapshot>;
}

/** Stored on vehicles (JSONB column). */
export interface VehicleVerificationDetails {
  rc?: SurepassVerificationSnapshot;
  rc_full?: SurepassVerificationSnapshot;
  rc_challan?: SurepassVerificationSnapshot;
}

export interface Vendor {
  id: string;
  business_name: string;
  contact_persons: ContactPerson[];
  address: VendorAddress;
  business_details: VendorBusinessDetails;
  bank_details?: VendorBankDetails;
  registration_type: 'registered' | 'unregistered';
  aadhar_number: string | null;
  type: 'purchaser' | 'seller' | 'both';
  is_active: boolean;
  google_location_link?: string | null;
  business_card_url?: string | null;
  created_at: string;
  updated_at: string;
  last_enquiry_date?: string | null;
  lead_id?: string | null;
  user_id?: string | null;
  /** Identity KYC verified (GST/PAN or Aadhaar) — separate from bank verification */
  is_verified: boolean;
  verified_at: string | null;
  /** Set when bank account was verified (e.g. Surepass) */
  bank_details_verified_at?: string | null;
  bank_details_verified_by?: string | null;
  /** Persisted when bank verification failed (lenient create/update); cleared on successful verification or bank update */
  bank_verification_error?: string | null;
  /** Full Surepass snapshots keyed by verification type */
  kyc_verification_details?: EntityKycVerificationDetails;
}

export interface CreateVendorRequest {
  business_name: string;
  contact_persons: ContactPerson[];
  address: VendorAddress;
  business_details: VendorBusinessDetails;
  bank_details?: VendorBankDetails;
  registration_type: 'registered' | 'unregistered';
  aadhar_number?: string | null;
  /** When true, backend compares bank_details to kyc_verification_details.bank on create (no Surepass call). */
  verify_bank?: boolean;
  /** Surepass snapshots collected during the form session — merged into JSONB on save. */
  kyc_verification_details?: EntityKycVerificationDetails;
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

// Sales Party Types (Vendor shape without type; used for customers in sales)
export type SalesParty = Omit<Vendor, 'type'>;
export type CreateSalesPartyRequest = Omit<CreateVendorRequest, 'type'>;
export type UpdateSalesPartyRequest = Omit<UpdateVendorRequest, 'type'>;

/** Additional locations for a purchase party; primary address stays on `Vendor.address`. */
export interface VendorSite {
  id: string;
  vendor_id: string;
  name?: string | null;
  address: VendorAddress;
  google_location_link?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateVendorSiteRequest {
  vendor_id: string;
  name?: string | null;
  address: VendorAddress;
  google_location_link?: string | null;
  is_active?: boolean;
}

export type UpdateVendorSiteRequest = Partial<Omit<CreateVendorSiteRequest, 'vendor_id'>>;

/** Additional locations for a sales party; primary address stays on `SalesParty.address`. */
export interface SalesPartySite {
  id: string;
  sales_party_id: string;
  name?: string | null;
  address: VendorAddress;
  google_location_link?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSalesPartySiteRequest {
  sales_party_id: string;
  name?: string | null;
  address: VendorAddress;
  google_location_link?: string | null;
  is_active?: boolean;
}

export type UpdateSalesPartySiteRequest = Partial<Omit<CreateSalesPartySiteRequest, 'sales_party_id'>>;

// Transporter Types
export interface TransporterAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface TransporterBankDetails {
  account_holder_name?: string;
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
  /** Set when bank account was verified (e.g. Surepass) */
  bank_details_verified_at?: string | null;
  bank_details_verified_by?: string | null;
  /** Persisted when bank verification failed (lenient create/update) */
  bank_verification_error?: string | null;
  is_active: boolean;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  kyc_verification_details?: EntityKycVerificationDetails;
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
  challan_details: RcChallanItem[] | null;
  transporter_ids: string[];
  is_verified: boolean;
  verified_at: string | null;
  verification_details?: VehicleVerificationDetails | null;
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
  challan_details?: RcChallanItem[] | null;
  transporter_ids?: string[];
  is_verified?: boolean;
  verified_at?: string | null;
  is_active?: boolean;
  verification_details?: VehicleVerificationDetails;
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
  challan_details: RcChallanItem[] | null;
  surepass_response?: SurepassApiResponse;
}

export interface RcChallanDetailsRequest {
  rc_number: string;
  chassis_number: string;
  engine_number: string;
  state_only?: boolean;
  state_portal?: string[];
}

export interface RcChallanItem {
  number: number;
  challan_number: string;
  offense_details: string;
  challan_place: string | null;
  challan_date: string;
  state: string;
  rto: string | null;
  upstream_code: string;
  accused_name: string;
  amount: number;
  challan_status: string | null;
  court_challan: boolean | null;
}

export interface RcChallanDetailsResult {
  client_id: string;
  challan_details: {
    challans: RcChallanItem[];
    blacklist: unknown[];
  };
  surepass_response?: SurepassApiResponse;
}

/** Surepass RC Full raw payload (via /kyc/rc/full) */
export interface RcFullData {
  client_id?: string;
  rc_number: string;
  registration_date?: string;
  owner_name?: string;
  father_name?: string;
  present_address?: string;
  permanent_address?: string;
  mobile_number?: string;
  vehicle_category?: string;
  vehicle_category_description?: string;
  vehicle_chasi_number?: string;
  vehicle_engine_number?: string;
  maker_description?: string;
  maker_model?: string;
  body_type?: string;
  fuel_type?: string;
  color?: string;
  fit_up_to?: string;
  insurance_upto?: string;
  permit_valid_upto?: string;
  challan_details?: unknown;
  [key: string]: unknown;
}

/** Response from POST /kyc/rc/full — mapped RC fields + raw Surepass envelope */
export interface RcFullLookupResult {
  data?: RcFullData;
  surepass_response?: SurepassApiResponse;
  /** Some backends flatten mapped fields at the top level */
  rc_number?: string;
  owner_name?: string;
  vehicle_class?: string | null;
  fuel_type?: string | null;
  maker_model?: string | null;
  registration_date?: string | null;
  insurance_validity?: string | null;
  fitness_validity?: string | null;
  permit_validity?: string | null;
}

export interface SurepassVehicleVerificationEnvelope {
  mapped: VehicleVerificationResponse;
  raw?: {
    data?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

/** Driver (driving licence) master — DL profile fields filled from Surepass on verify */
export interface Driver {
  id: string;
  license_number: string;
  phone: string;
  name: string | null;
  address?: string | null;
  pincode?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  license_expires_at?: string | null;
  /** Alias for license_expires_at in API responses */
  doe?: string | null;
  transport_license_expires_at?: string | null;
  /** Alias for transport_license_expires_at in API responses */
  transport_doe?: string | null;
  father_or_husband_name?: string | null;
  state?: string | null;
  city_name?: string | null;
  profile_image?: string | null;
  vehicle_classes?: string[] | null;
  is_verified: boolean;
  verified_at: string | null;
  verification_details: SurepassVerificationSnapshot | Record<string, unknown> | null;
  /** Set when Surepass DL verify could not resolve transport licence DOE. */
  transport_doe_not_found?: boolean;
  /** Lenient verify warning (e.g. transport DOE missing) from create/update envelope. */
  verification_error?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDriverRequest {
  license_number: string;
  phone: string;
  name?: string | null;
  address?: string | null;
  pincode?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  license_expires_at?: string | null;
  transport_license_expires_at?: string | null;
  father_or_husband_name?: string | null;
  state?: string | null;
  city_name?: string | null;
  profile_image?: string | null;
  vehicle_classes?: string[] | null;
  is_verified?: boolean;
  verified_at?: string | null;
  verification_details?: SurepassVerificationSnapshot | Record<string, unknown> | null;
  is_active?: boolean;
}

export interface UpdateDriverRequest extends Partial<CreateDriverRequest> {}

/** Surepass DL verify — mapped fields from gateway; `driver` populated when record exists or after persist */
export interface DriverVerificationResponse {
  license_number: string;
  /** Mapped from Surepass `name` */
  full_name: string | null;
  name?: string | null;
  date_of_birth: string | null;
  date_of_expiry: string | null;
  /** Alias for date_of_expiry / license_expires_at */
  doe?: string | null;
  transport_date_of_expiry?: string | null;
  transport_doe?: string | null;
  /** Gateway may coerce from Surepass JSON */
  age: number | string | null;
  address: string | null;
  pincode?: string | null;
  state?: string | null;
  city_name?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  vehicle_classes?: string[] | null;
  father_or_husband_name?: string | null;
  profile_image?: string | null;
  surepass_response?: SurepassApiResponse;
  /** Updated driver when verify persists to an existing record */
  driver?: Driver | null;
}

/** Surepass licence-v2 OCR — extract-only (does not set is_verified). */
export interface DrivingLicenseOcrResponse {
  client_id?: string;
  license_number?: string | null;
  name?: string | null;
  full_name?: string | null;
  dob?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  pincode?: string | null;
  state?: string | null;
  surepass_response?: SurepassApiResponse | Record<string, unknown>;
  /** Populated when POST /drivers/ocr includes driver_id */
  driver?: Driver | null;
}

export interface DrivingLicenseOcrUploadOptions {
  back?: File;
  usePdf?: boolean;
  driverId?: string;
}

export interface DocumentOcrUploadOptions {
  usePdf?: boolean;
}

/** Surepass GST OCR — extract-only. */
export interface GstOcrResponse {
  client_id?: string;
  gstin?: string | null;
  gst_number?: string | null;
  confidence?: number | null;
  document_type?: string | null;
  standard_document?: boolean | null;
  business_name?: string | null;
  legal_name?: string | null;
  trade_name?: string | null;
  pan_number?: string | null;
  address?: string | null;
  surepass_response?: SurepassApiResponse | Record<string, unknown>;
}

/** Surepass PAN OCR — extract-only. */
export interface PanOcrResponse {
  client_id?: string;
  pan_number?: string | null;
  full_name?: string | null;
  name?: string | null;
  father_name?: string | null;
  dob?: string | null;
  date_of_birth?: string | null;
  confidences?: Record<string, number>;
  surepass_response?: SurepassApiResponse | Record<string, unknown>;
}

/** Surepass Aadhaar OCR — extract-only. */
export interface AadhaarOcrResponse {
  client_id?: string;
  aadhaar_number?: string | null;
  aadhar_number?: string | null;
  uid?: string | null;
  full_name?: string | null;
  name?: string | null;
  gender?: string | null;
  mother_name?: string | null;
  address?: string | null;
  dob?: string | null;
  date_of_birth?: string | null;
  is_masked?: boolean | null;
  document_type?: string | null;
  confidences?: Record<string, number | null>;
  pincode?: string | null;
  state?: string | null;
  surepass_response?: SurepassApiResponse | Record<string, unknown>;
}

/** Surepass vehicle RC OCR — extract-only. */
export interface RcOcrResponse {
  client_id?: string;
  rc_number?: string | null;
  registration_number?: string | null;
  vehicle_number?: string | null;
  chassis_number?: string | null;
  engine_number?: string | null;
  owner_name?: string | null;
  relative?: string | null;
  address?: string | null;
  fuel_used?: string | null;
  fuel_type?: string | null;
  date_of_registration?: string | null;
  registration_validity?: string | null;
  owner_sr_no?: string | null;
  state?: string | null;
  vehicle_weight?: string | null;
  vehicle_class?: string | null;
  vehicle_category?: string | null;
  maker_model?: string | null;
  maker?: string | null;
  model?: string | null;
  registration_date?: string | null;
  insurance_upto?: string | null;
  insurance_validity?: string | null;
  fit_up_to?: string | null;
  fitness_validity?: string | null;
  permit_valid_upto?: string | null;
  permit_validity?: string | null;
  surepass_response?: SurepassApiResponse | Record<string, unknown>;
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
  /** When true, backend runs bank verification on create/update (Surepass). */
  verify_bank?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  verified_at?: string | null;
  /** Surepass snapshots collected during the form session — merged into JSONB on save. */
  kyc_verification_details?: EntityKycVerificationDetails;
}

export interface UpdateTransporterRequest extends Partial<CreateTransporterRequest> {}

// Godown (warehouse) master
export interface GodownAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface Godown {
  id: string;
  name: string;
  /** Present on detail and typical list responses; optional for defensive typing */
  contact_persons?: ContactPerson[];
  gst_number?: string | null;
  address?: GodownAddress | null;
  /** Optional Google Maps URL (share link or https://www.google.com/maps?q=...) */
  google_maps_link?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateGodownRequest {
  name: string;
  /** Required on create (min 1), same shape as vendors */
  contact_persons: ContactPerson[];
  gst_number?: string | null;
  address?: GodownAddress | null;
  google_maps_link?: string | null;
  is_active?: boolean;
}

export interface UpdateGodownRequest extends Partial<CreateGodownRequest> {}

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
  /** Set when bank account was verified (e.g. Surepass) */
  bank_details_verified_at?: string | null;
  bank_details_verified_by?: string | null;
  /** Persisted when bank verification failed (lenient create); cleared on successful verification or bank update */
  bank_verification_error?: string | null;
  kyc_verification_details?: EntityKycVerificationDetails;
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
  /** When true, backend compares bank_details to kyc_verification_details.bank on create (no Surepass call). */
  verify_bank?: boolean;
  /** Surepass snapshots collected during the form session — merged into JSONB on save. */
  kyc_verification_details?: EntityKycVerificationDetails;
}

export interface UpdateBrokerRequest extends Partial<CreateBrokerRequest> {}

/** Query for GET /brokers/:id/brokerage-commission-summary */
export interface BrokerBrokerageCommissionSummaryQuery {
  godown_id?: string;
  from_date?: string;
  to_date?: string;
}

/** Party on a brokerage summary line (purchase side). */
export interface BrokerCommissionSummaryParty {
  purchaser_id: string;
  business_name: string;
  gst_number: string | null;
}

/** ISP row nested under a brokerage summary sauda line. */
export interface BrokerCommissionSummaryIsp {
  id: string;
  slip_number: string;
  date: string;
  vehicle_number: string | null;
  party_name: string;
  transporter_id: string | null;
  transportation_cost: number | null;
}

/** Payment advice row nested under a brokerage summary sauda line. */
export interface BrokerCommissionSummaryPaymentAdviceRow {
  id: string;
  sr_number: string | null;
  amount: number;
  date_of_payment: string;
  status: string;
  sauda_id: string;
  inward_slip_pass_id: string | null;
}

/** One purchase-sauda line from brokerage commission summary API */
export interface BrokerCommissionSummaryLine {
  sauda_id: string;
  sauda_display_id: string;
  sauda_date: string | null;
  status: Sauda['status'];
  broker_commission: number | null;
  broker_commission_type: BrokerCommissionType | null;
  amount_after_discount: number;
  broker_commission_amount: number;
  party?: BrokerCommissionSummaryParty;
  isps?: BrokerCommissionSummaryIsp[];
  payment_advices?: BrokerCommissionSummaryPaymentAdviceRow[];
}

export interface BrokerCommissionSummary {
  broker_id: string;
  lines: BrokerCommissionSummaryLine[];
  total_broker_commission: number;
  period_from?: string | null;
  period_to?: string | null;
}

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

export interface GSTLookupMappedData {
  business_name: string;
  legal_name?: string;
  address: VendorAddress;
  business_details: Partial<VendorBusinessDetails>;
  registration_date?: string;
  status?: string;
}

/** Surepass GSTIN Advanced raw payload (via /kyc/gstin/advanced) */
export interface GSTINAdvancedData {
  client_id?: string;
  gstin: string;
  pan_number?: string;
  business_name?: string;
  legal_name?: string;
  center_jurisdiction?: string;
  state_jurisdiction?: string;
  date_of_registration?: string;
  constitution_of_business?: string;
  taxpayer_type?: string;
  gstin_status?: string;
  date_of_cancellation?: string;
  nature_bus_activities?: string[];
  promoters?: string[];
  annual_turnover?: string;
  annual_turnover_fy?: string;
  einvoice_status?: boolean;
  contact_details?: {
    principal?: {
      address?: string;
      email?: string;
      mobile?: string;
      nature_of_business?: string;
    };
    additional?: unknown[];
  };
  [key: string]: unknown;
}

export interface GSTLookupResponseData {
  gst_data: GSTINAdvancedData;
  mapped_data: GSTLookupMappedData;
  surepass_response?: SurepassApiResponse;
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
  surepass_response?: SurepassApiResponse;
}

export interface GstinByPanEntry {
  gstin: string;
  state?: string;
  state_code?: string;
  active_status?: string;
}

/** Surepass GSTIN-by-PAN lookup (via /kyc/gstin/by-pan) */
export interface GstinByPanResponse {
  pan_number: string;
  client_id?: string;
  gstin_list: GstinByPanEntry[];
  active_gstins: string[];
  primary_gstin?: string | null;
  surepass_response?: SurepassApiResponse;
}

/** Surepass PAN contact lookup (via /kyc/pan/contact) */
export interface PanContactResponse {
  pan_number: string;
  email_ids: string[];
  mobile_numbers: string[];
  surepass_response?: SurepassApiResponse;
}

/** Surepass Aadhaar validation (via /kyc/aadhaar/validate or broker lookupAadhaar) */
export interface AadhaarValidationResult {
  client_id?: string;
  aadhaar_number: string;
  age_range?: string;
  state?: string;
  gender?: string;
  last_digits?: string;
  is_mobile?: boolean;
  remarks?: string;
  less_info?: boolean;
}

export interface AadhaarLookupResponse {
  aadhaar_data: AadhaarValidationResult;
  is_valid: boolean;
  already_exists: boolean;
  message?: string;
  surepass_response?: SurepassApiResponse;
}

export interface SurepassBankIfscDetails {
  ifsc?: string;
  bank_name?: string;
  branch?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  contact?: string;
  micr?: string;
  rtgs?: boolean;
  neft?: boolean;
  imps?: boolean;
  upi?: boolean;
}

/** Surepass bank account verification (via /kyc/bank/verify) */
export interface BankVerificationResult {
  account_exists: boolean;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name?: string;
  branch?: string;
  upi_id?: string | null;
  imps_ref_no?: string;
  ifsc_details?: SurepassBankIfscDetails;
}

/** Surepass email check (via /kyc/email/verify) */
export interface EmailVerificationResult {
  client_id?: string;
  email: string;
  status: string;
  valid: boolean;
  valid_syntax: boolean;
  accepts_mail: boolean;
  smtp_connected: boolean;
  domain: string;
  username: string;
  is_temporary: boolean;
  is_catch_all: boolean;
  disabled: boolean;
  mx_records: string[];
  domain_age?: string | null;
  domain_registrar?: string | null;
  organization?: string | null;
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
export type RiceCategory = 'basmati' | 'non_basmati';

export interface RiceCodeVariantLink {
  id: string;
  variant: string;
  created_at?: string;
  updated_at?: string;
}

export interface RiceCode {
  rice_code_id: string;
  rice_code_name: string;
  category: RiceCategory;
  /** API returns linked rows; create/update accepts variant keys. */
  variants: RiceCodeVariantLink[] | string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface RiceType {
  value: string;
  label: string;
}

/** Rice length catalog row from GET /riceLengths/getAllRiceLengths */
export interface RiceLengthRecord {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
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

// Sauda Types — `rice_length` matches backend enum: dubar | tibar | wand
export type RiceLength = 'dubar' | 'tibar' | 'wand';

export interface Sauda {
  id: string;
  sauda_type: 'exgodown' | 'for';
  rice_category?: RiceCategory | null;
  rice_code_id?: string | null;
  rice_type?: string | null;
  /** FK to rice_lengths.id */
  rice_length_id?: string | null;
  rice_length_code?: string | null;
  rice_length_name?: string | null;
  /** @deprecated use rice_length_id — kept for legacy responses */
  rice_length?: RiceLength | null;
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
  rice_category?: RiceCategory | null;
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
  rice_length_id?: string | null;
  /** @deprecated use rice_length_id */
  rice_length?: RiceLength | null;
}

export interface UpdateSaudaRequest {
  sauda_type?: 'exgodown' | 'for';
  rice_category?: RiceCategory | null;
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
  rice_length_id?: string | null;
  /** @deprecated use rice_length_id */
  rice_length?: RiceLength | null;
}

export interface SaudaFilters {
  include_inactive?: boolean;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  sauda_type?: 'exgodown' | 'for';
  purchaser_id?: string;
  rice_code_id?: string;
  rice_type?: string;
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
  /** Present for all ISPs after godown migration */
  godown_id?: string;
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
/**
 * Weighbridge / kaanta bag category (bulk purchase intake).
 * Must match API + DB: `jute` | `pp` | `bopp_laminated` | `non_woven` | `vacuum_pouch`
 * (`pp` = PP woven bulk bags).
 */
export type BagType = 'jute' | 'pp' | 'bopp_laminated' | 'non_woven' | 'vacuum_pouch';

export interface KaantaVehicleCheck {
  checked: boolean;
  isp_vehicle_number: string | null;
  parchi_vehicle_number: string | null;
  matches: boolean | null;
  mismatch_flagged: boolean;
}

export interface KaantaWeightExtraction {
  full_truck_weight: number | null;
  empty_truck_weight: number | null;
  kaanta_weight: number | null;
  vehicle_number: string | null;
  ticket_number: string | null;
  needs_review: boolean;
  validation: {
    weights_extracted: boolean;
    net_matches_gross_minus_tare: boolean | null;
  };
  vehicle_check: KaantaVehicleCheck;
}

export interface Kaanta {
  id: string;
  kaanta_id: string;
  godown_id?: string;
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
  combined_kaanta_parchi_url?: string | null;
  ticket_number?: string | null;
  parchi_vehicle_number?: string | null;
  vehicle_number_mismatch?: boolean;
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
  said_sent_weight: number; // Weight mentioned in bill/said document (kg) — required on create
  bag_weight: number;
  no_of_bags: number;
  bag_type: BagType;
  ticket_number?: string;
  parchi_vehicle_number?: string;
}

export interface UpdateKaantaRequest {
  full_truck_weight?: number;
  empty_truck_weight?: number;
  said_sent_weight?: number | null;
  bag_weight?: number;
  no_of_bags?: number;
  bag_type?: BagType;
  ticket_number?: string | null;
  parchi_vehicle_number?: string | null;
}

export interface CreateInwardSlipPassRequest {
  godown_id: string;
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
  godown_id?: string;
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
  godown_id?: string;
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
  /** When set, inward slip pass creation time (preferred for “lot date” in UI). */
  inward_slip_pass_created_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLotRequest {
  godown_id: string;
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
  rice_length?: RiceLength | null;
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
  /** Resolved registration (e.g. kaanta overview); use with or instead of vehicle_id */
  vehicle_number?: string | null;
  /** Vehicle UUID when API returns a reference */
  vehicle_id?: string | null;
  party_name: string;
  transporter_id?: string | null;
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
    /** After broker commission; use for vendor line matching Pricing Flow (base − discount − broker). */
    amount_after_commission?: number;
    final_total_amount: number;
    lot_details: PurchaseSummaryLotDetail[];
  }>;
  
  isp_details: PurchaseSummaryISPDetail;
}

/** Rollup from kaanta-linked lots only (`GET .../kaanta-overview`). Same step totals as sauda summary, scoped to LOT-Kaanta-linked rows. */
export interface KaantaMetricSummary {
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
  lot_details?: PurchaseSummaryLotDetail[];
}

/** ISP row in kaanta overview: header fields plus counts (ISPs with ≥1 kaanta). */
export interface KaantaIspOverviewRow extends PurchaseSummaryISPDetail {
  kaanta_count: number;
  lot_count: number;
}

export interface KaantaPurchaseOverview {
  summary: KaantaMetricSummary;
  isps: KaantaIspOverviewRow[];
}

/** Per sauda + ISP: kaanta-linked lots and kaantas (`GET .../kaanta-lots`). */
export interface KaantaPurchaseIspDetail {
  isp: InwardSlipPass;
  kaantas: Kaanta[];
  lots: PurchaseSummaryLotDetail[];
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
  dana_deduction?: number | null; // 300g per Qtl of said_sent; whole kg (ceil)
  final_weight?: number | null; // kaanta_weight - dana_deduction
  charges: Charge[];
  created_at: string;
  updated_at: string;
}

export interface AddChargeRequest {
  charge_name: string;
  charge_value: number;
  charge_type: 'fixed' | 'percentage';
}

/** Charge row sent on POST/PUT (no id). PUT replaces all charges when this field is present. */
export type PaymentAdviceSubmitCharge = AddChargeRequest;

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
  charges?: PaymentAdviceSubmitCharge[];
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
  /** Full replace when present: omit = unchanged, [] = clear all, [...] = new list */
  charges?: PaymentAdviceSubmitCharge[];
}

export interface NetPayableResponse {
  net_payable: number;
}

/** Per-sauda line in PA preview summary (ISP mode). */
export interface PaymentAdvicePreviewSaudaLine {
  sauda_id: string;
  sauda_details: PurchaseSummarySaudaDetail;
  total_lots: number;
  total_bags: number;
  total_weight: number;
  base_amount: number;
  dana_deduction_kg?: number | null;
  dana_deduction_amount?: number | null;
  amount_after_dana?: number | null;
  cash_discount_amount: number;
  amount_after_discount?: number;
  broker_commission_amount: number;
  amount_after_commission?: number;
  final_total_amount: number;
  lot_details?: PurchaseSummaryLotDetail[];
}

/** Commercial breakdown returned by GET /payment-advices/preview. */
export interface PaymentAdvicePreviewSummary {
  sauda_id?: string;
  inward_slip_pass_id?: string;
  total_lots: number;
  total_bags: number;
  total_weight: number;
  base_amount: number;
  dana_deduction_kg?: number | null;
  dana_deduction_amount?: number | null;
  amount_after_dana?: number | null;
  cash_discount_amount: number;
  amount_after_discount: number;
  broker_commission_amount: number;
  amount_after_commission: number;
  transportation_cost: number;
  amount_after_transportation: number;
  igst_amount: number;
  final_total_amount: number;
  net_payable: number;
  sauda_details?: PurchaseSummarySaudaDetail;
  isp_details?: PurchaseSummaryISPDetail | PurchaseSummaryISPDetail[];
  lot_details?: PurchaseSummaryLotDetail[];
  saudas?: PaymentAdvicePreviewSaudaLine[];
}

/** Document preview from GET /payment-advices/preview (create/edit mode). */
export interface PaymentAdvicePreviewResponse {
  bill_weight: number | null;
  kanta_weight: number | null;
  dana_deduction: number | null;
  final_weight: number | null;
  total_bags: number | null;
  amount: number;
  total_charges?: number;
  net_payable: number;
  summary: PaymentAdvicePreviewSummary;
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

/** One line from POST /recipes/preview-cost or POST /recipes/:id/preview-cost */
export interface RecipeCostPreviewLine {
  lot_id: string;
  percentage?: number;
  kg_from_lot: number;
  rate: number;
  line_cost: number;
}

export interface RecipeCostPreviewByFormulaRequest {
  quantity_kg: number;
  formula: RecipeFormulaItem[];
}

export interface RecipeCostPreviewByRecipeIdRequest {
  quantity_kg: number;
}

export interface RecipeCostPreviewResponse {
  quantity_kg: number;
  lines: RecipeCostPreviewLine[];
  total_cost: number;
  blended_rate_per_kg: number;
  /** Present when previewing a saved recipe */
  recipe_id?: string | null;
  recipe_name?: string | null;
  /** Human-readable note about the formula basis */
  assumption?: string | null;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  rice_type: string | null;
  /** Rates by holding capacity (kg). Returned by list/get product APIs. */
  rates?: ProductRateInput[];
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

/** Product rate per holding capacity (from product_rates table). */
export interface ProductRate {
  id: string;
  product_id: string;
  holding_capacity: number;
  rate: number;
  created_at: string;
  updated_at: string;
}

export interface ProductRateInput {
  holding_capacity: number;
  rate: number;
}

export interface SetProductRatesRequest {
  rates: ProductRateInput[];
}

/** Single point from GET /products/:id/rates/history (audit trail of rate changes). */
export interface ProductRateHistoryPoint {
  id: string;
  holding_capacity: number;
  rate: number;
  created_at: string;
  created_by_full_name?: string | null;
}

export interface ProductRateHistoryResponse {
  product: Product;
  points: ProductRateHistoryPoint[];
}

/** Query params for product rate history (optional filters). */
export interface ProductRateHistoryQueryParams {
  holding_capacity?: number;
  /** ISO date (YYYY-MM-DD) */
  from?: string;
  /** ISO date (YYYY-MM-DD) */
  to?: string;
  limit?: number;
  offset?: number;
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
/** Empty-packet / packaging catalog — same five codes as `BagType` (kaanta) and backend validators */
export type PacketType = BagType;

/** Per-godown empty-packet rows returned with GET /packaging */
export interface PackagingPacketsInventoryRow {
  godown_id: string;
  godown_code?: string | null;
  godown_name?: string | null;
  available_quantity: number;
}

export interface Packaging {
  id: string;
  packaging_number: string | null; // Sequential number: PACK-001, PACK-002, etc.
  product_id: string; // NEW: Packaging is now product-specific
  /** API may return decimal strings (e.g. "25.00") */
  holding_capacity: number | string;
  packet_type: PacketType;
  packaging_vendor_id: string | null;
  ordered_weight: number | string | null;
  /** Vendor bill reference (optional) */
  bill_number?: string | null;
  bill_date?: string | null; // ISO date (YYYY-MM-DD)
  packaging_bill_url?: string | null;
  /** Master costing inputs (per empty bag weight, rate, GST %) */
  empty_bag_weight_kg?: number | string | null;
  empty_bag_rate_per_kg?: number | string | null;
  empty_bag_gst_percent?: number | string | null;
  /** Snapshot at first stock-in when initial_packets > 0 (server-computed) */
  empty_bags_total_weight_kg?: number | string | null;
  empty_bags_taxable_amount?: number | string | null;
  empty_bags_gst_amount?: number | string | null;
  empty_bags_total_amount?: number | string | null;
  created_at: string;
  updated_at: string;
  packets_inventory?: PackagingPacketsInventoryRow[];
}

export interface CreatePackagingRequest {
  product_id: string; // Required - packaging must belong to a product
  holding_capacity: number; // Must be 10, 25, or 50
  packet_type: PacketType;
  packaging_vendor_id?: string | null;
  ordered_weight?: number | null;
  initial_packets?: number | null; // Optional - Initial number of empty packets to set
  /** Required when initial_packets > 0 (packets inventory is godown-scoped) */
  godown_id?: string | null;
  /** Required when initial_packets > 0 — empty bag weight in kg per bag */
  empty_bag_weight_kg?: number | null;
  empty_bag_rate_per_kg?: number | null;
  empty_bag_gst_percent?: number | null;
  bill_number?: string | null;
  bill_date?: string | null;
  packaging_bill_url?: string | null;
}

export interface UpdatePackagingRequest {
  holding_capacity?: number;
  packet_type?: PacketType;
  packaging_vendor_id?: string | null;
  ordered_weight?: number | null;
  empty_bag_weight_kg?: number | null;
  empty_bag_rate_per_kg?: number | null;
  empty_bag_gst_percent?: number | null;
  bill_number?: string | null;
  bill_date?: string | null;
  packaging_bill_url?: string | null;
}

export interface AddPacketsInventoryRequest {
  packaging_id: string;
  available_quantity: number;
}

// Batch Types
export type BatchStatus = 'planned' | 'in_progress' | 'recipe_attached' | 'ready_to_pack' | 'packaged' | 'completed' | 'cancelled';

export interface Batch {
  id: string;
  godown_id?: string;
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
  /** Optional total cost captured at attach time (money, 2 d.p.) */
  cost?: number | null;
  created_at: string;
  updated_at: string;
}

export interface AttachBatchProductRequest {
  product_id: string;
  /** Optional; omit or null to skip / leave unchanged on upsert */
  cost?: number | null;
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

/** Optional quality/spec row; may link inward slip pass and/or batch + product */
export interface QualityParameter {
  id: string;
  inward_slip_pass_id: string | null;
  batch_id: string | null;
  product_id: string | null;
  purity: string | null;
  natural_admixture: string | null;
  average_grain_length: string | null;
  moisture: string | null;
  broken_grain: string | null;
  damage_discolour_grain: string | null;
  immature_grains: string | null;
  whiteness: string | null;
  foreign_matter: string | null;
  black_grains: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityParameterRequest {
  inward_slip_pass_id?: string | null;
  batch_id?: string | null;
  product_id?: string | null;
  purity?: string | null;
  natural_admixture?: string | null;
  average_grain_length?: string | null;
  moisture?: string | null;
  broken_grain?: string | null;
  damage_discolour_grain?: string | null;
  immature_grains?: string | null;
  whiteness?: string | null;
  foreign_matter?: string | null;
  black_grains?: string | null;
}

export type UpdateQualityParameterRequest = Partial<CreateQualityParameterRequest>;

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
  godown_id: string;
  recipe_id: string;
  quantity: number;
  status?: BatchStatus;
  batch_number?: string | null;
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
    packaging_number: string | null; // Sequential number: PACK-001, PACK-002, etc.
    holding_capacity: number;
    packet_type: PacketType;
    bill_number?: string | null;
    bill_date?: string | null;
    packaging_bill_url?: string | null;
  };
}

export interface PacketsInventory {
  packaging_id: string;
  available_quantity: number;
  packaging?: {
    id: string;
    packaging_number: string | null; // Sequential number: PACK-001, PACK-002, etc.
    holding_capacity: number;
    packet_type: PacketType;
    packaging_vendor_id: string | null;
    ordered_weight: number | null;
    bill_number?: string | null;
    bill_date?: string | null;
    packaging_bill_url?: string | null;
  };
}

/** GET /inventory/lots — lot_inventory rows enriched with inward slip lot metadata */
export interface LotsInventory {
  lot_id: string;
  available_quantity: number | string;
  godown_id?: string;
  id?: string;
  lot?: {
    id: string;
    lot_number?: string | null;
    rice_code_id?: string | null;
    rice_type?: string | null;
    received_weight?: number | string | null;
  };
}

export interface BagsInventory {
  bag_type: BagType;
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
  godown_id?: string;
  product_id?: string;
  batch_id?: string;
  bag_type?: BagType;
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
  bag_types?: BagType[];
  bag_capacities?: number[];
  search_text?: string;
  date_range?: {
    from?: string; // ISO date string
    to?: string; // ISO date string
  };
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
      packaging_number: string | null; // Sequential number: PACK-001, PACK-002, etc.
      holding_capacity: number;
      packet_type: string;
      bill_number?: string | null;
      bill_date?: string | null;
      packaging_bill_url?: string | null;
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

