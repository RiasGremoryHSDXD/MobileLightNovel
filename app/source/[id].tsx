import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    async function loadNovels() {
      const cacheKey = `source_browse_${id}`;
      const cached = await getCache(cacheKey);
      if (cached) {
        setResults(cached);
      }

      const extension = ExtensionManager.getExtension(id as string);
      if (extension) {
        if (!cached) setLoading(true);
        try {
          const data = (extension as any).getPopularNovels 
            ? await (extension as any).getPopularNovels() 
            : await extension.searchNovel('');
          setResults(data || []);
          setCache(cacheKey, data || []);
        } catch (e) {
          console.error('Failed to fetch popular novels', e);
        } finally {
          setLoading(false);
        }
      }
    }
    loadNovels();
  }, [id]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !extension) return;
    Keyboard.dismiss();
    setLoading(true);
    try {
      const novels = await extension.searchNovel(searchQuery);
      setResults(novels);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

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
                <TouchableOpacity onPress={() => setShowSearch(false)} style={{ marginLeft: 0, marginRight: 15 }}>
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
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  autoFocus
                />
              )
            : extension.name,
          headerRight: showSearch
            ? undefined
            : () => (
                <TouchableOpacity onPress={() => setShowSearch(true)} style={{ marginRight: 0 }}>
                  <Feather name="search" size={24} color={iconColor} />
                </TouchableOpacity>
              )
        }} 
      />

      {loading ? (
        <ActivityIndicator size="large" color="#1E90FF" style={{ marginTop: 20 }} />
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
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
});
