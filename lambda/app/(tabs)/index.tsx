import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '@/lib/AuthContext';
import { useColorScheme } from '@/hooks';
import { useRouter } from 'expo-router';

export default function TabOneScreen() {
  const { user, profile, signOut } = useAuthContext();
  const colorScheme = useColorScheme();
  const router = useRouter();

  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? '#1a1a1a' : '#fff';
  const textColor = isDark ? '#fff' : '#000';
  const secondaryTextColor = isDark ? '#ccc' : '#666';

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Logout',
        onPress: async () => {
          const { error } = await signOut();
          if (error) {
            Alert.alert('Error', 'Failed to logout: ' + error.message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: textColor }]}>Profile</Text>

        <View style={styles.infoCard}>
          <Text style={[styles.label, { color: secondaryTextColor }]}>Name</Text>
          <Text style={[styles.value, { color: textColor }]}>
            {profile?.user_name || 'Not set'}
            {profile?.user_lastname ? ` ${profile.user_lastname}` : ''}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={[styles.label, { color: secondaryTextColor }]}>Email</Text>
          <Text style={[styles.value, { color: textColor }]}>{user?.email}</Text>
        </View>

        {profile?.user_date_of_birth && (
          <View style={styles.infoCard}>
            <Text style={[styles.label, { color: secondaryTextColor }]}>Date of Birth</Text>
            <Text style={[styles.value, { color: textColor }]}>{profile.user_date_of_birth}</Text>
          </View>
        )}

        {profile?.user_gender && (
          <View style={styles.infoCard}>
            <Text style={[styles.label, { color: secondaryTextColor }]}>Gender</Text>
            <Text style={[styles.value, { color: textColor }]}>{profile.user_gender}</Text>
          </View>
        )}

        {profile?.user_height_cm && (
          <View style={styles.infoCard}>
            <Text style={[styles.label, { color: secondaryTextColor }]}>Height</Text>
            <Text style={[styles.value, { color: textColor }]}>{profile.user_height_cm} cm</Text>
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  infoCard: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 40,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
