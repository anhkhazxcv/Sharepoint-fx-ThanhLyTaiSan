import * as React from 'react';
import { createTheme, ThemeProvider } from '@fluentui/react';
import type { IThanhLyTaiSanProps } from './IThanhLyTaiSanProps';
import { OrderWorkspace } from './OrderWorkspace';
import { ToastProvider } from './ToastProvider';
import './magFonts';
import styles from './ThanhLyTaiSan.module.scss';

const magFluentTheme = createTheme({
  defaultFontStyle: {
    fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif"
  }
});

export default function ThanhLyTaiSan(props: IThanhLyTaiSanProps): React.ReactElement<IThanhLyTaiSanProps> {
  return (
    <ThemeProvider theme={magFluentTheme}>
      <ToastProvider>
        <section className={`${styles.thanhLyTaiSan} ${props.hasTeamsContext ? styles.teams : ''}`}>
          <OrderWorkspace
            userDisplayName={props.userDisplayName}
            userEmail={props.userEmail}
            spHttpClient={props.spHttpClient}
            siteUrl={props.siteUrl}
            powerAutomateEmailUrl={props.powerAutomateEmailUrl}
          />
        </section>
      </ToastProvider>
    </ThemeProvider>
  );
}
