import React, { useState } from 'react';
import { 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  View, 
  Text, 
  TouchableWithoutFeedback 
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
// 1. IMPORTAR O HOOK DE NAVEGAÇÃO
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { COMPANY_COLORS } from '../../theme/theme';

export function HamburgerButton() {
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();

  const handleNavigate = (screenName: string) => {
    setModalVisible(false);
    navigation.navigate(screenName);
  };

  const handleLogout = async () => {
    setModalVisible(false);
    await signOut();
  };

  return (
    <View>
      {/* BOTÃO DA TELA */}
      <TouchableOpacity 
        style={styles.hamburgerMenu} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="menu" size={26} color="#FFF" />
      </TouchableOpacity>

      {/* MENU MODAL */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            
            <TouchableWithoutFeedback>
              <View style={styles.menuContainer}>
                
                {/* TOPO DO MENU */}
                <View style={styles.menuHeader}>
                  <View>
                    <Text style={styles.menuTitle}>Menu</Text>
                    {user?.nome ? (
                      <Text style={styles.menuSubtitle}>{user.nome}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={28} color="#333" />
                  </TouchableOpacity>
                </View>

                {/* OPÇÕES DO MENU */}
                <View style={styles.menuItems}>

                  <TouchableOpacity
                    style={styles.menuOption}
                    onPress={() => handleNavigate('Home')}
                  >
                    <Feather name="home" size={20} color={COMPANY_COLORS.primary} />
                    <Text style={styles.menuOptionText}>Início</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.menuOption} 
                    onPress={() => handleNavigate('Quiosque')}
                  >
                    <Feather name="box" size={20} color={COMPANY_COLORS.primary} />
                    <Text style={styles.menuOptionText}>Quiosques</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuOption}
                    onPress={() => handleNavigate('Pdv')}
                  >
                    <Feather name="shopping-cart" size={20} color={COMPANY_COLORS.primary} />
                    <Text style={styles.menuOptionText}>PDV</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuOption}
                    onPress={() => handleNavigate('Relatorios')}
                  >
                    <Feather name="file-text" size={20} color={COMPANY_COLORS.primary} />
                    <Text style={styles.menuOptionText}>Relatórios</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuOption}
                    onPress={() => handleNavigate('Enderecos')}
                  >
                    <Feather name="map-pin" size={20} color={COMPANY_COLORS.primary} />
                    <Text style={styles.menuOptionText}>Endereços</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuOption}
                    onPress={() => handleNavigate('Configuracoes')}
                  >
                    <Feather name="settings" size={20} color={COMPANY_COLORS.primary} />
                    <Text style={styles.menuOptionText}>Configurações</Text>
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity style={styles.menuOption} onPress={handleLogout}>
                    <Feather name="log-out" size={20} color="red" />
                    <Text style={[styles.menuOptionText, styles.logoutText]}>Sair</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </TouchableWithoutFeedback>

          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  hamburgerMenu: {
    width: 32,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
  },
  menuContainer: {
    width: '70%',
    height: '100%',
    backgroundColor: '#FFF',
    paddingTop: 50,
    paddingHorizontal: 20,
    elevation: 5,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    paddingBottom: 15,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  menuItems: {
    flex: 1,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  menuOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    fontWeight: '500',
  },
  logoutText: {
    color: 'red',
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 15,
  },
});
