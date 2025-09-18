import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../services/database';

const DashboardScreen = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_operations: 0,
    total_profit_usdt: 0,
    best_operation: null,
    worst_operation: null,
    monthly_profit: 0,
    success_rate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (user) {
        try {
          const dashboardStats = await getDashboardStats(user.uid);
          setStats(dashboardStats);
        } catch (error) {
          console.error("Error fetching dashboard stats:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchStats();
  }, [user]);

  if (loading) {
    return <Text>Cargando...</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Dashboard ⚡️</Text>
      <Text style={styles.subtitle}>
        Bienvenido de vuelta, {user?.displayName || 'Usuario'}
      </Text>

      {/* Tarjeta de Total Operaciones */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Total Operaciones</Text>
        <Text style={styles.cardValue}>{stats.total_operations}</Text>
        <Text style={styles.cardSubtitle}>Operaciones realizadas</Text>
      </View>

      {/* Tarjeta de Ganancia CRIPTO */}
      <View style={[styles.card, styles.greenCard]}>
        <Text style={styles.cardTitle}>Ganancia CRIPTO</Text>
        <Text style={styles.cardValue}>${stats.total_profit_usdt.toFixed(2)}</Text>
        <Text style={styles.cardSubtitle}>Total en Criptomonedas</Text>
      </View>
      
      {/* Tarjeta de Tasa de Éxito */}
      <View style={[styles.card, styles.purpleCard]}>
        <Text style={styles.cardTitle}>Tasa de Éxito</Text>
        <Text style={styles.cardValue}>{stats.success_rate.toFixed(1)}%</Text>
        <Text style={styles.cardSubtitle}>Operaciones exitosas</Text>
      </View>
      
      {/* Puedes agregar más tarjetas para best_operation, worst_operation, etc. */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1c',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e0e0',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#2e2e2e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    color: '#e0e0e0',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  greenCard: {
    backgroundColor: '#2e3d36', // Un verde oscuro
    borderLeftWidth: 5,
    borderLeftColor: '#4CAF50',
  },
  purpleCard: {
    backgroundColor: '#352e3d', // Un púrpura oscuro
    borderLeftWidth: 5,
    borderLeftColor: '#9C27B0',
  },
});

export default DashboardScreen;
