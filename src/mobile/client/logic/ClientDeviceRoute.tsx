import React from 'react';
import { useIsMobile } from './useIsMobile';

interface ClientDeviceRouteProps {
  mobile: React.ReactNode;
  desktop: React.ReactNode;
}

const ClientDeviceRoute: React.FC<ClientDeviceRouteProps> = ({ mobile, desktop }) => {
  const isMobile = useIsMobile();
  return <>{isMobile ? mobile : desktop}</>;
};

export default ClientDeviceRoute;
