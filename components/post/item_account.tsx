import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PostType } from './post';

export default function ItemAccount({ account }: { account: PostType['account'] }) {
  if (!account) return null;

  return (
    <View style={styles.container}>
      <Link href={`/`} asChild>
        <TouchableOpacity style={styles.plate}>
          <View style={[styles.iconWrap, { borderColor: account.ring_color || 'transparent' }]}>
            <Image
              source={{ uri: account.icon_url || 'https://github.com/shadcn.png' }}
              style={styles.icon}
            />
          </View>
          <View style={styles.nameplate}>
            <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={1}>
              {account.name}
            </ThemedText>
            <ThemedText style={styles.nameId} numberOfLines={1}>
              @{account.name_id}
            </ThemedText>
          </View>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  plate: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    marginRight: 10,
    borderRadius: 999,
    borderWidth: 2,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  nameplate: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 15,
  },
  nameId: {
    fontSize: 13,
    color: '#666',
  },
});
