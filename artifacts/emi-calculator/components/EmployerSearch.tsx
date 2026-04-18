import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useEmployerSearch, EmployerResult } from "@/hooks/useEmployerSearch";

const CATEGORY_LABELS: Record<string, string> = {
  SUPER_CAT_A: "Super Category A",
  CAT_A: "Category A",
  CAT_B: "Category B",
  CAT_C: "Category C",
  CAT_D: "Category D",
  CAT_E: "Category E",
  CAT_A_PSU: "Category A PSU",
  CSC_C: "CSC C",
  CSC_D: "CSC D",
  ELITE: "Elite",
  SUPER_PRIME: "Super Prime",
  PREFERRED: "Preferred",
  OPEN_MARKET: "Open Market",
  DIAMOND_PLUS: "Diamond Plus",
  DIAMOND: "Diamond",
  GOLD_PLUS: "Gold Plus",
  GOLD: "Gold",
  SILVER_PLUS: "Silver Plus",
  SILVER: "Silver",
  SELECT_ITBPO: "IT/BPO",
  ACE_PLUS: "Ace Plus",
  ACE: "Ace",
  CAT_SA: "Super A",
  TATA_GROUP: "Tata Group",
  BLOCKED: "Blocked",
  DNS: "DNS",
  NEGATIVE: "Negative",
  DELISTED: "Delisted",
  UNLISTED: "Not Listed",
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] || cat;
}

function foirColor(foir: number | null, colors: any): string {
  if (!foir) return colors.mutedForeground;
  if (foir >= 0.7) return colors.success;
  if (foir >= 0.6) return colors.warning;
  return colors.destructive;
}

interface Props {
  value: EmployerResult | null;
  onSelect: (employer: EmployerResult | null) => void;
  error?: string;
}

