import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { CodeStep, PasswordStep, SuccessView } from '../components/steps';
import { AppTextField, Card, ErrorText, PrimaryButton, Screen, SignuraHeader } from '../components/ui';
import { api, ApiException, errorMessage } from '../lib/api';
import { isValidEmail } from '../lib/dates';
import { useColors } from '../lib/theme';

type Step = 'email' | 'password' | 'code' | 'success';

// Passwort vergessen:
//
//   E-Mail   → POST /users/password/code   (schickt Code; 404 = kein Konto)
//   Passwort → nur lokal
//   Code     → POST /users/password/reset  (setzt das neue Passwort)
export default function ForgotPasswordScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Zur E-Mail gibt es kein Konto (Backend 404) → Hinweis auf Registrierung.
  const [noAccount, setNoAccount] = useState(false);
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');

  async function call(path: string, body: object, next: Step) {
    setLoading(true);
    setError(null);
    setNoAccount(false);
    try {
      await api.postJson(path, body);
      setStep(next);
    } catch (e) {
      if (next === 'password' && e instanceof ApiException && e.statusCode === 404) setNoAccount(true);
      else setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const toRegister = () => router.replace({ pathname: '/register', params: { email: email.trim() } });

  return (
    <Screen>
      <SignuraHeader />
      {step === 'email' && (
        <View>
          <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22 }}>
            Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen Code. Mit diesem Code können Sie ein neues
            Passwort festlegen.
          </Text>
          <View style={{ height: 24 }} />
          <AppTextField
            label="E-Mail"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setNoAccount(false);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />
          {/* Kein Konto zu dieser E-Mail: Hinweis, "Weiter" führt zur Registrierung. */}
          {noAccount && (
            <Card style={{ padding: 16, marginBottom: 8 }}>
              <Text style={{ fontWeight: '600', color: colors.text }}>Mit dieser E-Mail-Adresse gibt es kein Konto.</Text>
              <Text style={{ marginTop: 4, color: colors.text }}>Klicken Sie auf Weiter.</Text>
              <Text style={{ color: colors.text }}>Dann können Sie ein neues Konto anlegen.</Text>
            </Card>
          )}
          <View style={{ height: 12 }} />
          <PrimaryButton
            label="Weiter"
            loading={loading}
            disabled={!isValidEmail(email)}
            onPress={noAccount ? toRegister : () => call('/users/password/code', { email: email.trim() }, 'password')}
          />
          <ErrorText message={error} />
        </View>
      )}
      {step === 'password' && (
        <PasswordStep
          description="Wählen Sie ein Passwort. Das Passwort muss mindestens 8 Zeichen haben."
          passwordLabel="Neues Passwort"
          password={password}
          confirm={confirm}
          onPassword={setPassword}
          onConfirm={setConfirm}
          onSubmit={() => setStep('code')}
        />
      )}
      {step === 'code' && (
        <CodeStep
          code={code}
          onChange={setCode}
          buttonLabel="Passwort speichern"
          loading={loading}
          error={error}
          onSubmit={() => call('/users/password/reset', { email: email.trim(), code: code.trim(), password }, 'success')}
        />
      )}
      {step === 'success' && (
        <SuccessView
          title="Ihr Passwort ist geändert."
          subtitle="Sie können sich jetzt mit dem neuen Passwort anmelden."
          buttonLabel="Zur Anmeldung"
          onPress={() => router.dismissAll()}
        />
      )}
    </Screen>
  );
}
