import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface ProgressBarProps {
  currentStep: number;
}

const STEPS = [
  { label: "Profile", icon: "user" },
  { label: "Obligations", icon: "credit-card" },
  { label: "Loan", icon: "home" },
  { label: "Result", icon: "award" },
];

export function ProgressBar({ currentStep }: ProgressBarProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {STEPS.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          const isLast = index === STEPS.length - 1;

          return (
            <React.Fragment key={index}>
              <View style={styles.stepCol}>
                <View
                  style={[
                    styles.circle,
                    isActive && [styles.circleActive, { borderColor: colors.primary, backgroundColor: colors.primary }],
                    isCompleted && [styles.circleCompleted, { backgroundColor: colors.primary, borderColor: colors.primary }],
                    !isActive && !isCompleted && { borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                >
                  {isCompleted ? (
                    <Feather name="check" size={10} color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        { color: isActive ? "#fff" : colors.mutedForeground },
                      ]}
                    >
                      {stepNum}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color: isActive || isCompleted ? colors.primary : colors.mutedForeground,
                      fontWeight: isActive ? "600" : "400",
                    },
                  ]}
                >
                  {step.label}
                </Text>
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: isCompleted ? colors.primary : colors.border },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepCol: {
    alignItems: "center",
    gap: 4,
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  circleActive: {},
  circleCompleted: {},
  stepNumber: {
    fontSize: 10,
    fontWeight: "700",
  },
  stepLabel: {
    fontSize: 9,
    letterSpacing: 0.2,
  },
  connector: {
    flex: 1,
    height: 2,
    marginBottom: 14,
    marginHorizontal: 4,
    borderRadius: 1,
  },
});
