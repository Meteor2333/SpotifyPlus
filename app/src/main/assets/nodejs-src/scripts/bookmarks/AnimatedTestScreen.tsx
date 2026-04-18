import React from 'react';
import { Animated, Pressable, ScrollView, Text, View } from './../../ui/components';
import { Easing } from '../../ui/animated';

export default function AnimationTest() {
    const opacity = React.useRef(new Animated.Value(0)).current;
    const y = React.useRef(new Animated.Value(24)).current;
    const scale = React.useRef(new Animated.Value(0.96)).current;
    const spin = React.useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.spring(y, { toValue: 0, tension: 120, friction: 14, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, tension: 120, friction: 12, useNativeDriver: true }),
            Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }))
        ]).start();
    }, []);
    const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#0b0b0b' }} contentContainerStyle={{ padding: 20, gap: 14 }}>
            <Animated.View style={{ opacity, transform: [{ translateY: y }, { scale }] }}>
                <View style={{ padding: 18, borderRadius: 24, backgroundColor: '#181818', borderWidth: 1, borderColor: '#2a2a2a' }}>
                    <Text style={{ color: '#ffffff', fontSize: 28, fontWeight: 'bold', marginBottom: 6 }}>Animated works</Text>
                    <Text style={{ color: '#b3b3b3', fontSize: 15, lineHeight: 21 }}>This card fades/slides/scales using the native driver. No React rerender every frame. Very civilized. Suspiciously civilized.</Text>
                </View>
            </Animated.View>
            <Animated.View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#1ed760', alignSelf: 'center', transform: [{ rotate }] }} />
            <Pressable onPress={() => { opacity.setValue(0); y.setValue(28); scale.setValue(0.94); Animated.parallel([Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }), Animated.spring(y, { toValue: 0, useNativeDriver: true }), Animated.spring(scale, { toValue: 1, useNativeDriver: true })]).start(); }} style={({ pressed }) => ({ padding: 14, borderRadius: 18, backgroundColor: pressed ? '#169c46' : '#1ed760', alignItems: 'center' })}>
                <Text style={{ color: '#000000', fontWeight: 'bold', fontSize: 16 }}>Replay</Text>
            </Pressable>
        </ScrollView>
    );
}
