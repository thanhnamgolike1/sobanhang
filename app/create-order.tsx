import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const NUM_COLUMNS = 3;
const SCREEN_WIDTH = Dimensions.get('window').width;
const HORIZONTAL_PADDING = 20; // tổng padding ngang của container
const CARD_GAP = 10; // khoảng cách giữa các card
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - HORIZONTAL_PADDING - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS);
const CARD_HEIGHT = 170;

interface Product {
  name: string;
  price: number;
  image?: string;
}

export default function CreateOrderScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<{ [name: string]: number }>({});
  const router = useRouter();

  useEffect(() => {
    const fetchProducts = async () => {
      const stored = await AsyncStorage.getItem('products');
      if (stored) setProducts(JSON.parse(stored));
    };
    fetchProducts();
  }, []);

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
              <Image source={{ uri: item.image }} style={styles.cardImage} />
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
          <Text style={styles.checkoutText}>Tổng: <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>{total.toLocaleString()} đ</Text></Text>
          <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.push({ pathname: '/bill', params: { data: JSON.stringify(selectedProducts) } })}>
            <Text style={styles.checkoutBtnText}>Thanh toán</Text>
          </TouchableOpacity>
        </View>
      )}
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
