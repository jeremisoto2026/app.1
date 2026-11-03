import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { saveOperation } from '../services/database';
import { calculateOperationAmounts, calculateArbitrageSessionBalances } from '../utils/financialCalculations';
import { formatCryptoAmount, formatFiatAmount } from '../utils/numberFormatting';
import { loadBybitPreviewOperations } from '../utils/bybitP2POperations';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { PlusCircleIcon, DocumentTextIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const Operations = ({ initialSessionId = '', onOpenArbitrages }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    order_id: '',
    exchange: '',
    operation_type: '',
    crypto: '',
    fiat: '',
    crypto_amount: '',
    fiat_amount: '',
    exchange_rate: '',
    fee: '0'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessions, setSessions] = useState([]);
  const [sessi¶»§q«^