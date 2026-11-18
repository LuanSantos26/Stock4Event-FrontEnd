import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { labelAcaoCliente } from '../../../services/marketplaceService';

const SUCCESS = '#1B7A4A';

interface Props {
  retirada: boolean;
  onPress: () => void;
  loading: boolean;
}

/**
 * Último passo do pedido, feito pelo cliente: confirma que recebeu (entrega)
 * ou que retirou (retirada). Aparece quando o pedido está em rota ou pronto para retirada.
 */
export function ConcluirEntregaButton({ retirada, onPress, loading }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>
        {retirada
          ? 'Já retirou os produtos? Conclua para finalizar o pedido.'
          : 'Já recebeu os produtos? Conclua para finalizar a entrega.'}
      </Text>
      <TouchableOpacity style={styles.button} onPress={onPress} disabled={loading} activeOpacity={0.85}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="checkmark-done-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.text}>{labelAcaoCliente(retirada)}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#E8F5EE',
  },
  hint: {
    color: '#24533A',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
    backgroundColor: SUCCESS,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
