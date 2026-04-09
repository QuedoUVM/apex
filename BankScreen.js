import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
} from 'react-native';
import styles from './styles';

const movimientosIniciales = [
  { id: '1', desc: 'Netflix', monto: '-$199', fecha: '03 Mar' },
  { id: '2', desc: 'Nómina', monto: '+$8,500', fecha: '01 Mar' },
  { id: '3', desc: 'Alexis haz mi tarea', monto: '-$340', fecha: '28 Feb' },
  { id: '4', desc: 'Transferencia recibida', monto: '+$1,200', fecha: '25 Feb' },
];

export default function BankScreen({ onLogout }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [monto, setMonto] = useState('');
  const [destino, setDestino] = useState('');
  const [lista, setLista] = useState(movimientosIniciales);

  const enviar = () => {
    if (monto.trim() === '' || destino.trim() === '') return;
    setLista([
      { id: Date.now().toString(), desc: `A: ${destino}`, monto: `-$${monto}`, fecha: 'Hoy' },
      ...lista,
    ]);
    setMonto('');
    setDestino('');
    setModalVisible(false);
  };

  return (
    <View style={styles.bankFondo}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.bankHeader}>
        <View>
          <Text style={styles.bankSaludo}>Hola, Juan Pablo 👋</Text>
          <Text style={styles.bankNombre}>BancoApp</Text>
        </View>
        <TouchableOpacity style={styles.bankLogoutBtn} onPress={onLogout}>
          <Text style={styles.bankLogoutTxt}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Tarjeta de saldo */}
      <View style={styles.bankCard}>
        <Text style={styles.bankCardLabel}>Saldo disponible</Text>
        <Text style={styles.bankCardSaldo}>$24,380.00</Text>
        <Text style={styles.bankCardNum}>**** **** **** 4821</Text>
        <View style={styles.bankCardRow}>
          <TouchableOpacity style={styles.bankCardBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.bankCardBtnTxt}>Transferir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bankCardBtnSecundario}>
            <Text style={styles.bankCardBtnTxt}>Depositar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Movimientos */}
      <Text style={styles.bankSeccion}>Movimientos recientes</Text>
      <FlatList
        data={lista}
        keyExtractor={(item) => item.id}
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.bankMovRow}>
            <View>
              <Text style={styles.bankMovDesc}>{item.desc}</Text>
              <Text style={styles.bankMovFecha}>{item.fecha}</Text>
            </View>
            <Text style={item.monto.startsWith('+') ? styles.bankMovMontoPos : styles.bankMovMontoNeg}>
              {item.monto}
            </Text>
          </View>
        )}
      />

      {/* Modal transferencia */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBottom}>
          <View style={styles.modalCard}>
            <Text style={styles.tituloModal}>Nueva transferencia</Text>

            <Text style={styles.modalLabel}>Destino</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre o cuenta"
              placeholderTextColor="#aaa"
              value={destino}
              onChangeText={setDestino}
            />

            <Text style={styles.modalLabel}>Monto ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={monto}
              onChangeText={setMonto}
            />

            <TouchableOpacity style={styles.boton} onPress={enviar}>
              <Text style={styles.botonTexto}>Enviar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cerrar} onPress={() => setModalVisible(false)}>
              <Text style={styles.cerrarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}