import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { FlagCheckList, FlagItem } from '../components/pickers';
import { CodeInput } from '../components/steps';
import { AppTextField, ErrorText, Muted, PrimaryButton, Screen } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { isValidEmail } from '../lib/dates';
import { useSession } from '../lib/session';
import { colors } from '../lib/theme';

// Sprache der App (Anzeige, E-Mails).
const APP_LANGUAGES: FlagItem[] = [
  { value: 'de_DE', name: 'Deutsch', flag: '🇩🇪' },
  { value: 'en_US', name: 'English', flag: '🇬🇧' },
];

// Wie das Backend: +49… ohne Leerzeichen, damit "0170 1" = "+491701" ist.
function normMobile(m: string) {
  let n = m.replace(/[\s\-/().]/g, '');
  if (n.startsWith('00')) n = '+' + n.slice(2);
  if (n.startsWith('0')) n = '+49' + n.slice(1);
  if (n && !n.startsWith('+')) n = '+' + n;
  return n;
}

// Meine Daten (GET/PUT /me): Name, E-Mail, Handynummer, Sprache der App und
// Sprachen für die Übersetzung.
//
// "speichern": Sind E-Mail und/oder Handynummer neu, schickt das Backend
// zuerst Codes (POST /me/verify/code). Erst mit den Codes wird gespeichert.
export default function ProfileScreen() {
  const { user, setUser } = useSession();
  const str = (k: string) => (typeof user?.[k] === 'string' ? (user[k] as string) : '');

  const [firstName, setFirstName] = useState(str('first_name'));
  const [lastName, setLastName] = useState(str('last_name'));
  const [email, setEmail] = useState(str('email'));
  const [mobile, setMobile] = useState(str('mobile'));
  const [emailCode, setEmailCode] = useState('');
  const [mobileCode, setMobileCode] = useState('');
  const [language, setLanguage] = useState(str('language') || 'de_DE');
  const [translation, setTranslation] = useState<string[]>(
    Array.isArray(user?.translation_languages) ? user.translation_languages.filter((x: unknown) => typeof x === 'string') : [],
  );
  const [allLanguages, setAllLanguages] = useState<FlagItem[]>([]);

  // Nach "speichern" mit neuer E-Mail/Handynummer: Codes eingeben.
  const [awaitingCodes, setAwaitingCodes] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [mobileCodeSent, setMobileCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.getJsonList('/translation-languages');
        setAllLanguages(list.map((l) => ({ value: String(l.code), name: String(l.name), flag: String(l.flag ?? '') })));
      } catch (e) {
        setError(errorMessage(e));
      }
    })();
  }, []);

  const emailChanged = email.trim().toLowerCase() !== str('email').toLowerCase();
  const mobileChanged = mobile.trim() !== '' && normMobile(mobile) !== normMobile(str('mobile'));
  const canSave = firstName.trim() !== '' && lastName.trim() !== '' && isValidEmail(email) && !loading;
  const canConfirm = (!emailCodeSent || emailCode.length === 5) && (!mobileCodeSent || mobileCode.length === 5) && !loading;

  async function runAction(action: () => Promise<void>) {
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function submit(withEmailCode: boolean, withMobileCode: boolean) {
    const saved = await api.putJson('/me', {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      language,
      // Nur Sprachen, die das Backend noch anbietet (abgeschaltete fallen weg).
      translation_languages: translation.filter((c) => allLanguages.some((l) => l.value === c)),
      ...(withEmailCode ? { email_code: emailCode.trim() } : {}),
      ...(withMobileCode ? { mobile_code: mobileCode.trim() } : {}),
    });
    setUser(saved);
    router.back();
  }

  // "speichern": bei neuer E-Mail/Handynummer erst Codes schicken.
  const save = () =>
    runAction(async () => {
      if (emailChanged || mobileChanged) {
        const res = await api.postJson('/me/verify/code', {
          email: emailChanged ? email.trim() : '',
          mobile: mobileChanged ? mobile.trim() : '',
        });
        const e = res.email_sent === true;
        const m = res.mobile_sent === true;
        setEmailCodeSent(e);
        setMobileCodeSent(m);
        setEmailCode('');
        setMobileCode('');
        if (e || m) {
          setAwaitingCodes(true);
          return;
        }
      }
      await submit(false, false);
    });

  if (awaitingCodes) {
    return (
      <Screen>
        {emailCodeSent && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 15, color: colors.text, marginBottom: 12 }}>
              Wir haben einen 5-stelligen Code an {email.trim()} geschickt. Bitte geben Sie ihn hier ein.
            </Text>
            <CodeInput value={emailCode} onChange={setEmailCode} />
          </View>
        )}
        {mobileCodeSent && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 15, color: colors.text, marginBottom: 12 }}>
              Wir haben einen 5-stelligen Code per SMS an {mobile.trim()} geschickt. Bitte geben Sie ihn hier ein.
            </Text>
            <CodeInput value={mobileCode} onChange={setMobileCode} />
          </View>
        )}
        <Muted>Die Codes gelten 10 Minuten.</Muted>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
          <Pressable
            disabled={loading}
            style={{ padding: 10 }}
            onPress={() => {
              setAwaitingCodes(false);
              setError(null);
            }}
          >
            <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '500' }}>zurück</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <PrimaryButton
            label="bestätigen"
            loading={loading}
            disabled={!canConfirm}
            onPress={() => runAction(() => submit(emailCodeSent, mobileCodeSent))}
          />
        </View>
        <ErrorText message={error} />
      </Screen>
    );
  }

  // Unbekannte, gespeicherte Sprache der App (z. B. aus der alten App) zeigen.
  const appLanguages = APP_LANGUAGES.some((l) => l.value === language)
    ? APP_LANGUAGES
    : [...APP_LANGUAGES, { value: language, name: language, flag: '🏳️' }];

  return (
    <Screen>
      <View style={{ flexDirection: 'row' }}>
        <AppTextField style={{ flex: 1, marginRight: 12 }} label="Vorname" value={firstName} onChangeText={setFirstName} />
        <AppTextField style={{ flex: 1 }} label="Nachname" value={lastName} onChangeText={setLastName} />
      </View>
      <AppTextField label="E-Mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <AppTextField label="Handynummer" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
      {/* Sprache der App: genau eine; Antippen setzt das Häkchen um. */}
      <FlagCheckList label="Sprache der App" items={appLanguages} selected={[language]} onChange={(v) => setLanguage(v)} />
      <View style={{ height: 16 }} />
      {/* Sprachen für die Übersetzung: mehrere, gewählte stehen oben. */}
      {allLanguages.length === 0 ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <FlagCheckList
          label="Welche Sprache brauchen Sie?"
          items={allLanguages}
          selected={translation}
          onChange={(code, on) => setTranslation((t) => (on ? [...t, code] : t.filter((c) => c !== code)))}
        />
      )}
      <View style={{ height: 16 }} />
      <PrimaryButton label="speichern" loading={loading} disabled={!canSave} onPress={save} />
      <ErrorText message={error} />
    </Screen>
  );
}
