import Feather from '@expo/vector-icons/Feather';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, LayoutAnimation, ScrollView, StatusBar, StyleSheet, TouchableOpacity, useColorScheme, Text, View } from 'react-native';

// @ts-ignore
import { addToHistory, getCache, saveScrollProgress, getScrollProgress, markChapterRead, getReaderSettings, saveReaderSettings, ReaderSettings } from '../../services/database/Database';
import { styles } from '../../styles/reader.styles';
import { ExtensionManager } from '../../services/extensions/ExtensionManager';

const { width } = Dimensions.get('window');

const ChapterPage = React.memo(({ chapter, index, sourceId, fontSize, lineHeight, textColor, bgColor, toggleMenu, registerRef, onProgressSave }: any) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

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

  // Restore scroll position once chapter content has finished loading
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const savedY = getScrollProgress(decodeURIComponent(chapter.url));
      if (savedY > 10) {
        setTimeout(() => scrollRef.current?.scrollTo({ y: savedY, animated: false }), 200);
      }
    }
  }, [loading]);

  const handleScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    // Debounce saves — write to DB at most once per second while scrolling
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveScrollProgress(decodeURIComponent(chapter.url), y);
    }, 1000);
  };

  return (
    <ScrollView
      ref={(ref) => {
        scrollRef.current = ref;
        registerRef(ref);
      }}
      style={{ backgroundColor: bgColor }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
      onScroll={handleScroll}
      scrollEventThrottle={500}
    >
      <TouchableOpacity activeOpacity={1} onPress={toggleMenu} style={{ minHeight: '100%' }}>
        <Text style={[styles.titleText, { fontSize: fontSize + 6, color: textColor }]}>
          {chapter.title}
        </Text>
        {loading ? (
          <ActivityIndicator size="large" color="#1E90FF" style={{ marginTop: 50 }} />
        ) : (
          <Text style={[styles.contentText, { fontSize, lineHeight: fontSize * lineHeight, color: textColor }]}>
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
  const [settings, setSettings] = useState<ReaderSettings>(() => getReaderSettings());
  const [showMenu, setShowMenu] = useState(true);

  const updateSettings = (newSettings: Partial<ReaderSettings>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveReaderSettings(newSettings);
  };

  let bgColor = colorScheme === 'dark' ? '#000000' : '#ffffff';
  let textColor = colorScheme === 'dark' ? '#cccccc' : '#333333';
  let menuBgColor = colorScheme === 'dark' ? '#111111' : '#eeeeee';
  let menuIconColor = colorScheme === 'dark' ? '#ffffff' : '#000000';

  if (settings.theme === 'dark') {
    bgColor = '#000000';
    textColor = '#cccccc';
    menuBgColor = '#111111';
    menuIconColor = '#ffffff';
  } else if (settings.theme === 'light') {
    bgColor = '#ffffff';
    textColor = '#333333';
    menuBgColor = '#eeeeee';
    menuIconColor = '#000000';
  } else if (settings.theme === 'sepia') {
    bgColor = '#F4ECD8';
    textColor = '#5B4636';
    menuBgColor = '#E6DECA';
    menuIconColor = '#5B4636';
  }

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
        // Mark this chapter as read for the read/unread indicator in details screen
        markChapterRead(ch.url);
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
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Stack.Screen
        options={{
          title: chapters[currentIndex]?.title || decodeURIComponent(title as string || 'Reading'),
          headerShown: showMenu,
          headerTransparent: true,
          headerTintColor: textColor,
          headerTitleStyle: { color: textColor },
          headerBackground: () => (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: menuBgColor, opacity: 0.95 }]} />
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
          <View style={{ width, backgroundColor: bgColor }}>
            <ChapterPage
              chapter={item}
              index={index}
              sourceId={sourceId}
              fontSize={settings.fontSize}
              lineHeight={settings.lineHeight}
              textColor={textColor}
              bgColor={bgColor}
              toggleMenu={toggleMenu}
              registerRef={(ref: any) => { scrollRefs[index] = ref; }}
            />
          </View>
        )}
      />

      {showMenu && (
        <View style={[styles.bottomMenu, { backgroundColor: menuBgColor, flexDirection: 'column' }]}>
          <View style={styles.settingsRow}>
            <TouchableOpacity onPress={scrollToTop} style={styles.menuIcon}>
              <Feather name="chevrons-up" size={22} color={menuIconColor} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePreviousChapter} style={[styles.menuIcon, { opacity: hasPrev ? 1 : 0.3 }]} disabled={!hasPrev}>
              <Feather name="chevron-left" size={22} color={menuIconColor} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => updateSettings({ fontSize: Math.max(12, settings.fontSize - 2) })} style={styles.menuIcon}>
              <Feather name="minus" size={22} color={menuIconColor} />
            </TouchableOpacity>

            <Text style={{ fontSize: 14, fontWeight: 'bold', color: menuIconColor }}>{settings.fontSize}</Text>

            <TouchableOpacity onPress={() => updateSettings({ fontSize: Math.min(32, settings.fontSize + 2) })} style={styles.menuIcon}>
              <Feather name="plus" size={22} color={menuIconColor} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNextChapter} style={[styles.menuIcon, { opacity: hasNext ? 1 : 0.3 }]} disabled={!hasNext}>
              <Feather name="chevron-right" size={22} color={menuIconColor} />
            </TouchableOpacity>

            <TouchableOpacity onPress={scrollToBottom} style={styles.menuIcon}>
              <Feather name="chevrons-down" size={22} color={menuIconColor} />
            </TouchableOpacity>
          </View>

          <View style={[styles.settingsRow, { width: '100%', paddingHorizontal: 20 }]}>
            <Text style={{ color: menuIconColor, fontWeight: 'bold' }}>Spacing</Text>
            <TouchableOpacity onPress={() => updateSettings({ lineHeight: Math.max(1.0, settings.lineHeight - 0.2) })} style={styles.menuIcon}>
              <Feather name="minimize-2" size={20} color={menuIconColor} />
            </TouchableOpacity>
            <Text style={{ color: menuIconColor, width: 30, textAlign: 'center' }}>{settings.lineHeight.toFixed(1)}</Text>
            <TouchableOpacity onPress={() => updateSettings({ lineHeight: Math.min(2.4, settings.lineHeight + 0.2) })} style={styles.menuIcon}>
              <Feather name="maximize-2" size={20} color={menuIconColor} />
            </TouchableOpacity>

            <View style={{ width: 20 }} />

            <TouchableOpacity onPress={() => updateSettings({ theme: 'light' })} style={[styles.themeButton, { backgroundColor: '#ffffff', borderColor: '#ccc' }, settings.theme === 'light' && styles.themeButtonActive]} />
            <View style={{ width: 10 }} />
            <TouchableOpacity onPress={() => updateSettings({ theme: 'sepia' })} style={[styles.themeButton, { backgroundColor: '#F4ECD8', borderColor: '#ccc' }, settings.theme === 'sepia' && styles.themeButtonActive]} />
            <View style={{ width: 10 }} />
            <TouchableOpacity onPress={() => updateSettings({ theme: 'dark' })} style={[styles.themeButton, { backgroundColor: '#000000', borderColor: '#555' }, settings.theme === 'dark' && styles.themeButtonActive]} />
          </View>
        </View>
      )}
    </View>
  );
}
