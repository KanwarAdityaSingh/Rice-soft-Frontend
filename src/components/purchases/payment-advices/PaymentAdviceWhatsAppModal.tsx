import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, Send, Loader2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '../../shared/Toast';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { PhoneInput } from '../../shared/PhoneInput';
import { sanitizePhoneList } from '../../../utils/validation';

interface PaymentAdviceWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentAdviceData: {
    adviceNumber: string;
    vendorName: string;
    amount: number;
    date: string;
  };
  onSuccess?: () => void;
}

export function PaymentAdviceWhatsAppModal({
  open,
  onOpenChange,
  paymentAdviceData,
  onSuccess,
}: PaymentAdviceWhatsAppModalProps) {
  const token = localStorage.getItem('auth:token');
  const { success, error: showError } = useToast();
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // WhatsApp state
  const [whatsappNumbers, setWhatsappNumbers] = useState<string[]>(['']);
  const [whatsappMessage, setWhatsappMessage] = useState('');

  // Load preview when modal opens
  useEffect(() => {
    if (open && token) {
      loadPreview();
      setWhatsappNumbers(['']);
    }
  }, [open, paymentAdviceData, token]);

  const loadPreview = async () => {
    if (!token) return;

    setLoadingPreview(true);
    try {
      const preview = await paymentAdvicesAPI.getPaymentAdviceNotificationPreview(paymentAdviceData);
      if (preview?.whatsapp) {
        setWhatsappMessage(preview.whatsapp.message || '');
      } else {
        throw new Error('No WhatsApp preview data received');
      }
    } catch (err: any) {
      console.error('Preview load error:', err);
      showError('Failed to load preview', err.message || 'Please try again');
    } finally {
      setLoadingPreview(false);
    }
  };

  const generatePDF = async (): Promise<File | null> => {
    if (!previewRef.current) return null;

    try {
      const printContent = previewRef.current.innerHTML;
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Advice - ${paymentAdviceData.adviceNumber}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Courier New', monospace; padding: 20px; background: white; color: black; font-size: 11px; }
              .preview-container { max-width: 700px; margin: 0 auto; border: 2px solid #333; padding: 15px; }
            </style>
          </head>
          <body>
            <div class="preview-container">${printContent}</div>
          </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      return new File([blob], `payment-advice-${paymentAdviceData.adviceNumber}.html`, { type: 'text/html' });
    } catch (error) {
      console.error('PDF generation error:', error);
      return null;
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
      // Generate PDF from preview
      const pdfFile = await generatePDF();
      
      if (!pdfFile) {
        throw new Error('Failed to generate PDF');
      }

      const result = await paymentAdvicesAPI.sendPaymentAdviceWhatsApp({
        whatsappNumbers: validNumbers,
        adviceNumber: paymentAdviceData.adviceNumber,
        vendorName: paymentAdviceData.vendorName,
        amount: paymentAdviceData.amount,
        date: paymentAdviceData.date,
        file: pdfFile,
      });

      const summary = result.summary || { success: result.results?.length || 0, total: validNumbers.length, failed: 0 };
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
    } catch (err: any) {
      showError('Send Failed', err.message);
    } finally {
      setSending(false);
    }
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
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-5xl translate-x-[-50%] translate-y-[-50%] max-h-[90vh] flex flex-col overflow-hidden">
          <div className="glass rounded-xl sm:rounded-2xl shadow-2xl flex flex-col h-full max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-500/10 rounded-xl">
                  <MessageCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <Dialog.Title className="text-xl sm:text-2xl font-bold">Send Payment Advice via WhatsApp</Dialog.Title>
                  <p className="text-sm text-muted-foreground mt-0.5">Preview and edit your message before sending</p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
              {loadingPreview ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <LoadingSpinner />
                  <p className="text-sm text-muted-foreground mt-4">Loading preview...</p>
                </div>
              ) : !whatsappMessage ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
                  <p className="text-sm text-muted-foreground">No preview available</p>
                  <p className="text-xs text-muted-foreground mt-1">Please try again or contact support</p>
                </div>
              ) : (
                <>
                  {/* Recipients Section */}
                  <div className="bg-muted/30 rounded-xl p-5 border border-border/50">
                    <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Recipients <span className="text-red-500">*</span>
                    </label>
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
                            className="flex-1 px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                          {whatsappNumbers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeWhatsApp(index)}
                              className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addWhatsApp}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        Add Number
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      10-digit numbers will be prefixed with 91 (India)
                    </p>
                  </div>

                  {/* Message Preview Section */}
                  <div className="bg-muted/30 rounded-xl p-5 border border-border/50">
                    <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp Message
                    </label>
                    <div className="relative">
                      <textarea
                        value={whatsappMessage}
                        onChange={(e) => setWhatsappMessage(e.target.value)}
                        rows={20}
                        className="w-full px-4 py-3 border border-border rounded-lg bg-background font-mono text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none overflow-y-auto"
                        style={{
                          minHeight: '400px',
                          maxHeight: '600px',
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word',
                          whiteSpace: 'pre-wrap',
                        }}
                        placeholder="WhatsApp message will appear here..."
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Use *bold*, _italic_, ~strikethrough~, and ```code``` for formatting
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      📄 PDF will be automatically generated from the preview content
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border/50 bg-muted/20">
              <button
                onClick={handleSendWhatsApp}
                disabled={sending || loadingPreview || !whatsappMessage}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
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
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