export function EmployerSearch({ value, onSelect, error: fieldError }: Props) {
  const colors = useColors();
  const { query, setQuery, results, loading, clear } = useEmployerSearch();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inputText, setInputText] = useState(value?.employer_name || "");
  const inputRef = useRef<TextInput>(null);

  // Sync display text when an employer is selected externally
  useEffect(() => {
    if (value) setInputText(value.employer_name);
    // When value is null, don't overwrite — user may be actively typing
  }, [value]);

  function handleChangeText(text: string) {
    setInputText(text);
    if (value) onSelect(null);
    setQuery(text);
    // Sheet stays open while user is typing — don't close it here
  }

  function handleSelect(employer: EmployerResult) {
    setInputText(employer.employer_name);
    setQuery(employer.employer_name);
    setSheetOpen(false);
    onSelect(employer);
  }

  function handleContinueUnlisted() {
    const name = inputText.trim() || query.trim();
    const unlisted: EmployerResult = {
      employer_name: name || "Unlisted Employer",
      best_category: "UNLISTED",
      best_foir: 0.55,
      matched_lenders: [],
      lender_categories: [],
      is_blocked: false,
    };
    setInputText(unlisted.employer_name);
    setQuery(unlisted.employer_name);
    setSheetOpen(false);
    onSelect(unlisted);
  }

  function handleClear() {
    clear();
    setInputText("");
    setSheetOpen(false);
    onSelect(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  const notFound = !loading && results.length === 0 && query.length >= 3;
  const hasResults = results.length > 0;

  // Show sheet whenever user opens it — regardless of query length
  const showSheet = sheetOpen;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.foreground }]}>
        Company / Employer Name{" "}
        <Text style={{ color: colors.mutedForeground, fontWeight: "400" }}>
          (Optional)
        </Text>
      </Text>

      {/* Trigger input — tapping opens the sheet */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          if (!value) {
            setSheetOpen(true);
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }}
      >
        <View
          style={[
            styles.inputRow,
            {
              borderColor: fieldError
                ? colors.destructive
                : value
                ? colors.success
                : sheetOpen
                ? colors.primary
                : colors.border,
              backgroundColor: colors.card,
            },
          ]}
        >
          <Feather
            name="search"
            size={16}
            color={value ? colors.success : colors.mutedForeground}
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.foreground }]}
            value={inputText}
            onChangeText={handleChangeText}
            onFocus={() => {
              if (!value) setSheetOpen(true);
            }}
            placeholder="Tap to search employer..."
            placeholderTextColor={colors.mutedForeground}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
            testID="employer-search-input"
            editable={false}
          />
          {loading && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.actionIcon} />
          )}
          {(value || inputText.length > 0) && !loading && (
            <TouchableOpacity onPress={handleClear} style={styles.actionIcon} hitSlop={8}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {/* Status feedback when employer is selected */}
      {value && !value.is_blocked && (
        <View style={[styles.feedbackRow, { backgroundColor: "#f0fdf4", borderColor: "#86efac" }]}>
          <Feather name="check-circle" size={14} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.feedbackText, { color: colors.success }]}>
              Employer found in lender database
            </Text>
            <Text style={[styles.feedbackSub, { color: colors.mutedForeground }]}>
              Best FOIR: {Math.round((value.best_foir || 0) * 100)}% ·{" "}
              {categoryLabel(value.best_category)}
              {(value.matched_lenders?.length || 0) > 0
                ? ` · ${value.matched_lenders.length} lender${value.matched_lenders.length > 1 ? "s" : ""}`
                : ""}
            </Text>
          </View>
        </View>
      )}

      {value && value.is_blocked && (
        <View style={[styles.feedbackRow, { backgroundColor: "#fef2f2", borderColor: "#fca5a5" }]}>
          <Feather name="alert-triangle" size={14} color={colors.destructive} />
          <Text style={[styles.feedbackText, { color: colors.destructive, flex: 1 }]}>
            This employer is on a restricted list. You can still submit — some lenders may consider your application.
          </Text>
        </View>
      )}

      {value && value.best_category === "UNLISTED" && (
        <View style={[styles.feedbackRow, { backgroundColor: colors.goldLight, borderColor: colors.gold + "50" }]}>
          <Feather name="info" size={14} color={colors.gold} />
          <Text style={[styles.feedbackText, { color: colors.gold, flex: 1 }]}>
            Company not in lender list — please select your Employer Category manually below.
          </Text>
        </View>
      )}

      {fieldError && (
        <Text style={[styles.helperText, { color: colors.destructive }]}>⚠ {fieldError}</Text>
      )}

      {/* Modal bottom sheet for search results */}
      <Modal
        visible={showSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              Search Employer
            </Text>

            {/* Inline search input inside sheet */}
            <View
              style={[
                styles.sheetInputRow,
                { borderColor: colors.primary, backgroundColor: colors.background },
              ]}
            >
              <Feather name="search" size={16} color={colors.primary} style={styles.searchIcon} />
              <TextInput
                autoFocus
                style={[styles.input, { color: colors.foreground }]}
                value={inputText}
                onChangeText={handleChangeText}
                placeholder="Type employer name..."
                placeholderTextColor={colors.mutedForeground}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="search"
              />
              {loading && <ActivityIndicator size="small" color={colors.primary} />}
              {inputText.length > 0 && !loading && (
                <TouchableOpacity onPress={() => { setInputText(""); setQuery(""); clear(); }}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            {/* Results list */}
            {hasResults && (
              <FlatList
                data={results}
                keyExtractor={(item, i) => `${item.employer_name}-${i}`}
                keyboardShouldPersistTaps="handled"
                style={styles.resultList}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[
                      styles.resultRow,
                      {
                        borderBottomColor: colors.border,
                        borderBottomWidth: index < results.length - 1 ? 1 : 0,
                      },
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.65}
                  >
                    <View
                      style={[
                        styles.resultIcon,
                        {
                          backgroundColor: item.is_blocked
                            ? "#fee2e2"
                            : colors.accent,
                        },
                      ]}
                    >
                      <Feather
                        name="building"
                        size={14}
                        color={item.is_blocked ? colors.destructive : colors.primary}
                      />
                    </View>
                    <View style={styles.resultContent}>
                      <Text style={[styles.resultName, { color: colors.foreground }]} numberOfLines={1}>
                        {item.employer_name}
                      </Text>
                      <View style={styles.badgeRow}>
                        {!item.is_blocked ? (
                          <>
                            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                              <Text style={[styles.badgeText, { color: colors.primary }]}>
                                {categoryLabel(item.best_category)}
                              </Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: colors.background }]}>
                              <Text
                                style={[
                                  styles.badgeText,
                                  { color: foirColor(item.best_foir, colors) },
                                ]}
                              >
                                FOIR {Math.round((item.best_foir || 0) * 100)}%
                              </Text>
                            </View>
                            {(item.matched_lenders?.length || 0) > 1 && (
                              <View style={[styles.badge, { backgroundColor: colors.background }]}>
                                <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                                  {item.matched_lenders.length} lenders
                                </Text>
                              </View>
                            )}
                          </>
                        ) : (
                          <View style={[styles.badge, { backgroundColor: "#fee2e2" }]}>
                            <Text style={[styles.badgeText, { color: colors.destructive }]}>
                              Not eligible
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.border} />
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Not found state */}
            {notFound && (
              <View style={styles.notFoundArea}>
                <View style={[styles.notFoundIcon, { backgroundColor: colors.muted }]}>
                  <Feather name="search" size={24} color={colors.mutedForeground} />
                </View>
                <Text style={[styles.notFoundTitle, { color: colors.foreground }]}>
                  "{inputText}" not found
                </Text>
                <Text style={[styles.notFoundSub, { color: colors.mutedForeground }]}>
                  Your employer might not be in our lender database yet.
                  You can still proceed — just select your employer category manually.
                </Text>
              </View>
            )}

            {/* Empty state (query < 3 chars) */}
            {!hasResults && !notFound && inputText.length < 3 && (
              <View style={styles.notFoundArea}>
                <Feather name="search" size={32} color={colors.border} />
                <Text style={[styles.notFoundSub, { color: colors.mutedForeground, marginTop: 10 }]}>
                  Type at least 3 characters to search
                </Text>
              </View>
            )}

            {/* Not in list option */}
            <TouchableOpacity
              style={[
                styles.unlistedBtn,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
              onPress={handleContinueUnlisted}
              activeOpacity={0.7}
            >
              <Feather name="skip-forward" size={15} color={colors.mutedForeground} />
              <Text style={[styles.unlistedText, { color: colors.foreground }]}>
                My company is not in this list — continue anyway
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  sheetInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },
  actionIcon: { padding: 4 },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  feedbackText: { fontSize: 13, fontWeight: "500" },
  feedbackSub: { fontSize: 12, marginTop: 2 },
  helperText: { fontSize: 12, marginTop: 6 },

  // Modal sheet
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    maxHeight: "82%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  resultList: { maxHeight: 340 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  resultContent: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  badgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  notFoundArea: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  notFoundIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  notFoundTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  notFoundSub: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  unlistedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  unlistedText: { fontSize: 14, fontWeight: "500", flex: 1 },
});
