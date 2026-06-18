import { StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView, Modal, Pressable, View as RNView, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { Text, View } from '@/components/Themed';
import Feather from '@expo/vector-icons/Feather';
import { useCallback, useState, useEffect } from 'react';
import { useFocusEffect, useRouter, useNavigation } from 'expo-router';
import { getLibrary, getCategories, changeNovelCategory, removeFromLibrary, addCategory, deleteCategory } from '../../services/database/Database';

export default function LibraryScreen() {
  const [library, setLibrary] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number>(1);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal state
  const [selectedNovel, setSelectedNovel] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Manage Categories state
  const [isManageModalVisible, setIsManageModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => setIsManageModalVisible(true)} 
          style={{ marginRight: 16, padding: 4 }}
        >
          <Feather name="settings" size={22} color="#1E90FF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const loadLibrary = async () => {
    try {
      const novels = await getLibrary();
      const cats = await getCategories();
      setLibrary(novels);
      setCategories(cats);
    } catch (e) {
      console.error(e);
    }
  };

  // Automatically refresh when returning to this tab
  useFocusEffect(
    useCallback(() => {
      loadLibrary();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLibrary();
    setRefreshing(false);
  };

  const openNovelModal = (novel: any) => {
    setSelectedNovel(novel);
    setIsModalVisible(true);
  };

  const closeNovelModal = () => {
    setSelectedNovel(null);
    setIsModalVisible(false);
  };

  const handleMoveCategory = async (categoryId: number) => {
    if (selectedNovel) {
      await changeNovelCategory(selectedNovel.novelUrl, categoryId);
      await loadLibrary();
    }
    closeNovelModal();
  };

  const handleRemoveFromLibrary = async () => {
    if (selectedNovel) {
      await removeFromLibrary(selectedNovel.novelUrl);
      await loadLibrary();
    }
    closeNovelModal();
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim().length === 0) return;
    addCategory(newCategoryName.trim());
    setNewCategoryName('');
    await loadLibrary();
  };

  const handleDeleteCategory = async (id: number) => {
    deleteCategory(id);
    await loadLibrary();
  };

  const renderNovel = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.novelCard}
      onPress={() => router.push(`/novel/details?url=${encodeURIComponent(item.novelUrl)}&sourceId=${item.sourceId}` as any)}
      onLongPress={() => openNovelModal(item)}
    >
      {item.coverUrl ? (
        <Image 
          source={item.coverUrl} 
          style={styles.coverImage} 
          contentFit="cover"
          cachePolicy="disk"
        />
      ) : (
        <View style={styles.placeholderCover} />
      )}
      <Text style={styles.novelTitle} numberOfLines={2}>{item.title}</Text>
    </TouchableOpacity>
  );

  const filteredLibrary = library.filter(novel => novel.categoryId === activeCategoryId);

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {categories.map((cat) => (
            <TouchableOpacity 
              key={cat.id} 
              style={[styles.tabButton, activeCategoryId === cat.id && styles.activeTabButton]}
              onPress={() => setActiveCategoryId(cat.id)}
            >
              <Text style={[styles.tabText, activeCategoryId === cat.id && styles.activeTabText]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filteredLibrary.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.title}>This Category is Empty</Text>
          <Text style={styles.subtitle}>Discover new novels or move them here.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLibrary}
          keyExtractor={(item) => item.novelUrl}
          renderItem={renderNovel}
          numColumns={3}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Move Category Modal */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={closeNovelModal}>
        <Pressable style={styles.modalOverlay} onPress={closeNovelModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <RNView style={styles.modalHeader}>
              <Feather name="folder" size={20} color="#1E90FF" />
              <Text style={styles.modalTitle} lightColor="#fff" darkColor="#fff">{selectedNovel?.title}</Text>
            </RNView>
            <Text style={styles.modalSubtitle} lightColor="#999" darkColor="#999">Move to Category:</Text>
            
            <ScrollView style={styles.modalCategoryList}>
              {categories.map((cat) => {
                const isActive = selectedNovel?.categoryId === cat.id;
                return (
                  <TouchableOpacity 
                    key={cat.id} 
                    style={[styles.modalCategoryRow, isActive && styles.activeModalCategoryRow]}
                    onPress={() => handleMoveCategory(cat.id)}
                  >
                    <RNView style={styles.modalCategoryRowInner}>
                      <Feather 
                        name={isActive ? 'check-circle' : 'circle'} 
                        size={18} 
                        color={isActive ? '#1E90FF' : '#555'} 
                      />
                      <Text 
                        style={[styles.modalCategoryText, isActive && styles.activeModalCategoryText]} 
                        lightColor={isActive ? '#1E90FF' : '#ddd'} 
                        darkColor={isActive ? '#1E90FF' : '#ddd'}
                      >
                        {cat.name}
                      </Text>
                    </RNView>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.removeButton} onPress={handleRemoveFromLibrary}>
              <Feather name="trash-2" size={16} color="#FF4444" style={{ marginRight: 6 }} />
              <Text style={styles.removeButtonText} lightColor="#FF4444" darkColor="#FF4444">Remove from Library</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelButton} onPress={closeNovelModal}>
              <Text style={styles.cancelButtonText} lightColor="#888" darkColor="#888">Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Manage Categories Modal */}
      <Modal visible={isManageModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsManageModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsManageModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <RNView style={styles.modalHeader}>
              <Feather name="settings" size={20} color="#1E90FF" />
              <Text style={styles.modalTitle} lightColor="#fff" darkColor="#fff">Manage Categories</Text>
            </RNView>
            <Text style={styles.modalSubtitle} lightColor="#999" darkColor="#999">Create or remove folders</Text>

            <RNView style={styles.addCategoryContainer}>
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
            </RNView>
            
            <ScrollView style={styles.modalCategoryList}>
              {categories.map((cat) => (
                <RNView key={cat.id} style={styles.manageCategoryRow}>
                  <RNView style={styles.manageCategoryInfo}>
                    <Feather name="folder" size={16} color={cat.isSystemDefault ? '#1E90FF' : '#888'} />
                    <Text style={styles.modalCategoryText} lightColor="#ddd" darkColor="#ddd">{cat.name}</Text>
                    {cat.isSystemDefault === 1 && (
                      <RNView style={styles.systemBadge}>
                        <Text style={styles.systemBadgeText}>System</Text>
                      </RNView>
                    )}
                  </RNView>
                  {cat.isSystemDefault === 0 ? (
                    <TouchableOpacity onPress={() => handleDeleteCategory(cat.id)} style={styles.deleteCategoryButton}>
                      <Feather name="trash" size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  ) : (
                    <Feather name="lock" size={14} color="#444" style={{ padding: 8 }} />
                  )}
                </RNView>
              ))}
            </ScrollView>
            
            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsManageModalVisible(false)}>
              <Text style={styles.cancelButtonText} lightColor="#888" darkColor="#888">Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 10,
  },
  novelCard: {
    flex: 1,
    margin: 5,
    maxWidth: '33%',
  },
  coverImage: {
    width: '100%',
    aspectRatio: 2/3,
    borderRadius: 6,
  },
  placeholderCover: {
    width: '100%',
    aspectRatio: 2/3,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  novelTitle: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  tabScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeTabButton: {
    backgroundColor: '#1E90FF',
    borderColor: '#1E90FF',
  },
  tabText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 28,
  },
  modalCategoryList: {
    maxHeight: 220,
    marginBottom: 12,
  },
  modalCategoryRow: {
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
  },
  activeModalCategoryRow: {
    backgroundColor: 'rgba(30,144,255,0.1)',
  },
  modalCategoryRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalCategoryText: {
    fontSize: 15,
  },
  activeModalCategoryText: {
    fontWeight: 'bold',
  },
  removeButton: {
    marginTop: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.2)',
  },
  removeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
  },
  addCategoryContainer: {
    flexDirection: 'row',
    marginBottom: 16,
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
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  manageCategoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  systemBadge: {
    backgroundColor: 'rgba(30,144,255,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  systemBadgeText: {
    fontSize: 10,
    color: '#1E90FF',
    fontWeight: '600',
  },
  deleteCategoryButton: {
    padding: 8,
  },
});
