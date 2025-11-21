
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ListPage() {
  return (
    <div className="space-y-8">
       <div>
          <h1 className="text-3xl font-bold tracking-tight">Lista de Registros</h1>
          <p className="text-muted-foreground">Todos tus registros de trabajo en un solo lugar.</p>
        </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Duración/Días</TableHead>
              <TableHead className="text-right">Importe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    No hay registros para mostrar.
                </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
