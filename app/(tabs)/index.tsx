import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const NUM_COLUMNS = 3;
const SCREEN_WIDTH = Dimensions.get('window').width;
const HORIZONTAL_PADDING = 20;
const CARD_GAP = 10;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - HORIZONTAL_PADDING - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS);
const CARD_HEIGHT = 170;

interface Product {
  name: string;
  price: number;
  image?: string;
  qty?: number; // Add optional qty property
}

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<{ [name: string]: number }>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [bills, setBills] = useState<{ billId: string; dateTime: string; products: Product[] }[]>([]);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const router = useRouter();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ marginRight: 16 }}>
            <Ionicons name="settings-outline" size={28} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              fetchBills(setBills);
              setBillModalVisible(true);
            }}
            style={{ marginRight: 16 }}
          >
            <View>
              <Ionicons name="reader-outline" size={28} color="#007AFF" />
              {bills.length > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    backgroundColor: 'red',
                    borderRadius: 10,
                    width: 20,
                    height: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{bills.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      ),
      title: 'Danh sách sản phẩm',
    });
  }, [navigation, bills]);

  useFocusEffect(
    React.useCallback(() => {
      const fetchProducts = async () => {
        const stored = await AsyncStorage.getItem('products');
        if (stored) setProducts(JSON.parse(stored));
        else setProducts([]);
      };
      fetchProducts();
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      fetchBills(setBills);
    }, [])
  );

  // Load account info from AsyncStorage
  useEffect(() => {
    (async () => {
      const bankCode = await AsyncStorage.getItem('vietqr_bankCode');
      const accountNumber = await AsyncStorage.getItem('vietqr_accountNumber');
      const accountName = await AsyncStorage.getItem('vietqr_accountName');
      if (bankCode) setBankCode(bankCode);
      if (accountNumber) setAccountNumber(accountNumber);
      if (accountName) setAccountName(accountName);
    })();
  }, [modalVisible]);

  // Lấy danh sách ngân hàng khi mở modal
  useEffect(() => {
    if (modalVisible) {
      setLoadingBanks(true);
      fetch('https://api.vietqr.io/v2/banks')
        .then(res => res.json())
        .then(json => {
          if (json && json.data) setBanks(json.data);
        })
        .finally(() => setLoadingBanks(false));
    }
  }, [modalVisible]);

  // Khi chọn bank, cập nhật bankCode và selectedBank
  const onSelectBank = (bank: any) => {
    setBankCode(bank.code);
    setSelectedBank(bank);
    setShowBankModal(false);
  };

  // Khi mở modal, nếu đã có bankCode thì set selectedBank
  useEffect(() => {
    if (modalVisible && bankCode && banks.length > 0) {
      const bank = banks.find((b: any) => b.code === bankCode);
      setSelectedBank(bank);
    }
  }, [modalVisible, bankCode, banks]);

  const saveAccountInfo = async () => {
    await AsyncStorage.setItem('vietqr_bankCode', bankCode);
    await AsyncStorage.setItem('vietqr_accountNumber', accountNumber);
    await AsyncStorage.setItem('vietqr_accountName', accountName);
    await AsyncStorage.removeItem('qrCache');
    setModalVisible(false);
    Alert.alert('Thành công', 'Đã lưu tài khoản và làm mới cache QR code!');
  };

  const clearQrCache = async () => {
    await AsyncStorage.removeItem('qrCache');
    Alert.alert('Thành công', 'Đã xóa cache QR code!');
  };

  const handleIncrease = (name: string) => {
    setSelected(prev => {
      const next = { ...prev };
      next[name] = (next[name] || 0) + 1;
      return next;
    });
  };

  const handleDecrease = (name: string) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[name] > 1) {
        next[name] = next[name] - 1;
      } else {
        delete next[name];
      }
      return next;
    });
  };

  const total = products.reduce((sum, p) => sum + (selected[p.name] || 0) * p.price, 0);
  const selectedProducts = products.filter(p => selected[p.name]).map(p => ({ ...p, qty: selected[p.name] }));

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(_, idx) => idx.toString()}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: HORIZONTAL_PADDING / 2 }}
        renderItem={({ item }) => {
          const qty = selected[item.name] || 0;
          return (
            <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => handleIncrease(item.name)}>
              {item.image && <Image source={{ uri: item.image }} style={styles.cardImage} />}
              <View style={{ flex: 1, justifyContent: 'flex-end', width: '100%' }}>
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={(e) => { e.stopPropagation(); handleDecrease(item.name); }} disabled={qty === 0}>
                    <Ionicons name="remove-circle-outline" size={28} color={qty === 0 ? '#ccc' : '#FF3B30'} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={(e) => { e.stopPropagation(); handleIncrease(item.name); }}>
                    <Ionicons name="add-circle-outline" size={28} color="#007AFF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.cardPrice}>{item.price.toLocaleString()} đ</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        columnWrapperStyle={{ gap: CARD_GAP, marginBottom: CARD_GAP }}
        ListEmptyComponent={<Text>Chưa có sản phẩm nào.</Text>}
      />
      {total > 0 && (
        <View style={styles.checkoutBar}>
          <Text style={styles.checkoutText}>
            Tổng: <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>{total.toLocaleString()} đ</Text>
          </Text>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => router.push({ pathname: '/bill', params: { data: JSON.stringify(selectedProducts) } })}
          >
            <Text style={styles.checkoutBtnText}>Thanh toán</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Modal menu setting */}
      <Modal
        visible={menuVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={{ position: 'absolute', top: 80, right: 24, backgroundColor: '#fff', borderRadius: 12, padding: 16, minWidth: 220, elevation: 8 }}>
            <TouchableOpacity onPress={() => { setMenuVisible(false); setModalVisible(true); }} style={{ paddingVertical: 12 }}>
              <Text style={{ fontWeight: 'bold', color: '#007AFF', fontSize: 16 }}>Tài khoản thanh toán</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Modal cài đặt tài khoản thanh toán */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 320 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>Cài đặt tài khoản thanh toán</Text>
            <Text style={{ marginBottom: 6 }}>Ngân hàng</Text>
            <TouchableOpacity
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 10 }}
              onPress={() => setShowBankModal(true)}
              activeOpacity={0.7}
            >
              {selectedBank && selectedBank.logo && (
                <Image source={{ uri: selectedBank.logo }} style={{ width: 32, height: 32, marginRight: 8, borderRadius: 6 }} />
              )}
              <Text style={{ fontWeight: 'bold', color: selectedBank ? '#007AFF' : '#888' }}>
                {selectedBank ? (selectedBank.shortName || selectedBank.name) : 'Chọn ngân hàng'}
              </Text>
            </TouchableOpacity>
            {/* Modal chọn ngân hàng */}
            <Modal
              visible={showBankModal}
              animationType="slide"
              transparent
              onRequestClose={() => setShowBankModal(false)}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, width: 340, maxHeight: 500 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Chọn ngân hàng</Text>
                  {loadingBanks ? (
                    <ActivityIndicator size="large" color="#007AFF" />
                  ) : (
                    <FlatList
                      data={banks}
                      keyExtractor={item => item.code}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                          onPress={() => onSelectBank(item)}
                        >
                          {item.logo && <Image source={{ uri: item.logo }} style={{ width: 28, height: 28, marginRight: 10, borderRadius: 6 }} />}
                          <Text style={{ fontSize: 15 }}>{item.shortName || item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                  <TouchableOpacity onPress={() => setShowBankModal(false)} style={{ marginTop: 10, alignSelf: 'flex-end' }}>
                    <Text style={{ color: '#e74c3c', fontWeight: 'bold' }}>Đóng</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, padding: 8 }}
              placeholder="Số tài khoản"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="numeric"
            />
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 20, padding: 8 }}
              placeholder="Tên chủ tài khoản"
              value={accountName}
              onChangeText={setAccountName}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginRight: 16 }}>
                <Text style={{ color: '#888', fontWeight: 'bold' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveAccountInfo} style={{ marginRight: 16 }}>
                <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={billModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBillModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 320, maxHeight: '80%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>Danh sách hóa đơn</Text>
            <FlatList
              data={bills}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setBillModalVisible(false);
                    router.push({
                      pathname: '/bill',
                      params: {
                        billId: item.billId,
                        data: JSON.stringify(item.products),
                      },
                    });
                  }}
                  style={{ marginBottom: 10 }}
                >
                  <Text style={{ fontWeight: 'bold' }}>Mã HĐ: {item.billId}</Text>
                  <Text>Thời gian: {item.dateTime}</Text>
                  <Text>Tổng tiền: {item.products.reduce((sum, p) => sum + p.price * (p.qty || 1), 0).toLocaleString()} đ</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
            <TouchableOpacity onPress={() => setBillModalVisible(false)} style={{ marginTop: 20, alignSelf: 'flex-end' }}>
              <Text style={{ color: '#e74c3c', fontWeight: 'bold' }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    alignSelf: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: 'relative',
  },
  cardImage: {
    width: 100,
    height: 70,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#eee',
  },
  cardName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 2,
    color: '#222',
    textAlign: 'center',
  },
  cardPrice: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  qtyBtn: {
    paddingHorizontal: 2,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    minWidth: 28,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  checkoutBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  checkoutText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#222',
  },
  checkoutBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  checkoutBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export async function fetchBills(setBills: React.Dispatch<React.SetStateAction<any[]>>) {
  const storedBills = await AsyncStorage.getItem('incompleteBills');
  if (storedBills) {
    setBills(JSON.parse(storedBills));
  } else {
    setBills([]);
  }
}
