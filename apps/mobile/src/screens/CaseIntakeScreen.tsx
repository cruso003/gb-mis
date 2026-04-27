import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QuickExitButton } from '../components/QuickExitButton';
import { t } from '../i18n';
import { createOfflineCase } from '../sync/SyncEngine';

const VIOLENCE_TYPES = ['PHYSICAL', 'SEXUAL', 'EMOTIONAL', 'ECONOMIC', 'NEGLECT', 'TRAFFICKING'] as const;
const INTAKE_CHANNELS = ['FIELD_WORKER', 'HOTLINE', 'SELF_REFERRAL', 'COMMUNITY_LEADER', 'HEALTH_FACILITY'] as const;

export function CaseIntakeScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [violenceType, setViolenceType] = useState('');
  const [intakeChannel, setIntakeChannel] = useState('');
  const [incidentNotes, setIncidentNotes] = useState('');
  const [perpetratorRelationship, setPerpetratorRelationship] = useState('');
  const [saving, setSaving] = useState(false);

  const handleNext = () => {
    if (step === 1 && !violenceType) {
      Alert.alert(t('common.error'), t('case.violenceTypeRequired'));
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await createOfflineCase({
        violenceType,
        intakeChannel: intakeChannel || 'COMMUNITY',
        // orgUnitId will be filled from auth context in a future iteration;
        // for now use a placeholder that the sync engine will resolve server-side.
        orgUnitId: 'PENDING_FROM_AUTH',
        ...(incidentNotes ? { notes: incidentNotes } : {}),
        ...(perpetratorRelationship ? { perpetratorRelationship } : {}),
      });
      Alert.alert(t('case.savedOfflineTitle'), t('case.savedOfflineBody'));
      setStep(1);
      setViolenceType('');
      setIntakeChannel('');
      setIncidentNotes('');
      setPerpetratorRelationship('');
    } catch (err) {
      Alert.alert(t('case.saveFailed'), err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <QuickExitButton />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('case.newCase')}</Text>
        <Text style={styles.step}>{t('case.step', { current: step, total: 3 })}</Text>

        {step === 1 && (
          <View>
            <Text style={styles.label}>{t('case.violenceType')} *</Text>
            <View style={styles.options}>
              {VIOLENCE_TYPES.map((vt) => (
                <TouchableOpacity
                  key={vt}
                  style={[styles.option, violenceType === vt && styles.optionSelected]}
                  onPress={() => setViolenceType(vt)}
                >
                  <Text style={[styles.optionText, violenceType === vt && styles.optionTextSelected]}>
                    {t(`case.violenceTypes.${vt}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t('case.intakeChannel')}</Text>
            <View style={styles.options}>
              {INTAKE_CHANNELS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.option, intakeChannel === c && styles.optionSelected]}
                  onPress={() => setIntakeChannel(c)}
                >
                  <Text style={[styles.optionText, intakeChannel === c && styles.optionTextSelected]}>
                    {t(`case.intakeChannels.${c}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.label}>{t('case.incidentDetails')}</Text>
            <Text style={styles.hint}>{t('case.incidentNotePrompt')}</Text>
            <TextInput
              style={styles.textarea}
              multiline
              numberOfLines={6}
              placeholder={t('case.incidentPlaceholder')}
              textAlignVertical="top"
              value={incidentNotes}
              onChangeText={setIncidentNotes}
            />
            <Text style={styles.label}>{t('case.perpetratorRelationship')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('case.perpetratorPlaceholder')}
              value={perpetratorRelationship}
              onChangeText={setPerpetratorRelationship}
            />
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.label}>{t('case.review')}</Text>
            <View style={styles.review}>
              <Text style={styles.reviewRow}>
                {t('case.violenceType')}:{' '}
                <Text style={styles.reviewValue}>{violenceType ? t(`case.violenceTypes.${violenceType}`) : '—'}</Text>
              </Text>
              <Text style={styles.reviewRow}>
                {t('case.intakeChannel')}:{' '}
                <Text style={styles.reviewValue}>{intakeChannel ? t(`case.intakeChannels.${intakeChannel}`) : '—'}</Text>
              </Text>
            </View>
            <Text style={styles.hint}>{t('case.encryptedNotice')}</Text>
          </View>
        )}

        <View style={styles.actions}>
          {step > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={() => setStep((s) => s - 1)}>
              <Text style={styles.backButtonText}>{t('common.back')}</Text>
            </TouchableOpacity>
          )}
          {step < 3 ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>{t('common.next')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextButton, saving && styles.nextButtonDisabled]}
              onPress={() => { void handleSubmit(); }}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.nextButtonText}>{t('case.saveOffline')}</Text>
              )}
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
  nextButtonDisabled: { opacity: 0.6 },
  nextButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
