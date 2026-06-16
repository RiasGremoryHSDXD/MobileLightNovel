import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';
import { clearRequestCache, getDatabaseSizeInBytes } from '../../services/database/Database';

export default function MoreScreen() {
  const [cacheSizeMb, setCacheSizeMb] = useState<string>('0.00');

  const calculateCacheSize = async () => {
    try {
      const totalBytes = getDatabaseSizeInBytes();
      // Calculate megabytes, making sure we don't show 0.00 if it's really tiny
      const sizeMb = totalBytes / (1024 * 1024);
      setCacheSizeMb(sizeMb > 0 && sizeMb < 0.01 ? '<0.01' : sizeMb.toFixed(2));
    } catch (e) {
      console.log(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      calculateCacheSize();
    }, [])
  );

  const handleClearCache = async () => {
    // Alert isn't available in standard Expo Router without react-native, but we imported it
    try {
      // 1. Clear Native Image Caches (RAM and Disk)
      await Image.clearMemoryCache();
      await Image.clearDiskCache();
      
      // 2. Clear SQLite JSON Request Cache
      clearRequestCache();
      
      // Update UI
      calculateCacheSize();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings & More</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage & Cache</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingName}>App Cache Data</Text>
            <Text style={styles.settingDesc}>Temporary novels and database info</Text>
          </View>
          <Text style={styles.cacheSize}>{cacheSizeMb} MB</Text>
        </View>

        <TouchableOpacity style={styles.clearButton} onPress={handleClearCache}>
          <Feather name="trash-2" size={18} color="#FF3B30" />
          <Text style={styles.clearButtonText}>Clear All Cache</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1E90FF',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  settingInfo: {
    flex: 1,
  },
  settingName: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  cacheSize: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
