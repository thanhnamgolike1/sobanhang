import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
const defaultProductImg = require('../assets/images/default-product.png');

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
  onAdded?: () => void;
  initialProduct?: { name: string; price: number; image?: string };
  isEdit?: boolean;
}

export function AddProductModal({ visible, onClose, onAdded, initialProduct, isEdit }: AddProductModalProps) {
  const [name, setName] = useState(initialProduct?.name || '');
  const [price, setPrice] = useState(initialProduct?.price?.toString() || '');
  const [image, setImage] = useState<string | null>(initialProduct?.image || null);

  React.useEffect(() => {
    if (visible) {
      setName(initialProduct?.name || '');
      setPrice(initialProduct?.price?.toString() || '');
      setImage(initialProduct?.image || null);
    }
  }, [visible, initialProduct]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  // Hàm format số có dấu phẩy
  function formatNumberInput(val: string) {
    // Xóa ký tự không phải số
    const raw = val.replace(/[^0-9]/g, '');
    if (!raw) return '';
    return parseInt(raw, 10).toLocaleString();
  }

  const saveProduct = async () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tên và giá bán');
      return;
    }
    try {
      const stored = await AsyncStorage.getItem('products');
      let products = stored ? JSON.parse(stored) : [];
      const nameLower = name.trim().toLowerCase();
      // Lấy giá trị số thực sự từ price (bỏ dấu phẩy, dấu chấm...)
      const priceNumber = parseInt(price.replace(/[^0-9]/g, ''), 10);
      const productImage = image || Image.resolveAssetSource(defaultProductImg).uri;
      if (isEdit && initialProduct) {
        // Sửa sản phẩm: không cho trùng tên với sản phẩm khác
        const isDuplicate = products.some((p: any) => p.name.trim().toLowerCase() === nameLower && p.name !== initialProduct.name);
        if (isDuplicate) {
          Alert.alert('Lỗi', 'Tên sản phẩm đã tồn tại!');
          return;
        }
        products = products.map((p: any) =>
          p.name === initialProduct.name ? { name, price: priceNumber, image: productImage } : p
        );
        await AsyncStorage.setItem('products', JSON.stringify(products));
        Alert.alert('Thành công', 'Đã cập nhật sản phẩm!');
      } else {
        // Thêm sản phẩm: không cho trùng tên
        const isDuplicate = products.some((p: any) => p.name.trim().toLowerCase() === nameLower);
        if (isDuplicate) {
          Alert.alert('Lỗi', 'Tên sản phẩm đã tồn tại!');
          return;
        }
        const newProduct = { name, price: priceNumber, image: productImage };
        products.push(newProduct);
        await AsyncStorage.setItem('products', JSON.stringify(products));
        Alert.alert('Thành công', 'Đã thêm sản phẩm!');
      }
      setName('');
      setPrice('');
      setImage(null);
      if (onAdded) onAdded();
      onClose();
    } catch (e) {
      Alert.alert('Lỗi', 'Không lưu được sản phẩm');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>{isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Tên sản phẩm"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#aaa"
          />
          <TextInput
            style={styles.input}
            placeholder="Giá bán"
            value={price}
            onChangeText={val => setPrice(formatNumberInput(val))}
            keyboardType="numeric"
            placeholderTextColor="#aaa"
          />
          <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
            <Text style={styles.imageBtnText}>{image ? 'Đổi ảnh' : 'Chọn ảnh'}</Text>
          </TouchableOpacity>
          {image && <Image source={{ uri: image }} style={styles.image} />}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.saveBtn} onPress={saveProduct}>
              <Text style={styles.saveBtnText}>{isEdit ? 'Lưu thay đổi' : 'Lưu sản phẩm'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#222',
    alignSelf: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    fontSize: 16,
    backgroundColor: '#fafbfc',
    color: '#222',
  },
  imageBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  imageBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  image: {
    width: 180,
    height: 135,
    marginVertical: 14,
    borderRadius: 10,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 18,
    gap: 12,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 4,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeBtn: {
    flex: 1,
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 4,
  },
  closeBtnText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 