import { C } from './theme';

export const DEFAULT = {
  paymentHistory: 90,
  utilization: 30,
  creditAge: 3,
  creditTypes: 2,
  newApplications: 1,
};

export const FIELDS = [
  { key: 'paymentHistory',  label: 'Historial de pagos',        unit: '%',    min: 0, max: 100, tip: '% de pagos realizados a tiempo en tu historial' },
  { key: 'utilization',     label: 'Utilización de crédito',    unit: '%',    min: 0, max: 100, tip: '% del límite de crédito que usas actualmente (ideal: <30%)' },
  { key: 'creditAge',       label: 'Antigüedad crediticia',     unit: ' años', min: 0, max: 30,  tip: 'Años desde tu primera cuenta de crédito' },
  { key: 'creditTypes',     label: 'Tipos de crédito',          unit: '',     min: 0, max: 5,   tip: 'N° de tipos diferentes: tarjeta, auto, hipoteca, etc.' },
  { key: 'newApplications', label: 'Nuevas solicitudes (12m)',  unit: '',     min: 0, max: 10,  tip: 'N° de veces que pediste crédito en los últimos 12 meses' },
];

export function calcScore(p) {
  if (!p) return null;
  const raw =
    0.35 * (Math.min(Math.max(p.paymentHistory, 0), 100) / 100) +
    0.30 * (1 - Math.min(Math.max(p.utilization, 0), 100) / 100) +
    0.15 * (Math.min(Math.max(p.creditAge, 0), 30) / 30) +
    0.10 * (Math.min(Math.max(p.creditTypes, 0), 5) / 5) +
    0.10 * (1 - Math.min(Math.max(p.newApplications, 0), 10) / 10);
  return Math.round(400 + raw * 450);
}

export function scoreColor(s) {
  if (s < 580) return C.red;
  if (s < 650) return '#FB923C';
  if (s < 700) return C.yellow;
  if (s < 750) return '#A3E635';
  return C.green;
}

export function scoreLabel(s) {
  if (s < 580) return 'Muy malo';
  if (s < 650) return 'Malo';
  if (s < 700) return 'Regular';
  if (s < 750) return 'Bueno';
  if (s < 800) return 'Muy bueno';
  return 'Excelente';
}

export function scoreAdvice(s) {
  if (s < 580) return 'Enfócate en pagar a tiempo y reducir deudas existentes. Evita nuevas solicitudes de crédito.';
  if (s < 650) return 'Mantén tus pagos al corriente. Reduce la utilización de tarjetas por debajo del 30%.';
  if (s < 700) return 'Buen camino. Diversifica tus créditos y evita abrir muchas cuentas nuevas en poco tiempo.';
  if (s < 750) return 'Score sólido. Los bancos te ofrecerán mejores tasas. Sigue con tu historial positivo.';
  return '¡Excelente! Accedes a las mejores tasas del mercado. Bancos y SOFOMES te consideran cliente Premium.';
}
