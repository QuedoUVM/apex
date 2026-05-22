export const C = {
  bg:           '#0F0F1F',
  bgBase:       '#1A1A2E',
  bgViolet:     '#1C1040',
  surface:      'rgba(255,255,255,0.05)',
  surfaceHigh:  'rgba(255,255,255,0.09)',
  border:       'rgba(255,255,255,0.09)',
  purple:       '#6B5CE7',
  purpleLight:  'rgba(107,92,231,0.15)',
  green:        '#4ADE80',
  greenLight:   'rgba(74,222,128,0.15)',
  red:          '#F87171',
  redLight:     'rgba(248,113,113,0.12)',
  yellow:       '#FBBF24',
  yellowLight:  'rgba(251,191,36,0.12)',
  blue:         '#60A5FA',
  blueLight:    'rgba(96,165,250,0.12)',
  text:         '#EDEDEF',
  muted:        '#8A8F98',
  hairline:     'rgba(255,255,255,0.07)',
};

export const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
