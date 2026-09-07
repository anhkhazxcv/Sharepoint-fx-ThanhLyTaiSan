import * as React from 'react';
import { HashRouter } from 'react-router-dom';
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
          <HashRouter>
            <OrderWorkspace
              userDisplayName={props.userDisplayName}
              userEmail={props.userEmail}
              userPhotoUrl={props.userPhotoUrl}
              spHttpClient={props.spHttpClient}
              siteUrl={props.siteUrl}
              powerAutomateEmailUrl={props.powerAutomateEmailUrl}
            />
          </HashRouter>
        </section>
      </ToastProvider>
    </ThemeProvider>
  );
}
