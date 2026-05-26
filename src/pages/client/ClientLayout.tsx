import React from 'react';
import GuestLayout from '../../mainComponents/GuestLayout';
import { signOutClient, type ClientUser } from '../../services/clients/client.auth';

interface ClientLayoutProps {
  clientUser: ClientUser;
  children: React.ReactNode;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ clientUser, children }) => (
  <GuestLayout
    guestUser={{ name: clientUser.name, email: clientUser.email, role: 'Client' }}
    onSignOut={signOutClient}
  >
    {children}
  </GuestLayout>
);

export default ClientLayout;