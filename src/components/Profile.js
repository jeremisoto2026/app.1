import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@radix-ui/react-separator";

export default function Profile() {
  // Ejemplo: estos datos deberías traerlos de tu backend o Firestore
  const plan = "Free";
  const operaciones = 3;
  const limiteOperaciones = 200;
  const exportaciones = 2;
  const limiteExportaciones = 40;

  return (
    <div className="max-w-lg mx-auto mt-10 p-4">
      <Card className="shadow-xl border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-center">
            Tu Cuenta
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Limitaciones */}
          <div>
            <h3 className="font-semibold text-lg mb-2">Limitaciones</h3>
            <div className="text-sm space-y-1">
              <p>
                <span className="font-medium">Tipo de plan:</span> {plan}
              </p>
              <p>
                <span className="font-medium">Total de Operaciones:</span>{" "}
                {operaciones}/{limiteOperaciones}
              </p>
              <p>
                <span className="font-medium">Exportaciones:</span>{" "}
                {exportaciones}/{limiteExportaciones}
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full mt-3 bg-blue-600 text-white hover:bg-blue-700"
            >
              Actualizar tus Límites
            </Button>
          </div>

          <Separator className="my-4 bg-gray-300 dark:bg-gray-600 h-px" />

          {/* Plan Premium */}
          <div>
            <h3 className="font-semibold text-lg mb-2">Plan Premium</h3>
            <p className="text-sm mb-3">
              Obtén <span className="font-medium">todo ilimitado</span> por solo{" "}
              <span className="font-bold">$13/mes</span>.
            </p>
            <div className="flex flex-col gap-2">
              <Button className="w-full bg-[#0070ba] hover:bg-[#005c99]">
                Pagar con PayPal
              </Button>
              <Button className="w-full bg-yellow-500 hover:bg-yellow-600">
                Binance Pay
              </Button>
              <Button className="w-full bg-gray-800 hover:bg-gray-900">
                Blockchain Pay
              </Button>
            </div>
          </div>

          <Separator className="my-4 bg-gray-300 dark:bg-gray-600 h-px" />

          {/* Soporte */}
          <div>
            <Button
              variant="outline"
              className="w-full bg-green-600 text-white hover:bg-green-700"
            >
              Contactar a Soporte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}