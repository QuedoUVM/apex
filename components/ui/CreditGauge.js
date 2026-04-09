import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fontSizes } from '../../styles/theme';

const SIZE   = 200;
const STROKE = 16;
const HALF   = SIZE / 2;

function barColor(value, colors) {
  if (value >= 750) return colors.success;
  if (value >= 650) return colors.accent;
  if (value >= 550) return colors.warning;
  return colors.danger;
}

function scoreLabel(value) {
  if (value >= 750) return 'Excelente';
  if (value >= 650) return 'Bueno';
  if (value >= 550) return 'Regular';
  return 'Bajo';
}

/**
 * Gauge semicircular de puntaje crediticio sin librerías SVG.
 * @param {{ value, min, max, delta }} props
 */
export default function CreditGauge({ value, min = 400, max = 850, delta = 0 }) {
  const { colors } = useTheme();

  const pct   = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const bar   = barColor(value, colors);
  const label = scoreLabel(value);

  // Ángulos del arco (técnica dos mitades + overflow:hidden + rotación)
  const leftAngle  = pct <= 0.5 ? (pct * 2 - 1) * 90 : 0;
  const rightAngle = pct >  0.5 ? (2 - pct * 2) * 90 : 90;

  return (
    <View style={s.container}>
      {/* Gauge */}
      <View style={s.gaugeOuter}>
        {/* Pista gris */}
        <View style={[s.ring, { borderColor: colors.border }]} />

        {/* Mitad izquierda */}
        <View style={s.halfLeft}>
          <View style={[s.ring, { borderColor: bar, transform: [{ rotate: `${leftAngle}deg` }] }]} />
        </View>

        {/* Mitad derecha */}
        <View style={s.halfRight}>
          <View style={[s.ring, { borderColor: bar, right: 0, left: undefined, transform: [{ rotate: `${rightAngle}deg` }] }]} />
        </View>
      </View>

      {/* Texto central */}
      <View style={s.center}>
        <Text style={[s.labelTxt, { color: bar }]}>{label}</Text>
        <Text style={[s.score, { color: colors.text }]}>{value}</Text>
        <Text style={[s.delta, { color: delta >= 0 ? colors.success : colors.danger }]}>
          {delta >= 0 ? `+${delta} pts` : `${delta} pts`}
        </Text>
      </View>

      {/* Escala */}
      <View style={s.scale}>
        <Text style={[s.scaleTxt, { color: colors.textMuted }]}>{min}</Text>
        <Text style={[s.scaleTxt, { color: colors.textMuted }]}>{max}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { alignItems: 'center' },
  gaugeOuter: {
    width:    SIZE,
    height:   HALF + STROKE,
    overflow: 'hidden',
    position: 'relative',
  },
  ring: {
    position:     'absolute',
    width:        SIZE,
    height:       SIZE,
    borderRadius: HALF,
    borderWidth:  STROKE,
    left:         0,
    top:          0,
  },
  halfLeft: {
    position: 'absolute', left: 0, top: 0,
    width: HALF, height: SIZE, overflow: 'hidden',
  },
  halfRight: {
    position: 'absolute', right: 0, top: 0,
    width: HALF, height: SIZE, overflow: 'hidden',
  },
  center: {
    position:  'absolute',
    bottom:    STROKE + 4,
    alignItems: 'center',
  },
  labelTxt: { fontSize: fontSizes.sm, fontWeight: '600', marginBottom: 2 },
  score:    { fontSize: 52, fontWeight: '800', lineHeight: 56 },
  delta:    { fontSize: fontSizes.sm, fontWeight: '600' },
  scale: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    width:           SIZE - STROKE * 2,
    marginTop:       6,
  },
  scaleTxt: { fontSize: fontSizes.xs },
});
