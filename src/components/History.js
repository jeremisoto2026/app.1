import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { db } from "../firebase";
import { calculateArbitrageSessionResult, calculateDashboardMetrics, calculateOperationAmounts, getOperationDate } from "../utils/financialCalculations";
import { buildProfessionalExcelXml, downloadExcelXml } from "../utils/spreadsheet";
import { filterOperations } from "../utils/operationFilters";
import { 
  TrashIcon, 
  PencilSquareIcon,
  DocumentArrowDownIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  CalendarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";
import { format } from 'date-fns';
import { Label } from "./ui/label";
import { useAuth } from "../contexts/AuthContext";
import { loadBybitPreviewOperations } from "../utils/bybitP2POperations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const PAGE_SIZE = 10;

const History = () => {
  const { user } = useAuth();
  const [operations¶»§q«^