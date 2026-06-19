import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, TouchableOpacity, useColorScheme, Keyboard, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';

import { Text, View } from '@/components/Themed';
// @ts-ignore
import { ExtensionManager } from '../../services/extensions/ExtensionManager';
import { getCache, setCache } from '../../services/database/Database';

export default function SourceScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#fff' : '#000';

  const extension = ExtensionManager.getExtension(id as string);

  // Ref holds the live text so typing never triggers a re-render
  const searchRef = useRef('');

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Pagination & Tabs State
  const [browseTab, setBrowseTab] = useState<'popular' | 'latest'>('popular');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Cache the fetched novels so we can restore them when search closes or switching tabs rapidly
  const cachedNovelsRef = useRef<Record<string, any[]>>({ popular: [], latest: [] });

  const loadNovels = useCallback(async (pageNum: number, tab: 'popular' | 'latest', isLoadMore = false) => {
    if (!extension) return;
    if (pageNum === 1 && !isLoadMore) setLoading(true);
    if (isLoadMore) setLoadingMore(true);

    try {
      let data = [];
      if (tab === 'popular' && (extension as any).getPopularNovels) {
        data = await (extension as any).getPopularNovels(pageNum);
      } else if (tab === 'latest' && (extension as any).getLatestUpdates) {
        data = await (extension as any).getLatestUpdates(pageNum);
      } else {
        // Fallback
        if (pageNum === 1) data = await extension.searchNovel('');
      }

      if (data.length === 0) {
        setHasMore(false);
      } else {
        if (isLoadMore) {
          setResults(prev => [...prev, ...data]);
          cachedNovelsRef.current[tab] = [...cachedNovelsRef.current[tab], ...data];
        } else {
          setResults(data);
          cachedNovelsRef.current[tab] = data;
        }
      }
    } catch (e) {
      console.error(`Failed to fetch ${tab} novels`, e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [extension]);

  useEffect(() => {
    // Initial load when tab changes
    setPage(1);
    setHasMore(true);
    // If we already have it cached, show instantly to avoid flicker, but still fetch silently (or skip fetch)
    if (cachedNovelsRef.current[browseTab].length > 0) {
      setResults(cachedNovelsRef.current[browseTab]);
    } else {
      loadNovels(1, browseTab);
    }
  }, [browseTab, loadNovels]);

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading || showSearch) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadNovels(nextPage, browseTab, true);
  };

  const handleSearch = useCallback(async () => {
    const query = searchRef.current.trim();
    if (!query || !extension) return;
    Keyboard.dismiss();
    setLoading(true);
    try {
      const novels = await extension.searchNovel(query);
      setResults(novels);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [extension]);

  const closeSearch = useCallback(() => {
    searchRef.current = '';
    setShowSearch(false);
    // Restore the currently active tab's list
    setResults(cachedNovelsRef.current[browseTab]);
  }, [browseTab]);

  const openSearch = useCallback(() => {
    setShowSearch(true);
  }, []);

  const NovelListItem = ({ item, onPress }: any) => {
    return (
      <TouchableOpacity style={styles.novelCard} onPress={onPress}>
        {item.coverUrl ? (
          <Image 
            source={item.coverUrl} 
            style={styles.coverImage} 
            contentFit="cover"
            cachePolicy="disk"
          />
        ) : (
          <View style={styles.placeholderCover}><Text>No Cover</Text></View>
        )}
        <View style={styles.novelInfo}>
          <Text style={styles.novelTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.novelSource} numberOfLines={2}>
            {item.summary ? item.summary : 'Tap to read synopsis & details'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <NovelListItem 
      item={item} 
      onPress={() => {
        router.push(`/novel/details?url=${encodeURIComponent(item.novelUrl)}&sourceId=${extension?.id}` as any);
      }}
    />
  );

  if (!extension) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Source not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerLeft: showSearch
            ? () => (
                <TouchableOpacity onPress={closeSearch} style={{ marginLeft: 0, marginRight: 15 }}>
                  <Feather name="arrow-left" size={24} color={iconColor} />
                </TouchableOpacity>
              )
            : undefined,
          headerTitle: showSearch
            ? () => (
                <TextInput
                  style={{ fontSize: 18, color: iconColor, flex: 1, minWidth: 200 }}
                  placeholder={`Search ${extension.name}...`}
                  placeholderTextColor="#888"
                  defaultValue=""
                  onChangeText={(text) => { searchRef.current = text; }}
                  onSubmitEditing={handleSearch}
                  autoFocus
                />
              )
            : extension.name,
          headerRight: showSearch
            ? undefined
            : () => (
                <TouchableOpacity onPress={openSearch} style={{ marginRight: 0 }}>
                  <Feather name="search" size={24} color={iconColor} />
                </TouchableOpacity>
              )
        }} 
      />

      {!showSearch && (
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabButton, browseTab === 'popular' && styles.activeTab]} onPress={() => setBrowseTab('popular')}>
            <Text style={[styles.tabText, browseTab === 'popular' && styles.activeTabText]}>Popular</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, browseTab === 'latest' && styles.activeTab]} onPress={() => setBrowseTab('latest')}>
            <Text style={[styles.tabText, browseTab === 'latest' && styles.activeTabText]}>Latest</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#1E90FF" style={{ marginTop: 20 }} />
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item, index) => index.toString() + item.novelUrl}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#1E90FF" style={{ margin: 20 }} /> : null}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Feather name="book-open" size={60} color={iconColor} style={{ opacity: 0.2, marginBottom: 20 }} />
          <Text style={{ opacity: 0.5 }}>No results found.</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 15,
  },
  novelCard: {
    flexDirection: 'row',
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(150,150,150,0.1)',
  },
  coverImage: {
    width: 80,
    height: 120,
    resizeMode: 'cover',
  },
  placeholderCover: {
    width: 80,
    height: 120,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  novelInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  novelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  novelSource: {
    fontSize: 12,
    color: '#888',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#888',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1E90FF',
  },
  tabText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#1E90FF',
  },
});
