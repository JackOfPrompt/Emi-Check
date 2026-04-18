import React, { useState, useRef } from "react";
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
  SUPER_CAT_A: "Super A",
  CAT_A: "Cat A",
  CAT_B: "Cat B",
  CAT_C: "Cat C",
  CAT_D: "Cat D",
  CAT_E: "Cat E",
  CAT_A_PSU: "Cat A PSU",
  CSC_C: "CSC C",
  CSC_D: "CSC D",
  ELITE: "Elite",
  SUPER_PRIME: "Super Prime",
  PREFERRED: "Preferred",
  OPEN_MARKET: "Open Mkt",
  DIAMOND_PLUS: "Diamond+",
  DIAMOND: "Diamond",
  GOLD_PLUS: "Gold+",
  GOLD: "Gold",
  SILVER_PLUS: "Silver+",
  SILVER: "Silver",
  SELECT_ITBPO: "IT/BPO",
  ACE_PLUS: "Ace+",
  ACE: "Ace",
  CAT_SA: "Super A",
  TATA_GROUP: "Tata Grp",
  BLOCKED: "Blocked",
  DNS: "DNS",
  NEGATIVE: "Negative",
  DELISTED: "Delisted",
  UNLISTED: "Not listed",
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
  const { query, setQuery, results, loading, error: searchError, clear } = useEmployerSearch();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const displayText = value ? value.employer_name : query;

  function handleChangeText(text: string) {
    if (value) {
      onSelect(null);
    }
    setQuery(text);
    if (text.length >= 3) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }

  function handleSelect(employer: EmployerResult) {
    setQuery(employer.employer_name);
    setOpen(false);
    onSelect(employer);
    inputRef.current?.blur();
  }

  function handleClear() {
    clear();
    onSelect(null);
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleContinueUnlisted() {
    const unlisted: EmployerResult = {
      employer_name: query,
      best_category: "UNLISTED",
      best_foir: 0.55,
      matched_lenders: [],
      lender_categories: [],
      is_blocked: false,
    };
    handleSelect(unlisted);
  }

  const showDropdown = open && (results.length > 0 || (query.length >= 3 && !loading));
  const notFound = !loading && results.length === 0 && query.length >= 3;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.foreground }]}>
        Company / Employer Name
      </Text>

      {/* Input row */}
      <View
        style={[
          styles.inputRow,
          {
            borderColor: fieldError
              ? colors.destructive
              : value
              ? colors.success
              : colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <Feather
          name="search"
          size={16}
          color={colors.mutedForeground}
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.foreground }]}
          value={displayText}
          onChangeText={handleChangeText}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder="Type employer name (e.g. Infosys, TCS, HDFC)"
          placeholderTextColor={colors.mutedForeground}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          testID="employer-search-input"
        />
        {loading && !value && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.actionIcon}
          />
        )}
        {(value || query.length > 0) && !loading && (
          <TouchableOpacity onPress={handleClear} style={styles.actionIcon} hitSlop={8}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results dropdown */}
      {showDropdown && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: "#000",
            },
          ]}
        >
          {results.map((emp, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleSelect(emp)}
              style={[
                styles.resultRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: i < results.length - 1 ? 1 : 0,
                },
              ]}
              activeOpacity={0.7}
            >
              <Feather
                name="building"
                size={15}
                color={emp.is_blocked ? colors.destructive : colors.mutedForeground}
                style={styles.buildingIcon}
              />
              <View style={styles.resultContent}>
                <Text
                  style={[styles.resultName, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {emp.employer_name}
                </Text>
                <View style={styles.badgeRow}>
                  {!emp.is_blocked && (
                    <>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: colors.accent + "44" },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: colors.primary }]}>
                          {categoryLabel(emp.best_category)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: colors.background },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: foirColor(emp.best_foir, colors) },
                          ]}
                        >
                          FOIR {Math.round((emp.best_foir || 0) * 100)}%
                        </Text>
                      </View>
                      {(emp.matched_lenders?.length || 0) > 1 && (
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: colors.background },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            {emp.matched_lenders.length} lenders
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                  {emp.is_blocked && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: "#fee2e2" },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: colors.destructive }]}>
                        Not eligible
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* Not found / continue unlisted */}
          {notFound && (
            <TouchableOpacity
              onPress={handleContinueUnlisted}
              style={[
                styles.unlistedRow,
                { backgroundColor: colors.background },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.unlistedText, { color: colors.mutedForeground }]}>
                My company is not listed — continue with "{query}"
              </Text>
            </TouchableOpacity>
          )}

          {results.length > 0 && (
            <TouchableOpacity
              onPress={handleContinueUnlisted}
              style={[
                styles.unlistedRow,
                {
                  backgroundColor: colors.background,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.unlistedText, { color: colors.mutedForeground }]}>
                My company is not in this list
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Status feedback */}
      {value && !value.is_blocked && (
        <View style={styles.feedbackRow}>
          <Feather name="check-circle" size={13} color={colors.success} />
          <Text style={[styles.feedbackText, { color: colors.success }]}>
            Employer verified in lender database
          </Text>
        </View>
      )}

      {value && value.is_blocked && (
        <View
          style={[
            styles.blockedBanner,
            {
              backgroundColor: "#fef2f2",
              borderColor: colors.destructive,
            },
          ]}
        >
          <Feather
            name="alert-triangle"
            size={14}
            color={colors.destructive}
            style={{ flexShrink: 0 }}
          />
          <Text style={[styles.blockedText, { color: colors.destructive }]}>
            This employer is on the lender's restricted list. Loan approval may
            be difficult, but you can still submit your details.
          </Text>
        </View>
      )}

      {!value && !open && query.length >= 3 && !loading && results.length === 0 && (
        <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
          Company not found — tap "My company is not listed" to continue.
        </Text>
      )}

      {fieldError && (
        <Text style={[styles.helperText, { color: colors.destructive }]}>
          {fieldError}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 10,
    minHeight: 50,
    paddingHorizontal: 10,
  },
  searchIcon: { marginRight: 6 },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },
  actionIcon: { padding: 4 },
  dropdown: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 100,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  buildingIcon: { marginTop: 2 },
  resultContent: { flex: 1 },
  resultName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: "500" },
  unlistedRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  unlistedText: { fontSize: 13 },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  feedbackText: { fontSize: 12 },
  blockedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  blockedText: { fontSize: 13, flex: 1, lineHeight: 18 },
  helperText: { fontSize: 12, marginTop: 6 },
});
