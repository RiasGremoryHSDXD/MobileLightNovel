import { Text, View } from '@/components/Themed';
import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, useRef } from 'react';
import { FlatList, TouchableOpacity, Alert } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { getHistory, removeFromHistory } from '../../services/database/Database';
import { styles } from '../../styles/history.styles';

export default function HistoryScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const router = useRouter();
  const rowRefs = useRef(new Map()).current;

  const loadHistory = useCallback(() => {
    try {
      const data = getHistory();
      setHistory(data);
    } catch (e) {
      console.log(e);
    }
  }, []);

  useFocusEffect(loadHistory);

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const handleRemoveHistory = (novelUrl: string) => {
    try {
      removeFromHistory(novelUrl);
      loadHistory();
    } catch (e) {
      console.error(e);
    }
  };

  const renderRightActions = (item: any) => {
    return (
      <TouchableOpacity
        style={styles.deleteActionContainer}
        onPress={() => handleRemoveHistory(item.novelUrl)}
      >
        <Feather name="trash-2" size={24} color="#fff" />
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <Swipeable
      ref={(ref) => {
        if (ref) {
          rowRefs.set(item.novelUrl, ref);
        }
      }}
      friction={2}
      rightThreshold={40}
      onSwipeableWillOpen={() => {
        [...rowRefs.entries()].forEach(([key, ref]) => {
          if (key !== item.novelUrl && ref) ref.close();
        });
      }}
      renderRightActions={() => renderRightActions(item)}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={1}
        onPress={() => router.push(`/novel/details?url=${encodeURIComponent(item.novelUrl)}&sourceId=${item.sourceId}` as any)}
      >
      <View style={styles.imageContainer}>
        {item.coverUrl ? (
          <Image
            source={item.coverUrl}
            style={styles.coverImage}
            contentFit="cover"
            cachePolicy="disk"
          />
        ) : (
          <View style={styles.placeholderCover}>
            <Feather name="book" size={24} color="#888" />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.chapterTitle} numberOfLines={1}>{item.lastReadChapterTitle}</Text>
        <View style={styles.timeRow}>
          <Feather name="clock" size={12} color="#888" />
          <Text style={styles.timeText}>{formatTime(item.lastReadAt)}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.resumeButton}
        onPress={() => router.push(`/novel/reader?url=${encodeURIComponent(item.lastReadChapterUrl)}&title=${encodeURIComponent(item.lastReadChapterTitle)}&sourceId=${item.sourceId}&novelUrl=${encodeURIComponent(item.novelUrl)}&novelTitle=${encodeURIComponent(item.title)}&novelCover=${encodeURIComponent(item.coverUrl || '')}` as any)}
      >
        <Feather name="play" size={12} color="#fff" />
        <Text style={styles.resumeText}>Resume</Text>
      </TouchableOpacity>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <View style={styles.container}>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="clock" size={64} color="rgba(150,150,150,0.3)" />
          <Text style={styles.emptyText}>No reading history yet.</Text>
          <Text style={styles.emptySubtext}>Novels you read will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.novelUrl}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}
