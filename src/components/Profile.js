import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../contexts/database";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  Divider,
  Stack,
} from "@mui/material";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import PaymentIcon from "@mui/icons-material/Payment";

export default function Profile() {
  const { user } = useAuth();
  const [operationCount, setOperationCount] = useState(0);
  const [exportCount, setExportCount] = useState(2); // ⚡ Ejemplo fijo (ajusta según tu lógica real)

  useEffect(() => {
    if (!user) return;

    const fetchOperations = async () => {
      try {
        const q = query(
          collection(db, "operations"),
          where("owner", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        setOperationCount(snapshot.size);
      } catch (error) {
        console.error("Error al obtener operaciones:", error);
      }
    };

    fetchOperations();
  }, [user]);

  if (!user) {
    return <Typography color="white">Cargando perfil...</Typography>;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
      {/* Perfil */}
      <Card sx={{ mb: 3, backgroundColor: "#1e1e2f", color: "white" }}>
        <CardContent>
          <Stack spacing={2} alignItems="center">
            <Avatar
              src={user.photoURL || ""}
              sx={{ width: 80, height: 80, bgcolor: "#3f51b5" }}
            >
              {user.displayName?.[0] || "U"}
            </Avatar>
            <Typography variant="h6">{user.displayName || "Usuario"}</Typography>
            <Typography variant="body2" color="gray">
              {user.email}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Limitaciones */}
      <Card sx={{ mb: 3, backgroundColor: "#2a2a40", color: "white" }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Limitaciones
          </Typography>
          <Typography>Tipo de plan: Free</Typography>
          <Typography>
            Total de Operaciones: {operationCount}/200
          </Typography>
          <Typography>
            Exportaciones: {exportCount}/40
          </Typography>
          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 2, bgcolor: "#3f51b5" }}
          >
            Actualizar tus Límites
          </Button>
        </CardContent>
      </Card>

      {/* Plan Premium */}
      <Card sx={{ mb: 3, backgroundColor: "#2a2a40", color: "white" }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Plan Premium
          </Typography>
          <Typography variant="body2" gutterBottom>
            Por solo <strong>13 USD</strong> disfruta de operaciones y
            exportaciones <strong>ilimitadas</strong> durante 1 mes.
          </Typography>

          <Divider sx={{ my: 2, borderColor: "gray" }} />

          <Stack spacing={2}>
            <Button
              variant="outlined"
              startIcon={<PaymentIcon />}
              fullWidth
              sx={{ color: "white", borderColor: "white" }}
            >
              PayPal
            </Button>
            <Button
              variant="outlined"
              startIcon={<PaymentIcon />}
              fullWidth
              sx={{ color: "white", borderColor: "white" }}
            >
              Binance Pay
            </Button>
            <Button
              variant="outlined"
              startIcon={<PaymentIcon />}
              fullWidth
              sx={{ color: "white", borderColor: "white" }}
            >
              Blockchain Pay
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Contactar soporte */}
      <Button
        variant="contained"
        fullWidth
        startIcon={<SupportAgentIcon />}
        sx={{ bgcolor: "#ff5722", color: "white" }}
      >
        Contactar a Soporte
      </Button>
    </Box>
  );
}