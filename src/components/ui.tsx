import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps, ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../lib/theme';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

// Kopf auf Anmeldung, Registrierung und "Passwort vergessen":
// Logo links, rechts daneben "Signura GL" und darunter "für Gehörlose".
// Das Logo ist rein dekorativ und für Screenreader ausgeblendet.
export function SignuraHeader() {
  return (
    <View style={styles.header}>
      <Image
        source={require('../../assets/images/signura-logo.png')}
        style={styles.headerLogo}
        accessibilityIgnoresInvertColors
        accessible={false}
      />
      <View>
        <Text style={styles.headerTitle}>
          <Text style={{ color: colors.brand }}>Signura</Text> GL
        </Text>
        <Text style={styles.headerSubtitle}>für Gehörlose</Text>
      </View>
    </View>
  );
}

// Seite mit Abstand und Scrollen (Flutter: SafeArea + SingleChildScrollView).
export function Screen({
  children,
  onRefresh,
  refreshing = false,
  padded = true,
  center = false,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  padded?: boolean;
  center?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[padded && styles.padded, center && styles.center]}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

// Eingabefeld mit Beschriftung oben im Feld; Passwortfelder mit Auge zum
// Ein-/Ausblenden.
export function AppTextField({
  label,
  secure = false,
  style,
  editable = true,
  rightIcon,
  ...props
}: TextInputProps & { label: string; secure?: boolean; style?: StyleProp<ViewStyle>; rightIcon?: IconName }) {
  const [hidden, setHidden] = useState(secure);
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.row}>
        <TextInput
          {...props}
          editable={editable}
          secureTextEntry={hidden}
          placeholderTextColor={colors.hint}
          style={[styles.input, !editable && { color: colors.muted }]}
        />
        {rightIcon && !secure && <MaterialIcons name={rightIcon} size={22} color={colors.muted} />}
        {secure && (
          <Pressable
            onPress={() => setHidden(!hidden)}
            hitSlop={8}
            accessibilityLabel={hidden ? 'Passwort anzeigen' : 'Passwort verbergen'}
          >
            <MaterialIcons name={hidden ? 'visibility-off' : 'visibility'} size={22} color={colors.muted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

// Antippbares Feld im Stil der Eingabefelder (Datum, Beginn, Ende, Auswahl).
export function TapField({
  label,
  value,
  placeholder,
  icon,
  trailingIcon,
  onPress,
  disabled,
  style,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  icon?: IconName;
  trailingIcon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.field, style]}>
      <Text style={styles.fieldLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.row}>
        {icon && <MaterialIcons name={icon} size={20} color={colors.muted} style={{ marginRight: 8 }} />}
        <Text
          style={[styles.input, !value && { color: colors.hint }, disabled && { color: colors.muted }]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        {trailingIcon && <MaterialIcons name={trailingIcon} size={22} color={colors.muted} />}
      </View>
    </Pressable>
  );
}

// Hauptknopf rechts (Flutter: PrimaryButton).
export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const off = disabled || loading;
  return (
    <View style={styles.alignRight}>
      <Pressable
        onPress={onPress}
        disabled={off}
        style={({ pressed }) => [styles.primary, off && styles.primaryOff, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={[styles.primaryText, off && { color: colors.muted }]}>{label}</Text>
        )}
      </Pressable>
    </View>
  );
}

// Umrandeter Knopf, z. B. "absagen" oder "Löschen" in Rot.
export function OutlineButton({
  label,
  icon,
  onPress,
  disabled,
  color = colors.error,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.outline, { borderColor: colors.outline, opacity: disabled ? 0.5 : 1 }]}
      accessibilityRole="button"
    >
      {icon && <MaterialIcons name={icon} size={18} color={color} style={{ marginRight: 6 }} />}
      <Text style={{ color, fontSize: 15, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

// Gefüllter Knopf mit Symbol und Text (z. B. "Neue Anfrage", "Kamera").
export function FilledButton({
  label,
  icon,
  onPress,
  disabled,
  tonal = false,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  tonal?: boolean;
}) {
  const fg = tonal ? colors.onTonal : colors.onPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.filled, { backgroundColor: tonal ? colors.tonal : colors.primary, opacity: disabled ? 0.5 : 1 }]}
      accessibilityRole="button"
    >
      {icon && <MaterialIcons name={icon} size={18} color={fg} style={{ marginRight: 6 }} />}
      <Text style={{ color: fg, fontSize: 15, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

// Runder Knopf nur mit Symbol (Flutter: IconButton.filledTonal / outlined).
export function RoundIconButton({
  icon,
  onPress,
  label,
  disabled,
  variant = 'tonal',
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  disabled?: boolean;
  variant?: 'tonal' | 'outlined' | 'plain';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={4}
      style={[
        styles.round,
        variant === 'tonal' && { backgroundColor: colors.tonal },
        variant === 'outlined' && { borderWidth: 1, borderColor: colors.outline },
        disabled && { opacity: 0.35 },
      ]}
    >
      <MaterialIcons name={icon} size={24} color={variant === 'tonal' ? colors.onTonal : colors.text} />
    </Pressable>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <MaterialIcons
      name={checked ? 'check-box' : 'check-box-outline-blank'}
      size={24}
      color={checked ? colors.primary : colors.muted}
    />
  );
}

// Rahmen wie Flutter-Card.
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[{ color: colors.muted, fontSize: 12 }, style]}>{children}</Text>;
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  padded: { padding: 12 },
  center: { flexGrow: 1, justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 },
  headerLogo: { width: 64, height: 64 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  headerSubtitle: { fontSize: 16, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center' },
  field: {
    backgroundColor: colors.field,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    marginBottom: 12,
  },
  fieldLabel: { fontSize: 12, color: colors.muted, marginBottom: 2 },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 4, minHeight: 28 },
  alignRight: { alignItems: 'flex-end' },
  primary: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  primaryOff: { backgroundColor: 'rgba(25, 28, 32, 0.12)' },
  primaryText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  outline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.error, fontSize: 13, textAlign: 'center', marginVertical: 20 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.outline },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
});
