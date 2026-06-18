import { Text, View } from '@/components/Themed';
import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { getUpdates, markUpdateAsRead, clearUpdates, setCache } from '../../services/database/Database';
import { checkForUpdates } from '../../services/updates/UpdateManager';
import { ExtensionManager } from '../../services/extensions/ExtensionManager';
import { styles } from '../../styles/updates.styles';

export default function UpdatesScreen() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<{[key: string]: boolean}>({});
  const router = useRouter();

  const loadUpdates = useCallback(() => {
    try {
      const data = getUpdates();
      setUpdates(data);
    } catch (e) {
      console.log(e);
    }
  }, []);

  useFocusEffect(loadUpdates);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const newChaptersCount = await checkForUpdates();
      if (newChaptersCount > 0) {
        loadUpdates();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear Updates",
      "Are you sure you want to clear all chapter updates?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear", 
          style: "destructive",
          onPress: () => {
            clearUpdates();
            loadUpdates();
          }
        }
      ]
    );
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const handleDownloadAll = async () => {
    const unread = updates.filter(u => !u.isRead);
    if (unread.length === 0) {
      Alert.alert("Nothing to download", "You have no unread updates.");
      return;
    }
    
    setDownloading(true);
    let successCount = 0;
    for (const item of unread) {
      try {
        const ext = ExtensionManager.getExtension(item.sourceId);
        if (ext) {
          const content = await ext.getChapterContent(item.chapterUrl);
          setCache(`chapter_content_${item.chapterUrl}`, content);
          successCount++;
        }
      } catch (e) {
        console.error("Failed to download chapter", item.chapterUrl);
      }
    }
    setDownloading(false);
    Alert.alert("Download Complete", `Successfully downloaded ${successCount} unread chapters for offline reading!`);
  };

  // Group updates by novel
  const groupedUpdates = Object.values(
    updates.reduce((acc: any, curr) => {
      if (!acc[curr.novelUrl]) {
        acc[curr.novelUrl] = {
          novelUrl: curr.novelUrl,
          novelTitle: curr.novelTitle,
          novelCover: curr.novelCover,
          sourceId: curr.sourceId,
          chapters: [],
          discoveredAt: curr.discoveredAt
        };
      }
      acc[curr.novelUrl].chapters.push(curr);
      return acc;
    }, {})
  ) as any[];

  const toggleGroup = (url: string) => {
    setExpandedGroups(prev => ({...prev, [url]: !prev[url]}));
  };

  const renderGroupItem = ({ item: group }: { item: any }) => {
    const isExpanded = expandedGroups[group.novelUrl];
    const unreadCount = group.chapters.filter((c: any) => !c.isRead).length;

    return (
      <View style={styles.groupContainer}>
        <TouchableOpacity style={styles.card} onPress={() => toggleGroup(group.novelUrl)}>
          <View style={styles.imageContainer}>
            {group.novelCover ? (
              <Image source={group.novelCover} style={styles.coverImage} contentFit="cover" cachePolicy="disk" />
            ) : (
              <View style={styles.placeholderCover}><Feather name="book" size={24} color="#888" /></View>
            )}
          </View>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{group.novelTitle}</Text>
            <Text style={styles.chapterTitle}>{group.chapters.length} Update{group.chapters.length > 1 ? 's' : ''}</Text>
            <View style={styles.timeRow}>
              <Feather name="clock" size={12} color="#888" />
              <Text style={styles.timeText}>{formatTime(group.discoveredAt)}</Text>
            </View>
          </View>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
          <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#888" style={{ marginLeft: 12 }} />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedList}>
            {group.chapters.map((chapter: any, index: number) => (
              <TouchableOpacity
                key={chapter.chapterUrl + index}
                style={styles.chapterRow}
                onPress={() => {
                  markUpdateAsRead(chapter.chapterUrl);
                  router.push(`/novel/reader?url=${encodeURIComponent(chapter.chapterUrl)}&title=${encodeURIComponent(chapter.chapterTitle)}&sourceId=${group.sourceId}&novelUrl=${encodeURIComponent(group.novelUrl)}&novelTitle=${encodeURIComponent(group.novelTitle)}&novelCover=${encodeURIComponent(group.novelCover || '')}` as any);
                }}
              >
                <Text style={[styles.chapterTitle, chapter.isRead ? styles.readText : null]} numberOfLines={1}>
                  {chapter.chapterTitle}
                </Text>
                {!chapter.isRead && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {updates.length > 0 && (
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleDownloadAll} style={styles.downloadBtn} disabled={downloading}>
            {downloading ? (
              <ActivityIndicator size="small" color="#1E90FF" />
            ) : (
              <>
                <Feather name="download" size={14} color="#1E90FF" />
                <Text style={styles.downloadBtnText}>Download All</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={groupedUpdates}
        keyExtractor={(item) => item.novelUrl}
        renderItem={renderGroupItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1E90FF']} // Android
            tintColor="#1E90FF" // iOS
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="bell" size={64} color="rgba(150,150,150,0.3)" />
            <Text style={styles.emptyText}>No new updates</Text>
            <Text style={styles.emptySubtext}>Pull down to check your library for new chapters.</Text>
          </View>
        }
      />
    </View>
  );
}
