import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import ItemAccount from './item_account';
import ItemContent from './item_content';
import ItemQuote from './item_quote';
import ItemReactions from './item_reactions';
import ItemConsole from './item_console';

export type PostType = {
  aid: string;
  content: string;
  created_at: string;
  account: {
    name: string;
    name_id: string;
    icon_url?: string;
    ring_color?: string;
    status_rb_color?: string;
  };
  media?: { aid: string; url: string; type: 'image' | 'video'; name?: string }[];
  drawings?: { aid: string; image_url: string; name?: string }[];
  reply_presence?: boolean;
  quote_presence?: boolean;
  visibility?: string;
  views_count?: number;
  quotes_count?: number;
  diffuses_count?: number;
  replies_count?: number;
  is_diffused?: boolean;
  is_busy?: boolean;
  reactions_count?: number;
  is_reacted?: boolean;
  reactions?: any[];
  quote?: PostType;
  is_diffused_by_me?: boolean;
};

export default function Post(post: PostType) {
  return (
    <ThemedView style={styles.item}>
      <ItemAccount account={post.account} />

      <View style={styles.content}>
        <ItemContent content={post.content} />

        {post.media && post.media.length > 0 && (
          <View style={styles.mediaContainer}>
            {post.media.map((media) => (
              <Image
                key={media.aid}
                source={{ uri: media.url }}
                style={styles.mediaImage}
                contentFit="cover"
              />
            ))}
          </View>
        )}
      </View>
      
      <ItemQuote quote={post.quote} />
      <ItemReactions post={post} />
      <ItemConsole post={post} />

      <View style={styles.footer}>
        <ThemedText style={styles.date}>{new Date(post.created_at).toLocaleString()}</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  content: {
    marginLeft: 50,
  },
  mediaContainer: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    gap: 8,
  },
  mediaImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  footer: {
    marginTop: 8,
    marginLeft: 50,
  },
  date: {
    fontSize: 12,
    color: '#888',
  },
});
