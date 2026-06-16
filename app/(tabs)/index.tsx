import { StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Text, View } from '@/components/Themed';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { getLibrary } from '../../services/database/Database';

export default function LibraryScreen() {
  const [library, setLibrary] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadLibrary = async () => {
    try {
      const novels = await getLibrary();
      setLibrary(novels);
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

  const renderNovel = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.novelCard}
      onPress={() => router.push(`/novel/details?url=${encodeURIComponent(item.novelUrl)}&sourceId=${item.sourceId}` as any)}
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

  return (
    <View style={styles.container}>
      {library.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.title}>Your Library is Empty</Text>
          <Text style={styles.subtitle}>Discover new novels in the Browse tab</Text>
        </View>
      ) : (
        <FlatList
          data={library}
          keyExtractor={(item) => item.novelUrl}
          renderItem={renderNovel}
          numColumns={3}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
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
});
