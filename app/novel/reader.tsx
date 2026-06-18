import Feather from '@expo/vector-icons/Feather';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, LayoutAnimation, ScrollView, StatusBar, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';

import { Text, View } from '@/components/Themed';
// @ts-ignore
import { addToHistory, getCache } from '../../services/database/Database';
import { styles } from '../../styles/reader.styles';
import { ExtensionManager } from '../../services/extensions/ExtensionManager';

const { width } = Dimensions.get('window');

const ChapterPage = React.memo(({ chapter, index, sourceId, fontSize, toggleMenu, registerRef }: any) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();

  useEffect(() => {
    let isMounted = true;
    async function loadChapter() {
      setLoading(true);
      const decodedUrl = decodeURIComponent(chapter.url);
      const cacheKey = `chapter_${decodedUrl}`;
      const cached = getCache(cacheKey);

      if (cached) {
        if (isMounted) {
          setContent(cached);
          setLoading(false);
        }
      } else {
        const extension = ExtensionManager.getExtension(sourceId as string);
        if (extension && chapter.url) {
          try {
            const text = await extension.getChapterContent(decodedUrl);
            if (isMounted) setContent(text);
          } catch (e) {
            if (isMounted) setContent("Failed to load chapter content.");
          }
        } else {
          if (isMounted) setContent("Failed to load chapter content.");
        }
        if (isMounted) setLoading(false);
      }
    }
    loadChapter();
    return () => { isMounted = false; };
  }, [chapter.url, sourceId]);

  return (
    <ScrollView
      ref={registerRef}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
    >
      <TouchableOpacity activeOpacity={1} onPress={toggleMenu} style={{ minHeight: '100%' }}>
        <Text style={[styles.titleText, { fontSize: fontSize + 6, color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
          {chapter.title}
        </Text>
        {loading ? (
          <ActivityIndicator size="large" color="#1E90FF" style={{ marginTop: 50 }} />
        ) : (
          <Text style={[styles.contentText, { fontSize, lineHeight: fontSize * 1.6, color: colorScheme === 'dark' ? '#ccc' : '#333' }]}>
            {content}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
});

export default function ReaderScreen() {
  const { url, title, sourceId, totalChapters, novelUrl, novelTitle, novelCover } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();

  const [chapters, setChapters] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [fontSize, setFontSize] = useState(18);
  const [showMenu, setShowMenu] = useState(true);

  const flatListRef = useRef<FlatList>(null);
  const scrollRefs = useRef<{ [key: number]: ScrollView | null }>({}).current;

  useEffect(() => {
    if (novelUrl) {
      const decodedNovelUrl = decodeURIComponent(novelUrl as string);
      const cachedNovel = getCache(`novel_details_${decodedNovelUrl}`);
      const decodedUrl = decodeURIComponent(url as string);

      if (cachedNovel && cachedNovel.chapters && cachedNovel.chapters.length > 0) {
        const reversedChapters = [...cachedNovel.chapters].reverse();
        setChapters(reversedChapters);
        const idx = reversedChapters.findIndex((c: any) => c.url === decodedUrl);
        setCurrentIndex(idx >= 0 ? idx : 0);
      } else {
        // Fallback if no full chapter list is available
        setChapters([{ url: decodedUrl, title: decodeURIComponent(title as string) }]);
        setCurrentIndex(0);
      }
    }
  }, [novelUrl, url]);

  const toggleMenu = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowMenu(prev => !prev);
  }, []);

  const updateFontSize = (newSize: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFontSize(newSize);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      setCurrentIndex(newIndex);

      const ch = viewableItems[0].item;
      if (ch && novelUrl && novelTitle) {
        addToHistory(
          decodeURIComponent(novelUrl as string),
          decodeURIComponent(novelTitle as string),
          novelCover ? decodeURIComponent(novelCover as string) : '',
          sourceId as string,
          ch.url,
          ch.title
        );
      }
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handlePreviousChapter = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
    }
  };

  const handleNextChapter = () => {
    if (currentIndex < chapters.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const scrollToTop = () => {
    scrollRefs[currentIndex]?.scrollTo({ y: 0, animated: true });
  };

  const scrollToBottom = () => {
    scrollRefs[currentIndex]?.scrollToEnd({ animated: true });
  };

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < chapters.length - 1;

  if (currentIndex === -1 || chapters.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: chapters[currentIndex]?.title || decodeURIComponent(title as string || 'Reading'),
          headerShown: showMenu,
          headerTransparent: true,
          headerBackground: () => (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)' }]} />
          )
        }}
      />
      <StatusBar hidden={!showMenu} />

      <FlatList
        ref={flatListRef}
        data={chapters}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={currentIndex}
        getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        windowSize={3}
        maxToRenderPerBatch={1}
        initialNumToRender={1}
        keyExtractor={(item, index) => item.url + index}
        renderItem={({ item, index }) => (
          <View style={{ width }}>
            <ChapterPage
              chapter={item}
              index={index}
              sourceId={sourceId}
              fontSize={fontSize}
              toggleMenu={toggleMenu}
              registerRef={(ref: any) => { scrollRefs[index] = ref; }}
            />
          </View>
        )}
      />

      {showMenu && (
        <View style={[styles.bottomMenu, { backgroundColor: colorScheme === 'dark' ? '#111' : '#eee' }]}>
          <TouchableOpacity onPress={scrollToTop} style={styles.menuIcon}>
            <Feather name="chevrons-up" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePreviousChapter} style={[styles.menuIcon, { opacity: hasPrev ? 1 : 0.3 }]} disabled={!hasPrev}>
            <Feather name="chevron-left" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => updateFontSize(Math.max(12, fontSize - 2))} style={styles.menuIcon}>
            <Feather name="minus" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
          </TouchableOpacity>

          <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{fontSize}</Text>

          <TouchableOpacity onPress={() => updateFontSize(Math.min(32, fontSize + 2))} style={styles.menuIcon}>
            <Feather name="plus" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNextChapter} style={[styles.menuIcon, { opacity: hasNext ? 1 : 0.3 }]} disabled={!hasNext}>
            <Feather name="chevron-right" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
          </TouchableOpacity>

          <TouchableOpacity onPress={scrollToBottom} style={styles.menuIcon}>
            <Feather name="chevrons-down" size={22} color={colorScheme === 'dark' ? '#fff' : '#000'} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
