import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { CodeStep, PasswordStep, SuccessView } from '../components/steps';
import { AppTextField, ErrorText, PrimaryButton, Screen } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { isValidEmail } from '../lib/dates';
import { colors } from '../lib/theme';

type Step = 'details' | 'password' | 'code' | 'success';

// Registrierung als Auftraggeber (Rolle CLIENT); die Rolle setzt das Backend.
//
//   Angaben  → POST /users/register/code  (prüft E-Mail, schickt Code)
//   Passwort → nur lokal
//   Code     → POST /users/register       (legt den Benutzer an)
export default function RegisterScreen() {
  const params = useLocalSearchParams<{ email?: string }>(); // z. B. aus "Passwort vergessen"
  const [step, setStep] = useState<Step>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');

  // Ruft das Backend auf; bei Erfolg geht es zum nächsten Schritt.
  async function call(path: string, body: object, next: Step) {
    setLoading(true);
    setError(null);
    try {
      await api.postJson(path, body);
      setStep(next);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const canSubmitDetails = name.trim().length >= 2 && isValidEmail(email) && !loading;

  return (
    <Screen>
      {step === 'details' && (
        <View>
          <Text style={{ fontSize: 16, color: colors.text }}>Bitte geben Sie Ihren Namen und Ihre E-Mail-Adresse ein.</Text>
          <View style={{ height: 16 }} />
          <AppTextField label="Vor- und Nachname" value={name} onChangeText={setName} autoComplete="name" />
          <AppTextField
            label="E-Mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />
          <View style={{ height: 12 }} />
          <PrimaryButton
            label="Weiter"
            loading={loading}
            disabled={!canSubmitDetails}
            onPress={() => call('/users/register/code', { name: name.trim(), email: email.trim() }, 'password')}
          />
          <ErrorText message={error} />
        </View>
      )}
      {step === 'password' && (
        <PasswordStep
          description={'Wählen Sie ein Passwort.\nDas Passwort muss mindestens 8 Zeichen haben.'}
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
          buttonLabel="Konto anlegen"
          loading={loading}
          error={error}
          onSubmit={() =>
            call('/users/register', { name: name.trim(), email: email.trim(), code: code.trim(), password }, 'success')
          }
        />
      )}
      {step === 'success' && (
        <SuccessView
          title="Ihr Konto ist fertig."
          subtitle="Sie können sich jetzt anmelden."
          buttonLabel="Zur Anmeldung"
          onPress={() => router.dismissAll()}
        />
      )}
    </Screen>
  );
}
