import { useState } from 'react';
import { Users, Store, Briefcase, UserCircle, Plus } from 'lucide-react';
import { UsersTable } from '../../components/admin/users/UsersTable';
import { VendorsTable } from '../../components/admin/vendors/VendorsTable';
import { SalesmenTable } from '../../components/admin/salesmen/SalesmenTable';
import { BrokersTable } from '../../components/admin/brokers/BrokersTable';
import { UserFormModal } from '../../components/admin/users/UserFormModal';
import { SalesmanFormModal } from '../../components/admin/salesmen/SalesmanFormModal';
import { VendorFormModal } from '../../components/admin/vendors/VendorFormModal';
import { BrokerFormModal } from '../../components/admin/brokers/BrokerFormModal';

export default function ManageUsers() {
  const [activeTab, setActiveTab] = useState<'users' | 'vendors' | 'salesmen' | 'brokers'>('users');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [salesmanModalOpen, setSalesmanModalOpen] = useState(false);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [brokerModalOpen, setBrokerModalOpen] = useState(false);

  const tabs = [
    { id: 'users' as const, label: 'Users', icon: Users },
    { id: 'vendors' as const, label: 'Vendors', icon: Store },
    { id: 'salesmen' as const, label: 'Salesmen', icon: Briefcase },
    { id: 'brokers' as const, label: 'Brokers', icon: UserCircle },
  ];

  return (
    <div className="container mx-auto py-10 space-y-8">
      <header className="hero-bg rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-bold"><span className="text-gradient">User Management</span></h1>
          <p className="mt-2 text-muted-foreground">Manage users, vendors, salesmen, and brokers</p>
        </div>
      </header>

      {/* Tabs and Create Button */}
      <div className="flex items-center justify-between">
      <div className="flex gap-2 rounded-2xl card-glow p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 font-medium transition-colors relative border ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/40'
              }`}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary/50 rounded-full" />
              )}
            </button>
            );
        })}
      </div>
      
      <button
        onClick={() => {
          if (activeTab === 'users') setUserModalOpen(true);
          if (activeTab === 'salesmen') setSalesmanModalOpen(true);
          if (activeTab === 'vendors') setVendorModalOpen(true);
          if (activeTab === 'brokers') setBrokerModalOpen(true);
        }}
        className="btn-primary flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add New
      </button>
      </div>

      {/* Tab Content */}
      <div className="card-glow rounded-2xl p-6 highlight-box">
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'vendors' && <VendorsTab />}
        {activeTab === 'salesmen' && <SalesmenTab />}
        {activeTab === 'brokers' && <BrokersTab />}
      </div>

      {/* Modals */}
      <UserFormModal open={userModalOpen} onOpenChange={setUserModalOpen} />
      <SalesmanFormModal open={salesmanModalOpen} onOpenChange={setSalesmanModalOpen} />
      <VendorFormModal open={vendorModalOpen} onOpenChange={setVendorModalOpen} />
      <BrokerFormModal open={brokerModalOpen} onOpenChange={setBrokerModalOpen} />
    </div>
  );
}

function UsersTab() {
  return <UsersTable />;
}

function VendorsTab() {
  return <VendorsTable />;
}

function SalesmenTab() {
  return <SalesmenTable />;
}

function BrokersTab() {
  return <BrokersTable />;
}

