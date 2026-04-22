import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QuickExitButton } from '../components/QuickExitButton';

// Multi-step offline-capable case intake form
// Stage 1 (current): UI skeleton with validation
// Stage 3: WatermelonDB persistence + sync engine writes

const VIOLENCE_TYPES = ['PHYSICAL', 'SEXUAL', 'EMOTIONAL', 'ECONOMIC', 'NEGLECT', 'TRAFFICKING'];
const INTAKE_CHANNELS = ['FIELD_WORKER', 'HOTLINE', 'SELF_REFERRAL', 'COMMUNITY_LEADER', 'HEALTH_FACILITY'];

export function CaseIntakeScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [violenceType, setViolenceType] = useState('');
  const [intakeChannel, setIntakeChannel] = useState('');

  const handleNext = () => {
    if (step === 1 && !violenceType) {
      Alert.alert('Required', 'Please select the type of violence reported');
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = () => {
    // Stage 3: write to WatermelonDB pending_sync queue
    Alert.alert('Saved offline', 'This case will be uploaded to the server when connectivity is available.');
    setStep(1);
    setViolenceType('');
    setIntakeChannel('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <QuickExitButton />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>New Case</Text>
        <Text style={styles.step}>Step {step} of 3</Text>

        {step === 1 && (
          <View>
            <Text style={styles.label}>Type of Violence *</Text>
            <View style={styles.options}>
              {VIOLENCE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.option, violenceType === t && styles.optionSelected]}
                  onPress={() => setViolenceType(t)}
                >
                  <Text style={[styles.optionText, violenceType === t && styles.optionTextSelected]}>
                    {t.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Intake Channel</Text>
            <View style={styles.options}>
              {INTAKE_CHANNELS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.option, intakeChannel === c && styles.optionSelected]}
                  onPress={() => setIntakeChannel(c)}
                >
                  <Text style={[styles.optionText, intakeChannel === c && styles.optionTextSelected]}>
                    {c.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.label}>Incident Details</Text>
            <Text style={styles.hint}>
              Record observable facts only. Do not record perpetrator names — only relationship category.
            </Text>
            <TextInput
              style={styles.textarea}
              multiline
              numberOfLines={6}
              placeholder="Describe the reported incident…"
              textAlignVertical="top"
            />
            <Text style={styles.label}>Perpetrator Relationship (if known)</Text>
            <TextInput style={styles.input} placeholder="e.g. Intimate partner, Unknown" />
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.label}>Review & Save</Text>
            <View style={styles.review}>
              <Text style={styles.reviewRow}>Violence type: <Text style={styles.reviewValue}>{violenceType}</Text></Text>
              <Text style={styles.reviewRow}>Channel: <Text style={styles.reviewValue}>{intakeChannel || '—'}</Text></Text>
            </View>
            <Text style={styles.hint}>
              This record will be stored encrypted on this device and synced when online.
              All data access is logged.
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          {step > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={() => setStep((s) => s - 1)}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          {step < 3 ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.nextButton} onPress={handleSubmit}>
              <Text style={styles.nextButtonText}>Save Offline</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingTop: 56 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  step: { fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  hint: { fontSize: 12, color: '#9ca3af', marginBottom: 12, lineHeight: 18 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  optionSelected: { borderColor: '#7b2d8b', backgroundColor: '#f5e8f9' },
  optionText: { fontSize: 13, color: '#374151' },
  optionTextSelected: { color: '#7b2d8b', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    minHeight: 120,
  },
  review: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reviewRow: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  reviewValue: { fontWeight: '700', color: '#111827' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 32 },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  nextButton: { flex: 2, backgroundColor: '#7b2d8b', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  nextButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
