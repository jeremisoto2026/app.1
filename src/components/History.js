import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserOperations } from '../services/database';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './components/ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const History = ({ refreshTrigger }) => {
  const { user } = useAuth();
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filteredOperations, setFilteredOperations] = useState([]);
  const [filters, setFilters] = useState({
    exchange: '',
    crypto: '',
    fiat: '',
    operation_type: '',
    search: ''
  });
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const fetchOperations = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError('');
        const userOperations = await getUserOperations(user.uid);
        setOperations(userOperations);
        setFilteredOperations(userOperations);
      } catch (err) {
        console.error('Error fetching operations:', err);
        setError(err.message || "Error al cargar el historial de operaciones. Por favor, revisa la consola de Firebase.");
      } finally {
        setLoading(false);
      }
    };

    fetchOperations();
  }, [user, refreshTrigger]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...operations];

    // Apply filters
    if (filters.exchange) {
      filtered = filtered.filter(op => op.exchange === filters.exchange);
    }
    if (filters.crypto) {
      filtered = filtered.filter(op => op.crypto === filters.crypto);
    }
    if (filters.fiat) {
      filtered = filtered.filter(op => op.fiat === filters.fiat);
    }
    if (filters.operation_type) {
      filtered = filtered.filter(op => op.operation_type === filters.operation_type);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(op => 
        op.order_id?.toLowerCase().includes(searchLower) ||
        op.crypto?.toLowerCase().includes(searchLower) ||
        op.fiat?.toLowerCase().includes(searchLower) ||
        op.exchange?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle timestamp sorting
      if (sortBy === 'timestamp') {
        aValue = aValue?.toDate ? aValue.toDate() : new Date(aValue);
        bValue = bValue?.toDate ? bValue.toDate() : new Date(bValue);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredOperations(filtered);
  }, [operations, filters, sortBy, sortOrder]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      exchange: '',
      crypto: '',
      fiat: '',
      operation_type: '',
      search: ''
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getUniqueValues = (field) => {
    return [...new Set(operations.map(op => op[field]).filter(Boolean))];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando historial...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-red-400 text-xl mb-2">Error</h2>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">
            Historial de Operaciones 📜
          </h1>
          <p className="text-gray-300">
            Revisa y analiza todas tus operaciones pasadas
          </p>
        </div>

        {/* Filters */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-yellow-400 flex items-center gap-2">
              🔍 Filtros y Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              {/* Search */}
              <div className="md:col-span-2">
                <Input
                  placeholder="Buscar por ID, crypto, fiat..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>

              {/* Exchange Filter */}
              <Select value={filters.exchange} onValueChange={(value) => handleFilterChange('exchange', value)}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Exchange" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="" className="text-white">Todos</SelectItem>
                  {getUniqueValues('exchange').map(exchange => (
                    <SelectItem key={exchange} value={exchange} className="text-white hover:bg-gray-600">
                      {exchange}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Crypto Filter */}
              <Select value={filters.crypto} onValueChange={(value) => handleFilterChange('crypto', value)}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Crypto" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="" className="text-white">Todas</SelectItem>
                  {getUniqueValues('crypto').map(crypto => (
                    <SelectItem key={crypto} value={crypto} className="text-white hover:bg-gray-600">
                      {crypto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Fiat Filter */}
              <Select value={filters.fiat} onValueChange={(value) => handleFilterChange('fiat', value)}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Fiat" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="" className="text-white">Todas</SelectItem>
                  {getUniqueValues('fiat').map(fiat => (
                    <SelectItem key={fiat} value={fiat} className="text-white hover:bg-gray-600">
                      {fiat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Operation Type Filter */}
              <Select value={filters.operation_type} onValueChange={(value) => handleFilterChange('operation_type', value)}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="" className="text-white">Todos</SelectItem>
                  {getUniqueValues('operation_type').map(type => (
                    <SelectItem key={type} value={type} className="text-white hover:bg-gray-600">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort and Clear */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="timestamp" className="text-white">Fecha</SelectItem>
                    <SelectItem value="fiat_amount" className="text-white">Monto</SelectItem>
                    <SelectItem value="crypto_amount" className="text-white">Cantidad</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  {sortOrder === 'asc' ? '⬆️' : '⬇️'}
                </Button>
              </div>

              <Button
                onClick={clearFilters}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                🗑️ Limpiar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-300">
            Mostrando {filteredOperations.length} de {operations.length} operaciones
          </p>
        </div>

        {/* Operations List */}
        {filteredOperations.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-12">
              <div className="text-center">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl text-gray-300 mb-2">No hay operaciones</h3>
                <p className="text-gray-400">
                  {operations.length === 0 
                    ? "Aún no has registrado ninguna operación. ¡Comienza a operar!"
                    : "No se encontraron operaciones con los filtros aplicados."
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOperations.map((operation, index) => (
              <Card key={operation.id || index} className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Operation Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className="bg-blue-600">
                          {operation.exchange}
                        </Badge>
                        <Badge 
                          variant={operation.operation_type === 'Venta' ? 'default' : 'secondary'}
                          className={operation.operation_type === 'Venta' ? 'bg-green-600' : 'bg-purple-600'}
                        >
                          {operation.operation_type}
                        </Badge>
                        <span className="text-yellow-400 font-medium">
                          {operation.crypto}/{operation.fiat}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Cantidad:</span>
                          <div className="text-white font-medium">
                            {operation.crypto_amount} {operation.crypto}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Tasa:</span>
                          <div className="text-white font-medium">
                            {operation.exchange_rate}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Comisión:</span>
                          <div className="text-white font-medium">
                            {operation.fee || 0}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Fecha:</span>
                          <div className="text-white font-medium">
                            {formatDate(operation.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Amount and Profit */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white mb-1">
                        {formatCurrency(operation.fiat_amount || 0, operation.fiat)}
                      </div>
                      <div className="text-xs text-gray-400">
                        ID: {operation.order_id}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
