import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, StatusBar, SafeAreaView, TouchableOpacity, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BillProduct {
  name: string;
  price: number;
  qty: number;
  image?: string;
}

export default function BillScreen() {
  const params = useLocalSearchParams();
  const data = params.data ? JSON.parse(params.data as string) as BillProduct[] : [];
  const total = data.reduce((sum, p) => sum + p.qty * p.price, 0);
  const [accountInfo, setAccountInfo] = useState({
    bankCode: '',
    accountNumber: '',
    accountName: '',
  });

  // State cho việc ẩn/hiện thanh toán và cache QR
  const [showPayment, setShowPayment] = useState(false);
  const [cachedQRUrl, setCachedQRUrl] = useState('');

  // Load account info từ AsyncStorage khi mở màn hình
  React.useEffect(() => {
    (async () => {
      const bankCode = await AsyncStorage.getItem('vietqr_bankCode');
      const accountNumber = await AsyncStorage.getItem('vietqr_accountNumber');
      const accountName = await AsyncStorage.getItem('vietqr_accountName');
      setAccountInfo({
        bankCode: bankCode || '970423',
        accountNumber: accountNumber || '0862435375',
        accountName: accountName || 'NGUYEN THANH NAM',
      });
    })();
  }, []);

  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Tạo URL VietQR và cache lại
  const generateVietQRUrl = () => {
    // Nếu đã có cache thì return luôn
    if (cachedQRUrl) {
      return cachedQRUrl;
    }

    const { bankCode, accountNumber, accountName } = accountInfo;
    const amount = Math.round(total);
    const description = `Thanh toan HD${Date.now().toString().slice(-6)}`;
    
    // Debug: log để kiểm tra
    console.log('Total value:', total);
    console.log('Amount sent to QR:', amount);
    
    // URL API VietQR với định dạng chuẩn
    const vietQRUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;
    
    // Cache URL để không cần tạo lại
    setCachedQRUrl(vietQRUrl);
    
    return vietQRUrl;
  };

  // Toggle hiển thị thanh toán
  const togglePayment = () => {
    if (!showPayment && !cachedQRUrl) {
      // Chỉ tạo QR URL khi lần đầu hiển thị
      generateVietQRUrl();
    }
    setShowPayment(!showPayment);
  };

  const BillHeader = () => (
    <View style={styles.billHeader}>
      <Text style={styles.shopName}>COFFEE SHOP</Text>
      <Text style={styles.shopAddress}>123 Nguyễn Văn Cừ, Q.5, TP.HCM</Text>
      <Text style={styles.shopPhone}>Tel: 0123 456 789</Text>
      <View style={styles.divider} />
      <Text style={styles.billTitle}>HÓA ĐƠN THANH TOÁN</Text>
      <Text style={styles.dateTime}>Ngày: {getCurrentDateTime()}</Text>
      <Text style={styles.billId}>Mã HĐ: #HD{Date.now().toString().slice(-6)}</Text>
    </View>
  );

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerText, styles.colName]}>Tên sản phẩm</Text>
      <Text style={[styles.headerText, styles.colQty]}>SL</Text>
      <Text style={[styles.headerText, styles.colPrice]}>Đơn giá</Text>
      <Text style={[styles.headerText, styles.colTotal]}>Thành tiền</Text>
    </View>
  );

  const ProductItem = ({ item, index }) => (
    <View style={[styles.productRow, index % 2 === 0 && styles.evenRow]}>
      <Text style={[styles.productText, styles.colName]} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={[styles.productText, styles.colQty, styles.centerText]}>
        {item.qty}
      </Text>
      <Text style={[styles.productText, styles.colPrice, styles.rightText]}>
        {item.price.toLocaleString('vi-VN')}đ
      </Text>
      <Text style={[styles.totalText, styles.colTotal, styles.rightText]}>
        {(item.qty * item.price).toLocaleString('vi-VN')}đ
      </Text>
    </View>
  );

  const BillFooter = () => (
    <View style={styles.billFooter}>
      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.subtotalLabel}>Tạm tính:</Text>
          <Text style={styles.subtotalValue}>{total.toLocaleString('vi-VN')}đ</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.taxLabel}>VAT (0%):</Text>
          <Text style={styles.taxValue}>0đ</Text>
        </View>
        <View style={[styles.totalRow, styles.finalTotal]}>
          <Text style={styles.totalLabel}>TỔNG CỘNG:</Text>
          <Text style={styles.totalValue}>{total.toLocaleString('vi-VN')}đ</Text>
        </View>
      </View>

      {/* Button để toggle thanh toán */}
      <TouchableOpacity 
        style={styles.paymentToggleButton}
        onPress={togglePayment}
        activeOpacity={0.7}
      >
        <Text style={styles.paymentToggleText}>
          {showPayment ? '🔼 Ẩn thanh toán' : '🔽 Hiển thị thanh toán'}
        </Text>
      </TouchableOpacity>

      {/* QR code và thông tin chuyển khoản chỉ hiển thị khi showPayment = true */}
      {showPayment && (
        <View style={styles.qrContainer}>
          <Text style={styles.qrInfoTitle}>Quét mã QR để thanh toán</Text>
          <Image 
            source={{ uri: cachedQRUrl }}
            style={styles.qrImage}
            resizeMode="contain"
          />
          <View style={styles.qrInfo}>
            <Text style={styles.qrInfoTitle}>Thông tin thanh toán</Text>
            <Text style={styles.qrInfoText}>Ngân hàng: {accountInfo.bankCode || '---'}</Text>
            <Text style={styles.qrInfoText}>Số TK: {accountInfo.accountNumber || '---'}</Text>
            <Text style={styles.qrInfoText}>Chủ TK: {accountInfo.accountName || '---'}</Text>
            <Text style={styles.qrAmountText}>Số tiền: {total.toLocaleString('vi-VN')}đ</Text>
          </View>
          <View style={styles.qrInstructions}>
            <Text style={styles.instructionTitle}>Hướng dẫn thanh toán:</Text>
            <Text style={styles.instructionText}>1. Mở ứng dụng Banking trên điện thoại</Text>
            <Text style={styles.instructionText}>2. Chọn chức năng quét QR Code</Text>
            <Text style={styles.instructionText}>3. Quét mã QR phía trên</Text>
            <Text style={styles.instructionText}>4. Kiểm tra thông tin và xác nhận thanh toán</Text>
          </View>
        </View>
      )}

      <View style={styles.thankYou}>
        <Text style={styles.thankYouText}>Cảm ơn quý khách!</Text>
        <Text style={styles.visitAgain}>Hẹn gặp lại quý khách</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <FlatList
        data={data}
        keyExtractor={(_, idx) => idx.toString()}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <BillHeader />
            <TableHeader />
          </>
        }
        renderItem={({ item, index }) => <ProductItem item={item} index={index} />}
        ListFooterComponent={<BillFooter />}
        contentContainerStyle={styles.scrollContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  
  // Bill Header Styles
  billHeader: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
    letterSpacing: 1.5,
  },
  shopAddress: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  shopPhone: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#ecf0f1',
    marginBottom: 16,
  },
  billTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 12,
    letterSpacing: 1,
  },
  dateTime: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 4,
  },
  billId: {
    fontSize: 14,
    color: '#34495e',
    fontWeight: '500',
  },

  // Table Styles
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#3498db',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  
  // Product Row Styles
  productRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    alignItems: 'center',
  },
  evenRow: {
    backgroundColor: '#f8f9fa',
  },
  productText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  totalText: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '600',
  },

  // Column Widths
  colName: {
    flex: 2.5,
    paddingRight: 8,
  },
  colQty: {
    flex: 0.8,
  },
  colPrice: {
    flex: 1.2,
  },
  colTotal: {
    flex: 1.3,
  },

  // Text Alignment
  centerText: {
    textAlign: 'center',
  },
  rightText: {
    textAlign: 'right',
  },

  // Footer Styles
  billFooter: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 0,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  totalSection: {
    borderTopWidth: 2,
    borderTopColor: '#ecf0f1',
    paddingTop: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subtotalLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  subtotalValue: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  taxLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  taxValue: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  finalTotal: {
    borderTopWidth: 2,
    borderTopColor: '#e74c3c',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
  },

  // Payment Toggle Button
  paymentToggleButton: {
    backgroundColor: '#27ae60',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentToggleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },

  // QR Container - chỉ hiển thị khi showPayment = true
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  qrInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  qrInfoText: {
    fontSize: 13,
    color: '#34495e',
    marginBottom: 4,
    textAlign: 'center',
  },
  qrAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 8,
  },
  qrInstructions: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 12,
    color: '#2d5f3f',
    marginBottom: 4,
    lineHeight: 16,
  },

  // Thank You Section
  thankYou: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    marginTop: 20,
  },
  thankYouText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 4,
  },
  visitAgain: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },

  // Payment Section Styles (giữ lại để tương thích)
  paymentSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#ecf0f1',
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  qrButton: {
    backgroundColor: '#27ae60',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  qrButtonText: {
    flex: 1,
  },
  qrButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  qrButtonSubtitle: {
    fontSize: 12,
    color: '#d4edda',
  },
  bankInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  bankInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  bankInfoText: {
    fontSize: 13,
    color: '#34495e',
    marginBottom: 4,
    lineHeight: 18,
  },

  // QR Modal Styles (giữ lại để tương thích)
  qrModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  qrModal: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxWidth: 350,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});