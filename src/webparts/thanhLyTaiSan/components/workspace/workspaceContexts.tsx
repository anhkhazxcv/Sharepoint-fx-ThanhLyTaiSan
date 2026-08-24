import * as React from 'react';
import type { IAssetItem, ICartItem } from '../types';

export interface IWorkspaceCatalogContextValue {
  assets: IAssetItem[];
  cartItems: ICartItem[];
  refreshAssets: () => Promise<IAssetItem[]>;
  refreshCart: () => Promise<ICartItem[]>;
}

export const WorkspaceCatalogContext = React.createContext<IWorkspaceCatalogContextValue | undefined>(undefined);

export function useWorkspaceCatalog(): IWorkspaceCatalogContextValue {
  const context: IWorkspaceCatalogContextValue | undefined = React.useContext(WorkspaceCatalogContext);

  if (!context) {
    throw new Error('useWorkspaceCatalog must be used within WorkspaceCatalogContext.Provider');
  }

  return context;
}
