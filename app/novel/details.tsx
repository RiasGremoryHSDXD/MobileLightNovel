import Feather from '@expo/vector-icons/Feather';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { ActivityIndicator, Animated, FlatList, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, useColorScheme, Modal, Pressable, View as RNView } from 'react-native';
import { Image } from 'expo-image';

import { Text, View } from '@/components/Themed';
// @ts-ignore
import { ExtensionManager } from '../../services/extensions/ExtensionManager';
import { initDB, addToLibrary, removeFromLibrary, isInLibrary, getCache, setCache, getDownloadedChapterUrls, getCategories } from '../../services/database/Database';

const ChapterCard = React.memo(({ item, onPress, isDownloaded, isDownloading, onDownload }: any) => (
  <View style={styles.chapterCard}>
    <TouchableOpacity
      style={styles.chapterClickableArea}
      onPress={() => onPress(item.url, item.title)}
    >
      <Text style={styles.chapterTitle} numberOfLines={1}>{item.title}</Text>
    </TouchableOpacity>
    {isDownloaded ? (
      <Feather name="check-circle" size={20} color="#1E90FF" style={{ padding: 5 }} />
    ) : isDownloading ? (
      <View style={{ padding: 5 }}><ActivityIndicator size="small" color="#1E90FF" /></View>
    ) : (
      <TouchableOpacity onPress={() => onDownload(item.url)} style={{ padding: 5 }}>
        <Feather name="download" size={20} color="#888" />
      </TouchableOpacity>
    )}
  </View>
));

