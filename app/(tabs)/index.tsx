import { StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView, Modal, Pressable, View as RNView, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { Text, View } from '@/components/Themed';
import Feather from '@expo/vector-icons/Feather';
import { useCallback, useState, useMemo } from 'react';
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

  // Sort and Filter state
  const [sortBy, setSortBy] = useState<'added' | 'alpha' | 'read' | 'chapters'>('added');
  const [filterSource, setFilterSource] = useState<string>('All');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  // View Mode
  const [viewMode, setViewMode] = useState<'3-col' | '2-col' | 'list'>('3-col');
  const toggleViewMode = () => {
    setViewMode(prev => prev === '3-col' ? '2-col' : prev === '2-col' ? 'list' : '3-col');
  };

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

  const renderNovel = ({ item }: { item: any }) => {
    const isList = viewMode === 'list';
    const is2Col = viewMode === '2-col';
    
    return (
      <TouchableOpacity 
        style={[styles.novelCard, is2Col && styles.novelCard2Col, isList && styles.novelCardList]}
        onPress={() => router.push(`/novel/details?url=${encodeURIComponent(item.novelUrl)}&sourceId=${item.sourceId}` as any)}
        onLongPress={() => openNovelModal(item)}
      >
        {item.coverUrl ? (
          <Image 
            source={item.coverUrl} 
            style={isList ? styles.coverImageList : styles.coverImage} 
            contentFit="cover"
            cachePolicy="disk"
          />
        ) : (
          <View style={isList ? styles.placeholderCoverList : styles.placeholderCover} />
        )}
        
        {isList ? (
          <RNView style={styles.novelListInfo}>
            <Text style={styles.novelTitleList} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.novelListSubText}>{item.sourceId || 'Unknown Source'}</Text>
            {item.totalChapters ? (
              <Text style={styles.novelListSubText}>{item.totalChapters} Chapters</Text>
            ) : null}
          </RNView>
        ) : (
          <Text style={styles.novelTitle} numberOfLines={2}>{item.title}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const filteredLibrary = useMemo(() => {
    let result = library.filter(novel => novel.categoryId === activeCategoryId);
    
    // Filter by source
    if (filterSource !== 'All') {
      result = result.filter(novel => novel.sourceId === filterSource);
    }
    
    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'alpha') {
        return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
      } else if (sortBy === 'read') {
        const aRead = a.lastReadAt || 0;
        const bRead = b.lastReadAt || 0;
        if (aRead !== bRead) return bRead - aRead;
        return (b.addedAt || 0) - (a.addedAt || 0);
      } else if (sortBy === 'chapters') {
        const aChaps = a.totalChapters || 0;
        const bChaps = b.totalChapters || 0;
        if (aChaps !== bChaps) return bChaps - aChaps;
        return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
      } else {
        return (b.addedAt || 0) - (a.addedAt || 0);
      }
    });

    return result;
  }, [library, activeCategoryId, sortBy, filterSource]);

  const availableSources = useMemo(() => {
    const sources = new Set(library.map(novel => novel.sourceId));
    return ['All', ...Array.from(sources)];
  }, [library]);

  return (
    <View style={styles.container}>
      <Tabs.Screen options={{
        headerRight: () => (
          <RNView style={styles.headerRightContainer}>
            <TouchableOpacity onPress={toggleViewMode} style={styles.headerIcon}>
              <Feather name={viewMode === '3-col' ? 'grid' : viewMode === '2-col' ? 'columns' : 'list'} size={22} color="#1E90FF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsFilterModalVisible(true)} style={styles.headerIcon}>
              <Feather name="filter" size={22} color="#1E90FF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsManageModalVisible(true)} style={styles.headerIcon}>
              <Feather name="settings" size={22} color="#1E90FF" />
            </TouchableOpacity>
          </RNView>
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
          <Text style={styles.title}>No Novels Found</Text>
          <Text style={styles.subtitle}>Try changing your filters or adding novels.</Text>
        </View>
      ) : (
        <FlatList
          key={viewMode} // Force re-render when switching column counts
          data={filteredLibrary}
          keyExtractor={(item) => item.novelUrl}
          renderItem={renderNovel}
          numColumns={viewMode === '3-col' ? 3 : viewMode === '2-col' ? 2 : 1}
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

      {/* Filter & Sort Modal */}
      <Modal visible={isFilterModalVisible} transparent animationType="slide" onRequestClose={() => setIsFilterModalVisible(false)}>
        <Pressable style={styles.filterModalOverlay} onPress={() => setIsFilterModalVisible(false)}>
          <RNView style={styles.filterModalContent} onStartShouldSetResponder={() => true}>
            <RNView style={styles.filterDragHandle} />
            <RNView style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Sort & Filter</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Feather name="x" size={24} color="#888" />
              </TouchableOpacity>
            </RNView>
            
            <Text style={styles.filterSectionTitle}>Sort By</Text>
            <RNView style={styles.filterChipContainer}>
              {(['added', 'alpha', 'read', 'chapters'] as const).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[styles.filterChip, sortBy === option && styles.activeFilterChip]}
                  onPress={() => setSortBy(option)}
                >
                  <Text style={[styles.filterChipText, sortBy === option && styles.activeFilterChipText]}>
                    {option === 'added' ? 'Recently Added' : option === 'alpha' ? 'Alphabetical' : option === 'read' ? 'Last Read' : 'Total Chapters'}
                  </Text>
                </TouchableOpacity>
              ))}
            </RNView>

            <Text style={styles.filterSectionTitle}>Filter by Source</Text>
            <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
              <RNView style={styles.filterChipContainer}>
                {availableSources.map(source => (
                  <TouchableOpacity
                    key={source}
                    style={[styles.filterChip, filterSource === source && styles.activeFilterChip]}
                    onPress={() => setFilterSource(source)}
                  >
                    <Text style={[styles.filterChipText, filterSource === source && styles.activeFilterChipText]}>{source}</Text>
                  </TouchableOpacity>
                ))}
              </RNView>
            </ScrollView>
          </RNView>
        </Pressable>
      </Modal>
    </View>
  );
}
