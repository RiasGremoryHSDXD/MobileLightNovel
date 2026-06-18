import { StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView, Modal, Pressable, View as RNView, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { Text, View } from '@/components/Themed';
import Feather from '@expo/vector-icons/Feather';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter, Tabs } from 'expo-router';
import { getLibrary, getCategories, changeNovelCategory, removeFromLibrary, addCategory, deleteCategory } from '../../services/database/Database';
import { styles } from '../../styles/index.styles';

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
      <Tabs.Screen options={{
        headerRight: () => (
          <TouchableOpacity 
            onPress={() => setIsManageModalVisible(true)} 
            style={{ marginRight: 16, padding: 4 }}
          >
            <Feather name="settings" size={22} color="#1E90FF" />
          </TouchableOpacity>
        )
      }} />
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
        <RNView style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeNovelModal} />
          <RNView style={styles.manageModalContent}>
            {/* Header */}
            <RNView style={styles.manageModalHeader}>
              <RNView style={styles.manageModalHeaderLeft}>
                <RNView style={styles.manageIconBg}>
                  <Feather name="folder" size={18} color="#fff" />
                </RNView>
                <RNView>
                  <Text style={[styles.manageModalTitle, {maxWidth: 180}]} numberOfLines={1} lightColor="#fff" darkColor="#fff">{selectedNovel?.title}</Text>
                  <Text style={styles.manageModalSubtitle} lightColor="#888" darkColor="#888">Move to Category</Text>
                </RNView>
              </RNView>
              <TouchableOpacity onPress={closeNovelModal} style={styles.manageCloseBtn}>
                <Feather name="x" size={20} color="#888" />
              </TouchableOpacity>
            </RNView>

            {/* Divider */}
            <RNView style={styles.manageDivider} />
            
            <ScrollView style={styles.manageCatList}>
              {categories.map((cat) => {
                const isActive = selectedNovel?.categoryId === cat.id;
                return (
                  <TouchableOpacity 
                    key={cat.id} 
                    style={[styles.manageCatRow, isActive && { backgroundColor: 'rgba(30,144,255,0.1)' }]}
                    onPress={() => handleMoveCategory(cat.id)}
                  >
                    <RNView style={styles.manageCatInfo}>
                      <Feather 
                        name={isActive ? 'check-circle' : 'circle'} 
                        size={18} 
                        color={isActive ? '#1E90FF' : '#555'} 
                      />
                      <Text 
                        style={[styles.manageCatName, isActive && { fontWeight: 'bold' }]} 
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
          </RNView>
        </RNView>
      </Modal>

      {/* Manage Categories Modal */}
      <Modal visible={isManageModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsManageModalVisible(false)}>
        <RNView style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsManageModalVisible(false)} />
          <RNView style={styles.manageModalContent}>
            {/* Header */}
            <RNView style={styles.manageModalHeader}>
              <RNView style={styles.manageModalHeaderLeft}>
                <RNView style={styles.manageIconBg}>
                  <Feather name="folder" size={18} color="#fff" />
                </RNView>
                <RNView>
                  <Text style={styles.manageModalTitle} lightColor="#fff" darkColor="#fff">Manage Categories</Text>
                  <Text style={styles.manageModalSubtitle} lightColor="#888" darkColor="#888">Create or remove folders</Text>
                </RNView>
              </RNView>
              <TouchableOpacity onPress={() => setIsManageModalVisible(false)} style={styles.manageCloseBtn}>
                <Feather name="x" size={20} color="#888" />
              </TouchableOpacity>
            </RNView>

            {/* Divider */}
            <RNView style={styles.manageDivider} />

            {/* Add new category */}
            <RNView style={styles.manageAddRow}>
              <TextInput
                style={styles.manageAddInput}
                placeholder="New category name..."
                placeholderTextColor="#555"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                onSubmitEditing={handleAddCategory}
              />
              <TouchableOpacity style={styles.manageAddBtn} onPress={handleAddCategory}>
                <Feather name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            </RNView>

            {/* Category list */}
            <ScrollView style={styles.manageCatList} showsVerticalScrollIndicator={false}>
              {/* Custom categories section */}
              {[...categories].filter(c => c.isSystemDefault === 0).length > 0 && (
                <RNView style={styles.manageSectionHeader}>
                  <Text style={styles.manageSectionTitle} lightColor="#1E90FF" darkColor="#1E90FF">Your Categories</Text>
                </RNView>
              )}
              {[...categories].filter(c => c.isSystemDefault === 0).map((cat) => (
                <RNView key={cat.id} style={styles.manageCatRow}>
                  <RNView style={styles.manageCatInfo}>
                    <Feather name="folder" size={16} color="#1E90FF" />
                    <Text style={styles.manageCatName} lightColor="#eee" darkColor="#eee">{cat.name}</Text>
                  </RNView>
                  <TouchableOpacity onPress={() => handleDeleteCategory(cat.id)} style={styles.manageDeleteBtn}>
                    <Feather name="trash-2" size={15} color="#FF4444" />
                  </TouchableOpacity>
                </RNView>
              ))}

              {/* System categories section */}
              <RNView style={styles.manageSectionHeader}>
                <Text style={styles.manageSectionTitle} lightColor="#666" darkColor="#666">System Categories</Text>
              </RNView>
              {[...categories].filter(c => c.isSystemDefault === 1).map((cat) => (
                <RNView key={cat.id} style={styles.manageCatRow}>
                  <RNView style={styles.manageCatInfo}>
                    <Feather name="folder" size={16} color="#555" />
                    <Text style={styles.manageCatName} lightColor="#999" darkColor="#999">{cat.name}</Text>
                    <RNView style={styles.manageSystemTag}>
                      <Text style={styles.manageSystemTagText}>System</Text>
                    </RNView>
                  </RNView>
                  <Feather name="lock" size={13} color="#444" style={{ padding: 8 }} />
                </RNView>
              ))}
            </ScrollView>

            {/* Close button */}
            <TouchableOpacity style={styles.manageCloseButton} onPress={() => setIsManageModalVisible(false)}>
              <Text style={styles.manageCloseButtonText} lightColor="#1E90FF" darkColor="#1E90FF">Done</Text>
            </TouchableOpacity>
          </RNView>
        </RNView>
      </Modal>
    </View>
  );
}