export default function NovelDetailsScreen() {
  const { url, sourceId } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#fff' : '#000';

  const [novel, setNovel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isSaved, setIsSaved] = useState(false);
  const [downloadedChapters, setDownloadedChapters] = useState<Set<string>>(new Set());
  const [downloadingChapters, setDownloadingChapters] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<any[]>([]);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const fabOpacity = scrollY.interpolate({
    inputRange: [0, 400, 500],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const fabTranslateY = scrollY.interpolate({
    inputRange: [0, 400, 500],
    outputRange: [100, 100, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    try { 
      initDB(); 
      setCategories(getCategories());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    async function loadNovel() {
      const extension = ExtensionManager.getExtension(sourceId as string);
      const decodedUrl = decodeURIComponent(url as string);
      
      const cacheKey = `novel_details_${decodedUrl}`;
      const cached = getCache(cacheKey);
      if (cached) {
        setNovel(cached);
        setLoading(false);
      }

      if (extension && url) {
        try {
          const details = await extension.getNovelDetails(decodedUrl);
          setNovel(details);
          setCache(cacheKey, details);
          
          setIsSaved(isInLibrary(decodedUrl));

          if (details?.chapters) {
            const urls = details.chapters.map((c: any) => `chapter_${c.url}`);
            setDownloadedChapters(getDownloadedChapterUrls(urls));
          }
        } catch(e) {
          console.error("Fetch or DB check error", e);
        }
      }
      setLoading(false);
    }
    loadNovel();
  }, [url, sourceId]);

  const toggleLibrary = () => {
    if (!novel || !url) return;
    const decodedUrl = decodeURIComponent(url as string);
    if (isSaved) {
      removeFromLibrary(decodedUrl);
      setIsSaved(false);
    } else {
      setIsCategoryModalVisible(true);
    }
  };

  const handleSaveToCategory = (categoryId: number) => {
    if (!novel || !url) return;
    const decodedUrl = decodeURIComponent(url as string);
    addToLibrary({ ...novel, url: decodedUrl }, sourceId as string, categoryId);
    setIsSaved(true);
    setIsCategoryModalVisible(false);
  };

  const openChapter = useCallback((chapterUrl: string, chapterTitle: string) => {
    router.push(`/novel/reader?url=${encodeURIComponent(chapterUrl)}&title=${encodeURIComponent(chapterTitle)}&sourceId=${sourceId}&totalChapters=${novel?.chapters?.length || 0}&novelUrl=${encodeURIComponent(url as string)}&novelTitle=${encodeURIComponent(novel?.title || '')}&novelCover=${encodeURIComponent(novel?.coverUrl || '')}` as any);
  }, [router, sourceId, novel, url]);

  const downloadChapter = useCallback(async (chapterUrl: string) => {
    setDownloadingChapters(prev => new Set(prev).add(chapterUrl));
    try {
      const extension = ExtensionManager.getExtension(sourceId as string);
      if (extension) {
        const text = await extension.getChapterContent(chapterUrl);
        setCache(`chapter_${chapterUrl}`, text);
        setDownloadedChapters(prev => new Set(prev).add(`chapter_${chapterUrl}`));
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to download chapter.");
    } finally {
      setDownloadingChapters(prev => {
        const next = new Set(prev);
        next.delete(chapterUrl);
        return next;
      });
    }
  }, [sourceId]);

  const renderChapter = useCallback(({ item }: { item: any }) => (
    <ChapterCard 
      item={item} 
      onPress={openChapter}
      isDownloaded={downloadedChapters.has(`chapter_${item.url}`)}
      isDownloading={downloadingChapters.has(item.url)}
      onDownload={downloadChapter}
    />
  ), [openChapter, downloadedChapters, downloadingChapters, downloadChapter]);

  const getItemLayout = useCallback((data: any, index: number) => (
    { length: 55, offset: 55 * index, index }
  ), []);

  const filteredChapters = useMemo(() => {
    if (!novel?.chapters) return [];
    let list = [...novel.chapters];
    
    // NovelFire returns newest first (descending). Reverse it if asc is selected.
    if (sortOrder === 'asc') {
      list.reverse();
    }
    
    if (!searchQuery) return list;
    
    const query = searchQuery.trim().toLowerCase();
    
    // If query is just a number, do an exact number match
    if (/^\d+$/.test(query)) {
      const regex = new RegExp(`\\b${query}\\b`);
      return list.filter(c => regex.test(c.title.toLowerCase()));
    }
    
    return list.filter(c => c.title.toLowerCase().includes(query));
  }, [novel?.chapters, searchQuery, sortOrder]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'Loading...', headerBackTitle: 'Back' }} />
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  if (!novel) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'Error' }} />
        <Text>Failed to load novel details.</Text>
      </View>
    );
  }



  const handleDownload = () => {
    Alert.alert('Download', 'Downloading all chapters to local storage for offline reading...', [
      { text: "Cancel", style: "cancel" },
      { text: "Download", onPress: () => Alert.alert("Success", "Download started in background.") }
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: novel.title, 
          headerBackTitle: 'Back',
          headerRight: () => (
            <TouchableOpacity onPress={handleDownload} style={{ padding: 5, marginRight: -5 }}>
              <Feather name="download" size={22} color={iconColor} />
            </TouchableOpacity>
          )
        }} 
      />

      <Animated.FlatList
        ref={flatListRef}
        data={filteredChapters}
        keyExtractor={(item: any) => item.url}
        renderItem={renderChapter}
        getItemLayout={getItemLayout}
        contentContainerStyle={{ paddingBottom: 20 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        initialNumToRender={15}
        maxToRenderPerBatch={20}
        windowSize={10}
        removeClippedSubviews={true}
        ListHeaderComponent={
          <View>
            <View style={styles.headerBlock}>
              <Image 
                source={novel.coverUrl} 
                style={styles.coverImage} 
                contentFit="cover"
                cachePolicy="disk"
              />
              <View style={styles.infoBlock}>
                <Text style={styles.novelTitle} numberOfLines={3}>{novel.title}</Text>
                <Text style={styles.novelAuthor}>{novel.author}</Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={[styles.actionButton, isSaved && { backgroundColor: '#1E90FF' }]} 
                    onPress={toggleLibrary}
                  >
                    <Feather name="bookmark" size={20} color={isSaved ? '#fff' : '#1E90FF'} />
                    <Text style={[styles.actionButtonText, isSaved && { color: '#fff' }]}>
                      {isSaved ? "Saved to Library" : "Add to Library"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.readButtonContainer}>
              <TouchableOpacity
                style={styles.readButton}
                onPress={() => {
                  if (novel.chapters.length > 0) {
                    const firstChapter = novel.chapters[novel.chapters.length - 1]; // Array is reversed (newest first), so last is chapter 1
                    openChapter(firstChapter.url, firstChapter.title);
                  }
                }}
              >
                <Feather name="play" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.readButtonText}>Start Reading</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.summaryBlock}>
              <Text style={styles.summaryTitle}>About</Text>
              <TouchableOpacity onPress={() => setIsSummaryExpanded(!isSummaryExpanded)}>
                <Text style={styles.summaryText} numberOfLines={isSummaryExpanded ? undefined : 4}>
                  {novel.summary}
                </Text>
                <Text style={{ color: '#1E90FF', marginTop: 8, fontWeight: 'bold' }}>
                  {isSummaryExpanded ? 'Show less' : 'Show more'}
                </Text>
              </TouchableOpacity>

              {novel.genres && novel.genres.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 15, flexDirection: 'row' }}>
                  {novel.genres.map((genre: string, idx: number) => (
                    <View key={idx} style={styles.genreTag}>
                      <Text style={styles.genreText}>{genre}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.chaptersHeader}>
              <Text style={styles.chaptersTitle}>
                {novel.chapters.length} Chapters
              </Text>
              <TouchableOpacity onPress={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')} style={styles.sortButton}>
                <Feather name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} size={18} color="#1E90FF" />
                <Text style={styles.sortText}>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 15, paddingBottom: 15 }}>
              <View style={styles.searchContainer}>
                <Feather name="search" size={18} color="#888" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search chapter... (e.g. 2000)"
                  placeholderTextColor="#888"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  keyboardType="numeric"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Feather name="x-circle" size={18} color="#888" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        }
      />

      <Animated.View
        style={[
          styles.fabContainer,
          {
            opacity: fabOpacity,
            transform: [{ translateY: fabTranslateY }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
          activeOpacity={0.8}
        >
          <Feather name="arrow-up" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Category Selection Modal */}
      <Modal visible={isCategoryModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsCategoryModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsCategoryModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <RNView style={styles.modalHeader}>
              <Feather name="bookmark" size={20} color="#1E90FF" />
              <Text style={styles.modalTitle} lightColor="#fff" darkColor="#fff">Save to Category</Text>
            </RNView>
            <Text style={styles.modalSubtitleText} lightColor="#999" darkColor="#999">Choose a folder for this novel:</Text>
            <ScrollView style={styles.modalCategoryList}>
              {categories.map((cat) => (
                <TouchableOpacity 
                  key={cat.id} 
                  style={styles.modalCategoryRow}
                  onPress={() => handleSaveToCategory(cat.id)}
                >
                  <RNView style={styles.modalCategoryRowInner}>
                    <Feather name="folder" size={16} color="#1E90FF" />
                    <Text style={styles.modalCategoryText} lightColor="#ddd" darkColor="#ddd">{cat.name}</Text>
                  </RNView>
                  <Feather name="chevron-right" size={16} color="#555" />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsCategoryModalVisible(false)}>
              <Text style={styles.cancelButtonText} lightColor="#888" darkColor="#888">Cancel</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBlock: {
    flexDirection: 'row',
    padding: 15,
  },
  coverImage: {
    width: 100,
    height: 150,
    borderRadius: 6,
    marginRight: 15,
  },
  placeholderCover: {
    width: 100,
    height: 150,
    backgroundColor: '#333',
    borderRadius: 6,
    marginRight: 15,
  },
  infoBlock: {
    flex: 1,
    justifyContent: 'space-between',
  },
  novelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  novelAuthor: {
    fontSize: 16,
    color: '#888',
    marginBottom: 15,
  },
  actionRow: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionButtonText: {
    color: '#1E90FF',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  readButtonContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  readButton: {
    backgroundColor: '#1E90FF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  readButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  summaryBlock: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#aaa',
  },
  genreTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.3)',
    marginRight: 8,
  },
  genreText: {
    fontSize: 12,
    color: '#888',
  },
  chaptersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    paddingBottom: 5,
  },
  chaptersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  sortText: {
    color: '#1E90FF',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(150,150,150,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: '#888',
    height: '100%',
  },
  chapterCard: {
    height: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  chapterClickableArea: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    marginRight: 10,
  },
  chapterTitle: {
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 70,
    right: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  fab: {
    backgroundColor: '#1E90FF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  modalSubtitleText: {
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 28,
  },
  modalCategoryList: {
    maxHeight: 250,
  },
  modalCategoryRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalCategoryRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalCategoryText: {
    fontSize: 15,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
  },
});
