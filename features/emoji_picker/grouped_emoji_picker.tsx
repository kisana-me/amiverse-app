import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import activities from "@/emojis/emojis-activities.json";
import animalsNature from "@/emojis/emojis-animals-nature.json";
import flags from "@/emojis/emojis-flags.json";
import foodDrink from "@/emojis/emojis-food-drink.json";
import objects from "@/emojis/emojis-objects.json";
import peopleBody from "@/emojis/emojis-people-body.json";
import smileysEmotion from "@/emojis/emojis-smileys-emotion.json";
import symbols from "@/emojis/emojis-symbols.json";
import travelPlaces from "@/emojis/emojis-travel-places.json";
import { useColors } from "@/providers/UIProvider";
import { EmojiType } from "@/types/emoji";

type EmojiJsonItem = {
  name: string;
  name_id: string;
  description?: string;
  group?: string;
  subgroup?: string;
};

type GroupedEmojiPickerProps = {
  onSelect: (emoji: EmojiType) => void;
  selectedNameId?: string;
};

type SkinToneKey =
  | "none"
  | "light"
  | "medium_light"
  | "medium"
  | "medium_dark"
  | "dark";

type ExtractedSkinTone = Exclude<SkinToneKey, "none"> | "mixed" | "none";

const PEOPLE_GROUP_NAME = "People & Body";
const SKIN_TONE_TOKEN_PATTERN =
  "medium_light_skin_tone|medium_dark_skin_tone|light_skin_tone|medium_skin_tone|dark_skin_tone";

const SKIN_TONE_TO_KEY: Record<string, Exclude<SkinToneKey, "none">> = {
  medium_light_skin_tone: "medium_light",
  medium_dark_skin_tone: "medium_dark",
  light_skin_tone: "light",
  medium_skin_tone: "medium",
  dark_skin_tone: "dark",
};

const SKIN_TONE_OPTIONS: {
  key: SkinToneKey;
  label: string;
  preview: string;
}[] = [
  { key: "none", label: "標準", preview: "👍" },
  { key: "light", label: "明るめ", preview: "👍🏻" },
  { key: "medium_light", label: "やや明るめ", preview: "👍🏼" },
  { key: "medium", label: "中間", preview: "👍🏽" },
  { key: "medium_dark", label: "やや濃いめ", preview: "👍🏾" },
  { key: "dark", label: "濃いめ", preview: "👍🏿" },
];

const EMOJI_SOURCE_LIST: EmojiJsonItem[][] = [
  smileysEmotion as EmojiJsonItem[],
  peopleBody as EmojiJsonItem[],
  animalsNature as EmojiJsonItem[],
  foodDrink as EmojiJsonItem[],
  travelPlaces as EmojiJsonItem[],
  activities as EmojiJsonItem[],
  objects as EmojiJsonItem[],
  symbols as EmojiJsonItem[],
  flags as EmojiJsonItem[],
];

const GROUP_LABELS: Record<string, string> = {
  "Smileys & Emotion": "Smileys",
  "People & Body": "People",
  "Animals & Nature": "Nature",
  "Food & Drink": "Food",
  "Travel & Places": "Travel",
  Activities: "Activities",
  Objects: "Objects",
  Symbols: "Symbols",
  Flags: "Flags",
};

function normalizeEmoji(item: EmojiJsonItem): EmojiType {
  return {
    aid: `emoji-${item.name_id}`,
    name: item.name,
    name_id: item.name_id,
    description: item.description,
    group: item.group,
    subgroup: item.subgroup,
  };
}

function extractSkinTone(nameId: string): ExtractedSkinTone {
  const matches = nameId.match(new RegExp(SKIN_TONE_TOKEN_PATTERN, "g")) ?? [];

  if (matches.length === 0) {
    return "none";
  }

  const tones = matches
    .map((token) => SKIN_TONE_TO_KEY[token])
    .filter((tone): tone is Exclude<SkinToneKey, "none"> => !!tone);

  if (tones.length === 0) {
    return "none";
  }

  const first = tones[0];
  const allSame = tones.every((tone) => tone === first);
  return allSame ? first : "mixed";
}

function toBaseNameId(nameId: string): string {
  const replaced = nameId.replace(
    new RegExp(`_(${SKIN_TONE_TOKEN_PATTERN})`, "g"),
    "",
  );
  return replaced.replace(/__+/g, "_").replace(/^_|_$/g, "");
}

function pickVariantForTone(
  variants: { emoji: EmojiType; tone: ExtractedSkinTone }[],
  selectedSkinTone: SkinToneKey,
): EmojiType {
  if (selectedSkinTone === "none") {
    return (
      variants.find((variant) => variant.tone === "none")?.emoji ??
      variants.find((variant) => variant.tone !== "mixed")?.emoji ??
      variants[0].emoji
    );
  }

  return (
    variants.find((variant) => variant.tone === selectedSkinTone)?.emoji ??
    variants.find((variant) => variant.tone === "none")?.emoji ??
    variants.find((variant) => variant.tone !== "mixed")?.emoji ??
    variants[0].emoji
  );
}

