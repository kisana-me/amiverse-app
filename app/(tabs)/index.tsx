import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Post, { PostType } from '@/components/post/post';
import { ThemedView } from '@/components/themed-view';

const DUMMY_POSTS: PostType[] = [
  {
    aid: '1',
    content: 'これはAmiverseのリブランディング前のものです！',
    created_at: new Date().toISOString(),
    account: {
      name: 'Amiverse Account',
      name_id: 'amiverse_account',
      icon_url: 'https://kisana.me/images/amiverse/amiverse-logo.png',
    },
    media: [{ aid: 'm1', url: 'https://kisana.me/images/amiverse/amiverse-1.png', type: 'image' }],
  },
  {
    aid: '2',
    content: 'Amiverseをネイティブアプリとして提供したい！\niOSでもAndroidでもストアからインストールできるようになりたい！',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    account: {
      name: 'きさな🍭',
      name_id: 'kisana',
      icon_url: 'https://kisana.me/images/kisana/kisana-logo.png',
    },
  },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ThemedView style={styles.container}>
        <FlatList
          data={DUMMY_POSTS}
          keyExtractor={(item) => item.aid}
          renderItem={({ item }) => <Post {...item} />}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
