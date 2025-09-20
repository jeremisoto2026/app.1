import React, { useEffect, useState } from "react";
import { getUserOperations } from "../services/database"; 
import { useAuth } from "../contexts/AuthContext";

import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Divider,
} from "@mui/material";
import PaymentIcon from "@mui/icons-material/Payment";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";

const Profile = () => {
  const { currentUser } = useAuth();
  const [operations, setOperations] = useState([]);

  useEffect(() => {
    if (currentUser) {
      getUserOperations(currentUser.uid).then((ops) => {
        setOperations(ops || []);
      });
    }
  }, [currentUser]);

  // Valores dinámicos
  const planType = "Free"; 
  const totalOperations = `${operations.length}/200`;
  const totalExports = "2/40"; 
  const premiumPrice = "13$";

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", p: 3 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Perfil
      </Typography>

      {/* Limitaciones */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Limitaciones
          </Typography>
          <Typography>Tipo de plan: <b>{planType}</b></Typography>
          <Typography>Total de Operaciones: <b>{totalOperations}</b></Typography>
          <Typography>Exportaciones: <b>{totalExports}</b></Typography>
          <Button
            variant="contained"
            color="success"
            fullWidth
            sx={{ mt: 2 }}
          >
            Actualizar tus Límites
          </Button>
        </CardContent>
      </Card>

      {/* Plan Premium */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <WorkspacePremiumIcon sx={{ mr: 1, color: "gold" }} />
            Plan Premium
          </Typography>
          <Typography gutterBottom>
            <b>{premiumPrice}</b> → Todo ilimitado por 1 mes
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<PaymentIcon />}
              >
                PayPal
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                startIcon={<PaymentIcon />}
              >
                Binance Pay
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                sx={{ backgroundColor: "#4caf50" }}
                fullWidth
                startIcon={<PaymentIcon />}
              >
                Blockchain Pay
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Contacto soporte */}
      <Card>
        <CardContent>
          <Button
            variant="contained"
            color="error"
            fullWidth
            startIcon={<SupportAgentIcon />}
          >
            Contactar a Soporte
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;