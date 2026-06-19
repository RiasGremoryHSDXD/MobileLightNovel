import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent'
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(30,144,255,0.1)',
    borderRadius: 12,
  },
  downloadBtnText: {
    color: '#1E90FF',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6
  },
  clearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,50,50,0.1)',
    borderRadius: 12,
  },
  clearBtnText: {
    color: '#ff4444',
    fontSize: 13,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 12,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(150,150,150,0.1)',
    alignItems: 'center',
  },
  imageContainer: {
    width: 50,
    height: 70,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    marginRight: 16,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  chapterTitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  readText: {
    opacity: 0.5,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  timeText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E90FF',
    marginLeft: 12,
  },
  badge: {
    backgroundColor: '#1E90FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  groupContainer: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  expandedList: {
    backgroundColor: 'rgba(150,150,150,0.05)',
    borderRadius: 8,
    marginTop: -8,
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  chapterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
    backgroundColor: 'transparent',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
    backgroundColor: 'transparent'
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#888'
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: '80%'
  }
});
