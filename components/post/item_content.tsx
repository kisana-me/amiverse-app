import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

interface ItemContentProps {
  content: string;
}

export default function ItemContent({ content }: ItemContentProps) {
  if (!content) return null;

  return (
    <View style={styles.container}>
      <ThemedText style={styles.text}>{content}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
});
