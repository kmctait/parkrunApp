import * as DocumentPicker from 'expo-document-picker';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { clearBarcode, loadBarcode, saveBarcode } from '../lib/barcode-storage';

export default function BarcodeScreen() {
  const [barcode, setBarcode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(null);

  useEffect(() => {
    let isMounted = true;

    loadBarcode().then((savedBarcode) => {
      if (isMounted) {
        setBarcode(savedBarcode);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const pickBarcode = useCallback(async () => {
    if (isBusy) {
      return;
    }

    setIsBusy(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: false,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (asset.mimeType && !asset.mimeType.startsWith('image/')) {
        Alert.alert(
          'Unsupported file',
          'Please choose an image of your parkrun barcode, such as a PNG or JPG.'
        );
        return;
      }

      const savedBarcode = await saveBarcode(asset);
      setAspectRatio(null);
      setBarcode(savedBarcode);
    } catch (error) {
      Alert.alert(
        'Could not upload barcode',
        error?.message ?? 'Something went wrong. Please try again.'
      );
    } finally {
      setIsBusy(false);
    }
  }, [isBusy]);

  const removeBarcode = useCallback(() => {
    Alert.alert(
      'Remove barcode?',
      'You can upload it again at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearBarcode();
              setAspectRatio(null);
              setBarcode(null);
            } catch (error) {
              Alert.alert(
                'Could not remove barcode',
                error?.message ?? 'Something went wrong. Please try again.'
              );
            }
          },
        },
      ]
    );
  }, []);

  const openMenu = useCallback(() => {
    const buttons = [
      {
        text: barcode ? 'Upload new barcode' : 'Upload barcode',
        onPress: pickBarcode,
      },
    ];

    if (barcode) {
      buttons.push({
        text: 'Remove barcode',
        style: 'destructive',
        onPress: removeBarcode,
      });
    }

    buttons.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Barcode', undefined, buttons);
  }, [barcode, pickBarcode, removeBarcode]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'parkrun',
          headerRight: () => (
            <Pressable
              accessibilityLabel="Barcode menu"
              accessibilityRole="button"
              hitSlop={12}
              onPress={openMenu}
              style={({ pressed }) => [
                styles.menuButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.menuIcon}>⋮</Text>
            </Pressable>
          ),
        }}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#0F3D2E" />
        </View>
      ) : barcode ? (
        <View style={styles.centered}>
          <View style={styles.card}>
            <Image
              accessibilityLabel="Uploaded parkrun barcode"
              onLoad={(event) => {
                const { width, height } = event.nativeEvent.source;
                if (width && height) {
                  setAspectRatio(width / height);
                }
              }}
              resizeMode="contain"
              source={{ uri: barcode.uri }}
              style={[
                styles.barcodeImage,
                aspectRatio ? { aspectRatio } : styles.barcodeFallback,
              ]}
            />
          </View>
          <Text style={styles.caption}>
            Show this screen at the finish line to get your result scanned.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={pickBarcode}
            style={({ pressed }) => [
              styles.replaceButton,
              (pressed || isBusy) && styles.pressed,
            ]}
          >
            <Text style={styles.replaceButtonText}>
              {isBusy ? 'Uploading…' : 'Upload new barcode'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No bar code uploaded</Text>
          <Text style={styles.emptyHint}>
            Upload a photo or scan of your parkrun barcode using the menu in the
            top-right corner.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={pickBarcode}
            style={({ pressed }) => [
              styles.uploadButton,
              (pressed || isBusy) && styles.pressed,
            ]}
          >
            <Text style={styles.uploadButtonText}>
              {isBusy ? 'Uploading…' : 'Upload barcode'}
            </Text>
          </Pressable>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  menuButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  menuIcon: {
    fontSize: 24,
    lineHeight: 26,
    color: '#0F3D2E',
  },
  pressed: {
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2A24',
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: 10,
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 21,
    color: '#5A665F',
    textAlign: 'center',
  },
  uploadButton: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#0F3D2E',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  replaceButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#0F3D2E',
  },
  replaceButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F3D2E',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  barcodeImage: {
    width: '100%',
    maxHeight: 420,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  barcodeFallback: {
    height: 220,
  },
  caption: {
    marginTop: 20,
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 21,
    color: '#5A665F',
    textAlign: 'center',
  },
});
