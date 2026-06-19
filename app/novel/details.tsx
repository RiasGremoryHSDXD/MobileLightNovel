import Feather from '@expo/vector-icons/Feather';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  useColorScheme,
  Modal,
  Pressable,
  View as RNView,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';

import { Text, View } from '@/components/Themed';
import { useDownload } from '@/contexts/DownloadContext';
// @ts-ignore
import { ExtensionManager } from '../../services/extensions/ExtensionManager';
import {
  initDB,
  addToLibrary,
  removeFromLibrary,
  isInLibrary,
  getCache,
  setCache,
  getDownloadedChapterUrls,
  getCategories,
  getReadChapterUrls,
} from '../../services/database/Database';
import { styles } from '../../styles/details.styles';

const CHAPTERS_PER_PAGE = 100;

const ChapterCard = React.memo(
  ({ item, onPress, downloadedChapters, downloadingChapters, onDownload, readChapters }: any) => {
    const isDownloaded = downloadedChapters.has(`chapter_${item.url}`);
    const isDownloading = downloadingChapters.has(item.url);
    const isRead = readChapters.has(item.url);
    return (
      <View style={styles.chapterCard}>
        <TouchableOpacity
          style={styles.chapterClickableArea}
          onPress={() => onPress(item.url, item.title)}
        >
          <Text
            style={[styles.chapterTitle, isRead && styles.chapterTitleRead]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </TouchableOpacity>
        {isDownloaded ? (
          <Feather name="check-circle" size={20} color="#1E90FF" style={{ padding: 5 }} />
        ) : isDownloading ? (
          <View style={{ padding: 5 }}>
            <ActivityIndicator size="small" color="#1E90FF" />
          </View>
        ) : (
          <TouchableOpacity onPress={() => onDownload(item.url)} style={{ padding: 5 }}>
            <Feather name="download" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>
    );
  },
  (prev, next) => {
    const prevDownloaded = prev.downloadedChapters.has(`chapter_${prev.item.url}`);
    const nextDownloaded = next.downloadedChapters.has(`chapter_${next.item.url}`);
    const prevDownloading = prev.downloadingChapters.has(prev.item.url);
    const nextDownloading = next.downloadingChapters.has(next.item.url);
    const prevRead = prev.readChapters.has(prev.item.url);
    const nextRead = next.readChapters.has(next.item.url);
    return (
      prev.item.url === next.item.url &&
      prevDownloaded === nextDownloaded &&
      prevDownloading === nextDownloading &&
      prevRead === nextRead
    );
  }
);

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
  const [readChapters, setReadChapters] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<any[]>([]);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isBatchModalVisible, setIsBatchModalVisible] = useState(false);
  const [undownloadedChaptersList, setUndownloadedChaptersList] = useState<any[]>([]);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customRangeError, setCustomRangeError] = useState('');
  
  const { startBatchDownload, batchProgress } = useDownload();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [isJumpModalVisible, setIsJumpModalVisible] = useState(false);
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const chapterListLayoutY = useRef(0);

  useEffect(() => {
    try {
      initDB();
      setCategories(getCategories());
    } catch (e) {
      console.error(e);
    }
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
            const chapterUrls = details.chapters.map((c: any) => c.url);
            setReadChapters(getReadChapterUrls(chapterUrls));
          }
        } catch (e) {
          console.error('Fetch or DB check error', e);
        }
      }
      setLoading(false);
    }
    loadNovel();
  }, [url, sourceId]);

  useFocusEffect(
    useCallback(() => {
      if (novel?.chapters) {
        const chapterUrls = novel.chapters.map((c: any) => c.url);
        setReadChapters(getReadChapterUrls(chapterUrls));
      }
    }, [novel])
  );

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

  const openChapter = useCallback(
    (chapterUrl: string, chapterTitle: string) => {
      router.push(
        `/novel/reader?url=${encodeURIComponent(chapterUrl)}&title=${encodeURIComponent(chapterTitle)}&sourceId=${sourceId}&totalChapters=${novel?.chapters?.length || 0}&novelUrl=${encodeURIComponent(url as string)}&novelTitle=${encodeURIComponent(novel?.title || '')}&novelCover=${encodeURIComponent(novel?.coverUrl || '')}` as any
      );
    },
    [router, sourceId, novel, url]
  );

  const downloadChapter = useCallback(
    async (chapterUrl: string) => {
      setDownloadingChapters((prev) => new Set(prev).add(chapterUrl));
      try {
        const extension = ExtensionManager.getExtension(sourceId as string);
        if (extension) {
          const text = await extension.getChapterContent(chapterUrl);
          setCache(`chapter_${chapterUrl}`, text);
          setDownloadedChapters((prev) => new Set(prev).add(`chapter_${chapterUrl}`));
        }
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Failed to download chapter.');
      } finally {
        setDownloadingChapters((prev) => {
          const next = new Set(prev);
          next.delete(chapterUrl);
          return next;
        });
      }
    },
    [sourceId]
  );

  const handleDownload = () => {
    if (batchProgress !== null) {
      Alert.alert('Download in Progress', 'Please wait for the current download to finish or cancel it.');
      return;
    }

    if (!novel || !novel.chapters) return;
    
    // Create chronological list of chapters (oldest first)
    // Assuming novel.chapters is newest first
    const chronoChapters = [...novel.chapters].reverse();
    
    const unread = chronoChapters.filter((c) => !readChapters.has(c.url));
    const undownloaded = unread.filter((c) => !downloadedChapters.has(`chapter_${c.url}`));
    
    if (undownloaded.length === 0) {
      // Could show a toast, but keeping it simple for now
      return;
    }

    setUndownloadedChaptersList(undownloaded);
    setCustomStart('');
    setCustomEnd('');
    setCustomRangeError('');
    setIsBatchModalVisible(true);
  };

  const handleCustomDownload = () => {
    setCustomRangeError('');
    const start = parseInt(customStart, 10);
    const end = parseInt(customEnd, 10);

    if (isNaN(start) || isNaN(end)) {
      setCustomRangeError('Please enter valid numbers.');
      return;
    }

    if (start < 1) {
      setCustomRangeError('Start chapter must be at least 1.');
      return;
    }

    if (end < start) {
      setCustomRangeError('End chapter cannot be less than Start chapter.');
      return;
    }
    
    if (!novel || !novel.chapters) return;
    const chronoChapters = [...novel.chapters].reverse();
    
    if (end > chronoChapters.length) {
      setCustomRangeError(`End chapter cannot exceed ${chronoChapters.length}.`);
      return;
    }

    // Get the specified range (start and end are 1-indexed)
    const rangeChapters = chronoChapters.slice(start - 1, end);
    
    // Filter out already downloaded
    const undownloaded = rangeChapters.filter((c) => !downloadedChapters.has(`chapter_${c.url}`));
    
    if (undownloaded.length === 0) {
      setCustomRangeError('All chapters in this range are already downloaded.');
      return;
    }

    setIsBatchModalVisible(false);
    setCustomStart('');
    setCustomEnd('');
    startBatchDownload(undownloaded, sourceId as string, (url) => {
      setDownloadedChapters((prev) => new Set(prev).add(url));
    });
  };


  const filteredChapters = useMemo(() => {
    if (!novel?.chapters) return [];
    let list = [...novel.chapters];

    if (sortOrder === 'asc') {
      list.reverse();
    }

    if (!searchQuery) return list;

    const query = searchQuery.trim().toLowerCase();

    if (/^\d+$/.test(query)) {
      const regex = new RegExp(`\\b${query}\\b`);
      return list.filter((c) => regex.test(c.title.toLowerCase()));
    }

    return list.filter((c) => c.title.toLowerCase().includes(query));
  }, [novel?.chapters, searchQuery, sortOrder]);

  // Reset pagination when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOrder]);

  const remainder = filteredChapters.length % CHAPTERS_PER_PAGE;
  const isDescending = sortOrder === 'desc';
  // If there's a remainder and we're newest-first, put the remainder on page 1
  // so that subsequent pages land cleanly on hundreds (e.g., 1000-901)
  const firstPageSize = (isDescending && remainder !== 0) ? remainder : CHAPTERS_PER_PAGE;

  const totalPages = Math.max(1, Math.ceil(filteredChapters.length / CHAPTERS_PER_PAGE));
  
  // Ensure currentPage is valid (e.g. if filtered chapters length drops)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  let startIndex = 0;
  let endIndex = 0;
  if (currentPage === 1) {
    startIndex = 0;
    endIndex = firstPageSize;
  } else {
    startIndex = firstPageSize + (currentPage - 2) * CHAPTERS_PER_PAGE;
    endIndex = startIndex + CHAPTERS_PER_PAGE;
  }
  const paginatedChapters = filteredChapters.slice(startIndex, endIndex);

  const scrollToChapterList = () => {
    if (scrollViewRef.current && chapterListLayoutY.current > 0) {
      scrollViewRef.current.scrollTo({ y: chapterListLayoutY.current, animated: false });
    }
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    scrollToChapterList();
  };

  const handleJumpSubmit = () => {
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      handlePageChange(pageNum);
      setIsJumpModalVisible(false);
      setJumpPageInput('');
    }
  };

  const generatePageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

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
          ),
        }}
      />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View>
          <View style={styles.headerBlock}>
            <Image
              source={novel.coverUrl}
              style={styles.coverImage}
              contentFit="cover"
              cachePolicy="disk"
            />
            <View style={styles.infoBlock}>
              <Text style={styles.novelTitle} numberOfLines={3}>
                {novel.title}
              </Text>
              <Text style={styles.novelAuthor}>{novel.author}</Text>

              {(novel.status || novel.rating || novel.views) && (
                <View style={styles.metadataRow}>
                  {novel.status && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{novel.status}</Text>
                    </View>
                  )}
                  {novel.rating && (
                    <View style={styles.metadataItem}>
                      <Feather name="star" size={14} color="#FFD700" />
                      <Text style={styles.metadataText}>{novel.rating}</Text>
                    </View>
                  )}
                  {novel.views && (
                    <View style={styles.metadataItem}>
                      <Feather name="eye" size={14} color="#888" />
                      <Text style={styles.metadataText}>{novel.views}</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, isSaved && { backgroundColor: '#1E90FF' }]}
                  onPress={toggleLibrary}
                >
                  <Feather name="bookmark" size={20} color={isSaved ? '#fff' : '#1E90FF'} />
                  <Text style={[styles.actionButtonText, isSaved && { color: '#fff' }]}>
                    {isSaved ? 'Saved to Library' : 'Add to Library'}
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
                  const firstChapter = novel.chapters[novel.chapters.length - 1];
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
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 15, flexDirection: 'row' }}
              >
                {novel.genres.map((genre: string, idx: number) => (
                  <View key={idx} style={styles.genreTag}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.chaptersHeader}>
            <Text style={styles.chaptersTitle}>{novel.chapters.length} Chapters</Text>
            <TouchableOpacity
              onPress={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              style={styles.sortButton}
            >
              <Feather
                name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
                size={18}
                color="#1E90FF"
              />
              <Text style={styles.sortText}>
                {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
              </Text>
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

        {/* Anchor point for scrolling to chapter list */}
        <View onLayout={(e) => (chapterListLayoutY.current = e.nativeEvent.layout.y)} />

        {/* Top Pagination Bar */}
        {filteredChapters.length > 0 ? (
          <>
            {totalPages > 1 && (
              <View style={styles.paginationTopBar}>
                <Text style={styles.paginationInfoText}>
                  Page {currentPage} of {totalPages}
                </Text>
                <TouchableOpacity
                  style={styles.paginationJumpButton}
                  onPress={() => setIsJumpModalVisible(true)}
                >
                  <Text style={styles.paginationJumpText}>Jump to page</Text>
                  <Feather name="chevron-right" size={16} color="#1E90FF" />
                </TouchableOpacity>
              </View>
            )}

            {/* Chapter List */}
            {paginatedChapters.map((item: any) => (
              <ChapterCard
                key={item.url}
                item={item}
                onPress={openChapter}
                downloadedChapters={downloadedChapters}
                downloadingChapters={downloadingChapters}
                readChapters={readChapters}
                onDownload={downloadChapter}
              />
            ))}

            {/* Bottom Pagination Bar */}
            {totalPages > 1 && (
              <View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                >
                  <View style={styles.paginationBottomBar}>
                    <TouchableOpacity
                      style={[styles.navButton, currentPage === 1 && styles.navButtonDisabled]}
                      onPress={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                    >
                      <Feather name="chevrons-left" size={20} color={iconColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.navButton, currentPage === 1 && styles.navButtonDisabled]}
                      onPress={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <Feather name="chevron-left" size={20} color={iconColor} />
                    </TouchableOpacity>

                    {generatePageNumbers().map((page, index) =>
                      page === '...' ? (
                        <Text key={`ellipsis-${index}`} style={styles.ellipsisText}>
                          ...
                        </Text>
                      ) : (
                        <TouchableOpacity
                          key={`page-${page}`}
                          style={[styles.pageButton, currentPage === page && styles.pageButtonActive]}
                          onPress={() => handlePageChange(page as number)}
                        >
                          <Text
                            style={currentPage === page ? styles.pageButtonTextActive : styles.pageButtonText}
                          >
                            {page}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}

                    <TouchableOpacity
                      style={[styles.navButton, currentPage === totalPages && styles.navButtonDisabled]}
                      onPress={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <Feather name="chevron-right" size={20} color={iconColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.navButton, currentPage === totalPages && styles.navButtonDisabled]}
                      onPress={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <Feather name="chevrons-right" size={20} color={iconColor} />
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            )}
          </>
        ) : (
          <View style={[styles.centerContainer, { padding: 40 }]}>
            <Text style={{ color: '#888' }}>No chapters found.</Text>
          </View>
        )}
      </ScrollView>

      {/* Batch Download Modal */}
      <Modal
        visible={isBatchModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsBatchModalVisible(false)}
      >
        <RNView style={styles.batchModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsBatchModalVisible(false)} />
          <RNView style={styles.batchModalContent}>
            <RNView style={styles.batchModalHeader}>
              <Text style={styles.batchModalTitle}>Batch Download</Text>
              <TouchableOpacity onPress={() => setIsBatchModalVisible(false)}>
                <Feather name="x" size={24} color="#888" />
              </TouchableOpacity>
            </RNView>
            <RNView style={{ padding: 20 }}>
              <Text style={{ color: '#ccc', marginBottom: 20, fontSize: 15, lineHeight: 22 }}>
                You have <Text style={{ fontWeight: 'bold', color: '#fff' }}>{undownloadedChaptersList.length}</Text> unread and un-downloaded chapters. Choose how many you want to download.
              </Text>
              
              <RNView style={{ gap: 12 }}>
                {undownloadedChaptersList.length > 20 && (
                  <TouchableOpacity
                    style={styles.batchDownloadBtn}
                    onPress={() => {
                      setIsBatchModalVisible(false);
                      startBatchDownload(undownloadedChaptersList.slice(0, 20), sourceId as string, (url) => {
                        setDownloadedChapters((prev) => new Set(prev).add(url));
                      });
                    }}
                  >
                    <Feather name="arrow-down-circle" size={20} color="#fff" />
                    <Text style={styles.batchDownloadBtnText}>Download Next 20</Text>
                  </TouchableOpacity>
                )}
                
                {undownloadedChaptersList.length > 50 && (
                  <TouchableOpacity
                    style={styles.batchDownloadBtn}
                    onPress={() => {
                      setIsBatchModalVisible(false);
                      startBatchDownload(undownloadedChaptersList.slice(0, 50), sourceId as string, (url) => {
                        setDownloadedChapters((prev) => new Set(prev).add(url));
                      });
                    }}
                  >
                    <Feather name="arrow-down-circle" size={20} color="#fff" />
                    <Text style={styles.batchDownloadBtnText}>Download Next 50</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[styles.batchDownloadBtn, styles.batchDownloadBtnPrimary]}
                  onPress={() => {
                    setIsBatchModalVisible(false);
                    startBatchDownload(undownloadedChaptersList, sourceId as string, (url) => {
                      setDownloadedChapters((prev) => new Set(prev).add(url));
                    });
                  }}
                >
                  <Feather name="download-cloud" size={20} color="#fff" />
                  <Text style={styles.batchDownloadBtnText}>Download All Unread</Text>
                </TouchableOpacity>

                <RNView style={styles.batchRangeContainer}>
                  <TextInput
                    style={styles.batchRangeInput}
                    keyboardType="number-pad"
                    placeholder="From"
                    placeholderTextColor="#555"
                    value={customStart}
                    onChangeText={(t) => { setCustomStart(t); setCustomRangeError(''); }}
                  />
                  <Text style={styles.batchRangeText}>to</Text>
                  <TextInput
                    style={styles.batchRangeInput}
                    keyboardType="number-pad"
                    placeholder="To"
                    placeholderTextColor="#555"
                    value={customEnd}
                    onChangeText={(t) => { setCustomEnd(t); setCustomRangeError(''); }}
                  />
                  <TouchableOpacity
                    style={[styles.batchDownloadBtn, styles.batchDownloadBtnPrimary, { marginLeft: 10, paddingVertical: 8, paddingHorizontal: 12 }]}
                    onPress={handleCustomDownload}
                  >
                    <Feather name="download" size={18} color="#fff" />
                  </TouchableOpacity>
                </RNView>
                {customRangeError ? (
                  <Text style={styles.batchRangeError}>{customRangeError}</Text>
                ) : null}
              </RNView>
            </RNView>
          </RNView>
        </RNView>
      </Modal>

      {/* Jump Modal */}
      <Modal
        visible={isJumpModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsJumpModalVisible(false)}
      >
        <RNView style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsJumpModalVisible(false)} />
          <RNView style={[styles.manageModalContent, { width: 300 }]}>
            <Text style={styles.manageModalTitle} lightColor="#fff" darkColor="#fff">
              Jump to Page
            </Text>
            <Text style={[styles.manageModalSubtitle, { marginBottom: 10 }]} lightColor="#888" darkColor="#888">
              Enter a page between 1 and {totalPages}
            </Text>
            
            <TextInput
              style={styles.jumpModalInput}
              keyboardType="number-pad"
              value={jumpPageInput}
              onChangeText={setJumpPageInput}
              placeholder="e.g. 10"
              placeholderTextColor="#555"
              autoFocus
              onSubmitEditing={handleJumpSubmit}
            />

            <RNView style={styles.jumpModalActions}>
              <TouchableOpacity
                style={styles.jumpModalBtn}
                onPress={() => setIsJumpModalVisible(false)}
              >
                <Text style={styles.jumpModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.jumpModalBtn,
                  styles.jumpModalBtnPrimary,
                  (!jumpPageInput || parseInt(jumpPageInput, 10) < 1 || parseInt(jumpPageInput, 10) > totalPages) && styles.jumpModalBtnDisabled
                ]}
                onPress={handleJumpSubmit}
                disabled={!jumpPageInput || parseInt(jumpPageInput, 10) < 1 || parseInt(jumpPageInput, 10) > totalPages}
              >
                <Text style={styles.jumpModalBtnTextPrimary}>Go</Text>
              </TouchableOpacity>
            </RNView>
          </RNView>
        </RNView>
      </Modal>

      {/* Category Selection Modal */}
      <Modal
        visible={isCategoryModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <RNView style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsCategoryModalVisible(false)} />
          <RNView style={styles.manageModalContent}>
            <RNView style={styles.manageModalHeader}>
              <RNView style={styles.manageModalHeaderLeft}>
                <RNView style={styles.manageIconBg}>
                  <Feather name="bookmark" size={18} color="#fff" />
                </RNView>
                <RNView>
                  <Text style={styles.manageModalTitle} lightColor="#fff" darkColor="#fff">
                    Save to Category
                  </Text>
                  <Text style={styles.manageModalSubtitle} lightColor="#888" darkColor="#888">
                    Choose a folder
                  </Text>
                </RNView>
              </RNView>
              <TouchableOpacity
                onPress={() => setIsCategoryModalVisible(false)}
                style={styles.manageCloseBtn}
              >
                <Feather name="x" size={20} color="#888" />
              </TouchableOpacity>
            </RNView>

            <RNView style={styles.manageDivider} />

            <ScrollView style={styles.manageCatList}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.manageCatRow}
                  onPress={() => handleSaveToCategory(cat.id)}
                >
                  <RNView style={styles.manageCatInfo}>
                    <Feather name="folder" size={16} color="#1E90FF" />
                    <Text style={styles.manageCatName} lightColor="#ddd" darkColor="#ddd">
                      {cat.name}
                    </Text>
                  </RNView>
                  <Feather name="chevron-right" size={16} color="#555" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </RNView>
        </RNView>
      </Modal>
    </View>
  );
}
