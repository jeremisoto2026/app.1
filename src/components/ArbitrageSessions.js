import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { ArrowDownTrayIcon, PlusIcon, CheckCircleIcon, PlayIcon, TrashIcon, BoltIcon, DocumentPlusIcon } from "@heroicons/react/24/outline";
import { calculateArbitrageSessionResult, calculateDashboardMetrics, getAccountingCryptoAmount, getOperationDate } from "../utils/financialCalculations";
import { buildExcelXml, downloadExcelXml } from "../utils/spreadsheet";
import { formatCurrencyAmount } from "../utils/numberFormatting";
import { loadBybitPreviewOperations } from "../utils/bybitP2POperations";

const FIAT_CURRENCIES = ["EUR", "USD", "VES", "COP", "ARS", "MXN", "BRL", "PEN", "CLP", "GBP"];
const CRYPTO_CURRENCIES = ["USDT", "USDC", "BTC", "ETH", "BNB", "DAI"];
const ARBITRAGE_TYPES = ["Comercio P2P", "P2P entre plataformas"];
const money = (value, currency) => formatCurrencyAmount(value, currency) + " " + currency;
const formatDate = (value) => {
  const date = getOperationDate(value);
  return date ? date.toLocaleString("es-ES") : "Fecha no disponible";
};

export default function ArbitrageSessions({ onOpenOperations }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError]¶»§q«^