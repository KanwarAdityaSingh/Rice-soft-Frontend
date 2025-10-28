import { 
  Phone, 
  Mail, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  User, 
  AlertCircle,
  TrendingUp,
  FileText,
  MessageSquare,
  Clock
} from 'lucide-react';

interface LeadEventIconProps {
  eventType: string;
  size?: number;
  className?: string;
}

export function LeadEventIcon({ eventType, size = 16, className = '' }: LeadEventIconProps) {
  const icons: Record<string, typeof Phone> = {
    created: FileText,
    status_changed: AlertCircle,
    assigned: User,
    note_added: MessageSquare,
    call_made: Phone,
    email_sent: Mail,
    meeting_scheduled: Calendar,
    meeting_completed: CheckCircle,
    quote_sent: FileText,
    converted: CheckCircle,
    rejected: XCircle,
    follow_up: Clock,
    priority_changed: AlertCircle,
    value_updated: TrendingUp,
    close_date_updated: Calendar,
  };

  const Icon = icons[eventType] || FileText;

  return <Icon size={size} className={className} />;
}

