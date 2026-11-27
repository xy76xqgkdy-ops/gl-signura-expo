import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import { ErrorText, FilledButton, InfoNote, OutlineButton, Screen } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { makeStyles, useColors } from '../lib/theme';

// Profilbild: mit der Kamera aufnehmen, aus der Galerie wählen oder löschen.
//   GET/PUT/DELETE /me/picture
// Das Bild wird vor dem Hochladen verkleinert (800 px, JPEG).
export default function PictureScreen() {
  const colors = useColors();
  const s = useS();
  const [picture, setPicture] = useState<string | null>(null); // data:- oder file:-URI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const b64 = await api.getBase64('/me/picture');
        setPicture(b64 ? `data:image/jpeg;base64,${b64}` : null);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function pick(camera: boolean) {
    setError(null);
    let result: ImagePicker.ImagePickerResult;
    try {
      const perm = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('keine Erlaubnis');
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        cameraType: ImagePicker.CameraType.front,
      };
      result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    } catch {
      setError('Die Kamera oder die Fotos können nicht geöffnet werden.');
      return;
    }
    if (result.canceled || !result.assets?.[0]) return; // abgebrochen

    setLoading(true);
    try {
      const ctx = ImageManipulator.manipulate(result.assets[0].uri);
      ctx.resize({ width: 800 });
      const image = await ctx.renderAsync();
      const saved = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.85,
        base64: true,
      });
      if (!saved.base64) throw new Error('kein Bild');
      await api.putBase64('/me/picture', saved.base64, 'image/jpeg');
      setPicture(saved.uri);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    setLoading(true);
    setError(null);
    try {
      await api.deleteJson('/me/picture');
      setPicture(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      {/* Alles oben: Hinweis, darunter Bild und Knöpfe. */}
      <InfoNote style={{ marginBottom: 24 }}>
        Ein Profilbild ist freiwillig. Das Bild sehen nur Sie in der App. Vermittler und Dolmetscher sehen es nicht.
      </InfoNote>
      <View style={s.avatar}>
        {picture && <Image source={{ uri: picture }} style={s.image} />}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={StyleSheet.absoluteFill} />
        ) : (
          !picture && <MaterialIcons name="person" size={80} color={colors.outline} />
        )}
      </View>
      <View style={s.buttons}>
        <FilledButton icon="photo-camera" label="Kamera" disabled={loading} onPress={() => pick(true)} />
        <FilledButton icon="photo-library" label="Galerie" tonal disabled={loading} onPress={() => pick(false)} />
        {picture && <OutlineButton icon="delete-outline" label="löschen" disabled={loading} onPress={remove} />}
      </View>
      <ErrorText message={error} />
    </Screen>
  );
}

const useS = makeStyles((colors) => ({
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.appBar,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: 160, height: 160 },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
}));
