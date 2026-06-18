import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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
