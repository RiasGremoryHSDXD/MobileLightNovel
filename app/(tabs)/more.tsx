import { TouchableOpacity, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';
import { clearRequestCache, getDatabaseSizeInBytes } from '../../services/database/Database';
import { styles } from '../../styles/more.styles';

export default function MoreScreen() {
  const [cacheSizeMb, setCacheSizeMb] = useState<string>('0.00');

  const loadData = async () => {
    try {
      const totalBytes = getDatabaseSizeInBytes();
      const sizeMb = totalBytes / (1024 * 1024);
      setCacheSizeMb(sizeMb > 0 && sizeMb < 0.01 ? '<0.01' : sizeMb.toFixed(2));
    } catch (e) {
      console.log(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
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
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
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
    </ScrollView>
  );
}
