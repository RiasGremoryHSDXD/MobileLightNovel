import Feather from '@expo/vector-icons/Feather';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, PanResponder, ScrollView, StatusBar, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';


import { Text, View } from '@/components/Themed';
// @ts-ignore
import { ExtensionManager } from '../../services/extensions/ExtensionManager';
import { addToHistory, getCache } from '../../services/database/Database';

export default function ReaderScreen() {
  const { url, title, sourceId, totalChapters, novelUrl, novelTitle, novelCover } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const scrollViewRef = useRef<ScrollView>(null);

  const currentScrollY = useRef(0);
  const contentHeight = useRef(0);
  const scrollViewHeight = useRef(0);

  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Settings for the reader
  const [fontSize, setFontSize] = useState(18);

  // Clean UI for immersive reading
  const [showMenu, setShowMenu] = useState(true);

  useEffect(() => {
    async function loadChapter() {
      // Record history
      if (novelUrl && novelTitle) {
        addToHistory(
          decodeURIComponent(novelUrl as string),
          decodeURIComponent(novelTitle as string),
          novelCover ? decodeURIComponent(novelCover as string) : '',
          sourceId as string,
          decodeURIComponent(url as string),
          decodeURIComponent(title as string)
        );
      }

      const decodedUrl = decodeURIComponent(url as string);
      const cacheKey = `chapter_${decodedUrl}`;
      const cached = getCache(cacheKey);

      if (cached) {
        setContent(cached);
        setLoading(false);
      } else {
        const extension = ExtensionManager.getExtension(sourceId as string);
        if (extension && url) {
          const text = await extension.getChapterContent(decodedUrl);
          setContent(text);
          // Only explicit downloads via the download button are cached to disk now
        } else {
          setContent("Failed to load chapter content.");
        }
        setLoading(false);
      }
    }
    loadChapter();
  }, [url, sourceId]);

  const toggleMenu = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowMenu(!showMenu);
  };

  const updateFontSize = (newSize: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFontSize(newSize);
  };

  const customScrollTo = (targetY: number) => {
    const duration = 2000; // 2 seconds
    const startY = currentScrollY.current;
    const distance = targetY - startY;
    const startTime = Date.now();

    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easeInOutCubic animation
      const easeProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const nextY = startY + distance * easeProgress;

      scrollViewRef.current?.scrollTo({ y: nextY, animated: false });

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  };

  const scrollToTop = () => customScrollTo(0);
  const scrollToBottom = () => {
    const maxScroll = Math.max(0, contentHeight.current - scrollViewHeight.current);
    customScrollTo(maxScroll);
  };

  const match = (url as string).match(/(.*chapter-)(\d+)/);
  const currentNum = match ? parseInt(match[2]) : 0;
  const hasPrev = currentNum > 1;
  const hasNext = totalChapters ? currentNum < parseInt(totalChapters as string) : true;

  const handleNextChapter = () => {
    if (!hasNext || !match) return;
    const nextNum = currentNum + 1;
    const nextUrl = match[1] + nextNum;
    router.replace(`/novel/reader?url=${encodeURIComponent(nextUrl)}&title=${encodeURIComponent('Chapter ' + nextNum)}&sourceId=${sourceId}&totalChapters=${totalChapters}` as any);
  };

  const handlePreviousChapter = () => {
    if (!hasPrev || !match) return;
    const prevNum = currentNum - 1;
    const prevUrl = match[1] + prevNum;
    router.replace(`/novel/reader?url=${encodeURIComponent(prevUrl)}&title=${encodeURIComponent('Chapter ' + prevNum)}&sourceId=${sourceId}&totalChapters=${totalChapters}` as any);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only intercept if the user is clearly swiping horizontally (not scrolling up/down)
        return Math.abs(gestureState.dx) > 40 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 50) {
          handlePreviousChapter(); // Swipe right -> Previous chapter
        } else if (gestureState.dx < -50) {
          handleNextChapter();     // Swipe left -> Next chapter
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Stack.Screen
        options={{
          title: decodeURIComponent(title as string || 'Reading'),
          headerShown: showMenu,
          headerTransparent: true,
          headerBackground: () => (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)' }]} />
          )
        }}
      />
      <StatusBar hidden={!showMenu} />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          onScroll={(e) => { currentScrollY.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          onContentSizeChange={(w, h) => { contentHeight.current = h; }}
          onLayout={(e) => { scrollViewHeight.current = e.nativeEvent.layout.height; }}
        >
          <TouchableOpacity activeOpacity={1} onPress={toggleMenu} style={{ minHeight: '100%' }}>
            <Text style={[styles.contentText, { fontSize, lineHeight: fontSize * 1.6, color: colorScheme === 'dark' ? '#ccc' : '#333' }]}>
              {content}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {showMenu && !loading && (
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 100, // Space for transparent header
    paddingBottom: 100, // Space for bottom menu
  },
  titleText: {
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  contentText: {
    // Styling handled dynamically via state
  },
  bottomMenu: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 15,
    paddingBottom: 50, // safe area
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.2)',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  menuIcon: {
    padding: 10,
  }
});
