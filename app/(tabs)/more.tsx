import { StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';
import { clearRequestCache, getDatabaseSizeInBytes, getCategories, addCategory, deleteCategory } from '../../services/database/Database';

export default function MoreScreen() {
  const [cacheSizeMb, setCacheSizeMb] = useState<string>('0.00');
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  const loadData = async () => {
    try {
      const totalBytes = getDatabaseSizeInBytes();
      const sizeMb = totalBytes / (1024 * 1024);
      setCacheSizeMb(sizeMb > 0 && sizeMb < 0.01 ? '<0.01' : sizeMb.toFixed(2));
      
      const cats = getCategories();
      setCategories(cats);
    } catch (e) {
      console.log(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleAddCategory = () => {
    if (newCategoryName.trim().length === 0) return;
    addCategory(newCategoryName.trim());
    setNewCategoryName('');
    loadData();
  };

  const handleDeleteCategory = (id: number, name: string) => {
    // In Expo Router standard without custom alert setup, we just execute, but an Alert would be nice.
    deleteCategory(id);
    loadData();
  };

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

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="folder" size={20} color="#1E90FF" />
          <Text style={styles.sectionTitle}>Library Categories</Text>
        </View>
        <Text style={styles.settingDesc}>Create or remove custom folders for your library.</Text>
        
        <View style={styles.addCategoryContainer}>
          <TextInput
            style={styles.addCategoryInput}
            placeholder="New category name..."
            placeholderTextColor="#666"
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            onSubmitEditing={handleAddCategory}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddCategory}>
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {categories.map((cat) => (
          <View key={cat.id} style={styles.categoryRow}>
            <View style={styles.categoryInfo}>
              <Feather name="folder" size={16} color={cat.isSystemDefault ? '#1E90FF' : '#888'} />
              <Text style={styles.categoryName}>{cat.name}</Text>
              {cat.isSystemDefault === 1 && (
                <View style={styles.systemBadge}>
                  <Text style={styles.systemBadgeText}>System</Text>
                </View>
              )}
            </View>
            {cat.isSystemDefault === 0 ? (
              <TouchableOpacity onPress={() => handleDeleteCategory(cat.id, cat.name)} style={styles.deleteCategoryButton}>
                <Feather name="trash" size={16} color="#FF3B30" />
              </TouchableOpacity>
            ) : (
              <Feather name="lock" size={14} color="#444" />
            )}
          </View>
        ))}
      </View>
    </ScrollView>
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
  addCategoryContainer: {
    flexDirection: 'row',
    marginTop: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  addCategoryInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    marginRight: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  addButton: {
    backgroundColor: '#1E90FF',
    width: 46,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.08)',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
  },
  systemBadge: {
    backgroundColor: 'rgba(30,144,255,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  systemBadgeText: {
    fontSize: 10,
    color: '#1E90FF',
    fontWeight: '600',
  },
  deleteCategoryButton: {
    padding: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
});
