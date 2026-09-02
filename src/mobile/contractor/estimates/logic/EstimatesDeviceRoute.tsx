import React from 'react';
import { useIsMobile } from './useIsMobile';

interface EstimatesDeviceRouteProps {
  mobile: React.ReactNode;
  desktop: React.ReactNode;
}

const EstimatesDeviceRoute: React.FC<EstimatesDeviceRouteProps> = ({ mobile, desktop }) => {
  const isMobile = useIsMobile();
  return <>{isMobile ? mobile : desktop}</>;
};

export default EstimatesDeviceRoute;
