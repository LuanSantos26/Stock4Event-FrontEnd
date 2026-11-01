import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProductsProvider } from '../context/ProductsContext';
import { QuiosqueProvider } from '../context/QuiosqueContext';
import HomeScreen from '../screens/Home/HomeScreen';
import { QuiosqueScreen } from '../screens/Quiosque/QuiosqueScreen';
import { CartScreen } from '../screens/Cart/CartScreen';
import { CheckoutScreen } from '../screens/Checkout/CheckoutScreen';
import { SacolaScreen } from '../screens/Sacola/SacolaScreen';
import { PedidoAcompanhamentoScreen } from '../screens/PedidoAcompanhamento/PedidoAcompanhamentoScreen';
import { ConfiguracoesScreen } from '../screens/Configuracoes/ConfiguracoesScreen';
import { FormasPagamentoScreen } from '../screens/FormasPagamento/FormasPagamentoScreen';
import { DadosBancariosScreen } from '../screens/DadosBancarios/DadosBancariosScreen';
import { EnderecosScreen } from '../screens/Enderecos/EnderecosScreen';
import { ManageProductsScreen } from '../screens/ManageProducts/ManageProductsScreen';
import { CardsScreen } from '../screens/Cards/CardsScreen';
import { StoreVitrineScreen } from '../screens/StoreVitrine/StoreVitrineScreen';
import { ProductDetailScreen } from '../screens/ProductDetail/ProductDetailScreen';
import { EmpresaVendasScreen } from '../screens/EmpresaVendas/EmpresaVendasScreen';
import { EmpresaGraficosScreen } from '../screens/Graficos/Graficos';
import { CamioneirosScreen } from '../screens/Logistica/CamioneirosScreen';
import { CadastroCamioneirosScreen } from '../screens/Logistica/CadastroCamioneirosScreen';
import { LogisticaScreen } from '../screens/Logistica/LogisticaScreen';
import { ExplorarScreen } from '../screens/Explorar/ExplorarScreen';
import { ReservasScreen } from '../screens/Reservas/ReservasScreen';
import { PedidosScreen } from '../screens/Pedidos/PedidosScreen';
import { PerfilScreen } from '../screens/Perfil/PerfilScreen';
import { ClienteQuiosquesScreen } from '../screens/ClienteQuiosques/ClienteQuiosquesScreen';
import { ClienteQuiosqueFormScreen } from '../screens/ClienteQuiosques/ClienteQuiosqueFormScreen';
import { PdvScreen } from '../screens/Pdv/PdvScreen';
import { QuiosquesDisponiveisScreen } from '../screens/QuiosquesDisponiveis/QuiosquesDisponiveisScreen';
import { ExplorarListaScreen } from '../screens/ExplorarLista/ExplorarListaScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function MainNavigator() {
  return <ProductsProvider><QuiosqueProvider><Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Explorar" component={ExplorarScreen} />
    <Stack.Screen name="Reservas" component={ReservasScreen} />
    <Stack.Screen name="Pedidos" component={PedidosScreen} />
    <Stack.Screen name="Perfil" component={PerfilScreen} />
    <Stack.Screen name="Quiosque" component={QuiosqueScreen} />
    <Stack.Screen name="Configuracoes" component={ConfiguracoesScreen} />
    <Stack.Screen name="FormasPagamento" component={FormasPagamentoScreen} />
    <Stack.Screen name="DadosBancarios" component={DadosBancariosScreen} />
    <Stack.Screen name="Enderecos" component={EnderecosScreen} />
    <Stack.Screen name="AddItem" component={ManageProductsScreen} />
    <Stack.Screen name="Cart" component={CartScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
    <Stack.Screen name="Sacola" component={SacolaScreen} />
    <Stack.Screen name="PedidoAcompanhamento" component={PedidoAcompanhamentoScreen} />
    <Stack.Screen name="Cards" component={CardsScreen} />
    <Stack.Screen name="StoreVitrine" component={StoreVitrineScreen} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    <Stack.Screen name="EmpresaVendas" component={EmpresaVendasScreen} />
    <Stack.Screen name="EmpresaGraficos" component={EmpresaGraficosScreen} />
    <Stack.Screen name="Camioneiros" component={CamioneirosScreen} />
    <Stack.Screen name="CadastroCamioneiros" component={CadastroCamioneirosScreen} />
    <Stack.Screen name="Logistica" component={LogisticaScreen} />
    <Stack.Screen name="ClienteQuiosques" component={ClienteQuiosquesScreen} />
    <Stack.Screen name="ClienteQuiosqueForm" component={ClienteQuiosqueFormScreen} />
    <Stack.Screen name="Pdv" component={PdvScreen} />
    <Stack.Screen name="QuiosquesDisponiveis" component={QuiosquesDisponiveisScreen} />
    <Stack.Screen name="ExplorarLista" component={ExplorarListaScreen} />
  </Stack.Navigator></QuiosqueProvider></ProductsProvider>;
}
