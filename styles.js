import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({

  // ─── Compartidos ───────────────────────────────────────────
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
    width: '100%',
  },
  boton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 4,
    width: '100%',
  },
  botonTexto: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },

  // ─── Login (App.js) ────────────────────────────────────────
  loginFondo: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loginBlob: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#1d4ed8',
    opacity: 0.35,
  },
  loginContenido: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loginAppName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
    marginBottom: 4,
  },
  loginTagline: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 40,
  },
  loginCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  loginTitulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
  },
  loginLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  loginHint: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 11,
    marginTop: 14,
  },

  // ─── BankScreen ────────────────────────────────────────────
  bankFondo: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  bankHeader: {
    width: '100%',
    backgroundColor: '#0f172a',
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankSaludo: {
    color: '#94a3b8',
    fontSize: 13,
  },
  bankNombre: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  bankLogoutBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  bankLogoutTxt: {
    color: '#94a3b8',
    fontSize: 13,
  },
  bankCard: {
    backgroundColor: '#1d4ed8',
    width: '90%',
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  bankCardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  bankCardSaldo: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 6,
  },
  bankCardNum: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginBottom: 18,
  },
  bankCardRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bankCardBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  bankCardBtnSecundario: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  bankCardBtnTxt: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  bankSeccion: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginTop: 24,
    marginBottom: 10,
    fontWeight: 'bold',
    fontSize: 15,
    color: '#0f172a',
  },
  bankMovRow: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bankMovDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  bankMovFecha: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  bankMovMontoPos: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  bankMovMontoNeg: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ef4444',
  },

  // ─── Modal transferencia ───────────────────────────────────
  modalBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
  },
  tituloModal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  cerrar: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cerrarTexto: {
    color: '#94a3b8',
    fontSize: 14,
  },

  // ─── Legacy (no eliminar por compatibilidad) ───────────────
  imagen: {
    width: 100,
    height: 100,
    position: 'absolute',
    bottom: 0,
  },
  ventana: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
});

export default styles;