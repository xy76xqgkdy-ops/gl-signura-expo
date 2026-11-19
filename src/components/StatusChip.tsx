import { StyleSheet, Text, View } from 'react-native';

import { RequestStatus, STATUS } from '../lib/models';
import { colors } from '../lib/theme';

// Status als kleines Feld: farbiger Punkt plus Text, damit er auch ohne
// Farbunterscheidung lesbar ist. Gleich in der Liste und im Formular.
export function StatusChip({ status }: { status: RequestStatus }) {
  const { text, color } = STATUS[status];
  return (
    <View style={[s.chip, { borderColor: color }]}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={s.text}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surface,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  text: { fontSize: 13, color: colors.text },
});
