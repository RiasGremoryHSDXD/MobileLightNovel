import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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