function filterPeopleEmojisBySkinTone(
  emojis: EmojiType[],
  selectedSkinTone: SkinToneKey,
): EmojiType[] {
  const variantsByBase = new Map<
    string,
    { emoji: EmojiType; tone: ExtractedSkinTone }[]
  >();

  for (const emoji of emojis) {
    const baseNameId = toBaseNameId(emoji.name_id);
    const tone = extractSkinTone(emoji.name_id);
    const variants = variantsByBase.get(baseNameId) ?? [];
    variants.push({ emoji, tone });
    variantsByBase.set(baseNameId, variants);
  }

  const filtered: EmojiType[] = [];
  for (const variants of variantsByBase.values()) {
    filtered.push(pickVariantForTone(variants, selectedSkinTone));
  }

  return filtered;
}

export default function GroupedEmojiPicker({
  onSelect,
  selectedNameId,
}: GroupedEmojiPickerProps) {
  const borderColor = useColors().border_color;
  const bgColor = useColors().inconspicuous_background_color;
  const tintColor = useColors().link_color;
  const buttonFontColor = useColors().button_font_color;
  const textColor = useColors().font_color;

  const grouped = useMemo(() => {
    const deduped = new Set<string>();
    const groups = new Map<string, EmojiType[]>();

    for (const list of EMOJI_SOURCE_LIST) {
      for (const raw of list) {
        if (!raw.name_id || !raw.name) continue;
        if (deduped.has(raw.name_id)) continue;

        deduped.add(raw.name_id);
        const normalized = normalizeEmoji(raw);
        const groupName = normalized.group || "Other";

        const current = groups.get(groupName) ?? [];
        current.push(normalized);
        groups.set(groupName, current);
      }
    }

    return groups;
  }, []);

  const groups = useMemo(() => {
    return Array.from(grouped.keys());
  }, [grouped]);

  const [activeGroup, setActiveGroup] = useState<string>(groups[0] ?? "");
  const [selectedSkinTone, setSelectedSkinTone] = useState<SkinToneKey>("none");

  useEffect(() => {
    if (!groups.includes(activeGroup)) {
      setActiveGroup(groups[0] ?? "");
    }
  }, [activeGroup, groups]);

  useEffect(() => {
    if (!selectedNameId) return;
    const extracted = extractSkinTone(selectedNameId);
    if (extracted === "mixed") return;
    setSelectedSkinTone(extracted);
  }, [selectedNameId]);

  const activeEmojis = useMemo(() => {
    const items = grouped.get(activeGroup) ?? [];
    if (activeGroup !== PEOPLE_GROUP_NAME) return items;
    return filterPeopleEmojisBySkinTone(items, selectedSkinTone);
  }, [activeGroup, grouped, selectedSkinTone]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {groups.map((group) => {
          const isActive = group === activeGroup;
          return (
            <Pressable
              key={group}
              onPress={() => setActiveGroup(group)}
              style={[
                styles.tab,
                {
                  borderColor: isActive ? tintColor : borderColor,
                  backgroundColor: isActive ? tintColor : bgColor,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  {
                    color: isActive ? buttonFontColor : undefined,
                  },
                ]}
              >
                {GROUP_LABELS[group] ?? group}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {activeGroup === PEOPLE_GROUP_NAME ? (
        <View style={styles.skinToneContainer}>
          <ThemedText style={[styles.skinToneLabel, { color: textColor }]}>
            肌色
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.skinToneRow}
          >
            {SKIN_TONE_OPTIONS.map((option) => {
              const isActive = selectedSkinTone === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setSelectedSkinTone(option.key)}
                  style={[
                    styles.skinToneButton,
                    {
                      borderColor: isActive ? tintColor : borderColor,
                      backgroundColor: isActive ? tintColor : "transparent",
                    },
                  ]}
                >
                  <ThemedText
                    style={{
                      fontSize: 18,
                      color: isActive ? buttonFontColor : undefined,
                    }}
                  >
                    {option.preview}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView
        style={styles.emojiScroll}
        contentContainerStyle={styles.emojiGrid}
      >
        {activeEmojis.map((emoji) => {
          const isSelected = selectedNameId === emoji.name_id;
          return (
            <Pressable
              key={emoji.name_id}
              onPress={() => onSelect(emoji)}
              style={[
                styles.emojiButton,
                {
                  borderColor: isSelected ? tintColor : borderColor,
                  backgroundColor: isSelected ? bgColor : "transparent",
                },
              ]}
            >
              <ThemedText style={styles.emoji}>{emoji.name}</ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  tabRow: {
    paddingRight: 8,
    gap: 8,
  },
  tab: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  skinToneContainer: {
    gap: 6,
  },
  skinToneLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  skinToneRow: {
    gap: 8,
    paddingRight: 8,
  },
  skinToneButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiScroll: {
    maxHeight: 220,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingRight: 2,
  },
  emojiButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 20,
    lineHeight: 24,
  },
});
