import React, { useEffect, useState } from "react";
import "./Profile.css";
import BinanceP2PSyncCard from "./BinanceP2PSyncCard";
import BybitP2PSyncCard from "./BybitP2PSyncCard";
import { loadBybitPreviewOperations } from "../utils/bybitP2POperations";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { collection, doc, getDoc, getDocs, onSnapshot } from "firebase/firestore";
import { FREE_PLAN_LIMITS, getProfileExportCount, getLimitProgress, isProSubscriptionActive } from "../utils/planLimits";
import { getEffectivePaymentStatus, getVisiblePaymentHistory } from "../utils/paymentStatus";
import {
  ArrowLeftOnRectangleIcon,
  ChartBarIcon,
  UserCircleIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  LifebuoyIcon,
  SparklesIcon,
  CreditCardIcon,
  ClockIcon,
  CheckCircleIcon,
  BoltIcon,
  LockClosedIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const asText = (value, fallback = "") => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
};

const countFromProfile = getProfileExportCount;

const formatDate = (timestamp, authDate) => {
  try {
    const date = timestamp?.toDate ? timestamp.toDate() : authDate ? new Date(authDate) : null;
    if (!date || Number.isNaN(date.getTime())) return "Fecha no disponible";
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit",¶»§q«^