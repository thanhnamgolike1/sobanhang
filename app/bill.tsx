import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Router, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Image, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface BillProduct {
  name: string;
  price: number;
  qty: number;
  image?: string;
}

const qrCacheFilePath = `${FileSystem.documentDirectory}Cache.json`;

export default function BillScreen() {
  const params = useLocalSearchParams();
  const data = params.data ? JSON.parse(params.data as string) as BillProduct[] : [];
  const total = data.reduce((sum, p) => sum + p.qty * p.price, 0);
  const [showQR, setShowQR] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  // Lấy billId và qrUrl từ params nếu có
  const initialBillId = params.billId ? String(params.billId) : `HD${Date.now().toString().slice(-6)}`;
  const initialQrUrl = params.qrUrl ? String(params.qrUrl) : null;
  const [billId] = useState(initialBillId);
  const [qrUrl, setQrUrl] = useState<string | null>(initialQrUrl);

const [amountInput, setAmountInput] = useState(''); // Chuỗi nhập từ TextInput
const [showAmountModal, setShowAmountModal] = useState(false);

const [isGenerating, setIsGenerating] = useState(false);


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

  // Tạo URL VietQR
  const generateVietQRUrl = async (): Promise<string | null> => {
    const { bankCode, accountNumber, accountName } = accountInfo;
    const amount = total;
    const description = `Thanh toan ${billId}`;
    const imageUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();

      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          resolve(reader.result as string); // Return base64 string
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return null;
    }
  };



  // Update handlePayment to use JSON file for QR caching
  const handlePayment = async () => {
    try {
      // Read existing QR cache from file
      let qrCache: Record<number, string> = {};
      const fileExists = await FileSystem.getInfoAsync(qrCacheFilePath);

      if (fileExists.exists) {
        const fileContent = await FileSystem.readAsStringAsync(qrCacheFilePath);
        qrCache = JSON.parse(fileContent);
      }

      // Print amounts from bill and file
      console.log('Amount from bill:', total);
      console.log('Amounts in file:', Object.keys(qrCache));

      // Check if QR for the current amount exists
      if (qrCache[total]) {
        setQrUrl(qrCache[total]);
        // console.log('Sử dụng QR đã lưu:', qrCache[total]);
      } else {
        const newQrBase64 = await generateVietQRUrl();
        if (newQrBase64) {
          qrCache[total] = newQrBase64;
          await FileSystem.writeAsStringAsync(qrCacheFilePath, JSON.stringify(qrCache));
          setQrUrl(newQrBase64);

          console.log('QR mới đã được lưu.');
        } else {
          console.error('Failed to generate QR code.');
        }
      }

      setShowQR(true);
    } catch (error) {
      console.error('Error handling payment:', error);
    }
  };

  const handleCloseQR = () => {
    setShowQR(false);
  };

  const handleIncomplete = async (router: Router) => {
    const incompleteBill = {
      billId,
      dateTime: getCurrentDateTime(),
      products: data, // Lưu toàn bộ thông tin sản phẩm
    };

    const storedBills = await AsyncStorage.getItem('incompleteBills');
    const bills = storedBills ? JSON.parse(storedBills) : [];

    // Kiểm tra nếu bill đã tồn tại
    const isBillExists = bills.some((bill: { billId: string }) => bill.billId === billId);
    if (isBillExists) {
      console.log('Bill đã tồn tại, bỏ qua lưu trữ.');
      router.replace('/'); // Vẫn back về '/'
      return;
    }

    bills.push(incompleteBill);
    await AsyncStorage.setItem('incompleteBills', JSON.stringify(bills));

    router.replace('/');
  };

  const handlePaid = async (router: Router) => {
    const storedBills = await AsyncStorage.getItem('incompleteBills');
    const bills = storedBills ? JSON.parse(storedBills) : [];

    // Xóa bill khỏi danh sách
    const updatedBills = bills.filter((bill: { billId: string }) => bill.billId !== billId);
    await AsyncStorage.setItem('incompleteBills', JSON.stringify(updatedBills));
    
    router.replace('/');
  };

  const BillHeader = () => (
    <View style={styles.billHeader}>
      <Text style={styles.shopName}>BOOTH CIRCLE K</Text>
      <Text style={styles.shopAddress}>160 Bùi Thị Xuân, Q.1, Tp.HCM, Việt Nam</Text>
      <Text style={styles.shopPhone}>Tel: +84 (28) 3620 9017</Text>
      <View style={styles.divider} />
      <Text style={styles.billTitle}>HÓA ĐƠN THANH TOÁN</Text>
      <Text style={styles.dateTime}>Ngày: {getCurrentDateTime()}</Text>
      <Text style={styles.billId}>Mã HĐ: #{billId}</Text>
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

  const ProductItem = ({ item, index }: { item: BillProduct; index: number }) => (
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

  const PaymentSection = () => (
    <View style={styles.paymentSection}>
      <Text style={styles.paymentTitle}>PHƯƠNG THỨC THANH TOÁN</Text>
      
      <TouchableOpacity 
        style={styles.qrButton}
        onPress={handlePayment}
        activeOpacity={0.7}
      >
        <View style={styles.qrButtonContent}>
          <Text style={styles.qrButtonIcon}>📱</Text>
          <View style={styles.qrButtonText}>
            <Text style={styles.qrButtonTitle}>Thanh toán QR Code</Text>
            <Text style={styles.qrButtonSubtitle}>Quét mã để thanh toán nhanh</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const QRModal = () => {
    if (!showQR) return null;

    return (
      <View style={styles.qrModalOverlay}>
        <View style={styles.qrModal}>
          <View style={styles.qrModalHeader}>
            <Text style={styles.qrModalTitle}>Thanh toán QR Code</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleCloseQR}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.qrContainer}>
            {qrUrl && (
              <Image 
                source={{ uri: qrUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            )}
          </View>

          <View style={styles.qrInfo}>
            <Text style={styles.qrInfoTitle}>Thông tin thanh toán</Text>
            <Text style={styles.qrInfoText}>Ngân hàng: {accountInfo.bankCode}</Text>
            <Text style={styles.qrInfoText}>Số TK: {accountInfo.accountNumber}</Text>
            <Text style={styles.qrInfoText}>Chủ TK: {accountInfo.accountName}</Text>
            <Text style={styles.qrAmountText}>Số tiền: {total.toLocaleString('vi-VN')}đ</Text>
          </View>

          {/* Nút đóng ở bottom modal */}
          <TouchableOpacity
            style={styles.qrModalBottomCloseButton}
            onPress={handleCloseQR}
            activeOpacity={0.7}
          >
            <Text style={styles.qrModalBottomCloseButtonText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const BillFooter = ({ router }: { router: Router }) => (
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
      
      {/* Nút hoàn thành đơn hàng */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#27ae60',
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: 'center',
            marginRight: 8,
          }}
          onPress={() => handlePaid(router)}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Đã thanh toán</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#e74c3c',
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: 'center',
          }}
          onPress={() => handleIncomplete(router)}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Chưa xong</Text>
        </TouchableOpacity>
      </View>

      <PaymentSection />
      <View style={styles.thankYou}>
        <Text style={styles.thankYouText}>Cảm ơn quý khách!</Text>
        <Text style={styles.visitAgain}>Hẹn gặp lại quý khách</Text>
      </View>
    </View>
  );

  const toggleSettings = () => {
    setSettingsVisible(!settingsVisible);
  };
const generateVietQRUrlMore = async (amount: number): Promise<string | null> => {
    const { bankCode, accountNumber, accountName } = accountInfo;
    const description = `Thanh toan ${billId}`;
    const imageUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();

      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          resolve(reader.result as string); // Return base64 string
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return null;
    }
  };
  
const generateAndSaveQR = async (amount: number) => {
  if (isNaN(amount) || amount <= 0) {
    alert("Vui lòng nhập số tiền hợp lệ");
    return;
  }
  try {
    let qrCache: Record<number, string> = {};
    const fileExists = await FileSystem.getInfoAsync(qrCacheFilePath);

    if (fileExists.exists) {
      const fileContent = await FileSystem.readAsStringAsync(qrCacheFilePath);
      qrCache = JSON.parse(fileContent);
    }

    if (qrCache[amount]) {
      console.log(`QR cho số tiền ${amount}đ đã tồn tại.`);
    } else {
      const newQrBase64 = await generateVietQRUrlMore(amount);
      if (newQrBase64) {
        qrCache[amount] = newQrBase64;
        await FileSystem.writeAsStringAsync(qrCacheFilePath, JSON.stringify(qrCache));
        console.log(`Đã tạo và lưu QR cho ${amount}đ.`);
      } else {
        console.error('Không thể tạo mã QR.');
      }
    }
  } catch (error) {
    console.error('Lỗi khi tạo/lưu QR:', error);
  }
};
  // Lấy thông tin tài khoản từ AsyncStorage
  const [accountInfo, setAccountInfo] = useState({
    bankCode: '',
    accountNumber: '',
    accountName: '',
  });

  React.useEffect(() => {
    (async () => {
      const bankCode = await AsyncStorage.getItem('vietqr_bankCode');
      const accountNumber = await AsyncStorage.getItem('vietqr_accountNumber');
      const accountName = await AsyncStorage.getItem('vietqr_accountName');
      setAccountInfo({
        bankCode: bankCode || 'CAKE',
        accountNumber: accountNumber || '0862435375',
        accountName: accountName || 'NGUYEN THANH NAM',
      });
    })();
  }, []);

const SettingsModal = () => {
  const [startAmount, setStartAmount] = useState('');
  const [endAmount, setEndAmount] = useState('');
  const [stepAmount, setStepAmount] = useState('');
  const [showInputs, setShowInputs] = useState(false);

  if (!settingsVisible) return null;

const handleGenerateQR = async () => {
  const start = parseInt(startAmount);
  const end = parseInt(endAmount);
  const step = parseInt(stepAmount);

  if (isNaN(start) || isNaN(end) || isNaN(step) || step <= 0 || start > end) {
    Alert.alert('Lỗi', 'Vui lòng nhập số hợp lệ (Bắt đầu < Kết thúc, bước > 0)');
    return;
  }

  setIsGenerating(true); // 👉 Bắt đầu loading

  try {
    for (let amount = start; amount <= end; amount += step) {
      await generateAndSaveQR(amount);
    }

    Alert.alert('Thành công', 'Đã tạo mã QR cho toàn bộ khoảng tiền.');

    // Reset form
    setStartAmount('');
    setEndAmount('');
    setStepAmount('');
    setShowInputs(false);
  } catch (error) {
    Alert.alert('Lỗi', 'Đã xảy ra lỗi khi tạo mã QR.');
    console.error(error);
  } finally {
    setIsGenerating(false); // 👉 Kết thúc loading
  }
};


  return (
    <View style={styles.settingsModalOverlay}>
      <View style={styles.settingsModal}>
        <Text style={styles.settingsTitle}>Cài đặt</Text>

        {/* Nút tạo QR (hiện form nhập) */}
        {!showInputs && (
          <TouchableOpacity
            onPress={() => setShowInputs(true)}
            style={styles.settingsButton}
          >
            <Text style={styles.settingsButtonText}>Tạo QR hàng loạt</Text>
          </TouchableOpacity>
        )}

        {/* Các ô nhập hiện ra sau khi bấm nút */}
        {showInputs && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Số bắt đầu"
              keyboardType="numeric"
              value={startAmount}
              onChangeText={setStartAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Số kết thúc"
              keyboardType="numeric"
              value={endAmount}
              onChangeText={setEndAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Bước nhảy"
              keyboardType="numeric"
              value={stepAmount}
              onChangeText={setStepAmount}
            />
            <TouchableOpacity
              onPress={handleGenerateQR}
              style={styles.settingsButton}
            >
              <Text style={styles.settingsButtonText}>Xác nhận tạo QR</Text>
            </TouchableOpacity>
          </>
        )}
{isGenerating && (
  <View style={{ marginBottom: 10 }}>
    <Text style={{ textAlign: 'center', marginBottom: 5 }}>Đang tạo mã QR...</Text>
    <ActivityIndicator size="small" color="#007AFF" />
  </View>
)}

        {/* Nút xem QR */}
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={async () => {
            try {
              const fileExists = await FileSystem.getInfoAsync(qrCacheFilePath);
              if (fileExists.exists) {
                const fileContent = await FileSystem.readAsStringAsync(qrCacheFilePath);
                const qrCache = JSON.parse(fileContent);
                const base64Images = Object.values(qrCache) as string[];

                setQrImages(base64Images);
                setShowQrImagesModal(true);
              } else {
                console.log('QR Cache File does not exist.');
              }
            } catch (error) {
              console.error('Error reading QR Cache File:', error);
            }
          }}
        >
          <Text style={styles.settingsButtonText}>Xem QR</Text>
        </TouchableOpacity>

        {/* Nút đóng */}
        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: '#ccc' }]}
          onPress={toggleSettings}
        >
          <Text style={[styles.settingsButtonText, { color: '#000' }]}>Đóng</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};


const [qrImages, setQrImages] = useState<string[]>([]);
const [showQrImagesModal, setShowQrImagesModal] = useState(false);

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Hóa đơn thanh toán', 
          headerRight: () => (
            <TouchableOpacity onPress={toggleSettings} style={{ marginRight: 16 }}>
              <Ionicons name="settings" size={24} color="black" />
            </TouchableOpacity>
          )
        }} 
      />
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
          ListFooterComponent={<BillFooter router={useRouter()} />}
          contentContainerStyle={styles.scrollContent}
        />
        <QRModal />
        <SettingsModal />

        {/* Modal to display QR images */}
        {showQrImagesModal && (
          <View style={styles.qrModalOverlay}>
            <View style={[styles.qrModal, { height: 410 }]}>
              <Text style={styles.qrModalTitle}>Danh sách QR Codes</Text>
              <TouchableOpacity
                style={[styles.deleteButton, { alignSelf: 'flex-end', marginBottom: 10 }]}
                onPress={async () => {
                  try {
                    // Clear all QR images from the modal
                    setQrImages([]);

                    // Clear the JSON file
                    await FileSystem.writeAsStringAsync(qrCacheFilePath, JSON.stringify({}));

                    console.log('Đã xóa toàn bộ QR Codes.');
                  } catch (error) {
                    console.error('Lỗi khi xóa toàn bộ QR Codes:', error);
                  }
                }}
              >
                <Text style={styles.deleteButtonText}>Xóa toàn bộ</Text>
              </TouchableOpacity>
              <FlatList
                data={qrImages}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <View style={styles.qrListItem}>
                    <Image 
                      source={{ uri: item }} 
                      style={styles.qrImage} 
                      resizeMode="contain" 
                    />
                    {/* Nút xóa QR */}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={async () => {
                        try {
                          // Xóa QR khỏi danh sách hiển thị
                          const updatedQrImages = qrImages.filter((_, i) => i !== index);
                          setQrImages(updatedQrImages);

                          // Đọc nội dung file hiện tại
                          const fileContent = await FileSystem.readAsStringAsync(qrCacheFilePath);
                          const qrCache = JSON.parse(fileContent);

                          // Xóa QR khỏi cache
                          delete qrCache[Object.keys(qrCache)[index]];

                          // Lưu lại cache đã cập nhật
                          await FileSystem.writeAsStringAsync(qrCacheFilePath, JSON.stringify(qrCache));

                          console.log('Đã xóa QR khỏi danh sách và cache.');
                        } catch (error) {
                          console.error('Lỗi khi xóa QR:', error);
                        }
                      }}
                    >
                      <Text style={styles.deleteButtonText}>Xóa</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
              <TouchableOpacity
                style={styles.qrModalBottomCloseButton}
                onPress={() => setShowQrImagesModal(false)}
              >
                <Text style={styles.qrModalBottomCloseButtonText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </>
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

  // Payment Section Styles
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

  // QR Modal Styles
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
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  qrImage: {
    width: 280,
    height: 280,
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
  qrModalBottomCloseButton: {
    marginTop: 20,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  qrModalBottomCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsModalOverlay: {
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
  settingsModal: {
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
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: '70%', // Set a fixed height for the modal
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    height: 48,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#34495e',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  qrListItem: {
    marginBottom: 16,
    alignItems: 'center',
  },
  qrListText: {
    marginTop: 8,
    fontSize: 14,
    color: '#34495e',
    textAlign: 'center',
  },
  deleteButton: {
    marginTop: 8,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  settingsButton: {
  backgroundColor: '#2ecc71',
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 8,
  marginVertical: 6,
  alignItems: 'center',
},

settingsButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: 'bold',
},

});