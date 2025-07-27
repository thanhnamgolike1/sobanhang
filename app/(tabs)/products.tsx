import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { AddProductModal } from '../add-product';

interface Product {
  name: string;
  price: number;
  image?: string;
}

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const navigation = useNavigation();

  const fetchProducts = async () => {
    const stored = await AsyncStorage.getItem('products');
    if (stored) {
      setProducts(JSON.parse(stored));
    } else {
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setAddModalVisible(true)}
          style={{ marginRight: 16 }}
          accessibilityLabel="Thêm sản phẩm"
        >
          <Ionicons name="add-circle-outline" size={28} color="#007AFF" />
        </Pressable>
      ),
      title: 'Sản phẩm',
    });
  }, [navigation]);

  const handleDelete = (name: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa sản phẩm này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          const stored = await AsyncStorage.getItem('products');
          let products = stored ? JSON.parse(stored) : [];
          products = products.filter((p: Product) => p.name !== name);
          await AsyncStorage.setItem('products', JSON.stringify(products));
          fetchProducts();
        }
      }
    ]);
  };

  const handleEdit = (product: Product) => {
    setEditProduct(product);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Danh sách sản phẩm</Text>
      <FlatList
        data={products}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            {item.image && <Image source={{ uri: item.image }} style={styles.image} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.price}>{item.price.toLocaleString()} đ</Text>
            </View>
            <Pressable onPress={() => handleEdit(item)} style={styles.iconBtn} accessibilityLabel="Sửa sản phẩm">
              <Ionicons name="create-outline" size={22} color="#007AFF" />
            </Pressable>
            <Pressable onPress={() => handleDelete(item.name)} style={styles.iconBtn} accessibilityLabel="Xóa sản phẩm">
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text>Chưa có sản phẩm nào.</Text>}
      />
      <AddProductModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdded={fetchProducts}
      />
      {editProduct && (
        <AddProductModal
          visible={!!editProduct}
          onClose={() => setEditProduct(null)}
          onAdded={() => { setEditProduct(null); fetchProducts(); }}
          initialProduct={editProduct}
          isEdit
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    alignSelf: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  image: {
    width: 60,
    height: 45,
    borderRadius: 6,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  price: {
    fontSize: 15,
    color: '#444',
    marginTop: 2,
  },
  iconBtn: {
    padding: 6,
    marginLeft: 4,
  },
}); 