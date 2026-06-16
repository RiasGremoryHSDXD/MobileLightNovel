import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function UpdatesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Updates</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
