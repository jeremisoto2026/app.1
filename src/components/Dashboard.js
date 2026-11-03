import React, { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { calculateDashboardSummaryMetrics } from "../utils/financialCalculations";
import { isProSubscriptionActive } from "../utils/planLimits";
import { formatCurrencyAmount } from "../utils/numberFormatting";
import { loadBybitPreviewOperations } from "../utils/bybitP2POperations";
import {
  ArrowDownTrayIcon,
  ArrowRightIcon,
  ArrowTrendingUpIcon,
  ChartBarSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  BoltIcon,
  CurrencyDollarIcon,
  DocumentPlusIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";

const emptyMetrics = {
  totalOperations: 0,
  profitByCurrency: {},
  monthlyProfitByCurrency: {},
  successRate: 0,
  closedSales: 0,
  winningSales: 0,
};

const Dashboard = ({ onOpenProfile, onOpenOperations, onOpenHistory, onOpenArbitrages, theme, onToggleTheme }) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [activeArbitrages, setActiveArbitrages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionsWarning, setSessionsWarning] = useState("");
  const [hasActivePro, setHasActivePro] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!user?.uid) {
      setHasAc¶»§q«^