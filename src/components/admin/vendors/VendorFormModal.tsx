import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, Search, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CustomSelect } from '../../shared/CustomSelect';
import { useVendors } from '../../../hooks/useVendors';
import { vendorsAPI } from '../../../services/vendors.api';
import { leadsAPI } from '../../../services/leads.api';
import { pincodeAPI } from '../../../services/pincode.api';
import { bankAPI } from '../../../services/bank.api';
import { validateEmail, validateGST, validatePAN, validateGoogleLocationLink } from '../../../utils/validation';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { VendorPreviewDialog } from './VendorPreviewDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import type { CreateVendorRequest, UpdateVendorRequest, Lead, VendorBankDetails, ContactPerson } from '../../../types/entities';

interface VendorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId?: string | null;
  defaultType?: 'purchaser' | 'seller' | 'both';
  lockType?: boolean;
}

// Helper function to convert ALL CAPS text to Title Case
const toTitleCase = (str: string | undefined | null): string => {
  if (!str) return '';
  // Check if the string is mostly uppercase (more than 60% uppercase letters)
  const uppercaseCount = (str.match(/[A-Z]/g) || []).length;
  const letterCount = (str.match(/[a-zA-Z]/g) || []).length;
  const isAllCaps = letterCount > 0 && uppercaseCount / letterCount > 0.6;
  
  if (!isAllCaps) return str; // Don't modify if not all caps
  
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      // Keep common abbreviations uppercase
      const abbreviations = ['pvt', 'ltd', 'llp', 'llc', 'inc', 'co', 'and'];
      if (abbreviations.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

export function VendorFormModal({ open, onOpenChange, vendorId, defaultType, lockType = false }: VendorFormModalProps) {
  const { createVendor, updateVendor } = useVendors();
  const navigate = useNavigate();
  const isEditMode = !!vendorId;
  const [formData, setFormData] = useState<CreateVendorRequest>({
    business_name: '',
    contact_persons: [{ name: '', phones: [''], emails: [''] }],
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    business_details: {
      pan_number: '',
      gst_number: '',
    },
    bank_details: {
      account_holder_name: '',
      account_number: '',
      ifsc_code: '',
      bank_name: '',
      branch: '',
    } as VendorBankDetails,
    type: defaultType || 'both',
    is_active: true,
    google_location_link: null,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [loadingVendor, setLoadingVendor] = useState(false);
  const [originalGstNumber, setOriginalGstNumber] = useState<string>('');
  const [originalPanNumber, setOriginalPanNumber] = useState<string>('');
  const [leadData, setLeadData] = useState<Lead | null>(null);
  const [gstAutoFilledFields, setGstAutoFilledFields] = useState<Set<string>>(new Set());

  // Load vendor data when in edit mode
  useEffect(() => {
    if (open && vendorId && isEditMode) {
      loadVendorData();
    } else if (open && !vendorId) {
      // Reset form when opening in create mode
      resetForm();
    }
  }, [open, vendorId]);

  // Load lead data when vendor has lead_id
  useEffect(() => {
    if (open && vendorId && isEditMode && leadData === null) {
      loadLeadData();
    } else if (!open) {
      setLeadData(null);
    }
  }, [open, vendorId, isEditMode]);

  const loadVendorData = async () => {
    if (!vendorId) return;
    
    setLoadingVendor(true);
    try {
      const vendor = await vendorsAPI.getVendorById(vendorId);
      const gstNumber = vendor.business_details?.gst_number || '';
      const panNumber = vendor.business_details?.pan_number || '';
      
      // Store original values to check if they should be disabled
      setOriginalGstNumber(gstNumber);
      setOriginalPanNumber(panNumber);
      
      setFormData({
        business_name: vendor.business_name || '',
        contact_persons: vendor.contact_persons && vendor.contact_persons.length > 0 
          ? vendor.contact_persons.map(cp => ({
              name: cp.name || '',
              phones: cp.phones?.length > 0 ? cp.phones : [''],
              emails: (cp.emails?.length ?? 0) > 0 ? cp.emails : [''],
            }))
          : [{ name: '', phones: [''], emails: [''] }],
        address: {
          street: vendor.address?.street || '',
          city: vendor.address?.city || '',
          state: vendor.address?.state || '',
          pincode: vendor.address?.pincode || '',
          country: vendor.address?.country || 'India',
        },
        business_details: {
          pan_number: panNumber,
          gst_number: gstNumber,
        },
        bank_details: vendor.bank_details ? {
          account_holder_name: vendor.bank_details.account_holder_name || '',
          account_number: vendor.bank_details.account_number || '',
          ifsc_code: vendor.bank_details.ifsc_code || '',
          bank_name: vendor.bank_details.bank_name || '',
          branch: vendor.bank_details.branch || '',
        } : {
          account_holder_name: '',
          account_number: '',
          ifsc_code: '',
          bank_name: '',
          branch: '',
        },
        type: vendor.type || 'both',
        is_active: vendor.is_active ?? true,
        google_location_link: vendor.google_location_link || null,
      });
      setStep(1);
      setErrors({});
    } catch (error: any) {
      console.error('Failed to load vendor:', error);
      setAlertType('error');
      setAlertTitle('Failed to Load Vendor');
      setAlertMessage(error?.message || 'Could not load vendor data. Please try again.');
      setAlertOpen(true);
      onOpenChange(false);
    } finally {
      setLoadingVendor(false);
    }
  };

  const loadLeadData = async () => {
    if (!vendorId) return;
    
    try {
      const vendor = await vendorsAPI.getVendorById(vendorId);
      if (vendor.lead_id) {
        const lead = await leadsAPI.getLeadById(vendor.lead_id);
        setLeadData(lead);
      }
    } catch (error: any) {
      console.error('Failed to load lead data:', error);
      // Don't show error, just log it
    }
  };

  const resetForm = () => {
    setFormData({
      business_name: '',
      contact_persons: [{ name: '', phones: [''], emails: [''] }],
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
      },
      business_details: {
        pan_number: '',
        gst_number: '',
      },
      bank_details: {
        account_holder_name: '',
        account_number: '',
        ifsc_code: '',
        bank_name: '',
        branch: '',
      },
      type: defaultType || 'both',
      is_active: true,
      google_location_link: null,
    });
    setStep(1);
    setErrors({});
    setOriginalGstNumber('');
    setOriginalPanNumber('');
    setBankAccountVerified(false);
    setGstAutoFilledFields(new Set());
  };

  // Contact persons management functions
  const addContactPerson = () => {
    setFormData({
      ...formData,
      contact_persons: [...formData.contact_persons, { name: '', phones: [''], emails: [''] }]
    });
  };

  const removeContactPerson = (index: number) => {
    if (formData.contact_persons.length > 1) {
      setFormData({
        ...formData,
        contact_persons: formData.contact_persons.filter((_, i) => i !== index)
      });
    }
  };

  const updateContactPerson = (index: number, field: keyof ContactPerson, value: any) => {
    const updated = [...formData.contact_persons];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, contact_persons: updated });
  };

  const addPhone = (personIndex: number) => {
    const updated = [...formData.contact_persons];
    updated[personIndex] = { 
      ...updated[personIndex], 
      phones: [...updated[personIndex].phones, ''] 
    };
    setFormData({ ...formData, contact_persons: updated });
  };

  const removePhone = (personIndex: number, phoneIndex: number) => {
    const updated = [...formData.contact_persons];
    if (updated[personIndex].phones.length > 1) {
      updated[personIndex] = {
        ...updated[personIndex],
        phones: updated[personIndex].phones.filter((_, i) => i !== phoneIndex)
      };
      setFormData({ ...formData, contact_persons: updated });
    }
  };

  const updatePhone = (personIndex: number, phoneIndex: number, value: string) => {
    const updated = [...formData.contact_persons];
    updated[personIndex].phones[phoneIndex] = value;
    setFormData({ ...formData, contact_persons: updated });
  };

  const addEmail = (personIndex: number) => {
    const updated = [...formData.contact_persons];
    updated[personIndex] = {
      ...updated[personIndex],
      emails: [...(updated[personIndex].emails || []), '']
    };
    setFormData({ ...formData, contact_persons: updated });
  };

  const removeEmail = (personIndex: number, emailIndex: number) => {
    const updated = [...formData.contact_persons];
    const emails = updated[personIndex].emails || [];
    if (emails.length > 0) {
      updated[personIndex] = {
        ...updated[personIndex],
        emails: emails.filter((_, i) => i !== emailIndex)
      };
      setFormData({ ...formData, contact_persons: updated });
    }
  };

  const updateEmail = (personIndex: number, emailIndex: number, value: string) => {
    const updated = [...formData.contact_persons];
    if (!updated[personIndex].emails) updated[personIndex].emails = [];
    updated[personIndex].emails![emailIndex] = value;
    setFormData({ ...formData, contact_persons: updated });
  };

  const handleGSTLookup = async () => {
    if (!formData.business_details.gst_number) {
      setErrors({ ...errors, gst_number: 'Please enter a GST number' });
      return;
    }
    
    if (!validateGST(formData.business_details.gst_number)) {
      setErrors({ ...errors, gst_number: 'Invalid GST format' });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, gst_number: '' });
    
    try {
      const response = await vendorsAPI.lookupGST(formData.business_details.gst_number);
      
      // The API service returns response.data, which is { gst_data: {...}, mapped_data: {...} }
      const mapped = response.mapped_data;
      
      // Track which fields are being auto-filled
      const autoFilledFields = new Set<string>();
      
      // Populate business name if available (convert to title case)
      let businessName = formData.business_name;
      if (mapped?.business_name) {
        businessName = toTitleCase(mapped.business_name);
        autoFilledFields.add('business_name');
      }
      
      // Populate address fields (only fill non-empty values, convert to title case)
      // Note: Address fields are NOT added to autoFilledFields, so they remain editable
      const addressUpdate: any = { ...formData.address };
      if (mapped?.address) {
        if (mapped.address.street) {
          addressUpdate.street = toTitleCase(mapped.address.street);
        }
        if (mapped.address.city) {
          addressUpdate.city = toTitleCase(mapped.address.city);
        }
        if (mapped.address.state) {
          addressUpdate.state = toTitleCase(mapped.address.state);
        }
        if (mapped.address.pincode) {
          addressUpdate.pincode = mapped.address.pincode;
        }
        if (mapped.address.country) {
          addressUpdate.country = toTitleCase(mapped.address.country);
        }
      }
      
      // Update business details
      const businessDetailsUpdate: any = {
        ...formData.business_details,
      };
      
      // Set GST number if available
      if (mapped?.business_details?.gst_number) {
        businessDetailsUpdate.gst_number = mapped.business_details.gst_number;
        autoFilledFields.add('gst_number');
      }
      
      // Set PAN number if available
      if (mapped?.business_details?.pan_number) {
        businessDetailsUpdate.pan_number = mapped.business_details.pan_number;
        autoFilledFields.add('pan_number');
      }
      
      // Set business type if available
      if (mapped?.business_details?.business_type) {
        businessDetailsUpdate.business_type = mapped.business_details.business_type;
        autoFilledFields.add('business_type');
      }
      
      // Auto-fill account holder name with business name (editable)
      const bankDetailsUpdate = {
        ...formData.bank_details,
        account_holder_name: businessName,
      };
      
      setFormData({
        ...formData,
        business_name: businessName,
        address: addressUpdate,
        business_details: businessDetailsUpdate,
        bank_details: bankDetailsUpdate,
      });
      
      // Set the auto-filled fields
      setGstAutoFilledFields(autoFilledFields);
      
      // Clear any previous errors
      setErrors({ ...errors, gst_number: '' });
    } catch (error: any) {
      console.error('GST lookup error:', error);
      setErrors({ ...errors, gst_number: error?.message || 'Failed to lookup GST details' });
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePANLookup = async () => {
    if (!formData.business_details.pan_number) {
      setErrors({ ...errors, pan_number: 'Please enter a PAN number' });
      return;
    }
    
    if (!validatePAN(formData.business_details.pan_number)) {
      setErrors({ ...errors, pan_number: 'Invalid PAN format' });
      return;
    }

    setLookupLoading(true);
    setErrors({ ...errors, pan_number: '' });
    
    try {
      const response = await vendorsAPI.lookupPAN(formData.business_details.pan_number);
      
      // The API service returns response.data, which is { pan_data: {...}, mapped_data: {...} }
      const mapped = response.mapped_data;
      const panData = response.pan_data;
      
      // Track which fields are being auto-filled
      const autoFilledFields = new Set<string>();
      
      // Populate business name if available (convert to title case)
      let businessName = formData.business_name;
      if (mapped?.business_name) {
        businessName = toTitleCase(mapped.business_name);
        autoFilledFields.add('business_name');
      }
      
      // Populate contact person if PAN is for a person (individual)
      let updatedContactPersons = [...formData.contact_persons];
      if (panData?.category === 'person' && panData?.name) {
        updatedContactPersons[0] = { ...updatedContactPersons[0], name: toTitleCase(panData.name) };
      }
      
      // Populate address fields (only fill non-empty values, convert to title case)
      // Note: Address fields are NOT added to autoFilledFields, so they remain editable
      const addressUpdate: any = { ...formData.address };
      if (mapped?.address) {
        if (mapped.address.street) addressUpdate.street = toTitleCase(mapped.address.street);
        if (mapped.address.city) addressUpdate.city = toTitleCase(mapped.address.city);
        if (mapped.address.state) addressUpdate.state = toTitleCase(mapped.address.state);
        if (mapped.address.pincode) addressUpdate.pincode = mapped.address.pincode;
        if (mapped.address.country) addressUpdate.country = toTitleCase(mapped.address.country);
      }
      
      // Update business details
      const businessDetailsUpdate: any = {
        ...formData.business_details,
      };
      
      // Ensure PAN number is set
      if (mapped?.business_details?.pan_number) {
        businessDetailsUpdate.pan_number = mapped.business_details.pan_number;
        autoFilledFields.add('pan_number');
      }
      
      // Set business type if available
      if (mapped?.business_details?.business_type) {
        businessDetailsUpdate.business_type = mapped.business_details.business_type;
      }
      
      // Auto-fill account holder name with business name (editable)
      const bankDetailsUpdate = {
        ...formData.bank_details,
        account_holder_name: businessName,
      };
      
      setFormData({
        ...formData,
        business_name: businessName,
        contact_persons: updatedContactPersons,
        address: addressUpdate,
        business_details: businessDetailsUpdate,
        bank_details: bankDetailsUpdate,
      });
      
      // Set the auto-filled fields
      setGstAutoFilledFields(autoFilledFields);
      
      // Clear any previous errors
      setErrors({ ...errors, pan_number: '' });
    } catch (error: any) {
      console.error('PAN lookup error:', error);
      setErrors({ ...errors, pan_number: error?.message || 'Failed to lookup PAN details' });
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePincodeLookup = async (pincode: string) => {
    // Only lookup if pincode is exactly 6 digits
    if (!/^\d{6}$/.test(pincode)) {
      return;
    }

    setPincodeLoading(true);
    const errorKey = 'pincode';
    setErrors({ ...errors, [errorKey]: '' });

    try {
      const response = await pincodeAPI.lookupPincode(pincode);
      
      // Extract post office data from response
      const postOffice = response.postOffices?.[0];
      
      if (!postOffice) {
        console.warn('No post office data found in pincode lookup response');
        return;
      }

      // Update address fields from pincode lookup response
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          pincode: postOffice.Pincode || pincode,
          // Fill city, state from response (convert to title case)
          city: toTitleCase(postOffice.Block || postOffice.District || postOffice.Name) || formData.address?.city || '',
          state: toTitleCase(postOffice.State) || formData.address?.state || '',
          country: toTitleCase(postOffice.Country) || formData.address?.country || 'India',
        },
      });

      setErrors({ ...errors, [errorKey]: '' });
    } catch (error: any) {
      console.error('Pincode lookup error:', error);
      // Don't show error if pincode is invalid - user might still be typing
    } finally {
      setPincodeLoading(false);
    }
  };

  const [ifscLoading, setIfscLoading] = useState(false);
  const [verifyingBankAccount, setVerifyingBankAccount] = useState(false);
  const [bankAccountVerified, setBankAccountVerified] = useState(false);

  const handleIFSCLookup = async (ifscCode: string) => {
    // Only lookup if IFSC is exactly 11 characters (basic validation, let API handle detailed validation)
    if (!ifscCode || ifscCode.length !== 11) {
      setErrors({ ...errors, ifsc_code: 'IFSC code must be exactly 11 characters' });
      return;
    }

    setIfscLoading(true);
    setErrors({ ...errors, ifsc_code: '' });
    
    try {
      console.log('Calling IFSC lookup API for:', ifscCode);
      const response = await bankAPI.lookupIFSC(ifscCode);
      console.log('IFSC lookup response:', response);
      
      if (response.bank_details) {
        setFormData({
          ...formData,
          bank_details: {
            ...formData.bank_details,
            bank_name: toTitleCase(response.bank_details.bank_name) || formData.bank_details?.bank_name || '',
            branch: toTitleCase(response.bank_details.branch) || formData.bank_details?.branch || '',
            ifsc_code: response.bank_details.ifsc_code || ifscCode,
          }
        });
        setErrors({ ...errors, ifsc_code: '' });
      }
    } catch (error: any) {
      console.error('IFSC lookup error:', error);
      setErrors({ ...errors, ifsc_code: error?.message || 'IFSC code not found' });
    } finally {
      setIfscLoading(false);
    }
  };

  const handleVerifyBankAccount = async () => {
    const accountNumber = formData.bank_details?.account_number;
    const ifscCode = formData.bank_details?.ifsc_code;

    if (!accountNumber || !ifscCode) {
      setAlertType('warning');
      setAlertTitle('Missing Information');
      setAlertMessage('Please enter both account number and IFSC code before verifying.');
      setAlertOpen(true);
      return;
    }

    setVerifyingBankAccount(true);
    setBankAccountVerified(false);
    
    try {
      console.log('Calling verify bank account API:', { accountNumber, ifscCode });
      const response = await vendorsAPI.verifyBankAccount(accountNumber, ifscCode);
      console.log('Verify bank account response:', response);
      
      // Check if account exists
      if (!response.account_exists) {
        setBankAccountVerified(false);
        setAlertType('error');
        setAlertTitle('Account Not Found');
        setAlertMessage('The bank account could not be verified. Please check the account number and IFSC code.');
        setAlertOpen(true);
        return;
      }

      const verifiedAccountHolderName = response.account_holder_name;
      const currentAccountHolderName = formData.bank_details?.account_holder_name?.trim();

      // If account holder name is already filled, check if it matches
      if (currentAccountHolderName && verifiedAccountHolderName) {
        const normalizedCurrent = currentAccountHolderName.toUpperCase().replace(/\s+/g, ' ');
        const normalizedVerified = verifiedAccountHolderName.toUpperCase().replace(/\s+/g, ' ');
        
        if (normalizedCurrent !== normalizedVerified) {
          setBankAccountVerified(false);
          setAlertType('error');
          setAlertTitle('Account Holder Name Mismatch');
          setAlertMessage(`The account holder name does not match. Expected: "${verifiedAccountHolderName}", but found: "${currentAccountHolderName}". Please verify the details.`);
          setAlertOpen(true);
          return;
        }
      }

      // Update form data with verified details
      const updatedBankDetails = {
        ...formData.bank_details,
        account_number: accountNumber,
        ifsc_code: ifscCode,
      };

      // Fill in account holder name if empty
      if (verifiedAccountHolderName && !currentAccountHolderName) {
        updatedBankDetails.account_holder_name = toTitleCase(verifiedAccountHolderName);
      }

      setFormData({
        ...formData,
        bank_details: updatedBankDetails,
      });

      setBankAccountVerified(true);
      setAlertType('success');
      setAlertTitle('Bank Account Verified');
      setAlertMessage(response.message || 'Bank account details have been verified successfully.');
      setAlertOpen(true);
    } catch (error: any) {
      console.error('Bank account verification error:', error);
      setBankAccountVerified(false);
      setAlertType('error');
      setAlertTitle('Verification Failed');
      setAlertMessage(error?.message || 'Failed to verify bank account. Please check the details and try again.');
      setAlertOpen(true);
    } finally {
      setVerifyingBankAccount(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.business_name) newErrors.business_name = 'Business name required';
    
    // Validate contact persons
    if (!formData.contact_persons || formData.contact_persons.length === 0) {
      newErrors.contact_persons = 'At least one contact person is required';
    } else {
      formData.contact_persons.forEach((cp, idx) => {
        if (!cp.name || cp.name.trim().length < 2) {
          newErrors[`contact_person_${idx}_name`] = 'Name required (min 2 chars)';
        }
        if (!cp.phones || cp.phones.length === 0 || !cp.phones[0]) {
          newErrors[`contact_person_${idx}_phone`] = 'At least one phone required';
        }
        // Validate emails if provided
        cp.emails?.forEach((email, emailIdx) => {
          if (email && !validateEmail(email)) {
            newErrors[`contact_person_${idx}_email_${emailIdx}`] = 'Valid email required';
          }
        });
      });
    }
    if (!formData.address.street) newErrors.street = 'Street required';
    if (!formData.address.city) newErrors.city = 'City required';
    if (!formData.address.state) newErrors.state = 'State required';
    if (!formData.address.pincode) newErrors.pincode = 'Pincode required';
    if (!formData.business_details.pan_number && !formData.business_details.gst_number) {
      newErrors.gst_number = 'Either GST or PAN required';
    }
    if (formData.google_location_link) {
      const val = formData.google_location_link.trim();
      if (!validateGoogleLocationLink(val)) {
        newErrors.google_location_link = 'Invalid Google Maps link format';
      } else if (val.length > 500) {
        newErrors.google_location_link = 'Link must be at most 500 characters';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Navigate to step with errors
      if (newErrors.business_name || newErrors.contact_person || newErrors.email || newErrors.phone || newErrors.gst_number || newErrors.pan_number) {
        setStep(1);
      } else if (newErrors.street || newErrors.city || newErrors.state || newErrors.pincode) {
        setStep(2);
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    // In edit mode, directly update without preview
    if (isEditMode && vendorId) {
      setLoading(true);
      try {
        await updateVendor(vendorId, formData as UpdateVendorRequest);
        setAlertType('success');
        setAlertTitle('Vendor Updated Successfully');
        setAlertMessage('The vendor has been updated successfully.');
        setAlertOpen(true);
        onOpenChange(false);
      } catch (error: any) {
        setAlertType('error');
        setAlertTitle('Failed to Update Vendor');
        const errorMessage = 
          error?.message || 
          error?.data?.message || 
          error?.response?.data?.message || 
          'An error occurred while updating the vendor. Please try again.';
        setAlertMessage(errorMessage);
        setAlertOpen(true);
      } finally {
        setLoading(false);
      }
    } else {
      // In create mode, show preview dialog
      onOpenChange(false);
      setPreviewOpen(true);
    }
  };

  const handlePreviewConfirm = async (data: CreateVendorRequest | UpdateVendorRequest) => {
    setLoading(true);
    try {
      if (isEditMode && vendorId) {
        await updateVendor(vendorId, data as UpdateVendorRequest);
        setAlertType('success');
        setAlertTitle('Vendor Updated Successfully');
        setAlertMessage('The vendor has been updated successfully.');
      } else {
        await createVendor(data as CreateVendorRequest);
        resetForm();
        setAlertType('success');
        setAlertTitle('Vendor Created Successfully');
        setAlertMessage('The vendor has been created successfully.');
      }
      setPreviewOpen(false);
      setAlertOpen(true);
      // Close the form modal after success
      onOpenChange(false);
    } catch (error: any) {
      // Show error alert with API response
      setAlertType('error');
      setAlertTitle(isEditMode ? 'Failed to Update Vendor' : 'Failed to Create Vendor');
      // Extract error message from various possible locations
      const errorMessage = 
        error?.message || 
        error?.data?.message || 
        error?.response?.data?.message || 
        `An error occurred while ${isEditMode ? 'updating' : 'creating'} the vendor. Please try again.`;
      setAlertMessage(errorMessage);
      setAlertOpen(true);
      setPreviewOpen(false);
      // Reopen the form modal so user can edit
      onOpenChange(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-3xl translate-x-[-50%] translate-y-[-50%]">
          <div className="glass rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold">
                {isEditMode ? 'Update Vendor' : 'Create Vendor'}
              </Dialog.Title>
              <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 hover:bg-muted/50 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingVendor && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
                <span className="ml-2 text-sm text-muted-foreground">Loading vendor data...</span>
              </div>
            )}

            {/* Steps */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex-1 rounded-lg p-2 text-center text-sm font-medium transition-colors ${
                  step >= 1 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                1. Basic Info
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`flex-1 rounded-lg p-2 text-center text-sm font-medium transition-colors ${
                  step >= 2 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                2. Address
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className={`flex-1 rounded-lg p-2 text-center text-sm font-medium transition-colors ${
                  step >= 3 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                3. Bank Details
              </button>
              {isEditMode && leadData && (
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className={`flex-1 rounded-lg p-2 text-center text-sm font-medium transition-colors ${
                    step >= 4 ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  4. Lead Details
                </button>
              )}
            </div>

            {!loadingVendor && (
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-4">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 mb-2">
                    <p className="text-sm text-primary/90">
                      <span className="font-medium">Note:</span> One of the fields (either GST Number or PAN Number) is mandatory.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">GST Number</label>
                    {isEditMode && originalGstNumber && originalGstNumber.trim().length > 0 ? (
                      <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm pointer-events-none select-none">
                        {originalGstNumber}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.business_details.gst_number}
                          onChange={(e) => setFormData({ ...formData, business_details: { ...formData.business_details, gst_number: e.target.value.toUpperCase() } })}
                          className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                          placeholder="27ABCDE1234F1Z5"
                        />
                        <button 
                          type="button" 
                          onClick={handleGSTLookup} 
                          disabled={lookupLoading} 
                          className="btn-secondary flex items-center gap-2"
                        >
                          {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                        </button>
                      </div>
                    )}
                    {errors.gst_number && <p className="mt-1 text-xs text-red-600">{errors.gst_number}</p>}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">PAN Number</label>
                    {isEditMode && originalPanNumber && originalPanNumber.trim().length > 0 ? (
                      <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm pointer-events-none select-none">
                        {originalPanNumber}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.business_details.pan_number}
                          onChange={(e) => setFormData({ ...formData, business_details: { ...formData.business_details, pan_number: e.target.value.toUpperCase() } })}
                          className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed"
                          placeholder="ABCDE1234F"
                          readOnly={gstAutoFilledFields.has('pan_number')}
                        />
                        <button 
                          type="button" 
                          onClick={handlePANLookup} 
                          disabled={lookupLoading} 
                          className="btn-secondary flex items-center gap-2"
                        >
                          {lookupLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                        </button>
                      </div>
                    )}
                    {errors.pan_number && <p className="mt-1 text-xs text-red-600">{errors.pan_number}</p>}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Business Name *</label>
                    <input
                      type="text"
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed"
                      readOnly={gstAutoFilledFields.has('business_name')}
                    />
                    {errors.business_name && <p className="mt-1 text-xs text-red-600">{errors.business_name}</p>}
                  </div>

                  {/* Contact Persons Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold">Contact Persons *</label>
                      <button
                        type="button"
                        onClick={addContactPerson}
                        className="text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        + Add Contact Person
                      </button>
                    </div>
                    {errors.contact_persons && <p className="text-xs text-red-600">{errors.contact_persons}</p>}
                    
                    {formData.contact_persons.map((contactPerson, personIdx) => (
                      <div key={personIdx} className="p-3 border border-border rounded-lg space-y-3 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Contact Person {personIdx + 1}</span>
                          {formData.contact_persons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeContactPerson(personIdx)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        
                        {/* Name */}
                        <div>
                          <label className="text-xs font-medium mb-1 block">Name *</label>
                          <input
                            type="text"
                            value={contactPerson.name}
                            onChange={(e) => updateContactPerson(personIdx, 'name', e.target.value)}
                            className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                            placeholder="Contact person name"
                          />
                          {errors[`contact_person_${personIdx}_name`] && (
                            <p className="mt-1 text-xs text-red-600">{errors[`contact_person_${personIdx}_name`]}</p>
                          )}
                        </div>
                        
                        {/* Phones */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium">Phone Numbers *</label>
                            <button
                              type="button"
                              onClick={() => addPhone(personIdx)}
                              className="text-xs text-primary hover:text-primary/80"
                            >
                              + Add
                            </button>
                          </div>
                          <div className="space-y-2">
                            {contactPerson.phones.map((phone, phoneIdx) => (
                              <div key={phoneIdx} className="flex gap-2">
                                <input
                                  type="tel"
                                  value={phone}
                                  onChange={(e) => updatePhone(personIdx, phoneIdx, e.target.value)}
                                  className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                                  placeholder="Phone number"
                                />
                                {contactPerson.phones.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removePhone(personIdx, phoneIdx)}
                                    className="px-2 text-red-500 hover:text-red-700"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          {errors[`contact_person_${personIdx}_phone`] && (
                            <p className="mt-1 text-xs text-red-600">{errors[`contact_person_${personIdx}_phone`]}</p>
                          )}
                        </div>
                        
                        {/* Emails */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium">Email Addresses (optional)</label>
                            <button
                              type="button"
                              onClick={() => addEmail(personIdx)}
                              className="text-xs text-primary hover:text-primary/80"
                            >
                              + Add
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(contactPerson.emails || []).map((email, emailIdx) => (
                              <div key={emailIdx} className="flex gap-2">
                                <input
                                  type="email"
                                  value={email}
                                  onChange={(e) => updateEmail(personIdx, emailIdx, e.target.value)}
                                  className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                                  placeholder="Email address"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeEmail(personIdx, emailIdx)}
                                  className="px-2 text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          {contactPerson.emails?.map((_, emailIdx) => (
                            errors[`contact_person_${personIdx}_email_${emailIdx}`] && (
                              <p key={emailIdx} className="mt-1 text-xs text-red-600">
                                {errors[`contact_person_${personIdx}_email_${emailIdx}`]}
                              </p>
                            )
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Type *</label>
                    <CustomSelect
                      value={formData.type}
                      onChange={(value) => setFormData({ ...formData, type: value as any })}
                      options={[
                        { value: 'purchaser', label: 'Debtor' },
                        { value: 'seller', label: 'Creditor' },
                        { value: 'both', label: 'Both' }
                      ]}
                      placeholder="Select Type"
                      disabled={lockType}
                    />
                  </div>

                  <button type="button" onClick={() => setStep(2)} className="btn-primary w-full">
                    Next: Address
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Street *</label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed"
                      readOnly={gstAutoFilledFields.has('address.street')}
                    />
                    {errors.street && <p className="mt-1 text-xs text-red-600">{errors.street}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">City *</label>
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed"
                        readOnly={gstAutoFilledFields.has('address.city')}
                      />
                      {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">State *</label>
                      <input
                        type="text"
                        value={formData.address.state}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed"
                        readOnly={gstAutoFilledFields.has('address.state')}
                      />
                      {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Pincode *</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.address.pincode}
                          onChange={(e) => {
                            // Only allow digits and limit to 6 digits
                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setFormData({ ...formData, address: { ...formData.address, pincode: value } });
                            // Auto-lookup when 6 digits are entered
                            if (value.length === 6) {
                              handlePincodeLookup(value);
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.trim();
                            if (value.length === 6) {
                              handlePincodeLookup(value);
                            }
                          }}
                          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed"
                          placeholder="6 digits"
                          maxLength={6}
                          readOnly={gstAutoFilledFields.has('address.pincode')}
                        />
                        {pincodeLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <LoadingSpinner size="sm" />
                          </div>
                        )}
                      </div>
                      {errors.pincode && <p className="mt-1 text-xs text-red-600">{errors.pincode}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Country</label>
                      <input
                        type="text"
                        value={formData.address.country}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary read-only:cursor-not-allowed"
                        readOnly={gstAutoFilledFields.has('address.country')}
                      />
                    </div>
                  </div>

                  {/* Google Maps Location Link */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Google Maps Location Link</label>
                    <input
                      type="text"
                      value={formData.google_location_link || ''}
                      onChange={(e) => {
                        const value = e.target.value.trim() || null;
                        setFormData({ ...formData, google_location_link: value });
                        if (errors.google_location_link) setErrors({ ...errors, google_location_link: '' });
                      }}
                      onBlur={() => {
                        const val = (formData.google_location_link || '').trim();
                        if (val) {
                          if (!validateGoogleLocationLink(val)) {
                            setErrors({ ...errors, google_location_link: 'Invalid Google Maps link format' });
                          } else {
                            setErrors({ ...errors, google_location_link: '' });
                          }
                        } else {
                          setFormData({ ...formData, google_location_link: null });
                        }
                      }}
                      placeholder="Paste Google Maps link or Plus Code"
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      maxLength={500}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Paste a Google Maps share link or Plus Code. Link will be stored with the vendor.
                    </p>
                    {errors.google_location_link && <p className="mt-1 text-xs text-red-600">{errors.google_location_link}</p>}
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                      Back
                    </button>
                    <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1">
                      Next: Bank Details
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Account Holder Name</label>
                    <input
                      type="text"
                      value={formData.bank_details?.account_holder_name || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        bank_details: { 
                          ...formData.bank_details, 
                          account_holder_name: e.target.value 
                        } 
                      })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Account Number</label>
                    <input
                      type="text"
                      value={formData.bank_details?.account_number || ''}
                      onChange={(e) => {
                        setFormData({ 
                          ...formData, 
                          bank_details: { 
                            ...formData.bank_details, 
                            account_number: e.target.value 
                          } 
                        });
                        // Reset verification status when account number changes
                        setBankAccountVerified(false);
                      }}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">IFSC Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.bank_details?.ifsc_code || ''}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
                          setFormData({ 
                            ...formData, 
                            bank_details: { 
                              ...formData.bank_details, 
                              ifsc_code: value 
                            } 
                          });
                          // Reset verification status when IFSC changes
                          setBankAccountVerified(false);
                          // Auto-lookup when 11 characters are entered
                          if (value.length === 11) {
                            handleIFSCLookup(value);
                          }
                        }}
                        className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                        placeholder="HDFC0001234"
                        maxLength={11}
                      />
                      <button 
                        type="button" 
                        onClick={async (e) => {
                          console.log('IFSC search button clicked');
                          e.preventDefault();
                          e.stopPropagation();
                          
                          if (ifscLoading) {
                            console.log('Already loading, ignoring click');
                            return;
                          }
                          
                          const ifscCode = formData.bank_details?.ifsc_code?.trim() || '';
                          console.log('IFSC code from form:', ifscCode, 'Length:', ifscCode.length);
                          
                          if (!ifscCode) {
                            console.log('No IFSC code provided');
                            setErrors({ ...errors, ifsc_code: 'Please enter an IFSC code' });
                            return;
                          }
                          
                          if (ifscCode.length !== 11) {
                            console.log('IFSC code length is not 11:', ifscCode.length);
                            setErrors({ ...errors, ifsc_code: 'IFSC code must be exactly 11 characters' });
                            return;
                          }
                          
                          console.log('Calling handleIFSCLookup with:', ifscCode);
                          try {
                            await handleIFSCLookup(ifscCode);
                          } catch (error) {
                            console.error('Error in onClick handler:', error);
                          }
                        }} 
                        disabled={ifscLoading}
                        className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {ifscLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.ifsc_code && <p className="mt-1 text-xs text-red-600">{errors.ifsc_code}</p>}
                  </div>

                  {/* Verify Bank Account Button */}
                  {formData.bank_details?.account_number && formData.bank_details?.ifsc_code && formData.bank_details.ifsc_code.length === 11 && (
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleVerifyBankAccount();
                        }}
                        disabled={verifyingBankAccount}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          bankAccountVerified 
                            ? 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30' 
                            : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                        }`}
                      >
                        {verifyingBankAccount ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span>Verifying...</span>
                          </>
                        ) : bankAccountVerified ? (
                          <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Verified</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Verify Bank Account</span>
                          </>
                        )}
                      </button>
                      {bankAccountVerified && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          Account details verified successfully
                        </span>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Bank Name (auto-filled)</label>
                    <input
                      type="text"
                      value={formData.bank_details?.bank_name || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        bank_details: { 
                          ...formData.bank_details, 
                          bank_name: e.target.value 
                        } 
                      })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Branch (auto-filled)</label>
                    <input
                      type="text"
                      value={formData.bank_details?.branch || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        bank_details: { 
                          ...formData.bank_details, 
                          branch: e.target.value 
                        } 
                      })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">
                      Back
                    </button>
                    {isEditMode && leadData ? (
                      <button 
                        type="button" 
                        onClick={() => setStep(4)}
                        className="btn-primary flex-1"
                      >
                        Next: Lead Details
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn-primary flex-1"
                      >
                        {isEditMode ? 'Update Vendor' : 'Create Vendor'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {step === 4 && isEditMode && leadData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Lead Details</h3>
                    <button
                      type="button"
                      onClick={() => navigate(`/crm/leads/${leadData.id}`)}
                      className="text-xs text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors"
                    >
                      View Lead <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Company Name */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Company Name</label>
                      <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                        {leadData.company_name || '-'}
                      </div>
                    </div>

                    {/* GST Number */}
                    {leadData.business_details?.gst_number && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">GST Number</label>
                        <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                          {leadData.business_details.gst_number}
                        </div>
                      </div>
                    )}

                    {/* PAN Number */}
                    {leadData.business_details?.pan_number && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">PAN Number</label>
                        <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                          {leadData.business_details.pan_number}
                        </div>
                      </div>
                    )}

                    {/* Contact Persons */}
                    {leadData.contact_persons && leadData.contact_persons.length > 0 && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Contact Persons</label>
                        <div className="space-y-2">
                          {leadData.contact_persons.map((contact, index) => (
                            <div key={index} className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                              <div className="font-medium">{contact.name}</div>
                              {contact.phones && contact.phones.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Phones: {contact.phones.filter(p => p && p.trim()).join(', ') || '-'}
                                </div>
                              )}
                              {contact.emails && contact.emails.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Emails: {contact.emails.filter(e => e && e.trim()).join(', ') || '-'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Phone */}
                    {leadData.phone && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Phone</label>
                        <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                          {leadData.phone}
                        </div>
                      </div>
                    )}

                    {/* Email */}
                    {leadData.email && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Email</label>
                        <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                          {leadData.email}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setStep(3)} className="btn-secondary flex-1">
                      Back
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSubmit}
                      disabled={loading}
                      className="btn-primary flex-1"
                    >
                      Update Vendor
                    </button>
                  </div>
                </div>
              )}
            </form>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      
      {/* Preview Dialog */}
      <VendorPreviewDialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) {
            // If preview is closed without confirming, optionally reopen the form
            // For now, we'll just close it
          }
        }}
        formData={formData}
        onConfirm={handlePreviewConfirm}
      />

      {/* Alert Dialog for API Response */}
      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        buttonText="OK"
      />
    </Dialog.Root>
  );
}

