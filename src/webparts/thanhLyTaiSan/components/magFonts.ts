import latin400 from './fonts/IBMPlexSans-latin-400.woff2';
import latin500 from './fonts/IBMPlexSans-latin-500.woff2';
import latin600 from './fonts/IBMPlexSans-latin-600.woff2';
import latin700 from './fonts/IBMPlexSans-latin-700.woff2';
import vietnamese400 from './fonts/IBMPlexSans-vietnamese-400.woff2';
import vietnamese500 from './fonts/IBMPlexSans-vietnamese-500.woff2';
import vietnamese600 from './fonts/IBMPlexSans-vietnamese-600.woff2';
import vietnamese700 from './fonts/IBMPlexSans-vietnamese-700.woff2';

const VIETNAMESE_UNICODE_RANGE: string =
  'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, ' +
  'U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB';

const LATIN_UNICODE_RANGE: string =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, ' +
  'U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

function buildFontFaceRule(weight: number, latinUrl: string, vietnameseUrl: string): string {
  return (
    "@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:" +
    String(weight) +
    ';font-display:swap;src:url(' +
    vietnameseUrl +
    ") format('woff2');unicode-range:" +
    VIETNAMESE_UNICODE_RANGE +
    '}' +
    "@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:" +
    String(weight) +
    ';font-display:swap;src:url(' +
    latinUrl +
    ") format('woff2');unicode-range:" +
    LATIN_UNICODE_RANGE +
    '}'
  );
}

const MAG_FONT_FACE_CSS: string = [
  buildFontFaceRule(400, latin400, vietnamese400),
  buildFontFaceRule(500, latin500, vietnamese500),
  buildFontFaceRule(600, latin600, vietnamese600),
  buildFontFaceRule(700, latin700, vietnamese700)
].join('');

const MAG_FONT_STYLE_ID: string = 'mag-ibm-plex-sans';

export function ensureMagFontsLoaded(): void {
  if (typeof document === 'undefined' || document.getElementById(MAG_FONT_STYLE_ID)) {
    return;
  }

  const styleElement: HTMLStyleElement = document.createElement('style');
  styleElement.id = MAG_FONT_STYLE_ID;
  styleElement.textContent = MAG_FONT_FACE_CSS;
  document.head.appendChild(styleElement);
}

ensureMagFontsLoaded();
