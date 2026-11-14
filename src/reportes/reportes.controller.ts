import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Mensaje } from '../common/decorators/mensaje.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';
import { Rol } from '../usuarios/entities/usuario.entity';
import { ReporteExcelService } from './reporte-excel.service';
import { ReportesService } from './reportes.service';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.BARISTA, Rol.ADMIN)
export class ReportesController {
  constructor(
    private readonly reportesService: ReportesService,
    private readonly excelService: ReporteExcelService,
  ) {}

  @Get('resumen')
  @Mensaje('Resumen del local')
  resumen(@UsuarioActual('localId') localId: string) {
    return this.reportesService.resumen(localId);
  }

  /**
   * Devuelve un archivo, no JSON.
   *
   * Por eso se usa @Res() y se escribe la respuesta a mano: así el
   * interceptor global, que envuelve todo en { status, message, data },
   * no toca estos bytes.
   */
  @Get('visitas.xlsx')
  async excel(
    @UsuarioActual('localId') localId: string,
    @Res() res: Response,
  ): Promise<void> {
    const archivo = await this.excelService.generar(localId);
    const fecha = new Date().toISOString().slice(0, 10);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="raiz-contigo-${fecha}.xlsx"`,
    );
    res.setHeader('Content-Length', archivo.length);
    res.end(archivo);
  }
}
