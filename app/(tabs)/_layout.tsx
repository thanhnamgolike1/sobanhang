import { Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, View, Modal, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AddProductModal } from '../add-product';
import ProductsScreen from './products';

type SettingsMenuProps = {
  visible: boolean;
  onClose: () => void;
  onAddProduct: () => void;
  color: string;
};

function SettingsMenu({ visible, onClose, onAddProduct, color }: SettingsMenuProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose}>
        <View style={{ position: 'absolute', top: 50, right: 16, backgroundColor: '#fff', borderRadius: 8, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, paddingVertical: 8, minWidth: 160 }}>
          <TouchableOpacity onPress={onAddProduct} style={{ padding: 12 }}>
            <Text style={{ color: '#111', fontWeight: 'bold' }}>Thêm sản phẩm</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: true,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              position: 'absolute',
            },
            default: {},
          }),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: 'Sản phẩm',
            tabBarIcon: ({ color }) => <Ionicons name="pricetags-outline" size={24} color={color} />,
            headerRight: () => (
              <Pressable
                onPress={() => setMenuVisible(true)}
                style={{ marginRight: 16 }}
                accessibilityLabel="Thêm sản phẩm"
              >
                <Ionicons name="add-circle-outline" size={28} color={Colors[colorScheme ?? 'light'].tint} />
              </Pressable>
            ),
          }}
        />
      </Tabs>
      <SettingsMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onAddProduct={() => {
          setMenuVisible(false);
          router.push('../add-product');
        }}
        color={Colors[colorScheme ?? 'light'].tint}
      />
    </>
  );
}
