import React from 'react';
import GeneralTab from './GeneralTab';
import SKUTab from './SKUTab';
import StockTab from './StockTab';
import PriceTab from './PriceTab';
import HistoryTab from './HistoryTab';
import ImageTab from './ImageTab';

// Memoize each tab component to prevent unnecessary re-renders
export const MemoizedGeneralTab = React.memo(GeneralTab, (prevProps, nextProps) => {
  return prevProps.disabled === nextProps.disabled;
});

export const MemoizedSKUTab = React.memo(SKUTab, (prevProps, nextProps) => {
  return prevProps.disabled === nextProps.disabled;
});

export const MemoizedStockTab = React.memo(StockTab, (prevProps, nextProps) => {
  return prevProps.disabled === nextProps.disabled;
});

export const MemoizedPriceTab = React.memo(PriceTab, (prevProps, nextProps) => {
  return prevProps.disabled === nextProps.disabled;
});

export const MemoizedHistoryTab = React.memo(HistoryTab, (prevProps, nextProps) => {
  return prevProps.disabled === nextProps.disabled;
});

export const MemoizedImageTab = React.memo(ImageTab, (prevProps, nextProps) => {
  return prevProps.disabled === nextProps.disabled;
});

// Display names for debugging
MemoizedGeneralTab.displayName = 'MemoizedGeneralTab';
MemoizedSKUTab.displayName = 'MemoizedSKUTab';
MemoizedStockTab.displayName = 'MemoizedStockTab';
MemoizedPriceTab.displayName = 'MemoizedPriceTab';
MemoizedHistoryTab.displayName = 'MemoizedHistoryTab';
MemoizedImageTab.displayName = 'MemorizedImageTab';