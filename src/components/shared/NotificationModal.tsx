import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, Mail, MessageCircle, Send, Loader2, Plus, Trash2, Eye, EyeOff, FileText } from 'lucide-react';
import { useToast } from './Toast';
import { LoadingSpinner } from '../admin/shared/LoadingSpinner';
import { floorNetPayable } from '../../utils/money';
import { PhoneInput } from './PhoneInput';
import { sanitizePhoneList } from '../../utils/validation';

import { API_BASE_URL } from '../../services/api';
import { authenticatedFetch } from '../../services/authenticatedFetch';
import { getAccessToken } from '../../services/authStorage';

interface NotificationPreview {
  email?: {
    subject: string;
    html: string;
    text: string;
  };
  whatsapp?: {
    message: string;
  };
}

interface NotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'sauda' | 'payment-advice';
  entityId?: string; // Sauda ID for sauda type
  paymentAdviceData?: {
    adviceNumber: string;
    vendorName: string;
    amount: number;
    date: string;
    bankDetails?: {
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
    };
  };
  pdfFile?: File | null;
  pdfUrl?: string;
  initialTab?: 'email' | 'whatsapp';
  onSuccess?: () => void;
}

export function NotificationModal({
  open,
  onOpenChange,
  type,
  entityId,
  paymentAdviceData,
  pdfFile,
  pdfUrl,
  initialTab = 'email',
  onSuccess,
}: NotificationModalProps) {
  const token = getAccessToken();
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp'>(initialTab);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);

  // Email state
  const [emails, setEmails] = useState<string[]>(['']);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailHtml, setEmailHtml] = useState('');
  const [emailText, setEmailText] = useState('');

  // WhatsApp state
  const [whatsappNumbers, setWhatsappNumbers] = useState<string[]>(['']);
  const [whatsappMessage, setWhatsappMessage] = useState('');

  // Load preview when modal opens
  useEffect(() => {
    if (open) {
      loadPreview();
      // Reset recipients
      setEmails(['']);
      setWhatsappNumbers(['']);
      // Set initial tab
      setActiveTab(initialTab);
    }
  }, [open, entityId, paymentAdviceData, initialTab]);

  const loadPreview = async () => {
    if (!token) return;

    setLoadingPreview(true);
    try {
      let preview: NotificationPreview;

      if (type === 'sauda' && entityId) {
        const response = await authenticatedFetch(
          `${API_BASE_URL}/saudas/${entityId}/notification-preview`
        );
        const result = await response.json();
        if (result.status !== 'success') {
          throw new Error(result.message || 'Failed to load preview');
        }
        preview = result.data;
      } else if (type === 'payment-advice' && paymentAdviceData) {
        const response = await authenticatedFetch(`${API_BASE_URL}/payment-advices/preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...paymentAdviceData,
            amount: floorNetPayable(paymentAdviceData.amount),
          }),
        });
        const result = await response.json();
        if (result.status !== 'success') {
          throw new Error(result.message || 'Failed to load preview');
        }
        preview = result.data;
      } else {
        return;
      }

      // Set email preview
      if (preview.email) {
        setEmailSubject(preview.email.subject);
        setEmailHtml(preview.email.html);
        setEmailText(preview.email.text);
      }

      // Set WhatsApp preview
      if (preview.whatsapp) {
        setWhatsappMessage(preview.whatsapp.message);
      }
    } catch (err: any) {
      showError('Failed to load preview', err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSendEmail = async () => {
    if (!token) return;

    const validEmails = emails.filter((e) => e.trim()).filter((e) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(e);
    });

    if (validEmails.length === 0) {
      showError('Validation Error', 'Please enter at least one valid email address');
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('emails', JSON.stringify(validEmails));
      
      if (emailSubject) formData.append('customSubject', emailSubject);
      if (emailHtml) formData.append('customHtml', emailHtml);
      if (emailText) formData.append('customText', emailText);
      
      if (pdfFile) {
        formData.append('file', pdfFile);
      }

      let url: string;
      if (type === 'sauda' && entityId) {
        url = `${API_BASE_URL}/saudas/${entityId}/send-via-email`;
      } else if (type === 'payment-advice' && paymentAdviceData) {
        url = `${API_BASE_URL}/payment-advices/send-email`;
        formData.append('adviceNumber', paymentAdviceData.adviceNumber);
        formData.append('vendorName', paymentAdviceData.vendorName);
        formData.append('amount', floorNetPayable(paymentAdviceData.amount).toString());
        formData.append('date', paymentAdviceData.date);
        if (paymentAdviceData.bankDetails) {
          formData.append('bankDetails', JSON.stringify(paymentAdviceData.bankDetails));
        }
        if (!pdfFile && !pdfUrl) {
          throw new Error('PDF file is required for payment advice');
        }
        if (pdfFile) {
          formData.append('file', pdfFile);
        }
      } else {
        throw new Error('Invalid configuration');
      }

      const response = await authenticatedFetch(url, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        success('Email Sent', `Successfully sent to ${result.data.recipients.length} recipient(s)`);
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error(result.message || 'Failed to send email');
      }
    } catch (err: any) {
      showError('Send Failed', err.message);
    } finally {
      setSending(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!token) return;

    const validNumbers = sanitizePhoneList(
      whatsappNumbers.filter((n) => n.trim())
    );

    if (validNumbers.length === 0) {
      showError('Validation Error', 'Please enter at least one valid phone number');
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('whatsappNumbers', JSON.stringify(validNumbers));
      
      if (whatsappMessage) formData.append('customMessage', whatsappMessage);
      
      if (pdfFile) {
        formData.append('file', pdfFile);
      } else if (pdfUrl) {
        formData.append('pdfUrl', pdfUrl);
      }

      let url: string;
      if (type === 'sauda' && entityId) {
        url = `${API_BASE_URL}/saudas/${entityId}/send-via-whatsapp`;
      } else if (type === 'payment-advice' && paymentAdviceData) {
        url = `${API_BASE_URL}/payment-advices/send-whatsapp`;
        formData.append('adviceNumber', paymentAdviceData.adviceNumber);
        formData.append('vendorName', paymentAdviceData.vendorName);
        formData.append('amount', floorNetPayable(paymentAdviceData.amount).toString());
        formData.append('date', paymentAdviceData.date);
        if (!pdfFile && !pdfUrl) {
          throw new Error('PDF file or URL is required for payment advice');
        }
        if (pdfFile) {
          formData.append('file', pdfFile);
        } else if (pdfUrl) {
          formData.append('pdfUrl', pdfUrl);
        }
      } else {
        throw new Error('Invalid configuration');
      }

      const response = await authenticatedFetch(url, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        const summary = result.data.summary || { success: result.data.results?.length || 0, total: validNumbers.length };
        if (summary.failed > 0) {
          showError(
            'Partial Success',
            `Sent to ${summary.success} of ${summary.total} recipients. Some numbers may not be registered on WhatsApp.`
          );
        } else {
          success('WhatsApp Sent', `Successfully sent to ${summary.success} recipient(s)`);
        }
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error(result.message || 'Failed to send WhatsApp');
      }
    } catch (err: any) {
      showError('Send Failed', err.message);
    } finally {
      setSending(false);
    }
  };

  const addEmail = () => setEmails([...emails, '']);
  const removeEmail = (index: number) => {
    const updated = emails.filter((_, i) => i !== index);
    setEmails(updated.length > 0 ? updated : ['']);
  };

  const addWhatsApp = () => setWhatsappNumbers([...whatsappNumbers, '']);
  const removeWhatsApp = (index: number) => {
    const updated = whatsappNumbers.filter((_, i) => i !== index);
    setWhatsappNumbers(updated.length > 0 ? updated : ['']);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] max-h-[90vh] overflow-y-auto">
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl sm:text-2xl font-semibold">
                Send Notification
              </Dialog.Title>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab Selector */}
            <div className="flex gap-2 mb-6 border-b border-border">
              <button
                onClick={() => setActiveTab('email')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-all ${
                  activeTab === 'email'
                    ? 'border-b-2 border-red-500 text-red-600 dark:text-red-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Mail className="h-5 w-5" />
                Email
              </button>
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-all ${
                  activeTab === 'whatsapp'
                    ? 'border-b-2 border-green-500 text-green-600 dark:text-green-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageCircle className="h-5 w-5" />
                WhatsApp
              </button>
            </div>

            {loadingPreview ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                {/* Email Tab */}
                {activeTab === 'email' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Recipients</label>
                      <div className="space-y-2">
                        {emails.map((email, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => {
                                const updated = [...emails];
                                updated[index] = e.target.value;
                                setEmails(updated);
                              }}
                              placeholder="vendor@example.com"
                              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background"
                            />
                            {emails.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeEmail(index)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addEmail}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Add Email
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Subject</label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium">Email Body Preview</label>
                        <button
                          type="button"
                          onClick={() => setShowHtmlEditor(!showHtmlEditor)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {showHtmlEditor ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {showHtmlEditor ? 'Hide HTML' : 'Edit HTML'}
                        </button>
                      </div>
                      {showHtmlEditor ? (
                        <textarea
                          value={emailHtml}
                          onChange={(e) => setEmailHtml(e.target.value)}
                          rows={12}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background font-mono text-xs"
                        />
                      ) : (
                        <div
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background min-h-[200px] max-h-[400px] overflow-y-auto"
                          dangerouslySetInnerHTML={{ __html: emailHtml }}
                        />
                      )}
                    </div>

                    <button
                      onClick={handleSendEmail}
                      disabled={sending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          Send Email
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* WhatsApp Tab */}
                {activeTab === 'whatsapp' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Recipients</label>
                      <div className="space-y-2">
                        {whatsappNumbers.map((number, index) => (
                          <div key={index} className="flex gap-2">
                            <PhoneInput
                              value={number}
                              onChange={(value) => {
                                const updated = [...whatsappNumbers];
                                updated[index] = value;
                                setWhatsappNumbers(updated);
                              }}
                              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background"
                            />
                            {whatsappNumbers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeWhatsApp(index)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addWhatsApp}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Add Number
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        10-digit numbers will be prefixed with 91 (India)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Message</label>
                      <textarea
                        value={whatsappMessage}
                        onChange={(e) => setWhatsappMessage(e.target.value)}
                        rows={12}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background font-mono text-sm"
                        placeholder="WhatsApp message will appear here..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Use *bold*, _italic_, ~strikethrough~, and ```code``` for formatting
                      </p>
                    </div>

                    <button
                      onClick={handleSendWhatsApp}
                      disabled={sending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          Send WhatsApp
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* PDF Attachment Info */}
                {(pdfFile || pdfUrl) && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {pdfFile ? `PDF attached: ${pdfFile.name}` : 'PDF will be attached from URL'}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

