import type { SPHttpClient } from '@microsoft/sp-http';

export interface IThanhLyTaiSanProps {
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
  userEmail: string;
  spHttpClient: SPHttpClient;
  siteUrl: string;
  powerAutomateEmailUrl?: string;
}
