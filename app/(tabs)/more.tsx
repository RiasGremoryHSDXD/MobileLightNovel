import { TouchableOpacity, ScrollView, Switch, Alert, Platform, DeviceEventEmitter } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { Text, View } from '@/components/Themed';
import { useCallback, useState, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { clearRequestCache, getDatabaseSizeInBytes, getReaderSettings, saveReaderSettings, getSetting, setSetting, ReaderSettings } from '../../services/database/Database';
import { styles } from '../../styles/more.styles';
import { Image } from 'expo-image';

export default function MoreScreen() {
  const [cacheSizeMb, setCacheSizeMb] = useState<string>('0.00');

  // Settings State
  const [appTheme, setAppTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [fontSize, setFontSize] = useState<number>(18);
  const [theme, setTheme] = useState<'system' | 'light' | 'dark' | 'sepia'>('system');
  const [backgroundUpdates, setBackgroundUpdates] = useState<boolean>(true);
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Dynamic Colors
  const bgColor = isDark ? '#000000' : '#F2F2F7';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subTextColor = isDark ? 'rgba(235, 235, 245, 0.6)' : '#8A8A8E';
  const borderColor = isDark ? '#38383A' : '#E5E5EA';
  const iconBgColor = isDark ? '#2C2C2E' : '#F2F2F7';

  const loadData = async () => {
    try {
      const totalBytes = getDatabaseSizeInBytes();
      const sizeMb = totalBytes / (1024 * 1024);
      setCacheSizeMb(sizeMb > 0 && sizeMb < 0.01 ? '<0.01' : sizeMb.toFixed(2));
      
      // Load Settings
      const savedAppTheme = getSetting('appTheme', 'system') as 'system' | 'light' | 'dark';
      setAppTheme(savedAppTheme);

      const readerSettings = getReaderSettings();
      setFontSize(readerSettings.fontSize);
      setTheme(readerSettings.theme);
      
      const savedBgUpdates = getSetting('backgroundUpdates', 'true') === 'true';
      setBackgroundUpdates(savedBgUpdates);
    } catch (e) {
      console.log(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleClearCache = async () => {
    try {
      // 1. Clear Native Image Caches
      await Image.clearMemoryCache();
      await Image.clearDiskCache();
      
      // 2. Clear SQLite JSON Request Cache
      clearRequestCache();
      
      // Update UI
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const updateFontSize = (delta: number) => {
    let newSize = fontSize + delta;
    if (newSize < 12) newSize = 12;
    if (newSize > 32) newSize = 32;
    setFontSize(newSize);
    saveReaderSettings({ fontSize: newSize });
  };

  const updateTheme = (newTheme: 'system' | 'light' | 'dark' | 'sepia') => {
    setTheme(newTheme);
    saveReaderSettings({ theme: newTheme });
  };

  const updateAppTheme = (newTheme: 'system' | 'light' | 'dark') => {
    setAppTheme(newTheme);
    setSetting('appTheme', newTheme);
    DeviceEventEmitter.emit('appThemeChanged', newTheme);
  };

  const toggleBackgroundUpdates = (val: boolean) => {
    setBackgroundUpdates(val);
    setSetting('backgroundUpdates', val ? 'true' : 'false');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: bgColor }]} contentContainerStyle={{ paddingBottom: 60, paddingTop: 10 }} showsVerticalScrollIndicator={false}>
      {/* Appearance */}
      <View style={[styles.section, { backgroundColor: bgColor }]}>
        <Text style={[styles.sectionTitle, { color: subTextColor }]}>Appearance</Text>
        <View style={[styles.cardGroup, { backgroundColor: cardBg }]}>
          <View style={[styles.settingRow, styles.settingRowNoBorder]}>
            <View style={[styles.iconWrapper, { backgroundColor: '#5856D615' }]}>
              <Feather name="smartphone" size={18} color="#5856D6" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: textColor }]}>App Theme</Text>
              <Text style={[styles.settingDesc, { color: subTextColor }]}>Overall app appearance</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: borderColor }}>
            {(['system', 'light', 'dark'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => updateAppTheme(t)}
                style={[
                  styles.themeButton,
                  { backgroundColor: iconBgColor },
                  appTheme === t && styles.themeButtonActive
                ]}
              >
                <Text style={[
                  styles.themeButtonText,
                  { color: textColor },
                  appTheme === t && styles.themeButtonTextActive
                ]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.settingRow, { borderBottomColor: borderColor }]}>
            <View style={[styles.iconWrapper, { backgroundColor: '#007AFF15' }]}>
              <Feather name="type" size={18} color="#007AFF" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: textColor }]}>Font Size</Text>
              <Text style={[styles.settingDesc, { color: subTextColor }]}>Reader text size</Text>
            </View>
            <View style={styles.fontControls}>
              <TouchableOpacity style={[styles.fontBtn, { backgroundColor: iconBgColor }]} onPress={() => updateFontSize(-1)}>
                <Feather name="minus" size={16} color={textColor} />
              </TouchableOpacity>
              <Text style={[styles.fontValue, { color: textColor }]}>{fontSize}</Text>
              <TouchableOpacity style={[styles.fontBtn, { backgroundColor: iconBgColor }]} onPress={() => updateFontSize(1)}>
                <Feather name="plus" size={16} color={textColor} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.settingRow, styles.settingRowNoBorder]}>
            <View style={[styles.iconWrapper, { backgroundColor: '#FF950015' }]}>
              <Feather name="sun" size={18} color="#FF9500" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: textColor }]}>Theme</Text>
              <Text style={[styles.settingDesc, { color: subTextColor }]}>Reader appearance</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 16 }}>
            {(['system', 'light', 'dark', 'sepia'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => updateTheme(t)}
                style={[
                  styles.themeButton,
                  { backgroundColor: iconBgColor },
                  theme === t && styles.themeButtonActive
                ]}
              >
                <Text style={[
                  styles.themeButtonText,
                  { color: textColor },
                  theme === t && styles.themeButtonTextActive
                ]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Behavior */}
      <View style={[styles.section, { backgroundColor: bgColor }]}>
        <Text style={[styles.sectionTitle, { color: subTextColor }]}>Behavior</Text>
        <View style={[styles.cardGroup, { backgroundColor: cardBg }]}>
          <View style={[styles.settingRow, styles.settingRowNoBorder]}>
            <View style={[styles.iconWrapper, { backgroundColor: '#34C75915' }]}>
              <Feather name="refresh-cw" size={18} color="#34C759" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: textColor }]}>Background Updates</Text>
              <Text style={[styles.settingDesc, { color: subTextColor }]}>Check for new chapters periodically</Text>
            </View>
            <Switch
              value={backgroundUpdates}
              onValueChange={toggleBackgroundUpdates}
              trackColor={{ false: borderColor, true: '#34C759' }}
            />
          </View>
        </View>
      </View>

      {/* Storage & Data */}
      <View style={[styles.section, { backgroundColor: bgColor }]}>
        <Text style={[styles.sectionTitle, { color: subTextColor }]}>Storage</Text>
        <View style={[styles.cardGroup, { backgroundColor: cardBg }]}>
          <View style={[styles.settingRow, { borderBottomColor: borderColor }]}>
            <View style={[styles.iconWrapper, { backgroundColor: '#8E8E9315' }]}>
              <Feather name="database" size={18} color="#8E8E93" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: textColor }]}>App Cache</Text>
              <Text style={[styles.settingDesc, { color: subTextColor }]}>Temporary web data</Text>
            </View>
            <Text style={[styles.cacheSize, { color: subTextColor }]}>{cacheSizeMb} MB</Text>
          </View>

          <TouchableOpacity style={[styles.settingRow, styles.settingRowNoBorder]} onPress={handleClearCache}>
            <View style={[styles.iconWrapper, { backgroundColor: '#FF3B3015' }]}>
              <Feather name="trash-2" size={18} color="#FF3B30" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.clearButtonText}>Clear Cache</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* About */}
      <View style={[styles.aboutContainer, { backgroundColor: bgColor }]}>
        <View style={styles.appIconPlaceholder}>
          <Feather name="book-open" size={32} color="#FFFFFF" />
        </View>
        <Text style={[styles.aboutTitle, { color: textColor }]}>Mobile Light Novel</Text>
        <Text style={[styles.aboutVersion, { color: subTextColor }]}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}
