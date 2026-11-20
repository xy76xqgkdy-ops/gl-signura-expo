import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../lib/theme';
import { AppTextField, ErrorText, PrimaryButton } from './ui';

const CODE_LENGTH = 5;
// So lange gilt der Code im Backend (service/email_code.go: codeValidity).
const CODE_VALIDITY_SECONDS = 10 * 60;

// 5 Kästchen für den Code. Ein unsichtbares Eingabefeld nimmt die Ziffern
// auf, so geht auch Einfügen des ganzen Codes.
export function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  return (
    <Pressable onPress={() => ref.current?.focus()} style={s.codeRow} accessibilityLabel="Code eingeben">
      {Array.from({ length: CODE_LENGTH }, (_, i) => {
        const active = focused && i === Math.min(value.length, CODE_LENGTH - 1);
        return (
          <View key={i} style={[s.codeBox, active && { borderColor: colors.primary }]}>
            <Text style={s.codeDigit}>{value[i] ?? ''}</Text>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        autoFocus
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={s.hiddenInput}
        caretHidden
      />
    </Pressable>
  );
}

// "Code eingeben"-Schritt für Registrierung und Passwort vergessen; löst
// den letzten Aufruf aus (register bzw. reset). Läuft der Code ab, geht es
// zurück zur Anmeldung.
export function CodeStep({
  code,
  onChange,
  buttonLabel,
  loading,
  onSubmit,
  error,
}: {
  code: string;
  onChange: (v: string) => void;
  buttonLabel: string;
  loading: boolean;
  onSubmit: () => void;
  error?: string | null;
}) {
  const [left, setLeft] = useState(CODE_VALIDITY_SECONDS);
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left <= 0) router.dismissAll();
  }, [left]);

  return (
    <View>
      <Text style={s.text}>
        {'Wir haben Ihnen einen Code per E-Mail geschickt.\nDer Code hat 5 Stellen.\nBitte schauen Sie in Ihr E-Mail-Postfach.\nGeben Sie den Code hier ein.'}
      </Text>
      <View style={{ height: 24 }} />
      <CodeInput value={code} onChange={onChange} />
      <Text style={s.timer}>
        Der Code gilt noch {Math.floor(Math.max(left, 0) / 60)}:{String(Math.max(left, 0) % 60).padStart(2, '0')} Minuten.
      </Text>
      <View style={{ height: 16 }} />
      <PrimaryButton label={buttonLabel} loading={loading} disabled={code.length !== CODE_LENGTH} onPress={onSubmit} />
      <ErrorText message={error} />
    </View>
  );
}

// "Passwort wählen"-Schritt (nur lokal, kein Aufruf).
export function PasswordStep({
  description,
  password,
  confirm,
  onPassword,
  onConfirm,
  passwordLabel = 'Passwort',
  onSubmit,
}: {
  description: string;
  password: string;
  confirm: string;
  onPassword: (v: string) => void;
  onConfirm: (v: string) => void;
  passwordLabel?: string;
  onSubmit: () => void;
}) {
  const ok = password.length >= 8 && password === confirm;
  return (
    <View>
      <Text style={[s.text, { fontSize: 16 }]}>{description}</Text>
      <View style={{ height: 24 }} />
      <AppTextField label={passwordLabel} secure value={password} onChangeText={onPassword} autoComplete="new-password" />
      <AppTextField label="Passwort bestätigen" secure value={confirm} onChangeText={onConfirm} autoComplete="new-password" />
      <View style={{ height: 12 }} />
      <PrimaryButton label="Weiter" disabled={!ok} onPress={onSubmit} />
    </View>
  );
}

export function SuccessView({
  title,
  subtitle,
  buttonLabel,
  onPress,
}: {
  title: string;
  subtitle: string;
  buttonLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={s.success}>
      <MaterialIcons name="check-circle" size={64} color={colors.success} />
      <Text style={s.successTitle}>{title}</Text>
      <Text style={s.successSub}>{subtitle}</Text>
      <View style={{ height: 24, alignSelf: 'stretch' }} />
      <View style={{ alignSelf: 'stretch' }}>
        <PrimaryButton label={buttonLabel} onPress={onPress} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  text: { fontSize: 15, color: colors.text, lineHeight: 22 },
  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  codeBox: {
    width: 52,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.field,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeDigit: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  timer: { textAlign: 'center', fontSize: 13, color: colors.muted, marginTop: 8 },
  success: { alignItems: 'center', padding: 24 },
  successTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 16, color: colors.text },
  successSub: { fontSize: 16, textAlign: 'center', marginTop: 8, color: colors.muted },
});
