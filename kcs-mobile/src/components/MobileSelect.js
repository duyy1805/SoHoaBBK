import React, { useMemo, useState } from "react";
import {
  FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MobileSelect({
  value,
  options = [],
  onValueChange,
  placeholder = "Chọn giá trị",
  title = "Chọn giá trị",
  disabled = false
}) {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === String(value)),
    [options, value]
  );

  const close = () => setVisible(false);
  const select = (option) => {
    onValueChange?.(option.value);
    close();
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.disabled]}
        disabled={disabled}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${selectedOption?.label || placeholder}`}
        onPress={() => setVisible(true)}
      >
        <Text
          style={[styles.triggerText, !selectedOption && styles.placeholder]}
          numberOfLines={1}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#64748b" />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        statusBarTranslucent
        presentationStyle="overFullScreen"
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.count}>{options.length} lựa chọn</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Đóng danh sách"
                onPress={close}
              >
                <Ionicons name="close" size={22} color="#334155" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(option) => String(option.value)}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.empty}>Không có lựa chọn phù hợp.</Text>}
              renderItem={({ item }) => {
                const selected = String(item.value) === String(value);
                return (
                  <TouchableOpacity
                    style={[styles.option, selected && styles.optionSelected]}
                    activeOpacity={0.7}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected }}
                    onPress={() => select(item)}
                  >
                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                        {item.label}
                      </Text>
                      {item.description ? (
                        <Text style={styles.optionDescription} numberOfLines={1}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    {selected ? <Ionicons name="checkmark" size={20} color="#2563eb" /> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  triggerText: { flex: 1, color: "#0f172a", fontSize: 15 },
  placeholder: { color: "#64748b" },
  disabled: { opacity: 0.55 },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.42)"
  },
  sheet: {
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingTop: 18,
    paddingHorizontal: 16
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0"
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: "#0f172a", fontSize: 18, fontWeight: "800" },
  count: { color: "#64748b", fontSize: 13, marginTop: 3 },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  list: { flexGrow: 0 },
  listContent: { paddingVertical: 10 },
  option: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  optionSelected: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  optionText: { flex: 1, minWidth: 0 },
  optionLabel: { color: "#1e293b", fontSize: 15, fontWeight: "600" },
  optionLabelSelected: { color: "#1d4ed8", fontWeight: "800" },
  optionDescription: { color: "#64748b", fontSize: 12, marginTop: 3 },
  empty: { color: "#64748b", textAlign: "center", paddingVertical: 28 }
});
