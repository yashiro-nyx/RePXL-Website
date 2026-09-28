import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface ProductImageProps {
  uri: string;
  style: StyleProp<ViewStyle>;
}

/** Keep the image itself inside the frame's padding and rounded corners. */
export default function ProductImage({ uri, style }: ProductImageProps) {
  return (
    <View style={[styles.frame, style]}>
      <Image source={{ uri }} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { padding: 8, flexShrink: 0, backgroundColor: '#111' },
  image: { width: '100%', height: '100%' },
});
