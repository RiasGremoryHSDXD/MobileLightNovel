import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { ExtensionManager } from '@/services/extensions/ExtensionManager';
import { setCache } from '@/services/database/Database';
import { Modal, Text, TouchableOpacity, Pressable, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

type DownloadContextType = {
  batchProgress: { current: number; total: number; title: string } | null;
  startBatchDownload: (chapters: any[], sourceId: string, onUpdate?: (url: string) => void) => void;
  cancelBatchDownload: () => void;
};

const DownloadContext = createContext<DownloadContextType | null>(null);

export const useDownload = () => {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownload must be used within DownloadProvider');
  return ctx;
};

export const DownloadProvider = ({ children }: { children: React.ReactNode }) => {
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; title: string } | null>(null);
  const [alertModalConfig, setAlertModalConfig] = useState<{title: string, message: string, visible: boolean}>({ title: '', message: '', visible: false });
  const cancelDownloadRef = useRef(false);

  const startBatchDownload = useCallback(async (chaptersToDownload: any[], sourceId: string, onUpdate?: (url: string) => void) => {
    cancelDownloadRef.current = false;
    if (chaptersToDownload.length === 0) return;
    
    setBatchProgress({ current: 0, total: chaptersToDownload.length, title: 'Starting...' });
    
    const extension = ExtensionManager.getExtension(sourceId);
    if (!extension) {
      setBatchProgress(null);
      return;
    }

    let successCount = 0;
    
    for (let i = 0; i < chaptersToDownload.length; i++) {
      if (cancelDownloadRef.current) {
        break;
      }
      
      const ch = chaptersToDownload[i];
      setBatchProgress({ current: i + 1, total: chaptersToDownload.length, title: ch.title });
      
      try {
        const text = await extension.getChapterContent(ch.url);
        setCache(`chapter_${ch.url}`, text);
        if (onUpdate) {
          onUpdate(`chapter_${ch.url}`);
        }
        successCount++;
        // Small delay to prevent hammering the server
        await new Promise((res) => setTimeout(res, 500));
      } catch (e) {
        console.error(e);
      }
    }
    
    const wasCancelled = cancelDownloadRef.current;
    
    setBatchProgress(null);
    
    setAlertModalConfig({
      title: wasCancelled ? 'Download Stopped' : 'Download Complete',
      message: `Successfully downloaded ${successCount} of ${chaptersToDownload.length} chapters.`,
      visible: true
    });
  }, []);

  const cancelBatchDownload = useCallback(() => {
    cancelDownloadRef.current = true;
  }, []);

  return (
    <DownloadContext.Provider value={{ batchProgress, startBatchDownload, cancelBatchDownload }}>
      {children}

      {/* Global Progress Pill */}
      {batchProgress && (
        <View style={styles.batchProgressContainer}>
          <Text style={styles.batchProgressText} numberOfLines={1}>
            Downloading {batchProgress.current}/{batchProgress.total} - {batchProgress.title}
          </Text>
          <ActivityIndicator size="small" color="#1E90FF" style={{ marginRight: 15 }} />
          <TouchableOpacity onPress={cancelBatchDownload}>
            <Feather name="x-circle" size={22} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      )}

      {/* Global Alert Modal */}
      <Modal
        visible={alertModalConfig.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAlertModalConfig(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.batchModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAlertModalConfig(prev => ({ ...prev, visible: false }))} />
          <View style={styles.batchModalContent}>
            <View style={styles.batchModalHeader}>
              <Text style={styles.batchModalTitle}>{alertModalConfig.title}</Text>
              <TouchableOpacity onPress={() => setAlertModalConfig(prev => ({ ...prev, visible: false }))}>
                <Feather name="x" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 25, alignItems: 'center' }}>
              {alertModalConfig.title.toLowerCase().includes('complete') ? (
                <Feather name="check-circle" size={48} color="#2E8B57" style={{ marginBottom: 15 }} />
              ) : (
                <Feather name="info" size={48} color="#1E90FF" style={{ marginBottom: 15 }} />
              )}
              <Text style={{ color: '#ccc', marginBottom: 25, fontSize: 16, textAlign: 'center', lineHeight: 22 }}>
                {alertModalConfig.message}
              </Text>
              
              <TouchableOpacity
                style={[styles.batchDownloadBtn, styles.batchDownloadBtnPrimary, { width: '100%' }]}
                onPress={() => setAlertModalConfig(prev => ({ ...prev, visible: false }))}
              >
                <Text style={styles.batchDownloadBtnText}>Okay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </DownloadContext.Provider>
  );
};

const styles = StyleSheet.create({
  batchProgressContainer: {
    position: 'absolute',
    bottom: 70, // Moved higher to avoid Android navigation bar
    alignSelf: 'center',
    backgroundColor: '#1C1C1E', // sleek dark theme
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30, // pill shape
    zIndex: 999, // Ensure it's above other elements
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    width: '90%',
  },
  batchProgressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  batchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  batchModalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  batchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  batchModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  batchDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 10,
  },
  batchDownloadBtnPrimary: {
    backgroundColor: '#1E90FF',
  },
  batchDownloadBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
