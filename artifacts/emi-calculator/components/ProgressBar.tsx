import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface ProgressBarProps {
  currentStep: number;
}

const STEPS = ["Employment", "Obligations", "Loan", "Result"];

export function ProgressBar({ currentStep }: ProgressBarProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        {STEPS.map((_, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          return (
            <React.Fragment key={index}>
              <View
                style={[
                  styles.segment,
                  {
                    backgroundColor:
                      isCompleted || isActive
                        ? colors.primary
                        : colors.border,
                  },
                ]}
              />
              {index < STEPS.length - 1 && <View style={styles.gap} />}
            </React.Fragment>
          );
        })}
      </View>
      <View style={styles.labelsContainer}>
        {STEPS.map((label, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          return (
            <Text
              key={index}
              style={[
                styles.label,
                {
                  color:
                    isActive || isCompleted
                      ? colors.primary
                      : colors.mutedForeground,
                  fontWeight: isActive ? "600" : "400",
                },
              ]}
            >
              {label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  barContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  gap: {
    width: 4,
  },
  labelsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 10,
    flex: 1,
    textAlign: "center",
  },
});
