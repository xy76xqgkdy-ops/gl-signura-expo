import { Text, View } from 'react-native';

import { RequestStatus, STATUS } from '../lib/models';
import { makeStyles } from '../lib/theme';

// Status: farbiger Punkt plus Text, damit er auch ohne Farbunterscheidung
// lesbar ist. Bewusst ohne Rahmen und Hintergrund, damit er nicht wie ein
// Knopf aussieht. Gleich in der Liste und im Formular.
export function StatusChip({ status }: { status: RequestStatus }) {
  const s = useS();
  const { text, color } = STATUS[status];
  return (
    <View style={s.chip}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={s.text}>{text}</Text>
    </View>
  );
}

const useS = makeStyles((colors) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dot: { width: 14, height: 14, borderRadius: 7, marginRight: 8 }, // so groß wie bei StatusNote
  text: { fontSize: 14, fontWeight: '500', color: colors.text },
}));
