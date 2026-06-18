import Feather from '@expo/vector-icons/Feather';
import { Tabs, useRouter } from 'expo-router';
import { useState, useRef, useCallback } from 'react';
import { FlatList, StyleSheet, TextInput, TouchableOpacity, useColorScheme } from 'react-native';

import { Text, View } from '@/components/Themed';

const AVAILABLE_EXTENSIONS = [
  { id: 'novelfire', name: 'NovelFire', lang: 'EN', icon: '🔥', installed: true, version: '1.2.4' },
  { id: 'boxnovel', name: 'BoxNovel', lang: 'EN', icon: '📦', installed: false, version: '1.0.1' },
];

export default function BrowseScreen() {
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#fff' : '#000';
  const router = useRouter();

  // Ref holds the live text — typing never triggers a re-render
  const searchRef = useRef('');
  // filterText drives the actual list filtering; updated from ref
  const [filterText, setFilterText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState('Sources');

  // Filter extensions based on filterText state
  const filteredExtensions = AVAILABLE_EXTENSIONS.filter(ext => 
    ext.name.toLowerCase().includes(filterText.toLowerCase())
  );
  
  const installedExtensions = AVAILABLE_EXTENSIONS.filter(ext => ext.installed);

  const closeSearch = useCallback(() => {
    searchRef.current = '';
    setFilterText('');
    setShowSearch(false);
  }, []);

  const openSearch = useCallback(() => {
    setShowSearch(true);
  }, []);

  const renderSource = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.extensionCard}
      onPress={() => router.push(`/source/${item.id}` as any)}
    >
      <View style={styles.extensionIconContainer}>
        <Text style={{ fontSize: 24 }}>{item.icon}</Text>
      </View>
      <View style={styles.extensionInfo}>
        <Text style={styles.extensionName}>{item.name}</Text>
        <Text style={styles.extensionLang}>{item.lang}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderExtension = ({ item }: { item: any }) => (
    <View style={styles.extensionCard}>
      <View style={styles.extensionIconContainer}>
        <Text style={{ fontSize: 24 }}>{item.icon}</Text>
      </View>
      <View style={styles.extensionInfo}>
        <Text style={styles.extensionName}>{item.name}</Text>
        <Text style={styles.extensionLang}>{item.lang} • v{item.version}</Text>
      </View>
      <TouchableOpacity style={styles.installButton}>
        <Text style={styles.installButtonText}>{item.installed ? "Settings" : "Install"}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Tabs.Screen
        options={{
          headerLeft: showSearch
            ? () => (
              <TouchableOpacity onPress={closeSearch} style={{ marginLeft: 15 }}>
                <Feather name="arrow-left" size={24} color={iconColor} />
              </TouchableOpacity>
            )
            : undefined,
          headerTitle: showSearch
            ? () => (
              <TextInput
                style={{ fontSize: 18, color: iconColor, flex: 1, minWidth: 250 }}
                placeholder="Search extensions..."
                placeholderTextColor="#888"
                defaultValue=""
                onChangeText={(text) => {
                  searchRef.current = text;
                  setFilterText(text);
                }}
                autoFocus
              />
            )
            : 'Browse',
          headerRight: showSearch
            ? () => (
              <TouchableOpacity style={{ marginRight: 15 }}>
                <Feather name="more-vertical" size={24} color={iconColor} />
              </TouchableOpacity>
            )
            : () => (
              <TouchableOpacity onPress={openSearch} style={{ marginRight: 15 }}>
                <Feather name="search" size={24} color={iconColor} />
              </TouchableOpacity>
            )
        }}
      />

      {/* Sub-tabs row underneath the header */}
      <View style={styles.subTabContainer}>
        <TouchableOpacity 
          style={[styles.subTab, activeTab === 'Sources' && styles.activeSubTab]}
          onPress={() => setActiveTab('Sources')}
        >
          <Text style={[styles.subTabText, activeTab === 'Sources' && styles.activeSubTabText]}>Sources</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.subTab, activeTab === 'Extensions' && styles.activeSubTab]}
          onPress={() => setActiveTab('Extensions')}
        >
          <Text style={[styles.subTabText, activeTab === 'Extensions' && styles.activeSubTabText]}>Extensions</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'Extensions' ? (
        <FlatList
          data={filteredExtensions}
          keyExtractor={(item) => item.id}
          renderItem={renderExtension}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No extensions found.</Text>
          }
        />
      ) : (
        <FlatList
          data={installedExtensions}
          keyExtractor={(item) => item.id}
          renderItem={renderSource}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No sources installed.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subTabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333', 
    backgroundColor: 'transparent',
  },
  subTab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeSubTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1E90FF', 
  },
  subTabText: {
    fontSize: 16,
    color: '#888',
    fontWeight: 'bold',
  },
  activeSubTabText: {
    color: '#1E90FF',
  },
  listContainer: {
    paddingTop: 10,
  },
  extensionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  extensionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(150,150,150,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  extensionInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  extensionName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  extensionLang: {
    fontSize: 12,
    color: '#888',
  },
  installButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E90FF',
  },
  installButtonText: {
    color: '#1E90FF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  localContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#888',
  },
});
